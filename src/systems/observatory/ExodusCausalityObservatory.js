// File: src/systems/observatory/ExodusCausalityObservatory.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

/**
 * Exodus Causality Observatory
 * 
 * Determines the causal factors behind why actors abandon settlements 
 * to become "The Lost" in the dunes.
 */
export class ExodusCausalityObservatory {
    constructor(settlement, politics, information) {
        this.settlement = settlement;
        this.politics = politics; // LegitimacyPressureFramework
        this.information = information; // InformationConsolidationFramework
        this.exodusHistory = [];
    }

    /**
     * Measure: Exodus Probability for a specific actor.
     */
    calculateActorExodusProbability(actor) {
        const traits = actor.traits;
        
        // 1. Economic Pressure (Starvation/Poverty)
        const economicPressure = actor.status === 'Indigent' ? 0.4 : 0.1;
        
        // 2. Political Pressure (Legitimacy collapse + Personal Cynicism)
        const lq = this.politics ? this.politics.calculateLegitimacy() : 1.0;
        const politicalPressure = (1.0 - lq) * (traits.cynicism || 0.5);

        // 3. Information/Dream Influence (Rumors of better lands)
        const snr = this.information ? this.information.globalMetrics.signalToNoise : 1.0;
        const dreamInfluence = (1.0 - snr) * (traits.superstition || 0.5);

        // 4. Trait Push (Ambition vs Fear)
        const traitDrive = (traits.ambition || 0.5) - (traits.fear || 0.5);

        // Final Probability
        const p = (economicPressure * 0.3) + 
                  (politicalPressure * 0.3) + 
                  (dreamInfluence * 0.2) + 
                  (traitDrive * 0.2);

        return Math.max(0, Math.min(1.0, p));
    }

    /**
     * Categorize the reason for departure.
     */
    determineExodusType(actor) {
        const lq = this.politics ? this.politics.calculateLegitimacy() : 1.0;
        const snr = this.information ? this.information.globalMetrics.signalToNoise : 1.0;

        if (actor.status === 'Exiled') return 'Forced Migration';
        if (lq < 0.4) return 'Political Flight';
        if (snr < 0.3) return 'Dream/Rumor Influence';
        return 'Opportunity Migration';
    }

    /**
     * Record a departure event.
     */
    trackDeparture(actor) {
        const type = this.determineExodusType(actor);
        const event = {
            actorId: actor.id,
            type: type,
            timestamp: Date.now(),
            traits: { ...actor.traits },
            villageLegitimacy: this.politics ? this.politics.calculateLegitimacy() : 1.0,
            foodAtDeparture: this.settlement.foodSupply
        };

        this.exodusHistory.push(event);
        console.warn(`[Exodus] ${actor.id} has become LOST. Type: ${type}`);
    }

    /**
     * Determine: What causes people to become Lost?
     */
    generateExodusReport() {
        const total = this.exodusHistory.length || 1;
        const types = {
            forced: this.exodusHistory.filter(e => e.type === 'Forced Migration').length,
            political: this.exodusHistory.filter(e => e.type === 'Political Flight').length,
            dream: this.exodusHistory.filter(e => e.type === 'Dream/Rumor Influence').length,
            opportunity: this.exodusHistory.filter(e => e.type === 'Opportunity Migration').length
        };

        return {
            title: "Exodus Causality Observatory Report",
            metrics: {
                totalExodusEvents: this.exodusHistory.length,
                primaryDriver: this.getPrimaryDriver(types),
                forcedRatio: (types.forced / total).toFixed(2),
                voluntaryRatio: ((types.political + types.dream + types.opportunity) / total).toFixed(2)
            },
            causalityAnalysis: {
                politicalInstability: types.political > (total * 0.4) ? "HIGH: Governance collapse is the main filter." : "LOW",
                economicDesperation: types.forced > (total * 0.4) ? "HIGH: Resource scarcity is driving exiles." : "LOW",
                rumorEntropy: types.dream > (total * 0.4) ? "HIGH: Informational noise is luring actors to their death." : "LOW"
            },
            conclusion: this.getConclusion(types, total)
        };
    }

    getPrimaryDriver(types) {
        return Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);
    }

    getConclusion(types, total) {
        if (total === 0) return "No exodus events detected. The population is anchored.";
        if (types.forced > total * 0.5) return "The Lost are products of State Violence and Scarcity.";
        if (types.political > total * 0.5) return "The Lost are political refugees from a failed mandate.";
        return "The Lost are driven by a combination of ambition and informational noise.";
    }
}
