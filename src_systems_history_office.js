/**
 * File: src_systems_history_office.js
 * Phase 7: Historical Office & Official History
 * 
 * Implements Bible §16 (Historian System).
 * NPCs convert Truth into Official History, introducing bias and revisionism.
 */

class HistoryOfficeSystem {
    constructor() {
        this.officialLedger = []; // Array of { id, title, detail, authority, bias, date, originalEventId, truthId }
        this.narrativeWeight = new Map(); // Map<intel_id, weight> (How "official" a fact is)
        this.educationRegistry = new Map(); // Map<villageId, Set<officialId>> (What is taught in each village)
        
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

        // Find high-weight chronicle events
        const recentEvents = window.ChronicleManager.worldLedger.slice(-20);
        
        recentEvents.forEach(event => {
            // Find NPCs with archivist/historian roles nearby archives or in Capital
            const historians = this.getAvailableHistorians();
            if (historians.length > 0) {
                const historian = historians[Math.floor(Math.random() * historians.length)];
                
                // Only "Officialize" if there is a verified Truth record (Bible §16)
                const facts = Array.from(window.IntelManager.registry.values())
                    .filter(i => i.type === 'FACT' && (i.payload.title.includes(event.type) || i.significance.historical === event.historicalWeight));
                
                if (facts.length > 0) {
                    this.publishOfficialNarrative(event, facts[0], historian);
                }
            }
        });
    }

    getAvailableHistorians() {
        return window.GameCore?.activeEntities.filter(en => 
            en.def?.role === 'Archivist' || en.def?.profession === 'historian' || en.houseId === 'house_royal'
        ) || [];
    }

    /**
     * Transforms a raw event and its truth into an "Official Narrative".
     * Bible §16: "The Crown may shape history without changing truth."
     */
    publishOfficialNarrative(event, truth, historian) {
        const bias = historian.houseId || 'CROWN';
        
        // Check if this event already has an official version for this bias
        if (this.officialLedger.some(n => n.originalEventId === event.id && n.bias === bias)) return;

        const spin = this.calculateNarrativeSpin(event, truth, bias);

        const narrative = {
            id: 'hist_' + Math.random().toString(36).substr(2, 9),
            title: spin.title,
            detail: spin.detail,
            sourceEventId: event.id,
            truthId: truth.intel_id,
            historianId: historian.id,
            authority: this.calculateAuthority(historian),
            bias: bias,
            date: window.EngineParams?.worldDay || 0,
            divergence: spin.divergence // 0 to 1 score of how much it deviates from Chronicle
        };

        this.officialLedger.push(narrative);

        // Register as Intel Record (Bible §16: Education Records)
        window.IntelManager.register({
            type: 'FACT',
            payload: {
                title: narrative.title,
                description: narrative.detail,
                tags: ['OFFICIAL_HISTORY', 'EDUCATIONAL', bias]
            },
            significance: { political: 80, historical: event.historicalWeight },
            truth_state: 'TRUE', // It's factually true that this is the Official Record
            certainty: narrative.authority,
            isAnchored: true // Official History survives Shifts
        });

        window.EventBus.emit('UI_LOG', `[HISTORY] ${bias.toUpperCase()} has published its official account of ${event.type}.`);
        window.EventBus.emit('HISTORY_PUBLISHED', narrative);
    }

    calculateNarrativeSpin(event, truth, bias) {
        let detail = truth.payload.description;
        let title = `Chronicle of ${event.type}`;
        let divergence = 0.1;

        // Crown Narrative: Focus on Stability and Order (Bible §18)
        if (bias === 'house_royal' || bias === 'CROWN') {
            title = `Royal Decree on the ${event.type}`;
            detail = `By the Grace of the Crown, order was maintained during the ${event.type}. ${detail}`;
            if (event.type === 'DEFEAT' || event.type === 'die') {
                detail = `A loyal servant of the realm transitioned to the Great Peace. The Chain remains unbroken.`;
                divergence = 0.7;
            }
        } 
        // House Terminus Narrative: Focus on Measurement and Knowledge (Bible §8)
        else if (bias === 'house_terminus') {
            title = `Terminus Observation: ${event.type}`;
            detail = `Analytical data confirms the stability of the Mountain Ring despite the ${event.type}.`;
            divergence = 0.3;
        }

        return { title, detail, divergence };
    }

    calculateAuthority(historian) {
        if (window.ReputationManager) {
            const rep = window.ReputationManager.getReputation(historian.id);
            const instRep = window.ReputationManager.getInstitutionReputation(historian.houseId);
            return (rep.credibility * 0.4) + (instRep.authority * 0.6);
        }
        return 0.8;
    }

    /**
     * Cross-references the 4 layers of an event.
     */
    getNarrativeLayers(eventId) {
        const chronicle = window.ChronicleManager?.worldLedger.find(e => e.id === eventId);
        if (!chronicle) return null;

        const truth = Array.from(window.IntelManager?.registry.values() || [])
            .find(i => i.significance.historical === chronicle.historicalWeight && i.type === 'FACT');

        const official = this.officialLedger.filter(n => n.originalEventId === eventId);

        const folklore = window.GameState?.anthology?.filter(p => p.originId === (chronicle.legendId || 'none'));

        return { chronicle, truth, official, folklore };
    }
}

window.HistoryOffice = new HistoryOfficeSystem();
export default window.HistoryOffice;
