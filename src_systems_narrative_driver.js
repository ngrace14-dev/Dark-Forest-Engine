/**
 * File: src_systems_narrative_driver.js
 * World Narrative Driver - Phase: Entanglement
 * 
 * Implements "Questlessness" (Bible §1).
 * Surfacing simulation data as natural player experiences through whispers, gossip, and pressure.
 */

class WorldNarrativeDriverSystem {
    constructor() {
        this.activeWhispers = [];
        this.narrativeRadius = 30; // Meters around player
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.updateContext());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Narrative] World Driver Engaged: Questless Protocol Active');
    }

    /**
     * Periodically evaluates the world around the player to surface barks and whispers.
     */
    updateContext() {
        if (!window.GameCore?.playerObj || !window.IntelManager || !window.MeaningEngine) return;

        const pPos = window.GameCore.playerObj.visual.position;
        const nearbyNPCs = window.GameCore.activeEntities.filter(en => 
            en.def.type === 'npc' && en.visual.position.distanceTo(pPos) < this.narrativeRadius
        );

        if (nearbyNPCs.length === 0) return;

        // 1. RUMOR SURFACING (Bible §13)
        // Pick an NPC to "whisper" a rumor the player doesn't know yet.
        if (Math.random() < 0.2) {
            const speaker = nearbyNPCs[Math.floor(Math.random() * nearbyNPCs.length)];
            this.surfaceRumor(speaker);
        }

        // 2. ACTIVE WORLD PRESSURE (Bible §10, §19)
        // If a crisis is active, NPCs discuss it.
        if (window.WorldEventDirector?.activeCrises.length > 0 && Math.random() < 0.3) {
            const speaker = nearbyNPCs[Math.floor(Math.random() * nearbyNPCs.length)];
            this.surfaceCrisisBark(speaker);
        }

        // 3. LIVING CONTEXT (Bible §1)
        // NPCs discuss "What Matters" according to the Meaning Engine.
        if (Math.random() < 0.1) {
            const speaker = nearbyNPCs[Math.floor(Math.random() * nearbyNPCs.length)];
            this.surfaceSignificanceBark(speaker);
        }
    }

    surfaceRumor(npc) {
        // Find intel the NPC knows but the player doesn't
        const npcIntel = window.IntelManager.getIntelForNode(npc.id);
        const playerIntel = window.IntelManager.getIntelForNode('player_node');
        
        const newRumors = npcIntel.filter(i => 
            !playerIntel.some(pi => pi.intel_id === i.intel_id || pi.parent_intel_id === i.intel_id)
        );

        if (newRumors.length > 0) {
            const rumor = newRumors[0];
            const msg = `[Overheard] ${npc.name}: "...they say ${rumor.payload.title.toLowerCase()} is true..."`;
            window.EventBus.emit('UI_LOG', msg);
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: "Whisper heard...", pos: npc.visual.position, color: '#94a3b8' });
            
            // Entanglement: Player "learns" the rumor by overhearing it
            window.IntelManager.grantOwnership(rumor.intel_id, 'player_node');
        }
    }

    surfaceCrisisBark(npc) {
        const crisis = window.WorldEventDirector.activeCrises[0];
        const barks = {
            'FUEL_SHORTAGE': `"The Capital hoards the fuel while our barriers flicker..."`,
            'MONOPOLY_SHIFT': `"Gold flows to different coffers now. The houses are restless."`,
            'VOID_BLEED': `"The fog... it feels different today. Like reality is thin."`
        };

        const bark = barks[crisis.type] || `"Something is wrong with the world..."`;
        window.EventBus.emit('UI_LOG', `${npc.name}: ${bark}`);
    }

    surfaceSignificanceBark(npc) {
        const topEvents = window.MeaningEngine.getWhatMatters(1);
        if (topEvents.length > 0) {
            const event = topEvents[0];
            window.EventBus.emit('UI_LOG', `${npc.name}: "I still can't stop thinking about the ${event.type}..."`);
        }
    }
}

window.NarrativeDriver = new WorldNarrativeDriverSystem();
export default window.NarrativeDriver;
