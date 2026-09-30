"""Thermal wildfire hotspots via **NASA FIRMS** (global coverage, includes all of California).

Official API and map key registration:
  https://firms.modaps.eosdis.nasa.gov/api/area/

This agent uses the **VIIRS_SNPP_NRT** layer (Suomi NPP, near real-time). Bounding
box format is ``west,south,east,north`` in decimal degrees, per NASA Area API.
California falls entirely within valid bounds for this product.
"""
from __future__ import annotations

import csv
import hashlib
import io
import logging
import time
from typing import Any

import httpx

from app.config import settings
from app.services.ai.schemas.pipeline import SatelliteResult

from .base import BaseAgent
from .collection_cache import get_named_cache
from .geo_hints import log_if_outside_california
from .http_retry import httpx_get_bytes

logger = logging.getLogger(__name__)


def _frp_value(hotspot: dict[str, Any]) -> float | None:
    raw = hotspot.get("frp")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


_VIIRS_CONF = {"l": 0.3, "low": 0.3, "n": 0.65, "nominal": 0.65, "h": 0.9, "high": 0.9}


def _conf_value(hotspot: dict[str, Any]) -> float | None:
    raw = hotspot.get("confidence")
    if raw is None:
        return None
    key = str(raw).strip().lower()
    if key in _VIIRS_CONF:
        return _VIIRS_CONF[key]
    try:
        return max(0.0, min(1.0, float(key) / 100.0))
    except ValueError:
        return None


class FirmsApiError(Exception):
    pass


async def fetch_firms_rows(url: str, *, timeout: float, max_attempts: int) -> dict[str, Any]:
    body = await httpx_get_bytes(url, timeout=timeout, max_attempts=max_attempts, label="nasa_firms")
    text = body.decode("utf-8-sig", errors="replace").strip()
    if not text:
        return {"data": []}
    header = {c.strip().lower() for c in text.splitlines()[0].split(",")}
    if not header & {"latitude", "longitude", "frp", "confidence", "bright_ti4", "acq_date"}:
        raise FirmsApiError(text[:200])
    rows = list(csv.DictReader(io.StringIO(text)))
    return {"data": rows}


def _satellite_cache_key(lat: float, lon: float, bbox_half: float, map_key: str) -> str:
    west, south, east, north = lon - bbox_half, lat - bbox_half, lon + bbox_half, lat + bbox_half
    raw = f"{west:.5f},{south:.5f},{east:.5f},{north:.5f}|{map_key}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


class SatelliteAgent(BaseAgent):
    name = "satellite"

    async def run(self, *, lat: float, lon: float, **_) -> SatelliteResult:
        t0 = time.perf_counter()
        if settings.is_mock:
            return SatelliteResult(
                thermal_confidence=0.76,
                hotspot_detected=True,
                raw={"hotspots": [{"frp": 76.0, "latitude": lat, "longitude": lon}]},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={"bbox_half_deg": 0.1},
            )
        log_if_outside_california(lat, lon, context="satellite")
        # NASA FIRMS – active fire / hotspot data (VIIRS SNPP Near-Real-Time)
        bbox_half = settings.firms_bbox_half_deg
        max_attempts = settings.collection_http_max_attempts
        frp_norm = settings.firms_frp_normalize

        if not (settings.nasa_firms_map_key or "").strip():
            logger.warning("NASA_FIRMS_MAP_KEY missing; satellite stage skipped")
            return SatelliteResult(
                thermal_confidence=0.0,
                hotspot_detected=False,
                raw={"error": "missing NASA_FIRMS_MAP_KEY"},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={
                    "http_max_attempts": max_attempts,
                    "bbox_half_deg": bbox_half,
                    "frp_normalize": frp_norm,
                },
            )

        cache = get_named_cache("satellite_firms", settings.collection_cache_ttl_sec)
        ckey = _satellite_cache_key(lat, lon, bbox_half, settings.nasa_firms_map_key)
        if cache is not None:
            cached = await cache.get(ckey)
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

        west, south, east, north = lon - bbox_half, lat - bbox_half, lon + bbox_half, lat + bbox_half
        bbox = f"{west},{south},{east},{north}"
        url = (
            f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
            f"{settings.nasa_firms_map_key}/{settings.firms_source}/{bbox}/{settings.firms_day_range}"
        )

        try:
            data = await fetch_firms_rows(url, timeout=18.0, max_attempts=max_attempts)
        except httpx.HTTPError as exc:
            logger.warning("NASA FIRMS request failed (%s)", type(exc).__name__)
            return SatelliteResult(
                thermal_confidence=0.0,
                hotspot_detected=False,
                raw={"error": "nasa_firms_request_failed"},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={"http_max_attempts": max_attempts, "bbox_half_deg": bbox_half},
            )
        except Exception as exc:  # pragma: no cover - JSON/defensive
            logger.warning("NASA FIRMS request failed (%s)", type(exc).__name__)
            return SatelliteResult(
                thermal_confidence=0.0,
                hotspot_detected=False,
                raw={"error": "nasa_firms_response_invalid"},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={"http_max_attempts": max_attempts, "bbox_half_deg": bbox_half},
            )

        hotspots = data if isinstance(data, list) else data.get("data", [])
        if not isinstance(hotspots, list):
            hotspots = []
        hotspot_detected = len(hotspots) > 0
        thermal_confidence = 0.0

        if hotspot_detected:
            scores: list[float] = []
            for h in hotspots:
                if isinstance(h, dict):
                    frp = _frp_value(h)
                    conf = _conf_value(h)
                    parts = [x for x in (min(frp / frp_norm, 1.0) if frp is not None else None, conf) if x is not None]
                    if parts:
                        scores.append(max(parts))
            if scores:
                thermal_confidence = round(max(scores), 4)

        result = SatelliteResult(
            thermal_confidence=thermal_confidence,
            hotspot_detected=hotspot_detected,
            raw={"hotspots": hotspots},
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            telemetry={
                "http_max_attempts": max_attempts,
                "bbox_half_deg": bbox_half,
                "frp_normalize": frp_norm,
                "cache_hit": False,
            },
        )

        if cache is not None:
            await cache.set(ckey, result)

        return result
