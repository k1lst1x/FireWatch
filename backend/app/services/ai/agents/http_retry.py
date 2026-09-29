"""Shared HTTP helpers: retries with exponential backoff for transient failures."""
from __future__ import annotations

import asyncio
import logging
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Transient conditions worth retrying (FIRMS / OWM / partner CDNs)
_RETRYABLE_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})


async def httpx_get_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 15.0,
    max_attempts: int = 3,
    label: str = "http",
) -> Any:
    """GET JSON; retry on timeouts, connect errors, and retryable status codes."""
    last_error: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code in _RETRYABLE_STATUS and attempt < max_attempts:
                    delay = _backoff_seconds(attempt)
                    logger.warning(
                        "[%s] status=%s attempt %s/%s; retry in %.2fs",
                        label,
                        resp.status_code,
                        attempt,
                        max_attempts,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                resp.raise_for_status()
                return resp.json()
        except httpx.TimeoutException as exc:
            last_error = exc
            if attempt < max_attempts:
                delay = _backoff_seconds(attempt)
                logger.warning("[%s] timeout attempt %s/%s; retry in %.2fs", label, attempt, max_attempts, delay)
                await asyncio.sleep(delay)
                continue
            raise
        except httpx.RequestError as exc:
            last_error = exc
            if attempt < max_attempts:
                delay = _backoff_seconds(attempt)
                logger.warning("[%s] transport error attempt %s/%s; retry in %.2fs", label, attempt, max_attempts, delay)
                await asyncio.sleep(delay)
                continue
            raise
        except httpx.HTTPStatusError as exc:
            last_error = exc
            code = exc.response.status_code
            if code in _RETRYABLE_STATUS and attempt < max_attempts:
                delay = _backoff_seconds(attempt)
                logger.warning("[%s] HTTP %s attempt %s/%s; retry in %.2fs", label, code, attempt, max_attempts, delay)
                await asyncio.sleep(delay)
                continue
            raise
    raise RuntimeError(f"[{label}] exhausted retries") from last_error


async def httpx_get_bytes(
    url: str,
    *,
    timeout: float = 20.0,
    max_attempts: int = 3,
    follow_redirects: bool = True,
    max_bytes: int | None = None,
    allow_public_url: bool = False,
    label: str = "http_bytes",
) -> bytes:
    """GET raw body (e.g. camera image); same retry policy as ``httpx_get_json``."""
    if allow_public_url:
        _validate_public_https_url(url)
        follow_redirects = False
    last_error: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=follow_redirects) as client:
                resp = await client.get(url)
                if resp.status_code in _RETRYABLE_STATUS and attempt < max_attempts:
                    delay = _backoff_seconds(attempt)
                    logger.warning(
                        "[%s] status=%s attempt %s/%s; retry in %.2fs",
                        label,
                        resp.status_code,
                        attempt,
                        max_attempts,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                resp.raise_for_status()
                if max_bytes is not None:
                    length = resp.headers.get("content-length")
                    if length and int(length) > max_bytes:
                        raise ValueError("image exceeds maximum size")
                    body = bytearray()
                    async for chunk in resp.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > max_bytes:
                            raise ValueError("image exceeds maximum size")
                    return bytes(body)
                return resp.content
        except httpx.TimeoutException as exc:
            last_error = exc
            if attempt < max_attempts:
                await asyncio.sleep(_backoff_seconds(attempt))
                continue
            raise
        except httpx.RequestError as exc:
            last_error = exc
            if attempt < max_attempts:
                await asyncio.sleep(_backoff_seconds(attempt))
                continue
            raise
        except httpx.HTTPStatusError as exc:
            last_error = exc
            code = exc.response.status_code
            if code in _RETRYABLE_STATUS and attempt < max_attempts:
                await asyncio.sleep(_backoff_seconds(attempt))
                continue
            raise
    raise RuntimeError(f"[{label}] exhausted retries") from last_error


def _backoff_seconds(attempt: int) -> float:
    return min(0.4 * (2 ** (attempt - 1)), 6.0)


def _validate_public_https_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("image URL must be an HTTPS URL without credentials")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)}
    except OSError as exc:
        raise ValueError("image URL hostname could not be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ValueError("image URL must resolve only to public addresses")
