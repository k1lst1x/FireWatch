import { Shield } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

/** The same mark the dispatch console wears in its header, so the two read as one product. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-[var(--amber)]"
      style={{ width: size, height: size }}
    >
      <Shield size={size * 0.56} className="text-white" strokeWidth={2.5} />
    </span>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark size={26} />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">FireWatch</span>
    </span>
  )
}

/**
 * Splits text into masked words that GSAP lifts in (see Landing.tsx).
 * The class lands on each word, not the wrapper, so a transformed child never
 * clips a gradient applied to the parent.
 */
export function Split({ children, className = '', style }: { children: string; className?: string; style?: CSSProperties }) {
  const words = children.split(' ')
  return (
    <span style={style} data-split>
      {words.map((w, i) => (
        <span key={i} className="fw-word">
          <span className={className}>{w}{i < words.length - 1 ? ' ' : ''}</span>
        </span>
      ))}
    </span>
  )
}

export function Kicker({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="fw-kicker" data-fade>
      <span className="fw-kicker__n">{n}</span>
      <span className="fw-kicker__l" />
      <span className="fw-kicker__t">{children}</span>
    </div>
  )
}

/** Panel header bar, matching the console's card chrome. */
export function PanelHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="fw-panel__hd">
      <span className="lbl" style={{ color: 'var(--txt-2)' }}>{title}</span>
      {meta}
    </div>
  )
}
