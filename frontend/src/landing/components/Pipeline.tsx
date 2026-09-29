import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Brain, Camera, ClipboardList, CloudSun, GitMerge, Satellite, Siren, UserCheck } from 'lucide-react'
import { Kicker, Split } from './bits'

gsap.registerPlugin(ScrollTrigger)

type Chip = {
  n: number
  title: string
  icon: typeof Camera
  latency?: number
  badge?: 'llm' | 'rules'
  body: (dismissed: boolean) => ReactNode
}

const Row = ({ k, v, accent }: { k: string; v: ReactNode; accent?: boolean }) => (
  <div className="flex items-baseline justify-between gap-2 text-[12px]">
    <span className="text-[var(--ash-3)]">{k}</span>
    <span className={`mono truncate ${accent ? 'text-[var(--flame)]' : 'text-[var(--ash)]'}`}>{v}</span>
  </div>
)

const PARALLEL: Chip[] = [
  { n: 1, title: 'Camera', icon: Camera, latency: 412, body: d => <><Row k="confidence" v={d ? '41%' : '87%'} accent /><Row k="camera" v="Tahoe · Heavenly" /></> },
  { n: 2, title: 'Satellite', icon: Satellite, latency: 690, body: d => <><Row k="thermal" v={d ? '8%' : '72%'} accent /><Row k="hotspot" v={d ? 'no' : 'yes'} /></> },
  { n: 3, title: 'Weather', icon: CloudSun, latency: 184, body: () => <><Row k="wind · RH" v="7.2 m/s · 18%" /><Row k="spread risk" v="high" accent /></> },
]

const SERIAL: Chip[] = [
  {
    n: 4, title: 'Fusion', icon: GitMerge,
    body: d => (
      <>
        <div className={`text-[15px] font-semibold tracking-tight ${d ? 'text-[var(--ash-2)]' : 'text-[var(--flame)]'}`}>{d ? 'DISMISSED' : 'CONFIRMED'}</div>
        <Row k="combined" v={d ? '0.29' : '0.81'} />
      </>
    ),
  },
  { n: 5, title: 'Reasoning', icon: Brain, badge: 'llm', body: () => <p className="line-clamp-3 text-[12px] leading-snug text-[var(--ash-2)]">Grey-white plume rising from a forested ridge north-east of the camera.</p> },
  { n: 6, title: 'Severity', icon: Siren, badge: 'llm', body: () => <div className="mt-1 inline-flex rounded-md border border-[#ff7a1a66] bg-[#ff7a1a1f] px-2 py-0.5 text-[13px] font-semibold tracking-wide text-[#ff9a4a]">HIGH</div> },
  { n: 7, title: 'Plan', icon: ClipboardList, badge: 'rules', body: () => <p className="line-clamp-3 text-[12px] leading-snug text-[var(--ash-2)]">Send the nearest engine for size-up; notify the duty chief.</p> },
  { n: 8, title: 'Human', icon: UserCheck, body: () => <div className="mt-1 flex items-center gap-2 text-[13px]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flame)]" />Awaiting dispatcher</div> },
]

