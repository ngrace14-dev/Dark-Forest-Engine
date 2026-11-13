/**
 * DARK FOREST ENGINE - ECONOMIC ECOLOGY BUREAU (EEB)
 * "The Living Economic Observatory"
 * 
 * Tracks the flow of wealth, resources, and institutional stability across the Village Chain.
 * Determines the systemic health and fragility of the kingdom's economy.
 */

class EconomicEcologyBureau {
    constructor() {
        this.history = []; // Array of snapshot objects
        this.snapshotsPerShift = 14; 
        
        // Indices & Scores
        this.wealthIndex = new Map(); // villageId -> currentWealthScore
        this.fragilityScores = new Map(); // villageId -> score (0-1, high is bad)
        this.tradeGraph = new Map(); // A -> B -> { volume, frequency }
        
        // Systemic Status
        this.centralizationFactor = 0; // 0 (Equal) to 1 (Capital Monolith)
        this.globalResilience = 1.0;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_TICK', () => this.recordTick());
    }

    init() {
        window.EventBus.emit('UI_LOG', '📈 [EEB] Economic Ecology Bureau Engaged. Monitoring wealth flows.');
    }

    /**
     * Records a periodic snapshot of the entire economic state.
     */
    recordTick() {
        // Only run every hour of game time to prevent overhead
        if (!window.EngineParams || window.EngineParams.worldHour % 1 !== 0) return;

        const villages = window.VillageManager?.villages;
        if (!villages || villages.length === 0) return;

        const snapshot = {
            day: window.EngineParams.worldDay,
            hour: window.EngineParams.worldHour,
            villageData: [],
            globalTradeVolume: 0,
            resourceVelocity: 0
        };

        let totalGold = 0;
        let capitalGold = 0;
        let totalTradeAmount = 0;
        let totalMovedResources = 0;

        villages.forEach(v => {
            const wealth = this.calculateVillageWealth(v);
            const fragility = this.calculateFragility(v);
            
            this.wealthIndex.set(v.id, wealth);
            this.fragilityScores.set(v.id, fragility);

            // Track active trade connections
            if (v.caravans) {
                v.caravans.forEach(c => {
                    if (c.status === 'traveling') {
                        totalTradeAmount += (c.amount || 1);
                        
                        // Update Trade Graph
                        if (!this.tradeGraph.has(v.id)) this.tradeGraph.set(v.id, new Map());
                        const targetMap = this.tradeGraph.get(v.id);
                        const stats = targetMap.get(c.targetVillageId) || { volume: 0, frequency: 0 };
                        stats.volume += (c.amount || 1);
                        stats.frequency += 0.1; // Incremental contribution
                        targetMap.set(c.targetVillageId, stats);
                    }
                    if (c.status === 'complete' && c.lastArrivalDay === window.EngineParams.worldDay) {
                        totalMovedResources += (c.amount || 1);
                    }
                });
            }

            snapshot.villageData.push({
                id: v.id,
                wealth,
                prosperity: v.stats.prosperity,
                population: v.population.current,
                fragility
            });

            totalGold += v.stats.gold;
            if (v.id === 0) capitalGold = v.stats.gold;
        });

        snapshot.globalTradeVolume = totalTradeAmount;
        snapshot.resourceVelocity = totalMovedResources;

        // Determine Centralization (Capital Share)
        this.centralizationFactor = capitalGold / (totalGold || 1);

        this.history.push(snapshot);
        if (this.history.length > 100) this.history.shift();

        // Run analysis on shift boundary
        if (window.EngineParams.worldHour === 0) {
            this.performShiftAnalysis();
        }
    }

    /**
     * 1. Village Wealth: Sum of gold + inventory value.
     */
    calculateVillageWealth(village) {
        let materialValue = 0;
        const prices = window.MarketManager?.prices || new Map();
        
        const resources = ['food', 'wood', 'stone', 'essence'];
        resources.forEach(res => {
            const price = prices.get(res) || 10;
            materialValue += (village.stats[res] || 0) * price;
        });

        return village.stats.gold + materialValue;
    }

