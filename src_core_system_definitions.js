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

    // --- PHASE 2: THE BIOLOGICAL BURDEN ---
    {
        id: 42,
        name: "Survival",
        tier: "Psychology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.1, BIOLOGICAL_LOAD: 0.05 },
            scalar_to_framework: { logic_bypass_threshold: 0.3 } // High fear causes survival-only intent
        },
        triggers: { BIOLOGICAL_LOAD: ">0.4" }
    },
    {
        id: 48,
        name: "Physiology",
        tier: "Psychology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { BIOLOGICAL_LOAD: 0.02, WORLD_ENTROPY: 0.01 },
            scalar_to_framework: { recovery_rate_base: 0.1 }
        },
        triggers: null
    },
    {
        id: 61,
        name: "Wendigos",
        tier: "Biology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.2, VIOLENCE_POTENTIAL: 0.1 },
            scalar_to_framework: { expansion_friction: 0.3 }
        },
        triggers: { BIOLOGICAL_LOAD: ">0.6", WORLD_ENTROPY: ">0.5" }
    },
    {
        id: 63,
        name: "Mortality",
        tier: "Biology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.05, BIOLOGICAL_LOAD: 0.02 },
            scalar_to_framework: { legacy_generation_multiplier: 1.5 }
        },
        triggers: null
    },
    {
        id: 65,
        name: "Predator Ecology",
        tier: "Biology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.05, BIOLOGICAL_LOAD: 0.05 },
            scalar_to_framework: { resource_extraction_friction: 0.2 }
        },
        triggers: { WORLD_ENTROPY: "<0.6" }
    },
    {
        id: 69,
        name: "Symbiosis",
        tier: "Biology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: 0.1, BIOLOGICAL_LOAD: -0.05 },
            scalar_to_framework: { cooperative_labor_bonus: 0.2 }
        },
        triggers: { TRUST_DENSITY: ">0.4" }
    },
    {
        id: 70,
        name: "Collective Trauma",
        tier: "Biology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.1, COHESION_INDEX: 0.05 },
            scalar_to_framework: { logic_stagnation_weight: 0.2 }
        },
        triggers: { VIOLENCE_POTENTIAL: ">0.7" }
    },

    // --- PHASE 3: THE EPISTEMIC LENS ---
    {
        system_id: "SYS-01",
        name: "Information Provenance & Acquisition",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "TRUST_DENSITY",
        activation_logic: { threshold: "TRUST_DENSITY < 0.4", state: "DEGRADED" },
        scalar_vectors: [["TRUTH_DECAY", "+", 0.2], ["TRUST_DENSITY", "-", 0.15], ["VIOLENCE_POTENTIAL", "+", 0.1]],
        framework_modifiers: [["F3_CONTRACT_VOID_CHANCE", 0.25]],
        historical_weight: 0.65,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-02",
        name: "Institutional Model Drift & Continuity Debt",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "TRUST_DENSITY",
        activation_logic: { threshold: "COHESION_INDEX < 0.3", state: "DRIFT" },
        scalar_vectors: [["LEGITIMACY_INDEX", "-", 0.2], ["COHESION_INDEX", "-", 0.15], ["MATERIAL_STRESS", "+", 0.1]],
        framework_modifiers: [["F4_CHRONOLOGY_SKEW", 0.3]],
        historical_weight: 0.85,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-03",
        name: "Information Entropy & The Seeker Requirement",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "WORLD_ENTROPY",
        activation_logic: { threshold: "DISCOVERY_PRESSURE > 0.7", state: "ACTIVE_SEARCH" },
        scalar_vectors: [["WORLD_ENTROPY", "+", 0.1], ["TRUTH_DECAY", "+", 0.15], ["FEAR_LOAD", "+", 0.1]],
        framework_modifiers: [["F3_LABOR_EFFICIENCY", -0.2]],
        historical_weight: 0.50,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-04",
        name: "Attention Bandwidth & Narrative Gravity",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "SIGNIFICANCE_DENSITY",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.8", state: "SINGULARITY" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "+", 0.15], ["TRUTH_DECAY", "+", 0.2], ["COHESION_INDEX", "-", 0.1]],
        framework_modifiers: [["F2_FILTER_STRENGTH", 0.4]],
        historical_weight: 0.70,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-05",
        name: "Procedural Folklore & Poem Traps",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "TRUTH_DECAY",
        secondary_scalar: "SIGNIFICANCE_DENSITY",
        activation_logic: { threshold: "TRUTH_DECAY > 0.6", state: "MYTHOS_GEN" },
        scalar_vectors: [["COHESION_INDEX", "+", 0.2], ["LEGITIMACY_INDEX", "+", 0.15], ["TRUST_DENSITY", "+", 0.1]],
        framework_modifiers: [["F4_NARRATIVE_LATCH", 0.5]],
        historical_weight: 0.90,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-06",
        name: "Editorial Execution & Reality Manipulation",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "VIOLENCE_POTENTIAL",
        secondary_scalar: "LEGITIMACY_INDEX",
        activation_logic: { threshold: "VIOLENCE_POTENTIAL > 0.5", state: "REDACTION" },
        scalar_vectors: [["FEAR_LOAD", "+", 0.3], ["TRUTH_DECAY", "+", 0.2], ["WORLD_ENTROPY", "+", 0.1]],
        framework_modifiers: [["F3_CAUSAL_REWRITE", 0.4], ["F4_RECORDS_PURGED", 0.2]],
        historical_weight: 0.75,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-07",
        name: "Global Fidelity & Truth Economy",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "TRUST_DENSITY",
        secondary_scalar: "TRUTH_DECAY",
        activation_logic: { threshold: "TRUST_DENSITY > 0.6", state: "STABILIZED" },
        scalar_vectors: [["COHESION_INDEX", "+", 0.2], ["LEGITIMACY_INDEX", "+", 0.1], ["TRUTH_DECAY", "-", 0.15]],
        framework_modifiers: [["F2_SIGNAL_PURITY", 0.3]],
        historical_weight: 0.40,
        emergence_classification: "PRESSURE_SINK",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-08",
        name: "Epistemic Unreliability & Perspective Mechanics",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "TRUTH_DECAY",
        secondary_scalar: "VIOLENCE_POTENTIAL",
        activation_logic: { threshold: "TRUTH_DECAY > 0.4", state: "FRAGMENTED" },
        scalar_vectors: [["COHESION_INDEX", "-", 0.2], ["DISCOVERY_PRESSURE", "+", 0.1], ["VIOLENCE_POTENTIAL", "+", 0.15]],
        framework_modifiers: [["F3_CONTRACT_FRICTION", 0.3]],
        historical_weight: 0.55,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-09",
        name: "Social Contagion & Ideological Vectors",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "FEAR_LOAD",
        secondary_scalar: "COHESION_INDEX",
        activation_logic: { threshold: "FEAR_LOAD > 0.6", state: "OUTBREAK" },
        scalar_vectors: [["VIOLENCE_POTENTIAL", "+", 0.25], ["SIGNIFICANCE_DENSITY", "+", 0.1], ["TRUST_DENSITY", "-", 0.2]],
        framework_modifiers: [["F3_CASCADE_TRIGGER", 0.4], ["F1_PROPAGATION_VELOCITY", 0.2]],
        historical_weight: 0.80,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-10",
        name: "Institutional Mythmaking & Origin Control",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "TRUST_DENSITY",
        activation_logic: { threshold: "LEGITIMACY_INDEX > 0.7", state: "ORTHODOXY" },
        scalar_vectors: [["SIGNIFICANCE_DENSITY", "+", 0.15], ["TRUTH_DECAY", "-", 0.1], ["TRUST_DENSITY", "+", 0.1]],
        framework_modifiers: [["F4_ANCHOR_STRENGTH", 0.4]],
        historical_weight: 0.95,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-11",
        name: "Spatiotemporal Shift & Coordinate Rotation",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "WORLD_ENTROPY",
        secondary_scalar: "MATERIAL_STRESS",
        activation_logic: { threshold: "WORLD_ENTROPY > 0.7", state: "SHIFT" },
        scalar_vectors: [["DISCOVERY_PRESSURE", "+", 0.25], ["SIGNIFICANCE_DENSITY", "+", 0.1], ["MATERIAL_STRESS", "+", 0.2]],
        framework_modifiers: [["F1_COORDINATE_DRIFT", 0.5]],
        historical_weight: 0.45,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-12",
        name: "Spatial Relativity & Perception Gaps",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "TRUST_DENSITY",
        activation_logic: { threshold: "WORLD_ENTROPY > 0.5", state: "DISTORTION" },
        scalar_vectors: [["COHESION_INDEX", "-", 0.15], ["BIOLOGICAL_LOAD", "+", 0.1], ["TRUST_DENSITY", "-", 0.1]],
        framework_modifiers: [["F2_PARALLAX_ERROR", 0.4]],
        historical_weight: 0.30,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-13",
        name: "Story Density, Significance & Cosmic Attractance",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "SIGNIFICANCE_DENSITY",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.9", state: "ATTRACTANCE" },
        scalar_vectors: [["TRUTH_DECAY", "+", 0.1], ["VIOLENCE_POTENTIAL", "+", 0.15], ["DISCOVERY_PRESSURE", "+", 0.2]],
        framework_modifiers: [["F4_GRAVITY_WELL", 0.6]],
        historical_weight: 1.00,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-14",
        name: "Metaphysical Forces & Fundamental Pressures",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "MATERIAL_STRESS",
        secondary_scalar: "VIOLENCE_POTENTIAL",
        activation_logic: { threshold: "MATERIAL_STRESS > 0.8", state: "CRITICAL" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "+", 0.2], ["FEAR_LOAD", "+", 0.15], ["VIOLENCE_POTENTIAL", "+", 0.1]],
        framework_modifiers: [["F3_THRESHOLD_REDUCTION", 0.3], ["F1_FORCE_MAGNITUDE", 0.2]],
        historical_weight: 0.20,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-15",
        name: "Progenitor Genesis & Multiversal Scaling",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "SIGNIFICANCE_DENSITY",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.85", state: "GENESIS" },
        scalar_vectors: [["TRUST_DENSITY", "+", 0.25], ["COHESION_INDEX", "+", 0.2], ["LEGITIMACY_INDEX", "+", 0.15]],
        framework_modifiers: [["F4_ROOT_STABILITY", 0.7]],
        historical_weight: 1.00,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-16",
        name: "Environmental Thermodynamics & Biome Decay",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "WORLD_ENTROPY",
        secondary_scalar: "BIOLOGICAL_LOAD",
        activation_logic: { threshold: "WORLD_ENTROPY > 0.6", state: "DECAY" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "-", 0.2], ["MATERIAL_STRESS", "+", 0.2], ["DISCOVERY_PRESSURE", "+", 0.1]],
        framework_modifiers: [["F1_DECAY_CONSTANT", 0.3]],
        historical_weight: 0.35,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-17",
        name: "Post-Shift Ecological Shock",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "BIOLOGICAL_LOAD",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "BIOLOGICAL_LOAD < 0.2", state: "COLLAPSE" },
        scalar_vectors: [["MATERIAL_STRESS", "+", 0.2], ["VIOLENCE_POTENTIAL", "+", 0.2], ["TRUST_DENSITY", "-", 0.15]],
        framework_modifiers: [["F3_TRIGGER_SENSITIVITY", 0.4], ["F1_FLUX_CHAOS", 0.2]],
        historical_weight: 0.60,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-18",
        name: "Structural Maintenance & Decay",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "MATERIAL_STRESS",
        secondary_scalar: "COHESION_INDEX",
        activation_logic: { threshold: "MATERIAL_STRESS < 0.4", state: "MAINTAINED" },
        scalar_vectors: [["LEGITIMACY_INDEX", "+", 0.15], ["COHESION_INDEX", "+", 0.1], ["DISCOVERY_PRESSURE", "-", 0.05]],
        framework_modifiers: [["F3_INTERCEPTION_DELAY", 0.3]],
        historical_weight: 0.40,
        emergence_classification: "PRESSURE_SINK",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-19",
        name: "Atmospheric & Weather Systems",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "WORLD_ENTROPY",
        secondary_scalar: "BIOLOGICAL_LOAD",
        activation_logic: { threshold: "WORLD_ENTROPY > 0.3", state: "TURBULENT" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "+", 0.1], ["MATERIAL_STRESS", "+", 0.1], ["DISCOVERY_PRESSURE", "+", 0.05]],
        framework_modifiers: [["F1_VARIANCE_INDEX", 0.2]],
        historical_weight: 0.25,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-20",
        name: "Temporal Drift & Anachronism Friction",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "TRUTH_DECAY",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "WORLD_ENTROPY > 0.8", state: "ANACHRONISM" },
        scalar_vectors: [["SIGNIFICANCE_DENSITY", "-", 0.15], ["FEAR_LOAD", "+", 0.1], ["VIOLENCE_POTENTIAL", "+", 0.1]],
        framework_modifiers: [["F3_FRICTION_COEFFICIENT", 0.5]],
        historical_weight: 0.70,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-21",
        name: "Resource Allocation & Scarcity Logic",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "MATERIAL_STRESS",
        secondary_scalar: "DISCOVERY_PRESSURE",
        activation_logic: { threshold: "MATERIAL_STRESS > 0.7", state: "SCARCITY" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "+", 0.15], ["VIOLENCE_POTENTIAL", "+", 0.1], ["TRUST_DENSITY", "-", 0.15]],
        framework_modifiers: [["F3_COST_SCALING", 0.4]],
        historical_weight: 0.80,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-22",
        name: "Market Signaling & Valuation Drift",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "TRUST_DENSITY",
        secondary_scalar: "TRUTH_DECAY",
        activation_logic: { threshold: "TRUST_DENSITY < 0.5", state: "VOLATILE" },
        scalar_vectors: [["SIGNIFICANCE_DENSITY", "+", 0.1], ["FEAR_LOAD", "+", 0.2], ["LEGITIMACY_INDEX", "-", 0.1]],
        framework_modifiers: [["F2_SIGNAL_NOISE", 0.35]],
        historical_weight: 0.60,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-23",
        name: "Debt Sovereignty & Default Cascades",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "LEGITIMACY_INDEX < 0.4", state: "DEFAULT" },
        scalar_vectors: [["VIOLENCE_POTENTIAL", "+", 0.2], ["COHESION_INDEX", "-", 0.25], ["MATERIAL_STRESS", "+", 0.15]],
        framework_modifiers: [["F3_CONTRACT_VOID_RATE", 0.5]],
        historical_weight: 0.85,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-24",
        name: "Guild Specialization & Knowledge Cartels",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "COHESION_INDEX",
        activation_logic: { threshold: "DISCOVERY_PRESSURE > 0.6", state: "MONOPOLY" },
        scalar_vectors: [["TRUTH_DECAY", "+", 0.1], ["TRUST_DENSITY", "-", 0.1], ["SIGNIFICANCE_DENSITY", "+", 0.2]],
        framework_modifiers: [["F4_RECORD_ACCESSIBILITY", -0.4]],
        historical_weight: 0.75,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-25",
        name: "Land Tenure & Boundary Enforcement",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "VIOLENCE_POTENTIAL",
        secondary_scalar: "LEGITIMACY_INDEX",
        activation_logic: { threshold: "VIOLENCE_POTENTIAL > 0.4", state: "CONTESTED" },
        scalar_vectors: [["MATERIAL_STRESS", "+", 0.1], ["FEAR_LOAD", "+", 0.15], ["COHESION_INDEX", "-", 0.1]],
        framework_modifiers: [["F3_TERRITORIAL_FRICTION", 0.4]],
        historical_weight: 0.90,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-26",
        name: "Administrative Inertia & Protocol Friction",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "WORLD_ENTROPY",
        secondary_scalar: "COHESION_INDEX",
        activation_logic: { threshold: "COHESION_INDEX > 0.7", state: "BUREAUCRATIC" },
        scalar_vectors: [["LEGITIMACY_INDEX", "-", 0.1], ["TRUST_DENSITY", "-", 0.1], ["DISCOVERY_PRESSURE", "-", 0.15]],
        framework_modifiers: [["F1_FLUX_DAMPING", 0.3]],
        historical_weight: 0.70,
        emergence_classification: "PRESSURE_SINK",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-27",
        name: "Shadow Markets & Illicit Flow",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "TRUST_DENSITY",
        secondary_scalar: "VIOLENCE_POTENTIAL",
        activation_logic: { threshold: "TRUST_DENSITY < 0.3", state: "SHADOW_DOMINANT" },
        scalar_vectors: [["TRUTH_DECAY", "+", 0.25], ["FEAR_LOAD", "+", 0.1], ["LEGITIMACY_INDEX", "-", 0.2]],
        framework_modifiers: [["F2_OBFUSCATION_LEVEL", 0.45]],
        historical_weight: 0.65,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-28",
        name: "Dynastic Succession & Lineage Stability",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "SIGNIFICANCE_DENSITY",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.7", state: "DYNASTIC" },
        scalar_vectors: [["COHESION_INDEX", "+", 0.2], ["TRUST_DENSITY", "+", 0.1], ["VIOLENCE_POTENTIAL", "+", 0.15]],
        framework_modifiers: [["F4_LINEAGE_STABILITY", 0.5]],
        historical_weight: 0.95,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-29",
        name: "Jurisdictional Sovereignty & Extraterritoriality",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "COHESION_INDEX",
        secondary_scalar: "VIOLENCE_POTENTIAL",
        activation_logic: { threshold: "COHESION_INDEX < 0.5", state: "FRAGMENTED" },
        scalar_vectors: [["LEGITIMACY_INDEX", "-", 0.15], ["FEAR_LOAD", "+", 0.1], ["DISCOVERY_PRESSURE", "+", 0.1]],
        framework_modifiers: [["F3_INTERCEPTION_BYPASS", 0.4]],
        historical_weight: 0.55,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-30",
        name: "Extraction Ratios & Fiscal Stress",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "MATERIAL_STRESS",
        secondary_scalar: "BIOLOGICAL_LOAD",
        activation_logic: { threshold: "MATERIAL_STRESS > 0.85", state: "CRITICAL_TAX" },
        scalar_vectors: [["BIOLOGICAL_LOAD", "-", 0.15], ["FEAR_LOAD", "+", 0.2], ["TRUST_DENSITY", "-", 0.2]],
        framework_modifiers: [["F3_ACTION_PENALTY", 0.35]],
        historical_weight: 0.80,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-31",
        name: "Commercial Hegemony & Supply Chain Control",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "TRUST_DENSITY",
        secondary_scalar: "MATERIAL_STRESS",
        activation_logic: { threshold: "TRUST_DENSITY > 0.7", state: "HEHEMONY" },
        scalar_vectors: [["LEGITIMACY_INDEX", "+", 0.2], ["COHESION_INDEX", "+", 0.15], ["DISCOVERY_PRESSURE", "-", 0.1]],
        framework_modifiers: [["F3_TRADE_EFFICIENCY", 0.4]],
        historical_weight: 0.70,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-32",
        name: "Public Legitimacy & Consent Manufacturing",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "LEGITIMACY_INDEX",
        secondary_scalar: "TRUTH_DECAY",
        activation_logic: { threshold: "TRUTH_DECAY > 0.5", state: "PROPAGANDA" },
        scalar_vectors: [["FEAR_LOAD", "+", 0.15], ["TRUST_DENSITY", "-", 0.1], ["SIGNIFICANCE_DENSITY", "+", 0.1]],
        framework_modifiers: [["F2_CONSENT_BIAS", 0.5]],
        historical_weight: 0.80,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-33",
        name: "Insurrection Vectors & Mobilization Potential",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "VIOLENCE_POTENTIAL",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "VIOLENCE_POTENTIAL > 0.7", state: "UPRISING" },
        scalar_vectors: [["LEGITIMACY_INDEX", "-", 0.3], ["COHESION_INDEX", "-", 0.2], ["MATERIAL_STRESS", "+", 0.1]],
        framework_modifiers: [["F3_STABILITY_BREAK", 0.6]],
        historical_weight: 0.90,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-34",
        name: "Legal Codification & Judicial Logic",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "COHESION_INDEX",
        secondary_scalar: "LEGITIMACY_INDEX",
        activation_logic: { threshold: "COHESION_INDEX > 0.6", state: "CODIFIED" },
        scalar_vectors: [["TRUST_DENSITY", "+", 0.15], ["TRUTH_DECAY", "-", 0.1], ["VIOLENCE_POTENTIAL", "-", 0.1]],
        framework_modifiers: [["F4_PRECEDENT_STRENGTH", 0.45]],
        historical_weight: 0.85,
        emergence_classification: "PRESSURE_SINK",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-35",
        name: "Logistical Reach & Strategic Depth",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "MATERIAL_STRESS",
        activation_logic: { threshold: "DISCOVERY_PRESSURE > 0.8", state: "EXPANSION" },
        scalar_vectors: [["WORLD_ENTROPY", "+", 0.1], ["FEAR_LOAD", "+", 0.1], ["BIOLOGICAL_LOAD", "+", 0.2]],
        framework_modifiers: [["F1_REACH_EXTENSION", 0.4]],
        historical_weight: 0.75,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-36",
        name: "Intelligence Gathering & Covert Operations",
        framework_target: "F2_EPISTEMIC_FILTER",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "TRUTH_DECAY",
        activation_logic: { threshold: "DISCOVERY_PRESSURE > 0.5", state: "COVERT" },
        scalar_vectors: [["FEAR_LOAD", "+", 0.1], ["TRUST_DENSITY", "-", 0.2], ["VIOLENCE_POTENTIAL", "+", 0.1]],
        framework_modifiers: [["F2_INTEL_RESOLUTION", 0.4]],
        historical_weight: 0.60,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-37",
        name: "Demographic Pressure & Migration Flow",
        framework_target: "F1_SCALAR_FLUX",
        primary_scalar: "BIOLOGICAL_LOAD",
        secondary_scalar: "FEAR_LOAD",
        activation_logic: { threshold: "BIOLOGICAL_LOAD > 0.7", state: "MIGRATION" },
        scalar_vectors: [["COHESION_INDEX", "-", 0.2], ["MATERIAL_STRESS", "+", 0.2], ["LEGITIMACY_INDEX", "-", 0.1]],
        framework_modifiers: [["F1_POPULATION_SHIFT", 0.4]],
        historical_weight: 0.50,
        emergence_classification: "PRESSURE_SOURCE",
        implementation_classification: "Framework Parameter"
    },
    {
        system_id: "SYS-38",
        name: "Patent Locks & Intellectual Monopoly",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "DISCOVERY_PRESSURE",
        secondary_scalar: "LEGITIMACY_INDEX",
        activation_logic: { threshold: "DISCOVERY_PRESSURE > 0.9", state: "LOCKED" },
        scalar_vectors: [["TRUTH_DECAY", "+", 0.15], ["TRUST_DENSITY", "-", 0.1], ["SIGNIFICANCE_DENSITY", "+", 0.1]],
        framework_modifiers: [["F3_INNOVATION_TAX", 0.5]],
        historical_weight: 0.65,
        emergence_classification: "PRESSURE_MODIFIER",
        implementation_classification: "Shared Framework Logic"
    },
    {
        system_id: "SYS-39",
        name: "Belief Standardization & Clerical Control",
        framework_target: "F4_CHRONICLE_ENGINE",
        primary_scalar: "SIGNIFICANCE_DENSITY",
        secondary_scalar: "TRUST_DENSITY",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.8", state: "STANDARD" },
        scalar_vectors: [["COHESION_INDEX", "+", 0.25], ["TRUTH_DECAY", "-", 0.15], ["FEAR_LOAD", "+", 0.1]],
        framework_modifiers: [["F4_DOGMA_STABILITY", 0.5]],
        historical_weight: 0.90,
        emergence_classification: "HISTORICAL_PROCESS",
        implementation_classification: "Data Only"
    },
    {
        system_id: "SYS-40",
        name: "Social Stratification & Access Thresholds",
        framework_target: "F3_CONSEQUENCE_INTERCEPTOR",
        primary_scalar: "COHESION_INDEX",
        secondary_scalar: "SIGNIFICANCE_DENSITY",
        activation_logic: { threshold: "SIGNIFICANCE_DENSITY > 0.75", state: "STRATIFIED" },
        scalar_vectors: [["LEGITIMACY_INDEX", "-", 0.1], ["VIOLENCE_POTENTIAL", "+", 0.2], ["TRUST_DENSITY", "-", 0.15]],
        framework_modifiers: [["F3_ACCESS_COST", 0.45]],
        historical_weight: 0.80,
        emergence_classification: "EMERGENT_OUTCOME",
        implementation_classification: "Shared Framework Logic"
    },
    {
        id: 04,
        name: "Narrative Gravity",
        tier: "Epistemology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.1, COHESION_INDEX: 0.05 },
            scalar_to_framework: { lore_persistence_multiplier: 1.5 }
        },
        triggers: { SIGNIFICANCE_DENSITY: ">0.3" }
    },
    {
        id: 05,
        name: "Folklore",
        tier: "Epistemology",
        framework: "EpistemicFilter",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.05, TRUTH_DECAY: 0.05 },
            scalar_to_framework: { mythmaking_rate: 0.2 }
        },
        triggers: null
    },
    {
        id: 09,
        name: "Social Contagion",
        tier: "Epistemology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.2, COHESION_INDEX: -0.1 },
            scalar_to_framework: { rumor_spread_velocity: 2.0 }
        },
        triggers: { FEAR_LOAD: ">0.5" }
    },
    {
        id: 45,
        name: "Memory",
        tier: "Psychology",
        framework: "EpistemicFilter",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.02, TRUTH_DECAY: -0.01 },
            scalar_to_framework: { fact_retention_duration: 1.5 }
        },
        triggers: null
    },
    {
        id: 46,
        name: "Cognitive Bias",
        tier: "Psychology",
        framework: "EpistemicFilter",
        vectors: {
            scalar_to_scalar: { TRUTH_DECAY: 0.05, COHESION_INDEX: 0.02 },
            scalar_to_framework: { contradictory_fact_rejection: 0.3 }
        },
        triggers: { COHESION_INDEX: ">0.6" }
    },
    {
        id: 47,
        name: "Deception",
        tier: "Psychology",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: -0.1, VIOLENCE_POTENTIAL: 0.05 },
            scalar_to_framework: { contract_fraud_chance: 0.2 }
        },
        triggers: { TRUST_DENSITY: "<0.4" }
    },
    {
        id: 50,
        name: "Threat Recognition",
        tier: "Psychology",
        framework: "EpistemicFilter",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.05, DISCOVERY_PRESSURE: 0.02 },
            scalar_to_framework: { danger_packet_priority: 0.5 }
        },
        triggers: { FEAR_LOAD: ">0.3" }
    },

    // --- PHASE 4: THE INSTITUTIONAL FABRIC ---
    {
        id: 31,
        name: "Violence Monopoly",
        tier: "Governance",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { VIOLENCE_POTENTIAL: -0.2, LEGITIMACY_INDEX: 0.1, FEAR_LOAD: -0.1 },
            scalar_to_framework: { formal_contract_enforcement: 0.3 }
        },
        triggers: { LEGITIMACY_INDEX: ">0.5", TRUST_DENSITY: ">0.3" }
    },
    {
        id: 32,
        name: "Legitimacy",
        tier: "Governance",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { COHESION_INDEX: 0.1, TRUST_DENSITY: 0.05 },
            scalar_to_framework: { obedience_threshold_modifier: 0.2 }
        },
        triggers: null
    },
    {
        id: 33,
        name: "Bureaucracy",
        tier: "Governance",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: 0.02, COHESION_INDEX: 0.02 },
            scalar_to_framework: { labor_delay_factor: 1.3 }
        },
        triggers: { LEGITIMACY_INDEX: ">0.6" }
    },
    {
        id: 34,
        name: "Class Structure",
        tier: "Governance",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { COHESION_INDEX: -0.05, SIGNIFICANCE_DENSITY: 0.05 },
            scalar_to_framework: { mobility_friction: 0.4 }
        },
        triggers: { LEGITIMACY_INDEX: ">0.4" }
    },
    {
        id: 35,
        name: "Diplomacy",
        tier: "Governance",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: 0.1, VIOLENCE_POTENTIAL: -0.1 },
            scalar_to_framework: { alliance_stability_bonus: 0.2 }
        },
        triggers: { TRUST_DENSITY: ">0.5" }
    },
    {
        id: 51,
        name: "Social Capital",
        tier: "Social",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: 0.05, COHESION_INDEX: 0.05 },
            scalar_to_framework: { favor_exchange_efficiency: 0.3 }
        },
        triggers: null
    },
    {
        id: 53,
        name: "Patronage",
        tier: "Social",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { LEGITIMACY_INDEX: 0.05, SIGNIFICANCE_DENSITY: 0.02 },
            scalar_to_framework: { specialized_labor_access: 0.2 }
        },
        triggers: { TRUST_DENSITY: ">0.4" }
    },
    {
        id: 55,
        name: "Feuds",
        tier: "Social",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { VIOLENCE_POTENTIAL: 0.1, FEAR_LOAD: 0.1, TRUST_DENSITY: -0.1 },
            scalar_to_framework: { contract_vendetta_weight: 0.5 }
        },
        triggers: { VIOLENCE_POTENTIAL: ">0.4", LEGITIMACY_INDEX: "<0.4" }
    },
    {
        id: 57,
        name: "Kinship",
        tier: "Social",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: 0.1, COHESION_INDEX: 0.1 },
            scalar_to_framework: { safety_net_resilience: 0.4 }
        },
        triggers: null
    },
    {
        id: 59,
        name: "Leadership",
        tier: "Social",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { LEGITIMACY_INDEX: 0.1, COHESION_INDEX: 0.1 },
            scalar_to_framework: { panic_suppression_bonus: 0.3 }
        },
        triggers: { SIGNIFICANCE_DENSITY: ">0.4" }
    },

    // --- PHASE 5: THE ESCALATION & CHRONICLE ---
    {
        id: 71,
        name: "Balance of Power",
        tier: "Conflict",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { FEAR_LOAD: 0.05, VIOLENCE_POTENTIAL: -0.1 },
            scalar_to_framework: { escalation_delay: 2.0 }
        },
        triggers: { VIOLENCE_POTENTIAL: ">0.3", LEGITIMACY_INDEX: ">0.4" }
    },
    {
        id: 73,
        name: "Espionage",
        tier: "Conflict",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { TRUST_DENSITY: -0.1, TRUTH_DECAY: 0.05 },
            scalar_to_framework: { secret_packet_retrieval: 0.3 }
        },
        triggers: { TRUST_DENSITY: "<0.6" }
    },
    {
        id: 75,
        name: "Total War",
        tier: "Conflict",
        framework: "ConsequenceInterceptor",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: 0.2, VIOLENCE_POTENTIAL: 0.3, FEAR_LOAD: 0.2 },
            scalar_to_framework: { resource_drain_rate: 3.0, labor_cost_scaling: 4.0 }
        },
        triggers: { VIOLENCE_POTENTIAL: ">0.8" }
    },
    {
        id: 84,
        name: "Innovation",
        tier: "Technology",
        framework: "ScalarFlux",
        vectors: {
            scalar_to_scalar: { DISCOVERY_PRESSURE: 0.1, MATERIAL_STRESS: -0.05 },
            scalar_to_framework: { tech_tier_shift_chance: 0.05 }
        },
        triggers: { DISCOVERY_PRESSURE: ">0.6" }
    },
    {
        id: 94,
        name: "Historical Weight",
        tier: "History",
        framework: "ChronicleEngine",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.05, COHESION_INDEX: 0.05 },
            scalar_to_framework: { narrative_persistence_bonus: 0.2 }
        },
        triggers: { SIGNIFICANCE_DENSITY: ">0.5" }
    },
    {
        id: 95,
        name: "Collapse",
        tier: "History",
        framework: "ChronicleEngine",
        vectors: {
            scalar_to_scalar: { WORLD_ENTROPY: 0.1, LEGITIMACY_INDEX: -0.2, COHESION_INDEX: -0.2 },
            scalar_to_framework: { institution_erasure_rate: 0.5 }
        },
        triggers: { WORLD_ENTROPY: ">0.8", LEGITIMACY_INDEX: "<0.2" }
    },
    {
        id: 97,
        name: "Era Transitions",
        tier: "History",
        framework: "ChronicleEngine",
        vectors: {
            scalar_to_scalar: { DISCOVERY_PRESSURE: -0.3, SIGNIFICANCE_DENSITY: -0.5 },
            scalar_to_framework: { global_scalar_reset: true }
        },
        triggers: { SIGNIFICANCE_DENSITY: ">0.9" }
    },
    {
        id: 100,
        name: "Legacy",
        tier: "History",
        framework: "ChronicleEngine",
        vectors: {
            scalar_to_scalar: { SIGNIFICANCE_DENSITY: 0.05, COHESION_INDEX: 0.02 },
            scalar_to_framework: { bloodline_buff_potential: 0.1 }
        },
        triggers: null
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


