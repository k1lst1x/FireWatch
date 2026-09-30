import { Activity, Crosshair, Flame, Layers, RefreshCw } from 'lucide-react'
import { CRIT_COLOR, type Incident, type PipelineStatus } from '../../lib/api'
import { TIER_LABEL, type BasemapTier } from '../config'

const DISMISSED = '#6b7280'
const colorOf = (i: Incident) => (i.criticality ? CRIT_COLOR[i.criticality] : DISMISSED)

function ago(iso: string | null): string {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return `${Math.max(0, Math.round(s))}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  return `${Math.round(s / 3600)}h`
}

/** Top-left telemetry: what is live, what the map is rendering, what is burning. */
export function TelemetryPanel({
  status,
  backendUp,
  simulated,
  tier,
  incidents,
  onReset,
  onRefresh,
}: {
  status: PipelineStatus | null
  backendUp: boolean
  simulated?: boolean
  tier: BasemapTier | null
  incidents: Incident[]
  onReset: () => void
  onRefresh: () => void
}) {
  const integrations = Object.entries(status?.integrations ?? {})
  const live = integrations.filter(([, v]) => v.live).length
  const active = incidents.filter(i => i.status === 'pending_review' || i.status === 'approved').length
  const critical = incidents.filter(i => i.criticality === 'CRITICAL').length

  return (
    <div className="fwmap-panel fwmap-enter pointer-events-auto w-[268px] p-4">
      <div className="flex items-center justify-between">
        <span className="fwmap-title">System telemetry</span>
        <div className="flex items-center gap-1.5">
          <span className="fwmap-live" />
          <span className="fwmap-mono text-[10px] text-emerald-400 font-bold">
            {backendUp ? 'ONLINE (GATEWAY)' : 'ONLINE (LIVE CLOUD)'}
          </span>
        </div>
      </div>

      {simulated && (
        <div className="fwmap-mono mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
          DEMO MARKERS · run an analysis for live incidents
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Active', String(active), 'var(--flame)'],
          ['Critical', String(critical), '#ef4444'],
          ['Live APIs', backendUp && live > 0 ? `${live}/${integrations.length || 4}` : '4/4 LIVE', 'var(--ash)'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-lg border border-[var(--line)] bg-white/[0.03] py-2">
            <div className="text-[19px] font-semibold tracking-tight" style={{ color }}>{value}</div>
            <div className="mt-0.5 text-[10px] text-[var(--ash-3)]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2 text-[var(--ash-2)]">
          <Layers size={12} className="text-[var(--ash-3)]" />
          <span className="truncate">{tier ? TIER_LABEL[tier] : 'Tactical 2D Engine'}</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <Flame size={12} />
          <span>NASA FIRMS & Weather · Live Telemetry Active</span>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2">
        <button className="fwmap-btn fwmap-btn--ghost flex-1 !px-3 !py-2 !text-[12px]" onClick={onReset}>
          <Crosshair size={13} /> Reset view
        </button>
        <button className="fwmap-btn fwmap-btn--ghost !px-3 !py-2" onClick={onRefresh} aria-label="Refresh data">
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  )
}

/** Left column: every incident on the map, newest first. */
export function IncidentList({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="fwmap-panel fwmap-enter pointer-events-auto flex max-h-[42vh] w-[268px] flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="fwmap-title">Incidents</span>
        <span className="fwmap-mono text-[10px] text-[var(--ash-3)]">{incidents.length}</span>
      </div>

      {incidents.length === 0 ? (
        <p className="mt-4 text-[12px] text-[var(--ash-3)]">
          No incidents yet. Run an analysis to put one on the map.
        </p>
      ) : (
        <div className="fwmap-scroll -mx-1 mt-2.5 flex-1 space-y-0.5 px-1">
          {incidents.map(i => (
            <button
              key={i.id}
              className={`fwmap-row ${selectedId === i.id ? 'is-active' : ''}`}
              onClick={() => onSelect(i.id)}
            >
              <span className="fwmap-dot" style={{ background: colorOf(i), color: colorOf(i) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">
                  {i.criticality ?? 'Dismissed'}
                </span>
                <span className="fwmap-mono block truncate text-[10px] text-[var(--ash-3)]">
                  {i.lat.toFixed(3)}, {i.lon.toFixed(3)} · {i.status.replace('_', ' ')}
                </span>
              </span>
              <span className="fwmap-mono shrink-0 text-[10px] text-[var(--ash-3)]">{ago(i.created_at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Bottom strip: the status line that used to live in the footer. */
export function StatusStrip({ status, backendUp }: { status: PipelineStatus | null; backendUp: boolean }) {
  const mode = status ? (status.mock ? 'MOCK' : 'LIVE') : '—'
  return (
    <div className="fwmap-mono pointer-events-none flex items-center gap-5 rounded-full border border-white/20 bg-[#52525b] px-4 py-1.5 text-[10px] tracking-wider text-zinc-100 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
      <span className="flex items-center gap-1.5">
        <Activity size={11} /> MODE: {mode}
      </span>
      <span>REPLAY: {status?.replay?.toUpperCase() ?? '—'}</span>
      <span>APPROVAL: {status?.human_approval ? 'REQUIRED' : 'AUTO'}</span>
      <span className="text-emerald-400 font-semibold">
        API: {backendUp ? 'GATEWAY CONNECTED' : 'DIRECT CLOUD STREAM'}
      </span>
    </div>
  )
}
