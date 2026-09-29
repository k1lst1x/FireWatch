from __future__ import annotations

import asyncio
import logging
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.config import settings

logger = logging.getLogger(__name__)


def provider() -> str | None:
    if settings.is_mock:
        return None
    has_claude = bool((settings.anthropic_api_key or "").strip())
    has_openai = bool((settings.openai_api_key or "").strip())
    if settings.llm_provider == "anthropic" and has_claude:
        return "anthropic"
    if settings.llm_provider == "openai" and has_openai:
        return "openai"
    if has_claude:
        return "anthropic"
    if has_openai:
        return "openai"
    return None


def llm_available() -> bool:
    return provider() is not None


def model_name() -> str:
    return settings.anthropic_model if provider() == "anthropic" else settings.openai_model


def build_model():
    if provider() == "anthropic":
        from pydantic_ai.models.anthropic import AnthropicModel
        from pydantic_ai.providers.anthropic import AnthropicProvider

        return AnthropicModel(settings.anthropic_model, provider=AnthropicProvider(api_key=settings.anthropic_api_key))
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
