import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react'
import { Kicker, Logo, Mark, Split } from './bits'

type Decision = 'pending' | 'approve' | 'reject'

export function Dispatch() {
  const [decision, setDecision] = useState<Decision>('pending')

  return (
    <section id="dispatch" className="fw-section px-5 py-[13vh] md:px-8">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Kicker n="04">Human in the loop</Kicker>
          <h2 className="fw-h2 mt-6">
            <span className="block"><Split>A human makes</Split></span>
            <span className="block"><Split className="">the final call.</Split></span>
          </h2>
          <p className="fw-lead mt-7 max-w-[520px]" data-fade>
            FireWatch never rolls an engine on its own. The dispatcher sees the evidence and the plan, then presses
            one button, and that decision becomes training signal for the next federated round.
          </p>
          <div className="mt-10 grid max-w-[520px] grid-cols-3 gap-4" data-fade>
            {[
              ['8', 'agents per alert'],
              ['3', 'independent signals'],
              ['0', 'images shared'],
            ].map(([n, l]) => (
              <div key={l} className="border-l border-[var(--line-2)] pl-4">
                <div className="mono text-[32px] tracking-[-0.03em]" data-count={n}>{n}</div>
                <div className="text-[13px] text-[var(--txt-3)]">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="fw-panel overflow-hidden" data-fade>
          <div className="relative aspect-[16/8] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(40% 55% at 64% 70%, rgba(255,110,30,0.55), transparent 70%), radial-gradient(70% 60% at 40% 20%, rgba(80,70,75,0.55), transparent 70%), linear-gradient(180deg, #1a1a22 0%, #2b1f1c 50%, #0b0a0c 51%, #060607 100%)',
              }}
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
              <path d="M0 60 L30 48 L55 55 L80 38 L110 50 L140 42 L170 56 L200 46 L200 100 L0 100Z" fill="#0a090b" />
              <path d="M108 50 C112 44 118 47 122 42 C126 46 130 44 134 49" stroke="#ffb347" strokeWidth="1.4" fill="none">
                <animate attributeName="stroke-opacity" values="1;0.5;1" dur="0.4s" repeatCount="indefinite" />
              </path>
            </svg>
            <div className="fw-view__scan" />
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span className="mono rounded-[3px] bg-[#dc2626] px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-white">FIRE</span>
              <span className="mono rounded-[3px] border border-[var(--line-2)] bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur">Grizzly Peak · S</span>
            </div>
            <div className="mono absolute bottom-3 right-4 text-[10px] text-white/50">37.845, -122.225</div>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mono text-[10px] tracking-[0.18em] text-[var(--txt-3)]">INCIDENT · EAST BAY</div>
                <div className="mt-1 text-[22px] font-medium tracking-[-0.02em]">Oakland Hills</div>
              </div>
              <span className="mono rounded-[3px] border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] px-2 py-1 text-[10px] tracking-[0.1em] text-[#f87171]">CRITICAL · 94%</span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--txt-2)]">
              Active flame front on a grass slope; wind pushing south-west toward homes. Satellite confirms a hotspot.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {decision === 'pending' ? (
                <>
                  <button className="fw-btn fw-btn--amber !px-5 !py-2.5 !text-[14px]" onClick={() => setDecision('approve')}>
                    <Check size={16} strokeWidth={2.6} /> Dispatch
                  </button>
                  <button className="fw-btn fw-btn--ghost !text-[14px]" onClick={() => setDecision('reject')}>
                    <X size={16} /> False alarm
                  </button>
                  <span className="ml-auto flex items-center gap-2 text-[12px] text-[var(--txt-3)]"><span className="fw-dot fw-dot--amber" /> Awaiting review</span>
                </>
              ) : (
                <div className="flex w-full items-center gap-3 animate-[fw-caption_0.5s_ease]">
                  <span className={`grid h-8 w-8 place-items-center rounded-md ${decision === 'approve' ? 'bg-[var(--amber)] text-white' : 'bg-[var(--ink-3)]'}`}>
                    {decision === 'approve' ? <Check size={17} strokeWidth={2.6} /> : <X size={17} />}
                  </span>
                  <div>
                    <div className="text-[15px] font-medium">{decision === 'approve' ? 'Dispatched' : 'Marked false alarm'}</div>
                    <div className="mono text-[11px] text-[var(--amber-hi)]">+1 label → North Bay station · next round</div>
                  </div>
                  <button className="ml-auto grid h-8 w-8 place-items-center rounded-md border border-[var(--line-2)] text-[var(--txt-3)] hover:text-[var(--txt)]" onClick={() => setDecision('pending')} aria-label="Reset demo">
                    <RotateCcw size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes fw-caption { from { opacity: 0; transform: translateY(8px); filter: blur(4px); } }`}</style>
    </section>
  )
}

export function Finale() {
  const navigate = useNavigate()
  return (
    <section className="fw-section flex min-h-[100svh] flex-col px-5 md:px-8">
      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-center py-32 text-center">
        <div data-fade><Mark size={44} /></div>
        <h2 className="mt-7 text-[clamp(40px,6.5vw,92px)] font-medium leading-[0.98] tracking-[-0.04em]">
          <span className="block"><Split>The console</Split></span>
          <span className="block"><Split>is open.</Split></span>
        </h2>
        <p className="fw-lead mt-7 max-w-[560px]" data-fade>
          Drop a pin anywhere in California and watch eight agents reach a decision you can dispatch on.
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-4" data-fade>
          <button className="fw-btn fw-btn--amber group" onClick={() => navigate('/dashboard')}>
            Enter Dispatch Console
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button className="fw-btn fw-btn--ghost !px-6 !py-4" onClick={() => document.getElementById('federation')?.scrollIntoView()}>
            See the federation
          </button>
        </div>
      </div>
      <footer className="mx-auto w-full max-w-[1240px] border-t border-[var(--line)] py-8">
        <div className="flex flex-wrap items-center justify-between gap-6 text-[13px] text-[var(--txt-3)]">
          <Logo />
          <span>Cameras: ALERTWest / UC San Diego · Satellite: NASA FIRMS</span>
          <span>Federated learning with Flower</span>
        </div>
        <p className="mono mt-5 text-[11px] text-[var(--txt-3)] opacity-70">
          The 3D city is a real-time simulation for illustration; incidents shown on this page are not live.
        </p>
      </footer>
    </section>
  )
}
