import { useTheme } from '../context/ThemeContext'
import { useBayhawk } from '../context/BayhawkContext'

export default function StatusBar() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { status } = useBayhawk()
  const llm = status?.integrations.llm
  const mode = status ? (status.mock ? 'MOCK' : status.replay === 'replay' ? 'REPLAY' : 'LIVE') : '—'

  return (
    <footer className={`flex items-center justify-between px-5 h-7 shrink-0 border-t text-[10px] ${dark ? 'bg-[#0a0a0a] border-[#1e1e1e] text-gray-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${llm?.live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-medium uppercase tracking-wider">
            LLM: {llm?.live ? String(llm.model) : 'rule-based fallback'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium uppercase tracking-wider">Database: SQLite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${mode === 'LIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-medium uppercase tracking-wider">Mode: {mode}</span>
        </div>
      </div>
      <span className="font-mono">&copy; 2026 BayHawk | Wildfire Watch</span>
    </footer>
  )
}
