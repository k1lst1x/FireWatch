import * as Cesium from 'cesium'
import { CONFIG } from './config'

/**
 * Real San Francisco building footprints, baked from OpenStreetMap into
 * public/data/sf-buildings.json (see the file's `s` scale factor).
 *
 * Roughly 10k polygons, so they go in as batched GeometryInstances inside a
 * single asynchronous Primitive rather than as entities: that keeps it to a
 * couple of draw calls and builds the geometry off the main thread.
 */

interface Baked {
  s: number
  b: number[][]
}

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()))

/** Realistic architectural facade coloring inspired by Image 2 and modern digital twins */
function facade(height: number, i: number): Cesium.Color {
  const hNorm = Math.min(height / 200, 1)
  // Deterministic seed for material variation
  const seed = ((i * 9301 + 49297) % 233280) / 233280

  if (height > 90) {
    // High-rise glass towers: modern architectural blue/slate glass with crisp daylight highlights
    return new Cesium.Color(
      0.48 + seed * 0.12,
      0.60 + seed * 0.14 + hNorm * 0.08,
      0.72 + seed * 0.16 + hNorm * 0.12,
      1.0,
    )
  } else if (height > 35) {
    // Mid-rise commercial & residential: warm limestone & architectural precast concrete
    return new Cesium.Color(
      0.72 + seed * 0.12,
      0.70 + seed * 0.10,
      0.68 + seed * 0.08,
      1.0,
    )
  } else {
    // Urban low-rise buildings: warm masonry & natural urban facade tones
    return new Cesium.Color(
      0.66 + seed * 0.16,
      0.62 + seed * 0.14,
      0.58 + seed * 0.12,
      1.0,
    )
  }
}

export async function addBakedBuildings(
  viewer: Cesium.Viewer,
  signal: { cancelled: boolean },
): Promise<Cesium.Primitive | null> {
  const res = await fetch(CONFIG.buildingsUrl)
  if (!res.ok) throw new Error(`buildings ${res.status}`)
  const data = (await res.json()) as Baked
  if (signal.cancelled) return null

  const scale = data.s
  const instances: Cesium.GeometryInstance[] = []

  for (let i = 0; i < data.b.length; i++) {
    const row = data.b[i]
    const height = row[0] / 10
    const degrees: number[] = []
    for (let k = 1; k < row.length; k += 2) {
      degrees.push(row[k] / scale, row[k + 1] / scale)
    }
    if (degrees.length < 6) continue

    instances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(degrees),
          ),
          height: 0,
          extrudedHeight: height,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(facade(height, i)),
        },
      }),
    )

    // keep the frame alive while ~10k instances are assembled
    if (i % 2000 === 1999) {
      await nextFrame()
      if (signal.cancelled) return null
    }
  }

  const primitive = new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      // lit, so the directional light sculpts the massing
      flat: false,
    }),
    asynchronous: true,
    releaseGeometryInstances: true,
  })
  viewer.scene.primitives.add(primitive)
  return primitive
}
