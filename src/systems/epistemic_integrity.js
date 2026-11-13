/**
 * GENESIS ENGINE - ECHO CHAMBER DETECTION FRAMEWORK
 * Directorate: Epistemic Integrity
 * 
 * Detects and mitigates self-reinforcing misinformation loops and institutional echo chambers.
 */

class EpistemicIntegritySystem {
    constructor() {
        this.anomalies = [];
        this.stats = {
            globalTruthResilience: 1.0,
            echoChamberIndex: 0.0,
            mirageSaturation: 0.0,
            circularVerificationCount: 0
        };

        this.history = [];

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('INTEL_REGISTERED', (intel) => this.auditIntel(intel));
        window.EventBus.on('HEARTBEAT_T6H', () => this.performDirectorateAudit());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🛡️ [Epistemic] Integrity Directorate Active');
    }

    /**
     * Scans newly registered intel for circularity and mirage consensus.
     */
    auditIntel(intel) {
        if (!intel.provenance) return;

        // 1. DETECT CIRCULAR VERIFICATION
        // Rule: If a rumor returns to its origin node with increased certainty via hearsay.
        if (intel.provenance.transmission_count > 5) {
            const originNodeId = intel.provenance.origin?.node_id;
            if (!originNodeId) return;

            const currentHolders = window.IntelManager?.ownershipRegistry.get(intel.intel_id);
            if (currentHolders && currentHolders.has(originNodeId) && intel.certainty > 0.8) {
                this._flagAnomaly("CIRCULAR_VERIFICATION", {
                    intelId: intel.intel_id,
                    origin: originNodeId,
                    certainty: intel.certainty
                });
                this.stats.circularVerificationCount++;
            }
        }

        // 2. DETECT MIRAGE CONSENSUS
        // Rule: High saturation (>50 nodes) with zero objective verification.
        if (window.IntelManager) {
            const owners = window.IntelManager.ownershipRegistry.get(intel.intel_id)?.size || 0;
            if (owners > 50 && intel.truth_state === 'UNKNOWN') {
                this._flagAnomaly("MIRAGE_CONSENSUS", {
                    intelId: intel.intel_id,
                    saturation: owners
                });
            }
        }
    }

    /**
     * Performs deep analysis of institutional memory.
     */
    performDirectorateAudit() {
        if (!window.DynastyManager) return;

        let totalIsolation = 0;
        const houses = Array.from(window.DynastyManager.houses.values());

        houses.forEach(house => {
            const isolation = this.calculateIsolation(house);
            totalIsolation += isolation;

            if (isolation > 0.85) {
                window.EventBus.emit('UI_LOG_DEBUG', `[EPISTEMIC] ${house.name} is in an ECHO CHAMBER state (Isolation: ${isolation.toFixed(2)}).`);
                
                // Active Mitigation: Inject "External Friction"
                this.injectEpistemicFriction(house);
            }
        });

        this.stats.echoChamberIndex = totalIsolation / (houses.length || 1);
        this.recordSnapshot();
    }

    /**
     * Calculates how siloed a House's information is.
     * Ratio of internally-sourced intel vs externally-verified intel.
     */
    calculateIsolation(house) {
        if (!window.IntelManager) return 0;

        const archiveIds = Array.from(house.archives || []);
        if (archiveIds.length === 0) return 0;

        let internalCount = 0;
        archiveIds.forEach(id => {
            const intel = window.IntelManager.lookup(id);
            if (intel && intel.provenance.origin?.source_faction === house.id) {
                internalCount++;
            }
        });

        return internalCount / archiveIds.length;
    }

    /**
     * Mitigation: Injects "Friction" into an echo chamber.
     * Forces the House to process a contradiction or external report.
     */
    injectEpistemicFriction(house) {
        // Find a truth held by a rival house that contradicts a local rumor
        // For MVP: Simply reduce conviction of internal rumors
        if (!window.IntelManager) return;

        house.archives.forEach(id => {
            const intel = window.IntelManager.lookup(id);
            if (intel && intel.type === 'RUMOR' && intel.certainty > 0.5) {
                intel.certainty *= 0.9; // Apply "Doubt" friction
            }
        });
    }

    _flagAnomaly(type, data) {
        this.anomalies.push({
            type,
            data,
            day: window.EngineParams?.worldDay || 0
        });
        
        if (this.anomalies.length > 100) this.anomalies.shift();
        
        window.EventBus.emit('EPISTEMIC_ANOMALY', { type, data });
    }

    recordSnapshot() {
        this.history.push({
            day: window.EngineParams?.worldDay || 0,
            stats: { ...this.stats }
        });
        if (this.history.length > 50) this.history.shift();
    }

    generateEpistemicHealthReport() {
        return {
            title: "EPISTEMIC INTEGRITY DIRECTORATE: HEALTH REPORT",
            status: this.stats.echoChamberIndex > 0.7 ? "CRITICAL_ISOLATION" : "HEALTHY_DIVERSITY",
            metrics: this.stats,
            anomalies: this.anomalies.slice(-5),
            verdict: this._getVerdict()
        };
    }

    _getVerdict() {
        if (this.stats.echoChamberIndex > 0.8) return "The simulation is hallucinating. Institutions have lost contact with objective reality.";
        if (this.stats.circularVerificationCount > 10) return "Misinformation loops are endemic. Truth resilience is low.";
        return "Epistemic flow is stable. Information diversity remains high.";
    }
}

window.EpistemicIntegrity = new EpistemicIntegritySystem();
export default window.EpistemicIntegrity;
