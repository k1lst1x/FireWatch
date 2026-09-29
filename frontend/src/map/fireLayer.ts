import * as Cesium from 'cesium'
import { CRIT_COLOR, type Criticality, type Incident } from '../lib/api'

/**
 * Clean, high-end 3D fire telemetry layer:
 * - Slender, luminous emissive columns clamped to buildings
 * - Minimalist, razor-sharp frosted glass pill badges (Linear/Apple Maps style)
 * - Subtle, elegant ground pulse rings
 * - Zero visual clutter
 */

const DISMISSED = '#64748b'

const SEVERITY_SCALE: Record<Criticality, number> = {
  LOW: 0.5,
  MEDIUM: 0.75,
  HIGH: 1.0,
  CRITICAL: 1.35,
}

function colorOf(incident: Incident): Cesium.Color {
  const css = incident.criticality ? CRIT_COLOR[incident.criticality] : DISMISSED
  return Cesium.Color.fromCssColorString(css)
}

function hexColorOf(incident: Incident): string {
  return incident.criticality ? CRIT_COLOR[incident.criticality] : '#64748b'
}

/** Balanced height so columns read as natural tactical pins */
function columnHeight(incident: Incident): number {
  if (incident.frp && incident.frp > 0) {
    return Math.min(160, Math.max(65, incident.frp * 0.85))
  }
  const sev = incident.criticality ? SEVERITY_SCALE[incident.criticality] : 0.4
  const score = Number.isFinite(incident.combined_score) ? incident.combined_score : 0.4
  return 60 + sev * 75 * (0.6 + score * 0.6)
}

export class FireLayer {
  private entities: Cesium.Entity[] = []
  private particles: Cesium.ParticleSystem[] = []
  private focusedId: string | null = null
  private viewer: Cesium.Viewer

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  setFocus(id: string | null) {
    this.focusedId = id
  }

  clear() {
    for (const e of this.entities) this.viewer.entities.remove(e)
    for (const p of this.particles) this.viewer.scene.primitives.remove(p)
    this.entities = []
    this.particles = []
  }

