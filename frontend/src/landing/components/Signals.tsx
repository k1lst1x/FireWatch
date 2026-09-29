import { Camera, CloudSun, Satellite } from 'lucide-react'
import { Kicker, PanelHead, Split } from './bits'

const SOURCES = [
  'ALERTWest camera network', 'UC San Diego', 'NASA FIRMS', 'Live weather',
  'Flower federated learning', 'LLM scene reasoning', 'Human-in-the-loop dispatch',
]

export function Marquee() {
  const row = (
    <div className="fw-marquee__track">
      {SOURCES.map(s => (
        <span key={s} className="lbl flex items-center gap-11 whitespace-nowrap">
          {s}
          <span className="h-1 w-1 rounded-full bg-[var(--amber)]" />
        </span>
      ))}
    </div>
  )
  return (
    <div className="fw-section fw-rule border-b border-[var(--line)] py-4">
      <div className="fw-marquee">{row}{row}</div>
    </div>
  )
}

function CameraVisual() {
  return (
    <div className="fw-view">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 45% at 62% 60%, rgba(217,119,6,0.28), transparent 62%), linear-gradient(180deg, #12131a 0%, #1d1713 55%, #0a090b 56%, #070709 100%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="none">
        <path d="M0 56 L22 45 L40 51 L62 36 L84 47 L104 40 L130 53 L160 43 L160 90 L0 90Z" fill="#09080a" />
        <g opacity="0.7">
          <ellipse cx="100" cy="33" rx="11" ry="8" fill="#332c2c">
            <animate attributeName="cy" values="36;27;36" dur="6s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="94" cy="20" rx="15" ry="9" fill="#262224">
            <animate attributeName="cx" values="96;88;96" dur="7s" repeatCount="indefinite" />
          </ellipse>
        </g>
        <circle cx="102" cy="43" r="2" fill="#f59e0b" />
      </svg>
      <div className="fw-view__scan" />
      <span className="fw-bbox" style={{ left: '56%', top: '30%', width: '22%', height: '30%' }} />
      <div className="lbl absolute bottom-2 left-2.5">Smoke 0.87</div>
    </div>
  )
}

function SatelliteVisual() {
  const spots = [[30, 38], [44, 60], [66, 34], [72, 64], [52, 48]]
  return (
    <div className="fw-view" style={{ background: 'radial-gradient(circle at 50% 50%, #121318, #070709 72%)' }}>
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 160 90" preserveAspectRatio="none">
        <path d="M22 12 C40 18 44 36 58 47 S 86 72 120 83" stroke="#f59e0b" strokeOpacity="0.4" fill="none" strokeDasharray="2 3" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="90" stroke="#fff" strokeOpacity="0.05" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="160" y2={i * 20} stroke="#fff" strokeOpacity="0.05" />
        ))}
      </svg>
      {spots.map(([x, y], i) => (
        <span key={i} className="fw-hot" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.35}s` }} />
      ))}
      <div className="fw-orbit" />
      <div className="fw-sat">
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 text-[var(--amber-hi)]">
          <Satellite size={14} />
        </span>
      </div>
      <div className="lbl absolute bottom-2 left-2.5">VIIRS · FRP 38.4 MW</div>
    </div>
  )
}

function WeatherVisual() {
  return (
    <div className="fw-view" style={{ background: 'linear-gradient(160deg, #0e0f14, #08080b)' }}>
      <svg className="fw-wind absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="none">
        {[16, 31, 45, 59, 74].map((y, i) => (
          <line
            key={y}
            x1="-10" y1={y} x2="170" y2={y - 12}
            stroke="#f59e0b" strokeOpacity={0.14 + i * 0.05} strokeWidth="1"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid grid-cols-3 items-end gap-2 p-3.5">
        {[
          ['Wind', '11.2', 'm/s'],
          ['Humidity', '14', '%'],
          ['Spread', 'HIGH', ''],
        ].map(([k, v, u]) => (
          <div key={k}>
            <div className="lbl">{k}</div>
            <div className={`mono mt-0.5 text-[17px] ${k === 'Spread' ? 'text-[var(--amber-hi)]' : 'text-[var(--txt)]'}`}>
              {v}<span className="ml-0.5 text-[10px] text-[var(--txt-3)]">{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CARDS = [
  {
    icon: Camera, title: 'Camera', tag: 'ALERTWest · UCSD', visual: CameraVisual,
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
    <section id="signals" className="fw-section px-5 py-[13vh] md:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <Kicker n="01">Three signals</Kicker>
            <h2 className="fw-h2 mt-5">
              <span className="block"><Split>Three signals.</Split></span>
              <span className="block"><Split>One call.</Split></span>
            </h2>
          </div>
          <p className="fw-lead max-w-[480px] lg:justify-self-end" data-fade>
            A camera alone cries wolf at fog, dust and sunsets. FireWatch checks every sighting against what the
            satellite sees and what the wind is doing before it ever reaches a dispatcher.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, tag, body, visual: Visual }, i) => (
            <article key={title} className="fw-panel fw-panel--hover overflow-hidden" data-fade data-delay={i * 0.1}>
              <PanelHead title={tag} meta={<Icon size={13} className="text-[var(--amber-hi)]" />} />
              <Visual />
              <div className="p-4">
                <h3 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--txt-2)]">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
