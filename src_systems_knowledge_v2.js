/**
 * File: src_systems_knowledge_v2.js
 * Purpose: Implementation of System 1 (Model Layer) and System 2 (Knowledge Inventory).
 * Enforces Bible §13, §14, §16 and CA-1 through CA-4.
 */

class KnowledgeInventory {
    constructor(factionId) {
        this.factionId = factionId;
        this.records = new Map(); // Map<intelId, FactObject>
        this.contracts = []; // System 2.2: Active expedition demands
        this.continuityDebt = 0; // Cumulative weight of fossilized models
        this.attentionQuota = 100; // Capacity to notice new events
        this.shockLevel = 0; // System 7: Cognitive Collapse indicator (0-100)
    }

    /**
     * System 7: Calculate the delta between Belief and Latent Reality.
     * Enforces "Systemic Shock" - Bible §14.
     */
    updateShockLevel() {
        let totalDelta = 0;
        let checkedFacts = 0;

        this.records.forEach((record, id) => {
            const latent = window.ModelLayer.latentRegistry.get(id);
            if (latent) {
                // Measure physical distance delta for locations
                if (record.value?.type === 'LOCATION') {
                    const dist = Math.hypot(record.value.x - latent.value.x, record.value.z - latent.value.z);
                    totalDelta += Math.min(1.0, dist / 1000); // Scale 0-1 per 1km error
                }
                checkedFacts++;
            }
        });

        const discoveryDebt = checkedFacts > 0 ? (totalDelta / checkedFacts) : 0;
        
        // Shock accumulates if debt is high and continuity is rigid
        const shockPressure = discoveryDebt * (1 + (this.continuityDebt / 100));
        
        if (shockPressure > 0.5) {
            this.shockLevel = Math.min(100, this.shockLevel + (shockPressure * 5));
        } else {
            this.shockLevel = Math.max(0, this.shockLevel - 2);
        }

        if (this.shockLevel > 75) {
            window.EventBus.emit('UI_LOG', `⚠️ [COLLAPSE] ${this.factionId} is suffering from Systemic Shock. Model divergence critical.`);
        }
    }

    /**
     * System 2.2: Convert high-priority deficits into Expedition Contracts.
     * Enforces "Deficit-Driven" discovery - Bible §13.
     */
    generateContracts() {
        const deficits = this.getKnowledgeDeficits();
        
        deficits.slice(0, 5).forEach(deficit => {
            const existing = this.contracts.find(c => c.targetIntelId === deficit.id && c.status !== 'FAILED');
            if (existing) return;
            this.generateExpeditionPacket(deficit.id);
        });
    }

    determineRequiredLenses(type) {
        const mapping = {
            'hostile': ['adventurer'],
            'spatial': ['surveyor', 'explorer'],
            'runic': ['scholar'],
            'historical': ['historian'],
            'dissonant': ['agent']
        };
        return mapping[type] || ['adventurer'];
    }
        const deficit = this.records.get(deficitId);
        if (!deficit) return null;

        const type = deficit.value?.type || 'historical';
        
        // Define specialized requirements based on origin institution
        const isTerminus = this.factionId === 'House Terminus';
        
        const packet = {
            id: `packet_${Math.random().toString(36).substr(2, 5)}`,
            origin: this.factionId,
            goal: `Resolve deficit in ${deficitId}`,
            targetIntelId: deficitId,
            requiredLenses: isTerminus ? ['terminus_scout'] : this.determineRequiredLenses(type),
            
            // Minimum vs Ideal Team (Prevents Deadlock)
            minimumTeam: isTerminus ? ['terminus_scout'] : [this.determineRequiredLenses(type)[0]],
            idealTeam: isTerminus ? 
                ['terminus_scout', 'surveyor', 'recorder'] : 
                [...this.determineRequiredLenses(type), 'adventurer', 'recorder'],
            
            expirationCondition: 'NEXT_SHIFT', // Bible §5: 14-day cycle
            owner: this.factionId,
            status: 'OPEN',
            teamMembers: []
        };

