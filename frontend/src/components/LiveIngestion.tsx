import { Video, ImageOff } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useBayhawk } from '../context/BayhawkContext'
import { imageSrc } from '../lib/api'

export default function LiveIngestion() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const { lastResult, lastInput, running } = useBayhawk()
  const src = imageSrc(lastResult?.camera?.image_url ?? lastInput?.image_url)
  const cam = lastResult?.camera
  const detector = cam?.telemetry?.detector ? String(cam.telemetry.detector) : null

  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col h-full ${dark ? 'bg-[#111] border-[#1e1e1e]' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${dark ? 'border-[#1e1e1e]' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Video className={`h-3.5 w-3.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
            Camera Agent
          </span>
        </div>
        <span className={`text-[10px] font-mono ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {cam?.latency_ms != null ? `${cam.latency_ms.toFixed(0)} ms` : '—'}
        </span>
      </div>

      <div className="relative flex-1 min-h-[240px] bg-black flex items-center justify-center">
        {src ? (
          <img src={src} alt="Analyzed camera frame" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="text-center text-gray-500">
            <ImageOff className="h-6 w-6 mx-auto mb-2" />
            <p className="text-[10px] font-mono">NO FRAME ANALYZED YET</p>
          </div>
        )}

        {lastInput && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur rounded-md px-2.5 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-medium text-white uppercase tracking-wider">
              {lastInput.lat.toFixed(3)}, {lastInput.lon.toFixed(3)}
            </span>
          </div>
        )}

        {cam && !running && (
          <div
            className={`absolute bottom-3 left-3 rounded-md px-2.5 py-1 text-[11px] font-mono font-semibold ${
              cam.detected ? 'bg-orange-500/90 text-white' : 'bg-emerald-600/90 text-white'
            }`}
          >
            {cam.detected ? 'FIRE/SMOKE' : 'CLEAR'} · {(cam.confidence * 100).toFixed(0)}%{detector ? ` · ${detector}` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
