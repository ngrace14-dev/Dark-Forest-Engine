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
            'TRUTH':    { effect: 'Verification Speed', force: 'Truth' },
            'CROW':     { effect: 'Story Density',     force: 'Crow' },
            'TREE':     { effect: 'Shift Resistance',  force: 'Tree' },
            'CROWN':    { effect: 'Institutional Authority', force: 'Crown' },
            'FOREST':   { effect: 'Unexpected Opportunity', force: 'Forest' },
            'HUNTSMAN': { effect: 'Combat Greatness',  force: 'Huntsman' },
            'WENDIGO':  { effect: 'Destructive Power', force: 'Wendigo' },
            'ORB':      { effect: 'Observational Clarity', force: 'Orb' }
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

        let state = this.nodeCarvings.get(nodeId);
        if (!state) {
            state = { slots: {}, totalWeight: 0, storyDensity: 0 };
            this.nodeCarvings.set(nodeId, state);
        }

        state.slots[slot] = state.slots[slot] || [];
        const slotConfig = this.BODY_SLOTS[slot];

        if (state.slots[slot].length >= slotConfig.space) {
            window.EventBus.emit('UI_LOG', `[RUNES] No space remaining on ${slot} for more carvings.`);
            return false;
        }

        const rune = {
            force: force,
            day: window.EngineParams?.worldDay || 0,
            weight: 50 * slotConfig.sigMult
        };

        state.slots[slot].push(rune);
        state.totalWeight += rune.weight;
        
        // The Trap of Significance (Addendum BN)
        // Story Density increases visibility to the Harvest forces.
        state.storyDensity = state.totalWeight / 100;

        // Chronicle Integration
        window.ChronicleManager?.recordEvent({
            actorId: nodeId,
            type: 'RUNIC_CARVING',
            detail: `${nodeId} has carved the rune of ${force} into their ${slot.toLowerCase()}.`,
            significance: Math.floor(rune.weight / 2),
            historicalWeight: rune.weight
        });

        // Increase Force Attraction (Harvest Beacon)
        if (window.ForceManager) {
            // More runes make you brighter to the Crow and the Wendigo
            window.ForceManager.forces['Crow'].strength += 10;
            if (force === 'WENDIGO') window.ForceManager.forces['Wendigo'].strength += 20;
        }

        window.EventBus.emit('UI_LOG', `[RUNES] ${nodeId} has bound themselves to the ${force}. Significance rises.`);
        window.EventBus.emit('RUNE_CARVED', { nodeId, force, slot });
        return true;
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
