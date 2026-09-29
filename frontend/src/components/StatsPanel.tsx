import { Plug, AlertTriangle, Zap, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useBayhawk } from '../context/BayhawkContext'

export default function StatsPanel() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { status, incidents, lastLatencyMs } = useBayhawk()
  const integ = status ? Object.values(status.integrations) : []
  const pending = incidents.filter(i => i.status === 'pending_review').length

  const stats = [
    { icon: <Plug className="h-4 w-4" />, label: 'Live Integrations', value: status ? `${integ.filter(i => i.live).length}/${integ.length}` : '—', color: 'text-blue-400' },
    { icon: <AlertTriangle className="h-4 w-4" />, label: 'Awaiting Review', value: String(pending), color: 'text-amber-400' },
    { icon: <Zap className="h-4 w-4" />, label: 'Last Run', value: lastLatencyMs != null ? `${(lastLatencyMs / 1000).toFixed(1)}s` : '—', color: 'text-emerald-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${dark ? 'bg-[#111] border-[#1e1e1e]' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={stat.color}>{stat.icon}</div>
            <div>
              <p className={`text-[10px] uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</p>
              <p className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
        </div>
      ))}
    </div>
  )
}
