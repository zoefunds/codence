from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, SignupRequest
from app.services.auth_service import login, logout, refresh, signup

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
