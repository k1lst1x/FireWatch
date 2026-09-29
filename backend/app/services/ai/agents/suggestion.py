from __future__ import annotations

from dataclasses import dataclass

from pydantic_ai import RunContext

from app.services.ai.prompt.templates import SUGGESTION_SYSTEM_PROMPT
from app.services.ai.schemas.pipeline import (
    ClassificationResult,
    CriticalityLevel,
    ReasoningResult,
    SuggestionResult,
    WeatherResult,
)

from .base import BaseAgent
from .llm import LazyAgent, run_or_fallback
from .reasoning import _downwind


@dataclass
class _Deps:
    classification: ClassificationResult
    reasoning: ReasoningResult
    weather: WeatherResult


_agent = LazyAgent(deps_type=_Deps, output_type=SuggestionResult, system_prompt=SUGGESTION_SYSTEM_PROMPT)


@_agent.system_prompt
def _incident_context(ctx: RunContext[_Deps]) -> str:
    d = ctx.deps
    return (
        f"Incident criticality: {d.classification.criticality.value} "
        f"(score {d.classification.score:.2f})\n"
        f"Scene: {d.reasoning.scene_description}\n"
        f"Spread risk: {d.weather.spread_risk:.2f}, "
        f"wind {d.weather.wind_speed} m/s, humidity {d.weather.humidity}%"
    )


_PLANS = {
    CriticalityLevel.LOW: (
        ["Dispatch one engine crew to verify and monitor", "Keep camera and satellite watch on the area for the next pass"],
        ["1× Type-3 engine", "1× lookout"],
    ),
    CriticalityLevel.MEDIUM: (
        [
            "Dispatch initial-attack engines to the ignition point",
            "Place nearby residents on evacuation warning",
            "Request air attack on standby",
        ],
        ["2× Type-3 engines", "1× hand crew", "Air attack on standby"],
    ),
    CriticalityLevel.HIGH: (
        [
            "Launch full initial-attack response with aerial support",
            "Issue evacuation warnings downwind; prepare evacuation orders",
            "Construct containment line on the downwind flank",
            "Notify neighboring agencies for mutual aid",
        ],
        ["2× air tankers", "4× Type-1 engines", "2× hand crews", "1× dozer"],
    ),
    CriticalityLevel.CRITICAL: (
        [
            "Issue immediate evacuation orders downwind",
            "Request maximum aerial support and mutual-aid strike teams",
            "Close roads into the fire area; open evacuation routes",
            "Stand up incident command and shelters",
        ],
        ["Maximum available air tankers + helicopters", "Multiple engine strike teams", "Dozers", "Law enforcement for evacuations"],
    ),
}


def heuristic_suggestion(classification: ClassificationResult, weather: WeatherResult, lat: float | None, lon: float | None) -> SuggestionResult:
    plan, resources = _PLANS[classification.criticality]
    spread = f"Expected spread toward the {_downwind(weather.wind_direction)}." if weather.wind_speed > 0 else "Spread direction unknown."
    where = f" near {lat:.3f}, {lon:.3f}" if lat is not None and lon is not None else ""
    return SuggestionResult(
        action_plan=list(plan),
        alert_message=(
            f"WILDFIRE ALERT – {classification.criticality.value} fire detected{where}. "
            f"{spread} Follow instructions from local emergency services."
        ),
        recommended_resources=list(resources),
    )


class SuggestionAgent(BaseAgent):
    name = "suggestion"

    async def run(
        self,
        *,
        classification: ClassificationResult,
        reasoning: ReasoningResult,
        weather: WeatherResult,
        lat: float | None = None,
        lon: float | None = None,
        **_,
    ) -> SuggestionResult:
        out, source = await run_or_fallback(
            self.name,
            _agent,
            "Generate the response plan and alert message for this incident.",
            _Deps(classification=classification, reasoning=reasoning, weather=weather),
            lambda: heuristic_suggestion(classification, weather, lat, lon),
        )
        return out.model_copy(update={"source": source})
