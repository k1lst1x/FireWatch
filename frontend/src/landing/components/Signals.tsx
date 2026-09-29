import { Camera, CloudSun, Satellite } from 'lucide-react'
import { Kicker, Split } from './bits'

const SOURCES = [
  'ALERTWest camera network', 'UC San Diego', 'NASA FIRMS', 'Live weather', 'Flower federated learning',
  'LLM scene reasoning', 'Human-in-the-loop dispatch',
]

export function Marquee() {
  const row = (
    <div className="fw-marquee__track">
      {SOURCES.map(s => (
        <span key={s} className="flex items-center gap-14 whitespace-nowrap text-[15px] text-[var(--ash-3)]">
          {s}
          <span className="text-[var(--ember)]">✦</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="fw-section border-y border-[var(--line)] bg-[rgba(5,6,10,0.55)] py-5 backdrop-blur-md">
      <div className="fw-marquee">{row}{row}</div>
    </div>
  )
}

function CameraVisual() {
  return (
    <div className="fw-viewfinder">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 62% 58%, rgba(255,120,40,0.35), transparent 60%), linear-gradient(180deg, #151822 0%, #221a1a 55%, #0c0b0d 56%, #070709 100%)',
        }}
      />
      {/* ridge line + smoke plume */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <path d="M0 62 L22 50 L40 56 L62 40 L84 52 L104 44 L130 58 L160 48 L160 100 L0 100Z" fill="#0b0a0c" />
        <g opacity="0.75">
          <ellipse cx="100" cy="36" rx="12" ry="9" fill="#3a3131">
            <animate attributeName="cy" values="40;30;40" dur="6s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="94" cy="22" rx="16" ry="10" fill="#2a2426">
            <animate attributeName="cx" values="96;88;96" dur="7s" repeatCount="indefinite" />
          </ellipse>
        </g>
        <circle cx="102" cy="47" r="2.2" fill="#ffb347" />
      </svg>
      <div className="fw-viewfinder__scan" />
      <div className="fw-bbox" style={{ left: '50%', top: '14%', width: '30%', height: '40%' }}>
        <span className="mono absolute -top-5 left-0 rounded bg-[var(--ember)] px-1.5 text-[9px] font-medium text-black">SMOKE 0.87</span>
      </div>
      <div className="mono absolute bottom-2 left-2.5 flex items-center gap-1.5 text-[9px] text-white/60">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> REC · ALERTWest
      </div>
      <div className="mono absolute right-2.5 top-2 text-[9px] text-white/50">PTZ 214°</div>
    </div>
  )
}

function SatelliteVisual() {
  const spots = [[30, 38], [44, 60], [66, 34], [72, 64], [52, 48]]
  return (
    <div className="fw-viewfinder" style={{ background: 'radial-gradient(circle at 50% 50%, #141824, #07080d 70%)' }}>
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 160 100" preserveAspectRatio="none">
        <path d="M22 14 C40 20 44 40 58 52 S 86 80 120 92" stroke="#ffb347" strokeOpacity="0.5" fill="none" strokeDasharray="2 3" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={i * 20} y1="0" x2={i * 20} y2="100" stroke="#fff" strokeOpacity="0.06" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={i} x1="0" y1={i * 20} x2="160" y2={i * 20} stroke="#fff" strokeOpacity="0.06" />
        ))}
      </svg>
      {spots.map(([x, y], i) => (
        <span key={i} className="fw-hot" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.35}s` }} />
      ))}
      <div className="fw-orbit" />
      <div className="fw-sat">
        <div className="absolute left-1/2 top-[8%] -translate-x-1/2 -translate-y-1/2 text-[var(--flame)]">
          <Satellite size={16} />
        </div>
      </div>
      <div className="mono absolute bottom-2 left-2.5 text-[9px] text-white/55">VIIRS · FRP 38.4 MW</div>
    </div>
  )
}

function WeatherVisual() {
  return (
    <div className="fw-viewfinder" style={{ background: 'linear-gradient(160deg, #10131c, #0a0a10)' }}>
      <svg className="fw-wind absolute inset-0 h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        {[18, 34, 50, 66, 82].map((y, i) => (
          <line key={y} x1="-10" y1={y} x2="170" y2={y - 14} stroke="#ffb347" strokeOpacity={0.18 + i * 0.07} strokeWidth="1.2" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </svg>
      <div className="absolute inset-0 grid grid-cols-3 items-end gap-3 p-4">
        {[
          ['Wind', '11.2', 'm/s'],
          ['Humidity', '14', '%'],
          ['Spread', 'HIGH', ''],
        ].map(([k, v, u]) => (
          <div key={k}>
            <div className="mono text-[9px] uppercase tracking-wider text-white/45">{k}</div>
            <div className={`text-[20px] font-semibold tracking-tight ${k === 'Spread' ? 'text-[var(--ember)]' : ''}`}>
              {v}<span className="ml-0.5 text-[11px] text-white/50">{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CARDS = [
  {
    icon: Camera, title: 'Camera', tag: 'ALERTWest · UC San Diego', visual: CameraVisual,
    body: 'The nearest live mountaintop camera is pulled automatically and a smoke detector scores the frame.',
  },
  {
    icon: Satellite, title: 'Satellite', tag: 'NASA FIRMS', visual: SatelliteVisual,
    body: 'Thermal hotspots from orbit confirm heat on the ground, even when smoke hides the flames.',
  },
  {
    icon: CloudSun, title: 'Weather', tag: 'Wind · humidity', visual: WeatherVisual,
    body: 'Wind speed and humidity become a spread-risk score, so a small fire on a windy night ranks higher.',
  },
]

export default function Signals() {
  return (
    <section id="signals" className="fw-section px-5 py-[14vh] md:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Kicker n="01">Three signals</Kicker>
            <h2 className="fw-h2 mt-6">
              <span className="block"><Split>Three signals.</Split></span>
              <span className="block"><Split className="serif ember-text">One call.</Split></span>
            </h2>
          </div>
          <p className="fw-lead max-w-[520px] lg:justify-self-end" data-fade>
            A camera alone cries wolf at fog, dust and sunsets. FireWatch checks every sighting against what the
            satellite sees and what the wind is doing before it ever reaches a dispatcher.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, tag, body, visual: Visual }, i) => (
            <article key={title} className="fw-panel fw-panel--hover fw-spot p-5" data-fade data-delay={i * 0.12} data-tilt>
              <Visual />
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white/[0.03] text-[var(--flame)]">
                    <Icon size={17} />
                  </span>
                  <h3 className="text-[20px] font-medium tracking-[-0.02em]">{title}</h3>
                </div>
                <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--ash-3)]">{tag}</span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ash-2)]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
