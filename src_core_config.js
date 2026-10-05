window.EngineConfig = {
    quality: {
        shadowsEnabled: true,
        renderScale: 1.0,
        grassDensity: 1.0,
        volumetricFog: true
    },
    world: {
        chunkRadius: 5,
        dayLengthSeconds: 1200
    },
    performance: {
        lodThresholdSq: 900, // 30m
        maxEntities: 1000
    }
};

export default window.EngineConfig;