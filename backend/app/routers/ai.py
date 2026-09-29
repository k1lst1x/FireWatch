import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Incident, IncidentStatus
from app.db.session import get_db
from app.dependencies import require_admin, require_user
from app.services.ai.agents.orchestrator import OrchestratorAgent
from app.services.ai.integrations import integration_status
from app.services.ai.schemas.pipeline import AlertEvent, ConfirmationStatus, PipelineResult

router = APIRouter(prefix="/ai", tags=["ai"])

_orchestrator = OrchestratorAgent()


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


@router.post("/analyze", response_model=PipelineResult, status_code=status.HTTP_200_OK)
async def analyze(
    event: AlertEvent,
    _user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> PipelineResult:
    try:
        result = await _orchestrator.run(event=event)
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
        notification_sent = await _orchestrator.output.dispatch(
            {
                "incident_id": incident.id,
                "criticality": incident.criticality,
                "lat": incident.lat,
                "lon": incident.lon,
                "alert_message": suggestion.get("alert_message"),
                "action_plan": suggestion.get("action_plan"),
                "recommended_resources": suggestion.get("recommended_resources"),
                "approved_by": user.email,
            }
        )
    incident.status = IncidentStatus.APPROVED if decision == "approve" else IncidentStatus.REJECTED
    incident.reviewer_note = body.note
    incident.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return {**_serialize(incident), "notification_sent": notification_sent}
