from __future__ import annotations

import logging
import math
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.config import settings

from .http_retry import httpx_get_json

logger = logging.getLogger(__name__)

CAMERAS_URL = "https://api.cdn.prod.alertwest.com/api/getCameraDataByLoc"
IMG_BASE = "https://img.cdn.prod.alertwest.com/data/img"

_EPOCH_RE = re.compile(r"_(\d{10})(?:_|\.)")


@dataclass
class Camera:
    cid: str
    name: str
    lat: float
    lon: float
    img: str | None
    offline: bool
    raw: dict[str, Any]

    def image_url(self) -> str | None:
        return build_image_url(self.cid, self.img)


def build_image_url(cid: str, img: str | None) -> str | None:
    if not img:
        return None
    if img.startswith(("http://", "https://")):
        return img
    m = _EPOCH_RE.search(img)
    if not m:
        return None
    d = datetime.fromtimestamp(int(m.group(1)), tz=timezone.utc)
    return f"{IMG_BASE}/{cid}/{d:%Y}/{d:%m}/{d:%d}/{img}"


def _key_lookup(key: Any, rows: list[dict[str, Any]]) -> dict[str, str]:
    if not isinstance(key, dict) or not key:
        return {}
    present = set().union(*(r.keys() for r in rows[:50])) if rows else set()
    pairs = [(str(a), str(b)) for a, b in key.items()]
    keys_side = sum(a in present for a, _ in pairs)
    values_side = sum(b in present for _, b in pairs)
    if values_side > keys_side:
        pairs = [(b, a) for a, b in pairs]
    out: dict[str, str] = {}
    for abbr, human in pairs:
        out[human.lower()] = abbr
        out[abbr.lower()] = abbr
    return out


def _pick(row: dict[str, Any], lookup: dict[str, str], *names: str) -> Any:
    for n in names:
        if n in row and row[n] not in (None, ""):
            return row[n]
        abbr = lookup.get(n.lower())
        if abbr is not None and abbr in row and row[abbr] not in (None, ""):
            return row[abbr]
    return None


def _truthy(v: Any) -> bool:
    if isinstance(v, str):
        return v.strip().lower() in {"1", "true", "yes", "y", "t"}
    return bool(v)


def _to_float(v: Any) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def _rows(block: Any) -> tuple[list[dict[str, Any]], dict[str, str]]:
    if isinstance(block, dict):
        rows = [r for r in (block.get("data") or []) if isinstance(r, dict)]
        return rows, _key_lookup(block.get("key"), rows)
    if isinstance(block, list):
        return [r for r in block if isinstance(r, dict)], {}
    return [], {}


def parse_cameras(payload: Any) -> list[Camera]:
    root = payload.get("data", payload) if isinstance(payload, dict) else {}
    if not isinstance(root, dict):
        return []
    cam_rows, cam_key = _rows(root.get("cams"))
    loc_rows, loc_key = _rows(root.get("locs"))

    locs: dict[str, dict[str, Any]] = {}
    for loc in loc_rows:
        lid = _pick(loc, loc_key, "id", "lid", "locationId")
        if lid is not None:
            locs[str(lid)] = loc

    cams: list[Camera] = []
    for row in cam_rows:
        cid = _pick(row, cam_key, "id", "cid", "cameraId")
        if cid is None:
            continue
        lid = _pick(row, cam_key, "lid", "locationId")
        loc = locs.get(str(lid), {}) if lid is not None else {}
        lat = _to_float(_pick(row, cam_key, "lat", "latitude"))
        lon = _to_float(_pick(row, cam_key, "lon", "lng", "longitude"))
        if lat is None or lon is None:
            lat = _to_float(_pick(loc, loc_key, "lat", "latitude"))
            lon = _to_float(_pick(loc, loc_key, "lon", "lng", "longitude"))
        if lat is None or lon is None:
            continue
        name = _pick(row, cam_key, "cn", "name", "cameraName") or _pick(loc, loc_key, "name", "ln", "locationName") or str(cid)
        img = _pick(row, cam_key, "img", "image", "latestImage")
        cams.append(
            Camera(
                cid=str(cid),
                name=str(name),
                lat=lat,
                lon=lon,
                img=str(img) if img else None,
                offline=_truthy(_pick(row, cam_key, "off", "offline")),
                raw=row,
            )
        )
    return cams


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest(cams: list[Camera], lat: float, lon: float, max_km: float) -> list[tuple[float, Camera]]:
    ranked = sorted(
        ((haversine_km(lat, lon, c.lat, c.lon), c) for c in cams if not c.offline and c.image_url()),
        key=lambda x: x[0],
    )
    return [x for x in ranked if x[0] <= max_km]


_cache: dict[str, Any] = {"at": 0.0, "cams": []}


async def fetch_cameras() -> list[Camera]:
    ttl = settings.alertwest_cache_ttl_sec
    if _cache["cams"] and time.time() - _cache["at"] < ttl:
        return _cache["cams"]
    payload = await httpx_get_json(
        CAMERAS_URL,
        timeout=20.0,
        max_attempts=settings.collection_http_max_attempts,
        label="alertwest",
    )
    if isinstance(payload, dict) and payload.get("code") not in (None, 1, "1"):
        raise RuntimeError(f"AlertWest error: {payload.get('str')}")
    cams = parse_cameras(payload)
    if not cams:
        raise RuntimeError("AlertWest returned no parseable cameras")
    _cache.update(at=time.time(), cams=cams)
    logger.info("AlertWest: %d cameras loaded", len(cams))
    return cams
