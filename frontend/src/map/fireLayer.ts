import * as Cesium from 'cesium'
import { CRIT_COLOR, type Criticality, type Incident } from '../lib/api'

/**
 * Photorealistic 3D Geospatial Layer inspired by Image 2:
 * - Floating frosted-glass HUD callout cards with thin leader lines
 * - Futuristic glowing holographic hexagonal telemetry pins
 * - Luminous volumetric energy cylinders with realistic radius
 * - Pulsing ground radar rings & spatial metric annotations
 */

const DISMISSED = '#64748b'

const SEVERITY_SCALE: Record<Criticality, number> = {
  LOW: 0.6,
  MEDIUM: 0.85,
  HIGH: 1.15,
  CRITICAL: 1.5,
}

function colorOf(incident: Incident): Cesium.Color {
  const css = incident.criticality ? CRIT_COLOR[incident.criticality] : DISMISSED
  return Cesium.Color.fromCssColorString(css)
}

function hexColorOf(incident: Incident): string {
  return incident.criticality ? CRIT_COLOR[incident.criticality] : '#64748b'
}

/** Calibrated height in metres so columns anchor to the city instead of shooting into orbit */
function columnHeight(incident: Incident): number {
  if (incident.frp && incident.frp > 0) {
    return Math.min(360, Math.max(110, incident.frp * 2.0))
  }
  const sev = incident.criticality ? SEVERITY_SCALE[incident.criticality] : 0.5
  const score = Number.isFinite(incident.combined_score) ? incident.combined_score : 0.4
  return 100 + sev * 130 * (0.6 + score * 0.6)
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
      ranked.filter(i => i.criticality === 'CRITICAL' || i.criticality === 'HIGH').slice(0, 5).map(i => i.id),
    )

    // Render active incidents with holographic HUD cards and volumetric cylinders
    for (const incident of incidents) {
      const base = colorOf(incident)
      const hexStr = hexColorOf(incident)
      const height = columnHeight(incident)
      const rejected = incident.status === 'rejected' || incident.status === 'dismissed'
      const seed = hash(incident.id)
      const frpVal = incident.frp ?? Math.round(incident.combined_score * 120 + 20)
      const confVal = incident.confidence ?? Math.round(incident.combined_score * 100)
      const cardHeight = height + 75

      // 1. Broad, glowing volumetric cylinder beam (clamped tightly to photorealistic buildings)
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
          topRadius: rejected ? 8.0 : 16.0,
          bottomRadius: rejected ? 18.0 : 34.0,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              if (rejected) return base.withAlpha(0.2)
              const t = performance.now() / 1000
              const flicker = 0.72 + 0.16 * Math.sin(t * 8 + seed)
              const boost = this.focusedId === incident.id ? 1.3 : 1.0
              return Cesium.Color.fromCssColorString('#ff6a00').withAlpha(
                Math.min(0.85, 0.65 * flicker * boost)
              )
            }, false),
          ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#ff3b10'),
          outlineWidth: 2.0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      this.entities.push(column)

      // 2. Thin glowing leader line connecting building rooftop to floating HUD card
      const leaderLine = this.viewer.entities.add({
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 10),
            Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, cardHeight),
          ],
          width: 1.5,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              const alpha = this.focusedId === incident.id ? 0.9 : 0.55
              return Cesium.Color.fromCssColorString(hexStr).withAlpha(alpha)
            }, false),
          ),
        },
      })
      this.entities.push(leaderLine)

      // 3. Ground holographic radar pulse ring
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
              new Cesium.CallbackProperty(time => base.withAlpha(0.12 * fade(time)), false),
            ),
            outline: true,
            outlineColor: new Cesium.CallbackProperty(
              time => base.withAlpha(0.65 * fade(time)),
              false,
            ) as unknown as Cesium.Color,
            outlineWidth: 2,
          },
        })
        this.entities.push(ring)
      }

      // 4. Futuristic Frosted Glass HUD Callout Card (Inspired by Image 2)
      const rawCam = incident.result?.camera?.raw?.camera as { name?: string } | undefined
      const locationName = rawCam?.name ?? 'San Francisco Sector'
      const hudCanvas = createHoloCard(
        locationName,
        `HOTSPOT · ${frpVal} MW`,
        `${incident.criticality ?? 'DISMISSED'} · ${confVal}%`,
        hexStr,
      )

      const hudBillboard = this.viewer.entities.add({
        id: `label:${incident.id}`,
        position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, cardHeight),
        billboard: {
          image: hudCanvas,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.85,
          scaleByDistance: new Cesium.NearFarScalar(600, 1.0, 9000, 0.55),
          translucencyByDistance: new Cesium.NearFarScalar(12000, 1.0, 24000, 0.0),
          disableDepthTestDistance: 500,
        },
      })
      this.entities.push(hudBillboard)

      if (smokeIds.has(incident.id)) this.addSmoke(incident, height, base)
    }

    // 5. Add Sci-Fi Holographic Hexagon Nodes & Spatial Callouts across the 3D City (matching Image 2)
    this.addAuxiliaryHoloNodes()
  }

  /**
   * Adds glowing holographic hexagons and spatial metric callouts
   * scattered across landmarks, exactly like the blue/violet hexagons in Image 2.
   */
  private addAuxiliaryHoloNodes() {
    const nodes = [
      { lon: -122.4015, lat: 37.7900, alt: 110, label: 'Salesforce Transit Hub', metric: 'Node #802 · ALERTWest' },
      { lon: -122.4190, lat: 37.7810, alt: 95, label: 'Civic Center Station', metric: 'Wind: WNW 14kt · #597' },
      { lon: -122.4270, lat: 37.7680, alt: 80, label: 'Mission Dolores Sensor', metric: 'Thermal Baseline Normal' },
      { lon: -122.4080, lat: 37.7980, alt: 120, label: 'Financial District Tower', metric: '99.8% 3D Mesh Clamped' },
    ]

    const hexCanvas = createHoloHexagon('#3b82f6')

    nodes.forEach(node => {
      // Hexagon pin
      const hexEntity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(node.lon, node.lat, node.alt),
        billboard: {
          image: hexCanvas,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scale: 0.7,
          scaleByDistance: new Cesium.NearFarScalar(600, 1.0, 10000, 0.5),
          disableDepthTestDistance: 400,
        },
      })
      this.entities.push(hexEntity)

      // Spatial Callout Label (like "80 Kilometre walkways" in Image 2)
      const calloutCanvas = createSpatialCallout(node.label, node.metric)
      const calloutEntity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(node.lon, node.lat, node.alt + 35),
        billboard: {
          image: calloutCanvas,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.8,
          scaleByDistance: new Cesium.NearFarScalar(600, 1.0, 9000, 0.5),
          translucencyByDistance: new Cesium.NearFarScalar(8000, 1.0, 16000, 0.0),
          disableDepthTestDistance: 400,
        },
      })
      this.entities.push(calloutEntity)
    })
  }

  /** A slow, realistic smoke plume leaning with wind */
  private addSmoke(incident: Incident, _height: number, base: Cesium.Color) {
    const origin = Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 40)
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)

    const system = new Cesium.ParticleSystem({
      modelMatrix,
      emitter: new Cesium.CircleEmitter(24),
      image: emberSprite(),
      startColor: Cesium.Color.lerp(base, Cesium.Color.WHITE, 0.35, new Cesium.Color()).withAlpha(0.65),
      endColor: Cesium.Color.fromCssColorString('#4a4448').withAlpha(0.0),
      startScale: 1.0,
      endScale: 6.5,
      particleLife: 8.5,
      speed: 10,
      emissionRate: 16,
      imageSize: new Cesium.Cartesian2(24, 24),
      sizeInMeters: true,
      updateCallback: p => {
        const dt = 1 / 60
        p.velocity.z += 3.2 * dt
        p.velocity.x += 1.6 * dt
        p.velocity.y -= 0.9 * dt
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
// HOLOGRAPHIC CANVAS GENERATORS (Matching Image 2 Design Specifications)
// --------------------------------------------------------------------------

/** Creates a glowing frosted glass HUD card like Image 2 */
function createHoloCard(title: string, subtitle: string, tag: string, accentColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 380
  canvas.height = 140
  const ctx = canvas.getContext('2d')!

  // Background rounded frosted rectangle with dark glass effect
  const x = 10, y = 10, w = 360, h = 120, r = 16
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()

  // Frosted dark glass fill
  ctx.fillStyle = 'rgba(8, 14, 24, 0.88)'
  ctx.fill()

  // Glowing cyber border
  ctx.lineWidth = 2
  ctx.strokeStyle = accentColor
  ctx.shadowColor = accentColor
  ctx.shadowBlur = 12
  ctx.stroke()
  ctx.shadowBlur = 0 // reset shadow

  // Top header status tag
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(title.toUpperCase(), 26, 42)

  // Subtitle (Hotspot & FRP)
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(subtitle, 26, 70)

  // Badge pill in bottom right
  const badgeW = 120, badgeH = 26, badgeX = 26, badgeY = 86
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13)
  ctx.fill()

  // Glowing status dot inside badge
  ctx.fillStyle = accentColor
  ctx.beginPath()
  ctx.arc(badgeX + 12, badgeY + 13, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(tag, badgeX + 24, badgeY + 17)

  return canvas
}

/** Creates a glowing holographic hexagon node marker (blue/violet) matching Image 2 */
function createHoloHexagon(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 72
  canvas.height = 72
  const ctx = canvas.getContext('2d')!

  const cx = 36, cy = 36, r = 24
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  // Translucent glowing fill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.fill()

  // Neon glowing stroke
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 14
  ctx.stroke()
  ctx.shadowBlur = 0

  // Inner geometric core
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  return canvas
}

/** Creates a sleek spatial callout like "80 Kilometre walkways" in Image 2 */
function createSpatialCallout(primary: string, secondary: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 70
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgba(8, 12, 20, 0.78)'
  ctx.beginPath()
  ctx.roundRect(8, 8, 284, 54, 10)
  ctx.fill()

  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.stroke()

  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#f8fafc'
  ctx.fillText(primary, 20, 32)

  ctx.font = '11px monospace'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(secondary, 20, 50)

  return canvas
}

function hash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h % 1000) / 1000 * 6.28
}

const RING_PERIOD = 3.2

function secondsOf(time?: Cesium.JulianDate): number {
  return time ? Cesium.JulianDate.toDate(time).getTime() / 1000 : performance.now() / 1000
}
function ringPhase(seed: number, t: number): number {
  return (((t + seed) % RING_PERIOD) + RING_PERIOD) % RING_PERIOD / RING_PERIOD
}
function ringRadius(seed: number, t: number): number {
  return 35 + ringPhase(seed, t) * 150
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
