// File: src/systems/hazard/HazardCascade.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * HazardCascade
 * Implements the Multi-Tier Cascade State Machine for workplace and environmental hazards.
 */
export class HazardCascade {
    constructor(mortalitySystem) {
        this.mortalitySystem = mortalitySystem;
    }

    /**
     * Entry point for a hazardous activity.
     */
    processActivity(actor, environment) {
        const pCascade = this.calculateCascadeProbability(actor, environment);
        
        if (Math.random() < pCascade) {
            this.triggerStage1(actor, environment);
        }
    }

    calculateCascadeProbability(actor, environment) {
        const fatigue = actor.fatigue || 0;
        const tileDecay = environment.tileDecay || 0;
        const weather = environment.weatherSeverity || 0;
        const pBase = environment.baseHazardRisk || 0.05;

        const traits = actor.traits;
        const phi = (1.0 + 0.6 * traits.riskTolerance) * 
                    (1.0 + 0.4 * traits.ambition) * 
                    (1.0 - 0.5 * traits.conscientiousness);

        const fatigueFactor = 1.0 + Math.pow(fatigue, 1.5);
        const decayFactor = 1.0 + tileDecay;
        const weatherFactor = 1.0 + weather;

        return pBase * fatigueFactor * decayFactor * weatherFactor * phi;
    }

    triggerStage1(actor, environment) {
        if (!actor || !actor.traits) {
            console.error("[Hazard] Stage 1 triggered on invalid actor", actor);
            return;
        }

        console.warn(`[Hazard] Stage 1: Minor Mishap for ${actor.id}`);
        
        // Immediate Effect: Adds fatigue ($+0.10$)
        actor.fatigue = Math.min(1.0, (actor.fatigue || 0) + PersonhoodConstants.FATIGUE_INCREMENT_ROUTINE);
        
        // Catch/Mitigate check
        const mitigationRoll = Math.random();
        if (mitigationRoll < actor.traits.conscientiousness) {
            console.log(`[Hazard] Stage 1 mitigated by ${actor.id}'s conscientiousness.`);
            return; 
        }

        // Trait-Driven Prevention: Low Risk Tolerance / High Fear actors halt early
        const haltThreshold = (actor.traits.fear * 0.5) + (1.0 - actor.traits.riskTolerance) * 0.5;
        if (Math.random() < haltThreshold) {
            console.log(`[Hazard] ${actor.id} halted work early, breaking the cascade chain.`);
            return;
        }

        // FORCE CASCADE FOR SIMULATION if not mitigated
        console.log(`[Hazard] ${actor.id} failed to mitigate or halt. Escalating.`);
        this.triggerStage2(actor, environment);
    }

    triggerStage2(actor, environment) {
        if (!actor) return;
        console.error(`[Hazard] Stage 2: Critical Compromise for ${actor.id}`);
        
        // Immediate Effect: Causes non-lethal trauma (maimed limb, severe burns, concussions)
        actor.isMaimed = true;
        // Maimed actors suffer a permanent -0.20 penalty to mobility and manual efficiency.
        actor.mobilityMod = (actor.mobilityMod || 1.0) - 0.20;
        actor.efficiencyMod = (actor.efficiencyMod || 1.0) - 0.20;

        // Emergency Save
        const emergencySaveRoll = Math.random();
        // Save threshold improved by constitution and slightly by risk tolerance (clutch factor)
        const saveThreshold = 0.3 + (actor.traits.constitution * 0.4) + (actor.traits.riskTolerance * 0.1);
        
        if (emergencySaveRoll < saveThreshold) {
            console.log(`[Hazard] Stage 2 emergency save successful for ${actor.id}. Non-lethal resolve.`);
            return;
        }

        this.triggerStage3(actor, environment);
    }

    triggerStage3(actor, environment) {
        console.error(`[Hazard] Stage 3: Fatal Catastrophe for ${actor.id}`);
        
        if (this.mortalitySystem) {
            const severity = environment.catastropheSeverity || 0.8;
            this.mortalitySystem.resolveLethalTrauma(actor, severity);
        }
    }
}
