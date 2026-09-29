from __future__ import annotations

import pathlib

from app.config import settings

_ROOT = pathlib.Path(__file__).resolve().parents[4]


def _has(v: str | None) -> bool:
    return bool((v or "").strip())


def _weights_path() -> pathlib.Path:
    p = pathlib.Path(settings.yolo_model_path)
    return p if p.is_absolute() else _ROOT / p


def integration_status() -> dict:
    from app.services.ai.agents.llm import model_name, provider

    llm = provider() is not None
    weights = _weights_path().is_file()
    return {
        "mock": settings.is_mock,
        "replay": settings.replay_mode,
        "human_approval": settings.require_human_approval,
        # Configuration health only: credential values never leave the server.
        "key_status": {
            "anthropic_api_key": {"label": "Anthropic API", "environment": "ANTHROPIC_API_KEY", "configured": _has(settings.anthropic_api_key), "used_for": "LLM reasoning when Anthropic is selected"},
            "openai_api_key": {"label": "OpenAI API", "environment": "OPENAI_API_KEY", "configured": _has(settings.openai_api_key), "used_for": "LLM and vision fallback when OpenAI is selected"},
            "nebius_api_key": {"label": "Nebius AI Studio", "environment": "NEBIUS_API_KEY", "configured": _has(settings.nebius_api_key), "used_for": "OpenAI-compatible LLM provider when selected"},
            "flower_api_key": {"label": "Flower AI", "environment": "FLOWER_API_KEY", "configured": _has(settings.flower_api_key), "used_for": "Independent multi-agent deliberation reviewer"},
            "nasa_firms_map_key": {"label": "NASA FIRMS", "environment": "NASA_FIRMS_MAP_KEY", "configured": _has(settings.nasa_firms_map_key), "used_for": "Satellite thermal hotspot lookups"},
            "openweathermap_api_key": {"label": "OpenWeatherMap", "environment": "OPENWEATHERMAP_API_KEY", "configured": _has(settings.openweathermap_api_key), "used_for": "Weather observations; Open-Meteo remains the fallback"},
            "alertca_api_key": {"label": "ALERTCalifornia", "environment": "ALERTCA_API_KEY", "configured": _has(settings.alertca_api_key), "used_for": "Partner camera directory when CAMERA_SOURCE=alertca"},
            "dashboard_webhook_url": {"label": "Dispatch webhook", "environment": "DASHBOARD_WEBHOOK_URL", "configured": _has(settings.dashboard_webhook_url), "used_for": "Approved incident notifications"},
            "secret_key": {"label": "JWT signing key", "environment": "SECRET_KEY", "configured": _has(settings.secret_key), "used_for": "Local API authentication tokens"},
        },
        "integrations": {
            "llm": {
                "live": llm,
                "model": model_name(),
                "provider": provider() or "none",
                "fallback": None if llm else "rule-based reasoning, classification and plans",
            },
            "camera_detector": {
                "live": weights or llm,
                "detector": "yolo" if weights else ("vision_llm" if llm else None),
                "weights": settings.yolo_model_path,
            },
            "cameras": {
                "live": settings.camera_source == "alertwest" or _has(settings.alertca_api_key),
                "source": "alertwest (public, no key)" if settings.camera_source == "alertwest" else "alertca",
            },
            "satellite_firms": {
                "live": _has(settings.nasa_firms_map_key),
                "source": settings.firms_source,
                "fallback": None if _has(settings.nasa_firms_map_key) else "none — thermal score 0",
            },
            "weather": {
                "live": True,
                "provider": "openweathermap" if _has(settings.openweathermap_api_key) else "open-meteo (keyless)",
            },
            "webhook": {"live": _has(settings.dashboard_webhook_url)},
        },
    }
