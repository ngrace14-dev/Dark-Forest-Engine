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
            narrativeDiversity: 1.0,    // Variety of career/house sources of significance
            legendBirthRate: 0.0,       // Legends per Epoch
            legendDeathRate: 0.0,       // Deaths per Epoch
            narrativeTurnover: 0.0,      // Ratio of births to deaths
            totalDecayApplied: 0        // Amount of significance purged to preserve scarcity
        };

        this.history = {
            legendBirths: [],
            legendDeaths: [],
            significanceSnapshots: []
        };

        this.houseSignificance = new Map(); // HouseID -> Total Significance
        this.forceAttractionPressure = new Map(); // EntityID -> Pressure Value

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.performAudit());
        window.EventBus.on('LEGEND_CREATED', (data) => this.recordBirth(data));
        window.EventBus.on('LEGACY_HARVESTED', (data) => this.recordDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '👁️ [Crow Significance Directorate] Monitoring Narrative Equilibrium');
    }

    recordBirth(legend) {
        this.history.legendBirths.push({
            day: window.EngineParams?.worldDay || 0,
            id: legend.id,
            actorId: legend.actorId
        });
    }

    recordDeath(legacy) {
        this.history.legendDeaths.push({
            day: window.EngineParams?.worldDay || 0,
            id: legacy.bloodlineId,
            significance: legacy.significance
        });
    }

    /**
     * Performs a full audit of all active legacies.
     */
    performAudit() {
        if (!window.LegacyManager) return;

        const legacies = Array.from(window.LegacyManager.activeLegacies.values());
        const day = window.EngineParams?.worldDay || 0;

        if (legacies.length === 0) return;

        // 1. GINI COEFFICIENT (Bible §BN)
        this.metrics.giniCoefficient = this._calculateGini(legacies.map(l => l.storyDensity));

        // 2. NARRATIVE CONCENTRATION
        const sorted = legacies.sort((a, b) => b.storyDensity - a.storyDensity);
        const totalStory = sorted.reduce((sum, l) => sum + l.storyDensity, 0);
        const top5Count = Math.max(1, Math.ceil(legacies.length * 0.05));
        const top5Story = sorted.slice(0, top5Count).reduce((sum, l) => sum + l.storyDensity, 0);
        this.metrics.narrativeConcentration = top5Story / (totalStory || 1);
        this.metrics.storyDensityAverage = totalStory / legacies.length;

        // 3. HERO DISTRIBUTION
        const legends = legacies.filter(l => l.storyDensity >= 1500).length;
        this.metrics.heroDistribution = legends / legacies.length;

        // 4. TURNOVER TRACKING
        const epochWindow = 14; // Bible §5
        const recentBirths = this.history.legendBirths.filter(b => b.day > day - epochWindow).length;
        const recentDeaths = this.history.legendDeaths.filter(d => d.day > day - epochWindow).length;
        
        this.metrics.legendBirthRate = recentBirths;
        this.metrics.legendDeathRate = recentDeaths;
        this.metrics.narrativeTurnover = (recentBirths + recentDeaths) / (legacies.length || 1);

        // 5. HOUSE SIGNIFICANCE OWNERSHIP
        this.houseSignificance.clear();
        legacies.forEach(l => {
            if (l.bloodlineId) {
                const current = this.houseSignificance.get(l.bloodlineId) || 0;
                this.houseSignificance.set(l.bloodlineId, current + l.storyDensity);
            }
        });

        // 6. NARRATIVE DIVERSITY
        const sources = new Set(legacies.map(l => l.bloodlineId).filter(id => id !== null));
        this.metrics.narrativeDiversity = sources.size / 19; // 19 Noble Houses (Bible §19)

        // 7. DETECT ANOMALIES & APPLY STABILIZATION
        const anomalies = this._detectAnomalies();
        
        // Active stabilization (Bible §BN)
        if (anomalies.includes("SIGNIFICANCE_STARVATION") || this.metrics.narrativeConcentration > 0.7) {
            this._applySignificanceDecay();
        }
        
        this.history.significanceSnapshots.push({
            day: day,
            metrics: { ...this.metrics },
            anomalies: anomalies
        });

        window.EventBus.emit('SIGNIFICANCE_AUDIT_COMPLETE', {
            metrics: this.metrics,
            anomalies: anomalies
        });

        this._emitAuditLog(anomalies);
    }

    _detectAnomalies() {
        const anomalies = [];

        // SIGNIFICANCE INFLATION: Too many legends, story density average rising too fast
        if (this.metrics.heroDistribution > 0.2) {
            anomalies.push("SIGNIFICANCE_INFLATION");
        }

        // SIGNIFICANCE STARVATION: Concentration is so high that new legends can't form
        if (this.metrics.narrativeConcentration > 0.8 && this.metrics.legendBirthRate === 0) {
            anomalies.push("SIGNIFICANCE_STARVATION");
        }

        // HERO SCARCITY: Too few legends to anchor history
        if (this.metrics.heroDistribution < 0.02) {
            anomalies.push("HERO_SCARCITY");
        }

        // NARRATIVE OSCILLATION: Rapid turnover with no persistence
        if (this.metrics.legendBirthRate > 5 && this.metrics.legendDeathRate > 5) {
            anomalies.push("NARRATIVE_OSCILLATION");
        }

        return anomalies;
    }

    _applySignificanceDecay() {
        if (!window.LegacyManager) return;
        
        let totalDecayed = 0;
        window.LegacyManager.activeLegacies.forEach(legacy => {
            if (legacy.storyDensity > 2000) {
                const decay = Math.floor(legacy.storyDensity * 0.05);
                legacy.storyDensity -= decay;
                totalDecayed += decay;
                window.EventBus.emit('UI_LOG_DEBUG', `[BALANCING] ${legacy.id} significance decayed by ${decay} to preserve scarcity.`);
            }
        });
        this.metrics.totalDecayApplied += totalDecayed;
    }

    _emitAuditLog(anomalies) {
        const status = anomalies.length === 0 ? "EQUILIBRIUM" : "DISTURBED";
        window.EventBus.emit('UI_LOG', `👁️ [CO] Directorate Status: ${status} | Gini: ${this.metrics.giniCoefficient.toFixed(2)} | Anomalies: ${anomalies.join(', ') || 'None'}`);
    }

    _calculateGini(values) {
        const n = values.length;
        if (n < 2) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        let sumNom = 0;
        let sumDen = 0;
        for (let i = 0; i < n; i++) {
            sumNom += (i + 1) * sorted[i];
            sumDen += sorted[i];
        }
        if (sumDen === 0) return 0;
        return (2 * sumNom) / (n * sumDen) - (n + 1) / n;
    }

    /**
     * Generates the Long-term Significance Equilibrium Report
     */
    generateReport() {
        const anomalies = this._detectAnomalies();
        const equilibrium = anomalies.length === 0 ? "STABLE" : "UNSTABLE";
        
        return {
            title: "LONG-TERM SIGNIFICANCE EQUILIBRIUM REPORT",
            status: equilibrium,
            timestamp: window.EngineParams?.worldDay || 0,
            core_metrics: {
                gini: this.metrics.giniCoefficient,
                concentration: this.metrics.narrativeConcentration,
                hero_density: this.metrics.heroDistribution,
                turnover: this.metrics.narrativeTurnover
            },
            tracking: {
                births: this.history.legendBirths.length,
                deaths: this.history.legendDeaths.length,
                decay_pressure: this.metrics.totalDecayApplied
            },
            detections: anomalies,
            conclusion: this._getConclusion(equilibrium, anomalies)
        };
    }

    _getConclusion(equilibrium, anomalies) {
        if (equilibrium === "STABLE") return "Significance remains meaningful. The churn is healthy.";
        if (anomalies.includes("SIGNIFICANCE_STARVATION")) return "The past is consuming the future. Narrative entropy is critical.";
        if (anomalies.includes("SIGNIFICANCE_INFLATION")) return "Legends are becoming common. Scarcity must be enforced.";
        return "Narrative stability is compromised. Monitor turnover rates.";
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
