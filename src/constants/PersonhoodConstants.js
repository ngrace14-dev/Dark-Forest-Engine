// File: src/constants/PersonhoodConstants.js

export const PersonhoodConstants = {
    // Traits
    BASE_RISK_TOLERANCE: 0.5,
    BASE_AMBITION: 0.5,
    BASE_CONSCIENTIOUSNESS: 0.5,
    BASE_SOCIABILITY: 0.5,
    BASE_CYNICISM: 0.5,
    BASE_FEAR: 0.2,
    BASE_LOYALTY: 0.7,
    BASE_CONSTITUTION: 0.5,

    // Trait Bounds
    TRAIT_MIN: 0.0,
    TRAIT_MAX: 1.0,

    // Age
    MAX_AGE: 311,
    PRIME_AGE_START: 25,
    TWILIGHT_AGE_START: 250,

    // Fatigue
    FATIGUE_MISHAP_THRESHOLD: 0.7,
    FATIGUE_INCREMENT_ROUTINE: 0.1,

    // Mortality
    BASE_VIRULENCE: 0.05,
    MALNUTRITION_PENALTY: 0.5,
    
    // Social Transitions
    SOCIO_CAPITAL_REVERED_THRESHOLD: 0.65,
    SOCIO_WEIGHT_PRESTIGE: 0.4,
    SOCIO_WEIGHT_CONSCIENTIOUSNESS: 0.3,
    SOCIO_WEIGHT_WEALTH: 0.2,
    SOCIO_WEIGHT_CYNICISM: 0.5 // Weight is used in subtraction
};
