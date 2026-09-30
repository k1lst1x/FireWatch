import { useEffect, useState } from 'react'
import {
  Brain, Camera, Check, ChevronDown, ClipboardList, CloudSun, Eye, GitMerge, MapPin, Maximize2, Play, Satellite, Siren, UserCheck, X,
} from 'lucide-react'
import { CRIT_COLOR, imageSrc, type AnalyzeInput, type Incident, type NearbyCamera, type PipelineResult } from '../../lib/api'
import { getNearbyLiveCameras, type LiveCameraFeed, type CameraCategory } from '../cameraDirectory'
import CameraFrame from './CameraFrame'
import { type FrameStatus } from './cameraFrameProbe'

const PRESETS: { label: string; lat: number; lon: number; cameraId?: string }[] = [
  { label: 'Demo · Mt Tamalpais fog', lat: 37.9235, lon: -122.5965, cameraId: 'demo-fog-tam' },
  { label: 'Demo · Yosemite fire', lat: 37.6528, lon: -119.6262, cameraId: 'demo-yosemite-fire' },
  { label: 'San Francisco Downtown', lat: 37.7749, lon: -122.4194 },
  { label: 'SF Bay Bridge West Span', lat: 37.7905, lon: -122.3892 },
  { label: 'Presidio Golden Gate', lat: 37.7989, lon: -122.4662 },
  { label: 'Twin Peaks Summit', lat: 37.7544, lon: -122.4477 },
  { label: 'Sutro Tower Overlook', lat: 37.7552, lon: -122.4528 },
  { label: 'I-80 Donner Summit (Sierra)', lat: 39.3175, lon: -120.3340 },
  { label: 'Yosemite Half Dome', lat: 37.7456, lon: -119.5332 },
  { label: 'Lake Tahoe Emerald Bay', lat: 38.9540, lon: -120.1000 },
  { label: 'Mount Shasta Peak', lat: 41.4092, lon: -122.1949 },
  { label: 'Big Sur Bixby Coast', lat: 36.3714, lon: -121.9018 },
]

const CATEGORY_TABS: { id: CameraCategory; label: string }[] = [
  { id: 'all', label: 'All Feeds' },
  { id: 'sf', label: 'SF City' },
  { id: 'caltrans', label: 'Caltrans CCTV' },
  { id: 'wildfire', label: 'Wildfire Net' },
  { id: 'parks', label: 'Parks & Peaks' },
]

