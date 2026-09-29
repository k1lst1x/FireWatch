import * as Cesium from 'cesium'
import { CONFIG, type BasemapTier } from './config'
import { addBakedBuildings } from './buildings'

/**
 * Builds the 3D digital twin strictly for San Francisco:
 *
 *   1. Cesium OSM Buildings with architectural dusk styling (if Ion token available)
 *   2. Baked San Francisco footprints (10,000 polygons, completely offline & crash-proof)
 */
export async function buildCity(
  viewer: Cesium.Viewer,
  signal: { cancelled: boolean },
): Promise<BasemapTier> {
  await addKeylessImagery(viewer)

  // 1. San Francisco 3D OSM buildings with realistic architectural styling
  if (CONFIG.cesiumIonToken) {
    try {
      Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken
      const osm = await Cesium.createOsmBuildingsAsync()
      if (signal.cancelled) return 'ion'
      applyArchitecturalStyle(osm)
      viewer.scene.primitives.add(osm)
      return 'ion'
    } catch (err) {
      console.warn('[map] Ion OSM buildings unavailable, falling back to baked SF footprints', err)
    }
  }

  // 2. Baked San Francisco 3D building polygons (offline, lightweight & crash-proof)
  await addBakedBuildings(viewer, signal)
  return 'baked'
}

/** Apply realistic, natural architectural materials matching the reference dusk digital twin */
export function applyArchitecturalStyle(tileset: Cesium.Cesium3DTileset) {
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        // High-rise glass & steel towers (> 80m) - sleek dusk slate/navy glass
        ['${feature["cesium#estimatedHeight"]} >= 110', 'color("#3a4b5d")'],
        ['${feature["cesium#estimatedHeight"]} >= 65', 'color("#445669")'],
        // Commercial & civic mid-rises (35m - 65m) - refined architectural limestone & precast concrete
        ['${feature["cesium#estimatedHeight"]} >= 35', 'color("#545a64")'],
        ['${feature["cesium#estimatedHeight"]} >= 18', 'color("#5a6068")'],
        // Low-rise residential & mixed use (< 18m) - warm urban masonry & matte concrete
        ['${feature["building"]} === "residential" || ${feature["building"]} === "apartments" || ${feature["building"]} === "house"', 'color("#58544f")'],
        ['${feature["building"]} === "commercial" || ${feature["building"]} === "office"', 'color("#4f5864")'],
        ['${feature["building"]} === "retail" || ${feature["building"]} === "supermarket"', 'color("#53555a")'],
        ['${feature["building"]} === "industrial" || ${feature["building"]} === "warehouse"', 'color("#494b50")'],
        // Natural default architectural tone
        ['true', 'color("#535860")'],
      ],
    },
  })
}

/** Satellite imagery in rich, natural dusk color (deep asphalt roads, lush green foliage) */
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
  // Balanced dusk photorealism: dark charcoal asphalt roads, lush natural trees, zero blown-out water
  layer.brightness = 0.74
  layer.saturation = 0.95
  layer.contrast = 1.16
  layer.gamma = 0.92
}

/** Programmatically transforms lighting maps to match the reference dusk digital twin aesthetic */
export function applyCinematicStyle(viewer: Cesium.Viewer) {
  const scene = viewer.scene

  // Enable shadowing subsystem architecture with high-res texture maps
  scene.shadowMap.enabled = true
  scene.shadowMap.softShadows = true
  scene.shadowMap.size = 2048

  // Base earth colors: deep navy/slate dusk tones, not pitch black void and not glowing
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a111a')
  scene.backgroundColor = Cesium.Color.fromCssColorString('#070b12')

  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true
    scene.skyAtmosphere.hueShift = -0.05
    scene.skyAtmosphere.saturationShift = -0.1
    scene.skyAtmosphere.brightnessShift = -0.12
  }
  if (scene.skyBox) scene.skyBox.show = false

  scene.globe.enableLighting = true

  // Balanced directional twilight light (crisp architectural shadows, NO glowing sun blowout)
  scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0.45, -0.65, -0.55),
    color: Cesium.Color.fromCssColorString('#d6e4f0'),
    intensity: 1.32,
  })

  // Atmospheric fog: clean, clear visibility like modern 3D digital twins
  scene.fog.enabled = true
  scene.fog.density = 0.00005
  scene.globe.showGroundAtmosphere = true

  // CRITICAL: Bloom remains disabled to prevent blinding nuclear water blowout or glowing sun
  scene.postProcessStages.bloom.enabled = false
}

/**
 * Frames the San Francisco downtown cluster with crisp oblique isometric positioning
 */
export function frameDowntown(viewer: Cesium.Viewer) {
  const v = CONFIG.initialView
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      v.longitude,
      v.latitude,
      v.height,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(v.heading),
      pitch: Cesium.Math.toRadians(v.pitch),
      roll: 0.0,
    },
    duration: 1.4,
  })
}
