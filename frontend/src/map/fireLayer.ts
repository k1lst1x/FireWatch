import * as Cesium from 'cesium'
import { CRIT_COLOR, type Criticality, type Incident } from '../lib/api'

/**
 * Draws each incident as a volumetric fire column on the city: a flickering
 * emissive shaft whose height tracks the fused confidence score, an expanding
 * ground ring, and rising smoke for the worst of them.
 */

const DISMISSED = '#6b7280'

const SEVERITY_SCALE: Record<Criticality, number> = {
  LOW: 0.55,
  MEDIUM: 0.8,
  HIGH: 1.15,
  CRITICAL: 1.6,
}

function colorOf(incident: Incident): Cesium.Color {
  const css = incident.criticality ? CRIT_COLOR[incident.criticality] : DISMISSED
  return Cesium.Color.fromCssColorString(css)
}

/** Height in metres: uses blueprint FRP calculation if present, otherwise severity scale */
function columnHeight(incident: Incident): number {
  if (incident.frp && incident.frp > 0) {
    // Dynamic formula from System Architecture Document: max(120.0, FRP * 6.5)
    return Math.max(120.0, incident.frp * 6.5)
  }
  const sev = incident.criticality ? SEVERITY_SCALE[incident.criticality] : 0.4
  const score = Number.isFinite(incident.combined_score) ? incident.combined_score : 0.4
  return 95 + sev * 215 * (0.6 + score * 0.6)
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

    // the heaviest effects only go on the few that matter
    const ranked = [...incidents].sort((a, b) => columnHeight(b) - columnHeight(a))
    const smokeIds = new Set(
      ranked.filter(i => i.criticality === 'CRITICAL' || i.criticality === 'HIGH').slice(0, 6).map(i => i.id),
    )

    for (const incident of incidents) {
      const base = colorOf(incident)
      const height = columnHeight(incident)
      const rejected = incident.status === 'rejected' || incident.status === 'dismissed'
      const seed = hash(incident.id)
      const frpVal = incident.frp ?? Math.round(incident.combined_score * 120 + 20)
      const confVal = incident.confidence ?? Math.round(incident.combined_score * 100)

      // --- volumetric cylinder beam (clamped to terrain & 3D buildings)
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
          topRadius: rejected ? 3.0 : 8.0,
          bottomRadius: rejected ? 8.0 : 18.0,
          // True-color emissive material rendering profile from blueprint
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              if (rejected) return base.withAlpha(0.25)
              const t = performance.now() / 1000
              const flicker = 0.72 + 0.18 * Math.sin(t * 8 + seed)
              const boost = this.focusedId === incident.id ? 1.25 : 1.0
              return Cesium.Color.fromCssColorString('#ff5a00').withAlpha(
                Math.min(0.85, 0.75 * flicker * boost)
              )
            }, false),
          ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#ff2a00'),
          outlineWidth: 2.0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        description: `
          <div style="padding:10px; color:#ffffff; font-family:sans-serif; background:#0a101a; border-radius:6px; border:1px solid rgba(255,90,0,0.3);">
            <b style="color:#ff6a00; font-size:15px;">🔥 Thermal Anomaly</b><br>
            <hr style="border-color:rgba(255,255,255,0.15); margin:8px 0;">
            <b>Radiative Energy (FRP):</b> ${frpVal} MW<br>
            <b>Scan Confidence:</b> ${confVal}%<br>
            <b>Satellite Source Node:</b> VIIRS NRT (375m)<br>
            <b>Status:</b> ${incident.status.toUpperCase()}
          </div>`,
      })
      this.entities.push(column)

      // --- ground ring, pulsing outward like a dispatch alert
      if (!rejected) {
        // both radii must come from the same clock reading, or one frame can see
        // semiMajor < semiMinor and Cesium throws mid-render
        const radius = (time?: Cesium.JulianDate) => ringRadius(seed, secondsOf(time))
        const fade = (time?: Cesium.JulianDate) => 1 - ringPhase(seed, secondsOf(time))
        const ring = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 4),
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(time => radius(time), false),
            semiMinorAxis: new Cesium.CallbackProperty(time => radius(time), false),
            height: 4,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(time => base.withAlpha(0.1 * fade(time)), false),
            ),
            outline: true,
            outlineColor: new Cesium.CallbackProperty(
              time => base.withAlpha(0.55 * fade(time)),
              false,
            ) as unknown as Cesium.Color,
            outlineWidth: 2,
          },
        })
        this.entities.push(ring)
      }

      // --- label floating above the column
      const label = this.viewer.entities.add({
        id: `label:${incident.id}`,
        position: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, height + 90),
        point: {
          pixelSize: 7,
          color: base,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${incident.criticality ?? 'DISMISSED'}  ·  ${(incident.combined_score * 100).toFixed(0)}%`,
          font: '500 13px Geist, Inter, system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0a0b10').withAlpha(0.72),
          backgroundPadding: new Cesium.Cartesian2(9, 6),
          pixelOffset: new Cesium.Cartesian2(0, -20),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(800, 1.0, 14000, 0.55),
          translucencyByDistance: new Cesium.NearFarScalar(9000, 1.0, 22000, 0.0),
        },
      })
      this.entities.push(label)

      if (smokeIds.has(incident.id)) this.addSmoke(incident, height, base)
    }
  }

  /** A slow smoke plume, leaning with a nominal onshore wind. */
  private addSmoke(incident: Incident, _height: number, base: Cesium.Color) {
    const origin = Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat, 45)
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin)

    const system = new Cesium.ParticleSystem({
      modelMatrix,
      emitter: new Cesium.CircleEmitter(22),
      image: emberSprite(),
      startColor: Cesium.Color.lerp(base, Cesium.Color.WHITE, 0.4, new Cesium.Color()).withAlpha(0.65),
      endColor: Cesium.Color.fromCssColorString('#4a4448').withAlpha(0.0),
      startScale: 0.8,
      endScale: 6.0,
      particleLife: 9.0,
      speed: 11,
      emissionRate: 18,
      imageSize: new Cesium.Cartesian2(22, 22),
      sizeInMeters: true,
      updateCallback: p => {
        // buoyancy plus a steady lean, so plumes read as wind-driven
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

function hash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h % 1000) / 1000 * 6.28
}

const RING_PERIOD = 3.4

/** Seconds from Cesium's own clock, so every callback in a frame agrees. */
function secondsOf(time?: Cesium.JulianDate): number {
  return time ? Cesium.JulianDate.toDate(time).getTime() / 1000 : performance.now() / 1000
}
function ringPhase(seed: number, t: number): number {
  return (((t + seed) % RING_PERIOD) + RING_PERIOD) % RING_PERIOD / RING_PERIOD
}
function ringRadius(seed: number, t: number): number {
  return 40 + ringPhase(seed, t) * 165
}

/** Soft radial sprite for the smoke/ember particles, generated once. */
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
