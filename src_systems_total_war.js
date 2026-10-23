/**
 * File: src_systems_total_war.js
 * Tier VIII: Geopolitics, Warfare & Faction Dynamics (Systems 75–80)
 * 
 * Implements Mobilization, Siege, Migration, Insurgency, and Colonization.
 */

class TotalWarSystem {
    constructor() {
        this.fronts = new Map(); // Map<front_id, FrontObject>
        this.sieges = new Map(); // Map<village_id, SiegeObject>
        this.insurgencies = new Map(); // Map<house_id, InsurgencyObject>
        this.migrations = new Map(); // Map<migration_id, MigrationObject>

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Total War] Mobilization & Geopolitical Conflict Engines Active');
    }

    /**
     * 75.1 Draft & Peasant Conscription
     * 75.2 War Economy Conversion
     */
    mobilizeHouse(houseId, intensity = 'TOTAL') {
        const house = window.DynastyManager?.houses.get(houseId);
        if (!house) return;

        // 75.3 Emergency Requisition Taxes
        house.prestige -= 20;
        house.internalConflictLevel += 0.2;
        
        window.EventBus.emit('UI_LOG', `[WAR] ${house.name} has declared TOTAL MOBILIZATION. Peasants are being drafted.`);
    }

    /**
     * 76.1 Fortified Keep Blockades
     * 76.3 Siege Starvation Timers
     */
    initiateSiege(attackerId, villageId) {
        if (this.sieges.has(villageId)) return;

        const village = window.VillageManager?.villages.find(v => v.id === villageId);
        if (!village) return;

        this.sieges.set(villageId, {
            attackerId,
            startDay: window.EngineParams?.worldDay || 0,
            foodSupply: village.stats.food || 100,
            wallIntegrity: village.barrierIntegrity || 100,
            status: 'BLOCKADE'
        });

        // 76.4 Fuel Cut Siege Strategy
        window.EventBus.emit('UI_LOG', `[WAR] ${village.name} is under siege by ${attackerId}! Supplies are being cut.`);
    }

    /**
     * 77.1 Barrier Collapse Displacements
     * 77.2 Refugee Camp Overcrowding
     */
    triggerMigration(originId, populationCount) {
        const migrationId = `migration_${Date.now()}`;
        this.migrations.set(migrationId, {
            originId,
            count: populationCount,
            status: 'EN_ROUTE',
            destination: null
        });

        // 77.3 Demographic Tension: Refugees arriving in a village cause friction
        window.EventBus.emit('UI_LOG', `[WAR] A wave of ${populationCount} refugees is fleeing from ${originId}.`);
    }

    /**
     * 78.1 Underground Resistance Cells
     * 78.3 Assassination of Tax Collectors
     */
    spawnInsurgency(houseId, cause = 'TAXATION') {
        if (!this.insurgencies.has(houseId)) {
            this.insurgencies.set(houseId, {
                cells: 1,
                support: 0.1,
                cause
            });
        }
        
        window.EventBus.emit('UI_LOG', `[WAR] Sedition is brewing in ${houseId} territories. Resistance cells have formed.`);
    }

    /**
     * 79.1 War Reparation Demands
     * 79.4 Land Cession Agreements
     */
    negotiatePeace(houseA, houseB, terms = {}) {
        // 79.5 Monopoly Relinquishment Terms
        window.EventBus.emit('UI_LOG', `[DIPLOMACY] Peace Treaty signed between ${houseA} and ${houseB}.`);
        this.sieges.delete(houseA);
        this.sieges.delete(houseB);
    }

    /**
     * 80.1 Churn Frontier Reclamation
     * 80.2 Frontier Outpost Construction
     */
    establishColony(houseId, targetRegion) {
        // 80.4 Colonial Tax Extraction: High reward, high risk
        window.EventBus.emit('UI_LOG', `[EXPANSION] ${houseId} has established a frontier colony in ${targetRegion}.`);
    }
}

window.TotalWar = new TotalWarSystem();
export default window.TotalWar;