        this.contracts.push(packet);
        console.log(`[Packet] ${this.factionId} published ${packet.id} for ${type} truth.`);
        return packet;
    }
}

    getKnowledgeDeficits() {
        const deficits = [];
        this.records.forEach((record, id) => {
            // Priority = (Age * 2) + (1.0 - Confidence * 10)
            const ageWeight = record.age * 0.5;
            const uncertaintyWeight = (1.0 - record.confidence) * 15.0;
            
            // Bias based on truth type importance
            let importance = 1.0;
            if (id.startsWith('location_')) importance = 5.0;
            if (id.startsWith('threat_')) importance = 3.0;

            deficits.push({
                id: id,
                type: record.value?.type || 'historical',
                priority: (ageWeight + uncertaintyWeight) * importance,
                record: record
            });
        });

        // Sort by highest priority
        return deficits.sort((a, b) => b.priority - a.priority);
    }

    /**
     * System 3.3: Refined Expedition Packet Structure.
     * Enforces minimum/ideal team logic and expiration conditions.
     */
    generateExpeditionPacket(deficitId) {
        const deficit = this.records.get(deficitId);
        if (!deficit) return null;

        const type = deficit.value?.type || 'historical';
        
        // Define specialized requirements based on origin institution
        const isTerminus = this.factionId === 'House Terminus';
        
        const packet = {
            id: `packet_${Math.random().toString(36).substr(2, 5)}`,
            origin: this.factionId,
            goal: `Resolve deficit in ${deficitId}`,
            targetIntelId: deficitId,
            requiredLenses: isTerminus ? ['terminus_scout'] : this.determineRequiredLenses(type),
            
            // Minimum vs Ideal Team (Prevents Deadlock)
            minimumTeam: isTerminus ? ['terminus_scout'] : [this.determineRequiredLenses(type)[0]],
            idealTeam: isTerminus ? 
                ['terminus_scout', 'surveyor', 'recorder'] : 
                [...this.determineRequiredLenses(type), 'adventurer', 'recorder'],
            
            expirationCondition: 'NEXT_SHIFT', // Bible §5: 14-day cycle
            owner: this.factionId,
            status: 'OPEN',
            teamMembers: []
        };

        this.contracts.push(packet);
        console.log(`[Packet] ${this.factionId} published ${packet.id} for ${type} truth.`);
        return packet;
    }
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
    // ... existing constructor ...

    /**
     * System 3.1: Calculate Expedition Bonuses based on Team Composition.
     * Enforces "Ideal Team" logic - Bible §31.
     */
    calculateTeamBonuses(seekers, truthType) {
        let bonuses = {
            fidelity: 1.0,
            survival: 1.0,
            extraction: 1.0,
            interpretation: 1.0
        };

        const roles = seekers.map(s => s.role);
        
        // INTERDEPENDENCE LOGIC
        // 1. Guard Support (Survival)
        if (roles.includes('adventurer')) bonuses.survival += 0.5;
        
        // 2. Domain Specialists (Fidelity/Interpretation)
        if (truthType === 'spatial' && roles.includes('surveyor')) bonuses.fidelity += 0.4;
        if (truthType === 'runic' && roles.includes('scholar')) bonuses.interpretation += 0.5;
        if (truthType === 'historical' && roles.includes('historian')) bonuses.fidelity += 0.3;
        
        // 3. Synergy: Surveyor + Explorer (Efficiency)
        if (roles.includes('surveyor') && roles.includes('explorer')) {
            bonuses.extraction += 0.3;
            bonuses.fidelity += 0.2;
        }

        return bonuses;
    }
}

    /**
     * System 3: Extract truth from Latent Reality.
     * Bible §31: Expeditions/Seekers.
     */
    extract(latentId, seekerEntity) {
        const truth = window.ModelLayer.latentRegistry.get(latentId);
        if (!truth) return null;

        const role = seekerEntity.role || 'adventurer';
        const lens = this.LENSES[role] || this.LENSES['adventurer'];
        const truthType = truth.type || 'historical';
        
        // Calculate Professional Multiplier
        const fidelityMult = lens[truthType] || 0.1;
        const costMult = lens.cost || 1.0;

        // Extraction failure check (Randomness based on role mastery)
        if (Math.random() > fidelityMult + 0.2) {
            console.log(`[Seeker] ${seekerEntity.id} (${role}) failed to comprehend ${latentId} (Type: ${truthType}).`);
            return null;
        }

        // Extraction has a cost (CA-2) - Modified by role efficiency
        if (seekerEntity.stats) {
            const baseCost = 10;
            seekerEntity.stats.stamina = Math.max(0, seekerEntity.stats.stamina - (baseCost * costMult));
        }

        const packet = {
            intelId: latentId,
            data: { ...truth },
            sourceId: seekerEntity.id,
            seekerRole: role,
            originCoord: seekerEntity.visual?.position || { x: 0, z: 0 },
            timestamp: window.EngineParams?.worldDay || 0,
            fidelity: 1.0 * fidelityMult // Domain Mastery determines initial fidelity
        };

        this.activePackets.push(packet);
        console.log(`[Seeker] ${seekerEntity.id} extracted ${latentId} with ${Math.round(packet.fidelity * 100)}% fidelity.`);
        return packet;
    }

class SeekerPipeline {
    // ... existing ...

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

        // System 7: Systemic Shock makes delivery harder
        if (inventory.shockLevel > 80 && Math.random() < 0.5) {
            console.log(`[Revision] Packet ${packet.intelId} lost in the chaos of ${factionId}'s Systemic Shock.`);
            return;
        }

        // Hand off to System 4: Belief Revision Engine
        const revisionEngine = new BeliefRevisionEngine();
        const success = revisionEngine.process(inventory, packet);

        if (success) {
            this.activePackets = this.activePackets.filter(p => p !== packet);
        }
    }
}
}

class BeliefRevisionEngine {
    /**
     * System 4: Process new information against existing models.
     * Enforces CA-1 (Continuity Debt).
     */
    process(inventory, packet) {
        const existing = inventory.records.get(packet.intelId) || { confidence: 0, age: 0 };
        const friction = inventory.calculateRevisionFriction(existing, packet.data);

        // Verification Friction: Packet Fidelity determines how "persuasive" the truth is.
        // Low fidelity packets are easily dismissed by the institution.
        const fidelityBonus = (1.0 - packet.fidelity); // 0.1 fidelity adds 0.9 friction
        
        // Institutional Fear increases friction
        const fearMod = (inventory.records.size > 50) ? 1.5 : 1.0; 
        const finalFriction = (friction + fidelityBonus) * fearMod;

        if (Math.random() > finalFriction) {
            return inventory.integrate(packet.intelId, {
                ...packet.data,
                confidence: packet.fidelity // Integrated belief is capped by the seeker's fidelity
            });
        } else {
            console.log(`[Revision] Packet ${packet.intelId} suppressed by Faction ${inventory.factionId} (Friction: ${finalFriction.toFixed(2)}).`);
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
        
        // System 7: Update Shock levels for all institutions
        this.inventories.forEach(inv => inv.updateShockLevel());
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
