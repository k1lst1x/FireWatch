const CONFIG = {
    // API Tokens & Infrastructure Registration
    CESIUM_ION_TOKEN: window.CESIUM_ION_TOKEN || 'YOUR_CESIUM_ION_ACCESS_TOKEN',
    GOOGLE_TILES_KEY: window.GOOGLE_TILES_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // Aggregator Connection Node Endpoint
    BACKEND_API_URL: 'js/mockFires.json',

    // Viewport Spatial Matrices (Matched to Isometric Reference Archetype)
    INITIAL_VIEW: {
        longitude: -122.4194, // Standard Benchmark Anchor: San Francisco, CA
        latitude: 37.7749,
        height: 1150.0,       // Distance metric (meters above sea level)
        pitch: -38.5,         // Oblique orientation mapping parameter
        heading: 12.0,        // Rotational azimuth adjustment
        roll: 0.0
    }
};
