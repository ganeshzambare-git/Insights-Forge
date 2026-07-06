"""Pydantic schemas for the executive recommendation analysis endpoint.

Field names are snake_case and must match the frontend's
``RecommendationAnalysisDTO`` (src/types/recommendation.ts) exactly, since the
React client maps this payload straight into its domain models.
"""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel


class RecommendationSummaryDTO(BaseModel):
    topic: str
    executive_summary: str
    primary_conclusion: str


class RecommendationConfidenceDTO(BaseModel):
    actionability_score: float
    data_quality_score: float
    model_certainty: float


class RecommendationMetadataDTO(BaseModel):
    generated_at: str
    model_id: str
    processing_time_ms: int


class ActionPlanStepDTO(BaseModel):
    id: str
    description: str
    owner: str
    estimated_days: int
    dependencies: List[str] = []


class ActionPlanDTO(BaseModel):
    id: str
    title: str
    steps: List[ActionPlanStepDTO]
    total_estimated_days: int


class ROIProjectionDTO(BaseModel):
    id: str
    projected_value: float
    payback_period_days: int
    confidence_lower: float
    confidence_upper: float


class ApprovalWorkflowStepDTO(BaseModel):
    id: str
    role: str
    status: Literal["pending", "approved", "rejected", "required"]


class ApprovalWorkflowDTO(BaseModel):
    id: str
    steps: List[ApprovalWorkflowStepDTO]
    final_status: Literal["pending", "approved", "rejected"]


class ExecutiveRecommendationDTO(BaseModel):
    id: str
    title: str
    description: str
    priority: Literal["low", "medium", "high", "critical"]
    impact_score: float
    risk_score: float
    roi: ROIProjectionDTO
    action_plan: ActionPlanDTO
    approval: ApprovalWorkflowDTO


class RecommendationAnalysisDTO(BaseModel):
    id: str
    tenant_id: str
    sector_id: str
    summary: RecommendationSummaryDTO
    recommendations: List[ExecutiveRecommendationDTO]
    confidence: RecommendationConfidenceDTO
    metadata: RecommendationMetadataDTO
