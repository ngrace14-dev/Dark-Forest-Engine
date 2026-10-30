// File: src/systems/history/HistoricalEchoFramework.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

/**
 * Historical Echo Framework
 * 
 * Records "World Pillars" (significant events) and calculates their 
 * ongoing influence on NPC decision-making and cultural drift.
 */
export class HistoricalEchoFramework {
    constructor(settlement) {
        this.settlement = settlement;
        this.pillars = []; // Array of Pillar events
        this.globalMemoryDecay = 0.005; // Base decay per year
    }

    /**
     * Record a significant event as a World Pillar.
     */
    recordPillar(type, description, impactScore, location) {
        const pillar = {
            id: `Pillar_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            type, // Famine, War, Coup, Discovery, Betrayal, Split
            description,
            baseImpact: impactScore, // [0.0 - 1.0]
            currentStrength: impactScore,
            yearFound: this.settlement.currentYear || 0,
            location,
            tags: this.deriveTags(type)
        };

        this.pillars.push(pillar);
        console.warn(`[History] NEW PILLAR RECORDED: ${type} - ${description}`);
    }

    deriveTags(type) {
        switch(type) {
            case 'Famine': return ['Trauma', 'ResourceFear'];
            case 'War': return ['Aggression', 'Xenophobia'];
            case 'Betrayal': return ['Cynicism', 'LowTrust'];
            default: return ['Mystery'];
        }
    }

    /**
     * Update all pillars, decaying their strength over time.
     */
    processYearlyDecay() {
        for (let i = this.pillars.length - 1; i >= 0; i--) {
            const pillar = this.pillars[i];
            
            // Memory Decay: Influenced by current settlement Cynicism
            // High cynicism forgets the lessons of the past faster.
            const cynicismPenalty = this.settlement.getAverageTrait('cynicism') * 0.01;
            pillar.currentStrength -= (this.globalMemoryDecay + cynicismPenalty);

            if (pillar.currentStrength <= 0) {
                console.log(`[History] Pillar ${pillar.id} has faded into total obscurity.`);
                this.pillars.splice(i, 1);
            }
        }
    }

    /**
     * Measure: Historical Echo Strength
     * How much does the past influence a specific decision?
     */
    calculateEchoInfluence(decisionType, currentTraits) {
        let totalInfluence = 0;

        for (const pillar of this.pillars) {
            const relevance = this.calculateRelevance(pillar, decisionType);
            // Influence = Strength * Relevance * (1.0 + CurrentTraitAlignment)
            // If the pillar is "Trauma" and the actor is "Fearful", the influence is higher.
            const alignment = this.calculateAlignment(pillar, currentTraits);
            totalInfluence += (pillar.currentStrength * relevance * alignment);
        }

        return totalInfluence;
    }

    calculateAlignment(pillar, traits) {
        if (!traits) return 1.0;
        
        let alignment = 1.0;
        if (pillar.tags.includes('Trauma')) alignment += (traits.fear || 0) * 0.5;
        if (pillar.tags.includes('Aggression')) alignment += (traits.aggression || 0) * 0.5;
        if (pillar.tags.includes('LowTrust')) alignment += (traits.cynicism || 0) * 0.5;
        
        return alignment;
    }

    calculateRelevance(pillar, decisionType) {
        // Mapping Pillars to Decision Types
        if (pillar.type === 'Famine' && decisionType === 'ResourceAllocation') return 1.0;
        if (pillar.type === 'War' && decisionType === 'Diplomacy') return 1.0;
        if (pillar.type === 'Betrayal' && decisionType === 'CouncilVote') return 0.8;
        return 0.2; // Base background relevance
    }

    /**
     * Determine: How often does a 500-year-old event alter a modern decision?
     */
    getGenerationalReport() {
        const oldPillars = this.pillars.filter(p => (this.settlement.currentYear - p.yearFound) > 500);
        const activeEchoes = oldPillars.filter(p => p.currentStrength > 0.2);

        return {
            title: "Historical Echo Directorate Report",
            metrics: {
                totalPillars: this.pillars.length,
                ancientEchoes: activeEchoes.length,
                dominantLegacy: this.getDominantLegacyType()
            },
            conclusion: activeEchoes.length > 0 ?
                "Ancient events continue to anchor modern policy." :
                "The settlement has suffered 'Historical Amnesia'; only recent events carry weight."
        };
    }

    getDominantLegacyType() {
        if (this.pillars.length === 0) return "None";
        const counts = {};
        this.pillars.forEach(p => counts[p.type] = (counts[p.type] || 0) + p.currentStrength);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
}
