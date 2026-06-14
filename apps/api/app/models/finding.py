import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Finding(Base, TimestampMixin):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    review_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("review_files.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    line_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    line_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    code_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    consensus_severity: Mapped[str | None] = mapped_column(String, nullable=True)
    consensus_verdict: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    remediation: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str] = mapped_column(String, nullable=False)
    chain_finding_id: Mapped[str | None] = mapped_column(String, nullable=True)
    false_positive_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    flagged_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    flagged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    review = relationship("Review", back_populates="findings")
    votes = relationship("ValidatorVote", back_populates="finding", cascade="all, delete-orphan")


class ValidatorVote(Base):
    __tablename__ = "validator_votes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    finding_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("findings.id", ondelete="CASCADE"), nullable=False
    )
    validator_index: Mapped[int] = mapped_column(Integer, nullable=False)
    vote_exists: Mapped[bool] = mapped_column(Boolean, nullable=False)
    severity: Mapped[str | None] = mapped_column(String, nullable=True)
    exploitability: Mapped[str | None] = mapped_column(String, nullable=True)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning_hash: Mapped[str] = mapped_column(String, nullable=False)
    evidence_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    remediation_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()", nullable=False)

    finding = relationship("Finding", back_populates="votes")

    __table_args__ = (
        CheckConstraint("validator_index BETWEEN 0 AND 4", name="ck_validator_index_range"),
    )


class ConsensusResult(Base):
    __tablename__ = "consensus_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    review_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reviews.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    total_findings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confirmed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    disputed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dismissed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity_breakdown: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    overall_risk: Mapped[str] = mapped_column(String, nullable=False)
    avg_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    chain_tx_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()", nullable=False)

    review = relationship("Review", back_populates="consensus")
