import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOff, Loader2 } from 'lucide-react'
import { looksLikePlaceholder, type FrameStatus } from './cameraFrameProbe'

interface Props {
  src?: string | null
  alt: string
  /** Milliseconds between frame refreshes. 0 disables polling. */
  refreshMs?: number
  /** Reports status changes so the caller can gate badges and actions. */
  onStatusChange?: (status: FrameStatus) => void
  className?: string
}

/**
 * A single still frame from a camera feed, refreshed on an interval, with a
 * clean offline state instead of a broken image or a vendor placeholder.
 */
export default function CameraFrame({ src, alt, refreshMs = 5000, onStatusChange, className }: Props) {
  // Keyed by src so switching cameras resets the status without an effect.
  const [result, setResult] = useState<{ src: string; status: FrameStatus } | null>(null)
  const [stamp, setStamp] = useState(() => Date.now())
  const imgRef = useRef<HTMLImageElement>(null)
  const isDemoStill = Boolean(src?.includes('demo_images'))
  const effectiveRefresh = isDemoStill ? 0 : refreshMs

  const status: FrameStatus = !src ? 'offline' : result?.src === src ? result.status : 'loading'

  // Mirror status out to the caller without driving our own state from it.
  const statusRef = useRef(onStatusChange)
  useEffect(() => {
    statusRef.current = onStatusChange
  }, [onStatusChange])
  useEffect(() => {
    statusRef.current?.(status)
  }, [status])

  useEffect(() => {
    if (!src || !effectiveRefresh) return
    const timer = window.setInterval(() => setStamp(Date.now()), effectiveRefresh)
    return () => window.clearInterval(timer)
  }, [src, effectiveRefresh])

  const handleLoad = useCallback(() => {
    const img = imgRef.current
    if (!img || !src) return
    // The fog still is mostly bright sky. The Caltrans placeholder test would
    // mark it offline a few seconds after it loads.
    const localDemo = src.includes('demo_images')
    setResult({ src, status: localDemo || !looksLikePlaceholder(img) ? 'live' : 'offline' })
  }, [src])

  const handleError = useCallback(() => {
    if (src) setResult({ src, status: 'offline' })
  }, [src])

  const url = !src ? '' : isDemoStill ? src : `${src}${src.includes('?') ? '&' : '?'}_t=${stamp}`

  return (
    <div className={`relative h-full w-full overflow-hidden bg-zinc-950 ${className ?? ''}`}>
      {src && (
        <img
          ref={imgRef}
          key={url}
          src={url}
          alt={alt}
          crossOrigin="anonymous"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            status === 'live' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-zinc-950">
          <Loader2 size={18} className="animate-spin text-zinc-600" />
        </div>
      )}

      {status === 'offline' && (
        <div className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(45deg,#111318_0px,#111318_10px,#0c0e12_10px,#0c0e12_20px)]">
          <div className="flex flex-col items-center gap-1.5 px-3 text-center">
            <CameraOff size={20} className="text-zinc-600" />
            <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-400">NO SIGNAL</span>
            <span className="font-mono text-[9px] leading-tight text-zinc-600">
              Feed temporarily unavailable upstream
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
