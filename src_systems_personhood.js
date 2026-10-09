/**
 * File: src_systems_personhood.js
 * Phase: NPC Personhood & Individual Conclusion logic
 * 
 * Expresses Bible §22 (Career Ambition) and §34 (NPC Autonomy).
 * Implements traits, identity archetypes, and belief filters.
 */

class PersonhoodSystem {
    constructor() {
        this.profiles = new Map(); // Map<node_id, ProfileObject>
        this.ARCHETYPES = {
            STEWARD: { bias: 'STABILITY', desc: 'Prioritizes institutional order and tradition.' },
            SURVIVOR: { bias: 'CAUTION', desc: 'Focuses on immediate safety and resource preservation.' },
            ZEALOT: { bias: 'FAITH', desc: 'Unwavering belief in House or Force directives.' },
            SKEPTIC: { bias: 'TRUTH', desc: 'Questions authority and official narratives.' },
            OPPORTUNIST: { bias: 'GREED', desc: 'Views information through the lens of personal gain.' }
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Personhood] Cognitive Filters Active');
    }

    /**
     * Generates or retrieves a unique personality for an entity.
     */
    getProfile(nodeId) {
        if (!this.profiles.has(nodeId)) {
            const traits = {
                loyalty: Math.random(),
                fear: Math.random(),
                ambition: Math.random(),
                riskTolerance: Math.random(),
                cynicism: Math.random()
            };
            
            const archetypeKeys = Object.keys(this.ARCHETYPES);
            const identity = archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];

            this.profiles.set(nodeId, {
                id: nodeId,
                traits,
                identity,
                bias: this.ARCHETYPES[identity].bias,
                relationships: new Map(), // nodeId -> trustValue (0-1)
                beliefHistory: [] // History of conclusions drawn
            });
        }
        return this.profiles.get(nodeId);
    }

    /**
     * Answers: Why did THIS person arrive at THIS belief?
     * Bible §14: Truth Economy.
     */
    calculateConclusion(nodeId, intelId) {
        const profile = this.getProfile(nodeId);
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return null;

        const conclusion = {
            intelId: intelId,
            nodeId: nodeId,
            state: 'UNPROCESSED',
            interpretation: 'LITERAL',
            certainty: intel.certainty,
            reason: 'Standard interpretation.'
        };

        // 1. TRUST FILTER (Bible §13)
        // If the source of the intel is a rival or untrusted, skepticism increases
        const provenance = intel.provenance[0];
        let trust = 0.5;
        if (provenance) {
            trust = this.getPersonalTrust(nodeId, provenance.node_id, provenance.source_faction);
        }

        // 2. IDENTITY/ARCHETYPE FILTERS
        if (profile.identity === 'SKEPTIC' && intel.payload.tags.includes('OFFICIAL_HISTORY')) {
            conclusion.interpretation = 'SUSPICIOUS';
            conclusion.certainty *= 0.5;
            conclusion.reason = 'Skeptical archetype doubts official narratives by default.';
        }

        if (profile.identity === 'SURVIVOR' && intel.type === 'WARNING') {
            conclusion.interpretation = 'ALARMED';
            conclusion.certainty = Math.min(1.0, conclusion.certainty * 1.5);
            conclusion.reason = 'Survivor identity amplifies perceived threats.';
        }

        if (profile.identity === 'STEWARD' && intel.significance.political > 50) {
            conclusion.interpretation = 'REVERENT';
            conclusion.certainty = Math.min(1.0, conclusion.certainty * 1.2);
            conclusion.reason = 'Steward archetype values high-authority political information.';
        }

        // 3. TRAIT-BASED REVISION
        if (profile.traits.cynicism > 0.8 && trust < 0.4) {
            conclusion.state = 'REJECTED';
            conclusion.interpretation = 'DISMISSED';
            conclusion.reason = 'High individual cynicism led to the total rejection of the source.';
        } else {
            conclusion.state = 'ACCEPTED';
        }

        return conclusion;
    }

    getPersonalTrust(nodeId, sourceId, faction) {
        const profile = this.getProfile(nodeId);
        
        // Check individual relationship first
        if (profile.relationships.has(sourceId)) {
            return profile.relationships.get(sourceId);
        }

        // Fallback to Institutional Trust (Phase 3 Integration)
        if (window.ReputationManager) {
            return window.ReputationManager.calculateTrust({ id: sourceId, faction }, { id: nodeId, faction: profile.bias });
        }

        return 0.5;
    }

    updateRelationship(nodeId, targetId, delta) {
        const profile = this.getProfile(nodeId);
        const current = profile.relationships.get(targetId) || 0.5;
        profile.relationships.set(targetId, Math.max(0, Math.min(1.0, current + delta)));
    }
}

window.PersonhoodManager = new PersonhoodSystem();
export default window.PersonhoodManager;
