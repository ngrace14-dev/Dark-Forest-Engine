/**
 * File: src/systems/agent_roster.js
 * Manages the persistent lifecycle, stats, and task delegation for Agent Roster members.
 * Maps to the final Player Character architecture.
 */

export const BIRTHRIGHTS = {
    STORM_BORN: { id: 'STORM_BORN', title: 'Storm-Born', desc: '+20% Void Resistance; immune to Void Tremors.', poiseBonus: 10, voidImmune: true },
    CHAMPION_KIN: { id: 'CHAMPION_KIN', title: 'Champion-Kin', desc: 'Poise floor 80; +15% Melee attack.', poiseBonus: 20, attackBonus: 15 },
    HOUSE_REMNANT: { id: 'HOUSE_REMNANT', title: 'House Remnant', desc: '+20 Starting Significance; high morale floor.', sigBonus: 20 },
    ECHO_OF_THE_SEAL: { id: 'ECHO_OF_THE_SEAL', title: 'Echo of the Seal', desc: 'Spatial prescience; +25% scouting efficiency.', scoutBonus: 25 },
    ASH_BOUND: { id: 'ASH_BOUND', title: 'Ash-Bound', desc: '-25% Food needs during winter Shifts; immune to frostbite.', coldImmune: true },
    DEEP_SIGHT: { id: 'DEEP_SIGHT', title: 'Deep-Sight', desc: '+20 Lore/Scribe affinity; deciphers ancient syntax.', loreBonus: 20 }
};

