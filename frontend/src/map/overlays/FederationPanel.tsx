import { useEffect, useState } from 'react'
import { Lock, Network, Play, RefreshCw, X } from 'lucide-react'
import { api, type FederationStatus } from '../../lib/api'

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)

export default function FederationPanel({ onClose }: { onClose: () => void }) {
  const [st, setSt] = useState<FederationStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => api.federationStatus().then(setSt).catch(e => setError((e as Error).message))

  useEffect(() => { void load() }, [])

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      setSt(await api.federationRound(1))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const h = st?.history ?? []
  const first = h[0]
  const last = h[h.length - 1]
  const max = Math.max(0.05, ...h.map(r => r.fp_rate))

  return (
    <aside className="fwmap-panel fwmap-enter pointer-events-auto absolute right-5 top-[76px] z-30 flex max-h-[calc(100vh-100px)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <div className="fwmap-title text-[#ffb347]">Flower federated learning</div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-white">Stations learn from dispatchers</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Every Dispatch / False alarm becomes a label. Flower FedAvg shares only tuned thresholds.</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={() => void load()} title="Refresh" aria-label="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} title="Close" aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="fwmap-scroll min-h-0 flex-1 space-y-3 p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Round', String(st?.round ?? 0), '#fff'],
            ['False alarms', first && last ? `${pct(first.fp_rate)}→${pct(last.fp_rate)}` : '—', '#ffb347'],
            ['Missed fires', first && last ? `${pct(first.miss_rate)}→${pct(last.miss_rate)}` : '—', '#34d399'],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
              <div className="font-mono text-[14px] font-semibold" style={{ color }}>{value}</div>
              <div className="mt-0.5 text-[10px] text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        {h.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">False-alarm rate by round</div>
            <div className="flex h-24 items-end gap-1.5">
              {h.map(r => (
                <div key={r.round} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[9px] text-zinc-400">{pct(r.fp_rate)}</span>
                  <div className="w-full rounded-t bg-gradient-to-t from-[#ff5a00] to-[#ffb347]" style={{ height: `${(r.fp_rate / max) * 64}px` }} />
                  <span className="font-mono text-[9px] text-zinc-500">R{r.round}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {st?.stations.map(s => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
                  <span className={`h-1.5 w-1.5 rounded-full ${s.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  {s.name}
                </span>
                <span className="font-mono text-[10px] text-zinc-400">{s.labels} labels · FP {pct(s.fp_rate)}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[9.5px] text-zinc-400">
                <span>cam w {s.params.camera_weight.toFixed(2)}</span>
                <span>fuse {s.params.fusion_threshold.toFixed(2)}</span>
                <span>thermal {s.params.thermal_only_threshold.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-[12px] text-red-200">{error}</div>}

        <button className="fwmap-btn w-full justify-center !py-2.5" onClick={() => void run()} disabled={running}>
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? 'Flower round running…' : 'Run federated round'}
        </button>
      </div>
      <footer className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 font-mono text-[9.5px] text-zinc-500">
        <Lock size={11} className="text-[#ffb347]" /> Camera images never leave a station. <Network size={11} className="ml-auto text-[#ffb347]" /> Flower 1.x
      </footer>
    </aside>
  )
}
