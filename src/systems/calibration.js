/**
 * File: src_systems_calibration.js
 * Phase 9: Calibration Framework
 * Simulation Laboratory controls for tuning the world's fundamental rates.
 */

window.CalibrationFramework = {
    settings: {
        world: {
            spawnRate: 1.0,
            growthRate: 1.0,
            travelRate: 1.0
        },
        economy: {
            tradeEfficiency: 1.0,
            scarcity: 1.0,
            consumption: 1.0
        },
        intel: {
            spreadRate: 1.0,
            distortionRate: 0.1, // 10% chance per sync
            decayRate: 0.05
        },
        truth: {
            verificationRate: 1.0,
            archivePreservation: 0.8
        },
        chronicle: {
            memoryRetention: 1.0,
            historicalWeightSurvival: 100 // Threshold for archiving
        },
        forces: {
            growth: 1.0,
            decay: 1.0,
            influence: 1.0
        },
        monsters: {
            spawnFrequency: 1.0,
            strengthScale: 1.0
        },
        rumors: {
            spreadRate: 1.0,
            verificationRate: 1.0
        },
        chronicle: {
            decayRate: 0.0,
            expansionPressure: 1.0
        }
    },

    init: function() {
        console.log('[CALIBRATION] Simulation Laboratory initialized.');
        // Load from localStorage if available
        const saved = localStorage.getItem('dark-forest-calibration');
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
            } catch(e) {}
        }
    },

    save: function() {
        localStorage.setItem('dark-forest-calibration', JSON.stringify(this.settings));
    },

    reset: function() {
        this.settings = {
            world: { spawnRate: 1.0, growthRate: 1.0, travelRate: 1.0 },
            economy: { tradeEfficiency: 1.0, scarcity: 1.0, consumption: 1.0 },
            intel: { spreadRate: 1.0, distortionRate: 0.1, decayRate: 0.05 },
            truth: { verificationRate: 1.0, archivePreservation: 0.8 },
            chronicle: { memoryRetention: 1.0, historicalWeightSurvival: 100, decayRate: 0.0, expansionPressure: 1.0 },
            forces: { growth: 1.0, decay: 1.0, influence: 1.0 },
            monsters: { spawnFrequency: 1.0, strengthScale: 1.0 },
            rumors: { spreadRate: 1.0, verificationRate: 1.0 }
        };
        this.save();
    },

    applyPreset: function(preset) {
        this.reset();
        switch(preset) {
            case 'AGE_OF_TRUTH':
                this.settings.rumors.verificationRate = 3.0;
                this.settings.intel.distortionRate = 0.01;
                this.settings.truth.verificationRate = 2.0;
                break;
            case 'GOLDEN_AGE':
                this.settings.world.growthRate = 2.0;
                this.settings.economy.consumption = 0.5;
                this.settings.economy.tradeEfficiency = 2.0;
                this.settings.monsters.spawnFrequency = 0.2;
                break;
            case 'DARK_AGE':
                this.settings.world.growthRate = 0.5;
                this.settings.monsters.spawnFrequency = 2.5;
                this.settings.economy.scarcity = 2.0;
                this.settings.intel.distortionRate = 0.4;
                break;
            case 'COLLAPSE':
                this.settings.economy.consumption = 3.0;
                this.settings.world.growthRate = 0.1;
                this.settings.monsters.spawnFrequency = 4.0;
                this.settings.forces.influence = 2.0;
                break;
        }
        this.save();
        window.EventBus.emit('UI_LOG', `[CALIBRATION] Preset applied: ${preset}`);
    }
};

window.CalibrationFramework.init();
