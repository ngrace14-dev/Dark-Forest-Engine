/**
 * DARK FOREST ENGINE - POLITICAL OBSERVATORY
 * Crown Governance Bureau (CGB)
 * 
 * Analyzes the long-term evolution of the 19 Noble Houses over centuries.
 */

class PoliticalObservatorySystem {
    constructor() {
        this.houseHistory = new Map(); // HouseID -> Array of snapshots
        this.causalRegistry = []; // Array of { houseId, eventType, cause, outcome, day }
        
        this.globalMetrics = {
            politicalFragmentation: 0.0, // 0.0 (Centralized) to 1.0 (Atomized)
            overallStability: 1.0,
            deadlockFrequency: 0.0,
            monopolyTension: 0.0
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', () => this.performAudit());
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordLongitudinalData());
    }

    init() {
        window.EventBus.emit('UI_LOG', '👑 [CGB] Political Observatory Engaged');
    }

    /**
     * Calculates the Political Health Score for a House.
     * Formula: (Legitimacy * 0.4) + (Stability * 0.3) + (Trust * 0.2) - (Volatility * 0.1)
     */
    calculatePoliticalHealth(house) {
        const legitimacy = house.legitimacy || 0.5;
        const trust = house.publicTrust || 0.5;
        const volatility = house.internalConflictLevel || 0.0;
        
        // Stability is inverse to recent succession frequency and schisms
        const recentSuccessions = house.lineage.length > 0 ? 
            house.lineage.filter(l => (window.EngineParams.worldDay - l.day) < 50).length : 0;
        const stability = Math.max(0, 1.0 - (recentSuccessions * 0.2) - (house.activeSchism ? 0.4 : 0));

        const score = (legitimacy * 40) + (stability * 30) + (trust * 20) - (volatility * 10);
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Performs a political audit of the realm.
     */
    performAudit() {
        if (!window.DynastyManager) return;

        const houses = Array.from(window.DynastyManager.houses.values());
        let totalStability = 0;
        let deadlockedCount = 0;

        houses.forEach(house => {
            const health = this.calculatePoliticalHealth(house);
            house.politicalHealth = health; // Attach to house object

            totalStability += (100 - (house.internalConflictLevel * 100));
            if (house.internalConflictLevel > 0.7) deadlockedCount++;

            // Detect Rise/Collapse triggers
            this._detectStateTransitions(house);
        });

        // Fragmentation: Gini of Prestige/Monopolies
        const prestigeValues = houses.map(h => h.prestige);
        this.globalMetrics.politicalFragmentation = this._calculateGini(prestigeValues);
        this.globalMetrics.overallStability = totalStability / houses.length / 100;
        this.globalMetrics.deadlockFrequency = deadlockedCount / houses.length;

        window.EventBus.emit('POLITICAL_AUDIT_COMPLETE', this.globalMetrics);
    }

    _detectStateTransitions(house) {
        const day = window.EngineParams.worldDay;
        
        // COLLAPSE DETECTOR
        if (house.politicalHealth < 20 && !house._inCollapseWarning) {
            house._inCollapseWarning = true;
            this.recordCausalEvent(house.id, 'POTENTIAL_COLLAPSE', 'LOW_LEGITIMACY_AND_CONFLICT', 'Warning Issued');
        } else if (house.politicalHealth > 40) {
            house._inCollapseWarning = false;
        }

        // RISE DETECTOR
        if (house.politicalHealth > 80 && house.isBlessed && !house._isRising) {
            house._isRising = true;
            this.recordCausalEvent(house.id, 'DYNASTIC_RISE', 'STABLE_SUCCESSION_AND_MONOPOLY', 'Hegemony Established');
        } else if (house.politicalHealth < 60) {
            house._isRising = false;
        }
    }

    /**
     * Records a causal link for historical analysis.
     * Answers: Why did X happen?
     */
    recordCausalEvent(houseId, eventType, cause, outcome) {
        const entry = {
            houseId,
            eventType, // RISE, COLLAPSE, LEGITIMACY_SHIFT, REBELLION
            cause,     // MONOPOLY_GAIN, SUCCESSION_FAILURE, INFORMATION_EXPOSURE
            outcome,
            day: window.EngineParams.worldDay
        };
        this.causalRegistry.push(entry);
        window.EventBus.emit('UI_LOG_DEBUG', `[CGB] Causal Link: ${houseId} ${eventType} caused by ${cause}`);
    }

    /**
     * Longitudinal Data Recording (Century Level)
     */
    recordLongitudinalData() {
        const day = window.EngineParams.worldDay;
        if (!window.DynastyManager) return;

        window.DynastyManager.houses.forEach(house => {
            if (!this.houseHistory.has(house.id)) this.houseHistory.set(house.id, []);
            
            const snapshot = {
                day,
                health: house.politicalHealth,
                legitimacy: house.legitimacy,
                trust: house.publicTrust,
                prestige: house.prestige,
                isBlessed: house.isBlessed,
                conflict: house.internalConflictLevel
            };
            this.houseHistory.get(house.id).push(snapshot);
        });
    }

    /**
     * Generates a Millennium Report.
     */
    generateMillenniumReport(houseId) {
        const history = this.houseHistory.get(houseId);
        if (!history || history.length < 2) return "Insufficient historical depth.";

        const start = history[0];
        const end = history[history.length - 1];
        const causes = this.causalRegistry.filter(c => c.houseId === houseId);

        return {
            house: houseId,
            timespan: `${start.day} -> ${end.day}`,
            netLegitimacyChange: end.legitimacy - start.legitimacy,
            majorCausalEvents: causes,
            stabilityTrend: end.health > start.health ? 'IMPROVING' : 'DEGRADING',
            summary: `House ${houseId} moved from ${start.health.toFixed(1)} to ${end.health.toFixed(1)} political health over ${end.day - start.day} days.`
        };
    }

    _calculateGini(values) {
        const n = values.length;
        if (n < 2) return 0;
        const sorted = values.sort((a, b) => a - b);
        let sumNom = 0;
        let sumDen = 0;
        for (let i = 0; i < n; i++) {
            sumNom += (i + 1) * sorted[i];
            sumDen += sorted[i];
        }
        if (sumDen === 0) return 0;
        return (2 * sumNom) / (n * sumDen) - (n + 1) / n;
    }
}

window.PoliticalObservatory = new PoliticalObservatorySystem();
export default window.PoliticalObservatory;
