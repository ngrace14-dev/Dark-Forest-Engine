/**
 * Dark Forest Engine: Consequence System Event Keys
 * Standardized taxonomy for inter-module communication.
 */

export const ConsequenceEvents = {
    // Discovery & Extraction
    SIGNAL_BROADCAST: 'SIGNAL_BROADCAST', // Physics -> Observation
    TRUTH_EXTRACTED:  'TRUTH_EXTRACTED',   // Observation -> Seeker
    PACKET_IN_TRANSIT: 'PACKET_IN_TRANSIT',// Seeker -> Seeker
    
    // Delivery & Revision
    REQ_BELIEF_UPDATE: 'REQ_BELIEF_UPDATE', // Seeker -> Controller (The Handoff)
    INVENTORY_UPDATED: 'INVENTORY_UPDATED', // Controller -> Inventory (Success)
    BELIEF_SUPPRESSED: 'BELIEF_SUPPRESSED', // Controller -> Audit (Rejection)
    
    // Strategic & Labor
    INTENT_CHANGED:   'INTENT_CHANGED',    // Strategy -> Dispatcher
    CONTRACT_OPENED:  'CONTRACT_OPENED',   // Inventory -> Dispatcher
    CONTRACT_ASSIGNED: 'CONTRACT_ASSIGNED',// Dispatcher -> AI
    EXPEDITION_DEPART: 'EXPEDITION_DEPART',// AI -> Dispatcher
    
        // Metaphysics
        HEAT_SPIKE:       'HEAT_SPIKE',        
        HARVEST_BEGIN:    'HARVEST_BEGIN',

        // Drift & Lifecycle
        FACT_FORGOTTEN:   'FACT_FORGOTTEN',
        FACT_DECAYED:     'FACT_DECAYED',
        VOID_AMNESIA:     'VOID_AMNESIA',
        TRADITION_FORMED: 'TRADITION_FORMED',

        // Observation & Awareness
        SIGNAL_NOTICED:   'SIGNAL_NOTICED',

        // Strategic Events
        INTENT_CHANGED:   'INTENT_CHANGED',
        SYSTEMIC_SHOCK:   'SYSTEMIC_SHOCK'
};