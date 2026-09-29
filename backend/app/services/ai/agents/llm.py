from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


def _configured(provider_name: str) -> bool:
    return {
        "anthropic": bool((settings.anthropic_api_key or "").strip()),
        "openai": bool((settings.openai_api_key or "").strip()),
        "nebius": bool((settings.nebius_api_key or "").strip() and (settings.nebius_model or "").strip()),
        "flower": bool((settings.flower_api_key or "").strip() and (settings.flower_model or "").strip()),
    }.get(provider_name, False)


def provider() -> str | None:
    if settings.is_mock:
        return None
    selected = "anthropic" if settings.llm_provider == "claude" else settings.llm_provider
    if selected in {"anthropic", "openai", "nebius"} and _configured(selected):
        return selected
    if _configured("anthropic"):
        return "anthropic"
    if _configured("nebius"):
        return "nebius"
    if _configured("openai"):
        return "openai"
    return None


def expert_providers() -> list[str]:
    """Return configured, distinct providers allowed to give an advisory opinion."""
    if settings.is_mock or not settings.multi_agent_deliberation:
        return []
    names = []
    for name in settings.multi_agent_experts:
        normalized = "anthropic" if name == "claude" else name
        if normalized in {"anthropic", "openai", "nebius", "flower"} and _configured(normalized) and normalized not in names:
            names.append(normalized)
    return names


def llm_available() -> bool:
    return provider() is not None


def model_name(selected_provider: str | None = None) -> str:
    selected_provider = selected_provider or provider()
    if selected_provider == "anthropic":
        return settings.anthropic_model
    if selected_provider == "nebius":
        return settings.nebius_model
    return settings.openai_model


def build_model(selected_provider: str | None = None):
    # pydantic-ai is required only when an analysis is run.  Keeping the import
    # here lets status, settings, and camera-directory routes start in a
    # lightweight local environment.
    from pydantic_ai.models.openai import OpenAIChatModel
    from pydantic_ai.providers.openai import OpenAIProvider

    selected_provider = selected_provider or provider()
    if selected_provider == "anthropic":
        from pydantic_ai.models.anthropic import AnthropicModel
        from pydantic_ai.providers.anthropic import AnthropicProvider

        return AnthropicModel(settings.anthropic_model, provider=AnthropicProvider(api_key=settings.anthropic_api_key))
    if selected_provider == "nebius":
        if not settings.nebius_model.strip():
            raise ValueError("NEBIUS_MODEL must be set when LLM_PROVIDER=nebius")
        return OpenAIChatModel(
            settings.nebius_model,
            provider=OpenAIProvider(api_key=settings.nebius_api_key, base_url=settings.nebius_base_url),
        )
    kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAIChatModel(settings.openai_model, provider=OpenAIProvider(**kwargs))


class LazyAgent:
    def __init__(self, **agent_kwargs: Any) -> None:
        self._kwargs = agent_kwargs
        self._agent: Agent | None = None
        self._prompts: list = []

    def system_prompt(self, fn):
        self._prompts.append(fn)
        return fn

    def get(self) -> Agent:
        if self._agent is None:
            from pydantic_ai import Agent

            agent = Agent(build_model(), **self._kwargs)
            for fn in self._prompts:
                agent.system_prompt(fn)
            self._agent = agent
        return self._agent

    async def run(self, prompt: Any, deps: Any) -> Any:
        result = await asyncio.wait_for(self.get().run(prompt, deps=deps), timeout=settings.llm_timeout_sec)
        return result.output


async def run_or_fallback(name: str, lazy: LazyAgent, prompt: Any, deps: Any, fallback):
    if not llm_available():
        out = fallback()
        return out, ("fallback:no_llm_key" if not settings.is_mock else "mock")
    try:
        return await lazy.run(prompt, deps), "llm"
    except Exception as exc:
        logger.warning("%s LLM call failed, using fallback: %r", name, exc)
        return fallback(), f"fallback:{type(exc).__name__}"
