# FIreWatch
 AI-driven wildfire detection and emergency response platform that analyzes live camera footage, satellite heat signatures, and weather data to identify wildfires, evaluate their severity, and recommend appropriate response actions.

## Quick start

```bash
uv sync --dev
./scripts/get_weights.sh
cp .env.example .env
uv run python scripts/check_setup.py --find-fires
PYTHONPATH=gateway uv run uvicorn app.main:app --port 8000
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 → Sign in → pick a location + image → **Run Analysis** → **Dispatch** or **False alarm**.

Every key is optional; each agent falls back instead of failing:

| Missing | Fallback |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Rule-based reasoning, severity and response plan (Claude is used if both are set) |
| YOLO weights | Vision-LLM fire check (needs an LLM key) |
| Cameras | ALERTWest public API (no key) picks the nearest live camera; or pass `image_url` |
| `OPENWEATHERMAP_API_KEY` | Open-Meteo, no key needed |
| `NASA_FIRMS_MAP_KEY` | Thermal score 0 (camera alone must clear the fusion threshold) |
| `DASHBOARD_WEBHOOK_URL` | Approvals are recorded, no webhook sent |

Confirmed fires are **held for dispatcher approval** (`REQUIRE_HUMAN_APPROVAL=true`) — nothing is broadcast until a human clicks Dispatch.

Demo insurance: run once with `REPLAY_MODE=record`, then present with `REPLAY_MODE=replay` so stage-1 data comes from disk if the network dies.

New endpoints: `GET /ai/status`, `GET /ai/incidents`, `POST /ai/incidents/{id}/review` (`{"decision": "approve" | "reject"}`).
