/**
 * File: src_systems_historical_capture_bureau.js
 * Historical Capture Bureau (HCB)
 * 
 * Objective: 
 * Monitor the transformation of ground-truth events into institutional history.
 * Tracks the decay of truth and the success of propaganda.
 */

class HistoricalCaptureBureau {
    constructor() {
        // Tracks the lifecycle of a narrative: Fact -> Rumor -> Myth -> History
        this.narrativeChains = new Map(); // Map<eventId, ChainObject>
        
        this.metrics = {
            captureRate: 0,           // Ratio of events that become official history
            propagandaSuccess: 0,     // Frequency of false rumors becoming accepted facts
            narrativeControl: {},     // houseId -> controlScore
            rewritingFrequency: 0,    // Rate of record deletion/modification
            truthDecay: 0             // Average distortion between event and archive
        };

        this.stats = {
            totalEvents: 0,
            officialHistories: 0,
            falsehoodsVindicated: 0,
            manipulationEvents: 0
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        // 1. Truth Entry
        window.EventBus.on('CHRONICLE_EVENT_RECORDED', (event) => this.trackNewEvent(event));
        
        // 2. Rumor Spreading
        window.EventBus.on('INTEL_REGISTERED', (intel) => this.processIntelLink(intel));
        
        // 3. Mythic Crystallization
        window.EventBus.on('FOLKLORE_GENERATED', (poem) => this.processFolkloreLink(poem));
        
        // 4. Institutionalization
        window.EventBus.on('INTEL_INSTITUTIONALIZED', (data) => this.processCapture(data));

        // Periodic Audit
        window.EventBus.on('SHIFT_COMPLETE', () => this.auditHistoryRewriting());

        window.EventBus.emit('UI_LOG', '[Bureau] Historical Capture Monitoring Active');
    }

    /**
     * TIER 1: THE NARRATIVE CHAIN
     */

    trackNewEvent(event) {
        this.stats.totalEvents++;
        this.narrativeChains.set(event.id, {
            origin: event,
            rumors: [],
            myths: [],
            officialHistory: null,
            distortion: 0,
            isCaptureComplete: false,
            timestamp: Date.now()
        });
    }

    processIntelLink(intel) {
        // Find if this intel refers back to an event (via tags or description)
        // Check for specific payload.origin_event_id or look for event IDs in description
        const originId = intel.origin_event_id || intel.payload?.origin_event_id;
        if (!originId) return;

        const chain = this.narrativeChains.get(originId);
        if (chain) {
            chain.rumors.push(intel.intel_id);
            
            // Measure early distortion
            if (intel.truth_state === 'FALSE' || (intel.certainty < 0.5 && intel.type === 'RUMOR')) {
                chain.distortion = Math.max(chain.distortion, 0.4);
            }
        }
    }

    processFolkloreLink(poem) {
        // Find the event associated with the poem
        let originEventId = poem.originId; // Most poems store originId as the Chronicle Event ID
        
        if (!originEventId && poem.origin_intel_id) {
             const intel = window.IntelManager?.lookup(poem.origin_intel_id);
             originEventId = intel?.origin_event_id;
        }

        if (originEventId) {
            const chain = this.narrativeChains.get(originEventId);
            if (chain) {
                chain.myths.push(poem.id);
                chain.distortion = Math.max(chain.distortion, poem.distortionLevel || 0.6);
            }
        }
    }

    /**
     * TIER 2: CAPTURE & MANIPULATION
     */

    processCapture(data) {
        // data: { houseId, intelId }
        const intel = window.IntelManager?.lookup(data.intelId);
        if (!intel) return;

        const originEventId = intel.origin_event_id || intel.payload?.origin_event_id;
        if (!originEventId) return;

        const chain = this.narrativeChains.get(originEventId);
        if (chain) {
            chain.officialHistory = {
                houseId: data.houseId,
                day: window.EngineParams?.worldDay || 0,
                intelId: data.intelId
            };
            chain.isCaptureComplete = true;
            this.stats.officialHistories++;

            // Propaganda Check: If the accepted history is based on a FALSE fact
            if (intel.truth_state === 'FALSE') {
                this.stats.falsehoodsVindicated++;
                window.EventBus.emit('UI_LOG_DEBUG', `[BUREAU] Propaganda Success: House ${data.houseId} has institutionalized a falsehood.`);
            }

            this.updateControlScore(data.houseId, intel.significance?.political || 10);
            this.calculateGlobalMetrics();
        }
    }

    updateControlScore(houseId, weight) {
        if (!this.metrics.narrativeControl[houseId]) this.metrics.narrativeControl[houseId] = 0;
        this.metrics.narrativeControl[houseId] += weight;
    }

    /**
     * Measures "History Rewriting"
     * Checks if events that were once public have been purged from the primary registry
     * but remain in a single House's archive (Archive Manipulation).
     */
    auditHistoryRewriting() {
        if (!window.IntelManager || !window.DynastyManager) return;

        let deletions = 0;
        this.narrativeChains.forEach(chain => {
            // Check if origin event is missing from public record but captured by a house
            const isMissingPublicly = !window.ChronicleManager?.worldLedger.find(e => e.id === chain.origin.id);
            
            if (isMissingPublicly && chain.isCaptureComplete) {
                deletions++;
                this.stats.manipulationEvents++;
                window.EventBus.emit('UI_LOG_DEBUG', `[BUREAU] Archive Manipulation Detected: ${chain.origin.id} is now private house property.`);
            }
        });

        this.metrics.rewritingFrequency = deletions / (this.stats.totalEvents || 1);
    }

    /**
     * TIER 3: OUTPUT & METRICS
     */

    calculateGlobalMetrics() {
        this.metrics.captureRate = this.stats.officialHistories / (this.stats.totalEvents || 1);
        this.metrics.propagandaSuccess = this.stats.falsehoodsVindicated / (this.stats.officialHistories || 1);
        
        // Average distortion across all captured narratives
        let totalDist = 0;
        let count = 0;
        this.narrativeChains.forEach(c => {
            if (c.isCaptureComplete) {
                totalDist += c.distortion;
                count++;
            }
        });
        this.metrics.truthDecay = count > 0 ? totalDist / count : 0;
    }

    getCaptureObservatoryReport() {
        return {
            metrics: this.metrics,
            houses: this.getDominantHouses(),
            falsehoodRatio: this.metrics.propagandaSuccess,
            manipulationIndex: this.metrics.rewritingFrequency
        };
    }

    getDominantHouses() {
        return Object.entries(this.metrics.narrativeControl)
            .sort((a, b) => b[1] - a[1])
            .map(([id, score]) => ({ id, score }));
    }
}

window.HistoricalCaptureBureau = new HistoricalCaptureBureau();
export default window.HistoricalCaptureBureau;