function StepChip({ chip, on, current, skipped, dismissed }: { chip: Chip; on: boolean; current: boolean; skipped: boolean; dismissed: boolean }) {
  const Icon = chip.icon
  return (
    <div className={`fw-step ${on && !skipped ? 'is-on' : ''} ${current && !skipped ? 'is-current' : ''} ${skipped && on ? 'grayscale' : ''}`} style={skipped && on ? { opacity: 0.45, transform: 'none' } : undefined}>
      <div className="flex items-center justify-between">
        <span className="fw-step__num">0{chip.n}</span>
        {skipped && on ? (
          <span className="fw-badge fw-badge--rules">skipped</span>
        ) : chip.latency ? (
          <span className="mono text-[10px] text-[var(--ash-3)]">{chip.latency} ms</span>
        ) : chip.badge ? (
          <span className={`fw-badge fw-badge--${chip.badge}`}>{chip.badge === 'llm' ? 'LLM' : 'rules'}</span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Icon size={15} className={on && !skipped ? 'text-[var(--flame)]' : 'text-[var(--ash-3)]'} />
        <span className="text-[15px] font-medium tracking-[-0.01em]">{chip.title}</span>
      </div>
      <div className="mt-2 space-y-1">{skipped ? <p className="text-[12px] text-[var(--ash-3)]">Fusion dismissed the alert; nothing downstream runs.</p> : chip.body(dismissed)}</div>
    </div>
  )
}

function Arrow({ on }: { on: boolean }) {
  return (
    <div className="fw-arrow mx-1 w-5 shrink-0 self-center xl:w-7">
      <i style={{ transform: `scaleX(${on ? 1 : 0})`, transition: 'transform 0.6s cubic-bezier(0.2,0.8,0.2,1)' }} />
    </div>
  )
}

const CAPTIONS = [
  'Pick a location, then run the analysis.',
  'Camera, satellite and weather agents run in parallel, each timed.',
  'Camera, satellite and weather agents run in parallel, each timed.',
  'Camera, satellite and weather agents run in parallel, each timed.',
  'Fusion weighs the three signals. Below the threshold, the alert is dismissed right here.',
  'An LLM describes what the camera actually sees, in plain words.',
  'Severity is classified: LOW, MEDIUM, HIGH or CRITICAL.',
  'A plan is drafted: the alert message and the first action to take.',
  'A dispatcher approves or rejects. Nothing is sent without a human.',
]

export default function Pipeline() {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => setStep(Math.min(8, Math.floor(self.progress * 10.2))),
    })
    return () => st.kill()
  }, [])

  // steps 1-3 light together; after that, one per scroll beat
  const active = step >= 1 ? Math.max(3, step) : 0
  const lit = (n: number) => active >= n
  const skipped = (n: number) => dismissed && n >= 5

  return (
    <section id="pipeline" ref={ref} className="fw-section relative h-[340vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center px-5 pt-[76px] md:px-10">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Kicker n="02">Agent pipeline</Kicker>
              <h2 className="fw-h2 mt-5 max-w-[760px]">
                <span className="block"><Split>Eight agents.</Split></span>
                <span className="block">
                  <Split className="serif ember-text">Seconds,</Split>{' '}
                  <Split>not minutes.</Split>
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-black/30 p-1 text-[12px] backdrop-blur" data-fade>
              {(['Confirmed run', 'Dismissed run'] as const).map((l, i) => (
                <button
                  key={l}
                  onClick={() => setDismissed(i === 1)}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${dismissed === (i === 1) ? 'bg-[var(--ash)] text-black' : 'text-[var(--ash-2)] hover:text-[var(--ash)]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="fw-panel mt-10 overflow-x-auto p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-5 text-[13px]">
              <span className="mono rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--ash-2)]">38.9000, -120.0000</span>
              <span className="mono rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--ash-2)]">nearest live camera</span>
              <span className={`ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors ${step >= 1 ? 'bg-[var(--ember)] text-black' : 'bg-white/10 text-[var(--ash-2)]'}`}>
                {step >= 1 && step < 8 && <span className="fw-spinner" />}
                {step >= 8 ? 'Analysis complete' : step >= 1 ? 'Running analysis' : 'Run Analysis'}
              </span>
            </div>

            <div className="flex min-w-[1120px] items-stretch">
              <div className="flex w-[196px] shrink-0 flex-col gap-2.5">
                {PARALLEL.map(c => (
                  <StepChip key={c.n} chip={c} on={lit(c.n)} current={active === 3} skipped={false} dismissed={dismissed} />
                ))}
              </div>
              {SERIAL.map(c => (
                <div key={c.n} className="flex flex-1 items-stretch">
                  <Arrow on={lit(c.n)} />
                  <div className="flex-1 self-center">
                    <StepChip chip={c} on={lit(c.n)} current={active === c.n} skipped={skipped(c.n)} dismissed={dismissed} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-6">
            <p key={step} className="fw-lead max-w-[640px] animate-[fw-caption_0.6s_ease]">
              {dismissed && step >= 5 ? 'Fusion dismissed this one, so reasoning, severity, plan and human review are skipped.' : CAPTIONS[step]}
            </p>
            <div className="mono hidden text-[11px] text-[var(--ash-3)] md:block">
              step {Math.max(step, 0)}/8 · illustrative run
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes fw-caption { from { opacity: 0; transform: translateY(8px); filter: blur(4px); } }`}</style>
    </section>
  )
}