/** Bottom-centre control: pick a point, choose a nearby live camera, run the agents. */
export function AnalysisBar({
  running,
  onRun,
  selectedCameraId,
  onSelectCamera,
  onOpenVideoModal,
}: {
  running: boolean
  onRun: (input: AnalyzeInput) => void
  selectedCameraId?: string | null
  onSelectCamera?: (camera: LiveCameraFeed | NearbyCamera) => void
  onOpenVideoModal?: (camera: LiveCameraFeed) => void
}) {
  const [lat, setLat] = useState('37.6528')
  const [lon, setLon] = useState('-119.6262')
  const [presetIndex, setPresetIndex] = useState('1')
  const [preferredCameraId, setPreferredCameraId] = useState('demo-yosemite-fire')
  const [cameras, setCameras] = useState<LiveCameraFeed[]>([])
  const [selectedCamera, setSelectedCamera] = useState<LiveCameraFeed | null>(null)
  const [category, setCategory] = useState<CameraCategory>('all')
  const [cameraOpen, setCameraOpen] = useState(true)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraUpdatedAt, setCameraUpdatedAt] = useState<number | null>(null)
  const [cameraPoll, setCameraPoll] = useState(0)
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }))
  const [feedStatus, setFeedStatus] = useState<FrameStatus>('loading')

  // Move an already-open analysis bar onto the Yosemite fire point.
  useEffect(() => {
    setLat('37.6528')
    setLon('-119.6262')
    setPresetIndex('1')
    setPreferredCameraId('demo-yosemite-fire')
  }, [])

  // Synchronize when a camera is chosen on the map
  useEffect(() => {
    if (!selectedCameraId) return
    const match = cameras.find(c => c.id === selectedCameraId)
    if (match) {
      setSelectedCamera(match)
      setLat(match.lat.toFixed(4))
      setLon(match.lon.toFixed(4))
    }
  }, [selectedCameraId, cameras])

  // Real-time ticking surveillance timecode
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('en-US', { hour12: false }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Staggered snapshot refresher for active Caltrans / traffic CCTV cameras
  useEffect(() => {
    const timer = window.setInterval(() => setCameraPoll(poll => poll + 1), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const la = Number(lat)
    const lo = Number(lon)
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      setCameras([])
      setCameraError('Enter valid coordinates to find cameras')
      return
    }

    setCameraLoading(true)
    setCameraError(null)

    // Load free California and San Francisco cameras instantaneously without network delay
    const nearby = getNearbyLiveCameras(la, lo, category)
    setCameras(nearby)
    setCameraUpdatedAt(Date.now())
    setSelectedCamera(current => {
      const preferred = nearby.find(c => c.id === preferredCameraId)
      if (preferred) return preferred
      return current ? nearby.find(c => c.id === current.id) ?? nearby[0] : nearby[0]
    })
    setCameraLoading(false)
  }, [lat, lon, category, cameraPoll, preferredCameraId])

  const activeFeed = selectedCamera ?? cameras[0] ?? null

  const handleSelect = (cam: LiveCameraFeed | null) => {
    setPreferredCameraId(cam?.id ?? '')
    setSelectedCamera(cam)
    if (cam && onSelectCamera) {
      onSelectCamera(cam)
    }
  }

  const submit = () => {
    const la = parseFloat(lat)
    const lo = parseFloat(lon)
    if (Number.isNaN(la) || Number.isNaN(lo)) return
    onRun({
      lat: la,
      lon: lo,
      image_url: activeFeed?.image_url || undefined,
      camera_id: activeFeed?.id,
    })
  }

  return (
    <div className="fwmap-panel fwmap-enter pointer-events-auto flex flex-wrap items-center gap-2.5 p-3">
      <select
        className="fwmap-input cursor-pointer"
        value={presetIndex}
        onChange={e => {
          const index = e.target.value
          const p = PRESETS[Number(index)]
          setPresetIndex(index)
          if (!p) return
          setLat(String(p.lat))
          setLon(String(p.lon))
          setPreferredCameraId(p.cameraId ?? '')
          if (!p.cameraId) setSelectedCamera(null)
        }}
        aria-label="Location preset"
      >
        {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
      </select>

      <input className="fwmap-input w-[104px]" value={lat} onChange={e => setLat(e.target.value)} aria-label="Latitude" />
      <input className="fwmap-input w-[104px]" value={lon} onChange={e => setLon(e.target.value)} aria-label="Longitude" />

      <div className="relative">
        <button
          type="button"
          className="fwmap-input flex min-w-[240px] max-w-[320px] items-center gap-2 text-left transition-colors hover:border-[var(--flame)]"
          onClick={() => setCameraOpen(open => !open)}
          aria-expanded={cameraOpen}
          aria-haspopup="listbox"
          aria-label="Choose a nearby live camera"
        >
          <Camera size={14} className="shrink-0 text-emerald-400" />
          <span className="min-w-0 flex-1 truncate font-medium text-white">
            {activeFeed ? `${activeFeed.name.split('·')[0].trim()} · ${activeFeed.distance_km.toFixed(1)} km` : 'Nearest live camera'}
          </span>
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          <ChevronDown size={15} className={`shrink-0 transition-transform ${cameraOpen ? 'rotate-180' : ''}`} />
        </button>

        {cameraOpen && (
          <div
            role="listbox"
            aria-label="Available cameras near this location"
            className="fwmap-panel absolute bottom-[calc(100%+8px)] left-0 z-40 w-[410px] sm:w-[460px] overflow-hidden p-3 shadow-2xl border border-white/15 bg-black/95 rounded-xl"
          >
            {/* Box Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <div className="text-[12px] font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                  <Camera size={14} className="text-emerald-400" />
                  <span>Free Live California Feeds</span>
                  {cameraLoading && <span className="fwmap-spinner !h-3 !w-3" />}
                  <span className="text-[10px] text-zinc-400 font-mono">({cameras.length})</span>
                </div>
                <div className="fwmap-mono mt-0.5 text-[9px] text-zinc-400">
                  CALTRANS OPEN CCTV · SF LANDMARKS · ALERTCALIFORNIA{cameraUpdatedAt ? ` · SYNCED ${new Date(cameraUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>

              {/* Real-time LIVE indicator */}
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LIVE FEED</span>
              </div>
            </div>

            {/* Network Category Filter Tabs */}
            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-all ${
                    category === tab.id
                      ? 'bg-[#ff5a00] text-white shadow-[0_0_8px_rgba(255,90,0,0.4)]'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {cameraError && (
              <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-1.5 text-center text-[11px] text-amber-300">
                {cameraError}
              </div>
            )}

            {/* REAL-TIME LIVE CAMERA VIEWPORT INSIDE THIS BOX */}
            {activeFeed && (
              <div
                className="relative mt-2.5 overflow-hidden rounded-lg border border-white/15 bg-black shadow-lg cursor-pointer group"
                onClick={() => onOpenVideoModal && onOpenVideoModal(activeFeed)}
                title="Click to open video popup window"
              >
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                  <CameraFrame
                    src={activeFeed.live_cctv_url || activeFeed.image_url}
                    alt={activeFeed.name}
                    refreshMs={(activeFeed.live_cctv_url || activeFeed.image_url || '').includes('demo_images') ? 0 : 5000}
                    onStatusChange={setFeedStatus}
                  />

                  {/* Hover Prompt */}
                  {feedStatus === 'live' && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-3 py-1.5 text-[11px] font-bold text-white shadow-xl">
                        <Maximize2 size={13} /> Open Video Window
                      </span>
                    </div>
                  )}

                  {/* Optical Reticle & Surveillance HUD Overlay. Hidden while the
                      feed is down so the offline card reads cleanly. */}
                  <div className={`pointer-events-none absolute inset-0 transition-opacity ${feedStatus === 'live' ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Reticles */}
                    <div className="absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-emerald-400/80" />
                    <div className="absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-emerald-400/80" />
                    <div className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-emerald-400/80" />
                    <div className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-emerald-400/80" />

                    {/* Center Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <div className="h-6 w-6 border border-dashed border-emerald-400 rounded-full" />
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded bg-black/75 px-2 py-0.5 backdrop-blur-md border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-[9px] font-bold tracking-wider text-white">REC · LIVE</span>
                      <span className="font-mono text-[9px] text-zinc-400">{activeFeed.fps || 30} FPS</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 rounded bg-black/75 px-2 py-0.5 font-mono text-[9px] text-emerald-300 backdrop-blur-md border border-white/10">
                      {liveClock} PST
                    </div>

                    {/* Bottom Metadata Bar */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2.5 pt-6">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[12px] font-semibold text-white">
                          {activeFeed.name}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-amber-400 ml-2 shrink-0">
                          {activeFeed.distance_km.toFixed(1)} km
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 mt-0.5">
                        <span className="truncate mr-2 text-zinc-300">{activeFeed.network}</span>
                        <span className="shrink-0 text-zinc-400">{activeFeed.resolution || '1080p HD'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Auto-select / Reset button & Popup Video button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                role="option"
                aria-selected={!selectedCamera}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  !selectedCamera
                    ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
                onClick={() => handleSelect(null)}
              >
                <MapPin size={13} />
                <span>Auto-select Nearest Feed</span>
              </button>

              {activeFeed && onOpenVideoModal && (
                <button
                  type="button"
                  disabled={feedStatus !== 'live'}
                  className="flex items-center gap-1.5 rounded-lg border border-[#ff5a00]/40 bg-[#ff5a00]/20 px-2.5 py-1.5 text-[11px] font-semibold text-[#ff8c42] hover:bg-[#ff5a00] hover:text-white transition-all shadow-sm disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-zinc-500 disabled:hover:bg-white/5 disabled:hover:text-zinc-500"
                  onClick={() => onOpenVideoModal(activeFeed)}
                  title={feedStatus === 'live' ? 'Open live video in popup window' : 'Feed unavailable upstream'}
                >
                  <Maximize2 size={13} />
                  <span>Popup Video</span>
                </button>
              )}

              {activeFeed && onSelectCamera && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => onSelectCamera(activeFeed)}
                  title="Focus Camera Station on Map"
                >
                  <Eye size={13} className="text-emerald-400" />
                  <span>Focus Map</span>
                </button>
              )}
            </div>

            {/* Scrollable list of available cameras with source tags */}
            <div className="fwmap-scroll mt-2 max-h-[190px] overflow-y-auto space-y-1 pr-1">
              {cameras.map(camera => {
                const isSelected = activeFeed?.id === camera.id
                return (
                  <button
                    type="button"
                    key={camera.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all ${
                      isSelected
                        ? 'border border-[#ff5a00]/60 bg-[#ff5a00]/15 text-white'
                        : 'border border-transparent bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                    }`}
                    onClick={() => {
                      handleSelect(camera)
                      if (onOpenVideoModal) onOpenVideoModal(camera)
                    }}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                        isSelected
                          ? 'bg-[#ff5a00] text-white'
                          : camera.category === 'caltrans'
                          ? 'bg-amber-500/20 text-amber-400'
                          : camera.category === 'parks'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <Camera size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="block truncate text-[11px] font-medium leading-snug">
                          {camera.name}
                        </span>
                        {camera.category === 'caltrans' && camera.highwayRoute && (
                          <span className="shrink-0 rounded bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 text-[8px] font-mono font-bold text-amber-300">
                            {camera.highwayRoute}
                          </span>
                        )}
                        {camera.category === 'parks' && (
                          <span className="shrink-0 rounded bg-cyan-500/20 border border-cyan-500/30 px-1 py-0.2 text-[8px] font-mono font-bold text-cyan-300">
                            PARK
                          </span>
                        )}
                      </div>
                      <span className="fwmap-mono block truncate text-[9px] text-zinc-400">
                        {camera.network}
                      </span>
                    </span>
                    <span className="fwmap-mono shrink-0 text-[10px] font-bold text-amber-400">
                      {camera.distance_km.toFixed(1)} km
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <button className="fwmap-btn fwmap-btn--ember" onClick={submit} disabled={running}>
        {running ? <span className="fwmap-spinner" /> : <Play size={14} fill="currentColor" />}
        {running ? 'Running agents…' : 'Run analysis'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- agent trace

type StepTone = 'llm' | 'rules' | null

interface Step {
  n: number
  title: string
  icon: typeof Camera
  value: string
  detail?: string
  tone: StepTone
  latency?: number
}

function buildSteps(r: PipelineResult): { steps: Step[]; dismissed: boolean } {
  const dismissed = r.fusion?.status === 'DISMISSED'
  const pct = (v?: number) => (v == null ? '—' : `${Math.round(v * 100)}%`)
  const cameraName = (r.camera?.raw?.camera as { name?: string } | undefined)?.name
  const detector = (r.camera?.telemetry as { detector?: string } | undefined)?.detector

  const steps: Step[] = [
    {
      n: 1, title: 'Camera', icon: Camera, tone: null, latency: r.camera?.latency_ms,
      value: pct(r.camera?.confidence),
      detail: [cameraName, detector].filter(Boolean).join(' · ') || undefined,
    },
    {
      n: 2, title: 'Satellite', icon: Satellite, tone: null, latency: r.satellite?.latency_ms,
      value: pct(r.satellite?.thermal_confidence),
      detail: r.satellite?.hotspot_detected ? 'hotspot confirmed' : 'no hotspot',
    },
    {
      n: 3, title: 'Weather', icon: CloudSun, tone: null, latency: r.weather?.latency_ms,
      value: r.weather ? `${r.weather.wind_speed?.toFixed(1)} m/s` : '—',
      detail: r.weather ? `RH ${Math.round(r.weather.humidity)}% · spread ${pct(r.weather.spread_risk)}` : undefined,
    },
    {
      n: 4, title: 'Fusion', icon: GitMerge, tone: null,
      value: r.fusion?.status ?? '—',
      detail: r.fusion ? `combined ${r.fusion.combined_score.toFixed(2)}` : undefined,
    },
    {
      n: 5, title: 'Reasoning', icon: Brain, tone: (r.reasoning?.source as StepTone) ?? null,
      value: r.reasoning?.scene_description?.split('. ')[0] ?? '—',
    },
    {
      n: 6, title: 'Severity', icon: Siren, tone: (r.classification?.source as StepTone) ?? null,
      value: r.classification?.criticality ?? '—',
    },
    {
      n: 7, title: 'Plan', icon: ClipboardList, tone: (r.suggestion?.source as StepTone) ?? null,
      value: r.suggestion?.alert_message ?? '—',
      detail: r.suggestion?.action_plan?.[0],
    },
    {
      n: 8, title: 'Human', icon: UserCheck, tone: null,
      value: (r.output?.review_status ?? 'awaiting').replace('_', ' '),
    },
  ]
  return { steps, dismissed }
}

function TraceStep({ step, skipped }: { step: Step; skipped: boolean }) {
  const Icon = step.icon
  return (
    <div className={`fwmap-step ${skipped ? 'is-skipped' : 'is-on'}`}>
      <span className="fwmap-step__n">{String(step.n).padStart(2, '0')}</span>
      <Icon size={13} className={`mt-0.5 shrink-0 ${skipped ? 'text-[var(--ash-3)]' : 'text-[var(--flame)]'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-medium">{step.title}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {step.tone && (
              <span className={`fwmap-badge fwmap-badge--${step.tone === 'llm' ? 'llm' : 'rules'}`}>
                {step.tone === 'llm' ? 'LLM' : 'rules'}
              </span>
            )}
            {step.latency != null && (
              <span className="fwmap-mono text-[9px] text-[var(--ash-3)]">{Math.round(step.latency)} ms</span>
            )}
          </div>
        </div>
        <div className="fwmap-mono mt-0.5 truncate text-[11px] text-[var(--ash-2)]" title={step.value}>
          {skipped ? 'skipped' : step.value}
        </div>
        {!skipped && step.detail && (
          <div className="mt-0.5 truncate text-[10.5px] text-[var(--ash-3)]" title={step.detail}>{step.detail}</div>
        )}
      </div>
    </div>
  )
}

/** Right panel: the selected incident's evidence, full agent trace and the human call. */
export function IncidentDetail({
  incident,
  onReview,
  onClose,
  reviewDisabled,
}: {
  incident: Incident
  onReview: (id: string, decision: 'approve' | 'reject') => void
  onClose: () => void
  reviewDisabled: boolean
}) {
  const r = incident.result ?? { event_id: incident.event_id }
  const { steps, dismissed } = buildSteps(r)
  const color = incident.criticality ? CRIT_COLOR[incident.criticality] : '#6b7280'
  const frame = imageSrc(r.camera?.image_url)
  const decided = incident.status === 'approved' || incident.status === 'rejected'

  return (
    <div className="fwmap-panel fwmap-enter pointer-events-auto flex max-h-[calc(100vh-150px)] w-[330px] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
        <div className="min-w-0">
          <div className="fwmap-title">Incident</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="fwmap-dot" style={{ background: color, color }} />
            <span className="truncate text-[17px] font-semibold tracking-tight">
              {incident.criticality ?? 'Dismissed'}
            </span>
          </div>
          <div className="fwmap-mono mt-1 text-[10.5px] text-[var(--ash-3)]">
            {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}
          </div>
        </div>
        <button
          className="rounded-lg p-1.5 text-[var(--ash-3)] transition-colors hover:bg-white/5 hover:text-[var(--ash)]"
          onClick={onClose}
          aria-label="Close incident"
        >
          <X size={15} />
        </button>
      </div>

      <div className="fwmap-scroll flex-1 p-4">
        {frame && (
          <div className="relative mb-3 overflow-hidden rounded-xl border border-[var(--line)]">
            <img src={frame} alt="Analysed camera frame" className="block w-full" />
            <span
              className="fwmap-mono absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-semibold text-black"
              style={{ background: color }}
            >
              {r.fusion?.status ?? 'ANALYSED'}
            </span>
          </div>
        )}

        <div className="fwmap-title mb-1.5">Agent trace</div>
        <div className="space-y-0.5">
          {steps.map(s => (
            <TraceStep key={s.n} step={s} skipped={dismissed && s.n >= 5} />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--line)] p-3">
        {decided ? (
          <div className="flex items-center gap-2.5 px-1 text-[12.5px]">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full ${
                incident.status === 'approved' ? 'bg-[var(--ember)] text-black' : 'bg-white/10'
              }`}
            >
              {incident.status === 'approved' ? <Check size={14} strokeWidth={2.6} /> : <X size={14} />}
            </span>
            <span className="font-medium">
              {incident.status === 'approved' ? 'Dispatched' : 'Marked false alarm'}
            </span>
            <span className="fwmap-mono ml-auto text-[10px] text-[var(--flame)]">+1 label</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              className="fwmap-btn fwmap-btn--ember flex-1"
              onClick={() => onReview(incident.id, 'approve')}
              disabled={reviewDisabled}
            >
              <Check size={14} strokeWidth={2.6} /> Dispatch
            </button>
            <button
              className="fwmap-btn fwmap-btn--ghost flex-1"
              onClick={() => onReview(incident.id, 'reject')}
              disabled={reviewDisabled}
            >
              <X size={14} /> False alarm
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CameraStationDetail({
  camera,
  onOpenVideoModal,
  onRunAnalysis,
  onClose,
}: {
  camera: LiveCameraFeed
  onOpenVideoModal?: (camera: LiveCameraFeed) => void
  onRunAnalysis?: (camera: LiveCameraFeed) => void
  onClose: () => void
}) {
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('loading')
  const isLive = frameStatus === 'live'

  return (
    <div className="fwmap-card flex w-[330px] flex-col overflow-hidden border border-white/15 bg-zinc-950/95 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-[var(--line)] p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ff5a00] text-white shadow-sm">
            <Camera size={14} />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-[13px] font-bold text-white">{camera.name}</h4>
            <div className="fwmap-mono text-[10px] text-zinc-400 flex items-center gap-1.5">
              <span className={`font-semibold ${isLive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {frameStatus === 'loading' ? 'CONNECTING' : isLive ? 'ONLINE' : 'NO SIGNAL'}
              </span>
              <span>•</span>
              <span>{(camera.distance_km ?? 0).toFixed(1)} km away</span>
            </div>
          </div>
        </div>
        <button
          className="rounded-lg p-1.5 text-[var(--ash-3)] transition-colors hover:bg-white/5 hover:text-white"
          onClick={onClose}
          aria-label="Close camera inspector"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-3">
        {/* Live Camera Viewport */}
        <div
          className={`relative aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-black shadow group ${
            isLive ? 'cursor-pointer' : 'cursor-default'
          }`}
          onClick={() => isLive && onOpenVideoModal && onOpenVideoModal(camera)}
          title={isLive ? 'Click to popup large live video window' : 'Feed unavailable upstream'}
        >
          <CameraFrame
            src={camera.live_cctv_url || camera.image_url}
            alt={camera.name}
            onStatusChange={setFrameStatus}
          />
          {isLive && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-3 py-1.5 text-[11px] font-bold text-white shadow-xl">
                <Maximize2 size={13} /> Popup Video
              </span>
            </div>
          )}
          <div
            className={`absolute top-2 left-2 flex items-center gap-1 rounded border border-white/10 bg-black/75 px-1.5 py-0.5 font-mono text-[9px] ${
              isLive ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'}`} />
            <span>DOT CCTV</span>
          </div>
        </div>

        <div className="mt-2.5 space-y-1 text-[11px] text-zinc-300 font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-500">Network</span>
            <span className="truncate max-w-[180px]">{camera.network || 'Caltrans District 4'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Coordinates</span>
            <span>{camera.lat.toFixed(4)}°N, {camera.lon.toFixed(4)}°W</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] p-2.5 flex gap-2">
        {onOpenVideoModal && (
          <button
            className="fwmap-btn fwmap-btn--ember flex-1 !text-xs !py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isLive}
            title={isLive ? 'Open live video in popup window' : 'Feed unavailable upstream'}
            onClick={() => onOpenVideoModal(camera)}
          >
            <Maximize2 size={13} /> Popup Video
          </button>
        )}
        {onRunAnalysis && (
          <button
            className="fwmap-btn fwmap-btn--ghost flex-1 !text-xs !py-1.5"
            onClick={() => onRunAnalysis(camera)}
          >
            <Play size={12} fill="currentColor" /> Analyze
          </button>
        )}
      </div>
    </div>
  )
}
