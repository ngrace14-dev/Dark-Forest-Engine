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

            // --- INSTITUTIONAL MEMORY: SUPPRESSION (Node 3) ---
            // If an event is damaging to a House (e.g. Defeat), they may suppress it
            if (event.type === 'DEFEAT' && event.actorId) {
                const house = window.DynastyManager?.getHouse(event.actorId);
                if (house && Math.random() < 0.3) { // 30% chance to attempt suppression
                     window.EventBus.emit('UI_LOG_DEBUG', `[HISTORY] ${house.name} is attempting to suppress records of their defeat.`);
                     // Suppression implementation: intel significance reduced
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
        
        // --- STEP 7-2: OFFICIAL PUBLICATION ---
        // Check if this event already has an official version for this bias
        const existing = window.ChronicleManager?.officialRecords?.get(event.id) || [];
        if (existing.some(n => n.bias === bias)) return;

        const spin = this.calculateNarrativeSpin(event, truth, bias);
        const authority = this.calculateAuthority(historian);

        const narrative = {
            eventId: event.id,
            bias,
            truthId: truth.intel_id,
            detail: spin.detail,
            authority: authority
        };

        // Register in Chronicle Registry
        window.ChronicleManager?.registerOfficialNarrative(narrative);

        // Register as Intel Record for world education (The Shield)
        window.IntelManager.register({
            type: 'FACT',
            payload: {
                title: spin.title,
                description: spin.detail,
                tags: ['OFFICIAL_HISTORY', 'EDUCATIONAL', bias],
                sourceEventId: event.id
            },
            significance: { political: 80, historical: event.historicalWeight },
            truth_state: 'TRUE',
            certainty: authority,
            isAnchored: true
        });

        window.EventBus.emit('UI_LOG', `[HISTORY] ${bias.toUpperCase()} has published its official account of ${event.type}.`);
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
