/**
 * Regional Vitality Observatory
 * 
 * Monitors the "pulse" of the world: population movement, 
 * economic density, and cultural significance to detect 
 * regional flourishing or irrelevance.
 */
export class RegionalVitalityObservatory {
    constructor(world) {
        this.world = world;
        this.regions = new Map(); // RegionId -> VitalityData
    }

    /**
     * Process a tick to update vitality metrics for all regions.
     */
    updateVitalityMetrics(settlement) {
        const id = settlement.id || 'Global';
        const actors = settlement.getActors();
        
        const data = {
            populationDensity: actors.length,
            migrationRate: this.calculateMigrationRate(settlement),
            significanceDensity: this.calculateSignificance(settlement),
            tradeDensity: settlement.tradeVolume || 0,
            informationDensity: this.calculateInfoDensity(settlement),
            timestamp: Date.now()
        };

        const vitalityScore = this.calculateVitalityScore(data);
        data.vitalityScore = vitalityScore;
        data.status = this.determineStatus(vitalityScore);

        this.regions.set(id, data);
        return data;
    }

    calculateMigrationRate(settlement) {
        // Net flow of actors (arriving vs departing/dying)
        // Ensure values are numbers
        const arrivals = Number(settlement.arrivals || 0);
        const departures = Number(settlement.departures || 0);
        const deaths = Number(settlement.deaths || 0);
        return arrivals - departures - deaths;
    }

    calculateSignificance(settlement) {
        // Sum of prestige, wealth, and cultural belief systems
        const actors = settlement.getActors();
        const totalPrestige = actors.reduce((acc, a) => acc + (a.prestige || 0), 0);
        const beliefSystems = settlement.culture?.beliefSystems?.length || 0;
        return (totalPrestige * 0.1) + (beliefSystems * 5.0);
    }

    calculateInfoDensity(settlement) {
        // Higher trait diversity and more belief adopters = higher info density
        const tdi = settlement.calculateTraitDiversityIndex ? settlement.calculateTraitDiversityIndex() : 0.5;
        const totalAdopters = settlement.culture?.beliefSystems?.reduce((acc, s) => acc + s.adopters.size, 0) || 0;
        return (tdi * 10) + (totalAdopters * 0.5);
    }

    calculateVitalityScore(data) {
        return (data.populationDensity * 0.2) + 
               (data.migrationRate * 0.1) + 
               (data.significanceDensity * 0.3) + 
               (data.tradeDensity * 0.2) + 
               (data.informationDensity * 0.2);
    }

    determineStatus(score) {
        if (score > 80) return 'Flourishing Metropolis';
        if (score > 40) return 'Stable Settlement';
        if (score > 10) return 'Struggling Outpost';
        return 'Ghost Town / Irrelevant';
    }

    /**
     * Determine: Are parts of the world becoming irrelevant?
     */
    generateVitalityReport() {
        const entries = Array.from(this.regions.entries());
        const ghostTowns = entries.filter(([id, data]) => data.status === 'Ghost Town / Irrelevant');
        const metropolis = entries.filter(([id, data]) => data.status === 'Flourishing Metropolis');

        return {
            title: "Regional Vitality Observatory Report",
            summary: {
                totalActiveRegions: this.regions.size,
                metropolisCount: metropolis.length,
                ghostTownCount: ghostTowns.length,
                globalVitalityMean: entries.reduce((acc, [id, d]) => acc + d.vitalityScore, 0) / (this.regions.size || 1)
            },
            irrelevanceAlert: ghostTowns.map(([id, data]) => ({
                regionId: id,
                lastScore: data.vitalityScore.toFixed(2),
                primaryCause: data.populationDensity === 0 ? "Depopulation" : "Cultural Stagnation"
            })),
            conclusion: ghostTowns.length > 0 ? 
                "Parts of the world are decaying into irrelevance as Significance and Information densities collapse." :
                "The world's vital signs are stable; no significant irrelevance detected."
        };
    }
}
