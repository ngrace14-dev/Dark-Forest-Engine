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
    },

    // Accumulated 30% Scalar-to-Framework vector pressures
    frameworkVectors: {},

    // Equilibrium baselines for homeostatic multi-century stability
    baselines: {
        WORLD_ENTROPY: 0.15,
        TRUTH_DECAY: 0.15,
        MATERIAL_STRESS: 0.20,
        BIOLOGICAL_LOAD: 0.15,
        COHESION_INDEX: 0.75,
        LEGITIMACY_INDEX: 0.70,
        SIGNIFICANCE_DENSITY: 0.20,
        FEAR_LOAD: 0.15,
        TRUST_DENSITY: 0.65,
        DISCOVERY_PRESSURE: 0.20,
        VIOLENCE_POTENTIAL: 0.10
    }
};

/**
 * FRAMEWORK 1: SCALAR FLUX
 * Responsible for scalar accumulation, interaction, normalization, and threshold checks.
 */
window.ScalarFlux = {
    metrics: {
        totalNudgesApplied: 0,
        scalarFluxApplied: 0,
        frameworkPressureApplied: 0,
        activeSystemCount: 0,
        cyclesCompleted: 0
    },

    init: function() {
        console.log("%c🟢 Framework 1: Scalar Flux Initialized", "color: #60a5fa; font-weight: bold;");
        
        // Register for heartbeat to process flux
        if (window.EventBus) {
            window.EventBus.on('HEARTBEAT_TICK', () => this.update());
        }
    },

    normalizeSystemVectors: function(sys) {
        if (sys.vectors && (sys.vectors.scalar_to_scalar || sys.vectors.scalar_to_framework)) {
            return {
                scalar_to_scalar: { ...(sys.vectors.scalar_to_scalar || {}) },
                scalar_to_framework: { ...(sys.vectors.scalar_to_framework || {}) }
            };
        }
        const scalar_to_scalar = {};
        const scalar_to_framework = {};
        if (Array.isArray(sys.scalar_vectors)) {
            sys.scalar_vectors.forEach(([scalar, op, mag]) => {
                const signed = op === '-' ? -Number(mag) : Number(mag);
                if (Number.isFinite(signed)) scalar_to_scalar[scalar] = (scalar_to_scalar[scalar] || 0) + signed;
            });
        }
        if (Array.isArray(sys.framework_modifiers)) {
            sys.framework_modifiers.forEach(([mod, val]) => {
                if (Number.isFinite(Number(val))) scalar_to_framework[mod] = (scalar_to_framework[mod] || 0) + Number(val);
            });
        }
        return { scalar_to_scalar, scalar_to_framework };
    },

    isSystemTriggered: function(sys, scalars) {
        if (sys.triggers) {
            for (const [scalar, cond] of Object.entries(sys.triggers)) {
                const current = scalars[scalar];
                if (current === undefined || typeof cond !== 'string') continue;
                const match = cond.match(/^([<>]=?|=+)\s*([0-9.]+)$/);
                if (match) {
                    const [, op, rawVal] = match;
                    const threshold = parseFloat(rawVal);
                    if (op === '>' && !(current > threshold)) return false;
                    if (op === '>=' && !(current >= threshold)) return false;
                    if (op === '<' && !(current < threshold)) return false;
                    if (op === '<=' && !(current <= threshold)) return false;
                }
            }
            return true;
        }
        if (sys.activation_logic?.threshold) {
            const match = sys.activation_logic.threshold.match(/^([A-Z_]+)\s*([<>]=?|=+)\s*([0-9.]+)$/);
            if (match) {
                const [, scalar, op, rawVal] = match;
                const current = scalars[scalar];
                const threshold = parseFloat(rawVal);
                if (current !== undefined) {
                    if (op === '>' && !(current > threshold)) return false;
                    if (op === '>=' && !(current >= threshold)) return false;
                    if (op === '<' && !(current < threshold)) return false;
                    if (op === '<=' && !(current <= threshold)) return false;
                }
            }
        }
        return true;
    },

    evaluateSystemDefinitions: function(dampingScale = 0.01) {
        const defs = window.SystemDefinitions;
        if (!Array.isArray(defs) || defs.length === 0) return [];
        const scalars = window.CivilizationState.scalars;
        window.CivilizationState.frameworkVectors = {};
        const activeSystems = [];

        for (let i = 0; i < defs.length; i++) {
            const sys = defs[i];
            if (!this.isSystemTriggered(sys, scalars)) continue;
            const normalizedVectors = this.normalizeSystemVectors(sys);
            const sysId = sys.id || sys.system_id || sys.name || `sys_${i}`;
            this.applySystemNudge(sysId, normalizedVectors, dampingScale);
            activeSystems.push({
                ...sys,
                id: sysId,
                vectors: {
                    scalar_to_scalar: normalizedVectors.scalar_to_scalar,
                    scalar_to_framework: Object.fromEntries(
                        Object.entries(normalizedVectors.scalar_to_framework).map(([k, v]) => [
                            k,
                            v * window.CivilizationState.systemInfluence.scalarToFramework
                        ])
                    )
                }
            });
        }
        this.metrics.activeSystemCount = activeSystems.length;
        if (window.EventBus) window.EventBus.emit('ACTIVE_SYSTEMS_UPDATED', activeSystems);
        return activeSystems;
    },

    /**
     * Applies a vector nudge to the civilization scalars from a system.
     * Enforces Engine Law #5 (70% Scalar-to-Scalar / 30% Scalar-to-Framework).
     */
    applySystemNudge: function(systemId, vectors, scale = 1.0) {
        if (!vectors) return;
        const s2sWeight = window.CivilizationState.systemInfluence.scalarToScalar; // 0.70
        const s2fWeight = window.CivilizationState.systemInfluence.scalarToFramework; // 0.30
        this.metrics.totalNudgesApplied++;

        if (vectors.scalar_to_scalar) {
            for (const [scalar, magnitude] of Object.entries(vectors.scalar_to_scalar)) {
                if (window.CivilizationState.deltas[scalar] !== undefined && Number.isFinite(magnitude)) {
                    const weightedDelta = magnitude * s2sWeight * scale;
                    window.CivilizationState.deltas[scalar] += weightedDelta;
                    this.metrics.scalarFluxApplied += Math.abs(weightedDelta);
                }
            }
        }
        if (vectors.scalar_to_framework) {
            for (const [modifier, magnitude] of Object.entries(vectors.scalar_to_framework)) {
                if (Number.isFinite(magnitude)) {
                    const weightedPressure = magnitude * s2fWeight * scale;
                    window.CivilizationState.frameworkVectors[modifier] =
                        (window.CivilizationState.frameworkVectors[modifier] || 0) + weightedPressure;
                    this.metrics.frameworkPressureApplied += Math.abs(weightedPressure);
                }
            }
        }
        if (window.Profiler && window.Profiler.logFlux) {
            window.Profiler.logFlux(systemId, vectors);
        }
    },

    /**
     * Main update loop for civilization scalars.
     */
    update: function() {
        const state = window.CivilizationState.scalars;
        const deltas = window.CivilizationState.deltas;
        const baselines = window.CivilizationState.baselines;
        this.metrics.cyclesCompleted++;

        // 0. EVALUATE TIER-C SYSTEM DEFINITIONS (Engine Law #5 70/30 Split)
        this.evaluateSystemDefinitions(0.01);

        // 1. APPLY DELTAS
        for (const scalar in state) {
            state[scalar] += deltas[scalar];
            deltas[scalar] = 0; // Clear for next tick
        }

        // 2. SCALAR-TO-SCALAR INTERACTIONS (Atmospheric Friction)
        if (state.FEAR_LOAD > 0.5) {
            state.TRUST_DENSITY -= (state.FEAR_LOAD - 0.5) * 0.01;
        }
        state.MATERIAL_STRESS += state.WORLD_ENTROPY * 0.005;
        if (state.LEGITIMACY_INDEX < 0.4) {
            state.VIOLENCE_POTENTIAL += (0.4 - state.LEGITIMACY_INDEX) * 0.01;
        }
        state.DISCOVERY_PRESSURE += state.SIGNIFICANCE_DENSITY * 0.002;

        // 2B. HOMEOSTATIC RESTORATION
        if (baselines) {
            for (const scalar in state) {
                const base = baselines[scalar] ?? 0.5;
                state[scalar] += (base - state[scalar]) * 0.08;
            }
        }

        // 3. NORMALIZATION (Keep values between 0.01 and 0.99)
        for (const scalar in state) {
            if (!Number.isFinite(state[scalar])) state[scalar] = baselines?.[scalar] ?? 0.5;
            state[scalar] = Math.max(0.01, Math.min(0.99, state[scalar]));
        }

        // 4. THRESHOLD CHECKS & GLOBAL EVENTS
        this.checkThresholds(state);

        // 5. EMIT UPDATE
        if (window.EventBus) {
            window.EventBus.emit('CIV_SCALARS_UPDATED', state);
        }
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
