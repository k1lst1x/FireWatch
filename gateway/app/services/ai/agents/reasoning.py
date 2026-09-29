from __future__ import annotations

from dataclasses import dataclass

from pydantic_ai import BinaryContent, ImageUrl, RunContext

from app.services.ai.prompt.templates import REASONING_SYSTEM_PROMPT
from app.services.ai.schemas.pipeline import (
    ConfirmationStatus,
    ReasoningResult,
    SatelliteResult,
    WeatherResult,
)

from .base import BaseAgent
from .images import load_image_bytes, media_type_for
from .llm import LazyAgent, llm_available, run_or_fallback


@dataclass
class _Deps:
    weather: WeatherResult
    confirmation: ConfirmationStatus
    satellite: SatelliteResult


_agent = LazyAgent(deps_type=_Deps, output_type=ReasoningResult, system_prompt=REASONING_SYSTEM_PROMPT)


@_agent.system_prompt
def _weather_context(ctx: RunContext[_Deps]) -> str:
    w = ctx.deps.weather
    return (
        f"Current weather: wind {w.wind_speed} m/s at {w.wind_direction}°, "
        f"humidity {w.humidity}%, spread risk {w.spread_risk:.2f}/1.0."
    )


@_agent.system_prompt
def _detection_context(ctx: RunContext[_Deps]) -> str:
    s = ctx.deps.satellite
    return (
        f"Satellite thermal data: hotspot_detected={s.hotspot_detected}, "
        f"thermal_confidence={s.thermal_confidence:.2f}. "
        f"Fusion status: {ctx.deps.confirmation.value}."
    )


_COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def _downwind(deg: float) -> str:
    return _COMPASS[int(((deg + 180) % 360 + 22.5) // 45) % 8]


def heuristic_reasoning(weather: WeatherResult, satellite: SatelliteResult, has_image: bool) -> ReasoningResult:
    obs = []
    if satellite.hotspot_detected:
        frps = []
        for h in (satellite.raw or {}).get("hotspots") or []:
            try:
                frps.append(float(h.get("frp")))
            except (TypeError, ValueError, AttributeError):
                pass
        frp = max(frps) if frps else None
        obs.append(
            f"Satellite thermal hotspot confirmed (confidence {satellite.thermal_confidence:.2f}"
            + (f", max FRP {frp} MW)" if frp is not None else ")")
        )
    else:
        obs.append("No satellite thermal hotspot in the latest pass; detection relies on camera evidence")
    if weather.wind_speed > 0:
        obs.append(
            f"Wind {weather.wind_speed:.1f} m/s from {weather.wind_direction:.0f}° — fire likely to push {_downwind(weather.wind_direction)}"
        )
    if weather.humidity > 0:
        dryness = "critically dry" if weather.humidity < 20 else "dry" if weather.humidity < 35 else "moderate"
        obs.append(f"Relative humidity {weather.humidity:.0f}% ({dryness} fuel conditions)")
    obs.append(f"Computed spread risk {weather.spread_risk:.2f}/1.0")
    if not has_image:
        obs.append("No camera image available for visual confirmation")
    wind_part = (
        f"with winds pushing {_downwind(weather.wind_direction)}"
        if weather.wind_speed > 0
        else "wind data unavailable"
    )
    desc = (
        "Automated assessment from sensor data (vision model unavailable). "
        f"Fire signal confirmed by fusion; spread risk {weather.spread_risk:.2f}, {wind_part}."
    )
    return ReasoningResult(scene_description=desc, key_observations=obs)


class ReasoningAgent(BaseAgent):
    name = "reasoning"

    async def run(
        self,
        *,
        image_url: str | None,
        weather: WeatherResult,
        confirmation: ConfirmationStatus,
        satellite: SatelliteResult,
        **_,
    ) -> ReasoningResult:
        prompt: list = ["Analyze this wildfire scene and provide your structured observations."]
        if image_url and llm_available():
            try:
                data = await load_image_bytes(image_url)
                prompt.insert(0, BinaryContent(data=data, media_type=media_type_for(image_url, data)))
            except Exception:
                if image_url.startswith(("http://", "https://")):
                    prompt.insert(0, ImageUrl(url=image_url))
        out, source = await run_or_fallback(
            self.name,
            _agent,
            prompt,
            _Deps(weather=weather, confirmation=confirmation, satellite=satellite),
            lambda: heuristic_reasoning(weather, satellite, bool(image_url)),
        )
        return out.model_copy(update={"source": source})
