import * as Cesium from 'cesium'

export interface TourStop {
  id: string
  name: string
  region: string
  description: string
  lon: number
  lat: number
  height: number
  headingDeg: number
  pitchDeg: number
  rollDeg?: number
  duration: number
  holdTime: number
}

export const CALIFORNIA_TOUR_STOPS: TourStop[] = [
  {
    id: 'sf-downtown',
    name: 'San Francisco Downtown',
    region: 'Bay Area Sector',
    description: 'High-density urban architectural digital twin & Transbay corridor',
    lon: -122.412,
    lat: 37.785,
    height: 1150,
    headingDeg: 28,
    pitchDeg: -32,
    duration: 3.2,
    holdTime: 7.0,
  },
  {
    id: 'marin-golden-gate',
    name: 'Marin Headlands & Golden Gate',
    region: 'North Coast Sector',
    description: 'Pacific ocean entrance, coastal bluffs, and wildland-urban interface',
    lon: -122.482,
    lat: 37.828,
    height: 1600,
    headingDeg: 142,
    pitchDeg: -24,
    duration: 3.8,
    holdTime: 7.0,
  },
  {
    id: 'napa-valley',
    name: 'Napa & Mayacamas Ridge',
    region: 'Wine Country Sector',
    description: 'Complex mountain topography, dry brush corridors & thermal monitoring',
    lon: -122.46,
    lat: 38.51,
    height: 3400,
    headingDeg: 345,
    pitchDeg: -28,
    duration: 4.2,
    holdTime: 7.0,
  },
  {
    id: 'lake-tahoe',
    name: 'Lake Tahoe & Sierra Crest',
    region: 'Sierra Nevada Sector',
    description: 'High alpine peaks (9,000+ ft), dense coniferous forests & watershed',
    lon: -120.035,
    lat: 39.09,
    height: 6200,
    headingDeg: 42,
    pitchDeg: -30,
    duration: 4.5,
    holdTime: 7.0,
  },
  {
    id: 'yosemite',
    name: 'Yosemite Valley & Half Dome',
    region: 'Central Sierra Sector',
    description: 'Dramatic glacial granite canyons, wilderness buffer & canopy sensors',
    lon: -119.54,
    lat: 37.74,
    height: 4800,
    headingDeg: 82,
    pitchDeg: -32,
    duration: 4.5,
    holdTime: 7.0,
  },
  {
    id: 'big-sur',
    name: 'Big Sur & Santa Lucia Range',
    region: 'Central Coast Sector',
    description: 'Steep coastal escarpments plunging into the Pacific Ocean',
    lon: -121.81,
    lat: 36.275,
    height: 3800,
    headingDeg: 330,
    pitchDeg: -26,
    duration: 4.2,
    holdTime: 7.0,
  },
  {
    id: 'la-basin',
    name: 'Los Angeles & San Gabriel Mtns',
    region: 'Southern California Sector',
    description: 'High-fire-risk Santa Ana wind corridors & Angeles National Forest foothills',
    lon: -118.245,
    lat: 34.055,
    height: 5200,
    headingDeg: 12,
    pitchDeg: -34,
    duration: 4.8,
    holdTime: 7.0,
  },
  {
    id: 'california-overview',
    name: 'State of California Macro Twin',
    region: 'Statewide Sector',
    description: 'Comprehensive 3D topographical macro view from Pacific to Sierra Nevada',
    lon: -119.5,
    lat: 36.4,
    height: 520000,
    headingDeg: 348,
    pitchDeg: -48,
    duration: 4.2,
    holdTime: 8.0,
  },
]

/**
 * Configure Cesium's memory and tile caching subsystems for high-performance California 3D rendering.
 * Expands cache sizes so once tiles are fetched, they remain resident without popping or stuttering.
 */
export function optimizeCaliforniaRendering(viewer: Cesium.Viewer, tileset?: Cesium.Cesium3DTileset) {
  const scene = viewer.scene
  const globe = scene.globe

  // Expand terrain tile cache from default 100 to 3000 tiles
  globe.tileCacheSize = 3000
  globe.preloadAncestors = true
  globe.preloadSiblings = true
  globe.maximumScreenSpaceError = 2.0
  globe.loadingDescendantLimit = 30

  if (tileset) {
    // Expand GPU tile memory cache pool to 2048MB (2GB) for statewide caching
    tileset.cacheBytes = 2048 * 1024 * 1024
    tileset.preloadWhenHidden = true
    tileset.preloadFlightDestinations = true
    tileset.immediatelyLoadDesiredLevelOfDetail = true
    tileset.maximumScreenSpaceError = 16
    tileset.dynamicScreenSpaceError = true
    tileset.dynamicScreenSpaceErrorDensity = 0.00278
    tileset.dynamicScreenSpaceErrorFactor = 4.0
  }
}

