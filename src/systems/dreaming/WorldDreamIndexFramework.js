// File: src/systems/dreaming/WorldDreamIndexFramework.js
/**
 * World Dream Index Framework
 * 
 * Measures the novelty and "dreaming" potential of the world. 
 * Determines if the simulation is repeating historical loops or branching into novel futures.
 */
export class WorldDreamIndexFramework {
    constructor(world) {
        this.world = world;
        this.historicalStates = []; // Snapshot registry
        this.noveltyThreshold = 0.8;
    }

    /**
     * Calculate: World Dream Index (DI) [0.0 - 1.0].
     */
    calculateDreamIndex(settlements) {
        let totalNovelty = 0;

        for (const settlement of settlements) {
            totalNovelty += this.calculateSettlementNovelty(settlement);
        }

        const di = totalNovelty / (settlements.length || 1);
        return Math.max(0, Math.min(1.0, di));
    }

    calculateSettlementNovelty(settlement) {
        if (!settlement) return 0;
        
        const identity = settlement.identity;
        const independent = settlement.independent;
        const mobility = settlement.mobility;

        // 1. Belief Divergence
        let beliefNovelty = 0;
        if (identity && identity.calculateIdentityMetrics) {
            const metrics = identity.calculateIdentityMetrics();
            beliefNovelty = typeof metrics.beliefDivergence === 'number' ? metrics.beliefDivergence : 0;
        }
        
        // 2. Political Divergence
        let politicalNovelty = 0;
        if (independent && independent.calculateCDI) {
            const cdi = independent.calculateCDI();
            politicalNovelty = typeof cdi === 'number' ? cdi : 0;
        }
        
        // 3. Social Structure (Significance mobility)
        let socialNovelty = 0;
        if (mobility && mobility.calculateMobilityMetrics) {
            const mMetrics = mobility.calculateMobilityMetrics();
            const mIndex = typeof mMetrics.mobilityIndex === 'number' ? mMetrics.mobilityIndex : 0;
            socialNovelty = Math.min(1.0, mIndex / 2.0); 
        }

        return (beliefNovelty * 0.4) + (politicalNovelty * 0.3) + (socialNovelty * 0.3);
    }

    /**
     * Determine: Is the simulation repeating itself?
     */
    generateDreamReport(settlements) {
        const di = this.calculateDreamIndex(settlements);
        const isRepeating = di < 0.3;
        const isDreaming = di > 0.7;

        return {
            title: "World Dream Index Framework Report",
            metrics: {
                dreamIndex: di.toFixed(3),
                noveltyRate: this.calculateNoveltyRate(di),
                futureDivergence: this.getFutureDivergenceDescription(di)
            },
            status: isDreaming ? "GENERATING NOVEL FUTURES" : (isRepeating ? "HISTORICAL RECURSION LOOP" : "STABLE ITERATION"),
            analysis: {
                isRepeatingHistoricalLoops: isRepeating,
                isGeneratingUnplannedFutures: isDreaming,
                creativeEmergenceLevel: this.getCreativeEmergenceLevel(di)
            },
            conclusion: isDreaming ? 
                "The world is dreaming. It is generating cultural and political structures beyond the initial creator parameters." :
                "The world is a echo chamber. It is repeating known historical patterns without significant branching."
        };
    }

    calculateNoveltyRate(di) {
        // High DI = high rate of new information creation
        return `${(di * 100).toFixed(1)}%`;
    }

    getFutureDivergenceDescription(di) {
        if (di > 0.8) return "Hyper-Divergent (Chaos/Innovation)";
        if (di > 0.5) return "Branching (Healthy Complexity)";
        if (di > 0.2) return "Convergent (Normalization)";
        return "Stagnant (Redundancy)";
    }

    getCreativeEmergenceLevel(di) {
        if (di > 0.9) return "Legendary";
        if (di > 0.6) return "High";
        if (di > 0.3) return "Moderate";
        return "Minimal";
    }
}
