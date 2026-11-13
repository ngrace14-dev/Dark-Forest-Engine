/**
 * DARK FOREST ENGINE - FUEL ECONOMY OBSERVATORY
 * Royal Fuel Commission (RFC)
 * 
 * Monitors the production, refinement, and distribution of Barrier Fuel (Essence).
 * Critical Failsafe for civilizational persistence.
 */

class FuelEconomyObservatory {
    constructor() {
        this.metrics = {
            globalProduction: 0,     // Total raw materials generated
            globalRefinement: 0,     // Total essence produced
            globalConsumption: 0,    // Total essence burned
            stockpileLevels: {
                raw: 0,
                essence: 0
            },
            indices: {
                dependencyIndex: 0.0,      // Ratio of external vs internal fuel reliance
                criticalHouseIndex: 0.0,   // Impact of the top supplier failing
                fragilityIndex: 0.0,       // Reliability of supply caravans
                barrierFailureRisk: 0.0    // Probability of a village losing its shield
            }
        };

        this.supplyChainWeight = new Map(); // HouseID -> Weight (0.0 - 1.0)
        this.houseStockpiles = new Map();   // HouseID -> { raw, essence }
        this.failureForecasts = new Map();  // VillageID -> Days until collapse

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1H', () => this.auditFuelChain());
        window.EventBus.on('SHIFT_COMPLETE', () => this.reportLongTermTrends());
    }

    init() {
        window.EventBus.emit('UI_LOG', '⛽ [RFC] Fuel Economy Observatory Engaged');
        
        // Define the supply chain topology (§Model)
        this.topology = {
            producers: ['House Mire', 'House Widow', 'House Blackwood', 'House Cull', 'House Hollow', 'House Bleak'],
            refiners: ['House Shadowfen'],
            distributors: ['The Royal Family'] // House Aethel
        };
    }

    /**
     * Performs a full audit of the Essence economy.
     */
    auditFuelChain() {
        if (!window.VillageManager) return;

        const villages = window.VillageManager.villages;
        let totalProduction = 0;
        let totalConsumption = 0;
        let totalRaw = 0;
        let totalEssence = 0;

        // 1. COLLECT DATA
        villages.forEach(v => {
            totalConsumption += (v.fuelNeed || 0);
            totalEssence += (v.stats.essence || 0);
            totalRaw += (v.stats.refinementStock.beast_bones || 0) + 
                        (v.stats.refinementStock.corrupted_resin || 0) + 
                        (v.stats.refinementStock.flesh_pods || 0);

            // Track individual house contributions
            const house = v.nobleHouse;
            const current = this.houseStockpiles.get(house) || { raw: 0, essence: 0 };
            current.raw = (v.stats.refinementStock.beast_bones || 0) + 
                          (v.stats.refinementStock.corrupted_resin || 0) + 
                          (v.stats.refinementStock.flesh_pods || 0);
            current.essence = (v.stats.essence || 0);
            this.houseStockpiles.set(house, current);

            // 2. ANCHOR LOSS FORECAST
            this._forecastAnchorLoss(v);
        });

        this.metrics.globalConsumption = totalConsumption;
        this.metrics.stockpileLevels.raw = totalRaw;
        this.metrics.stockpileLevels.essence = totalEssence;

        // 3. CALCULATE INDICES
        this._calculateDependencyIndex(villages);
        this._calculateCriticality(villages);
        this._calculateFragility();

        // 4. BARRIER FAILURE RISK
        this.metrics.indices.barrierFailureRisk = Array.from(this.failureForecasts.values())
            .filter(days => days < 3).length / villages.length;

        this._emitTelemetry();
    }

    _forecastAnchorLoss(village) {
        const stock = village.stats.essence || 0;
        const burn = village.fuelNeed || 1;
        const daysRemaining = stock / burn;
        
        this.failureForecasts.set(village.id, daysRemaining);

        if (daysRemaining < 1) {
            window.EventBus.emit('UI_LOG_DEBUG', `[RFC] CRITICAL: ${village.name} anchor collapse imminent (<24h)`);
        }
    }

    _calculateDependencyIndex(villages) {
        // High index = villages depend on the Capital/Shadowfen for fuel
        let totalVillages = villages.length;
        let dependent = villages.filter(v => v.feudalState === 'DEPENDENT').length;
        this.metrics.indices.dependencyIndex = dependent / totalVillages;
    }

    _calculateCriticality(villages) {
        // Measures how much Shadowfen/Aethel failure would crash the world
        // If Capital essence is low while others are empty, criticality is 1.0
        const capital = villages.find(v => v.capital);
        if (!capital) return;

        const capitalShare = (capital.stats.essence || 1) / (this.metrics.stockpileLevels.essence || 1);
        this.metrics.indices.criticalHouseIndex = capitalShare;
    }

    _calculateFragility() {
        // Ratio of caravans active vs successfully delivered
        // Uses GCAB data if available
        if (window.GCAB) {
            const logisticsCrises = window.GCAB.crisisLedger.filter(c => c.rootCause === 'LOGISTICS').length;
            this.metrics.indices.fragilityIndex = Math.min(1.0, logisticsCrises / 10);
        }
    }

    _emitTelemetry() {
        const m = this.metrics;
        window.EventBus.emit('FUEL_TELEMETRY', m);

        if (m.indices.barrierFailureRisk > 0.3) {
            window.EventBus.emit('UI_LOG', '⚠️ [RFC] FUEL SYSTEM UNSTABLE: 30%+ of anchors at risk of failure.');
        }
    }

    reportLongTermTrends() {
        const day = window.EngineParams?.worldDay || 0;
        window.EventBus.emit('UI_LOG', `[RFC] Periodic Review: Stockpiles at ${this.metrics.stockpileLevels.essence} units. Fragility: ${this.metrics.indices.fragilityIndex.toFixed(2)}.`);
    }
}

window.FuelObservatory = new FuelEconomyObservatory();
export default window.FuelObservatory;
