/**
 * File: src_systems_prestige.js
 * System 56: Prestige Economies & Honor
 * 
 * Implements Bible §13 (Information Economy) and §19 (Noble Houses).
 * Manages non-material value trading, face-saving, and heroic glory.
 */

class PrestigeManagerSystem {
    constructor() {
        this.honorLedger = new Map(); // Map<entity_id, { honor, face, fame, glory }>
        this.titles = new Map(); // Map<entity_id, [TitleObject]>
        this.publicShame = new Map(); // Map<entity_id, { severity, reason, day }>

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('CHRONICLE_EVENT', (event) => this.processEvent(event));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Prestige] Honor & Face-Saving Systems Engaged');
    }

    /**
     * 56.1 Non-Material Value Trading
     * 56.5 Valor & Heroic Glory
     * Adjusts the prestige components of an entity.
     */
    adjustPrestige(entityId, deltas) {
        if (!this.honorLedger.has(entityId)) {
            this.honorLedger.set(entityId, { honor: 50, face: 50, fame: 0, glory: 0 });
        }

        const stats = this.honorLedger.get(entityId);
        if (deltas.honor) stats.honor = Math.max(0, Math.min(100, stats.honor + deltas.honor));
        if (deltas.face) stats.face = Math.max(0, Math.min(100, stats.face + deltas.face));
        if (deltas.fame) stats.fame += deltas.fame;
        if (deltas.glory) stats.glory += deltas.glory;

        // 56.4 Public Shame & Disgrace
        if (stats.face < 10) {
            this.triggerDisgrace(entityId);
        }
    }

    /**
     * 56.2 Face-Saving Mechanics
     * Attempts to preserve status after a failure.
     */
    attemptFaceSave(entityId, reason) {
        const stats = this.honorLedger.get(entityId);
        if (!stats) return false;

        // Cost of face-saving: usually a trade-off with Truth or Honor
        const success = Math.random() < (stats.face / 100);
        
        if (success) {
            stats.face = Math.min(100, stats.face + 10);
            stats.honor -= 5; // Sacrificing honor for face
            window.EventBus.emit('UI_LOG_DEBUG', `[PRESTIGE] ${entityId} successfully saved face regarding ${reason}.`);
            return true;
        }

        window.EventBus.emit('UI_LOG_DEBUG', `[PRESTIGE] ${entityId} failed to save face. Status plummeted.`);
        return false;
    }

    /**
     * 56.3 Status Signaling Spectacles
     * Triggers an event to boost fame and face.
     */
    hostSpectacle(entityId, type = 'FEAST') {
        const profile = window.PersonhoodManager.getProfile(entityId);
        if (!profile) return;

        // Requirements: Wealth and influence
        const cost = 500; // Abstract currency
        
        this.adjustPrestige(entityId, { face: 20, fame: 50 });
        
        window.EventBus.emit('UI_LOG', `[PRESTIGE] ${entityId} has hosted a grand ${type}, increasing their social standing.`);
        window.ChronicleManager?.recordEvent({
            actorId: entityId,
            type: 'SPECTACLE',
            detail: `${entityId} hosted a ${type} for the local nobility.`,
            significance: 40
        });
    }

    /**
     * 56.6 Title & Medal Conferral
     */
    conferTitle(entityId, titleName, grantorId) {
        if (!this.titles.has(entityId)) this.titles.set(entityId, []);
        
        const title = {
            name: titleName,
            grantorId,
            day: window.EngineParams?.worldDay || 0,
            prestigeBonus: 10
        };

        this.titles.get(entityId).push(title);
        this.adjustPrestige(entityId, { fame: 100, honor: 10 });
        
        window.EventBus.emit('UI_LOG', `[LEGACY] ${entityId} has been granted the title: "${titleName}" by ${grantorId}.`);
    }

    /**
     * 56.7 Defamation & Insult Attacks
     */
    defame(attackerId, targetId, claim) {
        const targetStats = this.honorLedger.get(targetId);
        if (!targetStats) return;

        // Effectiveness depends on attacker's fame and target's face
        const effectiveness = (this.honorLedger.get(attackerId)?.fame || 0) / 1000;
        const damage = 10 * effectiveness;

        this.adjustPrestige(targetId, { face: -damage });
        
        window.EventBus.emit('UI_LOG', `[SCANDAL] ${attackerId} has publicly defamed ${targetId}: "${claim}"`);
        
        if (targetStats.face < 30) {
            this.publicShame.set(targetId, { severity: 1, reason: claim, day: window.EngineParams?.worldDay || 0 });
        }
    }

    triggerDisgrace(entityId) {
        window.EventBus.emit('UI_LOG', `[DISGRACE] ${entityId} has fallen into total disgrace. They are now shunned by polite society.`);
        window.PersonhoodManager?.updateCredibility(entityId, -0.5);
    }

    processEvent(event) {
        // Automatically adjust prestige based on chronicle events
        if (event.type === 'MONSTER_KILL') {
            this.adjustPrestige(event.actorId, { glory: 50, fame: 20 });
        } else if (event.type === 'BETRAYAL') {
            this.adjustPrestige(event.actorId, { honor: -50, face: -30 });
        }
    }
}

window.PrestigeManager = new PrestigeManagerSystem();
export default window.PrestigeManager;
