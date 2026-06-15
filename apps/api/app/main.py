import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update

from app.api.v1.router import api_router
from app.core.config import settings
from app.middleware.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)


async def _recover_stuck_reviews():
    from app.db.session import async_session_factory
    from app.models.review import Review

    async with async_session_factory() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        result = await db.execute(
            select(Review).where(
                Review.status.in_(["ingesting", "analyzing", "consensus"]),
                Review.created_at < cutoff,
            )
        )
        stuck = result.scalars().all()
        for review in stuck:
            review.status = "failed"
            review.error_message = "Review timed out during processing"
            logger.info(f"Recovered stuck review {review.id} from '{review.status}'")
        if stuck:
            await db.commit()
            logger.info(f"Recovered {len(stuck)} stuck reviews on startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_recover_stuck_reviews())
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}
