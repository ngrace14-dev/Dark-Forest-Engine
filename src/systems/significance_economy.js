/**
 * DARK FOREST ENGINE - SIGNIFICANCE ECONOMY AUDIT
 * Crow Observatory (CO)
 * 
 * Audits the distribution of narrative relevance as a finite civilization resource.
 * Enforces "Significance Thermodynamics" to prevent infinite narrative wealth.
 */

class SignificanceEconomyAuditSystem {
    constructor() {
        this.metrics = {
            giniCoefficient: 0.0,       
            narrativeConcentration: 0.0, 
            heroDistribution: 0.0,      
            storyDensityAverage: 0.0,   
            narrativeDiversity: 1.0,    
            legendBirthRate: 0.0,       
            legendDeathRate: 0.0,       
            narrativeTurnover: 0.0,      
            totalDecayApplied: 0,
            globalSignificanceSupply: 0, // NEW: Finite Pool Tracking
            inflationRate: 0.0           // NEW: Rate of creation vs decay
        };

        this.history = {
            legendBirths: [],
            legendDeaths: [],
            significanceSnapshots: [],
            totalSignificanceHistory: [] // NEW: Supply tracking
        };

        this.houseSignificance = new Map(); 
        this.forceAttractionPressure = new Map(); 

        // FINITE RESOURCE CONSTANTS
        this.SUPPLY_CAP = 1000000; // The "Historical Bandwidth" of the world
        this.LAST_TOTAL_SUPPLY = 0;

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.performAudit());
        window.EventBus.on('LEGEND_CREATED', (data) => this.recordBirth(data));
        window.EventBus.on('LEGACY_HARVESTED', (data) => this.recordDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '👁️ [Crow Economic Office] Monitoring Narrative Scarcity');
    }

    /**
     * Performs a full audit of all active legacies and calculates supply thermodynamics.
     */
    performAudit() {
        if (!window.LegacyManager) return;

        const legacies = Array.from(window.LegacyManager.activeLegacies.values());
        const day = window.EngineParams?.worldDay || 0;

        if (legacies.length === 0) return;

        // 1. CALCULATE GLOBAL SUPPLY
        const currentTotal = legacies.reduce((sum, l) => sum + (l.storyDensity || 0), 0);
        this.metrics.globalSignificanceSupply = currentTotal;
        
        // 2. CALCULATE INFLATION
        if (this.LAST_TOTAL_SUPPLY > 0) {
            this.metrics.inflationRate = (currentTotal - this.LAST_TOTAL_SUPPLY) / this.LAST_TOTAL_SUPPLY;
        }
        this.LAST_TOTAL_SUPPLY = currentTotal;

        // 3. GINI COEFFICIENT
        this.metrics.giniCoefficient = this._calculateGini(legacies.map(l => l.storyDensity));

        // 4. NARRATIVE CONCENTRATION
        const sorted = legacies.sort((a, b) => b.storyDensity - a.storyDensity);
        const top5Count = Math.max(1, Math.ceil(legacies.length * 0.05));
        const top5Story = sorted.slice(0, top5Count).reduce((sum, l) => sum + l.storyDensity, 0);
        this.metrics.narrativeConcentration = top5Story / (currentTotal || 1);
        this.metrics.storyDensityAverage = currentTotal / legacies.length;

        // 5. HERO DISTRIBUTION
        const legends = legacies.filter(l => l.storyDensity >= 1500).length;
        this.metrics.heroDistribution = legends / legacies.length;

        // 6. HOUSE OWNERSHIP
        this.houseSignificance.clear();
        legacies.forEach(l => {
            if (l.bloodlineId) {
                const current = this.houseSignificance.get(l.bloodlineId) || 0;
                this.houseSignificance.set(l.bloodlineId, current + l.storyDensity);
            }
        });

        // 7. DETECT ANOMALIES & APPLY THERMODYNAMIC PRESSURE
        const anomalies = this._detectAnomalies();
        
        // FORCED SCARCITY: If supply exceeds cap, accelerate decay
        if (currentTotal > this.SUPPLY_CAP || this.metrics.narrativeConcentration > 0.8) {
            this._applyAggressiveSignificanceDecay();
        } else {
            this._applySignificanceDecay(); // Standard maintenance
        }

        // --- THERMODYNAMICS SYNC ---
        if (window.Thermodynamics && window.Thermodynamics.calculateMetrics) {
            window.Thermodynamics.calculateMetrics();
        }
        
        this.history.significanceSnapshots.push({
            day: day,
            metrics: { ...this.metrics },
            anomalies: anomalies
        });

        this.history.totalSignificanceHistory.push({ day, total: currentTotal });

        window.EventBus.emit('SIGNIFICANCE_AUDIT_COMPLETE', {
            metrics: this.metrics,
            anomalies: anomalies
        });

        this._emitAuditLog(anomalies);
    }

    _detectAnomalies() {
        const anomalies = [];

        if (this.metrics.heroDistribution > 0.2) anomalies.push("SIGNIFICANCE_INFLATION");
        if (this.metrics.narrativeConcentration > 0.8) anomalies.push("SIGNIFICANCE_MONOPOLY");
        if (this.metrics.globalSignificanceSupply > this.SUPPLY_CAP * 0.9) anomalies.push("SUPPLY_CRITICAL");
        
        // DETECT SIGNIFICANCE FARMING
        // Rule: If an entity's significance grew significantly without a corresponding history record
        const counterfeits = this.detectCounterfeitSignificance();
        if (counterfeits.length > 0) {
            anomalies.push("SIGNIFICANCE_FARMING_DETECTED");
        }

        return anomalies;
    }

    _applySignificanceDecay() {
        if (!window.LegacyManager) return;
        
        let totalDecayed = 0;
        window.LegacyManager.activeLegacies.forEach(legacy => {
            // Natural Evaporation (Entropy)
            const decay = Math.floor((legacy.storyDensity || 0) * 0.02);
            legacy.storyDensity = Math.max(0, legacy.storyDensity - decay);
            totalDecayed += decay;
        });
        this.metrics.totalDecayApplied += totalDecayed;
    }

    _applyAggressiveSignificanceDecay() {
        if (!window.LegacyManager) return;
        
        let totalDecayed = 0;
        window.LegacyManager.activeLegacies.forEach(legacy => {
            // Aggressive purge for "Historical Bandwidth" safety
            const decay = Math.floor((legacy.storyDensity || 0) * 0.1); 
            legacy.storyDensity = Math.max(0, legacy.storyDensity - decay);
            totalDecayed += decay;
        });
        this.metrics.totalDecayApplied += totalDecayed;
        window.EventBus.emit('UI_LOG', '📉 [SCARCITY] Global Significance Supply exceeded capacity. Purging redundant history.');
    }

    _emitAuditLog(anomalies) {
        const status = anomalies.length === 0 ? "STABLE" : "UNSTABLE";
        window.EventBus.emit('UI_LOG', `👁️ [CEO] Supply: ${this.metrics.globalSignificanceSupply.toLocaleString()} | Gini: ${this.metrics.giniCoefficient.toFixed(2)} | Status: ${status}`);
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
     * Determine: Can significance be farmed?
     * Detects entities with high significance but zero witnesses/participants in their records.
     */
    detectCounterfeitSignificance() {
        const anomalies = [];
        if (!window.LegacyManager || !window.ChronicleManager || !window.LegacyManager.activeLegacies) return anomalies;

        window.LegacyManager.activeLegacies.forEach(legacy => {
            const records = window.ChronicleManager.getHistoryFor(legacy.id);
            if (legacy.storyDensity > 1000 && records.length === 0) {
                anomalies.push({ id: legacy.id, reason: 'GHOST_HISTORY' });
                
                // Active Correction: Punish ghost history
                legacy.storyDensity = Math.floor(legacy.storyDensity * 0.5);
                window.EventBus.emit('UI_LOG_DEBUG', `[CEO] Correction: ${legacy.id} significance halved due to Ghost History.`);
            }
        });
        return anomalies;
    }

    generateSignificanceReport() {
        return {
            title: "SIGNIFICANCE THERMODYNAMICS REPORT",
            global_supply: this.metrics.globalSignificanceSupply,
            supply_cap: this.SUPPLY_CAP,
            inflation_rate: this.metrics.inflationRate,
            concentration: this.metrics.narrativeConcentration,
            verdict: this._getVerdict()
        };
    }

    _getVerdict() {
        if (this.metrics.globalSignificanceSupply > this.SUPPLY_CAP) return "CRITICAL OVERFLOW: History is saturated. New events cannot take root.";
        if (this.metrics.giniCoefficient > 0.9) return "SIGNIFICANCE MONOPOLY: One House has captured 90% of existence.";
        return "NARRATIVE EQUILIBRIUM: Significance is finite and circulating.";
    }
}

window.CrowObservatory = new SignificanceEconomyAuditSystem();
export default window.CrowObservatory;

