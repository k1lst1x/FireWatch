from __future__ import annotations

import base64
import pathlib

from app.config import settings

from .http_retry import httpx_get_bytes

_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[5]
_DEMO_ROOT = (_PROJECT_ROOT / "demo_images").resolve()


def _local_path(ref: str) -> pathlib.Path | None:
    if ref.startswith(("file://", "http://", "https://", "data:")):
        return None
    p = (_PROJECT_ROOT / ref).resolve()
    try:
        p.relative_to(_DEMO_ROOT)
    except ValueError:
        return None
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
        if "," not in ref or len(ref) > settings.max_image_bytes * 2:
            raise ValueError("image data URL is too large or malformed")
        data = base64.b64decode(ref.split(",", 1)[1], validate=True)
        if len(data) > settings.max_image_bytes:
            raise ValueError("image exceeds maximum size")
        return data
    local = _local_path(ref)
    if local is not None:
        return local.read_bytes()
    if ref.startswith("https://"):
        return await httpx_get_bytes(
            ref,
            timeout=20.0,
            max_attempts=settings.collection_http_max_attempts,
            label="camera_image",
            max_bytes=settings.max_image_bytes,
            allow_public_url=True,
        )
    raise FileNotFoundError("image reference is not an allowed image source")
