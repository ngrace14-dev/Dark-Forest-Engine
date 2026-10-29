/**
 * GENESIS ENGINE - HISTORICAL DIVERGENCE OBSERVATORY
 * Directorate: Historical Divergence
 * 
 * Maps the delta between "Objective Truth" (Chronicle) and "Recorded Memory" (House Archives/Folklore).
 * Tracks the forking of narratives across 1000 years.
 */

class HistoricalDivergenceObservatory {
    constructor() {
        this.divergenceMap = new Map(); // eventId -> { objective, records: [] }
        this.stats = {
            avgDivergence: 0.0,
            narrativeForkCount: 0,
            regionalFidelity: new Map()
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('CHRONICLE_EVENT_RECORDED', (event) => this.trackEvent(event));
        window.EventBus.on('HISTORY_PUBLISHED', (narrative) => this.trackNarrative(narrative));
        window.EventBus.on('INTEL_INSTITUTIONALIZED', (data) => this.trackInstitutionalCapture(data));
        window.EventBus.on('HEARTBEAT_T12H', () => this.analyzeDivergence());
    }

    init() {
        window.EventBus.emit('UI_LOG', '📚 [Divergence] Historical Bureau Active');
    }

    /**
     * Anchors the "Objective Truth" for comparison.
     * Only tracks events with significant historical weight to prevent memory bloat.
     */
    trackEvent(event) {
        if (!event || !event.id || (event.historicalWeight || 0) < 20) return;

        this.divergenceMap.set(event.id, {
            objective: event.detail || "No detail provided.",
            records: [],
            forks: 0,
            day: window.EngineParams?.worldDay || 0
        });

        // Pruning: Keep only the last 500 significant events in the divergence map
        if (this.divergenceMap.size > 500) {
            const firstKey = this.divergenceMap.keys().next().value;
            this.divergenceMap.delete(firstKey);
        }
    }

    /**
     * Tracks an "Official History" published by a House.
     */
    trackNarrative(narrative) {
        if (!narrative || !narrative.eventId) return;
        const entry = this.divergenceMap.get(narrative.eventId);
        if (!entry) return;

        entry.records.push({
            source: narrative.bias || "Unknown House",
            type: 'OFFICIAL',
            detail: narrative.detail || "",
            divergence: this._calculateTextDivergence(entry.objective, narrative.detail || "")
        });
        
        entry.forks = entry.records.length - 1;
    }

    /**
     * Tracks how a House "Captures" and potentially twists a truth.
     */
    trackInstitutionalCapture(data) {
        const intel = window.IntelManager?.lookup(data.intelId);
        if (!intel || !intel.payload.sourceEventId) return;

        const entry = this.divergenceMap.get(intel.payload.sourceEventId);
        if (!entry) return;

        entry.records.push({
            source: data.houseId,
            type: 'INSTITUTIONAL',
            detail: intel.payload.description,
            divergence: this._calculateTextDivergence(entry.objective, intel.payload.description)
        });
    }

    /**
     * Analyzes the gap between Truth and Memory.
     */
    analyzeDivergence() {
        let totalDivergence = 0;
        let totalRecords = 0;
        let forks = 0;

        this.divergenceMap.forEach(entry => {
            if (entry.records.length > 0) {
                const eventDiv = entry.records.reduce((sum, r) => sum + r.divergence, 0) / entry.records.length;
                totalDivergence += eventDiv;
                totalRecords++;
                if (entry.records.length > 1) forks++;
            }
        });

        this.stats.avgDivergence = totalRecords > 0 ? (totalDivergence / totalRecords) : 0;
        this.stats.narrativeForkCount = forks;

        if (this.stats.avgDivergence > 0.6) {
            window.EventBus.emit('UI_LOG', '⚠️ [DIVERGENCE] Historical Integrity Critical. Reality and Memory have decoupled.');
        }
    }

    /**
     * Crude measure of how much a record differs from the objective truth.
     * Scale: 0.0 (Identical) to 1.0 (Completely Different).
     */
    _calculateTextDivergence(truth, record) {
        if (typeof truth !== 'string' || typeof record !== 'string') return 1.0;
        if (truth === record) return 0.0;

        const truthWords = new Set(truth.toLowerCase().match(/\b(\w+)\b/g) || []);
        const recordWords = record.toLowerCase().match(/\b(\w+)\b/g) || [];
        
        if (truthWords.size === 0 && recordWords.length === 0) return 0.0;
        if (truthWords.size === 0 || recordWords.length === 0) return 1.0;

        let matches = 0;
        recordWords.forEach(w => { if (truthWords.has(w)) matches++; });
        
        const overlap = matches / Math.max(truthWords.size, recordWords.length);
        return 1.0 - overlap;
    }

    generateDivergenceReport() {
        return {
            title: "HISTORICAL DIVERGENCE OBSERVATORY REPORT",
            average_divergence: this.stats.avgDivergence,
            forked_events: this.stats.narrativeForkCount,
            competing_histories_max: Array.from(this.divergenceMap.values()).reduce((max, e) => Math.max(max, e.records.length), 0),
            verdict: this._getDivergenceVerdict()
        };
    }

    _getDivergenceVerdict() {
        if (this.stats.avgDivergence > 0.7) return "MYTHIC COUPLING: Recorded history is now fiction.";
        if (this.stats.avgDivergence < 0.1) return "LITERAL STAGNATION: Memory is too perfect; folklore has no room to grow.";
        return "HEALTHY DRIFT: History is evolving through regional and institutional bias.";
    }
}

window.DivergenceBureau = new HistoricalDivergenceObservatory();
export default window.DivergenceBureau;
