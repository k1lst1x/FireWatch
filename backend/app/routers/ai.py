import csv
import io
import uuid
from datetime import datetime, timezone
import httpx

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Incident, IncidentStatus
from app.db.session import get_db
from app.dependencies import require_admin, require_user
from app.services.ai.agents import alertwest
from app.config import settings
from app.services.ai.integrations import integration_status
from app.services.ai.schemas.pipeline import AlertEvent, ConfirmationStatus, PipelineResult

router = APIRouter(prefix="/ai", tags=["ai"])


_AGENT_CATALOG = (
    ("orchestrator", "Orchestrator", "Coordinates the full evidence-to-dispatch workflow."),
    ("camera", "Camera agent", "Retrieves the selected live camera frame and checks it for smoke or flame."),
    ("satellite", "Satellite agent", "Checks NASA FIRMS thermal hotspots around the selected location."),
    ("weather", "Weather agent", "Reads wind and humidity to calculate local fire-spread risk."),
    ("fusion", "Fusion agent", "Combines optical and thermal evidence into a confirmation decision."),
    ("reasoning", "Reasoning agent", "Explains what the evidence shows in operational language."),
    ("classification", "Classification agent", "Assigns the incident severity level and confidence."),
    ("deliberation", "Deliberation agent", "Collects independent configured-model opinions as advisory input."),
    ("suggestion", "Response planner", "Builds the recommended response plan and dispatch message."),
    ("output", "Output agent", "Creates the incident record and holds it for human approval."),
)


class ReviewRequest(BaseModel):
    decision: str
    note: str | None = None


def _incident_row(result: PipelineResult, event: AlertEvent) -> Incident:
    confirmed = result.fusion is not None and result.fusion.status == ConfirmationStatus.CONFIRMED
    incident_id = result.output.incident_id if result.output else f"dismissed-{uuid.uuid4().hex[:12]}"
    return Incident(
        id=incident_id,
        event_id=event.event_id,
        lat=event.lat,
        lon=event.lon,
        status=IncidentStatus.PENDING_REVIEW if confirmed and result.output else IncidentStatus.DISMISSED,
        criticality=result.classification.criticality.value if result.classification else None,
        combined_score=result.fusion.combined_score if result.fusion else 0.0,
        result=result.model_dump(mode="json"),
    )


def _serialize(i: Incident) -> dict:
    return {
        "id": i.id,
        "event_id": i.event_id,
        "lat": i.lat,
        "lon": i.lon,
        "status": i.status.value,
        "criticality": i.criticality,
        "combined_score": i.combined_score,
        "reviewer_note": i.reviewer_note,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "reviewed_at": i.reviewed_at.isoformat() if i.reviewed_at else None,
        "result": i.result,
    }


@router.get("/status")
async def pipeline_status(_user=Depends(require_user)):
    return integration_status()


