/**
 * File: src_systems_knowledge_v2.js
 * Purpose: Implementation of Model Layer, Knowledge Inventory, Seeker Pipeline, and Belief Revision.
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
        
        // System 8: Curiosity & Continuity Demand
        this.stabilityScore = 100; 
        this.consecutiveStableShifts = 0;
        this.curiosityThreshold = 80; 
    }

    updateStability() {
        const deficits = this.getKnowledgeDeficits();
        const survivalDeficits = deficits.filter(d => d.type === 'location' || d.type === 'threat');
        
        if (survivalDeficits.length > 0) {
            this.stabilityScore = Math.max(0, this.stabilityScore - (survivalDeficits.length * 5));
            this.consecutiveStableShifts = 0;
        } else {
            this.stabilityScore = Math.min(100, this.stabilityScore + 10);
            this.consecutiveStableShifts++;
        }
    }

    updateShockLevel() {
        let totalDelta = 0;
        let checkedFacts = 0;
        this.records.forEach((record, id) => {
            const latent = window.ModelLayer.latentRegistry.get(id);
            if (latent && record.value?.type === 'LOCATION') {
                const dist = Math.hypot(record.value.x - latent.value.x, record.value.z - latent.value.z);
                totalDelta += Math.min(1.0, dist / 1000);
                checkedFacts++;
            }
        });
        const discoveryDebt = checkedFacts > 0 ? (totalDelta / checkedFacts) : 0;
        const shockPressure = discoveryDebt * (1 + (this.continuityDebt / 100));
        if (shockPressure > 0.5) this.shockLevel = Math.min(100, this.shockLevel + (shockPressure * 5));
        else this.shockLevel = Math.max(0, this.shockLevel - 2);
    }

    generateContracts() {
        const deficits = this.getKnowledgeDeficits();
        deficits.slice(0, 3).forEach(deficit => {
            if (!this.contracts.find(c => c.targetIntelId === deficit.id && c.status !== 'FAILED')) {
                this.generateExpeditionPacket(deficit.id);
            }
        });
        if (this.stabilityScore >= this.curiosityThreshold) this.generateCuriosityContracts();
    }

    generateExpeditionPacket(deficitId) {
        const deficit = this.records.get(deficitId);
        if (!deficit) return null;
        const type = deficit.value?.type || 'historical';
        const isTerminus = this.factionId === 'House Terminus';
        
        const packet = {
            id: `packet_${Math.random().toString(36).substr(2, 5)}`,
            origin: this.factionId,
            goal: `Resolve deficit in ${deficitId}`,
            targetIntelId: deficitId,
            requiredLenses: isTerminus ? ['terminus_scout'] : this.determineRequiredLenses(type),
            minimumTeam: isTerminus ? ['terminus_scout'] : [this.determineRequiredLenses(type)[0]],
            idealTeam: isTerminus ? ['terminus_scout', 'surveyor', 'recorder'] : [...this.determineRequiredLenses(type), 'adventurer', 'recorder'],
            expirationCondition: 'NEXT_SHIFT',
            owner: this.factionId,
            status: 'OPEN',
            teamMembers: [],
            priority: 50
        };
        this.contracts.push(packet);
        return packet;
    }

    generateCuriosityContracts() {
        const curiosityTargets = [
            { id: 'truth_mountain_rotation', type: 'temporal', priority: 50 },
            { id: 'truth_fracture_origin', type: 'origin', priority: 60 },
            { id: 'truth_champion_identity', type: 'origin', priority: 70 },
            { id: 'truth_void_mechanics', type: 'cosmological', priority: 80 }
        ];
        curiosityTargets.forEach(target => {
            if (this.contracts.find(c => c.targetIntelId === target.id)) return;
            if (this.consecutiveStableShifts >= Math.floor(target.priority / 10)) {
                const packet = {
                    id: `curiosity_${Math.random().toString(36).substr(2, 5)}`,
                    origin: this.factionId,
                    goal: `Determine ${target.id.replace('truth_', '')}`,
                    targetIntelId: target.id,
                    type: target.type,
                    requiredLenses: this.determineRequiredLenses(target.type),
                    minimumTeam: this.determineRequiredLenses(target.type),
                    idealTeam: [...this.determineRequiredLenses(target.type), 'recorder', 'scholar'],
                    expirationCondition: 'STABILITY_LOSS', 
                    owner: this.factionId,
                    status: 'OPEN',
                    priority: target.priority,
                    isCuriosity: true
                };
                this.contracts.push(packet);
            }
        });
    }

    determineRequiredLenses(type) {
        const mapping = {
            'hostile': ['adventurer'], 'spatial': ['surveyor', 'explorer'],
            'runic': ['scholar'], 'historical': ['historian'],
            'dissonant': ['agent'], 'temporal': ['terminus_scout'],
            'cosmological': ['explorer'], 'origin': ['agent', 'archivist']
        };
        return mapping[type] || ['adventurer'];
    }

    getKnowledgeDeficits() {
        const deficits = [];
        this.records.forEach((record, id) => {
            const priority = (record.age * 0.5) + (1.0 - record.confidence) * 15.0;
            deficits.push({ id, type: record.value?.type || 'historical', priority, record });
        });
        return deficits.sort((a, b) => b.priority - a.priority);
    }

    integrate(intelId, data) {
        const existing = this.records.get(intelId);
        if (existing && Math.random() < this.calculateRevisionFriction(existing, data)) return false;
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
        return existing.confidence * Math.min(1.0, existing.age / 100) * (this.continuityDebt / 100);
    }
}

class SeekerPipeline {
    constructor() {
        this.activePackets = [];
        this.LENSES = {
            'adventurer': { hostile: 1.0, spatial: 0.2, runic: 0.1, historical: 0.3, cost: 1.0 },
            'explorer':   { hostile: 0.4, spatial: 0.8, runic: 0.3, historical: 0.4, cost: 0.8 },
            'surveyor':   { hostile: 0.1, spatial: 1.0, runic: 0.2, historical: 0.2, cost: 1.5 },
            'historian':  { hostile: 0.2, spatial: 0.4, runic: 0.2, historical: 1.0, cost: 0.7 },
            'scholar':    { hostile: 0.1, spatial: 0.2, runic: 1.0, historical: 0.5, cost: 1.2 },
            'agent':      { hostile: 0.3, spatial: 0.3, runic: 0.4, historical: 0.6, cost: 1.0 },
            'terminus_scout': { hostile: 0.2, spatial: 1.0, temporal: 1.0, cost: 1.0 },
            'archivist':  { runic: 0.8, origin: 1.0, historical: 0.8, cost: 1.5 }
        };
    }

    calculateTeamBonuses(seekers, truthType) {
        let bonuses = { fidelity: 1.0, survival: 1.0, extraction: 1.0, interpretation: 1.0 };
        const roles = seekers.map(s => s.role);
        if (roles.includes('adventurer')) bonuses.survival += 0.5;
        if (truthType === 'spatial' && roles.includes('surveyor')) bonuses.fidelity += 0.4;
        if (truthType === 'runic' && roles.includes('scholar')) bonuses.interpretation += 0.5;
        return bonuses;
    }

    extract(latentId, seekerEntity) {
        const truth = window.ModelLayer.latentRegistry.get(latentId);
        if (!truth) return null;
        const role = seekerEntity.role || 'adventurer';
        const lens = this.LENSES[role] || this.LENSES['adventurer'];
        const fidelityMult = lens[truth.type] || 0.1;
        if (Math.random() > fidelityMult + 0.2) return null;
        if (seekerEntity.stats) seekerEntity.stats.stamina = Math.max(0, seekerEntity.stats.stamina - (10 * (lens.cost || 1.0)));
        const packet = {
            intelId: latentId, data: { ...truth }, sourceId: seekerEntity.id, seekerRole: role,
            timestamp: window.EngineParams?.worldDay || 0, fidelity: 1.0 * fidelityMult
        };
        this.activePackets.push(packet);
        return packet;
    }

    deliver(packet, factionId) {
        const inventory = window.ModelLayer.getInventory(factionId);
        if (!inventory || (inventory.shockLevel > 80 && Math.random() < 0.5)) return;
        if (new BeliefRevisionEngine().process(inventory, packet)) {
            this.activePackets = this.activePackets.filter(p => p !== packet);
        }
    }
}

class BeliefRevisionEngine {
    process(inventory, packet) {
        const existing = inventory.records.get(packet.intelId) || { confidence: 0, age: 0 };
        const friction = inventory.calculateRevisionFriction(existing, packet.data);
        const fidelityBonus = (1.0 - packet.fidelity);
        const fearMod = (inventory.records.size > 50) ? 1.5 : 1.0; 
        const finalFriction = (friction + fidelityBonus) * fearMod;

        if (Math.random() > finalFriction) {
            return inventory.integrate(packet.intelId, { ...packet.data, confidence: packet.fidelity });
        }
        return false;
    }
}

class ModelDriftProcessor {
    process(inventories) {
        inventories.forEach(inventory => {
            inventory.records.forEach((record, intelId) => {
                record.age++;
                record.confidence *= 0.995; 
                if (record.age % 100 === 0 && Math.random() < 0.1) record.confidence *= 0.8;
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
    init() { window.EventBus.emit('UI_LOG', '[ModelLayer] Reality Bifurcated'); }
    onShift() {
        this.driftProcessor.process(this.inventories);
        this.inventories.forEach(inv => { inv.updateShockLevel(); inv.updateStability(); inv.generateContracts(); });
    }
    getInventory(factionId) {
        if (!this.inventories.has(factionId)) this.inventories.set(factionId, new KnowledgeInventory(factionId));
        return this.inventories.get(factionId);
    }
    updateLatent(id, data) { this.latentRegistry.set(id, { ...data, lastModified: window.EngineParams?.worldDay || 0 }); }
    checkSalience(eventMagnitude, factionId) {
        const inventory = this.getInventory(factionId);
        return eventMagnitude > (50 + (inventory.continuityDebt / 2));
    }
}

window.ModelLayer = new ModelLayerSystem();
export default window.ModelLayer;
