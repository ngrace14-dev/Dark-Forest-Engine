window.EngineConfig = {
    quality: { shadowsEnabled: true, renderScale: 1.0, grassDensity: 1.0, volumetricFog: true, shaderTier: String.fromCharCode(72,73,71,72) },
    world: { chunkRadius: 5, dayLengthSeconds: 1200 },
    crowsEyeMode: false,
    showSystemReasoning: false, // DEV ONLY: Exposes internal logic and conclusions (§BQ)
    performance: { lodThresholdSq: 900, maxEntities: 1000 },
    simulation: { simScale: 1.0, isAccelerated: false },

    // --- PHASE 1: CORE INTEGRITY MULTIPLIERS ---
    getCoreMultipliers: function(integrity) {
        if (integrity <= 0) return { speed: 0.5, perception: 0.2, damage: 0.1 };
        if (integrity < 25) return { speed: 0.7, perception: 0.5, damage: 0.6 };
        if (integrity < 50) return { speed: 0.85, perception: 0.75, damage: 0.8 };
        return { speed: 1.0, perception: 1.0, damage: 1.0 };
    },

    applyQualityPreset: function(preset) {

        if (preset === String.fromCharCode(76,79,87)) {
            this.quality.shadowsEnabled = false; this.quality.renderScale = 0.5; this.quality.grassDensity = 0.1; this.quality.volumetricFog = false; this.quality.shaderTier = String.fromCharCode(76,79,87); this.world.chunkRadius = 3;
        } else if (preset === String.fromCharCode(77,69,68)) {
            this.quality.shadowsEnabled = true; this.quality.renderScale = 0.75; this.quality.grassDensity = 0.5; this.quality.volumetricFog = false; this.quality.shaderTier = String.fromCharCode(77,69,68); this.world.chunkRadius = 4;
        } else if (preset === 'crows_eye') {
             this.crowsEyeMode = !this.crowsEyeMode;
             if (window.EngineParams) window.EngineParams.crowsEyeMode = this.crowsEyeMode;
        } else {
            this.quality.shadowsEnabled = true; this.quality.renderScale = 1.0; this.quality.grassDensity = 1.0; this.quality.volumetricFog = true; this.quality.shaderTier = String.fromCharCode(72,73,71,72); this.world.chunkRadius = 5;
        }
        if (window.EventBus) window.EventBus.emit(String.fromCharCode(81,85,65,76,73,84,89,95,67,72,65,78,71,69,68));
    }
};
export default window.EngineConfig;
