// Configuration for the tactical 2D city and regional map.
//
// Every tile source below is key-free and publicly reachable. Carto's
// basemaps.cartocdn.com now stamps "API KEY REQUIRED" over unkeyed tiles, so it
// is only used when an explicit key is supplied via VITE_CARTO_API_KEY.

const cartoKey = (import.meta.env?.VITE_CARTO_API_KEY as string | undefined)?.trim()

export interface TileSource {
  id: string
  label: string
  url: string
  /** Optional label/reference tiles drawn above the base imagery. */
  labelsUrl?: string
  subdomains?: string
  /** Highest zoom the provider actually serves; higher zooms upscale instead of 404. */
  maxNativeZoom: number
  attribution: string
  /** Applies the CSS dark-inversion filter to raw light tiles. */
  invert?: boolean
}

/** Dark tactical basemaps, best first. Each is tried until one loads. */
export const DARK_SOURCES: TileSource[] = [
  ...(cartoKey
    ? [
        {
          id: 'carto-dark',
          label: 'Carto Dark Matter',
          url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey)}`,
          subdomains: 'abcd',
          maxNativeZoom: 19,
          attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
        } satisfies TileSource,
      ]
    : []),
  {
    id: 'esri-dark',
    label: 'Esri Dark Gray Canvas',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labelsUrl:
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 16,
    attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  },
  {
    id: 'osm-inverted',
    label: 'OpenStreetMap (darkened)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxNativeZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    invert: true,
  },
]

/** Full-colour street basemaps, best first. This is the default view. */
export const STREET_SOURCES: TileSource[] = [
  {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxNativeZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri-street',
    label: 'Esri World Street Map',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
    attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  },
]

export const STANDARD_SOURCE: TileSource = STREET_SOURCES[0]

export const SATELLITE_SOURCE: TileSource = {
  id: 'esri-imagery',
  label: 'Esri World Imagery',
  url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  labelsUrl:
    'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  maxNativeZoom: 19,
  attribution: '&copy; Esri, Maxar, Earthstar Geographics',
}

export const CONFIG = {
  /** Kept for backwards compatibility with older call sites. */
  cartoDarkUrl: DARK_SOURCES[0].url,
  osmUrl: STANDARD_SOURCE.url,
  satelliteUrl: SATELLITE_SOURCE.url,

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
  'tactical-dark': 'Tactical Dark (2D)',
  standard: 'Street Map (2D)',
  satellite: 'ArcGIS Satellite (2D)',
  cloud: 'Geospatial Telemetry (2D)',
  photorealistic: 'Tactical 2D Engine',
  ion: 'Tactical 2D Engine',
}
