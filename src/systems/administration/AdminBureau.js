/**
 * File: src/systems/administration/AdminBureau.js
 * Phase: Institutional Ecology & Entropy
 * 
 * Tracks the inevitable decay of institutions when complexity outpaces the competence of their rulers.
 */

import { AdminConstants } from '../../constants/AdminConstants.js';

// Fallback for environments where global window isn't fully populated
const getEventBus = () => window.EventBus;
const getEngineParams = () => window.EngineParams;
const getGameCore = () => window.GameCore;

export class AdminBureau {
    constructor() {
        // Stores institution data separate from physical entities
        // institutionId -> { name, type, population, distanceToHub, lastReformDay, governingIds: [], decayPoints: 0, treasury: 0 }
        this.institutions = new Map();
    }

    init() {
        const EventBus = getEventBus();
        if (!EventBus) return;

        // Evaluate decay on a monthly basis (30 days)
        EventBus.on('HEARTBEAT_T30D', () => this.processAdministrativeTick());
        // Listen for player/NPC driven reforms
        EventBus.on('INSTITUTION_REFORM', (id) => this.executeReform(id));
    }

    processAdministrativeTick() {
        const EngineParams = getEngineParams();
        const GameCore = getGameCore();
        const EventBus = getEventBus();

        const currentDay = EngineParams?.worldDay || 0;
        this.institutions.forEach((inst, id) => {
            // 1. COMPLEXITY: Scales with population size, physical span, and time since last reform
            const daysSinceReform = currentDay - (inst.lastReformDay || 0);
            const complexity = (inst.population * AdminConstants.COMPLEXITY_SCALARS.POPULATION) + 
                               (inst.distanceToHub * AdminConstants.COMPLEXITY_SCALARS.DISTANCE) + 
                               (daysSinceReform * AdminConstants.COMPLEXITY_SCALARS.TIME);

            // 2. COMPETENCE: The combined sum of INT and ADMIN for all assigned governors
            let competence = 0;
            if (inst.governingIds && Array.isArray(inst.governingIds) && GameCore?.activeEntities) {
                inst.governingIds.forEach(npcId => {
                    const npc = GameCore.activeEntities.find(e => e.id === npcId);
                    // If NPC is dead or missing, they contribute 0, accelerating decay naturally
                    if (npc && npc.stats && !npc.isDead) {
                        competence += (npc.stats.intelligence || 0) + (npc.stats.administration || 0);
                    }
                });
            }

            // 3. THE DECAY RATIO: Entropy generation
            if (complexity > competence) {
                const entropyDelta = Math.floor(complexity - competence);
                inst.decayPoints += entropyDelta;
                this.applyDecayEffects(inst, id);
            } else {
                // Highly competent governance slowly repairs institutional rot
                inst.decayPoints = Math.max(0, inst.decayPoints - AdminConstants.REPAIR_RATE);
            }
        });
    }

    applyDecayEffects(inst, id) {
        const EventBus = getEventBus();
        if (!EventBus) return;

        // Level 1 Decay: "Tax Leaks"
        if (inst.decayPoints > AdminConstants.DECAY_THRESHOLDS.LEVEL_1 && inst.treasury > 0) {
            const leak = Math.floor(inst.treasury * AdminConstants.LEAK_PERCENTAGE); // 5% vanishes into bureaucracy
            inst.treasury = Math.max(0, inst.treasury - leak);
            EventBus.emit('UI_LOG_DEBUG', `[ADMIN DECAY] Level 1: ${leak} gold leaked from the ${inst.name} treasury.`);
        }

        // Level 2 Decay: "Barrier Neglect"
        if (inst.decayPoints > AdminConstants.DECAY_THRESHOLDS.LEVEL_2) {
            EventBus.emit('ADMIN_BARRIER_NEGLECT', id);
            EventBus.emit('UI_LOG_DEBUG', `[ADMIN DECAY] Level 2: Physical maintenance failing in ${inst.name}.`);
        }

        // Level 3 Decay: "Corruption Rumors"
        if (inst.decayPoints > AdminConstants.DECAY_THRESHOLDS.LEVEL_3) {
            // Drops low-fidelity intel into the IntelTracker network
            EventBus.emit('SPAWN_RUMOR', {
                targetId: id,
                type: 'CORRUPTION',
                fidelity: AdminConstants.RUMOR_FIDELITY 
            });
            EventBus.emit('UI_LOG', `📜 [RUMOR] Whispers of rampant corruption in ${inst.name} are spreading through the taverns.`);
        }

        // Catastrophic Decay: Institutional Collapse
        if (inst.decayPoints > AdminConstants.DECAY_THRESHOLDS.COLLAPSE) {
            this.triggerCollapse(inst, id);
        }
    }

    executeReform(id) {
        const EngineParams = getEngineParams();
        const EventBus = getEventBus();
        const inst = this.institutions.get(id);
        if (!inst) return;

        inst.lastReformDay = EngineParams?.worldDay || 0;
        // A reform clears 50% of the accumulated rot, but never all of it
        inst.decayPoints = Math.floor(inst.decayPoints * AdminConstants.REFORM_DECAY_REDUCTION);
        if (EventBus) EventBus.emit('UI_LOG', `⚖️ [REFORM] Sweeping changes enacted in ${inst.name}. Complexity reset.`);
    }

    triggerCollapse(inst, id) {
        const EventBus = getEventBus();
        if (EventBus) {
            EventBus.emit('UI_LOG', `🔥 [COLLAPSE] The ${inst.name} has buckled under its own weight. Total administrative failure.`);
            EventBus.emit('INSTITUTION_COLLAPSED', id);
        }

        // Wipe governors and treasury
        inst.governingIds = [];
        inst.treasury = 0;
        inst.decayPoints = AdminConstants.COLLAPSE_RESET_DECAY; // Resets to Level 2 decay, preventing immediate re-collapse but leaving it highly vulnerable
    }

    registerInstitution(id, data) {
        const EngineParams = getEngineParams();
        this.institutions.set(id, {
            name: data.name || 'Unnamed Institution',
            type: data.type || 'Generic',
            population: data.population || 0,
            distanceToHub: data.distanceToHub || 0,
            lastReformDay: EngineParams?.worldDay || 0,
            governingIds: data.governingIds || [],
            decayPoints: data.decayPoints || 0,
            treasury: data.treasury || 0
        });
    }
}
