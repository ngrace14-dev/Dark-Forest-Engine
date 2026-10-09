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
        // System 1: Combine metrics into score
        const weight = window.ChronicleManager.npcHistoricalWeights.get(nodeId) || 0;
        const runes = window.RuneSystem?.getHarvestPressure(nodeId) || 0;
        const dream = window.DreamManager?.getNPCState(nodeId);
        
        let score = (weight * 0.5) + (runes * 1000);
        if (dream) {
            score += (dream.intensity * 20) + (dream.corruption * 100);
        }

        // Legends generate exponentially more pressure
        const isLegend = window.GameState.legends?.some(l => l.actorId === nodeId);
        if (isLegend) score *= 2.0;

        return score;
    }

    updateCandidate(nodeId, score) {
        let candidate = this.harvestCandidates.get(nodeId) || { 
            pressureScore: 0, 
            orbAttention: 0, 
            huntsmanCultivation: 0,
            status: 'NONE'
        };

        candidate.pressureScore = score;

        // System 3: Huntsman Cultivation (Early identification of potential)
        if (score > 200 && candidate.huntsmanCultivation < 1.0) {
            candidate.huntsmanCultivation = Math.min(1.0, candidate.huntsmanCultivation + 0.05);
            if (candidate.huntsmanCultivation > 0.8 && candidate.status === 'NONE') {
                candidate.status = 'CULTIVATED';
                window.EventBus.emit('UI_LOG_DEBUG', `[HUNTSMAN] Identifying potential in ${nodeId}...`);
            }
        }

        // System 2: Orb Recognition (Recognition of greatness)
        if (score > 500) {
            candidate.orbAttention = Math.min(1.0, (score - 500) / 500);
            if (candidate.orbAttention > 0.5 && candidate.status !== 'RECOGNIZED') {
                candidate.status = 'RECOGNIZED';
                window.EventBus.emit('UI_LOG', `👁️ [ORB] The Great Eye has turned toward ${nodeId}.`);
            }
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
        
        const harvest = {
            id: 'harvest_' + Math.random().toString(36).substr(2, 5),
            targetId: nodeId,
            type: harvestType,
            startDay: window.EngineParams?.worldDay || 0
        };

        this.activeHarvests.push(harvest);

        window.EventBus.emit('UI_LOG', `💀 [WENDIGO] A ${harvestType} HARVEST HAS BEGUN. TARGET: ${nodeId}`);
        
        // System 6: Consequences (Immediate pressure increase)
        window.ForceManager.forces['Wendigo'].strength += 50;

        window.ChronicleManager?.recordEvent({
            actorId: nodeId,
            type: 'WENDIGO_HARVEST',
            detail: `The cold hunger of the Wendigo has found a beacon of significance: ${nodeId}.`,
            significance: 300,
            historicalWeight: 200
        });

        // Trigger the 3D Wendigo stalker logic for this specific ID
        window.EventBus.emit('WENDIGO_ASSIGN_TARGET', nodeId);
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
