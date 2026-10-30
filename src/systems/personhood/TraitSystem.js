// File: src/systems/personhood/TraitSystem.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

/**
 * TraitSystem
 * Manages actor traits, constitution, and experiential drift.
 */
export class TraitSystem {
    static clampTrait(value) {
        return Math.max(PersonhoodConstants.TRAIT_MIN, Math.min(PersonhoodConstants.TRAIT_MAX, value));
    }

    static calculateAgeVulnerability(age) {
        if (age < PersonhoodConstants.PRIME_AGE_START) {
            // Formative Youth: 1.0 -> 0.3
            return 1.0 - (age / PersonhoodConstants.PRIME_AGE_START) * 0.7;
        } else if (age < PersonhoodConstants.TWILIGHT_AGE_START) {
            // Prime Resilience
            return 0.3;
        } else {
            // Twilight Senescence: 0.3 -> 1.0
            const range = PersonhoodConstants.MAX_AGE - PersonhoodConstants.TWILIGHT_AGE_START;
            const progress = (age - PersonhoodConstants.TWILIGHT_AGE_START) / range;
            return 0.3 + progress * 0.7;
        }
    }

    static calculateInheritedTraits(parentA, parentB) {
        const childTraits = {};
        const mutationChance = 0.05;
        const mutationRange = 0.1;

        // Iterate through all known traits from Parent A
        Object.keys(parentA.traits).forEach(trait => {
            if (trait === 'credibility') return; // Credibility is earned, not inherited

            const baseValue = (parentA.traits[trait] + parentB.traits[trait]) / 2;
            let mutation = 0;
            
            if (Math.random() < mutationChance) {
                mutation = (Math.random() - 0.5) * mutationRange;
            }

            childTraits[trait] = this.clampTrait(baseValue + mutation);
        });

        return childTraits;
    }

    static calculateInheritedConstitution(parent1Const, parent2Const) {
        const base = (parent1Const + parent2Const) / 2;
        // Normal distribution approximation: sum of 3 randoms
        const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.05;
        return this.clampTrait(base + noise);
    }

    static applyExperientialDrift(actor, changes) {
        for (const [trait, delta] of Object.entries(changes)) {
            if (actor.traits && actor.traits[trait] !== undefined) {
                actor.traits[trait] = this.clampTrait(actor.traits[trait] + delta);
                console.log(`[TraitSystem] ${actor.id} ${trait} drifted by ${delta} to ${actor.traits[trait]}`);
            }
        }
    }
}
