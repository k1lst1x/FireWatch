import * as Cesium from 'cesium'
import { CONFIG, type BasemapTier } from './config'
import { addBakedBuildings } from './buildings'

/**
 * Picks the best 3D city we can actually render, in order:
 *
 *   1. Google Photorealistic 3D Tiles  (needs VITE_GOOGLE_3D_TILES_KEY)
 *   2. Cesium OSM Buildings            (needs VITE_CESIUM_ION_TOKEN)
 *   3. Baked OSM footprints            (no key, ships with the app)
 *
 * Each tier falls through on failure, so a dead key or a blown quota degrades
 * to something that still looks like a city instead of an empty globe.
 */
export async function buildCity(
  viewer: Cesium.Viewer,
  signal: { cancelled: boolean },
): Promise<BasemapTier> {
  if (CONFIG.googleTilesKey) {
    try {
      const tileset = await Cesium.createGooglePhotorealistic3DTileset({
        key: CONFIG.googleTilesKey,
      })
      if (signal.cancelled) return 'photorealistic'
      viewer.scene.primitives.add(tileset)
      // the mesh carries its own imagery, so the globe underneath is dead weight
      viewer.scene.globe.show = false
      return 'photorealistic'
    } catch (err) {
      console.warn('[map] photorealistic tiles unavailable, falling back', err)
    }
  }

  await addKeylessImagery(viewer)

  if (CONFIG.cesiumIonToken) {
    try {
      Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken
      const osm = await Cesium.createOsmBuildingsAsync()
      if (signal.cancelled) return 'ion'
      viewer.scene.primitives.add(osm)
      return 'ion'
    } catch (err) {
      console.warn('[map] Cesium Ion buildings unavailable, falling back', err)
    }
  }

  await addBakedBuildings(viewer, signal)
  return 'baked'
}

/** Satellite imagery that needs no key, graded down to a night-ops palette. */
async function addKeylessImagery(viewer: Cesium.Viewer) {
  const layers = viewer.imageryLayers
  layers.removeAll()
  const layer = layers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: CONFIG.imageryUrl,
      maximumLevel: 19,
      credit: new Cesium.Credit('Imagery © Esri', false),
    }),
  )
  // Ground is texture, not subject: crush it to a dark near-monochrome so the
  // buildings and fire columns carry all the colour. Full saturation also drags
  // Esri's compression artefacts up as magenta speckle.
  layer.brightness = 0.26
  layer.saturation = 0.0
  layer.contrast = 1.15
  layer.gamma = 0.7
}

/** Programmatically transforms lighting maps to match the dark, high-contrast, cinematic twilight blueprint */
export function applyCinematicStyle(viewer: Cesium.Viewer) {
  const scene = viewer.scene

  // Enable shadowing subsystem architecture
  scene.shadowMap.enabled = true
  scene.shadowMap.softShadows = true
  scene.shadowMap.size = 2048 // Upscale shadow texture resolution maps

  scene.globe.baseColor = Cesium.Color.fromCssColorString('#05060a')
  scene.backgroundColor = Cesium.Color.fromCssColorString('#05060a')
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true
    scene.skyAtmosphere.hueShift = -0.05
    scene.skyAtmosphere.saturationShift = -0.35
    scene.skyAtmosphere.brightnessShift = -0.45
  }
  if (scene.skyBox) scene.skyBox.show = false

  scene.globe.enableLighting = true

  // Map localized dark slate ambient matrix vectors (Deep twilight base blue tint)
  scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0.6, -0.4, -0.8),
    color: Cesium.Color.fromCssColorString('#141923'),
    intensity: 2.2,
  })

  scene.fog.enabled = true
  scene.fog.density = 0.0002
  scene.globe.showGroundAtmosphere = false

  const bloom = scene.postProcessStages.bloom
  bloom.enabled = true
  bloom.uniforms.glowOnly = false
  bloom.uniforms.contrast = 8
  bloom.uniforms.brightness = -0.2
  bloom.uniforms.delta = 1.0
  bloom.uniforms.sigma = 2.2
  bloom.uniforms.stepSize = 1.0
}

/**
 * Drives camera matrices into deep oblique isometric positioning configurations
 */
export function executeIsometricCameraLock(viewer: Cesium.Viewer) {
  const v = CONFIG.initialView
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      v.longitude,
      v.latitude,
      v.height ?? 1150.0,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(v.heading),
      pitch: Cesium.Math.toRadians(v.pitch),
      roll: v.roll ?? 0.0,
    },
    duration: 1.8,
  })
}

/**
 * Frames the downtown cluster by orbiting a target point
 */
export function frameDowntown(viewer: Cesium.Viewer) {
  executeIsometricCameraLock(viewer)
}
