// Configuration for the 3D city map strictly focused on San Francisco.

const env = import.meta.env as Record<string, string | undefined>

export const CONFIG = {
  /** Google Maps API key with the Map Tiles API enabled. Unlocks photorealistic 3D. */
  googleTilesKey: env.VITE_GOOGLE_3D_TILES_KEY ?? '',
  /** Cesium Ion token. Unlocks world terrain + Cesium OSM Buildings. */
  cesiumIonToken: env.VITE_CESIUM_ION_TOKEN ?? '',

  /** Keyless satellite imagery in rich dusk natural colors */
  imageryUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  /** 10,000 real San Francisco building polygons baked into public/data/sf-buildings.json */
  buildingsUrl: '/data/sf-buildings.json',

  /** Opening shot: High-density San Francisco downtown corridor */
  initialView: {
    longitude: -122.4120,
    latitude: 37.7850,
    height: 980.0,
    pitch: -30.0,
    heading: 26.0,
    roll: 0.0,
    range: 1400,
  },

  /** San Francisco strict geographic bounding box */
  sfBounds: {
    west: -122.520,
    south: 37.700,
    east: -122.355,
    north: 37.835,
  },
} as const

export type BasemapTier = 'photorealistic' | 'ion' | 'cloud'

export const TIER_LABEL: Record<BasemapTier, string> = {
  photorealistic: 'Google Cloud Photorealistic 3D',
  ion: 'Cesium Cloud OSM 3D Stream',
  cloud: 'Cloud Satellite & Geospatial Stream',
}
