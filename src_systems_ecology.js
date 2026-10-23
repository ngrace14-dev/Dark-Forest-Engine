/**
 * File: src_systems_ecology.js
 * Tier VII: Ecological, Biological & Pathological (Systems 64–69)
 * 
 * Implements Disease, Predator-Prey Dynamics, Bio-Sensing, Genetics, and Symbiosis.
 */

class EcologySystem {
    constructor() {
        this.pathogens = new Map(); // Map<pathogen_id, PathogenObject>
        this.infections = new Map(); // Map<entity_id, Set<infection_id>>
        this.territories = new Map(); // Map<region_id, TerritoryObject>
        this.mutations = new Map(); // Map<entity_id, MutationObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Ecology] Biological & Pathological Systems Active');
        this.seedInitialPathogens();
    }

    seedInitialPathogens() {
        // 64.1 Fungal Spore Respiratory Infection
        this.pathogens.set('spore_cough', {
            id: 'spore_cough',
            name: 'Spore Cough',
            vector: 'AIRBORNE',
            virulence: 0.2,
            mortality: 0.05,
            symptoms: ['STAMINA_DRAIN', 'NOISE_COUGH'],
            incubationDays: 2
        });

        // 64.2 Waterborne Pathogens
        this.pathogens.set('mire_fever', {
            id: 'mire_fever',
            name: 'Mire Fever',
            vector: 'WATER',
            virulence: 0.5,
            mortality: 0.1,
            symptoms: ['FEVER_SHOCK', 'VOMITING'],
            incubationDays: 1
        });
    }

    /**
     * 64.3 Epidemic Vector Tracking
     */
    simulateEpidemiology() {
        // Logic to spread pathogens between entities in proximity
        // 64.4 Quarantine Enclosures: Check for village-level containment
    }

    /**
     * 65.1 Apex Predator Territory Marking
     * 65.2 Prey Population Carrying Capacity
     */
    updatePredatorPreyDynamics() {
        // Logic to balance monster populations based on available village population (prey)
        // 65.3 Monster Starvation Aggression: Starving monsters raid villages more frequently
    }

    /**
     * 66.2 Chemo-Reception (Scent Tracking)
     * 66.5 Scent-Masking Poultices
     */
    getScentSignature(entityId) {
        const profile = window.PersonhoodManager?.getProfile(entityId);
        if (!profile) return 0;
        
        let scent = profile.traits.fear * 10; // Fear pheromones (58.8)
        if (profile.hasScentMask) scent *= 0.1;
        return scent;
    }

    /**
     * 67.1 Inherited Physical Traits
     * 67.5 Mutation Drift
     */
    applyHereditaryMutation(parentId, childId) {
        const parent = window.PersonhoodManager.getProfile(parentId);
        const child = window.PersonhoodManager.getProfile(childId);
        if (!parent || !child) return;

        // 67.7 Recessive Runic Affinity
        if (parent.runicAffinity && Math.random() < 0.25) {
            child.runicAffinity = true;
        }

        // 67.5 Mutation Drift: Small chance of spontaneous mutation
        if (Math.random() < 0.01) {
            child.mutations = child.mutations || [];
            child.mutations.push('VOID_SIGHT');
        }
    }

    /**
     * 68.1 Canopy Siphon-Vine Predation
     * 68.4 Mind-Altering Fungal Infections
     */
    applyParasite(entityId, parasiteType) {
        if (!this.infections.has(entityId)) this.infections.set(entityId, new Set());
        this.infections.get(entityId).add(parasiteType);
        
        // 68.5 Parasitic Host Exploitation: Energy drain or behavior modification
        if (parasiteType === 'SIPHON_VINE') {
            window.EventBus.emit('UI_LOG_DEBUG', `[PARASITE] ${entityId} is being drained by a Siphon-Vine.`);
        }
    }

    /**
     * 69.1 The Silken Pact (Symbiosis)
     */
    establishSymbiosis(entityA, entityB, type) {
        // 69.8 Structural Bio-Shields: Symbiotic organisms providing protection
        window.EventBus.emit('UI_LOG', `[SYMBIOSIS] ${type} established between ${entityA} and ${entityB}.`);
    }

    handleDeath(data) {
        // 64.7 Plague Corpses as Biological Weapons
        if (this.infections.has(data.id)) {
            const region = data.regionId || 'unknown';
            window.EventBus.emit('UI_LOG_DEBUG', `[ECOLOGY] Contaminated corpse left in ${region}.`);
        }
    }
}

window.Ecology = new EcologySystem();
export default window.Ecology;
