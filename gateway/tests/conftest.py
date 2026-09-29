"""Test harness: stub heavy imports before gateway app modules load."""

from __future__ import annotations

import sys
from unittest.mock import MagicMock

# Camera agent imports ultralytics at module load time; avoid requiring PyTorch in CI.
sys.modules.setdefault("ultralytics", MagicMock())

import pytest

from app.services.ai.agents.collection_cache import clear_all_collection_caches


@pytest.fixture(autouse=True)
def _isolate_collection_caches() -> None:
    clear_all_collection_caches()
    yield
    clear_all_collection_caches()


@pytest.fixture(autouse=True)
def _no_live_fallbacks(monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "weather_fallback", False)
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "camera_source", "alertca")
    monkeypatch.setattr(settings, "federated_fusion", False)
