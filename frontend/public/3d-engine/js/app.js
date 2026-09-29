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
            // Balanced dusk photorealism: dark asphalt roads, rich foliage, zero blown-out water
            esri.brightness = 0.72;
            esri.saturation = 0.95;
            esri.contrast = 1.18;
            esri.gamma = 0.92;
        }
    } catch (error) {
        console.error("[CRITICAL RENDERING FAULT] Mesh load aborted:", error);
    }
}

/**
 * Programmatically transforms default lighting maps to match the dusk digital twin aesthetic.
 */
function injectCinematicEnvironmentStyle() {
    const scene = viewer.scene;
    
    // Enable shadowing subsystem architecture
    scene.shadowMap.enabled = true;
    scene.shadowMap.softShadows = true;
    scene.shadowMap.size = 2048;

    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a111a');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#070b12');

    if (scene.skyAtmosphere) {
        scene.skyAtmosphere.show = true;
        scene.skyAtmosphere.hueShift = -0.05;
        scene.skyAtmosphere.saturationShift = -0.1;
        scene.skyAtmosphere.brightnessShift = -0.12;
    }

    scene.globe.enableLighting = true;

    // Balanced directional twilight light (crisp architectural massing without glowing sun blowout)
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.45, -0.65, -0.55),
        color: Cesium.Color.fromCssColorString('#d6e4f0'),
        intensity: 1.32
    });
    
    scene.fog.enabled = true;
    scene.fog.density = 0.00005;
    scene.globe.showGroundAtmosphere = true;

    if (scene.postProcessStages && scene.postProcessStages.bloom) {
        scene.postProcessStages.bloom.enabled = false;
    }
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
