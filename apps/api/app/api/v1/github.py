import hashlib
import hmac
import uuid

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.organization import OrgMember
from app.models.repository import GitHubInstallation, Repository
from app.models.user import User

router = APIRouter(prefix="/github", tags=["github"])


class RepoResponse(BaseModel):
    id: uuid.UUID
    full_name: str | None
    default_branch: str
    primary_language: str | None
    auto_review: bool

    model_config = {"from_attributes": True}


class ToggleAutoReviewRequest(BaseModel):
    auto_review: bool


@router.get("/install")
async def github_install(org_id: uuid.UUID):
    if not settings.GITHUB_APP_ID:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="GitHub App not configured")
    install_url = f"https://github.com/apps/codence/installations/new?state={org_id}"
    return {"install_url": install_url}


@router.get("/callback")
async def github_callback(
    installation_id: int,
    setup_action: str = "install",
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing org_id state")

    org_id = uuid.UUID(state)

    existing = await db.execute(
        select(GitHubInstallation).where(GitHubInstallation.installation_id == installation_id)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_installed"}

    installation = GitHubInstallation(
        org_id=org_id,
        installation_id=installation_id,
        account_login="",
        account_type="Organization",
        permissions={},
        events=[],
    )
    db.add(installation)
    await db.flush()
    return {"status": "installed", "installation_id": str(installation.id)}


@router.post("/webhook")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(None),
    x_github_event: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()

    if settings.GITHUB_WEBHOOK_SECRET and x_hub_signature_256:
        expected = "sha256=" + hmac.new(
            settings.GITHUB_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_hub_signature_256):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")

    payload = await request.json()

    if x_github_event == "installation":
        action = payload.get("action")
        if action in ("created", "new_permissions_accepted"):
            pass
        elif action == "deleted":
            inst_id = payload.get("installation", {}).get("id")
            if inst_id:
                result = await db.execute(
                    select(GitHubInstallation).where(GitHubInstallation.installation_id == inst_id)
                )
                inst = result.scalar_one_or_none()
                if inst:
                    await db.delete(inst)

    elif x_github_event == "pull_request":
        action = payload.get("action")
        if action in ("opened", "synchronize"):
            pass

    return {"status": "ok"}


@router.get("/organizations/{org_id}/repositories", response_model=list[RepoResponse])
async def list_repositories(
    org_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user.id)
    )
    if not check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    result = await db.execute(select(Repository).where(Repository.org_id == org_id))
    return result.scalars().all()


@router.put("/repositories/{repo_id}/auto-review", response_model=RepoResponse)
async def toggle_auto_review(
    repo_id: uuid.UUID,
    body: ToggleAutoReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    check = await db.execute(
        select(OrgMember).where(
            OrgMember.org_id == repo.org_id,
            OrgMember.user_id == user.id,
            OrgMember.role.in_(["owner", "admin"]),
        )
    )
    if not check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    repo.auto_review = body.auto_review
    await db.commit()
    return repo
