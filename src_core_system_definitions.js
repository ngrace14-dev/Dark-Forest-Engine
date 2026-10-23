/**
 * DARK FOREST ENGINE - SYSTEM DEFINITIONS (TIER C)
 * 
 * Each system is a static data definition.
 * Enforces Engine Law #5 (70/30).
 */

window.SystemDefinitions = [
    // --- PHASE 1: THE MATERIAL BEDROCK ---
    {
        id: 11,
        name: "Shift Cycle",
        tier: "Environment",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: 0.01, BIOLOGICAL_LOAD: 0.01 },
            scalar_to_framework: { labor_fatigue_penalty: 0.05 }
        },
        triggers: null // Constant pressure
    },
    {
        id: 16,
        name: "Environment",
        tier: "Environment",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { MATERIAL_STRESS: 0.02, BIOLOGICAL_LOAD: 0.01 },
            scalar_to_framework: { resource_yield_modifier: -0.05 }
        },
        triggers: null
    },
    {
        id: 18,
        name: "Structural Decay",
        tier: "Environment",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: 0.05, MATERIAL_STRESS: 0.02 },
            scalar_to_framework: { maintenance_cost_multiplier: 1.2 }
        },
        triggers: { WORLD_ENTROPY: ">0.3" }
    },
    {
        id: 19,
        name: "Weather",
        tier: "Environment",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { MATERIAL_STRESS: 0.03, FEAR_LOAD: 0.02 },
            scalar_to_framework: { travel_speed_modifier: -0.1, visibility_range: -0.2 }
        },
        triggers: null
    },
    {
        id: 21,
        name: "Fuel Pipeline",
        tier: "Economy",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { MATERIAL_STRESS: -0.05, LEGITIMACY_INDEX: 0.02 },
            scalar_to_framework: { industrial_output_multiplier: 1.1 }
        },
        triggers: { MATERIAL_STRESS: ">0.1" }
    },
    {
        id: 23,
        name: "Material Extraction",
        tier: "Economy",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { MATERIAL_STRESS: -0.1, WORLD_ENTROPY: 0.02 },
            scalar_to_framework: { pollution_rate: 0.05 }
        },
        triggers: { DISCOVERY_PRESSURE: ">0.2" }
    },
    {
        id: 24,
        name: "Bio-Supply Chain",
        tier: "Economy",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { BIOLOGICAL_LOAD: -0.05, MATERIAL_STRESS: 0.02 },
            scalar_to_framework: { food_stability: 0.1 }
        },
        triggers: { MATERIAL_STRESS: "<0.8" }
    },
    {
        id: 27,
        name: "Agriculture",
        tier: "Economy",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { BIOLOGICAL_LOAD: -0.1, COHESION_INDEX: 0.05 },
            scalar_to_framework: { settlement_stability: 0.1 }
        },
        triggers: null
    },
    {
        id: 85,
        name: "Energy",
        tier: "Technology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { MATERIAL_STRESS: -0.05, DISCOVERY_PRESSURE: 0.02 },
            scalar_to_framework: { automation_efficiency: 0.1 }
        },
        triggers: { MATERIAL_STRESS: ">0.4" }
    },
    {
        id: 86,
        name: "Civil Engineering",
        tier: "Technology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { COHESION_INDEX: 0.05, MATERIAL_STRESS: -0.02 },
            scalar_to_framework: { logistics_range_multiplier: 1.2 }
        },
        triggers: { LEGITIMACY_INDEX: ">0.4" }
    },
    {
        id: 89,
        name: "Infrastructure Resilience",
        tier: "Technology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: -0.05, MATERIAL_STRESS: 0.02 },
            scalar_to_framework: { maintenance_interval_multiplier: 1.5 }
        },
        triggers: { DISCOVERY_PRESSURE: ">0.5" }
    },

    // --- EXISTING CORE SYSTEMS ---
    {
        id: 36,
        name: "Corruption",
        tier: "Governance",
        framework: "ConsequenceInterceptor",
        vectors: {
            // Law #5: 70% Scalar-to-Scalar
            scalar_to_scalar: {
                LEGITIMACY_INDEX: -0.05,
                TRUTH_DECAY: 0.02,
                WORLD_ENTROPY: 0.01
            },
            // Law #5: 30% Scalar-to-Framework
            scalar_to_framework: {
                reward_redirect: 0.2, // Redirects 20% of contract rewards
                integrity_friction: 0.1
            }
        },
        triggers: {
            LEGITIMACY_INDEX: "<0.4",
            TRUST_DENSITY: "<0.5"
        }
    },
    {
        id: 64,
        name: "Disease",
        tier: "Biology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: {
                BIOLOGICAL_LOAD: 0.1,
                FEAR_LOAD: 0.05,
                WORLD_ENTROPY: 0.02
            },
            scalar_to_framework: {
                fatigue_multiplier: 1.5,
                recovery_rate: -0.2
            }
        },
        triggers: {
            BIOLOGICAL_LOAD: ">0.3"
        }
    },
    {
        id: 78,
        name: "Rebellion",
        tier: "Conflict",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: {
                LEGITIMACY_INDEX: -0.1,
                VIOLENCE_POTENTIAL: 0.2,
                WORLD_ENTROPY: 0.1
            },
            scalar_to_framework: {
                contract_type_redirection: "Conflict",
                labor_cost_scaling: 2.0
            }
        },
        triggers: {
            LEGITIMACY_INDEX: "<0.2",
            VIOLENCE_POTENTIAL: ">0.6"
        }
    },
    {
        id: 03,
        name: "Information Entropy",
        tier: "Epistemology",
        framework: "EpistemicFilter",
        vectors: {
            scalar_to_scalar: {
                TRUTH_DECAY: 0.05,
                SIGNIFICANCE_DENSITY: -0.02
            },
            scalar_to_framework: {
                packet_corruption_chance: 0.1,
                field_masking_depth: 0.2
            }
        },
        triggers: {
            TRUTH_DECAY: ">0.4"
        }
    }
];

window.SystemLoader = {
    init: function() {
        console.log("%c🟢 Tier C: System Definition Loader Initialized", "color: #fbbf24; font-weight: bold;");
        this.activeSystems = [];
        
        window.EventBus.on('CIV_SCALARS_UPDATED', (scalars) => this.processTriggers(scalars));
    },

    processTriggers: function(scalars) {
        this.activeSystems = window.SystemDefinitions.filter(system => {
            if (!system.triggers) return true; // Constant systems
            
            return Object.entries(system.triggers).every(([scalar, condition]) => {
                const val = scalars[scalar];
                if (condition.startsWith('<')) return val < parseFloat(condition.slice(1));
                if (condition.startsWith('>')) return val > parseFloat(condition.slice(1));
                return true;
            });
        });

        // For each active system, apply scalar nudges
        this.activeSystems.forEach(sys => {
            window.ScalarFlux.applySystemNudge(sys.id, sys.vectors);
        });

        // Emit active systems for Profiler and other Frameworks
        window.EventBus.emit('ACTIVE_SYSTEMS_UPDATED', this.activeSystems);
    }
};

// Auto-initialize Loader
window.SystemLoader.init();
