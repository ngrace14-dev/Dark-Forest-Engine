import { ConsequenceEvents } from './src_consequence_types/events.js';

/**
 * ObservationService: The Senses Layer
 * Decouples physical world events from NPC perception.
 * Enforces Bible CA-4 (Attention Principle).
 */
class ObservationService {
    constructor() {
        this.baseUpdateFrequency = 2000; 
    }

    /**
     * Physical -> Signal Handoff.
     * Evaluates what NPCs notice within their specialized domain.
     */
    processObservation(entities, latentRegistry, worldTime) {
        entities.forEach(entity => {
            // Issue 4: Lens Authority (Fallback for now, but decoupled intent)
            const lens = this._getLensForRole(entity.role);
            if (!lens) return; 

            // Issue 2: Load Distribution (Distributed Ticks)
            if (!entity.nextObservationTime) entity.nextObservationTime = worldTime + (Math.random() * this.baseUpdateFrequency);
            if (worldTime < entity.nextObservationTime) return;
            entity.nextObservationTime = worldTime + this.baseUpdateFrequency;

            const observableRange = entity.perceptionRadius || 50;
            
            latentRegistry.forEach((truth, id) => {
                // Issue 1: Coordinate Bug Fix
                if (this._isWithinRange(entity, truth, observableRange)) {
                    this._evaluateSalience(entity, truth, id, lens);
                }
            });
        });
    }

    _isWithinRange(entity, truth, range) {
        if (truth.value?.x === undefined || truth.value?.z === undefined) return false;
        
        const dist = Math.hypot(
            entity.visual.position.x - truth.value.x, 
            entity.visual.position.z - truth.value.z
        );
        return dist <= range;
    }

    /**
     * Enforces Attention Principle & Institutional Blindness.
     */
    _evaluateSalience(entity, truth, id, lens) {
        // Issue 3: Duplicate Suppression (Simple timestamp cooldown)
        entity.observedIntel = entity.observedIntel || new Map();
        const lastSeen = entity.observedIntel.get(id) || 0;
        if (performance.now() - lastSeen < 60000) return; // 1-minute memory buffer

        const inventory = window.ModelLayer.getInventory(entity.villageId || 'independent');
        
        // --- INSTITUTIONAL BLINDNESS GATING ---
        // Bible CA-4: Higher debt = Higher threshold to notice new reality.
        const attentionThreshold = 50 + (inventory.continuityDebt / 2);
        const signalMagnitude = truth.magnitude || 0;

        if (signalMagnitude > attentionThreshold) {
            // Lens Fidelity Check
            const fidelity = lens[truth.type] || 0.1;

            if (fidelity > 0.3) {
                // Intermediate event for investigation vs extraction
                window.EventBus.emit(ConsequenceEvents.SIGNAL_NOTICED, { 
                    seekerId: entity.id, 
                    intelId: id 
                });

                window.EventBus.emit(ConsequenceEvents.TRUTH_EXTRACTED, { 
                    seekerId: entity.id, 
                    intelId: id,
                    fidelity: fidelity
                });

                entity.observedIntel.set(id, performance.now());
            }
        }
    }

    _getLensForRole(role) {
        // This will eventually query RoleRegistry. For now, it maps the core lenses.
        if (!role) return null;
        return window.ModelLayer.seekerPipeline.LENSES[role]; 
    }
}

export const ObservationLayer = new ObservationService();