window.AgentRosterManager = {
    agents: new Map(),

    createAgent: function(id, name, archeType = 'SURVIVOR') {
        const day = window.EngineParams?.worldDay || 1;
        const bKeys = Object.keys(BIRTHRIGHTS);
        const birthright = BIRTHRIGHTS[bKeys[Math.floor(Math.random() * bKeys.length)]];

        const agent = {
            id,
            name,
            identity: 'ACTIVE',
            alive: true,
            isHarvested: false,
            birthDay: Math.max(1, day - 20 * 365),
            firstShiftSurvivedDay: Math.ceil(day / 14) * 14,
            shiftsSurvived: 0,
            birthright,
            vitals: { hp: 100, maxHp: 100, stamina: 100, poise: 60 + (birthright.poiseBonus || 0), hunger: 100 },
            reflexes: { shock: 0, adrenaline: 0, exhaustion: 0 },
            skills: { strength: 1, toughness: 1, athletics: 1, dodge: 1, meleeAtt: 1, meleeDef: 1, stealth: 1, lore: 1, survival: 1 },
            operatingStance: { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 },
            statusEffects: [],
            career: { id: archeType === 'WAR_MASTER' ? 'warden' : 'scout', level: 1, rank: 'Novice', xp: 0 },
            cultivation: { stage: 0, foundationFireDays: 0, bonusLifespanYears: 0, isCultivatedGuardian: false },
            significance: 20 + (birthright.sigBonus || 0),
            assignedHouseId: 'House Terminus'
        };

        this.agents.set(id, agent);
        return agent;
    },

    setTraining: function(agentId, discipline) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        agent.operatingStance = { mode: 'TRAIN', discipline: discipline.toUpperCase(), task: null, daysTrained: 0 };
        return { success: true, message: `${agent.name} assigned to drill: [TRAIN: ${discipline.toUpperCase()}].` };
    },

    setTask: function(agentId, taskType, targetId = null) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        agent.operatingStance = { mode: 'TASK', discipline: null, task: taskType.toUpperCase(), targetId, daysTrained: 0 };
        return { success: true, message: `${agent.name} dispatched: [TASK: ${taskType.toUpperCase()}].` };
    },

    assignTask: function(agentId, taskType, targetId = null) {
        return this.setTask(agentId, taskType, targetId);
    },

    tickDailyDrills: function() {
        this.agents.forEach(agent => {
            if (!agent.alive) return;
            const st = agent.operatingStance;
            if (st.mode === 'TRAIN') {
                st.daysTrained++;
                agent.career.xp += 5;
                if (st.discipline === 'LOGISTICS' && st.daysTrained >= 7 && agent.career.rank !== 'Logistics Bailiff') {
                    agent.career.rank = 'Logistics Bailiff';
                    agent.career.id = 'quartermaster';
                    if (window.EventBus) window.EventBus.emit('UI_LOG', `📜 [PROMOTION] ${agent.name} mastered logistics: Promoted to Logistics Bailiff!`);
                } else if (st.discipline === 'MARTIAL') {
                    agent.skills.meleeAtt = Math.min(20, agent.skills.meleeAtt + 0.1);
                } else if (st.discipline === 'DEFENSE') {
                    agent.skills.meleeDef = Math.min(20, agent.skills.meleeDef + 0.1);
                    agent.vitals.poise = Math.min(100, agent.vitals.poise + 0.2);
                }
            }
            agent.statusEffects = (agent.statusEffects || []).filter(eff => {
                eff.daysRemaining = (eff.daysRemaining || 1) - 1;
                return eff.daysRemaining > 0;
            });
        });
    },

    applyShiftSurvivalConditions: function(barrierHealthy = true, starved = false, breachFought = false) {
        this.agents.forEach(agent => {
            if (!agent.alive) return;
            agent.shiftsSurvived = (agent.shiftsSurvived || 0) + 1;
            agent.statusEffects ??= [];

            if (barrierHealthy) {
                agent.statusEffects.push({ id: 'SHIFT_VIGOR', name: 'Shift Vigor', type: 'BUFF', daysRemaining: 14, desc: '+15 Poise' });
                agent.vitals.poise = Math.min(100, agent.vitals.poise + 15);
            } else if (!agent.birthright?.voidImmune) {
                agent.statusEffects.push({ id: 'VOID_TREMORS', name: 'Void Tremors', type: 'DEBUFF', daysRemaining: 7, desc: '-10 Poise' });
                agent.vitals.poise = Math.max(10, agent.vitals.poise - 10);
            }

            if (breachFought) {
                agent.statusEffects.push({ id: 'VETERAN_POISE', name: 'Veteran Poise', type: 'BUFF', daysRemaining: 52, desc: '+20 Defense' });
            }

            if (starved && !agent.birthright?.coldImmune) {
                agent.statusEffects.push({ id: 'FAMINE_SCARRED', name: 'Famine Scarred', type: 'DEBUFF', daysRemaining: 26, desc: '-10 Max HP' });
                agent.vitals.maxHp = Math.max(30, agent.vitals.maxHp - 10);
            }
        });
    },

    cultivateTerminusRunic: function(agentId, houseState) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        if ((houseState.barrierFuelUnits || 0) < 10) {
            return { success: false, message: "Insufficient refined barrier fuel (Requires 10 units minimum)." };
        }

        houseState.barrierFuelUnits -= 10;
        agent.cultivation.stage = (agent.cultivation.stage || 0) + 1;

        if (agent.cultivation.stage < 3) {
            return { success: true, message: `Terminus Bone-Carving Stage ${agent.cultivation.stage}/3 complete for ${agent.name}. Ancient syntax engraved.` };
        }

        agent.cultivation.isCultivatedGuardian = true;
        agent.cultivation.bonusLifespanYears += 500;
        agent.cultivation.foundationFireDays = 14;
        agent.career.rank = 'Guardian of the 300';
        agent.significance += 45;
        agent.vitals.maxHp += 50;
        agent.vitals.hp = agent.vitals.maxHp;
        agent.vitals.poise = 100;
        agent.statusEffects.push({ id: 'FOUNDATION_FIRE', name: 'Foundation Fire', type: 'SURGE', daysRemaining: 14, desc: '+200% all combat effectiveness' });

        if (window.EventBus) window.EventBus.emit('UI_LOG', `🔥 [TERMINUS] BREAKTHROUGH SURGE: ${agent.name} has ignited the Foundation Fire and joined the 300 Guardians! (+500y Lifespan)`);

        return { success: true, message: `BREAKTHROUGH ASCENSION! ${agent.name} is now an immortal Guardian of the 300 (+500y lifespan, Foundation Fire ignited).` };
    }
};
