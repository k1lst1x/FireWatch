import { useEffect, useRef, type RefObject } from 'react'
import { LOOP_FADE_START, SALESFORCE_TRACK } from '../videoTrack'
import { Hex } from './bits'

/** Rising embers drawn on a 2D canvas with additive blending. */
export function Embers({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; seed: number }
    const count = Math.round((reduced ? 30 : 150) * density * Math.min(1.4, w / 1440 + 0.3))
    const spawn = (p: Partial<P> = {}): P => ({
      x: Math.random() * w,
      y: h * (0.75 + Math.random() * 0.35),
      vx: -8 + Math.random() * 22,
      vy: -(18 + Math.random() * 55),
      life: 0,
      max: 4 + Math.random() * 7,
      r: 0.6 + Math.random() * 1.9,
      seed: Math.random() * 100,
      ...p,
    })
    const ps: P[] = Array.from({ length: count }, () => {
      const p = spawn()
      p.life = Math.random() * p.max
      return p
    })
    let raf = 0
    let last = performance.now()
    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible) return
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const t = now / 1000
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        p.life += dt
        if (p.life > p.max || p.y < -20) { ps[i] = spawn(); continue }
        const k = p.life / p.max
        p.vx += Math.sin(t * 1.3 + p.seed) * 10 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const flick = 0.55 + 0.45 * Math.sin(t * 14 + p.seed * 7)
        const a = Math.sin(Math.PI * k) * flick
        const r = p.r * (1 - k * 0.5)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5)
        g.addColorStop(0, `rgba(255, 220, 160, ${0.95 * a})`)
        g.addColorStop(0.25, `rgba(255, 130, 40, ${0.55 * a})`)
        g.addColorStop(1, 'rgba(255, 60, 20, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
}

// ---------------------------------------------------------------- tracked markers

interface Marker {
  id: string
  kind: 'incident' | 'landmark'
  /** offset from the Salesforce Tower tip, in normalised video coordinates */
  dx: number
  dy: number
  title?: string
  area?: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  confidence?: number
  camera?: string
  side?: 'left' | 'right'
}

const MARKERS: Marker[] = [
  { id: 'oakland', kind: 'incident', dx: 0.115, dy: 0.418, title: 'Nob Hill slope', area: 'San Francisco', severity: 'CRITICAL', confidence: 0.94, camera: 'Coit Tower · W', side: 'right' },
  { id: 'sanbruno', kind: 'incident', dx: -0.165, dy: 0.475, title: 'Pacific Heights', area: 'San Francisco', severity: 'HIGH', confidence: 0.88, camera: 'Sutro Tower · N', side: 'left' },
  { id: 'yosemite', kind: 'incident', dx: 0.315, dy: 0.44, title: 'Rincon Ridge', area: 'SoMa', severity: 'MEDIUM', confidence: 0.76, camera: 'Salesforce · S', side: 'left' },
  { id: 'salesforce', kind: 'landmark', dx: 0, dy: -0.022, title: 'Salesforce Tower' },
  { id: 'baybridge', kind: 'landmark', dx: -0.292, dy: 0.055, title: 'Bay Bridge' },
]

const SEV = { CRITICAL: '#ff3b2f', HIGH: '#ff7a1a', MEDIUM: '#ffb020' } as const

function trackAt(t: number): [number, number] {
  const tr = SALESFORCE_TRACK
  if (t <= tr[0][0]) return [tr[0][1], tr[0][2]]
  for (let i = 1; i < tr.length; i++) {
    if (t <= tr[i][0]) {
      const [t0, x0, y0] = tr[i - 1]
      const [t1, x1, y1] = tr[i]
      const k = (t - t0) / (t1 - t0)
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]
    }
  }
  const e = tr[tr.length - 1]
  return [e[1], e[2]]
}

