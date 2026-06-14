import hashlib
import re
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.auth import Session
from app.models.organization import OrgMember, Organization
from app.models.user import User
from app.models.wallet import Wallet
from app.services.wallet_service import create_wallet


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or f"user-{uuid.uuid4().hex[:8]}"


async def signup(
    db: AsyncSession, email: str, password: str, display_name: str, ip: str | None = None, ua: str | None = None
) -> dict:
    normalized = email.lower().strip()
    existing = await db.execute(select(User).where(User.email_normalized == normalized))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    password_hash = hash_password(password)

    user = User(
        email=email,
        password_hash=password_hash,
        display_name=display_name,
    )
    db.add(user)
    await db.flush()

    personal_org = Organization(
        name=f"{display_name}'s Workspace",
        slug=_slugify(display_name) + f"-{uuid.uuid4().hex[:6]}",
        type="personal",
    )
    db.add(personal_org)
    await db.flush()

    user.personal_org_id = personal_org.id

    membership = OrgMember(org_id=personal_org.id, user_id=user.id, role="owner")
    db.add(membership)

    wallet_data = create_wallet()
    wallet = Wallet(
        user_id=user.id,
        address=wallet_data["address"],
        encrypted_private_key=wallet_data["encrypted_private_key"],
        dek_wrap=wallet_data["dek_wrap"],
        kdf_params=wallet_data["kdf_params"],
        recovery_blob=wallet_data["recovery_blob"],
        recovery_code_hash=wallet_data["recovery_code_hash"],
    )
    db.add(wallet)

    access_token = create_access_token(str(user.id), {"org_id": str(personal_org.id)})
    refresh_token, refresh_hash = create_refresh_token()

    session = Session(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        ip_address=ip,
        user_agent=ua,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)

    await db.flush()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "email_verified": user.email_verified_at is not None,
            "wallet_address": wallet_data["address"],
            "personal_org_id": personal_org.id,
            "created_at": user.created_at,
        },
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "recovery_code": wallet_data["recovery_code"],
    }


async def login(
    db: AsyncSession, email: str, password: str, ip: str | None = None, ua: str | None = None
) -> dict:
    normalized = email.lower().strip()
    result = await db.execute(select(User).where(User.email_normalized == normalized))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    if not user.is_active:
        raise ValueError("Account is deactivated")

    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    wallet = wallet_result.scalar_one_or_none()

    user.last_login_at = datetime.now(timezone.utc)

    access_token = create_access_token(str(user.id), {"org_id": str(user.personal_org_id)})
    refresh_token, refresh_hash = create_refresh_token()

    session = Session(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        ip_address=ip,
        user_agent=ua,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "email_verified": user.email_verified_at is not None,
            "wallet_address": wallet.address if wallet else None,
            "personal_org_id": user.personal_org_id,
            "created_at": user.created_at,
        },
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
    }


async def refresh(
    db: AsyncSession, refresh_token_raw: str, ip: str | None = None, ua: str | None = None
) -> dict:
    token_hash = hashlib.sha256(refresh_token_raw.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Session).where(
            Session.refresh_token_hash == token_hash,
            Session.revoked_at.is_(None),
            Session.expires_at > now,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Invalid or expired refresh token")

    session.revoked_at = now

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise ValueError("User not found or deactivated")

    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    wallet = wallet_result.scalar_one_or_none()

    new_access_token = create_access_token(str(user.id), {"org_id": str(user.personal_org_id)})
    new_refresh_token, new_refresh_hash = create_refresh_token()

    new_session = Session(
        user_id=user.id,
        refresh_token_hash=new_refresh_hash,
        ip_address=ip,
        user_agent=ua,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "email_verified": user.email_verified_at is not None,
            "wallet_address": wallet.address if wallet else None,
            "personal_org_id": user.personal_org_id,
            "created_at": user.created_at,
        },
        "tokens": {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
    }


async def logout(db: AsyncSession, refresh_token_raw: str) -> None:
    token_hash = hashlib.sha256(refresh_token_raw.encode()).hexdigest()
    result = await db.execute(
        select(Session).where(
            Session.refresh_token_hash == token_hash,
            Session.revoked_at.is_(None),
        )
    )
    session = result.scalar_one_or_none()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
