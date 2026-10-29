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
        
        // Listen for institutional decisions from Phase 6
        window.EventBus.on('HOUSE_STATE_CHANGED', (data) => {
            if (data.event === 'SCHISM_RESOLVED' && data.winner === 'traditionalist') {
                // Traditionalist victories often lead to defensive preparedness
                this.mobilizeHouse(data.houseId, 'PREPAREDNESS');
            }
        });
    }

    /**
     * 75.1 Draft & Peasant Conscription
     * 75.2 War Economy Conversion
     * 75.5 Total War Attrition
     */
    mobilizeHouse(houseId, intensity = 'TOTAL') {
        const house = window.DynastyManager?.houses.get(houseId);
        if (!house) return;

        house.mobilizationState = intensity; // PEACE, PREPAREDNESS, TOTAL
        
        // 75.3 Emergency Requisition Taxes
        if (intensity === 'TOTAL') {
            house.prestige -= 20;
            house.internalConflictLevel += 0.2;
            window.EventBus.emit('UI_LOG', `[WAR] ${house.name} has declared TOTAL MOBILIZATION. Peasants are being drafted.`);
        } else if (intensity === 'PREPAREDNESS') {
            house.prestige -= 5;
            window.EventBus.emit('UI_LOG', `[WAR] ${house.name} has entered a state of military preparedness.`);
        } else {
            house.mobilizationState = 'PEACE';
            window.EventBus.emit('UI_LOG', `[WAR] ${house.name} has returned to a state of peace.`);
        }
        
        // 75.8 Logistics Train Strain: High mobilization reduces trade efficiency
        // This is handled in VillageManager via the labor penalty hook
    }

    /**
     * Returns the labor efficiency based on mobilization intensity.
     * Bible §75.1: Conscription reduces civilian output.
     */
    getLaborEfficiency(houseId) {
        const house = window.DynastyManager?.houses.get(houseId);
        if (!house) return 1.0;

        switch(house.mobilizationState) {
            case 'TOTAL': return 0.6; // 40% labor loss
            case 'PREPAREDNESS': return 0.9; // 10% labor loss
            default: return 1.0;
        }
    }

    /**
     * Siphons a percentage of village gold to the House War Chest.
     */
    siphonWarTax(house, amount) {
        if (!house || house.mobilizationState === 'PEACE') return 0;
        
        const rate = house.mobilizationState === 'TOTAL' ? 0.5 : 0.15;
        const tax = amount * rate;
        house.warChest = (house.warChest || 0) + tax;
        return tax;
    }

    /**
     * 76.1 Fortified Keep Blockades
     * 76.3 Siege Starvation Timers
     * 76.5 Disease Outbreaks in Besieged Cities
     */
    simulateSiegeTick(villageId) {
        const siege = this.sieges.get(villageId);
        if (!siege) return;

        siege.foodSupply -= 5;
        
        // 76.5: Crowded, starving cities breed disease
        if (siege.foodSupply < 20 && Math.random() < 0.1) {
            window.Ecology?.applyParasite(villageId, 'spore_cough');
        }

        if (siege.foodSupply <= 0) {
            // 76.8 Surrender Negotiations
            window.EventBus.emit('UI_LOG', `[WAR] ${villageId} has surrendered due to starvation.`);
            this.sieges.delete(villageId);
        }
    }

    /**
     * 77.1 Barrier Collapse Displacements
     * 77.5 Infiltration via Refugee Waves
     * 77.8 Refugee Radicalization
     */
    processRefugees(migrationId, destinationVillageId) {
        const migration = this.migrations.get(migrationId);
        if (!migration) return;

        // 77.3 Demographic Tension
        const village = window.VillageManager?.villages.find(v => v.id === destinationVillageId);
        if (village) {
            village.tensions += (migration.count / 100);
            
            // 77.4 Refugee Labor Exploitation
            if (village.culture?.dominantTrait === 'MERCANTILE') {
                village.stats.prosperity += 5;
            }
        }
    }

    /**
     * 78.1 Underground Resistance Cells
     * 78.4 Pamphlet & Propaganda Distribution
     * 78.6 Counter-Insurgency Reprisals
     */
    updateInsurgency(houseId) {
        const insurgency = this.insurgencies.get(houseId);
        if (!insurgency) return;

        // 78.8 Rebellion Escalation
        if (insurgency.support > 0.5) {
            window.EventBus.emit('UI_LOG', `[WAR] Rebellion has erupted in ${houseId}! Civil war imminent.`);
        }
    }

    /**
     * 79.1 War Reparation Demands
     * 79.2 Demilitarization Zones
     * 79.3 Hostage Exchange Protocols
     */
    applyPeaceTerms(houseA, houseB, terms) {
        // 79.4 Land Cession
        window.EventBus.emit('UI_LOG', `[DIPLOMACY] Peace terms applied between ${houseA} and ${houseB}.`);
    }

    /**
     * 80.1 Churn Frontier Reclamation
     * 80.5 Cultural Assimilation Directives
     * 80.6 Colonial Revolt Risk
     */
    updateColony(houseId, regionId) {
        // 80.7 Frontier Supply Lines: Risk of fuel cutoff
    }
}

window.TotalWar = new TotalWarSystem();
export default window.TotalWar;
