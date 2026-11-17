import { BIRTHRIGHTS } from './commander_engine.js';

window.AgentRosterManager = {
    agents: new Map(),

    recalculateAgentVitals: function(agent) {
        const baseHp = 80 + (agent.skills.toughness * 8) + (agent.skills.strength * 2);
        const faminePenalty = (agent.vitals.hunger < 30) ? (30 - agent.vitals.hunger) : 0;
        agent.vitals.maxHp = Math.max(30, baseHp - faminePenalty);
        agent.vitals.hp = Math.min(agent.vitals.hp, agent.vitals.maxHp);

        const exhaustionPenalty = Math.floor(agent.reflexes.exhaustion * 0.5);
        const hungerPenalty = (agent.vitals.hunger < 40) ? (40 - agent.vitals.hunger) : 0;
        agent.vitals.maxStamina = Math.max(20, 80 + (agent.skills.athletics * 6) + (agent.skills.survival * 2) - exhaustionPenalty - hungerPenalty);
    },

    createAgent: function(id, name, archeType = 'SURVIVOR') {
        const day = window.EngineParams?.worldDay || 1;
        const bKeys = Object.keys(BIRTHRIGHTS);
        const birthright = BIRTHRIGHTS[bKeys[Math.floor(Math.random() * bKeys.length)]];

        const baseSkills = {
            'WAR_MASTER': { strength: 5, toughness: 5, meleeAtt: 5, meleeDef: 4 },
            'WARDEN': { toughness: 6, meleeAtt: 3, meleeDef: 5, survival: 3 },
            'SCOUT': { athletics: 6, stealth: 6, survival: 4, dodge: 4 },
            'INSPECTOR': { lore: 6, stealth: 5, meleeDef: 3, survival: 3 },
            'SCRIBE': { lore: 8, stealth: 3, dodge: 3, survival: 2 },
            'SMUGGLER': { stealth: 6, athletics: 5, dodge: 5, meleeAtt: 3 },
            'ENFORCER': { strength: 6, toughness: 5, meleeAtt: 5, meleeDef: 4 },
            'PILOT': { athletics: 5, survival: 5, dodge: 4, lore: 3 },
            'DREDGER': { toughness: 5, strength: 5, survival: 5, athletics: 3 },
            'HUNTER': { stealth: 6, meleeAtt: 5, survival: 5, dodge: 3 },
            'PREDATOR': { strength: 8, toughness: 7, meleeAtt: 8, meleeDef: 6 },
            'APPRENTICE': { lore: 4, toughness: 3, survival: 3, dodge: 3 },
            'SURVIVOR': { strength: 3, toughness: 3, athletics: 3, dodge: 3, meleeAtt: 3, meleeDef: 3, stealth: 3, lore: 3, survival: 3 }
        }[archeType] || {};

        const agent = {
            id,
            name,
            archeType,
            identity: 'ACTIVE',
            alive: true,
            isHarvested: false,
            birthDay: Math.max(1, day - (20 + Math.floor(Math.random() * 30)) * 365),
            firstShiftSurvivedDay: Math.ceil(day / 14) * 14,
            shiftsSurvived: 0,
            birthright,
            vitals: { hp: 100, maxHp: 100, stamina: 100, poise: 60 + (birthright.poiseBonus || 0), hunger: 100 },
            reflexes: { shock: 0, adrenaline: 0, exhaustion: 0 },
            skills: { 
                strength: (baseSkills.strength || 1) + Math.random(), 
                toughness: (baseSkills.toughness || 1) + Math.random(), 
                athletics: (baseSkills.athletics || 1) + Math.random(), 
                dodge: (baseSkills.dodge || 1) + Math.random(), 
                meleeAtt: (baseSkills.meleeAtt || 1) + Math.random(), 
                meleeDef: (baseSkills.meleeDef || 1) + Math.random(), 
                stealth: (baseSkills.stealth || 1) + Math.random(), 
                lore: (baseSkills.lore || 1) + Math.random(), 
                survival: (baseSkills.survival || 1) + Math.random() 
            },
            operatingStance: { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 },
            statusEffects: [{ id: birthright.id, name: birthright.title, type: 'BUFF', desc: birthright.desc }],
            career: { id: archeType.toLowerCase(), level: 1, rank: 'Novice', xp: 0 },
            cultivation: { stage: 0, foundationFireDays: 0, bonusLifespanYears: 0, isCultivatedGuardian: false },
            significance: 20 + (birthright.sigBonus || 0),
            assignedHouseId: 'House Terminus'
        };

        this.recalculateAgentVitals(agent);
        this.agents.set(id, agent);
        return agent;
    },

    setTraining: function(agentId, discipline) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: 'Agent invalid or deceased.' };
        agent.operatingStance = { mode: 'TRAIN', discipline: discipline.toUpperCase(), task: null, daysTrained: 0 };
        return { success: true, message: ${agent.name} assigned to drill: [TRAIN: ]. };
    },

    setTask: function(agentId, taskType, targetId = null) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: 'Agent invalid or deceased.' };
        agent.operatingStance = { mode: 'TASK', discipline: null, task: taskType.toUpperCase(), targetId, daysTrained: 0 };
        return { success: true, message: ${agent.name} dispatched: [TASK: ]. };
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
                    if (window.EventBus) window.EventBus.emit('UI_LOG', 📜 [PROMOTION]  mastered logistics: Promoted to Logistics Bailiff!);
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
        if (!agent || !agent.alive) return { success: false, message: 'Agent invalid or deceased.' };
        if ((houseState.barrierFuelUnits || 0) < 10) {
            return { success: false, message: 'Insufficient refined barrier fuel (Requires 10 units minimum).' };
        }

        houseState.barrierFuelUnits -= 10;
        agent.cultivation.stage = (agent.cultivation.stage || 0) + 1;

        if (agent.cultivation.stage < 3) {
            return { success: true, message: Terminus Bone-Carving Stage /3 complete for . Ancient syntax engraved. };
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

        if (window.EventBus) window.EventBus.emit('UI_LOG', 🔥 [TERMINUS] BREAKTHROUGH SURGE:  has ignited the Foundation Fire and joined the 300 Guardians! (+500y Lifespan));

        return { success: true, message: BREAKTHROUGH ASCENSION!  is now an immortal Guardian of the 300 (+500y lifespan, Foundation Fire ignited). };
    }
};
