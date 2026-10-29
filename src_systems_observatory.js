/**
 * File: src_systems_observatory.js
 * Genesis Engine: World Observatory Framework
 * 
 * Objective: 
 * A multi-tier observability framework for monitoring civilization stability, 
 * epistemic health, and significance concentration over 1000-year spans.
 */

class WorldObservatory {
    constructor() {
        this.config = {
            bufferLimit: 30, // Days to keep raw data
            seasonLength: 90,
            yearLength: 365
        };

        // Tier 2: Buffer (Daily Raw Data)
        this.dailyBuffer = [];

        // Tier 3: Aggregated Reports
        this.reports = {
            seasons: [],
            years: [],
            decades: [],
            centuries: [],
            epochs: []
        };

        // Current Active Health Metrics
        this.currentHealth = this.initializeHealthState();
    }

    initializeHealthState() {
        return {
            world: { extinctionRisk: 0, prosperityGradient: 0, popStability: 1.0 },
            information: { truthFidelity: 1.0, propagationVelocity: 0, contamination: 0 },
            political: { meanLegitimacy: 1.0, powerConcentration: 0, conflictFrequency: 0 },
            historical: { mythicDrift: 0, knowledgeHalfLife: 0, archiveDensity: 0 },
            significance: { giniCoefficient: 0, inflationRate: 0, anchorDensity: 0 }
        };
    }

