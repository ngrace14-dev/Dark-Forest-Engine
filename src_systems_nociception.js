/**
 * File: src_systems_nociception.js
 * System 48: Nociception & Physical Reflexes
 * 
 * Implements pain shock, adrenaline surges, and sensory overload.
 */

class NociceptionSystem {
    constructor() {
        this.states = new Map(); // Map<entity_id, NociceptionState>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DAMAGED', (data) => this.processPain(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Nociception] Physical Reflex & Pain Systems Online');
    }

    /**
     * 48.1 Pain Shock Thresholds
     * 48.3 Adrenaline Surge
     * 48.8 Combat Wounding Penalties
     */
    processPain(data) {
        const entityId = data.victimId;
        const damage = data.damage || 0;
        
        if (!this.states.has(entityId)) {
            this.states.set(entityId, {
                shock: 0,
                adrenaline: 0,
                exhaustion: 0,
                lastDamageDay: window.EngineParams?.worldDay || 0
            });
        }

        const state = this.states.get(entityId);
        state.shock += damage * 2;
        
        // 48.8 Combat Wounding Penalties
        if (damage > 30) {
            window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] ${entityId} has suffered a major wound. Actions slowed.`);
        }

        // 48.3 Adrenaline Surge: Triggers at high shock
        if (state.shock > 50 && state.adrenaline < 10) {
            this.triggerAdrenaline(entityId);
        }

        // 48.1 Pain Shock: Overload leads to paralysis
        if (state.shock > 100) {
            this.triggerShockParalysis(entityId);
        }
    }

    /**
     * 48.5 Sensory Overload Paralysis
     */
    triggerSensoryOverload(entityId) {
        window.EventBus.emit('UI_LOG', `[REFLEX] ${entityId} is paralyzed by sensory overload!`);
        // Logic to stun entity
    }

    /**
     * 48.6 Hypothermia Numbing
     * 48.7 Suffocation & Respiration
     */
    applyEnvironmentalStress(entityId, type) {
        const state = this.states.get(entityId);
        if (!state) return;

        if (type === 'COLD') {
            state.shock += 5; // Numbing effects increase shock floor
        } else if (type === 'SUFFOCATION') {
            state.exhaustion += 20;
        }
    }

    /**
     * 48.2 Automated Reflex Override
     */
    attemptReflexOverride(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        const skill = profile.skills.combat.level / 100;
        return Math.random() < skill; // High skill allows overriding pain reflexes
    }

    triggerAdrenaline(entityId) {
        const state = this.states.get(entityId);
        state.adrenaline = 100;
        window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] Adrenaline surge in ${entityId}! Pain ignored.`);
        // Logic to ignore speed penalties for a short duration
    }

    triggerShockParalysis(entityId) {
        window.EventBus.emit('UI_LOG', `[REFLEX] ${entityId} has entered shock paralysis!`);
        // Logic to disable movement/actions
    }

    /**
     * 48.4 Exhaustion Accumulation
     */
    applyExhaustion(entityId, amount) {
        const state = this.states.get(entityId);
        if (!state) return;
        state.exhaustion += amount;
        
        if (state.exhaustion > 80) {
            window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] ${entityId} is reaching extreme exhaustion.`);
        }
    }
}

window.Nociception = new NociceptionSystem();
export default window.Nociception;
