/**
 * DARK FOREST ENGINE - CIVILIZATIONAL LEARNING ANALYTICS
 * Genesis Civilizational Analysis Bureau (GCAB)
 * 
 * Determines whether the simulation "learns" by tracking the Crisis -> Response -> Outcome loop.
 */

class CivilizationalLearningSystem {
    constructor() {
        this.crisisLedger = []; // Array of { id, type, rootCause, responseType, successRate, day, longTermImpact }
        this.learningMetrics = {
            learningIndex: 0.5,        // 0.0 to 1.0 (How well responses improve over time)
            crisisRecurrence: 1.0,     // Frequency of same-type crises
            innovationRetention: 0.5,  // How long successful responses are remembered
            institutionalAdaptation: 0.5, // Speed of structural change after failure
            knowledgeApplication: 0.5  // Usage of past successful patterns
        };

        this.typeHistory = new Map(); // crisisType -> Array of outcomes

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.generateCenturyReport());
    }

    init() {
        window.EventBus.emit('UI_LOG', '📉 [GCAB] Learning Analytics Bureau Active');
        
        // Listen for system-level crises
        window.EventBus.on('CIV_CRISIS_DETECTED', (data) => this.recordCrisis(data));
        window.EventBus.on('CIV_RESPONSE_EXECUTED', (data) => this.recordResponse(data));
    }

    /**
     * Records the start of a crisis.
     * @param {Object} data { type, entityId, rootCause, severity }
     */
    recordCrisis(data) {
        const crisis = {
            id: `crisis_${Date.now()}`,
            type: data.type, // FUEL_SHORTAGE, BARRIER_FAILURE, FAMINE, etc.
            entityId: data.entityId,
            rootCause: data.rootCause, // SCARCITY, NEGLECT, ATTACK, LOGISTICS
            severity: data.severity || 1.0,
            day: window.EngineParams?.worldDay || 0,
            responses: [],
            outcome: null,
            isResolved: false
        };

        this.crisisLedger.push(crisis);
        this._updateRecurrenceIndex(data.type);
        
        window.EventBus.emit('UI_LOG_DEBUG', `[GCAB] Crisis recorded: ${data.type} in ${data.entityId}`);
    }

    /**
     * Records a response attempted by an institution.
     */
    recordResponse(data) {
        const crisis = this.crisisLedger.find(c => c.entityId === data.entityId && !c.isResolved);
        if (!crisis) return;

        const response = {
            type: data.responseType, // REFORM, SUPPRESSION, RESOURCE_SHIFT, INNOVATION
            actorId: data.actorId,
            cost: data.cost || 0,
            day: window.EngineParams?.worldDay || 0
        };

        crisis.responses.push(response);
    }

    /**
     * Closes the loop: Determines if the response worked.
     */
    resolveCrisis(entityId, successRate) {
        const crisis = this.crisisLedger.find(c => c.entityId === entityId && !c.isResolved);
        if (!crisis) return;

        crisis.isResolved = true;
        crisis.successRate = successRate;
        crisis.longTermImpact = this._calculateLongTermImpact(crisis, successRate);

        if (!this.typeHistory.has(crisis.type)) this.typeHistory.set(crisis.type, []);
        this.typeHistory.get(crisis.type).push({ success: successRate, day: crisis.day });

        this._updateLearningMetrics(crisis);
    }

    _calculateLongTermImpact(crisis, success) {
        // Success reduces future severity; Failure increases structural entropy
        return success > 0.7 ? "STRENGTHENED_COHESION" : "STRUCTURAL_WEAKNESS";
    }

    _updateRecurrenceIndex(type) {
        const history = this.typeHistory.get(type) || [];
        if (history.length < 2) return;

        const lastInterval = history[history.length - 1].day - history[history.length - 2].day;
        // If intervals are getting longer, recurrence is improving (index decreases)
        this.learningMetrics.crisisRecurrence *= 0.95; 
    }

    _updateLearningMetrics(crisis) {
        const history = this.typeHistory.get(crisis.type);
        if (history.length < 2) return;

        const previousOutcome = history[history.length - 2].success;
        const currentOutcome = crisis.successRate;

        // LEARNING INDEX: Improvement over previous outcomes
        if (currentOutcome > previousOutcome) {
            this.learningMetrics.learningIndex = Math.min(1.0, this.learningMetrics.learningIndex + 0.05);
            this.learningMetrics.knowledgeApplication = Math.min(1.0, this.learningMetrics.knowledgeApplication + 0.03);
        } else {
            this.learningMetrics.learningIndex = Math.max(0.0, this.learningMetrics.learningIndex - 0.02);
        }

        // ADAPTATION SCORE: Measured by response speed (day diff)
        const responseTime = crisis.responses.length > 0 ? (crisis.responses[0].day - crisis.day) : 100;
        if (responseTime < 10) {
            this.learningMetrics.institutionalAdaptation = Math.min(1.0, this.learningMetrics.institutionalAdaptation + 0.05);
        }
    }

    generateCenturyReport() {
        const century = Math.floor(window.EngineParams?.worldDay / 100);
        const report = {
            century,
            metrics: { ...this.learningMetrics },
            totalCrises: this.crisisLedger.filter(c => c.day > (century-1)*100).length,
            topCause: this._getTopCause(),
            isImproving: this.learningMetrics.learningIndex > 0.6
        };

        window.EventBus.emit('CIV_LEARNING_REPORT', report);
        
        const trend = report.isImproving ? "UPWARD (Learning)" : "DOWNWARD (Degeneration)";
        window.EventBus.emit('UI_LOG', `📊 [GCAB] Century ${century} Analysis: Progress Trend is ${trend}.`);
        return report;
    }

    _getTopCause() {
        const counts = {};
        this.crisisLedger.forEach(c => counts[c.rootCause] = (counts[c.rootCause] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "NONE");
    }
}

window.GCAB = new CivilizationalLearningSystem();
export default window.GCAB;
