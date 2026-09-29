"""Advisory multi-provider review for confirmed incidents.

Each expert receives the same sensor summary independently.  The coordinator only
reports agreement; it never changes the detector result or bypasses human review.
"""
from __future__ import annotations

import asyncio
import json

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from openai import AsyncOpenAI

from app.config import settings
from app.services.ai.schemas.pipeline import (
    ClassificationResult,
    CriticalityLevel,
    DeliberationResult,
    ExpertOpinion,
    FusionResult,
    ReasoningResult,
    WeatherResult,
)

from .base import BaseAgent
from .llm import build_model, expert_providers


class _Opinion(BaseModel):
    criticality: CriticalityLevel
    score: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1, max_length=500)


_RANK = {level: rank for rank, level in enumerate(CriticalityLevel)}


def _combine(opinions: list[ExpertOpinion]) -> DeliberationResult:
    if not opinions:
        return DeliberationResult(summary="No independent LLM reviewers are configured.")
    ranks = [_RANK[opinion.criticality] for opinion in opinions]
    disagreement = max(ranks) - min(ranks) > 1
    mean_rank = round(sum(ranks) / len(ranks))
    consensus = list(CriticalityLevel)[mean_rank]
    score = round(sum(opinion.score for opinion in opinions) / len(opinions), 3)
    providers = ", ".join(opinion.provider for opinion in opinions)
    summary = (
        f"Independent review from {providers}: {consensus.value} at {score:.2f}. "
        + ("Material disagreement detected; dispatcher review is especially important." if disagreement else "Reviewers are broadly aligned.")
    )
    return DeliberationResult(
        opinions=opinions,
        consensus_criticality=consensus,
        consensus_score=score,
        disagreement=disagreement,
        summary=summary,
    )


class DeliberationAgent(BaseAgent):
    name = "deliberation"

    async def run(
        self,
        *,
        reasoning: ReasoningResult,
        classification: ClassificationResult,
        fusion: FusionResult,
        weather: WeatherResult,
        **_,
    ) -> DeliberationResult:
        providers = expert_providers()
        if len(providers) < 2:
            return DeliberationResult(summary="Two configured LLM reviewers are required for deliberation.")
        prompt = (
            "You are an independent wildfire operations reviewer. Assess the evidence, not a requested outcome. "
            "Do not recommend dispatch or evacuation; a human dispatcher makes that decision.\n\n"
            f"Sensor fusion: {fusion.status.value}, score {fusion.combined_score:.2f}.\n"
            f"Weather: spread risk {weather.spread_risk:.2f}, wind {weather.wind_speed:.1f} m/s, humidity {weather.humidity:.0f}%.\n"
            f"Scene assessment: {reasoning.scene_description}\n"
            f"Current pipeline classification: {classification.criticality.value}, score {classification.score:.2f}.\n"
            "Return only a calibrated criticality, score, and concise evidence-based rationale."
        )

        async def ask_flower() -> ExpertOpinion | None:
            """Use Flower Model's Responses-only endpoint for an independent opinion."""
            try:
                client = AsyncOpenAI(api_key=settings.flower_api_key, base_url=settings.flower_base_url)
                response = await asyncio.wait_for(
                    client.responses.create(
                        model=settings.flower_model,
                        input=(
                            prompt
                            + "\nReturn a JSON object only with keys criticality, score, rationale; "
                            "criticality must be LOW, MEDIUM, HIGH, or CRITICAL."
                        ),
                    ),
                    timeout=settings.llm_timeout_sec,
                )
                payload = json.loads(response.output_text)
                return ExpertOpinion(provider="flower", **_Opinion.model_validate(payload).model_dump())
            except Exception:
                return None

        async def ask(provider_name: str) -> ExpertOpinion | None:
            if provider_name == "flower":
                return await ask_flower()
            try:
                agent = Agent(
                    build_model(provider_name),
                    output_type=_Opinion,
                    system_prompt="You are a cautious, evidence-based wildfire analyst.",
                )
                result = await asyncio.wait_for(agent.run(prompt), timeout=settings.llm_timeout_sec)
                return ExpertOpinion(provider=provider_name, **result.output.model_dump())
            except Exception:
                return None

        replies = await asyncio.gather(*(ask(name) for name in providers))
        return _combine([reply for reply in replies if reply is not None])
