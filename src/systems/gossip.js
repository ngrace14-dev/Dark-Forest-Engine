/**
 * File: src_systems_gossip.js
 * System 60: Gossip & Reputation Destruction
 * 
 * Implements Bible §13 (Information Economy) and §16 (Historian System).
 * Manages the local rumor mill, character assassination, and social shunning.
 */

class GossipManagerSystem {
    constructor() {
        this.rumors = new Map(); // Map<rumor_id, RumorObject>
        this.networks = new Map(); // Map<village_id, Set<rumor_id>>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('INTEL_GAINED', (data) => this.processIntelAsRumor(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Gossip] Social Information Networks Online');
    }

    /**
     * 60.1 Local Rumor Mill Speed
     * 60.5 Gossip Distortion Acceleration
     */
    processIntelAsRumor(intelData) {
        const intel = window.IntelManager?.lookup(intelData.intelId);
        if (!intel) return;

        // Only certain types of intel become "Gossip" (Bible §13)
        if (intel.payload.tags.includes('SCANDAL') || intel.payload.tags.includes('SECRET')) {
            this.injectRumor(intel);
        }
    }

    injectRumor(intel) {
        const rumorId = `rumor_${intel.intel_id}`;
        if (this.rumors.has(rumorId)) return;

        const rumor = {
            id: rumorId,
            intelId: intel.intel_id,
            originVillage: intel.provenance[0]?.villageId || 'unknown',
            distortion: 0.0, // 60.5 Gossip Distortion
            virality: intel.significance.political / 100,
            reach: 1, // Number of villages reached
            day: window.EngineParams?.worldDay || 0
        };

        this.rumors.set(rumorId, rumor);
        this.propagateRumor(rumorId);
    }

    /**
     * 60.1 Local Rumor Mill Speed
     */
    propagateRumor(rumorId) {
        const rumor = this.rumors.get(rumorId);
        if (!rumor) return;

        // Spread to nearby villages via travelers or social syncs
        // This would hook into IntelPropagation
        window.EventBus.emit('UI_LOG_DEBUG', `[GOSSIP] Rumor ${rumorId} is spreading from ${rumor.originVillage}.`);
    }

    /**
     * 60.2 Character Assassination Campaigns
     * 60.3 Whispered Accusations
     */
    startSlanderCampaign(targetId, accusation) {
        const campaignId = `slander_${targetId}_${Date.now()}`;
        
        // 60.4 Social Shunning Effects
        window.PrestigeManager?.adjustPrestige(targetId, { face: -20 });
        
        window.EventBus.emit('UI_LOG', `[GOSSIP] A whisper campaign has begun against ${targetId}: "${accusation}"`);
    }

    /**
     * 60.7 Secret Extortion Networks
     * Using gossip/secrets for leverage.
     */
    attemptExtortion(extorterId, victimId, rumorId) {
        const rumor = this.rumors.get(rumorId);
        if (!rumor) return false;

        const victim = window.PersonhoodManager.getProfile(victimId);
        if (victim.traits.fear > 0.6) {
            window.EventBus.emit('UI_LOG', `[EXTORTION] ${victimId} has been silenced by ${extorterId} regarding ${rumorId}.`);
            return true;
        }

        return false;
    }
}

window.GossipManager = new GossipManagerSystem();
export default window.GossipManager;
