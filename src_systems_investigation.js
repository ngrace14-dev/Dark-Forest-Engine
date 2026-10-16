/**
 * File: src_systems_investigation.js
 * Phase 1: Crow's Eye Investigation Layer
 * 
 * Transforms passive Intel into active evidence for solving mysteries.
 * Implements Bible §30 (Mystery System) and §14 (Truth Economy).
 */

class InvestigationManagerSystem {
    constructor() {
        this.mysteries = new Map(); // Map<mystery_id, MysteryObject>
        this.activeMysteryId = null;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('INTEL_VERIFIED', (intel) => this.onIntelVerified(intel));
    }

        init() {
        this.discoveryTier = 1; // Bible §33
        
        // Initialize core mysteries from the Design Bible

        this.registerMystery({
            id: 'terminus_anomaly',
            title: 'The Terminus Anomaly',
            description: 'Observations suggest Terminus behaves differently during a Shift. Why?',
            tier: 4,
            category: 'REALITY',
            clues: []
        });

        this.registerMystery({
            id: 'barrier_theory',
            title: 'The Nature of Barriers',
            description: 'Public belief claims protection. Truth suggests attachment to the Chain.',
            tier: 5,
            category: 'CIVILIZATION',
            clues: []
        });

        this.registerMystery({
            id: 'mountain_rotation',
            title: 'The Static Horizon',
            description: 'The Mountain Ring appears static, but some records suggest a skip in time.',
            tier: 6,
            category: 'GEOGRAPHY',
            clues: []
        });

                this.registerMystery({
            id: 'founder_betrayal',
            title: 'The Final Plight',
            description: 'The Founders claim they were forced to run. Ancient poems suggest betrayal.',
            tier: 9,
            category: 'HISTORY',
            clues: []
        });

        this.registerMystery({
            id: 'origin_fracture',
            title: 'The Great Fracture',
            description: 'What occurred at t=0? Evidence suggests a runic civilization before the Shift.',
            tier: 10,
            category: 'ORIGIN',
            clues: []
        });

        this.registerMystery({
            id: 'first_wendigo',
            title: 'The First Wendigo',
            description: 'The transition from Champion to Monster. Was it a failure or a choice?',
            tier: 11,
            category: 'ORIGIN',
            clues: []
        });

        
        window.EventBus.emit('UI_LOG', '[Investigation] Workbench Initialized');
    }

    registerMystery(data) {
        this.mysteries.set(data.id, {
            ...data,
            state: 'UNSOLVED', // UNSOLVED, INVESTIGATING, RESOLVED
            linkedEvidence: new Set(),
            contradictions: [],
            discoveryProgress: 0 // 0 to 100
        });
    }

    /**
     * Flags a piece of Intel as "Evidence" for a specific Mystery.
     */
    flagEvidence(intelId, mysteryId) {
        const mystery = this.mysteries.get(mysteryId);
        if (!mystery) return;

        mystery.linkedEvidence.add(intelId);
        mystery.state = 'INVESTIGATING';
        this.calculateProgress(mysteryId);
        this.checkContradictions(mysteryId);
        
        window.EventBus.emit('UI_LOG', `[INVESTIGATION] Linked evidence to ${mystery.title}`);
        window.EventBus.emit('INVESTIGATION_UPDATED', mysteryId);
    }

        calculateProgress(mysteryId) {
        const mystery = this.mysteries.get(mysteryId);
        if (!mystery) return;
        
        const evidenceCount = mystery.linkedEvidence.size;
        // Basic progress: just counting linked evidence for now. 
        // In future phases, this will require specific high-weight facts.
        mystery.discoveryProgress = Math.min(100, evidenceCount * 25);

        if (mystery.discoveryProgress >= 100 && mystery.state !== 'RESOLVED') {
            this.resolveMystery(mysteryId);
        }
    }

    resolveMystery(mysteryId) {
        const mystery = this.mysteries.get(mysteryId);
        if (!mystery) return;

        mystery.state = 'RESOLVED';
        this.discoveryTier = Math.max(this.discoveryTier, mystery.tier + 1);

        window.EventBus.emit('UI_LOG', `🌟 [DISCOVERY] Mystery Solved: ${mystery.title}`);
        window.EventBus.emit('UI_LOG', `[DISCOVERY] World Understanding Level: Tier ${this.discoveryTier}`);
        window.EventBus.emit('MYSTERY_RESOLVED', mysteryId);
    }


    /**
     * Automatically scans for logical conflicts in the linked evidence.
     * Expresses Bible §14 (Truth vs distortion).
     */
    checkContradictions(mysteryId) {
        const mystery = this.mysteries.get(mysteryId);
        if (!mystery) return;

        const evidenceNodes = Array.from(mystery.linkedEvidence)
            .map(id => window.IntelManager.lookup(id))
            .filter(i => i !== null);
        
        mystery.contradictions = [];

        for (let i = 0; i < evidenceNodes.length; i++) {
            for (let j = i + 1; j < evidenceNodes.length; j++) {
                const a = evidenceNodes[i];
                const b = evidenceNodes[j];
                
                const conflict = this.findConflict(a, b);
                if (conflict) {
                    mystery.contradictions.push(conflict);
                    window.EventBus.emit('UI_LOG_DEBUG', `[CONTRADICTION] ${conflict.reason}`);
                }
            }
        }
    }

