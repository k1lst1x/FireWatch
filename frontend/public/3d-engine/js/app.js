// Initialize authentication scopes
if (CONFIG.CESIUM_ION_TOKEN && CONFIG.CESIUM_ION_TOKEN !== 'YOUR_CESIUM_ION_ACCESS_TOKEN') {
    Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_ION_TOKEN;
}

// Boot abstract WebGL orchestration layer
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: null,
    animation: false,
    timeline: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: true,
    selectionIndicator: true
});

/**
 * Streams photorealistic 3D mesh arrays natively into GPU memory spaces,
 * or loads vibrant photorealistic satellite imagery as fallback.
 */
async function initGoogle3DTiles() {
    try {
        if (CONFIG.GOOGLE_TILES_KEY && CONFIG.GOOGLE_TILES_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
            const tileset = await Cesium.createGooglePhotorealistic3DTileset(CONFIG.GOOGLE_TILES_KEY);
            viewer.scene.primitives.add(tileset);
            viewer.scene.globe.show = false;
        } else {
            console.log("[Notice] Loading high-resolution photorealistic imagery in vibrant natural color.");
            const layers = viewer.imageryLayers;
            layers.removeAll();
            const esri = layers.addImageryProvider(
                new Cesium.UrlTemplateImageryProvider({
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    maximumLevel: 19,
                    credit: new Cesium.Credit('Imagery © Esri', false),
                })
            );
            // Rich photorealistic colors (lush greens, natural building and road tones)
            esri.brightness = 1.08;
            esri.saturation = 1.2;
            esri.contrast = 1.06;
            esri.gamma = 1.0;
        }
    } catch (error) {
        console.error("[CRITICAL RENDERING FAULT] Mesh load aborted:", error);
    }
}

/**
 * Programmatically transforms default lighting maps to match Image 2's crisp, photorealistic architectural standard.
 */
function injectCinematicEnvironmentStyle() {
    const scene = viewer.scene;
    
    // Enable shadowing subsystem architecture
    scene.shadowMap.enabled = true;
    scene.shadowMap.softShadows = true;
    scene.shadowMap.size = 2048;

    scene.globe.baseColor = Cesium.Color.fromCssColorString('#243042');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#111827');

    if (scene.skyAtmosphere) {
        scene.skyAtmosphere.show = true;
        scene.skyAtmosphere.hueShift = 0.0;
        scene.skyAtmosphere.saturationShift = 0.15;
        scene.skyAtmosphere.brightnessShift = 0.05;
    }

    scene.globe.enableLighting = true;

    // Crisp, warm architectural sunlight (sculpts facades, revealing trees, sidewalks, and streets like Image 2)
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.5, -0.65, -0.55),
        color: Cesium.Color.fromCssColorString('#fff6e8'),
        intensity: 2.6
    });
    
    scene.fog.enabled = true;
    scene.fog.density = 0.00005;
    scene.globe.showGroundAtmosphere = true;

    // Expand globe terrain and tile cache for California pre-rendering
    scene.globe.tileCacheSize = 3000;
    scene.globe.preloadAncestors = true;
    scene.globe.preloadSiblings = true;
    scene.globe.depthTestAgainstTerrain = true;

    if (scene.postProcessStages && scene.postProcessStages.bloom) {
        scene.postProcessStages.bloom.enabled = false;
    }
}

/** California 3D Exploration Waypoints */
const CALIFORNIA_WAYPOINTS = [
    { name: "San Francisco Downtown", lon: -122.412, lat: 37.785, height: 1150, heading: 28, pitch: -32, duration: 3.5 },
    { name: "Marin Headlands & Golden Gate", lon: -122.482, lat: 37.828, height: 1600, heading: 142, pitch: -24, duration: 4.0 },
    { name: "Napa Valley Ridgeline", lon: -122.46, lat: 38.51, height: 3400, heading: 345, pitch: -28, duration: 4.2 },
    { name: "Lake Tahoe & Sierra Crest", lon: -120.035, lat: 39.09, height: 6200, heading: 42, pitch: -30, duration: 4.8 },
    { name: "Yosemite Valley & Half Dome", lon: -119.54, lat: 37.74, height: 4800, heading: 82, pitch: -32, duration: 4.5 },
    { name: "Big Sur Coastal Ridge", lon: -121.81, lat: 36.275, height: 3800, heading: 330, pitch: -26, duration: 4.5 },
    { name: "Los Angeles & San Gabriel Mtns", lon: -118.245, lat: 34.055, height: 5200, heading: 12, pitch: -34, duration: 4.8 },
    { name: "Statewide California Overview", lon: -119.5, lat: 36.4, height: 520000, heading: 348, pitch: -48, duration: 4.2 }
];

