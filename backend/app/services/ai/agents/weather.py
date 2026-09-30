"""Local fire-weather context via **OpenWeatherMap** Current Weather API.

Documentation:
  https://openweathermap.org/current

Coordinates are passed through from the incident (``lat``, ``lon``). For California
operations, use WGS84 decimal degrees inside the state; the same API serves any
location worldwide.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import settings
from app.services.ai.schemas.pipeline import WeatherResult

from .base import BaseAgent
from .collection_cache import get_named_cache
from .geo_hints import log_if_outside_california
from .http_retry import httpx_get_json

logger = logging.getLogger(__name__)

_OWM_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_open_meteo(lat: float, lon: float) -> dict[str, Any] | None:
    try:
        data = await httpx_get_json(
            _OPEN_METEO_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "relative_humidity_2m,wind_speed_10m,wind_direction_10m,temperature_2m",
                "wind_speed_unit": "ms",
            },
            timeout=10.0,
            max_attempts=2,
            label="open_meteo",
        )
    except Exception as exc:
        logger.warning("Open-Meteo fallback failed: %s", exc)
        return None
    cur = data.get("current") if isinstance(data, dict) else None
    if not isinstance(cur, dict) or "wind_speed_10m" not in cur:
        return None
    return data


def _owm_ok(payload: dict[str, Any]) -> bool:
    cod = payload.get("cod")
    if cod is None:
        return True
    return cod == 200 or cod == "200"


def _weather_cache_key(lat: float, lon: float) -> str:
    return f"{round(lat, 4)},{round(lon, 4)}"


class WeatherAgent(BaseAgent):
    name = "weather"

    @staticmethod
    def _spread_risk(wind_speed: float, humidity: float) -> float:
        """Heuristic: high wind + low humidity → high spread risk (0–1)."""
        wind_factor = min(wind_speed / 20.0, 1.0)  # 20 m/s → 1.0
        humidity_factor = max(1.0 - humidity / 100.0, 0.0)
        return round(wind_factor * 0.6 + humidity_factor * 0.4, 3)

    async def _fallback(self, lat: float, lon: float, t0: float, error_code: str, telemetry: dict[str, Any]) -> WeatherResult:
        if settings.weather_fallback:
            data = await fetch_open_meteo(lat, lon)
            if data is not None:
                cur = data["current"]
                wind_speed = float(cur.get("wind_speed_10m") or 0.0)
                wind_direction = float(cur.get("wind_direction_10m") or 0.0) % 360
                humidity = float(cur.get("relative_humidity_2m") or 50.0)
                return WeatherResult(
                    wind_speed=wind_speed,
                    wind_direction=wind_direction,
                    humidity=humidity,
                    spread_risk=self._spread_risk(wind_speed, humidity),
                    raw={**data, "provider": "open-meteo", "primary_error": error_code},
                    latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                    telemetry={**telemetry, "provider": "open-meteo"},
                )
        return WeatherResult(
            wind_speed=0.0,
            wind_direction=0.0,
            humidity=0.0,
            spread_risk=0.0,
            raw={"error": error_code},
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            telemetry=telemetry,
        )

    async def run(self, *, lat: float, lon: float, **_) -> WeatherResult:
        t0 = time.perf_counter()
        if settings.is_mock:
            return WeatherResult(
                wind_speed=13.5,
                wind_direction=225.0,
                humidity=18.0,
                spread_risk=self._spread_risk(13.5, 18.0),
                raw={"wind": {"speed": 13.5, "deg": 225}, "main": {"humidity": 18}},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={},
            )

        log_if_outside_california(lat, lon, context="weather")
        max_attempts = settings.collection_http_max_attempts

        if not (settings.openweathermap_api_key or "").strip():
            logger.warning("OPENWEATHERMAP_API_KEY missing; trying keyless fallback")
            return await self._fallback(lat, lon, t0, "missing OPENWEATHERMAP_API_KEY", {"http_max_attempts": max_attempts})

        cache = get_named_cache("openweather", settings.collection_cache_ttl_sec)
        wkey = _weather_cache_key(lat, lon)
        if cache is not None:
            cached = await cache.get(wkey)
            if cached is not None:
                return cached.model_copy(
                    deep=True,
                    update={
                        "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                        "telemetry": {
                            **(cached.telemetry or {}),
                            "cache_hit": True,
                            "api_calls_saved": 1,
                        },
                    },
                )

        try:
            data = await httpx_get_json(
                _OWM_CURRENT_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": settings.openweathermap_api_key,
                    "units": "metric",
                },
                timeout=12.0,
                max_attempts=max_attempts,
                label="openweather",
            )
        except httpx.HTTPError as exc:
            logger.warning("OpenWeatherMap request failed (%s)", type(exc).__name__)
            return await self._fallback(lat, lon, t0, "openweather_request_failed", {"http_max_attempts": max_attempts})
        except Exception as exc:  # pragma: no cover
            logger.warning("OpenWeatherMap request failed (%s)", type(exc).__name__)
            return await self._fallback(lat, lon, t0, "openweather_response_invalid", {"http_max_attempts": max_attempts})

        if not isinstance(data, dict) or not _owm_ok(data):
            logger.warning("OpenWeatherMap returned an invalid response")
            return await self._fallback(lat, lon, t0, "openweather_api_error", {"http_max_attempts": max_attempts})

        wind = data.get("wind", {}) or {}
        main = data.get("main", {}) or {}
        wind_speed = float(wind.get("speed", 0))
        wind_direction = float(wind.get("deg", 0))
        humidity = float(main.get("humidity", 50))

        result = WeatherResult(
            wind_speed=wind_speed,
            wind_direction=wind_direction,
            humidity=humidity,
            spread_risk=self._spread_risk(wind_speed, humidity),
            raw=data,
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            telemetry={"http_max_attempts": max_attempts, "cache_hit": False},
        )

        if cache is not None:
            await cache.set(wkey, result)

        return result