/** Markers pinned to real skyline points; positions follow the drone via the tracked trajectory. */
export function VideoMarkers({ video, frame, active }: { video: RefObject<HTMLVideoElement | null>; frame: RefObject<HTMLDivElement | null>; active: string | null }) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const v = video.current
      const f = frame.current
      if (!v || !f || !v.videoWidth) return
      const t = v.currentTime
      // fade out while the loop crossfades back to the first frame
      const fade = t > LOOP_FADE_START ? Math.max(0, 1 - (t - LOOP_FADE_START) / 0.5) : Math.min(1, t / 0.4)
      const [sx, sy] = trackAt(Math.min(t, LOOP_FADE_START))
      // object-fit: cover mapping
      const W = f.offsetWidth, H = f.offsetHeight
      const scale = Math.max(W / v.videoWidth, H / v.videoHeight)
      const dw = v.videoWidth * scale, dh = v.videoHeight * scale
      const ox = (W - dw) / 2, oy = (H - dh) / 2
      for (const m of MARKERS) {
        const el = refs.current[m.id]
        if (!el) continue
        const x = ox + (sx + m.dx) * dw
        const y = oy + (sy + m.dy) * dh
        // markers live below the hero copy, or out in the side columns
        const clearOfCopy = y > H * 0.7 || x < W * 0.17 || x > W * 0.83
        const inView = x > 165 && x < W - 165 && y > 90 && y < H - 130 && clearOfCopy
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        el.style.opacity = String(inView ? fade : 0)
        el.style.visibility = inView ? 'visible' : 'hidden'
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, frame])

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {MARKERS.map(m => {
        if (m.kind === 'landmark') {
          return (
            <div key={m.id} ref={el => { refs.current[m.id] = el }} className="fw-vmark absolute left-0 top-0">
              <div className="fw-vmark__tag">{m.title}</div>
            </div>
          )
        }
        const color = SEV[m.severity!]
        const isActive = active === m.id
        return (
          <div key={m.id} ref={el => { refs.current[m.id] = el }} className={`fw-vmark absolute left-0 top-0 ${isActive ? 'is-active' : ''} ${active && !isActive ? 'is-dim' : ''}`}>
            <span className="fw-vmark__plume" aria-hidden>
              {[0, 1, 2, 3, 4].map(k => <i key={k} style={{ animationDelay: `${k * 1.5}s` }} />)}
            </span>
            <span className="fw-vmark__fire" style={{ background: `radial-gradient(circle, rgba(255,230,170,0.9) 0%, ${color}cc 30%, ${color}00 70%)` }} />
            <span className="fw-vmark__glow" style={{ background: `radial-gradient(circle, ${color}55, ${color}00 70%)` }} />
            <span className="fw-vmark__stem" />
            <div className="fw-vmark__hex"><Hex color={color} size={34} /></div>

            {/* compact by default, expands to the full read-out when its chip is hovered */}
            <div className={`fw-vmark__pill ${m.side === 'left' ? 'is-left' : ''}`} style={{ borderColor: `${color}55` }}>
              <span className="fw-vmark__dot" style={{ background: color, color }} />
              {m.title}
              <span className="mono text-[var(--ash-3)]">{Math.round(m.confidence! * 100)}%</span>
            </div>

            <div className={`fw-vmark__card ${m.side === 'left' ? 'is-left' : ''}`} style={{ borderColor: `${color}66`, boxShadow: `0 0 50px ${color}44` }}>
              <div className="flex items-center justify-between gap-4">
                <span className="mono text-[10px] tracking-[0.18em] text-[var(--ash-3)]">INCIDENT · {m.area!.toUpperCase()}</span>
                <span className="mono rounded-full px-1.5 py-px text-[9px] font-medium tracking-wider" style={{ color, background: `${color}22`, border: `1px solid ${color}55` }}>{m.severity}</span>
              </div>
              <div className="mt-1 text-[15px] font-medium tracking-[-0.01em]">{m.title}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${m.confidence! * 100}%`, background: `linear-gradient(90deg, #ffb347, ${color})` }} />
                </div>
                <span className="mono text-[11px] text-[var(--ash-2)]">{Math.round(m.confidence! * 100)}%</span>
              </div>
              <div className="mono mt-1.5 text-[10px] text-[var(--ash-3)]">cam {m.camera}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Camera-feed HUD: corner brackets, live timecode, satellite pass countdown. */
export function Hud() {
  const tcRef = useRef<HTMLSpanElement>(null)
  const passRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      const s = (performance.now() - start) / 1000
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      if (tcRef.current) tcRef.current.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(Math.floor((s % 1) * 30))}`
      const left = 47 - (s % 47)
      if (passRef.current) passRef.current.textContent = `00:${pad(Math.floor(left))}`
    }, 1000 / 15)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {(['tl', 'tr', 'bl', 'br'] as const).map(c => <span key={c} className={`fw-bracket fw-bracket--${c}`} />)}
      <div className="mono absolute bottom-10 left-9 hidden text-[11px] leading-5 text-white/60 md:block">
        <div className="flex items-center gap-2 text-white/80"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ff3b2f]" /> REC · CAM-SF-04 · RUSSIAN HILL → SE</div>
        <div>37.8012 N · 122.4194 W · <span ref={tcRef}>00:00:00:00</span></div>
      </div>
      <div className="mono absolute bottom-10 right-9 hidden text-right text-[11px] leading-5 text-white/60 md:block">
        <div>NASA FIRMS pass in <span ref={passRef} className="text-[var(--flame)]">00:47</span></div>
        <div>Simulated incidents · real footage</div>
      </div>
    </div>
  )
}
