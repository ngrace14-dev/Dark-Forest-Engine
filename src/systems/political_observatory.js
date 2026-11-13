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
        this.successionLog = new Map(); // HouseID -> Array of { day }
        
        this.globalMetrics = {
            politicalFragmentation: 0.0, // 0.0 (Centralized) to 1.0 (Atomized)
            overallStability: 1.0,
            deadlockFrequency: 0.0,
            monopolyTension: 0.0,
            eliteCaptureIndex: 0.0,
            averageDecayVelocity: 0.0,
            totalSchismPressure: 0.0
        };

        this.decayThresholds = {
            SLOW_LEGITIMACY_LOSS: -0.01, // Loss per audit cycle
            INSTITUTIONAL_DRIFT: 0.3,    // Identity drift threshold
            BUREAUCRATIC_DECAY: 0.5,     // Suppression burden threshold
            MONOPOLY_ENTRENCHMENT: 50    // Days held without challenge
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', (data) => this.performAudit(data));
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordLongitudinalData());
        window.EventBus.on('SUCCESSION', (data) => this.recordSuccession(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '👑 [CGB] Political Observatory Engaged');
    }

    recordSuccession(data) {
        const houseId = data.actorId;
        if (!this.successionLog.has(houseId)) this.successionLog.set(houseId, []);
        this.successionLog.get(houseId).push({ day: window.EngineParams?.worldDay || 0 });
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
        const successions = this.successionLog.get(house.id) || [];
        const recentSuccessions = successions.filter(s => (window.EngineParams.worldDay - s.day) < 50).length;
        const stability = Math.max(0, 1.0 - (recentSuccessions * 0.2) - (house.activeSchism ? 0.4 : 0));

        const score = (legitimacy * 40) + (stability * 30) + (trust * 20) - (volatility * 10);
        
        // Attach Calculated Metrics for Observatory
        house._observatory = {
            legitimacyGradient: this._calculateLegitimacyGradient(house),
            schismPressure: this._calculateSchismPressure(house),
            decayVelocity: 0, // Calculated in audit
            eliteCapture: this._calculateEliteCapture(house)
        };

        return Math.max(0, Math.min(100, score));
    }

    _calculateLegitimacyGradient(house) {
        const history = this.houseHistory.get(house.id);
        if (!history || history.length < 2) return 0;
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        return (last.legitimacy - prev.legitimacy) / (last.day - prev.day || 1);
    }

    _calculateSchismPressure(house) {
        const conflict = house.internalConflictLevel || 0;
        const anxiety = house.exposureAnxiety || 0;
        const gap = house.narrativeGap || 0;
        // Pressure builds when there is a gap between truth and official story, combined with internal friction
        return Math.min(1.0, (conflict * 0.4) + (anxiety * 0.3) + (gap * 0.3));
    }

    _calculateEliteCapture(house) {
        if (!house.isBlessed) return 0;
        // Capture is prestige + monopoly status vs global average
        return (house.prestige / 1000) * (house.isBlessed ? 1.5 : 1.0);
    }

    /**
     * Performs a political audit of the realm.
     */
    performAudit(data = {}) {
        if (!window.DynastyManager) return;
        const scale = data.simScale || 1.0;

        const houses = Array.from(window.DynastyManager.houses.values());
        let totalStability = 0;
        let deadlockedCount = 0;
        let totalDecayVelocity = 0;
        let totalSchismPressure = 0;

        houses.forEach(house => {
            const oldHealth = house.politicalHealth || 50;
            const health = this.calculatePoliticalHealth(house);
            
            // Calculate Decay Velocity (Health loss per day)
            const history = this.houseHistory.get(house.id);
            if (history && history.length > 0) {
                const last = history[history.length - 1];
                house._observatory.decayVelocity = (health - last.health) / (window.EngineParams.worldDay - last.day || 1);
            }
            
            house.politicalHealth = health;
            totalDecayVelocity += Math.min(0, house._observatory.decayVelocity);
            totalSchismPressure += house._observatory.schismPressure;

            totalStability += (100 - (house.internalConflictLevel * 100));
            if (house.internalConflictLevel > 0.7) deadlockedCount++;

            // Detect Specific Decay Patterns
            this._detectDecayPatterns(house, scale);
            this._detectStateTransitions(house);
        });

        // Fragmentation & Elite Capture
        const prestigeValues = houses.map(h => h.prestige);
        this.globalMetrics.politicalFragmentation = this._calculateGini(prestigeValues);
        this.globalMetrics.eliteCaptureIndex = houses.filter(h => h.isBlessed).reduce((acc, h) => acc + h.prestige, 0) / Math.max(1, prestigeValues.reduce((a,b) => a+b, 0));
        
        this.globalMetrics.overallStability = totalStability / Math.max(1, houses.length) / 100;
        this.globalMetrics.deadlockFrequency = deadlockedCount / Math.max(1, houses.length);
        this.globalMetrics.averageDecayVelocity = totalDecayVelocity / Math.max(1, houses.length);
        this.globalMetrics.totalSchismPressure = totalSchismPressure / Math.max(1, houses.length);

        window.EventBus.emit('POLITICAL_AUDIT_COMPLETE', this.globalMetrics);
    }

    _detectDecayPatterns(house, scale = 1.0) {
        const obs = house._observatory;
        
        // 1. Slow Legitimacy Loss: Scale the impact of decay in accelerated mode
        if (obs.legitimacyGradient < (this.decayThresholds.SLOW_LEGITIMACY_LOSS / scale)) {
            this.recordCausalEvent(house.id, 'DECAY_DETECTION', 'SLOW_LEGITIMACY_LOSS', `Legitimacy dropping at ${obs.legitimacyGradient.toFixed(4)}/day`);
        }

        // 2. Institutional Drift
        if (house.identityDrift > this.decayThresholds.INSTITUTIONAL_DRIFT) {
            this.recordCausalEvent(house.id, 'DECAY_DETECTION', 'INSTITUTIONAL_DRIFT', `Identity drift reached ${house.identityDrift.toFixed(2)}`);
        }

        // 3. Bureaucratic Decay
        if (house.suppressionBurden > this.decayThresholds.BUREAUCRATIC_DECAY) {
            this.recordCausalEvent(house.id, 'DECAY_DETECTION', 'BUREAUCRATIC_DECAY', `Suppression burden at ${house.suppressionBurden.toFixed(2)}`);
        }

        // 4. Monopoly Entrenchment
        if (house.isBlessed && house.prestige > 500) {
            // Simplified check: high prestige + blessed = entrenchment
             this.recordCausalEvent(house.id, 'DECAY_DETECTION', 'MONOPOLY_ENTRENCHMENT', `Hegemonic entrenchment detected via prestige gap.`);
        }
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

    /**
     * Generates a Long-Term Political Decay Framework report.
     */
    generateDecayFramework() {
        return {
            title: "Long-Term Political Decay Framework",
            timestamp: window.EngineParams.worldDay,
            globalStatus: this.globalMetrics,
            theoreticalPillars: [
                {
                    name: "Legitimacy Gradient",
                    description: "Measures the rate of erosion of the right to rule. A negative gradient indicates institutional obsolescence.",
                    currentMean: houses.length > 0 ? (houses.reduce((a, b) => a + (b._observatory?.legitimacyGradient || 0), 0) / houses.length) : 0
                },
                {
                    name: "Decay Velocity",
                    description: "Aggregate speed of civilizational entropy. High velocity suggests imminent systemic collapse.",
                    currentValue: this.globalMetrics.averageDecayVelocity
                },
                {
                    name: "Elite Capture Index",
                    description: "Measures resource and prestige concentration. High values correlate with revolutionary pressure and institutional rigidity.",
                    currentValue: this.globalMetrics.eliteCaptureIndex
                },
                {
                    name: "Schism Pressure",
                    description: "Internal cognitive dissonance within institutions. High pressure indicates a coming doctrinal fracture.",
                    currentValue: this.globalMetrics.totalSchismPressure
                }
            ],
            detectedAnomalies: this.causalRegistry.filter(c => c.eventType === 'DECAY_DETECTION').slice(-10)
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
