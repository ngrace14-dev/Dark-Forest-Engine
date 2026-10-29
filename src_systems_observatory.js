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
            information: { 
                truthFidelity: 1.0, 
                propagationVelocity: 0, 
                contamination: 0,
                mythicDrift: 0,
                infectionRate: 0,
                ownershipGini: 0,
                scarcityIndex: 0,
                historicalSurvivalRate: 1.0,
                lifecycle: {
                    events: 0,
                    witnesses: 0,
                    intel: 0,
                    rumors: 0,
                    verifications: 0,
                    truths: 0,
                    history: 0,
                    folklore: 0
                }
            },
            political: { 
                meanLegitimacy: 1.0, 
                powerConcentration: 0, 
                conflictFrequency: 0,
                institutionalAnxiety: 0,
                narrativeGap: 0,
                identityDrift: 0,
                successionStability: 1.0,
                sovereigntyIndex: 0
            },
            historical: { mythicDrift: 0, knowledgeHalfLife: 0, archiveDensity: 0 },
            significance: { giniCoefficient: 0, inflationRate: 0, anchorDensity: 0 },
            dunes: { explorationDensity: 0, successRate: 0, avgSignificance: 0, dominantSurvivorTrait: 'NONE' },
            emergent: { rogueVillageRatio: 0, culturalDiversity: 0, tradeEmpireCount: 0, cascadeIntensity: 0 }
        };
    }

    init() {
        window.EventBus.on('HEARTBEAT_T1', () => this.runDailyProbe());
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordEpochReport());
        
        // --- EPISTEMIC HEATMAP LISTENERS ---
        window.EventBus.on('CMD_TOGGLE_HEATMAP', () => {
            window.EventBus.emit('TOGGLE_EPISTEMIC_HEATMAP');
        });

        this.checkAlerts();

        console.log("🔭 [OBSERVATORY] System Online. Monitoring the threads of time.");
        console.log("%c[Observatory] Epistemic Heatmap available: window.EventBus.emit('CMD_TOGGLE_HEATMAP')", "color: #3b82f6;");
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
                emergent: this.probeEmergentHealth(),
                adversarial: this.probeAdversarialHealth(),
                divergence: this.probeDivergenceHealth(),
                community: this.probeCommunityHealth()
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
        const archive = Array.from(window.IntelManager.archive.values());
        const total = registry.length + archive.length || 1;
        
        const facts = registry.filter(i => i.type === 'FACT');
        const rumors = registry.filter(i => i.type === 'RUMOR');
        
        // --- 1.1 INFORMATION CYCLE TELEMETRY ---
        const lifecycle = {
            events: window.ChronicleManager?.worldLedger.length || 0,
            witnesses: registry.reduce((acc, i) => acc + (i.provenance?.origin ? 1 : 0), 0),
            intel: registry.length,
            rumors: rumors.length,
            verifications: registry.filter(i => i.supersedes_intel_id !== null).length,
            truths: facts.filter(i => i.truth_state === 'TRUE').length,
            history: archive.length,
            folklore: window.FolkloreEngine?.anthology.length || 0
        };

        // --- 1.2 TRUTH FIDELITY (GLOBAL BELIEF DISTRIBUTION) ---
        let totalGlobalBeliefs = 0;
        let totalTrueBeliefs = 0;
        
        if (window.IntelManager.ownershipRegistry) {
            for (const [intelId, owners] of window.IntelManager.ownershipRegistry.entries()) {
                const intel = window.IntelManager.lookup(intelId);
                if (!intel) continue;
                
                const count = owners.size;
                totalGlobalBeliefs += count;
                if (intel.truth_state === 'TRUE') {
                    totalTrueBeliefs += count;
                }
            }
        }
        
        const truthFidelity = totalGlobalBeliefs > 0 ? totalTrueBeliefs / totalGlobalBeliefs : 1.0;
        const globalScarcity = Math.max(0, 1.0 - (registry.length / (window.VillageManager?.kingdomPopulation || 1)));

        // --- 1.2 KNOWLEDGE HALF-LIFE (APPROXIMATION) ---
        const day = window.EngineParams?.worldDay || 0;
        const deceasedIntel = archive.filter(i => i.persistence === 'FORGOTTEN' || i.persistence === 'ARCHIVED');
        const avgAgeAtArchival = deceasedIntel.length > 0 ? 
            deceasedIntel.reduce((acc, i) => acc + (i.archivedAtDay - i.payload.timestamp_day), 0) / deceasedIntel.length : 0;

        // 2. Propagation Velocity (Estimate)
        const avgTransmission = registry.reduce((acc, i) => acc + (i.provenance?.transmission_count || 0), 0) / (registry.length || 1);

        // 3. Contamination: Percentage of rumors with certainty > 0.5 that are actually FALSE (if we had truth_state)
        const falseRumors = rumors.filter(i => i.truth_state === 'FALSE' && i.certainty > 0.5).length;
        const contamination = falseRumors / (rumors.length || 1);

        // 4. Misinformation Persistence
        // Average age of FALSE facts
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

        // --- 1.3 MYTHIC DRIFT ---
        const poems = window.FolkloreEngine?.anthology || [];
        const avgDrift = window.FolkloreEngine?.mythicDriftStats ? 
            (window.FolkloreEngine.mythicDriftStats.totalDrift / (window.FolkloreEngine.mythicDriftStats.crystallizationCount || 1)) : 0;
        
        const mythicDrift = Math.max(avgDrift, poems.length > 0 ? 
            poems.reduce((acc, p) => acc + (p.distortionLevel || 0), 0) / poems.length : 0);

        // --- 1.3 INFECTION RATE (ESTIMATED DELTA) ---
        // Measures how many new ownership links were created compared to the total intel count
        const totalOwnershipLinks = Array.from(window.IntelManager.ownershipRegistry.values()).reduce((acc, set) => acc + set.size, 0);
        const lastLinks = this._lastTotalLinks || totalOwnershipLinks;
        const infectionRate = (totalOwnershipLinks - lastLinks) / (lifecycle.intel || 1);
        this._lastTotalLinks = totalOwnershipLinks;

        // --- 1.4 INFORMATION OWNERSHIP (GINI) ---
        const ownershipCounts = new Map(); // node_id -> intel_count
        if (window.IntelManager.ownershipRegistry) {
            for (const [intelId, owners] of window.IntelManager.ownershipRegistry.entries()) {
                owners.forEach(nodeId => {
                    ownershipCounts.set(nodeId, (ownershipCounts.get(nodeId) || 0) + 1);
                });
            }
        }
        const counts = Array.from(ownershipCounts.values()).sort((a, b) => a - b);
        let ownershipGini = 0;
        if (counts.length > 0) {
            const n = counts.length;
            let sum = 0;
            for (let i = 1; i <= n; i++) sum += (n + 1 - i) * counts[i - 1];
            const totalCounts = counts.reduce((a, b) => a + b, 0);
            ownershipGini = (n + 1 - 2 * (sum / (totalCounts || 1))) / n;
        }

        // --- 1.4 SCARCITY INDEX ---
        const popSize = window.VillageManager?.kingdomPopulation || 1;
        const scarcityIndex = Math.max(0, 1.0 - (lifecycle.intel / popSize));

        // --- 1.5 HISTORICAL SURVIVAL RATE ---
        const hsr = this.currentHealth.information?.historicalSurvivalRate || 1.0;

        return {
            truthFidelity,
            avgTransmission,
            contamination,
            mythicDrift,
            infectionRate,
            ownershipGini,
            scarcityIndex,
            historicalSurvivalRate: hsr,
            misinfoPersistence: isNaN(avgMisinfoAge) ? 0 : avgMisinfoAge,
            knowledgeHalfLife: avgAgeAtArchival,
            siloRatio: siloedCount / (total || 1),
            lifecycle
        };
    }

    probePoliticalHealth() {
        if (!window.DynastyManager) return {};
        const houses = Array.from(window.DynastyManager.houses.values());
        if (houses.length === 0) return { meanLegitimacy: 0, powerConcentration: 0 };

        // --- STEP 9-4: WAR TELEMETRY ---
        const totalWarExhaustion = window.TotalWar?.stats.warExhaustion || 0;
        const totalCasualties = window.TotalWar?.stats.totalCasualties || 0;
        const activeSieges = window.TotalWar?.sieges.size || 0;

        const totalPrestige = houses.reduce((acc, h) => acc + (h.prestige || 0), 0) || 1;
// ... existing metrics ...
        const hhi = houses.reduce((acc, h) => acc + Math.pow((h.prestige || 0) / totalPrestige, 2), 0);
        
        const meanLegitimacy = houses.reduce((acc, h) => acc + (h.legitimacy || 0), 0) / houses.length;
        
        // --- 3.1 INSTITUTIONAL ANXIETY & STABILITY ---
        const institutionalAnxiety = houses.reduce((acc, h) => acc + (h.exposureAnxiety || 0), 0) / houses.length;
        const narrativeGap = houses.reduce((acc, h) => acc + (h.narrativeGap || 0), 0) / houses.length;
        const identityDrift = houses.reduce((acc, h) => acc + (h.identityDrift || 0), 0) / houses.length;
        const sovereigntyIndex = houses.reduce((acc, h) => acc + (h.sovereignty || 0), 0) / houses.length;

        // 1. Legitimacy Crisis: % of houses below 0.3 legitimacy
        const housesInCrisis = houses.filter(h => h.legitimacy < 0.3).length;
        
        // 2. Schism Density: % of houses with active schisms
        const activeSchisms = houses.filter(h => h.activeSchism).length;

        // 3. Feud Intensity
        const feudCount = window.DynastyManager.feuds?.length || 0;
        const avgFeudIntensity = feudCount > 0 ? 
            window.DynastyManager.feuds.reduce((acc, f) => acc + (f.intensity || 0), 0) / feudCount : 0;

        // 4. Succession Stability
        // Based on recent chronicle events in the last year
        const day = window.EngineParams?.worldDay || 0;
        const recentSuccessions = (window.ChronicleManager?.worldLedger || []).filter(e => 
            e.type === 'SUCCESSION' && e.timestamp.day > day - 365
        );
        const peacefulSuccessions = recentSuccessions.filter(e => !e.detail.includes('violent') && !e.detail.includes('coup')).length;
        const successionStability = recentSuccessions.length > 0 ? peacefulSuccessions / recentSuccessions.length : 1.0;

        const blessedCount = houses.filter(h => h.isBlessed).length;

        return {
            meanLegitimacy,
            powerConcentration: hhi,
            crisisRatio: housesInCrisis / houses.length,
            schismDensity: activeSchisms / houses.length,
            feudVolatility: feudCount * avgFeudIntensity,
            blessedRatio: blessedCount / houses.length,
            institutionalAnxiety,
            narrativeGap,
            identityDrift,
            successionStability,
            sovereigntyIndex,
            warExhaustion: totalWarExhaustion,
            casualties: totalCasualties,
            activeSieges
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
        
        // --- 1.5 SURVIVAL CALCULATION ---
        const registry = window.IntelManager?.registry || new Map();
        const archive = window.IntelManager?.archive || new Map();
        
        // Tally significant records (Significance > 50) that existed before the shift
        // We estimate this by checking records in archive created in previous epochs
        const survivingInArchive = Array.from(archive.values()).filter(i => i.epoch_created < epoch).length;
        const currentActive = Array.from(registry.values()).length;
        
        // Historical Survival Rate: How much of the "Total Knowledge" survived into the archive
        // In a healthy civ, significant facts are archived before they are purged.
        const hsr = this._lastTotalSignificant > 0 ? survivingInArchive / this._lastTotalSignificant : 1.0;
        
        // Update live health state
        if (!this.currentHealth.information) this.currentHealth.information = {};
        this.currentHealth.information.historicalSurvivalRate = hsr;

        const report = {
            type: 'EPOCH',
            epoch,
            day,
            historicalSurvivalRate: hsr,
            knowledgeRetained: survivingInArchive,
            activeIntel: currentActive,
            stabilityIndex: this.calculateWorldHealth().score / 100,
            reconstructionSuccess: this.probeReconstructionSuccess()
        };
        
        this.reports.epochs.push(report);
        
        if (hsr < 0.15) {
            window.EventBus.emit('UI_LOG', "⚠️ [BUREAU ALERT] HISTORICAL COLLAPSE: Civilization has entered a state of amnesia.");
            this.triggerAlert('HISTORICAL COLLAPSE', `Survival Rate: ${(hsr * 100).toFixed(1)}%. Previous epoch records have been largely erased.`);
        } else {
            window.EventBus.emit('UI_LOG', `[OBSERVATORY] Epoch ${epoch} Reconstruction Report: Hsr ${(hsr * 100).toFixed(1)}%.`);
        }

        window.EventBus.emit('OBSERVATORY_REPORT_EPOCH', report);
        
        // Prepare for next epoch tally
        this._lastTotalSignificant = Array.from(registry.values()).filter(i => (i.significance.historical + (i.significance.crow || 0)) > 50).length;
    }

    probeReconstructionSuccess() {
        // Evaluate if major pillars survived the Shift
        return 0.85; // Mock for now
    }

    calculateAverages(data, key = 'metrics') {
        if (!data || data.length === 0) return {};
        const first = data[0][key];
        if (!first) return {};
        
        const result = JSON.parse(JSON.stringify(first));

        // Nested average calculation with hardening
        for (const category in result) {
            if (typeof result[category] !== 'object') continue;
            for (const metric in result[category]) {
                const sum = data.reduce((acc, entry) => {
                    const val = entry[key]?.[category]?.[metric];
                    return acc + (typeof val === 'number' ? val : 0);
                }, 0);
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

    probeAdversarialHealth() {
        if (!window.AED) return {};
        return window.AED.generateObservabilityReport();
    }

    probeDivergenceHealth() {
        if (!window.CDO) return {};
        return window.CDO.metrics;
    }

    probeCommunityHealth() {
        if (!window.CMB) return {};
        return window.CMB.metrics;
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
            fuel: h.fuel?.stability || 0,
            
            // Expanded Info Metrics for UI
            info_gini: h.information?.ownershipGini || 0,
            info_scarcity: h.information?.scarcityIndex || 0,
            info_silo: h.information?.siloRatio || 0
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
        if (!health || !health.metrics) return { whs: 0, category: 'COLLAPSE', notes: ["Directorate Failure: Unable to calculate health metrics."] };
        
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
    checkAlerts() {
        // ALERT: HISTORICAL COLLAPSE (H_sr < 0.15)
        if (this.currentHealth.information?.historicalSurvivalRate < 0.15) {
            this.triggerAlert('HISTORICAL COLLAPSE', 'Civilization has Amnesia. Lessons of previous epochs are being deleted.');
        }

        // ALERT: RUMOR DOMINANCE (T_f < 0.3)
        if (this.currentHealth.information?.truthFidelity < 0.3) {
            this.triggerAlert('RUMOR DOMINANCE', 'NPCs are acting on false information 70% of the time.');
        }

        // ALERT: TRUTH EXTINCTION
        window.EventBus.on('INTEL_EXTINGUISHED', (id) => {
            const intel = window.IntelManager.lookup(id);
            this.triggerAlert('TRUTH EXTINCTION', `Critical knowledge "${intel?.payload.title}" has been physically lost to the world.`);
        });
    }

    triggerAlert(type, message) {
        window.EventBus.emit('OBSERVATORY_ALERT', { type, message, timestamp: Date.now() });
        console.warn(`%c[OBSERVATORY ALERT: ${type}] %c${message}`, "color: #ef4444; font-weight: bold;", "color: #fca5a5;");
    }
    generateFinalAudit() {
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
