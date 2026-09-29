class FireService {
    /**
     * Initializes the data service tier on top of the Cesium Runtime Canvas.
     * @param {Cesium.Viewer} viewer 
     */
    constructor(viewer) {
        this.viewer = viewer;
        this.fireDataSource = new Cesium.CustomDataSource('nasa-firms-telemetry');
        this.viewer.dataSources.add(this.fireDataSource);
    }

    /**
     * Executes localized asynchronous network loop requests against the proxy tier.
     */
    async fetchActiveFires() {
        try {
            const response = await fetch(CONFIG.BACKEND_API_URL, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error(`HTTP Error Status Matrix: ${response.status}`);
            
            const fireData = await response.json(); 
            this.renderVolumetricBeams(fireData);
            this.updateTelemetryInterface(fireData.length);
        } catch (error) {
            console.error("[CRITICAL SYSTEM FAULT] Data sync runtime failure:", error);
            const stats = document.getElementById('fire-stats');
            if (stats) {
                stats.innerHTML = `<span style="color:#ef4444;">Sync Offline: Connection Aborted</span>`;
            }
        }
    }

    /**
     * Converts raw coordinates into hardware-accelerated 3D primitives.
     * @param {Array} fires 
     */
    renderVolumetricBeams(fires) {
        this.fireDataSource.entities.removeAll();

        fires.forEach((fire, idx) => {
            // Calculate cylinder scaling factor dynamically based on Fire Radiative Power (FRP) metric
            const computedHeight = Math.max(120.0, parseFloat(fire.frp || 10) * 6.5);
            const spatialPosition = Cesium.Cartesian3.fromDegrees(
                parseFloat(fire.lon), 
                parseFloat(fire.lat)
            );

            this.fireDataSource.entities.add({
                name: `Thermal Anomaly #${idx + 1}`,
                position: spatialPosition,
                cylinder: {
                    length: computedHeight,
                    topRadius: 8.0,
                    bottomRadius: 18.0,
                    // True-color emissive material rendering profile
                    material: new Cesium.ColorMaterialProperty(
                        Cesium.Color.fromCssColorString('#ff5a00').withAlpha(0.75)
                    ),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#ff2a00'),
                    outlineWidth: 2.0,
                    // Clamps geometric assets tightly to the Photorealistic 3D buildings mesh
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                description: `
                    <div style="padding:10px; color:#ffffff; font-family:sans-serif; background:#0f172a; border-radius:6px;">
                        <b style="color:#ff6a00; font-size:15px;">🔥 Thermal Anomaly Detected</b><br>
                        <hr style="border-color:rgba(255,255,255,0.15); margin:8px 0;">
                        <b>Radiative Energy (FRP):</b> ${fire.frp} MW<br>
                        <b>Scan Confidence Matrix:</b> ${fire.confidence}%<br>
                        <b>Satellite Source Node:</b> VIIRS NRT (375m)
                    </div>`
            });
        });
    }

    updateTelemetryInterface(count) {
        const stats = document.getElementById('fire-stats');
        if (stats) {
            stats.innerHTML = `
                Active Fire Pixels: <b style="color:#ff6a00; font-size:16px;">${count}</b><br>
                System Status: <span style="color:#10b981; font-weight:600;">Online & Synced</span><br>
                Source Refresh Loop: 30s Real-time Dynamic
            `;
        }
    }
}