    /**
     * 5. Scarcity Pressure & 7. Economic Resilience
     * Fragility = Dependence on single imports + High consumption/Stock ratio.
     */
    calculateFragility(village) {
        let score = 0;

        // Dependency: Does it lack its imports?
        village.industry.imports.forEach(res => {
            const stock = village.stats[res] || 0;
            const threshold = village.population.current * 0.5;
            if (stock < threshold) score += 0.2;
        });

        // Resource Diversity: Only one industry?
        if (village.hasMonopoly) score -= 0.1; // Monopolies provide stability via gold

        // Barrier Pressure: Essence depletion risk
        if (village.stats.essence < village.fuelNeed * 2) score += 0.3;

        return Math.max(0, Math.min(1.0, score));
    }

    /**
     * Perform deep analysis on economic trends.
     */
    performShiftAnalysis() {
        const canProsper = this.checkProsperityViability();
        const collapseSpreading = this.checkContagionRisk();

        if (collapseSpreading) {
            window.EventBus.emit('UI_LOG', '⚠️ [EEB] Economic Fragility Alert: Resource scarcity is cascading through the chain.');
            this.globalResilience *= 0.9;
        }

        window.EventBus.emit('UI_LOG_DEBUG', `[EEB] Analysis Complete. Centralization: ${(this.centralizationFactor * 100).toFixed(1)}%.`);
        
        // Log to Chronicle if wealth centralization is extreme
        if (this.centralizationFactor > 0.8) {
            window.ChronicleManager?.recordEvent({
                actorId: 'Economic Ecology Bureau',
                type: 'WEALTH_CENTRALIZATION',
                detail: 'The Capital now controls over 80% of the kingdom\'s liquid wealth. The outer villages are starving for gold.',
                significance: 150,
                historicalWeight: 80
            });
        }
    }

    /**
     * Can villages prosper?
     * Logic: Are production rates higher than consumption/maintenance?
     */
    checkProsperityViability() {
        const recentSnapshots = this.history.slice(-24);
        if (recentSnapshots.length < 2) return true;

        const start = recentSnapshots[0];
        const end = recentSnapshots[recentSnapshots.length - 1];

        const avgProsperityStart = start.villageData.reduce((s, v) => s + v.prosperity, 0) / start.villageData.length;
        const avgProsperityEnd = end.villageData.reduce((s, v) => s + v.prosperity, 0) / end.villageData.length;

        return avgProsperityEnd >= avgProsperityStart;
    }

    /**
     * Can economic collapse spread?
     * Detects if one village's failure to produce (e.g. Famine) is hurting neighbors.
     */
    checkContagionRisk() {
        const villages = window.VillageManager?.villages || [];
        const inCrisis = villages.filter(v => (v.crises && v.crises.length > 0) || v.stats.prosperity < 30);
        
        if (inCrisis.length === 0) return false;

        // Check if crises are adjacent in the trade graph
        for (const v of inCrisis) {
            const connected = v.connections.map(id => villages[id]);
            const connectedInCrisis = connected.filter(cv => cv.stats.prosperity < 40);
            if (connectedInCrisis.length > 0) return true; // It's spreading
        }

        return false;
    }

    /**
     * 4. Prosperity Velocity
     * The rate of change of prosperity across the system.
     */
    getProsperityVelocity() {
        if (this.history.length < 10) return 0;
        const latest = this.history[this.history.length - 1];
        const older = this.history[this.history.length - 10];
        
        const latestAvg = latest.villageData.reduce((s, v) => s + v.prosperity, 0) / latest.villageData.length;
        const olderAvg = older.villageData.reduce((s, v) => s + v.prosperity, 0) / older.villageData.length;
        
        return (latestAvg - olderAvg) / 10;
    }

    /**
     * Returns a summary for the UI or other systems.
     */
    getObservatoryReport() {
        return {
            wealthIndex: Array.from(this.wealthIndex.entries()),
            centralization: this.centralizationFactor,
            resilience: this.globalResilience,
            velocity: this.getProsperityVelocity(),
            fragilityMap: Array.from(this.fragilityScores.entries()),
            canProsper: this.checkProsperityViability(),
            isCollapsing: this.checkContagionRisk()
        };
    }
}

window.EconomicBureau = new EconomicEcologyBureau();
export default window.EconomicBureau;
