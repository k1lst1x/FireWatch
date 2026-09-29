from __future__ import annotations

from pydantic import BaseModel, Field
from pydantic_ai import BinaryContent

from .llm import LazyAgent


class FireVision(BaseModel):
    fire_probability: float = Field(ge=0.0, le=1.0)
    evidence: str


_agent = LazyAgent(
    output_type=FireVision,
    system_prompt=(
        "You are a wildfire lookout analyzing a single camera still. Decide whether active flames "
        "or wildfire smoke are visible. Clouds, fog, haze, dust, sunsets and lights are NOT fire. "
        "Return fire_probability: your calibrated probability (0-1) that flame or wildfire smoke is present."
    ),
)


async def vision_fire_check(data: bytes, media_type: str) -> tuple[float, bool]:
    out: FireVision = await _agent.run(
        [BinaryContent(data=data, media_type=media_type), "Is there wildfire flame or smoke in this image?"],
        None,
    )
    p = max(0.0, min(1.0, float(out.fire_probability)))
    return round(p, 3), p >= 0.5
