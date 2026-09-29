import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CircleAlert, KeyRound, RefreshCw, Server, ShieldCheck } from 'lucide-react'
import { api, type Integration, type KeyStatus, type PipelineStatus } from '../lib/api'

const integrationLabel: Record<string, string> = {
  llm: 'AI reasoning',
  camera_detector: 'Camera detector',
  cameras: 'Live cameras',
  satellite_firms: 'Satellite hotspots',
  weather: 'Weather',
  webhook: 'Dispatch webhook',
}

function StateIcon({ ok }: { ok: boolean }) {
  return ok ? <CheckCircle2 size={18} className="text-emerald-400" /> : <CircleAlert size={18} className="text-amber-400" />
}

function KeyCard({ entry }: { entry: KeyStatus }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-white/5 p-2"><KeyRound size={16} className="text-[#ffb347]" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-white">{entry.label}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${entry.configured ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${entry.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {entry.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">{entry.used_for}</p>
          <div className="mt-2 font-mono text-[10px] text-zinc-600">{entry.environment}</div>
        </div>
      </div>
    </div>
  )
}

function IntegrationRow({ name, integration }: { name: string; integration: Integration }) {
  const detail = [integration.provider, integration.source, integration.detector].find((value): value is string => typeof value === 'string')
  return (
    <div className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0">
      <StateIcon ok={integration.live} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-zinc-100">{integrationLabel[name] ?? name}</div>
        {detail && <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">{detail}</div>}
      </div>
      <span className={`text-[11px] ${integration.live ? 'text-emerald-300' : 'text-zinc-500'}`}>{integration.live ? 'Ready' : 'Fallback'}</span>
    </div>
  )
}

export default function Settings() {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStatus(await api.status())
    } catch (err) {
      setStatus(null)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const browserKeys = useMemo(() => [
    { label: 'Google 3D Tiles', environment: 'VITE_GOOGLE_3D_TILES_KEY', configured: Boolean(import.meta.env.VITE_GOOGLE_3D_TILES_KEY), used_for: 'Photorealistic 3D map tiles in the browser' },
    { label: 'Cesium Ion', environment: 'VITE_CESIUM_ION_TOKEN', configured: Boolean(import.meta.env.VITE_CESIUM_ION_TOKEN), used_for: 'Terrain and Cesium OSM Buildings in the browser' },
  ], [])
  const needsSignIn = error?.startsWith('401:') ?? false

  return (
    <main className="min-h-screen bg-[#05060a] px-5 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-start gap-4">
            <Link to="/dashboard" className="mt-1 rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white" aria-label="Back to dispatch console"><ArrowLeft size={18} /></Link>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#ffb347]">FIREWATCH · SYSTEM SETTINGS</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Integration & key status</h1>
              <p className="mt-1 text-sm text-zinc-400">Credential values are never displayed or sent to the browser.</p>
            </div>
          </div>
          <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>

        {error ? (
          <div className={`mt-6 rounded-xl border p-4 text-sm ${needsSignIn ? 'border-amber-400/25 bg-amber-400/10 text-amber-100' : 'border-red-400/25 bg-red-400/10 text-red-200'}`}>
            {needsSignIn ? (
              <span>Settings are protected. <Link to="/login" className="font-semibold underline underline-offset-2">Sign in</Link> to view key and integration status.</span>
            ) : (
              <span>Could not reach the local API: {error}. Start the API and try again.</span>
            )}
          </div>
        ) : (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><Server size={17} className="text-[#ffb347]" /><div className="mt-4 text-lg font-semibold">{status ? 'Connected' : 'Checking…'}</div><div className="mt-1 text-xs text-zinc-500">Local API</div></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><ShieldCheck size={17} className="text-[#ffb347]" /><div className="mt-4 text-lg font-semibold">{status?.human_approval ? 'Required' : 'Automatic'}</div><div className="mt-1 text-xs text-zinc-500">Dispatch approval</div></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><KeyRound size={17} className="text-[#ffb347]" /><div className="mt-4 text-lg font-semibold">{status ? Object.values(status.key_status).filter(key => key.configured).length : '—'}</div><div className="mt-1 text-xs text-zinc-500">Server credentials configured</div></div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold text-white">Server credentials</h2>
              <p className="mt-1 text-xs text-zinc-500">Green means a value is present; it never exposes the value itself.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {status ? Object.values(status.key_status).map(entry => <KeyCard key={entry.label} entry={entry} />) : Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[92px] animate-pulse rounded-xl border border-white/5 bg-white/[0.025]" />)}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Browser map configuration</h2>
                <p className="mt-1 text-xs text-zinc-500">Public browser tokens unlock optional map layers.</p>
                <div className="mt-4 space-y-3">{browserKeys.map(entry => <KeyCard key={entry.label} entry={entry} />)}</div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Integration health</h2>
                <p className="mt-1 text-xs text-zinc-500">Current operating mode and configured fallbacks.</p>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] px-4">
                  {status ? Object.entries(status.integrations).map(([name, integration]) => <IntegrationRow key={name} name={name} integration={integration} />) : <div className="py-8 text-center text-sm text-zinc-500">Checking integrations…</div>}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
