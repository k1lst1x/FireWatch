import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Lock, Play } from 'lucide-react'
import { Kicker, Split } from './bits'

gsap.registerPlugin(ScrollTrigger)

type StationId = 'north_bay' | 'sierra' | 'socal'
interface Station {
  id: StationId
  name: string
  labels: number
  fp_rate: number
  params: { camera_weight: number; fusion_threshold: number; thermal_only_threshold: number }
}
interface Round { round: number; fp_rate: number; per_station: Record<StationId, number> }

// Mirrors the /api/federation/status shape from the frontend brief (illustrative values).
const INITIAL_STATIONS: Station[] = [
  { id: 'north_bay', name: 'North Bay', labels: 14, fp_rate: 0.12, params: { camera_weight: 0.58, fusion_threshold: 0.46, thermal_only_threshold: 0.62 } },
  { id: 'sierra', name: 'Sierra', labels: 11, fp_rate: 0.11, params: { camera_weight: 0.55, fusion_threshold: 0.48, thermal_only_threshold: 0.64 } },
  { id: 'socal', name: 'SoCal', labels: 17, fp_rate: 0.13, params: { camera_weight: 0.57, fusion_threshold: 0.47, thermal_only_threshold: 0.63 } },
]
const INITIAL_HISTORY: Round[] = [
  { round: 0, fp_rate: 0.42, per_station: { north_bay: 0.45, sierra: 0.4, socal: 0.41 } },
  { round: 1, fp_rate: 0.27, per_station: { north_bay: 0.3, sierra: 0.25, socal: 0.26 } },
  { round: 2, fp_rate: 0.18, per_station: { north_bay: 0.2, sierra: 0.16, socal: 0.18 } },
  { round: 3, fp_rate: 0.12, per_station: { north_bay: 0.12, sierra: 0.11, socal: 0.13 } },
]

const COLORS: Record<StationId, string> = { north_bay: '#ffc46b', sierra: '#ff8a3c', socal: '#ff4f5e' }
const pct = (v: number) => `${Math.round(v * 100)}%`

const W = 820, H = 360, PAD = { l: 44, r: 64, t: 20, b: 36 }
const Y_MAX = 0.5

