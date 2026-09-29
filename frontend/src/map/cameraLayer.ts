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
    this.source.clustering.enabled = true
    this.source.clustering.pixelRange = 42
    this.source.clustering.minimumClusterSize = 3
    this.source.clustering.clusterBillboards = true
    this.source.clustering.clusterLabels = false
    this.source.clustering.clusterPoints = false
    this.source.clustering.clusterEvent.addEventListener((clustered, cluster) => {
      cluster.billboard.show = false
      cluster.label.show = true
      cluster.label.text = String(clustered.length)
      cluster.label.font = '600 12px system-ui'
      cluster.label.fillColor = Cesium.Color.WHITE
      cluster.label.outlineColor = Cesium.Color.fromCssColorString('#092a25')
      cluster.label.outlineWidth = 3
      cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE
      cluster.label.showBackground = true
      cluster.label.backgroundColor = Cesium.Color.fromCssColorString('#0c5e51').withAlpha(0.92)
      cluster.label.backgroundPadding = new Cesium.Cartesian2(8, 5)
      cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER
      cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY
    })
    void this.viewer.dataSources.add(this.source)
  }

  render(cameras: CameraFeed[]) {
    this.source.entities.removeAll()

    for (const camera of cameras) {
      if (!Number.isFinite(camera.lat) || !Number.isFinite(camera.lon)) continue
      this.source.entities.add({
        id: `camera:${camera.id}`,
        name: camera.name,
        position: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 18),
        properties: {
          cameraId: camera.id,
          imageUrl: camera.image_url,
        },
        billboard: {
          image: CAMERA_MARK,
          width: 18,
          height: 18,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          // Keep the statewide layer visible in the California overview; nearby
          // clusters expand naturally as operators fly closer to an area.
          scaleByDistance: new Cesium.NearFarScalar(8_000, 1, 900_000, 0.55),
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
  canvas.width = 48
  canvas.height = 48
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgba(6, 34, 31, 0.94)'
  ctx.strokeStyle = '#40e0c0'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(24, 24, 17, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#d8fff5'
  ctx.fillRect(15, 19, 15, 11)
  ctx.beginPath()
  ctx.moveTo(30, 21)
  ctx.lineTo(36, 17)
  ctx.lineTo(36, 32)
  ctx.lineTo(30, 28)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0c5e51'
  ctx.beginPath()
  ctx.arc(22.5, 24.5, 3.5, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}