let tourActive = false;
let tourIndex = 0;
let tourTimer = null;

function flyToStop(index) {
    if (!tourActive) return;
    const stop = CALIFORNIA_WAYPOINTS[index % CALIFORNIA_WAYPOINTS.length];
    const statusEl = document.getElementById("tour-status");
    if (statusEl) {
        statusEl.style.display = "block";
        statusEl.textContent = `[${(index % CALIFORNIA_WAYPOINTS.length) + 1}/${CALIFORNIA_WAYPOINTS.length}] ${stop.name}`;
    }

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, stop.height),
        orientation: {
            heading: Cesium.Math.toRadians(stop.heading),
            pitch: Cesium.Math.toRadians(stop.pitch),
            roll: 0.0
        },
        duration: stop.duration,
        complete: () => {
            if (!tourActive) return;
            tourTimer = setTimeout(() => {
                if (!tourActive) return;
                tourIndex = (tourIndex + 1) % CALIFORNIA_WAYPOINTS.length;
                flyToStop(tourIndex);
            }, 7000);
        }
    });
}

function startAutoTour() {
    tourActive = true;
    const btnLabel = document.getElementById("tour-btn-label");
    const tourIcon = document.getElementById("tour-icon");
    if (btnLabel) btnLabel.textContent = "Stop Tour";
    if (tourIcon) tourIcon.textContent = "⏹";
    flyToStop(tourIndex);
}

function stopAutoTour() {
    tourActive = false;
    if (tourTimer) {
        clearTimeout(tourTimer);
        tourTimer = null;
    }
    const btnLabel = document.getElementById("tour-btn-label");
    const tourIcon = document.getElementById("tour-icon");
    const statusEl = document.getElementById("tour-status");
    if (btnLabel) btnLabel.textContent = "Auto Explore CA";
    if (tourIcon) tourIcon.textContent = "▶";
    if (statusEl) statusEl.style.display = "none";
    viewer.camera.cancelFlight();
}

/**
 * Drives camera matrices into deep oblique isometric positioning configurations
 */
function executeIsometricCameraLock() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
            CONFIG.INITIAL_VIEW.longitude,
            CONFIG.INITIAL_VIEW.latitude,
            CONFIG.INITIAL_VIEW.height || 750.0
        ),
        orientation: {
            heading: Cesium.Math.toRadians(CONFIG.INITIAL_VIEW.heading),
            pitch: Cesium.Math.toRadians(CONFIG.INITIAL_VIEW.pitch),
            roll: CONFIG.INITIAL_VIEW.roll || 0.0
        },
        duration: 1.5
    });
}

/**
 * Main Controller Loop Entry Orchestrator
 */
async function initializationRuntimeMain() {
    await initGoogle3DTiles();
    injectCinematicEnvironmentStyle();
    executeIsometricCameraLock();

    // Hook up UI buttons
    const btnTour = document.getElementById("btn-auto-tour");
    if (btnTour) {
        btnTour.addEventListener("click", () => {
            if (tourActive) stopAutoTour();
            else startAutoTour();
        });
    }

    const btnReset = document.getElementById("btn-reset-view");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            if (tourActive) stopAutoTour();
            executeIsometricCameraLock();
        });
    }

    // Instantiate & kick off the telemetry loop integration layer
    const fireTelemetryPipeline = new FireService(viewer);
    fireTelemetryPipeline.fetchActiveFires();

    // Auto-polling lifecycle tick configuration (30-second synchronization intervals)
    setInterval(() => fireTelemetryPipeline.fetchActiveFires(), 30000);
}

// Fire system runtime
initializationRuntimeMain();
