import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { BayhawkProvider, useBayhawk } from '../context/BayhawkContext'
import CityMap from '../map/CityMap'
import { DEMO_INCIDENTS } from '../map/demoIncidents'
import { IncidentList, StatusStrip, TelemetryPanel } from '../map/overlays/Panels'
import { AnalysisBar, IncidentDetail } from '../map/overlays/Inspector'
import FlameMark from '../map/overlays/FlameMark'
import type { BasemapTier } from '../map/config'
import '../map/map.css'

function Console() {
  const navigate = useNavigate()
  const { status, incidents, backendUp, running, error, analyze, review, refresh } = useBayhawk()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState(0)
  const [tier, setTier] = useState<BasemapTier | null>(null)
  const [booted, setBooted] = useState(false)

  const [cameraMode, setCameraMode] = useState<'isometric' | 'topdown' | 'cinematic'>('isometric')
  const [hudVisible, setHudVisible] = useState(true)

  // with no backend the city would be empty, which makes for a dead demo
  const simulated = !backendUp && incidents.length === 0
  const shown = useMemo(() => (simulated ? DEMO_INCIDENTS : incidents), [simulated, incidents])
  const selected = shown.find(i => i.id === selectedId) ?? null

  const onReady = useCallback((t: BasemapTier) => {
    setTier(t)
    setBooted(true)
  }, [])

  const onRun = useCallback(
    (lat: number, lon: number, imageUrl?: string) => {
      analyze({ lat, lon, image_url: imageUrl })
    },
    [analyze],
  )

  return (
    <div className="fwmap">
      <CityMap
        incidents={shown}
        selectedId={selectedId}
        onSelect={setSelectedId}
        resetToken={resetToken}
        onReady={onReady}
        cameraMode={cameraMode}
      />

      {/* header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <FlameMark size={22} />
          <span className="text-[17px] font-semibold tracking-[-0.03em]">FireWatch</span>
          <span className="fwmap-mono ml-1 rounded-full border border-[var(--line)] bg-black/40 px-2.5 py-1 text-[10px] tracking-[0.14em] text-[var(--ash-3)] backdrop-blur">
            3D DIGITAL TWIN · NASA FIRMS
          </span>
        </div>

        {/* Center Camera Matrix Switcher from Blueprint */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-md">
          <button
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              cameraMode === 'isometric'
                ? 'bg-[#ff5a00] text-white shadow-[0_0_12px_rgba(255,90,0,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={() => setCameraMode('isometric')}
            title="Benchmark Oblique View (SF Anchor)"
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
          <IncidentList incidents={shown} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      )}

      {/* right inspector */}
      {hudVisible && selected && (
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
            Beam height: <code className="text-[#ff9d42]">max(120m, FRP × 6.5)</code> clamped to 3D buildings.
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
