/**
 * File: src_systems_social_capital.js
 * System 51: Social Capital & Favor Ledgers
 * System 53: Patronage Networks & Sponsorship
 * 
 * Implements Bible §13 (Information Economy) and §36 (Institutional Persistence).
 * Tracks "Blood Favors", patronage umbrellas, and social debt.
 */

class SocialCapitalSystem {
    constructor() {
        this.ledger = new Map(); // Map<creditor_id, Map<debtor_id, FavorObject>>
        this.patrons = new Map(); // Map<client_id, patron_id>
        this.networks = new Map(); // Map<patron_id, Set<client_id>>

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Social Capital] Favor Ledgers & Patronage Online');
    }

    /**
     * 51.1 Obligation Tracking
     * 51.2 Blood Favor Currency
     * Records a "Blood Favor" (high-value social debt).
     */
    recordFavor(creditorId, debtorId, weight = 10, reason = 'ASSISTANCE') {
        if (creditorId === debtorId) return;

        if (!this.ledger.has(creditorId)) this.ledger.set(creditorId, new Map());
        const creditorLedger = this.ledger.get(creditorId);

        let favor = creditorLedger.get(debtorId);
        if (!favor) {
            favor = {
                weight: 0,
                history: [],
                status: 'ACTIVE'
            };
            creditorLedger.set(debtorId, favor);
        }

        favor.weight += weight;
        favor.history.push({ day: window.EngineParams?.worldDay || 0, weight, reason });

        window.EventBus.emit('UI_LOG_DEBUG', `[FAVOR] ${debtorId} now owes a favor to ${creditorId} (${reason}).`);
    }

    /**
     * 51.3 Favor Calling
     * Debtor pays back the favor via action or resources.
     */
    callFavor(creditorId, debtorId, requiredWeight = 10) {
        const creditorLedger = this.ledger.get(creditorId);
        if (!creditorLedger || !creditorLedger.has(debtorId)) return false;

        const favor = creditorLedger.get(debtorId);
        if (favor.weight >= requiredWeight) {
            favor.weight -= requiredWeight;
            window.EventBus.emit('UI_LOG', `[FAVOR] ${creditorId} has called in a favor from ${debtorId}.`);
            return true;
        }

        // 51.4 Favor Default & Dishonor
        window.EventBus.emit('UI_LOG', `[DISHONOR] ${debtorId} failed to honor a favor to ${creditorId}!`);
        window.PrestigeManager?.adjustPrestige(debtorId, { honor: -20, face: -10 });
        return false;
    }

    /**
     * 53.1 Career Sponsorship
     * 53.2 Protective Umbrella
     * Establishes a Patron-Client relationship.
     */
    establishPatronage(patronId, clientId) {
        if (this.patrons.has(clientId)) {
            const oldPatron = this.patrons.get(clientId);
            this.networks.get(oldPatron)?.delete(clientId);
        }

        this.patrons.set(clientId, patronId);
        if (!this.networks.has(patronId)) this.networks.set(patronId, new Set());
        this.networks.get(patronId).add(clientId);

        // 53.3 Patronage Loyalty Tithes
        window.PersonhoodManager.updateRelationship(clientId, patronId, { loyalty: 0.5, respect: 0.3 });
        
        window.EventBus.emit('UI_LOG', `[PATRONAGE] ${clientId} is now under the protection of ${patronId}.`);
    }

    /**
     * 53.6 Patron Abandonment
     * 53.4 Client Network Collapse
     */
    handleDeath(data) {
        const deceasedId = data.id;

        // If a Patron dies, the network collapses (53.4)
        if (this.networks.has(deceasedId)) {
            const clients = this.networks.get(deceasedId);
            clients.forEach(clientId => {
                this.patrons.delete(clientId);
                window.EventBus.emit('UI_LOG', `[PATRONAGE] The umbrella of ${deceasedId} has collapsed. ${clientId} is now vulnerable.`);
                
                // 53.8 Inherited Patronage Ties
                // Clients might seek the Patron's heir
                const heirId = window.PersonhoodManager.findSuccessor(window.PersonhoodManager.getProfile(deceasedId));
                if (heirId) {
                    this.establishPatronage(heirId, clientId);
                }
            });
            this.networks.delete(deceasedId);
        }

        // 51.6 Inherited Favor Debts
        // Favors owed TO the deceased are inherited by the heir
        if (this.ledger.has(deceasedId)) {
            const heirId = window.PersonhoodManager.findSuccessor(window.PersonhoodManager.getProfile(deceasedId));
            if (heirId) {
                this.ledger.set(heirId, this.ledger.get(deceasedId));
                window.EventBus.emit('UI_LOG_DEBUG', `[FAVOR] Heirs of ${deceasedId} have inherited their favor ledger.`);
            }
            this.ledger.delete(deceasedId);
        }
    }
}

window.SocialCapital = new SocialCapitalSystem();
export default window.SocialCapital;
