/**
 * File: src/systems/nociception.js
 * System 48: Nociception & Physical Reflexes
 * 
 * Implements pain shock, adrenaline surges, sensory overload, and 
 * metabolic pressures (hunger, stamina, exhaustion).
 */

class NociceptionSystem {
    constructor() {
        this.states = new Map(); // Map<entity_id, NociceptionState>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DAMAGED', (data) => this.processPain(data));
        window.EventBus.on('TICK_HOURLY', () => this.tickMetabolicPressures());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Nociception] Physical Reflex, Metabolic & Pain Systems Online');
    }

    tickMetabolicPressures() {
        if (!window.AgentRosterManager) return;
        window.AgentRosterManager.agents.forEach(agent => {
            if (!agent.alive) return;
            
            // Metabolic Drain based on Stance
            const st = agent.operatingStance;
            let exertionRate = 0.5; // Basal (Idle)
            if (st.mode === 'TRAIN') exertionRate = 0.8;
            else if (st.mode === 'TASK' || st.mode === 'OUT_ON_MISSION') exertionRate = 1.4;

            // Hunger Drain
            const hungerModifier = agent.birthright?.id === 'ASH_BOUND' ? 0.75 : 1.0;
            agent.vitals.hunger = Math.max(0, agent.vitals.hunger - (exertionRate * 0.5 * hungerModifier));

            // Stamina / Exhaustion
            if (agent.vitals.hunger < 30) {
                agent.vitals.stamina = Math.max(0, agent.vitals.stamina - (exertionRate * 2));
                agent.reflexes.exhaustion = Math.min(100, agent.reflexes.exhaustion + 1);
            } else {
                agent.vitals.stamina = Math.min(100, agent.vitals.stamina + (st.mode === 'IDLE' ? 5 : -exertionRate));
            }

            // High exhaustion penalizes stats
            if (agent.reflexes.exhaustion > 80) {
                window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] ${agent.name} is reaching extreme exhaustion.`);
            }
        });
    }

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
        state.shock += damage * 1.8; // Pain scales shock
        
        if (damage > 30) {
            window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] ${entityId} suffered a major wound.`);
        }

        if (state.shock > 50 && state.adrenaline < 10) {
            this.triggerAdrenaline(entityId);
        }

        if (state.shock > 100) {
            this.triggerShockParalysis(entityId);
        }
    }

    triggerAdrenaline(entityId) {
        const state = this.states.get(entityId);
        state.adrenaline = 100;
        window.EventBus.emit('UI_LOG_DEBUG', `[REFLEX] Adrenaline surge in ${entityId}!`);
    }

    triggerShockParalysis(entityId) {
        window.EventBus.emit('UI_LOG', `[REFLEX] ${entityId} has entered shock paralysis!`);
    }

    applyExhaustion(entityId, amount) {
        const state = this.states.get(entityId);
        if (!state) return;
        state.exhaustion = Math.min(100, state.exhaustion + amount);
    }
}

window.Nociception = new NociceptionSystem();
export default window.Nociception;

