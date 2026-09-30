from __future__ import annotations

import base64
import io
import pathlib
from typing import Any
from urllib.parse import urlparse

from PIL import Image, UnidentifiedImageError

from app.config import settings

from .http_retry import httpx_get_bytes

_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[5]
_DEMO_ROOT = (_PROJECT_ROOT / "demo_images").resolve()


def redact_inline_image_data(value: Any) -> Any:
    """Remove inline image blobs before a result crosses a persistence boundary."""
    if isinstance(value, str):
        return None if value.startswith("data:") else value
    if isinstance(value, dict):
        return {key: redact_inline_image_data(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_inline_image_data(item) for item in value]
    return value


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


def _validate_image(data: bytes) -> bytes:
    """Reject malformed, animated, or oversized decoded images before inference."""
    try:
        with Image.open(io.BytesIO(data)) as image:
            if getattr(image, "n_frames", 1) != 1:
                raise ValueError("animated images are not allowed")
            width, height = image.size
            if width < 1 or height < 1 or width * height > settings.max_image_pixels:
                raise ValueError("image exceeds maximum pixel count")
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        if isinstance(exc, ValueError) and str(exc).startswith(("animated", "image exceeds")):
            raise
        raise ValueError("image is malformed or unsupported") from exc
    return data


async def load_image_bytes(ref: str) -> bytes:
    if ref.startswith("data:"):
        if "," not in ref or len(ref) > settings.max_image_bytes * 2:
            raise ValueError("image data URL is too large or malformed")
        data = base64.b64decode(ref.split(",", 1)[1], validate=True)
        if len(data) > settings.max_image_bytes:
            raise ValueError("image exceeds maximum size")
        return _validate_image(data)
    local = _local_path(ref)
    if local is not None:
        return _validate_image(local.read_bytes())
    if ref.startswith("https://"):
        host = (urlparse(ref).hostname or "").lower()
        if host not in settings.allowed_image_hosts:
            raise ValueError("image URL host is not allowed")
        data = await httpx_get_bytes(
            ref,
            timeout=20.0,
            max_attempts=settings.collection_http_max_attempts,
            label="camera_image",
            max_bytes=settings.max_image_bytes,
            allow_public_url=True,
        )
        return _validate_image(data)
    raise FileNotFoundError("image reference is not an allowed image source")
