// Initialize authentication scopes
if (CONFIG.CESIUM_ION_TOKEN && CONFIG.CESIUM_ION_TOKEN !== 'YOUR_CESIUM_ION_ACCESS_TOKEN') {
    Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_ION_TOKEN;
}

// Boot abstract WebGL orchestration layer
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: null, // Avoid conflicts; elevation layers are packaged into Google 3D Tilesets
    animation: false,
    timeline: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: true,
    selectionIndicator: true
});

/**
 * Streams photorealistic 3D mesh arrays natively into GPU memory spaces.
 */
async function initGoogle3DTiles() {
    try {
        if (CONFIG.GOOGLE_TILES_KEY && CONFIG.GOOGLE_TILES_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
            const tileset = await Cesium.createGooglePhotorealistic3DTileset(CONFIG.GOOGLE_TILES_KEY);
            viewer.scene.primitives.add(tileset);
        } else {
            console.log("[Notice] Using Cesium World Terrain fallback (set GOOGLE_TILES_KEY for Photorealistic 3D mesh).");
            viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
        }
    } catch (error) {
        console.error("[CRITICAL RENDERING FAULT] Mesh load aborted:", error);
    }
}

/**
 * Programmatically transforms default lighting maps to match the dark, high-contrast, cinematic twilight reference layout.
 */
function injectCinematicEnvironmentStyle() {
    const scene = viewer.scene;
    
    // Enable shadowing subsystem architecture
    scene.shadowMap.enabled = true;
    scene.shadowMap.softShadows = true;
    scene.shadowMap.size = 2048; // Upscale shadow texture resolution maps

    // Map localized dark slate ambient matrix vectors
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.6, -0.4, -0.8),
        color: Cesium.Color.fromCssColorString('#141923'), // Deep twilight base blue tint
        intensity: 2.2 // Overdrive ambient mapping parameters to sculpt crisp edges
    });
    
    scene.globe.enableLighting = true;
    scene.fog.enabled = true;
    scene.fog.density = 0.0002;
}

/**
 * Drives camera matrices into deep oblique isometric positioning configurations
 */
function executeIsometricCameraLock() {
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
            CONFIG.INITIAL_VIEW.longitude,
            CONFIG.INITIAL_VIEW.latitude,
            CONFIG.INITIAL_VIEW.height
        ),
        orientation: {
            heading: Cesium.Math.toRadians(CONFIG.INITIAL_VIEW.heading),
            pitch: Cesium.Math.toRadians(CONFIG.INITIAL_VIEW.pitch),
            roll: CONFIG.INITIAL_VIEW.roll
        }
    });
}

/**
 * Main Controller Loop Entry Orchestrator
 */
async function initializationRuntimeMain() {
    await initGoogle3DTiles();
    injectCinematicEnvironmentStyle();
    executeIsometricCameraLock();

    // Instantiate & kick off the telemetry loop integration layer
    const fireTelemetryPipeline = new FireService(viewer);
    fireTelemetryPipeline.fetchActiveFires();

    // Auto-polling lifecycle tick configuration (30-second synchronization intervals)
    setInterval(() => fireTelemetryPipeline.fetchActiveFires(), 30000);
}

// Fire system runtime
initializationRuntimeMain();
