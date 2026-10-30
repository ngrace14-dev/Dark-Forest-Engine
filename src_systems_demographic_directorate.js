/**
 * File: src_systems_demographic_directorate.js
 * Demographic Evolution Directorate (DED)
 * 
 * Objective: 
 * Monitor and analyze the vital statistics of the Dark Forest civilization.
 * Tracks Birth Rates, Death Rates, Lineage Persistence, and Migration.
 */

class DemographicDirectorate {
    constructor() {
        this.history = {
            population: [], // { day, total, byVillage: {} }
            events: [],     // { day, type: 'BIRTH'|'DEATH'|'MIGRATION'|'EXTINCTION', count, houseId }
            houseVitality: new Map() // houseId -> { members: 0, generation: 0, status: 'STABLE'|'ENDANGERED'|'EXTINCT' }
        };

        this.metrics = {
            birthRate: 0,
            deathRate: 0,
            migrationVolatility: 0,
            lineagePersistence: 1.0,
            generationalDensity: 0,
            demographicStability: 1.0
        };

        this.config = {
            samplingInterval: 14, // Sample every Shift
            persistenceThreshold: 0.2 // Percentage of total pop for a bloodline to be considered stable
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        // Listen for demographic triggers
        window.EventBus.on('ENTITY_DIED', (data) => this.recordDeath(data));
        window.EventBus.on('SUCCESSION', (data) => this.recordSuccession(data));
        window.EventBus.on('CULTURAL_SHIFT', (data) => this.recordCulturalImpact(data));
        
        // Tier 2: Periodic Sampling (Shift-based)
        window.EventBus.on('HEARTBEAT_T6H', (data) => {
            const scale = data.simScale || 1.0;
            // Accelerated simulation means we need to simulate births/deaths to keep up with SimScale
            if (data.isAccelerated && scale > 1.0) {
                this._simulateAcceleratedEvents(scale);
            }
            this.samplePopulation();
        });
        window.EventBus.on('SHIFT_COMPLETE', () => this.analyzeVitality());

        window.EventBus.emit('UI_LOG', '[Directorate] Demographic Evolution Monitoring Online');
    }

    /**
     * TIER 1: TRACKERS
     */

    samplePopulation() {
        if (!window.VillageManager) return;
        const day = window.EngineParams?.worldDay || 0;
        const villages = window.VillageManager.villages;
        
        const snapshot = {
            day,
            total: 0,
            byVillage: {},
            ageCohorts: { CHILD: 0, ADOLESCENT: 0, ADULT: 0, ELDER: 0 },
            houseDensity: {}
        };

        villages.forEach(v => {
            snapshot.total += v.population.current;
            snapshot.byVillage[v.id] = v.population.current;
        });

        // Sample Age Cohorts from PersonhoodManager
        if (window.PersonhoodManager) {
            window.PersonhoodManager.profiles.forEach(p => {
                const stage = p.lifeStage || 'ADULT';
                snapshot.ageCohorts[stage === 'PRIME_ELDER' || stage === 'VENERABLE' ? 'ELDER' : stage]++;
                
                if (p.houseId) {
                    snapshot.houseDensity[p.houseId] = (snapshot.houseDensity[p.houseId] || 0) + 1;
                }
            });
        }

        this.history.population.push(snapshot);
        if (this.history.population.length > 50) this.history.population.shift();

        this.calculateRates();
    }

    recordDeath(data) {
        this.history.events.push({
            day: window.EngineParams?.worldDay || 0,
            type: 'DEATH',
            entityId: data.id,
            houseId: data.houseId,
            cause: data.cause || 'UNKNOWN'
        });
        
        // Memory safety: Prune events older than 100 entries or 1 year
        if (this.history.events.length > 500) this.history.events.shift();
    }

    recordSuccession(data) {
        // data usually contains houseId, oldLeader, newLeader
        const houseId = data.actorId;
        const stats = this.history.houseVitality.get(houseId) || { members: 0, generation: 0, status: 'STABLE' };
        stats.generation++;
        this.history.houseVitality.set(houseId, stats);
    }

    /**
     * TIER 2: ANALYSIS (The "Determine" Phase)
     */

    calculateRates() {
        if (this.history.population.length < 2) return;
        
        const latest = this.history.population[this.history.population.length - 1];
        const previous = this.history.population[this.history.population.length - 2];
        const dayDelta = latest.day - previous.day || 1;

        // 1. Notable Death Rate (Tracked individual deaths)
        const notableDeaths = this.history.events.filter(e => e.day > previous.day && e.type === 'DEATH').length;
        this.metrics.notableDeathRate = notableDeaths / dayDelta;

        // 2. Net Population Change Rate
        const netChange = latest.total - previous.total;
        this.metrics.netGrowthRate = netChange / dayDelta;

        // 3. Implied Birth Rate (Approx: Net Change + Notable Deaths)
        // Note: This doesn't account for background deaths in VillageManager (e.g. Famine)
        this.metrics.birthRate = Math.max(0, (netChange + notableDeaths) / dayDelta);
        this.metrics.deathRate = notableDeaths / dayDelta;

        // 4. Generational Density (Ratio of Adults to Tracked Population)
        const totalTracked = Object.values(latest.ageCohorts).reduce((a, b) => a + b, 0) || 1;
        this.metrics.generationalDensity = latest.ageCohorts.ADULT / totalTracked;

        // 5. Demographic Stability
        // 1.0 is replacement. < 1.0 is declining. > 1.0 is growing.
        this.metrics.demographicStability = (this.metrics.deathRate > 0) ? 
            (this.metrics.birthRate / this.metrics.deathRate) : 
            (this.metrics.birthRate > 0 ? 2.0 : 1.0);
            
        this.metrics.isGrowing = netChange > 0;
    }

    analyzeVitality() {
        if (!window.DynastyManager) return;
        
        const latest = this.history.population[this.history.population.length - 1];
        if (!latest) return;

        window.DynastyManager.houses.forEach(house => {
            const memberCount = latest.houseDensity[house.id] || 0;
            let status = 'STABLE';
            
            if (memberCount === 0) status = 'EXTINCT';
            else if (memberCount < 3) status = 'ENDANGERED'; // Lowered threshold for "notable" count
            else if (memberCount < 10) status = 'FRAGILE';

            this.history.houseVitality.set(house.id, {
                members: memberCount,
                generation: house.lineage ? house.lineage.length : 0,
                status: status
            });

            if (status === 'EXTINCT' && !house._extinctionLogged) {
                window.EventBus.emit('UI_LOG', `[DIRECTORATE] CRITICAL: Bloodline of ${house.name} has vanished.`);
                house._extinctionLogged = true;
            }
        });

        window.EventBus.emit('DEMOGRAPHIC_REPORT', {
            metrics: this.metrics,
            vitality: Object.fromEntries(this.history.houseVitality),
            trend: this.getPopulationTrend()
        });
    }

    getPopulationTrend() {
        if (this.history.population.length < 5) return 0;
        const recent = this.history.population.slice(-5);
        const start = recent[0].total;
        const end = recent[recent.length - 1].total;
        return (end - start) / start;
    }

    /**
     * TIER 3: MEASUREMENT (Output for Observatory)
     */

    getObservatoryMetrics() {
        return {
            health: {
                populationHealth: this.metrics.demographicStability > 0.8 ? 'OPTIMAL' : 'CRITICAL',
                demographicStability: this.metrics.demographicStability,
                lineagePersistence: this.calculateLineagePersistence(),
                generationalDensity: this.metrics.generationalDensity
            },
            status: {
                isGrowing: this.metrics.isGrowing,
                housesAtRisk: Array.from(this.history.houseVitality.values()).filter(v => v.status === 'ENDANGERED').length,
                extinctHouses: Array.from(this.history.houseVitality.values()).filter(v => v.status === 'EXTINCT').length
            }
        };
    }

    calculateLineagePersistence() {
        const vitality = Array.from(this.history.houseVitality.values());
        if (vitality.length === 0) return 1.0;
        const extinct = vitality.filter(v => v.status === 'EXTINCT').length;
        return 1.0 - (extinct / vitality.length);
    }

    recordCulturalImpact(data) {
        // Record how cultural shifts impact migration or birth rates
        this.history.events.push({
            day: window.EngineParams?.worldDay || 0,
            type: 'CULTURAL_IMPACT',
            detail: data.detail
        });
    }

    /**
     * TIER 4: ACCELERATED SIMULATION LOGIC
     */
    _simulateAcceleratedEvents(scale) {
        // In millennium mode, individual entity ticks are too slow.
        // We simulate "Batch Deaths" and "Batch Births" based on current stability.
        const baseDeathRate = 0.005; // 0.5% daily mortality
        const currentStability = this.metrics.demographicStability || 1.0;
        
        const population = this.history.population[this.history.population.length - 1]?.total || 100;
        
        // Scale probability by simScale (e.g. 10x scale means 10x the death/birth chance per real tick)
        const deaths = Math.floor(population * baseDeathRate * scale * (1.0 / currentStability));
        const births = Math.floor(population * baseDeathRate * scale * currentStability);

        if (deaths > 0 && window.VillageManager) {
            // Apply deaths across random villages
            for(let i=0; i<deaths; i++) {
                const v = window.VillageManager.villages[Math.floor(Math.random()*window.VillageManager.villages.length)];
                if (v && v.population.current > 0) {
                    v.population.current--;
                    this.recordDeath({ id: 'sim_death', cause: 'SIMULATED_ATTRITION' });
                }
            }
        }

        if (births > 0 && window.VillageManager) {
            for(let i=0; i<births; i++) {
                const v = window.VillageManager.villages[Math.floor(Math.random()*window.VillageManager.villages.length)];
                if (v) v.population.current++;
            }
        }
    }
}

window.DemographicDirectorate = new DemographicDirectorate();
export default window.DemographicDirectorate;
