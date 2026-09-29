import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { Hud, TowerLock } from './HeroFx'
import { Logo } from './bits'

const NAV = [
  ['Signals', '#signals'],
  ['Pipeline', '#pipeline'],
  ['Federation', '#federation'],
  ['Dispatch', '#dispatch'],
] as const

export function Nav({ onJump }: { onJump: (hash: string) => void }) {
  const navigate = useNavigate()
  return (
    <nav className="fw-nav" data-nav>
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5 md:px-8">
        <a href="#top" onClick={e => { e.preventDefault(); onJump('#top') }} aria-label="FireWatch home">
          <Logo />
        </a>
        <div className="hidden items-center gap-8 text-[13px] lg:flex">
          {NAV.map(([label, hash]) => (
            <a key={hash} href={hash} className="fw-link" onClick={e => { e.preventDefault(); onJump(hash) }}>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <a className="fw-link hidden text-[13px] sm:inline" href="https://github.com/zaf-07/FireWatch" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <button className="fw-btn fw-btn--amber flex items-center gap-1.5" onClick={() => navigate('/dashboard')}>
            <span>Launch Live Map</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}

const PROMPTS = [
  'Is that smoke above the Oakland Hills?',
  'Scan 37.634, -119.622',
  'Spread risk on San Bruno tonight?',
  'Check the Tahoe camera at 38.9, -120.0',
]

function useTypewriter(lines: string[]) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(lines[0])
      return
    }
    let line = 0
    let i = 0
    let deleting = false
    let timer: number
    const step = () => {
      const full = lines[line]
      if (!deleting) {
        i++
        setText(full.slice(0, i))
        if (i === full.length) {
          deleting = true
          timer = window.setTimeout(step, 2600)
          return
        }
        timer = window.setTimeout(step, 34 + Math.random() * 40)
      } else {
        i -= 2
        setText(full.slice(0, Math.max(0, i)))
        if (i <= 0) {
          deleting = false
          line = (line + 1) % lines.length
          timer = window.setTimeout(step, 380)
          return
        }
        timer = window.setTimeout(step, 14)
      }
    }
    timer = window.setTimeout(step, 1600)
    return () => window.clearTimeout(timer)
  }, [lines])
  return text
}

const CHIPS = [
  'Oakland Hills spread risk',
  'Smoke on San Bruno?',
  'Yosemite FIRMS hotspot',
]

/** Full-bleed 4K Golden Gate plate with the console's viewfinder chrome over it. */
export function HeroBackdrop({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // 4K only on wide, high-DPI displays; 1080p everywhere else. Sources are set here so
    // we never fetch both, and a data-saver connection keeps the poster alone.
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const wide = window.matchMedia('(min-width: 1600px)').matches && (window.devicePixelRatio || 1) > 1.2
    v.src = wide ? '/video/ggb-2160.mp4' : '/video/ggb-1080.mp4'
    v.load()
    const onReady = () => setLoaded(true)
    if (v.readyState >= 3) onReady()
    v.addEventListener('canplay', onReady)
    v.addEventListener('loadeddata', onReady)
    v.play().catch(() => {})
    return () => {
      v.removeEventListener('canplay', onReady)
      v.removeEventListener('loadeddata', onReady)
    }
  }, [videoRef])

  return (
    <div ref={frameRef} className="fw-plate" data-hero-plate>
      <video
        ref={videoRef}
        className="fw-plate__video"
        style={{ opacity: loaded ? 1 : 0 }}
        poster="/video/ggb-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />
      <div
        className="fw-plate__poster"
        style={{ opacity: loaded ? 0 : 1, backgroundImage: 'url(/video/ggb-poster.jpg)' }}
      />
      <div className="fw-plate__scrim" />
      <div className="fw-plate__pass" />
      <TowerLock video={videoRef} frame={frameRef} />
      <Hud video={videoRef} />
    </div>
  )
}

export default function Hero() {
  const navigate = useNavigate()
  const placeholder = useTypewriter(PROMPTS)
  const [query, setQuery] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate('/dashboard', { state: { query } })
  }

  return (
    <section id="top" className="fw-section relative flex min-h-[100svh] flex-col px-5 pt-[clamp(120px,17vh,190px)] md:px-8">
      {/* the bridge owns the left of the frame, so the copy takes the right half */}
      <div className="mx-auto grid w-full max-w-[1240px] xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <div className="hidden xl:block" aria-hidden />
        <div className="max-w-[560px]">
          <div className="flex items-center gap-2.5" data-hero>
            <span className="fw-dot fw-dot--ok" />
            <span className="lbl">NASA FIRMS + Live Optical CCTV Radar Engine</span>
          </div>

          <h1 className="mt-5 text-[clamp(36px,4.4vw,58px)] font-medium leading-[1.04] tracking-[-0.035em] [text-shadow:0_2px_30px_rgba(0,0,0,0.6)]">
            <span className="block" data-hero-line>
              Real-Time Telemetry.
            </span>
            <span className="block" data-hero-line>
              Tactical Radar Twin.
            </span>
            <span className="block text-[#ff9d42]" data-hero-line>
              Zero Latency Defense.
            </span>
          </h1>

          <p className="fw-lead mt-6 max-w-[540px] [text-shadow:0_1px_16px_rgba(0,0,0,0.7)]" data-hero>
            FireWatch fuses live orbital NASA FIRMS radiometry with real-time Caltrans traffic CCTV and weather telemetry directly into tactical incident command centers.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3" data-hero>
            <button
              onClick={() => navigate('/dashboard')}
              className="fw-btn fw-btn--amber flex items-center gap-2 !px-6 !py-3.5 text-[14px]"
            >
              <span>Launch Tactical Map</span>
              <ArrowRight size={16} />
            </button>
            <a
              href="#pipeline"
              className="fw-btn fw-btn--ghost !px-5 !py-3.5 text-[14px]"
            >
              System Specs
            </a>
          </div>

          <form onSubmit={submit} className="fw-ask mt-6" data-hero>
            <Search size={15} className="shrink-0 text-[var(--txt-3)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder || ' '}
              aria-label="Ask FireWatch about a location"
            />
            <button type="submit" className="fw-ask__send" aria-label="Open in the dispatch console">
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2" data-hero>
            {CHIPS.map(c => (
              <button
                key={c}
                className="fw-chip"
                onClick={() => navigate('/dashboard', { state: { query: c } })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* reads like the console's own status bar, because it is the same three facts */}
      <div className="mt-auto border-t border-[rgba(255,255,255,0.12)]" data-hero>
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-7 gap-y-2 py-3.5">
          {[
            ['ok', 'Sources', 'Camera · satellite · weather'],
            ['ok', 'Agents', 'Eight per run, timed'],
            ['amber', 'Dispatch', 'Never without a human'],
          ].map(([dot, k, v]) => (
            <span key={k} className="flex items-center gap-2">
              <span className={`fw-dot fw-dot--${dot}`} />
              <span className="lbl">{k}</span>
              <span className="mono text-[11px] text-[var(--txt-2)]">{v}</span>
            </span>
          ))}
          <span className="mono ml-auto hidden text-[11px] tracking-[0.12em] text-[var(--txt-3)] lg:block">
            37.8199° N · 122.4783° W
          </span>
        </div>
      </div>
    </section>
  )
}
