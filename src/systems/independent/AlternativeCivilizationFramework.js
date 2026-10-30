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
        // High rejection if active historical pillars are ignored
        const history = this.settlement.history;
        if (!history || !history.pillars || history.pillars.length === 0) {
            this.divergenceFactors.pillarRejection = 0.2; // Baseline - no pillars to reject
            return;
        }

        // In a rogue settlement, people ignore the 'lessons' of history
        // Logic: If cynicism is high, pillar rejection is high
        const avgCynicism = this.settlement.getAverageTrait ? this.settlement.getAverageTrait('cynicism') : 0.5;
        this.divergenceFactors.pillarRejection = Math.max(0.1, avgCynicism);
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
        const isIndependent = cdi > 0.6;
        const isMainstream = cdi < 0.4;
        
        let thrivingStatus = "Unstable";
        if (isIndependent) thrivingStatus = pop > 20 ? "Independent Success" : "Struggling Rogue";
        else if (isMainstream) thrivingStatus = pop > 30 ? "Thriving Mainstream" : "Declining Mainstream";

        return {
            title: "Alternative Civilization Framework Report",
            metrics: {
                civilizationDivergenceIndex: cdi.toFixed(3),
                isParticipatingInMainstream: isMainstream,
                thrivingStatus: thrivingStatus
            },
            divergenceProfile: {
                pillarRejection: this.divergenceFactors.pillarRejection.toFixed(2),
                alternativeFaith: this.divergenceFactors.alternativeFaith.toFixed(2),
                alternativeEconomy: this.divergenceFactors.alternativeEconomy.toFixed(2),
                alternativePower: this.divergenceFactors.alternativePower.toFixed(2)
            },
            conclusion: isIndependent ? 
                (pop > 20 ? "A successful Rogue Civilization detected. It maintains stability while rejecting mainstream anchors." : "A precarious rogue group fighting systemic attrition.") :
                "Standard Civilizational Unit: Operates within global economic and historical norms."
        };
    }
}
