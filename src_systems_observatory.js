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
            significance: { giniCoefficient: 0, inflationRate: 0, anchorDensity: 0 },
            dunes: { explorationDensity: 0, successRate: 0, avgSignificance: 0, dominantSurvivorTrait: 'NONE' },
            emergent: { rogueVillageRatio: 0, culturalDiversity: 0, tradeEmpireCount: 0, cascadeIntensity: 0 }
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
                significance: this.probeSignificanceHealth(),
                dunes: this.probeDuneHealth(),
                emergent: this.probeEmergentHealth()
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
        if (weights.length === 0) return { giniCoefficient: 0, totalSignificance: 0, inflationRate: 0, anchorDensity: 0 };

        // 1. Gini Coefficient (Significance Inequality)
        weights.sort((a, b) => a - b);
        const n = weights.length;
        let sum = 0;
        for (let i = 1; i <= n; i++) {
            sum += (n + 1 - i) * weights[i - 1];
        }
        const totalSig = weights.reduce((a, b) => a + b, 0);
        const gini = (n + 1 - 2 * (sum / (totalSig || 1))) / n;

        // 2. Inflation Tracking
        const lastTotal = this._lastTotalSignificance || totalSig;
        const inflationRate = (totalSig - lastTotal) / (lastTotal || 1);
        this._lastTotalSignificance = totalSig;

        // 3. Anchor Density (Persistent Significant Entities)
        // Count entities with significance > 500 (Legends)
        const legends = weights.filter(w => w > 500).length;
        const anchorDensity = legends / n;

        // 4. Concentration Audit: Top 1% Share
        const top1PercentCount = Math.max(1, Math.floor(n * 0.01));
        const top1PercentSum = weights.slice(-top1PercentCount).reduce((a, b) => a + b, 0);
        const topShare = top1PercentSum / (totalSig || 1);

        // 5. Loop Risk: Detection of runaway narrative loops
        // If inflation > 5% per day, something is broken
        const loopRisk = inflationRate > 0.05 ? 1.0 : 0.0;

        return {
            giniCoefficient: isNaN(gini) ? 0 : gini,
            totalSignificance: totalSig,
            inflationRate,
            anchorDensity,
            topShare,
            loopRisk
        };
    }

    probeEmergentHealth() {
        const villages = window.VillageManager?.villages || [];
        const totalVillages = villages.length || 1;

        // 1. Rogue Village Ratio (Independent settlements)
        const rogueCount = villages.filter(v => v.feudalState === 'INDEPENDENT' || v.feudalState === 'SOVEREIGN').length;
        const rogueVillageRatio = rogueCount / totalVillages;

        // 2. Cultural Diversity (Simpson's Diversity Index for cultures)
        const cultureCounts = {};
        villages.forEach(v => {
            const trait = v.culture?.dominantTrait || 'NEUTRAL';
            cultureCounts[trait] = (cultureCounts[trait] || 0) + 1;
        });
        const simpson = 1 - (Object.values(cultureCounts).reduce((acc, count) => acc + (count * (count - 1)), 0) / (totalVillages * (totalVillages - 1) || 1));

        // 3. Trade Empires (Villages with disproportionate gold and caravans)
        const tradeEmpires = villages.filter(v => (v.stats?.gold || 0) > 10000 && v.caravans.length > 5).length;

        // 4. Information Cascades (Explosive propagation of rumors)
        let cascadeIntensity = 0;
        if (window.IntelManager) {
            const rumors = Array.from(window.IntelManager.registry.values()).filter(i => i.type === 'RUMOR');
            const fastSpread = rumors.filter(i => i.provenance?.transmission_count > 10).length;
            cascadeIntensity = fastSpread / (rumors.length || 1);
        }

        // 5. New Power Centers (Non-capital villages with high prestige)
        const powerCenters = villages.filter(v => !v.capital && (v.stats?.prosperity || 0) > 80).length;

        return {
            rogueVillageRatio,
            culturalDiversity: simpson,
            tradeEmpireCount: tradeEmpires,
            cascadeIntensity,
            powerCenterCount: powerCenters
        };
    }

    probeDuneHealth() {
        if (!window.SimTest?.stats?.duneExploration) return { explorationDensity: 0, successRate: 0, avgSignificance: 0 };
        
        const data = window.SimTest.stats.duneExploration;
        if (data.length === 0) return { explorationDensity: 0, successRate: 0, avgSignificance: 0 };

        const totalExplorers = new Set(data.map(e => e.id)).size;
        const survivors = data.filter(e => e.fate === 'EXPLORING');
        const perished = data.filter(e => e.fate === 'PERISHED');
        
        const successRate = survivors.length / (data.length || 1);
        const avgSignificance = data.reduce((acc, e) => acc + (e.significance || 0), 0) / data.length;

        // Trait Correlation
        const traitTotals = { aggression: 0, investigation: 0, loyalty: 0 };
        survivors.forEach(s => {
            if (s.traits) {
                traitTotals.aggression += s.traits.aggression || 0;
                traitTotals.investigation += s.traits.investigation || 0;
                traitTotals.loyalty += s.traits.loyalty || 0;
            }
        });

        let dominantTrait = 'NONE';
        if (survivors.length > 0) {
            const max = Math.max(traitTotals.aggression, traitTotals.investigation, traitTotals.loyalty);
            if (max === traitTotals.aggression) dominantTrait = 'AGGRESSION';
            else if (max === traitTotals.investigation) dominantTrait = 'INVESTIGATION';
            else dominantTrait = 'LOYALTY';
        }

        return {
            explorationDensity: totalExplorers / (window.VillageManager?.kingdomPopulation || 1),
            successRate,
            avgSignificance,
            dominantSurvivorTrait: dominantTrait
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
        const trends = this.calculateTrends(decadeData);
        
        const report = {
            type: 'DECADE',
            year,
            trends,
            whsTrend: this.calculateWorldHealth().score // Store health at end of decade
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
        if (yearData.length === 0) return 1.0;
        
        // Stability = 1.0 - (ExtinctionRisk + (1.0 - meanLegitimacy) + (latest.significance?.loopRisk || 0)) / 3
        const latest = yearData[yearData.length - 1].averages;
        const risk = ((latest.world?.extinctionRisk || 0) + (1.0 - (latest.political?.meanLegitimacy || 1.0)) + (latest.significance?.loopRisk || 0)) / 3;
        
        return Math.max(0, 1.0 - risk);
    }

    calculateTrends(decadeData) {
        if (decadeData.length < 2) return {};
        
        const first = decadeData[0].averages;
        const last = decadeData[decadeData.length - 1].averages;
        
        return {
            prosperityDelta: (last.world?.prosperity || 0) - (first.world?.prosperity || 0),
            truthDecay: (first.information?.truthFidelity || 0) - (last.information?.truthFidelity || 0),
            legitimacyDrift: (last.political?.meanLegitimacy || 0) - (first.political?.meanLegitimacy || 0),
            significanceInflation: last.significance?.inflationRate || 0
        };
    }

    /**
     * WORLD HEALTH DIRECTORATE (WHD) AGGREGATOR
     * Calculates the definitive World Health Score (WHS).
     */
    calculateWorldHealth() {
        const h = this.getStatus();
        
        // Normalize Metrics to 0.0 - 1.0
        const m = {
            pop: Math.min(1.0, (h.world?.population || 0) / (window.VillageManager?.kingdomPopulation || 1)),
            inst: (h.political?.meanLegitimacy || 0) * (1.0 - (h.political?.schismDensity || 0)),
            info: (h.information?.truthFidelity || 0) / (1.0 + (h.information?.contamination || 0)),
            pol: 1.0 - Math.abs(0.2 - (h.political?.powerConcentration || 0.2)),
            econ: (h.world?.prosperity || 0) / 100,
            narr: 1.0 - (h.significance?.giniCoefficient || 0),
            fuel: h.fuel?.stability || 0
        };

        // Weighted Formula (Bible Weights)
        const whs = (
            (m.pop * 2) + 
            (m.inst * 1.5) + 
            (m.info * 1.5) + 
            (m.pol * 1) + 
            (m.econ * 1) + 
            (m.narr * 2) + 
            (m.fuel * 3)
        ) / 12 * 100;

        return {
            score: Math.floor(whs),
            category: this.getCivHealthCategory(whs),
            metrics: m
        };
    }

    getCivHealthCategory(score) {
        if (score >= 85) return 'EXCELLENT';
        if (score >= 60) return 'STABLE';
        if (score >= 40) return 'FRAGILE';
        if (score >= 20) return 'DECLINING';
        return 'COLLAPSE';
    }

    /**
     * STEP 3: AUTOMATED DIAGNOSTIC REPORTS
     * Generates actionable Director's Notes based on metric thresholds.
     */
    generateDiagnosticReport() {
        const health = this.calculateWorldHealth();
        const m = health.metrics;
        const notes = [];

        // 1. Fuel (Priority 1)
        if (m.fuel < 0.2) notes.push("CRITICAL: Global barrier collapse imminent. Essence reserves exhausted.");
        else if (m.fuel < 1.0) notes.push("WARNING: Fuel reserves dropping below 5-day safety margin.");

        // 2. Population
        if (m.pop < 0.5) notes.push("CRITICAL: Massive depopulation detected. Civilization viability threshold breached.");
        else if (m.pop < 0.85) notes.push("WARNING: Population volatility detected. Growth/Death ratio unstable.");

        // 3. Information
        if (m.info < 0.15) notes.push("CRITICAL: Epistemic Dark Age. Truth has been entirely superseded by contamination.");
        else if (m.info < 0.40) notes.push("WARNING: Information health declining. Misinformation is becoming the dominant world-state.");

        // 4. Institutional
        if (m.inst < 0.25) notes.push("CRITICAL: Institutional collapse. Legitimacy has failed; schisms are absolute.");
        else if (m.inst < 0.60) notes.push("WARNING: Institutional fragility. Legitimacy is eroding under schism pressure.");

        // 5. Political (HHI)
        const hhi = this.getStatus().political?.powerConcentration || 0.2;
        if (hhi > 0.9) notes.push("CRITICAL: Absolute Tyranny. Political plurality is extinct.");
        else if (hhi < 0.02) notes.push("CRITICAL: Political Anarchy. Institutional order has dissolved.");
        else if (hhi > 0.6) notes.push("WARNING: Dangerous power concentration detected.");
        else if (hhi < 0.05) notes.push("WARNING: Political fragmentation. House influence is too diluted for stability.");

        // 6. Prosperity
        if (m.econ < 0.15) notes.push("CRITICAL: Total Economic Collapse. Scarcity is absolute.");
        else if (m.econ < 0.40) notes.push("WARNING: Severe economic stress. Food security is declining.");

        // 7. Narrative
        if (m.narr < 0.1) notes.push("CRITICAL: Narrative Singularity. Meaning has been monopolized by a single entity.");
        else if (m.narr < 0.3) notes.push("WARNING: Narrative monopoly. Diversity of legends is dangerously low.");

        return {
            timestamp: Date.now(),
            day: window.EngineParams?.worldDay || 0,
            whs: health.score,
            category: health.category,
            notes: notes.length > 0 ? notes : ["Civilization state is stable. No critical interventions required."]
        };
    }
        const status = this.getStatus();
        const health = status.currentHealth;
        
        const scores = {
            stability: Math.floor(this.calculateStability(this.reports.years.slice(-10)) * 100),
            history: Math.floor((health.historical?.archiveDensity || 0) * 100 + (health.historical?.knowledgeHalfLife || 0)),
            civilization: Math.floor((health.world?.popStability || 1) * 100 - (health.world?.extinctionRisk || 0) * 100),
            information: Math.floor((health.information?.truthFidelity || 1) * 100 - (health.information?.contamination || 0) * 100),
            political: Math.floor((health.political?.meanLegitimacy || 1) * 100 - (health.political?.crisisRatio || 0) * 100),
            emergent: Math.floor((health.emergent?.culturalDiversity || 0) * 100 + (health.emergent?.powerCenterCount || 0) * 5),
        };

        // Overall Confidence calculation
        const overall = Math.floor(Object.values(scores).reduce((a, b) => a + b, 0) / 6);

        console.log("%c ================================================= ", "color: #fbbf24; font-weight: bold;");
        console.log("%c      1000 YEAR STRESS TEST SCORE (AUDIT)        ", "background: #1e1e1e; color: #fbbf24; font-weight: bold; padding: 5px;");
        console.log("%c ================================================= ", "color: #fbbf24; font-weight: bold;");
        console.log(`Simulation Stability:  ${scores.stability} / 100`);
        console.log(`Historical Simulation: ${scores.history} / 100`);
        console.log(`Civilization Evolution: ${scores.civilization} / 100`);
        console.log(`Information Economy:   ${scores.information} / 100`);
        console.log(`Political Simulation:  ${scores.political} / 100`);
        console.log(`Emergent Behavior:     ${scores.emergent} / 100`);
        console.log("%c ------------------------------------------------- ", "color: #4b5563;");
        console.log(`%c OVERALL CONFIDENCE:   ${overall} / 100`, "font-weight: bold; color: #4ade80;");
        console.log("%c ================================================= ", "color: #fbbf24; font-weight: bold;");

        return { scores, overall };
    }

    probeFuelHealth() {
        if (!window.VillageManager) return { globalEssence: 0, maintenanceCost: 0, stability: 1.0 };
        const villages = window.VillageManager.villages || [];
        const totalEssence = villages.reduce((acc, v) => acc + (v.stats?.essence || 0), 0);
        const totalCost = villages.reduce((acc, v) => acc + (v.fuelNeed || 0), 0) || 1;
        
        return {
            globalEssence: totalEssence,
            maintenanceCost: totalCost,
            stability: Math.min(1.0, totalEssence / (totalCost * 5)) // Normalized: 1.0 = 5 days of reserve
        };
    }

    getStatus() {
        return {
            world: this.probeWorldHealth(),
            information: this.probeInformationHealth(),
            political: this.probePoliticalHealth(),
            historical: this.probeHistoricalHealth(),
            significance: this.probeSignificanceHealth(),
            dunes: this.probeDuneHealth(),
            emergent: this.probeEmergentHealth(),
            fuel: this.probeFuelHealth()
        };
    }

    probeHistoricalHealth() {
        if (!window.ChronicleManager || !window.FolkloreEngine) return { mythicDrift: 0, knowledgeHalfLife: 0, archiveDensity: 0 };
        
        const poems = window.FolkloreEngine.anthology || [];
        const avgDrift = poems.length > 0 ? 
            poems.reduce((acc, p) => acc + (p.distortionLevel || 0), 0) / poems.length : 0;
            
        const totalIntel = window.IntelManager?.registry.size || 1;
        const archivedIntel = window.IntelManager?.archive.size || 0;
        
        const legends = window.GameState?.legends?.length || 0;

        return {
            mythicDrift: avgDrift,
            knowledgeHalfLife: archivedIntel / totalIntel,
            archiveDensity: (archivedIntel + legends) / 100 // Density per century approx
        };
    }
}

window.WorldObservatory = new WorldObservatory();
window.WorldObservatory.init();
