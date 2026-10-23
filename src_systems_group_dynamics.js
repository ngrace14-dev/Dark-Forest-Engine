/**
 * File: src_systems_group_dynamics.js
 * System 59: Small Group Leadership & Dominance
 * 
 * Implements pecking orders, leadership fatigue, and group consensus.
 */

class GroupDynamicsSystem {
    constructor() {
        this.groups = new Map(); // Map<group_id, GroupObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Group Dynamics] Leadership & Pecking Orders Online');
    }

    /**
     * 59.1 Informal Chief Emergence
     * 59.2 Pecking Order Challenges
     */
    updatePeckingOrder(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        // Dominance is a combination of Prestige (Face) and Combat Skill
        group.members.sort((a, b) => {
            const profileA = window.PersonhoodManager.getProfile(a);
            const profileB = window.PersonhoodManager.getProfile(b);
            const faceA = window.PrestigeManager?.honorLedger.get(a)?.face || 50;
            const faceB = window.PrestigeManager?.honorLedger.get(b)?.face || 50;
            
            const scoreA = (faceA * 0.5) + (profileA.skills.combat.level * 0.5);
            const scoreB = (faceB * 0.5) + (profileB.skills.combat.level * 0.5);
            
            return scoreB - scoreA;
        });

        const newLeader = group.members[0];
        if (newLeader !== group.leaderId) {
            // 59.7 Authority Vacuum Chaos
            window.EventBus.emit('UI_LOG', `[LEADERSHIP] ${newLeader} has emerged as the new chief of the group.`);
            group.leaderId = newLeader;
            group.leadershipFatigue = 0;
        }
    }

    /**
     * 59.4 Leadership Fatigue
     */
    simulateTurn(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        group.leadershipFatigue += 1;
        
        // 59.2: Higher fatigue makes leadership challenges more likely
        if (group.leadershipFatigue > 10 && Math.random() < 0.1) {
            this.updatePeckingOrder(groupId);
        }

        // 59.6 Scapegoating Weak Members
        if (group.members.length > 3 && Math.random() < 0.05) {
            const weakest = group.members[group.members.length - 1];
            window.EventBus.emit('UI_LOG_DEBUG', `[GROUP] ${group.leaderId} is scapegoating ${weakest} for the group's failures.`);
        }
    }
}

window.GroupDynamics = new GroupDynamicsSystem();
export default window.GroupDynamics;
