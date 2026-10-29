/**
 * DARK FOREST ENGINE - DUNES ANALYTICS PLATFORM
 * Dunes Research Directorate (DRD)
 * 
 * Analyzes expedition success and the behavioral traits of survivors in the Endless Dunes.
 */

class DunesAnalyticsSystem {
    constructor() {
        this.expeditionRegistry = []; // Array of { id, actorId, traits, career, outcome, yield, day }
        this.successMetrics = {
            totalAttempts: 0,
            totalSuccesses: 0,
            wallCrossings: 0,
            returnRate: 0.0,
            averageYield: 0.0,
            costOfDiscovery: 0 // Total "Significance" or "HP" lost per discovery
        };

        this.correlations = {
            traits: new Map(), // traitName -> { successCount, totalCount, score }
            careers: new Map()  // careerName -> { successCount, totalCount, discoveryTierSum }
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('DUNE_FRAGMENT_RECOVERED', (data) => this.recordSuccess(data));
        window.EventBus.on('ENTITY_DIED', (data) => this.recordFailure(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏜️ [DRD] Dunes Analytics Platform Engaged');
    }

    /**
     * Records a new expedition attempt.
     */
    startExpedition(actorId, traits, career) {
        const id = `exp_${Date.now()}`;
        const attempt = {
            id,
            actorId,
            traits: { ...traits },
            career,
            startTime: window.EngineParams?.worldDay || 0,
            outcome: 'PENDING',
            yield: 0
        };
        this.expeditionRegistry.push(attempt);
        this.successMetrics.totalAttempts++;
        
        // Track Wall Crossing
        this.successMetrics.wallCrossings++;
        
        this._updateCorrelations(traits, career, false);
    }

    /**
     * Records a successful discovery in the dunes.
     */
    recordSuccess(record) {
        // Find the active expedition for the player or NPC
        // For MVP, we'll assume player if actorId is missing
        const attempt = this.expeditionRegistry.find(a => a.outcome === 'PENDING'); 
        if (!attempt) return;

        attempt.outcome = 'SUCCESS';
        attempt.yield += (record.tier === 'EPOCH' ? 100 : 10);
        this.successMetrics.totalSuccesses++;
        
        this._updateCorrelations(attempt.traits, attempt.career, true, record.tier);
        this._recalculateGlobalMetrics();
    }

    /**
     * Records a failure (death) in the dunes.
     */
    recordFailure(entity) {
        if (!window.WorldGenerator) return;
        const biome = window.WorldGenerator.getBiome(entity.visual.position.x, entity.visual.position.z);
        if (biome !== 'desert') return;

        const attempt = this.expeditionRegistry.find(a => a.actorId === entity.id && a.outcome === 'PENDING');
        if (!attempt) return;

        attempt.outcome = 'FAILURE';
        this._recalculateGlobalMetrics();
        
        window.EventBus.emit('UI_LOG_DEBUG', `[DRD] Expedition Failure Analysis: ${entity.id} succumbed to the sands.`);
    }

    _updateCorrelations(traits, career, isSuccess, tier = 'MINOR') {
        // 1. TRAIT CORRELATION
        for (const [name, value] of Object.entries(traits)) {
            if (!this.correlations.traits.has(name)) {
                this.correlations.traits.set(name, { successCount: 0, totalCount: 0, score: 0 });
            }
            const stats = this.correlations.traits.get(name);
            stats.totalCount++;
            if (isSuccess) stats.successCount++;
            stats.score = stats.successCount / stats.totalCount;
        }

        // 2. CAREER CORRELATION
        if (career) {
            if (!this.correlations.careers.has(career)) {
                this.correlations.careers.set(career, { successCount: 0, totalCount: 0, discoveryTierSum: 0 });
            }
            const stats = this.correlations.careers.get(career);
            stats.totalCount++;
            if (isSuccess) {
                stats.successCount++;
                const weight = tier === 'EPOCH' ? 10 : tier === 'LEGENDARY' ? 5 : 1;
                stats.discoveryTierSum += weight;
            }
        }
    }

    _recalculateGlobalMetrics() {
        this.successMetrics.returnRate = this.successMetrics.totalSuccesses / (this.successMetrics.totalAttempts || 1);
        
        const totalYield = this.expeditionRegistry.reduce((sum, a) => sum + a.yield, 0);
        this.successMetrics.averageYield = totalYield / (this.successMetrics.totalSuccesses || 1);
    }

    /**
     * Predictive Model: Calculates the probability of success for a given profile.
     */
    predictSuccess(traits, career) {
        let score = 0.5; // Baseline
        
        // Apply trait weights from historical data
        for (const [name, value] of Object.entries(traits)) {
            const stats = this.correlations.traits.get(name);
            if (stats) {
                // If the trait success score > 0.5, it helps; if < 0.5, it hurts
                score += (stats.score - 0.5) * value;
            }
        }

        // Apply career weights
        const careerStats = this.correlations.careers.get(career);
        if (careerStats) {
            score += (careerStats.successCount / careerStats.totalCount - 0.5);
        }

        return Math.max(0.01, Math.min(0.99, score));
    }

    /**
     * Determines which behaviors produce "Historical Discoveries."
     */
    getDiscoveryInsight() {
        const topCareers = Array.from(this.correlations.careers.entries())
            .sort((a, b) => b[1].discoveryTierSum - a[1].discoveryTierSum)
            .slice(0, 3);
            
        const deadlyTraits = Array.from(this.correlations.traits.entries())
            .sort((a, b) => a[1].score - b[1].score)
            .slice(0, 3);

        return {
            masterExplorers: topCareers.map(c => c[0]),
            lethalTraits: deadlyTraits.map(t => t[0])
        };
    }
}

window.DunesAnalytics = new DunesAnalyticsSystem();
export default window.DunesAnalytics;