    init() {
        window.EventBus.on('HEARTBEAT_T1', () => this.runDailyProbe());
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordEpochReport());
        console.log("🔭 [OBSERVATORY] System Online. Monitoring the threads of time.");
    }

    /**
     * TIER 1: PROBE
     * Extracts real-time state from specialized managers.
     */
    runDailyProbe() {
        const day = window.EngineParams?.worldDay || 0;
        
        const dailySnapshot = {
            day,
            metrics: {
                world: this.probeWorldHealth(),
                information: this.probeInformationHealth(),
                political: this.probePoliticalHealth(),
                significance: this.probeSignificanceHealth()
            }
        };

        this.dailyBuffer.push(dailySnapshot);

        // Tier 2 -> Tier 3 Transition
        if (day > 0 && day % this.config.seasonLength === 0) {
            this.aggregateSeason(day);
        }

        if (day > 0 && day % this.config.yearLength === 0) {
            this.aggregateYear(day);
        }

        // Keep buffer bounded
        if (this.dailyBuffer.length > this.config.bufferLimit) {
            this.dailyBuffer.shift();
        }
    }

    probeWorldHealth() {
        if (!window.VillageManager) return {};
        const villages = window.VillageManager.villages || [];
        const totalPop = villages.reduce((acc, v) => acc + (v.population?.current || 0), 0);
        const atRisk = villages.filter(v => (v.stats?.food || 0) < 10).length;

        return {
            population: totalPop,
            extinctionRisk: villages.length > 0 ? atRisk / villages.length : 0,
            prosperity: villages.reduce((acc, v) => acc + (v.stats?.prosperity || 0), 0) / (villages.length || 1)
        };
    }

    probeInformationHealth() {
        if (!window.IntelManager) return {};
        const registry = Array.from(window.IntelManager.registry.values());
        const total = registry.length || 1;
        
        const facts = registry.filter(i => i.type === 'FACT');
        const rumors = registry.filter(i => i.type === 'RUMOR');
        
        // 1. Truth Fidelity: Ratio of Facts to total Intel
        const truthFidelity = facts.length / total;

        // 2. Propagation Velocity (Estimate)
        // Average transmission_count of active intel
        const avgTransmission = registry.reduce((acc, i) => acc + (i.provenance?.transmission_count || 0), 0) / total;

        // 3. Contamination: Percentage of rumors with certainty > 0.5 that are actually FALSE (if we had truth_state)
        const falseRumors = rumors.filter(i => i.truth_state === 'FALSE' && i.certainty > 0.5).length;
        const contamination = falseRumors / (rumors.length || 1);

        // 4. Misinformation Persistence
        // Average age of FALSE facts
        const day = window.EngineParams?.worldDay || 0;
        const falseFacts = facts.filter(i => i.truth_state === 'FALSE');
        const avgMisinfoAge = falseFacts.reduce((acc, i) => acc + (day - i.payload.timestamp_day), 0) / (falseFacts.length || 1);

        // 5. Silo Isolation
        // How many intel records are known by only ONE institution/house?
        let siloedCount = 0;
        if (window.IntelManager.ownershipRegistry) {
            for (const [intelId, owners] of window.IntelManager.ownershipRegistry.entries()) {
                if (owners.size <= 3) siloedCount++; // Assuming < 3 owners counts as siloed
            }
        }

        return {
            truthFidelity,
            avgTransmission,
            contamination,
            misinfoPersistence: isNaN(avgMisinfoAge) ? 0 : avgMisinfoAge,
            siloRatio: siloedCount / total
        };
    }

    probePoliticalHealth() {
        if (!window.DynastyManager) return {};
        const houses = Array.from(window.DynastyManager.houses.values());
        if (houses.length === 0) return { meanLegitimacy: 0, powerConcentration: 0 };

        const totalPrestige = houses.reduce((acc, h) => acc + (h.prestige || 0), 0) || 1;
        const hhi = houses.reduce((acc, h) => acc + Math.pow((h.prestige || 0) / totalPrestige, 2), 0);
        
        const meanLegitimacy = houses.reduce((acc, h) => acc + (h.legitimacy || 0), 0) / houses.length;
        
        // 1. Legitimacy Crisis: % of houses below 0.3 legitimacy
        const housesInCrisis = houses.filter(h => h.legitimacy < 0.3).length;
        
        // 2. Schism Density: % of houses with active schisms
        const activeSchisms = houses.filter(h => h.activeSchism).length;

        // 3. Feud Intensity
        const feudCount = window.DynastyManager.feuds?.length || 0;
        const avgFeudIntensity = feudCount > 0 ? 
            window.DynastyManager.feuds.reduce((acc, f) => acc + (f.intensity || 0), 0) / feudCount : 0;

        // 4. Political Stagnation (Inverted delta of blessed spots)
        // Calculated by the Aggregator over time, but we probe the current count
        const blessedCount = houses.filter(h => h.isBlessed).length;

        return {
            meanLegitimacy,
            powerConcentration: hhi,
            crisisRatio: housesInCrisis / houses.length,
            schismDensity: activeSchisms / houses.length,
            feudVolatility: feudCount * avgFeudIntensity,
            blessedRatio: blessedCount / houses.length
        };
    }

    probeSignificanceHealth() {
        if (!window.ChronicleManager) return {};
        const weights = Array.from(window.ChronicleManager.npcHistoricalWeights.values());
        if (weights.length === 0) return { giniCoefficient: 0 };

        // Simple Gini Coefficient approximation
        weights.sort((a, b) => a - b);
        const n = weights.length;
        let sum = 0;
        for (let i = 1; i <= n; i++) {
            sum += (n + 1 - i) * weights[i - 1];
        }
        const gini = (n + 1 - 2 * (sum / weights.reduce((a, b) => a + b, 0))) / n;

        return {
            giniCoefficient: isNaN(gini) ? 0 : gini,
            totalSignificance: weights.reduce((a, b) => a + b, 0)
        };
    }

    /**
     * TIER 3: AGGREGATOR
     */
    aggregateSeason(day) {
        const seasonData = this.dailyBuffer.slice(-this.config.seasonLength);
        const report = {
            type: 'SEASON',
            day,
            timestamp: Date.now(),
            averages: this.calculateAverages(seasonData)
        };
        this.reports.seasons.push(report);
        window.EventBus.emit('OBSERVATORY_REPORT_SEASON', report);
    }

    aggregateYear(day) {
        const yearData = this.reports.seasons.slice(-4);
        const report = {
            type: 'YEAR',
            day,
            year: Math.floor(day / 365),
            averages: this.calculateAverages(yearData, 'averages'),
            stabilityIndex: this.calculateStability(yearData)
        };
        this.reports.years.push(report);
        
        // Decade check
        if (report.year > 0 && report.year % 10 === 0) {
            this.aggregateDecade(report.year);
        }

        console.log(`📊 [OBSERVATORY] Year ${report.year} Report Generated. Stability Index: ${report.stabilityIndex.toFixed(2)}`);
    }

    aggregateDecade(year) {
        const decadeData = this.reports.years.slice(-10);
        const report = {
            type: 'DECADE',
            year,
            trends: this.calculateTrends(decadeData)
        };
        this.reports.decades.push(report);

        // Century check
        if (year > 0 && year % 100 === 0) {
            this.aggregateCentury(year);
        }
    }

    aggregateCentury(year) {
        const report = {
            type: 'CENTURY',
            year,
            summary: "Historical Snapshot of the Era",
            finalHealth: this.reports.decades[this.reports.decades.length - 1].trends
        };
        this.reports.centuries.push(report);
        console.log(`📜 [OBSERVATORY] Century ${year / 100} has concluded. Historical record sealed.`);
    }

    recordEpochReport() {
        const day = window.EngineParams?.worldDay || 0;
        const epoch = window.EngineParams?.worldEpoch || 0;
        
        const report = {
            type: 'EPOCH',
            epoch,
            day,
            reconstructionSuccess: this.probeReconstructionSuccess()
        };
        this.reports.epochs.push(report);
    }

    probeReconstructionSuccess() {
        // Evaluate if major pillars survived the Shift
        return 0.85; // Mock for now
    }

    calculateAverages(data, key = 'metrics') {
        if (data.length === 0) return {};
        const first = data[0][key];
        const result = JSON.parse(JSON.stringify(first));

        // Nested average calculation
        for (const category in result) {
            for (const metric in result[category]) {
                const sum = data.reduce((acc, entry) => acc + (entry[key][category][metric] || 0), 0);
                result[category][metric] = sum / data.length;
            }
        }
        return result;
    }

    calculateStability(yearData) {
        // Stability is inverse of variance in prosperity and population
        return 0.95; // Implementation detail for Phase 2
    }

    calculateTrends(decadeData) {
        // Linear regression or simple delta over 10 years
        return {}; 
    }

    getStatus() {
        return {
            activeReports: {
                seasons: this.reports.seasons.length,
                years: this.reports.years.length,
                decades: this.reports.decades.length
            },
            currentHealth: this.dailyBuffer[this.dailyBuffer.length - 1]?.metrics || this.initializeHealthState()
        };
    }
}

window.WorldObservatory = new WorldObservatory();
window.WorldObservatory.init();
