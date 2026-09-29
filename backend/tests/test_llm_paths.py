from __future__ import annotations

from unittest.mock import patch

import pytest
from pydantic_ai.models.test import TestModel

from app.services.ai.agents import classification, reasoning, suggestion, vision
from app.services.ai.agents.orchestrator import OrchestratorAgent
from app.services.ai.schemas.pipeline import (
    AlertEvent,
    CameraResult,
    ConfirmationStatus,
    SatelliteResult,
    WeatherResult,
)


def _reset_agents():
    for mod in (reasoning, classification, suggestion, vision):
        mod._agent._agent = None


@pytest.fixture
def llm_on(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    _reset_agents()
    yield
    _reset_agents()


def _stage1(cam=0.9, frp=80.0):
    return (
        CameraResult(confidence=cam, detected=cam > 0.5, image_url=None),
        SatelliteResult(thermal_confidence=frp / 100, hotspot_detected=True, raw={"hotspots": [{"frp": frp}]}),
        WeatherResult(wind_speed=12.0, wind_direction=225.0, humidity=15.0, spread_risk=0.66),
    )


async def _run(orch, cam, sat, wx):
    with (
        patch.object(orch.camera, "run", return_value=cam),
        patch.object(orch.satellite, "run", return_value=sat),
        patch.object(orch.weather, "run", return_value=wx),
    ):
        return await orch.run(event=AlertEvent(lat=38.9, lon=-120.0))


async def test_llm_success_path_uses_llm(llm_on):
    with patch("app.services.ai.agents.llm.build_model", return_value=TestModel()):
        r = await _run(OrchestratorAgent(), *_stage1())
    assert r.fusion.status == ConfirmationStatus.CONFIRMED
    assert r.reasoning.source == "llm"
    assert r.classification.source == "llm"
    assert r.suggestion.source == "llm"
    assert 0.0 <= r.classification.score <= 1.0
    assert r.output.review_status == "pending_review"
    assert r.error is None


async def test_llm_failure_falls_back(llm_on):
    def boom():
        raise RuntimeError("invalid api key")

    with patch("app.services.ai.agents.llm.build_model", side_effect=boom):
        r = await _run(OrchestratorAgent(), *_stage1())
    assert r.reasoning.source.startswith("fallback")
    assert r.classification.criticality.value in {"HIGH", "CRITICAL"}
    assert r.suggestion.action_plan
    assert r.error is None


async def test_no_key_uses_rules():
    r = await _run(OrchestratorAgent(), *_stage1())
    assert r.classification.source == "fallback:no_llm_key"
    assert "SW" in r.reasoning.key_observations[1] or "NE" in r.reasoning.key_observations[1]


async def test_dismissed_stops_early():
    r = await _run(OrchestratorAgent(), *_stage1(cam=0.0, frp=0.0)[:1], SatelliteResult(thermal_confidence=0.0, hotspot_detected=False), _stage1()[2])
    assert r.fusion.status == ConfirmationStatus.DISMISSED
    assert r.reasoning is None


async def test_vision_fallback_detector(llm_on, monkeypatch):
    from app.config import settings
    from app.services.ai.agents.camera import CameraAgent

    monkeypatch.setattr(settings, "yolo_model_path", "models/does_not_exist.pt")
    with patch("app.services.ai.agents.llm.build_model", return_value=TestModel(custom_output_args={"fire_probability": 0.8, "evidence": "plume"})):
        r = await CameraAgent().run(lat=38.9, lon=-120.0, image_url="demo_images/smoke_plume.jpg")
    assert r.telemetry["detector"] == "vision_llm"
    assert r.detected and r.confidence == 0.8


def test_claude_provider_selected(monkeypatch):
    from app.config import settings
    from app.services.ai.agents import llm

    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert llm.provider() == "anthropic"
    assert type(llm.build_model()).__name__ == "AnthropicModel"
    monkeypatch.setattr(settings, "llm_provider", "openai")
    assert llm.provider() == "openai"
    assert type(llm.build_model()).__name__ == "OpenAIChatModel"
