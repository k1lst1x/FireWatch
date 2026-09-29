import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Play, Pause, SkipForward, SkipBack, X, Compass } from 'lucide-react'
import { BayhawkProvider, useBayhawk } from '../context/BayhawkContext'
import CityMap from '../map/CityMap'
import { DEMO_INCIDENTS } from '../map/demoIncidents'
import { IncidentList, StatusStrip, TelemetryPanel } from '../map/overlays/Panels'
import { AnalysisBar, IncidentDetail } from '../map/overlays/Inspector'
import FlameMark from '../map/overlays/FlameMark'
import type { BasemapTier } from '../map/config'
import type { CaliforniaTourController, TourStop, TourState } from '../map/californiaTour'
import type { AnalyzeInput } from '../lib/api'
import '../map/map.css'

function Console() {
  const navigate = useNavigate()
  const { status, incidents, backendUp, running, error, analyze, review, refresh } = useBayhawk()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState(0)
  const [tier, setTier] = useState<BasemapTier | null>(null)
  const [booted, setBooted] = useState(false)

  const [cameraMode, setCameraMode] = useState<'california' | 'isometric' | 'topdown' | 'cinematic'>('isometric')
  const [hudVisible, setHudVisible] = useState(true)

  // Automatic California 3D Tour & Pre-rendering state
  const [autoTour, setAutoTour] = useState(false)
  const [tourInfo, setTourInfo] = useState<{
    stop: TourStop
    index: number
    total: number
    state: TourState
  } | null>(null)
  const [prerender, setPrerender] = useState<{
    current: number
    total: number
    name: string
    done: boolean
  }>({ current: 0, total: 8, name: '', done: false })
  const tourControllerRef = useRef<CaliforniaTourController | null>(null)

  // with no backend the city would be empty, which makes for a dead demo
  const simulated = !backendUp && incidents.length === 0
  const shown = useMemo(() => (simulated ? DEMO_INCIDENTS : incidents), [simulated, incidents])
  const selected = shown.find(i => i.id === selectedId) ?? null

  const onReady = useCallback((t: BasemapTier) => {
    setTier(t)
    setBooted(true)
  }, [])

  const onRun = useCallback(
    (input: AnalyzeInput) => analyze(input),
    [analyze],
  )

  const handlePrerenderProgress = useCallback((cur: number, tot: number, name: string) => {
    setPrerender({
      current: cur,
      total: tot,
      name,
      done: cur >= tot,
    })
  }, [])

  const handleTourChange = useCallback((stop: TourStop, index: number, total: number, state: TourState) => {
    setTourInfo({ stop, index, total, state })
  }, [])

  return (
    <div className="fwmap">
      <CityMap
        incidents={shown}
        selectedId={selectedId}
        onSelect={setSelectedId}
        resetToken={resetToken}
        onReady={onReady}
        cameraMode={cameraMode}
        autoTour={autoTour}
        onTourChange={handleTourChange}
        tourControllerRef={tourControllerRef}
        onPrerenderProgress={handlePrerenderProgress}
      />

      {/* header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <FlameMark size={22} />
          <span className="text-[17px] font-semibold tracking-[-0.03em]">FireWatch</span>
          <span className="fwmap-mono ml-1 rounded-full border border-[var(--line)] bg-black/40 px-2.5 py-1 text-[10px] tracking-[0.14em] text-[var(--ash-3)] backdrop-blur">
            3D DIGITAL TWIN · NASA FIRMS
          </span>

          {/* Pre-render / Cache Status Pill */}
          {prerender.done ? (
            <span className="fwmap-mono hidden lg:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[10px] tracking-wide text-emerald-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              CALIFORNIA 3D PRE-RENDERED (8/8)
            </span>
          ) : prerender.current > 0 ? (
            <span className="fwmap-mono hidden lg:inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-950/40 px-2.5 py-1 text-[10px] tracking-wide text-orange-300 backdrop-blur animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              PRE-RENDERING CA [{prerender.current}/{prerender.total}] · {prerender.name}
            </span>
          ) : null}
        </div>

        {/* Center Camera Matrix & Auto Tour Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 p-1 backdrop-blur-md shadow-2xl">
          <button
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              autoTour
                ? 'bg-gradient-to-r from-[#ff6a00] to-[#ff3b10] text-white shadow-[0_0_16px_rgba(255,90,0,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => setAutoTour(v => !v)}
            title="Automatically fly and explore the whole state of California in 3D"
          >
            <Compass size={13} className={autoTour ? 'animate-spin' : ''} />
            <span>{autoTour ? 'Auto Tour Active' : 'Auto Tour CA'}</span>
          </button>

          <div className="h-3 w-px bg-white/15 mx-0.5" />

          <button
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'california' && !autoTour
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => { setAutoTour(false); setCameraMode('california') }}
            title="Statewide 3D Topography & Wildfire Overview"
          >
            California 3D
          </button>
          <button
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'isometric' && !autoTour
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => { setAutoTour(false); setCameraMode('isometric') }}
            title="Benchmark Oblique View (SF Anchor)"
          >
            Isometric 3D
          </button>
          <button
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'topdown' && !autoTour
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => { setAutoTour(false); setCameraMode('topdown') }}
            title="Nadir Top-Down Satellite View"
          >
            Nadir 90°
          </button>
          <button
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'cinematic' && !autoTour
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => { setAutoTour(false); setCameraMode('cinematic') }}
            title="Oblique Twilight Horizon"
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
            onClick={() => navigate('/')}
            aria-label="Back to landing page"
            title="Back to landing page"
          >
            <Home size={14} />
          </button>
        </div>
      </header>

      {/* Floating Autopilot Tour Controller Banner (when Auto Tour is active) */}
      {autoTour && tourInfo && (
        <div className="pointer-events-auto absolute top-20 inset-x-0 z-30 flex justify-center px-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-[#090e18]/90 p-3.5 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-white w-full max-w-[560px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#ff6a00] animate-ping" />
                <span className="fwmap-mono text-[10px] font-semibold uppercase tracking-wider text-[#ff9040]">
                  AUTOPILOT · SECTOR {tourInfo.index + 1} OF {tourInfo.total}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-zinc-300 font-mono">
                  {tourInfo.stop.region}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                  onClick={() => tourControllerRef.current?.previous()}
                  title="Previous Sector"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                  onClick={() => {
                    if (tourInfo.state === 'paused') {
                      tourControllerRef.current?.resume()
                    } else {
                      tourControllerRef.current?.pause()
                    }
                  }}
                  title={tourInfo.state === 'paused' ? 'Resume Tour' : 'Pause Tour'}
                >
                  {tourInfo.state === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                  onClick={() => tourControllerRef.current?.next()}
                  title="Next Sector"
                >
                  <SkipForward size={14} />
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition ml-1"
                  onClick={() => setAutoTour(false)}
                  title="Exit Tour"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-white tracking-tight">
                {tourInfo.stop.name}
              </span>
              <span className="text-[11px] text-zinc-300 line-clamp-1 leading-snug">
                {tourInfo.stop.description}
              </span>
            </div>

            {/* Micro tour progress bar */}
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#ffaa00] via-[#ff6a00] to-[#ff2a00] transition-all duration-700"
                style={{ width: `${((tourInfo.index + 1) / tourInfo.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* left rail */}
      {hudVisible && !autoTour && (
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
          <IncidentList incidents={shown} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      )}

      {/* right inspector */}
      {hudVisible && selected && !autoTour && (
        <div className="pointer-events-none absolute right-5 top-[76px] z-20">
          <IncidentDetail
            incident={selected}
            onReview={(id, decision) => review(id, decision)}
            onClose={() => setSelectedId(null)}
            reviewDisabled={simulated}
          />
        </div>
      )}

      {/* bottom left legend (Blueprint specification) */}
      {hudVisible && !autoTour && (
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
            Volumetric beams clamped to 3D terrain & buildings statewide.
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
        <AnalysisBar running={running} onRun={onRun} />
        <StatusStrip status={status} backendUp={backendUp} />
      </div>

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
            <span>Pre-rendering California 3D</span>
            <span>36.77° N</span>
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
