import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_verified_email
from app.db.session import get_db
from app.models.organization import OrgMember, Organization
from app.models.user import User
from app.schemas.organization import (
    InviteMemberRequest,
    OrgCreateRequest,
    OrgMemberResponse,
    OrgResponse,
    UpdateRoleRequest,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


async def _check_org_admin(db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID) -> OrgMember:
    result = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return member


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_org(
    body: OrgCreateRequest,
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Organization).where(Organization.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")

    org = Organization(name=body.name, slug=body.slug, type="team")
    db.add(org)
    await db.flush()

    membership = OrgMember(org_id=org.id, user_id=user.id, role="owner")
    db.add(membership)
    await db.flush()

    return org


@router.get("", response_model=list[OrgResponse])
async def list_orgs(
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Organization)
        .join(OrgMember, OrgMember.org_id == Organization.id)
        .where(OrgMember.user_id == user.id)
        .order_by(Organization.created_at)
    )
    return result.scalars().all()


@router.get("/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_members(
    org_id: uuid.UUID,
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user.id)
    )
    if not check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    result = await db.execute(
        select(OrgMember, User)
        .join(User, User.id == OrgMember.user_id)
        .where(OrgMember.org_id == org_id)
    )
    members = []
    for member, u in result.all():
        members.append(OrgMemberResponse(
            id=member.id,
            user_id=u.id,
            email=u.email,
            display_name=u.display_name,
            role=member.role,
            joined_at=member.joined_at,
        ))
    return members


@router.post("/{org_id}/members", response_model=OrgMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    org_id: uuid.UUID,
    body: InviteMemberRequest,
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_admin(db, user.id, org_id)

    normalized = body.email.lower().strip()
    target_result = await db.execute(select(User).where(User.email_normalized == normalized))
    target_user = target_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found — they must sign up first")

    existing = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == target_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member")

    member = OrgMember(
        org_id=org_id,
        user_id=target_user.id,
        role=body.role,
        invited_by=user.id,
        invited_at=datetime.now(timezone.utc),
    )
    db.add(member)
    await db.flush()

    return OrgMemberResponse(
        id=member.id,
        user_id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.put("/{org_id}/members/{member_id}", response_model=OrgMemberResponse)
async def update_member_role(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    body: UpdateRoleRequest,
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_admin(db, user.id, org_id)

    result = await db.execute(
        select(OrgMember, User)
        .join(User, User.id == OrgMember.user_id)
        .where(OrgMember.id == member_id, OrgMember.org_id == org_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    member, target_user = row
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change owner role")

    member.role = body.role
    await db.commit()

    return OrgMemberResponse(
        id=member.id,
        user_id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{org_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    user: User = Depends(require_verified_email),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_admin(db, user.id, org_id)

    result = await db.execute(
        select(OrgMember).where(OrgMember.id == member_id, OrgMember.org_id == org_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove org owner")

    await db.delete(member)
    await db.commit()
