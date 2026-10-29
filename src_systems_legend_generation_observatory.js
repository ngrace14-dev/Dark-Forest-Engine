/**
 * File: src_systems_legend_generation_observatory.js
 * Crow Significance Directorate (CSD)
 * 
 * Objective: 
 * Determine whether heroic generations renew themselves or stagnate.
 * Tracks the birth, death, and replacement of legends.
 */

class LegendGenerationObservatory {
    constructor() {
        this.legends = new Map(); // Map<legendId, LegendStats>
        this.renewalMetrics = {
            heroTurnover: 0,         // Rate of legend death vs new legend birth
            legendRenewalRate: 0,    // % of legends that successfully pass significance to a successor
            narrativeDiversity: 0,   // Spread of legend types/archetypes
            candidatePoolHealth: 0,  // Count of high-significance NPCs who are not yet legends
            ancientHeroDominance: 0  // Ratio of legacy legends to new ones
        };

        this.stats = {
            totalLegendsBorn: 0,
            totalLegendsDied: 0,
            renewedLegends: 0,
            activeLegends: 0,
            legendArchetypes: {}
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        // 1. Legend Birth
        window.EventBus.on('LEGEND_CREATED', (legend) => this.onLegendBorn(legend));
        
        // 2. Legend Death
        window.EventBus.on('ENTITY_DIED', (entity) => this.onEntityDied(entity));

        // 2.5 Potential Legend Progress
        window.EventBus.on('POTENTIAL_LEGEND_IMPACT', () => this.calculateMetrics());
        
        // 3. Story Density Transfer
        window.EventBus.on('LEGACY_HARVESTED', (data) => this.onLegacyHarvested(data));

        // Periodic Check
        window.EventBus.on('SHIFT_COMPLETE', () => this.auditGenerationHealth());

        window.EventBus.emit('UI_LOG', '[Directorate] Legend Generation Observatory Active');
    }

    onLegendBorn(legend) {
        this.stats.totalLegendsBorn++;
        this.stats.activeLegends++;
        
        this.legends.set(legend.id, {
            id: legend.id,
            actorId: legend.actorId,
            bornDay: window.EngineParams?.worldDay || 0,
            diedDay: null,
            archetype: legend.archetype || 'UNKNOWN',
            power: legend.power || 0,
            isRenewed: false,
            generation: 1
        });

        // Track archetypes
        const arch = legend.archetype || 'UNKNOWN';
        this.stats.legendArchetypes[arch] = (this.stats.legendArchetypes[arch] || 0) + 1;
        
        this.calculateMetrics();
    }

    onEntityDied(entity) {
        // Find if this entity was a legend
        let foundLegendId = null;
        this.legends.forEach((stats, id) => {
            if (stats.actorId === entity.id && !stats.diedDay) {
                foundLegendId = id;
            }
        });

        if (foundLegendId) {
            const stats = this.legends.get(foundLegendId);
            stats.diedDay = window.EngineParams?.worldDay || 0;
            this.stats.totalLegendsDied++;
            this.stats.activeLegends--;
            
            window.EventBus.emit('UI_LOG_DEBUG', `[DIRECTORATE] Legend Fallen: ${entity.id}. Tracking for renewal.`);
            window.EventBus.emit('LEGEND_FALLEN', { legendId: foundLegendId, actorId: entity.id });
        }
    }

    onLegacyHarvested(data) {
        // data: { bloodlineId, significance, generation }
        // If significance is high (> 500) and generation > 1, count as a renewal
        if (data.generation > 1 && data.significance > 500) {
            this.stats.renewedLegends++;
            
            // Mark the newest legend of this bloodline as "Renewed"
            this.legends.forEach((stats) => {
                const profile = window.LegacyManager?.activeLegacies.get(stats.actorId);
                if (profile && profile.bloodlineId === data.bloodlineId && !stats.isRenewed) {
                    stats.isRenewed = true;
                    stats.generation = data.generation;
                }
            });
        }
        this.calculateMetrics();
    }

    auditGenerationHealth() {
        // Measure Candidate Pool: NPCs with > 300 significance who aren't legends yet
        let highSignificanceNPCs = 0;
        if (window.LegacyManager) {
            window.LegacyManager.activeLegacies.forEach(legacy => {
                if (legacy.storyDensity > 300 && legacy.id !== 'player') {
                    // Check if they are already a legend
                    const isLegend = Array.from(this.legends.values()).some(l => l.actorId === legacy.id);
                    if (!isLegend) highSignificanceNPCs++;
                }
            });
        }
        this.renewalMetrics.candidatePoolHealth = highSignificanceNPCs;

        this.calculateMetrics();
        this.emitReport();
    }

    calculateMetrics() {
        const total = this.stats.totalLegendsBorn || 1;
        
        // Hero Turnover: Deaths per Births (long-term ratio)
        this.renewalMetrics.heroTurnover = this.stats.totalLegendsBorn > 0 ? 
            this.stats.totalLegendsDied / this.stats.totalLegendsBorn : 0;

        // Legend Renewal Rate: % of dead legends that passed on their story
        this.renewalMetrics.legendRenewalRate = this.stats.totalLegendsDied > 0 ?
            this.stats.renewedLegends / this.stats.totalLegendsDied : 0;

        // Narrative Diversity: Shannon entropy of archetypes
        const archetypeCounts = Object.values(this.stats.legendArchetypes);
        if (archetypeCounts.length > 0) {
            const sum = archetypeCounts.reduce((a, b) => a + b, 0);
            this.renewalMetrics.narrativeDiversity = archetypeCounts.reduce((acc, count) => {
                const p = count / sum;
                return acc - (p * Math.log2(p));
            }, 0);
        }

        // Ancient Hero Dominance: Ratio of legends with generation > 3 to total
        let ancientCount = 0;
        this.legends.forEach(l => {
            if (l.generation > 3 && !l.diedDay) ancientCount++;
        });
        this.renewalMetrics.ancientHeroDominance = this.stats.activeLegends > 0 ? 
            ancientCount / this.stats.activeLegends : 0;
    }

    getLegendObservatoryReport() {
        return {
            title: "Legend Generation Observatory",
            timestamp: window.EngineParams?.worldDay || 0,
            metrics: this.renewalMetrics,
            stats: this.stats,
            anomalies: this.detectAnomalies()
        };
    }

    detectAnomalies() {
        const anomalies = [];
        if (this.renewalMetrics.ancientHeroDominance > 0.7) {
            anomalies.push("ANCIENT_HERO_DOMINANCE: Narrative is stagnating around multi-generational bloodlines.");
        }
        if (this.renewalMetrics.candidatePoolHealth < 2 && this.stats.activeLegends < 5) {
            anomalies.push("HERO_SCARCITY: The world is failing to produce high-significance candidates.");
        }
        if (this.renewalMetrics.heroTurnover > 1.5) {
            anomalies.push("NARRATIVE_STAGNATION: Legends are dying faster than they can be replaced.");
        }
        return anomalies;
    }

    emitReport() {
        const report = this.getLegendObservatoryReport();
        console.log(`%c --- ${report.title} ---`, "color: #8b5cf6; font-weight: bold;");
        console.log(`Hero Turnover:        ${report.metrics.heroTurnover.toFixed(2)}`);
        console.log(`Legend Renewal Rate:  ${(report.metrics.legendRenewalRate * 100).toFixed(1)}%`);
        console.log(`Candidate Pool:       ${report.metrics.candidatePoolHealth} candidates`);
        console.log(`Narrative Diversity:  ${report.metrics.narrativeDiversity.toFixed(2)}`);
        
        if (report.anomalies.length > 0) {
            report.anomalies.forEach(a => console.warn(`[DIRECTORATE] ${a}`));
        }
        console.log("%c -------------------------------", "color: #8b5cf6;");
        
        window.EventBus.emit('LEGEND_GENERATION_REPORT', report);
    }
}

window.LegendGenerationObservatory = new LegendGenerationObservatory();
export default window.LegendGenerationObservatory;
