"""Factual data-grounding summary for chat.

Semantic RAG only surfaces the top-k most similar rows, which makes the LLM
answer aggregate/counting questions ("how many records", "total revenue",
"average price") from a 3-row sample and get them wrong. To make the chatbot
answer correctly over *any* uploaded dataset, we compute a compact, factual
overview of the whole workspace — exact record count, the columns present, and
per-column aggregates — and inject it into the LLM context alongside the
retrieved rows.

The count is exact (SQL COUNT). Aggregates are computed over up to
``max_rows`` rows to bound latency; for larger datasets they are clearly
labelled as being based on a sample.
"""

from __future__ import annotations

import uuid
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.record import Record

# How many rows to pull into memory for aggregate computation.
_MAX_AGG_ROWS = 5000
# Per categorical column, how many top values to show.
_TOP_VALUES = 5


def _try_number(value) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip().replace(",", "")
        if s == "":
            return None
        try:
            return float(s)
        except ValueError:
            return None
    return None


def build_data_grounding_summary(
    db: Session, workspace_id: uuid.UUID, max_rows: int = _MAX_AGG_ROWS
) -> str:
    """Build a compact factual overview of the workspace's records.

    Returns an empty string when the workspace has no records.
    """
    total = (
        db.execute(
            select(func.count())
            .select_from(Record)
            .where(Record.workspace_id == workspace_id, Record.is_deleted.is_(False))
        ).scalar()
        or 0
    )
    if total == 0:
        return ""

    rows = [
        r
        for (r,) in db.execute(
            select(Record.data)
            .where(Record.workspace_id == workspace_id, Record.is_deleted.is_(False))
            .limit(max_rows)
        ).all()
        if isinstance(r, dict)
    ]
    sampled = len(rows)

    # Collect per-column values preserving first-seen column order.
    columns: list[str] = []
    values_by_col: dict[str, list] = {}
    for row in rows:
        for k, v in row.items():
            if k not in values_by_col:
                values_by_col[k] = []
                columns.append(k)
            if v is not None and str(v).strip() != "":
                values_by_col[k].append(v)

    lines: list[str] = []
    lines.append("=== DATASET OVERVIEW (authoritative, computed from the database) ===")
    lines.append(f"Total records in workspace: {total}")
    if sampled < total:
        lines.append(
            f"Column statistics below are based on a sample of {sampled} rows; "
            "the total count above is exact."
        )
    lines.append(f"Columns ({len(columns)}): {', '.join(columns) if columns else 'none'}")
    lines.append("")
    lines.append("Column details:")

    for col in columns:
        vals = values_by_col.get(col, [])
        non_empty = len(vals)
        numbers = [n for n in (_try_number(v) for v in vals) if n is not None]

        # Treat as numeric only if most non-empty values parse as numbers.
        if non_empty > 0 and len(numbers) >= max(1, int(0.6 * non_empty)):
            total_sum = sum(numbers)
            avg = total_sum / len(numbers)
            lines.append(
                f"- {col} (numeric): count={len(numbers)}, sum={total_sum:.2f}, "
                f"avg={avg:.2f}, min={min(numbers):.2f}, max={max(numbers):.2f}"
            )
        else:
            counter = Counter(str(v) for v in vals)
            distinct = len(counter)
            top = counter.most_common(_TOP_VALUES)
            top_str = ", ".join(f"{val} ({cnt})" for val, cnt in top)
            lines.append(
                f"- {col} (categorical): {distinct} distinct values"
                + (f"; top: {top_str}" if top_str else "")
            )

    lines.append("=== END DATASET OVERVIEW ===")
    return "\n".join(lines)
