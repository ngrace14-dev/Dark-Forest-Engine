/**
 * File: src_systems_runes.js
 * Phase: Runic Body Carving System
 * 
 * Implements Bible Addendum BN: "Flesh as the Ledger."
 * Characters bind themselves to reality through permanent runic carvings.
 * Every rune increases the entity's "Significance" and "Harvest Risk."
 */

class RuneCarvingSystem {
    constructor() {
        this.nodeCarvings = new Map(); // Map<nodeId, { slots, totalWeight, storyDensity }>
        
        this.BODY_SLOTS = {
            'HEAD':  { space: 1, maxPain: 0.9, sigMult: 5.0, desc: 'The seat of perception.' },
            'CHEST': { space: 3, maxPain: 0.7, sigMult: 3.0, desc: 'The core of vitality.' },
            'BACK':  { space: 4, maxPain: 0.5, sigMult: 2.0, desc: 'The canvas of history.' },
            'ARMS':  { space: 2, maxPain: 0.4, sigMult: 1.5, desc: 'The tools of intent.' },
            'HANDS': { space: 1, maxPain: 0.6, sigMult: 4.0, desc: 'The touch of reality.' },
            'LEGS':  { space: 2, maxPain: 0.3, sigMult: 1.0, desc: 'The anchor of travel.' }
        };

                this.RUNE_TYPES = {
            'TRUTH':    { effect: 'Verification Speed', force: 'Truth', complexity: 2 },
            'CROW':     { effect: 'Story Density',     force: 'Crow', complexity: 4 },
            'TREE':     { effect: 'Shift Resistance',  force: 'Tree', complexity: 3 },
            'CROWN':    { effect: 'Institutional Authority', force: 'Crown', complexity: 5 },
            'FOREST':   { effect: 'Unexpected Opportunity', force: 'Forest', complexity: 2 },
            'HUNTSMAN': { effect: 'Combat Greatness',  force: 'Huntsman', complexity: 6 },
            'WENDIGO':  { effect: 'Destructive Power', force: 'Wendigo', complexity: 8 },
            'ORB':      { effect: 'Observational Clarity', force: 'Orb', complexity: 3 }
        };


        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Runes] Flesh-Ledger System Initialized');
    }

            /**
     * Carves a rune into the body of an entity.
     * Bible §BN: "Permanently increases Story Density and Historical Weight."
     */
    carveRune(nodeId, force, slot) {
        if (!this.RUNE_TYPES[force] || !this.BODY_SLOTS[slot]) return false;

        const runeDef = this.RUNE_TYPES[force];
        const slotConfig = this.BODY_SLOTS[slot];
        
        let state = this.nodeCarvings.get(nodeId);
        if (!state) {
            state = { slots: {}, totalWeight: 0, storyDensity: 0 };
            this.nodeCarvings.set(nodeId, state);
        }

        state.slots[slot] = state.slots[slot] || [];

        if (state.slots[slot].length >= slotConfig.space) {
            window.EventBus.emit('UI_LOG', `[RUNES] No space remaining on ${slot} for more carvings.`);
            return false;
        }

        // --- RUNE FAILURE & FLASHOVER LOGIC ---
        const actorProfile = window.PersonhoodManager?.getProfile(nodeId);
        const skill = actorProfile?.skills.lore.level || 10;
        const worldEntropy = window.CivilizationState?.scalars.WORLD_ENTROPY || 0.1;
        
        const successChance = (skill / (runeDef.complexity * 10)) * (1.0 - worldEntropy);
        const roll = Math.random();
        
        let isCorrupted = false;
        let isFlashover = false;

        if (roll > successChance) {
            if (roll > successChance + 0.3) {
                isFlashover = true;
            } else {
                isCorrupted = true;
            }
        }

        const rune = {
            force: force,
            day: window.EngineParams?.worldDay || 0,
            weight: 50 * slotConfig.sigMult,
            isCorrupted,
            isFlashover
        };

        if (isFlashover) {
            this.triggerFlashover(nodeId, slot, force);
            return false;
        }

        state.slots[slot].push(rune);
        state.totalWeight += rune.weight;
        
        if (isCorrupted) {
            window.EventBus.emit('UI_LOG', `?? [CORRUPTION] The carving of ${force} has warped. It drains your vitality.`);
            // Negative Stat Application
            if (actorProfile) actorProfile.traits.fear = Math.min(1.0, actorProfile.traits.fear + 0.2);
        }

        // The Trap of Significance (Addendum BN)
        // Story Density increases visibility to the Harvest forces.
        state.storyDensity = state.totalWeight / 100;

        // Chronicle Integration
        window.ChronicleManager?.recordEvent({
            actorId: nodeId,
            type: isCorrupted ? 'CORRUPTED_CARVING' : 'RUNIC_CARVING',
            detail: isCorrupted ? 
                `${nodeId} attempted to carve ${force} but the ink turned black and cold.` : 
                `${nodeId} has carved the rune of ${force} into their ${slot.toLowerCase()}.`,
            significance: Math.floor(rune.weight / 2),
            historicalWeight: rune.weight
        });

        // LEGACY INTEGRATION: Runes increase permanent significance
        if (window.LegacyManager) {
            window.LegacyManager.addSignificance(nodeId, rune.weight);
        }

        // Increase Force Attraction (Harvest Beacon)
        if (window.ForceManager) {
            window.ForceManager.forces['Crow'].strength += 10;
            if (force === 'WENDIGO') window.ForceManager.forces['Wendigo'].strength += 20;
        }

        if (!isCorrupted) {
            window.EventBus.emit('UI_LOG', `[RUNES] ${nodeId} has bound themselves to the ${force}. Significance rises.`);
        }
        window.EventBus.emit('RUNE_CARVED', { nodeId, force, slot, isCorrupted });
        return true;
    }

    triggerFlashover(nodeId, slot, force) {
        window.EventBus.emit('UI_LOG', `?? [FLASHOVER] A runic feedback loop has occurred in ${nodeId}'s ${slot}!`);
        window.EventBus.emit('SPAWN_HIT_VFX', { type: 'Fire', pos: { x: 0, y: 0, z: 0 } }); // Mock position
        
        const profile = window.PersonhoodManager?.getProfile(nodeId);
        if (profile) {
            profile.survival.stress += 50;
            window.EventBus.emit('UI_LOG', `[REFLEX] ${nodeId} is reeling from psychic feedback.`);
        }
        
        // localized instability
        if (window.InstabilityManager) {
            window.InstabilityManager.createAnomaly('RUNIC_FLASH', 10);
        }
    }


    getCarvings(nodeId) {
        return this.nodeCarvings.get(nodeId) || { slots: {}, totalWeight: 0, storyDensity: 0 };
    }

    /**
     * Bible Addendum BN: "High runic power turns the player into high-yield livestock."
     */
    getHarvestPressure(nodeId) {
        const state = this.getCarvings(nodeId);
        return state.storyDensity;
    }
}

window.RuneSystem = new RuneCarvingSystem();
export default window.RuneSystem;
