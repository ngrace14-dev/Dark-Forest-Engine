import { ConsequenceEvents } from './src_consequence_types/events.js';
import { Fact } from './src_consequence_types/fact.js';
import { FactState } from './src_consequence_types/enums.js';

/**
 * EpistemologyController: The Sole Authority (Law #1)
 * Governs all modifications to Faction KnowledgeInventories.
 */
class EpistemologyController {
    constructor() {
        this.revisionConstants = {
            BASE_FRICTION: 0.2,
            DEBT_MULTIPLIER: 1.5
        };

        // Standard Handoff Point: Seeker Pipeline delivers packet
        window.EventBus.on(ConsequenceEvents.REQ_BELIEF_UPDATE, ({ packet, factionId }) => {
            this.handleRuntimeRequest(packet, factionId);
        });
    }

    /**
     * Path A: Bootstrap Authorization
     * Used for WorldGen and Save Restoration. Bypasses all revision logic.
     */
    bootstrapWrite(factionId, factData) {
        const inventory = window.ModelLayer.getInventory(factionId);
        if (!inventory) return;

        const fact = new Fact(factData.intelId, {
            ...factData,
            state: factData.state || FactState.TRUSTED // Default bootstrap to Trusted/Orthodoxy
        });
        
        inventory.records.set(fact.intelId, fact);
        
        window.EventBus.emit(ConsequenceEvents.INVENTORY_UPDATED, { 
            factionId, 
            intelId: fact.intelId, 
            type: 'BOOTSTRAP' 
        });
    }

    /**
     * Path B: Runtime Authorization
     * Evaluates new packets against current beliefs and continuity debt.
     */
    handleRuntimeRequest(packet, factionId) {
        // Issue 6: Hard Guard
        if (!packet || !packet.intelId) return;

        // --- FRAMEWORK 2 INTEGRATION (LAW #3) ---
        const filteredPacket = window.EpistemicFilter ? window.EpistemicFilter.filterPacket(packet) : packet;
        if (!filteredPacket) return; // Packet lost in noise

        const inventory = window.ModelLayer.getInventory(factionId);
        if (!inventory) return;

        const existing = inventory.records.get(packet.intelId);
        
        // Issue 2: Version Check (Stale Packet Rejection)
        if (existing && packet.version <= existing.version && !packet.isArtifact) {
            return;
        }

        // Physical Proof Bypass (Bible Steel/Stone principle)
        if (packet.isArtifact) {
            this._commitUpdate(inventory, packet, 1.0, FactState.TRUSTED);
            return;
        }

        // Revision Friction Logic
        const friction = this._calculateRevisionFriction(existing, packet, inventory);
        
        if (Math.random() > friction) {
            this._commitUpdate(inventory, packet);
        } else {
            window.EventBus.emit(ConsequenceEvents.BELIEF_SUPPRESSED, { 
                factionId, 
                intelId: packet.intelId 
            });
        }
    }

    _calculateRevisionFriction(existing, packet, inventory) {
        if (!existing) return 0; // Novelty: New rumors have 0 initial friction

        const ageWeight = Math.min(1.0, existing.age / 100);
        const debtMod = 1.0 + (inventory.continuityDebt / 100);
        const fidelityBonus = (1.0 - packet.fidelity); 
        
        // Issue 1: Clamp friction to prevent unchangeable beliefs
        const rawFriction = (existing.confidence * ageWeight * debtMod * fidelityBonus) + this.revisionConstants.BASE_FRICTION;
        return Math.max(0, Math.min(1, rawFriction));
    }

    _commitUpdate(inventory, packet, forcedConfidence = null, forcedState = null) {
        const existing = inventory.records.get(packet.intelId);

        const fact = new Fact(packet.intelId, {
            value: packet.value,
            // Issue 3: Strict Null Check
            confidence: forcedConfidence !== null ? forcedConfidence : packet.fidelity,
            fidelity: packet.fidelity,
            version: packet.version,
            // Issue 4: Provenance Preservation
            sourceChain: existing ? [...existing.sourceChain, packet.sourceId] : [packet.sourceId],
            state: forcedState || (packet.fidelity > 0.8 ? FactState.VERIFIED : FactState.RUMOR)
        });

        // Cap source chain to last 5 seekers to prevent array bloat
        if (fact.sourceChain.length > 5) fact.sourceChain.shift();

        inventory.records.set(packet.intelId, fact);

        window.EventBus.emit(ConsequenceEvents.INVENTORY_UPDATED, { 
            factionId: inventory.factionId, 
            intelId: packet.intelId,
            type: 'RUNTIME'
        });
    }
}

export const Controller = new EpistemologyController();
