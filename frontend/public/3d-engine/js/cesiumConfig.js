const CONFIG = {
    // API Tokens & Infrastructure Registration
    CESIUM_ION_TOKEN: window.CESIUM_ION_TOKEN || 'YOUR_CESIUM_ION_ACCESS_TOKEN',
    GOOGLE_TILES_KEY: window.GOOGLE_TILES_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // Aggregator Connection Node Endpoint
    BACKEND_API_URL: 'js/mockFires.json',

    // Viewport Spatial Matrices (Matched to Isometric Reference Archetype)
    INITIAL_VIEW: {
        longitude: -122.4120,
        latitude: 37.7850,
        height: 720.0,
        pitch: -32.0,
        heading: 28.0,
        roll: 0.0
    }
};
