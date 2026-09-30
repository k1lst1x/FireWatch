"""Verify Nebius AI Studio credentials without printing the secret.

Run from ``backend`` with: ``uv run python scripts/check_nebius.py``.
"""

from __future__ import annotations

import sys

import httpx

from app.config import settings


def main() -> int:
    api_key = settings.nebius_api_key.strip()
    if not api_key:
        print("NEBIUS_API_KEY is not set in .env", file=sys.stderr)
        return 2

    base_url = settings.nebius_base_url.rstrip("/")
    project_id = (settings.nebius_project_id or "").strip()
    params = {"ai_project_id": project_id} if project_id else None
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = httpx.get(
            f"{base_url}/models",
            headers=headers,
            params=params,
            timeout=20.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        selected = settings.nebius_model.strip()
        if not selected:
            print(f"Nebius credential check failed: {exc}", file=sys.stderr)
            return 1
        probe = httpx.post(
            f"{base_url}/chat/completions",
            headers={**headers, "Content-Type": "application/json"},
            params=params,
            json={
                "model": selected,
                "messages": [{"role": "user", "content": "Reply with the single word ok"}],
                "max_tokens": 8,
                "temperature": 0,
            },
            timeout=40.0,
        )
        if probe.status_code == 402:
            print(
                "Nebius accepted the credential and the model, then refused the call: "
                "the project budget is exhausted. Add funds in Nebius Token Factory, then run this again.",
                file=sys.stderr,
            )
            return 1
        detail = ""
        try:
            detail = str(probe.json().get("detail") or "")
        except Exception:
            detail = probe.text[:180]
        print(
            f"Nebius model list failed ({exc}). Chat probe HTTP {probe.status_code}: {detail}",
            file=sys.stderr,
        )
        return 1

    data = response.json().get("data", [])
    model_ids = sorted(item.get("id", "") for item in data if item.get("id"))
    if not model_ids:
        print("Nebius accepted the key but returned no available models.", file=sys.stderr)
        return 1

    print(f"Nebius key accepted. {len(model_ids)} model(s) available:")
    for model_id in model_ids:
        print(f"- {model_id}")

    selected = settings.nebius_model.strip()
    if not selected:
        print("\nSet NEBIUS_MODEL to one of the IDs above, then run this command again.")
        return 0
    if selected not in model_ids:
        print(f"\nNEBIUS_MODEL={selected!r} is not available to this key.", file=sys.stderr)
        return 1
    print(f"\nConfigured model {selected!r} is available. Nebius is ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
