/**
 * File: src_systems_meaning.js
 * Meaning & Investigation Synthesis Engine
 * 
 * Expresses Bible §1, §13, §14, §15, §18.
 * Answers: What matters? Who cares? Why? What do they know? What do they believe? Why?
 */

class MeaningEngineSystem {
    constructor() {
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[MeaningEngine] Causal Synthesis Online');
    }

    /**
     * 1. What matters?
     * Identifies high-significance nodes in the simulation.
     */
    getWhatMatters(limit = 5) {
        if (!window.ChronicleManager) return [];
        return window.ChronicleManager.worldLedger
            .slice()
            .sort((a, b) => b.significance - a.significance)
            .slice(0, limit);
    }

    /**
     * 2. Who cares? & 3. Why do they care?
     * Maps an event to interested parties based on Force, House, and Career alignment.
     */
    getInterestedParties(eventId) {
        const event = window.ChronicleManager?.worldLedger.find(e => e.id === eventId);
        if (!event) return [];

        const parties = [];

        // Check Forces (Bible §18)
        if (window.ForceManager) {
            Object.entries(window.ForceManager.forces).forEach(([forceName, data]) => {
                if (event.detail.includes(forceName) || (event.associatedForces && event.associatedForces.includes(forceName))) {
                    parties.push({
                        name: forceName,
                        type: 'FORCE',
                        reason: `Aligned with ${data.metric} pressure.`
                    });
                }
            });
        }

        // Check Houses (Bible §19)
        if (window.DynastyManager) {
            window.DynastyManager.houses.forEach(house => {
                // Houses care if their members are involved or their monopolies are threatened
                if (event.actorId === house.id || event.detail.includes(house.name)) {
                    parties.push({
                        name: house.name,
                        type: 'HOUSE',
                        reason: `Institutional involvement or historical feud impact.`
                    });
                }
            });
        }

        return parties;
    }

    /**
     * 4. What do they know? & 5. What do they believe?
     * Surfacing the delta between objective Truth and subjective Belief.
     */
    getSubjectiveState(npcId, intelId) {
        const objective = window.IntelManager?.lookup(intelId);
        if (!objective) return null;

        const npcKnowledge = window.IntelManager.getIntelForNode(npcId);
        const hasKnowledge = npcKnowledge.find(i => i.intel_id === intelId || i.parent_intel_id === intelId);

        if (!hasKnowledge) {
            return { state: 'IGNORANT', belief: 'NONE', reason: 'Information has not propagated to this node.' };
        }

        // Belief Logic: (Bible §14)
        // If the NPC holds a distorted version (Rumor), they believe that instead of the Fact.
        const heldRecord = hasKnowledge;
        const belief = (heldRecord.type === 'FACT') ? 'CERTAINTY' : 'DOUBT';
        const truthSync = (heldRecord.truth_state === objective.truth_state);

        // KNOWLEDGE PIVOT: Identify the tier of this belief
        const tier = window.KnowledgeSystem?.getKnowledgeTier(npcId, intelId) || 'PERSONAL';

        return {
            state: 'KNOWLEDGEABLE',
            tier: tier,
            heldRecordId: heldRecord.intel_id,
            belief: belief,
            isCorrect: truthSync,
            certainty: heldRecord.certainty,
            reason: truthSync ? 'Holds a verified record.' : 'Influenced by a distorted rumor lineage.'
        };
    }

    /**
     * 6. Why do they believe it?
     * Traces the provenance and trust lineage of a belief.
     */
    getBeliefLineage(npcId, intelId) {
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return [];

        // Trace provenance (Bible §13)
        const lineage = intel.provenance.map(p => {
            const sourceRep = window.ReputationManager?.getReputation(p.node_id);
            return {
                node: p.node_id,
                faction: p.source_faction,
                timestamp: p.timestamp,
                reliabilityAtTime: sourceRep ? sourceRep.reliability : 0.5
            };
        });

        return lineage;
    }
}

window.MeaningEngine = new MeaningEngineSystem();
export default window.MeaningEngine;
