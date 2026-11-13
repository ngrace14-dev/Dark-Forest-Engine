/**
 * File: src_systems_relationships.js
 * System 54: Marriage Alliances & Succession Engines
 * 
 * Implements Bible §19 (Noble Houses) and §36 (Institutional Continuity).
 * Manages the complex web of political unions, dowries, and succession claims.
 */

class RelationshipManagerSystem {
    constructor() {
        this.alliances = new Map(); // Map<union_id, UnionObject>
        this.contracts = []; // Array of pending marriage proposals
        this.betrothals = new Map(); // Map<entity_id, partner_id>
        this.claims = new Map(); // Map<entity_id, [SuccessionClaim]>

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Relationships] Marriage & Succession Engines Online');
    }

    /**
     * 54.1 Political Treaty Marriages
     * 54.2 Monopoly Consolidation Marriages
     * Proposes a marriage contract between two houses or individuals.
     */
    proposeMarriage(proposerId, targetId, terms = {}) {
        const proposer = window.PersonhoodManager?.getProfile(proposerId);
        const target = window.PersonhoodManager?.getProfile(targetId);

        if (!proposer || !target) return false;

        // Requirement check: Must be of age and not already married
        if (proposer.age < 18 || target.age < 18) return false;
        if (this.alliances.has(proposerId) || this.alliances.has(targetId)) return false;

        const contract = {
            id: `contract_${Date.now()}_${proposerId}`,
            proposerId,
            targetId,
            terms: {
                dowry: terms.dowry || 0, // 54.4 Dowry & Land Annexation
                landTransfer: terms.landTransfer || null,
                bloodlineLegitimacy: terms.legitimacyWeight || 0.1, // 54.3 Bloodline Legitimacy
                isMonopolyConsolidation: terms.isMonopolyConsolidation || false,
                isSecret: terms.isSecret || false // 54.6 Secret Marriage Scandals
            },
            status: 'PENDING',
            expiry: (window.EngineParams?.worldDay || 0) + 7
        };

        this.contracts.push(contract);
        
        if (!contract.terms.isSecret) {
            window.EventBus.emit('UI_LOG', `[DIPLOMACY] A marriage proposal has been sent from ${proposerId} to ${targetId}.`);
        }

        // Trigger AI evaluation
        this.evaluateProposal(contract);
        return true;
    }

    /**
     * AI logic for NPCs to accept or reject marriage.
     */
    evaluateProposal(contract) {
        const target = window.PersonhoodManager?.getProfile(contract.targetId);
        const proposer = window.PersonhoodManager?.getProfile(contract.proposerId);
        if (!target || !proposer) return;

        // Factor 1: House Standing & Monopoly Consolidation (54.2)
        let score = 0;
        const targetHouse = window.DynastyManager?.houses.get(target.houseId);
        const proposerHouse = window.DynastyManager?.houses.get(proposer.houseId);

        if (targetHouse && proposerHouse) {
            score += (proposerHouse.prestige - targetHouse.prestige) * 0.1;
            
            if (contract.terms.isMonopolyConsolidation && proposerHouse.isBlessed && targetHouse.isBlessed) {
                score += 30; // High incentive for monopoly control
            }
        }

        // Factor 2: Personal Trust (System 47/51)
        const trust = window.PersonhoodManager.getPersonalTrust(contract.targetId, contract.proposerId);
        score += (trust - 0.5) * 50;

        // Factor 3: Dowry (54.4)
        score += contract.terms.dowry * 0.05;

        // Factor 4: Trait Compatibility
        if (target.traits.ambition > 0.7) score += (proposerHouse?.prestige || 0) * 0.2;

        const threshold = 40;
        if (score >= threshold) {
            this.acceptMarriage(contract.id);
        } else {
            this.rejectMarriage(contract.id);
        }
    }

    acceptMarriage(contractId) {
        const contractIndex = this.contracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) return;

        const contract = this.contracts[contractIndex];
        contract.status = 'ACCEPTED';
        
        const union = {
            id: `union_${contract.proposerId}_${contract.targetId}`,
            partners: [contract.proposerId, contract.targetId],
            terms: contract.terms,
            startDate: window.EngineParams?.worldDay || 0,
            children: []
        };

        this.alliances.set(contract.proposerId, union);
        this.alliances.set(contract.targetId, union);

        // Update Personhood Relationships
        window.PersonhoodManager.updateRelationship(contract.proposerId, contract.targetId, { trust: 0.3, loyalty: 0.5 });
        window.PersonhoodManager.updateRelationship(contract.targetId, contract.proposerId, { trust: 0.3, loyalty: 0.5 });

        // 54.3 Bloodline Legitimacy Injection
        if (contract.terms.legitimacyWeight > 0) {
            const house = window.DynastyManager?.houses.get(contract.targetId.houseId);
            if (house) house.legitimacy = Math.min(1.0, house.legitimacy + contract.terms.legitimacyWeight);
        }

        if (!contract.terms.isSecret) {
            window.EventBus.emit('UI_LOG', `[HISTORY] Union sanctified: ${contract.proposerId} and ${contract.targetId}.`);
            window.ChronicleManager?.recordEvent({
                actorId: contract.proposerId,
                targetId: contract.targetId,
                type: 'MARRIAGE',
                detail: `A union of houses between ${contract.proposerId} and ${contract.targetId}.`,
                significance: 80
            });
        }

        this.contracts.splice(contractIndex, 1);
    }

    rejectMarriage(contractId) {
        const contractIndex = this.contracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) return;

        const contract = this.contracts[contractIndex];
        
        // 54.5 Betrothal Sabotage / Insult
        window.PersonhoodManager.updateRelationship(contract.proposerId, contract.targetId, { trust: -0.1, respect: -0.2 });
        
        if (!contract.terms.isSecret) {
            window.EventBus.emit('UI_LOG_DEBUG', `[DIPLOMACY] Marriage proposal rejected between ${contract.proposerId} and ${contract.targetId}.`);
        }

        this.contracts.splice(contractIndex, 1);
    }

    /**
     * 54.7 Succession Claim Generation
     * Generates a legal claim to a house's assets or title.
     */
    generateClaim(entityId, houseId, type = 'LINEAGE') {
        if (!this.claims.has(entityId)) this.claims.set(entityId, []);
        
        const claim = {
            houseId,
            type, // LINEAGE, TREATY, CONQUEST
            strength: Math.random() * 0.5 + (type === 'LINEAGE' ? 0.4 : 0.1),
            day: window.EngineParams?.worldDay || 0
        };

        this.claims.get(entityId).push(claim);
        window.EventBus.emit('UI_LOG_DEBUG', `[SUCCESSION] New claim generated for ${entityId} on ${houseId}.`);
    }

    /**
     * 54.8 Marriage Annulment Feuds
     */
    annulMarriage(unionId, reason = 'INFIDELITY') {
        const union = Array.from(this.alliances.values()).find(u => u.id === unionId);
        if (!union) return;

        const [p1, p2] = union.partners;
        this.alliances.delete(p1);
        this.alliances.delete(p2);

        // Trigger Feud
        const p1Profile = window.PersonhoodManager.getProfile(p1);
        const p2Profile = window.PersonhoodManager.getProfile(p2);
        
        if (p1Profile.houseId && p2Profile.houseId && p1Profile.houseId !== p2Profile.houseId) {
            window.DynastyManager?.recordFeudEvent(p1Profile.houseId, p2Profile.houseId, `ANNULMENT_${reason}`);
        }

        window.EventBus.emit('UI_LOG', `[SCANDAL] Marriage annulled: ${p1} and ${p2} due to ${reason}.`);
    }

    handleDeath(entity) {
        // Handle succession based on claims
        const houseClaims = Array.from(this.claims.entries())
            .filter(([id, claims]) => claims.some(c => c.houseId === entity.houseId))
            .sort((a, b) => b[1][0].strength - a[1][0].strength);

        if (houseClaims.length > 0) {
            const strongestClaimant = houseClaims[0][0];
            window.EventBus.emit('UI_LOG_DEBUG', `[SUCCESSION] Strongest claimant for ${entity.houseId} is ${strongestClaimant}.`);
        }
    }
};

window.RelationshipManager = new RelationshipManagerSystem();
export default window.RelationshipManager;
