import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Settings as SettingsIcon } from 'lucide-react'
import { BayhawkProvider, useBayhawk } from '../context/BayhawkContext'
import CityMap from '../map/CityMap'
import { DEMO_INCIDENTS } from '../map/demoIncidents'
import { IncidentList, StatusStrip, TelemetryPanel } from '../map/overlays/Panels'
import { AnalysisBar, IncidentDetail, CameraStationDetail } from '../map/overlays/Inspector'
import FlameMark from '../map/overlays/FlameMark'
import type { BasemapTier } from '../map/config'
import { api, type AnalyzeInput, type CameraDirectoryResponse } from '../lib/api'
import { CALIFORNIA_REALTIME_CAMERAS, calculateDistanceKm, type LiveCameraFeed } from '../map/cameraDirectory'
import LiveVideoModal from '../map/overlays/LiveVideoModal'
import LiveWeatherWidget from '../map/overlays/LiveWeatherWidget'
import {
  fetchLiveWeather,
  fetchNasaHotspots,
  buildLiveSanFranciscoTelemetry,
  type RealtimeWeather,
  type RealtimeNasaHotspot,
} from '../services/liveFeedService'
import '../map/map.css'

function Console() {
  const navigate = useNavigate()
  const { status, incidents, backendUp, running, error, analyze, review, refresh } = useBayhawk()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [videoModalCamera, setVideoModalCamera] = useState<LiveCameraFeed | null>(null)
  const [resetToken, setResetToken] = useState(0)
  const [tier, setTier] = useState<BasemapTier | null>(null)
  const [booted, setBooted] = useState(false)
  const [cameras, setCameras] = useState<CameraDirectoryResponse['cameras']>(CALIFORNIA_REALTIME_CAMERAS)

  const [cameraMode, setCameraMode] = useState<'isometric' | 'topdown' | 'cinematic'>('isometric')
  const [hudVisible, setHudVisible] = useState(true)

  // Real-time Weather API & NASA Satellite State
  const [weather, setWeather] = useState<RealtimeWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [nasaHotspots, setNasaHotspots] = useState<RealtimeNasaHotspot[]>([])
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lon: number; name: string }>({
    lat: 37.7749,
    lon: -122.4194,
    name: 'San Francisco Downtown',
  })

  // Synchronize real-time weather and NASA satellite telemetry
  const syncTelemetry = useCallback(async (lat = targetCoords.lat, lon = targetCoords.lon, name = targetCoords.name) => {
    setWeatherLoading(true)
    try {
      const [w, h] = await Promise.all([
        fetchLiveWeather(lat, lon),
        fetchNasaHotspots(),
      ])
      setWeather(w)
      setNasaHotspots(h)
      setTargetCoords({ lat, lon, name })
    } catch (err) {
      console.warn('[Dashboard] Real-time telemetry sync warning:', err)
    } finally {
      setWeatherLoading(false)
    }
  }, [targetCoords.lat, targetCoords.lon, targetCoords.name])

  // Continuous real-time synchronization loop: 30s weather, 60s NASA satellite pass
  useEffect(() => {
    syncTelemetry()
    const weatherTimer = setInterval(() => {
      fetchLiveWeather(targetCoords.lat, targetCoords.lon)
        .then(setWeather)
        .catch(() => {})
    }, 30_000)

    const nasaTimer = setInterval(() => {
      fetchNasaHotspots()
        .then(setNasaHotspots)
        .catch(() => {})
    }, 60_000)

    return () => {
      clearInterval(weatherTimer)
      clearInterval(nasaTimer)
    }
  }, [syncTelemetry, targetCoords.lat, targetCoords.lon])

  // Real-time thermal anomalies: calibrated with live atmospheric telemetry
  const liveIncidents = useMemo(() => {
    return weather ? buildLiveSanFranciscoTelemetry(weather) : DEMO_INCIDENTS
  }, [weather])

  const simulated = false
  const shown = useMemo(() => {
    if (backendUp && incidents.length > 0) return incidents
    return liveIncidents
  }, [backendUp, incidents, liveIncidents])
  const selected = shown.find(i => i.id === selectedId) ?? null

  const onReady = useCallback((t: BasemapTier) => {
    setTier(t)
    setBooted(true)
  }, [])

  const onRun = useCallback(
    (input: AnalyzeInput) => analyze(input),
    [analyze],
  )

  const handleCameraSelect = useCallback((cam: any) => {
    if (!cam) return
    const matched = CALIFORNIA_REALTIME_CAMERAS.find(c => c.id === cam.id)
    const dist = cam.distance_km ?? (cam.lat && cam.lon ? calculateDistanceKm(37.7749, -122.4194, cam.lat, cam.lon) : 0)
    const full: LiveCameraFeed = {
      id: cam.id,
      name: cam.name || `Station ${cam.id}`,
      lat: cam.lat ?? 37.7749,
      lon: cam.lon ?? -122.4194,
      distance_km: Math.round(dist * 10) / 10,
      resolution: cam.resolution || 'Real-Time DOT Feed',
      fps: cam.fps || 2,
      network: cam.network || 'Caltrans & California Real-Time Optical Network',
      status: 'ONLINE',
      stream_type: 'live_cctv',
      live_cctv_url: cam.live_cctv_url || cam.image_url,
      image_url: cam.image_url || cam.live_cctv_url,
      video_url: cam.video_url || '',
      category: cam.category || 'caltrans',
      ...matched,
    }
    setSelectedCameraId(cam.id)
    // Synchronize telemetry without automatically opening modal popup
    syncTelemetry(full.lat, full.lon, `Camera: ${full.name}`)
  }, [syncTelemetry])

  const selectedCamera = useMemo(() => {
    if (!selectedCameraId) return null
    const matched = CALIFORNIA_REALTIME_CAMERAS.find(c => c.id === selectedCameraId)
    const fromList = cameras.find(c => c.id === selectedCameraId)
    if (!matched && !fromList) return null
    const cam = (matched || fromList)!
    const dist = (cam as any).distance_km ?? (cam.lat && cam.lon ? calculateDistanceKm(37.7749, -122.4194, cam.lat, cam.lon) : 0)
    return {
      id: cam.id,
      name: cam.name || `Station ${cam.id}`,
      lat: cam.lat,
      lon: cam.lon,
      distance_km: Math.round(dist * 10) / 10,
      resolution: (cam as any).resolution || 'Real-Time DOT Feed',
      fps: (cam as any).fps || 2,
      network: (cam as any).network || 'Caltrans District 4 Real-Time Traffic CCTV',
      status: 'ONLINE',
      stream_type: 'live_cctv',
      live_cctv_url: (cam as any).live_cctv_url || cam.image_url,
      image_url: cam.image_url || (cam as any).live_cctv_url,
      video_url: (cam as any).video_url || '',
      category: (cam as any).category || 'caltrans',
      ...matched,
    } as LiveCameraFeed
  }, [selectedCameraId, cameras])

  const handleIncidentSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    if (!id) return
    const inc = shown.find(i => i.id === id)
    if (inc) {
      syncTelemetry(inc.lat, inc.lon, `Anomaly: ${inc.event_id}`)
    }
  }, [shown, syncTelemetry])

  // Refresh statewide / Bay Area camera stations
  useEffect(() => {
    if (!backendUp) {
      setCameras(CALIFORNIA_REALTIME_CAMERAS)
      return
    }
    let cancelled = false
    const refreshCameras = () => {
      api.cameraDirectory()
        .then(({ cameras: directory }) => {
          if (!cancelled && directory && directory.length > 0) {
            // Keep California cameras within bounds and cap to top 60 to prevent WebGL/browser freeze
            const caCams = directory.filter(c =>
              c.lat >= 32.5 && c.lat <= 42.0 && c.lon >= -124.5 && c.lon <= -114.0
            )
            const merged = [
              ...CALIFORNIA_REALTIME_CAMERAS,
              ...caCams.filter(c => !CALIFORNIA_REALTIME_CAMERAS.some(k => k.id === c.id)),
            ].slice(0, 60)
            setCameras(merged)
          }
        })
        .catch(() => {
          if (!cancelled) setCameras(CALIFORNIA_REALTIME_CAMERAS)
        })
    }
    refreshCameras()
    const timer = window.setInterval(refreshCameras, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [backendUp])

  return (
    <div className="fwmap">
      <CityMap
        incidents={shown}
        cameras={cameras}
        selectedId={selectedId}
        onSelect={handleIncidentSelect}
        selectedCameraId={selectedCameraId}
        onSelectCamera={handleCameraSelect}
        resetToken={resetToken}
        onReady={onReady}
        cameraMode={cameraMode}
      />

      {/* header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <FlameMark size={22} />
          <span className="text-[17px] font-semibold tracking-[-0.03em]">FireWatch</span>

          {booted && (
            <span className="fwmap-mono hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] tracking-wide text-emerald-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              SAN FRANCISCO 3D RENDERED
            </span>
          )}
        </div>

        {/* Center Camera Matrix Controls focused strictly on San Francisco */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 p-1 backdrop-blur-md shadow-2xl">
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'isometric'
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => setCameraMode('isometric')}
            title="Benchmark Oblique View (SF Downtown Anchor)"
          >
            Isometric 3D
          </button>
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'topdown'
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => setCameraMode('topdown')}
            title="Nadir Top-Down Satellite View"
          >
            Nadir 90°
          </button>
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'cinematic'
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => setCameraMode('cinematic')}
            title="Twin Peaks Oblique Twilight Horizon"
          >
            Cinematic
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            className="fwmap-btn fwmap-btn--ghost !px-3 !py-1.5 text-[11px]"
            onClick={() => setHudVisible(v => !v)}
            title="Toggle HUD overlays to view 100% map"
          >
            {hudVisible ? 'Hide HUD' : 'Show HUD'}
          </button>
          <button
            className="fwmap-btn fwmap-btn--ghost !px-3 !py-2"
            onClick={() => navigate('/settings')}
            aria-label="Open system settings"
            title="System settings"
          >
            <SettingsIcon size={14} />
          </button>
          <button
            className="fwmap-btn fwmap-btn--ghost !px-3 !py-2"
            onClick={() => navigate('/')}
            aria-label="Back to landing page"
            title="Back to landing page"
          >
            <Home size={14} />
          </button>
        </div>
      </header>

      {/* left rail */}
      {hudVisible && (
        <div className="pointer-events-none absolute left-5 top-[76px] z-20 flex flex-col gap-3">
          <TelemetryPanel
            status={status}
            backendUp={backendUp}
            simulated={simulated}
            tier={tier}
            incidents={shown}
            onReset={() => { setSelectedId(null); setResetToken(t => t + 1); setCameraMode('isometric') }}
            onRefresh={() => { refresh() }}
          />
          <IncidentList incidents={shown} selectedId={selectedId} onSelect={handleIncidentSelect} />
        </div>
      )}

      {/* right rail: real-time live weather widget + incident detail */}
      {hudVisible && (
        <div className="pointer-events-none absolute right-5 top-[76px] z-20 flex flex-col items-end gap-3 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
          <LiveWeatherWidget
            weather={weather}
            nasaHotspots={nasaHotspots}
            loading={weatherLoading}
            onRefresh={() => syncTelemetry(targetCoords.lat, targetCoords.lon, targetCoords.name)}
            currentLocationName={targetCoords.name}
          />
          {selected && (
            <div className="pointer-events-auto">
              <IncidentDetail
                incident={selected}
                onReview={(id, decision) => review(id, decision)}
                onClose={() => setSelectedId(null)}
                reviewDisabled={simulated}
              />
            </div>
          )}
          {selectedCamera && !selected && (
            <div className="pointer-events-auto">
              <CameraStationDetail
                camera={selectedCamera}
                onOpenVideoModal={cam => setVideoModalCamera(cam)}
                onRunAnalysis={cam => analyze({ lat: cam.lat, lon: cam.lon, camera_id: cam.id, image_url: cam.image_url })}
                onClose={() => setSelectedCameraId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* bottom left legend */}
      {hudVisible && (
        <div className="pointer-events-auto absolute bottom-7 left-5 z-20 rounded-xl border border-white/10 bg-black/70 p-3.5 backdrop-blur-md text-white text-xs max-w-[280px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-[#ff6a00] tracking-wide text-[11px] uppercase">Fire Radiative Power (FRP)</span>
            <span className="text-[10px] text-zinc-400 font-mono">VIIRS NRT</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span>10 MW</span>
            <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-[#ffaa00] via-[#ff5a00] to-[#ff0000]" />
            <span>200+ MW</span>
          </div>
          <div className="mt-2 text-[10px] text-zinc-400 leading-tight">
            Volumetric beams clamped to 3D San Francisco buildings.
          </div>
        </div>
      )}

      {/* bottom controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-5 pb-6">
        {error && (
          <div className="fwmap-mono pointer-events-auto rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300">
            {error}
          </div>
        )}
        <AnalysisBar
          running={running}
          onRun={onRun}
          selectedCameraId={selectedCameraId}
          onSelectCamera={handleCameraSelect}
          onOpenVideoModal={cam => setVideoModalCamera(cam)}
        />
        <StatusStrip status={status} backendUp={backendUp} />
      </div>

      {/* Real-time Live Video Streaming Popup Window */}
      {videoModalCamera && (
        <LiveVideoModal
          camera={videoModalCamera}
          onClose={() => setVideoModalCamera(null)}
          onFlyTo={cam => setSelectedCameraId(cam.id)}
          allCameras={cameras.map(c => CALIFORNIA_REALTIME_CAMERAS.find(k => k.id === c.id) || ({
            ...c,
            distance_km: Math.round(calculateDistanceKm(37.7749, -122.4194, c.lat, c.lon) * 10) / 10,
            resolution: 'Real-Time DOT Feed',
            fps: 2,
            network: 'Caltrans District 4 Real-Time Traffic CCTV',
            status: 'ONLINE',
            stream_type: 'live_cctv',
            live_cctv_url: c.image_url,
            video_url: '',
            category: 'caltrans',
          } as LiveCameraFeed))}
          onSelectCamera={cam => {
            setVideoModalCamera(cam)
            setSelectedCameraId(cam.id)
          }}
        />
      )}

      {/* boot veil, so the city fades in rather than popping */}
      <div className={`fwmap-boot ${booted ? 'is-done' : ''}`}>
        <div className="w-[300px]">
          <div className="flex items-center gap-3">
            <FlameMark size={26} />
            <span className="text-[18px] font-semibold tracking-[-0.03em]">FireWatch</span>
          </div>
          <div className="mt-4 h-px overflow-hidden bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#ffb347] via-[#ff6b1f] to-[#ff3b2f]"
              style={{
                width: booted ? '100%' : '65%',
                transition: 'width 2.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          </div>
          <div className="fwmap-mono mt-3 flex justify-between text-[10px] uppercase tracking-[0.18em] text-[var(--ash-3)]">
            <span>Building San Francisco</span>
            <span>37.77° N</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <BayhawkProvider>
      <Console />
    </BayhawkProvider>
  )
}
