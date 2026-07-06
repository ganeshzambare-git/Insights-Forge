"""Sector-scoped analytics + record access. {sector} resolves to the
caller's workspace and all data is filtered by workspace_id."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, lazyload

from app.api.deps import CurrentUser, ensure_sector, get_current_user
from app.core.errors import AppError
from app.db.session import get_db
from app.models.record import Record
from app.schemas.record import RecordOut, RecordsPage
from app.schemas.sector import GeoFeatureCollection, ScorecardOut, TimeseriesOut
from app.schemas.profile import DataProfileOut
from app.schemas.reasoning import ReasoningAnalysisDTO
from app.schemas.recommendation import RecommendationAnalysisDTO
from app.services import profile_service, sector_service

router = APIRouter(prefix="/sectors", tags=["Sectors"])

_SectorPath = Path(description="one of retail | service | education | agriculture")


def _record_out(record: Record, sector: str) -> RecordOut:
    return RecordOut(
        id=record.id,
        dataset_id=record.dataset_id,
        sector=sector,
        data=record.data,
        recorded_at=record.recorded_at,
        created_at=record.created_at,
    )


@router.get("/{sector}/scorecard", response_model=ScorecardOut)
def get_scorecard(
    sector: str = _SectorPath,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScorecardOut:
    workspace_id = ensure_sector(current, sector)
    return sector_service.scorecard(db, sector=sector, workspace_id=workspace_id)


@router.get("/{sector}/analytics/profile", response_model=DataProfileOut)
def get_data_profile(
    sector: str = _SectorPath,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataProfileOut:
    """Auto-generated Data Observatory: a chart + plain-language description
    for every profiled column of the workspace's ingested records.
    Additive endpoint — the frozen contract is untouched."""
    workspace_id = ensure_sector(current, sector)
    return profile_service.profile(db, sector=sector, workspace_id=workspace_id)


@router.get("/{sector}/timeseries", response_model=TimeseriesOut)
def get_timeseries(
    sector: str = _SectorPath,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TimeseriesOut:
    workspace_id = ensure_sector(current, sector)
    return sector_service.timeseries(db, sector=sector, workspace_id=workspace_id)


@router.get("/{sector}/records", response_model=RecordsPage)
def list_records(
    sector: str = _SectorPath,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    dataset_id: uuid.UUID | None = Query(None),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecordsPage:
    workspace_id = ensure_sector(current, sector)
    base = select(Record).where(
        Record.workspace_id == workspace_id, Record.is_deleted.is_(False)
    )
    if dataset_id is not None:
        base = base.where(Record.dataset_id == dataset_id)
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = (
        db.execute(
            base.order_by(Record.recorded_at.desc().nullslast())
            .limit(limit)
            .offset(offset)
            .options(lazyload("*"))
        )
        .scalars()
        .all()
    )
    return RecordsPage(
        sector=sector,
        total=total,
        limit=limit,
        offset=offset,
        items=[_record_out(r, sector) for r in rows],
    )


@router.get("/{sector}/geo", response_model=GeoFeatureCollection)
def get_geo(
    sector: str = _SectorPath,
    limit: int = Query(1000, ge=1, le=5000),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeoFeatureCollection:
    workspace_id = ensure_sector(current, sector)
    return sector_service.geo(db, sector=sector, workspace_id=workspace_id, limit=limit)


@router.get("/{sector}/records/{record_id}", response_model=RecordOut)
def get_record(
    sector: str = _SectorPath,
    record_id: uuid.UUID = Path(...),
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecordOut:
    workspace_id = ensure_sector(current, sector)
    record = db.get(Record, record_id, options=[lazyload("*")])
    if record is None or record.is_deleted or record.workspace_id != workspace_id:
        raise AppError(404, "not_found", "Record not found")
    return _record_out(record, sector)


@router.get("/{sector}/reasoning", response_model=ReasoningAnalysisDTO)
def get_reasoning(
    sector: str = _SectorPath,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReasoningAnalysisDTO:
    workspace_id = ensure_sector(current, sector)
    return sector_service.get_reasoning_analysis(
        db, sector=sector, workspace_id=workspace_id, tenant_id=str(current.organization_id)
    )


@router.get("/{sector}/recommendation", response_model=RecommendationAnalysisDTO)
def get_recommendation(
    sector: str = _SectorPath,
    current: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationAnalysisDTO:
    workspace_id = ensure_sector(current, sector)
    return sector_service.get_recommendation_analysis(
        db, sector=sector, workspace_id=workspace_id, tenant_id=str(current.organization_id)
    )

