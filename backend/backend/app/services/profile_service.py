"""Deterministic dataset profiling for the Data Observatory.

Pure-Python (no pandas/numpy — mirrors sector_service's approach) so nothing
new has to be installed and Celery/sync constraints are untouched. Computes,
per workspace:

- overview line chart (records per day)
- per numeric column: histogram + stats + description
- per categorical column: top-value bar/donut + description
- strongest numeric correlation: sampled scatter + description

Every chart carries a plain-language ``description`` rendered under it.
"""

from __future__ import annotations

import math
import uuid
from collections import Counter, OrderedDict
from numbers import Number

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.record import Record
from app.schemas.profile import DataProfileOut, ProfileChart, ProfileSeries

_MAX_NUMERIC_CHARTS = 6
_MAX_CATEGORICAL_CHARTS = 4
_MAX_CATEGORIES = 8
_MAX_SCATTER_POINTS = 200
_MIN_CORRELATION = 0.30


# ---------------------------------------------------------------- helpers


def _to_number(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, Number):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").strip())
        except ValueError:
            return None
    return None


def _load_rows(db: Session, workspace_id: uuid.UUID) -> list[dict]:
    stmt = select(Record.data).where(
        Record.workspace_id == workspace_id, Record.is_deleted.is_(False)
    )
    return [r for (r,) in db.execute(stmt).all() if isinstance(r, dict)]


