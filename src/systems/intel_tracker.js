/**
 * File: src_systems_intel_tracker.js
 * Tracks the Global Information Economy: Truth vs. Corruption.
 * Provides high-level telemetry on the "Health" of world knowledge.
 */

window.IntelTracker = {
    stats: {
        totalRecords: 0,
        trueFacts: 0,       // Verified TRUE
        falseFacts: 0,      // Verified FALSE (The "Known Lie")
        activeRumors: 0,    // Unverified
        fabrications: 0,    // Intentional LIES (Unknown to general pop)
        distortedRecords: 0,// Unintentional entropy from propagation
        globalFidelity: 1.0 // 0.0 to 1.0 (Overall truthiness of the world)
    },

    update: function() {
        if (!window.IntelManager) return;

        const registry = window.IntelManager.registry;
        const archive = window.IntelManager.archive;
        
        let tCount = 0;
        let fCount = 0;
        let rCount = 0;
        let fabCount = 0;
        let distCount = 0;

        const allRecords = [...registry.values(), ...archive.values()];
        const total = allRecords.length;

        allRecords.forEach(record => {
            // 1. Truth State (Objective Reality)
            if (record.truth_state === window.IntelEnums.TRUTH_STATE.TRUE) tCount++;
            if (record.truth_state === window.IntelEnums.TRUTH_STATE.FALSE) {
                fCount++;
                // Check if it was intentionally fabricated
                if (record.provenance?.some(p => p.origin_type === 'FABRICATOR')) {
                    fabCount++;
                }
            }
            
            // 2. Certainty (Subjective State)
            if (record.truth_state === window.IntelEnums.TRUTH_STATE.UNKNOWN) rCount++;

            // 3. Distortion (Lineage entropy)
            if (record.parent_intel_id && record.certainty < 1.0) {
                 // If it's a version of a record that has lost fidelity compared to its parent
                 const parent = window.IntelManager.lookup(record.parent_intel_id);
                 if (parent && record.certainty < parent.certainty) {
                     distCount++;
                 }
            }
        });

        this.stats.totalRecords = total;
        this.stats.trueFacts = tCount;
        this.stats.falseFacts = fCount;
        this.stats.activeRumors = rCount;
        this.stats.fabrications = fabCount;
        this.stats.distortedRecords = distCount;
        
        // Calculate Global Fidelity: (True Facts / (True + Lies + Distortions))
        const noise = fCount + distCount;
        this.stats.globalFidelity = total > 0 ? (tCount / Math.max(1, (tCount + noise))) : 1.0;

        this.broadcast();
    },

    broadcast: function() {
        // Log to Crow's Eye if active
        if (window.EngineConfig?.crowsEyeMode) {
             console.log(`[INTEL TRACKER] Fidelity: ${(this.stats.globalFidelity * 100).toFixed(1)}% | Truth: ${this.stats.trueFacts} | Noise: ${this.stats.falseFacts + this.stats.distortedRecords}`);
        }
        window.EventBus?.emit('INTEL_TRACKER_UPDATE', this.stats);
    }
};

// Hook into the day cycle or engine update
window.EventBus?.on('ENGINE_READY', () => {
    // Initial update
    window.IntelTracker.update();
});

// Update periodically or on specific events
window.EventBus?.on('INTEL_REGISTERED', () => window.IntelTracker.update());
window.EventBus?.on('INTEL_VERIFIED', () => window.IntelTracker.update());
