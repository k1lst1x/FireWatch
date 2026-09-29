// Configuration for the 3D city map.
//
// Every key here is optional, matching the rest of the project: with no keys at
// all the map still renders a real 3D San Francisco from footprints baked into
// public/data/sf-buildings.json, so a demo can never be blocked on a quota.

const env = import.meta.env as Record<string, string | undefined>

export const CONFIG = {
  /** Google Maps API key with the Map Tiles API enabled. Unlocks photorealistic 3D. */
  googleTilesKey: env.VITE_GOOGLE_3D_TILES_KEY ?? '',
  /** Cesium Ion token. Unlocks world terrain + Cesium OSM Buildings. */
  cesiumIonToken: env.VITE_CESIUM_ION_TOKEN ?? '',

  /** Keyless satellite imagery (the same source the old Leaflet map used). */
  imageryUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  /** Baked San Francisco footprints, used whenever no photorealistic mesh is available. */
  buildingsUrl: '/data/sf-buildings.json',

  /** Opening shot: oblique isometric benchmark anchor (San Francisco, CA) from blueprint */
  initialView: {
    longitude: -122.4194,
    latitude: 37.7749,
    height: 1150.0,
    pitch: -38.5,
    heading: 12.0,
    roll: 0.0,
    range: 3200,
  },
} as const

export type BasemapTier = 'photorealistic' | 'ion' | 'baked'

export const TIER_LABEL: Record<BasemapTier, string> = {
  photorealistic: 'Google Photorealistic 3D',
  ion: 'Cesium OSM Buildings',
  baked: 'OSM footprints · offline',
}
