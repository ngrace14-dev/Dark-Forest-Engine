/**
 * File: src_systems_knowledge.js
 * Phase: Knowledge States & Belief Diffusion
 * 
 * Expresses Bible §13 (Information Economy) and §16 (Historian System).
 * Defines Personal, Household, Institutional, and Civilizational knowledge tiers.
 */

class KnowledgeSystem {
    constructor() {
        this.TIERS = {
            PERSONAL: 'PERSONAL',
            HOUSEHOLD: 'HOUSEHOLD',
            INSTITUTIONAL: 'INSTITUTIONAL',
            CIVILIZATIONAL: 'CIVILIZATIONAL'
        };
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[KnowledgeSystem] Perspectives Stratified');
    }

    /**
     * Identifies the Knowledge Tier of a specific fact for a specific entity.
     * Bible §13: Information as a physical, tradeable world commodity.
     */
    getKnowledgeTier(nodeId, intelId) {
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return 'NONE';

        // 1. CIVILIZATIONAL (Bible §16: Official History)
        // Publicly known or part of the official narrative
        if (intel.payload?.tags?.includes('OFFICIAL_HISTORY') || 
            intel.rarity === 'COMMON' || 
            intel.persistence === 'ARCHIVED') {
            return this.TIERS.CIVILIZATIONAL;
        }

        // 2. INSTITUTIONAL (Bible §8, §9: Guardians/Archives)
        // Shared within an organization but hidden from the public
        const entity = this.findEntity(nodeId);
        if (entity) {
            const instId = entity.institutionId || entity.houseId;
            if (instId && window.IntelManager?.institutionalSilos.has(instId)) {
                const silo = window.IntelManager.institutionalSilos.get(instId);
                if (silo.has(intelId)) return this.TIERS.INSTITUTIONAL;
            }
        }

        // 3. HOUSEHOLD (Bible §19: Dynasty Secrets)
        // Private to a specific House bloodline
        if (entity && entity.houseId) {
            const house = window.DynastyManager?.getHouse(entity.houseId);
            if (house && house.archives.includes(intelId)) return this.TIERS.HOUSEHOLD;
        }

        // 4. PERSONAL (Bible §13: Witness)
        // Only known because they saw it or were told directly
        const owners = window.IntelManager?.ownershipRegistry.get(intelId);
        if (owners && owners.has(nodeId)) {
            return this.TIERS.PERSONAL;
        }

        return 'OBSCURED';
    }

    findEntity(id) {
        if (!window.GameCore?.activeEntities) return null;
        return window.GameCore.activeEntities.find(en => en.id === id);
    }
}

window.KnowledgeSystem = new KnowledgeSystem();
export default window.KnowledgeSystem;
