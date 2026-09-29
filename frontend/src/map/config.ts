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

  /** Opening shot: crisp oblique isometric framing matching Image 2 architectural scale */
  initialView: {
    longitude: -122.4120,
    latitude: 37.7850,
    height: 720.0,
    pitch: -32.0,
    heading: 28.0,
    roll: 0.0,
    range: 1650,
  },
} as const

export type BasemapTier = 'photorealistic' | 'ion' | 'baked'

export const TIER_LABEL: Record<BasemapTier, string> = {
  photorealistic: 'Google Photorealistic 3D',
  ion: 'Cesium OSM Buildings',
  baked: 'OSM footprints · offline',
}