@router.get("/agent-trace")
async def agent_trace(
    _user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the safe, human-readable trace for the most recent pipeline run.

    Raw model prompts, request headers, credentials, and camera payloads are
    deliberately excluded.  This endpoint is intended for the dispatch-console
    trace panel, not for exporting sensitive diagnostic data.
    """
    latest = (
        await db.execute(select(Incident).order_by(Incident.created_at.desc()).limit(1))
    ).scalar_one_or_none()
    result = (latest.result or {}) if latest else {}
    integrations = integration_status()["integrations"]
    llm = integrations["llm"]

    def completed(key: str) -> bool:
        return bool(result.get(key))

    def stage(key: str, summary: str, *, latency: float | None = None, mode: str | None = None) -> dict:
        state = "completed" if completed(key) else "idle"
        return {
            "id": key,
            "state": state,
            "summary": summary if state == "completed" else "Waiting for the next analysis run.",
            "latency_ms": latency,
            "mode": mode,
        }

    camera = result.get("camera") or {}
    satellite = result.get("satellite") or {}
    weather = result.get("weather") or {}
    fusion = result.get("fusion") or {}
    reasoning = result.get("reasoning") or {}
    classification = result.get("classification") or {}
    deliberation = result.get("deliberation") or {}
    suggestion = result.get("suggestion") or {}
    output = result.get("output") or {}

    trace = {
        "orchestrator": {
            "id": "orchestrator",
            "state": "completed" if latest else "idle",
            "summary": (
                f"Completed event {latest.event_id}."
                if latest else "Waiting for the next analysis run."
            ),
            "latency_ms": None,
            "mode": "parallel collection → evidence fusion → human review",
        },
        "camera": stage(
            "camera",
            f"Detection confidence {round(float(camera.get('confidence', 0)) * 100)}%. "
            f"{'Potential smoke or flame detected.' if camera.get('detected') else 'No positive optical detection.'}",
            latency=camera.get("latency_ms"),
            mode=(camera.get("telemetry") or {}).get("detector") or integrations["camera_detector"].get("detector"),
        ),
        "satellite": stage(
            "satellite",
            f"Thermal confidence {round(float(satellite.get('thermal_confidence', 0)) * 100)}%. "
            f"{'FIRMS hotspot detected.' if satellite.get('hotspot_detected') else 'No FIRMS hotspot detected.'}",
            latency=satellite.get("latency_ms"),
            mode=integrations["satellite_firms"].get("source"),
        ),
        "weather": stage(
            "weather",
            f"Wind {float(weather.get('wind_speed', 0)):.1f} m/s · humidity {round(float(weather.get('humidity', 0)))}% · "
            f"spread risk {round(float(weather.get('spread_risk', 0)) * 100)}%.",
            latency=weather.get("latency_ms"),
            mode=(weather.get("telemetry") or {}).get("provider") or integrations["weather"].get("provider"),
        ),
        "fusion": stage(
            "fusion",
            f"{fusion.get('status', 'UNKNOWN')} at {float(fusion.get('combined_score', 0)):.2f} combined confidence.",
            mode="weighted optical + thermal evidence",
        ),
        "reasoning": stage(
            "reasoning",
            reasoning.get("scene_description", "Evidence interpretation completed."),
            mode=reasoning.get("source") or (llm.get("provider") if llm.get("live") else "rule-based fallback"),
        ),
        "classification": stage(
            "classification",
            f"{classification.get('criticality', 'UNKNOWN')} severity at {round(float(classification.get('score', 0)) * 100)}% confidence.",
            mode=classification.get("source") or (llm.get("provider") if llm.get("live") else "rule-based fallback"),
        ),
        "deliberation": stage(
            "deliberation",
            f"{len(deliberation.get('opinions') or [])} independent advisory opinion(s); "
            f"consensus: {deliberation.get('consensus_criticality') or 'not available'}.",
            mode="configured multi-agent reviewers",
        ),
        "suggestion": stage(
            "suggestion",
            suggestion.get("alert_message", "Response plan completed."),
            mode=suggestion.get("source") or (llm.get("provider") if llm.get("live") else "rule-based fallback"),
        ),
        "output": stage(
            "output",
            f"Incident {output.get('incident_id', 'record')} is {str(output.get('review_status') or 'awaiting human approval').replace('_', ' ')}.",
            mode="human-in-the-loop dispatch gate",
        ),
    }
    return {
        "event_id": latest.event_id if latest else None,
        "created_at": latest.created_at.isoformat() if latest and latest.created_at else None,
        "agents": [
            {
                **trace[agent_id],
                "name": name,
                "responsibility": responsibility,
            }
            for agent_id, name, responsibility in _AGENT_CATALOG
        ],
    }


@router.get("/telemetry/live-weather")
async def get_live_weather(
    lat: float = Query(default=37.7749, ge=-90, le=90),
    lon: float = Query(default=-122.4194, ge=-180, le=180),
):
    """Real-time live weather conditions with fire spread risk index."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        # 1. Try OpenWeatherMap if configured
        if settings.openweathermap_api_key:
            try:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lon, "appid": settings.openweathermap_api_key, "units": "metric"},
                )
                if resp.status_code == 200:
                    owm = resp.json()
                    wind = owm.get("wind", {})
                    main = owm.get("main", {})
                    wind_speed = float(wind.get("speed", 5.0))
                    humidity = float(main.get("humidity", 45.0))
                    temp = float(main.get("temp", 20.0))
                    wind_factor = min(wind_speed / 20.0, 1.0)
                    humidity_factor = max(1.0 - humidity / 100.0, 0.0)
                    spread_risk = round(wind_factor * 0.6 + humidity_factor * 0.4, 3)
                    return {
                        "latitude": lat,
                        "longitude": lon,
                        "current": {
                            "temperature_2m": temp,
                            "relative_humidity_2m": humidity,
                            "wind_speed_10m": wind_speed,
                            "wind_direction_10m": float(wind.get("deg", 270)),
                            "surface_pressure": float(main.get("pressure", 1013.0)),
                            "weather_code": 0 if (owm.get("weather") or [{}])[0].get("main") == "Clear" else 1,
                        },
                        "spread_risk": spread_risk,
                        "source": "openweathermap",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
            except Exception:
                pass

        # 2. Keyless high-resolution Open-Meteo fallback
        try:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,surface_pressure",
                    "wind_speed_unit": "ms",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            cur = data.get("current", {})
            wind_speed = float(cur.get("wind_speed_10m", 5.0))
            humidity = float(cur.get("relative_humidity_2m", 45.0))
            wind_factor = min(wind_speed / 20.0, 1.0)
            humidity_factor = max(1.0 - humidity / 100.0, 0.0)
            spread_risk = round(wind_factor * 0.6 + humidity_factor * 0.4, 3)
            return {
                "latitude": lat,
                "longitude": lon,
                "current": cur,
                "spread_risk": spread_risk,
                "source": "open-meteo",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Weather service error: {exc}")


@router.get("/telemetry/nasa-hotspots")
async def get_nasa_hotspots():
    """Real-time active wildfires and thermal anomalies from NASA FIRMS Area API and NASA EONET v3."""
    hotspots = []
    async with httpx.AsyncClient(timeout=8.0) as client:
        # 1. Query NASA FIRMS if MAP_KEY is present
        if settings.nasa_firms_map_key:
            try:
                # Query California bounding box
                bbox = "-124.5,32.5,-114.1,42.0"
                firms_url = (
                    f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
                    f"{settings.nasa_firms_map_key}/{settings.firms_source}/{bbox}/{settings.firms_day_range}"
                )
                resp = await client.get(firms_url)
                if resp.status_code == 200 and resp.text:
                    lines = resp.text.strip().splitlines()
                    if len(lines) > 1 and "latitude" in lines[0].lower():
                        reader = csv.DictReader(io.StringIO(resp.text))
                        for idx, row in enumerate(reader):
                            try:
                                lat = float(row["latitude"])
                                lon = float(row["longitude"])
                                frp = float(row.get("frp", 15.0))
                                conf_raw = row.get("confidence", "nominal")
                                hotspots.append({
                                    "id": f"firms-ca-{idx + 1}",
                                    "title": f"NASA VIIRS Hotspot ({frp:.1f} MW)",
                                    "lat": lat,
                                    "lon": lon,
                                    "frp": frp,
                                    "confidence": 90 if conf_raw == "h" or conf_raw == "high" else 75,
                                    "date": f"{row.get('acq_date', '')}T{row.get('acq_time', '')}Z",
                                    "source": "NASA FIRMS VIIRS (375m)",
                                })
                            except Exception:
                                continue
            except Exception:
                pass

        # 2. Query NASA EONET v3 active wildfires
        try:
            resp = await client.get(
                "https://eonet.gsfc.nasa.gov/api/v3/events",
                params={"category": "wildfires", "status": "open", "limit": 25},
            )
            if resp.status_code == 200:
                events = resp.json().get("events", [])
                for evt in events:
                    geoms = evt.get("geometry", [])
                    if geoms:
                        last = geoms[-1]
                        coords = last.get("coordinates", [])
                        if len(coords) >= 2:
                            hotspots.append({
                                "id": f"eonet-{evt.get('id')}",
                                "title": evt.get("title"),
                                "lat": coords[1],
                                "lon": coords[0],
                                "date": last.get("date"),
                                "magnitude": last.get("magnitudeValue"),
                                "source": "NASA EONET v3",
                            })
        except Exception:
            pass

    return {
        "count": len(hotspots),
        "source": "NASA FIRMS (VIIRS) + NASA EONET v3",
        "hotspots": hotspots,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/cameras/nearby")
async def nearby_cameras(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    limit: int = Query(default=5, ge=1, le=20),
    _user=Depends(require_user),
):
    """Return online camera feeds nearest a point, without exposing provider raw data."""
    if settings.camera_source != "alertwest":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Nearby camera browsing is available when CAMERA_SOURCE=alertwest",
        )

    try:
        cameras = await alertwest.fetch_cameras()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The live camera directory is temporarily unavailable",
        ) from exc

    ranked = alertwest.nearest(cameras, lat, lon, settings.alertwest_max_km)[:limit]
    return {
        "source": "alertwest",
        "max_distance_km": settings.alertwest_max_km,
        "cameras": [
            {
                "id": camera.cid,
                "name": camera.name,
                "lat": camera.lat,
                "lon": camera.lon,
                "distance_km": round(distance, 2),
                "image_url": camera.image_url(),
            }
            for distance, camera in ranked
        ],
    }


@router.get("/cameras")
async def camera_directory(
    limit: int = Query(default=15_000, ge=1, le=20_000),
    _user=Depends(require_user),
):
    """Return every online AlertWest camera for map rendering.

    The AlertWest directory is cached by ``fetch_cameras``. This route deliberately
    returns a compact public representation rather than the provider's raw payload.
    """
    if settings.camera_source != "alertwest":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Camera directory browsing is available when CAMERA_SOURCE=alertwest",
        )

    try:
        cameras = await alertwest.fetch_cameras()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The live camera directory is temporarily unavailable",
        ) from exc

    available = [camera for camera in cameras if not camera.offline and camera.image_url()]
    return {
        "source": "alertwest",
        "camera_count": len(available),
        "cameras": [
            {
                "id": camera.cid,
                "name": camera.name,
                "lat": camera.lat,
                "lon": camera.lon,
                "image_url": camera.image_url(),
            }
            for camera in available[:limit]
        ],
    }


