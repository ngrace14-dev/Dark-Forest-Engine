/**
 * File: src_systems_reputation.js
 * Phase 3: Reputation & Trust Engine
 * 
 * Implements Bible §13 (Information Economy) and §16 (Historian System).
 * Tracks the credibility and reliability of individuals, houses, and institutions.
 */

class ReputationManagerSystem {
    constructor() {
        this.entities = new Map(); // Map<entity_id, { credibility, reliability, fame, infamy }>
        this.institutions = new Map(); // Map<inst_id, { credibility, authority, bias }>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('INTEL_VERIFIED', (intel) => this.onIntelVerified(intel));
    }

    init() {
        // Initialize institutional reputations from the Design Bible
        this.setInstitutionReputation('crown', { credibility: 0.9, authority: 1.0, bias: 'ORDER' });
        this.setInstitutionReputation('house_terminus', { credibility: 0.95, authority: 0.4, bias: 'KNOWLEDGE' });
        this.setInstitutionReputation('guardians_300', { credibility: 0.85, authority: 0.8, bias: 'SECURITY' });
        this.setInstitutionReputation('common_folk', { credibility: 0.4, authority: 0.1, bias: 'SURVIVAL' });
        
        window.EventBus.emit('UI_LOG', '[Reputation] Trust Engine Online');
    }

    getReputation(id) {
        if (!this.entities.has(id)) {
            this.entities.set(id, { credibility: 0.5, reliability: 0.5, fame: 0, infamy: 0 });
        }
        return this.entities.get(id);
    }

    setInstitutionReputation(id, data) {
        this.institutions.set(id, data);
    }

    getInstitutionReputation(id) {
        return this.institutions.get(id) || { credibility: 0.5, authority: 0.1, bias: 'NONE' };
    }

    /**
     * Called when a piece of intel is verified.
     * Rewards or punishes the source of the original intel.
     */
    onIntelVerified(intel) {
        // Find the original source in provenance
        const original = intel.provenance[0];
        if (!original || !original.node_id) return;

        const isTrue = intel.truth_state === 'TRUE';
        const rep = this.getReputation(original.node_id);

        if (isTrue) {
            rep.credibility = Math.min(1.0, rep.credibility + 0.05);
            rep.reliability = Math.min(1.0, rep.reliability + 0.02);
            rep.fame += intel.significance.historical || 1;
        } else {
            rep.credibility = Math.max(0.0, rep.credibility - 0.1);
            rep.reliability = Math.max(0.0, rep.reliability - 0.05);
            rep.infamy += intel.significance.political || 1;
        }
        
        // Institutional blowback
        const instId = original.source_faction;
        if (this.institutions.has(instId)) {
            const instRep = this.institutions.get(instId);
            const delta = isTrue ? 0.01 : -0.02;
            instRep.credibility = Math.max(0.0, Math.min(1.0, instRep.credibility + delta));
        }
    }

    /**
     * Calculates the "Trust Factor" between a source and a target.
     */
    calculateTrust(sourceNode, targetNode) {
        const sourceRep = this.getReputation(sourceNode.id);
        const sourceInst = this.getInstitutionReputation(sourceNode.faction);
        
        // Base trust is source credibility
        let trust = sourceRep.credibility * 0.7 + sourceInst.credibility * 0.3;

        // Faction bias
        if (sourceNode.faction === targetNode.faction) {
            trust = Math.min(1.0, trust + 0.2);
        } else if (this.isRival(sourceNode.faction, targetNode.faction)) {
            trust = Math.max(0.1, trust - 0.4);
        }

        return trust;
    }

    isRival(f1, f2) {
        // DYNASTY PIVOT: Check for active blood-feuds (Bible §19)
        if (window.DynastyManager) {
            const feuds = window.DynastyManager.getFeuds();
            const activeFeud = feuds.find(f => 
                (f.houseA === f1 && f.houseB === f2) || (f.houseA === f2 && f.houseB === f1)
            );
            if (activeFeud && activeFeud.intensity > 5) return true;
        }

        const rivals = [['monster', 'village'], ['forest', 'kingdom'], ['adventurer', 'monster']];
        return rivals.some(pair => pair.includes(f1) && pair.includes(f2));
    }
}

window.ReputationManager = new ReputationManagerSystem();
export default window.ReputationManager;
