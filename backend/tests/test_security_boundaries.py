from __future__ import annotations

import base64
import io
import json

import pytest
from PIL import Image

from app.config import settings
from app.db.models import User, UserRole
from app.dependencies import require_admin
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers.auth import register
from app.routers.auth import me
from app.routers.ai import _incident_row
from app.schemas.routers import RegisterRequest
from app.services.ai.agents.camera import CameraAgent
from app.services.ai.agents.images import load_image_bytes
from app.services.ai.agents import replay
from app.services.ai.agents.satellite import SatelliteAgent
from app.services.ai.agents.weather import WeatherAgent
from app.services.ai.schemas.pipeline import AlertEvent, CameraResult, PipelineResult, SatelliteResult, WeatherResult


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
async def test_admin_dependency_rejects_anonymous_local_demo(monkeypatch):
    monkeypatch.setattr(settings, "auth_required", False)
    with pytest.raises(Exception) as exc:
        await require_admin(None)
    assert getattr(exc.value, "status_code", None) == 403


@pytest.mark.asyncio
async def test_admin_dependency_keeps_role_boundary_when_auth_is_optional(monkeypatch):
    monkeypatch.setattr(settings, "auth_required", False)
    standard_user = User(email="user@example.com", hashed_password="hash", role=UserRole.USER)
    admin_user = User(email="admin@example.com", hashed_password="hash", role=UserRole.ADMIN)

    with pytest.raises(Exception) as exc:
        await require_admin(standard_user)
    assert getattr(exc.value, "status_code", None) == 403
    assert await require_admin(admin_user) is admin_user


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
async def test_camera_fallback_validates_and_does_not_retain_data_url(monkeypatch):
    from app.services.ai.agents import camera as camera_module

    monkeypatch.setattr(camera_module, "YOLO", None)
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    payload = base64.b64encode(_png()).decode()
    ref = f"data:image/png;base64,{payload}"

    result = await CameraAgent().run(lat=37.0, lon=-122.0, image_url=ref)

    assert result.detected is True
    assert result.image_url is None


@pytest.mark.asyncio
async def test_camera_fallback_rejects_invalid_data_url(monkeypatch):
    from app.services.ai.agents import camera as camera_module

    monkeypatch.setattr(camera_module, "YOLO", None)
    with pytest.raises(ValueError):
        await CameraAgent().run(lat=37.0, lon=-122.0, image_url="data:image/png;base64,not-valid-base64")


def test_incident_and_replay_redact_inline_image_data(monkeypatch, tmp_path):
    ref = "data:image/png;base64," + base64.b64encode(_png()).decode()
    event = AlertEvent(lat=37.0, lon=-122.0, image_url=ref)
    result = PipelineResult(
        event_id=event.event_id,
        camera=CameraResult(confidence=0.0, detected=False, image_url=ref),
    )
    assert _incident_row(result, event).result["camera"]["image_url"] is None

    monkeypatch.setattr(settings, "replay_dir", str(tmp_path))
    replay.save(
        event,
        result.camera,
        SatelliteResult(thermal_confidence=0.0, hotspot_detected=False),
        WeatherResult(wind_speed=0.0, wind_direction=0.0, humidity=0.0, spread_risk=0.0),
    )
    saved = next(tmp_path.glob("*.json"))
    payload = json.loads(saved.read_text())
    assert "data:" not in saved.name
    assert payload["event"]["image_url"] is None
    assert payload["camera"]["image_url"] is None


@pytest.mark.asyncio
async def test_camera_raw_and_incident_redact_nested_inline_image_data(monkeypatch):
    from app.services.ai.agents import camera as camera_module

    monkeypatch.setattr(settings, "camera_source", "alertca")
    monkeypatch.setattr(settings, "alertca_api_key", "test")
    monkeypatch.setattr(camera_module, "YOLO", None)
    nested_ref = "data:image/png;base64," + base64.b64encode(_png()).decode()

    async def alertca_response(*_args):
        return {"cameras": [{"image_url": nested_ref}]}

    monkeypatch.setattr(CameraAgent, "_fetch_alertca", alertca_response)
    result = await CameraAgent().run(lat=37.0, lon=-122.0)
    assert result.raw["cameras"][0]["image_url"] is None

    event = AlertEvent(lat=37.0, lon=-122.0)
    row = _incident_row(PipelineResult(event_id=event.event_id, camera=result), event)
    assert row.result["camera"]["raw"]["cameras"][0]["image_url"] is None


@pytest.mark.asyncio
async def test_auth_me_rejects_anonymous_optional_auth(monkeypatch):
    monkeypatch.setattr(settings, "auth_required", False)
    with pytest.raises(Exception) as exc:
        await me(None)
    assert getattr(exc.value, "status_code", None) == 401


@pytest.mark.asyncio
async def test_provider_failures_do_not_serialize_request_secrets(monkeypatch):
    from unittest.mock import AsyncMock

    sentinel = "provider-secret-must-not-leak"
    monkeypatch.setattr(settings, "nasa_firms_map_key", sentinel)
    monkeypatch.setattr(
        "app.services.ai.agents.satellite.fetch_firms_rows",
        AsyncMock(side_effect=RuntimeError(f"https://firms.example/{sentinel}")),
    )
    satellite = await SatelliteAgent().run(lat=37.0, lon=-122.0)
    assert sentinel not in str(satellite.model_dump())
    assert satellite.raw == {"error": "nasa_firms_response_invalid"}

    monkeypatch.setattr(settings, "openweathermap_api_key", sentinel)
    monkeypatch.setattr(
        "app.services.ai.agents.weather.httpx_get_json",
        AsyncMock(side_effect=RuntimeError(f"https://weather.example/?appid={sentinel}")),
    )
    weather = await WeatherAgent().run(lat=37.0, lon=-122.0)
    assert sentinel not in str(weather.model_dump())
    assert weather.raw == {"error": "openweather_response_invalid"}


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
