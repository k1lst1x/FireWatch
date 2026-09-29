// Configuration for the tactical 2D city and regional map.

export const CONFIG = {
  /** Keyless satellite imagery in rich dusk natural colors */
  imageryUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

  /** CartoDB Dark Matter basemap tiles (fast, beautiful, dark tactical theme) */
  cartoDarkUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',

  /** Opening shot: San Francisco downtown corridor */
  initialView: {
    lat: 37.7749,
    lon: -122.4194,
    zoom: 13,
  },

  /** Regional presets */
  presets: {
    downtown: { lat: 37.7749, lon: -122.4194, zoom: 13, name: 'Downtown SF' },
    bayArea: { lat: 37.6000, lon: -122.2500, zoom: 10, name: 'Bay Area' },
    statewide: { lat: 36.7783, lon: -119.4179, zoom: 6, name: 'California' },
  },

  /** San Francisco strict geographic bounding box */
  sfBounds: {
    west: -122.520,
    south: 37.700,
    east: -122.355,
    north: 37.835,
  },
} as const

export type BasemapTier = 'tactical-dark' | 'satellite' | 'standard' | 'cloud' | 'photorealistic' | 'ion'

export const TIER_LABEL: Record<string, string> = {
  'tactical-dark': 'Tactical Dark Matter (2D)',
  satellite: 'ArcGIS Satellite (2D)',
  cloud: 'Geospatial Telemetry (2D)',
  photorealistic: 'Tactical 2D Engine',
  ion: 'Tactical 2D Engine',
}
