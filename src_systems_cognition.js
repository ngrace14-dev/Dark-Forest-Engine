/**
 * File: src_systems_cognition.js
 * System 46: Model of Causality & Cognitive Bias
 * System 47: Deception & Machiavellian Masking
 * System 49: Self-Awareness & Identity
 * 
 * Implements Bible §13 (Information Economy) and §34 (NPC Autonomy).
 * Manages the "Internal Model" of NPCs, their biases, and their ability to deceive.
 */

class CognitionSystem {
    constructor() {
        this.internalModels = new Map(); // Map<entity_id, InternalModelObject>
        this.activeDeceptions = new Map(); // Map<entity_id, DeceptionState>

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('INTEL_GAINED', (data) => this.processCausality(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Cognition] Psychological Filters & Biases Active');
    }

    /**
     * 46.1 Confirmation Bias
     * 46.4 Availability Heuristic
     * Filters new intel through existing beliefs.
     */
    applyCognitiveBiases(entityId, intel) {
        const profile = window.PersonhoodManager?.getProfile(entityId);
        if (!profile) return intel.certainty;

        let certainty = intel.certainty;

        // 46.1 Confirmation Bias: Intel that matches current bias is more believable
        if (intel.payload.tags.includes(profile.bias)) {
            certainty = Math.min(1.0, certainty * 1.25);
        } else {
            certainty *= 0.85;
        }

        // 46.5 Tribal In-Group Favoritism
        const provenance = intel.provenance[0];
        if (provenance && provenance.source_faction === profile.houseId) {
            certainty = Math.min(1.0, certainty * 1.15);
        }

        // 46.2 Fundamental Attribution Error: NPCs blame character for failure, environment for success
        if (intel.payload.tags.includes('FAILURE')) {
            certainty = Math.min(1.0, certainty * 1.2); // "They failed because they are weak"
        }

        // 46.6 Loss Aversion Weighting
        if (intel.type === 'WARNING') {
            certainty = Math.min(1.0, certainty * 1.4); // Threats are weighted more heavily
        }

        // 46.7 Sunk Cost Fallacy: NPCs are less likely to abandon objectives they've invested in
        if (profile.ambition.goalProgress > 0.5) {
            certainty *= 1.1; // Overestimate the value of continuing
        }

        return certainty;
    }

    /**
     * 46.3 Flawed Causality Models
     * 46.8 Illusion of Control
     * Records how an NPC thinks Event A caused Event B.
     */
    processCausality(data) {
        const entityId = data.nodeId;
        const intel = window.IntelManager?.lookup(data.intelId);
        if (!intel) return;

        if (!this.internalModels.has(entityId)) {
            this.internalModels.set(entityId, {
                causalLinks: [],
                perceivedControl: 0.5,
                recentEvents: []
            });
        }

        const model = this.internalModels.get(entityId);
        model.recentEvents.push(intel.intel_id);
        if (model.recentEvents.length > 5) model.recentEvents.shift();

        // 46.3 Flawed Causality: Correlate random events if they happen close together
        if (model.recentEvents.length >= 2) {
            const e1 = model.recentEvents[model.recentEvents.length - 2];
            const e2 = intel.intel_id;
            
            if (Math.random() < 0.2) { // 20% chance to form a "Superstitious" link
                model.causalLinks.push({ cause: e1, effect: e2, strength: 0.5 });
                window.EventBus.emit('UI_LOG_DEBUG', `[COGNITION] ${entityId} believes ${e1} caused ${e2}.`);
            }
        }
    }

    /**
     * 47.1 Intent Concealment
     * 47.2 Emotional Masking
     * 47.4 False Emotional Projection
     */
    applyMask(entityId, maskType = 'NEUTRAL', projectedEmotion = 'CALM') {
        this.activeDeceptions.set(entityId, {
            type: maskType,
            projectedEmotion,
            integrity: 1.0,
            startTime: window.EngineParams?.worldDay || 0,
            betrayalTick: 0 // 47.8 Betrayal Timing
        });
        
        window.EventBus.emit('UI_LOG_DEBUG', `[DECEPTION] ${entityId} is now masking as ${maskType} (Projecting ${projectedEmotion}).`);
    }

    /**
     * 47.3 Lying Fidelity Calculation
     * 47.7 Seduction & Charm
     */
    calculateLyingSuccess(liarId, observerId, useCharm = false) {
        const liar = window.PersonhoodManager.getProfile(liarId);
        const observer = window.PersonhoodManager.getProfile(observerId);
        if (!liar || !observer) return false;

        const mask = this.activeDeceptions.get(liarId);
        let baseSkill = (liar.traits.ambition + liar.traits.cynicism) / 2;
        
        // 47.7 Seduction & Charm: Uses face/prestige to lower guard
        if (useCharm) {
            const face = window.PrestigeManager?.honorLedger.get(liarId)?.face || 50;
            baseSkill += (face / 200);
        }

        const observerSkepticism = observer.traits.cynicism;
        let successChance = (baseSkill * 0.7) + (mask ? mask.integrity * 0.3 : 0);
        successChance -= observerSkepticism * 0.5;

        return Math.random() < successChance;
    }

    /**
     * 49.1 Ego Boundary Security
     * 49.4 Identity Crisis Triggers
     */
    checkIdentityIntegrity(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        if (!profile) return;

        // 49.8 Existential Dread: High instability or loss of status triggers crisis
        const face = window.PrestigeManager?.honorLedger.get(entityId)?.face || 50;
        
        if (face < 5 && Math.random() < 0.1) {
            this.triggerIdentityCrisis(entityId);
        }
    }

    triggerIdentityCrisis(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        profile.identity = 'BROKEN'; 
        
        // 49.6 Imposter Syndrome: NPCs with high status but low credibility
        const credibility = profile.traits.credibility;
        if (credibility < 0.2) {
            window.EventBus.emit('UI_LOG_DEBUG', `[PSYCHOLOGY] ${entityId} is paralyzed by Imposter Syndrome.`);
        }

        window.EventBus.emit('UI_LOG', `[PSYCHOLOGY] ${entityId} is suffering an Identity Crisis!`);
    }

    /**
     * 49.2 Agency Identification
     * 49.3 Internal Monologue Consistency
     */
    getAgencyModel(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        if (profile.traits.ambition > 0.8) return 'PRIMARY_ACTOR';
        if (profile.traits.loyalty > 0.8) return 'FAITHFUL_SERVANT';
        return 'SURVIVOR';
    }
}

window.CognitionManager = new CognitionSystem();
export default window.CognitionManager;
