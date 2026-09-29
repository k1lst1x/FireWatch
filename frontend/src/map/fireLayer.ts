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

      // 1. Sleek, focused volumetric cylinder beam anchored to 3D buildings
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
          topRadius: rejected ? 3.0 : 6.0,
          bottomRadius: rejected ? 6.0 : 12.0,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              if (rejected) return base.withAlpha(0.2)
              const t = performance.now() / 1000
              const flicker = 0.85 + 0.15 * Math.sin(t * 6 + seed)
              const boost = this.focusedId === incident.id ? 1.25 : 1.0
              return Cesium.Color.fromCssColorString('#ff6a00').withAlpha(
                Math.min(0.7, 0.48 * flicker * boost)
              )
            }, false),
          ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#ff4410').withAlpha(0.7),
          outlineWidth: 1.0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      this.entities.push(column)

      // 2. Glowing holographic hexagonal beacon pin at anchor point
      const baseHexCanvas = createHoloHexagon(hexStr)
      const baseHex = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 8),
        billboard: {
          image: baseHexCanvas,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scale: 0.6,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.0, 12000, 0.45),
          disableDepthTestDistance: 200,
        },
      })
      this.entities.push(baseHex)

      // 3. Thin glowing leader line connecting building/ground node to floating HUD card
      const leaderLine = this.viewer.entities.add({
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 10),
            Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, cardHeight),
          ],
          width: 1.5,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              const alpha = this.focusedId === incident.id ? 0.95 : 0.6
              return Cesium.Color.fromCssColorString(hexStr).withAlpha(alpha)
            }, false),
          ),
        },
      })
      this.entities.push(leaderLine)

      // 4. Ground holographic radar pulse ring
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
            outlineWidth: 1.5,
          },
        })
        this.entities.push(ring)
      }

      // 5. Sleek Frosted Glass HUD Callout Card (Inspired by Image 2 "CITY HALL")
      const rawCam = incident.result?.camera?.raw?.camera as { name?: string } | undefined
      const locationName = rawCam?.name ?? 'Incident Sector'
      const hudCanvas = createHoloCard(
        locationName,
        `HOTSPOT · ${frpVal} MW (${confVal}%)`,
        `${incident.criticality ?? 'NORMAL'}`,
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

    // 6. Add Sci-Fi Holographic Hexagon Nodes & Spatial Callouts across landmarks (matching Image 2)
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

/** Creates a sleek frosted glass HUD card matching the reference "CITY HALL" card */
function createHoloCard(title: string, subtitle: string, tag: string, accentColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 260
  canvas.height = 76
  const ctx = canvas.getContext('2d')!

  // Background rounded frosted rectangle with dark glass effect
  const x = 6, y = 6, w = 248, h = 64, r = 12
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()

  // Frosted dark glass fill (deep twilight navy glass)
  ctx.fillStyle = 'rgba(8, 14, 23, 0.88)'
  ctx.fill()

  // Subtle clean border with faint accent tint
  ctx.lineWidth = 1.2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.stroke()

  // Fine top accent line
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 16, y)
  ctx.lineTo(x + 50, y)
  ctx.stroke()

  // Title (CITY HALL style)
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#f8fafc'
  const displayTitle = title.length > 20 ? title.slice(0, 19) + '…' : title
  ctx.fillText(displayTitle.toUpperCase(), x + 16, y + 25)

  // Subtitle (Hotspot & FRP)
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(subtitle, x + 16, y + 44)

  // Right pill badge
  const badgeW = 60, badgeH = 20, badgeX = x + w - badgeW - 14, badgeY = y + 22
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10)
  ctx.fill()

  // Status dot inside pill
  ctx.fillStyle = accentColor
  ctx.beginPath()
  ctx.arc(badgeX + 10, badgeY + 10, 3.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = 'bold 9px monospace'
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(tag.slice(0, 6), badgeX + 18, badgeY + 13)

  return canvas
}

/** Creates a glowing holographic hexagon node marker matching Image 2 */
function createHoloHexagon(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  const cx = 32, cy = 32, r = 20
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  // Translucent glass fill
  ctx.fillStyle = 'rgba(10, 17, 28, 0.85)'
  ctx.fill()

  // Fine glowing stroke
  ctx.lineWidth = 1.8
  ctx.strokeStyle = color
  ctx.stroke()

  // Inner concentric hexagon wireframe (matching reference graphic)
  const innerR = 11
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + innerR * Math.cos(angle)
    const y = cy + innerR * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Center glowing pip
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  return canvas
}

/** Creates a sleek spatial callout like "80 Kilometre walkways" in Image 2 */
function createSpatialCallout(primary: string, secondary: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 54
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgba(7, 12, 20, 0.75)'
  ctx.beginPath()
  ctx.roundRect(4, 4, 232, 46, 8)
  ctx.fill()

  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
  ctx.stroke()

  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#f8fafc'
  ctx.fillText(primary, 14, 24)

  ctx.font = '10px monospace'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(secondary, 14, 40)

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
