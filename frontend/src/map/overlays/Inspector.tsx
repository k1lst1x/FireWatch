import { useEffect, useState } from 'react'
import {
  Brain, Camera, Check, ClipboardList, CloudSun, GitMerge, Play, Satellite, Siren, UserCheck, X,
} from 'lucide-react'
import { CRIT_COLOR, api, imageSrc, type Incident, type PipelineResult } from '../../lib/api'

const PRESETS: { label: string; lat: number; lon: number }[] = [
  { label: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { label: 'Yosemite hotspot', lat: 37.634, lon: -119.622 },
  { label: 'Tahoe camera', lat: 38.9, lon: -120.0 },
]

/** Bottom-centre control: pick a point, optionally a demo image, run the agents. */
export function AnalysisBar({
  running,
  onRun,
}: {
  running: boolean
  onRun: (lat: number, lon: number, imageUrl?: string) => void
}) {
  const [lat, setLat] = useState('37.7749')
  const [lon, setLon] = useState('-122.4194')
  const [images, setImages] = useState<string[]>([])
  const [image, setImage] = useState('')

  useEffect(() => {
    api.demoImages().then(setImages).catch(() => setImages([]))
  }, [])

  const submit = () => {
    const la = parseFloat(lat)
    const lo = parseFloat(lon)
    if (Number.isNaN(la) || Number.isNaN(lo)) return
    onRun(la, lo, image || undefined)
  }

  return (
    <div className="fwmap-panel fwmap-enter pointer-events-auto flex flex-wrap items-center gap-2.5 p-3">
      <select
        className="fwmap-input cursor-pointer"
        onChange={e => {
          const p = PRESETS[Number(e.target.value)]
          if (p) { setLat(String(p.lat)); setLon(String(p.lon)) }
        }}
        defaultValue=""
        aria-label="Location preset"
      >
        <option value="" disabled>Location preset</option>
        {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
      </select>

      <input className="fwmap-input w-[104px]" value={lat} onChange={e => setLat(e.target.value)} aria-label="Latitude" />
      <input className="fwmap-input w-[104px]" value={lon} onChange={e => setLon(e.target.value)} aria-label="Longitude" />

      <select
        className="fwmap-input max-w-[220px] cursor-pointer"
        value={image}
        onChange={e => setImage(e.target.value)}
        aria-label="Image source"
      >
        <option value="">Nearest live camera</option>
        {images.map(src => (
          <option key={src} value={src}>{src.split('/').pop()}</option>
        ))}
      </select>

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
