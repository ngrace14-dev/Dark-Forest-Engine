/**
 * DARK FOREST ENGINE - SIMULATION PROFILER (FRAMEWORK 5)
 * 
 * Role: Real-time visibility and flux monitoring.
 */

window.CivProfiler = {
    init: function() {
        console.log("%c🟢 Framework 5: Simulation Profiler Initialized", "color: #a78bfa; font-weight: bold;");
        this.fluxHistory = [];
        this.interceptionLog = [];
        this.activeSystemSnapshot = [];
        
        window.EventBus.on('CIV_SCALARS_UPDATED', (scalars) => this.recordSnapshot(scalars));
        window.EventBus.on('ACTIVE_SYSTEMS_UPDATED', (systems) => this.activeSystemSnapshot = systems);
    },

    recordSnapshot: function(scalars) {
        this.fluxHistory.push({
            tick: window.EngineParams.worldTimer || 0,
            scalars: { ...scalars },
            activeCount: this.activeSystemSnapshot.length
        });

        // Keep last 100 ticks
        if (this.fluxHistory.length > 100) this.fluxHistory.shift();
    },

    logFlux: function(systemId, vectors) {
        // Console output for high-priority flux monitoring
        if (Math.abs(Object.values(vectors.scalar_to_scalar || {}).reduce((a, b) => a + b, 0)) > 0.05) {
            console.warn(`[PROFILER] High Flux Event from System ${systemId}`, vectors);
        }
    },

    logInterception: function(type, data) {
        this.interceptionLog.push({ type, data, timestamp: performance.now() });
        if (this.interceptionLog.length > 50) this.interceptionLog.shift();
    },

    /**
     * Diagnostic View: Returns the "Drivers" of a specific scalar.
     */
    getDriversFor: function(scalarName) {
        return this.activeSystemSnapshot
            .filter(sys => sys.vectors.scalar_to_scalar[scalarName])
            .map(sys => ({ name: sys.name, magnitude: sys.vectors.scalar_to_scalar[scalarName] }));
    }
};

// Auto-initialize Profiler
window.CivProfiler.init();
