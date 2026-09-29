import * as Cesium from 'cesium'
import type { CameraDirectoryResponse } from '../lib/api'

type CameraFeed = CameraDirectoryResponse['cameras'][number]

const CAMERA_MARK = createCameraMark()

/**
 * A clustered, lightweight view of AlertWest's statewide camera directory.
 * One shared canvas is used for every pin so thousands of feeds do not create
 * thousands of textures or labels.
 */
export class CameraLayer {
  private readonly source = new Cesium.CustomDataSource('alertwest-cameras')
  private readonly viewer: Cesium.Viewer

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    // Keep individual station pins visible across San Francisco and the Bay
    this.source.clustering.enabled = false
    void this.viewer.dataSources.add(this.source)
  }

  render(cameras: CameraFeed[]) {
    this.source.entities.removeAll()

    for (const camera of cameras) {
      if (!Number.isFinite(camera.lat) || !Number.isFinite(camera.lon)) continue
      const stationTitle = camera.name.split('·')[0].trim()

      this.source.entities.add({
        id: `camera:${camera.id}`,
        name: camera.name,
        position: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 35),
        properties: {
          cameraId: camera.id,
          imageUrl: camera.image_url,
          videoUrl: (camera as any).video_url,
        },
        billboard: {
          image: CAMERA_MARK,
          width: 30,
          height: 30,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scaleByDistance: new Cesium.NearFarScalar(1_000, 1.15, 80_000, 0.75),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `● ${stationTitle}`,
          font: 'bold 11px Inter, system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString('#031c15'),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, 16),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 40_000),
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

function createCameraMark(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // Glowing shadow
  ctx.shadowColor = 'rgba(16, 185, 129, 0.75)'
  ctx.shadowBlur = 8

  // Outer circle badge
  ctx.fillStyle = 'rgba(4, 28, 22, 0.95)'
  ctx.strokeStyle = '#10b981'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(32, 32, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

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
  ctx.fillStyle = '#10b981'
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
