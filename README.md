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

Frontend (second terminal): `cd frontend && npm install && npm run dev`, then open http://localhost:5173. The API requires an operator bearer token by default; register/login through `/docs` while the project has no browser sign-in screen. Privileged dispatch and federation actions always require an administrator token, including local development.

## GitHub Pages and push checks

Every push to `main` runs the backend regression checks and a production frontend build. There are deliberately no pull-request triggers yet.

The frontend is deployed automatically to GitHub Pages at `https://k1lst1x.github.io/FireWatch/`. It is a static deployment: the FastAPI backend, database, and all provider keys remain on a separate server and are never published to Pages.

After pushing the workflow files once, an administrator must do these one-time repository settings:

1. Open **Settings → Pages** and choose **GitHub Actions** as the publishing source.
2. If a public backend exists, add repository variable **Settings → Secrets and variables → Actions → Variables**: `VITE_API_BASE_URL=https://your-api-host` (no trailing slash). The next Pages deployment builds the UI with that API origin.
3. On that backend, add `https://k1lst1x.github.io` to `CORS_ORIGINS` and redeploy it. The API must serve HTTPS for a public Pages site.

The Pages build uses hash routes, so opening the dashboard directly works on a static host. Locally it retains normal browser routes and the Vite `/api` proxy.

After verifying an operator's identity, promote their already registered account only from a trusted local shell: `PYTHONPATH=backend uv run python backend/scripts/promote_admin.py operator@example.com`. Public registration always creates a standard user. The browser API helper reads a token from `localStorage` key `firewatch-access-token`; this is temporary until a proper sign-in screen is added.

The application rate limits login, registration, and analysis requests per process. For multi-worker or multi-replica production deployments, also configure shared rate limiting at the ingress or API gateway.

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

### Multi-agent deliberation

With provider keys configured, set `MULTI_AGENT_DELIBERATION=true` and list the reviewers in `MULTI_AGENT_EXPERTS` (for example `anthropic,nebius,flower`). The providers review the same confirmed-incident evidence independently; `/ai/analyze` returns their opinions, consensus, and material disagreement in `deliberation`. Flower Model / Endeavor uses `FLOWER_API_KEY` with `https://api.flower.ai/v1` and is a separate model reviewer from the local Flower federated-learning simulation. This is advisory information only: sensor fusion remains unchanged, and the dispatcher must still approve any action. Flower federated learning then uses final dispatcher feedback to tune shared fusion parameters across stations.

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