@router.post("/analyze", response_model=PipelineResult, status_code=status.HTTP_200_OK)
async def analyze(
    event: AlertEvent,
    _user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineResult:
    try:
        # Vision and LLM dependencies are intentionally loaded only for an
        # analysis request.  That keeps health, settings, and camera browsing
        # available during a lightweight local setup.
        from app.services.ai.agents import OrchestratorAgent

        result = await OrchestratorAgent().run(event=event)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    row = _incident_row(result, event)
    existing = await db.get(Incident, row.id)
    if existing is None:
        db.add(row)
        await db.commit()
    return result


@router.get("/incidents")
async def list_incidents(
    limit: int = 50,
    _user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(select(Incident).order_by(Incident.created_at.desc()).limit(limit))).scalars().all()
    return [_serialize(r) for r in rows]


@router.post("/incidents/{incident_id}/review")
async def review_incident(
    incident_id: str,
    body: ReviewRequest,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.status != IncidentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=409, detail=f"Incident already {incident.status.value}")
    decision = body.decision.lower()
    if decision not in {"approve", "reject"}:
        raise HTTPException(status_code=422, detail="decision must be 'approve' or 'reject'")

    notification_sent = False
    if decision == "approve":
        suggestion = (incident.result or {}).get("suggestion") or {}
        from app.services.ai.agents.output import OutputAgent

        notification_sent = await OutputAgent().dispatch(
            {
                "incident_id": incident.id,
                "criticality": incident.criticality,
                "lat": incident.lat,
                "lon": incident.lon,
                "alert_message": suggestion.get("alert_message"),
                "action_plan": suggestion.get("action_plan"),
                "recommended_resources": suggestion.get("recommended_resources"),
                "approved_by": user.email if user else "anonymous",
            }
        )
    incident.status = IncidentStatus.APPROVED if decision == "approve" else IncidentStatus.REJECTED
    incident.reviewer_note = body.note
    incident.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return {**_serialize(incident), "notification_sent": notification_sent}
