import * as Cesium from 'cesium'
import type { CameraDirectoryResponse } from '../lib/api'

type CameraFeed = CameraDirectoryResponse['cameras'][number]

const MARK_EMERALD = createCameraMark('#10b981', 'rgba(4, 28, 22, 0.95)')
const MARK_AMBER = createCameraMark('#f59e0b', 'rgba(30, 20, 4, 0.95)')
const MARK_CYAN = createCameraMark('#06b6d4', 'rgba(4, 25, 30, 0.95)')

/**
 * Lightweight, GPU-accelerated view of free live cameras across San Francisco and California.
 * Shared canvas textures and distance-based LOD prevent WebGL memory leaks or browser crashes.
 */
export class CameraLayer {
  private readonly source = new Cesium.CustomDataSource('california-live-cameras')
  private readonly viewer: Cesium.Viewer

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.source.clustering.enabled = false
    void this.viewer.dataSources.add(this.source)
  }

  render(cameras: CameraFeed[]) {
    this.source.entities.removeAll()

    for (const camera of cameras) {
      if (!Number.isFinite(camera.lat) || !Number.isFinite(camera.lon)) continue
      const stationTitle = camera.name.split('·')[0].trim()
      const category = (camera as any).category || 'sf'

      let mark = MARK_EMERALD
      let outlineColor = '#031c15'
      if (category === 'caltrans') {
        mark = MARK_AMBER
        outlineColor = '#1f1302'
      } else if (category === 'parks') {
        mark = MARK_CYAN
        outlineColor = '#02181c'
      }

      this.source.entities.add({
        id: `camera:${camera.id}`,
        name: camera.name,
        position: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 40),
        properties: {
          cameraId: camera.id,
          imageUrl: camera.image_url,
          videoUrl: (camera as any).video_url,
          category,
        },
        billboard: {
          image: mark,
          width: 32,
          height: 32,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scaleByDistance: new Cesium.NearFarScalar(2_000, 1.1, 400_000, 0.65),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `● ${stationTitle}`,
          font: '600 11px Inter, system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString(outlineColor),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, 16),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 140_000),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    }
  }

  destroy() {
    if (this.viewer.isDestroyed()) return
    this.viewer.dataSources.remove(this.source, true)
  }
}

function createCameraMark(accentColor: string, bgDark: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // Outer ring badge
  ctx.fillStyle = bgDark
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(32, 32, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Camera Body
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(19, 24, 17, 14, 3) : ctx.rect(19, 24, 17, 14)
  ctx.fill()

  // Camera Lens
  ctx.beginPath()
  ctx.moveTo(38, 27)
  ctx.lineTo(46, 21)
  ctx.lineTo(46, 39)
  ctx.lineTo(38, 33)
  ctx.closePath()
  ctx.fill()

  // Inner lens pupil
  ctx.fillStyle = accentColor
  ctx.beginPath()
  ctx.arc(27.5, 31, 3.5, 0, Math.PI * 2)
  ctx.fill()

  // Live Red Indicator LED
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(45, 17, 4.5, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}
