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
        this.institutionalEntropy = new Map(); // institutionId -> entropyScore (0.0 to 1.0)
        
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
        window.EventBus.on('HEARTBEAT_T30D', () => this.processInstitutionalEntropy());
    }

    /**
     * Process Administrative Decay for all Noble Houses and Councils.
     * Bible §36: Institutions rot if they lack competence.
     */
    processInstitutionalEntropy() {
        if (!window.DynastyManager) return;

        window.DynastyManager.houses.forEach(house => {
            const currentEntropy = this.institutionalEntropy.get(house.id) || 0;
            
            // 1. Calculate Complexity
            // Increases with: Territory Size, Number of Archives, Age of House
            const complexity = (house.monopolies?.length || 0) * 0.1 + (house.archives?.length || 0) * 0.02 + 0.1;

            // 2. Calculate Competence
            // Sum of relevant NPC skills in the house territories
            let competence = house.legitimacy * 0.5; // Baseline from leader
            
            // 3. Entropy Delta
            // Entropy_new = Entropy_old + (Complexity - Competence) * DriftFactor
            const delta = (complexity - competence) * 0.05;
            const nextEntropy = Math.max(0, Math.min(1.0, currentEntropy + delta));
            
            this.institutionalEntropy.set(house.id, nextEntropy);

            // 4. Manifest Entropy Effects
            this.applyEntropyEffects(house, nextEntropy);
        });
    }

    applyEntropyEffects(house, entropy) {
        if (entropy > 0.3 && entropy <= 0.6) {
            // Level 1: Tax Leaks
            if (Math.random() < 0.1) {
                window.EventBus.emit('UI_LOG_DEBUG', `[DECAY] ${house.name} suffers from bureaucratic tax leaks.`);
                house.prestige = Math.max(0, house.prestige - 2);
            }
        } 
        else if (entropy > 0.6 && entropy <= 0.8) {
            // Level 2: Barrier Neglect
            if (window.VillageManager) {
                // HARDENING: Check for villages using both house.name and house.id mapping
                const villages = window.VillageManager.villages.filter(v => v.nobleHouse === house.name || v.nobleHouse === house.id);
                villages.forEach(v => {
                    v.barrierIntegrity = Math.max(0, (v.barrierIntegrity || 100) - 5);
                });
                if (villages.length > 0 && Math.random() < 0.05) {
                    window.EventBus.emit('UI_LOG', `[DECAY] ${house.name}'s neglect causes village barriers to weaken.`);
                }
            }
        } 
        else if (entropy > 0.8) {
            // Level 3: Total Institutional Rot
            house.legitimacy = Math.max(0.1, (house.legitimacy || 0.5) - 0.05);
            if (Math.random() < 0.05) {
                window.EventBus.emit('UI_LOG', `🚨 [CRISIS] Total institutional rot detected in ${house.name}!`);
                window.EventBus.emit('CIV_CRISIS_DETECTED', { type: 'ADMINISTRATIVE_COLLAPSE', entityId: house.id });
            }
        }
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
