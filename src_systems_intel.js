/**
 * File: src_systems_intel.js
 * Phase 6.1 & 6.2 - World Intelligence Architecture
 * 
 * Implements the Core Ledger (IntelManager) and Information Logistics (Propagation).
 * Information is a physical, immutable, and tradeable world commodity.
 */

// ==========================================
// ENUMS & CONSTANTS
// ==========================================
if (typeof window === 'undefined') {
    global.window = {};
}

window.IntelEnums = {
    TYPES: { RUMOR: 'RUMOR', FACT: 'FACT', WARNING: 'WARNING' },
    HISTORICAL_STATUS: { NONE: 'NONE', HISTORICAL: 'HISTORICAL', LEGEND: 'LEGEND', MYTH: 'MYTH' },
    PERSISTENCE: { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED', FORGOTTEN: 'FORGOTTEN' },
    RARITY: { COMMON: 'COMMON', UNCOMMON: 'UNCOMMON', RARE: 'RARE', RESTRICTED: 'RESTRICTED', SECRET: 'SECRET', LEGENDARY: 'LEGENDARY' },
    TRUTH_STATE: { UNKNOWN: 'UNKNOWN', TRUE: 'TRUE', FALSE: 'FALSE' },
    VECTORS: { ARCANE_DOOR: 1.0, MESSENGER: 0.95, CARAVAN: 0.80, GOSSIP: 0.40 }
};

// ==========================================
// PHASE 6.1: CORE LEDGER (THE INTEL MANAGER)
// ==========================================
class IntelManagerSystem {
    constructor() {
        this.registry = new Map(); // Map<intel_id, Intel_ID Object> (The Immutable Master Ledger)
        this.archive = new Map();  // Map<intel_id, Intel_ID Object> (Historical/Legendary Records)
        this.ownershipRegistry = new Map(); // Map<intel_id, Set<node_id>> (Who physically holds references)
    }

    _generateId() {
        return 'intel_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Registers a new immutable record. 
     * Never updates existing records. Connects lineage via parent/supersedes IDs.
     */
    register(data) {
        const id = this._generateId();
        
        const record = {
            intel_id: id,
            parent_intel_id: data.parent_intel_id || null,
            supersedes_intel_id: data.supersedes_intel_id || null,
            version: data.version || 1,
            type: data.type || window.IntelEnums.TYPES.RUMOR,
            historical_status: data.historical_status || window.IntelEnums.HISTORICAL_STATUS.NONE,
            persistence: data.persistence || window.IntelEnums.PERSISTENCE.ACTIVE,
            rarity: data.rarity || window.IntelEnums.RARITY.COMMON,
            
            payload: {
                title: data.payload?.title || "Unknown Event",
                description: data.payload?.description || "",
                tags: data.payload?.tags || [],
                target_coord: data.payload?.target_coord || { x: 0, z: 0 }
            },
            
            // [{ node_id, timestamp, origin_type, source_faction }]
            provenance: data.provenance ? [...data.provenance] : [],
            
            // Phase 6.3 Hardening Additions
            certainty: data.certainty ?? 0.1, // 0.0 - 1.0 (Subjective belief)
            truth_state: data.truth_state || window.IntelEnums.TRUTH_STATE.UNKNOWN, // (Objective reality)
            plausibility_score: data.plausibility_score ?? 0.5, // How believable is this on its face?
            source_credibility: data.source_credibility ?? 0.5, // Reputation of the original creator
            verification_complexity: data.verification_complexity || 'MODERATE',
            dispute_state: data.dispute_state || 'NONE',
            redundancy_requirement: data.redundancy_requirement || 'NONE',
            
            significance: {
                historical: data.significance?.historical || 0,
                survival: data.significance?.survival || 0,
                economic: data.significance?.economic || 0,
                political: data.significance?.political || 0,
                crow: data.significance?.crow || 0
            },
            
            suppression_level: data.suppression_level || 0,
            epoch_created: data.epoch_created || window.EngineParams?.worldEpoch || 0,
            spread_generation: data.spread_generation || 0
        };

        this.registry.set(id, record);
        this.ownershipRegistry.set(id, new Set());
        return id;
    }

    lookup(intel_id) {
        return this.registry.get(intel_id) || this.archive.get(intel_id) || null;
    }

    /**
     * Follows the chain of reports through descendants/ancestors.
     */
    resolveLineage(intel_id) {
        const lineage = [];
        let currentId = intel_id;
        let currentRecord = this.lookup(currentId);

        while (currentRecord) {
            lineage.push(currentRecord);
            currentId = currentRecord.parent_intel_id;
            currentRecord = currentId ? this.lookup(currentId) : null;
        }
        return lineage.reverse(); // Returns [Original Rumor, ..., Current Version]
    }

    /**
     * Grants physical ownership of an Intel Reference to an Entity.
     */
    grantOwnership(intel_id, node_id) {
        if (!this.registry.has(intel_id)) return false;
        this.ownershipRegistry.get(intel_id).add(node_id);
        return true;
    }

    revokeOwnership(intel_id, node_id) {
        const owners = this.ownershipRegistry.get(intel_id);
        if (owners) {
            owners.delete(node_id);
            // If no one owns it and it's active, it's technically lost to the world, 
            // but we leave it in registry until Purge() runs.
        }
    }

    getIntelForNode(node_id) {
        const knownIntel = [];
        for (const [intel_id, owners] of this.ownershipRegistry.entries()) {
            if (owners.has(node_id)) {
                knownIntel.push(this.registry.get(intel_id));
            }
        }
        return knownIntel;
    }

    /**
     * Purges records based on Epoch shifts and Information Decay.
     */
    purge(currentEpoch, currentDay) {
        for (const [intel_id, record] of this.registry.entries()) {
            let shouldEvict = false;

            // 1. Decay Purge: Stale, unverified rumors
            const ageDays = currentDay - (record.payload.timestamp_day || currentDay);
            if (record.persistence === window.IntelEnums.PERSISTENCE.ACTIVE && 
                record.type === window.IntelEnums.TYPES.RUMOR && ageDays > 14) {
                shouldEvict = true;
            }

            // 2. Epoch Purge: Did it survive the wave of white?
            if (record.epoch_created < currentEpoch) {
                const totalSignificance = record.significance.historical + record.significance.crow;
                if (totalSignificance > 50 || record.rarity === window.IntelEnums.RARITY.LEGENDARY) {
                    // Archive High-Value Info
                    record.persistence = window.IntelEnums.PERSISTENCE.ARCHIVED;
                    record.historical_status = window.IntelEnums.HISTORICAL_STATUS.HISTORICAL;
                    this.archive.set(intel_id, record);
                } else {
                    // Forget Low-Value Info
                    record.persistence = window.IntelEnums.PERSISTENCE.FORGOTTEN;
                }
                shouldEvict = true;
            }

            if (shouldEvict) {
                this.registry.delete(intel_id);
                this.ownershipRegistry.delete(intel_id);
            }
        }
    }
}

window.IntelManager = new IntelManagerSystem();


// ==========================================
// PHASE 6.2: PROPAGATION PROTOCOL
// ==========================================
window.IntelPropagation = {
    
    /**
     * Simulates the "Telephone Game" exchange of a single Intel record between two nodes.
     * @param {Object} sourceNode - { id, type (HUNTER, CARAVAN, etc), faction }
     * @param {Object} targetNode - { id, memory_limit, faction }
     * @param {String} intel_id 
     * @param {Float} vectorFidelity - from window.IntelEnums.VECTORS
     */
    sync: function(sourceNode, targetNode, intel_id, vectorFidelity) {
        const intel = window.IntelManager.lookup(intel_id);
        if (!intel || intel.persistence !== window.IntelEnums.PERSISTENCE.ACTIVE) return;

        // STEP A: Echo-Chamber / Provenance Check
        // If the target already held this exact record in the past, reject to prevent infinite loops.
        if (intel.provenance.some(p => p.node_id === targetNode.id)) return;
        
        // Target also checks if they currently hold a newer/better version of this lineage
        const targetKnown = window.IntelManager.getIntelForNode(targetNode.id);
        if (targetKnown.some(k => k.parent_intel_id === intel_id || k.supersedes_intel_id === intel_id)) return;

        // STEP B: Information Fidelity (Distortion Check)
        let resulting_intel_id = intel_id;
        
        if (Math.random() > vectorFidelity) {
            // FAILED FIDELITY: Information Distorts!
            const newCertainty = Math.max(0.1, intel.certainty * 0.5);
            
            resulting_intel_id = window.IntelManager.register({
                ...intel,
                parent_intel_id: intel_id, // Create lineage
                version: intel.version + 1,
                certainty: newCertainty,
                type: window.IntelEnums.TYPES.RUMOR, // Degrades to rumor
                spread_generation: intel.spread_generation + 1
            });
            window.EventBus.emit('UI_LOG_DEBUG', `[INTEL] Information distorted upon reaching ${targetNode.id}.`);
        } else {
            // PERFECT FIDELITY: But still constitutes a new propagation step
            resulting_intel_id = window.IntelManager.register({
                ...intel,
                parent_intel_id: intel_id,
                version: intel.version + 1,
                spread_generation: intel.spread_generation + 1
            });
        }

        const newIntel = window.IntelManager.lookup(resulting_intel_id);

        // STEP C: Trust Verification & Plausibility Check (Phase 6.3 Hardening)
        // If factions are enemies/rivals, target loses confidence in the info
        let trustFactor = 1.0;
        if (this._areFactionsRivals(sourceNode.faction, targetNode.faction)) {
            trustFactor *= 0.5; 
        }
        
        // Add plausibility gate: If it's absurd and the source is low credibility, reject entirely.
        if (newIntel.plausibility_score < 0.3 && newIntel.source_credibility < 0.4) {
             window.IntelManager.revokeOwnership(resulting_intel_id, targetNode.id);
             return; // Rejects the absurd rumor
        }
        
        newIntel.certainty *= trustFactor;

        // STEP D: Cognitive Limits & Eviction
        this._enforceCognitiveLimits(targetNode, newIntel);

        // STEP E: Apply Ownership & Provenance
        window.IntelManager.grantOwnership(resulting_intel_id, targetNode.id);
        newIntel.provenance.push({
            node_id: targetNode.id,
            timestamp: window.EngineParams?.worldDay || 0,
            origin_type: targetNode.type || 'NPC',
            source_faction: targetNode.faction || 'Neutral'
        });
    },

    /**
     * Syncs a massive payload to a Village Hub, bounded by its attention_budget.
     */
    bulkSyncToVillage: function(caravanNode, villageNode, intel_ids) {
        let budget = villageNode.attention_budget || 5;
        const currentIntel = window.IntelManager.getIntelForNode(villageNode.id);
        
        // Prioritize incoming intel based on aggregate scores
        const incoming = intel_ids.map(id => window.IntelManager.lookup(id)).filter(i => i !== null);
        incoming.sort((a, b) => this._calculatePriority(b) - this._calculatePriority(a));

        for (const intel of incoming) {
            if (budget <= 0) break;
            
            // Sync using Caravan fidelity (0.80)
            this.sync(caravanNode, villageNode, intel.intel_id, window.IntelEnums.VECTORS.CARAVAN);
            budget--;
        }
    },

    _calculatePriority: function(intel) {
        return intel.significance.survival * 3 + intel.significance.economic * 2 + intel.significance.political;
    },

    _enforceCognitiveLimits: function(targetNode, incomingIntel) {
        const memoryLimit = targetNode.memory_limit || 10;
        const currentIntel = window.IntelManager.getIntelForNode(targetNode.id);

        if (currentIntel.length >= memoryLimit) {
            // Need to evict. Sort by lowest priority / oldest
            currentIntel.sort((a, b) => {
                const scoreA = this._calculatePriority(a) - (a.spread_generation * 2);
                const scoreB = this._calculatePriority(b) - (b.spread_generation * 2);
                return scoreA - scoreB; 
            });

            // Evict lowest
            const toEvict = currentIntel[0];
            // If the incoming intel is actually worse than our worst, we reject incoming
            if (this._calculatePriority(incomingIntel) < this._calculatePriority(toEvict)) {
                // Wait, if it rejects, we should stop the sync entirely. 
                // For architecture simplicity, we just revoke the evictee.
            }
            window.IntelManager.revokeOwnership(toEvict.intel_id, targetNode.id);
        }
    },

    _areFactionsRivals: function(factionA, factionB) {
        // Mock logic to be expanded in Noble Politics phase
        const rivals = [['monster', 'village'], ['forest', 'kingdom']];
        return rivals.some(pair => pair.includes(factionA) && pair.includes(factionB));
    }
};

// ==========================================
// PHASE 6.3: VERIFICATION & MARKETIZATION (THE ECONOMY)
// ==========================================
window.IntelEconomy = {
    /**
     * Calculates the market value of an Intel_ID in Gold.
     * Factors in Significance, Rarity, Certainty, Generational Decay, and Suppression.
     */
    calculateValue: function(intel, buyerNode) {
        if (!intel || intel.persistence !== window.IntelEnums.PERSISTENCE.ACTIVE) return 0;
        
        // 1. Base Significance
        const baseValue = (intel.significance.survival * 30) + 
                          (intel.significance.political * 20) + 
                          (intel.significance.economic * 10);
        
        if (baseValue <= 0) return 1; // Minimum floor for trivial rumors

        // 2. Rarity Multiplier
        const rarityMults = {
            [window.IntelEnums.RARITY.COMMON]: 1.0,
            [window.IntelEnums.RARITY.UNCOMMON]: 1.5,
            [window.IntelEnums.RARITY.RARE]: 3.0,
            [window.IntelEnums.RARITY.RESTRICTED]: 5.0,
            [window.IntelEnums.RARITY.SECRET]: 10.0,
            [window.IntelEnums.RARITY.LEGENDARY]: 25.0
        };
        const rarityMult = rarityMults[intel.rarity] || 1.0;

        // 3. Suppression Premium (State secrets cost exponentially more)
        const suppressionPremium = intel.suppression_level > 0 ? (intel.suppression_level * 5) : 1;

        // 4. Generational Decay (Information loses value as it spreads)
        const decay = 1 / (intel.spread_generation + 1);

        // 5. Plausibility & Certainty Penalty
        // A lie that sounds absurd is worth nothing unless it's certified.
        const confidenceMod = intel.certainty * intel.plausibility_score;

        // Final Calculation
        let price = Math.floor(baseValue * rarityMult * suppressionPremium * decay * confidenceMod);

        // Asymmetry Check: If buyer already knows this, it's worth 0
        const buyerIntel = window.IntelManager.getIntelForNode(buyerNode.id);
        if (buyerIntel.some(k => k.intel_id === intel.intel_id || k.parent_intel_id === intel.intel_id)) {
            return 0; // Buyer already knows
        }

        return Math.max(1, price);
    },

    /**
     * Player or NPC action to verify a rumor in the field.
     */
    verifyIntel: function(intel_id, verifierNode, truthConditionMet) {
        const intel = window.IntelManager.lookup(intel_id);
        if (!intel || intel.certainty >= 1.0) return false; // Already verified or doesn't exist

        // The Verification Outcome
        const newTruthState = truthConditionMet ? window.IntelEnums.TRUTH_STATE.TRUE : window.IntelEnums.TRUTH_STATE.FALSE;
        
        // Even a debunked rumor is a "Fact" that it's a lie.
        const newType = window.IntelEnums.TYPES.FACT; 

        // Register the updated record
        const verified_intel_id = window.IntelManager.register({
            ...intel,
            parent_intel_id: intel_id,
            supersedes_intel_id: intel_id,
            version: intel.version + 1,
            certainty: 1.0,
            truth_state: newTruthState,
            type: newType,
            source_credibility: Math.max(intel.source_credibility, 0.9), // Verification improves credibility
            dispute_state: 'RESOLVED'
        });

        const newIntel = window.IntelManager.lookup(verified_intel_id);
        
        // Update provenance
        newIntel.provenance.push({
            node_id: verifierNode.id,
            timestamp: window.EngineParams?.worldDay || 0,
            origin_type: 'VERIFIER',
            source_faction: verifierNode.faction || 'Neutral'
        });

        // Grant ownership to the verifier
        window.IntelManager.grantOwnership(verified_intel_id, verifierNode.id);
        
        // We do NOT automatically revoke the old rumor from the world. 
        // The world still believes the rumor until this new FACT propagates.
        
        window.EventBus.emit('UI_LOG', `[VERIFIED] Information updated: ${newIntel.payload.title} is ${truthConditionMet ? 'True' : 'False'}.`);
        return verified_intel_id;
    },

    /**
     * Weaponized Information: Forging a record
     */
    fabricateIntel: function(creatorNode, payload, targetSignificance) {
        // A fabrication is born with FALSE truth, but asserts 1.0 certainty to deceive.
        const fake_id = window.IntelManager.register({
            type: window.IntelEnums.TYPES.WARNING,
            payload: payload,
            certainty: 1.0,
            truth_state: window.IntelEnums.TRUTH_STATE.FALSE,
            plausibility_score: Math.random() * 0.4, // Fabrications are inherently less plausible
            source_credibility: creatorNode.reputation || 0.3,
            significance: targetSignificance,
            rarity: window.IntelEnums.RARITY.RESTRICTED, // Fakes usually pretend to be rare secrets
            epoch_created: window.EngineParams?.worldEpoch || 0
        });

        const fakeIntel = window.IntelManager.lookup(fake_id);
        // Provenance explicitly starts with the creator
        fakeIntel.provenance.push({
            node_id: creatorNode.id,
            timestamp: window.EngineParams?.worldDay || 0,
            origin_type: 'FABRICATOR',
            source_faction: creatorNode.faction || 'Neutral'
        });

        window.IntelManager.grantOwnership(fake_id, creatorNode.id);
        window.EventBus.emit('UI_LOG', `[FABRICATION] Forged report created: ${payload.title}.`);
        
        return fake_id;
    }
};
