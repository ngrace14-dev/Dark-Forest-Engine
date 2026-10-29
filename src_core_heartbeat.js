// ============================================================================
// Dark Forest Engine - Phase 3: Adaptive Heartbeat & Virtual Zone
// File: src_core_heartbeat.js
// ============================================================================

class SystemHeartbeat {
    constructor() {
        // Track accumulated time per tier (Real-world seconds)
        this.accumulators = {
            t60: 0,   // 60Hz (Physics/Input)
            t20: 0,   // 20Hz (Local AI)
            t5:  0,   // 5Hz  (Distant AI)
            t1:  0,   // 1Hz  (Virtual Zone)
            t30s: 0,  // Tier 1: Observation
            t5m:  0,  // Tier 2: Belief Revision
            t30m: 0,  // Tier 3: Intent Generation
            t2h:  0,  // Tier 4: Contract Evaluation
            t6h:  0,  // Tier 5: Institutional Review
            t12h: 0,  // Tier 6: Daily Simulation (12h real = 1d game)
            t30d: 0,  // Tier 6.5: Monthly Decay (CTO)
            t3_5d: 0  // Tier 7: Weekly / Shift
        };

        // Time thresholds (Real-world seconds)
        this.thresholds = {
            t60: 1.0 / 60.0,
            t20: 1.0 / 20.0,
            t5:  1.0 / 5.0,
            t1:  1.0,
            t30s: 30.0,
            t5m:  300.0,
            t30m: 1800.0,
            t2h:  7200.0,
            t6h:  21600.0,
            t12h: 43200.0,
            t30d: 2592000.0,
            t3_5d: 302400.0
        };

        // Output flags updated per frame
        this.ticks = {};
        Object.keys(this.thresholds).forEach(k => this.ticks[k] = false);
    }

    /**
     * Call every frame with the raw delta time.
     * Evaluates which tiers should fire this frame.
     */
    update(delta) {
        // Reset flags
        Object.keys(this.ticks).forEach(k => this.ticks[k] = false);

        // Accumulate and check thresholds
        Object.keys(this.accumulators).forEach(tier => {
            this.accumulators[tier] += delta;
            
            if (this.accumulators[tier] >= this.thresholds[tier]) {
                this.ticks[tier] = true;
                this.accumulators[tier] -= this.thresholds[tier];
                
                // Emit specific heartbeat events for different simulation tiers
                if (window.EventBus) {
                    window.EventBus.emit(`HEARTBEAT_${tier.toUpperCase()}`, { 
                        delta, 
                        worldDay: window.EngineParams?.worldDay || 0 
                    });
                }
            }
        });

        // Backward compatibility for Consequence Engine
        if (this.ticks.t1 && window.EventBus) {
            window.EventBus.emit('HEARTBEAT_TICK', { 
                delta, 
                worldDay: window.EngineParams?.worldDay || 0 
            });
        }
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.Heartbeat = new SystemHeartbeat();
}

export default window.Heartbeat;