/**
 * Pre-warms and pre-caches the California stops into GPU & CPU cache.
 * Executes quick non-intrusive frustum sweeps so geometry and textures
 * are ready when the user initiates exploration.
 */
export async function prerenderCaliforniaSectors(
  viewer: Cesium.Viewer,
  onProgress?: (index: number, total: number, stop: TourStop) => void,
): Promise<void> {
  const total = CALIFORNIA_TOUR_STOPS.length

  for (let i = 0; i < total; i++) {
    const stop = CALIFORNIA_TOUR_STOPS[i]
    onProgress?.(i + 1, total, stop)

    // Pre-calculate target Cartesian coordinate
    const target = Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, stop.height)
    
    // Request tile load for target bounding sphere
    const sphere = new Cesium.BoundingSphere(target, stop.height * 1.5)
    viewer.scene.camera.viewBoundingSphere(sphere, new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(stop.headingDeg),
      Cesium.Math.toRadians(stop.pitchDeg),
      stop.height,
    ))

    // Allow frame loop to process mesh dispatch
    await new Promise<void>(resolve => {
      let frames = 0
      const removeListener = viewer.scene.postRender.addEventListener(() => {
        frames++
        if (frames >= 3) {
          removeListener()
          resolve()
        }
      })
    })
  }
}

export type TourState = 'idle' | 'flying' | 'hovering' | 'paused'

export interface TourControllerListener {
  onStopChange: (stop: TourStop, index: number, total: number, state: TourState) => void
  onStateChange: (state: TourState) => void
}

/**
 * Autopilot tour controller that smoothly flies across California in an automated loop.
 */
export class CaliforniaTourController {
  private viewer: Cesium.Viewer
  private currentIndex = 0
  private state: TourState = 'idle'
  private hoverTimer: number | null = null
  private listeners: TourControllerListener[] = []
  private active = false

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  addListener(listener: TourControllerListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    const currentStop = CALIFORNIA_TOUR_STOPS[this.currentIndex]
    for (const l of this.listeners) {
      l.onStopChange(currentStop, this.currentIndex, CALIFORNIA_TOUR_STOPS.length, this.state)
      l.onStateChange(this.state)
    }
  }

  start(startIndex = 0) {
    this.active = true
    this.currentIndex = startIndex % CALIFORNIA_TOUR_STOPS.length
    this.flyToCurrent()
  }

  stop() {
    this.active = false
    this.state = 'idle'
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.viewer.camera.cancelFlight()
    this.notify()
  }

  pause() {
    if (!this.active) return
    this.state = 'paused'
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.viewer.camera.cancelFlight()
    this.notify()
  }

  resume() {
    if (!this.active) return
    this.flyToCurrent()
  }

  next() {
    if (!this.active) this.active = true
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.currentIndex = (this.currentIndex + 1) % CALIFORNIA_TOUR_STOPS.length
    this.flyToCurrent()
  }

  previous() {
    if (!this.active) this.active = true
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.currentIndex = (this.currentIndex - 1 + CALIFORNIA_TOUR_STOPS.length) % CALIFORNIA_TOUR_STOPS.length
    this.flyToCurrent()
  }

  jumpTo(index: number) {
    if (!this.active) this.active = true
    if (this.hoverTimer !== null) {
      window.clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.currentIndex = index % CALIFORNIA_TOUR_STOPS.length
    this.flyToCurrent()
  }

  private flyToCurrent() {
    if (!this.active) return
    const stop = CALIFORNIA_TOUR_STOPS[this.currentIndex]
    this.state = 'flying'
    this.notify()

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, stop.height),
      orientation: {
        heading: Cesium.Math.toRadians(stop.headingDeg),
        pitch: Cesium.Math.toRadians(stop.pitchDeg),
        roll: stop.rollDeg ? Cesium.Math.toRadians(stop.rollDeg) : 0,
      },
      duration: stop.duration,
      complete: () => {
        if (!this.active) return
        this.state = 'hovering'
        this.notify()

        // Wait holdTime then fly to next stop automatically
        this.hoverTimer = window.setTimeout(() => {
          if (!this.active || this.state === 'paused') return
          this.currentIndex = (this.currentIndex + 1) % CALIFORNIA_TOUR_STOPS.length
          this.flyToCurrent()
        }, stop.holdTime * 1000)
      },
      cancel: () => {
        if (this.active && this.state !== 'paused') {
          this.state = 'idle'
          this.notify()
        }
      },
    })
  }

  getState(): TourState {
    return this.state
  }

  getCurrentStop(): TourStop {
    return CALIFORNIA_TOUR_STOPS[this.currentIndex]
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  isActive(): boolean {
    return this.active
  }
}
