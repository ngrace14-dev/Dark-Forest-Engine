/**
 * File: src/systems/dune_drift.js
 * The Laniakea Dune Drift & Memory Economy Engine (Bible §11, Addendum AC, CA-14)
 */

class DuneDriftSystem {
    constructor() {
        this.metrics = {
            activeFlotillas: 20,
            activeConfluences: 0,
            totalDredgedRelics: 0,
            totalVellumRecovered: 0,
            globalWaterReserves: 0,
            cleanedWaterStockpile: 0,
            severedMoorings: 0,
            lostInChurn: 0,
            totalDriftDistanceKm: 0
        };

        this.confluenceHistory = [];
        this.eventHorizonThresholdKm = 285;

        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => this.init());
            window.EventBus.on('HEARTBEAT_T1', () => this.tickDailyDrift());
            window.EventBus.on('HEARTBEAT_T7D', () => this.tickWeeklyEconomy());
        }
    }

    init() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit('UI_LOG', '🌊 [DuneDrift] Laniakea Subterranean River Drift & Cleaned Water Pipeline Engaged');
        }
        this.auditWaterQuotas();
    }

    /**
     * Daily Drift & Economic Tick
     */
    tickDailyDrift() {
        if (typeof window === 'undefined' || !window.VillageManager?.villages) return;

        const duneSettlements = window.VillageManager.villages.filter(v => v.region === 'dunes');
        if (duneSettlements.length === 0) return;

        // Weekly Cleaned Water Deliveries along Subterranean River Streamlines (Parody of King's Chain Fuel Quota)
        const day = window.EngineParams?.worldDay || 0;
        if (day % 7 === 0) {
            this.auditWaterQuotas(duneSettlements);
        }

        // 1. ADVANCE STREAMLINE DRIFT TOWARD THE FOREST ATTRACTOR
        duneSettlements.forEach(v => {
            if (v.isLostInChurn) {
                // Flotilla has severed moorings: dragged away into deep sand Churn
                v.x += (Math.random() - 0.5) * 50;
                v.z += (Math.random() - 0.5) * 50;
                v.currentTask = 'Lost in the Sand Churn';
                return;
            }

            const currentDistM = Math.hypot(v.x, v.z) || 1;
            const currentDistKm = currentDistM / 1000;

            // Stop at Mountain Event Horizon (285km)
            if (currentDistKm <= this.eventHorizonThresholdKm) {
                v.isAtEventHorizon = true;
                v.currentTask = 'Moored at Mountain Event Horizon Silt-Lock';
                return;
            }

            // Inward gravitational/hydraulic pull toward (0, 0)
            const speedMetersPerDay = (v.driftSpeed || 0.1) * 20;
            const dirX = -(v.x / currentDistM);
            const dirZ = -(v.z / currentDistM);

            // Subtle dendritic river meander (tangential wobble)
            const meanderAngle = Math.atan2(v.z, v.x) + Math.PI / 2;
            const meanderStrength = Math.sin((v.id * 73) + (window.EngineParams?.worldDay || 0) * 0.05) * 0.5;

            const deltaX = (dirX * speedMetersPerDay) + (Math.cos(meanderAngle) * meanderStrength * 5);
            const deltaZ = (dirZ * speedMetersPerDay) + (Math.sin(meanderAngle) * meanderStrength * 5);

            v.x += deltaX;
            v.z += deltaZ;
            v.streamlineVector = { x: deltaX, z: deltaZ };
            this.metrics.totalDriftDistanceKm += (Math.hypot(deltaX, deltaZ) / 1000);
        });

        // 2. DETECT FLOTILLA CONFLUENCES
        this.detectConfluences(duneSettlements);

        // 3. DAILY WATER & LIFE SUPPORT CONSUMPTION
        this.processLifeSupport(duneSettlements);
    }

    /**
     * Detects when drifting settlements pass within 15km of one another.
     */
    detectConfluences(duneSettlements) {
        let activeConfluences = 0;
        const proximityThresholdM = 15000; // 15 km

        // Reset partnerships before pairwise check
        duneSettlements.forEach(v => { v.confluencePartners = []; });

        for (let i = 0; i < duneSettlements.length; i++) {
            const v1 = duneSettlements[i];

            for (let j = i + 1; j < duneSettlements.length; j++) {
                const v2 = duneSettlements[j];
                const dist = Math.hypot(v1.x - v2.x, v1.z - v2.z);

                if (dist <= proximityThresholdM) {
                    activeConfluences++;
                    v1.confluencePartners.push(v2.id);
                    v2.confluencePartners.push(v1.id);

                    // Execute Confluence Bazaar
                    this.executeConfluenceBazaar(v1, v2, dist);
                }
            }
        }

        this.metrics.activeConfluences = activeConfluences;
    }

    /**
     * Executes trade and cultural exchange during a Flotilla Confluence.
     */
    executeConfluenceBazaar(v1, v2, dist) {
        // Mutual prosperity boost from shared trade grates
        v1.stats.prosperity = Math.min(100, (v1.stats.prosperity || 50) + 0.1);
        v2.stats.prosperity = Math.min(100, (v2.stats.prosperity || 50) + 0.1);

        // Water balancing between wet and dry flotillas
        const totalWater = (v1.stats.water || 0) + (v2.stats.water || 0);
        v1.stats.water = Math.floor(totalWater * 0.5);
        v2.stats.water = Math.floor(totalWater * 0.5);

        // Relic and vellum exchange
        if (Math.random() < 0.05 && typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.emit('DUNE_CONFLUENCE_BAZAAR', {
                settlementA: { id: v1.id, name: v1.name },
                settlementB: { id: v2.id, name: v2.name },
                distanceKm: (dist / 1000).toFixed(1)
            });
            window.EventBus.emit('UI_LOG', `🎪 [CONFLUENCE] Flotilla Bazaar formed between ${v1.name} and ${v2.name} along the ${v1.subterraneanRiver}!`);
        }
    }

    /**
     * Subterranean Aquifer Pumping, Cleaned Water Pipeline & Dredging
     */
    processLifeSupport(duneSettlements) {
        // 1. Raw Brine Extraction & Solar Desalination
        this.processWaterCondensation(duneSettlements);

        // 2. Cleaned Water Consumption & Mooring Tether Maintenance
        this.processWaterConsumptionAndTethers(duneSettlements);

        // 3. Dredge river grates for relics & vellum
        this.processRelicDredging(duneSettlements);
    }

    /**
     * Raw Brine Desalination & Solar Condensation
     * The Glass Flotilla (Index 24) and Salt-Marrow (Index 25) distill raw brine into pure cleaned water
     */
    processWaterCondensation(duneSettlements) {
        let totalBrine = 0;
        duneSettlements.forEach(v => {
            if (v.isLostInChurn) return;
            const pop = v.population?.current || 6000;
            const pumpedBrine = Math.max(10, Math.floor(pop / 400));
            v.stats.rawBrine = (v.stats.rawBrine || 0) + pumpedBrine;
            totalBrine += v.stats.rawBrine;
            v.stats.rawBrine = 0;
        });

        const siphonWells = duneSettlements.find(v => v.industry?.isWaterChokepoint || v.name === "Siphon-Wells");

        if (siphonWells) {
            const cleanedYield = Math.floor(totalBrine * 0.65); // 65% distilled yield
            siphonWells.stats.cleanedWater = (siphonWells.stats.cleanedWater || 0) + cleanedYield;
            this.metrics.cleanedWaterStockpile += cleanedYield;
        }
    }

    /**
     * Cleaned Water Quota Distribution along River Streamlines (Parody of King's Chain Fuel Quota)
     */
    auditWaterQuotas(duneSettlements) {
        if (!duneSettlements && window.VillageManager?.villages) {
            duneSettlements = window.VillageManager.villages.filter(v => v.region === 'dunes');
        }
        if (!duneSettlements || duneSettlements.length === 0) return;

        const siphonWells = duneSettlements.find(v => v.industry?.isWaterChokepoint || v.name === "Siphon-Wells");
        if (!siphonWells) return;

        let availableWater = siphonWells.stats.cleanedWater || 0;

        duneSettlements.forEach(v => {
            if (v.id === siphonWells.id || v.isLostInChurn) return;

            const pop = v.population?.current || 6000;
            const quotaNeeded = Math.max(5, Math.ceil(pop / 3000) * 7);
            v.waterNeed = quotaNeeded;

            if (availableWater >= quotaNeeded) {
                availableWater -= quotaNeeded;
                v.stats.cleanedWater = (v.stats.cleanedWater || 0) + quotaNeeded;
                v.waterQuotaFulfilled = true;
            } else {
                v.waterQuotaFulfilled = false;
                if (window.EventBus) {
                    window.EventBus.emit('UI_LOG', `⚠️ [DUNE] Cleaned water delivery to ${v.name} failed! Siphon-Wells reserves depleted.`);
                }
            }
        });

        siphonWells.stats.cleanedWater = availableWater;
    }

    /**
     * Cleaned Water Consumption & Mooring Tether Maintenance
     * If cleaned water is depleted, mooring tethers desiccate and snap against moving sand ocean
     */
    processWaterConsumptionAndTethers(duneSettlements) {
        let globalCleanedWater = 0;

        duneSettlements.forEach(v => {
            if (v.isLostInChurn) return;

            const pop = v.population?.current || 6000;
            const dailyBurn = Math.max(1, Math.ceil(pop / 7000));
            const currentWater = v.stats.cleanedWater || 0;

            if (currentWater >= dailyBurn) {
                v.stats.cleanedWater -= dailyBurn;
                v.mooringIntegrity = Math.min(100, (v.mooringIntegrity ?? 100) + 5);
                v.isMooringSevered = false;
            } else {
                // Starved of cleaned water: tethers desiccate under sand friction
                v.stats.cleanedWater = 0;
                v.mooringIntegrity = Math.max(0, (v.mooringIntegrity ?? 100) - 15);

                if (v.mooringIntegrity === 0) {
                    v.isMooringSevered = true;
                    v.isLostInChurn = true;
                    this.metrics.severedMoorings++;
                    this.metrics.lostInChurn++;
                    if (window.EventBus) {
                        window.EventBus.emit('DUNE_MOORING_SEVERED', { villageId: v.id, name: v.name });
                        window.EventBus.emit('UI_LOG', `🌪️ [DUNE] ${v.name}'s mooring tethers snapped! Flotilla swept into the sand Churn.`);
                    }
                }
            }

            globalCleanedWater += (v.stats.cleanedWater || 0);
        });

        this.metrics.globalWaterReserves = globalCleanedWater;
    }

    /**
     * Silt Grate Dredging
     */
    processRelicDredging(duneSettlements) {
        duneSettlements.forEach(v => {
            if (v.isLostInChurn) return;
            if (Math.random() < 0.10) {
                const dredgedRelicCount = 1 + Math.floor(Math.random() * 3);
                v.stats.dredgedRelics = (v.stats.dredgedRelics || 0) + dredgedRelicCount;
                this.metrics.totalDredgedRelics += dredgedRelicCount;

                if (Math.random() < 0.3) {
                    v.stats.preFractureVellum = (v.stats.preFractureVellum || 0) + 1;
                    this.metrics.totalVellumRecovered += 1;
                }
            }
        });
    }

    /**
     * Weekly Economy Tick
     */
    tickWeeklyEconomy() {
        if (typeof window === 'undefined' || !window.VillageManager?.villages) return;
        const duneSettlements = window.VillageManager.villages.filter(v => v.region === 'dunes');

        // Audit cleaned water deliveries
        this.auditWaterQuotas(duneSettlements);

        duneSettlements.forEach(v => {
            if (v.isLostInChurn) return;
            // Silt farming harvest
            v.stats.food = Math.min(v.population.current * 30, (v.stats.food || 0) + (v.population.current * 2));
        });
    }
}

if (typeof window !== 'undefined') {
    window.DuneDriftSystem = new DuneDriftSystem();
}
export default (typeof window !== 'undefined' ? window.DuneDriftSystem : new DuneDriftSystem());
