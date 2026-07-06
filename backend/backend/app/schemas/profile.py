"""Data-profile DTOs for the Data Observatory (auto-generated charts +
plain-language descriptions computed from ingested records).

Additive to the frozen contract: new endpoint, new shapes, nothing changed.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProfileSeries(BaseModel):
    name: str
    values: list[float]


class ProfileChart(BaseModel):
    key: str = Field(description="stable identifier, e.g. 'hist_unitprice'")
    title: str
    chart_type: str = Field(
        description="one of histogram | bar | donut | line | scatter"
    )
    labels: list[str] = Field(default_factory=list)
    series: list[ProfileSeries] = Field(default_factory=list)
    # For scatter charts: [[x, y], ...] point pairs instead of labels/series.
    points: list[list[float]] = Field(default_factory=list)
    description: str = Field(description="plain-language summary shown under the chart")
    stats: dict[str, float | str] = Field(default_factory=dict)


class DataProfileOut(BaseModel):
    sector: str
    record_count: int
    column_count: int
    numeric_columns: list[str] = Field(default_factory=list)
    categorical_columns: list[str] = Field(default_factory=list)
    summary: str = Field(description="one-paragraph overview of the dataset")
    charts: list[ProfileChart] = Field(default_factory=list)
