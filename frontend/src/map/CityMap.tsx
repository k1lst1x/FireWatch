import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { applyCinematicStyle, buildCity, frameDowntown } from './basemap'
import { FireLayer } from './fireLayer'
import { type BasemapTier } from './config'
import type { Incident } from '../lib/api'
import {
  CaliforniaTourController,
  type TourStop,
  type TourState,
  prerenderCaliforniaSectors,
} from './californiaTour'

interface Props {
  incidents: Incident[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Bumping this flies the camera back to the opening shot. */
  resetToken: number
  onReady: (tier: BasemapTier) => void
  cameraMode?: 'california' | 'isometric' | 'topdown' | 'cinematic'
  autoTour?: boolean
  onTourChange?: (stop: TourStop, index: number, total: number, state: TourState) => void
  tourControllerRef?: React.MutableRefObject<CaliforniaTourController | null>
  onPrerenderProgress?: (current: number, total: number, stopName: string) => void
}

export default function CityMap({
  incidents,
  selectedId,
  onSelect,
  resetToken,
  onReady,
  cameraMode = 'isometric',
  autoTour = false,
  onTourChange,
  tourControllerRef,
  onPrerenderProgress,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const layerRef = useRef<FireLayer | null>(null)
  const tourRef = useRef<CaliforniaTourController | null>(null)
  const selectRef = useRef(onSelect)
  const readyRef = useRef(onReady)
  const tourChangeRef = useRef(onTourChange)
  const prerenderRef = useRef(onPrerenderProgress)
  const [ready, setReady] = useState(false)

  // keep the latest callbacks reachable from the long-lived Cesium handlers
  useEffect(() => {
    selectRef.current = onSelect
    readyRef.current = onReady
    tourChangeRef.current = onTourChange
    prerenderRef.current = onPrerenderProgress
  }, [onSelect, onReady, onTourChange, onPrerenderProgress])

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

    // Guard against uncaught rendering errors so single asset faults never kill rendering
    viewer.scene.renderError.addEventListener((_scene, error) => {
      console.warn('[Cesium Engine Guard] Handled transient render event:', error)
    })

    // Configure silky-smooth camera controls with collision limits
    const ssc = viewer.scene.screenSpaceCameraController
    ssc.enableRotate = true
    ssc.enableTranslate = true
    ssc.enableZoom = true
    ssc.enableTilt = true
    ssc.enableLook = true
    ssc.inertiaSpin = 0.85
    ssc.inertiaTranslate = 0.85
    ssc.inertiaZoom = 0.8
    ssc.minimumZoomDistance = 30.0
    ssc.maximumZoomDistance = 8000000.0

    // When the user starts manual navigation with mouse/touch, pause tour cleanly
    const canvas = viewer.scene.canvas
    const pauseOnInteraction = () => {
      if (tourRef.current?.isActive() && tourRef.current.getState() !== 'paused') {
        tourRef.current.pause()
      }
    }
    canvas.addEventListener('pointerdown', pauseOnInteraction, { passive: true })
    canvas.addEventListener('wheel', pauseOnInteraction, { passive: true })

    // Instantiate California Tour & Autopilot Controller
    const controller = new CaliforniaTourController(viewer)
    tourRef.current = controller
    if (tourControllerRef) tourControllerRef.current = controller

    controller.addListener({
      onStopChange: (stop, idx, tot, state) => {
        tourChangeRef.current?.(stop, idx, tot, state)
      },
      onStateChange: () => {},
    })

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

        // Pre-warm / pre-render the California sectors in background
        prerenderCaliforniaSectors(viewer, (cur, tot, stop) => {
          if (!signal.cancelled) {
            prerenderRef.current?.(cur, tot, stop.name)
          }
        }).catch(err => console.warn('[map] pre-render notice:', err))
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
      canvas.removeEventListener('pointerdown', pauseOnInteraction)
      canvas.removeEventListener('wheel', pauseOnInteraction)
      controller.stop()
      handler.destroy()
      layerRef.current?.destroy()
      layerRef.current = null
      viewerRef.current = null
      tourRef.current = null
      if (tourControllerRef) tourControllerRef.current = null
      if (!viewer.isDestroyed()) viewer.destroy()
    }
  }, [tourControllerRef])

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
    tourRef.current?.stop()
    frameDowntown(viewer)
  }, [resetToken, ready])

  // --- auto tour control
  useEffect(() => {
    const controller = tourRef.current
    if (!controller || !ready) return

    if (autoTour) {
      controller.start()
    } else {
      if (controller.isActive()) {
        controller.stop()
      }
    }
  }, [autoTour, ready])

  // --- camera modes from blueprint
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready || autoTour) return

    try {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    } catch {
      // safe guard
    }

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
  }, [cameraMode, ready, autoTour])

  return <div ref={hostRef} className="absolute inset-0" data-map-ready={ready} />
}
