/**
 * GENESIS ENGINE - INFORMATION CONSEQUENCE BUREAU
 * Directorate: Information Consequence
 * 
 * Audits the real-world impact of false information (Rumors, Fabrications, Distortions).
 * Measures the "Cost of Lying" in wars, trade, and expeditions.
 */

class InformationConsequenceBureau {
    constructor() {
        this.stats = {
            totalFalsehoodImpact: 0,
            warsStartedByRumors: 0,
            tradeCollapsesByMisinfo: 0,
            wastedExpeditions: 0,
            historicalDistortionCost: 0
        };

        this.consequenceLedger = [];

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('FEUD_INTENSIFIED', (data) => this.trackRumorConflict(data));
        window.EventBus.on('CARAVAN_LOST', (data) => this.trackTradeMisinfo(data));
        window.EventBus.on('EXPEDITION_FAILED', (data) => this.trackExpeditionMisinfo(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '📉 [Consequence] Information Audit Bureau Active');
    }

    /**
     * Tracks conflicts triggered by false records or rumors.
     */
    trackRumorConflict(data) {
        if (!data.triggerIntelId) return;

        const intel = window.IntelManager?.lookup(data.triggerIntelId);
        if (intel && intel.truth_state === 'FALSE') {
            this.stats.warsStartedByRumors++;
            this._recordConsequence('CONFLICT', data.triggerIntelId, "False record triggered institutional feud.");
        }
    }

    /**
     * Tracks trade collapses caused by market misinformation.
     */
    trackTradeMisinfo(data) {
        if (!data.triggerIntelId) return;

        const intel = window.IntelManager?.lookup(data.triggerIntelId);
        if (intel && intel.truth_state === 'FALSE') {
            this.stats.tradeCollapsesByMisinfo++;
            this._recordConsequence('TRADE', data.triggerIntelId, "Market fabrication caused caravan diversion and loss.");
        }
    }

    /**
     * Tracks expeditions sent to locations based on fake intel.
     */
    trackExpeditionMisinfo(data) {
        if (!data.triggerIntelId) return;

        const intel = window.IntelManager?.lookup(data.triggerIntelId);
        if (intel && intel.truth_state === 'FALSE') {
            this.stats.wastedExpeditions++;
            this._recordConsequence('EXPEDITION', data.triggerIntelId, "Adventurers died seeking a non-existent landmark.");
        }
    }

    _recordConsequence(type, intelId, detail) {
        const intel = window.IntelManager?.lookup(intelId);
        const cost = (intel?.significance?.historical || 10) * 5; // Theoretical resource cost

        this.consequenceLedger.push({
            day: window.EngineParams?.worldDay || 0,
            type,
            intelId,
            detail,
            cost
        });

        this.stats.historicalDistortionCost += cost;
        this.stats.totalFalsehoodImpact += 1;

        window.EventBus.emit('UI_LOG_DEBUG', `[MISINFO_COST] ${type}: ${detail} (Cost: ${cost})`);
    }

    getMisinformationConsequenceScore() {
        // High score = Falsehood is dangerously influential
        return (this.stats.warsStartedByRumors * 10) + 
               (this.stats.tradeCollapsesByMisinfo * 5) + 
               (this.stats.wastedExpeditions * 3);
    }

    generateMisinfoAudit() {
        return {
            title: "CIVILIZATIONAL MISINFORMATION AUDIT",
            global_impact_score: this.getMisinformationConsequenceScore(),
            metrics: this.stats,
            top_consequences: this.consequenceLedger.slice(-5),
            verdict: this._getAuditVerdict()
        };
    }

    _getAuditVerdict() {
        const score = this.getMisinformationConsequenceScore();
        if (score > 100) return "CATASTROPHIC DISTORTION: Falsehoods are the primary driver of world history.";
        if (score > 30) return "SIGNIFICANT FRICTION: Misinformation is causing measurable resource loss.";
        return "EPISTEMIC STABILITY: Civilization is successfully filtering out dangerous lies.";
    }
}

window.MisinfoBureau = new InformationConsequenceBureau();
export default window.MisinfoBureau;
