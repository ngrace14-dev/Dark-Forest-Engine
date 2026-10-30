// File: src/systems/culture/CulturalEmergenceFramework.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * Cultural Emergence Framework
 * 
 * Tracks the spontaneous development and evolution of belief systems
 * (Religions, Philosophies, Heresies, etc.) within NPC societies.
 */
export class CulturalEmergenceFramework {
    constructor(settlement) {
        this.settlement = settlement;
        this.beliefSystems = [];
        this.emergenceThreshold = 0.75; // Average trait intensity to spark a system
    }

    /**
     * Process a tick for cultural evolution.
     */
    update(delta) {
        this.scanForEmergence();
        this.processBeliefDynamics();
    }

    /**
     * Determine if NPC societies can generate entirely new belief systems.
     * Logic: If a cluster of actors shares extreme trait alignments, a new system is birthed.
     */
    scanForEmergence() {
        const avgCynicism = this.settlement.getAverageTrait('cynicism');
        const avgSuperstition = this.settlement.getAverageTrait('superstition');
        const avgAltruism = this.settlement.getAverageTrait('altruism');

        console.log(`[Culture] Scan - Superstition: ${avgSuperstition.toFixed(2)}, Altruism: ${avgAltruism.toFixed(2)}, Cynicism: ${avgCynicism.toFixed(2)}`);

        // Emergence Check: High Superstition + High Fear -> Religion
        if (avgSuperstition > 0.5 && !this.hasBeliefType('Religion')) {
            this.foundBeliefSystem('Religion', 'The Cult of the Whispering Roots');
        }

        // Emergence Check: High Cynicism + Low Loyalty -> Heresy
        if (avgCynicism > 0.6 && !this.hasBeliefType('Heresy')) {
            this.foundBeliefSystem('Heresy', 'The Shattered Chain');
        }

        // Emergence Check: High Altruism + High Conscientiousness -> Philosophy/School
        if (avgAltruism > 0.5 && !this.hasBeliefType('Philosophy')) {
            this.foundBeliefSystem('Philosophy', 'The Order of the Steady Ember');
        }
    }

    foundBeliefSystem(type, name) {
        const system = {
            id: `Belief_${Date.now()}`,
            type,
            name,
            adopters: new Set(),
            persistence: 1.0,
            expansionRate: 0,
            mutationIndex: 0,
            coreTraits: this.deriveCoreTraits(type),
            age: 0
        };

        this.beliefSystems.push(system);
        console.error(`[Culture] NEW BELIEF SYSTEM EMERGED: ${name} (${type})`);
    }

    deriveCoreTraits(type) {
        switch(type) {
            case 'Religion': return { superstition: 0.8, fear: 0.6 };
            case 'Philosophy': return { altruism: 0.8, conscientiousness: 0.7 };
            case 'Heresy': return { cynicism: 0.9, loyalty: 0.1 };
            default: return {};
        }
    }

    processBeliefDynamics() {
        for (let i = this.beliefSystems.length - 1; i >= 0; i--) {
            const system = this.beliefSystems[i];
            system.age++;
            
            // 1. Belief Adoption
            this.calculateAdoption(system);

            // 2. Belief Mutation
            this.calculateMutation(system);

            // 3. Belief Persistence
            this.calculatePersistence(system, i);

            // 4. Belief Expansion
            const aliveCount = this.settlement.getActors().length;
            system.expansionRate = aliveCount > 0 ? system.adopters.size / aliveCount : 0;
        }
    }

    calculateAdoption(system) {
        const actors = this.settlement.getActors();
        for (const actor of actors) {
            if (system.adopters.has(actor.id)) continue;

            // Affinity Check: Do the actor's traits align with the system's core?
            let affinity = 0;
            let count = 0;
            for (const [trait, value] of Object.entries(system.coreTraits)) {
                affinity += 1.0 - Math.abs((actor.traits[trait] || 0.5) - value);
                count++;
            }
            
            const finalAffinity = affinity / count;
            if (finalAffinity > 0.75) { // Lowered affinity threshold for adoption
                system.adopters.add(actor.id);
                console.log(`[Culture] ${actor.id} adopted belief: ${system.name} (Affinity: ${finalAffinity.toFixed(2)})`);
                
                // Trait Drift upon adoption
                TraitSystem.applyExperientialDrift(actor, this.deriveAdoptionDrift(system.type));
            }
        }
    }

    deriveAdoptionDrift(type) {
        switch(type) {
            case 'Religion': return { superstition: 0.1, fear: 0.05 };
            case 'Heresy': return { cynicism: 0.1, loyalty: -0.1 };
            case 'Philosophy': return { altruism: 0.05, conscientiousness: 0.05 };
            default: return {};
        }
    }

    calculateMutation(system) {
        if (system.adopters.size === 0) return;

        // Mutation occurs if the average traits of adopters drift away from core
        system.mutationIndex += 0.01; 
        if (system.mutationIndex > 1.0) {
            console.warn(`[Culture] ${system.name} is mutating toward its adopters' mean.`);
            system.mutationIndex = 0;
            
            // Shift core traits 10% toward the adopters' current mean
            for (const trait of Object.keys(system.coreTraits)) {
                const adopterMean = this.calculateAdopterMean(system, trait);
                system.coreTraits[trait] += 0.1 * (adopterMean - system.coreTraits[trait]);
            }
        }
    }

    calculateAdopterMean(system, traitName) {
        const adopters = this.settlement.getActors().filter(a => system.adopters.has(a.id));
        if (adopters.length === 0) return 0.5;
        const sum = adopters.reduce((acc, a) => acc + (a.traits[traitName] || 0.5), 0);
        return sum / adopters.length;
    }

    calculatePersistence(system, index) {
        // Grace period for new belief systems
        if (system.age < 10) return;

        if (system.adopters.size === 0) {
            system.persistence -= 0.05;
        } else {
            // Regain persistence if active
            system.persistence = Math.min(1.0, system.persistence + 0.01);
        }
        
        if (system.persistence <= 0) {
            console.error(`[Culture] BELIEF SYSTEM COLLAPSED: ${system.name}`);
            this.beliefSystems.splice(index, 1);
        }
    }

    hasBeliefType(type) {
        return this.beliefSystems.some(s => s.type === type);
    }

    generateObservatoryReport() {
        return {
            title: "Cultural Emergence Observatory Report",
            activeSystems: this.beliefSystems.map(s => ({
                name: s.name,
                type: s.type,
                adopters: s.adopters.size,
                expansion: `${(s.expansionRate * 100).toFixed(1)}%`,
                persistence: s.persistence.toFixed(2)
            })),
            conclusion: "NPC societies generate belief systems when trait clusters synchronize. Heresies emerge as defense mechanisms against perceived systemic failure."
        };
    }
}
