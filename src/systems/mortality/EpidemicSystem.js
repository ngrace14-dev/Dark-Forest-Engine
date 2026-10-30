// File: src/systems/mortality/EpidemicSystem.js
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * EpidemicSystem
 * Manages disease transmission and the social impact of outbreaks.
 */
export class EpidemicSystem {
    constructor(mortalitySystem) {
        this.mortalitySystem = mortalitySystem;
    }

    calculateTransmissionProbability(sourceActor, targetActor, baseInfectivity) {
        // High Sociability / High Agreeableness spikes contact events
        const sociabilityFactor = 1.0 + 0.5 * sourceActor.traits.sociability;
        
        // High Cynicism / High Fear leads to self-isolation (lowers transmission)
        let isolationFactor = 1.0;
        if (targetActor.traits.fear > 0.7 || targetActor.traits.cynicism > 0.7) {
            isolationFactor = 0.4; // 60% reduction if isolated
        }

        return baseInfectivity * sociabilityFactor * isolationFactor;
    }

    processOutbreakState(settlement, activeDisease) {
        const actors = settlement.getActors();
        let deathsThisTick = 0;

        for (const actor of actors) {
            if (actor.isInfected) {
                const wasAlive = !actor.isDead;
                this.mortalitySystem.processDiseaseTick(actor, activeDisease);
                
                if (wasAlive && actor.isDead) {
                    deathsThisTick++;
                    this.triggerSocialPanic(actor, settlement);
                }
            }
        }
        
        return deathsThisTick;
    }

    triggerSocialPanic(deceasedActor, settlement) {
        // Every cycle an infected peer dies within an actor's social radius
        const peers = settlement.getNearbyActors(deceasedActor, 5.0); // Radius of 5
        
        for (const peer of peers) {
            if (peer.isDead) continue;
            
            TraitSystem.applyExperientialDrift(peer, {
                fear: 0.15,
                cynicism: 0.10,
                loyalty: settlement.failedMitigation ? -0.05 : 0
            });
        }
    }
}
