/**
 * File: src_workers_fractal_logic.js
 * Phase 3: Fractal Incursion Engine
 * 
 * Background logic for the 168-hour (7-day) peak cycle.
 * Non-linear scaling for spawn intensity.
 */

class FractalIncursionWorker {
    constructor() {
        this.peakCycleHours = 168; // 1 week
        this.peakDurationHours = 12; // 12-hour high intensity
        this.lastSpawnTime = 0;
        
        // Intensity Curve: Sine-based with a sharpening exponent
        // Peaks every 168 hours
    }

    calculateIntensity(worldHour) {
        const cycleProgress = (worldHour % this.peakCycleHours) / this.peakCycleHours;
        // Shift sine so peak is at 1.0
        const sineRaw = Math.sin((cycleProgress * Math.PI * 2) - (Math.PI / 2));
        const normalized = (sineRaw + 1) / 2;
        
        // Sharpen the peak so the "12-hour peak" is meaningful
        // exponent of 8 creates a narrow, intense spike
        return Math.pow(normalized, 8);
    }

    shouldSpawn(worldHour, currentEntityCount) {
        const intensity = this.calculateIntensity(worldHour);
        const baseChance = 0.05;
        const scaledChance = baseChance + (intensity * 0.45);
        
        // Limit spawns if already saturated
        if (currentEntityCount > 50) return false;

        return Math.random() < scaledChance;
    }

    getSpawnType(intensity) {
        if (intensity > 0.9) return 'FRACTAL_SENTINEL';
        if (intensity > 0.5) return 'FRACTAL_REAPER';
        return 'FRACTAL_DRONE';
    }
}

// Simulated Worker Interface for main-thread consumption
window.FractalIncursionLogic = new FractalIncursionWorker();