  render(incidents: Incident[]) {
    this.clear()

    const ranked = [...incidents].sort((a, b) => columnHeight(b) - columnHeight(a))
    const smokeIds = new Set(
      ranked.filter(i => i.criticality === 'CRITICAL' || i.criticality === 'HIGH').slice(0, 4).map(i => i.id),
    )

    for (const incident of incidents) {
      const base = colorOf(incident)
      const hexStr = hexColorOf(incident)
      const height = columnHeight(incident)
      const rejected = incident.status === 'rejected' || incident.status === 'dismissed'
      const seed = hash(incident.id)
      const frpVal = incident.frp ?? Math.round(incident.combined_score * 120 + 20)
      const confVal = incident.confidence ?? Math.round(incident.combined_score * 100)

      // 1. Slender, elegant emissive column
      const anchor = Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, height / 2)
      const column = this.viewer.entities.add({
        id: `fire:${incident.id}`,
        name: `Thermal Anomaly (${frpVal} MW)`,
        position: anchor,
        orientation: Cesium.Transforms.headingPitchRollQuaternion(
          anchor,
          new Cesium.HeadingPitchRoll(0, 0, 0),
        ),
        cylinder: {
          length: height,
          topRadius: rejected ? 2.5 : 4.0,
          bottomRadius: rejected ? 5.5 : 10.0,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              if (rejected) return base.withAlpha(0.2)
              const t = performance.now() / 1000
              const flicker = 0.78 + 0.14 * Math.sin(t * 7 + seed)
              const boost = this.focusedId === incident.id ? 1.25 : 1.0
              return Cesium.Color.fromCssColorString('#ff5a00').withAlpha(
                Math.min(0.85, 0.6 * flicker * boost)
              )
            }, false),
          ),
          outline: false,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      this.entities.push(column)

      // 2. Subtle ground pulse ring
      if (!rejected) {
        const radius = (time?: Cesium.JulianDate) => ringRadius(seed, secondsOf(time))
        const fade = (time?: Cesium.JulianDate) => 1 - ringPhase(seed, secondsOf(time))
        const ring = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 4),
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(time => radius(time), false),
            semiMinorAxis: new Cesium.CallbackProperty(time => radius(time), false),
            height: 4,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(time => base.withAlpha(0.08 * fade(time)), false),
            ),
            outline: true,
            outlineColor: new Cesium.CallbackProperty(
              time => base.withAlpha(0.45 * fade(time)),
              false,
            ) as unknown as Cesium.Color,
            outlineWidth: 1.5,
          },
        })
        this.entities.push(ring)
      }

      // 3. Minimalist, razor-sharp HUD pill badge floating right at the column top
      const labelText = `${incident.criticality ?? 'DISMISSED'} · ${confVal}%`
      const badgeCanvas = createMinimalBadge(labelText, `${frpVal} MW`, hexStr)

      const badge = this.viewer.entities.add({
        id: `label:${incident.id}`,
        position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, height + 15),
        billboard: {
          image: badgeCanvas,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.75,
          scaleByDistance: new Cesium.NearFarScalar(400, 1.0, 7000, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(8000, 1.0, 18000, 0.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
      this.entities.push(badge)

      if (smokeIds.has(incident.id)) this.addSmoke(incident, height, base)
    }
  }

  /** Subtle, realistic smoke plume */
  private addSmoke(incident: Incident, _height: number, base: Cesium.Color) {
    const origin = Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 35)
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)

    const system = new Cesium.ParticleSystem({
      modelMatrix,
      emitter: new Cesium.CircleEmitter(16),
      image: emberSprite(),
      startColor: Cesium.Color.lerp(base, Cesium.Color.WHITE, 0.35, new Cesium.Color()).withAlpha(0.5),
      endColor: Cesium.Color.fromCssColorString('#333338').withAlpha(0.0),
      startScale: 0.8,
      endScale: 4.5,
      particleLife: 7.0,
      speed: 8,
      emissionRate: 12,
      imageSize: new Cesium.Cartesian2(18, 18),
      sizeInMeters: true,
      updateCallback: p => {
        const dt = 1 / 60
        p.velocity.z += 2.6 * dt
        p.velocity.x += 1.4 * dt
        p.velocity.y -= 0.7 * dt
      },
    })
    this.viewer.scene.primitives.add(system)
    this.particles.push(system)
  }

  destroy() {
    this.clear()
  }
}

// --------------------------------------------------------------------------
// MINIMALIST BADGE GENERATOR (High-DPI, Crisp, No Clutter)
// --------------------------------------------------------------------------

function createMinimalBadge(status: string, frp: string, accentColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  // High-DPI canvas (2x for ultra-sharp text)
  canvas.width = 240
  canvas.height = 70
  const ctx = canvas.getContext('2d')!

  const x = 10, y = 8, w = 220, h = 44, r = 10

  // Sleek dark pill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = 'rgba(11, 16, 26, 0.92)'
  ctx.fill()

  // Fine 1px border
  ctx.lineWidth = 1.5
  ctx.strokeStyle = accentColor
  ctx.stroke()

  // Status dot
  ctx.beginPath()
  ctx.arc(x + 18, y + h / 2, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = accentColor
  ctx.fill()

  // Primary text: Status
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(status, x + 32, y + 27)

  // Secondary text: FRP
  ctx.font = '500 12px monospace'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(frp, x + w - 60, y + 27)

  // Pointer tick triangle at bottom center
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 6, y + h)
  ctx.lineTo(x + w / 2 + 6, y + h)
  ctx.lineTo(x + w / 2, y + h + 8)
  ctx.closePath()
  ctx.fillStyle = accentColor
  ctx.fill()

  return canvas
}

function hash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h % 1000) / 1000 * 6.28
}

const RING_PERIOD = 3.0

function secondsOf(time?: Cesium.JulianDate): number {
  return time ? Cesium.JulianDate.toDate(time).getTime() / 1000 : performance.now() / 1000
}
function ringPhase(seed: number, t: number): number {
  return (((t + seed) % RING_PERIOD) + RING_PERIOD) % RING_PERIOD / RING_PERIOD
}
function ringRadius(seed: number, t: number): number {
  return 25 + ringPhase(seed, t) * 90
}

let sprite: string | null = null
function emberSprite(): string {
  if (sprite) return sprite
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  sprite = c.toDataURL()
  return sprite
}
