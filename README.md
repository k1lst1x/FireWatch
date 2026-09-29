# FireWatch

AI-driven wildfire detection and emergency response platform. It combines camera
footage, NASA FIRMS satellite hotspots, and weather data to assess potential fires.

## Local setup

```bash
cp .env.example .env
uv sync --dev
./scripts/get_weights.sh                       # fire/smoke YOLOv8 weights
uv run python scripts/seed_labels.py           # station history for federated learning
uv run python scripts/check_setup.py --find-fires
uv run uvicorn app.main:app --app-dir backend --reload
```

Frontend (second terminal): `cd frontend && npm install && npm run dev`, then open http://localhost:5173 → Sign in → pick a location + image → **Run Analysis** → **Dispatch** or **False alarm**.

The API is then available at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`.

To enable NASA FIRMS, open the local `.env` file and set:

```dotenv
NASA_FIRMS_MAP_KEY=your-personal-map-key
```

`.env` is intentionally ignored by Git, so the key will not be committed.

## Tests

```bash
uv run pytest
```

## Integrations and fallbacks

Every key is optional; each agent falls back instead of failing:

| Missing | Fallback |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `NEBIUS_API_KEY` | Rule-based reasoning, severity and response plan |
| YOLO weights | Vision-LLM fire check (needs an LLM key) |
| Cameras | ALERTWest public API (no key) picks the nearest live camera; or pass `image_url` |
| `OPENWEATHERMAP_API_KEY` | Open-Meteo, no key needed |
| `NASA_FIRMS_MAP_KEY` | Thermal score 0 (camera alone must clear the fusion threshold) |
| `DASHBOARD_WEBHOOK_URL` | Approvals are recorded, no webhook sent |

### Nebius AI Studio

Nebius uses an OpenAI-compatible API. In your ignored `.env`, set `LLM_PROVIDER=nebius`, paste the credential into `NEBIUS_API_KEY`, and run `uv run python scripts/check_nebius.py`. The command lists the models enabled for your Nebius project; copy the model ID you choose into `NEBIUS_MODEL` and re-run the check. The API base URL is already set to `https://api.studio.nebius.ai/v1`.

Confirmed fires are **held for dispatcher approval** (`REQUIRE_HUMAN_APPROVAL=true`) — nothing is broadcast until a human clicks Dispatch.

Demo insurance: run once with `REPLAY_MODE=record`, then present with `REPLAY_MODE=replay` so stage-1 data comes from disk if the network dies.

New endpoints: `GET /ai/status`, `GET /ai/incidents`, `POST /ai/incidents/{id}/review` (`{"decision": "approve" | "reject"}`).

---

## Federated learning (Flower)

Three stations (North Bay, Sierra, SoCal) each run a Flower ClientApp on their own label file in `backend/data/stations/<id>/`. Every Dispatch / False-alarm click becomes a label for the station the incident falls in. Each round, stations tune their 3 fusion settings locally (camera weight, fusion threshold, thermal-only threshold) and the ServerApp averages them with FedAvg, weighted by label count. Only settings and counts leave a station — never images.

```bash
uv run python scripts/seed_labels.py                                   # simulated history per station
PYTHONPATH=backend uv run python -m app.federation.run --rounds 3 --reset
```
PowerShell: `$env:PYTHONPATH="backend"; uv run python -m app.federation.run --rounds 3 --reset`

API: `GET /federation/status`, `POST /federation/round` (`{"rounds": 1}`), `POST /federation/reset`. The fusion agent uses the latest global settings automatically (`FEDERATED_FUSION=true`).
