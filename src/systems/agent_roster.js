/**
 * File: src/systems/agent_roster.js
 * Manages the persistent lifecycle, stats, and task delegation for Agent Roster members.
 * Maps to the final Player Character architecture.
 */

window.AgentRosterManager = {
    agents: new Map(), // Map<agentId, AgentObject>

    createAgent: function(id, name, archeType = 'SURVIVOR') {
        const agent = {
            id,
            name,
            identity: 'ACTIVE',
            alive: true,
            isHarvested: false,
            // Stats
            vitals: { hp: 100, maxHp: 100, stamina: 100, poise: 60, hunger: 100 },
            reflexes: { shock: 0, adrenaline: 0, exhaustion: 0 },
            skills: { strength: 1, toughness: 1, athletics: 1, dodge: 1, meleeAtt: 1, meleeDef: 1, stealth: 1, lore: 1, survival: 1 },
            // Inventory & Runes
            equipment: { head: null, chest: null, waist: null, hands: null, legs: null, weapon: null, prosthetic: {} },
            bodyRunes: { HEAD: [], CHEST: [], BACK: [], ARMS: [], HANDS: [], LEGS: [] },
            // Career & Metaphysical
            career: { id: 'hunter', level: 1, xp: 0 },
            significance: 20,
            blessings: [],
            evolution: { stage: 'NONE', points: 0 },
            // Delegation State
            activeTask: null,
            assignedHouseId: null
        };
        this.agents.set(id, agent);
        return agent;
    },

    assignTask: function(agentId, taskType, targetId) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return;
        agent.activeTask = { type: taskType, targetId, dayStarted: window.EngineParams.worldDay };
        window.EventBus.emit('AGENT_TASK_ASSIGNED', { agentId, taskType });
    }
};
