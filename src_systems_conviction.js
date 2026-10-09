/**
 * File: src_systems_conviction.js
 * Phase: Belief Evolution Engine
 * 
 * Implements Bible §14 (Truth Economy) and §17 (Misunderstood Truth).
 * Handles the dynamic evolution of an NPC's faith in information.
 */

class ConvictionEngineSystem {
    constructor() {
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[ConvictionEngine] Belief Dynamic Channels Open');
    }

    /**
     * Updates an NPC's belief in light of new evidence.
     * Bible §14: Confirmation Bias and Erosion.
     */
    processNewEvidence(npcId, newIntelId) {
        const profile = window.PersonhoodManager?.getProfile(npcId);
        const newIntel = window.IntelManager?.lookup(newIntelId);
        if (!profile || !newIntel) return;

        // confirmation Bias: Is this person more likely to believe this based on their identity?
        const baseCertainty = newIntel.certainty;
        const interpretation = window.PersonhoodManager.calculateConclusion(npcId, newIntelId);
        
        // Update all related beliefs
        profile.beliefState.forEach((state, oldIntelId) => {
            const oldIntel = window.IntelManager.lookup(oldIntelId);
            if (!oldIntel) return;

            // 1. CONTRADICTION (Erosion)
            if (this.isContradictory(oldIntel, newIntel)) {
                this.erodeBelief(profile, oldIntelId, newIntel);
            } 
            // 2. REINFORCEMENT
            else if (this.isReinforcing(oldIntel, newIntel)) {
                this.reinforceBelief(profile, oldIntelId, newIntel);
            }
        });
    }

    erodeBelief(profile, intelId, contradiction) {
        const state = profile.beliefState.get(intelId);
        if (!state) return;

        // Erosion Power is based on the Authority of the contradiction
        const erosionPower = contradiction.certainty * (1.0 - profile.traits.cynicism);
        state.conviction = Math.max(0, state.conviction - (erosionPower * 0.3));

        if (state.conviction < 0.2 && state.interpretation !== 'CRISIS') {
            state.interpretation = 'CRISIS';
            window.EventBus.emit('BELIEF_CRISIS', { npcId: profile.id, intelId });
            window.EventBus.emit('UI_LOG', `[CRISIS] ${profile.id}'s faith in "${intelId}" has shattered.`);
        }
    }

    reinforceBelief(profile, intelId, reinforcement) {
        const state = profile.beliefState.get(intelId);
        if (!state) return;

        // Confirmation Bias: easier to reinforce than to erode
        const reinforcementPower = reinforcement.certainty * 0.1;
        state.conviction = Math.min(1.0, state.conviction + reinforcementPower);
    }

    isContradictory(a, b) {
        if (!a.payload.target_coord || !b.payload.target_coord) return false;
        const dist = Math.hypot(a.payload.target_coord.x - b.payload.target_coord.x, a.payload.target_coord.z - b.payload.target_coord.z);
        return dist < 10 && a.truth_state !== b.truth_state;
    }

    isReinforcing(a, b) {
        if (!a.payload.target_coord || !b.payload.target_coord) return false;
        const dist = Math.hypot(a.payload.target_coord.x - b.payload.target_coord.x, a.payload.target_coord.z - b.payload.target_coord.z);
        return dist < 10 && a.truth_state === b.truth_state;
    }

    getConvictionState(npcId, intelId) {
        const profile = window.PersonhoodManager?.getProfile(npcId);
        return profile?.beliefState.get(intelId) || { conviction: 0.5, interpretation: 'NONE' };
    }
}

window.ConvictionEngine = new ConvictionEngineSystem();
export default window.ConvictionEngine;
