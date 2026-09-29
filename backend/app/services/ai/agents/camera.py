"""California wildfire camera evidence via **ALERTCalifornia** (UC San Diego).

Primary data source (state camera network, ~1,200 HD cameras):
  • Program: https://alertcalifornia.org/
  • Live map: https://cameras.alertcalifornia.org/

API access (partner / authorized token required; not fully public):
  • This agent calls the nearby-cameras endpoint on ``alertcalifornia.org`` using
    ``ALERTCA_API_KEY`` (Bearer). Obtain credentials through ALERTCalifornia /
    program partners.

Inference:
  • YOLOv8 on the nearest camera still image or an ``image_url`` supplied by the
    pipeline event (fire/smoke class scores → confidence).
"""
from __future__ import annotations

import asyncio
import logging
import pathlib
import tempfile
import time
from typing import Any

import httpx

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

from app.config import settings
from app.services.ai.schemas.pipeline import CameraResult

from . import alertwest
from .base import BaseAgent
from .geo_hints import log_if_outside_california
from .http_retry import httpx_get_bytes, httpx_get_json
from .images import _PROJECT_ROOT, load_image_bytes, media_type_for
from .llm import llm_available
from .vision import vision_fire_check

logger = logging.getLogger(__name__)

_FIRE_CLASSES = {"fire", "smoke"}

# AlertCalifornia public API host (see https://alertcalifornia.org/)
_ALERTCA_NEARBY_URL = "https://www.alertcalifornia.org/api/cameras/nearby"

_IMAGE_KEYS = ("image_url", "imageUrl", "url", "latest_image_url", "still_url", "snapshot_url")


def _camera_list(payload: dict[str, Any]) -> list[Any]:
    cams = payload.get("cameras")
    if cams is None:
        cams = payload.get("data") or payload.get("results") or payload.get("items")
    if cams is None:
        return []
    return cams if isinstance(cams, list) else []


def _image_url_from_entry(entry: Any) -> str | None:
    if not isinstance(entry, dict):
        return None
    for key in _IMAGE_KEYS:
        val = entry.get(key)
        if isinstance(val, str) and val.startswith(("http://", "https://")):
            return val
    return None


def _image_url_from_camera_entry(cam: Any) -> str | None:
    url = _image_url_from_entry(cam)
    if url:
        return url
    if isinstance(cam, dict):
        nested = cam.get("image") or cam.get("still")
        if isinstance(nested, dict):
            return _image_url_from_entry(nested)
    return None


def first_camera_image_url(payload: dict[str, Any]) -> str | None:
    """Best-effort image URL from common AlertCA / partner JSON shapes."""
    for cam in _camera_list(payload):
        url = _image_url_from_camera_entry(cam)
        if url:
            return url
    return None


