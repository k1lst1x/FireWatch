from __future__ import annotations

import base64
import io

import pytest
from PIL import Image

from app.config import settings
from app.db.models import UserRole
from app.dependencies import require_admin
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers.auth import register
from app.schemas.routers import RegisterRequest
from app.services.ai.agents.images import load_image_bytes


def _png(width: int = 1, height: int = 1) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (width, height), "red").save(out, format="PNG")
    return out.getvalue()


@pytest.mark.asyncio
async def test_admin_dependency_rejects_anonymous_when_auth_is_enabled(monkeypatch):
    monkeypatch.setattr(settings, "auth_required", True)
    with pytest.raises(Exception) as exc:
        await require_admin(None)
    assert getattr(exc.value, "status_code", None) == 403


@pytest.mark.asyncio
async def test_admin_dependency_allows_anonymous_local_demo(monkeypatch):
    monkeypatch.setattr(settings, "auth_required", False)
    assert await require_admin(None) is None


@pytest.mark.asyncio
async def test_image_loader_accepts_small_single_frame_image():
    payload = base64.b64encode(_png()).decode()
    assert await load_image_bytes(f"data:image/png;base64,{payload}")


@pytest.mark.asyncio
async def test_image_loader_rejects_excessive_pixel_count(monkeypatch):
    monkeypatch.setattr(settings, "max_image_pixels", 1)
    payload = base64.b64encode(_png(2, 2)).decode()
    with pytest.raises(ValueError, match="pixel count"):
        await load_image_bytes(f"data:image/png;base64,{payload}")


@pytest.mark.asyncio
async def test_image_loader_rejects_unapproved_https_host():
    with pytest.raises(ValueError, match="host is not allowed"):
        await load_image_bytes("https://attacker.example/image.png")


@pytest.mark.asyncio
async def test_public_registration_never_self_assigns_admin():
    class Result:
        def scalar_one_or_none(self):
            return None

    class Session:
        def __init__(self):
            self.user = None

        async def execute(self, *_args):
            return Result()

        def add(self, user):
            self.user = user

        async def commit(self):
            return None

        async def refresh(self, user):
            user.id = 1

    session = Session()
    await register(RegisterRequest(email="operator@example.com", password="password123"), session)
    assert session.user.role is UserRole.USER


@pytest.mark.asyncio
async def test_login_rate_limit_returns_429(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    monkeypatch.setattr(settings, "login_rate_limit_per_minute", 1)
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.post("/auth/login")
    async def login():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.post("/auth/login")).status_code == 200
        blocked = await client.post("/auth/login")
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"]


@pytest.mark.asyncio
async def test_registration_rate_limit_returns_429(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    monkeypatch.setattr(settings, "login_rate_limit_per_minute", 1)
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.post("/auth/register")
    async def register_route():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.post("/auth/register")).status_code == 200
        assert (await client.post("/auth/register")).status_code == 429


@pytest.mark.asyncio
async def test_analysis_body_limit_rejects_oversized_content_length():
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient
    from app.middleware.rate_limit import RequestBodyLimitMiddleware

    app = FastAPI()
    app.add_middleware(RequestBodyLimitMiddleware, max_bytes=8)

    @app.post("/ai/analyze")
    async def analyze_route():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ai/analyze", content=b"012345678")
    assert response.status_code == 413
