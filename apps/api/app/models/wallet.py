import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Wallet(Base, TimestampMixin):
    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    address: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    encrypted_private_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    dek_wrap: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    kdf_params: Mapped[dict] = mapped_column(JSONB, nullable=False)
    key_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    recovery_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    recovery_code_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    exported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="wallet")
