import { CheckCircle2, CloudCog, Database, Play, RefreshCw, ShieldCheck, X } from 'lucide-react'
import type { FederationStatus } from '../../lib/api'

const pct = (value?: number | null) => value == null ? '—' : `${Math.round(value * 100)}%`

const regionTone: Record<string, string> = {
  north_bay: 'text-amber-200 border-amber-300/20 bg-amber-300/10',
  sierra: 'text-orange-200 border-orange-300/20 bg-orange-300/10',
  socal: 'text-rose-200 border-rose-300/20 bg-rose-300/10',
}

export default function FederationPanel({
  status,
  loading,
  running,
  error,
  onClose,
  onRefresh,
  onRunRound,
}: {
  status: FederationStatus | null
  loading: boolean
  running: boolean
  error: string | null
  onClose: () => void
  onRefresh: () => void
  onRunRound: () => void
}) {
  const history = status?.history ?? []

  return (
    <aside className="fwmap-panel fwmap-enter pointer-events-auto absolute left-5 top-[76px] z-30 flex max-h-[calc(100vh-100px)] w-[min(430px,calc(100vw-2.5rem))] flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <div className="fwmap-title text-[#ffb347]">Live Flower federation</div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-white">Federation views</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Real regional learning status from the backend.</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={onRefresh} disabled={loading || running} title="Refresh federation status" aria-label="Refresh federation status">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} title="Close federation views" aria-label="Close federation views"><X size={16} /></button>
        </div>
      </header>

      <div className="fwmap-scroll min-h-0 flex-1 p-3">
        {error && <div className="mb-3 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-[12px] text-red-200">Federation backend unavailable: {error}</div>}
        {loading && !status ? (
          <div className="py-12 text-center text-sm text-zinc-500">Loading federation status…</div>
        ) : status && (
          <>
            <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div><div className="fwmap-title">Global training</div><div className="mt-1 text-lg font-semibold text-white">Round {status.round}</div></div>
              <button className="fwmap-btn fwmap-btn--ember !px-3 !py-2 text-[11px]" onClick={onRunRound} disabled={running || status.running}>
                {running || status.running ? <span className="fwmap-spinner" /> : <Play size={13} fill="currentColor" />}
                {running || status.running ? 'Training…' : 'Run round'}
              </button>
            </div>

            <div className="space-y-2">
              {status.stations.map(station => (
                <article key={station.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="fwmap-dot bg-emerald-400 text-emerald-400" /><span className="text-[13px] font-semibold text-zinc-100">{station.name}</span></div>
                    <span className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase ${regionTone[station.id]}`}>{station.online ? 'online' : 'offline'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div><div className="font-mono text-[15px] text-white">{station.labels}</div><div className="text-[9px] text-zinc-500">labels</div></div>
                    <div><div className="font-mono text-[15px] text-[#ffb347]">{pct(station.fp_rate)}</div><div className="text-[9px] text-zinc-500">false alarms</div></div>
                    <div><div className="font-mono text-[15px] text-zinc-200">{pct(station.miss_rate)}</div><div className="text-[9px] text-zinc-500">missed fires</div></div>
                  </div>
                  <div className="mt-2 border-t border-white/5 pt-2 font-mono text-[9.5px] text-zinc-500">Feedback learned: <span className="text-zinc-300">{station.approvals} approvals · {station.rejections} rejections</span></div>
                </article>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="fwmap-title mb-2">False-alarm history</div>
              {history.length ? <div className="flex flex-wrap gap-1.5">{history.slice(-8).map(round => <span key={round.round} className="rounded bg-white/5 px-2 py-1 font-mono text-[9.5px] text-zinc-300">R{round.round} <b className="text-[#ffb347]">{pct(round.fp_rate)}</b></span>)}</div> : <div className="text-[11px] text-zinc-500">No completed rounds yet.</div>}
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-zinc-400">
              <div className="flex gap-2"><CloudCog size={14} className="shrink-0 text-[#ffb347]" /><span><b className="text-zinc-200">Real regional metrics:</b> accuracy is read from North Bay, Sierra, and SoCal evaluations.</span></div>
              <div className="flex gap-2"><Database size={14} className="shrink-0 text-[#ffb347]" /><span><b className="text-zinc-200">Local feedback:</b> approvals and rejections train only their assigned region.</span></div>
              <div className="flex gap-2"><ShieldCheck size={14} className="shrink-0 text-[#ffb347]" /><span><b className="text-zinc-200">Privacy boundary:</b> Flower averages model settings; camera imagery stays local.</span></div>
            </div>
          </>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 font-mono text-[9.5px] text-zinc-500"><CheckCircle2 size={11} className="text-emerald-400" /> GET status · POST round · persisted Flower history</footer>
    </aside>
  )
}
