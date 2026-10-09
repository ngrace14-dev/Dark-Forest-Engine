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
                        reason: `Conflict: ${intelA.payload.title} vs ${intelB.payload.title}`
                    };
                }
            }
        }
        return null;
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