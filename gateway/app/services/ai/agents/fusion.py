from __future__ import annotations

from app.config import settings
from app.services.ai.schemas.pipeline import (
    CameraResult,
    ConfirmationStatus,
    FusionResult,
    SatelliteResult,
)

from .base import BaseAgent


class FusionAgent(BaseAgent):
    name = "fusion"

    async def run(
        self,
        *,
        camera: CameraResult,
        satellite: SatelliteResult,
        **_,
    ) -> FusionResult:
        w_cam = settings.fusion_camera_weight
        w_therm = round(1.0 - w_cam, 4)
        threshold = settings.fusion_threshold

        combined = round(
            camera.confidence * w_cam + satellite.thermal_confidence * w_therm,
            4,
        )

        both_positive = camera.detected and satellite.hotspot_detected
        thermal_only = satellite.hotspot_detected and satellite.thermal_confidence >= settings.fusion_thermal_only_threshold

        if combined >= threshold or both_positive or thermal_only:
            status = ConfirmationStatus.CONFIRMED
            reason = (
                f"Combined score {combined:.2f} meets threshold {threshold:.2f}. "
                f"Camera detected={camera.detected}, thermal hotspot={satellite.hotspot_detected}."
            )
            if thermal_only and not both_positive and combined < threshold:
                reason = (
                    f"Satellite hotspot confidence {satellite.thermal_confidence:.2f} alone warrants review; "
                    "camera did not confirm. Sent to dispatcher."
                )
        else:
            status = ConfirmationStatus.DISMISSED
            reason = (
                f"Combined score {combined:.2f} below threshold {threshold:.2f}. "
                "Insufficient evidence of fire."
            )

        telemetry = {
            "fusion_threshold": threshold,
            "weight_camera": w_cam,
            "weight_thermal": w_therm,
            "both_positive_override": both_positive,
            "thermal_only_override": thermal_only,
        }

        return FusionResult(status=status, combined_score=combined, reason=reason, telemetry=telemetry)
