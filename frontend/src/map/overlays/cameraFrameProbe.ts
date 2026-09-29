export type FrameStatus = 'loading' | 'live' | 'offline'

/**
 * Caltrans (and most DOT networks) answer HTTP 200 with a static
 * "Temporarily Unavailable" placeholder when a camera is down, so the status
 * code tells us nothing. The placeholder measures ~86% near-white pixels,
 * while a real road scene stays under 1%, which separates the two cleanly.
 */
const NEAR_WHITE_RATIO_LIMIT = 0.6

export function looksLikePlaceholder(img: HTMLImageElement): boolean {
  try {
    const w = 32
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w)) || 32
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false
    ctx.drawImage(img, 0, 0, w, h)

    const { data } = ctx.getImageData(0, 0, w, h)
    let nearWhite = 0
    const total = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) nearWhite += 1
    }
    return nearWhite / total > NEAR_WHITE_RATIO_LIMIT
  } catch {
    // Tainted canvas (server sent no CORS header) — assume the frame is usable.
    return false
  }
}
