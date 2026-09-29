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

/** Satellite imagery graded to a sleek, elegant dark digital twin palette (Image 2 style) */
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
  // Balanced dark mode satellite: deep dark bay, visible streets, natural green parks, zero blowout
  layer.brightness = 0.62
  layer.saturation = 0.75
  layer.contrast = 1.18
  layer.gamma = 0.88
}

/** Professional digital twin lighting: moody dusk/twilight with crisp building edges and zero overexposure */
export function applyCinematicStyle(viewer: Cesium.Viewer) {
  const scene = viewer.scene

  // Shadow maps enabled for realistic depth
  scene.shadowMap.enabled = true
  scene.shadowMap.softShadows = true
  scene.shadowMap.size = 2048

  // Deep dark navy ocean base (eliminates the blinding white water blowout)
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#080e18')
  scene.backgroundColor = Cesium.Color.fromCssColorString('#050810')

  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true
    scene.skyAtmosphere.hueShift = -0.05
    scene.skyAtmosphere.saturationShift = -0.2
    scene.skyAtmosphere.brightnessShift = -0.3
  }
  if (scene.skyBox) scene.skyBox.show = false

  scene.globe.enableLighting = true

  // Balanced architectural twilight light (cool silver-blue, sculpts massing without blowing out surfaces)
  scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0.42, -0.58, -0.68),
    color: Cesium.Color.fromCssColorString('#cbd8ee'),
    intensity: 1.35,
  })

  // Atmospheric fog: soft and subtle
  scene.fog.enabled = true
  scene.fog.density = 0.0001
  scene.globe.showGroundAtmosphere = false

  // Disable aggressive bloom that caused the white blowout
  const bloom = scene.postProcessStages.bloom
  bloom.enabled = false
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
