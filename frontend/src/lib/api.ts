export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Integration {
  live: boolean
  [k: string]: unknown
}

export interface KeyStatus {
  label: string
  environment: string
  configured: boolean
  used_for: string
}

export interface PipelineStatus {
  mock: boolean
  replay: string
  human_approval: boolean
  key_status: Record<string, KeyStatus>
  integrations: Record<string, Integration>
}

export interface PipelineResult {
  event_id: string
  camera?: { confidence: number; detected: boolean; image_url?: string | null; latency_ms?: number; telemetry?: Record<string, unknown>; raw?: Record<string, unknown> }
  satellite?: { thermal_confidence: number; hotspot_detected: boolean; latency_ms?: number; raw?: Record<string, unknown> }
  weather?: { wind_speed: number; wind_direction: number; humidity: number; spread_risk: number; latency_ms?: number; raw?: Record<string, unknown> }
  fusion?: { status: 'CONFIRMED' | 'DISMISSED'; combined_score: number; reason: string }
  reasoning?: { scene_description: string; key_observations: string[]; source?: string }
  classification?: { criticality: Criticality; score: number; reasoning: string; source?: string }
  suggestion?: { action_plan: string[]; alert_message: string; recommended_resources: string[]; source?: string }
  output?: { incident_id: string; notification_sent: boolean; review_status?: string | null }
  error?: string | null
}

export interface Incident {
  id: string
  event_id: string
  lat: number
  lon: number
  status: 'dismissed' | 'pending_review' | 'approved' | 'rejected'
  criticality: Criticality | null
  combined_score: number
  frp?: number
  confidence?: number
  reviewer_note: string | null
  created_at: string | null
  reviewed_at: string | null
  result: PipelineResult
}

export interface AnalyzeInput {
  lat: number
  lon: number
  image_url?: string
  camera_id?: string
}

export interface NearbyCamera {
  id: string
  name: string
  lat: number
  lon: number
  distance_km: number
  image_url: string
}

export interface NearbyCamerasResponse {
  source: string
  max_distance_km: number
  cameras: NearbyCamera[]
}

export interface CameraDirectoryResponse {
  source: string
  camera_count: number
  cameras: Array<Omit<NearbyCamera, 'distance_km'>>
}

export interface FederationStation {
  id: string
  name: string
  online: boolean
  labels: number
  fp_rate: number | null
  miss_rate?: number | null
  params: { camera_weight: number; fusion_threshold: number; thermal_only_threshold: number }
}

export interface FederationRound {
  round: number
  fp_rate: number
  miss_rate?: number
  per_station: Record<string, number>
}

export interface FederationStatus {
  round: number
  running: boolean
  stations: FederationStation[]
  global_params: FederationStation['params']
  history: FederationRound[]
}

export interface AgentTraceEntry {
  id: string
  name: string
  responsibility: string
  state: 'idle' | 'completed'
  summary: string
  latency_ms: number | null
  mode: string | null
}

export interface AgentTraceResponse {
  event_id: string | null
  created_at: string | null
  agents: AgentTraceEntry[]
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      detail = res.statusText
    }
    throw new Error(`${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  status: () => call<PipelineStatus>('/ai/status'),
  agentTrace: () => call<AgentTraceResponse>('/ai/agent-trace'),
  incidents: () => call<Incident[]>('/ai/incidents'),
  demoImages: () => call<string[]>('/ai/demo-images'),
  cameraDirectory: () => call<CameraDirectoryResponse>('/ai/cameras'),
  nearbyCameras: (lat: number, lon: number) =>
    call<NearbyCamerasResponse>(`/ai/cameras/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
  analyze: (body: AnalyzeInput) => call<PipelineResult>('/ai/analyze', { method: 'POST', body: JSON.stringify(body) }),
  review: (id: string, decision: 'approve' | 'reject', note?: string) =>
    call<Incident & { notification_sent: boolean }>(`/ai/incidents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    }),
  federationStatus: () => call<FederationStatus>('/federation/status'),
  federationRound: (rounds = 1) =>
    call<FederationStatus>('/federation/round', { method: 'POST', body: JSON.stringify({ rounds }) }),
  telemetryWeather: (lat = 37.7749, lon = -122.4194) =>
    call<{ latitude: number; longitude: number; current: any; spread_risk: number; source: string; timestamp: string }>(
      `/ai/telemetry/live-weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    ),
  telemetryNasa: () =>
    call<{ count: number; source: string; hotspots: any[]; timestamp: string }>('/ai/telemetry/nasa-hotspots'),
}

export function imageSrc(ref?: string | null): string | null {
  if (!ref) return null
  if (ref.startsWith('http') || ref.startsWith('data:')) return ref
  return `/${ref.replace(/^\/+/, '')}`
}

export const CRIT_COLOR: Record<Criticality, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
}
