import { RefreshCw, Check, X, Plug } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useBayhawk } from '../context/BayhawkContext'
import { CRIT_COLOR } from '../lib/api'

const LABELS: Record<string, string> = {
  llm: 'LLM agents',
  camera_detector: 'Fire detector',
  cameras: 'Live cameras',
  satellite_firms: 'NASA FIRMS',
  weather: 'Weather',
  webhook: 'Dispatch webhook',
}

function ago(iso: string | null) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function Sidebar() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { status, incidents, review, refresh, select, backendUp } = useBayhawk()
  const alerts = incidents.filter(i => i.status !== 'dismissed')
  const label = `text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`

  return (
    <aside className={`w-[240px] shrink-0 flex flex-col border-r overflow-y-auto ${dark ? 'bg-[#0a0a0a] border-[#1e1e1e]' : 'bg-gray-50 border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={label}>Integrations</span>
          <Plug className={`h-3 w-3 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
        </div>
        {!backendUp && <p className="text-[10px] text-red-400 mb-2">Backend unreachable on :8000</p>}
        <div className="flex flex-col gap-1">
          {status &&
            Object.entries(status.integrations).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-1 py-1">
                <span className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{LABELS[k] ?? k}</span>
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${v.live ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {v.live ? 'live' : 'fallback'}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className={`p-4 border-t flex-1 ${dark ? 'border-[#1e1e1e]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={label}>Recent Alerts</span>
          <button onClick={refresh} className="cursor-pointer">
            <RefreshCw className={`h-3 w-3 ${dark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'}`} />
          </button>
        </div>

        {alerts.length === 0 && (
          <p className={`text-[10px] font-medium uppercase tracking-wider text-center py-6 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            No Active Threats
          </p>
        )}

        <div className="flex flex-col gap-2">
          {alerts.map(i => (
            <div
              key={i.id}
              onClick={() => select(i)}
              className={`rounded-lg border p-2.5 cursor-pointer ${dark ? 'border-[#1e1e1e] hover:bg-[#141414]' : 'border-gray-200 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold" style={{ color: i.criticality ? CRIT_COLOR[i.criticality] : undefined }}>
                  {i.criticality ?? '—'}
                </span>
                <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{ago(i.created_at)}</span>
              </div>
              <p className={`text-[10px] font-mono ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                {i.lat.toFixed(3)}, {i.lon.toFixed(3)} · score {i.combined_score.toFixed(2)}
              </p>
              {i.status === 'pending_review' ? (
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      review(i.id, 'approve')
                    }}
                    className="flex-1 flex items-center justify-center gap-1 rounded-md bg-orange-500/90 hover:bg-orange-500 text-white text-[10px] font-semibold py-1 cursor-pointer"
                  >
                    <Check className="h-3 w-3" /> Dispatch
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      review(i.id, 'reject')
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-md text-[10px] font-semibold py-1 cursor-pointer ${
                      dark ? 'bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <X className="h-3 w-3" /> False alarm
                  </button>
                </div>
              ) : (
                <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${i.status === 'approved' ? 'text-orange-400' : 'text-gray-500'}`}>
                  {i.status === 'approved' ? 'Dispatched' : 'Rejected'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
