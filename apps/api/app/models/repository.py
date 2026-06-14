import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class GitHubInstallation(Base, TimestampMixin):
    __tablename__ = "github_installations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    installation_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    account_login: Mapped[str] = mapped_column(String, nullable=False)
    account_type: Mapped[str] = mapped_column(String, nullable=False)
    permissions: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    events: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    repositories = relationship("Repository", back_populates="installation")


class Repository(Base, TimestampMixin):
    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    installation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("github_installations.id", ondelete="SET NULL"), nullable=True
    )
    github_repo_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    default_branch: Mapped[str] = mapped_column(String, default="main")
    primary_language: Mapped[str | None] = mapped_column(String, nullable=True)
    auto_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    review_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    org = relationship("Organization", back_populates="repositories")
    installation = relationship("GitHubInstallation", back_populates="repositories")
    reviews = relationship("Review", back_populates="repo")
