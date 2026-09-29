import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  CONFIG,
  DARK_SOURCES,
  SATELLITE_SOURCE,
  STREET_SOURCES,
  type BasemapTier,
  type TileSource,
} from './config'
import type { CameraDirectoryResponse, Criticality, Incident } from '../lib/api'

interface Props {
  incidents: Incident[]
  cameras: CameraDirectoryResponse['cameras']
  selectedId: string | null
  onSelect: (id: string | null) => void
  selectedCameraId?: string | null
  onSelectCamera?: (camera: CameraDirectoryResponse['cameras'][number]) => void
  resetToken: number
  onReady: (tier: BasemapTier) => void
  cameraMode?: 'isometric' | 'topdown' | 'cinematic' | string
}

function getIncidentColor(criticality: Criticality | null | undefined): string {
  switch (criticality) {
    case 'CRITICAL':
      return '#ff2a2a'
    case 'HIGH':
      return '#ff5500'
    case 'MEDIUM':
      return '#ff9500'
    case 'LOW':
      return '#30d158'
    default:
      return '#ff6b1f'
  }
}

/**
 * Builds a base (+ optional label) tile layer group for a source. Raw light
 * tiles get the `fw-tiles-invert` class so they render as a dark tactical map.
 */
function buildTileLayer(src: TileSource): { group: L.LayerGroup; base: L.TileLayer } {
  const common: L.TileLayerOptions = {
    maxZoom: 19,
    maxNativeZoom: src.maxNativeZoom,
    attribution: src.attribution,
    crossOrigin: true,
    className: src.invert ? 'fw-tiles-invert' : undefined,
    ...(src.subdomains ? { subdomains: src.subdomains } : {}),
  }

  const base = L.tileLayer(src.url, common)
  const group = L.layerGroup([base])

  if (src.labelsUrl) {
    group.addLayer(L.tileLayer(src.labelsUrl, { ...common, attribution: '' }))
  }

  return { group, base }
}

