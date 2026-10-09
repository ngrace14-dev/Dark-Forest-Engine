/**
 * File: src_systems_dynasty.js
 * Phase 8: House History & Institutional Memory
 * 
 * Implements Bible §19 (The Monopoly Bottleneck) and §36 (Civilizational Institutions).
 * Manages the 19 Noble Houses, their lineages, feuds, and claims to Blessed Spots.
 */

class DynastyManagerSystem {
    constructor() {
        this.houses = new Map(); // Map<house_id, HouseObject>
        this.feuds = []; // Array of { houseA, houseB, reason, intensity, startDate }
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
        window.EventBus.on('HISTORY_PUBLISHED', (narrative) => this.processNarrative(narrative));
    }

    init() {
        // Initialize the 19 Noble Houses (Bible §19)
        const houseNames = [
            'Terminus', 'Oakhaven', 'Ironspire', 'Silverrun', 'Blackwood',
            'Stonehelm', 'Goldleaf', 'Ravenwatch', 'Deepdell', 'Highcrag',
            'Windward', 'Stormfront', 'Mistmantle', 'Thornrose', 'Brightvale',
            'Duskmoor', 'Frostpeak', 'Shadowfell', 'Sunstride'
        ];

        houseNames.forEach((name, index) => {
            const id = `house_${name.toLowerCase()}`;
            this.houses.set(id, {
                id: id,
                name: `House ${name}`,
                founder: `Founder ${name}`,
                currentLeader: null,
                lineage: [],
                claims: [],
                monopolies: [], // "Blessed Spots"
                prestige: 100,
                isBlessed: index < 9, // First 9 are "Blessed" (Bible §19)
                archives: []
            });
        });

        window.EventBus.emit('UI_LOG', '[Dynasty] Institutional Memory Engaged');
    }

    /**
     * Handles the death of a notable NPC.
     * Bible §36: "Individuals die; institutions persist."
     */
    handleDeath(entity) {
        if (!entity.houseId) return;

        const house = this.houses.get(entity.houseId);
        if (!house) return;

        // If the leader died, trigger succession
        if (house.currentLeader === entity.id) {
            this.triggerSuccession(house);
        }

        // If killed by a member of another house, start/intensify a feud
        if (entity.lastAttacker?.houseId && entity.lastAttacker.houseId !== entity.houseId) {
            this.recordFeudEvent(entity.houseId, entity.lastAttacker.houseId, 'BLOODSHED');
        }
    }

    triggerSuccession(house) {
        const oldLeader = house.currentLeader;
        // Simple succession: find highest level member of house or generate new heir
        const newLeaderId = `heir_${Math.random().toString(36).substr(2, 5)}`;
        
        house.lineage.push(oldLeader);
        house.currentLeader = newLeaderId;

        const event = {
            actorId: house.id,
            type: 'SUCCESSION',
            detail: `${house.name}: Succession from ${oldLeader} to ${newLeaderId}.`,
            significance: 120,
            historicalWeight: 80
        };

        window.ChronicleManager?.recordEvent(event);
        window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} has a new leader: ${newLeaderId}`);
    }

    recordFeudEvent(houseA, houseB, reason) {
        let feud = this.feuds.find(f => 
            (f.houseA === houseA && f.houseB === houseB) || 
            (f.houseA === houseB && f.houseB === houseA)
        );

        if (!feud) {
            feud = { houseA, houseB, reason, intensity: 1, startDate: window.EngineParams?.worldDay || 0 };
            this.feuds.push(feud);
            window.EventBus.emit('UI_LOG', `[FEUD] A blood-feud has begun between ${houseA} and ${houseB}!`);
        } else {
            feud.intensity += 1;
            feud.reason = reason;
        }

        // Feuds influence NPC cognition (Phase 5)
        // This is handled by ReputationManager.isRival() which we will hook into
    }

    processNarrative(narrative) {
        // Record official history into house archives
        const house = this.houses.get(narrative.bias);
        if (house) {
            house.archives.push(narrative.id);
        }
    }

    getHouse(id) {
        return this.houses.get(id);
    }

    getFeuds() {
        return this.feuds;
    }
}

window.DynastyManager = new DynastyManagerSystem();
export default window.DynastyManager;
