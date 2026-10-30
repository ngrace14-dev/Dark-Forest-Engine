// File: src/systems/SocialDynamicsSystem.js
import { PersonhoodConstants } from '../constants/PersonhoodConstants.js';

/**
 * SocialDynamicsSystem
 * Manages settlement-level state, average traits, and resource allocation
 * for survivors and indigent populations.
 */
export class SocialDynamicsSystem {
    constructor(actors) {
        this.actors = actors || [];
        this.foodSupply = 1000;
        this.hasWaterCisterns = false;
        this.failedMitigation = false;
        
        // Justice & Penal State
        this.diversityPurgeTracker = 0.0;
        this.stocksCapacity = 4;
    }

    update(delta) {
        const alive = this.getActors();
        
        for (const actor of alive) {
            // Process Subversive Pipeline
            if (actor.status === 'Indigent') {
                this.underground?.processIndigentTick(actor);
            }

            // Process Sentences
            if (actor.penalRecord?.currentSentence) {
                this.jurisprudence?.processSentenceTick(actor);
            }

            // Penal Labor Fatigue
            if (actor.socialRole === 'PenalLaborer') {
                actor.fatigue = Math.max(PersonhoodConstants.PENAL_LABOR_FATIGUE_FLOOR, actor.fatigue || 0);
            }
        }

        // TDI Critical Check
        const tdi = this.calculateTraitDiversityIndex();
        if (tdi < PersonhoodConstants.TDI_CRITICAL_THRESHOLD) {
            this.triggerWalkerSummons();
        }
    }

    calculateTraitDiversityIndex() {
        const alive = this.getActors();
        if (alive.length < 2) return 1.0;
        
        // Simplified TDI: average standard deviation of core traits
        const traits = ['riskTolerance', 'ambition', 'conscientiousness', 'cynicism', 'aggression'];
        let totalStdDev = 0;

        for (const trait of traits) {
            const mu = this.getAverageTrait(trait);
            const variance = alive.reduce((acc, a) => {
                const val = (a.traits && a.traits[trait] !== undefined) ? a.traits[trait] : 0.5;
                return acc + Math.pow(val - mu, 2);
            }, 0) / alive.length;
            totalStdDev += Math.sqrt(variance);
        }

        const rawTdi = (totalStdDev / traits.length);
        // Apply purges
        return Math.max(0, rawTdi - (this.diversityPurgeTracker || 0));
    }

    triggerWalkerSummons() {
        console.error("!!! TRAIT DIVERSITY CRITICAL !!! The Shackled Walker approaches.");
        // Event bus emit...
    }

    getActors() {
        return this.actors.filter(a => !a.isDead);
    }

    getAverageTrait(traitName) {
        const alive = this.getActors();
        if (alive.length === 0) return 0.5;
        const sum = alive.reduce((acc, a) => acc + (a.traits[traitName] || 0.5), 0);
        return sum / alive.length;
    }

    processFamineCycle() {
        if (this.foodSupply < 30 * this.getActors().length) {
            console.warn("[SocialDynamics] Food supply low! Performing Altruism Check.");
            
            const avgCynicism = this.getAverageTrait('cynicism');
            const altruismCheck = Math.random();

            if (altruismCheck < avgCynicism) {
                console.error("[SocialDynamics] Altruism Check FAILED. Revoking stipends.");
                this.revokeNonProductiveStipends();
            }
        }
    }

    revokeNonProductiveStipends() {
        const alive = this.getActors();
        // Sort by prestige descending
        const sorted = [...alive].sort((a, b) => (b.prestige || 0) - (a.prestige || 0));
        
        const top5PercentCount = Math.max(1, Math.floor(sorted.length * 0.05));
        
        for (let i = top5PercentCount; i < sorted.length; i++) {
            const actor = sorted[i];
            if (actor.socialRole === 'ReveredCustodian') {
                console.log(`[SocialDynamics] ${actor.id} demoted from Custodian to Indigent due to famine.`);
                actor.socialRole = 'DestituteDependent';
                actor.status = 'Indigent';
                actor.income = 0;
            }
        }
    }

    getNearbyActors(centerActor, radius) {
        // Implementation would use spatial grid, but for now:
        return this.getActors().filter(a => a !== centerActor); // Mock
    }
}
