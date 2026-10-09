/**
 * File: src_systems_history_office.js
 * Phase 7: Historical Office & Official History
 * 
 * Implements Bible §16 (Historian System).
 * NPCs convert Truth into Official History, introducing bias and revisionism.
 */

class HistoryOfficeSystem {
    constructor() {
        this.officialLedger = []; // Array of { title, detail, authority, bias, date }
        this.narrativeWeight = new Map(); // Map<intel_id, weight> (How "official" a fact is)
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.processWorkQueue());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[HistoryOffice] Imperial Archives Open');
    }

    /**
     * Simulation of NPCs (Historians/Scribes) reviewing the world.
     * Bible §16: Chronicle -> Truth -> Official History.
     */
    processWorkQueue() {
        if (!window.ChronicleManager || !window.IntelManager) return;

        // Find high-weight chronicle events that haven't been "Officialized"
        const recentEvents = window.ChronicleManager.worldLedger.slice(-10);
        
        recentEvents.forEach(event => {
            if (event.isOfficial) return;

            // NPCs with historian career roles perform "Review"
            const historians = this.getAvailableHistorians();
            if (historians.length > 0) {
                const historian = historians[Math.floor(Math.random() * historians.length)];
                this.publishOfficialNarrative(event, historian);
            }
        });
    }

    getAvailableHistorians() {
        // Find NPCs with archivist/historian roles
        return window.GameCore?.activeEntities.filter(en => 
            en.def?.role === 'Archivist' || en.def?.profession === 'historian'
        ) || [];
    }

    /**
     * Transforms a raw event into an "Official Narrative".
     * Expresses Bible §16: "Historians create understanding, not truth."
     */
    publishOfficialNarrative(event, historian) {
        // Narrative Bias (Bible §17 Addendum BJ)
        // If the historian is from a specific House, they spin the event to favor them
        const bias = historian.houseId || 'CROWN';
        const spin = this.calculateNarrativeSpin(event, bias);

        const narrative = {
            id: 'hist_' + Math.random().toString(36).substr(2, 9),
            title: `Official Record: ${event.type}`,
            detail: spin.detail,
            sourceEventId: event.id,
            historianId: historian.id,
            authority: this.calculateAuthority(historian),
            bias: bias,
            date: window.EngineParams?.worldDay || 0
        };

        this.officialLedger.push(narrative);
        event.isOfficial = true;

        // Register as Intel Record (Type: FACT but with potential distortion)
        window.IntelManager.register({
            type: 'FACT',
            payload: {
                title: narrative.title,
                description: narrative.detail,
                tags: ['OFFICIAL_HISTORY', bias]
            },
            significance: { political: 50, historical: event.historicalWeight },
            truth_state: 'TRUE', // It's "True" that this is the official history
            certainty: narrative.authority
        });

        window.EventBus.emit('UI_LOG', `[HISTORY] ${historian.name} published a new Official Record: ${narrative.title}`);
        window.EventBus.emit('HISTORY_PUBLISHED', narrative);
    }

    calculateNarrativeSpin(event, bias) {
        let detail = event.detail;
        
        // Revisionist History logic
        if (bias === 'house_terminus') {
            detail = detail.replace('The Shift', 'The Observed Stabilization');
        } else if (bias === 'CROWN') {
            detail = `By Royal Decree: ${detail}`;
        }

        return { detail };
    }

    calculateAuthority(historian) {
        // Reputation affects how much the world believes this history (Phase 3)
        if (window.ReputationManager) {
            const rep = window.ReputationManager.getReputation(historian.id);
            return rep.credibility;
        }
        return 0.8;
    }

    getOfficialHistory() {
        return this.officialLedger;
    }
}

window.HistoryOffice = new HistoryOfficeSystem();
export default window.HistoryOffice;
