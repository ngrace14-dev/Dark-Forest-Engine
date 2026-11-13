import { ConsequenceEvents } from './src_consequence_types/events.js';
import { DecayProfile, FactState } from './src_consequence_types/enums.js';

/**
 * ModelDriftProcessor: The Entropy Manager
 * Simulates temporal decay and the 7-day amnesia spike.
 */
class ModelDriftProcessor {
    constructor() {
        this.driftRates = {
            [DecayProfile.VOLATILE]: 0.1,
            [DecayProfile.CYCLICAL]: 0.02,
            [DecayProfile.DURABLE]: 0.001,
            [DecayProfile.IMMUTABLE]: 0.0
        };
    }

    /**
     * Executes the daily belief maturity and erosion logic.
     */
    applyDailyDrift(inventories) {
        inventories.forEach(inventory => {
            inventory.records.forEach((fact, id) => {
                fact.age++;
                
                // 1. Confidence Decay
                const rate = this.driftRates[fact.decayProfile] || 0.02;
                fact.confidence = Math.max(0.0, fact.confidence - rate);
                
                // 2. Lifecycle State Transitions (Issue 2)
                this._processLifecycle(fact, inventory);
                
                // 3. Emit Decay Event
                if (rate > 0) {
                    window.EventBus.emit(ConsequenceEvents.FACT_DECAYED, { 
                        factionId: inventory.factionId, 
                        intelId: id,
                        newConfidence: fact.confidence 
                    });
                }
            });
        });
    }

    /**
     * Manages Fact lifecycle maturation.
     */
    _processLifecycle(fact, inventory) {
        // Transition to FORGOTTEN (Issue 1 & 3)
        if (fact.confidence <= 0.05 && fact.state !== FactState.TRADITION) {
            fact.state = FactState.FORGOTTEN;
            window.EventBus.emit(ConsequenceEvents.FACT_FORGOTTEN, { 
                factionId: inventory.factionId, 
                intelId: fact.intelId 
            });
            return;
        }

        // Maturation: TRUSTED -> TRADITION
        if (fact.state === FactState.TRUSTED && fact.age > 200) {
            fact.state = FactState.TRADITION;
            window.EventBus.emit(ConsequenceEvents.TRADITION_FORMED, { 
                factionId: inventory.factionId, 
                intelId: fact.intelId 
            });
        }

        // Maturation: VERIFIED -> TRUSTED
        if (fact.state === FactState.VERIFIED && fact.verificationCount >= 3) {
            fact.state = FactState.TRUSTED;
        }

        // Maturation: RUMOR -> VERIFIED
        if (fact.state === FactState.RUMOR && fact.verificationCount >= 1 && fact.confidence > 0.6) {
            fact.state = FactState.VERIFIED;
        }
    }

    /**
     * Acute Amnesia: The 7-Day White Void Spike.
     * Bible §5: Human consciousness perceives the void as instantaneous amnesia.
     */
    applyVoidAmnesia(inventories) {
        inventories.forEach(inventory => {
            inventory.records.forEach((fact, id) => {
                // Issue 5: Anchored facts are immune
                if (fact.isAnchored) return;

                if (fact.decayProfile === DecayProfile.VOLATILE || 
                    fact.decayProfile === DecayProfile.CYCLICAL) {
                    
                    fact.confidence *= 0.5;
                    
                    window.EventBus.emit(ConsequenceEvents.VOID_AMNESIA, { 
                        factionId: inventory.factionId, 
                        intelId: id 
                    });
                }
            });
        });
    }
}

export const DriftProcessor = new ModelDriftProcessor();
