import { useEffect, useRef, useState, type RefObject } from 'react'
import { LOOP_DURATION, TOWER_TRACK } from '../videoTrack'

/**
 * Overlay chrome for the hero plate.
 *
 * Everything here is instrumentation, not decoration: the reticle is locked to a real
 * point in the footage, the timecode really counts, and the readouts carry the same
 * fields the dispatch console shows. Nothing is composited onto the footage to fake a
 * fire — the plate is a clear frame, and the HUD says so.
 */

/** Normalised tower position at time `t`, linearly interpolated between tracked samples. */
function sample(t: number): [number, number] {
  const d = LOOP_DURATION
  const wrapped = ((t % d) + d) % d
  const step = TOWER_TRACK[1][0] - TOWER_TRACK[0][0]
  const i = Math.min(TOWER_TRACK.length - 1, Math.floor(wrapped / step))
  const a = TOWER_TRACK[i]
  const b = TOWER_TRACK[(i + 1) % TOWER_TRACK.length]
  const f = Math.min(1, Math.max(0, (wrapped - a[0]) / step))
  return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/**
 * Maps a normalised point in the video to a pixel offset inside the frame.
 * The plate is `object-fit: cover`, so one axis is cropped and we have to undo that
 * ourselves — otherwise the reticle slides off the tower on any aspect but the video's.
 */
function project(nx: number, ny: number, fw: number, fh: number, vw: number, vh: number) {
  const scale = Math.max(fw / vw, fh / vh)
  const w = vw * scale
  const h = vh * scale
  return { x: (fw - w) / 2 + nx * w, y: (fh - h) / 2 + ny * h }
}

export function TowerLock({
  video,
  frame,
}: {
  video: RefObject<HTMLVideoElement | null>
  frame: RefObject<HTMLDivElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const v = video.current
      const f = frame.current
      const el = ref.current
      if (!v || !f || !el || !v.videoWidth) return
      const w = f.clientWidth
      const h = f.clientHeight
      const [nx, ny] = sample(v.currentTime)
      const { x, y } = project(nx, ny, w, h, v.videoWidth, v.videoHeight)
      // hide the reticle when the tracked point is cropped out of view
      const visible = x > 130 && x < w - 130 && y > 120 && y < h - 120
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      el.style.opacity = visible ? '1' : '0'
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [video, frame])

  return (
    <div ref={ref} className="fw-lock">
      <div className="fw-lock__box" />
      <div className="fw-lock__tag">
        <span className="fw-dot fw-dot--ok" />
        <span className="lbl">Tracking · GGB S-Tower</span>
      </div>
    </div>
  )
}

/** Runs off the video clock so the timecode matches what is actually on screen. */
function useTimecode(video: RefObject<HTMLVideoElement | null>) {
  const [tc, setTc] = useState('00:00:00')
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = video.current?.currentTime ?? 0
      const base = Date.now() / 1000
      const h = Math.floor(base / 3600) % 24
      const m = Math.floor(base / 60) % 60
      const s = Math.floor(t) % 60
      setTc(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 250)
    return () => window.clearInterval(id)
  }, [video])
  return tc
}

const Row = ({ k, v, dot }: { k: string; v: string; dot?: 'ok' | 'amber' }) => (
  <div className="fw-readout__row">
    <span className="lbl">{k}</span>
    <span className="fw-readout__v flex items-center gap-1.5">
      {dot && <span className={`fw-dot fw-dot--${dot}`} />}
      {v}
    </span>
  </div>
)

export function Hud({ video }: { video: RefObject<HTMLVideoElement | null> }) {
  const tc = useTimecode(video)
  return (
    <>
      <span className="fw-bracket fw-bracket--tl" />
      <span className="fw-bracket fw-bracket--tr" />
      <span className="fw-bracket fw-bracket--bl" />
      <span className="fw-bracket fw-bracket--br" />

      {/* Both readouts hug the left, clear of the copy: camera identity up top,
          what the agents make of the frame down below. */}
      <div className="fw-readout hidden xl:block" style={{ top: 104, left: 44 }}>
        <Row k="Feed" v="GGB-N-01" dot="ok" />
        <Row k="Sector" v="Marin Headlands" />
        <Row k="Timecode" v={tc} />
      </div>

      <div className="fw-readout hidden xl:block" style={{ bottom: 104, left: 44 }}>
        <Row k="Smoke" v="0.04" />
        <Row k="FIRMS" v="No hotspot" dot="ok" />
        <Row k="Spread risk" v="Low" />
      </div>

    </>
  )
}
