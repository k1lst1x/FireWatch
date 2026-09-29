/** The FireWatch flame, kept local to the console so it does not depend on the landing page. */
export default function FlameMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="fwmap-flame" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD08A" />
          <stop offset="0.5" stopColor="#FF7A2A" />
          <stop offset="1" stopColor="#FF3B2F" />
        </linearGradient>
      </defs>
      <path
        d="M16 2c1.2 4.6 6.8 7.4 6.8 14.2A6.8 6.8 0 0 1 16 23a6.8 6.8 0 0 1-6.8-6.8c0-2.6 1.1-4.4 2.6-5.8.2 1.9 1.1 3.3 2.6 3.9C13.8 9.6 14.6 5.4 16 2Z"
        fill="url(#fwmap-flame)"
      />
      <path d="M5 26.5h22" stroke="url(#fwmap-flame)" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 30h14" stroke="#FF7A2A" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
