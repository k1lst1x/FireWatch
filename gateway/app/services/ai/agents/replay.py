from __future__ import annotations

import json
import logging
import pathlib

from app.config import settings
from app.services.ai.schemas.pipeline import AlertEvent, CameraResult, SatelliteResult, WeatherResult

logger = logging.getLogger(__name__)

_ROOT = pathlib.Path(__file__).resolve().parents[5]


def _dir() -> pathlib.Path:
    p = pathlib.Path(settings.replay_dir)
    return p if p.is_absolute() else _ROOT / p


def _key(event: AlertEvent) -> str:
    img = pathlib.Path(event.image_url or "noimg").name.replace(".", "_")[:40]
    return f"{event.lat:.3f}_{event.lon:.3f}_{img}.json"


def save(event: AlertEvent, camera: CameraResult, satellite: SatelliteResult, weather: WeatherResult) -> None:
    d = _dir()
    d.mkdir(parents=True, exist_ok=True)
    payload = {
        "event": event.model_dump(mode="json"),
        "camera": camera.model_dump(mode="json"),
        "satellite": satellite.model_dump(mode="json"),
        "weather": weather.model_dump(mode="json"),
    }
    (d / _key(event)).write_text(json.dumps(payload, indent=2))
    logger.info("Recorded stage-1 data to %s", d / _key(event))


def load(event: AlertEvent):
    f = _dir() / _key(event)
    if not f.is_file():
        logger.warning("No recording for %s; running live", f.name)
        return None
    data = json.loads(f.read_text())
    return (
        CameraResult.model_validate(data["camera"]),
        SatelliteResult.model_validate(data["satellite"]),
        WeatherResult.model_validate(data["weather"]),
    )
