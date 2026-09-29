import asyncio
import json
import os
import pathlib
import sys

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Incident, IncidentStatus
from app.db.session import get_db
from app.federation.feedback import STATIONS_DIR, STATION_IDS, label_from_incident
from app.federation.state import load_state, refresh_label_counts, reset_state

router = APIRouter(prefix="/federation", tags=["federation"])

GATEWAY = pathlib.Path(__file__).resolve().parents[2]
_lock = asyncio.Lock()


class RoundRequest(BaseModel):
    rounds: int = 1


async def export_dispatcher_labels(db: AsyncSession) -> dict[str, int]:
    rows = (
        await db.execute(
            select(Incident).where(Incident.status.in_([IncidentStatus.APPROVED, IncidentStatus.REJECTED]))
        )
    ).scalars().all()
    per: dict[str, list[dict]] = {sid: [] for sid in STATION_IDS}
    for inc in rows:
        lb = label_from_incident(inc.result or {}, inc.lat, inc.lon, inc.status == IncidentStatus.APPROVED)
        per[lb["station"]].append(lb)
    for sid, labels in per.items():
        d = STATIONS_DIR / sid
        d.mkdir(parents=True, exist_ok=True)
        (d / "dispatcher.jsonl").write_text("".join(json.dumps(x) + "\n" for x in labels), encoding="utf-8")
    return {sid: len(v) for sid, v in per.items()}


async def run_flower(rounds: int) -> str:
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([str(GATEWAY), os.environ.get("PYTHONPATH", "")])}
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "app.federation.run",
        "--rounds",
        str(rounds),
        cwd=str(GATEWAY.parent),
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    text = out.decode(errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(text[-2000:])
    return text


def _status() -> dict:
    state = refresh_label_counts(load_state())
    state["running"] = _lock.locked()
    return state


@router.get("/status")
async def status():
    return _status()


@router.post("/round")
async def run_round(body: RoundRequest | None = None, db: AsyncSession = Depends(get_db)):
    rounds = max(1, min((body.rounds if body else 1), 10))
    if _lock.locked():
        raise HTTPException(status_code=409, detail="A federated round is already running")
    async with _lock:
        await export_dispatcher_labels(db)
        try:
            await run_flower(rounds)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=f"Flower run failed: {exc}") from exc
    return _status()


@router.post("/reset")
async def reset():
    if _lock.locked():
        raise HTTPException(status_code=409, detail="A federated round is running")
    reset_state()
    return _status()
