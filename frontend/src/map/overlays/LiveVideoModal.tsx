import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Maximize,
  Minimize,
  Sliders,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { calculateDistanceKm, type LiveCameraFeed } from '../cameraDirectory'
import { fetchLiveWeather, type RealtimeWeather } from '../../services/liveFeedService'

interface Props {
  camera: LiveCameraFeed | null
  onClose: () => void
  onFlyTo?: (camera: LiveCameraFeed) => void
  allCameras?: LiveCameraFeed[]
  onSelectCamera?: (camera: LiveCameraFeed) => void
}

type VisionFilter = 'normal' | 'thermal' | 'night' | 'contrast'

export default function LiveVideoModal({
  camera,
  onClose,
  onFlyTo,
  allCameras = [],
  onSelectCamera,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [timecode, setTimecode] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }))
  const [filter, setFilter] = useState<VisionFilter>('normal')
  const [zoom, setZoom] = useState<number>(1)

  // Real-time CCTV frame poller state
  const [frameTimestamp, setFrameTimestamp] = useState<number>(Date.now())
  const [frameCount, setFrameCount] = useState<number>(1)
  const [latencyMs, setLatencyMs] = useState<number>(36)
  const [isPulling, setIsPulling] = useState<boolean>(false)
  const [cctvError, setCctvError] = useState<boolean>(false)

  // Real-time camera local weather
  const [weather, setWeather] = useState<RealtimeWeather | null>(null)

  const baseCctvUrl = camera?.live_cctv_url || camera?.image_url || ''

  // Initialize camera and local weather
  useEffect(() => {
    if (camera) {
      setFrameCount(1)
      setCctvError(false)
      // Fetch live weather at this camera location
      fetchLiveWeather(camera.lat, camera.lon)
        .then(setWeather)
        .catch(() => {})
    }
  }, [camera])

  // Live ticking surveillance timecode
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimecode(new Date().toLocaleTimeString('en-US', { hour12: false }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Continuous Real-Time CCTV Poller: Pulls fresh live frame every 2.0s directly from DOT
  useEffect(() => {
    if (!baseCctvUrl) return

    const pollInterval = window.setInterval(() => {
      const t0 = performance.now()
      setIsPulling(true)

      const base = baseCctvUrl.split('?')[0]
      const img = new Image()
      img.src = `${base}?_t=${Date.now()}`
      img.onload = () => {
        setLatencyMs(Math.round(performance.now() - t0))
        setFrameTimestamp(Date.now())
        setFrameCount(c => c + 1)
        setIsPulling(false)
        setCctvError(false)
      }
      img.onerror = () => {
        setIsPulling(false)
        setCctvError(true)
      }
    }, 2000)

    return () => window.clearInterval(pollInterval)
  }, [baseCctvUrl])

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!camera) return null

  const safeCameras = allCameras && allCameras.length > 0 ? allCameras : [camera]
  const rawIndex = safeCameras.findIndex(c => c.id === camera.id)
  const currentIndex = rawIndex >= 0 ? rawIndex : 0
  const prevCamera = safeCameras[(currentIndex - 1 + safeCameras.length) % safeCameras.length]
  const nextCamera = safeCameras[(currentIndex + 1) % safeCameras.length]

  const distKm = camera.distance_km != null
    ? camera.distance_km
    : (camera.lat != null && camera.lon != null ? calculateDistanceKm(37.7749, -122.4194, camera.lat, camera.lon) : 0)
  const distFormatted = `${distKm.toFixed(1)} km`
  const latFormatted = camera.lat != null ? camera.lat.toFixed(4) : '37.7749'
  const lonFormatted = camera.lon != null ? camera.lon.toFixed(4) : '-122.4194'

  // Filter CSS styles
  const filterStyles: Record<VisionFilter, string> = {
    normal: '',
    thermal: 'invert(1) hue-rotate(180deg) saturate(2.4) contrast(1.4)',
    night: 'hue-rotate(90deg) saturate(1.8) brightness(1.2) contrast(1.3) sepia(0.6)',
    contrast: 'grayscale(1) contrast(1.8) brightness(1.1)',
  }

  const cctvUrl = camera.live_cctv_url
    ? `${camera.live_cctv_url}?_t=${frameTimestamp}`
    : (camera.image_url || '')

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-all ${
          fullscreen ? 'h-[96vh] w-[96vw]' : 'w-full max-w-[880px]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/95 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]">
              <Camera size={16} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[14px] font-bold text-white tracking-wide">
                  {camera.name}
                </h3>
                {camera.highwayRoute && (
                  <span className="shrink-0 rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                    {camera.highwayRoute}
                  </span>
                )}
              </div>
              <div className="fwmap-mono flex items-center gap-2 text-[10px] text-zinc-400">
                <span>{camera.network || 'Caltrans District 4 Real-Time Traffic CCTV'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">100% REAL-TIME LIVE DATA</span>
                <span>•</span>
                <span>{distFormatted} away</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time Heartbeat Badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1 text-[10px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE SIGNAL</span>
            </div>

            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={onClose}
              title="Close modal (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tactical Feed Toolbar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-2 text-xs">
          {/* Active DOT CCTV Badge */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-emerald-300 font-mono text-[11px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <Zap size={13} className="text-emerald-400" />
            <span>REAL-TIME DOT CCTV (2s POLL)</span>
          </div>

          {/* Optical Filters & Zoom */}
          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
              <Sliders size={12} />
              <span>FILTER:</span>
              {(['normal', 'thermal', 'night', 'contrast'] as VisionFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded px-1.5 py-0.5 uppercase tracking-wider ${
                    filter === f
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono border-l border-white/10 pl-3">
              <span>ZOOM:</span>
              {[1, 1.5, 2].map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`rounded px-1.5 py-0.5 ${
                    zoom === z
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real Live DOT CCTV Camera Display Container */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[380px] max-h-[520px]">
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <img
              key={`${cctvUrl}-${frameTimestamp}`}
              src={cctvUrl.includes('?') ? cctvUrl : `${cctvUrl}?_t=${frameTimestamp}`}
              alt={camera.name}
              className="max-h-full max-w-full object-contain transition-all duration-300"
              style={{
                filter: filterStyles[filter],
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />

            {cctvError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-amber-300 gap-2 p-4 text-center">
                <AlertTriangle size={28} />
                <div className="font-bold text-sm">Station Feed Buffering</div>
                <div className="text-xs text-zinc-400 max-w-xs">
                  Re-establishing direct telemetry link with California DOT optical sensor…
                </div>
              </div>
            )}
          </div>

          {/* Tactical Optical HUD Overlay */}
          <div className="pointer-events-none absolute inset-0">
            {/* Corner Framing Brackets */}
            <div className="absolute top-4 left-4 h-4 w-4 border-t-2 border-l-2 border-emerald-400/80" />
            <div className="absolute top-4 right-4 h-4 w-4 border-t-2 border-r-2 border-emerald-400/80" />
            <div className="absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-emerald-400/80" />
            <div className="absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-emerald-400/80" />

            {/* Center Crosshair Target */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="h-10 w-10 border border-dashed border-emerald-400 rounded-full" />
              <div className="absolute h-4 w-0.5 bg-emerald-400" />
              <div className="absolute w-4 h-0.5 bg-emerald-400" />
            </div>

            {/* Top-Left Live Status Telemetry */}
            <div className="absolute top-4 left-6 flex items-center gap-2.5 rounded-lg bg-black/80 px-3 py-1.5 backdrop-blur-md border border-white/15">
              <span className={`h-2.5 w-2.5 rounded-full ${isPulling ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <div>
                <div className="font-mono text-[10px] font-bold tracking-wider text-white flex items-center gap-1.5">
                  <span>REAL-TIME DOT CCTV</span>
                  <span className="text-emerald-400">● POLL 2.0s</span>
                </div>
                <div className="font-mono text-[9px] text-zinc-400">
                  FRAME #{frameCount} · PING {latencyMs}ms
                </div>
              </div>
            </div>

            {/* Top-Right Real-Time Clock & Location */}
            <div className="absolute top-4 right-6 flex flex-col items-end gap-1">
              <div className="rounded-lg bg-black/80 px-3 py-1 font-mono text-[11px] text-emerald-300 backdrop-blur-md border border-white/15">
                {timecode} PST
              </div>
              {weather && (
                <div className="rounded bg-black/75 px-2 py-0.5 font-mono text-[9px] text-zinc-300 backdrop-blur-md border border-white/10 flex items-center gap-1">
                  <Wind size={10} className="text-sky-400" />
                  <span>{weather.windSpeedMph} mph {weather.windDirectionCardinal}</span>
                  <span>•</span>
                  <span>{weather.temperatureF}°F</span>
                  <span>•</span>
                  <span className="text-[#ff7b00]">RISK {weather.spreadRiskLevel}</span>
                </div>
              )}
            </div>

            {/* Bottom Geospatial Banner */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Globe size={13} className="text-emerald-400" />
                  COORD: {latFormatted}°N, {lonFormatted}°W
                  {camera.elevation_m != null ? ` • ELEV: ${camera.elevation_m}m` : ''}
                  {camera.azimuth != null ? ` • AZ: ${camera.azimuth}°` : ''}
                </span>
                <span className="font-semibold text-amber-400">
                  {distFormatted} FROM BASE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Window Footer Controls */}
        <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/90 px-4 py-3">
          {/* Previous / Next Camera Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => onSelectCamera && onSelectCamera(prevCamera)}
              title={`Previous: ${prevCamera.name}`}
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <span className="font-mono text-[10px] text-zinc-400">
              {currentIndex + 1} / {safeCameras.length}
            </span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => onSelectCamera && onSelectCamera(nextCamera)}
              title={`Next: ${nextCamera.name}`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2">
            {onFlyTo && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[#ff5a00]/40 bg-[#ff5a00]/10 px-3 py-1.5 text-[11px] font-medium text-[#ff7b00] hover:bg-[#ff5a00]/20 hover:text-white transition-colors"
                onClick={() => {
                  onFlyTo(camera)
                  onClose()
                }}
              >
                <Eye size={13} />
                <span>Fly to Location on Map</span>
              </button>
            )}
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
