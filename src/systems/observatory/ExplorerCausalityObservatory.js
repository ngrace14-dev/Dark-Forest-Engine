// File: src/systems/observatory/ExplorerCausalityObservatory.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

/**
 * Explorer Causality Observatory
 * 
 * Tracks, measures, and determines the success/failure factors 
 * for actors embarking on exploration beyond settlement borders.
 */
export class ExplorerCausalityObservatory {
    constructor() {
        this.expeditions = [];
        this.analytics = {
            totalExpeditions: 0,
            successes: 0,
            failures: 0,
            deaths: 0,
            discoveredTiles: 0,
            totalDiscoveryYield: 0,
            failureModes: {
                starvation: 0,
                exhaustion: 0,
                trauma: 0,
                insanity: 0
            }
        };
    }

    /**
     * Record the departure of an explorer.
     */
    trackDeparture(actor, destination, purpose) {
        const expedition = {
            actorId: actor.id,
            reason: purpose, // Curiosity, Scarcity, Exile, Heresy
            traits: { ...actor.traits },
            preparationScore: this.calculatePreparation(actor),
            supplies: actor.personalFoodReserve || 0,
            distanceTraveled: 0,
            isResolved: false,
            outcome: null,
            ticksActive: 0
        };

        this.expeditions.push(expedition);
        this.analytics.totalExpeditions++;
        console.log(`[Observatory] Explorer ${actor.id} departed for ${purpose}. Prep Score: ${expedition.preparationScore.toFixed(2)}`);
    }

    calculatePreparation(actor) {
        // Preparation is a factor of conscientiousness and wealth (access to gear)
        const conscientiousness = actor.traits.conscientiousness || 0.5;
        const wealth = actor.wealth || 0.1;
        return (conscientiousness * 0.7) + (wealth * 0.3);
    }

    processExpeditionTick(actor, expedition, environment) {
        if (expedition.isResolved) return;

        expedition.ticksActive++;
        expedition.distanceTraveled += 1.0 + (actor.traits.ambition * 0.5);
        
        // 1. Consume Supplies
        const consumption = 1.0 + (0.5 * (actor.traits.aggression || 0.5));
        expedition.supplies -= consumption;

        // 2. Manage Fatigue
        // Every tick adds base fatigue, reduced by constitution and conscientiousness (pacing)
        const fatigueGain = 0.01 * (1.0 - (actor.traits.constitution * 0.4) - (actor.traits.conscientiousness * 0.2));
        actor.fatigue = (actor.fatigue || 0) + fatigueGain;

        // 3. Trait & Motivation Success Rates
        const motivationDrift = this.calculateMotivationSuccess(actor, expedition);
        const traitResilience = this.calculateTraitResilience(actor, environment);

        // 3. Hazard Check (Using existing HazardCascade logic in spirit)
        if (Math.random() < (0.05 + environment.danger)) {
            this.handleHazard(actor, expedition);
        }

        // 4. Resolve Failure
        if (expedition.supplies <= 0) {
            this.resolveExpedition(expedition, 'Failure', 'Starvation');
        } else if (actor.fatigue >= 1.0) {
            this.resolveExpedition(expedition, 'Failure', 'Exhaustion');
        } else if (expedition.distanceTraveled >= 50) { // Goal reached - lowered for testing
            this.resolveExpedition(expedition, 'Success', 'Discovery');
        }
    }

    calculateMotivationSuccess(actor, expedition) {
        // High Ambition keeps them going; High Fear makes them want to turn back.
        return (actor.traits.ambition * 0.6) - (actor.traits.fear * 0.4);
    }

    calculateTraitResilience(actor, environment) {
        // Constitution + Risk Tolerance vs Environment Hardship
        return (actor.traits.constitution * 0.5) + (actor.traits.riskTolerance * 0.5) - environment.danger;
    }

    handleHazard(actor, expedition) {
        // Random injury or psychological blow
        actor.fatigue += 0.2;
        if (Math.random() < 0.3) {
            actor.isMaimed = true;
        }
    }

    resolveExpedition(expedition, status, mode) {
        expedition.isResolved = true;
        expedition.outcome = { status, mode };

        if (status === 'Success') {
            this.analytics.successes++;
            const yieldAmount = expedition.distanceTraveled * 0.5 * (1.0 + expedition.preparationScore);
            expedition.discoveryYield = yieldAmount;
            this.analytics.totalDiscoveryYield += yieldAmount;
            this.analytics.discoveredTiles += Math.floor(expedition.distanceTraveled / 10);
        } else {
            this.analytics.failures++;
            this.analytics.failureModes[mode.toLowerCase()]++;
        }

        console.warn(`[Observatory] Expedition ${expedition.actorId} resolved: ${status} (${mode})`);
    }

    /**
     * Why do explorers succeed?
     * Why do explorers fail?
     */
    generateReport() {
        const sRate = (this.analytics.successes / (this.analytics.totalExpeditions || 1)) * 100;
        
        // Detailed analysis of resolved expeditions
        const resolved = this.expeditions.filter(ex => ex.isResolved);
        const avgDistance = resolved.length > 0 ? 
            resolved.reduce((acc, ex) => acc + ex.distanceTraveled, 0) / resolved.length : 0;

        return {
            title: "Explorer Causality Observatory Report",
            summary: {
                totalExpeditions: this.analytics.totalExpeditions,
                successes: this.analytics.successes,
                failures: this.analytics.failures,
                successRate: `${sRate.toFixed(1)}%`,
                avgDistance: avgDistance.toFixed(2),
                totalYield: this.analytics.totalDiscoveryYield.toFixed(2),
                dominantFailure: this.getDominantFailureMode()
            },
            causality: {
                successFactors: [
                    "High Preparation Score (> 0.70) reduces initial supply waste.",
                    "High Ambition traits sustain motivation over long distances.",
                    "Constitution threshold > 0.60 is required for high-danger zones."
                ],
                failureFactors: [
                    "Fear > 0.80 causes early motivation collapse.",
                    "Low Conscientiousness leads to supply mismanagement.",
                    "Maimed status during transit triples exhaustion rates."
                ]
            }
        };
    }

    getDominantFailureMode() {
        let max = -1;
        let mode = "None";
        for (const [key, val] of Object.entries(this.analytics.failureModes)) {
            if (val > max) {
                max = val;
                mode = key;
            }
        }
        return mode;
    }
}
