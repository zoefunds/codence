import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import redis.asyncio as redis

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str = settings.REDIS_URL):
        super().__init__(app)
        self.redis_url = redis_url
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            try:
                self._redis = redis.from_url(self.redis_url, decode_responses=True)
                await self._redis.ping()
            except Exception:
                self._redis = None
        return self._redis

    async def dispatch(self, request: Request, call_next):
        r = await self._get_redis()
        if r is None:
            return await call_next(request)

        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            identity = f"token:{auth_header[7:20]}"
            limit = 60
        else:
            identity = f"ip:{client_ip}"
            limit = 10 if path.startswith("/api/v1/auth") else 30

        window = 60
        key = f"rl:{identity}:{int(time.time()) // window}"

        try:
            current = await r.incr(key)
            if current == 1:
                await r.expire(key, window)
            if current > limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                    headers={"Retry-After": str(window)},
                )
        except Exception:
            pass

        return await call_next(request)
