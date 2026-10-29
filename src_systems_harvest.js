/**
 * File: src_systems_harvest.js
 * Phase: Wendigo Harvest Engine
 * 
 * Implements the cycle: Huntsman (Cultivation) -> Orb (Recognition) -> Wendigo (Harvest).
 * Significance is dangerous. Greatness is a beacon.
 */

class WendigoHarvestSystem {
    constructor() {
        this.harvestCandidates = new Map(); // nodeId -> { pressureScore, orbAttention, huntsmanCultivation }
        this.activeHarvests = [];
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.evaluatePressures());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Harvest] Significance Monitor Active');
    }

    /**
     * System 1: Harvest Pressure
     * System 2: Orb Recognition
     * System 3: Huntsman Cultivation
     */
    evaluatePressures() {
        if (!window.ChronicleManager || !window.ForceManager) return;

        const entities = window.GameCore?.activeEntities || [];
        
        entities.forEach(en => {
            if (en.def.type !== 'npc' && en.id !== 'player') return;

            const score = this.calculateHarvestPressure(en.id);
            if (score > 100) {
                this.updateCandidate(en.id, score);
            }
        });

        // Trigger Harvest Events if pressure is extreme
        this.checkHarvestThresholds();
    }

    calculateHarvestPressure(nodeId) {
        // System 1: Unified Significance Calculation (§1, §BN)
        if (!window.ChronicleManager?.calculateSignificance) return 0;
        
        const significance = window.ChronicleManager.calculateSignificance(nodeId);
        
        // Add Dream/Corruption modifiers (Physical Influence)
        let modifier = 1.0;
        const dream = window.DreamManager?.getNPCState(nodeId);
        if (dream) {
            modifier += (dream.intensity * 0.1) + (dream.corruption * 0.5);
        }

        return significance * modifier;
    }

    updateCandidate(nodeId, score) {
        let candidate = this.harvestCandidates.get(nodeId) || { 
            pressureScore: 0, 
            orbAttention: 0, 
            huntsmanCultivation: 0,
            status: 'CURIOSITY'
        };

        candidate.pressureScore = score;

        // --- PHASE: GRADUAL ESCALATION (§5) ---

        // Stage 1: Curiosity (Low Significance)
        if (score > 100 && candidate.status === 'NONE') {
            candidate.status = 'CURIOSITY';
        }

        // Stage 2: Tracking (Medium Significance / Huntsman identification)
        if (score > 300 && candidate.huntsmanCultivation < 1.0) {
            candidate.huntsmanCultivation = Math.min(1.0, candidate.huntsmanCultivation + 0.05);
            if (candidate.huntsmanCultivation > 0.6 && candidate.status === 'CURIOSITY') {
                candidate.status = 'TRACKING';
                window.EventBus.emit('UI_LOG_DEBUG', `[HUNTSMAN] Tracking rising significance in ${nodeId}.`);
            }
        }

        // Stage 3: Active Pursuit (High Significance / Orb recognition)
        if (score > 600) {
            candidate.orbAttention = Math.min(1.0, (score - 600) / 400);
            if (candidate.orbAttention > 0.4 && candidate.status === 'TRACKING') {
                candidate.status = 'ACTIVE_PURSUIT';
                window.EventBus.emit('UI_LOG', `👁️ [ORB] The Great Eye has recognized ${nodeId}.`);
            }
        }

        // Stage 4: Harvest Beacon (Extreme Significance)
        if (score > 1000 && candidate.status !== 'HARVEST_BEACON') {
            candidate.status = 'HARVEST_BEACON';
            window.EventBus.emit('UI_LOG', `🏮 [HARVEST] ${nodeId} has become a beacon. The woods are closing in.`);
            this.triggerOrbLament();
        }

        // --- THE RUNIC HARVEST (Plan D) ---
        // Runic carvings increase significance yield but also danger
        const runicState = window.RuneSystem?.getCarvings(nodeId);
        if (runicState && runicState.totalWeight > 0) {
            candidate.pressureScore += runicState.totalWeight * 0.5;
            candidate.orbAttention = Math.min(1.0, candidate.orbAttention + (runicState.storyDensity * 0.1));
        }

        this.harvestCandidates.set(nodeId, candidate);
    }

    /**
     * System 4: Harvest Events
     * System 5: Wendigo Targeting
     */
    checkHarvestThresholds() {
        this.harvestCandidates.forEach((candidate, nodeId) => {
            // System 5: Priority is Significance and Story Density
            if (candidate.pressureScore > 800 && Math.random() < 0.05) {
                this.triggerHarvest(nodeId, candidate);
            }
        });
    }

    triggerHarvest(nodeId, candidate) {
        if (this.activeHarvests.some(h => h.targetId === nodeId)) return;

        const harvestType = candidate.pressureScore > 1500 ? 'EPOCH' : (candidate.pressureScore > 1000 ? 'LEGENDARY' : 'MINOR');
        
        // --- HARVEST MECHANICS: CONVERSION TO RESOURCE (Plan D) ---
        // Harvested Significance becomes "Runic Ink" or "Spectral Ash"
        const harvest = {
            id: 'harvest_' + Math.random().toString(36).substr(2, 5),
            targetId: nodeId,
            type: harvestType,
            startDay: window.EngineParams?.worldDay || 0,
            projectedYield: Math.floor(candidate.pressureScore / 10)
        };

        this.activeHarvests.push(harvest);

        window.EventBus.emit('UI_LOG', `💀 [WENDIGO] A ${harvestType} HARVEST HAS BEGUN. TARGET: ${nodeId}`);
        
        // System 6: Consequences (Immediate pressure increase)
        window.ForceManager.forces['Wendigo'].strength += 50;

        window.ChronicleManager?.recordEvent({
            actorId: nodeId,
            type: 'WENDIGO_HARVEST',
            detail: `The cold hunger of the Wendigo has found a beacon of significance: ${nodeId}. Yield expected: ${harvest.projectedYield} units.`,
            significance: 300,
            historicalWeight: 200
        });

        // Trigger the 3D Wendigo stalker logic for this specific ID
        window.EventBus.emit('WENDIGO_ASSIGN_TARGET', nodeId);
    }

    /**
     * Resolves a harvest, converting significance into resources.
     * Plan D: Significance is a Resource.
     */
    resolveHarvest(harvestId, success = true) {
        const index = this.activeHarvests.findIndex(h => h.id === harvestId);
        if (index === -1) return;

        const harvest = this.activeHarvests[index];
        this.activeHarvests.splice(index, 1);

        if (success) {
            window.EventBus.emit('UI_LOG', `[HARVEST] Harvest ${harvestId} complete. Collected ${harvest.projectedYield} Runic Residue.`);
            // Grant residue to the 'Harvest Forces' or the Player if they participated
            window.EventBus.emit('SIGNIFICANCE_RESOURCE_GAINED', { amount: harvest.projectedYield });
        }
    }

    /**
     * System 7: Orb Lament
     */
    triggerOrbLament() {
        const detail = "I'm sorry. I did try to warn you...";
        window.EventBus.emit('UI_LOG', `👁️ [ORB] "${detail}"`);
        
        window.ChronicleManager?.recordEvent({
            actorId: 'ORB',
            type: 'ORIGIN_LAMENT',
            detail: detail,
            significance: 1000,
            historicalWeight: 500
        });
    }

    getCandidates() {
        return Array.from(this.harvestCandidates.entries())
            .sort((a, b) => b[1].pressureScore - a[1].pressureScore);
    }
}

window.HarvestEngine = new WendigoHarvestSystem();
export default window.HarvestEngine;
