/**
 * Dark Forest Engine: Consequence System Enums
 * Defines the immutable lifecycles and classifications for the Engine of Consequence.
 */

export const TruthClass = {
    UTILITY: 'UTILITY',       
    PRESTIGE: 'PRESTIGE',     
    EXISTENTIAL: 'EXISTENTIAL' 
};

export const DecayProfile = {
    VOLATILE: 'VOLATILE',   
    CYCLICAL: 'CYCLICAL',   
    DURABLE: 'DURABLE',     
    IMMUTABLE: 'IMMUTABLE'  
};

export const FactState = {
    RUMOR: 'RUMOR',
    VERIFIED: 'VERIFIED',
    TRUSTED: 'TRUSTED',
    TRADITION: 'TRADITION',
    FOSSILIZED: 'FOSSILIZED',
    FORGOTTEN: 'FORGOTTEN'
};

export const ContractJobType = {
    SURVEY: 'SURVEY',           
    MAINTENANCE: 'MAINTENANCE', 
    EXHUMATION: 'EXHUMATION',   
    HUNT: 'HUNT',               
    RETRIEVAL: 'RETRIEVAL',     
    AUDIT: 'AUDIT'              
};

export const ContractState = {
    GENERATED: 'GENERATED',
    RECRUITING: 'RECRUITING',
    WAITING: 'WAITING',
    ASSIGNED: 'ASSIGNED',
    ACTIVE: 'ACTIVE',
    RETURNING: 'RETURNING',
    DELIVERED: 'DELIVERED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    ABANDONED: 'ABANDONED'
};

export const PacketState = {
    EXTRACTED: 'EXTRACTED',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    ARCHIVED: 'ARCHIVED',
    GC: 'GC'
};

export const PacketType = {
    LOCATION: 'LOCATION',
    THREAT: 'THREAT',
    RUNIC: 'RUNIC',
    HISTORICAL: 'HISTORICAL',
    POLITICAL: 'POLITICAL',
    COSMOLOGICAL: 'COSMOLOGICAL'
};

export const EventClass = {

    SURVIVAL: 'SURVIVAL',
    ECONOMIC: 'ECONOMIC',
    POLITICAL: 'POLITICAL',
    HISTORICAL: 'HISTORICAL',
    RUNIC: 'RUNIC',
    COSMOLOGICAL: 'COSMOLOGICAL'
};

export const FactionIntent = {
    STABILIZE: 'STABILIZE', 
    GROW: 'GROW',           
    SEEK: 'SEEK',           
    LEGITIMIZE: 'LEGITIMIZE' 
};