import { useEffect, useState } from 'react'
import {
  Camera, ChevronLeft, ChevronRight, Eye, Maximize, Minimize, Volume2, VolumeX, X,
} from 'lucide-react'
import type { LiveCameraFeed } from '../cameraDirectory'

interface Props {
  camera: LiveCameraFeed | null
  onClose: () => void
  onFlyTo?: (camera: LiveCameraFeed) => void
  allCameras?: LiveCameraFeed[]
  onSelectCamera?: (camera: LiveCameraFeed) => void
}

export default function LiveVideoModal({
  camera,
  onClose,
  onFlyTo,
  allCameras = [],
  onSelectCamera,
}: Props) {
  const [muted, setMuted] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [timecode, setTimecode] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimecode(new Date().toLocaleTimeString('en-US', { hour12: false }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!camera) return null

  const currentIndex = allCameras.findIndex(c => c.id === camera.id)
  const prevCamera = currentIndex > 0 ? allCameras[currentIndex - 1] : allCameras[allCameras.length - 1]
  const nextCamera = currentIndex < allCameras.length - 1 ? allCameras[currentIndex + 1] : allCameras[0]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.85)] transition-all ${
          fullscreen ? 'h-[96vh] w-[96vw]' : 'w-full max-w-[840px]'
        }`}
      >
        {/* Modal Window Top Titlebar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-4 py-3">
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
                <span>{camera.network}</span>
                <span>•</span>
                <span>{camera.resolution}</span>
                <span>•</span>
                <span>{camera.distance_km.toFixed(1)} km away</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-1 text-[10px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE FEED</span>
            </div>

            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? 'Restore window size' : 'Expand window'}
            >
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            <button
              type="button"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
              onClick={onClose}
              title="Close live video window (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Real Video Player Container */}
        <div className="relative flex-1 bg-black overflow-hidden group">
          <video
            key={camera.video_url}
            src={camera.video_url}
            autoPlay
            loop
            muted={muted}
            playsInline
            controls
            className="h-full w-full object-contain bg-black"
          />

          {/* Tactical Optical HUD Overlay */}
          <div className="pointer-events-none absolute inset-0">
            {/* Reticles */}
            <div className="absolute top-4 left-4 h-4 w-4 border-t-2 border-l-2 border-emerald-400/80" />
            <div className="absolute top-4 right-4 h-4 w-4 border-t-2 border-r-2 border-emerald-400/80" />
            <div className="absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-emerald-400/80" />
            <div className="absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-emerald-400/80" />

            {/* Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="h-8 w-8 border border-dashed border-emerald-400 rounded-full" />
            </div>

            {/* Top-Left Telemetry */}
            <div className="absolute top-4 left-6 flex items-center gap-2 rounded bg-black/70 px-2.5 py-1 backdrop-blur-md border border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-[10px] font-bold tracking-wider text-white">
                STREAM ● ACTIVE
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {camera.fps || 30} FPS
              </span>
            </div>

            {/* Top-Right Real-time Clock */}
            <div className="absolute top-4 right-6 rounded bg-black/70 px-2.5 py-1 font-mono text-[10px] text-emerald-300 backdrop-blur-md border border-white/10">
              {timecode} PST
            </div>

            {/* Bottom Geospatial Banner */}
            <div className="absolute inset-x-0 bottom-14 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <span>
                  LAT/LON: {camera.lat.toFixed(4)}°, {camera.lon.toFixed(4)}°
                  {camera.elevation_m ? ` • ELEV: ${camera.elevation_m}m` : ''}
                  {camera.azimuth ? ` • AZ: ${camera.azimuth}°` : ''}
                </span>
                <span className="font-semibold text-amber-400">
                  {camera.distance_km.toFixed(1)} km FROM POSITION
                </span>
              </div>
            </div>
          </div>

          {/* Quick Sound Mute Toggle overlay */}
          <button
            type="button"
            className="absolute top-4 right-32 pointer-events-auto rounded bg-black/70 p-1.5 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
            onClick={() => setMuted(m => !m)}
            title={muted ? 'Unmute video audio' : 'Mute video audio'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Modal Window Bottom Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-900/95 px-4 py-3">
          <div className="flex items-center gap-2">
            {allCameras.length > 1 && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => onSelectCamera && onSelectCamera(prevCamera)}
                  title="Previous Live Camera"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => onSelectCamera && onSelectCamera(nextCamera)}
                  title="Next Live Camera"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            {onFlyTo && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                onClick={() => {
                  onFlyTo(camera)
                  onClose()
                }}
                title="Fly to this camera post on the 3D Cesium Map"
              >
                <Eye size={13} />
                <span>Fly to Location on 3D Map</span>
              </button>
            )}
          </div>

          {/* Quick Camera Switcher Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[420px] py-0.5">
            {allCameras.slice(0, 5).map(c => (
              <button
                key={c.id}
                type="button"
                className={`truncate rounded px-2 py-1 text-[10px] font-medium transition-all ${
                  c.id === camera.id
                    ? 'bg-[#ff5a00] text-white shadow-[0_0_8px_rgba(255,90,0,0.4)]'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => onSelectCamera && onSelectCamera(c)}
              >
                {c.name.split('·')[0].trim()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
