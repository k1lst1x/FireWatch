import {
  Bot, Brain, Camera, CheckCircle2, CircleDashed, ClipboardList, CloudSun,
  GitMerge, MessagesSquare, RefreshCw, Satellite, Send, Siren, UserCheck, X,
  type LucideIcon,
} from 'lucide-react'
import type { AgentTraceEntry, AgentTraceResponse } from '../../lib/api'

const icons: Record<string, LucideIcon> = {
  orchestrator: Bot,
  camera: Camera,
  satellite: Satellite,
  weather: CloudSun,
  fusion: GitMerge,
  reasoning: Brain,
  classification: Siren,
  deliberation: MessagesSquare,
  suggestion: ClipboardList,
  output: UserCheck,
}

function AgentRow({ agent }: { agent: AgentTraceEntry }) {
  const Icon = icons[agent.id] ?? Bot
  const complete = agent.state === 'completed'

  return (
    <article className={`rounded-xl border p-3 ${complete ? 'border-white/10 bg-white/[0.035]' : 'border-white/5 bg-white/[0.015]'}`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 rounded-lg p-2 ${complete ? 'bg-orange-400/10 text-[#ffb347]' : 'bg-white/5 text-zinc-500'}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-semibold text-zinc-100">{agent.name}</h3>
              <p className="mt-0.5 text-[10.5px] leading-snug text-zinc-500">{agent.responsibility}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${complete ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-zinc-500'}`}>
              {complete ? <CheckCircle2 size={10} /> : <CircleDashed size={10} />}
              {complete ? 'Complete' : 'Idle'}
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-300">{agent.summary}</p>
          {(agent.mode || agent.latency_ms != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9.5px] text-zinc-500">
              {agent.mode && <span>{agent.mode}</span>}
              {agent.latency_ms != null && <span>{Math.round(agent.latency_ms)} ms</span>}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AgentTracePanel({
  trace,
  loading,
  error,
  onClose,
  onRefresh,
}: {
  trace: AgentTraceResponse | null
  loading: boolean
  error: string | null
  onClose: () => void
  onRefresh: () => void
}) {
  return (
    <aside className="fwmap-panel fwmap-enter pointer-events-auto absolute right-5 top-[76px] z-30 flex max-h-[calc(100vh-100px)] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <div className="fwmap-title text-[#ffb347]">Backend observability</div>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-white">Agent trace</h2>
          <p className="mt-1 text-[11px] text-zinc-500">Safe summaries from the latest backend pipeline run.</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={onRefresh} disabled={loading} title="Refresh agent trace" aria-label="Refresh agent trace">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white" onClick={onClose} title="Close logs" aria-label="Close logs">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="fwmap-scroll min-h-0 flex-1 p-3">
        {trace && (
          <div className="mb-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[9.5px] text-zinc-400">
            {trace.event_id ? <>Latest event: <span className="text-zinc-200">{trace.event_id}</span></> : 'No analysis has run yet — all agents are ready.'}
          </div>
        )}
        {error ? (
          <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-[12px] text-red-200">Could not load agent trace: {error}</div>
        ) : loading && !trace ? (
          <div className="py-12 text-center text-sm text-zinc-500">Loading backend trace…</div>
        ) : (
          <div className="space-y-2">{trace?.agents.map(agent => <AgentRow key={agent.id} agent={agent} />)}</div>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 font-mono text-[9.5px] text-zinc-500">
        <Send size={11} className="text-[#ffb347]" /> Raw prompts, credentials, and provider request data are excluded.
      </footer>
    </aside>
  )
}
