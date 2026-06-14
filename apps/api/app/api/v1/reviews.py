import hashlib
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db, async_session_factory
from app.models.finding import ConsensusResult, Finding
from app.models.organization import OrgMember
from app.models.review import Review, ReviewFile
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.review import (
    AppealRequest,
    ConsensusResponse,
    FlagRequest,
    FindingResponse,
    ReviewCreatePaste,
    ReviewDetailResponse,
    ReviewListResponse,
    ReviewResponse,
)
from app.services.genlayer_service import genlayer

router = APIRouter(prefix="/reviews", tags=["reviews"])


async def _check_org_access(db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID) -> OrgMember:
    result = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
    return member


async def _get_user_wallet(db: AsyncSession, user_id: uuid.UUID) -> Wallet:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No wallet found")
    return wallet


async def _run_chain_review(review_id: uuid.UUID, code_content: str, language: str):
    async with async_session_factory() as db:
        try:
            result = await db.execute(select(Review).where(Review.id == review_id))
            review = result.scalar_one_or_none()
            if not review:
                return

            review.status = "analyzing"
            review.started_at = datetime.now(timezone.utc)
            await db.commit()

            tx_hash = await genlayer.analyze_review(
                review_id=str(review_id),
                code_content=code_content,
                language=language or "unknown",
                from_address="",
            )

            result = await db.execute(select(Review).where(Review.id == review_id))
            review = result.scalar_one_or_none()
            if not review:
                return

            review.chain_tx_hash = tx_hash
            review.status = "consensus"
            await db.commit()

            await genlayer.wait_for_tx(tx_hash)

            chain_findings = await genlayer.get_review_findings(str(review_id))
            chain_review = await genlayer.get_review(str(review_id))

            result = await db.execute(select(Review).where(Review.id == review_id))
            review = result.scalar_one_or_none()
            if not review:
                return

            if isinstance(chain_findings, list):
                for f in chain_findings:
                    finding = Finding(
                        review_id=review_id,
                        category=f.get("category", "best_practice"),
                        title=f.get("title", "Untitled"),
                        description=f.get("description", ""),
                        line_start=f.get("line_start"),
                        line_end=f.get("line_end"),
                        consensus_severity=f.get("severity", "informational"),
                        consensus_verdict=f.get("consensus_verdict", "confirmed"),
                        confidence=float(f.get("confidence", 0.5)),
                        remediation=f.get("remediation", ""),
                        content_hash=hashlib.sha256(
                            json.dumps(f, sort_keys=True).encode()
                        ).hexdigest(),
                    )
                    db.add(finding)

            if isinstance(chain_review, dict):
                consensus = ConsensusResult(
                    review_id=review_id,
                    total_findings=chain_review.get("total_findings", 0),
                    confirmed_count=chain_review.get("confirmed_count", 0),
                    disputed_count=chain_review.get("disputed_count", 0),
                    dismissed_count=chain_review.get("dismissed_count", 0),
                    severity_breakdown={},
                    overall_risk=chain_review.get("overall_risk", "clean"),
                    avg_confidence=float(chain_review.get("avg_confidence", 0)),
                    chain_tx_hash=tx_hash,
                    finalized_at=datetime.now(timezone.utc),
                )
                db.add(consensus)

            review.status = "done"
            review.completed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            result = await db.execute(select(Review).where(Review.id == review_id))
            review = result.scalar_one_or_none()
            if review:
                review.status = "failed"
                review.error_message = str(e)[:500]
                await db.commit()


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review_paste(
    body: ReviewCreatePaste,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_access(db, user.id, body.org_id)
    wallet = await _get_user_wallet(db, user.id)

    code_hash = hashlib.sha256(body.code.encode()).hexdigest()
    review = Review(
        org_id=body.org_id,
        created_by=user.id,
        source="paste",
        title=body.title,
        description=body.description,
        code_hash=code_hash,
        language=body.language,
        status="pending",
    )
    db.add(review)
    await db.flush()

    review_file = ReviewFile(
        review_id=review.id,
        file_path="paste.txt",
        language=body.language,
        content_hash=code_hash,
        blob_key=f"paste/{review.id}",
        line_count=body.code.count("\n") + 1,
        size_bytes=len(body.code.encode()),
    )
    db.add(review_file)

    line_count = body.code.count("\n") + 1
    byte_count = len(body.code.encode())

    try:
        submit_tx = await genlayer.submit_review(
            review_id=str(review.id),
            code_hash=code_hash,
            title=body.title,
            source="paste",
            from_address=wallet.address,
            org_id=str(body.org_id),
            language=body.language or "unknown",
            file_count=1,
            total_lines=line_count,
            total_bytes=byte_count,
        )
        review.chain_review_id = str(review.id)
        review.status = "ingesting"
    except Exception:
        review.status = "pending"

    await db.commit()

    background_tasks.add_task(
        _run_chain_review,
        review.id,
        body.code,
        body.language or "unknown",
    )

    await db.refresh(review)
    return review


@router.get("/stats")
async def review_stats(
    org_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_access(db, user.id, org_id)
    result = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(Review.status.in_(["pending", "ingesting", "analyzing", "consensus"])).label("in_progress"),
            func.count().filter(Review.status == "done").label("completed"),
            func.count().filter(Review.status == "failed").label("failed"),
        ).where(Review.org_id == org_id)
    )
    row = result.one()
    return {
        "total": row.total,
        "in_progress": row.in_progress,
        "completed": row.completed,
        "failed": row.failed,
    }


