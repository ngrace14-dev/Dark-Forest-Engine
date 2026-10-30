// File: src/systems/independent/AlternativeCivilizationFramework.js
/**
 * Alternative Civilization Framework
 * 
 * Identifies and tracks settlements that "opt out" of mainstream 
 * civilizational pillars (Trade, Significance, Judicial Logic).
 */
export class AlternativeCivilizationFramework {
    constructor(settlement) {
        this.settlement = settlement;
        this.divergenceFactors = {
            pillarRejection: 0.0,
            alternativeFaith: 0.0,
            alternativeEconomy: 0.0,
            alternativePower: 0.0
        };
    }

    /**
     * Calculate: Civilization Divergence Index (CDI) [0.0 - 1.0].
     */
    calculateCDI() {
        this.evaluatePillarRejection();
        this.evaluateAlternativeFaith();
        this.evaluateAlternativeEconomy();
        this.evaluateAlternativePower();

        const cdi = (this.divergenceFactors.pillarRejection * 0.4) + 
                    (this.divergenceFactors.alternativeFaith * 0.2) + 
                    (this.divergenceFactors.alternativeEconomy * 0.2) + 
                    (this.divergenceFactors.alternativePower * 0.2);

        return Math.max(0, Math.min(1.0, cdi));
    }

    evaluatePillarRejection() {
        // High rejection if active historical pillars are ignored or intentionally desecrated
        const history = this.settlement.history;
        if (!history || history.pillars.length === 0) {
            this.divergenceFactors.pillarRejection = 0.5; // Neutral - no pillars to reject
            return;
        }

        // Logic: Rejection scales with lack of historical echo influence on decisions
        this.divergenceFactors.pillarRejection = 0.8; // Mock high rejection for independent groups
    }

    evaluateAlternativeFaith() {
        // High if the dominant belief system is categorized as 'Heresy' or 'Independent'
        const culture = this.settlement.culture;
        if (!culture || culture.beliefSystems.length === 0) return;

        const hasHeresy = culture.beliefSystems.some(s => s.type === 'Heresy');
        this.divergenceFactors.alternativeFaith = hasHeresy ? 0.9 : 0.1;
    }

    evaluateAlternativeEconomy() {
        // High if Trade Volume is low but Population is stable (Self-sufficiency/Shadow Economy)
        const trade = this.settlement.tradeVolume || 0;
        const pop = this.settlement.getActors().length || 1;
        
        if (trade < (pop * 0.5)) {
            this.divergenceFactors.alternativeEconomy = 0.8; // Rogue/Barter/Siphon economy
        } else {
            this.divergenceFactors.alternativeEconomy = 0.1;
        }
    }

    evaluateAlternativePower() {
        // High if Legitimacy is low but Council is active (Coup/Outlaw/Anarchic)
        const lq = this.settlement.politics ? this.settlement.politics.calculateLegitimacy() : 0.5;
        this.divergenceFactors.alternativePower = lq < 0.3 ? 0.8 : 0.1;
    }

    /**
     * Determine: Can a village thrive without participating in mainstream civilization?
     */
    generateDivergenceReport() {
        const cdi = this.calculateCDI();
        const pop = this.settlement.getActors().length;
        const isThriving = pop > 20 && cdi > 0.6;

        return {
            title: "Alternative Civilization Framework Report",
            metrics: {
                civilizationDivergenceIndex: cdi.toFixed(3),
                isParticipatingInMainstream: cdi < 0.4,
                thrivingStatus: isThriving ? "Independent Success" : "Struggling Outlier"
            },
            divergenceProfile: {
                pillarRejection: this.divergenceFactors.pillarRejection.toFixed(2),
                alternativeFaith: this.divergenceFactors.alternativeFaith.toFixed(2),
                alternativeEconomy: this.divergenceFactors.alternativeEconomy.toFixed(2),
                alternativePower: this.divergenceFactors.alternativePower.toFixed(2)
            },
            conclusion: isThriving ? 
                "A successful Rogue Civilization detected. It maintains a stable population while rejecting external economic and historical anchors." :
                "An unstable outlier. Divergence from mainstream pillars is leading to biological or economic attrition."
        };
    }
}
