/**
 * File: src_systems_administration.js
 * System 33: Bureaucratic Administration & Scribes
 * System 36: Institutional Corruption & Nepotism
 * System 38: Judicial Systems & Punishment
 */

class AdministrationSystem {
    constructor() {
        this.records = []; // 33.3 Archive Record Indexing
        this.bribes = new Map(); // 36.1 Bribe Networks
        
        // --- ADMINISTRATIVE CONTAINMENT (Plan C) ---
        this.containmentProtocols = {
            'INFO_QUARANTINE': { cost: 50, effect: 'Gossip suppression' },
            'SOCIAL_ISOLATION': { cost: 100, effect: 'Movement restriction' },
            'NARRATIVE_PURGE': { cost: 300, effect: 'Chronicler redirection' }
        };

        this.activeProtocols = new Map(); // villageId -> protocolType
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Administration] Bureaucracy & Judicial Engines Active');
    }

    /**
     * 33.1 Census & Population Tracking
     */
    performCensus() {
        const total = window.VillageManager?.villages.reduce((sum, v) => sum + v.population.current, 0);
        window.EventBus.emit('UI_LOG_DEBUG', `[BUREAUCRACY] Census complete. Total Population: ${total}`);
    }

    /**
     * Deploys a containment protocol to a village.
     * Plan C: Quarantine and Narrative Control.
     */
    deployContainment(villageId, protocolType) {
        const village = window.VillageManager?.villages.find(v => v.id === villageId);
        if (!village || !this.containmentProtocols[protocolType]) return;

        this.activeProtocols.set(villageId, protocolType);
        
        // Manifestation: Barriers turn red/orange to indicate administrative lock
        window.EventBus.emit('UI_LOG', `[ADMIN] ${protocolType} deployed to ${village.name}. Area is under quarantine.`);

        // Mechanics: Block certain event emissions or reduce gossip spread
        if (protocolType === 'INFO_QUARANTINE') {
            if (!village.memoryProfile) village.memoryProfile = {};
            village.memoryProfile.caution = 1.0;
        }

        window.ChronicleManager?.recordEvent({
            actorId: 'ADMINISTRATION',
            type: 'CONTAINMENT_DEPLOYED',
            detail: `Administrative quarantine (${protocolType}) established in ${village.name}.`,
            significance: 50
        });
    }

    /**
     * 38.2 Trial by Combat
     */
    initiateTrialByCombat(accusedId, challengerId) {
        window.EventBus.emit('UI_LOG', `[JUDICIAL] Trial by Combat declared: ${accusedId} vs ${challengerId}!`);
    }

    /**
     * 38.4 Banishment & Exile Orders
     */
    exile(entityId) {
        window.EventBus.emit('UI_LOG', `[JUDICIAL] ${entityId} has been banished from the Kingdom.`);
    }
}

window.Administration = new AdministrationSystem();
export default window.Administration;
