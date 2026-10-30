// File: src/systems/significance/SignificanceMobilityFramework.js
/**
 * Significance Mobility Framework
 * 
 * Measures the "circulation" of prestige and cultural capital. 
 * Detects if the society is stagnating under "Hero Monopolies."
 */
export class SignificanceMobilityFramework {
    constructor(settlement) {
        this.settlement = settlement;
    }

    /**
     * Measure: Social Mobility & Significance Mobility
     */
    calculateMobilityMetrics() {
        const actors = this.settlement.getActors();
        if (actors.length === 0) return this.getEmptyMetrics();

        const elders = actors.filter(a => (a.age || 0) >= 250);
        const youth = actors.filter(a => (a.age || 0) < 65);

        const elderPrestigeSum = elders.reduce((acc, a) => acc + (a.prestige || 0), 0);
        const youthPrestigeSum = youth.reduce((acc, a) => acc + (a.prestige || 0), 0);
        const totalPrestige = actors.reduce((acc, a) => acc + (a.prestige || 0), 0) || 0.01;

        const elderOwnership = elderPrestigeSum / totalPrestige;
        const youthAccess = youthPrestigeSum / totalPrestige;

        // Mobility Index: Youth access relative to elder ownership
        // Increased sensitivity: Higher elder ownership should more aggressively depress mobility
        const mobilityIndex = youthAccess / (Math.max(0.01, elderOwnership));

        return {
            elderOwnership,
            youthAccess,
            mobilityIndex,
            isStagnant: elderOwnership > 0.6 && mobilityIndex < 0.3
        };
    }

    getEmptyMetrics() {
        return { elderOwnership: 0, youthAccess: 0, mobilityIndex: 0, isStagnant: false };
    }

    /**
     * Detect: Geriatric Stagnation & Hero Monopolies
     */
    generateMobilityReport() {
        const metrics = this.calculateMobilityMetrics();
        const topHero = this.getTopHero();

        return {
            title: "Significance Mobility Framework Report",
            metrics: {
                mobilityIndex: metrics.mobilityIndex.toFixed(3),
                elderSignificanceOwnership: `${(metrics.elderOwnership * 100).toFixed(1)}%`,
                youthOpportunityAccess: `${(metrics.youthAccess * 100).toFixed(1)}%`
            },
            detections: {
                geriatricStagnation: metrics.isStagnant,
                heroMonopoly: topHero.prestige > 0.8 && metrics.mobilityIndex < 0.2,
                topHeroId: topHero.id
            },
            conclusion: metrics.isStagnant ? 
                "Geriatric Stagnation detected: Elders hold a monopoly on cultural capital." :
                "Healthy Social Mobility: Significance is circulating among the younger cohorts."
        };
    }

    getTopHero() {
        const actors = this.settlement.getActors();
        if (actors.length === 0) return { id: 'None', prestige: 0 };
        return actors.reduce((max, a) => (a.prestige || 0) > (max.prestige || 0) ? a : max, { prestige: -1 });
    }
}
