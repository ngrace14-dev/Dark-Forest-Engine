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
