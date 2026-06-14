import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.organization import Organization
from app.models.review import Review
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminRoleRequest(BaseModel):
    is_admin: bool


@router.get("/stats")
async def admin_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = await db.scalar(select(func.count()).select_from(User))
    verified_users = await db.scalar(
        select(func.count()).select_from(User).where(User.email_verified_at.is_not(None))
    )
    total_reviews = await db.scalar(select(func.count()).select_from(Review))
    total_orgs = await db.scalar(select(func.count()).select_from(Organization))

    return {
        "users": total_users,
        "verified_users": verified_users,
        "reviews": total_reviews,
        "organizations": total_orgs,
    }


@router.get("/users")
async def admin_list_users(
    page: int = 1,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    per_page = 20
    offset = (page - 1) * per_page

    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(per_page)
    )
    users = result.scalars().all()

    total = await db.scalar(select(func.count()).select_from(User))

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "display_name": u.display_name,
                "email_verified": u.email_verified_at is not None,
                "is_admin": u.is_admin,
                "created_at": u.created_at,
                "last_login_at": u.last_login_at,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.put("/users/{user_id}/role")
async def admin_update_role(
    user_id: uuid.UUID,
    body: AdminRoleRequest,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.is_admin = body.is_admin

    return {
        "id": target.id,
        "email": target.email,
        "is_admin": target.is_admin,
    }
