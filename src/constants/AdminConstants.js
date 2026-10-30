/**
 * File: src/constants/AdminConstants.js
 * 
 * Centralized constants for the Administrative & Institutional systems.
 */

export const AdminConstants = {
    DECAY_THRESHOLDS: {
        LEVEL_1: 100, // Tax Leaks
        LEVEL_2: 300, // Barrier Neglect
        LEVEL_3: 600, // Corruption Rumors
        COLLAPSE: 1000
    },
    
    REPAIR_RATE: 5,
    LEAK_PERCENTAGE: 0.05,
    RUMOR_FIDELITY: 0.3,
    COLLAPSE_RESET_DECAY: 500,
    REFORM_DECAY_REDUCTION: 0.5,
    
    COMPLEXITY_SCALARS: {
        POPULATION: 0.5,
        DISTANCE: 2.0,
        TIME: 0.1
    }
};
