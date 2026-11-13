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
            mythCaptureRate: 0,       // Frequency of myths becoming institutionalized
            propagandaEffectiveness: 0,// Frequency of falsehoods becoming accepted history
            narrativeControl: {},     // Institutional dominance over the archive
            archiveCorruption: 0,     // Ratio of false/distorted entries in official history
            historicalRewriteFrequency: 0 // Frequency of post-facto record modification
        };

        this.stats = {
            totalEvents: 0,
            officialHistories: 0,
            falsehoodsVindicated: 0,
            manipulationEvents: 0,
            totalMyths: 0,
            capturedMyths: 0,
            distortedHistories: 0
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
        // Check for specific payload.sourceEventId (Chronicle) or origin_event_id
        const originId = intel.payload?.sourceEventId || intel.origin_event_id || intel.payload?.origin_event_id;
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
        this.stats.totalMyths++;
        // Find the event associated with the poem
        let originEventId = poem.originId; 
        
        // If originId is a Legend ID, find the original event
        if (originEventId && originEventId.startsWith('leg_')) {
            const legend = window.GameState?.legends?.find(l => l.id === originEventId);
            if (legend) originEventId = legend.originalEventId;
        }

        if (!originEventId && poem.origin_intel_id) {
             const intel = window.IntelManager?.lookup(poem.origin_intel_id);
             originEventId = intel?.payload?.sourceEventId || intel?.origin_event_id;
        }

        if (originEventId) {
            const chain = this.narrativeChains.get(originEventId);
            if (chain) {
                chain.myths.push(poem.id);
                chain.distortion = Math.max(chain.distortion, poem.distortionLevel || 0.6);
                
                if (chain.isCaptureComplete) {
                    this.stats.capturedMyths++;
                }
            }
        }
    }

    /**
     * TIER 2: CAPTURE & MANIPULATION
     */

    processCapture(data) {
        // data: { houseId, intelId, category }
        const intel = window.IntelManager?.lookup(data.intelId);
        if (!intel) return;

        const originEventId = intel.payload?.sourceEventId || intel.origin_event_id || intel.payload?.origin_event_id;
        if (!originEventId) return;

        const chain = this.narrativeChains.get(originEventId);
        if (chain) {
            chain.officialHistory = {
                houseId: data.houseId,
                day: window.EngineParams?.worldDay || 0,
                intelId: data.intelId,
                category: data.category || 'HISTORY'
            };
            chain.isCaptureComplete = true;
            this.stats.officialHistories++;

            // Track Myth Capture
            if (data.category === 'MYTH' || chain.myths.length > 0) {
                this.stats.capturedMyths++;
            }

            // Track Propaganda Effectiveness (Falsehoods accepted as Truth/History)
            if (intel.truth_state === 'FALSE') {
                this.stats.falsehoodsVindicated++;
                window.EventBus.emit('UI_LOG_DEBUG', `[BUREAU] Propaganda Success: House ${data.houseId} has institutionalized a falsehood: ${intel.payload.title}`);
            }

            // Track Archive Corruption (Lies or high distortion in official record)
            if (intel.truth_state === 'FALSE' || chain.distortion > 0.7) {
                this.stats.distortedHistories++;
            }

            this.updateControlScore(data.houseId, intel.significance?.political || 10);
            this.calculateGlobalMetrics();
            
            // Periodic report emission
            if (this.stats.officialHistories % 5 === 0) {
                this.emitObservatoryReport();
            }
        }
    }

    emitObservatoryReport() {
        const report = this.getCaptureObservatoryReport();
        console.log(`%c --- ${report.title} ---`, "color: #f59e0b; font-weight: bold;");
        console.log(`Myth Capture Rate:    ${(report.metrics.mythCaptureRate * 100).toFixed(1)}%`);
        console.log(`Propaganda Success:   ${(report.metrics.propagandaEffectiveness * 100).toFixed(1)}%`);
        console.log(`Archive Corruption:   ${(report.metrics.archiveCorruption * 100).toFixed(1)}%`);
        console.log(`Rewrite Frequency:    ${(report.metrics.historicalRewriteFrequency * 100).toFixed(1)}%`);
        console.log(`Summary: ${report.summary}`);
        console.log("%c -------------------------------", "color: #f59e0b;");
        
        window.EventBus.emit('MYTH_FORMATION_REPORT', report);
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

        this.metrics.historicalRewriteFrequency = deletions / (this.stats.totalEvents || 1);
    }

    /**
     * TIER 3: OUTPUT & METRICS
     */

    calculateGlobalMetrics() {
        this.metrics.mythCaptureRate = this.stats.totalMyths > 0 ? this.stats.capturedMyths / this.stats.totalMyths : 0;
        this.metrics.propagandaEffectiveness = this.stats.officialHistories > 0 ? this.stats.falsehoodsVindicated / this.stats.officialHistories : 0;
        this.metrics.archiveCorruption = this.stats.officialHistories > 0 ? this.stats.distortedHistories / this.stats.officialHistories : 0;
        
        // historicalRewriteFrequency is updated in auditHistoryRewriting()
    }

    getCaptureObservatoryReport() {
        this.calculateGlobalMetrics();
        return {
            title: "Myth Formation Observatory",
            timestamp: window.EngineParams?.worldDay || 0,
            metrics: {
                mythCaptureRate: this.metrics.mythCaptureRate,
                propagandaEffectiveness: this.metrics.propagandaEffectiveness,
                institutionalNarrativeControl: this.getDominantHouses(),
                archiveCorruption: this.metrics.archiveCorruption,
                historicalRewriteFrequency: this.metrics.historicalRewriteFrequency
            },
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const { propagandaEffectiveness, archiveCorruption } = this.metrics;
        if (propagandaEffectiveness > 0.5) return "Historical Truth is currently a commodity of the ruling houses. Myths have replaced records.";
        if (archiveCorruption > 0.3) return "The archive is suffering from high semantic drift. Institutional memory is diverging from ground truth.";
        return "Historical integrity remains within nominal parameters.";
    }

    getDominantHouses() {
        return Object.entries(this.metrics.narrativeControl)
            .sort((a, b) => b[1] - a[1])
            .map(([id, score]) => ({ id, score }));
    }
}

window.HistoricalCaptureBureau = new HistoricalCaptureBureau();
export default window.HistoricalCaptureBureau;
