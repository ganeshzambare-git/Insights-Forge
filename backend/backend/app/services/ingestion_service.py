"""File ingestion: store a dataset and parse its rows into ``records``.

Rows are stored as-is (raw ingestion, no cleaning/ML). Supported inputs:
CSV, JSON (array of objects, or newline-delimited JSON objects), and
Excel (.xlsx) via openpyxl.
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from dateutil import parser as date_parser  # type: ignore
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.enums import DatasetProcessingStatus, DatasetStatus
from app.models.record import Record

# Common field names we opportunistically use to timestamp a record.
_DATE_KEYS = ("recorded_at", "date", "timestamp", "datetime", "created_at", "time")


def _normalize_header(header: Any) -> str:
    """Normalize an Excel/CSV header to a lowercase, underscore-separated key."""
    s = str(header).strip().lower()
    return s.replace(" ", "_").replace("-", "_")


def _rows_from_xlsx(raw: bytes) -> list[dict]:
    """Parse an Excel workbook into a list of row dicts across all worksheets."""
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    all_rows: list[dict] = []

    for ws in wb.worksheets:
        row_iter = ws.iter_rows(values_only=True)
        try:
            header_raw = next(row_iter)
        except StopIteration:
            continue  # empty sheet

        headers = [_normalize_header(h) for h in header_raw]

        for values in row_iter:
            row = {}
            for hdr, val in zip(headers, values):
                if val is None:
                    row[hdr] = ""
                elif isinstance(val, datetime):
                    row[hdr] = val.isoformat()
                else:
                    row[hdr] = val
            all_rows.append(row)

    wb.close()
    return all_rows


def _rows_from_bytes(raw: bytes, filename: str, content_type: str | None) -> list[dict]:
    name = (filename or "").lower()

    # Excel detection: by extension, mimetype, or ZIP/OOXML magic bytes.
    # .xlsx is a ZIP container, so it always starts with the local-file-header
    # signature b"PK\x03\x04".
    is_xlsx = (
        name.endswith(".xlsx")
        or (content_type or "")
        in (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        )
        or raw[:4] == b"PK\x03\x04"
    )
    if is_xlsx:
        return _rows_from_xlsx(raw)

    text = raw.decode("utf-8-sig", errors="replace").strip()
    if not text:
        return []

    is_json = name.endswith(".json") or (content_type or "").endswith("json")
    if is_json or text[0] in "[{":
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [r for r in parsed if isinstance(r, dict)]
            if isinstance(parsed, dict):
                return [parsed]
        except json.JSONDecodeError:
            # newline-delimited JSON
            rows = []
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict):
                        rows.append(obj)
                except json.JSONDecodeError:
                    continue
            if rows:
                return rows

    # Default: CSV
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def _extract_recorded_at(row: dict[str, Any]) -> datetime | None:
    for key in _DATE_KEYS:
        if key in row and row[key]:
            try:
                return date_parser.parse(str(row[key]))
            except (ValueError, OverflowError, TypeError):
                continue
    return None


def ingest_stream(
    db: Session,
    *,
    organization_id: uuid.UUID,
    workspace_id: uuid.UUID,
    uploaded_by: uuid.UUID,
    filename: str,
    content_type: str | None,
    raw: bytes,
) -> Dataset:
    rows = _rows_from_bytes(raw, filename, content_type)

    if not rows:
        raise ValueError(
            f"File '{filename}' produced zero parseable rows. "
            "Please check the file format and content."
        )

    total_columns = len(rows[0]) if rows else 0

    dataset = Dataset(
        organization_id=organization_id,
        workspace_id=workspace_id,
        uploaded_by=uploaded_by,
        name=filename or "upload",
        file_name=filename or "upload",
        file_type=content_type or "application/octet-stream",
        storage_path="",  # streamed inline; not persisted to object storage
        file_size=len(raw),
        total_rows=len(rows),
        total_columns=total_columns,
        processing_status=DatasetProcessingStatus.COMPLETED,
        status=DatasetStatus.ACTIVE,
        created_by=uploaded_by,
    )
    db.add(dataset)
    db.flush()

    now = datetime.now(timezone.utc)
    for row in rows:
        db.add(
            Record(
                organization_id=organization_id,
                workspace_id=workspace_id,
                dataset_id=dataset.id,
                data=row,
                recorded_at=_extract_recorded_at(row) or now,
            )
        )

    db.commit()
    return dataset

