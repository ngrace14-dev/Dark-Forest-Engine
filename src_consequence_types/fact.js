import { TruthClass, DecayProfile, FactState } from './enums.js';

/**
 * FactObject: The Unit of Belief
 * Represents a single piece of perceived reality within a KnowledgeInventory.
 */
export class Fact {
    constructor(intelId, data = {}) {
        this.intelId = intelId;
        this.version = data.version || 1;
        
        // Data Metadata
        this.truthClass = data.truthClass || TruthClass.UTILITY;
        this.decayProfile = data.decayProfile || DecayProfile.CYCLICAL;
        
        // Belief State
        this.value = data.value || null;
        this.confidence = data.confidence || 0.2; 
        this.fidelity = data.fidelity || 0.1;     
        
        // State Validation
        this.state = Object.values(FactState).includes(data.state)
            ? data.state
            : FactState.RUMOR;
        
        // Lineage & Lifecycle (Persistable)
        this.sourceChain = data.sourceChain || []; 
        this.age = data.age || 0; 
        this.verificationCount = data.verificationCount || 0;
        this.cooldownUntil = data.cooldownUntil || 0; 
        
        // Pressure Hooks
        this.significanceValue = data.significanceValue || 0;
        this.reservationLinks = data.reservationLinks || []; 
    }

    /**
     * Serializes the fact for persistence.
     */
    serialize() {
        return JSON.stringify(this);
    }
}