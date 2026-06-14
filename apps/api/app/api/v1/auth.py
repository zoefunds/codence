import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_verification_token, hash_password
from app.db.session import get_db
from app.models.auth import Session
from app.models.email_token import EmailToken
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    VerifyEmailRequest,
)
from app.services.auth_service import login, logout, refresh, signup
from app.services.email_service import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup_route(
    body: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await signup(
            db,
            email=body.email,
            password=body.password,
            display_name=body.display_name,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return AuthResponse(user=result["user"], tokens=result["tokens"])


@router.post("/login", response_model=AuthResponse)
async def login_route(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await login(
            db,
            email=body.email,
            password=body.password,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return AuthResponse(user=result["user"], tokens=result["tokens"])


@router.post("/refresh", response_model=AuthResponse)
async def refresh_route(
    body: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await refresh(
            db,
            refresh_token_raw=body.refresh_token,
            ip=request.client.host if request.client else None,
            ua=request.headers.get("user-agent"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return AuthResponse(user=result["user"], tokens=result["tokens"])


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_route(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    await logout(db, refresh_token_raw=body.refresh_token)


@router.post("/verify-email")
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailToken).where(
            EmailToken.token_hash == token_hash,
            EmailToken.token_type == "verification",
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > now,
        )
    )
    email_token = result.scalar_one_or_none()
    if not email_token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user_result = await db.execute(select(User).where(User.id == email_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.email_verified_at = now
    email_token.used_at = now

    return {"status": "verified"}


@router.post("/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    normalized = body.email.lower().strip()
    result = await db.execute(select(User).where(User.email_normalized == normalized))
    user = result.scalar_one_or_none()

    if user and user.email_verified_at is None:
        token, token_hash = generate_verification_token()
        email_token = EmailToken(
            user_id=user.id,
            token_hash=token_hash,
            token_type="verification",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(email_token)
        await db.flush()
        await send_verification_email(user.email, user.display_name, token)

    return {"status": "sent"}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    normalized = body.email.lower().strip()
    result = await db.execute(select(User).where(User.email_normalized == normalized))
    user = result.scalar_one_or_none()

    if user:
        token, token_hash = generate_verification_token()
        email_token = EmailToken(
            user_id=user.id,
            token_hash=token_hash,
            token_type="password_reset",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(email_token)
        await db.flush()
        await send_password_reset_email(user.email, user.display_name, token)

    return {"status": "sent"}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailToken).where(
            EmailToken.token_hash == token_hash,
            EmailToken.token_type == "password_reset",
            EmailToken.used_at.is_(None),
            EmailToken.expires_at > now,
        )
    )
    email_token = result.scalar_one_or_none()
    if not email_token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user_result = await db.execute(select(User).where(User.id == email_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(body.new_password)
    email_token.used_at = now

    await db.execute(
        update(Session)
        .where(Session.user_id == user.id, Session.revoked_at.is_(None))
        .values(revoked_at=now)
    )

    return {"status": "reset"}
