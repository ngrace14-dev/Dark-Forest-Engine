// ============================================================================
// Dark Forest Engine - Phase 3: Adaptive Heartbeat & Virtual Zone
// File: src_core_heartbeat.js
// ============================================================================

class SystemHeartbeat {
    constructor() {
        // Track accumulated time per tier
        this.accumulators = {
            t60: 0, // 60Hz (Input, Local Physics)
            t20: 0, // 20Hz (Nearby AI, Animations)
            t5:  0, // 5Hz  (Distant AI, Pathfinding checks)
            t1:  0  // 1Hz  (Virtual Zone)
        };

        // Time thresholds
        this.thresholds = {
            t60: 1.0 / 60.0,
            t20: 1.0 / 20.0,
            t5:  1.0 / 5.0,
            t1:  1.0
        };

        // Output flags updated per frame
        this.ticks = {
            t60: false,
            t20: false,
            t5:  false,
            t1:  false
        };
    }

    /**
     * Call every frame with the raw delta time.
     * Evaluates which tiers should fire this frame.
     */
    update(delta) {
        // Reset flags
        this.ticks.t60 = false;
        this.ticks.t20 = false;
        this.ticks.t5  = false;
        this.ticks.t1  = false;

        // Accumulate time
        this.accumulators.t60 += delta;
        this.accumulators.t20 += delta;
        this.accumulators.t5  += delta;
        this.accumulators.t1  += delta;

        // Fire thresholds
        if (this.accumulators.t60 >= this.thresholds.t60) {
            this.ticks.t60 = true;
            this.accumulators.t60 -= this.thresholds.t60;
        }
        if (this.accumulators.t20 >= this.thresholds.t20) {
            this.ticks.t20 = true;
            this.accumulators.t20 -= this.thresholds.t20;
        }
        if (this.accumulators.t5 >= this.thresholds.t5) {
            this.ticks.t5 = true;
            this.accumulators.t5 -= this.thresholds.t5;
        }
        if (this.accumulators.t1 >= this.thresholds.t1) {
            this.ticks.t1 = true;
            this.accumulators.t1 -= this.thresholds.t1;
        }
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.Heartbeat = new SystemHeartbeat();
}

export default window.Heartbeat;