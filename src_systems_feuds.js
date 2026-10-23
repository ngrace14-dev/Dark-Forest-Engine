/**
 * File: src_systems_feuds.js
 * System 55: Feud & Grudge Escalation
 * 
 * Implements Bible §19 (Noble Houses) and §36 (Institutional Persistence).
 * Manages tit-for-tat retaliation, honor stains, and multi-generational conflicts.
 */

class FeudManagerSystem {
    constructor() {
        this.grudges = new Map(); // Map<actor_id, Map<target_id, GrudgeObject>>
        this.houseFeuds = new Map(); // Map<house_pair_key, FeudObject>
        this.activeDuels = new Map(); // Map<duel_id, DuelObject>

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DAMAGED', (data) => this.handleHarm(data));
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Feuds] Retaliation & Honor Mechanics Active');
    }

    /**
     * 55.1 Tit-for-Tat Retaliation
     * 55.2 Honor Stain Mechanics
     * Records an offense and calculates the "stain" on the victim's honor.
     */
    recordOffense(victimId, offenderId, type, severity = 10) {
        if (victimId === offenderId) return;

        const victim = window.PersonhoodManager?.getProfile(victimId);
        const offender = window.PersonhoodManager?.getProfile(offenderId);
        if (!victim || !offender) return;

        // Create or update personal grudge
        if (!this.grudges.has(victimId)) this.grudges.set(victimId, new Map());
        const victimGrudges = this.grudges.get(victimId);

        let grudge = victimGrudges.get(offenderId);
        if (!grudge) {
            grudge = {
                type,
                severity: 0,
                stain: 0, // 55.2 Honor Stain
                events: [],
                lastOffenseDay: window.EngineParams?.worldDay || 0
            };
            victimGrudges.set(offenderId, grudge);
        }

        grudge.severity += severity;
        grudge.stain += severity * (victim.traits.cynicism > 0.5 ? 0.5 : 1.5); // Sensitive individuals feel more "stain"
        grudge.events.push({ type, day: window.EngineParams?.worldDay || 0, severity });
        grudge.lastOffenseDay = window.EngineParams?.worldDay || 0;

        // 55.6 Feud Escalation Thresholds
        if (grudge.severity > 50 && !this.isHouseFeudActive(victim.houseId, offender.houseId)) {
            this.escalateToBloodFeud(victim.houseId, offender.houseId, victimId, offenderId);
        }

        window.EventBus.emit('UI_LOG_DEBUG', `[GRUDGE] ${victimId} now holds a ${severity} severity grudge against ${offenderId} for ${type}.`);
        
        // Retaliation Logic (55.1)
        if (grudge.severity > 20 && Math.random() < victim.traits.ambition) {
            this.planRetaliation(victimId, offenderId);
        }
    }

    /**
     * 55.6 Feud Escalation Thresholds
     * Moves from a personal grudge to a full house-level blood-feud.
     */
    escalateToBloodFeud(houseA, houseB, initiatorId, targetId) {
        if (!houseA || !houseB || houseA === houseB) return;

        const key = [houseA, houseB].sort().join(':');
        if (this.houseFeuds.has(key)) return;

        const feud = {
            id: `feud_${key}`,
            houses: [houseA, houseB],
            intensity: 1,
            initiatorId,
            targetId,
            startDay: window.EngineParams?.worldDay || 0,
            isBloodFeud: true,
            status: 'ACTIVE'
        };

        this.houseFeuds.set(key, feud);
        
        // Sync with DynastyManager for legacy tracking
        window.DynastyManager?.recordFeudEvent(houseA, houseB, 'ESCALATION_TO_BLOOD_FEUD');

        window.EventBus.emit('UI_LOG', `[FEUD] A BLOOD-FEUD has erupted between ${houseA} and ${houseB}!`);
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: "⚔️ BLOOD FEUD DECLARED", pos: { x: 0, y: 40, z: 0 }, color: '#ef4444' });
    }

    /**
     * 55.5 Blood Money (Weregild)
     * Offers financial compensation to end a grudge or stain.
     */
    offerWeregild(offenderId, victimId, amount) {
        const victimGrudges = this.grudges.get(victimId);
        if (!victimGrudges || !victimGrudges.has(offenderId)) return false;

        const grudge = victimGrudges.get(offenderId);
        const victim = window.PersonhoodManager.getProfile(victimId);
        
        // Evaluation logic: Does the victim value money over honor?
        const greed = victim.traits.cynicism; // Using cynicism as a proxy for pragmatic greed
        const acceptanceThreshold = grudge.severity * 10;
        
        if (amount >= acceptanceThreshold * (1.0 - greed)) {
            grudge.severity = Math.max(0, grudge.severity - (amount / 10));
            grudge.stain = Math.max(0, grudge.stain - (amount / 5));
            
            window.EventBus.emit('UI_LOG', `[FEUD] ${victimId} has accepted Weregild of ${amount} from ${offenderId}. The stain is cleansed.`);
            
            if (grudge.severity === 0) {
                victimGrudges.delete(offenderId);
            }
            return true;
        }

        window.EventBus.emit('UI_LOG', `[FEUD] ${victimId} rejected the Weregild! Honor cannot be bought.`);
        return false;
    }

    /**
     * 55.7 Honor Duel Rules
     * Initiates a structured combat to resolve an honor stain.
     */
    challengeToDuel(challengerId, targetId, rules = 'FIRST_BLOOD') {
        const challenger = window.PersonhoodManager.getProfile(challengerId);
        const target = window.PersonhoodManager.getProfile(targetId);

        if (!challenger || !target) return;

        const duelId = `duel_${Date.now()}_${challengerId}`;
        const duel = {
            id: duelId,
            participants: [challengerId, targetId],
            rules, // FIRST_BLOOD, TO_THE_DEATH, TO_YIELD
            status: 'CHALLENGED',
            location: null // Could be a specific coordinate
        };

        this.activeDuels.set(duelId, duel);
        window.EventBus.emit('UI_LOG', `[HONOR] ${challengerId} has challenged ${targetId} to a duel (${rules})!`);
        
        // Target AI evaluation
        if (target.traits.riskTolerance > 0.3 || target.traits.ambition > 0.6) {
            this.acceptDuel(duelId);
        } else {
            this.declineDuel(duelId);
        }
    }

    acceptDuel(duelId) {
        const duel = this.activeDuels.get(duelId);
        if (!duel) return;
        duel.status = 'ACCEPTED';
        window.EventBus.emit('UI_LOG', `[HONOR] The challenge is accepted! The duel between ${duel.participants[0]} and ${duel.participants[1]} begins.`);
        // Logic to trigger combat simulation
    }

    declineDuel(duelId) {
        const duel = this.activeDuels.get(duelId);
        if (!duel) return;
        
        // Declining a duel is a massive Honor Stain
        const cowardId = duel.participants[1];
        const victimId = duel.participants[0];
        
        this.recordOffense(victimId, cowardId, 'COWARDICE', 30);
        window.EventBus.emit('UI_LOG', `[HONOR] ${cowardId} has declined the duel! Shame follows them.`);
        this.activeDuels.delete(duelId);
    }

    /**
     * 55.3 Multi-Generational Feuds
     * Transfers feuds from a deceased NPC to their heirs.
     */
    transferFeudsToHeirs(deceasedId, heirId) {
        const victimGrudges = this.grudges.get(deceasedId);
        if (!victimGrudges) return;

        if (!this.grudges.has(heirId)) this.grudges.set(heirId, new Map());
        const heirGrudges = this.grudges.get(heirId);

        victimGrudges.forEach((grudge, offenderId) => {
            // Dilute severity for next generation (55.3)
            const inheritedGrudge = {
                ...grudge,
                severity: grudge.severity * 0.7,
                stain: grudge.stain * 0.5,
                isInherited: true
            };
            heirGrudges.set(offenderId, inheritedGrudge);
        });

        window.EventBus.emit('UI_LOG_DEBUG', `[FEUD] Heirs of ${deceasedId} have inherited their grievances.`);
    }

    handleHarm(data) {
        if (data.attackerId && data.victimId) {
            this.recordOffense(data.victimId, data.attackerId, 'PHYSICAL_HARM', data.damage || 5);
        }
    }

    handleDeath(data) {
        const deceasedId = data.id;
        const killerId = data.lastAttacker?.id;

        if (killerId) {
            this.recordOffense(deceasedId, killerId, 'MURDER', 100);
            
            // If the deceased has a house, check for house-level escalation
            const deceasedProfile = window.PersonhoodManager.getProfile(deceasedId);
            const killerProfile = window.PersonhoodManager.getProfile(killerId);
            
            if (deceasedProfile?.houseId && killerProfile?.houseId) {
                this.escalateToBloodFeud(deceasedProfile.houseId, killerProfile.houseId, deceasedId, killerId);
            }
        }

        // 55.8 Target List Invalidation
        // Remove grudges against the deceased, or transfer them if they were "Blood Debts"
        this.grudges.forEach((victimGrudges, victimId) => {
            if (victimGrudges.has(deceasedId)) {
                const grudge = victimGrudges.get(deceasedId);
                if (grudge.severity > 80) {
                    // Transfer to heirs? (Blood for Blood)
                    // Logic here...
                }
                victimGrudges.delete(deceasedId);
            }
        });

        // Handle inheritance of feuds
        const heirId = window.PersonhoodManager.findSuccessor(deceasedProfile);
        if (heirId) {
            this.transferFeudsToHeirs(deceasedId, heirId);
        }
    }

    isHouseFeudActive(houseA, houseB) {
        if (!houseA || !houseB) return false;
        const key = [houseA, houseB].sort().join(':');
        return this.houseFeuds.has(key);
    }

    planRetaliation(victimId, offenderId) {
        // AI Logic to issue a bounty or attempt an attack
        window.EventBus.emit('UI_LOG_DEBUG', `[FEUD] ${victimId} is plotting retaliation against ${offenderId}...`);
    }
}

window.FeudManager = new FeudManagerSystem();
export default window.FeudManager;
