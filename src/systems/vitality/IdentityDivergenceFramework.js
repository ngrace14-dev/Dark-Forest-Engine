// File: src/systems/vitality/IdentityDivergenceFramework.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

/**
 * Identity Divergence Framework
 * 
 * Measures the unique "fingerprint" of a settlement based on its 
 * cultural, historical, and psychological makeup.
 */
export class IdentityDivergenceFramework {
    constructor(settlement) {
        this.settlement = settlement;
    }

    /**
     * Calculate the uniqueness of the settlement compared to a baseline.
     */
    calculateIdentityMetrics() {
        const tdi = this.settlement.calculateTraitDiversityIndex ? this.settlement.calculateTraitDiversityIndex() : 0.5;
        const culture = this.settlement.culture;
        const history = this.settlement.history;

        const beliefDivergence = this.calculateBeliefDivergence(culture);
        const historicalWeight = this.calculateHistoricalWeight(history);
        const traitIntensity = this.calculateTraitIntensity();

        // Village Identity Score: How "strong" is the local culture?
        const identityScore = (beliefDivergence * 0.4) + (historicalWeight * 0.3) + ((1.0 - tdi) * 0.3);

        return {
            identityScore,
            tdi,
            beliefDivergence,
            historicalWeight,
            traitIntensity
        };
    }

    calculateBeliefDivergence(culture) {
        if (!culture || !culture.beliefSystems) return 0.0;
        // More unique/mutated belief systems = higher divergence
        const systems = culture.beliefSystems;
        if (systems.length === 0) return 0.0;

        const mutationSum = systems.reduce((acc, s) => acc + (s.mutationIndex || 0), 0);
        const adoptionRatio = systems.reduce((acc, s) => acc + (s.expansionRate || 0), 0);

        return Math.min(1.0, (mutationSum * 0.5) + (adoptionRatio * 0.5));
    }

    calculateHistoricalWeight(history) {
        if (!history || !history.pillars) return 0.0;
        // Total strength of active historical echoes
        const totalStrength = history.pillars.reduce((acc, p) => acc + p.currentStrength, 0);
        return Math.min(1.0, totalStrength / 5.0); // Normalized to 5 pillars
    }

    calculateTraitIntensity() {
        if (!this.settlement.getAverageTrait) return 0.0;
        
        // Measure how much the average traits deviate from a theoretical neutral 0.5
        const traits = ['riskTolerance', 'ambition', 'conscientiousness', 'cynicism', 'aggression', 'superstition', 'altruism'];
        let totalDeviation = 0;

        for (const trait of traits) {
            const mu = this.settlement.getAverageTrait(trait);
            totalDeviation += Math.abs((typeof mu === 'number' ? mu : 0.5) - 0.5);
        }

        return totalDeviation / traits.length;
    }

    /**
     * Determine: How unique is each settlement?
     */
    generateIdentityReport() {
        const metrics = this.calculateIdentityMetrics();
        
        return {
            title: "Identity Divergence Framework Report",
            metrics: {
                villageIdentityScore: metrics.identityScore.toFixed(3),
                traitDiversityIndex: metrics.tdi.toFixed(3),
                beliefDivergence: metrics.beliefDivergence.toFixed(2),
                historicalGravity: metrics.historicalWeight.toFixed(2)
            },
            uniquenessRating: this.getUniquenessRating(metrics.identityScore),
            differentiationFactors: this.getDifferentiationFactors(metrics),
            conclusion: metrics.identityScore > 0.7 ? 
                "The settlement has developed a distinct, divergent cultural identity." :
                "The settlement remains a culturally generic hub with low differentiation."
        };
    }

    getUniquenessRating(score) {
        if (score > 0.8) return "Unique Cultural Outlier";
        if (score > 0.5) return "Distinct Local Identity";
        if (score > 0.2) return "Emerging Tradition";
        return "Generic Settlement";
    }

    getDifferentiationFactors(metrics) {
        const factors = [];
        if (metrics.beliefDivergence > 0.6) factors.push("Religious Schism/Innovation");
        if (metrics.historicalWeight > 0.6) factors.push("Deep Historical Trauma/Legacy");
        if (metrics.tdi < 0.2) factors.push("Psychological Homogenization");
        return factors;
    }
}
