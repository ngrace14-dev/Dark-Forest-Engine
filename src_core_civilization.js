/**
 * DARK FOREST ENGINE - CIVILIZATION LAYER
 * 
 * TIER A: Scalar Registry (The Atmosphere)
 * TIER B: Framework 1 - Scalar Flux (The Engine)
 * 
 * Engine Law #5: 70% Scalar-to-Scalar / 30% Scalar-to-Framework.
 */

window.CivilizationState = {
    // 11 Core Civilization Scalars (0.0 - 1.0)
    scalars: {
        WORLD_ENTROPY: 0.1,        // Decay/Friction
        TRUTH_DECAY: 0.1,         // Noise/Entropy
        MATERIAL_STRESS: 0.2,     // Scarcity/Difficulty
        BIOLOGICAL_LOAD: 0.1,     // Pathology/Fatigue
        COHESION_INDEX: 0.8,      // Social Alignment
        LEGITIMACY_INDEX: 0.7,    // Institutional Validity
        SIGNIFICANCE_DENSITY: 0.1,// Narrative Weight
        FEAR_LOAD: 0.1,           // Survival Drive
        TRUST_DENSITY: 0.7,       // Inter-agent Reliability
        DISCOVERY_PRESSURE: 0.1,  // Innovation Drive
        VIOLENCE_POTENTIAL: 0.05   // Threshold to Conflict
    },

    // Tracking for Flux calculations
    deltas: {
        WORLD_ENTROPY: 0, TRUTH_DECAY: 0, MATERIAL_STRESS: 0, BIOLOGICAL_LOAD: 0,
        COHESION_INDEX: 0, LEGITIMACY_INDEX: 0, SIGNIFICANCE_DENSITY: 0, FEAR_LOAD: 0,
        TRUST_DENSITY: 0, DISCOVERY_PRESSURE: 0, VIOLENCE_POTENTIAL: 0
    },

    // System influence tracking (Law #5 Enforcement)
    systemInfluence: {
        scalarToScalar: 0.7,
        scalarToFramework: 0.3
    }
};

/**
 * FRAMEWORK 1: SCALAR FLUX
 * Responsible for scalar accumulation, interaction, normalization, and threshold checks.
 */
window.ScalarFlux = {
    init: function() {
        console.log("%c🟢 Framework 1: Scalar Flux Initialized", "color: #60a5fa; font-weight: bold;");
        
        // Register for heartbeat to process flux
        window.EventBus.on('HEARTBEAT_TICK', () => this.update());
    },

    /**
     * Applies a vector nudge to the civilization scalars from a system.
     * Enforces Engine Law #5 (Emergence Ratio).
     */
    applySystemNudge: function(systemId, vectors) {
        // Enforce 70/30 split if the system provides both types of vectors
        // For now, we process the scalar_to_scalar vector nudges
        if (vectors.scalar_to_scalar) {
            for (const [scalar, magnitude] of Object.entries(vectors.scalar_to_scalar)) {
                if (window.CivilizationState.deltas[scalar] !== undefined) {
                    window.CivilizationState.deltas[scalar] += magnitude;
                }
            }
        }
        
        // Log the nudge for the Profiler (Build 5)
        if (window.Profiler && window.Profiler.logFlux) {
            window.Profiler.logFlux(systemId, vectors);
        }
    },

    /**
     * Main update loop for civilization scalars.
     * Processes interaction, normalization, and global entropy.
     */
    update: function() {
        const state = window.CivilizationState.scalars;
        const deltas = window.CivilizationState.deltas;

        // 1. APPLY DELTAS
        for (const scalar in state) {
            state[scalar] += deltas[scalar];
            deltas[scalar] = 0; // Clear for next tick
        }

        // 2. SCALAR-TO-SCALAR INTERACTIONS (Atmospheric Friction)
        // These are hard-coded "gravity" relationships between scalars
        
        // High FEAR_LOAD suppresses TRUST_DENSITY
        if (state.FEAR_LOAD > 0.5) {
            state.TRUST_DENSITY -= (state.FEAR_LOAD - 0.5) * 0.01;
        }

        // High WORLD_ENTROPY increases MATERIAL_STRESS
        state.MATERIAL_STRESS += state.WORLD_ENTROPY * 0.005;

        // Low LEGITIMACY increases VIOLENCE_POTENTIAL
        if (state.LEGITIMACY_INDEX < 0.4) {
            state.VIOLENCE_POTENTIAL += (0.4 - state.LEGITIMACY_INDEX) * 0.01;
        }

        // High SIGNIFICANCE_DENSITY increases DISCOVERY_PRESSURE
        state.DISCOVERY_PRESSURE += state.SIGNIFICANCE_DENSITY * 0.002;

        // 3. NORMALIZATION (Keep values between 0.0 and 1.0)
        for (const scalar in state) {
            state[scalar] = Math.max(0, Math.min(1, state[scalar]));
        }

        // 4. THRESHOLD CHECKS & GLOBAL EVENTS
        this.checkThresholds(state);

        // 5. EMIT UPDATE
        window.EventBus.emit('CIV_SCALARS_UPDATED', state);
    },

    checkThresholds: function(state) {
        // Example: Collapse trigger
        if (state.WORLD_ENTROPY > 0.9 && state.LEGITIMACY_INDEX < 0.1) {
            window.EventBus.emit('CIV_COLLAPSE_WARNING', "Civilization structure is failing.");
        }

        // Example: Violence outbreak
        if (state.VIOLENCE_POTENTIAL > 0.8) {
            window.EventBus.emit('CIV_VIOLENCE_OUTBREAK', "Civil unrest reaching critical levels.");
        }
    }
};

// Auto-initialize Flux Framework
window.ScalarFlux.init();
