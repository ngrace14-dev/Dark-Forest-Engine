/**
 * File: src_systems_kinship.js
 * System 57: Kinship Ties & Tribal In-Groups
 * 
 * Implements bloodline loyalty, clan identity, and tribal authority.
 */

class KinshipSystem {
    constructor() {
        this.clans = new Map(); // Map<clan_id, ClanObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Kinship] Clan Ties & Tribal Loyalty Engaged');
    }

    /**
     * 57.1 Bloodline Loyalty Primacy
     * 57.8 Tribal In-Group Trust
     */
    getKinshipBonus(entityA, entityB) {
        const profileA = window.PersonhoodManager?.getProfile(entityA);
        const profileB = window.PersonhoodManager?.getProfile(entityB);
        if (!profileA || !profileB) return 1.0;

        // 57.1: Check for shared house or bloodline
        if (profileA.houseId && profileA.houseId === profileB.houseId) {
            return 1.5; // 50% trust bonus for same house
        }

        // 57.3 Extended Family Clusters
        if (profileA.ancestry.parents.includes(entityB) || profileA.ancestry.children.includes(entityB)) {
            return 2.0; // Direct blood
        }

        return 1.0;
    }

    /**
     * 57.4 Tribal Ostracization
     */
    ostracize(entityId, clanId) {
        const clan = this.clans.get(clanId);
        if (!clan) return;

        clan.members.delete(entityId);
        window.EventBus.emit('UI_LOG', `[KINSHIP] ${entityId} has been ostracized from ${clanId}. They are now Kinless.`);
        
        // Impact on prestige and trust
        window.PrestigeManager?.adjustPrestige(entityId, { face: -50, honor: -30 });
    }

    /**
     * 57.7 Clan Elder Authority
     */
    issueElderCommand(elderId, clanId, command) {
        const clan = this.clans.get(clanId);
        if (!clan || clan.elderId !== elderId) return;

        window.EventBus.emit('UI_LOG', `[KINSHIP] Clan Elder ${elderId} issues a command to ${clanId}: ${command}`);
        // 57.5 Kinship Blood Duty: Members are compelled to obey
    }
}

window.KinshipManager = new KinshipSystem();
export default window.KinshipManager;
