window.EngineConfig = {
    quality: { shadowsEnabled: true, renderScale: 1.0, grassDensity: 1.0, volumetricFog: true, shaderTier: String.fromCharCode(72,73,71,72) },
    world: { chunkRadius: 5, dayLengthSeconds: 1200 },
    crowsEyeMode: false,
    performance: { lodThresholdSq: 900, maxEntities: 1000 },
    applyQualityPreset: function(preset) {
        if (preset === String.fromCharCode(76,79,87)) {
            this.quality.shadowsEnabled = false; this.quality.renderScale = 0.5; this.quality.grassDensity = 0.1; this.quality.volumetricFog = false; this.quality.shaderTier = String.fromCharCode(76,79,87); this.world.chunkRadius = 3;
        } else if (preset === String.fromCharCode(77,69,68)) {
            this.quality.shadowsEnabled = true; this.quality.renderScale = 0.75; this.quality.grassDensity = 0.5; this.quality.volumetricFog = false; this.quality.shaderTier = String.fromCharCode(77,69,68); this.world.chunkRadius = 4;
        } else {
            this.quality.shadowsEnabled = true; this.quality.renderScale = 1.0; this.quality.grassDensity = 1.0; this.quality.volumetricFog = true; this.quality.shaderTier = String.fromCharCode(72,73,71,72); this.world.chunkRadius = 5;
        }
        if (window.EventBus) window.EventBus.emit(String.fromCharCode(81,85,65,76,73,84,89,95,67,72,65,78,71,69,68));
    }
};
export default window.EngineConfig;
