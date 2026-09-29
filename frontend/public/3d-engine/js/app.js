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
    scene.fog.density = 0.00007;
    scene.globe.showGroundAtmosphere = true;
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

    // Instantiate & kick off the telemetry loop integration layer
    const fireTelemetryPipeline = new FireService(viewer);
    fireTelemetryPipeline.fetchActiveFires();

    // Auto-polling lifecycle tick configuration (30-second synchronization intervals)
    setInterval(() => fireTelemetryPipeline.fetchActiveFires(), 30000);
}

// Fire system runtime
initializationRuntimeMain();