def _split_columns(
    rows: list[dict],
) -> tuple["OrderedDict[str, list[float]]", "OrderedDict[str, list[str]]"]:
    """Partition columns into numeric and categorical (low-cardinality text)."""
    numeric: OrderedDict[str, list[float]] = OrderedDict()
    text: OrderedDict[str, list[str]] = OrderedDict()
    for row in rows:
        for key, val in row.items():
            num = _to_number(val)
            if num is not None:
                numeric.setdefault(key, []).append(num)
            elif isinstance(val, str) and val.strip():
                text.setdefault(key, []).append(val.strip())
    threshold = max(1, len(rows) // 2)
    numeric = OrderedDict((k, v) for k, v in numeric.items() if len(v) >= threshold)
    categorical: OrderedDict[str, list[str]] = OrderedDict()
    for key, vals in text.items():
        if key in numeric or len(vals) < threshold:
            continue
        distinct = len(set(vals))
        # Low cardinality relative to volume => a real category, not free text/ids.
        if distinct <= max(12, len(vals) // 4):
            categorical[key] = vals
    return numeric, categorical


def _label(key: str) -> str:
    return key.replace("_", " ").replace("-", " ").title()


def _fmt(x: float) -> str:
    if abs(x) >= 1000:
        return f"{x:,.0f}"
    if abs(x) >= 10:
        return f"{x:,.1f}"
    return f"{x:,.2f}"


def _stats(values: list[float]) -> dict[str, float]:
    n = len(values)
    ordered = sorted(values)
    mean = sum(values) / n
    median = (
        ordered[n // 2]
        if n % 2
        else (ordered[n // 2 - 1] + ordered[n // 2]) / 2
    )
    var = sum((v - mean) ** 2 for v in values) / n if n > 1 else 0.0
    return {
        "count": float(n),
        "mean": round(mean, 4),
        "median": round(median, 4),
        "min": ordered[0],
        "max": ordered[-1],
        "std": round(math.sqrt(var), 4),
    }


def _pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n < 3:
        return 0.0
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if sx == 0 or sy == 0:
        return 0.0
    return cov / (sx * sy)


# ---------------------------------------------------------------- chart builders


def _timeline_chart(db: Session, workspace_id: uuid.UUID) -> ProfileChart | None:
    stmt = (
        select(func.date(Record.recorded_at).label("day"), func.count().label("n"))
        .where(Record.workspace_id == workspace_id, Record.is_deleted.is_(False))
        .group_by("day")
        .order_by("day")
    )
    rows = [(d, n) for d, n in db.execute(stmt).all() if d is not None]
    if len(rows) < 2:
        return None
    labels = [str(d) for d, _ in rows]
    counts = [float(n) for _, n in rows]
    peak_idx = max(range(len(counts)), key=counts.__getitem__)
    return ProfileChart(
        key="records_over_time",
        title="Ingestion timeline",
        chart_type="line",
        labels=labels,
        series=[ProfileSeries(name="records", values=counts)],
        description=(
            f"Records arrived across {len(labels)} day(s), peaking at "
            f"{int(counts[peak_idx])} record(s) on {labels[peak_idx]}. "
            f"{int(sum(counts))} record(s) in total."
        ),
        stats={"days": float(len(labels)), "total": float(sum(counts))},
    )


def _histogram_chart(key: str, values: list[float]) -> ProfileChart:
    s = _stats(values)
    lo, hi = s["min"], s["max"]
    label = _label(key)
    if lo == hi:
        return ProfileChart(
            key=f"hist_{key}",
            title=f"{label} — distribution",
            chart_type="bar",
            labels=[_fmt(lo)],
            series=[ProfileSeries(name=label, values=[float(len(values))])],
            description=(
                f"Every one of the {len(values)} record(s) has the same "
                f"{label} value of {_fmt(lo)} — no variation to analyze."
            ),
            stats=s,
        )
    bins = min(12, max(5, round(1 + math.log2(len(values)))))  # Sturges, clamped
    width = (hi - lo) / bins
    counts = [0] * bins
    for v in values:
        idx = min(bins - 1, int((v - lo) / width))
        counts[idx] += 1
    labels = [f"{_fmt(lo + i * width)}–{_fmt(lo + (i + 1) * width)}" for i in range(bins)]
    modal = max(range(bins), key=counts.__getitem__)
    skew_note = ""
    if s["std"] > 0:
        skew = (s["mean"] - s["median"]) / s["std"]
        if skew > 0.25:
            skew_note = " The distribution leans right — a few high values pull the average above the median."
        elif skew < -0.25:
            skew_note = " The distribution leans left — a few low values pull the average below the median."
    return ProfileChart(
        key=f"hist_{key}",
        title=f"{label} — distribution",
        chart_type="histogram",
        labels=labels,
        series=[ProfileSeries(name=label, values=[float(c) for c in counts])],
        description=(
            f"{label} ranges from {_fmt(lo)} to {_fmt(hi)} with an average of "
            f"{_fmt(s['mean'])} (median {_fmt(s['median'])}). Most records fall in "
            f"the {labels[modal]} band.{skew_note}"
        ),
        stats=s,
    )


def _categorical_chart(key: str, values: list[str]) -> ProfileChart:
    counter = Counter(values)
    top = counter.most_common(_MAX_CATEGORIES)
    others = len(values) - sum(c for _, c in top)
    labels = [name for name, _ in top]
    counts = [float(c) for _, c in top]
    if others > 0:
        labels.append("Other")
        counts.append(float(others))
    label = _label(key)
    lead_name, lead_count = top[0]
    share = 100.0 * lead_count / len(values)
    chart_type = "donut" if len(counter) <= 6 else "bar"
    return ProfileChart(
        key=f"cat_{key}",
        title=f"{label} — breakdown",
        chart_type=chart_type,
        labels=labels,
        series=[ProfileSeries(name=label, values=counts)],
        description=(
            f"{label} has {len(counter)} distinct value(s). "
            f"'{lead_name}' leads with {lead_count} record(s) "
            f"({share:.0f}% of the data)."
            + (f" {others} record(s) fall outside the top {_MAX_CATEGORIES} shown." if others > 0 else "")
        ),
        stats={"distinct": float(len(counter)), "leader_share_pct": round(share, 1)},
    )


def _correlation_chart(
    rows: list[dict], numeric: "OrderedDict[str, list[float]]"
) -> ProfileChart | None:
    keys = list(numeric.keys())[:_MAX_NUMERIC_CHARTS]
    best: tuple[float, str, str, list[list[float]]] | None = None
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = keys[i], keys[j]
            pairs = [
                [x, y]
                for row in rows
                if (x := _to_number(row.get(a))) is not None
                and (y := _to_number(row.get(b))) is not None
            ]
            if len(pairs) < 5:
                continue
            r = _pearson([p[0] for p in pairs], [p[1] for p in pairs])
            if best is None or abs(r) > abs(best[0]):
                best = (r, a, b, pairs)
    if best is None or abs(best[0]) < _MIN_CORRELATION:
        return None
    r, a, b, pairs = best
    step = max(1, len(pairs) // _MAX_SCATTER_POINTS)
    sampled = pairs[::step][:_MAX_SCATTER_POINTS]
    strength = "strong" if abs(r) >= 0.7 else "moderate"
    direction = "rise together" if r > 0 else "move in opposite directions"
    return ProfileChart(
        key=f"corr_{a}_{b}",
        title=f"{_label(a)} vs {_label(b)}",
        chart_type="scatter",
        points=[[round(x, 4), round(y, 4)] for x, y in sampled],
        series=[ProfileSeries(name=f"{_label(a)} vs {_label(b)}", values=[])],
        description=(
            f"{_label(a)} and {_label(b)} show a {strength} "
            f"{'positive' if r > 0 else 'negative'} correlation "
            f"(r = {r:.2f}) — they tend to {direction}."
            + (f" Showing {len(sampled)} of {len(pairs)} points." if len(pairs) > len(sampled) else "")
        ),
        stats={"pearson_r": round(r, 3), "pairs": float(len(pairs))},
    )


# ---------------------------------------------------------------- entrypoint


def profile(db: Session, *, sector: str, workspace_id: uuid.UUID) -> DataProfileOut:
    rows = _load_rows(db, workspace_id)
    if not rows:
        return DataProfileOut(
            sector=sector,
            record_count=0,
            column_count=0,
            summary="No records ingested yet. Upload a dataset to generate the observatory.",
        )

    numeric, categorical = _split_columns(rows)
    all_keys: list[str] = []
    for row in rows:
        for k in row:
            if k not in all_keys:
                all_keys.append(k)

    charts: list[ProfileChart] = []
    timeline = _timeline_chart(db, workspace_id)
    if timeline:
        charts.append(timeline)
    # Identifier columns are numeric but meaningless to histogram.
    measurable = [
        (k, v) for k, v in numeric.items()
        if not (k.lower().endswith("id") or k.lower().startswith("id"))
    ]
    for key, values in measurable[:_MAX_NUMERIC_CHARTS]:
        charts.append(_histogram_chart(key, values))
    # Emails, ids and raw dates make noisy "categories" — skip them; dates are
    # already covered by the ingestion timeline.
    skip = ("email", "date", "time", "invoice", "phone", "address", "uuid")
    chartable = [
        (k, v) for k, v in categorical.items()
        if not any(tok in k.lower() for tok in skip)
    ]
    for key, values in chartable[:_MAX_CATEGORICAL_CHARTS]:
        charts.append(_categorical_chart(key, values))
    corr = _correlation_chart(rows, OrderedDict(measurable))
    if corr:
        charts.append(corr)

    summary = (
        f"{len(rows)} record(s) across {len(all_keys)} column(s): "
        f"{len(numeric)} numeric, {len(categorical)} categorical. "
        f"{len(charts)} chart(s) generated below — each with a plain-language read of what the data shows."
    )
    return DataProfileOut(
        sector=sector,
        record_count=len(rows),
        column_count=len(all_keys),
        numeric_columns=list(numeric.keys()),
        categorical_columns=list(categorical.keys()),
        summary=summary,
        charts=charts,
    )
