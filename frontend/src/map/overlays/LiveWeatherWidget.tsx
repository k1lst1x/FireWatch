import { useEffect, useState } from 'react'
import {
  CloudSun,
  Compass,
  Droplets,
  Flame,
  Radio,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Wind,
  Zap,
} from 'lucide-react'
import type { RealtimeNasaHotspot, RealtimeWeather } from '../../services/liveFeedService'

interface Props {
  weather: RealtimeWeather | null
  nasaHotspots: RealtimeNasaHotspot[]
  loading: boolean
  onRefresh: () => void
  currentLocationName?: string
}

export default function LiveWeatherWidget({
  weather,
  nasaHotspots,
  loading,
  onRefresh,
  currentLocationName = 'San Francisco, CA',
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [minimized, setMinimized] = useState(false)

  // Live timer counting seconds since last sync
  useEffect(() => {
    setSecondsAgo(0)
    const interval = setInterval(() => {
      setSecondsAgo(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [weather?.lastSync])

  if (!weather) {
    return (
      <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/75 p-3 backdrop-blur-md text-white text-xs flex items-center gap-2">
        <RefreshCw size={14} className="animate-spin text-[#ff5a00]" />
        <span>Connecting to NASA Satellite & Weather API…</span>
      </div>
    )
  }

  const riskColor =
    weather.spreadRiskLevel === 'EXTREME'
      ? '#ef4444'
      : weather.spreadRiskLevel === 'HIGH'
      ? '#f97316'
      : weather.spreadRiskLevel === 'MODERATE'
      ? '#f59e0b'
      : '#10b981'

  return (
    <aside
      aria-label="Real-time NASA & Weather Telemetry HUD"
      className="pointer-events-auto w-[310px] rounded-2xl border border-white/15 bg-black/95 p-3.5 shadow-2xl text-white"
    >
      {/* Top Header with Live Pulse */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/40" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
          <div>
            <div className="text-[12px] font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>REAL-TIME TELEMETRY</span>
              <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-mono text-zinc-300">
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[160px]">
              {currentLocationName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            title="Force refresh NASA & Weather telemetry now"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#ff5a00]' : ''} />
          </button>
          <button
            onClick={() => setMinimized(m => !m)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-zinc-400 hover:text-white"
          >
            {minimized ? 'EXPAND' : 'HIDE'}
          </button>
        </div>
      </div>

      {minimized ? (
        /* Minimized Glance Bar */
        <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#ff7b00]">{weather.temperatureF}°F / {weather.temperatureC}°C</span>
          <span className="text-zinc-300">{weather.windSpeedMph} mph {weather.windDirectionCardinal}</span>
          <span style={{ color: riskColor }}>RISK: {weather.spreadRiskLevel}</span>
        </div>
      ) : (
        /* Full Telemetry HUD */
        <div className="mt-3 space-y-3">
          {/* Weather Primary Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Temperature & Condition */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-2.5">
              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                <span className="flex items-center gap-1">
                  <CloudSun size={12} className="text-[#ffaa00]" />
                  TEMPERATURE
                </span>
                <span className="font-mono text-[9px] text-zinc-500">REAL-TIME</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold tracking-tight text-white">
                  {weather.temperatureF}°
                  <span className="text-[12px] font-normal text-zinc-400">F</span>
                </span>
                <span className="text-[12px] text-zinc-400 font-mono">
                  ({weather.temperatureC}°C)
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-300 font-medium truncate">
                {weather.weatherCondition}
              </div>
            </div>

            {/* Fire Spread Risk Index */}
            <div
              className="rounded-xl border p-2.5"
              style={{
                borderColor: `${riskColor}40`,
                background: `linear-gradient(135deg, ${riskColor}15 0%, transparent 100%)`,
              }}
            >
              <div className="flex items-center justify-between text-[10px]" style={{ color: riskColor }}>
                <span className="flex items-center gap-1 font-semibold">
                  <Flame size={12} />
                  SPREAD RISK
                </span>
                <span className="font-mono text-[9px]">WIND+RH</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold tracking-tight" style={{ color: riskColor }}>
                  {Math.round(weather.spreadRisk * 100)}%
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${riskColor}30`, color: riskColor }}
                >
                  {weather.spreadRiskLevel}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">
                Atmospheric dryness index
              </div>
            </div>
          </div>

          {/* Wind & Humidity Dynamics */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1">
                <Wind size={12} className="text-sky-400" />
                SURFACE WIND DYNAMICS
              </span>
              <span>{weather.surfacePressureHpa} hPa</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
              {/* Wind Speed & Compass Arrow */}
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400"
                  style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
                  title={`Wind blowing towards ${weather.windDirectionDeg}°`}
                >
                  <Compass size={16} />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white leading-tight">
                    {weather.windSpeedMph}{' '}
                    <span className="text-[10px] font-normal text-zinc-400">mph</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {weather.windDirectionCardinal} ({weather.windDirectionDeg}°)
                  </div>
                </div>
              </div>

              {/* Relative Humidity */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400">
                  <Droplets size={16} />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white leading-tight">
                    {weather.humidity}%
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {weather.humidity < 25 ? 'Critical dry' : weather.humidity < 40 ? 'Moderate dry' : 'Humid air'}
                  </div>
                </div>
              </div>
            </div>

            {weather.windGustsMph > weather.windSpeedMph && (
              <div className="mt-2 flex items-center justify-between rounded bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
                <span>Peak Gusts:</span>
                <span className="font-mono text-sky-300 font-semibold">{weather.windGustsMph} mph ({weather.windGustsMs} m/s)</span>
              </div>
            )}
          </div>

          {/* NASA Satellite Sensor Status */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1 text-[#ff7b00]">
                <Satellite size={12} />
                NASA FIRMS & EONET SATELLITE
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Zap size={10} />
                ACTIVE
              </span>
            </div>

            <div className="mt-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Satellite Sensor:</span>
                <span className="font-mono text-zinc-200">VIIRS (375m) + MODIS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">NASA Active Events:</span>
                <span className="font-mono text-[#ff8800] font-bold">
                  {nasaHotspots.length} Detected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Thermal Band:</span>
                <span className="font-mono text-zinc-300">I4 (3.9µm) Radiometry</span>
              </div>
            </div>
          </div>

          {/* NWS Active Advisory Banner (if applicable) */}
          {weather.alertHeadline && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-[10px] text-amber-200 flex items-start gap-2">
              <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wider text-amber-300">
                  National Weather Service Advisory
                </div>
                <div className="mt-0.5 text-zinc-300 leading-tight">
                  {weather.alertHeadline}
                </div>
              </div>
            </div>
          )}

          {/* Footer Heartbeat */}
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[9px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <Radio size={10} className="text-emerald-400" />
              Open-Meteo · NWS · NASA EONET
            </span>
            <span>
              SYNC: {secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
