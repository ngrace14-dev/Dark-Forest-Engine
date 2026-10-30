// File: src/systems/emergence/EmergenceBalanceAudit.js
/**
 * Emergence Balance Audit
 * 
 * Analyzes the conflict between "Stabilizers" (Shackled Walker, Judicial System) 
 * and "Emergent Complexity" (Heresies, Rogue Settlements, Social Mobility).
 */
export class EmergenceBalanceAudit {
    constructor(world) {
        this.world = world;
    }

    /**
     * Measure: Complexity Suppression vs. Creation.
     */
    runAudit(settlement) {
        const suppression = this.calculateSuppression(settlement);
        const creation = this.calculateCreation(settlement);
        
        // Tipping Point: Ratio of Creation to Suppression
        const tippingPointProb = creation / (suppression || 1);
        const isFrozen = suppression > (creation * 2.0);

        return {
            title: "Emergence Balance Audit",
            metrics: {
                complexitySuppression: suppression.toFixed(2),
                complexityCreation: creation.toFixed(2),
                tippingPointProbability: tippingPointProb.toFixed(3)
            },
            status: isFrozen ? 'FROZEN / STAGNANT' : 'DYNAMIC / EMERGENT',
            determinations: {
                isWalkerFreezingWorld: settlement.walkerActiveTicks > 50,
                isJusticeScrubbingComplexity: settlement.justiceSystem?.diversityPurgeTracker > 0.5,
                isEpochShiftResettingGrowth: settlement.epochAge < 2
            },
            conclusion: this.getConclusion(isFrozen, suppression)
        };
    }

    calculateSuppression(settlement) {
        // Stabilizers: Judicial purges, Walker activity, Low social mobility
        const judicialScrub = (settlement.justiceSystem && typeof settlement.justiceSystem.diversityPurgeTracker === 'number') 
            ? settlement.justiceSystem.diversityPurgeTracker 
            : 0;
        
        const walkerAura = settlement.walkerPresence ? 0.5 : 0;
        
        const tdi = settlement.calculateTraitDiversityIndex ? settlement.calculateTraitDiversityIndex() : 0.5;
        const tdiPenalty = (1.0 - (typeof tdi === 'number' ? tdi : 0.5)) * 0.5;
        
        return judicialScrub + walkerAura + tdiPenalty;
    }

    calculateCreation(settlement) {
        // Complexity: Belief mutations, Social mobility, Independent divergence
        const beliefMutation = (settlement.culture && settlement.culture.beliefSystems) 
            ? settlement.culture.beliefSystems.reduce((acc, s) => acc + (s.mutationIndex || 0), 0) 
            : 0;
            
        const mobilityData = (settlement.mobility && settlement.mobility.calculateMobilityMetrics) 
            ? settlement.mobility.calculateMobilityMetrics() 
            : null;
        const socialMobility = (mobilityData && typeof mobilityData.mobilityIndex === 'number') ? mobilityData.mobilityIndex : 0;
        
        const rogueCDI = (settlement.independent && settlement.independent.calculateCDI) 
            ? settlement.independent.calculateCDI() 
            : 0;

        return (beliefMutation * 0.5) + (socialMobility * 0.3) + (rogueCDI * 0.2);
    }

    getConclusion(isFrozen, suppression) {
        if (isFrozen) return "CRITICAL: Stabilizers have reached a resonance loop. The world is unable to generate new complexity.";
        if (suppression < 0.2) return "WARNING: Insufficient Stabilization. The world risks entropic collapse / noise dominance.";
        return "BALANCED: Stabilization systems are pruning irrelevant noise while allowing high-value complexity to emerge.";
    }
}
