/**
 * DARK FOREST ENGINE - SIGNIFICANCE ECONOMY AUDIT
 * Crow Observatory (CO)
 * 
 * Audits the distribution of narrative relevance to prevent the "Significance Trap."
 */

class SignificanceEconomyAuditSystem {
    constructor() {
        this.metrics = {
            giniCoefficient: 0.0,       // 0.0 (Equality) to 1.0 (Monopoly)
            narrativeConcentration: 0.0, // % of total significance held by top 5 entities
            heroDistribution: 0.0,      // Ratio of Legendary/Mythic entities to total population
            storyDensityAverage: 0.0,   // Average story density per active entity
            narrativeDiversity: 1.0     // Variety of career/house sources of significance
        };

        this.houseSignificance = new Map(); // HouseID -> Total Significance
        this.forceAttractionPressure = new Map(); // EntityID -> Pressure Value

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.performAudit());
    }

    init() {
        window.EventBus.emit('UI_LOG', '👁️ [Crow Observatory] Significance Economy Audit Engaged');
    }

    /**
     * Performs a full audit of all active legacies.
     */
    performAudit() {
        if (!window.LegacyManager) return;

        const legacies = Array.from(window.LegacyManager.activeLegacies.values());
        if (legacies.length === 0) return;

        // 1. GINI COEFFICIENT (Bible §BN)
        // Measures inequality of significance distribution
        this.metrics.giniCoefficient = this._calculateGini(legacies.map(l => l.storyDensity));

        // 2. NARRATIVE CONCENTRATION
        // How much of the "Total Story" is owned by the top 1%
        const sorted = legacies.sort((a, b) => b.storyDensity - a.storyDensity);
        const totalStory = sorted.reduce((sum, l) => sum + l.storyDensity, 0);
        const top5Count = Math.max(1, Math.ceil(legacies.length * 0.05));
        const top5Story = sorted.slice(0, top5Count).reduce((sum, l) => sum + l.storyDensity, 0);
        this.metrics.narrativeConcentration = top5Story / (totalStory || 1);

        // 3. HERO DISTRIBUTION
        const legends = legacies.filter(l => l.storyDensity >= 1500).length;
        this.metrics.heroDistribution = legends / legacies.length;

        // 4. HOUSE SIGNIFICANCE OWNERSHIP
        this.houseSignificance.clear();
        legacies.forEach(l => {
            if (l.bloodlineId) {
                const current = this.houseSignificance.get(l.bloodlineId) || 0;
                this.houseSignificance.set(l.bloodlineId, current + l.storyDensity);
            }
        });

        // 5. NARRATIVE DIVERSITY
        // Variety of sources (Houses, Factions, Careers)
        const sources = new Set(legacies.map(l => l.bloodlineId).filter(id => id !== null));
        this.metrics.narrativeDiversity = sources.size / 19; // 19 Noble Houses baseline

        // 6. DETECT MONOPOLIES & FEEDBACK LOOPS
        this._detectMonopolies();
        
        window.EventBus.emit('SIGNIFICANCE_AUDIT_COMPLETE', this.metrics);
        this._emitAuditLog();
    }

    _calculateGini(values) {
        const n = values.length;
        if (n < 2) return 0;
        const sorted = values.sort((a, b) => a - b);
        let sumNom = 0;
        let sumDen = 0;
        for (let i = 0; i < n; i++) {
            sumNom += (i + 1) * sorted[i];
            sumDen += sorted[i];
        }
        if (sumDen === 0) return 0;
        return (2 * sumNom) / (n * sumDen) - (n + 1) / n;
    }

    _detectMonopolies() {
        // If Narrative Concentration > 0.7, a Narrative Monopoly has formed
        if (this.metrics.narrativeConcentration > 0.7) {
            window.EventBus.emit('UI_LOG', '⚠️ [CROW] NARRATIVE MONOPOLY DETECTED. Significance is starving future generations.');
            this._applySignificanceDecay();
        }

        // If Gini > 0.8, the Significance Trap is active
        if (this.metrics.giniCoefficient > 0.8) {
            window.EventBus.emit('UI_LOG', '⚠️ [CROW] SIGNIFICANCE TRAP ACTIVE. Legendary entities are attracting all force pressure.');
        }
    }

    /**
     * Balancing System: Significance Decay (Bible §BN)
     * High-concentration entities lose 5% significance per Epoch to feed the Churn.
     */
    _applySignificanceDecay() {
        if (!window.LegacyManager) return;
        
        window.LegacyManager.activeLegacies.forEach(legacy => {
            if (legacy.storyDensity > 2000) {
                const decay = Math.floor(legacy.storyDensity * 0.05);
                legacy.storyDensity -= decay;
                window.EventBus.emit('UI_LOG_DEBUG', `[BALANCING] ${legacy.id} significance decayed by ${decay} to preserve scarcity.`);
            }
        });
    }

    _emitAuditLog() {
        const status = this.metrics.giniCoefficient < 0.5 ? "HEALTHY" : "UNSTABLE";
        window.EventBus.emit('UI_LOG', `👁️ [CO] Narrative Economy: ${status} (Gini: ${this.metrics.giniCoefficient.toFixed(2)})`);
    }

    /**
     * Candidate Identification Check
     * Can the 4 Great Forces still find meaningful candidates?
     */
    checkCandidatePool() {
        const poolSize = Array.from(window.LegacyManager.activeLegacies.values())
            .filter(l => l.storyDensity < 500).length;
            
        const results = {
            crow: this.metrics.narrativeConcentration < 0.9,
            huntsman: poolSize > 5,
            tree: this.metrics.narrativeDiversity > 0.3,
            sovereign: this.metrics.giniCoefficient < 0.7
        };

        if (!results.huntsman) {
            window.EventBus.emit('UI_LOG', '[CO] WARNING: The Huntsman has no unrefined sparks to cultivate.');
        }

        return results;
    }
}

window.CrowObservatory = new SignificanceEconomyAuditSystem();
export default window.CrowObservatory;
