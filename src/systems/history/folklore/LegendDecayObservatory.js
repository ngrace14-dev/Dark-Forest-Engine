// File: src/systems/history/folklore/LegendDecayObservatory.js
/**
 * Legend Decay Observatory
 * 
 * Tracks the transformation of Truth into Myth over 10+ generations.
 * Measures Distortion Rate and Cultural Reinterpretation.
 */
export class LegendDecayObservatory {
    constructor(historySystem) {
        this.historySystem = historySystem;
        this.folklore = new Map(); // PillarId -> FolkloreData
    }

    /**
     * Map a Historical Pillar into the Folklore pipeline.
     */
    trackFolklore(pillar) {
        const data = {
            pillarId: pillar.id,
            originalTruth: pillar.description,
            currentState: 'History', // Truth -> History -> Tradition -> Legend -> Myth
            generationsPassed: 0,
            distortionScore: 0.0,
            reinterpretationTags: [...pillar.tags],
            isLost: false
        };

        this.folklore.set(pillar.id, data);
    }

    /**
     * Process generational transition (approx. every 25 years).
     */
    processGenerationTick() {
        for (const [id, data] of this.folklore.entries()) {
            if (data.isLost) continue;

            data.generationsPassed++;
            
            // 1. Advance State
            this.advanceState(data);

            // 2. Calculate Distortion
            // Distortion is fueled by high cynicism and low conscientiousness in the settlement
            const avgCynicism = this.historySystem.settlement.getAverageTrait('cynicism');
            data.distortionScore += (0.05 * avgCynicism) + (0.02 * data.generationsPassed);

            // 3. Cultural Reinterpretation
            if (data.distortionScore > 0.5) {
                this.reinterpret(data);
            }

            // 4. Memory Compression / Loss
            if (data.distortionScore > 1.5) {
                data.isLost = true;
                console.log(`[Folklore] Legend ${id} has been forgotten.`);
            }
        }
    }

    advanceState(data) {
        if (data.generationsPassed < 3) data.currentState = 'History';
        else if (data.generationsPassed < 6) data.currentState = 'Tradition';
        else if (data.generationsPassed < 10) data.currentState = 'Legend';
        else data.currentState = 'Myth';
    }

    reinterpret(data) {
        // Change tags or description based on current cultural "drift"
        if (!data.reinterpretationTags.includes('Exaggerated')) {
            data.reinterpretationTags.push('Exaggerated');
            data.originalTruth = `The Myth of ${data.originalTruth}`;
        }
    }

    /**
     * Determine: What survives after 10 generations? What becomes mythology?
     */
    generateFolkloreReport() {
        const myths = Array.from(this.folklore.values()).filter(d => d.currentState === 'Myth' && !d.isLost);
        const forgotten = Array.from(this.folklore.values()).filter(d => d.isLost);

        return {
            title: "Legend Decay Observatory Report",
            activeFolklore: Array.from(this.folklore.values()).filter(d => !d.isLost).map(d => ({
                state: d.currentState,
                description: d.originalTruth,
                distortion: d.distortionScore.toFixed(2),
                tags: d.reinterpretationTags
            })),
            analysis: {
                survivals: myths.length,
                extinctions: forgotten.length,
                conclusion: myths.length > 0 ? 
                    "Ancient truths have survived as Myth, shedding technical detail for emotional resonance." :
                    "Total Folklore Collapse: The society has no long-form memory."
            }
        };
    }
}
