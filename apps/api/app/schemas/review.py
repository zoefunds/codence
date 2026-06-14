import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreatePaste(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=500_000)
    language: str | None = None
    description: str | None = None
    org_id: uuid.UUID


class ReviewResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    repo_id: uuid.UUID | None
    source: str
    title: str
    description: str | None
    status: str
    language: str | None
    languages: list[str]
    code_hash: str
    chain_tx_hash: str | None
    chain_review_id: str | None
    created_by: uuid.UUID
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    total: int
    page: int
    page_size: int


class FindingResponse(BaseModel):
    id: uuid.UUID
    category: str
    title: str
    description: str
    line_start: int | None
    line_end: int | None
    code_snippet: str | None
    consensus_severity: str | None
    consensus_verdict: str | None
    confidence: float | None
    remediation: str | None
    false_positive_flag: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class VoteResponse(BaseModel):
    id: uuid.UUID
    validator_index: int
    vote_exists: bool
    severity: str | None
    exploitability: str | None
    reasoning: str
    evidence_quality: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsensusResponse(BaseModel):
    id: uuid.UUID
    review_id: uuid.UUID
    total_findings: int
    confirmed_count: int
    disputed_count: int
    dismissed_count: int
    severity_breakdown: dict
    overall_risk: str
    avg_confidence: float
    chain_tx_hash: str | None
    finalized_at: datetime | None

    model_config = {"from_attributes": True}


class ReviewDetailResponse(BaseModel):
    review: ReviewResponse
    findings: list[FindingResponse]
    consensus: ConsensusResponse | None


class FlagRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class AppealRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)
    disputed_finding_ids: list[str] = Field(min_length=1)
