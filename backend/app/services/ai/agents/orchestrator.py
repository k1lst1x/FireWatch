from __future__ import annotations

import asyncio
import logging

from app.services.ai.schemas.pipeline import (
    AlertEvent,
    CameraResult,
    ConfirmationStatus,
    PipelineResult,
    SatelliteResult,
    WeatherResult,
)

from app.config import settings

from . import replay
from .base import BaseAgent
from .camera import CameraAgent
from .classification import ClassificationAgent
from .deliberation import DeliberationAgent
from .fusion import FusionAgent
from .output import OutputAgent
from .reasoning import ReasoningAgent
from .satellite import SatelliteAgent
from .suggestion import SuggestionAgent
from .weather import WeatherAgent
logger = logging.getLogger(__name__)


class OrchestratorAgent(BaseAgent):
    name = "orchestrator"

    def __init__(self) -> None:
        self.camera = CameraAgent()
        self.satellite = SatelliteAgent()
        self.weather = WeatherAgent()
        self.fusion = FusionAgent()
        self.reasoning = ReasoningAgent()
        self.classification = ClassificationAgent()
        self.deliberation = DeliberationAgent()
        self.suggestion = SuggestionAgent()
        self.output = OutputAgent()

    async def run(self, *, event: AlertEvent, **_) -> PipelineResult:
        result = PipelineResult(event_id=event.event_id)
        coords = {"lat": event.lat, "lon": event.lon}

        # ── Stage 1: parallel data collection ─────────────────────────────────
        logger.info("[%s] Stage 1 – camera / satellite / weather", event.event_id)
        replayed = replay.load(event) if settings.replay_mode == "replay" else None
        if replayed is not None:
            logger.info("[%s] Stage 1 replayed from recording", event.event_id)
            camera_res, satellite_res, weather_res = replayed
        else:
            gather_out = await asyncio.gather(
                self.camera.run(**coords, image_url=event.image_url),
                self.satellite.run(**coords),
                self.weather.run(**coords),
                return_exceptions=True,
            )
            camera_res, satellite_res, weather_res = gather_out
        if isinstance(camera_res, asyncio.CancelledError):
            raise camera_res
        if isinstance(satellite_res, asyncio.CancelledError):
            raise satellite_res
        if isinstance(weather_res, asyncio.CancelledError):
            raise weather_res
        if isinstance(camera_res, BaseException):
            logger.warning("[%s] Camera agent failed (%s); using empty result", event.event_id, type(camera_res).__name__)
            camera_res = CameraResult(
                confidence=0.0,
                detected=False,
                image_url=None,
                raw={"error": "agent_exception", "exception_type": type(camera_res).__name__},
            )
        if isinstance(satellite_res, BaseException):
            logger.warning("[%s] Satellite agent failed (%s); using empty result", event.event_id, type(satellite_res).__name__)
            satellite_res = SatelliteResult(
                thermal_confidence=0.0,
                hotspot_detected=False,
                raw={"error": "agent_exception", "exception_type": type(satellite_res).__name__},
            )
        if isinstance(weather_res, BaseException):
            logger.warning("[%s] Weather agent failed (%s); using empty result", event.event_id, type(weather_res).__name__)
            weather_res = WeatherResult(
                wind_speed=0.0,
                wind_direction=0.0,
                humidity=0.0,
                spread_risk=0.0,
                raw={"error": "agent_exception", "exception_type": type(weather_res).__name__},
            )
        result.camera = camera_res
        result.satellite = satellite_res
        result.weather = weather_res
        if settings.replay_mode == "record" and replayed is None:
            replay.save(event, camera_res, satellite_res, weather_res)

        # ── Stage 2: fusion ────────────────────────────────────────────────────
        logger.info("[%s] Stage 2 – fusion", event.event_id)
        fusion_res = await self.fusion.run(camera=camera_res, satellite=satellite_res)
        result.fusion = fusion_res

        if fusion_res.status == ConfirmationStatus.DISMISSED:
            logger.info("[%s] Dismissed – pipeline stopped.", event.event_id)
            return result

        try:
            # ── Stage 3: reasoning (VLM) ───────────────────────────────────────────
            logger.info("[%s] Stage 3 – reasoning", event.event_id)
            reasoning_res = await self.reasoning.run(
                image_url=camera_res.image_url or event.image_url,
                weather=weather_res,
                confirmation=fusion_res.status,
                satellite=satellite_res,
            )
            result.reasoning = reasoning_res

            # ── Stage 4: classification ────────────────────────────────────────────
            logger.info("[%s] Stage 4 – classification", event.event_id)
            classification_res = await self.classification.run(
                reasoning=reasoning_res,
                weather=weather_res,
                fusion=fusion_res,
            )
            result.classification = classification_res

            # ── Stage 4b: independent LLM deliberation (advisory only) ────────────
            logger.info("[%s] Stage 4b – independent expert deliberation", event.event_id)
            result.deliberation = await self.deliberation.run(
                reasoning=reasoning_res,
                classification=classification_res,
                fusion=fusion_res,
                weather=weather_res,
            )

            # ── Stage 5: suggestion ────────────────────────────────────────────────
            logger.info("[%s] Stage 5 – suggestion", event.event_id)
            suggestion_res = await self.suggestion.run(
                classification=classification_res,
                reasoning=reasoning_res,
                weather=weather_res,
                lat=event.lat,
                lon=event.lon,
            )
            result.suggestion = suggestion_res

            # ── Stage 6: output ────────────────────────────────────────────────────
            logger.info("[%s] Stage 6 – output", event.event_id)
            output_res = await self.output.run(
                event=event,
                suggestion=suggestion_res,
                classification=classification_res,
            )
            result.output = output_res

        except Exception as exc:
            logger.warning("[%s] Post-fusion stage failed (%s)", event.event_id, type(exc).__name__)
            result.error = "post_fusion_stage_failed"
            return result

        logger.info(
            "[%s] Pipeline complete – criticality=%s incident=%s",
            event.event_id,
            classification_res.criticality.value,
            output_res.incident_id,
        )
        return result
