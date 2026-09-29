import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Embers, Hud, VideoMarkers } from './HeroFx'
import { Logo } from './bits'

const NAV = [
  ['Signals', '#signals'],
  ['Agent pipeline', '#pipeline'],
  ['Federation', '#federation'],
  ['Dispatch', '#dispatch'],
] as const

export function Nav({ onJump }: { onJump: (hash: string) => void }) {
  const navigate = useNavigate()
  return (
    <nav className="fw-nav" data-nav>
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-6 md:px-10">
        <a href="#top" onClick={e => { e.preventDefault(); onJump('#top') }} aria-label="FireWatch home">
          <Logo />
        </a>
        <div className="hidden items-center gap-9 text-[14px] lg:flex">
          {NAV.map(([label, hash]) => (
            <a key={hash} href={hash} className="fw-link" onClick={e => { e.preventDefault(); onJump(hash) }}>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a className="fw-link hidden text-[14px] text-[var(--ash-2)] hover:text-[var(--ash)] sm:inline" href="https://github.com/zaf-07/FireWatch" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <button className="fw-btn fw-btn--light text-[14px]" data-magnetic onClick={() => navigate('/login')}>
            Open Dispatch Console
          </button>
        </div>
      </div>
    </nav>
  )
}

const PROMPTS = [
  'Is that smoke above the Oakland Hills?',
  'Scan 37.634, -119.622 — Yosemite FIRMS hotspot',
  'What is the spread risk on San Bruno Mountain tonight?',
  'Check the Tahoe live camera at 38.9, -120.0',
]

function useTypewriter(lines: string[]) {
  const [text, setText] = useState('')
  useEffect(() => {
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
          timer = window.setTimeout(step, 2400)
          return
        }
        timer = window.setTimeout(step, 36 + Math.random() * 44)
      } else {
        i -= 2
        setText(full.slice(0, Math.max(0, i)))
        if (i <= 0) {
          deleting = false
          line = (line + 1) % lines.length
          timer = window.setTimeout(step, 400)
          return
        }
        timer = window.setTimeout(step, 16)
      }
    }
    timer = window.setTimeout(step, 1800)
    return () => window.clearTimeout(timer)
  }, [lines])
  return text
}

const CHIPS = [
  { id: 'oakland', label: 'Oakland Hills spread risk', color: '#ff3b2f' },
  { id: 'sanbruno', label: 'Smoke on San Bruno Mountain?', color: '#ff7a1a' },
  { id: 'yosemite', label: 'Yosemite FIRMS hotspot', color: '#ffb020' },
]

/** Full-bleed 4K San Francisco drone plate: video, ember field, tracked incident markers, HUD. */
export function HeroBackdrop({ videoRef, active }: { videoRef: RefObject<HTMLVideoElement | null>; active: string | null }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // 4K on wide, high-dpi displays; 1080p everywhere else. Sources are set here so we
    // never download both, and so a data-saver connection keeps the poster only.
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const wide = window.matchMedia('(min-width: 1600px)').matches && (window.devicePixelRatio || 1) > 1.2
    v.src = wide ? '/video/sf-flyover-2160.mp4' : '/video/sf-flyover-1080.mp4'
    v.load()
    const onReady = () => setLoaded(true)
    // readyState may already be past HAVE_FUTURE_DATA by the time we subscribe
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
        poster="/video/sf-flyover-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />
      <div className="fw-plate__poster" style={{ opacity: loaded ? 0 : 1, backgroundImage: 'url(/video/sf-flyover-poster.jpg)' }} />
      <div className="fw-plate__smoke" />
      <div className="fw-plate__sweep" />
      <div className="fw-plate__heat" />
      <Embers />
      <VideoMarkers video={videoRef} frame={frameRef} active={active} />
      <div className="fw-plate__grade" />
      <div className="fw-plate__scrim" />
      <Hud />
    </div>
  )
}

export default function Hero({ focused, onFocus }: { focused: string | null; onFocus: (id: string | null) => void }) {
  const navigate = useNavigate()
  const placeholder = useTypewriter(PROMPTS)
  const [query, setQuery] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate('/login', { state: { query } })
  }

  return (
    <section id="top" className="fw-section relative flex min-h-[100svh] flex-col items-center px-5 pt-[clamp(118px,17vh,180px)] text-center">
      <div className="fw-kicker mb-6 flex items-center justify-center gap-2.5 text-[11px] text-[var(--ash-2)]" data-hero>
        <span className="fw-live hidden shrink-0 sm:block" /> AI wildfire dispatch · San Francisco Bay Area
      </div>
      <h1 className="text-[clamp(46px,7.4vw,112px)] font-semibold leading-[0.96] tracking-[-0.045em] [text-shadow:0_4px_40px_rgba(0,0,0,0.5)]">
        <span className="block" data-hero-line>Every spark, seen</span>
        <span className="block pb-2" data-hero-line>
          <span className="ember-text">before it </span>
          <span className="serif ember-text pr-2">spreads.</span>
        </span>
      </h1>
      <p className="fw-lead mt-6 max-w-[620px] [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]" data-hero>
        FireWatch fuses live ALERTWest cameras, NASA FIRMS satellite hotspots and weather into one dispatch-ready call,
        and gets sharper every time a dispatcher says yes or no.
      </p>

      <form onSubmit={submit} className="fw-ask mt-9" data-hero>
        <Sparkles size={18} className="shrink-0 text-[var(--flame)]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder || ' '}
          aria-label="Ask FireWatch about a location"
        />
        <button type="submit" className="fw-ask__send" aria-label="Open in the dispatch console">
          <ArrowUpRight size={20} strokeWidth={2.4} />
        </button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2.5" data-hero>
        {CHIPS.map(c => (
          <button
            key={c.id}
            className={`fw-chip ${focused === c.id ? 'is-active' : ''}`}
            onMouseEnter={() => onFocus(c.id)}
            onMouseLeave={() => onFocus(null)}
            onClick={() => navigate('/login', { state: { query: c.label } })}
          >
            <span className="dot" style={{ background: c.color, color: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-auto flex w-full max-w-[1320px] items-end justify-center gap-6 pb-10 pt-16" data-hero>
        <button className="group flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[var(--ash-3)] transition-colors hover:text-[var(--ash)]" onClick={() => document.getElementById('signals')?.scrollIntoView()}>
          Scroll
          <span className="relative block h-10 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[fw-scan_1.8s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-[var(--ember)] to-transparent" />
          </span>
        </button>
      </div>
    </section>
  )
}
