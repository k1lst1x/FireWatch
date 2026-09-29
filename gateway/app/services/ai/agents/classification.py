from __future__ import annotations

from dataclasses import dataclass

from pydantic_ai import RunContext

from app.services.ai.prompt.templates import CLASSIFICATION_SYSTEM_PROMPT
from app.services.ai.schemas.pipeline import (
    ClassificationResult,
    CriticalityLevel,
    FusionResult,
    ReasoningResult,
    WeatherResult,
)

from .base import BaseAgent
from .llm import LazyAgent, run_or_fallback


@dataclass
class _Deps:
    reasoning: ReasoningResult
    weather: WeatherResult
    fusion: FusionResult


_agent = LazyAgent(deps_type=_Deps, output_type=ClassificationResult, system_prompt=CLASSIFICATION_SYSTEM_PROMPT)


@_agent.system_prompt
def _incident_context(ctx: RunContext[_Deps]) -> str:
    d = ctx.deps
    return (
        f"Scene description: {d.reasoning.scene_description}\n"
        f"Key observations: {', '.join(d.reasoning.key_observations)}\n"
        f"Weather spread risk: {d.weather.spread_risk:.2f}\n"
        f"Combined detection score: {d.fusion.combined_score:.2f}"
    )


def heuristic_classification(weather: WeatherResult, fusion: FusionResult) -> ClassificationResult:
    score = round(min(1.0, 0.55 * fusion.combined_score + 0.45 * weather.spread_risk), 3)
    if score >= 0.8:
        level = CriticalityLevel.CRITICAL
    elif score >= 0.6:
        level = CriticalityLevel.HIGH
    elif score >= 0.4:
        level = CriticalityLevel.MEDIUM
    else:
        level = CriticalityLevel.LOW
    return ClassificationResult(
        criticality=level,
        score=score,
        reasoning=(
            f"Rule-based: detection score {fusion.combined_score:.2f} and spread risk "
            f"{weather.spread_risk:.2f} give severity {score:.2f} → {level.value}."
        ),
    )


class ClassificationAgent(BaseAgent):
    name = "classification"

    async def run(
        self,
        *,
        reasoning: ReasoningResult,
        weather: WeatherResult,
        fusion: FusionResult,
        **_,
    ) -> ClassificationResult:
        out, source = await run_or_fallback(
            self.name,
            _agent,
            "Classify the criticality of this wildfire incident.",
            _Deps(reasoning=reasoning, weather=weather, fusion=fusion),
            lambda: heuristic_classification(weather, fusion),
        )
        return out.model_copy(update={"source": source, "score": max(0.0, min(1.0, float(out.score)))})
