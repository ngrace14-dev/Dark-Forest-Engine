/**
 * File: src_systems_knowledge_v2.js
 * Purpose: Implementation of System 1 (Model Layer) and System 2 (Knowledge Inventory).
 * Enforces Bible §13, §14, §16 and CA-1 through CA-4.
 */

class KnowledgeInventory {
    constructor(factionId) {
        this.factionId = factionId;
        this.records = new Map(); // Map<intelId, FactObject>
        this.continuityDebt = 0; // Cumulative weight of fossilized models
        this.attentionQuota = 100; // Capacity to notice new events
    }

    /**
     * System 2: Add or update a fact in the faction's perceived reality.
     */
    integrate(intelId, data) {
        // Enforce CA-1: Revision Friction
        const existing = this.records.get(intelId);
        if (existing) {
            const friction = this.calculateRevisionFriction(existing, data);
            if (Math.random() < friction) {
                console.log(`[Knowledge] Faction ${this.factionId} rejected update for ${intelId} due to Continuity Debt.`);
                return false; 
            }
        }

        this.records.set(intelId, {
            value: data.value,
            confidence: data.confidence || 0.5,
            timestamp: window.EngineParams?.worldDay || 0,
            age: 0,
            sourceId: data.sourceId
        });
        return true;
    }

    calculateRevisionFriction(existing, newData) {
        // Revision is harder if the existing belief is old and high-confidence (CA-1)
        const ageWeight = Math.min(1.0, existing.age / 100);
        return existing.confidence * ageWeight * (this.continuityDebt / 100);
    }
}

class SeekerPipeline {
    constructor() {
        this.activePackets = []; // Packets in transport
    }

    /**
     * System 3: Extract truth from Latent Reality.
     * Bible §31: Expeditions/Seekers.
     */
    extract(latentId, seekerEntity) {
        const truth = window.ModelLayer.latentRegistry.get(latentId);
        if (!truth) return null;

        // Extraction has a cost (CA-2)
        if (seekerEntity.stats) {
            seekerEntity.stats.stamina = Math.max(0, seekerEntity.stats.stamina - 10);
        }

        const packet = {
            intelId: latentId,
            data: { ...truth },
            sourceId: seekerEntity.id,
            originCoord: seekerEntity.visual?.position || { x: 0, z: 0 },
            timestamp: window.EngineParams?.worldDay || 0,
            fidelity: 1.0 // Degrades during transport
        };

        this.activePackets.push(packet);
        console.log(`[Seeker] Truth extracted by ${seekerEntity.id}: ${latentId}`);
        return packet;
    }

    /**
     * Transport the packet to a destination.
     * Logic for interception, loss, or degradation.
     */
    transport(packet, speedMultiplier = 1.0) {
        // Fidelity decays over time/distance (Semantic Decay CA-3)
        packet.fidelity *= 0.99; 
    }

    deliver(packet, factionId) {
        const inventory = window.ModelLayer.getInventory(factionId);
        if (!inventory) return;

        // Hand off to System 4: Belief Revision Engine
        const revisionEngine = new BeliefRevisionEngine();
        const success = revisionEngine.process(inventory, packet);

        if (success) {
            this.activePackets = this.activePackets.filter(p => p !== packet);
        }
    }
}

class BeliefRevisionEngine {
    /**
     * System 4: Process new information against existing models.
     * Enforces CA-1 (Continuity Debt).
     */
    process(inventory, packet) {
        const friction = inventory.calculateRevisionFriction(
            inventory.records.get(packet.intelId) || { confidence: 0, age: 0 },
            packet.data
        );

        // Institutional Fear increases friction
        const fearMod = (inventory.records.size > 50) ? 1.5 : 1.0; 
        const finalFriction = friction * fearMod;

        if (Math.random() > finalFriction) {
            return inventory.integrate(packet.intelId, packet.data);
        } else {
            console.log(`[Revision] Packet ${packet.intelId} suppressed by Faction ${inventory.factionId}.`);
            return false;
        }
    }
}

class ModelDriftProcessor {
    /**
     * System 6: Simulate semantic decay over time.
     * Enforces CA-3 (Semantic Decay).
     */
    process(inventories) {
        inventories.forEach(inventory => {
            inventory.records.forEach((record, intelId) => {
                record.age++;
                
                // Drift: Confidence decays as the original context is lost
                record.confidence *= 0.995; 
                
                // Every 100 days, high age facts risk "Semantic Corruption"
                if (record.age % 100 === 0 && Math.random() < 0.1) {
                    record.confidence *= 0.8;
                    console.log(`[Drift] Fact ${intelId} in ${inventory.factionId} suffered Semantic Decay.`);
                }
            });
        });
    }
}

class ModelLayerSystem {
    constructor() {
        this.inventories = new Map(); 
        this.latentRegistry = new Map();
        this.seekerPipeline = new SeekerPipeline();
        this.driftProcessor = new ModelDriftProcessor();
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_START', () => this.onShift());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[ModelLayer] Reality Bifurcated');
    }

    onShift() {
        // System 6: Apply drift on every 14-day shift
        this.driftProcessor.process(this.inventories);
    }

    getInventory(factionId) {
        if (!this.inventories.has(factionId)) {
            this.inventories.set(factionId, new KnowledgeInventory(factionId));
        }
        return this.inventories.get(factionId);
    }

    /**
     * System 1: Update Latent Reality. 
     * No faction sees this automatically (CA-2).
     */
    updateLatent(id, data) {
        this.latentRegistry.set(id, {
            ...data,
            lastModified: window.EngineParams?.worldDay || 0
        });
    }

    /**
     * Enforces CA-4: Determines if an event is salient enough to notice.
     */
    checkSalience(eventMagnitude, factionId) {
        const inventory = this.getInventory(factionId);
        const threshold = 50 + (inventory.continuityDebt / 2);
        return eventMagnitude > threshold;
    }
}

window.ModelLayer = new ModelLayerSystem();
export default window.ModelLayer;
