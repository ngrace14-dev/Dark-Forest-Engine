/**
 * DARK FOREST ENGINE - SYSTEM DEFINITIONS (TIER C)
 * 
 * Each system is a static data definition.
 * Enforces Engine Law #5 (70/30).
 */

window.SystemDefinitions = [
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
