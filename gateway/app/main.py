import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
import pathlib

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.session import init_db
from app.routers.ai import router as ai_router
from app.routers.auth import router as auth_router
from app.services.ai.integrations import integration_status

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    status = integration_status()
    for name, info in status["integrations"].items():
        logging.getLogger("bayhawk").info("%-16s %s", name, "LIVE" if info.get("live") else "fallback")
    yield


app = FastAPI(title="BayHawk API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origin.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ai_router)

_DEMO_DIR = pathlib.Path(__file__).resolve().parents[2] / "demo_images"
_DEMO_DIR.mkdir(exist_ok=True)
app.mount("/demo_images", StaticFiles(directory=_DEMO_DIR), name="demo_images")


@app.get("/ai/demo-images")
async def demo_images():
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    return sorted(f"demo_images/{p.name}" for p in _DEMO_DIR.iterdir() if p.suffix.lower() in exts)


@app.get("/health")
async def health():
    return {"status": "ok"}
