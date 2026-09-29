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

/** Satellite imagery in full, rich, photorealistic color (matching Google 3D Tiles & Image 2) */
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
  // Full vibrant natural color: lush green trees, realistic concrete roads, and clear architectural tones
  layer.brightness = 1.08
  layer.saturation = 1.2
  layer.contrast = 1.06
  layer.gamma = 1.0
}

/** Programmatically transforms lighting maps to match Image 2's crisp, photorealistic architectural standard */
export function applyCinematicStyle(viewer: Cesium.Viewer) {
  const scene = viewer.scene

  // Enable shadowing subsystem architecture with high-res texture maps
  scene.shadowMap.enabled = true
  scene.shadowMap.softShadows = true
  scene.shadowMap.size = 2048

  // Base earth colors: natural slate-blue earth, NOT pitch black void
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#243042')
  scene.backgroundColor = Cesium.Color.fromCssColorString('#111827')

  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true
    scene.skyAtmosphere.hueShift = 0.0
    scene.skyAtmosphere.saturationShift = 0.15
    scene.skyAtmosphere.brightnessShift = 0.05
  }
  if (scene.skyBox) scene.skyBox.show = false

  scene.globe.enableLighting = true

  // Crisp, warm architectural sunlight (sculpts building facades, revealing trees, sidewalks, and streets like Image 2)
  scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0.5, -0.65, -0.55),
    color: Cesium.Color.fromCssColorString('#fff6e8'),
    intensity: 2.6,
  })

  // Atmospheric fog: clean, clear visibility like modern 3D digital twins
  scene.fog.enabled = true
  scene.fog.density = 0.00007
  scene.globe.showGroundAtmosphere = true

  // Subtle bloom for holographic futuristic elements
  const bloom = scene.postProcessStages.bloom
  bloom.enabled = true
  bloom.uniforms.glowOnly = false
  bloom.uniforms.contrast = 4.5
  bloom.uniforms.brightness = -0.05
  bloom.uniforms.delta = 1.0
  bloom.uniforms.sigma = 2.0
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
