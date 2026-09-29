import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { applyCinematicStyle, buildCity, frameDowntown } from './basemap'
import { FireLayer } from './fireLayer'
import { type BasemapTier } from './config'
import type { Incident } from '../lib/api'

interface Props {
  incidents: Incident[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Bumping this flies the camera back to the opening shot. */
  resetToken: number
  onReady: (tier: BasemapTier) => void
  cameraMode?: 'california' | 'isometric' | 'topdown' | 'cinematic'
}

export default function CityMap({ incidents, selectedId, onSelect, resetToken, onReady, cameraMode = 'isometric' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const layerRef = useRef<FireLayer | null>(null)
  const selectRef = useRef(onSelect)
  const readyRef = useRef(onReady)
  const [ready, setReady] = useState(false)

  // keep the latest callbacks reachable from the long-lived Cesium handlers
  useEffect(() => {
    selectRef.current = onSelect
    readyRef.current = onReady
  }, [onSelect, onReady])

  // --- viewer lifecycle (once)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const signal = { cancelled: false }

    const viewer = new Cesium.Viewer(host, {
      animation: false,
      timeline: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      homeButton: false,
      geocoder: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      creditContainer: document.createElement('div'),
      baseLayer: false,
      terrain: Cesium.Terrain.fromWorldTerrain({
        requestWaterMask: true,
        requestVertexNormals: true,
      }),
    })
    viewerRef.current = viewer

    // Enable terrain occlusion so mountain ridges and buildings properly occlude
    viewer.scene.globe.depthTestAgainstTerrain = true

    // Clock.shouldAnimate is false by default and the animation widget (which
    // normally turns it on) is disabled here. Without this the particle systems
    // get a zero time delta and never emit, and clock-driven properties freeze.
    viewer.clock.shouldAnimate = true

    applyCinematicStyle(viewer)
    frameDowntown(viewer)
    layerRef.current = new FireLayer(viewer)

    // click a column to select its incident
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position)
      const id = picked?.id?.id
      if (typeof id === 'string' && (id.startsWith('fire:') || id.startsWith('label:'))) {
        selectRef.current(id.slice(id.indexOf(':') + 1))
      } else {
        selectRef.current(null)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    buildCity(viewer, signal)
      .then(tier => {
        if (signal.cancelled) return
        setReady(true)
        readyRef.current(tier)
      })
      .catch(err => {
        console.error('[map] city build failed', err)
        if (!signal.cancelled) {
          setReady(true)
          readyRef.current('baked')
        }
      })

    return () => {
      signal.cancelled = true
      handler.destroy()
      layerRef.current?.destroy()
      layerRef.current = null
      viewerRef.current = null
      if (!viewer.isDestroyed()) viewer.destroy()
    }
  }, [])

  // --- incidents
  useEffect(() => {
    if (!ready) return
    layerRef.current?.render(incidents)
  }, [incidents, ready])

  // --- selection: highlight and fly in
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready) return
    layerRef.current?.setFocus(selectedId)
    if (!selectedId) return
    const incident = incidents.find(i => i.id === selectedId)
    if (!incident) return
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(incident.lon, incident.lat - 0.0115, 1150),
      orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-28), roll: 0 },
      duration: 1.8,
    })
  }, [selectedId, incidents, ready])

  // --- reset view
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready || resetToken === 0) return
    frameDowntown(viewer)
  }, [resetToken, ready])

  // --- camera modes from blueprint
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready) return

    if (cameraMode === 'california') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-119.5, 36.4, 520000),
        orientation: {
          heading: Cesium.Math.toRadians(348),
          pitch: Cesium.Math.toRadians(-48),
          roll: 0,
        },
        duration: 2.2,
      })
    } else if (cameraMode === 'isometric') {
      frameDowntown(viewer)
    } else if (cameraMode === 'topdown') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 3600),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
        duration: 1.6,
      })
    } else if (cameraMode === 'cinematic') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.445, 37.755, 1800),
        orientation: {
          heading: Cesium.Math.toRadians(45),
          pitch: Cesium.Math.toRadians(-22),
          roll: 0,
        },
        duration: 2.2,
      })
    }
  }, [cameraMode, ready])

  return <div ref={hostRef} className="absolute inset-0" data-map-ready={ready} />
}
