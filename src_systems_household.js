/**
 * File: src_systems_household.js
 * System 52: Household Economy & Production
 * 
 * Implements the "Household" as the core unit of civilization.
 * Tracks family food reserves, labor allocation, and inter-generational assets.
 */

class HouseholdSystem {
    constructor() {
        this.households = new Map(); // Map<household_id, HouseholdObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Household] Micro-Sociology & Family Units Active');
        window.EventBus.on('HEARTBEAT_T1', () => this.processDailySurvival());
    }

    /**
     * Daily Survival Cycle for all Households.
     * Bible §18: Survival requires risk. Household is the unit of survival.
     */
    processDailySurvival() {
        // Run once per game day (assuming T1 triggers at 1Hz, we check worldDay)
        const day = window.EngineParams?.worldDay || 0;
        if (this.lastProcessDay === day) return;
        this.lastProcessDay = day;

        this.households.forEach(household => {
            // 1. Calculate Caloric Need
            const consumptionPerMember = 5.0; // Configurable
            const totalNeed = household.members.length * consumptionPerMember;

            // 2. Consume from Pantry
            if (household.assets.food >= totalNeed) {
                household.assets.food -= totalNeed;
                // Members are healthy
                this.updateMemberHealth(household, 1.0);
            } else {
                // Household is Starving
                const ratio = household.assets.food / totalNeed;
                household.assets.food = 0;
                this.handleHouseholdStarvation(household, ratio);
            }

            // 3. Wealth/Trade Production
            // Residual income from household labor
            const laborIncome = household.members.length * 0.5; 
            household.assets.wealth += laborIncome;
        });
    }

    updateMemberHealth(household, saturation) {
        household.members.forEach(id => {
            const entity = window.GameCore?.activeEntities?.find(e => e.id === id);
            if (entity) {
                entity.lastFedDay = window.EngineParams?.worldDay || 0;
                // Healing bonus if fully saturated
                if (saturation >= 1.0) entity.hp = Math.min(entity.maxHp, entity.hp + 2);
            }
        });
    }

    handleHouseholdStarvation(household, ratio) {
        window.EventBus.emit('UI_LOG_DEBUG', `[HOUSEHOLD] ${household.id} is starving (Supply: ${Math.floor(ratio*100)}%).`);
        
        household.members.forEach(id => {
            const entity = window.GameCore?.activeEntities?.find(e => e.id === id);
            if (entity) {
                // Direct HP damage from starvation
                const starvationDamage = 10 * (1.0 - ratio);
                entity.hp -= starvationDamage;
                
                // BEHAVIORAL OVERRIDE (Bible §18)
                // NPCs shift from CAREER tasks to SURVIVAL desperation
                if (ratio < 0.3) {
                    entity.currentTask = 'Desperate Search';
                    entity.aiMode = 'aggressive'; // Desperate NPCs may steal or hunt dangerously
                }

                if (entity.hp <= 0 && window.defeatNpc) {
                    window.defeatNpc(entity, 'starvation');
                }
            }
        });

        // Disaster Recovery Adjustment
        household.riskTolerance = Math.min(1.0, household.riskTolerance + 0.1);
    }

    /**
     * 52.1 The Household Core Unit
     * 52.2 Family Food Reserve Allocation
     */
    createHousehold(villageId, members = []) {
        const id = `household_${villageId}_${Date.now()}`;
        const household = {
            id,
            villageId,
            members, // Array of entityIds
            assets: {
                food: 100,
                tools: 5,
                wealth: 50
            },
            riskTolerance: 0.5, // 52.4 Household Risk Tolerance
            priority: 'SURVIVAL' // SURVIVAL, WEALTH, PRESTIGE
        };

        this.households.set(id, household);
        return id;
    }

    /**
     * 52.3 Child Labor & Apprenticeships
     */
    assignLabor(householdId, entityId, task) {
        const household = this.households.get(householdId);
        if (!household || !household.members.includes(entityId)) return;

        const profile = window.PersonhoodManager?.getProfile(entityId);
        if (profile.age < 12) {
            // Child labor logic (limited tasks)
            window.EventBus.emit('UI_LOG_DEBUG', `[HOUSEHOLD] Child ${entityId} assigned to light labor: ${task}.`);
        }
    }

    /**
     * 52.5 Elderly Care & Knowledge Preservation
     */
    preserveKnowledge(householdId) {
        const household = this.households.get(householdId);
        if (!household) return;

        // Elder members (Venerable) pass skills to children in the household
        const elders = household.members.map(id => window.PersonhoodManager.getProfile(id))
            .filter(p => p.lifeStage === 'VENERABLE');
        
        const children = household.members.map(id => window.PersonhoodManager.getProfile(id))
            .filter(p => p.lifeStage === 'CHILD' || p.lifeStage === 'ADOLESCENT');

        elders.forEach(elder => {
            children.forEach(child => {
                // Pass a portion of skills (52.5)
                Object.keys(elder.skills).forEach(skill => {
                    const gain = elder.skills[skill].level * 0.05;
                    window.PersonhoodManager.updateSkill(child.id, skill, gain);
                });
            });
        });
    }

    /**
     * 52.7 Household Disaster Recovery
     */
    onVillageDisaster(villageId) {
        // Households in the village react (e.g., migration or rebuilding)
        this.households.forEach(h => {
            if (h.villageId === villageId) {
                h.riskTolerance += 0.2; // Become more cautious
            }
        });
    }
}

window.HouseholdManager = new HouseholdSystem();
export default window.HouseholdManager;
