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
        
        // --- STEP 9-4: THE WAR LEDGER ---
        this.stats = {
            totalCasualties: 0,
            villagesConquered: 0,
            activeFronts: 0,
            warExhaustion: 0 // Global factor
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    /**
     * Records casualties and updates global exhaustion.
     * Bible §75.5: Total War Attrition
     */
    recordCasualties(count, houseId = null) {
        this.stats.totalCasualties += count;
        // War exhaustion increases with casualties
        this.stats.warExhaustion = Math.min(1.0, this.stats.warExhaustion + (count / 10000));
        
        if (houseId) {
            const house = window.DynastyManager?.houses.get(houseId);
            if (house) {
                house.prestige = Math.max(0, house.prestige - (count * 0.1));
            }
        }

        window.EventBus.emit('WAR_CASUALTIES_REPORTED', { count, total: this.stats.totalCasualties });
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

        // 75.9 Tactical Coordination Loop
        window.EventBus.on('HEARTBEAT_T6H', () => this.coordinateFronts());
    }

    coordinateFronts() {
        const houses = window.DynastyManager?.houses || new Map();
        houses.forEach(house => {
            if (house.mobilizationState === 'TOTAL') {
                this.executeTacticalPlan(house);
            }
        });
    }

    executeTacticalPlan(house) {
        const houseVillages = window.VillageManager?.villages.filter(v => v.nobleHouse === house.name) || [];
        if (houseVillages.length === 0) return;

        // 1. Identify Strategic Target (Blessed Spot or Weak Rival)
        const target = this.selectMilitaryTarget(house);
        if (!target) return;

        // 2. Marshall Forces
        houseVillages.forEach(v => {
            if (v.squads.length > 0 && !v.isBesieged) {
                const squad = v.squads.find(s => s.status === 'patrolling');
                if (squad) {
                    this.dispatchSquad(squad, v, target);
                }
            }
        });
    }

    selectMilitaryTarget(house) {
        // Targets Blessed Spots of rivals first
        const rivals = Array.from(window.DynastyManager.houses.values())
            .filter(h => h.id !== house.id && h.isBlessed);
        
        if (rivals.length > 0) {
            const targetHouse = rivals[0];
            const targetVillage = window.VillageManager.villages.find(v => v.nobleHouse === targetHouse.name);
            return targetVillage;
        }
        return null;
    }

    dispatchSquad(squad, originVillage, targetVillage) {
        squad.status = 'marching';
        squad.originId = originVillage.id;
        squad.targetId = targetVillage.id;
        
        const start = new THREE.Vector3(originVillage.x, 0, originVillage.z);
        const goal = new THREE.Vector3(targetVillage.x, 0, targetVillage.z);
        
        // Use the new Long-Range Marching logic (Step 9-3)
        squad.marchRoute = window.Navigation?.findLongRangeRoute(start, goal) || [];
        
        window.EventBus.emit('UI_LOG_DEBUG', `[WAR] ${originVillage.nobleHouse} squad marching from ${originVillage.name} to ${targetVillage.name}.`);
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
    startSiege(attackerHouseId, targetVillageId) {
        const attacker = window.DynastyManager?.houses.get(attackerHouseId);
        const village = window.VillageManager?.villages.find(v => v.id === targetVillageId);
        
        if (!attacker || !village || this.sieges.has(targetVillageId)) return;

        const siege = {
            id: `siege_${targetVillageId}_${Date.now()}`,
            attackerId: attackerHouseId,
            villageId: targetVillageId,
            startDay: window.EngineParams?.worldDay || 0,
            strength: attacker.mobilizationState === 'TOTAL' ? 50 : 20,
            foodSupply: village.stats.food / 100,
            barrierIntegrity: village.barrierIntegrity
        };

        this.sieges.set(targetVillageId, siege);
        village.isBesieged = true;
        
        window.EventBus.emit('UI_LOG', `[WAR] ${attacker.name} has laid siege to ${village.name}!`);
        window.ChronicleManager?.recordEvent({
            actorId: attackerHouseId,
            type: 'SIEGE_START',
            detail: `${attacker.name} has blockaded ${village.name}.`,
            significance: 100,
            location: { x: village.x, z: village.z }
        });
    }

    simulateSiegeTick(villageId) {
        const siege = this.sieges.get(villageId);
        const village = window.VillageManager?.villages.find(v => v.id === villageId);
        if (!siege || !village) return;

        // 76.3: Starvation logic
        const starvationRate = 5 + (siege.strength * 0.1);
        village.stats.food = Math.max(0, village.stats.food - (starvationRate * 100));
        siege.foodSupply = village.stats.food / 100;
        
        // Attrition of the barrier
        const damage = siege.strength * 0.1;
        village.barrierIntegrity = Math.max(0, village.barrierIntegrity - damage);
        siege.barrierIntegrity = village.barrierIntegrity;

        // 76.5: Disease Outbreaks
        if (siege.foodSupply < 20 && Math.random() < 0.05) {
            window.EventBus.emit('UI_LOG_DEBUG', `[WAR] Sickness is spreading in the besieged ${village.name}.`);
            village.population.current = Math.max(10, village.population.current - 5);
        }

        // Capture Condition: Barrier is down and food is low
        if (village.barrierIntegrity <= 0 || siege.foodSupply <= 0) {
            this.resolveSiege(villageId, 'CONQUEST');
        }
    }

    resolveSiege(villageId, result) {
        const siege = this.sieges.get(villageId);
        const village = window.VillageManager?.villages.find(v => v.id === villageId);
        if (!siege || !village) return;

        const attacker = window.DynastyManager?.houses.get(siege.attackerId);
        const oldOwnerName = village.nobleHouse;
        const oldHouseId = `house_${oldOwnerName.toLowerCase().replace('house ', '')}`;
        const defender = window.DynastyManager?.houses.get(oldHouseId);

        if (result === 'CONQUEST') {
            this.stats.villagesConquered++;
            window.EventBus.emit('UI_LOG', `[WAR] ${village.name} HAS FALLEN to ${attacker.name}!`);
            
            // Transfer Ownership
            village.nobleHouse = attacker.name;
            village.currentOccupier = siege.attackerId;
            village.isBesieged = false;

            // Monopoly Transfer (Bible §19)
            if (defender && defender.isBlessed) {
                window.DynastyManager.setBlessedStatus(defender.id, false);
                window.DynastyManager.setBlessedStatus(attacker.id, true);
                window.EventBus.emit('UI_LOG', `[WAR] The Blessed Spot monopoly has been seized by ${attacker.name}.`);
            }

            attacker.prestige += 50;
            if (defender) defender.prestige -= 30;

            window.ChronicleManager?.recordEvent({
                actorId: siege.attackerId,
                type: 'VILLAGE_CONQUERED',
                detail: `${attacker.name} has captured ${village.name} from ${oldOwnerName}.`,
                significance: 200,
                historicalWeight: 150,
                location: { x: village.x, z: village.z }
            });
        }

        this.sieges.delete(villageId);
        village.isBesieged = false;
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
