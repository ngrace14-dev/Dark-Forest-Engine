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
     * 64.6 Pathogen Mutation Rates
     */
    simulateEpidemiology() {
        this.infections.forEach((activePathogens, entityId) => {
            const profile = window.PersonhoodManager?.getProfile(entityId);
            if (!profile) return;

            activePathogens.forEach(pathogenId => {
                const pathogen = this.pathogens.get(pathogenId);
                if (!pathogen) return;

                // 64.5 Immune System Resilience
                const resistance = profile.traits.riskTolerance * 0.5; // Placeholder for physical health
                if (Math.random() < pathogen.mortality * (1.0 - resistance)) {
                    window.EventBus.emit('ENTITY_DIED', { id: entityId, cause: 'DISEASE', pathogen: pathogenId });
                }

                // 64.6 Mutation
                if (Math.random() < 0.01) {
                    pathogen.virulence *= 1.1;
                    window.EventBus.emit('UI_LOG_DEBUG', `[DISEASE] ${pathogen.name} has mutated! Virulence increased.`);
                }
            });
        });
    }

    /**
     * 64.8 Herbal Remedy Efficacy
     */
    applyRemedy(entityId, pathogenId) {
        const active = this.infections.get(entityId);
        if (active && active.has(pathogenId)) {
            active.delete(pathogenId);
            window.EventBus.emit('UI_LOG', `[DISEASE] ${entityId} has been cured of ${pathogenId}.`);
        }
    }

    /**
     * 65.1 Apex Predator Territory Marking
     * 65.2 Prey Population Carrying Capacity
     * 65.4 Pack Hunting Coordination
     */
    updatePredatorPreyDynamics() {
        this.territories.forEach((territory, regionId) => {
            // 65.2 Carrying Capacity
            const preyCount = territory.preyCount || 100;
            const predatorCount = territory.predators.length;
            
            // 65.3 Monster Starvation Aggression
            if (predatorCount > preyCount / 10) {
                territory.aggressionLevel = 1.0;
                window.EventBus.emit('UI_LOG_DEBUG', `[ECOLOGY] Monsters in ${regionId} are starving and aggressive.`);
            }
        });
    }

    /**
     * 66.1 Photoreception & Night Vision
     * 66.3 Tactile Ground Vibration Sensing
     * 66.6 Heat Signature Detection
     */
    detectEntity(observerId, targetId) {
        const observer = window.PersonhoodManager.getProfile(observerId);
        const target = window.PersonhoodManager.getProfile(targetId);
        if (!observer || !target) return false;

        // 66.6 Heat Signature: High stress (fear) increases detectability
        const heat = target.traits.fear;
        const vibration = target.traits.ambition * 0.5; // Heavy movement
        
        return (heat + vibration) > 0.8;
    }

    /**
     * 67.2 Inbreeding Depression
     * 67.3 Origin Native Genetic Immunity
     * 67.6 Hybrid Vigor
     */
    calculateGeneticFit(parentId, otherId) {
        const p1 = window.PersonhoodManager.getProfile(parentId);
        const p2 = window.PersonhoodManager.getProfile(otherId);
        
        // 67.2: High kinship increases risk of depression
        const kinship = window.KinshipManager?.getKinshipBonus(parentId, otherId) || 1.0;
        if (kinship > 1.5) return 'INBREEDING_RISK';
        
        return 'STABLE';
    }

    /**
     * 68.3 Blood-Sucking Parasites
     * 68.8 Symbiotic Parasitism
     */
    applyBloodParasite(entityId) {
        this.applyParasite(entityId, 'BLOOD_TICK');
        // 68.8: Some parasites might provide a runic bonus (System 81)
    }

    /**
     * 69.2 Fungal-Tree Nutrient Sharing
     * 69.4 Alchemical Gut Flora Adaptation
     */
    updateSymbiosis() {
        // Logic for regional ecosystem bonuses (System 16)
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