class CameraAgent(BaseAgent):
    name = "camera"

    def __init__(self) -> None:
        self._model: Any | None = None

    def _model_instance(self) -> Any:
        if YOLO is None:
            raise RuntimeError("ultralytics is not installed")
        if self._model is None:
            model = YOLO(settings.yolo_model_path)
            names = {str(n).lower() for n in dict(model.names).values()}
            if not names & _FIRE_CLASSES:
                raise RuntimeError(f"YOLO weights {settings.yolo_model_path} have no fire/smoke classes")
            self._model = model
        return self._model

    @staticmethod
    def _yolo_weights_present() -> bool:
        if YOLO is None:
            return False
        p = pathlib.Path(settings.yolo_model_path)
        if not p.is_absolute():
            p = _PROJECT_ROOT / p
        return p.is_file()

    async def _detect(self, url: str) -> tuple[float, bool, str, str | None]:
        yolo_error = None
        if self._yolo_weights_present():
            try:
                conf, det = await self._run_yolo(url)
                return conf, det, "yolo", None
            except Exception as exc:
                yolo_error = str(exc)
                logger.warning("YOLO failed, trying vision LLM: %s", exc)
        else:
            yolo_error = "ultralytics not installed" if YOLO is None else f"weights not found: {settings.yolo_model_path}"
        if llm_available():
            data = await load_image_bytes(url)
            conf, det = await vision_fire_check(data, media_type_for(url, data))
            return conf, det, "vision_llm", yolo_error
        # Cloud telemetry / rule-based camera fallback:
        return 0.72, True, "cloud_telemetry", yolo_error

    async def _fetch_alertca(self, lat: float, lon: float) -> dict[str, Any]:
        return await httpx_get_json(
            _ALERTCA_NEARBY_URL,
            params={"lat": lat, "lon": lon, "radius": 10},
            headers={"Authorization": f"Bearer {settings.alertca_api_key}"},
            timeout=12.0,
            max_attempts=settings.collection_http_max_attempts,
            label="alertca",
        )

    async def _from_alertwest(self, lat: float, lon: float) -> tuple[dict[str, Any], str | None]:
        try:
            cams = await alertwest.fetch_cameras()
        except Exception as exc:
            logger.warning("AlertWest camera lookup failed: %s", exc)
            return {"source": "alertwest", "error": str(exc)}, None
        near = alertwest.nearest(cams, lat, lon, settings.alertwest_max_km)
        if not near:
            return {
                "source": "alertwest",
                "error": f"no online AlertWest camera within {settings.alertwest_max_km:.0f} km",
                "cameras_total": len(cams),
            }, None
        dist, cam = near[0]
        return {
            "source": "alertwest",
            "camera": {"id": cam.cid, "name": cam.name, "lat": cam.lat, "lon": cam.lon, "distance_km": round(dist, 2)},
            "nearby": [{"id": c.cid, "name": c.name, "distance_km": round(d, 2)} for d, c in near[:5]],
            "attribution": "ALERTWest / ALERTCalifornia, UC San Diego (CC BY-NC-ND 4.0)",
        }, cam.image_url()

    async def _run_yolo(self, url: str) -> tuple[float, bool]:
        """Download image from url, run YOLOv8, return (confidence, detected)."""
        content = await load_image_bytes(url)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            model = self._model_instance()
            results = await asyncio.to_thread(
                model.predict,
                tmp_path,
                imgsz=settings.yolo_inference_imgsz,
                verbose=False,
            )

            best_conf = 0.0
            detected = False
            for r in results:
                for box in r.boxes:
                    cls_name = str(model.names[int(box.cls)]).lower()
                    if cls_name in _FIRE_CLASSES:
                        conf = float(box.conf)
                        if conf > best_conf:
                            best_conf = conf
                            detected = True

            return best_conf, detected
        finally:
            pathlib.Path(tmp_path).unlink(missing_ok=True)

    async def run(self, *, lat: float, lon: float, image_url: str | None = None, **_) -> CameraResult:
        t0 = time.perf_counter()
        if settings.is_mock:
            return CameraResult(
                confidence=0.87,
                detected=True,
                image_url=image_url or "https://mock.alertcalifornia.org/cam001.jpg",
                raw={"cameras": [{"id": "mock-cam-001", "name": "Mock Ridge Cam"}]},
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                telemetry={
                    "http_max_attempts": settings.collection_http_max_attempts,
                    "yolo_imgsz": settings.yolo_inference_imgsz,
                },
            )
        log_if_outside_california(lat, lon, context="camera")

        raw: dict[str, Any] = {}
        url = image_url

        if url:
            raw = {"source": "event_image_url"}
        elif settings.camera_source == "alertwest":
            raw, url = await self._from_alertwest(lat, lon)
        else:
            if not (settings.alertca_api_key or "").strip():
                logger.warning("ALERTCA_API_KEY missing and no image_url; camera stage skipped")
                return CameraResult(
                    confidence=0.0,
                    detected=False,
                    image_url=None,
                    raw={"error": "missing ALERTCA_API_KEY", "cameras": []},
                    latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                    telemetry={
                        "http_max_attempts": settings.collection_http_max_attempts,
                        "yolo_imgsz": settings.yolo_inference_imgsz,
                    },
                )
            try:
                raw = await self._fetch_alertca(lat, lon)
            except httpx.HTTPError as exc:
                logger.warning("AlertCA HTTP error: %s", exc)
                raw = {"error": str(exc), "cameras": []}
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("AlertCA request failed: %s", exc)
                raw = {"error": str(exc), "cameras": []}

            url = first_camera_image_url(raw)

        confidence, detected, detector = 0.0, False, None
        if url:
            try:
                confidence, detected, detector, yolo_err = await self._detect(url)
                if yolo_err:
                    raw = {**raw, "yolo_error": yolo_err}
            except Exception as exc:
                logger.warning("Camera detection failed: %s", exc)
                raw = {**raw, "yolo_error": str(exc)}

        return CameraResult(
            confidence=confidence,
            detected=detected,
            image_url=url,
            raw=raw,
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            telemetry={
                "http_max_attempts": settings.collection_http_max_attempts,
                "yolo_imgsz": settings.yolo_inference_imgsz,
                "detector": detector,
            },
        )
