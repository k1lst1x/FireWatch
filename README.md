# FireWatch

AI-driven wildfire detection and emergency response platform. It combines camera
footage, NASA FIRMS satellite hotspots, and weather data to assess potential fires.

## Local setup

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --app-dir backend --reload
```

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
