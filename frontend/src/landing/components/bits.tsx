import type { CSSProperties, ReactNode } from 'react'

export function FlameMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="fw-flame" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD08A" />
          <stop offset="0.5" stopColor="#FF7A2A" />
          <stop offset="1" stopColor="#FF3B2F" />
        </linearGradient>
      </defs>
      <path
        d="M16 2c1.2 4.6 6.8 7.4 6.8 14.2A6.8 6.8 0 0 1 16 23a6.8 6.8 0 0 1-6.8-6.8c0-2.6 1.1-4.4 2.6-5.8.2 1.9 1.1 3.3 2.6 3.9C13.8 9.6 14.6 5.4 16 2Z"
        fill="url(#fw-flame)"
      />
      <path d="M5 26.5h22" stroke="url(#fw-flame)" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 30h14" stroke="#FF7A2A" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <FlameMark size={24} />
      <span className="text-[19px] font-semibold tracking-[-0.03em]">FireWatch</span>
    </span>
  )
}

/**
 * Splits text into masked words that GSAP lifts in (see Landing.tsx).
 * The class lands on each word, not the wrapper: a `background-clip: text`
 * gradient renders nothing when its children are transformed.
 */
export function Split({ children, className = '', style }: { children: string; className?: string; style?: CSSProperties }) {
  const words = children.split(' ')
  return (
    <span style={style} data-split>
      {words.map((w, i) => (
        <span key={i} className="fw-word">
          <span className={className}>{w}{i < words.length - 1 ? ' ' : ''}</span>
        </span>
      ))}
    </span>
  )
}

export function Kicker({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="fw-kicker flex items-center gap-3" data-fade>
      <span className="opacity-60">{n}</span>
      <span className="h-px w-8 bg-[var(--flame)] opacity-50" />
      <span>{children}</span>
    </div>
  )
}

export function Hex({ color = '#ff6b1f', size = 34 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M20 2 36 11v18L20 38 4 29V11Z" fill="rgba(10,10,16,0.75)" stroke={color} strokeWidth="1.5" />
      <path d="M20 9c.8 3 4.4 4.8 4.4 9.2A4.4 4.4 0 0 1 20 22.6a4.4 4.4 0 0 1-4.4-4.4c0-1.7.7-2.9 1.7-3.8.1 1.2.7 2.1 1.7 2.5-.6-2.6-.1-5.3 1-7.9Z" fill={color} />
      <path d="M13 27h14" stroke={color} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
