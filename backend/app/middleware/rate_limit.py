"""Small process-local abuse guard for login and full analysis requests."""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next):
        limit = {
            "/auth/login": settings.login_rate_limit_per_minute,
            "/auth/register": settings.login_rate_limit_per_minute,
            "/ai/analyze": settings.analysis_rate_limit_per_minute,
        }.get(request.url.path)
        if request.method != "POST" or limit is None:
            return await call_next(request)
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        key = (request.url.path, client)
        async with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= 60:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = max(1, int(60 - (now - hits[0])))
                return JSONResponse({"detail": "Too many requests"}, status_code=429, headers={"Retry-After": str(retry_after)})
            hits.append(now)
        return await call_next(request)


class RequestBodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    """Stop oversized analysis bodies before FastAPI parses model input."""

    def __init__(self, app: ASGIApp, *, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") != "/ai/analyze":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers") or [])
        raw_length = headers.get(b"content-length")
        if raw_length is not None:
            try:
                if int(raw_length) > self.max_bytes:
                    await JSONResponse({"detail": "Request body is too large"}, status_code=413)(scope, receive, send)
                    return
            except ValueError:
                await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, send)
                return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await JSONResponse({"detail": "Request body is too large"}, status_code=413)(scope, receive, send)
