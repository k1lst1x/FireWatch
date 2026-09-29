import type { Incident } from '../lib/api'

/**
 * Stand-in incidents used only when the backend is unreachable, so the map is
 * never an empty city during a demo. The UI labels these as simulated.
 */
const make = (
  id: string,
  lat: number,
  lon: number,
  criticality: Incident['criticality'],
  combined_score: number,
  status: Incident['status'],
  scene: string,
  camera: string,
  frp: number = 75,
  confidence: number = 90,
): Incident => ({
  id,
  event_id: id,
  lat,
  lon,
  status,
  criticality,
  combined_score,
  frp,
  confidence,
  reviewer_note: null,
  created_at: new Date(Date.now() - Math.random() * 5.4e6).toISOString(),
  reviewed_at: null,
  result: {
    event_id: id,
    camera: {
      confidence: combined_score,
      detected: true,
      telemetry: { detector: 'yolov8n' },
      raw: { camera: { name: camera } },
      latency_ms: 380 + Math.round(Math.random() * 260),
    },
    satellite: { thermal_confidence: confidence / 100, hotspot_detected: combined_score > 0.5, latency_ms: 610 },
    weather: { wind_speed: 7.4, wind_direction: 292, humidity: 21, spread_risk: combined_score, latency_ms: 180 },
    fusion: {
      status: criticality ? 'CONFIRMED' : 'DISMISSED',
      combined_score,
      reason: 'camera and satellite agree within the fusion threshold',
    },
    reasoning: { scene_description: scene, key_observations: [`VIIRS NRT Hotspot: ${frp} MW`, `Scan Confidence: ${confidence}%`], source: 'llm' },
    classification: { criticality: criticality ?? 'LOW', score: combined_score, reasoning: '', source: 'llm' },
    suggestion: {
      action_plan: ['Send the nearest engine for size-up', 'Notify the duty chief'],
      alert_message: scene,
      recommended_resources: ['Engine', 'Battalion chief'],
      source: 'rules',
    },
    output: { incident_id: id, notification_sent: false, review_status: status },
  },
})

export const DEMO_INCIDENTS: Incident[] = [
  make('firms-sf-anchor', 37.7749, -122.4194, 'CRITICAL', 0.96, 'pending_review',
    'Benchmark Anchor: High radiative thermal emission detected in urban center.', 'Civic Center · SW', 68.4, 92),
  make('firms-sf-market', 37.7833, -122.4167, 'CRITICAL', 0.98, 'pending_review',
    'Severe thermal hotspot detected near Market & 8th Street corridor.', 'Tenderloin · S', 124.8, 98),
  make('firms-sf-soma', 37.7801, -122.4089, 'CRITICAL', 0.99, 'pending_review',
    'Intense radiative anomaly (195 MW) detected on warehouse roof.', 'Salesforce Tower · S', 195.0, 99),
  make('firms-sf-mission', 37.7699, -122.4280, 'HIGH', 0.85, 'pending_review',
    'Thermal anomaly reading 32 MW confirmed by VIIRS 375m NRT pass.', 'Dolores Park · NW', 32.1, 85),
  make('firms-sf-nob-hill', 37.7925, -122.4147, 'HIGH', 0.91, 'approved',
    'Heavy plume rising between residential structures along the north ridge.', 'Coit Tower · W', 140.2, 94),
  make('firms-sf-presidio', 37.7975, -122.4655, 'MEDIUM', 0.71, 'pending_review',
    'White smoke over the tree line along Presidio coastal ridge.', 'Sutro Tower · N', 48.0, 88),
  make('firms-sf-false', 37.7599, -122.4148, null, 0.21, 'dismissed',
    'Thermal reflection anomaly filtered out by confidence matrix.', 'Twin Peaks · SE', 12.0, 35),
]
