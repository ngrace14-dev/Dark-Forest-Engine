// File: src/systems/politics/LegitimacyPressureFramework.js
/**
 * Legitimacy Pressure Framework
 * 
 * Measures the "right to rule" for settlement councils. 
 * Detects the tipping points for coups, collapses, and governance fatigue.
 */
export class LegitimacyPressureFramework {
    constructor(settlement) {
        this.settlement = settlement;
        this.historicalLegitimacy = 1.0;
        this.governanceFatigue = 0.0;
    }

    /**
     * Calculate the current Legitimacy Quotient [0.0 - 1.0].
     */
    calculateLegitimacy() {
        const publicTrust = this.calculatePublicTrust();
        const economicPerformance = this.calculateEconomicPerformance();
        const councilCynicism = this.settlement.getAverageTrait ? this.settlement.getAverageTrait('cynicism') : 0.5;

        // Legitimacy Quotient (LQ)
        // (Trust * 0.4) + (Performance * 0.3) + (Historical * 0.2) - (Cynicism * 0.3) - (Fatigue * 0.2)
        const lq = (publicTrust * 0.4) + 
                   (economicPerformance * 0.3) + 
                   (this.historicalLegitimacy * 0.2) - 
                   (councilCynicism * 0.3) - 
                   (this.governanceFatigue * 0.2);

        return Math.max(0, Math.min(1.0, lq));
    }

    calculatePublicTrust() {
        // High Loyalty + Low Fear = High Trust
        const avgLoyalty = this.settlement.getAverageTrait ? this.settlement.getAverageTrait('loyalty') : 0.5;
        const avgFear = this.settlement.getAverageTrait ? this.settlement.getAverageTrait('fear') : 0.5;
        return (avgLoyalty * 0.7) + ( (1.0 - avgFear) * 0.3);
    }

    calculateEconomicPerformance() {
        // Ratio of current food to required food
        const totalRequired = this.settlement.getActors().length * 30;
        return Math.min(1.0, this.settlement.foodSupply / (totalRequired || 1));
    }

    /**
     * Update governance fatigue over time.
     * Fatigue increases during famines, wars, or high-cynicism periods.
     */
    updateGovernance(delta) {
        if (this.settlement.foodSupply < 30 * this.settlement.getActors().length) {
            this.governanceFatigue += 0.01; // Increase fatigue during famine
        } else {
            this.governanceFatigue = Math.max(0, this.governanceFatigue - 0.005);
        }

        // Council purges (Judicial) decrease historical legitimacy
        if (this.settlement.justiceSystem && this.settlement.justiceSystem.diversityPurgeTracker > 0.1) {
            this.historicalLegitimacy -= 0.01;
        }
    }

    /**
     * Determine: Why governments fall.
     */
    generateLegitimacyReport() {
        const lq = this.calculateLegitimacy();
        
        return {
            title: "Legitimacy Pressure Framework Report",
            metrics: {
                legitimacyQuotient: lq.toFixed(3),
                publicTrust: this.calculatePublicTrust().toFixed(2),
                governanceFatigue: this.governanceFatigue.toFixed(2),
                historicalLegitimacy: this.historicalLegitimacy.toFixed(2)
            },
            tippingPoint: {
                isCoupRisk: lq < 0.4,
                isCivilWarRisk: lq < 0.2,
                primaryThreat: this.getPrimaryThreat(lq)
            },
            conclusion: lq > 0.6 ? 
                "Governance is stable; mandates are secure." :
                "Institutional Collapse Imminent: Mandate has evaporated."
        };
    }

    getPrimaryThreat(lq) {
        if (this.governanceFatigue > 0.5) return "Governance Fatigue (Bureaucratic Exhaustion)";
        if (this.calculatePublicTrust() < 0.3) return "Loss of Public Trust (Social Friction)";
        if (this.calculateEconomicPerformance() < 0.3) return "Economic Collapse (Famine)";
        return "Internal Council Cynicism (Betrayal)";
    }
}
