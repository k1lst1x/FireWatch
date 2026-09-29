"""Validate a Flower Model / Endeavor API key without writing it to output.

Run from ``backend`` with: ``uv run python scripts/check_flower.py``.
"""
from __future__ import annotations

import asyncio
import sys

from openai import AsyncOpenAI

from app.config import settings


async def main() -> int:
    if not settings.flower_api_key.strip():
        print("FLOWER_API_KEY is not set in .env", file=sys.stderr)
        return 2
    client = AsyncOpenAI(api_key=settings.flower_api_key, base_url=settings.flower_base_url)
    try:
        response = await client.responses.create(
            model=settings.flower_model,
            input="Reply with exactly: OK",
            max_output_tokens=4,
        )
    except Exception as exc:
        print(f"Flower credential check failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    if not response.output_text.strip():
        print("Flower accepted the request but returned no text.", file=sys.stderr)
        return 1
    print(f"Flower key accepted; model {settings.flower_model!r} responded successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
