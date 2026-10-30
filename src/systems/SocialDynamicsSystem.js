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
