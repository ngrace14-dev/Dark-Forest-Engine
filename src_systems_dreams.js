/**
 * File: src_systems_dreams.js
 * Phase 4: Symbolic Dream System
 * 
 * Implements Bible §20 (Divine Patron System) and §21 (Dream System).
 * Players influence NPC probability through symbolic amplification.
 */

class DreamManagerSystem {
    constructor() {
        // ... previous lexicon ...

        // --- DIVINE PATRONAGE PATHS (§20, §22) ---
        // Boilerplate for career-specific evolution
        this.patronage = {
            activePath: null, // 'ARCHIVIST', 'WARLORD', 'SHEPHERD', etc.
            perks: new Set(),
            unlockedSymbols: new Set()
        };

        this.PATH_REQUIREMENTS = {
            'ARCHIVIST': { mysteryTier: 5, factsVerified: 20, desc: 'Patron of Truth and Pattern Recognition.' },
            'WARLORD':   { significanceSent: 1000, legendarySuccessions: 2, desc: 'Patron of Ambition and Conflict.' },
            'SHEPHERD':  { avgProsperity: 75, villagesSaved: 5, desc: 'Patron of Continuity and Growth.' }
        };

        this.npcDreams = new Map(); // Map<npc_id, { activeSymbol, intensity, bond, corruption }>
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    /**
     * Boilerplate: Evolution into a specific Patronage Path.
     */
    evolvePatronPath(pathId) {
        if (!this.PATH_REQUIREMENTS[pathId]) return;
        this.patronage.activePath = pathId;
        window.EventBus.emit('UI_LOG', `✨ [ASCENSION] You have evolved into the ${pathId} Divine Patron.`);
        // Placeholder for future logic: unlock specific high-tier symbols or perks here.
    }


    init() {
        window.EventBus.emit('UI_LOG', '[DreamSystem] Divine Influence Channels Open');
    }

    /**
     * Sends a symbolic dream to an NPC.
     * Bible §20: "The player does not issue commands... the player influences ambition."
     */
    sendDream(npcId, symbol) {
        if (!this.lexicon[symbol]) return;

        let state = this.npcDreams.get(npcId) || { activeSymbol: null, intensity: 0, bond: 0.1, corruption: 0, history: [] };
        
        // Bonding & Corruption (Bible §23)
        if (state.activeSymbol === symbol) {
            state.intensity = Math.min(2.0, state.intensity + 0.2);
            state.bond = Math.min(1.0, state.bond + 0.05);
        } else {
            state.activeSymbol = symbol;
            state.intensity = 1.0;
        }

        // DREAM PIVOT: Dreams as Historical Events (Bible §21)
        const event = {
            actorId: npcId,
            type: 'DIVINE_DREAM',
            detail: `${npcId} received a symbolic vision of ${symbol}.`,
            significance: Math.floor(50 * state.intensity),
            historicalWeight: 20
        };
        window.ChronicleManager?.recordEvent(event);
        state.history.push({ symbol, day: window.EngineParams?.worldDay || 0, intensity: state.intensity });

        // Over-influencing causes corruption (Bible §23)
        if (state.intensity > 1.8 || state.corruption > 0.5) {
            this.applyCorruption(npcId, state, symbol);
        }

        this.npcDreams.set(npcId, state);
        window.EventBus.emit('UI_LOG', `[DREAM] Sent the symbol of ${symbol} to ${npcId}.`);
        window.EventBus.emit('DREAM_SENT', { npcId, symbol, intensity: state.intensity });
    }

    applyCorruption(npcId, state, symbol) {
        state.corruption += 0.1;
        const corruptionTypes = ['OBSESSION', 'FANATICISM', 'BURNOUT', 'PARANOIA', 'ISOLATION'];
        const type = corruptionTypes[Math.floor(state.corruption * 4) % corruptionTypes.length];
        
        state.interpretation = type;
        
        window.EventBus.emit('UI_LOG', `[DREAM] WARNING: ${npcId} is descending into ${type} over ${symbol}.`);
        
        window.ChronicleManager?.recordEvent({
            actorId: npcId,
            type: 'DREAM_CORRUPTION',
            detail: `${npcId} has developed ${type} driven by recurring visions.`,
            significance: 100,
            historicalWeight: 50
        });
    }

    /**
     * Translates the symbolic dream into career-specific probability shifts.
     * Bible §21: "Same dream. Different outcome."
     */
    getDreamOutcome(npcId) {
        const state = this.npcDreams.get(npcId);
        if (!state || !state.activeSymbol) return null;

        const profile = window.PersonhoodManager?.getProfile(npcId);
        const entity = window.GameCore?.activeEntities.find(en => en.id === npcId);
        const role = entity?.def?.role || 'COMMONER';

        // Base ambition from lexicon
        const effect = this.lexicon[state.activeSymbol];
        let driveMultiplier = state.intensity;

        // Personality Scaling (Bible §22)
        if (profile) {
            if (state.activeSymbol === 'FIRE') driveMultiplier *= (1.0 + profile.traits.ambition);
            if (state.activeSymbol === 'TRUTH') driveMultiplier *= (1.0 + profile.traits.cynicism);
        }

        return {
            symbol: state.activeSymbol,
            primaryAmbition: effect.ambition,
            multiplier: driveMultiplier,
            riskToleranceMod: state.activeSymbol === 'FIRE' ? 0.5 : (state.activeSymbol === 'ROOTS' ? -0.3 : 0)
        };
    }

    getNPCDriveModifier(npcId, ambitionKey) {
        const state = this.npcDreams.get(npcId);
        if (!state || !state.activeSymbol) return 1.0;

        const effect = this.lexicon[state.activeSymbol];
        if (effect.ambition === ambitionKey) {
            return state.intensity;
        }
        return 1.0;
    }

    getNPCState(npcId) {
        return this.npcDreams.get(npcId) || { activeSymbol: 'NONE', intensity: 0, bond: 0, corruption: 0 };
    }
}

window.DreamManager = new DreamManagerSystem();
export default window.DreamManager;
