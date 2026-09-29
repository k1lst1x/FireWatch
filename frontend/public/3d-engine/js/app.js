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
            esri.brightness = 0.74;
            esri.saturation = 0.95;
            esri.contrast = 1.16;
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
    
    // Disable local shadow maps to prevent PC crashes
    scene.shadowMap.enabled = false;
    viewer.resolutionScale = 1.0;
    scene.globe.maximumScreenSpaceError = 3.5;

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

    // Clamp zoom strictly to San Francisco city
    const ssc = scene.screenSpaceCameraController;
    ssc.minimumZoomDistance = 80.0;
    ssc.maximumZoomDistance = 32000.0;
    ssc.enableCollisionDetection = true;

    if (scene.postProcessStages && scene.postProcessStages.bloom) {
        scene.postProcessStages.bloom.enabled = false;
    }
}

/**
 * Frames the San Francisco downtown corridor immediately upon opening
 */
function executeIsometricCameraLock() {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4120, 37.7850, 980.0),
        orientation: {
            heading: Cesium.Math.toRadians(26.0),
            pitch: Cesium.Math.toRadians(-30.0),
            roll: 0.0
        },
        duration: 1.4
    });
}

/**
 * Main Controller Loop Entry Orchestrator
 */
async function initializationRuntimeMain() {
    // Crash recovery
    viewer.renderError.addEventListener((err) => {
        console.warn("[app] WebGL render glitch recovered:", err);
        viewer.useDefaultRenderLoop = true;
    });

    await initGoogle3DTiles();
    injectCinematicEnvironmentStyle();
    executeIsometricCameraLock();

    // Hook up reset button
    const btnReset = document.getElementById("btn-reset-view");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
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