function Chart({ history, drawKey }: { history: Round[]; drawKey: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const maxRound = Math.max(5, history[history.length - 1].round)
  const x = (r: number) => PAD.l + (r / maxRound) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / Y_MAX) * (H - PAD.t - PAD.b)
  const path = (vals: number[]) => {
    const pts = vals.map((v, i) => [x(history[i].round), y(v)])
    return pts.reduce((d, [px, py], i) => {
      if (i === 0) return `M${px},${py}`
      const [qx, qy] = pts[i - 1]
      const cx = (qx + px) / 2
      return `${d} C${cx},${qy} ${cx},${py} ${px},${py}`
    }, '')
  }
  const last = history[history.length - 1]

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const lines = svg.querySelectorAll<SVGPathElement>('[data-line]')
    const ctx = gsap.context(() => {
      lines.forEach(l => {
        const len = l.getTotalLength()
        gsap.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, {
          strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut',
          scrollTrigger: drawKey === 0 ? { trigger: svg, start: 'top 75%' } : undefined,
        })
      })
      gsap.fromTo(svg.querySelectorAll('[data-dot]'), { scale: 0, transformOrigin: 'center' }, {
        scale: 1, duration: 0.5, stagger: 0.05, delay: 1.6, ease: 'back.out(2)',
        scrollTrigger: drawKey === 0 ? { trigger: svg, start: 'top 75%' } : undefined,
      })
    }, svg)
    return () => ctx.revert()
  }, [drawKey, history.length])

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id="fw-global" x1="0" x2="1">
          <stop offset="0" stopColor="#ffe2b8" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="fw-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff6b1f" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ff6b1f" stopOpacity="0" />
        </linearGradient>
        <filter id="fw-glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map(v => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgba(255,236,214,0.08)" strokeDasharray={v === 0 ? '' : '3 6'} />
          <text x={PAD.l - 12} y={y(v) + 4} textAnchor="end" className="mono" fontSize="11" fill="rgba(244,237,228,0.4)">{v * 100}%</text>
        </g>
      ))}
      {Array.from({ length: maxRound + 1 }).map((_, r) => (
        <text key={r} x={x(r)} y={H - 10} textAnchor="middle" className="mono" fontSize="11" fill="rgba(244,237,228,0.4)">R{r}</text>
      ))}
      <path d={`${path(history.map(h => h.fp_rate))} L${x(last.round)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#fw-area)" opacity="0.9" />
      {(Object.keys(COLORS) as StationId[]).map(id => (
        <path key={id} data-line d={path(history.map(h => h.per_station[id]))} fill="none" stroke={COLORS[id]} strokeWidth="1.6" strokeOpacity="0.75" />
      ))}
      <path data-line d={path(history.map(h => h.fp_rate))} fill="none" stroke="url(#fw-global)" strokeWidth="4" filter="url(#fw-glow)" strokeLinecap="round" />
      {history.map(h => (
        <circle key={h.round} data-dot cx={x(h.round)} cy={y(h.fp_rate)} r="5" fill="#0a0b10" stroke="#fff" strokeWidth="2" />
      ))}
      <g data-dot>
        <text x={x(last.round) + 12} y={y(last.fp_rate) + 5} fontSize="18" fontWeight="600" fill="#fff">{pct(last.fp_rate)}</text>
      </g>
      <text x={x(0) + 12} y={y(history[0].fp_rate) - 12} fontSize="13" fill="rgba(244,237,228,0.6)">{pct(history[0].fp_rate)} before</text>
    </svg>
  )
}

function FlowDiagram({ running }: { running: boolean }) {
  const nodes = [
    { id: 'north_bay', label: 'North Bay', x: 50, y: 40 },
    { id: 'sierra', label: 'Sierra', x: 50, y: 150 },
    { id: 'socal', label: 'SoCal', x: 50, y: 260 },
  ] as const
  const hub = { x: 250, y: 150 }
  return (
    <svg viewBox="0 0 320 300" className="h-auto w-full">
      {nodes.map(n => {
        const d = `M${n.x + 18},${n.y} C${(n.x + hub.x) / 2},${n.y} ${(n.x + hub.x) / 2},${hub.y} ${hub.x - 30},${hub.y}`
        return (
          <g key={n.id}>
            <path d={d} stroke="rgba(255,236,214,0.14)" fill="none" strokeDasharray="3 5" />
            {[0, 1].map(k => (
              <rect key={k} className="fw-packet" width="16" height="7" rx="2" x="-8" y="-3.5" fill={COLORS[n.id]}
                style={{ offsetPath: `path('${d}')`, animationDelay: `${k * 1.4 + (n.y / 150) * 0.3}s`, animationDuration: running ? '1.1s' : '2.8s' }} />
            ))}
            <circle cx={n.x} cy={n.y} r="18" fill="#0c0d13" stroke={COLORS[n.id]} strokeOpacity="0.8" />
            <text x={n.x} y={n.y + 36} textAnchor="middle" fontSize="11" fill="rgba(244,237,228,0.6)">{n.label}</text>
            <g transform={`translate(${n.x - 6},${n.y - 7})`} stroke="rgba(244,237,228,0.7)" fill="none" strokeWidth="1.3">
              <rect x="1" y="5" width="10" height="8" rx="1.5" /><path d="M3 5V3.5a3 3 0 0 1 6 0V5" />
            </g>
          </g>
        )
      })}
      <circle cx={hub.x} cy={hub.y} r="30" fill="rgba(255,107,31,0.12)" stroke="#ff8a3c" />
      <circle cx={hub.x} cy={hub.y} r="44" fill="none" stroke="#ff8a3c" strokeOpacity="0.25">
        <animate attributeName="r" values="32;52;32" dur={running ? '1s' : '3s'} repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur={running ? '1s' : '3s'} repeatCount="indefinite" />
      </circle>
      <text x={hub.x} y={hub.y - 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">Flower</text>
      <text x={hub.x} y={hub.y + 12} textAnchor="middle" fontSize="9" fill="rgba(244,237,228,0.6)">FedAvg</text>
      <text x={hub.x} y={hub.y + 62} textAnchor="middle" className="mono" fontSize="9" fill="rgba(244,237,228,0.45)">global settings</text>
    </svg>
  )
}

export default function Federation() {
  const [stations, setStations] = useState(INITIAL_STATIONS)
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [running, setRunning] = useState(false)
  const [drawKey, setDrawKey] = useState(0)
  const round = history[history.length - 1].round
  const first = history[0].fp_rate
  const now = history[history.length - 1].fp_rate
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barsRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('.fw-bar > i'), {
        scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 80%' },
      })
    }, el)
    return () => ctx.revert()
  }, [])

  const runRound = () => {
    if (running) return
    setRunning(true)
    window.setTimeout(() => {
      const jitter = () => (Math.random() - 0.5) * 0.02
      const next = stations.map(s => {
        const fp = Math.max(0.04, s.fp_rate * 0.78 + jitter() * 0.5)
        return {
          ...s,
          labels: s.labels + 3 + Math.floor(Math.random() * 5),
          fp_rate: fp,
          params: {
            camera_weight: +(s.params.camera_weight + jitter()).toFixed(2),
            fusion_threshold: +(s.params.fusion_threshold + jitter() * 0.5).toFixed(2),
            thermal_only_threshold: +(s.params.thermal_only_threshold + jitter() * 0.5).toFixed(2),
          },
        }
      })
      const per = Object.fromEntries(next.map(s => [s.id, s.fp_rate])) as Record<StationId, number>
      setStations(next)
      setHistory(h => [...h, { round: h[h.length - 1].round + 1, fp_rate: next.reduce((a, s) => a + s.fp_rate, 0) / next.length, per_station: per }])
      setDrawKey(k => k + 1)
      setRunning(false)
    }, 2200)
  }

  const params = useMemo(() => [
    ['Camera weight', 'camera_weight'],
    ['Fusion threshold', 'fusion_threshold'],
    ['Thermal-only threshold', 'thermal_only_threshold'],
  ] as const, [])

  return (
    <section id="federation" className="fw-section px-5 py-[14vh] md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Kicker n="03">Federated learning</Kicker>
            <h2 className="fw-h2 mt-6">
              <span className="block"><Split>Stations learn together.</Split></span>
              <span className="block"><Split className="serif ember-text">Images stay home.</Split></span>
            </h2>
          </div>
          <p className="fw-lead max-w-[520px] lg:justify-self-end" data-fade>
            Every Dispatch or False alarm becomes a label at that station. Each round, Flower averages only the tuned
            settings across stations, and false alarms drop for everyone.
          </p>
        </div>

        {/* headline strip */}
        <div className="fw-panel mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5" data-fade>
          <div className="flex items-baseline gap-3 text-[clamp(20px,2.2vw,30px)] font-medium tracking-[-0.02em]">
            <span>Round <span className="mono">{round}</span></span>
            <span className="text-[var(--ash-3)]">·</span>
            <span>{stations.length} stations</span>
            <span className="text-[var(--ash-3)]">·</span>
            <span>false alarms <span className="text-[var(--ash-2)]">{pct(first)}</span> → <span className="ember-text font-semibold">{pct(now)}</span></span>
          </div>
          <button className="fw-btn fw-btn--ember ml-auto !px-6 !py-3 !text-[15px] disabled:opacity-80" onClick={runRound} disabled={running} data-magnetic>
            {running ? <span className="fw-spinner" /> : <Play size={16} fill="currentColor" />}
            {running ? 'Running round…' : 'Run federated round'}
          </button>
        </div>

        {/* station cards */}
        <div ref={barsRef} className="mt-5 grid gap-5 md:grid-cols-3">
          {stations.map((s, i) => (
            <article key={s.id} className="fw-panel fw-panel--hover fw-spot p-6" data-fade data-delay={i * 0.1} data-tilt>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="fw-live" />
                  <h3 className="text-[20px] font-medium tracking-[-0.02em]">{s.name}</h3>
                </div>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--ash-3)]">online</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[12px] text-[var(--ash-3)]">Labels collected</div>
                  <div className="mt-1 text-[34px] font-semibold tracking-[-0.03em]">{s.labels}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[var(--ash-3)]">False-alarm rate</div>
                  <div className="mt-1 text-[34px] font-semibold tracking-[-0.03em]" style={{ color: COLORS[s.id] }}>{pct(s.fp_rate)}</div>
                </div>
              </div>
              <div className="mt-6 space-y-3.5">
                {params.map(([label, key]) => (
                  <div key={key}>
                    <div className="mb-1.5 flex justify-between text-[12px]">
                      <span className="text-[var(--ash-2)]">{label}</span>
                      <span className="mono text-[var(--ash)]">{s.params[key].toFixed(2)}</span>
                    </div>
                    <div className="fw-bar"><i style={{ width: `${s.params[key] * 100}%`, transition: 'width 1s cubic-bezier(0.2,0.8,0.2,1)' }} /></div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* the money shot */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[2.2fr_1fr]">
          <div className="fw-panel p-6 md:p-8" data-fade>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[13px] text-[var(--ash-3)]">False-alarm rate by round</div>
                <div className="mt-1 text-[22px] font-medium tracking-[-0.02em]">Every round, fewer wasted engine runs</div>
              </div>
              <div className="flex flex-wrap gap-4 text-[12px] text-[var(--ash-2)]">
                <span className="flex items-center gap-2"><i className="h-[3px] w-5 rounded bg-white" /> Global</span>
                {stations.map(s => (
                  <span key={s.id} className="flex items-center gap-2"><i className="h-[2px] w-5 rounded" style={{ background: COLORS[s.id] }} /> {s.name}</span>
                ))}
              </div>
            </div>
            <Chart history={history} drawKey={drawKey} />
          </div>
          <div className="fw-panel flex flex-col p-6" data-fade data-delay={0.15}>
            <div className="text-[13px] text-[var(--ash-3)]">What leaves a station</div>
            <FlowDiagram running={running} />
            <div className="mt-auto flex gap-3 rounded-xl border border-[var(--line)] bg-white/[0.02] p-4 text-[14px] leading-relaxed text-[var(--ash-2)]">
              <Lock size={16} className="mt-0.5 shrink-0 text-[var(--flame)]" />
              <span>Only settings and label counts leave each station; camera images never do.</span>
            </div>
          </div>
        </div>
        <p className="mono mt-4 text-[11px] text-[var(--ash-3)]">Illustrative data matching the /api/federation/status shape. Rounds run here are simulated in the browser.</p>
      </div>
    </section>
  )
}
