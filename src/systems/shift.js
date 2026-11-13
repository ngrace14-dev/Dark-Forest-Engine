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
        
        // --- DUAL TIMELINES (Bible §5, Codex §I) ---
        // Objective Timeline: 18,000 Years AF (True universe age, preserved by Terminus & Epitaph)
        // Perceived Timeline: 12,000 Years AF (Common mortal memory, 6,000-year blind spot)
        this.timelines = {
            objectiveStartYear: 18000,
            perceivedStartYear: 12000,
            objectiveDays: 18000 * 365,
            perceivedDays: 12000 * 365,
            missingGapDays: 6000 * 365,
            cyclesCompleted: 0
        };

        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => this.init());
            window.EventBus.on('HEARTBEAT_T1', () => this.checkCycle());
        }
    }

    init() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit('UI_LOG', `[ShiftDirector] Reality Cycle Monitor Active. Objective Year: ${this.getObjectiveYear()} AF | Perceived Year: ${this.getPerceivedYear()} AF`);
        }
    }

    getObjectiveYear() {
        return Math.floor(this.timelines.objectiveDays / 365);
    }

    getPerceivedYear() {
        return Math.floor(this.timelines.perceivedDays / 365);
    }

    getMissingGapYears() {
        return this.getObjectiveYear() - this.getPerceivedYear();
    }

    advanceTimelines(objectiveDaysDelta, perceivedDaysDelta) {
        this.timelines.objectiveDays += objectiveDaysDelta;
        this.timelines.perceivedDays += perceivedDaysDelta;
        this.timelines.missingGapDays = this.timelines.objectiveDays - this.timelines.perceivedDays;
    }

    /**
     * Checks if it's time for the 14-day Shift.
     */
    checkCycle() {
        if (this.isShifting) return;

        // Advance 1 regular day on daily tick
        this.advanceTimelines(1, 1);

        const day = window.EngineParams?.worldDay || 0;
        
        // Cycle Length: 14 Days (Bible §5)
        // We trigger at the end of the 14th day
        if (day > 0 && day % 14 === 0) {
            const isHeadless = typeof window !== 'undefined' && (!window.document || window.isHeadless || window.SimTest || window.EngineParams?.timeScale === 0);
            if (isHeadless) {
                this.executeInstantShift();
            } else {
                this.beginShift();
            }
        }
    }

    /**
     * PHASE 2-2 VALIDATION: Instant Shift for Simulation Acceleration
     * Bypasses the 7-second real-world interval skip.
     */
    executeInstantShift() {
        this.isShifting = true;
        this.timelines.cyclesCompleted++;

        if (window.EventBus) {
            window.EventBus.emit('SHIFT_START', { 
                epoch: window.EngineParams?.worldEpoch || 0,
                objectiveYear: this.getObjectiveYear(),
                perceivedYear: this.getPerceivedYear()
            });
            window.EventBus.emit('UI_LOG', '⚪ [VOID] ACCELERATED SHIFT: Deconstructing...');
        }
        
        // 7-Day Perception Skip in the White Void:
        // Objective timeline advances by 7 full days
        // Perceived timeline advances by 0 days (Mortal Perception Skip)
        this.advanceTimelines(7, 0);
        if (window.EngineParams) {
            window.EngineParams.worldDay += 7;
        }
        
        this.executeReconfiguration();
        this.completeShift();
    }


        /**
     * Triggers the transition from Forest to White Void.
     */
    beginShift() {
        this.isShifting = true;
        this.shiftProgress = 0;

        window.EventBus.emit('UI_LOG', '⚪ [VOID] THE SHIFT HAS BEGUN. REALITY IS DECONSTRUCTING.');
        
        if (window.EngineConfig?.showSystemReasoning) {
            window.EventBus.emit('UI_LOG', '[DEV] Entering 7-Day Reconstruction Window (Perception Skip §5).');
        }

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
        if (window.EngineConfig?.showSystemReasoning) {
            window.EventBus.emit('UI_LOG', '[DEV] Epoch Boundary Crossed. Re-seeding Forest...');
        }

        // 1. Advance Epoch (Changes terrain seed)

        if (window.EpochManagerInstance) {
            const newEpoch = window.EpochManagerInstance.advanceEpoch();
            window.EngineParams.worldEpoch = newEpoch;
        }

        // MOUNTAIN PIVOT: The Ring Rotates (Bible §5)
        // Strictly during the White Void skip.
        if (window.EngineParams) {
            window.EngineParams.mountainRotation = (window.EngineParams.mountainRotation || 0) + (Math.PI / 18); // 10 degree rotation
            window.EventBus.emit('UI_LOG_DEBUG', `[VOID] Mountain Ring rotated to ${((window.EngineParams.mountainRotation * 180) / Math.PI).toFixed(1)} degrees.`);
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
        
        // 1. Information Decay (Bible §25)
        if (window.IntelManager) {
            window.IntelManager.applyShiftDecay();
        }

        // 2. Civilizational Disruption (Bible §10, §19 - Forest Settlements Only)
        if (window.VillageManager) {
            window.VillageManager.villages.forEach(v => {
                if (v.region === 'dunes') return; // Endless Dunes are immune to Shift disruption!

                // Prosperity drops due to trade link destruction
                v.stats.prosperity = Math.max(0, v.stats.prosperity - 15);
                v.tradeDisruptionUntil = (window.EngineParams?.worldDay || 0) + 2;
                
                // Disconnected villages risk becoming "Lost"
                if (v.barrierIntegrity < 20 || v.isDisconnected) {
                    v.isLost = true;
                    if (window.EventBus) {
                        window.EventBus.emit('UI_LOG', `💀 [VOID] ${v.name} has disconnected from the Chain and is LOST.`);
                    }
                }
            });
        }

        // 3. Regenerate Road Network for the chained Forest geography
        if (window.RoadManager && window.VillageManager) {
            const chained = window.VillageManager.villages.filter(v => v.region !== 'dunes');
            window.RoadManager.generateRoads(chained);
        }

        // 4. Force full chunk refresh
        if (window.EventBus) {
            window.EventBus.emit('WORLD_REGENERATE');
        }

        // --- PHASE 1A: CHRONICLE ACTIVATION ---
        window.ChronicleManager?.recordEvent({
            actorId: 'WORLD',
            type: 'SHIFT_COMPLETE',
            detail: `The World has stabilized. Epoch ${window.EngineParams?.worldEpoch || 0} has begun. Objective: Year ${this.getObjectiveYear()} AF | Perceived: Year ${this.getPerceivedYear()} AF (Missing Gap: ${this.getMissingGapYears()} years).`,
            significance: 150,
            historicalWeight: 100,
            location: { x: 0, z: 0 },
            witnesses: window.VillageManager ? window.VillageManager.villages.map(v => `village_${v.id}`) : []
        });

        if (window.EventBus) {
            window.EventBus.emit('SHIFT_COMPLETE', { 
                epoch: window.EngineParams?.worldEpoch || 0,
                objectiveYear: this.getObjectiveYear(),
                perceivedYear: this.getPerceivedYear(),
                missingGapYears: this.getMissingGapYears()
            });
            window.EventBus.emit('UI_LOG', `[STABILIZATION] Current Epoch: ${window.EngineParams?.worldEpoch || 0}. Objective: ${this.getObjectiveYear()} AF.`);
        }
    }

}

window.ShiftDirector = new ShiftDirectorSystem();
export default window.ShiftDirector;
