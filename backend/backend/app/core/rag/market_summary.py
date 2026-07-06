"""Market benchmark summary for LLM grounding.

Pulls the sector's market/benchmark timeseries from the standalone Market Data
microservice and renders a compact text block so the chatbot can compare the
user's own data against the market (e.g. "you're growing faster than the market").

Needs no embeddings — the market data comes over HTTP from a cloud service — so
this is safe on small/free hosts. Returns "" whenever market data is unavailable
or disabled, so the caller simply omits the market section.
"""

from __future__ import annotations

import logging
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.workspace import Workspace

logger = logging.getLogger("market-summary")


def _pct_change(first: float, last: float) -> float | None:
    if first == 0:
        return None
    return (last - first) / abs(first) * 100.0


def build_market_summary(db: Session, workspace_id: uuid.UUID) -> str:
    """Return a text block summarizing the market benchmark for the workspace's
    sector, or "" if market data is disabled/unavailable."""
    if not settings.MARKET_DATA_ENABLED or not settings.MARKET_SERVICE_URL:
        return ""

    # Resolve the workspace's sector (market data is keyed by sector).
    try:
        sector = db.execute(
            select(Workspace.sector).where(Workspace.id == workspace_id)
        ).scalar_one_or_none()
    except Exception as e:
        logger.error(f"MARKET SUMMARY: sector lookup failed: {e}")
        return ""
    if sector is None:
        return ""
    sector_value = getattr(sector, "value", str(sector))

    # Fetch the market timeseries from the microservice.
    try:
        base = settings.MARKET_SERVICE_URL.rstrip("/")
        resp = httpx.get(f"{base}/market/{sector_value}/timeseries", timeout=8.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"MARKET SUMMARY: fetch failed: {e}")
        return ""

    labels = data.get("labels") or []
    series = data.get("series") or []
    if not labels or not series:
        return ""

    values = series[0].get("values") or []
    if not values:
        return ""

    first_v, last_v = float(values[0]), float(values[-1])
    lo, hi = min(values), max(values)
    change = _pct_change(first_v, last_v)
    change_str = f"{change:+.1f}%" if change is not None else "n/a"

    lines = [
        f"=== MARKET BENCHMARK (sector: {sector_value}, authoritative) ===",
        f"Market index over {len(values)} points ({labels[0]} to {labels[-1]}):",
        f"- Latest market value: {last_v:.2f} (as of {labels[-1]})",
        f"- Earliest market value: {first_v:.2f} (as of {labels[0]})",
        f"- Overall market change over the period: {change_str}",
        f"- Range: min {lo:.2f}, max {hi:.2f}",
        "Compare the user's own data trends above against this market benchmark: "
        "state whether the user is outperforming or underperforming the market, "
        "and by roughly how much.",
    ]
    return "\n".join(lines)