        findConflict(intelA, intelB) {
            // Logic 1: Factual Contradiction (Same location/event, different truth claim)
            if (intelA.payload.target_coord && intelB.payload.target_coord) {
                const dist = Math.hypot(intelA.payload.target_coord.x - intelB.payload.target_coord.x, 
                                        intelA.payload.target_coord.z - intelB.payload.target_coord.z);
            
                if (dist < 15) {
                    // If one says TRUE and other says FALSE about the same area/fact
                    if (intelA.truth_state !== intelB.truth_state && intelA.certainty > 0.5 && intelB.certainty > 0.5) {
                        return {
                            ids: [intelA.intel_id, intelB.intel_id],
                            type: 'FACT_CONFLICT',
                            reason: `Objective Conflict: ${intelA.payload.title} vs ${intelB.payload.title}`
                        };
                    }
                }
            }

            // --- PHASE: CONTRADICTION DETECTION (§1, §14) ---

            // Logic 2: Narrative Contradiction (History vs Truth)
            const tagsA = intelA.payload.tags || [];
            const tagsB = intelB.payload.tags || [];
        
            const isHistory = tagsA.includes('OFFICIAL_HISTORY') || tagsB.includes('OFFICIAL_HISTORY');
            const isFact = intelA.type === 'FACT' || intelB.type === 'FACT';

            if (isHistory && isFact) {
                // Check if they describe the same historicalWeight (The unique event ID)
                if (intelA.significance?.historical === intelB.significance?.historical && 
                    intelA.significance?.historical > 0) {
                
                    // If history detail differs significantly from the Fact detail
                    if (intelA.payload.description !== intelB.payload.description) {
                        return {
                            ids: [intelA.intel_id, intelB.intel_id],
                            type: 'HISTORY_DISTORTION',
                            reason: `Historical Revision: Official record differs from verified truth.`
                        };
                    }
                }
            }

            // Logic 3: Lineage Split (Divergent Rumors)
            if (intelA.parent_intel_id && intelA.parent_intel_id === intelB.parent_intel_id) {
                if (intelA.payload.description !== intelB.payload.description) {
                    return {
                        ids: [intelA.intel_id, intelB.intel_id],
                        type: 'RUMOR_DIVERGENCE',
                        reason: `Split Lineage: Two rumors from the same source have diverged.`
                    };
                }
            }

            return null;
        }

        /**
         * Automatic Global Scan
         * Scans all registered intel for new conflicts to generate emergent mysteries.
         */
        scanForEmergentMysteries() {
            if (!window.IntelManager) return;
            const allIntel = Array.from(window.IntelManager.registry.values());
        
            for (let i = 0; i < allIntel.length; i++) {
                for (let j = i + 1; j < allIntel.length; j++) {
                    const conflict = this.findConflict(allIntel[i], allIntel[j]);
                    if (conflict) {
                        this.generateEmergentMystery(conflict, allIntel[i], allIntel[j]);
                    }
                }
            }
        }

        generateEmergentMystery(conflict, intelA, intelB) {
            const id = `mystery_emergent_${intelA.intel_id.split('_')[1]}`;
            if (this.mysteries.has(id)) return;

            const mystery = {
                id,
                title: `Contradiction: ${intelA.payload.title}`,
                description: `Unresolved conflict between accounts: ${conflict.reason}`,
                tier: this.calculateMysteryTier(intelA, intelB),
                category: 'EMERGENT',
                state: 'UNSOLVED',
                linkedEvidence: new Set([intelA.intel_id, intelB.intel_id]),
                contradictions: [conflict],
                discoveryProgress: 10,
                emergent: true,
                relatedPeople: [...(intelA.provenance || []).map(p => p.node_id), ...(intelB.provenance || []).map(p => p.node_id)]
            };

            this.mysteries.set(id, mystery);
            window.EventBus.emit('UI_LOG', `🔍 [INVESTIGATION] A new mystery has emerged from conflicting reports.`);
            window.EventBus.emit('MYSTERY_GENERATED', mystery);
        }

        calculateMysteryTier(a, b) {
            const sig = Math.max(a.significance.historical, b.significance.historical);
            if (sig > 500) return 3; // Contradictions §33
            if (sig > 100) return 2; // House Secrets
            return 1; // Rumors
        }


    /**
     * Cross-checks if a specific piece of intel is involved in any active contradiction.
     */
    findContradictionForIntel(intelId) {
        let found = null;
        this.mysteries.forEach(m => {
            if (found) return;
            const conflict = m.contradictions.find(c => c.ids.includes(intelId));
            if (conflict) found = conflict;
        });
        return found;
    }

    onIntelVerified(intel) {

        this.mysteries.forEach(m => {
            if (m.linkedEvidence.has(intel.intel_id)) {
                this.calculateProgress(m.id);
                this.checkContradictions(m.id);
            }
        });
    }

    getMysteries() {
        return Array.from(this.mysteries.values());
    }
}

window.InvestigationManager = new InvestigationManagerSystem();