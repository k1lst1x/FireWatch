from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


class ConfirmationStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    DISMISSED = "DISMISSED"


class CriticalityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt-{uuid.uuid4().hex[:8]}", max_length=128)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    camera_id: Optional[str] = Field(default=None, max_length=128)
    image_url: Optional[str] = Field(default=None, max_length=16 * 1024 * 1024)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), max_length=64)


class CameraResult(BaseModel):
    confidence: float               # 0.0 – 1.0  fire/smoke detection confidence
    detected: bool
    image_url: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
    latency_ms: Optional[float] = None  # wall time for this agent (for SLO / debugging)
    telemetry: Optional[Dict[str, Any]] = None


class SatelliteResult(BaseModel):
    thermal_confidence: float       # 0.0 – 1.0
    hotspot_detected: bool
    raw: Optional[Dict[str, Any]] = None
    latency_ms: Optional[float] = None
    telemetry: Optional[Dict[str, Any]] = None


class WeatherResult(BaseModel):
    wind_speed: float               # m/s
    wind_direction: float           # degrees
    humidity: float                 # %
    spread_risk: float              # 0.0 – 1.0 calculated heuristic
    raw: Optional[Dict[str, Any]] = None
    latency_ms: Optional[float] = None
    telemetry: Optional[Dict[str, Any]] = None


class FusionResult(BaseModel):
    status: ConfirmationStatus
    combined_score: float
    reason: str
    telemetry: Optional[Dict[str, Any]] = None


class ReasoningResult(BaseModel):
    scene_description: str
    key_observations: List[str]
    source: Optional[str] = None


class ClassificationResult(BaseModel):
    criticality: CriticalityLevel
    score: float
    reasoning: str
    source: Optional[str] = None


class SuggestionResult(BaseModel):
    action_plan: List[str]
    alert_message: str
    recommended_resources: List[str]
    source: Optional[str] = None


class ExpertOpinion(BaseModel):
    provider: str
    criticality: CriticalityLevel
    score: float = Field(ge=0.0, le=1.0)
    rationale: str


class DeliberationResult(BaseModel):
    opinions: List[ExpertOpinion] = Field(default_factory=list)
    consensus_criticality: Optional[CriticalityLevel] = None
    consensus_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    disagreement: bool = False
    summary: str


class OutputResult(BaseModel):
    notification_sent: bool
    dashboard_updated: bool
    incident_id: str
    logged: bool
    review_status: Optional[str] = None


class PipelineResult(BaseModel):
    event_id: str
    camera: Optional[CameraResult] = None
    satellite: Optional[SatelliteResult] = None
    weather: Optional[WeatherResult] = None
    fusion: Optional[FusionResult] = None
    reasoning: Optional[ReasoningResult] = None
    classification: Optional[ClassificationResult] = None
    deliberation: Optional[DeliberationResult] = None
    suggestion: Optional[SuggestionResult] = None
    output: Optional[OutputResult] = None
    error: Optional[str] = None
