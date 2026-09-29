from __future__ import annotations

import base64
import pathlib

from app.config import settings

from .http_retry import httpx_get_bytes

_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[5]


def _local_path(ref: str) -> pathlib.Path | None:
    if ref.startswith("file://"):
        ref = ref[7:]
    if ref.startswith(("http://", "https://", "data:")):
        return None
    p = pathlib.Path(ref)
    if not p.is_absolute():
        p = _PROJECT_ROOT / p
    return p if p.is_file() else None


def media_type_for(ref: str, data: bytes) -> str:
    if data[:8].startswith(b"\x89PNG"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:3] == b"GIF":
        return "image/gif"
    return "image/jpeg"


async def load_image_bytes(ref: str) -> bytes:
    if ref.startswith("data:"):
        return base64.b64decode(ref.split(",", 1)[1])
    local = _local_path(ref)
    if local is not None:
        return local.read_bytes()
    if ref.startswith(("http://", "https://")):
        return await httpx_get_bytes(
            ref,
            timeout=20.0,
            max_attempts=settings.collection_http_max_attempts,
            label="camera_image",
        )
    raise FileNotFoundError(f"image not found: {ref}")