@router.get("", response_model=ReviewListResponse)
async def list_reviews(
    org_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_org_access(db, user.id, org_id)

    base = Review.org_id == org_id
    filters = [base]
    if status_filter:
        filters.append(Review.status == status_filter)

    count_q = select(func.count()).select_from(Review).where(*filters)
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(Review)
        .where(*filters)
        .order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    reviews = result.scalars().all()

    return ReviewListResponse(reviews=reviews, total=total, page=page, page_size=page_size)


@router.get("/{review_id}", response_model=ReviewDetailResponse)
async def get_review(
    review_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.findings), selectinload(Review.consensus))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    await _check_org_access(db, user.id, review.org_id)

    return ReviewDetailResponse(
        review=review,
        findings=review.findings,
        consensus=review.consensus,
    )


@router.post("/{review_id}/findings/{finding_id}/flag", status_code=status.HTTP_200_OK)
async def flag_finding(
    review_id: uuid.UUID,
    finding_id: uuid.UUID,
    body: FlagRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Finding).where(Finding.id == finding_id, Finding.review_id == review_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await _check_org_access(db, user.id, review.org_id)

    try:
        await genlayer.flag_false_positive(str(finding_id), body.reason)
    except Exception:
        pass

    finding.false_positive_flag = True
    finding.flagged_by = user.id
    finding.flagged_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "flagged"}


@router.delete("/{review_id}/findings/{finding_id}/flag", status_code=status.HTTP_200_OK)
async def unflag_finding(
    review_id: uuid.UUID,
    finding_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Finding).where(Finding.id == finding_id, Finding.review_id == review_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await _check_org_access(db, user.id, review.org_id)

    try:
        await genlayer.unflag_false_positive(str(finding_id))
    except Exception:
        pass

    finding.false_positive_flag = False
    finding.flagged_by = None
    finding.flagged_at = None
    await db.commit()
    return {"status": "unflagged"}


@router.post("/{review_id}/appeal", status_code=status.HTTP_200_OK)
async def appeal_review(
    review_id: uuid.UUID,
    body: AppealRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await _check_org_access(db, user.id, review.org_id)

    disputed_ids = ",".join(body.disputed_finding_ids)
    tx_hash = await genlayer.appeal_review(str(review_id), body.reason, disputed_ids)
    return {"status": "appealed", "tx_hash": tx_hash}