export default function CityMap({
  incidents,
  cameras,
  selectedId,
  onSelect,
  selectedCameraId,
  onSelectCamera,
  resetToken,
  onReady,
  cameraMode = 'isometric',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null)
  const camerasLayerRef = useRef<L.LayerGroup | null>(null)

  const selectRef = useRef(onSelect)
  const onSelectCameraRef = useRef(onSelectCamera)
  const readyRef = useRef(onReady)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    selectRef.current = onSelect
    onSelectCameraRef.current = onSelectCamera
    readyRef.current = onReady
  }, [onSelect, onSelectCamera, onReady])

  // --- Map Initialization (Once)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // 1. Create standard 2D Leaflet map
    const map = L.map(host, {
      center: [CONFIG.initialView.lat, CONFIG.initialView.lon],
      zoom: CONFIG.initialView.zoom,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 18,
    })
    mapRef.current = map

    // 2. Base tile layers. Each chain falls forward to the next provider if a
    //    source is unreachable or starts refusing tiles, so the map always
    //    renders real imagery instead of an empty/watermarked canvas.
    const layerCleanups: Array<() => void> = []

    /**
     * Adds a base layer that self-heals: on a sustained run of tile errors it
     * swaps itself for the next provider in the chain, in place, in the
     * layers control.
     */
    const addResilientBase = (chain: TileSource[], name: string, active: boolean) => {
      let index = 0
      let current = buildTileLayer(chain[0])

      const wire = () => {
        let errors = 0
        const onError = () => {
          errors += 1
          // A handful of missing tiles is normal at the edges; a sustained run
          // means the provider is down or blocking us.
          if (errors < 5 || index >= chain.length - 1) return

          const wasActive = map.hasLayer(current.group)
          map.removeLayer(current.group)
          layersControl.removeLayer(current.group)

          index += 1
          current = buildTileLayer(chain[index])
          layersControl.addBaseLayer(current.group, name)
          if (wasActive) current.group.addTo(map)
          wire()
        }
        current.base.on('tileerror', onError)
        layerCleanups.push(() => current.base.off('tileerror', onError))
      }

      if (active) current.group.addTo(map)
      return { get group() { return current.group }, wire }
    }

    // Controls: Zoom on bottom-right, Layers toggle next to it
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const layersControl = L.control
      .layers(undefined, undefined, { position: 'bottomright', collapsed: true })
      .addTo(map)

    // Street map is the default view.
    const street = addResilientBase(STREET_SOURCES, 'Street Map', true)
    const dark = addResilientBase(DARK_SOURCES, 'Tactical Dark', false)
    const satelliteLayer = buildTileLayer(SATELLITE_SOURCE).group

    layersControl.addBaseLayer(street.group, 'Street Map')
    layersControl.addBaseLayer(dark.group, 'Tactical Dark')
    layersControl.addBaseLayer(satelliteLayer, 'Satellite')

    street.wire()
    dark.wire()

    // 3. Telemetry Overlay Groups
    incidentsLayerRef.current = L.layerGroup().addTo(map)
    camerasLayerRef.current = L.layerGroup().addTo(map)

    // Ensure map tiles render full container width/height immediately
    requestAnimationFrame(() => {
      map.invalidateSize()
      setReady(true)
      readyRef.current('standard')
    })

    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)

    // Click background deselects
    map.on('click', e => {
      const target = (e.originalEvent.target as HTMLElement)
      if (!target.closest('.fw-incident-marker') && !target.closest('.fw-camera-marker')) {
        selectRef.current(null)
      }
    })

    return () => {
      window.removeEventListener('resize', onResize)
      layerCleanups.forEach(fn => fn())
      incidentsLayerRef.current?.clearLayers()
      camerasLayerRef.current?.clearLayers()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // --- Render Incidents
  useEffect(() => {
    const layer = incidentsLayerRef.current
    if (!layer || !ready) return

    layer.clearLayers()

    incidents.forEach(incident => {
      if (!Number.isFinite(incident.lat) || !Number.isFinite(incident.lon)) return

      const isSelected = selectedId === incident.id
      const color = getIncidentColor(incident.criticality)
      const confidenceVal = incident.confidence ?? incident.combined_score ?? 0.85
      const criticalityLabel = incident.criticality ?? 'Active'

      const icon = L.divIcon({
        className: 'fw-incident-div-icon',
        html: `
          <div class="fw-incident-marker ${isSelected ? 'is-selected' : ''}" style="--marker-color: ${color};">
            <div class="fw-marker-ring"></div>
            <div class="fw-marker-core">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.6 4.6 8.3L12 22l5.4-1.7C20.2 18.6 22 15.5 22 12c0-5.5-4.5-10-10-10zm-1 5a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0V7zm1 11a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([incident.lat, incident.lon], { icon, zIndexOffset: isSelected ? 1000 : 500 })

      marker.bindTooltip(
        `<div class="fwmap-mono text-[11px] font-bold text-white">${incident.event_id}</div>
         <div class="text-[10px] text-zinc-400 capitalize">${criticalityLabel} · ${Math.round(confidenceVal * 100)}% confidence</div>`,
        { direction: 'top', offset: [0, -14], opacity: 0.95 }
      )

      marker.on('click', e => {
        L.DomEvent.stopPropagation(e)
        selectRef.current(incident.id)
      })

      layer.addLayer(marker)
    })
  }, [incidents, selectedId, ready])

  // --- Render Real-Time Cameras
  useEffect(() => {
    const layer = camerasLayerRef.current
    if (!layer || !ready) return

    layer.clearLayers()

    cameras.forEach(cam => {
      if (!Number.isFinite(cam.lat) || !Number.isFinite(cam.lon)) return

      const isSelected = selectedCameraId === cam.id

      const icon = L.divIcon({
        className: 'fw-camera-div-icon',
        html: `
          <div class="fw-camera-marker ${isSelected ? 'is-selected' : ''}">
            <div class="fw-camera-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <span class="fw-camera-dot"></span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([cam.lat, cam.lon], { icon, zIndexOffset: isSelected ? 900 : 200 })

      marker.bindTooltip(
        `<div class="fwmap-mono text-[11px] font-bold text-white">${cam.name}</div>
         <div class="text-[10px] text-cyan-400 font-mono">Live Optical Station · Click to Inspect</div>`,
        { direction: 'top', offset: [0, -12], opacity: 0.95 }
      )

      marker.on('click', e => {
        L.DomEvent.stopPropagation(e)
        if (onSelectCameraRef.current) {
          onSelectCameraRef.current(cam)
        }
      })

      layer.addLayer(marker)
    })
  }, [cameras, selectedCameraId, ready])

  // --- Pan / Fly to on Incident Selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selectedId) return
    const incident = incidents.find(i => i.id === selectedId)
    if (!incident || !Number.isFinite(incident.lat) || !Number.isFinite(incident.lon)) return

    map.flyTo([incident.lat, incident.lon], Math.max(map.getZoom(), 14), {
      duration: 0.6,
      easeLinearity: 0.3,
    })
  }, [selectedId, incidents, ready])

  // --- Pan / Fly to on Camera Selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selectedCameraId) return
    const cam = cameras.find(c => c.id === selectedCameraId)
    if (!cam || !Number.isFinite(cam.lat) || !Number.isFinite(cam.lon)) return

    map.flyTo([cam.lat, cam.lon], Math.max(map.getZoom(), 14), {
      duration: 0.6,
      easeLinearity: 0.3,
    })
  }, [selectedCameraId, cameras, ready])

  // --- Regional View Presets
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (cameraMode === 'isometric') {
      // Downtown SF
      map.flyTo([CONFIG.presets.downtown.lat, CONFIG.presets.downtown.lon], CONFIG.presets.downtown.zoom, { duration: 0.6 })
    } else if (cameraMode === 'topdown') {
      // Bay Area Regional
      map.flyTo([CONFIG.presets.bayArea.lat, CONFIG.presets.bayArea.lon], CONFIG.presets.bayArea.zoom, { duration: 0.6 })
    } else if (cameraMode === 'cinematic') {
      // Statewide California
      map.flyTo([CONFIG.presets.statewide.lat, CONFIG.presets.statewide.lon], CONFIG.presets.statewide.zoom, { duration: 0.6 })
    }
  }, [cameraMode, resetToken, ready])

  return <div ref={hostRef} className="absolute inset-0 w-full h-full" data-map-ready={ready} />
}
