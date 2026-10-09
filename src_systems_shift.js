/**
 * File: src_systems_shift.js
 * Phase 10: Reality Shift & The White Void
 * 
 * Implements Bible §5 (Reality Mechanics) and §25 (Anchors).
 * Handles the 14-day reconfiguration of the Dark Forest.
 * Reconfiguration lasts 7 full days in the White Void (Perception Skip).
 */

class ShiftDirectorSystem {
    constructor() {
        this.isShifting = false;
        this.shiftProgress = 0;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.checkCycle());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[ShiftDirector] Reality Cycle Monitor Active');
    }

    /**
     * Checks if it's time for the 14-day Shift.
     */
    checkCycle() {
        if (this.isShifting) return;

        const day = window.EngineParams?.worldDay || 0;
        
        // Cycle Length: 14 Days (Bible §5)
        // We trigger at the end of the 14th day
        if (day > 0 && day % 14 === 0) {
            this.beginShift();
        }
    }

    /**
     * Triggers the transition from Forest to White Void.
     */
    beginShift() {
        this.isShifting = true;
        this.shiftProgress = 0;

        window.EventBus.emit('UI_LOG', '⚪ [VOID] THE SHIFT HAS BEGUN. REALITY IS DECONSTRUCTING.');
        window.EventBus.emit('UI_LOG', '⚪ [VOID] Entering 7-Day Reconstruction Window...');

        // 1. Visual Transition (White Void Post-Processing)
        window.EventBus.emit('ENV_SET_VOID_OVERRIDE', true);

        // 2. Information Decay (Bible §25)
        // Only Anchored Intel survives. Purge unverified rumors.
        if (window.IntelManager) {
            const currentEpoch = window.EngineParams?.worldEpoch || 0;
            const currentDay = window.EngineParams?.worldDay || 0;
            window.IntelManager.purge(currentEpoch, currentDay);
        }

        // 3. Simulation of the 7-day Reconstruction
        // Even though perceived as instant by NPCs, we simulate the time jump
        let daysSkipped = 0;
        const skipInterval = setInterval(() => {
            daysSkipped++;
            window.EngineParams.worldDay++;
            
            // At the peak of the void (day 4 of 7), we reconfigure
            if (daysSkipped === 4) {
                this.executeReconfiguration();
            }

            if (daysSkipped >= 7) {
                clearInterval(skipInterval);
                this.completeShift();
            }
        }, 500); // Perceived time skip speed
    }

    /**
     * The objective moment of reality reconfiguration.
     */
    executeReconfiguration() {
        window.EventBus.emit('UI_LOG', '[VOID] Epoch Boundary Crossed. Re-seeding Forest...');

        // 1. Advance Epoch (Changes terrain seed)
        if (window.EpochManagerInstance) {
            const newEpoch = window.EpochManagerInstance.advanceEpoch();
            window.EngineParams.worldEpoch = newEpoch;
        }

        // 2. Migration of Settlements (Bible §7, §8)
        if (window.VillageManager) {
            window.VillageManager.shiftLocations();
        }

        // 3. Clear transient world data (dead bodies, temporary loot)
        if (window.GameCore) {
            window.GameCore.groundLoot = [];
            // activeEntities remains, but NPCs will need to pathfind back to shifted villages
        }
    }

    /**
     * Returns the world to stability.
     */
    completeShift() {
        this.isShifting = false;
        window.EventBus.emit('ENV_SET_VOID_OVERRIDE', false);
        window.EventBus.emit('UI_LOG', '🌲 [STABILIZATION] Reconstruction complete. Reality has stabilized.');
        
        // 1. Regenerate Road Network for the new geography
        if (window.RoadManager && window.VillageManager) {
            window.RoadManager.generateRoads(window.VillageManager.villages);
        }

        // 2. Force full chunk refresh
        window.EventBus.emit('WORLD_REGENERATE');
        
        window.EventBus.emit('UI_LOG', `[STABILIZATION] Current Epoch: ${window.EngineParams.worldEpoch}.`);
    }
}

window.ShiftDirector = new ShiftDirectorSystem();
export default window.ShiftDirector;
