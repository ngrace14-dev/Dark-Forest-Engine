/**
 * File: src_systems_urban_planning.js
 * System 40: Urban Planning & Zoning
 */

export const QuarterType = {
    NOBLE: { id: 'NOBLE', name: 'Noble Quarter', capitalFloor: 80, resourceBias: 1.5, rumorRarity: 'LEGENDARY' },
    ARTISAN: { id: 'ARTISAN', name: 'Artisan District', capitalFloor: 40, resourceBias: 1.0, rumorRarity: 'UNCOMMON' },
    SLUMS: { id: 'SLUMS', name: 'Slums', capitalFloor: 0, resourceBias: 0.5, rumorRarity: 'COMMON' }
};

class UrbanPlanningSystem {
    constructor() {
        this.zones = new Map(); // Map<village_id, Set<ZoneObject>>
        this.settlementAnchors = new Map(); // Map<village_id, {x, z}>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Urban Planning] Zoning & Infrastructure Engines Online');
    }

    registerAnchor(villageId, x, z) {
        this.settlementAnchors.set(villageId, { x, z });
    }

    /**
     * Calculates spatial partitioning for building permits.
     * Bible §4: Distance from Anchor determines stratification.
     */
    getQuarterForLocation(villageId, x, z) {
        const anchor = this.settlementAnchors.get(villageId);
        if (!anchor) return QuarterType.SLUMS;

        const dist = Math.hypot(x - anchor.x, z - anchor.z);
        
        if (dist < 30) return QuarterType.NOBLE;
        if (dist < 80) return QuarterType.ARTISAN;
        return QuarterType.SLUMS;
    }

    /**
     * Determines if an NPC is allowed to reside in a specific quarter.
     */
    canPermitNPC(npc, villageId, targetPos) {
        const quarter = this.getQuarterForLocation(villageId, targetPos.x, targetPos.z);
        const socialCapital = npc.socialCapital || 0;
        
        return socialCapital >= quarter.capitalFloor;
    }

    /**
     * 40.1 Defensive Wall Construction
     * 40.7 Choke-Point Gates
     */
    upgradeDefenses(villageId) {
        window.EventBus.emit('UI_LOG', `[PLANNING] Defensive walls fortified in ${villageId}.`);
    }

    /**
     * 40.2 Slum & Refugee Containment
     */
    establishRefugeeZone(villageId) {
        window.EventBus.emit('UI_LOG', `[PLANNING] Refugee containment zone established in ${villageId}.`);
    }
}

window.UrbanPlanning = new UrbanPlanningSystem();
export default window.UrbanPlanning;
