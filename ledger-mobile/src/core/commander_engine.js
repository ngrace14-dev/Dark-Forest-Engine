/**
 * File: src/core/commander_engine.js
 * Clean-Room Headless Commander Simulation Core.
 *
 * Designed for dual-path execution:
 * 1. Immediate Prologue Soft-Launch on Title Card Boot (zero Three.js / WebGL / DOM dependencies).
 * 2. Foldable In-Game Commander System that the player can unlock and toggle during the 3D Sandbox.
 */

const rootScope = typeof window !== 'undefined' ? window : globalThis;

// Ensure minimal global state hooks exist even before 3D engine boot
rootScope.EngineParams = rootScope.EngineParams || {
    worldDay: 1,
    worldEpoch: 0,
    timeScale: 1,
    mountainRotation: 0
};

if (!rootScope.EventBus) {
    rootScope.EventBus = {
        events: {},
        on(event, listener) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(listener);
        },
        off(event, listener) {
            if (!this.events[event]) return;
            this.events[event] = this.events[event].filter(l => l !== listener);
        },
        emit(event, data) {
            if (!this.events[event]) return;
            this.events[event].forEach(listener => {
                try { listener(data); } catch (err) { console.error(`[EventBus:${event}]`, err); }
            });
        }
    };
}

export const BIRTHRIGHTS = {
    STORM_BORN: { id: 'STORM_BORN', title: 'Storm-Born', desc: '+20% Void Resistance; immune to Void Tremors.', poiseBonus: 10, voidImmune: true },
    CHAMPION_KIN: { id: 'CHAMPION_KIN', title: 'Champion-Kin', desc: 'Poise floor 80; +15% Melee attack.', poiseBonus: 20, attackBonus: 15 },
    HOUSE_REMNANT: { id: 'HOUSE_REMNANT', title: 'House Remnant', desc: '+20 Starting Significance; high morale floor.', sigBonus: 20 },
    ECHO_OF_THE_SEAL: { id: 'ECHO_OF_THE_SEAL', title: 'Echo of the Seal', desc: 'Spatial prescience; +25% scouting efficiency.', scoutBonus: 25 },
    ASH_BOUND: { id: 'ASH_BOUND', title: 'Ash-Bound', desc: '-25% Food needs during winter Shifts; immune to frostbite.', coldImmune: true },
    DEEP_SIGHT: { id: 'DEEP_SIGHT', title: 'Deep-Sight', desc: '+20 Lore/Scribe affinity; deciphers ancient syntax.', loreBonus: 20 }
};

export const CANONICAL_BEDROCK_SETTLEMENTS = [
    { id: 0, name: "The Capital", house: "House Aethel", industry: "barrier_fuel", population: 62500, barrierFuel: 500, chainsIntegrity: 100, isCrownSeat: true },
    { id: 1, name: "Oakhaven", house: "House Oakheart", industry: "ironwood", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 2, name: "Gallows Hill", house: "House Gallows", industry: "runic_dust", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 3, name: "Mire's Edge", house: "House Mire", industry: "toxic_fungi", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 4, name: "Blackwood", house: "House Blackwood", industry: "weevil_fluid", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 5, name: "Hollow Creek", house: "House Hollow", industry: "gator_leather", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 6, name: "Ashen Hold", house: "House Ashen", industry: "basalt_tablets", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    {
        id: 7,
        name: "Epitaph",
        house: "Hidden Sanctuary of Epitaph",
        industry: "fallen_era_household_runes",
        population: 4200,
        barrierFuel: 0,
        chainsIntegrity: 100,
        rKm: 185,
        region: "mountain_event_horizon",
        hiddenGapKeeper: true,
        objectiveTimelineAnchor: true,
        concealedByFallenEraRunes: true,
        fuelIndependent: true,
        participatesInHouseCompetition: false
    },
    { id: 8, name: "Crow's Perch", house: "House Crow", industry: "intel", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 9, name: "Widow's Web", house: "House Widow", industry: "cold_resin", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 10, name: "Thornbury", house: "House Thorn", industry: "pacifying_wax", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 11, name: "Gloomhaven", house: "House Gloom", industry: "gloom_glass", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 12, name: "Duskendale", house: "House Dusken", industry: "kinetic_silk", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 13, name: "Grimsby", house: "House Grim", industry: "tether_chains", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 14, name: "Shadowfen", house: "House Shadowfen", industry: "pre_fuel_matrix", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 15, name: "Blighted Watch", house: "House Blightwatch", industry: "conduit_rods", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 16, name: "Bleakmire", house: "House Bleak", industry: "pale_caps", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 17, name: "Wraith's End", house: "House Wraith", industry: "abyssal_oil", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 18, name: "Cullfield", house: "House Cull", industry: "cardiac_catalysts", population: 9868, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 19, name: "Terminus", house: "House Terminus", industry: "containment_defense", population: 9876, barrierFuel: 50, chainsIntegrity: 100 },
    { id: 20, name: "Aegis Rest (Outer Ward)", house: "Crown Outer Sanctuary", industry: "spatial_stabilization", population: 6400, barrierFuel: 50, chainsIntegrity: 100 }
];

export const SQUAD_ARMORY_CATALOG = {
    ironwood_spear: { id: 'ironwood_spear', name: 'Oakheart Ironwood Spear', slot: 'weapon', preferredRole: 'warden', buyPrice: 8, sellPrice: 5, bonuses: { meleeAtt: 4, meleeDef: 2 }, desc: '+4 Melee Att, +2 Melee Def' },
    widow_resin_blade: { id: 'widow_resin_blade', name: 'Widow Cold-Resin Longknife', slot: 'weapon', preferredRole: 'scout', buyPrice: 9, sellPrice: 6, bonuses: { meleeAtt: 5, stealth: 4 }, desc: '+5 Melee Att, +4 Stealth' },
    kinetic_silk_coat: { id: 'kinetic_silk_coat', name: 'Dusken Kinetic-Silk Brigandine', slot: 'armor', preferredRole: 'scout', buyPrice: 10, sellPrice: 6, bonuses: { dodge: 4, poise: 15 }, desc: '+4 Dodge, +15 Poise' },
    grimsby_plate: { id: 'grimsby_plate', name: 'Grimsby Runic-Dusted Hauberk', slot: 'armor', preferredRole: 'warden', buyPrice: 12, sellPrice: 8, bonuses: { toughness: 6, maxHp: 25 }, desc: '+6 Toughness, +25 Max HP' },
    gloom_lens_lantern: { id: 'gloom_lens_lantern', name: 'Gloom-Glass Ward Lantern', slot: 'trinket', preferredRole: 'scout', buyPrice: 9, sellPrice: 6, bonuses: { lore: 5, survival: 5 }, desc: '+5 Lore, +5 Survival' },
    blackwood_crossbow: { id: 'blackwood_crossbow', name: 'Blackwood Repeating Hand-Crossbow', slot: 'weapon', preferredRole: 'scout', buyPrice: 14, sellPrice: 9, bonuses: { meleeAtt: 7, stealth: 3 }, desc: '+7 Melee Att, +3 Stealth (Tier II Market)' },
    bleak_titan_buckler: { id: 'bleak_titan_buckler', name: 'Bleakmire Titan-Bone Greatshield', slot: 'armor', preferredRole: 'warden', buyPrice: 15, sellPrice: 10, bonuses: { meleeDef: 7, toughness: 5, maxHp: 30 }, desc: '+7 Melee Def, +5 Toughness, +30 Max HP (Tier II Market)' },
    ashen_basalt_seal: { id: 'ashen_basalt_seal', name: 'Ashen Diamond-Cut Basalt Ward-Seal', slot: 'trinket', preferredRole: 'warden', buyPrice: 13, sellPrice: 8, bonuses: { lore: 6, poise: 20 }, desc: '+6 Lore, +20 Poise (Tier II Market)' }
};

// ============================================================================
// 1. AGENT ROSTER MANAGER
// ============================================================================
const AgentRosterManager = rootScope.AgentRosterManager || {
    agents: new Map(),
    squadArmoryStock: ['ironwood_spear', 'widow_resin_blade', 'kinetic_silk_coat', 'grimsby_plate', 'gloom_lens_lantern'],
    feralWendigoQueue: [],
    spawnedFeralWendigos: [],

    createAgent(id, name, archeType = 'SURVIVOR') {
        const day = rootScope.EngineParams?.worldDay || 1;
        const bKeys = Object.keys(BIRTHRIGHTS);
        const birthright = BIRTHRIGHTS[bKeys[Math.floor(Math.random() * bKeys.length)]];

        const agent = {
            id,
            name,
            archeType,
            identity: 'ACTIVE',
            alive: true,
            isHarvested: false,
            birthDay: Math.max(1, day - 20 * 365),
            firstShiftSurvivedDay: Math.ceil(day / 14) * 14,
            shiftsSurvived: 0,
            birthright,
            vitals: { hp: 100, maxHp: 100, stamina: 100, poise: 60 + (birthright.poiseBonus || 0), hunger: 100 },
            reflexes: { shock: 0, adrenaline: 0, exhaustion: 0 },
            skills: { strength: 2, toughness: 2, athletics: 2, dodge: 2, meleeAtt: 2, meleeDef: 2, stealth: 2, lore: 2, survival: 2 },
            equipment: { weapon: null, armor: null, trinket: null },
            operatingStance: { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 },
            statusEffects: [],
            career: { id: archeType === 'WAR_MASTER' || archeType === 'WARDEN' || archeType === 'ENFORCER' ? 'warden' : 'scout', level: 1, rank: 'Novice', xp: 0 },
            cultivation: { stage: 0, foundationFireDays: 0, bonusLifespanYears: 0, isCultivatedGuardian: false },
            significance: 20 + (birthright.sigBonus || 0),
            assignedHouseId: 'House Terminus'
        };

        this.agents.set(id, agent);
        return agent;
    },

    setTraining(agentId, discipline) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        agent.operatingStance = { mode: 'TRAIN', discipline: discipline.toUpperCase(), task: null, daysTrained: 0 };
        return { success: true, message: `${agent.name} assigned to drill: [TRAIN: ${discipline.toUpperCase()}].` };
    },

    setTask(agentId, taskType, targetId = null) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        agent.operatingStance = { mode: 'TASK', discipline: null, task: taskType.toUpperCase(), targetId, daysTrained: 0 };
        return { success: true, message: `${agent.name} dispatched: [TASK: ${taskType.toUpperCase()}].` };
    },

    assignTask(agentId, taskType, targetId = null) {
        return this.setTask(agentId, taskType, targetId);
    },

    tickDailyDrills() {
        this.agents.forEach(agent => {
            if (!agent.alive) return;
            const st = agent.operatingStance;
            if (st.mode === 'TRAIN' && st.discipline) {
                st.daysTrained = (st.daysTrained || 0) + 1;
                if (st.discipline === 'LOGISTICS') {
                    agent.skills.lore = Math.min(20, agent.skills.lore + 0.25);
                    if (st.daysTrained >= 7 && agent.career.rank !== 'Logistics Bailiff') {
                        agent.career.rank = 'Logistics Bailiff';
                        rootScope.EventBus?.emit('UI_LOG', `ðŸ“œ [ROSTER] ${agent.name} promoted to Logistics Bailiff!`);
                    }
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

    applyShiftSurvivalConditions(barrierHealthy = true, starved = false, breachFought = false) {
        const day = rootScope.EngineParams?.worldDay || 1;
        this.processShiftWendigoRebirths(day);

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
                if (!agent.birthright?.coldImmune) {
                    this.applySituationalStatus(agent.id, 'FREEZING', 14);
                }
            }
            if (breachFought) {
                agent.statusEffects.push({ id: 'VETERAN_POISE', name: 'Veteran Poise', type: 'BUFF', daysRemaining: 52, desc: '+20 Defense' });
            }
            if (starved && !agent.birthright?.coldImmune) {
                this.applySituationalStatus(agent.id, 'STARVING', 26);
                agent.statusEffects.push({ id: 'FAMINE_SCARRED', name: 'Famine Scarred', type: 'DEBUFF', daysRemaining: 26, desc: '-10 Max HP' });
                agent.vitals.maxHp = Math.max(30, agent.vitals.maxHp - 10);
            }
        });
    },

    applySituationalStatus(agentId, effectId, daysRemaining = 14) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return false;
        const id = String(effectId || '').toUpperCase();
        if ((id === 'FREEZING' || id === 'HYPOTHERMIA') && agent.birthright?.coldImmune) return false;
        agent.statusEffects ??= [];
        const existing = agent.statusEffects.find(e => e.id === id);
        if (existing) {
            existing.daysRemaining = Math.max(existing.daysRemaining, daysRemaining);
        } else {
            agent.statusEffects.push({
                id,
                name: id === 'STARVING' ? 'Starving' : (id === 'FREEZING' ? 'Freezing' : id),
                type: 'SITUATIONAL_PRESSURE',
                daysRemaining,
                desc: id === 'STARVING' ? 'Metabolic caloric collapse' : 'Sub-zero White Void frost exposure'
            });
        }
        return true;
    },

    evaluateActorDeath(agentId, lethalCause = 'STARVING') {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.alive) return { died: false };
        const day = rootScope.EngineParams?.worldDay || 1;
        const causeUpper = String(lethalCause || '').toUpperCase();
        const effects = agent.statusEffects || [];

        const hasStarving = effects.some(e => e.id === 'STARVING' || e.id === 'FAMINE_SCARRED') || (agent.vitals?.hunger !== undefined && agent.vitals.hunger <= 0);
        const hasFreezing = effects.some(e => e.id === 'FREEZING' || e.id === 'HYPOTHERMIA') || (!agent.birthright?.coldImmune && agent.vitals?.temp !== undefined && agent.vitals.temp <= 0);
        const killedByStarveOrFreeze = causeUpper.includes('STARV') || causeUpper.includes('FREEZ') || causeUpper.includes('FROST') || causeUpper.includes('COLD') || causeUpper.includes('FAMINE');

        agent.alive = false;
        agent.vitals.hp = 0;

        const dualPressureCollision = hasStarving && hasFreezing && killedByStarveOrFreeze;

        if (dualPressureCollision) {
            const candidate = {
                formerAgentId: agent.id,
                formerName: agent.name,
                houseId: agent.assignedHouseId || CampaignManager?.state?.house?.houseId || 'House Terminus',
                deathDay: day,
                lethalTrigger: causeUpper,
                scheduledRebirthShiftDay: Math.ceil((day + 1) / 14) * 14,
                significance: agent.significance || 20
            };
            this.feralWendigoQueue.push(candidate);
            CrucibleNarrativeEngine.processActorDeath({
                id: agent.id,
                name: agent.name,
                cause: `Perished from ${causeUpper} while simultaneously Starving and Freezing (Marked for Feral Wendigo Rebirth on next Shift)`
            });
            rootScope.EventBus?.emit('FERAL_WENDIGO_CANDIDATE_QUEUED', candidate);
            return {
                died: true,
                queuedForFeralWendigo: true,
                candidate,
                message: `❄️🩸 [SITUATIONAL PRESSURE COLLISION] ${agent.name} succumbed to ${causeUpper} while both STARVING and FREEZING. Their corpse has crystallized in the frost — they will rise as a Feral Wendigo on the next Shift!`
            };
        }

        CrucibleNarrativeEngine.processActorDeath({
            id: agent.id,
            name: agent.name,
            cause: lethalCause
        });
        return {
            died: true,
            queuedForFeralWendigo: false,
            message: `💀 ${agent.name} perished from ${lethalCause}.`
        };
    },

    processShiftWendigoRebirths(day = 14) {
        if (!this.feralWendigoQueue || this.feralWendigoQueue.length === 0) return [];
        const newlyRisen = [];
        const batch = [...this.feralWendigoQueue];
        this.feralWendigoQueue = [];

        batch.forEach(can => {
            const feral = {
                id: `feral_wendigo_${can.formerAgentId}_${day}`,
                name: `Feral Wendigo (${can.formerName})`,
                formerAgentId: can.formerAgentId,
                formerName: can.formerName,
                originHouse: can.houseId,
                risenDay: day,
                type: 'FERAL_WENDIGO',
                isFeral: true,
                isSentient: false,
                hungerLevel: 100,
                threatPower: Math.round(35 + (can.significance || 20) * 0.8)
            };
            this.spawnedFeralWendigos.push(feral);
            newlyRisen.push(feral);

            LogDispatchManager.dispatches.unshift({
                id: `wendigo_rise_${day}_${can.formerAgentId}`,
                day,
                type: 'VOID HORROR ALERT',
                sender: 'Perimeter Watchtower',
                title: `Feral Wendigo Risen from the Shift: ${can.formerName}`,
                body: `During the 14-day Shift reconfiguration, the frozen, starved corpse of ${can.formerName} collapsed spatially and rose from the White Void as a shrieking Feral Wendigo (Threat: ${feral.threatPower}) stalking the ${can.houseId} perimeter!`,
                read: false
            });
            rootScope.EventBus?.emit('FERAL_WENDIGO_RISEN', feral);
        });

        if (newlyRisen.length > 0 && rootScope.CrisisEngine) {
            rootScope.CrisisEngine.volatilityIndex = Math.min(100, (rootScope.CrisisEngine.volatilityIndex || 0) + newlyRisen.length * 15);
        }
        return newlyRisen;
    },

    cultivateTerminusRunic(agentId, houseState) {
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
        rootScope.EventBus?.emit('UI_LOG', `ðŸ”¥ [TERMINUS] BREAKTHROUGH SURGE: ${agent.name} has ignited the Foundation Fire and joined the 300 Guardians! (+500y Lifespan)`);
        return { success: true, message: `BREAKTHROUGH ASCENSION! ${agent.name} is now an immortal Guardian of the 300 (+500y lifespan, Foundation Fire ignited).` };
    },

    recruitCounter: 0,

    recruitFactionUnit(archetype = 'WARDEN') {
        const arch = String(archetype || 'WARDEN').toUpperCase();
        const mode = (rootScope.CampaignManager?.campaignMode || 'HOUSE').toUpperCase();
        const isSov = mode === 'SOVEREIGN';
        const fe = rootScope.FacilityEngine;
        const sov = rootScope.CampaignManager?.state?.sovereign;
        const barracksLv = fe?.facilities?.guard_barracks?.unlocked ? (fe.facilities.guard_barracks.level || 1) : 0;
        const maxRoster = isSov ? 8 : (6 + barracksLv * 3);
        const livingCount = Array.from(this.agents.values()).filter(a => a.alive).length;

        if (livingCount >= maxRoster) {
            return { success: false, message: `Garrison capacity reached (${livingCount}/${maxRoster}). Construct or upgrade [Garrison Barracks] to expand capacity!` };
        }

        const unitCost = isSov ? 120 : Math.max(4, 7 - barracksLv);
        if (isSov) {
            if ((sov?.significanceHarvested || 0) < unitCost) {
                return { success: false, message: `Insufficient Historical Weight (${sov?.significanceHarvested || 0}/${unitCost}W) to awaken a Frost-Thrall.` };
            }
            sov.significanceHarvested -= unitCost;
        } else {
            if ((fe?.settlementResources || 0) < unitCost) {
                return { success: false, message: `Insufficient Settlement Resources (${fe?.settlementResources || 0}/${unitCost}u) to recruit a ${arch} unit.` };
            }
            fe.settlementResources -= unitCost;
            if (fe.villageGuardsCurrent < fe.villageGuardsMaxThreshold) {
                fe.villageGuardsCurrent = Math.min(fe.villageGuardsMaxThreshold, fe.villageGuardsCurrent + 2);
            }
        }

        this.recruitCounter = (this.recruitCounter || 0) + 1;
        const id = `agt_rec_${this.recruitCounter}_${Date.now().toString().slice(-3)}`;
        const namePools = {
            WARDEN: ['Shield-Warden Torin', 'Brazier-Guard Halvar', 'Chain-Keeper Brenna', 'Iron-Vow Derrick', 'Gate-Warden Sera'],
            SCOUT: ['Mist-Runner Vance', 'Outrider Sylvi', 'Pathfinder Corin', 'Bracken-Stalker Joren', 'Silt-Tracker Lyra'],
            SCRIBE: ['Vellum-Scribe Aldous', 'Assessor Mirabel', 'Cipher-Clerk Oren', 'Rune-Auditor Talia'],
            ENFORCER: ['Sluice-Bruiser Gath', 'Lock-Cutter Riven', 'Toll-Hound Mara', 'Smuggler Dax'],
            PREDATOR: ['Frost-Stalker Kraal', 'Bone-Hound Vex', 'Marrow-Render Shy', 'Pale-Thrall Vor']
        };
        const pool = namePools[arch] || namePools.WARDEN;
        const baseName = pool[(this.recruitCounter + livingCount) % pool.length];
        const newAgent = this.createAgent(id, `${baseName} #${this.recruitCounter}`, isSov ? 'PREDATOR' : arch);
        newAgent.assignedHouseId = rootScope.CampaignManager?.state?.house?.houseId || mode;

        if (barracksLv > 0) {
            newAgent.skills.meleeAtt = Number((newAgent.skills.meleeAtt + barracksLv * 0.5).toFixed(1));
            newAgent.skills.meleeDef = Number((newAgent.skills.meleeDef + barracksLv * 0.5).toFixed(1));
            newAgent.vitals.maxHp += barracksLv * 8;
            newAgent.vitals.hp = newAgent.vitals.maxHp;
        }

        const costLabel = isSov ? `-${unitCost}W Historical Weight` : `-${unitCost}u Resources (+2 Village Guards)`;
        const msg = `➕ [UNIT RECRUITED] Mustered ${newAgent.name} (${newAgent.career?.rank} ${newAgent.career?.id.toUpperCase()} | Birthright: ${newAgent.birthright?.title}) into active roster (${costLabel}).`;
        rootScope.LogDispatchManager?.dispatches?.unshift({
            id: `rec_${Date.now()}`,
            day: rootScope.EngineParams?.worldDay || 1,
            type: 'GARRISON MUSTER ROLL',
            sender: 'Garrison Muster Master',
            title: `Recruited ${newAgent.name} (${arch})`,
            body: msg,
            read: false
        });
        return { success: true, agent: newAgent, message: msg };
    },

    buyArmoryGear(itemId) {
        const fe = rootScope.FacilityEngine;
        if (!fe?.facilities?.armory_market?.unlocked) {
            return { success: false, message: "Armory Exchange locked! Construct the [Armory & Weaponry Exchange Market] in Base Upgrades & Facilities first." };
        }
        const item = SQUAD_ARMORY_CATALOG[itemId];
        if (!item) return { success: false, message: `Unknown gear item: ${itemId}` };
        const marketLv = fe.facilities.armory_market.level || 1;
        const discount = Math.max(0, marketLv - 1);
        const price = Math.max(4, (item.buyPrice || 10) - discount);

        if (fe.settlementResources < price) {
            return { success: false, message: `Insufficient Settlement Resources (${fe.settlementResources}/${price}u) to purchase [${item.name}].` };
        }
        fe.settlementResources -= price;
        this.squadArmoryStock.push(item.id);
        const msg = `🛒 [ARMORY MARKET PURCHASE] Bought [${item.name}] (${item.desc}) for -${price}u Settlement Resources. Added to Squad Armory stock!`;
        return { success: true, item, price, message: msg };
    },

    sellArmoryGear(itemId = null) {
        const fe = rootScope.FacilityEngine;
        if (!fe?.facilities?.armory_market?.unlocked) {
            return { success: false, message: "Armory Exchange locked! Construct the [Armory & Weaponry Exchange Market] first." };
        }
        const targetId = itemId || this.squadArmoryStock[0];
        if (!targetId) return { success: false, message: "No unequipped gear in Squad Armory stock to sell." };
        const idx = this.squadArmoryStock.indexOf(targetId);
        if (idx < 0) return { success: false, message: `Item [${targetId}] is not in unequipped armory stock.` };

        this.squadArmoryStock.splice(idx, 1);
        const item = SQUAD_ARMORY_CATALOG[targetId] || { name: targetId, sellPrice: 6 };
        const marketLv = fe.facilities.armory_market.level || 1;
        const payout = (item.sellPrice || 6) + Math.max(0, marketLv - 1);
        fe.settlementResources += payout;
        const msg = `💰 [ARMORY MARKET SALE] Sold [${item.name}] at the Weaponry Exchange for +${payout}u Settlement Resources.`;
        return { success: true, item, payout, message: msg };
    },

    assignGearToAgent(agentId, itemId) {
        const agent = this.agents.get(agentId);
        const item = SQUAD_ARMORY_CATALOG[itemId];
        if (!agent || !agent.alive) return { success: false, message: "Agent invalid or deceased." };
        if (!item) return { success: false, message: `Unknown gear item: ${itemId}` };

        agent.equipment = agent.equipment || { weapon: null, armor: null, trinket: null };
        const prevItem = agent.equipment[item.slot];
        if (prevItem) {
            this._removeGearBonuses(agent, prevItem);
            this.squadArmoryStock.push(prevItem.id);
        }

        const stockIdx = this.squadArmoryStock.indexOf(itemId);
        if (stockIdx >= 0) this.squadArmoryStock.splice(stockIdx, 1);

        agent.equipment[item.slot] = { ...item };
        this._applyGearBonuses(agent, item);
        return { success: true, agent, item, message: `Equipped [${item.name}] (${item.desc}) on ${agent.name}.` };
    },

    giveGearToSquadAutoSort(itemId = null) {
        const chosenId = itemId || this.squadArmoryStock[0] || 'ironwood_spear';
        const item = SQUAD_ARMORY_CATALOG[chosenId];
        if (!item) return { success: false, message: "No gear available to issue." };

        const living = Array.from(this.agents.values()).filter(a => a.alive);
        if (living.length === 0) return { success: false, message: "No living squad members." };

        living.sort((a, b) => {
            const aEmpty = !a.equipment?.[item.slot] ? 50 : 0;
            const bEmpty = !b.equipment?.[item.slot] ? 50 : 0;
            const aRole = a.career?.id === item.preferredRole ? 25 : 0;
            const bRole = b.career?.id === item.preferredRole ? 25 : 0;
            return (bEmpty + bRole) - (aEmpty + aRole);
        });

        const recipient = living[0];
        const res = this.assignGearToAgent(recipient.id, chosenId);
        return {
            ...res,
            message: `ðŸŽ’ [SQUAD AUTO-SORT] Squad sorted [${item.name}] to ${recipient.name} (${recipient.career?.rank} ${recipient.career?.id}) â€” ${item.desc}.`
        };
    },

    _applyGearBonuses(agent, item) {
        const b = item.bonuses || {};
        Object.entries(b).forEach(([k, val]) => {
            if (agent.skills[k] !== undefined) agent.skills[k] += val;
            else if (agent.vitals[k] !== undefined) {
                agent.vitals[k] += val;
                if (k === 'maxHp') agent.vitals.hp += val;
            }
        });
    },

    _removeGearBonuses(agent, item) {
        const b = item.bonuses || {};
        Object.entries(b).forEach(([k, val]) => {
            if (agent.skills[k] !== undefined) agent.skills[k] = Math.max(1, agent.skills[k] - val);
            else if (agent.vitals[k] !== undefined) {
                agent.vitals[k] = Math.max(10, agent.vitals[k] - val);
            }
        });
    },

    formatAgentStatSheet(agentId) {
        const a = this.agents.get(agentId);
        if (!a) return `No squad member found for ID: ${agentId}`;
        const eq = a.equipment || {};
        const sk = a.skills || {};
        const vt = a.vitals || {};
        const rf = a.reflexes || {};
        return [
            `================================================================================`,
            `ðŸ›¡ï¸ SQUAD MEMBER CHARACTER STAT SHEET: ${a.name.toUpperCase()} (${a.id})`,
            `================================================================================`,
            `Role / Rank:     ${a.career?.rank || 'Novice'} ${(a.career?.id || 'scout').toUpperCase()} | House/Faction: ${a.assignedHouseId}`,
            `Birthright:      [${a.birthright?.title || 'None'}] â€” ${a.birthright?.desc || ''}`,
            `Shift Birthday:  Day ${a.firstShiftSurvivedDay} AF (Shifts Endured: ${a.shiftsSurvived || 0}) | Significance: ${a.significance}`,
            `Cultivation:     Stage ${a.cultivation?.stage || 0}/3 ${a.cultivation?.isCultivatedGuardian ? 'â˜… IMMORTAL 300 GUARDIAN (+500y)' : '(Mortal)'}`,
            `Current Stance:  [${a.operatingStance?.mode || 'IDLE'}${a.operatingStance?.discipline ? ': ' + a.operatingStance.discipline : ''}]`,
            ``,
            `â”€â”€â”€ â¤ï¸ VITALS & REFLEXES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`,
            `  â€¢ HP: ${vt.hp}/${vt.maxHp} | Stamina: ${vt.stamina}/100 | Poise: ${vt.poise.toFixed ? vt.poise.toFixed(0) : vt.poise}/100 | Hunger: ${vt.hunger}%`,
            `  â€¢ Shock: ${rf.shock}% | Adrenaline: ${rf.adrenaline}% | Exhaustion: ${rf.exhaustion}%`,
            ``,
            `â”€â”€â”€ âš”ï¸ EQUIPPED GEAR & LOADOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`,
            `  â€¢ Weapon:  ${eq.weapon ? `${eq.weapon.name} (${eq.weapon.desc})` : '[Empty â€” Standard Issue]'}`,
            `  â€¢ Armor:   ${eq.armor ? `${eq.armor.name} (${eq.armor.desc})` : '[Empty â€” Cloth Tunic]'}`,
            `  â€¢ Trinket: ${eq.trinket ? `${eq.trinket.name} (${eq.trinket.desc})` : '[Empty â€” None]'}`,
            ``,
            `â”€â”€â”€ ðŸ“Š COMBAT & SURVIVAL ATTRIBUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`,
            `================================================================================`,
            `[GARRISON STAT SHEET] ${a.name.toUpperCase()} (${a.id})${a.isDoubleAgent ? ' [TURNED DOUBLE AGENT]' : ''}`,
            `================================================================================`,
            `Role / Rank:     ${a.career?.rank || 'Novice'} ${(a.career?.id || 'scout').toUpperCase()} | House/Faction: ${a.assignedHouseId}`,
            `Birthright:      [${a.birthright?.title || 'None'}] - ${a.birthright?.desc || ''}`,
            `Shift Birthday:  Day ${a.firstShiftSurvivedDay} AF (Shifts Endured: ${a.shiftsSurvived || 0}) | Significance: ${a.significance}`,
            `Cultivation:     Stage ${a.cultivation?.stage || 0}/3 ${a.cultivation?.isCultivatedGuardian ? '* IMMORTAL 300 GUARDIAN (+500y)' : '(Mortal)'}`,
            `Current Stance:  [${a.operatingStance?.mode || 'IDLE'}${a.operatingStance?.discipline ? ': ' + a.operatingStance.discipline : ''}]`,
            `Crucible Scars:  ${(a.scars || []).map(s => s.scar || s).join('; ') || 'None Recorded'}`,
            ``,
            `--- VITALS & REFLEXES ----------------------------------------------------------`,
            `  * HP: ${vt.hp}/${vt.maxHp} | Stamina: ${vt.stamina}/100 | Poise: ${vt.poise.toFixed ? vt.poise.toFixed(0) : vt.poise}/100 | Hunger: ${vt.hunger}%`,
            `  * Shock: ${rf.shock}% | Adrenaline: ${rf.adrenaline}% | Exhaustion: ${rf.exhaustion}%`,
            ``,
            `--- EQUIPPED GEAR & LOADOUT ----------------------------------------------------`,
            `  * Weapon:  ${eq.weapon ? `${eq.weapon.name} (${eq.weapon.desc})` : '[Empty - Standard Issue]'}`,
            `  * Armor:   ${eq.armor ? `${eq.armor.name} (${eq.armor.desc})` : '[Empty - Cloth Tunic]'}`,
            `  * Trinket: ${eq.trinket ? `${eq.trinket.name} (${eq.trinket.desc})` : '[Empty - None]'}`,
            ``,
            `--- COMBAT & SURVIVAL ATTRIBUTES -----------------------------------------------`,
            `  * Strength:  ${Number(sk.strength).toFixed(1).padStart(4, ' ')}   | Melee Att: ${Number(sk.meleeAtt).toFixed(1).padStart(4, ' ')}   | Stealth:  ${Number(sk.stealth).toFixed(1).padStart(4, ' ')}`,
            `  * Toughness: ${Number(sk.toughness).toFixed(1).padStart(4, ' ')}   | Melee Def: ${Number(sk.meleeDef).toFixed(1).padStart(4, ' ')}   | Lore:     ${Number(sk.lore).toFixed(1).padStart(4, ' ')}`,
            `  * Athletics: ${Number(sk.athletics).toFixed(1).padStart(4, ' ')}   | Dodge:     ${Number(sk.dodge).toFixed(1).padStart(4, ' ')}   | Survival: ${Number(sk.survival).toFixed(1).padStart(4, ' ')}`,
            `================================================================================`
        ].join('\n');
    }
};
rootScope.AgentRosterManager = AgentRosterManager;

// ============================================================================
// 2. LOG DISPATCH MANAGER
// ============================================================================
const LogDispatchManager = rootScope.LogDispatchManager || {
    dispatches: [],
    unreadCount: 0,

    init() {
        rootScope.EventBus?.on('ENTITY_DIED', (data) => this.recordDeathNotice(data));
    },

    generateDailyDispatches(worldDay, campaignMode = 'HOUSE', state = {}) {
        const newItems = [];
        const shiftCountdown = 14 - (worldDay % 14);
        const warBoard = rootScope.CampaignManager?.getWarBoard?.() || [];
        const hostileCandidates = warBoard.filter(w => w.status === 'WAR_PREP' || w.status === 'SKIRMISH' || w.status === 'COVERT');
        const hostileHouse = hostileCandidates[worldDay % Math.max(1, hostileCandidates.length)] || warBoard[worldDay % Math.max(1, warBoard.length)] || { name: 'House Cull', power: 62, status: 'WAR_PREP', monopoly: 'Cardiac Catalysts' };
        const aliveAgents = Array.from(AgentRosterManager.agents.values()).filter(a => a.alive);
        const scoutSender = aliveAgents[worldDay % Math.max(1, aliveAgents.length)]?.name || 'Sergeant Kaelen, 3rd Horizon Watch';
        const activeExps = rootScope.ExpeditionEngine?.activeExpeditions || [];
        const recentCollision = rootScope.ProceduralCollisionEngine?.collisionHistory?.[0];
        const fe = rootScope.FacilityEngine;
        const unlockedFacs = Object.values(fe?.facilities || {}).filter(f => f.unlocked);
        const activeFac = unlockedFacs[worldDay % Math.max(1, unlockedFacs.length)];

        if (shiftCountdown <= 3) {
            const milestoneSlip = 12 + (4 - shiftCountdown) * 9 + (worldDay % 7);
            newItems.push({
                id: `disp_${worldDay}_shift`,
                day: worldDay,
                type: 'URGENT SPATIAL TELEMETRY',
                sender: `Surveyor-Post ${(worldDay % 9) + 1} (${scoutSender})`,
                title: `Spatial Drift Warning — Shift in ${shiftCountdown} Days`,
                body: `Plumb-lines tilted ${(5 - shiftCountdown) * 1.5}° toward the Great Attractor. Milestone #${(worldDay % 14) + 1} slipped ${milestoneSlip} paces into the moss; chain tension at ${state.house?.chainsIntegrity ?? 100}%.`
            });
        }

        if (activeExps.length > 0) {
            const exp = activeExps[0];
            newItems.push({
                id: `disp_${worldDay}_field_${exp.id}`,
                day: worldDay,
                type: 'LIVE FIELD RUNNER',
                sender: `${exp.leadAgentName} (${exp.type})`,
                title: `En Route: ${exp.targetName} — Hour ${exp.hoursElapsed}/${exp.totalHours}h [${exp.status}]`,
                body: `Column marching (${exp.cargoIntegrity ?? 100}% Cargo, Def ${exp.squadDefense || 12} vs Hazard ${exp.hazardRating || 12}). Latest log: ${exp.logs[exp.logs.length - 1] || 'On trail.'}`
            });
        }

        if (campaignMode === 'HOUSE') {
            const h = state.house || {};
            if (h.barrierFuelUnits <= 12) {
                newItems.push({
                    id: `disp_${worldDay}_fuel`,
                    day: worldDay,
                    type: 'INSPECTION REPORT',
                    sender: `Basalt Brazier Overseer (${h.settlementName || "World's End Gate"})`,
                    title: `Barrier Pressure Fluctuation (${h.barrierFuelUnits} Units Left | Chains: ${h.chainsIntegrity}%)`,
                    body: `The violet rim above ${h.settlementName || 'the outer moat'} dropped ${18 - h.barrierFuelUnits} cubits overnight. Replenish ${h.monopoly || 'barrier fuel'} before the next Shift.`
                });
            } else {
                const trainingAgt = aliveAgents.find(a => a.operatingStance?.mode === 'TRAINING') || aliveAgents[0];
                const drillNote = trainingAgt?.operatingStance?.discipline
                    ? `${trainingAgt.name} drilled in ${trainingAgt.operatingStance.discipline} (Att ${Number(trainingAgt.skills.meleeAtt).toFixed(1)} / Surv ${Number(trainingAgt.skills.survival).toFixed(1)}).`
                    : `${scoutSender} inspected the 50-ton anchor capstans (${h.chainsIntegrity}% integrity).`;
                const facNote = activeFac ? `[${activeFac.name} Lv.${activeFac.level}] stocked ${fe?.settlementResources || 35}u resources.` : '';
                newItems.push({
                    id: `disp_${worldDay}_patrol`,
                    day: worldDay,
                    type: 'PATROL LOG',
                    sender: `${scoutSender} (${h.houseId || 'Garrison Watch'})`,
                    title: `${h.settlementName || 'Parish'} Watch — ${hostileHouse.name} [${hostileHouse.status} | Power ${hostileHouse.power}]`,
                    body: `${drillNote} Outriders tracked ${hostileHouse.name} (${hostileHouse.monopoly || 'monopoly'}) caravans near the boundary dike. ${facNote}`
                });
            }
        } else if (campaignMode === 'ORDER') {
            const o = state.order || {};
            newItems.push({
                id: `disp_${worldDay}_ocp`,
                day: worldDay,
                type: 'OCP FORM 12-B',
                sender: `${scoutSender} (Obsidian Citadel Protocol)`,
                title: `Containment Audit: Entropy at ${o.blindSpotEntropy ?? 12}% (${o.containedAnomalies ?? 4} Contained)`,
                body: `Tax-Exempt Shadow Directorate log: Cross-checked ${12000 + Math.floor(worldDay / 365)} AF parish rolls against ${hostileHouse.name} border traffic.`
            });
        } else if (campaignMode === 'DUNE') {
            const d = state.dune || {};
            newItems.push({
                id: `disp_${worldDay}_dune`,
                day: worldDay,
                type: 'PILOT LOG',
                sender: scoutSender,
                title: `Sounding Report: ${d.riverStreamline || 'Silt Veil'} (Drift: ${Number(d.driftDistanceKm || 0).toFixed(1)}km)`,
                body: `Subterranean current pulls inward toward the forest sinkhole. Cleaned water reserves stand at ${d.cleanedWaterStock ?? 80}u; mooring tether integrity holding at ${d.mooringTetherIntegrity ?? 100}%.`
            });
        } else if (campaignMode === 'SYNDICATE') {
            const syn = state.syndicate || {};
            newItems.push({
                id: `disp_${worldDay}_syn`,
                day: worldDay,
                type: 'SMUGGLER MANIFEST',
                sender: `${scoutSender} (${syn.baseSettlement || 'Gallows-Gate Sluices'})`,
                title: `Sluice Manifest: ${syn.contrabandResin ?? 45}u Resin | ${syn.gallowsTollCollected ?? 80}d Toll`,
                body: `Night skiffs slipped past ${hostileHouse.name} tariff cutters (${hostileHouse.status}) at lock #${(worldDay % 5) + 1}. Contraband resin stockpiles stand at ${syn.contrabandResin ?? 45} casks.`
            });
        } else if (campaignMode === 'PATRON') {
            const pat = state.patron || {};
            newItems.push({
                id: `disp_${worldDay}_patron`,
                day: worldDay,
                type: 'BROKER LEDGER',
                sender: scoutSender,
                title: `Arbitrage & Candidate Telemetry (Sig: ${pat.candidateSignificance ?? 25} | Truths: ${pat.verifiedTruths ?? 0})`,
                body: `Brokered ${hostileHouse.monopoly || 'monopoly goods'} across ${hostileHouse.name} toll-gates (+${fe?.settlementResources ?? 35}u Treasury). Candidate significance climbed to ${pat.candidateSignificance ?? 25}.`
            });
        } else {
            const sov = state.sovereign || {};
            newItems.push({
                id: `disp_${worldDay}_omen`,
                day: worldDay,
                type: 'OMEN RECORD',
                sender: 'Watchtower III (The Frost-Line)',
                title: `Tremor in the Deep Bedrock (Significance: ${sov.significanceHarvested ?? 0} | Heralds: ${sov.heraldsMutated ?? 0}/5)`,
                body: `The fifty-ton anchor links rang twice at midnight. Frost-Heralds stalk the ${hostileHouse.name} frontier (Power ${hostileHouse.power}) while ${sov.title || 'The Pale Sovereign'} broods across ${sov.yearsEndured ?? 0} endured years.`
            });
        }

        if (recentCollision && recentCollision.day === worldDay) {
            newItems.push({
                id: `disp_${worldDay}_col_${Date.now()}`,
                day: worldDay,
                type: 'SYSTEMIC PRESSURE COLLISION',
                sender: 'Archive Telemetry Loom',
                title: `Emergent Event: ${recentCollision.eventName}`,
                body: recentCollision.narrativeSummary || recentCollision.narrativeManifest?.proceduralDescription || `Pressure collision recorded across ${hostileHouse.name} sector.`
            });
        }

        newItems.forEach(item => {
            item.read = false;
            this.dispatches.unshift(item);
            this.unreadCount++;
            rootScope.EventBus?.emit('NEW_DISPATCH', item);
        });

        if (this.dispatches.length > 100) this.dispatches = this.dispatches.slice(0, 100);
    },

    recordDeathNotice(deathData) {
        const victim = deathData?.victim || deathData?.id || 'Unknown Traveler';
        const cause = deathData?.cause || 'perished in the fog';
        const day = rootScope.EngineParams?.worldDay || 0;
        const notice = {
            id: `coroner_${day}_${Date.now()}`,
            day,
            type: 'CORONER MEMORANDUM',
            sender: 'Parish Gravedigger & Bailiff',
            title: `Mortality Record: ${victim}`,
            body: `Remains recovered near boundary ditch. Cause noted: ${cause}. Possessions: 1 notched ash staff, 2 copper counters, woolen wraps, unaddressed letter. Interned beneath marked slate.`,
            read: false
        };
        this.dispatches.unshift(notice);
        this.unreadCount++;
    },

    getUnread() {
        return this.dispatches.filter(d => !d.read);
    },

    markAllRead() {
        this.dispatches.forEach(d => d.read = true);
        this.unreadCount = 0;
    }
};
LogDispatchManager.init();
rootScope.LogDispatchManager = LogDispatchManager;


// ============================================================================
// 3. CRUCIBLE NARRATIVE ENGINE
// ============================================================================
const CrucibleNarrativeEngine = rootScope.CrucibleNarrativeEngine || {
    crucibles: new Map(),
    biographies: new Map(),
    livingDossiers: new Map(),

    init() {
        rootScope.EventBus?.on('ENTITY_DIED', (data) => this.processActorDeath(data));
        rootScope.EventBus?.on('ENTITY_DEATH', (data) => this.processActorDeath(data));
        rootScope.EventBus?.on('CRUCIBLE_TRIGGERED', (data) => this.recordCrucible(data.actorId, data));
    },

    registerLivingActor(id, name, role = 'Warden', house = null, settlement = null) {
        const day = rootScope.EngineParams?.worldDay || 1;
        const activeHouse = house || rootScope.CampaignManager?.state?.house?.houseId || 'House Terminus';
        const activeSeat = settlement || rootScope.CampaignManager?.state?.house?.settlementName || "World's End Gate";
        const nameParts = String(name || 'Warden Vane').trim().split(/\s+/);
        const familySurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Vane';
        const givenName = nameParts[0] || 'Corin';

        const rosterPeers = Array.from(rootScope.AgentRosterManager?.agents?.values?.() || []).filter(a => a.id !== id);
        const swornBrother = rosterPeers[0] ? `${rosterPeers[0].name} (${rosterPeers[0].career?.rank || 'Veteran'} ${(rosterPeers[0].career?.id || 'Warden').toUpperCase()})` : `Sergeant Kaelen (3rd Horizon Watch)`;
        const wardApprentice = rosterPeers[1] ? `${rosterPeers[1].name} (Sworn Ward & Successor)` : `Apprentice Jon of ${activeSeat}`;

        const living = {
            id,
            name,
            familySurname,
            birthDay: Math.max(1, day - Math.floor(24 + (id.charCodeAt(0) % 22)) * 365),
            role,
            house: activeHouse,
            settlement: activeSeat,
            rank: 'Journeyman',
            contractsFulfilled: Math.floor(Math.random() * 8) + 3,
            truthsVerified: 1,
            scars: [],
            lineage: {
                bloodlineHouse: `The ${familySurname} Kin-Line of ${activeHouse} (${activeSeat} Founding Parish Roll)`,
                parents: `Sire Aldous ${familySurname} (Former ${activeSeat} Chain-Master, perished in Shift #842) & Matron Elara ${familySurname} (Keeper of the ${activeHouse} Brazier Tallies)`,
                spouse: `Lydia ${familySurname} (nee Thorne — Master Scribe of the ${activeSeat} Quarantine Roll, Wed 9 Shifts Prior)`,
                siblings: `Brother Garrett ${familySurname} (Outrider at ${activeSeat} East Sluice) & Sister Morwen ${familySurname} (Vellum-Scraper of ${activeHouse})`,
                children: [`Kael ${familySurname} (Eldest Son, Age 17 — Inherited Father's Notched Ironwood Spear)`, `Mira ${familySurname} (Daughter, Age 14 — Novice Brazier-Tender at ${activeSeat})`],
                swornCompanion: swornBrother,
                designatedHeir: `Kael ${familySurname} (Bloodline Heir) & ${wardApprentice} (Military Successor)`
            }
        };
        this.livingDossiers.set(id, living);
        return living;
    },

    recordCrucible(actorId, data = {}) {
        if (!this.crucibles.has(actorId)) this.crucibles.set(actorId, []);
        const entry = {
            id: `crucible_${actorId}_${Date.now()}`,
            day: data.day || rootScope.EngineParams?.worldDay || 0,
            type: data.type || 'CATASTROPHIC_FAILURE',
            title: data.title || 'The Snapped Ash-Bow of the Silt-Veil',
            intensity: data.intensity || 85,
            location: data.location || "World's End Gate Perimeter",
            catalyst: data.catalyst || 'Bowstring snapped in the freezing fog; hesitated for three heartbeats.',
            fallout: data.fallout || 'Supply cart was lost to the mist; apprentice was dragged beneath the crust.',
            scar: data.scar || 'Refused to carry hemp cord for the rest of their natural life.',
            cast: data.cast || { witnesses: ['Bailiff Mallow'], casualties: ['Apprentice Jon'] }
        };
        this.crucibles.get(actorId).push(entry);

        // Active Systemic Scar Modifier (RimWorld / Dwarf Fortress Parity: Scars actively alter agent stats)
        const agt = rootScope.AgentRosterManager?.agents?.get?.(actorId);
        if (agt && agt.alive) {
            agt.scars ??= [];
            agt.scars.push({ type: entry.type, scar: entry.scar, day: entry.day });
            if (entry.type === 'TACTICAL_RETREAT') {
                agt.skills.survival = Number((agt.skills.survival + 0.4).toFixed(2));
                agt.skills.stealth = Number((agt.skills.stealth + 0.25).toFixed(2));
            } else if (entry.type === 'CRISIS_CATASTROPHE') {
                agt.skills.toughness = Number((agt.skills.toughness + 0.4).toFixed(2));
                agt.vitals.poise = Math.max(15, (agt.vitals.poise || 60) - 5);
            }
        }
        return entry;
    },

    processActorDeath(deathData = {}) {
        const id = deathData?.id || deathData?.victim?.id || 'actor_unknown';
        const agt = rootScope.AgentRosterManager?.agents?.get?.(id);
        const name = deathData?.victim?.name || deathData?.name || agt?.name || id;
        const cause = deathData?.cause || 'natural causes during the 14-day Shift';
        const day = rootScope.EngineParams?.worldDay || 1;

        const roleTitle = agt ? `${agt.career?.rank || 'Veteran'} ${(agt.career?.id || 'Warden').toUpperCase()}` : 'Warden';
        const houseId = agt?.assignedHouseId || rootScope.CampaignManager?.state?.house?.houseId || 'House Terminus';
        const seatName = rootScope.CampaignManager?.state?.house?.settlementName || "World's End Gate";

        const living = this.livingDossiers.get(id) || this.registerLivingActor(id, name, roleTitle, houseId, seatName);
        const ageYears = Math.max(19, Math.floor((day - living.birthDay) / 365));

        if (!this.crucibles.has(id) || this.crucibles.get(id).length === 0) {
            this.recordCrucible(id, { day: Math.max(1, day - 14) });
        }
        const actorCrucibles = this.crucibles.get(id) || [];
        const definingMoment = actorCrucibles[0];
        const lin = living.lineage || {};

        const dossier = {
            id,
            name,
            house: living.house,
            settlement: living.settlement,
            role: living.role,
            birthright: agt?.birthright?.title || 'Storm-Born',
            firstShiftSurvivedDay: agt?.firstShiftSurvivedDay || 14,
            shiftsSurvived: agt?.shiftsSurvived || Math.max(1, Math.floor(day / 14)),
            birthDay: living.birthDay,
            deathDay: day,
            ageYears,
            cause,
            conditions: ['Shift Vigor', 'Frost-Scarred'],
            lineageTree: lin,
            survivors: [
                `Parents: ${lin.parents || 'Aldous & Elara of the First Chain'}`,
                `Spouse / Consort: ${lin.spouse || 'Unwed (Sworn to the Watch)'}`,
                `Siblings: ${lin.siblings || 'None surviving'}`,
                `Issue (Children): ${(lin.children || []).join(' | ') || 'No direct issue'}`,
                `Sworn Shield-Companion: ${lin.swornCompanion || 'Garrison Watch'}`
            ],
            successor: lin.designatedHeir || 'Apprentice Jon',
            contractsFulfilled: living.contractsFulfilled,
            definingMoment,
            epitaph: `"Here lies ${name} of the ${living.familySurname || 'Founding'} Bloodline, who held the ${living.settlement} line through ${Math.max(1, Math.floor(day / 14))} Shifts before ${cause}."`
        };

        this.biographies.set(id, dossier);
        return dossier;
    },
    getBiography(query) {
        if (!query) return null;
        if (this.biographies.has(query)) return this.biographies.get(query);
        const q = String(query).toLowerCase();
        for (const bio of this.biographies.values()) {
            if (bio.id.toLowerCase() === q || bio.name.toLowerCase().includes(q)) return bio;
        }
        return null;
    },

    getAllBiographies() {
        return Array.from(this.biographies.values());
    },

    formatDossier(query) {
        const bio = this.getBiography(query);
        if (!bio) return `[ARCHIVE ERROR] No post-mortem dossier found for query: "${query}".`;
        const cru = bio.definingMoment;
        const lin = bio.lineageTree || {};
        return [
            `================================================================================`,
            `📜 DEATH CERTIFICATE & POST-MORTEM DOSSIER: ${bio.name.toUpperCase()} (${bio.id})`,
            `================================================================================`,
            `Affiliation:     ${bio.house} | Seat: ${bio.settlement}`,
            `Career Title:    ${bio.role}`,
            `Circumstance:    Birthright: [${bio.birthright}]`,
            `Shift Birthday:  Day ${bio.firstShiftSurvivedDay} AF (${bio.shiftsSurvived} Fortnightly Shifts Survived)`,
            `Lifespan:        Born Day ${bio.birthDay} AF -> Perished Day ${bio.deathDay} AF (Age ${bio.ageYears})`,
            `Cause of Death:  ${bio.cause}`,
            `Active Traits:   ${bio.conditions.join(', ')}`,
            ``,
            `─── 🌳 FAMILY LINEAGE & BLOODLINE CONNECTIONS ──────────────────────────────────`,
            `Ancestral Line:  ${lin.bloodlineHouse || `${bio.house} Founding Kin-Line`}`,
            `${bio.survivors.map(s => `  • ${s}`).join('\n')}`,
            `Designated Heir: ${bio.successor}`,
            ``,
            `─── 📖 DEFINING CRUCIBLE MOMENT ────────────────────────────────────────────────`,
            `  "${cru ? cru.title : 'None Recorded'}"`,
            `  Location: ${cru ? cru.location : 'Unknown'} (Day ${cru ? cru.day : 'N/A'})`,
            `  Catalyst: ${cru ? cru.catalyst : 'N/A'}`,
            `  Lifelong Scar: ${cru ? cru.scar : 'None'}`,
            ``,
            `─── 🪦 FOLK EPITAPH ────────────────────────────────────────────────────────────`,
            `  ${bio.epitaph}`,
            `================================================================================`
        ].join('\n');
    },

    expandStory(query) {
        const bio = this.getBiography(query);
        const cru = bio?.definingMoment || (query ? this.crucibles.get(query)?.[0] : null);
        const actorName = bio?.name || query || 'The Traveler';
        if (!cru) return `No recorded crucibles found for query: "${query}".`;
        return [
            `================================================================================`,
            `ðŸ“œ THE DEFINING CRUCIBLE OF ${actorName.toUpperCase()}`,
            `   Incident: ${cru.title} (Recorded Day ${cru.day} AF)`,
            `================================================================================`,
            ``,
            `[ACT I: THE STAKES]`,
            `The boundary woods did not move like mortal trees; they ground against the bedrock like millstones. ${actorName} stood at ${cru.location}, tasked with holding the perimeter before the 14-day Shift took the sun.`,
            ``,
            `[ACT II: THE CRISIS & FAILURE]`,
            `${cru.catalyst} In the freezing mist, there was no sound of a battleâ€”only the dull thud of iron sinking into damp peat. For three heartbeats, no order was given.`,
            ``,
            `[ACT III: THE SCAR & AFTERMATH]`,
            `${cru.fallout} ${actorName} walked back through the gate alone, hands stained with pine resin and ash. Though they lived for seasons afterward, ${cru.scar}`,
            `================================================================================`
        ].join('\n');
    }
};
CrucibleNarrativeEngine.init();
rootScope.CrucibleNarrativeEngine = CrucibleNarrativeEngine;

// ============================================================================
// 4. INTERROGATION DESK
// ============================================================================
const InterrogationDesk = rootScope.InterrogationDesk || {
    suspects: new Map(),

    init() {
        rootScope.EventBus?.on('SUSPICION_FLAGGED', (data) => this.flagSuspect(data));
    },

    flagSuspect(data = {}) {
        const id = data.id || 'agt_2';
        const agent = AgentRosterManager.agents.get(id);
        const name = data.name || agent?.name || id;
        const warBoard = rootScope.CampaignManager?.getWarBoard?.() || [];
        const rivalHouse = warBoard.find(w => w.status === 'WAR_PREP' || w.status === 'COVERT' || w.status === 'SKIRMISH')?.name || 'House Cull';
        const reasons = [
            `Found carrying unsealed ${rivalHouse} cipher manifests near the eastern ditch.`,
            `Discrepancy in recorded resin barrel tallies following ${agent?.assignedHouseId || 'perimeter'} patrol.`,
            `Body temperature measured three degrees below normal; avoids the basalt braziers.`,
            `Spotted exchanging salt-deniers with an unbadged courier from ${rivalHouse}.`
        ];
        const crimeTypes = ['RIVAL_SPY', 'EMBEZZLER', 'WENDIGO_TAINT'];
        const rolledCrime = data.crime || crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
        const baseStress = Math.round(45 + (agent?.reflexes?.shock || 0) * 0.4 + Math.random() * 35);

        const suspectCase = {
            id,
            name,
            rivalHouse,
            dayFlagged: rootScope.EngineParams?.worldDay || 1,
            crime: rolledCrime,
            suspicionReason: data.reason || reasons[Math.floor(Math.random() * reasons.length)],
            deceptionScore: Math.min(99, baseStress),
            interrogated: false,
            resolved: false,
            verdict: null
        };
        this.suspects.set(id, suspectCase);
        return suspectCase;
    },

    computeLiveStressIndex(targetId, suspectCase = null) {
        const agent = AgentRosterManager.agents.get(targetId);
        const day = rootScope.EngineParams?.worldDay || 1;
        const h = rootScope.CampaignManager?.state?.house || {};
        const vol = Math.round(rootScope.CrisisEngine?.volatilityIndex || 20);
        const shock = agent?.reflexes?.shock ?? 12;
        const hunger = agent?.vitals?.hunger ?? 10;
        const poiseDeficit = Math.max(0, 100 - (agent?.vitals?.poise ?? 65));
        const unrest = h.unrest ?? 10;
        const rounds = (suspectCase?.interrogationRounds || 1);
        const base = suspectCase?.baseSeedStress || (32 + ((String(targetId).charCodeAt(String(targetId).length - 1) * 5) % 18));
        const raw = Math.round(base + shock * 0.25 + poiseDeficit * 0.22 + hunger * 0.15 + unrest * 0.12 + vol * 0.10 + rounds * 6 + (day % 4));
        const clamped = Math.max(18, Math.min(98, raw));
        if (suspectCase?.lastStressScore === clamped) {
            return clamped >= 95 ? clamped - 3 : clamped + 4;
        }
        if (suspectCase) suspectCase.lastStressScore = clamped;
        return clamped;
    },

    interrogate(targetId = 'agt_2') {
        let suspect = this.suspects.get(targetId);
        const agent = AgentRosterManager.agents.get(targetId);
        if (!suspect || suspect.resolved) {
            suspect = this.flagSuspect({ id: targetId, name: agent?.name });
        }
        suspect.interrogated = true;
        suspect.interrogationRounds = (suspect.interrogationRounds || 0) + 1;
        if (agent && agent.reflexes) {
            agent.reflexes.shock = Math.min(100, (agent.reflexes.shock || 10) + 6);
            agent.vitals.poise = Math.max(15, (agent.vitals.poise || 65) - 4);
        }
        suspect.deceptionScore = this.computeLiveStressIndex(targetId, suspect);

        let txt = `\n================================================================================\n`;
        txt += `âš–ï¸ FORMAL INQUEST PROCEEDINGS: ${suspect.name.toUpperCase()} (${suspect.id})\n`;
        txt += `================================================================================\n`;
        txt += `Grounds for Suspicion: "${suspect.suspicionReason}"\n`;
        txt += `Observed Stress Index: ${suspect.deceptionScore}% | Classification: ${suspect.crime}\n\n`;

        if (suspect.crime === 'RIVAL_SPY') {
            txt += `[TRANSCRIPT] When asked why House Cull wax seals were found in his kit, the suspect\nhesitated for four heartbeats, claiming he found them in the bracken.\n`;
        } else if (suspect.crime === 'WENDIGO_TAINT') {
            txt += `[TRANSCRIPT] When ordered to hold his hands over the basalt brazier, the suspect\ndid not flinch. His breath smelled of damp cellar lichen; skin cold to the touch.\n`;
        } else {
            txt += `[TRANSCRIPT] When confronted with missing resin tallies, the suspect swore the\ncasks leaked. Two unmonitored salt-deniers were found sewn into his boots.\n`;
        }

        txt += `\nEXECUTIVE VERDICTS AVAILABLE:\n`;
        txt += `  â€¢ Exonerate   â†’ Dismiss charges (Restores loyalty).\n`;
        txt += `  â€¢ Demote      â†’ Strip rank to boundary ash-carter.\n`;
        txt += `  â€¢ Execute     â†’ Public hanging on palisade.\n`;
        txt += `  â€¢ Turn Agent  â†’ Coerce into double agent (+1 Blackmail Dossier).\n`;
        txt += `================================================================================\n`;

        return { success: true, text: txt, suspect: { ...suspect } };
    },

    renderVerdict(targetId, verdictType) {
        let suspect = this.suspects.get(targetId);
        let agent = AgentRosterManager.agents.get(targetId);
        if (!agent) {
            const firstLiving = Array.from(AgentRosterManager.agents.values()).find(a => a.alive);
            if (firstLiving && !targetId) {
                agent = firstLiving;
                targetId = firstLiving.id;
            }
        }
        if (!suspect) suspect = this.flagSuspect({ id: targetId, name: agent?.name || targetId });

        const v = (verdictType || '').toLowerCase();
        const day = rootScope.EngineParams?.worldDay || 1;
        const h = rootScope.CampaignManager?.state?.house || {};
        suspect.resolved = true;
        suspect.verdict = v.toUpperCase();

        let msg = "";
        let transcript = "";
        if (v === 'exonerate') {
            if (agent) {
                agent.vitals.poise = Math.min(100, (agent.vitals.poise || 60) + 20);
                if (agent.reflexes) agent.reflexes.shock = 0;
                agent.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
            }
            if (h.unrest !== undefined) h.unrest = Math.max(0, h.unrest - 4);
            msg = `[INQUEST: EXONERATED] ${suspect.name} cleared of all charges (+20 Poise, Shock cleared, -4% Unrest). Returned to duty.`;
            transcript = `[SIGNED INQUEST VERDICT: EXONERATION] ${suspect.name.toUpperCase()} (Day ${day} AF): Charges of [${suspect.crime}] dismissed. Restored to active duty (+20 Poise, 0% Shock).`;
        } else if (v === 'demote') {
            if (agent) {
                agent.career = agent.career || { id: 'warden', rank: 'Novice' };
                agent.career.rank = 'Ash-Carter';
                agent.vitals.poise = Math.max(20, (agent.vitals.poise || 60) - 10);
                agent.operatingStance = { mode: 'PENAL_DUTY', discipline: 'logistics', task: 'Boundary Ash-Carting', daysTrained: 0 };
            }
            if (rootScope.FacilityEngine) rootScope.FacilityEngine.settlementResources += 4;
            msg = `[INQUEST: DEMOTED] ${suspect.name} stripped of rank to boundary Ash-Carter (+4 Resources seized from back-pay).`;
            transcript = `[SIGNED INQUEST VERDICT: PENAL DEMOTION] ${suspect.name.toUpperCase()} (Day ${day} AF): Stripped of rank for [${suspect.crime}] to [Ash-Carter] (+4 Settlement Resources confiscated).`;
        } else if (v === 'execute') {
            const victimName = agent?.name || suspect.name || targetId;
            if (agent) {
                agent.alive = false;
                agent.operatingStance = { mode: 'DECEASED', discipline: null, task: null, daysTrained: 0 };
            }
            const dossier = CrucibleNarrativeEngine.processActorDeath({
                id: targetId,
                name: victimName,
                cause: `Executed on northern palisade for [${suspect.crime}] following formal inquest`
            });
            if (h.unrest !== undefined) h.unrest = Math.max(0, h.unrest - 10);
            if (h.crownScrutiny !== undefined) h.crownScrutiny = Math.max(0, h.crownScrutiny - 5);
            msg = `[INQUEST: EXECUTED] ${victimName} executed on northern palisade (-10% Unrest, -5% Scrutiny). Death Certificate filed.`;
            transcript = CrucibleNarrativeEngine.formatDossier(dossier.id);
        } else if (v === 'turn_agent') {
            if (agent) {
                agent.isDoubleAgent = true;
                agent.career = agent.career || { id: 'scout', rank: 'Operative' };
                agent.career.rank = 'Double-Agent';
                agent.skills.stealth = Number(((agent.skills.stealth || 2) + 1.5).toFixed(2));
                agent.skills.lore = Number(((agent.skills.lore || 2) + 1.0).toFixed(2));
            }
            if (rootScope.CampaignManager?.state?.house) {
                rootScope.CampaignManager.state.house.blackmailDossiers = (rootScope.CampaignManager.state.house.blackmailDossiers || 0) + 1;
            }
            let newFact = null;
            if (rootScope.RealityEditorVault) {
                newFact = rootScope.RealityEditorVault.discoverFact({
                    title: `Double-Agent Cipher Confession of ${suspect.name}`,
                    source: `Basalt Inquest Chamber Interrogation`,
                    targetHouse: suspect.rivalHouse || 'House Cull',
                    valueFuel: 15,
                    valueRes: 20,
                    costPaid: 'Inquest Interrogation & Leverage',
                    riskDesc: `Proof of covert espionage by ${suspect.rivalHouse || 'House Cull'}.`
                });
            }
            msg = `[INQUEST: DOUBLE AGENT] ${suspect.name} turned into double agent against ${suspect.rivalHouse || 'House Cull'} (+1.5 Stealth, +1 Blackmail Dossier, +1 Fact Dossier)!`;
            transcript = `[SIGNED INQUEST VERDICT: COVERT DOUBLE AGENT] ${suspect.name.toUpperCase()} (Day ${day} AF): Turned against ${suspect.rivalHouse || 'House Cull'} (+1.5 Stealth, +1.0 Lore, +1 Blackmail Dossier, Fact [${newFact?.title || 'Cipher Confession'}] added to Truth Vault).`;
        } else {
            return { success: false, message: `Unknown verdict: "${verdictType}". Valid: exonerate, demote, execute, turn_agent.` };
        }

        LogDispatchManager.dispatches.unshift({
            id: `inq_verdict_${day}_${Date.now()}`,
            day,
            type: `INQUEST VERDICT [${v.toUpperCase()}]`,
            sender: 'Basalt Inquest Tribunal',
            title: `${suspect.name} - ${v.toUpperCase()}`,
            body: msg,
            read: false
        });

        rootScope.EventBus?.emit('INQUEST_VERDICT_RENDERED', { suspect, verdict: v });
        return { success: true, verdict: v, suspect, transcript, message: msg };
    }
};
InterrogationDesk.init();
rootScope.InterrogationDesk = InterrogationDesk;




// ============================================================================
// 5. NOBLE HOUSE MONOPOLIES & ROLE REGISTRY
// ============================================================================
export const NOBLE_HOUSE_PROFILES = [
    { houseId: "House Oakheart", seat: "Oakhaven", ruler: "Baron Kaelen Oakheart", monopoly: "14-Day Shift Ironwood Heartwood", bonusDesc: "+20% Caravan Trade Yield", fuelStart: 28, favorStart: 65 },
    { houseId: "House Gallows", seat: "Gallows Hill", ruler: "Baroness Isolde Gallows", monopoly: "Ironbark Runic Dust & Stabilization Tethers", bonusDesc: "-50% Chain Decay on Fuel Depletion", fuelStart: 26, favorStart: 62 },
    { houseId: "House Mire", seat: "Mire's Edge", ruler: "Elder Ystrid Mire", monopoly: "Toxic Swamp Reagents & Fungal Binders", bonusDesc: "+15% Domestic Still Efficiency", fuelStart: 25, favorStart: 58 },
    { houseId: "House Blackwood", seat: "Blackwood", ruler: "Duke Vorian Blackwood", monopoly: "Deep-Crust Slag-Weevil Spinal Fluids", bonusDesc: "+4 Fuel on Emergency Requisition", fuelStart: 27, favorStart: 60 },
    { houseId: "House Hollow", seat: "Hollow Creek", ruler: "Baron Vance Hollow", monopoly: "Swamp-Gator Iron-Leather Anchor Seals", bonusDesc: "-1 Daily Barrier Fuel Burn Floor", fuelStart: 26, favorStart: 60 },
    { houseId: "House Ashen", seat: "Ashen Hold", ruler: "Duke Vaeloth Ashen", monopoly: "Diamond-Cut Basalt Runic Tablets", bonusDesc: "+10 Starting Crown Favor", fuelStart: 26, favorStart: 75 },
    { houseId: "House Crow", seat: "Crow's Perch", ruler: "Master Corvus Crow", monopoly: "Whisper Guild Intelligence & Shadow-Blink", bonusDesc: "+1 Starting Blackmail Dossier", fuelStart: 24, favorStart: 55, startDossiers: 1 },
    { houseId: "House Widow", seat: "Widow's Web", ruler: "Duchess Genevieve Widow", monopoly: "Parasitic Siphon-Vine Cold Resins", bonusDesc: "+6 Resin on Mist Patrols", fuelStart: 28, favorStart: 64 },
    { houseId: "House Thorn", seat: "Thornbury", ruler: "Marquis Silas Thorn", monopoly: "Illumination Waxworks & Pacifying Smoke", bonusDesc: "-10 Starting Lower-Bailey Unrest", fuelStart: 25, favorStart: 58 },
    { houseId: "House Gloom", seat: "Gloomhaven", ruler: "Baron Malazar Gloom", monopoly: "Gloom-Glass Refraction Lenses & Alembics", bonusDesc: "+10 Max Barrier Fuel Storage", fuelStart: 28, favorStart: 62 },
    { houseId: "House Dusken", seat: "Duskendale", ruler: "Baron Lysander Dusken", monopoly: "Gloom-Weaver Kinetic Silk Armor", bonusDesc: "+15 Garrison Poise Floor", fuelStart: 25, favorStart: 56 },
    { houseId: "House Grim", seat: "Grimsby", ruler: "Baron Thaddeus Grim", monopoly: "Blast Foundries & 50-Ton Tether Chains", bonusDesc: "Chains Integrity Reinforced (100%)", fuelStart: 26, favorStart: 60 },
    { houseId: "House Shadowfen", seat: "Shadowfen", ruler: "Viscount Severin Shadowfen", monopoly: "Master Pre-Fuel Matrix Synthesis", bonusDesc: "+32 Starting Barrier Fuel Reserves", fuelStart: 32, favorStart: 68 },
    { houseId: "House Blightwatch", seat: "Blighted Watch", ruler: "Ranger General Torin Graves", monopoly: "Petrified Ghost-Pine Conduit Rods", bonusDesc: "High Frontier Patrol Survival", fuelStart: 24, favorStart: 55 },
    { houseId: "House Bleak", seat: "Bleakmire", ruler: "Baron Malacor Bleak", monopoly: "Titan-Bone Masonry & Pale Cap Binders", bonusDesc: "Volatile Fuel Transit Stabilized", fuelStart: 26, favorStart: 58 },
    { houseId: "House Wraith", seat: "Wraith's End", ruler: "Countess Morwenna Wraith", monopoly: "Abyssal Salvage & Leviathan Deep Oil", bonusDesc: "Alternative Deep-Oil Burn Reserves", fuelStart: 27, favorStart: 54 },
    { houseId: "House Cull", seat: "Cullfield", ruler: "Baron Vargus Cull", monopoly: "Slaughter-Chutes & Cardiac Catalysts", bonusDesc: "+20% Proxy Raid Resin Yield", fuelStart: 26, favorStart: 60 },
    { houseId: "House Aethel (Cadet Stewardship)", seat: "Outer Ward Stewardship", ruler: "Royal Seneschal", monopoly: "Crown Crucible Tithe Auditing", bonusDesc: "+15 Starting Crown Favor", fuelStart: 30, favorStart: 80 }
];

export const ROLE_CATALOG = {
    NOBLE_HOUSE: {
        roleId: 'NOBLE_HOUSE',
        title: '1. Noble House Scion (Random 1 of 18 Houses)',
        campaignMode: 'HOUSE',
        subtitle: 'Manage Crown Favor, Weekly Barrier Fuel Quotas & Your Unique House Monopoly',
        desc: 'Roll one of the 18 competing Noble Houses. Leverage your monopoly while managing Crown Favor without Terminus\'s legal still dispensation.'
    },
    TERMINUS: {
        roleId: 'TERMINUS',
        title: '2. Terminus Warden & 300 Guardians',
        campaignMode: 'HOUSE',
        subtitle: "Guard World's End Gate, Cultivate the 300 Guardians & Hold the Mountain Pass",
        desc: "Command House Terminus at the World-Wall frontier. Manage Crown Favor plus legal Horizon Dispensation and 3-Stage Bone-Carving Runic Cultivation."
    },
    GUILD: {
        roleId: 'GUILD',
        title: '3. Adventurer Guild Leader',
        campaignMode: 'ORDER',
        subtitle: 'Command Garrison Squads, Boundary Contracts & Anomaly Expeditions',
        desc: 'Lead the Adventurer Guilds and Directorate field squads. Drill operatives, investigate spatial anomalies, and survive the 14-day Shift.'
    },
    MERCHANT: {
        roleId: 'MERCHANT',
        title: '4. Merchant Network & Patron Broker',
        campaignMode: 'PATRON',
        subtitle: 'Arbitrage House Monopolies, Dispatch Caravans & Verify Ledger Truths',
        desc: 'Operate the inter-settlement trade and courier network across the Warded Roads. Sponsor candidates and verify historical rumors into canonical Truth.'
    },
    SYNDICATE: {
        roleId: 'SYNDICATE',
        title: '5. Crime Syndicate Boss',
        campaignMode: 'SYNDICATE',
        subtitle: 'Smuggle Unstamped Crown Resin, Extort Houses & Collect Gallows Tolls',
        desc: 'Rule the Under-Chain Contraband Ring from the lower-bailey sluices. Divert midnight resin barges, build blackmail dossiers on Noble Houses, and profit from scarcity.'
    },
    SOVEREIGN: {
        roleId: 'SOVEREIGN',
        title: '6. The Pale Sovereign',
        campaignMode: 'SOVEREIGN',
        subtitle: 'Command the Bound Huntsman, Harvest Significance & Mutate the Frost Heralds',
        desc: 'Brood within the deep mountain frost. Dispatch the Bound Huntsman to stalk high-significance prey across the Dark Forest and perform the Macabre Communion.'
    }
};

// ============================================================================
// 5.05 EMERGENT 6-ROLE STATE MACHINE & MONOPOLY MODIFIER ENGINE
// ============================================================================
export const HOUSE_MONOPOLY_MODIFIERS = {
    "House Oakheart": { caravanYieldMult: 1.20, primaryCommodity: "Ironwood Heartwood" },
    "House Gallows": { chainDecayMult: 0.50, primaryCommodity: "Ironbark Runic Dust" },
    "House Mire": { stillEfficiencyMult: 1.15, primaryCommodity: "Fungal Binders" },
    "House Blackwood": { emergencyFuelBonus: 4, primaryCommodity: "Slag-Weevil Spinal Fluids" },
    "House Hollow": { dailyFuelBurnDelta: -1, primaryCommodity: "Swamp-Gator Anchor Seals" },
    "House Ashen": { favorStartBonus: 10, crownTitheFavorBonus: 2, primaryCommodity: "Basalt Runic Tablets" },
    "House Crow": { startDossiers: 1, spyDetectionBonus: 0.15, primaryCommodity: "Whisper Guild Intel" },
    "House Widow": { patrolResinBonus: 6, primaryCommodity: "Siphon-Vine Cold Resins" },
    "House Thorn": { unrestStartDelta: -10, dailyUnrestDecay: 2, primaryCommodity: "Pacifying Waxworks" },
    "House Gloom": { maxFuelStorageBonus: 10, primaryCommodity: "Gloom-Glass Lenses" },
    "House Dusken": { poiseFloorBonus: 15, primaryCommodity: "Kinetic Silk Armor" },
    "House Grim": { chainRepairBonus: 5, primaryCommodity: "50-Ton Tether Chains" },
    "House Shadowfen": { dailyFuelSynthBonus: 1, primaryCommodity: "Pre-Fuel Matrix" },
    "House Blightwatch": { patrolSurvivalBonus: 0.25, primaryCommodity: "Ghost-Pine Conduit Rods" },
    "House Bleak": { volatilityDampener: 0.85, primaryCommodity: "Pale Cap Binders" },
    "House Wraith": { deepOilReserveBonus: 2, primaryCommodity: "Leviathan Deep Oil" },
    "House Cull": { proxyRaidYieldMult: 1.20, primaryCommodity: "Cardiac Catalysts" },
    "House Aethel (Cadet Stewardship)": { crownTitheFavorBonus: 4, primaryCommodity: "Crucible Tithe Audits" },
    "House Terminus": { legalHorizonDispensation: true, guardianCultivationMult: 1.25, primaryCommodity: "Horizon Containment" }
};

export const RoleStateMachine = rootScope.RoleStateMachine || {
    currentPhase: 'MORNING_BRIEFING',
    PHASE_TRANSITIONS: {
        MORNING_BRIEFING: ['FIELD_OPERATIONS', 'CRISIS_TRIAGE'],
        FIELD_OPERATIONS: ['CRISIS_TRIAGE', 'EVENING_RECONCILIATION'],
        CRISIS_TRIAGE: ['FIELD_OPERATIONS', 'EVENING_RECONCILIATION'],
        EVENING_RECONCILIATION: ['MORNING_BRIEFING', 'FIELD_OPERATIONS']
    },

    ROLE_CONTROLLERS: {
        NOBLE_HOUSE: {
            roleId: 'NOBLE_HOUSE',
            campaignMode: 'HOUSE',
            primaryResource: 'barrierFuelUnits',
            secondaryResource: 'crownFavor',
            squadFocusSkills: ['survival', 'meleeDef', 'lore'],
            baseFacilitySynergy: 'alchemical_still'
        },
        TERMINUS: {
            roleId: 'TERMINUS',
            campaignMode: 'HOUSE',
            primaryResource: 'barrierFuelUnits',
            secondaryResource: 'chainsIntegrity',
            squadFocusSkills: ['toughness', 'meleeDef', 'strength'],
            baseFacilitySynergy: 'war_table'
        },
        GUILD: {
            roleId: 'GUILD',
            campaignMode: 'ORDER',
            primaryResource: 'containedAnomalies',
            secondaryResource: 'blindSpotEntropy',
            squadFocusSkills: ['lore', 'survival', 'meleeAtt'],
            baseFacilitySynergy: 'inquest_chamber'
        },
        MERCHANT: {
            roleId: 'MERCHANT',
            campaignMode: 'PATRON',
            primaryResource: 'candidateSignificance',
            secondaryResource: 'verifiedTruths',
            squadFocusSkills: ['athletics', 'survival', 'lore'],
            baseFacilitySynergy: 'scriptorium'
        },
        SYNDICATE: {
            roleId: 'SYNDICATE',
            campaignMode: 'SYNDICATE',
            primaryResource: 'contrabandResin',
            secondaryResource: 'gallowsTollCollected',
            squadFocusSkills: ['stealth', 'dodge', 'meleeAtt'],
            baseFacilitySynergy: 'war_table'
        },
        SOVEREIGN: {
            roleId: 'SOVEREIGN',
            campaignMode: 'SOVEREIGN',
            primaryResource: 'significanceHarvested',
            secondaryResource: 'heraldsMutated',
            squadFocusSkills: ['strength', 'meleeAtt', 'stealth'],
            baseFacilitySynergy: 'war_table'
        }
    },

    transitionTo(nextPhase) {
        const target = (nextPhase || 'FIELD_OPERATIONS').toUpperCase();
        if (this.PHASE_TRANSITIONS[this.currentPhase]?.includes(target) || target !== this.currentPhase) {
            const prev = this.currentPhase;
            this.currentPhase = target;
            rootScope.EventBus?.emit('ROLE_LOOP_PHASE_CHANGED', { from: prev, to: target });
        }
        return this.currentPhase;
    },

    getActiveController(roleKey = null) {
        const key = (roleKey || CampaignManager?.activeRole || CampaignManager?.campaignMode || 'NOBLE_HOUSE').toUpperCase();
        if (this.ROLE_CONTROLLERS[key]) return this.ROLE_CONTROLLERS[key];
        const byMode = Object.values(this.ROLE_CONTROLLERS).find(c => c.campaignMode === key);
        return byMode || this.ROLE_CONTROLLERS.NOBLE_HOUSE;
    },

    getHouseModifiers(houseId = null) {
        const id = houseId || CampaignManager?.state?.house?.houseId || 'House Terminus';
        return HOUSE_MONOPOLY_MODIFIERS[id] || {};
    },

    computeSquadCapabilityMetrics() {
        const alive = Array.from(AgentRosterManager.agents.values()).filter(a => a.alive);
        if (alive.length === 0) {
            return { count: 0, avgMartial: 1, avgStealth: 1, avgLore: 1, avgSurvival: 1, avgPoise: 50, totalPower: 5 };
        }
        let martial = 0, stealth = 0, lore = 0, survival = 0, poise = 0;
        alive.forEach(a => {
            const sk = a.skills || {};
            martial += (Number(sk.meleeAtt || 2) + Number(sk.meleeDef || 2) + Number(sk.toughness || 2)) / 3;
            stealth += (Number(sk.stealth || 2) + Number(sk.dodge || 2)) / 2;
            lore += Number(sk.lore || 2);
            survival += (Number(sk.survival || 2) + Number(sk.athletics || 2)) / 2;
            poise += Number(a.vitals?.poise || 60);
        });
        const n = alive.length;
        const avgMartial = Number((martial / n).toFixed(2));
        const avgStealth = Number((stealth / n).toFixed(2));
        const avgLore = Number((lore / n).toFixed(2));
        const avgSurvival = Number((survival / n).toFixed(2));
        const avgPoise = Math.round(poise / n);
        const totalPower = Number(((avgMartial + avgStealth + avgLore + avgSurvival) * n).toFixed(1));
        return { count: n, avgMartial, avgStealth, avgLore, avgSurvival, avgPoise, totalPower };
    },

    computeFacilityMultipliers() {
        const fac = rootScope.FacilityEngine?.facilities || {};
        const scriptoriumLv = fac.scriptorium?.unlocked ? (fac.scriptorium.level || 1) : 0;
        const barracksLv = fac.guard_barracks?.unlocked ? (fac.guard_barracks.level || 1) : 0;
        const inquestLv = fac.inquest_chamber?.unlocked ? (fac.inquest_chamber.level || 1) : 0;
        const stillLv = fac.alchemical_still?.unlocked ? (fac.alchemical_still.level || 1) : 0;
        const warTableLv = fac.war_table?.unlocked ? (fac.war_table.level || 1) : 0;
        const armoryMarketLv = fac.armory_market?.unlocked ? (fac.armory_market.level || 1) : 0;

        return {
            scriptoriumLv,
            barracksLv,
            inquestLv,
            stillLv,
            warTableLv,
            armoryMarketLv,
            productionMult: Number((1 + stillLv * 0.12 + scriptoriumLv * 0.05).toFixed(2)),
            tradeMult: Number((1 + scriptoriumLv * 0.10 + barracksLv * 0.08 + armoryMarketLv * 0.10).toFixed(2)),
            covertMult: Number((1 + inquestLv * 0.15 + warTableLv * 0.10).toFixed(2)),
            martialMult: Number((1 + barracksLv * 0.15 + warTableLv * 0.12 + armoryMarketLv * 0.08).toFixed(2))
        };
    },

    getSovereignEscalationStage() {
        const sov = CampaignManager?.state?.sovereign || {};
        const weight = Number(sov.significanceHarvested || 0);
        const heralds = Number(sov.heraldsMutated || 0);
        const years = Number(sov.yearsEndured || 0);

        if (sov.isAscended || (weight >= 2500 && heralds >= 5 && years >= 1000)) {
            return {
                stage: 3,
                label: 'STAGE III: APOCALYPTIC VOID EMPEROR',
                nextThresholdDesc: 'MAX ESCALATION REACHED — UNLEASH APOCALYPTIC HARVEST ON CHAINED SETTLEMENTS'
            };
        }
        if (weight >= 1000 && heralds >= 2) {
            return {
                stage: 2,
                label: 'STAGE II: THE PREDATOR TIDE',
                nextThresholdDesc: `Next Gate (Stage III Void Emperor): ${weight}/2500 Historical Weight, ${heralds}/5 Heralds, ${Math.floor(years)}/1000 Years`
            };
        }
        if (weight >= 300) {
            return {
                stage: 1,
                label: 'STAGE I: THE MACABRE COMMUNION',
                nextThresholdDesc: `Next Gate (Stage II Predator Tide): ${weight}/1000 Historical Weight & ${heralds}/2 Mutated Heralds`
            };
        }
        return {
            stage: 0,
            label: 'STAGE 0: FROST-BOUND DORMANCY',
            nextThresholdDesc: `Next Gate (Stage I Macabre Communion): Harvest ${weight}/300 Historical Weight via Brooding or Huntsman Stalking`
        };
    },

    getGrowthProgression() {
        const mode = (CampaignManager?.campaignMode || 'HOUSE').toUpperCase();
        const role = (CampaignManager?.activeRole || mode).toUpperCase();
        if (mode === 'SOVEREIGN' || role === 'SOVEREIGN' || role === 'PALE_SOVEREIGN') {
            const sovStage = this.getSovereignEscalationStage();
            return {
                isSovereign: true,
                tier: sovStage.stage,
                label: sovStage.label,
                nextGateDesc: sovStage.nextThresholdDesc
            };
        }
        const fac = rootScope.FacilityEngine?.facilities || {};
        const unlockedExtra = ['guard_barracks', 'inquest_chamber', 'alchemical_still', 'war_table', 'armory_market'].filter(k => fac[k]?.unlocked).length;
        const scriptoriumUpgrades = Math.max(0, (fac.scriptorium?.level || 1) - 1);
        const points = unlockedExtra + scriptoriumUpgrades;

        if (points >= 3 || fac.war_table?.unlocked) {
            return {
                isSovereign: false,
                tier: 3,
                points,
                label: 'GROWTH TIER III: FULL STRATEGIC COMMAND',
                nextGateDesc: 'All Strategic Layers Unfolded (Base, Field, Truth Vault & 19-House War Board Active)'
            };
        }
        if (points >= 2) {
            return {
                isSovereign: false,
                tier: 2,
                points,
                label: 'GROWTH TIER II: FEUDAL &ARCHIVE DIPLOMACY',
                nextGateDesc: 'Next Gate (Tier III): Construct [Covert War & Proxy Table] to unfold full Proxy Warfare'
            };
        }
        if (points >= 1) {
            return {
                isSovereign: false,
                tier: 1,
                points,
                label: 'GROWTH TIER I: FIELD LOGISTICS & TRUTH VAULT',
                nextGateDesc: 'Next Gate (Tier II): Construct a 2nd Base Facility to unfold Politics, Tithes & 19-House War Board'
            };
        }
        return {
            isSovereign: false,
            tier: 0,
            points: 0,
            label: 'GROWTH TIER 0: FLEDGLING OUTPOST (MINIMALIST START)',
            nextGateDesc: '🔒 GROWTH GATE: Construct your 1st Base Facility (e.g. Garrison Barracks) to unfold Field Operations & Truth Vault'
        };
    }
};
rootScope.RoleStateMachine = RoleStateMachine;

export const PRESSURE_TAG_REGISTRY = {
    FORCE_WENDIGO_CONSUMPTION: {
        id: 'FORCE_WENDIGO_CONSUMPTION',
        tier: 1,
        prefixDescriptor: 'Feral-Starved',
        payload_tags: ['APPLY_MUTATION_FERAL', 'LOCK_VITAL_HP', 'SPAWN_PREDATOR_CLASS']
    },
    FORCE_CROW_SIGNIFICANCE: {
        id: 'FORCE_CROW_SIGNIFICANCE',
        tier: 1,
        prefixDescriptor: 'Omen-Marked',
        payload_tags: ['INFLATE_STORY_DENSITY', 'DRAIN_SANITY_POISE']
    },
    FORCE_CROWN_ORDER: {
        id: 'FORCE_CROWN_ORDER',
        tier: 1,
        prefixDescriptor: 'Inquisitorial',
        payload_tags: ['ENFORCE_CROWN_AUDIT', 'SEIZE_BARRIER_FUEL']
    },
    FORCE_FOREST_POSSIBILITY: {
        id: 'FORCE_FOREST_POSSIBILITY',
        tier: 1,
        prefixDescriptor: 'Non-Euclidean',
        payload_tags: ['SPIKE_BLIND_SPOT_ENTROPY', 'SCATTER_COORDINATES']
    },
    IRON_RUST_CONSTANT: {
        id: 'IRON_RUST_CONSTANT',
        tier: 2,
        nounDescriptor: 'Rust-Storm',
        payload_tags: ['TARGET_ALL_FERROUS', 'DEGRADE_TIER_MAX', 'INFECT_WOUNDS']
    },
    SHIFT_DRIFT_PROXIMITY: {
        id: 'SHIFT_DRIFT_PROXIMITY',
        tier: 2,
        nounDescriptor: 'Void-Shear',
        payload_tags: ['SCATTER_COORDINATES', 'FREEZE_TETHER_LINKS']
    },
    MIST_DEPTH_DENSITY: {
        id: 'MIST_DEPTH_DENSITY',
        tier: 2,
        nounDescriptor: 'Copper-Fog Ambush',
        payload_tags: ['OBSCURE_LOS_MIST', 'INFECT_WOUNDS']
    },
    SQUAD_POISE_DECAY: {
        id: 'SQUAD_POISE_DECAY',
        tier: 4,
        failureNoun: 'Shattered Cohesion',
        payload_tags: ['BREAK_COHESION', 'TRIGGER_ROUT', 'DROP_CARGO']
    },
    TETHER_TENSION_LIMIT: {
        id: 'TETHER_TENSION_LIMIT',
        tier: 3,
        failureNoun: 'Anchor Fracture',
        payload_tags: ['FRACTURE_ANCHOR_CHAINS', 'SEIZE_BARRIER_FUEL']
    },
    ANOMALY_CONTAINMENT_ENTROPY: {
        id: 'ANOMALY_CONTAINMENT_ENTROPY',
        tier: 3,
        failureNoun: 'Vault Breach',
        payload_tags: ['SPIKE_BLIND_SPOT_ENTROPY', 'DRAIN_SANITY_POISE']
    }
};

export const ProceduralCollisionEngine = rootScope.ProceduralCollisionEngine || {
    registry: PRESSURE_TAG_REGISTRY,
    collisionHistory: [],
    reboundOffsets: {},

    getBoilingPressures(sectorState = {}, threshold = 0.85) {
        const h = CampaignManager?.state?.house || {};
        const o = CampaignManager?.state?.order || {};
        const sq = RoleStateMachine.computeSquadCapabilityMetrics();
        const day = rootScope.EngineParams?.worldDay || 1;
        const shiftProximity = 14 - (day % 14);

        const scores = {
            FORCE_WENDIGO_CONSUMPTION: sectorState.FORCE_WENDIGO_CONSUMPTION ?? (h.barrierFuelUnits <= 10 ? 0.90 : 0.45),
            FORCE_CROW_SIGNIFICANCE: sectorState.FORCE_CROW_SIGNIFICANCE ?? ((CampaignManager?.state?.patron?.candidateSignificance || 25) / 80),
            FORCE_CROWN_ORDER: sectorState.FORCE_CROWN_ORDER ?? ((h.crownScrutiny || 10) / 70),
            FORCE_FOREST_POSSIBILITY: sectorState.FORCE_FOREST_POSSIBILITY ?? ((o.blindSpotEntropy || 12) / 60),
            IRON_RUST_CONSTANT: sectorState.IRON_RUST_CONSTANT ?? (shiftProximity <= 3 ? 0.88 : 0.40),
            SHIFT_DRIFT_PROXIMITY: sectorState.SHIFT_DRIFT_PROXIMITY ?? ((14 - shiftProximity) / 14),
            MIST_DEPTH_DENSITY: sectorState.MIST_DEPTH_DENSITY ?? 0.50,
            SQUAD_POISE_DECAY: sectorState.SQUAD_POISE_DECAY ?? ((100 - sq.avgPoise) / 65),
            TETHER_TENSION_LIMIT: sectorState.TETHER_TENSION_LIMIT ?? ((100 - (h.chainsIntegrity || 100)) / 35),
            ANOMALY_CONTAINMENT_ENTROPY: sectorState.ANOMALY_CONTAINMENT_ENTROPY ?? ((o.blindSpotEntropy || 12) / 50)
        };

        const active = [];
        for (const [id, def] of Object.entries(this.registry)) {
            const val = Number(((scores[id] || 0) + (this.reboundOffsets[id] || 0)).toFixed(2));
            if (val >= threshold) {
                active.push({ ...def, currentPressure: val, threshold_reached: true });
            }
        }
        return active.sort((a, b) => b.currentPressure - a.currentPressure);
    },

    synthesizeTags(anchor, catalyst, target) {
        return Array.from(new Set([
            ...(anchor?.payload_tags || []),
            ...(catalyst?.payload_tags || []),
            ...(target?.payload_tags || [])
        ]));
    },

    applyPayload(sectorState = {}, payloadTags = []) {
        const effectsApplied = [];
        const h = CampaignManager?.state?.house || {};
        const o = CampaignManager?.state?.order || {};
        const day = rootScope.EngineParams?.worldDay || 1;

        if (payloadTags.includes('TARGET_ALL_FERROUS') && payloadTags.includes('DEGRADE_TIER_MAX')) {
            AgentRosterManager.agents.forEach(agt => {
                if (!agt.alive) return;
                if (agt.equipment?.weapon) agt.equipment.weapon.degradedToZero = true;
                if (agt.equipment?.armor) agt.equipment.armor.degradedToZero = true;
                agt.skills.meleeAtt = Math.max(1, Number((agt.skills.meleeAtt - 1.5).toFixed(2)));
                agt.skills.meleeDef = Math.max(1, Number((agt.skills.meleeDef - 1.5).toFixed(2)));
            });
            effectsApplied.push('Ferrous weapons & armor dissolved to Tier 0');
        }

        if (payloadTags.includes('APPLY_MUTATION_FERAL') || payloadTags.includes('SPAWN_PREDATOR_CLASS')) {
            const spawned = {
                id: `proc_pred_${day}_${this.collisionHistory.length + 1}`,
                name: sectorState.eventName || 'Rusted Feral Stalker',
                risenDay: day,
                type: 'PROCEDURAL_PREDATOR',
                isFeral: true,
                threatPower: 55
            };
            AgentRosterManager.spawnedFeralWendigos.push(spawned);
            effectsApplied.push(`Spawned ${spawned.name} (Threat: ${spawned.threatPower})`);
        }

        if (payloadTags.includes('BREAK_COHESION') || payloadTags.includes('TRIGGER_ROUT') || payloadTags.includes('DROP_CARGO')) {
            AgentRosterManager.agents.forEach(agt => {
                if (!agt.alive) return;
                agt.vitals.poise = Math.max(10, (agt.vitals.poise || 60) - 20);
                if (agt.operatingStance?.mode === 'OUT_ON_MISSION') {
                    agt.operatingStance.mode = 'ROUTED';
                }
            });
            if (ExpeditionEngine?.activeExpeditions?.length > 0) {
                const exp = ExpeditionEngine.activeExpeditions[0];
                exp.cargoIntegrity = Math.max(0, (exp.cargoIntegrity ?? 100) - 50);
                exp.status = 'RETREATED';
                exp.logs.push(`[COLLISION ROUT] Formation shattered! Squad dropped cargo and fled.`);
            }
            effectsApplied.push('Squad cohesion broken; cargo dropped in rout');
        }

        if (payloadTags.includes('SEIZE_BARRIER_FUEL')) {
            h.barrierFuelUnits = Math.max(0, (h.barrierFuelUnits || 20) - 6);
            effectsApplied.push('Barrier fuel drained (-6u)');
        }
        if (payloadTags.includes('FRACTURE_ANCHOR_CHAINS') || payloadTags.includes('FREEZE_TETHER_LINKS')) {
            h.chainsIntegrity = Math.max(0, (h.chainsIntegrity || 100) - 10);
            effectsApplied.push('Anchor chains fractured (-10%)');
        }
        if (payloadTags.includes('SPIKE_BLIND_SPOT_ENTROPY')) {
            o.blindSpotEntropy = Math.min(100, (o.blindSpotEntropy || 12) + 8);
            effectsApplied.push('Blind-Spot Entropy spiked (+8%)');
        }

        return effectsApplied;
    },

    increaseRandomLocalPressure(delta = 0.20) {
        const keys = Object.keys(this.registry);
        const idx = this.collisionHistory.length % keys.length;
        const pickedKey = keys[idx];
        this.reboundOffsets[pickedKey] = Number(((this.reboundOffsets[pickedKey] || 0) + delta).toFixed(2));
        return { pressureId: pickedKey, newOffset: this.reboundOffsets[pickedKey] };
    },

    evaluateSector(sectorState = {}, threshold = 0.85) {
        const activePressures = this.getBoilingPressures(sectorState, threshold);
        if (activePressures.length >= 3) {
            return this.generateEmergentCrisis(sectorState, activePressures);
        }
        return null;
    },

    generateEmergentCrisis(sectorState = {}, pressures = []) {
        const anchor = pressures.find(p => p.tier === 1);
        const catalyst = pressures.find(p => p.tier === 2);
        const target = pressures.find(p => p.tier === 3 || p.tier === 4);
        if (!anchor || !catalyst || !target) return null;

        const eventName = `${anchor.prefixDescriptor || 'Anomalous'} ${catalyst.nounDescriptor || 'Surge'} of ${target.failureNoun || 'Collapse'}`;
        const payloadTags = this.synthesizeTags(anchor, catalyst, target);
        const effectsApplied = this.applyPayload({ ...sectorState, eventName }, payloadTags);
        const rebound = this.increaseRandomLocalPressure(0.20);
        const day = rootScope.EngineParams?.worldDay || 1;
        const houseName = CampaignManager?.state?.house?.houseId || CampaignManager?.campaignMode || 'Royal Archive';
        const settlementName = CampaignManager?.state?.house?.settlementName || "World's End Gate";
        const leadSurvivor = Array.from(AgentRosterManager.agents.values()).find(a => a.alive)?.name || 'Bailiff Mallow';

        const narrativeSummary = `At the stroke of the watch in ${settlementName}, ${leadSurvivor} watched the iron wards buckle as [${anchor.prefixDescriptor} ${catalyst.nounDescriptor}] tore through the bailey—forcing the garrison to ${effectsApplied[0]?.toLowerCase() || 'fall back'} while ${houseName}'s reserves bled into the mist.`;

        const narrativeManifest = {
            narrativeKernel: {
                cause: `${anchor.id} (${anchor.currentPressure ?? 0.9}) × ${catalyst.id} (${catalyst.currentPressure ?? 0.9})`,
                targetVector: `${target.id} (${target.currentPressure ?? 0.9})`,
                intensity: (anchor.currentPressure || 0.9) >= 0.9 ? 'CRITICAL' : 'HIGH',
                affectedEntities: [houseName, settlementName, leadSurvivor]
            },
            narrativeSummary,
            proceduralDescription: `Because [${anchor.id}] collided with [${catalyst.id}] while [${target.id}] was strained at ${settlementName}, the ${eventName} erupted (${effectsApplied.join('; ')}).`
        };

        const record = {
            id: `collision_${day}_${this.collisionHistory.length + 1}`,
            day,
            eventName,
            anchor: anchor.id,
            catalyst: catalyst.id,
            target: target.id,
            payload_tags: payloadTags,
            effectsApplied,
            rebound,
            narrativeSummary,
            narrativeManifest
        };
        this.collisionHistory.unshift(record);

        LogDispatchManager.dispatches.unshift({
            id: record.id,
            day,
            type: 'PROCEDURAL COLLISION ANOMALY',
            sender: 'Grammar of Chaos Kernel',
            title: `⚡ ${eventName}`,
            body: `${narrativeSummary} [Audit: ${narrativeManifest.proceduralDescription} | Rebound: +20% on ${rebound.pressureId}].`,
            read: false
        });

        rootScope.EventBus?.emit('PROCEDURAL_COLLISION_EXECUTED', record);
        return record;
    }
};
rootScope.ProceduralCollisionEngine = ProceduralCollisionEngine;

// ============================================================================
// 5.08 MANIFESTO §2 & §3: EDITOR OF REALITY (FACT & RELIC VAULT) & EMISSARY DILEMMAS
// ============================================================================
export const RealityEditorVault = rootScope.RealityEditorVault || {
    facts: [],
    resolvedHistory: [],
    activeEmissaryPetition: null,
    worldQualities: {},

    resetForNewRun() {
        this.facts = [];
        this.resolvedHistory = [];
        this.activeEmissaryPetition = null;
        this.worldQualities = {
            rivalMistrust: 0,
            institutionalSchism: 0,
            scholarlyAuthority: 0,
            crownOrthodoxy: 0
        };
        this.discoverFact({
            title: "Palimpsest of the Twenty-First Parish",
            source: "Scraped Vellum Roll #77 (Archive Basement)",
            targetHouse: "House Gallows",
            valueFuel: 14,
            valueRes: 18,
            costPaid: "3 Rations, 1 Scribe Candle",
            riskDesc: "Exposes a 6,000-year chronological discrepancy in the King's Chain census.",
            credibility: 84
        });
    },

    discoverFact(opts = {}) {
        const day = rootScope.EngineParams?.worldDay || 1;
        const warBoard = CampaignManager?.getWarBoard?.() || [];
        const rival = opts.targetHouse || warBoard.find(w => w.status === 'WAR_PREP' || w.status === 'SKIRMISH')?.name || 'House Cull';
        const fact = {
            id: opts.id || `fact_${day}_${this.facts.length + this.resolvedHistory.length + 1}`,
            dayDiscovered: day,
            title: opts.title || `Unstamped ${rival} Siphon-Resin Ledger`,
            source: opts.source || `Recovered by Field Squad near ${rival} toll-markers`,
            owner: CampaignManager?.state?.house?.houseId || CampaignManager?.campaignMode || 'Royal Archive',
            targetHouse: rival,
            valueFuel: opts.valueFuel || 12,
            valueRes: opts.valueRes || 16,
            costPaid: opts.costPaid || '8h Field March & Escort Rations',
            riskDesc: opts.riskDesc || `Implicates ${rival} in unauthorized resin diversion (+10% Entropy if published).`,
            credibility: opts.credibility || Math.min(98, Math.round(65 + (RoleStateMachine.computeSquadCapabilityMetrics().avgLore * 5)))
        };
        this.facts.unshift(fact);
        rootScope.EventBus?.emit('FACT_DISCOVERED', fact);
        return fact;
    },

    resolveFact(factId, verb = 'ARCHIVE') {
        const idx = factId ? this.facts.findIndex(f => f.id === factId) : 0;
        if (idx === -1 || this.facts.length === 0) {
            return { success: false, message: "No discovered Facts or Relics in the Vault to resolve." };
        }
        const fact = this.facts.splice(idx, 1)[0];
        const act = String(verb || 'ARCHIVE').toUpperCase();
        const day = rootScope.EngineParams?.worldDay || 1;
        const h = CampaignManager.state.house;
        const o = CampaignManager.state.order;
        const syn = CampaignManager.state.syndicate;
        const pat = CampaignManager.state.patron;
        const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
        const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);

        let effectSummary = '';
        this.worldQualities ??= { rivalMistrust: 0, institutionalSchism: 0, scholarlyAuthority: 0, crownOrthodoxy: 0 };
        if (act === 'PUBLISH') {
            this.worldQualities.institutionalSchism = (this.worldQualities.institutionalSchism || 0) + 1;
            o.blindSpotEntropy = Math.min(100, (o.blindSpotEntropy || 12) + 12);
            h.crownFavor = Math.max(0, (h.crownFavor || 50) - 10);
            pat.candidateSignificance = (pat.candidateSignificance || 25) + 18;
            CampaignManager.mutateWarBoard(fact.targetHouse, -8, 'WAR_PREP', `Public broadcast of [${fact.title}] shattered institutional legitimacy`);
            effectSummary = `📢 [PUBLISHED] Broadcast [${fact.title}] across all 20 settlements! (+12% Blind-Spot Entropy, +18 Significance, -10% Crown Favor, ${fact.targetHouse} humiliated -8 Power | World Quality [Institutional Schism: ${this.worldQualities.institutionalSchism}]).`;
        } else if (act === 'LEAK') {
            this.worldQualities.rivalMistrust = (this.worldQualities.rivalMistrust || 0) + 1;
            h.blackmailDossiers = (h.blackmailDossiers || 0) + 1;
            CampaignManager.mutateWarBoard(fact.targetHouse, -10, 'SKIRMISH', `Covert leak of [${fact.title}] triggered a targeted feudal schism`);
            effectSummary = `🗡️ [LEAKED] Secretly leaked [${fact.title}] against ${fact.targetHouse}! (${fact.targetHouse} -10 Power -> SKIRMISH, +1 Blackmail Dossier | World Quality [Rival Mistrust: ${this.worldQualities.rivalMistrust}]).`;
        } else if (act === 'SELL') {
            this.worldQualities.rivalMistrust = (this.worldQualities.rivalMistrust || 0) + 1;
            if (CampaignManager.campaignMode === 'SYNDICATE') {
                syn.contrabandResin += fact.valueFuel;
                syn.gallowsTollCollected += fact.valueRes;
            } else {
                h.barrierFuelUnits = Math.min(maxFuel, (h.barrierFuelUnits || 0) + fact.valueFuel);
            }
            FacilityEngine.settlementResources += fact.valueRes;
            effectSummary = `💰 [SOLD] Brokered [${fact.title}] for monopoly favors (+${fact.valueFuel}u Fuel/Resin, +${fact.valueRes} Settlement Resources | World Quality [Rival Mistrust: ${this.worldQualities.rivalMistrust}]).`;
        } else if (act === 'ARCHIVE') {
            this.worldQualities.scholarlyAuthority = (this.worldQualities.scholarlyAuthority || 0) + 1;
            AgentRosterManager.agents.forEach(a => {
                if (a.alive) a.skills.lore = Number((a.skills.lore + 0.5).toFixed(2));
            });
            FacilityEngine.settlementProsperity = Math.min(100, FacilityEngine.settlementProsperity + 6);
            CrisisEngine.volatilityIndex = Math.max(0, (CrisisEngine.volatilityIndex || 0) - 4);
            effectSummary = `🏛️ [ARCHIVED] Sealed [${fact.title}] in private Scriptorium vault (+0.5 Squad Lore, +6% Prosperity, -4% Volatility | World Quality [Scholarly Authority: ${this.worldQualities.scholarlyAuthority}]).`;
        } else if (act === 'SUPPRESS') {
            this.worldQualities.crownOrthodoxy = (this.worldQualities.crownOrthodoxy || 0) + 1;
            h.crownFavor = Math.min(100, (h.crownFavor || 50) + 12);
            h.crownScrutiny = Math.max(0, (h.crownScrutiny || 10) - 8);
            o.blindSpotEntropy = Math.max(0, (o.blindSpotEntropy || 12) - 5);
            effectSummary = `🤫 [SUPPRESSED] Buried [${fact.title}] to protect institutional order (+12% Crown Favor, -8% Scrutiny, -5% Entropy | World Quality [Crown Orthodoxy: ${this.worldQualities.crownOrthodoxy}]).`;
        } else if (act === 'DESTROY') {
            o.blindSpotEntropy = Math.max(0, (o.blindSpotEntropy || 12) - 10);
            CrisisEngine.volatilityIndex = Math.max(0, (CrisisEngine.volatilityIndex || 0) - 10);
            effectSummary = `🔥 [DESTROYED] Incinerated [${fact.title}] in the basalt brazier (-10% Blind-Spot Entropy, -10% Volatility; history lost forever).`;
        } else {
            this.facts.unshift(fact);
            return { success: false, message: `Unknown Editor verb: ${verb}` };
        }

        const record = { ...fact, resolvedDay: day, verb: act, effectSummary };
        this.resolvedHistory.unshift(record);
        LogDispatchManager.dispatches.unshift({
            id: `editor_${day}_${Date.now()}`,
            day,
            type: `REALITY EDITOR [${act}]`,
            sender: 'The Crow\'s Eye Vault',
            title: `${act}: ${fact.title}`,
            body: effectSummary,
            read: false
        });
        rootScope.EventBus?.emit('FACT_RESOLVED', record);
        return { success: true, verb: act, fact: record, message: effectSummary };
    },

    petitionCounter: 0,

    getHousePowerContext(houseName, powerVal) {
        const warBoard = CampaignManager?.getWarBoard?.() || [];
        const sorted = [...warBoard].sort((a, b) => b.power - a.power);
        const rankIdx = sorted.findIndex(w => w.name === houseName);
        const rank = rankIdx >= 0 ? rankIdx + 1 : 8;
        const tierDesc = powerVal >= 80 ? 'Apex Hegemon' : (powerVal >= 65 ? 'Major Monopoly Peer' : (powerVal >= 50 ? 'Regional Challenger' : 'Strained Frontier House'));
        return `Power: ${powerVal}/100 [Rank #${rank}/19 - ${tierDesc} | Garrison, Fuel & Monopoly Leverage Index]`;
    },

    generateEmissaryPetition(day = 1) {
        if (this.activeEmissaryPetition) return this.activeEmissaryPetition;
        const warBoard = CampaignManager?.getWarBoard?.() || [];
        const activeHouse = CampaignManager?.state?.house?.houseId || 'House Terminus';
        const candidates = warBoard.filter(w => w.name !== activeHouse && w.name !== 'House Aethel');
        this.petitionCounter = (this.petitionCounter || 0) + 1;
        const pickIdx = (day + this.petitionCounter * 3) % Math.max(1, candidates.length);
        const rival = candidates[pickIdx] || { name: 'House Shadowfen', monopoly: 'Pre-Fuel Matrix', power: 66, status: 'PEACE' };
        const powerContext = this.getHousePowerContext(rival.name, rival.power);

        const archetypes = [
            {
                typeId: 'TOLL_EMBARGO_PACT',
                title: `Toll Embargo Envoy from ${rival.name} (${rival.status})`,
                prompt: `An envoy from ${rival.name} (${powerContext}) offers +10u Barrier Fuel & +12 Resources in exchange for a joint toll embargo against Crown assessors. (Warning: Defying Crown toll law triggers immediate & cascading Crown retaliation!)`,
                acceptLabel: `🤝 Accept ${rival.name} Embargo (+10u Fuel, +12 Res, +5 Ally Power | ⚠️ -12% Crown Favor, +10% Scrutiny & Tariff Seizure Risk)`,
                rejectLabel: `🛡️ Reject Envoy & Uphold Crown Law (+6% Crown Favor, -4% Scrutiny | ⚠️ ${rival.name} -5 Power -> SKIRMISH)`,
                fuelGain: 10, resGain: 12, favorPenalty: 12, scrutinyGain: 10, allyPowerDelta: 5, rejectFavorGain: 6, rejectRivalPowerDelta: -5
            },
            {
                typeId: 'MONOPOLY_FUTURES_LEASE',
                title: `${rival.monopoly} Lease from ${rival.name} (${rival.status})`,
                prompt: `A factor of ${rival.name} (${powerContext}) proposes leasing their [${rival.monopoly}] surplus (+12u Fuel, +8 Resources) if you divert unstamped shipments around Royal Crucible audit clerks.`,
                acceptLabel: `📦 Sign Unstamped Lease (+12u Fuel, +8 Res, +4 Ally Power | ⚠️ -10% Crown Favor, +12% Scrutiny & +4% Unrest)`,
                rejectLabel: `⚖️ Impound Sample for Crown (+7% Crown Favor, +4 Res | ⚠️ ${rival.name} -6 Power -> WAR_PREP)`,
                fuelGain: 12, resGain: 8, favorPenalty: 10, scrutinyGain: 12, allyPowerDelta: 4, rejectFavorGain: 7, rejectRivalPowerDelta: -6
            },
            {
                typeId: 'DESERTER_EXTRADITION',
                title: `Border Extradition Demand from ${rival.name} (${rival.status})`,
                prompt: `An iron-clad herald of ${rival.name} (${powerContext}) demands a fugitive scribe hiding in your lower bailey in exchange for +15 Settlement Resources & +6u Fuel.`,
                acceptLabel: `⛓️ Extradite Fugitive (+15 Res, +6u Fuel, +4 Ally Power | ⚠️ -8% Crown Favor, +8% Scrutiny & Unrest)`,
                rejectLabel: `🏛️ Grant Sanctuary Under Crown Writ (+5% Crown Favor | ⚠️ ${rival.name} -5 Power -> SKIRMISH)`,
                fuelGain: 6, resGain: 15, favorPenalty: 8, scrutinyGain: 8, allyPowerDelta: 4, rejectFavorGain: 5, rejectRivalPowerDelta: -5
            },
            {
                typeId: 'CHAIN_FORGE_COALITION',
                title: `Anchor-Chain Compact with ${rival.name} (${rival.status})`,
                prompt: `Master smiths from ${rival.name} (${powerContext}) offer to re-temper your 50-ton anchor links (+8u Fuel, +14 Resources, +10% Chains) if you shield their illegal domestic stills from Crown Assessors.`,
                acceptLabel: `⚒️ Shield ${rival.name} Stills (+8u Fuel, +14 Res, +10% Chains | ⚠️ -14% Crown Favor, +14% Scrutiny & Crusher Raid Risk)`,
                rejectLabel: `📜 Report Stills to Crown (+8% Crown Favor, -6% Scrutiny | ⚠️ ${rival.name} -6 Power -> SKIRMISH)`,
                fuelGain: 8, resGain: 14, favorPenalty: 14, scrutinyGain: 14, allyPowerDelta: 5, rejectFavorGain: 8, rejectRivalPowerDelta: -6
            }
        ];

        const chosenArch = archetypes[(day + this.petitionCounter) % archetypes.length];

        this.activeEmissaryPetition = {
            id: `pet_${day}_${this.petitionCounter}_${Math.floor(Math.random() * 1000)}`,
            day,
            archetypeId: chosenArch.typeId,
            senderHouse: rival.name,
            senderPower: rival.power,
            powerContext,
            title: chosenArch.title,
            prompt: chosenArch.prompt,
            acceptLabel: chosenArch.acceptLabel,
            rejectLabel: chosenArch.rejectLabel,
            effects: chosenArch,
            isFirstEmissary: this.petitionCounter === 1
        };
        rootScope.EventBus?.emit('EMISSARY_ARRIVED', this.activeEmissaryPetition);
        return this.activeEmissaryPetition;
    },

    resolveEmissaryPetition(decision = 'ACCEPT') {
        if (!this.activeEmissaryPetition) {
            return { success: false, message: "No active emissary petition at the gatehouse." };
        }
        const pet = this.activeEmissaryPetition;
        this.activeEmissaryPetition = null;
        const h = CampaignManager.state.house;
        const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
        const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
        const act = String(decision || 'ACCEPT').toUpperCase();
        const eff = pet.effects || { fuelGain: 10, resGain: 12, favorPenalty: 10, scrutinyGain: 10, allyPowerDelta: 5, rejectFavorGain: 5, rejectRivalPowerDelta: -4 };

        let msg = '';
        if (act === 'ACCEPT') {
            h.barrierFuelUnits = Math.min(maxFuel, (h.barrierFuelUnits || 0) + eff.fuelGain);
            h.crownFavor = Math.max(0, (h.crownFavor || 65) - eff.favorPenalty);
            h.crownScrutiny = Math.min(100, (h.crownScrutiny || 10) + eff.scrutinyGain);
            h.unrest = Math.min(100, (h.unrest || 10) + 4);
            if (pet.archetypeId === 'CHAIN_FORGE_COALITION') {
                h.chainsIntegrity = Math.min(100, (h.chainsIntegrity || 90) + 10);
            }
            if (pet.archetypeId === 'COVERT_DOSSIER_SWAP') {
                this.discoverFact({
                    title: `${pet.senderHouse} Covert Emissary Ledger`,
                    source: `Gatehouse Emissary Pact (${pet.senderHouse})`,
                    targetHouse: pet.senderHouse,
                    valueFuel: 12,
                    valueRes: 15
                });
            }
            this.worldQualities ??= { rivalMistrust: 0, institutionalSchism: 0, scholarlyAuthority: 0, crownOrthodoxy: 0 };
            this.worldQualities.rivalMistrust = (this.worldQualities.rivalMistrust || 0) + 1;
            FacilityEngine.settlementResources += eff.resGain;
            CampaignManager.mutateWarBoard(pet.senderHouse, eff.allyPowerDelta, 'ALLIED', `Signed bilateral ${pet.archetypeId} pact`);
            CampaignManager.mutateWarBoard('House Aethel', 3, 'MOBILIZED', `Crown Assessors flagged unauthorized pact with ${pet.senderHouse}`);
            msg = `🤝 [PETITION ACCEPTED] Sealed [${pet.archetypeId}] with ${pet.senderHouse}: +${eff.fuelGain}u Fuel, +${eff.resGain} Res, ${pet.senderHouse} ALLIED (+${eff.allyPowerDelta} Power). ⚠️ ANTI-CROWN PENALTY: -${eff.favorPenalty}% Crown Favor, +${eff.scrutinyGain}% Crown Scrutiny, +4% Unrest (Cascading Crown tariff pressure active!).`;

            if (h.crownScrutiny >= 45 && !h.taxExempt) {
                const fine = Math.min(h.barrierFuelUnits, 5);
                h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - fine);
                msg += ` ⚔️ [CASCADING CROWN RETALIATION] Royal Bailiffs immediately seized -${fine}u Fuel in punitive tariff fines for defying the Crown!`;
            }
        } else {
            h.crownFavor = Math.min(100, (h.crownFavor || 50) + eff.rejectFavorGain);
            h.crownScrutiny = Math.max(0, (h.crownScrutiny || 10) - 4);
            this.worldQualities ??= { rivalMistrust: 0, institutionalSchism: 0, scholarlyAuthority: 0, crownOrthodoxy: 0 };
            this.worldQualities.rivalMistrust = (this.worldQualities.rivalMistrust || 0) + 1;
            CampaignManager.mutateWarBoard(pet.senderHouse, eff.rejectRivalPowerDelta, 'SKIRMISH', `Envoy turned away at the gatehouse`);
            msg = `🛡️ [PETITION REJECTED] Turned away ${pet.senderHouse} envoy: +${eff.rejectFavorGain}% Crown Favor, -4% Scrutiny. ⚠️ CASCADING FALLOUT: ${pet.senderHouse} (${eff.rejectRivalPowerDelta} Power -> SKIRMISH) has declared a retaliatory road hazard against your caravans!`;
        }
        return { success: true, decision: act, message: msg };
    }
};
rootScope.RealityEditorVault = RealityEditorVault;

// ============================================================================
// 5.1 CAMPAIGN COMMAND MANAGER
// ============================================================================
const CampaignManager = rootScope.CampaignManager || {
    campaignMode: 'HOUSE',
    activeFaction: null,
    dayStarted: 0,
    victoryConditionsMet: false,
    collapseTriggered: false,
    collapseReason: null,

    state: {
        house: {
            houseId: 'House Terminus',
            settlementName: "World's End Gate",
            barrierFuelUnits: 28,
            chainsIntegrity: 100,
            guardiansCount: 300,
            shiftCountdown: 14,
            crownFavor: 65,
            crownDemand: 16,
            autarkyLevel: 0,
            crownScrutiny: 10,
            hasHorizonDispensation: true,
            assignedBailiffId: null,
            sanctuaryBuilt: false,
            privateWingOpen: false,
            unrest: 10,
            blackmailDossiers: 0,
            activeCaravans: [],
            dreamSiphon: 30
        },
        order: { orderName: "Obsidian Citadel Directorate (OCP)", containedAnomalies: 4, form12BReports: 2, dustWardenScrubs: 5, blindSpotEntropy: 12, dreamSiphon: 30, taxExempt: true, crownDemand: 0 },
        syndicate: { syndicateName: "Under-Chain Contraband Ring", baseSettlement: "Gallows-Gate Sluices", mineralSaltStock: 150, contrabandResin: 45, gallowsTollCollected: 80, dreamSiphon: 30 },
        dune: { flotillaName: "Dust-Haven", riverStreamline: "Silt Veil", cleanedWaterStock: 80, dailyWaterConsumption: 5, mooringTetherIntegrity: 100, driftDistanceKm: 0, dreamSiphon: 30 },
        patron: { candidateSignificance: 25, symbolicDreamsSent: 0, verifiedTruths: 0, legendaryAwakenings: 0, dreamSiphon: 30 },
        sovereign: {
            title: "The Pale Sovereign (Frost-Bound)",
            isAscended: false,
            yearsEndured: 0,
            significanceHarvested: 0,
            heraldsMutated: 0,
            lastSummonDay: -10,
            bankedCharge: 0,
            summonCooldown: 3,
            dreamSiphon: 30
        }
    },

    init() {
        rootScope.EventBus?.on('HEARTBEAT_T12H', () => this.tickDayCycle());
        rootScope.EventBus?.on('DAY_TICK', () => this.processDailyLogistics());
    },

    selectRole(roleKey = 'NOBLE_HOUSE', customHouseId = null) {
        const key = (roleKey || 'NOBLE_HOUSE').toUpperCase();
        this.activeRole = key;

        // Reset system state for new run
        if (rootScope.EngineParams) rootScope.EngineParams.worldDay = 1;
        this.currentHour = 6;

        // Reset Engines & Log Manager headlessly
        rootScope.FacilityEngine?.resetForNewRun?.();
        if (rootScope.ExpeditionEngine) {
            rootScope.ExpeditionEngine.activeExpeditions = [];
            rootScope.ExpeditionEngine.completedLogs = [];
        }
        AgentRosterManager.agents.clear();
        AgentRosterManager.feralWendigoQueue = [];
        AgentRosterManager.spawnedFeralWendigos = [];
        AgentRosterManager.squadArmoryStock = ['ironwood_spear', 'widow_resin_blade', 'kinetic_silk_coat', 'grimsby_plate', 'gloom_lens_lantern'];
        LogDispatchManager.dispatches = [];
        LogDispatchManager.unreadCount = 0;
        InterrogationDesk.suspects.clear();
        CrucibleNarrativeEngine.biographies.clear();
        CrucibleNarrativeEngine.crucibles.clear();
        this.resetWarBoard();
        RealityEditorVault.resetForNewRun();
        RoleStateMachine.transitionTo('MORNING_BRIEFING');

        if (key === 'NOBLE_HOUSE') {
            const picked = (customHouseId && NOBLE_HOUSE_PROFILES.find(h => h.houseId.toLowerCase() === customHouseId.toLowerCase()))
                || NOBLE_HOUSE_PROFILES[Math.floor(Math.random() * NOBLE_HOUSE_PROFILES.length)];
            const hMods = RoleStateMachine.getHouseModifiers(picked.houseId);

            this.campaignMode = 'HOUSE';
            this.activeFaction = picked.houseId;
            this.dayStarted = rootScope.EngineParams?.worldDay || 1;
            this.victoryConditionsMet = false;
            this.collapseTriggered = false;
            this.collapseReason = null;

            Object.assign(this.state.house, {
                houseId: picked.houseId,
                settlementName: picked.seat,
                rulerName: picked.ruler,
                monopoly: picked.monopoly,
                monopolyBonus: picked.bonusDesc,
                barrierFuelUnits: picked.fuelStart,
                maxFuelUnits: 60 + (hMods.maxFuelStorageBonus || 0),
                chainsIntegrity: 100,
                guardiansCount: 0,
                shiftCountdown: 14,
                crownFavor: picked.favorStart,
                crownDemand: 16,
                autarkyLevel: 0,
                crownScrutiny: 10,
                hasHorizonDispensation: false,
                assignedBailiffId: null,
                sanctuaryBuilt: false,
                privateWingOpen: false,
                unrest: Math.max(0, 10 + (hMods.unrestStartDelta || 0)),
                blackmailDossiers: picked.startDossiers || hMods.startDossiers || 0,
                activeCaravans: [],
                dreamSiphon: 30
            });

            AgentRosterManager.agents.clear();
            [
                ['agt_1', picked.ruler, 'WAR_MASTER'],
                ['agt_2', 'House Bailiff Mallow', 'SCOUT'],
                ['agt_3', 'Ward-Captain Maris', 'WARDEN'],
                ['agt_4', 'Apprentice Jon', 'APPRENTICE']
            ].forEach(([id, name, arch]) => {
                const a = AgentRosterManager.createAgent(id, name, arch);
                a.assignedHouseId = picked.houseId;
                if (hMods.poiseFloorBonus) {
                    a.vitals.poise = Math.min(100, (a.vitals.poise || 60) + hMods.poiseFloorBonus);
                }
            });

            LogDispatchManager.dispatches.unshift({
                id: `disp_role_${Date.now()}`,
                day: this.dayStarted,
                type: 'ROYAL ARCHIVE CHARTER',
                sender: 'The Obsidian Citadel (Crown Assessor)',
                title: `Charter Confirmed: ${picked.houseId} (${picked.seat})`,
                body: `Ruler ${picked.ruler} registered under the King's Chain. Monopoly: [${picked.monopoly}] (${picked.bonusDesc}). Weekly Crown Fuel Quota: 16u. Warning: Unauthorized domestic fuel stills are strictly prohibited outside World's End Gate.`,
                read: false
            });

            rootScope.EventBus?.emit('CAMPAIGN_INITIALIZED', { mode: 'HOUSE', role: key, house: picked });
            return this.getCampaignStatus();
        }

        if (key === 'TERMINUS') {
            Object.assign(this.state.house, {
                houseId: 'House Terminus',
                settlementName: "World's End Gate",
                rulerName: 'High Marshal Vane',
                monopoly: 'Horizon Gate Defense & 3-Stage Bone-Carving Cultivation',
                monopolyBonus: 'Legal Horizon Stills Dispensation & 300 Guardians',
                barrierFuelUnits: 28,
                chainsIntegrity: 100,
                guardiansCount: 300,
                shiftCountdown: 14,
                crownFavor: 65,
                crownDemand: 16,
                autarkyLevel: 0,
                crownScrutiny: 10,
                hasHorizonDispensation: true,
                assignedBailiffId: null,
                sanctuaryBuilt: false,
                privateWingOpen: false,
                unrest: 10,
                blackmailDossiers: 0,
                activeCaravans: [],
                dreamSiphon: 30
            });
            return this.selectCampaign('HOUSE', 'House Terminus');
        }

        const roleToMode = {
            GUILD: 'ORDER',
            GUILD_LEADER: 'ORDER',
            MERCHANT: 'PATRON',
            MERCHANT_PATRON: 'PATRON',
            SYNDICATE: 'SYNDICATE',
            SOVEREIGN: 'SOVEREIGN',
            PALE_SOVEREIGN: 'SOVEREIGN',
            DUNE: 'DUNE',
            ORDER: 'ORDER',
            PATRON: 'PATRON',
            HOUSE: 'HOUSE'
        };
        if (roleToMode[key] === 'SOVEREIGN') {
            Object.assign(this.state.sovereign, {
                title: "The Pale Sovereign (Frost-Bound)",
                isAscended: false,
                yearsEndured: 0,
                significanceHarvested: 0,
                heraldsMutated: 0,
                lastSummonDay: -10,
                bankedCharge: 1,
                summonCooldown: 3,
                dreamSiphon: 30
            });
        }
        return this.selectCampaign(roleToMode[key] || 'HOUSE');
    },

    selectCampaign(mode, customFactionId = null) {
        const validModes = ['HOUSE', 'ORDER', 'SYNDICATE', 'DUNE', 'PATRON', 'SOVEREIGN'];
        const chosen = (mode || 'HOUSE').toUpperCase();
        if (!validModes.includes(chosen)) throw new Error(`Unknown campaign mode: ${mode}`);
        this.campaignMode = chosen;
        this.activeFaction = customFactionId;
        this.dayStarted = rootScope.EngineParams?.worldDay || 1;
        this.victoryConditionsMet = false;
        this.collapseTriggered = false;
        this.collapseReason = null;
        if (this.state[chosen.toLowerCase()]) {
            this.state[chosen.toLowerCase()].dreamSiphon = 30;
        }
        if (rootScope.CrisisEngine) {
            rootScope.CrisisEngine.pendingDreamIntervention = false;
        }

        // Re-seed roster for the selected campaign mode
        AgentRosterManager.agents.clear();
        this._seedInitialRoster();

        if (LogDispatchManager.dispatches.length === 0) {
            LogDispatchManager.generateDailyDispatches(rootScope.EngineParams?.worldDay || 1, this.campaignMode, this.state);
        }

        rootScope.EventBus?.emit('CAMPAIGN_INITIALIZED', { mode: this.campaignMode });
        return this.getCampaignStatus();
    },

    _seedInitialRoster() {
        const seeds = {
            HOUSE: [['agt_1', 'High Marshal Vane', 'WAR_MASTER'], ['agt_2', 'Scout-Sergeant Kaelen', 'SCOUT'], ['agt_3', 'Warden Maris', 'WARDEN'], ['agt_4', 'Apprentice Jon', 'APPRENTICE']],
            ORDER: [['agt_1', 'Director Jess Nedaf', 'INSPECTOR'], ['agt_2', 'Chronicler Elyse', 'SCRIBE'], ['agt_3', 'Dust-Warden Gareth', 'WARDEN']],
            SYNDICATE: [['agt_1', 'Sluice-Boss Harl', 'CARTEL_LEADER'], ['agt_2', 'Vance the Leech', 'SMUGGLER'], ['agt_3', 'Iron-Jaw Ron', 'ENFORCER']],
            DUNE: [['agt_1', 'Matron Morwen', 'ELDER_KEEPER'], ['agt_2', 'Sand-Pilot Dane', 'PILOT'], ['agt_3', 'Dredger Cael', 'DREDGER']],
            PATRON: [['agt_1', 'Lyra the Keen', 'SURVIVOR'], ['agt_2', 'Justin the Fowler', 'HUNTER']],
            SOVEREIGN: [['agt_1', 'The Bound Huntsman', 'PREDATOR']]
        };
        (seeds[this.campaignMode] || []).forEach(([id, name, arch]) => AgentRosterManager.createAgent(id, name, arch));
    },

    getCampaignStatus() {
        const day = rootScope.EngineParams?.worldDay || 1;
        return {
            mode: this.campaignMode,
            day,
            daysActive: day - this.dayStarted,
            victory: this.victoryConditionsMet,
            collapsed: this.collapseTriggered,
            collapseReason: this.collapseReason,
            state: this.state[this.campaignMode.toLowerCase()] || {}
        };
    },

    tickDayCycle() {
        this.checkSovereignCooldown();
    },

    processDailyLogistics() {
        const day = rootScope.EngineParams?.worldDay || 1;
        RoleStateMachine.transitionTo('FIELD_OPERATIONS');
        AgentRosterManager.tickDailyDrills();

        if (this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
            const baseBurn = 4 + (hMods.dailyFuelBurnDelta || 0) - Math.floor((h.autarkyLevel || 0) / 35);
            const consumption = Math.max(1, baseBurn - (hMods.dailyFuelSynthBonus || 0));
            h.barrierFuelUnits = Math.max(0, Math.min(maxFuel, h.barrierFuelUnits - consumption));
            h.shiftCountdown = 14 - (day % 14);
            if (hMods.dailyUnrestDecay) {
                h.unrest = Math.max(0, (h.unrest || 0) - hMods.dailyUnrestDecay);
            }

            if (day % 14 === 0) {
                AgentRosterManager.applyShiftSurvivalConditions(h.barrierFuelUnits > 0, h.barrierFuelUnits <= 0, false);
                h.crownDemand = 14 + Math.floor(Math.random() * 8);

                if (!h.hasHorizonDispensation && h.crownScrutiny > 65) {
                    h.barrierFuelUnits = Math.floor(h.barrierFuelUnits / 2);
                    h.autarkyLevel = Math.max(0, h.autarkyLevel - 30);
                    h.crownFavor = Math.max(0, h.crownFavor - 25);
                    rootScope.EventBus?.emit('UI_LOG', '⚔️ [CROWN INQUEST] Inquisitorial Crusher Force raided unauthorized stills! Fuel seized.');
                }
            }

            h.activeCaravans = (h.activeCaravans || []).filter(c => {
                c.daysLeft--;
                if (c.daysLeft <= 0) {
                    const yieldAdjusted = Math.round(c.yieldFuel * (hMods.caravanYieldMult || 1));
                    h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + yieldAdjusted);
                    rootScope.EventBus?.emit('UI_LOG', `📦 [TRADE] Caravan returned from ${c.dest}: +${yieldAdjusted} Barrier Fuel secured.`);
                    return false;
                }
                return true;
            });

            if (h.barrierFuelUnits <= 0 && (hMods.deepOilReserveBonus || 0) > 0 && !h._usedDeepOilEmergency) {
                h._usedDeepOilEmergency = true;
                h.barrierFuelUnits = hMods.deepOilReserveBonus * 3;
                rootScope.EventBus?.emit('UI_LOG', `🛢️ [HOUSE WRAITH] Leviathan Deep-Oil reserve vats tapped (+${h.barrierFuelUnits}u emergency burn).`);
            }

            if (h.barrierFuelUnits <= 0) {
                const chainLoss = Math.round(15 * (hMods.chainDecayMult || 1));
                h.chainsIntegrity = Math.max(0, h.chainsIntegrity - chainLoss);
                if (h.chainsIntegrity <= 0) {
                    this.collapseTriggered = true;
                    this.collapseReason = "Runic barrier depleted; anchor chains snapped in the White Void.";
                }
            }
        } else if (this.campaignMode === 'ORDER') {
            const o = this.state.order;
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const entropyChance = Math.max(0.08, 0.25 - facMult.inquestLv * 0.05);
            if (Math.random() < entropyChance) o.blindSpotEntropy = Math.min(100, o.blindSpotEntropy + 2);
            if (o.blindSpotEntropy >= 85) {
                this.collapseTriggered = true;
                this.collapseReason = "Reality leak exceeded threshold; memory of 6,000-year blind spot leaked.";
                ShadowInfluenceEngine.revealEpitaph(o.blindSpotEntropy);
            }
        } else if (this.campaignMode === 'DUNE') {
            const d = this.state.dune;
            d.cleanedWaterStock = Math.max(0, d.cleanedWaterStock - d.dailyWaterConsumption);
            d.driftDistanceKm += 0.12;
            if (d.cleanedWaterStock <= 0) {
                d.mooringTetherIntegrity = Math.max(0, d.mooringTetherIntegrity - 20);
                if (d.mooringTetherIntegrity <= 0) {
                    this.collapseTriggered = true;
                    this.collapseReason = "Cleaned water depleted; flotilla tethers snapped into Sand Churn.";
                }
            }
        } else if (this.campaignMode === 'SOVEREIGN') {
            const sov = this.state.sovereign;
            sov.yearsEndured = Number((sov.yearsEndured + 1 / 365).toFixed(2));
        }

        const currentRoleState = this.state[this.campaignMode.toLowerCase()];
        if (currentRoleState && typeof currentRoleState.dreamSiphon === 'number') {
            currentRoleState.dreamSiphon = Math.min(100, currentRoleState.dreamSiphon + 2);
        }

        if (day % 14 === 0) {
            AgentRosterManager.processShiftWendigoRebirths(day);
        }

        const activeFeralCount = AgentRosterManager.spawnedFeralWendigos?.length || 0;
        if (activeFeralCount > 0 && rootScope.CrisisEngine) {
            rootScope.CrisisEngine.volatilityIndex = Math.min(100, (rootScope.CrisisEngine.volatilityIndex || 0) + activeFeralCount * 3);
        }

        if (day % 3 === 0 && !RealityEditorVault.activeEmissaryPetition) {
            RealityEditorVault.generateEmissaryPetition(day);
        }

        const daysActive = day - this.dayStarted;
        this.tickDailyWarBoard(day);
        ShadowInfluenceEngine.tickDailyShadowOps(day, this.state);
        CrisisEngine.tickDailyVolatility(daysActive, this.activeRole || this.campaignMode, this.state.house);
        if (CrisisEngine.isGracePeriodComplete(daysActive) && !CrisisEngine.activeCrisis) {
            ProceduralCollisionEngine.evaluateSector({}, 0.85);
        }
        CrisisEngine.compileDailyReconciliation(day, this.activeRole || this.campaignMode);
        RoleStateMachine.transitionTo(CrisisEngine.activeCrisis ? 'CRISIS_TRIAGE' : 'EVENING_RECONCILIATION');
        LogDispatchManager.generateDailyDispatches(day, this.campaignMode, this.state);
    },
    dispatchAction(actionType, arg = null) {
        const day = rootScope.EngineParams?.worldDay || 1;
        let res = { success: false, message: "" };
        const act = (actionType || '').toUpperCase();

        if (act === 'PATROL') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const hMods = RoleStateMachine.getHouseModifiers(this.state.house?.houseId);
            res = { success: true, message: "Scout patrol dispatched into mist. Observed subtle coordinate drift on marker posts." };
            const interceptChance = Math.min(0.85, 0.35 + (sq.avgSurvival * 0.04) + (hMods.patrolSurvivalBonus || 0));
            if (this.campaignMode === 'HOUSE' && (Math.random() < interceptChance || hMods.patrolResinBonus)) {
                const resinGain = Math.round((6 + (hMods.patrolResinBonus || 0)) * (1 + (sq.avgSurvival - 2) * 0.1));
                const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
                this.state.house.barrierFuelUnits = Math.min(maxFuel, this.state.house.barrierFuelUnits + resinGain);
                res.message += ` Intercepted an unmonitored wagon with ${resinGain} units cold pine resin.`;
            }
        } else if (act === 'REQUISITION_FUEL') {
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const gain = Math.round((14 + (hMods.emergencyFuelBonus || 0)) * facMult.productionMult);
            const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
            h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + gain);
            h.unrest = Math.min(100, (h.unrest || 10) + 4);
            res = { success: true, message: `Emergency levy executed: +${gain} Barrier Fuel secured for ${h.settlementName || "World's End Gate"} (+4% Unrest).` };
        } else if (act === 'CROWN_FILL_FULL') {
            if (this.campaignMode === 'ORDER' || this.activeRole === 'GUILD_LEADER' || this.activeRole === 'GUILD') {
                return { success: false, message: "Obsidian Citadel Protocol is a covert Shadow Directorate — permanently exempt from Crown taxes and tithes." };
            }
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            if (h.barrierFuelUnits < h.crownDemand) return { success: false, message: `Insufficient fuel (${h.barrierFuelUnits}/${h.crownDemand}u).` };
            h.barrierFuelUnits -= h.crownDemand;
            const favorGain = 20 + (hMods.crownTitheFavorBonus || 0);
            h.crownFavor = Math.min(100, h.crownFavor + favorGain);
            this.mutateWarBoard(h.houseId, 3);
            res = { success: true, message: `Full Crown quota fulfilled (-${h.crownDemand}u Fuel, +${favorGain} Crown Favor). Local moats run thin.` };
        } else if (act === 'CROWN_FILL_PARTIAL') {
            if (this.campaignMode === 'ORDER' || this.activeRole === 'GUILD_LEADER' || this.activeRole === 'GUILD') {
                return { success: false, message: "Obsidian Citadel Protocol is a covert Shadow Directorate — permanently exempt from Crown taxes and tithes." };
            }
            const h = this.state.house;
            const half = Math.floor(h.crownDemand / 2);
            h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - half);
            h.crownFavor = Math.min(100, h.crownFavor + 5);
            res = { success: true, message: `Partial tribute delivered (-${half}u Fuel, +5 Crown Favor). Royal Assessors noted compromise.` };
        } else if (act === 'CROWN_DENY') {
            if (this.campaignMode === 'ORDER' || this.activeRole === 'GUILD_LEADER' || this.activeRole === 'GUILD') {
                return { success: true, message: "Obsidian Citadel operates outside Crown tax jurisdiction (0u Tithe Required)." };
            }
            const h = this.state.house;
            h.crownFavor = Math.max(0, h.crownFavor - 15);
            h.crownScrutiny = Math.min(100, (h.crownScrutiny || 10) + 12);
            h.unrest = Math.min(100, (h.unrest || 10) + 6);
            FacilityEngine.settlementResources = Math.max(0, FacilityEngine.settlementResources - 5);
            this.mutateWarBoard('House Aethel', 3, 'MOBILIZED', `Crown Assessors imposed tariff embargo after tithe denial`);
            res = { success: true, message: `⚠️ [CROWN TITHE DENIED] Preserved local fuel, but Royal Assessors imposed immediate anti-Crown sanctions: -15% Crown Favor, +12% Crown Scrutiny, +6% Unrest, and -5u Settlement Resources seized at the toll-gate!` };
        } else if (act === 'DEVELOP_AUTARKY') {
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const autarkyGain = Math.round(15 * (hMods.stillEfficiencyMult || 1) * facMult.productionMult);
            h.autarkyLevel = Math.min(100, h.autarkyLevel + autarkyGain);
            if (!h.hasHorizonDispensation) h.crownScrutiny += 15;
            res = { success: true, message: `Domestic stills expanded (+${autarkyGain}% -> Autarky: ${h.autarkyLevel}%). ${h.hasHorizonDispensation ? 'Terminus Horizon Dispensation legalizes stills.' : 'Crown scrutiny rose!'}` };
        } else if (act === 'PROXY_RAID') {
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const targetEntry = this.mutateWarBoard(arg || 'House Shadowfen', -6, 'SKIRMISH');
            const seized = Math.round(16 * (hMods.proxyRaidYieldMult || 1) * facMult.martialMult * (1 + (sq.avgMartial - 2) * 0.08));
            const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
            h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + seized);
            res = { success: true, message: `Covert proxy raid ambushed ${targetEntry?.name || 'rival'} supply line: +${seized} units cold resin seized (${targetEntry?.name || 'Rival'} power dropped to ${targetEntry?.power || 60}).` };
        } else if (act === 'PROXY_SABOTAGE') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const drop = -Math.max(5, Math.round(6 + sq.avgStealth));
            const targetEntry = this.mutateWarBoard(arg || 'House Cull', drop, 'DEFENSIVE');
            res = { success: true, message: `${targetEntry?.name || 'Rival house'} ballistas sabotaged with bone-dust (${drop} Power -> ${targetEntry?.power || 55}, Posture: ${targetEntry?.status || 'DEFENSIVE'}).` };
        } else if (act === 'CONSTRUCT_SANCTUARY') {
            this.state.house.sanctuaryBuilt = true;
            res = { success: true, message: "Sanctuary of the Hearth sealed beneath bedrock. +15% population recovery during Shifts." };
        } else if (act === 'OPEN_PRIVATE_WING') {
            const h = this.state.house;
            h.privateWingOpen = true;
            h.blackmailDossiers++;
            h.unrest += 15;
            res = { success: true, message: "Private wing opened to visiting noble elites: +50 Gold, +1 Blackmail Dossier. Lower-bailey unrest rose." };
        } else if (act === 'ASSIGN_BAILIFF') {
            this.state.house.assignedBailiffId = arg || 'agt_1';
            res = { success: true, message: `Logistics Bailiff assigned (${this.state.house.assignedBailiffId}). Official House trade caravans unlocked!` };
        } else if (act === 'DISPATCH_CARAVAN') {
            const h = this.state.house;
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            if (!h.assignedBailiffId) h.assignedBailiffId = 'agt_1';
            const expectedYield = Math.round(18 * (hMods.caravanYieldMult || 1) * facMult.tradeMult);
            h.activeCaravans.push({ dest: arg || 'Oakhaven', daysLeft: 4, yieldFuel: expectedYield });
            res = { success: true, message: `Official House Trade Caravan departed for ${arg || 'Oakhaven'} under Bailiff seal (Returns in 4 days with ~${expectedYield}u Fuel).` };
        } else if (act === 'RECALL_CARAVAN') {
            res = ExpeditionEngine.recallExpedition(arg || null);
        } else if (act === 'CULTIVATE_RUNIC') {
            res = AgentRosterManager.cultivateTerminusRunic(arg || 'agt_1', this.state.house);
        } else if (act === 'AUDIT_ANOMALY') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const reduction = Math.round((8 + sq.avgLore) * facMult.covertMult);
            this.state.order.containedAnomalies++;
            this.state.order.form12BReports++;
            this.state.order.blindSpotEntropy = Math.max(0, this.state.order.blindSpotEntropy - reduction);
            res = { success: true, message: `Form 12-B issued. Non-Euclidean spatial anomaly contained in Basalt Vault (-${reduction}% Entropy).` };
        } else if (act === 'SCRUB_MONUMENT') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const reduction = Math.round(5 + sq.avgSurvival * 0.8);
            this.state.order.dustWardenScrubs++;
            this.state.order.blindSpotEntropy = Math.max(0, this.state.order.blindSpotEntropy - reduction);
            res = { success: true, message: `Dust-Wardens scrubbed a forbidden monolith with vinegar-ash (-${reduction}% Blind-Spot Entropy).` };
        } else if (act === 'SMUGGLE_RESIN') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const resinGain = Math.round((16 + sq.avgStealth) * facMult.covertMult);
            this.state.syndicate.contrabandResin += resinGain;
            this.state.syndicate.gallowsTollCollected = Math.max(0, this.state.syndicate.gallowsTollCollected - 15);
            this.mutateWarBoard('House Gallows', -3, 'SKIRMISH');
            res = { success: true, message: `Midnight barge diverted: +${resinGain} Contraband Resin seized from Crown supply chain.` };
        } else if (act === 'EXTORT_HOUSE') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const targetEntry = this.mutateWarBoard(arg || 'House Cull', -5, 'WAR_PREP');
            const tollGain = Math.round((30 + sq.avgMartial * 2) * facMult.covertMult);
            this.state.syndicate.gallowsTollCollected += tollGain;
            res = { success: true, message: `Extortion levied on ${targetEntry?.name || 'House Cull'}: +${tollGain} Salt-Deniers extorted (${targetEntry?.name || 'House Cull'} Power -> ${targetEntry?.power || 57}, Posture: ${targetEntry?.status || 'WAR_PREP'}).` };
        } else if (act === 'CONDENSE_WATER') {
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const waterGain = Math.round(15 * facMult.productionMult);
            this.state.dune.cleanedWaterStock += waterGain;
            res = { success: true, message: `Solar condensers scraped of silica. +${waterGain} Cleaned Water added to tanks.` };
        } else if (act === 'DREDGE_STREAMLINE') {
            this.state.dune.driftDistanceKm += 0.8;
            res = { success: true, message: "Sounding dredge dropped into Silt Veil: Pre-Fracture vellum cylinder recovered from the riverbed." };
        } else if (act === 'REPAIR_TETHERS') {
            this.state.dune.mooringTetherIntegrity = Math.min(100, this.state.dune.mooringTetherIntegrity + 25);
            res = { success: true, message: "Flotilla hemp and bronze mooring tethers re-tensioned to bedrock anchor." };
        } else if (act === 'TRANSMIT_DREAM') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const sigGain = Math.round(8 + sq.avgLore * 1.5);
            this.state.patron.symbolicDreamsSent++;
            this.state.patron.candidateSignificance += sigGain;
            res = { success: true, message: `Symbolic dream whispered (+${sigGain} Sig). Candidate significance reached ${this.state.patron.candidateSignificance}.` };
        } else if (act === 'VERIFY_TRUTH') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const sigGain = Math.round((12 + sq.avgLore) * facMult.tradeMult);
            this.state.patron.verifiedTruths++;
            this.state.patron.candidateSignificance += sigGain;
            res = { success: true, message: `Divine revelation granted (+${sigGain} Sig). Historical rumor verified into canonical Truth.` };
        } else if (act === 'SUMMON_HUNTSMAN') {
            const ok = this.executeHuntsmanSummon();
            res = { success: ok, message: ok ? "The Bound Huntsman awakens from frost to harvest prey." : "Huntsman bound to void cooldown." };
        } else if (act === 'MACABRE_COMMUNION') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const harvest = Math.round(1500 * (1 + (sq.avgMartial - 2) * 0.1));
            this.state.sovereign.heraldsMutated++;
            this.state.sovereign.significanceHarvested = (this.state.sovereign.significanceHarvested || 0) + harvest;
            this.mutateWarBoard('House Terminus', -4, 'MOBILIZED');
            res = { success: true, message: `The Macabre Communion performed: Frozen fungal flesh fed to captive commander. Herald Wendigo mutated (+${harvest} Significance).` };
        } else if (act === 'LEVERAGE_HOUSE') {
            const h = this.state.house;
            if ((h.blackmailDossiers || 0) < 1) return { success: false, message: "No Blackmail Dossiers available. Monetize private sanctuary wing first." };
            h.blackmailDossiers--;
            const targetEntry = this.mutateWarBoard(arg || 'House Cull', -7, 'DEFENSIVE');
            h.crownFavor = Math.min(100, (h.crownFavor || 50) + 8);
            res = { success: true, message: `Blackmail Dossier spent against ${targetEntry?.name || 'House Cull'}: Rival house yielded monopoly leverage (+8 Crown Favor, ${targetEntry?.name || 'Rival'} Power -> ${targetEntry?.power || 55}).` };
        } else if (act === 'SPONSOR_HOUSE') {
            const h = this.state.house;
            if (h.barrierFuelUnits < 8) return { success: false, message: "Insufficient fuel to sponsor ally house." };
            h.barrierFuelUnits -= 8;
            h.crownFavor = Math.min(100, h.crownFavor + 10);
            const allyEntry = this.mutateWarBoard(arg || 'House Oakheart', 6, 'ALLIED');
            res = { success: true, message: `Sponsored ${allyEntry?.name || 'House Oakheart'} with 8u fuel: Defense coalition secured (+10 Crown Favor, ${allyEntry?.name || 'Ally'} Power -> ${allyEntry?.power || 84}).` };
        } else if (act === 'HIBERNATE') {
            const yrs = parseInt(arg, 10) || 25;
            const sov = this.state.sovereign;
            sov.yearsEndured = Number(((sov.yearsEndured || 0) + yrs).toFixed(2));
            const weightGain = yrs * 10;
            sov.significanceHarvested = (sov.significanceHarvested || 0) + weightGain;
            res = { success: true, message: `❄️ [SLOW-BURN DORMANCY] Korvan brooded in deep bedrock for ${yrs} years (+${weightGain} Historical Weight | Endured: ${sov.yearsEndured}/1000y).` };
        } else if (act === 'HERALD_PACK_RAID') {
            const sov = this.state.sovereign;
            if ((sov.heraldsMutated || 0) < 2) {
                return { success: false, message: "Requires at least 2 mutated Herald Wendigos via The Macabre Communion." };
            }
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const targetEntry = this.mutateWarBoard(arg || 'House Cull', -18, 'DEFENSIVE', `Feral Herald Wendigo Pack ravaged outer palisades`);
            const weightHarvest = Math.round(450 + (sov.heraldsMutated * 120) + sq.totalPower * 10);
            sov.significanceHarvested = (sov.significanceHarvested || 0) + weightHarvest;

            // Anti-Sovereign Noble House Counter-Coalition (Stage II+ Pushback)
            let coalitionCounterNote = '';
            if (sov.significanceHarvested >= 1200) {
                const coalitionLeader = this.mutateWarBoard('House Terminus', 6, 'MOBILIZED', 'Rallied Anti-Sovereign Huntsman Counter-Coalition');
                sov.counterCoalitionThreat = Math.min(100, (sov.counterCoalitionThreat || 0) + 18);
                coalitionCounterNote = ` ⚠️ [COALITION RETALIATION] ${coalitionLeader?.name || 'House Terminus'} mobilized an Anti-Sovereign Huntsman Coalition (Lair Threat: ${sov.counterCoalitionThreat}%)!`;
            }

            res = {
                success: true,
                triggerVisualShock: 'PREDATOR_RAID',
                message: `🩸🐺 [PREDATOR TIDE] Unleashed ${sov.heraldsMutated} Herald Wendigos upon ${targetEntry?.name || 'House Cull'}! Outer wards slaughtered (+${weightHarvest} Historical Weight, ${targetEntry?.name || 'Target'} -18 Power -> ${targetEntry?.power || 40}).${coalitionCounterNote}`
            };
        } else if (act === 'APOCALYPTIC_HARVEST') {
            const sov = this.state.sovereign;
            if (!sov.isAscended && ((sov.significanceHarvested || 0) < 2500 || (sov.heraldsMutated || 0) < 5)) {
                return { success: false, message: "Apocalyptic Harvest requires Stage III Ascension (2,500+ Historical Weight & 5 Herald Wendigos)." };
            }
            const targetEntry = this.mutateWarBoard(arg || 'House Gallows', -45, 'COLLAPSED', `The True Pale Sovereign shattered the 50-ton bedrock anchor chains`);
            const settlementNode = CANONICAL_BEDROCK_SETTLEMENTS.find(s => s.house === targetEntry?.name && !s.isCrownSeat);
            if (settlementNode) {
                settlementNode.barrierFuel = 0;
                settlementNode.chainsIntegrity = 0;
                settlementNode.population = Math.max(200, Math.floor(settlementNode.population * 0.15));
            }
            const megaHarvest = 2500;
            sov.significanceHarvested = (sov.significanceHarvested || 0) + megaHarvest;
            sov.shatteredSettlements = (sov.shatteredSettlements || 0) + 1;
            res = {
                success: true,
                devastatedHouse: targetEntry?.name,
                triggerVisualShock: 'CHAIN_SHATTER',
                message: `💀🌌 [APOCALYPTIC HARVEST] The True Pale Sovereign descended upon ${settlementNode?.name || targetEntry?.name}! 50-ton bedrock chains shattered into the White Void (+${megaHarvest} Historical Weight, ${targetEntry?.name} Power crushed by -45!).`
            };
        } else if (act === 'ASCEND_SOVEREIGN') {
            const sov = this.state.sovereign;
            if ((sov.yearsEndured || 0) < 1000 || (sov.heraldsMutated || 0) < 5) {
                return { success: false, message: `Ascension threshold not met. Requires 1,000 years (${sov.yearsEndured || 0}/1000) and 5 Herald Wendigos (${sov.heraldsMutated || 0}/5).` };
            }
            sov.isAscended = true;
            sov.title = "The True Pale Sovereign (Void Emperor)";
            res = { success: true, message: `CHAINS SHATTERED! Korvan evolves into The True Pale Sovereign (Porcelain bone carapace, Imperial antler-crown, Crimson mantle)!` };
        } else if (act === 'AUDIT_SHADOW_LEDGER') {
            res = { success: true, message: `General Ledger Shadow Audit compiled. Noble Huntsman-Mark Skew: ${(ShadowInfluenceEngine.getMarkSelectionSkew() * 100).toFixed(1)}%.` };
        } else if (act === 'HUNT_FERAL_WENDIGO') {
            const ferals = AgentRosterManager.spawnedFeralWendigos || [];
            if (ferals.length === 0) {
                return { success: false, message: "No risen Feral Wendigos currently stalking the settlement perimeter." };
            }
            const targetFeral = ferals[0];
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const squadCombatScore = Math.round((sq.totalPower * 1.4 + (FacilityEngine.villageGuardsCurrent || 0) * 3) * facMult.martialMult);

            if (squadCombatScore >= targetFeral.threatPower * 0.65) {
                AgentRosterManager.spawnedFeralWendigos.shift();
                AgentRosterManager.squadArmoryStock.push('widow_resin_blade');
                FacilityEngine.settlementResources += 12;
                if (this.campaignMode === 'HOUSE') {
                    this.state.house.crownFavor = Math.min(100, (this.state.house.crownFavor || 50) + 6);
                }
                AgentRosterManager.agents.forEach(a => {
                    if (!a.alive) return;
                    a.skills.meleeAtt = Number((a.skills.meleeAtt + 0.35).toFixed(2));
                    a.significance = (a.significance || 20) + 10;
                });
                CrisisEngine.volatilityIndex = Math.max(0, (CrisisEngine.volatilityIndex || 20) - 15);
                res = {
                    success: true,
                    slain: true,
                    message: `🩸⚔️ [WENDIGO SLAIN] Squad hunted down and incinerated ${targetFeral.name} (Squad Score ${squadCombatScore} vs Threat ${targetFeral.threatPower}). +12 Resources, +1 Widow Longknife, +10 Squad Significance!`
                };
            } else {
                AgentRosterManager.agents.forEach(a => {
                    if (!a.alive) return;
                    a.vitals.hp = Math.max(20, a.vitals.hp - 12);
                    a.vitals.poise = Math.max(15, (a.vitals.poise || 60) - 15);
                });
                targetFeral.threatPower = Math.max(20, targetFeral.threatPower - 15);
                res = {
                    success: true,
                    slain: false,
                    message: `⚠️ [WENDIGO SKIRMISH] ${targetFeral.name} wounded the hunting party and retreated into the mist (Remaining Threat: ${targetFeral.threatPower}). Upgrade Barracks or equip Armory gear before striking again!`
                };
            }
        } else if (act === 'BREACH_BLIND_SPOT') {
            this.state.order.blindSpotEntropy = 88;
            ShadowInfluenceEngine.revealEpitaph(88);
            res = { success: true, message: `âš ï¸ REALITY LEAK THRESHOLD BREACHED (Entropy: 88%). Fallen-Era Illusion Runes in the Mountain Event Horizon (r=185km) have fracturedâ€”Settlement #7 [EPITAPH] exposed as the 21st node!` };
        } else {
            res = { success: false, message: `Command '${actionType}' is not available for ${this.campaignMode}.` };
        }
        rootScope.EventBus?.emit('COMMAND_EXECUTED', { actionType, res, day });
        return res;
    },

    checkSovereignCooldown() {
        if (this.campaignMode !== 'SOVEREIGN') return;
        const currentDay = rootScope.EngineParams?.worldDay || 1;
        const sov = this.state.sovereign;
        if (currentDay - sov.lastSummonDay >= sov.summonCooldown && sov.bankedCharge === 0) {
            sov.bankedCharge = 1;
            rootScope.EventBus?.emit('UI_LOG', 'ðŸ¦‡ [SOVEREIGN] Resummon charge stacked. Huntsman immortal today.');
        }
    },

    executeHuntsmanSummon() {
        if (this.campaignMode !== 'SOVEREIGN') return false;
        const currentDay = rootScope.EngineParams?.worldDay || 1;
        const sov = this.state.sovereign;
        if (sov.bankedCharge > 0) {
            sov.bankedCharge = 0;
            sov.lastSummonDay = currentDay;
            rootScope.EventBus?.emit('UI_LOG', 'ðŸ’€ [SOVEREIGN] Instant Rebirth: Consuming banked charge!');
            return true;
        }
        if (currentDay - sov.lastSummonDay >= sov.summonCooldown) {
            sov.lastSummonDay = currentDay;
            rootScope.EventBus?.emit('UI_LOG', 'ðŸ’€ [SOVEREIGN] Huntsman summoned.');
            return true;
        }
        return false;
    },


    exportLegacySave(chosenCandidateId = null) {
        const day = rootScope.EngineParams?.worldDay || 1;
        const seed = rootScope.EpochManagerInstance?.currentSeed || 'millennium_audit_seed_1000';
        const shiftSys = rootScope.ShiftDirector;

        let candidate = null;
        if (AgentRosterManager.agents.size > 0) {
            if (chosenCandidateId && AgentRosterManager.agents.has(chosenCandidateId)) {
                candidate = AgentRosterManager.agents.get(chosenCandidateId);
            } else {
                candidate = Array.from(AgentRosterManager.agents.values()).sort((a, b) => (b.significance || 0) - (a.significance || 0))[0];
            }
        }

        const ancestors = CrucibleNarrativeEngine.getAllBiographies() || [];
        const liveVillages = rootScope.VillageManager?.villages || [];
        const settlements = (liveVillages.length > 0 ? liveVillages : CANONICAL_BEDROCK_SETTLEMENTS).map(v => ({
            name: v.name,
            region: v.region || 'forest',
            house: v.nobleHouse || v.house || 'Unblessed',
            x: Number(v.x?.toFixed?.(1) || 0),
            z: Number(v.z?.toFixed?.(1) || 0),
            driftSpeed: v.driftSpeed || 0
        }));

        const legacyDossier = {
            version: "1.0.0-PROLOGUE",
            exportedAt: new Date().toISOString(),
            universe: "Universe-1-Aethelgard",
            meta: {
                worldSeed: seed,
                worldDay: day,
                objectiveYear: shiftSys?.getObjectiveYear ? shiftSys.getObjectiveYear() : Math.floor(day / 365) + 18000,
                perceivedYear: shiftSys?.getPerceivedYear ? shiftSys.getPerceivedYear() : Math.floor(day / 365) + 12000,
                missingGapYears: shiftSys?.getMissingGapYears ? shiftSys.getMissingGapYears() : 6000,
                campaignMode: this.campaignMode,
                activeFaction: this.activeFaction || this.campaignMode,
                state: this.state[this.campaignMode.toLowerCase()] || {}
            },
            candidate: candidate ? {
                id: candidate.id,
                name: candidate.name,
                career: candidate.career?.id || 'hunter',
                significance: candidate.significance || 20,
                vitals: candidate.vitals || { hp: 100, poise: 60 },
                bodyRunes: candidate.bodyRunes || {},
                isTrueOriginNative: true
            } : null,
            settlements: settlements.slice(0, 40),
            ancestors: ancestors.map(a => ({
                id: a.id,
                name: a.name,
                birthDay: a.birthDay,
                deathDay: a.deathDay,
                ageYears: a.ageYears,
                cause: a.cause,
                survivors: a.survivors,
                definingCrucible: a.definingMoment?.title || 'Unknown',
                epitaph: a.epitaph
            })),
            epistemicLedger: {
                totalDispatches: LogDispatchManager.dispatches.length,
                recentDispatches: LogDispatchManager.dispatches.slice(0, 5)
            }
        };

        rootScope.EventBus?.emit('LEGACY_SAVE_EXPORTED', legacyDossier);
        rootScope.EventBus?.emit('UI_LOG', `ðŸ† [LEGACY] World Line Exported: Candidate ${candidate?.name || 'Wanderer'} stamped as True Origin Native.`);
        return legacyDossier;
    },

    getBedrockTelemetry(options = {}) {
        const revealed = ShadowInfluenceEngine.isEpitaphRevealed() || options.includeRevealedAnomalies === true;
        const liveVillages = (rootScope.VillageManager?.villages || []).slice(0, 20);

        if (liveVillages.length === 0) {
            // Filter out Epitaph (21st physical node) while Fallen-Era Illusion Runes hold (blindSpotEntropy < 85),
            // strictly returning 20 surface settlements ("a score of places": 1 Crown Seat + 19 Houses).
            const baseList = CANONICAL_BEDROCK_SETTLEMENTS
                .filter(s => revealed || !s.hiddenGapKeeper)
                .map(s => ({ ...s }));
            return options.allowTwentyFirst && revealed ? baseList : baseList.slice(0, 20);
        }

        // If live VillageManager is active (20 slots where index 7 is Epitaph), mask slot 7 behind
        // Fallen-Era Illusion Runes until blindSpotEntropy >= 85.
        return liveVillages.map(v => {
            const isEpitaph = v.hiddenGapKeeper || v.name === 'Epitaph';
            if (isEpitaph && !revealed) {
                return {
                    id: v.id,
                    name: "Aegis Rest (Outer Ward)",
                    house: "Crown Outer Sanctuary",
                    industry: "spatial_stabilization",
                    population: 6400,
                    barrierFuel: 50,
                    chainsIntegrity: 100,
                    maskedByFallenEraRunes: true
                };
            }
            return {
                id: v.id,
                name: v.name,
                house: v.nobleHouse || 'Unblessed',
                industry: v.industry?.produces || v.produces || 'raw_goods',
                population: v.population?.current || 5000,
                barrierFuel: isEpitaph ? 0 : (v.stats?.essence ?? 14),
                chainsIntegrity: v.barrierIntegrity ?? 100,
                hiddenGapKeeper: Boolean(isEpitaph)
            };
        });
    },

    getPhysicalBedrockRegistry() {
        // Returns the raw 21-settlement physical data layer (20 surface + Settlement #7 Epitaph)
        return CANONICAL_BEDROCK_SETTLEMENTS.map(s => ({ ...s }));
    },

    warBoardState: null,

    _defaultWarBoard() {
        return [
            { name: "House Aethel", monopoly: "Royal Crucible Fuel", blessed: true, status: "PEACE", power: 95 },
            { name: "House Terminus", monopoly: "Horizon Gate Defense", blessed: true, status: "MOBILIZED", power: 90 },
            { name: "House Oakheart", monopoly: "14-Day Ironwood", blessed: true, status: "SKIRMISH", power: 78 },
            { name: "House Gallows", monopoly: "Runic Dust & Tethers", blessed: true, status: "PEACE", power: 75 },
            { name: "House Widow", monopoly: "Siphon-Vine Cold Resins", blessed: true, status: "PEACE", power: 72 },
            { name: "House Blackwood", monopoly: "Slag-Weevil Fluid", blessed: true, status: "SKIRMISH", power: 70 },
            { name: "House Ashen", monopoly: "Basalt Tablets", blessed: true, status: "PEACE", power: 68 },
            { name: "House Shadowfen", monopoly: "Pre-Fuel Matrix Synthesis", blessed: true, status: "PEACE", power: 66 },
            { name: "House Bleak", monopoly: "Pale Cap Binders & Titan Bone", blessed: true, status: "PEACE", power: 65 },
            { name: "House Cull", monopoly: "Cardiac Catalysts", blessed: false, status: "WAR_PREP", power: 62 },
            { name: "House Mire", monopoly: "Fungal Binders", blessed: false, status: "SKIRMISH", power: 58 },
            { name: "House Hollow", monopoly: "Gator Leather Seals", blessed: false, status: "PEACE", power: 55 },
            { name: "House Crow", monopoly: "Whisper Guild Intel", blessed: false, status: "COVERT", power: 54 },
            { name: "House Thorn", monopoly: "Pacifying Wax", blessed: false, status: "PEACE", power: 50 },
            { name: "House Gloom", monopoly: "Gloom-Glass Alembics", blessed: false, status: "PEACE", power: 48 },
            { name: "House Dusken", monopoly: "Kinetic Silk", blessed: false, status: "PEACE", power: 46 },
            { name: "House Grim", monopoly: "50-Ton Anchor Chains", blessed: false, status: "PEACE", power: 45 },
            { name: "House Blightwatch", monopoly: "Parasite Antidotes", blessed: false, status: "DEFENSIVE", power: 42 },
            { name: "House Wraith", monopoly: "Abyssal Salvage Oil", blessed: false, status: "PEACE", power: 40 }
        ];
    },

    resetWarBoard() {
        this.warBoardState = this._defaultWarBoard();
        return this.warBoardState;
    },

    getWarBoard() {
        if (!Array.isArray(this.warBoardState) || this.warBoardState.length !== 19) {
            this.resetWarBoard();
        }
        return this.warBoardState;
    },

    mutateWarBoard(houseName, deltaPower = 0, newStatus = null) {
        const board = this.getWarBoard();
        const q = String(houseName || '').toLowerCase();
        let entry = board.find(h => h.name.toLowerCase() === q || h.name.toLowerCase().includes(q));
        if (!entry) {
            // Pick highest-power rival house not matching active player house
            const activeHouse = (this.state.house?.houseId || '').toLowerCase();
            entry = board.find(h => h.name !== 'House Aethel' && h.name.toLowerCase() !== activeHouse) || board[3];
        }
        if (entry) {
            entry.power = Math.max(10, Math.min(100, Math.round(entry.power + deltaPower)));
            if (newStatus) {
                entry.status = newStatus;
            } else if (deltaPower <= -5) {
                entry.status = entry.power >= 60 ? 'WAR_PREP' : 'SKIRMISH';
            } else if (deltaPower >= 5) {
                entry.status = 'ALLIED';
            }
            rootScope.EventBus?.emit('WAR_BOARD_MUTATED', { house: entry.name, power: entry.power, status: entry.status, deltaPower });
        }
        return entry;
    },

    tickDailyWarBoard(day) {
        const board = this.getWarBoard();
        const activeHouseId = this.campaignMode === 'HOUSE' ? this.state.house?.houseId : null;
        board.forEach((h, idx) => {
            if (activeHouseId && h.name === activeHouseId) {
                // Player's House power emergently reflects fuel, chains, favor, and squad power
                const sq = RoleStateMachine.computeSquadCapabilityMetrics();
                const fuelScore = (this.state.house.barrierFuelUnits || 0) * 0.6;
                const favorScore = (this.state.house.crownFavor || 50) * 0.4;
                const chainScore = (this.state.house.chainsIntegrity || 100) * 0.25;
                h.power = Math.max(15, Math.min(100, Math.round(fuelScore + favorScore + chainScore + sq.totalPower * 0.5)));
                return;
            }
            // Deterministic harmonic + status-based systemic flux (Engine Law #5: 70% scalar flux, 30% vector pressure)
            const wave = ((day + idx * 3) % 7 === 0) ? 1 : (((day + idx * 5) % 11 === 0) ? -1 : 0);
            if (h.status === 'WAR_PREP') {
                h.power = Math.max(20, Math.min(98, h.power + wave));
            } else if (h.status === 'SKIRMISH') {
                h.power = Math.max(15, Math.min(95, h.power - 1 + Math.max(0, wave)));
                if (day % 5 === 0 && h.power < 52) h.status = 'DEFENSIVE';
            } else if (h.status === 'DEFENSIVE' && h.power < 65) {
                h.power = Math.min(90, h.power + 1);
                if (h.power >= 55) h.status = 'PEACE';
            }
        });
    }
};
CampaignManager.init();
rootScope.CampaignManager = CampaignManager;

// ============================================================================
// 5.5 SHADOW INFLUENCE & TEMPORAL RELATIVITY ENGINE (SETTLEMENT #7: EPITAPH)
// ============================================================================
const ShadowInfluenceEngine = rootScope.ShadowInfluenceEngine || {
    revealThreshold: 85,
    epitaphRevealed: false,

    // Temporal Relativity & Spatial Vistas (Addendum BY)
    relativity: {
        perceivedForestYears: 12000,
        objectiveYears: 18000,
        missingGapYears: 6000,
        voidDurationDays: 7,
        forestShiftCycleDays: 14,
        mountainRotationDegrees: 0,
        terminusUnderstandingConfidence: 0.95, // 95% trap: Terminus does not know the Mountains rotate during the 7-day Void
        crownKnowsBetrayal: true,
        crownKnowsMissingGap: false,
        terminusKnowsMissingGap: true,
        epitaphKnowsMissingGap: true
    },

    // Probabilistic Pressure State (Thumb on the scale, never deterministic override)
    pressure: {
        nobleMarkWeightBias: 0.28,        // +28% probabilistic nudge toward Founder-bloodline nobles claiming Huntsman's Mark
        commonerMarkWeightDampener: -0.22, // Steers common villagers away from the Spherical Idol
        huntsmanVectorBias: 0.20,         // Subtle route nudge toward Huntsman's path
        influencePool: 100,               // Finite Fallen-Era runic/operative bandwidth
        influenceRegenPerDay: 4,
        noblesNudgedToMark: 3,
        commonersDiverted: 11,
        noblesInterceptedByHuntsman: 1,
        totalMarkTrials: 4
    },

    // Tragic Unilateral Alignment Invariant
    alignment: {
        epitaphToKorvan: 'UNILATERAL_ALLY', // Supports the betrayed Champion who gave everything 18,000 years ago
        korvanToEpitaph: 'INDISCRIMINATE_PREY',
        korvanTrueAlignment: 'KORVAN_ONLY',
        korvanHasFreeWill: false
    },

    isEpitaphRevealed() {
        const entropy = CampaignManager?.state?.order?.blindSpotEntropy || 0;
        return this.epitaphRevealed || entropy >= this.revealThreshold;
    },

    revealEpitaph(currentEntropy = 85) {
        if (currentEntropy >= this.revealThreshold && !this.epitaphRevealed) {
            this.epitaphRevealed = true;
            rootScope.EventBus?.emit('REVEAL_EPITAPH_COORDINATES', {
                settlementId: 7,
                name: 'Epitaph',
                rKm: 185,
                entropy: currentEntropy
            });
        }
        return this.epitaphRevealed;
    },

    getMarkSelectionSkew() {
        if (this.pressure.totalMarkTrials <= 0) return 0.75;
        return this.pressure.noblesNudgedToMark / this.pressure.totalMarkTrials;
    },

    rollHuntsmanMarkCandidate(baseNobleProbability = 0.25, rngFn = Math.random) {
        this.pressure.totalMarkTrials++;
        let effectiveProb = baseNobleProbability;

        if (this.pressure.influencePool >= 12) {
            this.pressure.influencePool -= 12;
            effectiveProb = Math.min(0.88, baseNobleProbability + this.pressure.nobleMarkWeightBias);
        }

        const roll = rngFn();
        const nobleSelected = roll < effectiveProb;
        if (nobleSelected) {
            this.pressure.noblesNudgedToMark++;
            if (rngFn() < 0.35 + this.pressure.huntsmanVectorBias) {
                this.pressure.noblesInterceptedByHuntsman++;
            }
        } else {
            this.pressure.commonersDiverted++;
        }
        return { nobleSelected, effectiveProb, roll };
    },

    evaluateKorvanTarget(actor = {}) {
        return {
            isTarget: true,
            immune: false,
            perceivedByEpitaph: this.alignment.epitaphToKorvan,
            actualKorvanStance: this.alignment.korvanTrueAlignment,
            reason: "Korvan is only Korvan's ally (hasFreeWill: false). Epitaph operatives and Founder nobles are consumed identically."
        };
    },

    /**
     * Evaluates what an observer perceives near or far from the Mountain/Dune border
     * (Addendum BY Â§2: The 25-Mile Border Optical Mirage & Relative Rotation Law).
     */
    evaluateBorderPerception(observerRegion = 'mountain', milesFromBorder = 50, isDuringShiftVoid = false) {
        const reg = (observerRegion || 'mountain').toLowerCase();
        if (milesFromBorder > 25) {
            if (reg === 'mountain') {
                return {
                    canSeeAcrossBorder: false,
                    perceivedHorizon: 'ENDLESS_MOUNTAINS',
                    perceivedMotion: 'NONE',
                    description: 'Outside the 25-mile border threshold: optical mirage projects a never-ending mountain range forever.'
                };
            }
            return {
                canSeeAcrossBorder: false,
                perceivedHorizon: 'ENDLESS_DUNES',
                perceivedMotion: 'SLOW_OCEAN_DRIFT',
                description: 'Outside the 25-mile border threshold: optical mirage projects endless dunes forever with nothing beyond.'
            };
        }

        // Within 25 miles of the Mountain/Dune border
        if (!isDuringShiftVoid) {
            return {
                canSeeAcrossBorder: true,
                perceivedHorizon: reg === 'mountain' ? 'DUNES_BELOW_MOUNTAIN_WALL' : 'MOUNTAIN_WALL_ABOVE_DUNES',
                perceivedMotion: 'STATIC_BETWEEN_SHIFTS',
                description: 'Within 25 miles of the border between Shifts: terrain transition visible; Mountain Ring is static.'
            };
        }

        // Within 25 miles of the border DURING the 7-day White Void Shift
        if (reg === 'mountain') {
            return {
                canSeeAcrossBorder: true,
                perceivedHorizon: 'DUNES_BELOW_MOUNTAIN_WALL',
                perceivedMotion: 'DUNES_APPEAR_TO_ROTATE_AROUND_MOUNTAIN',
                description: 'Within 25 miles on the Mountains looking down during a Shift: relative to the mountain frame, it looks as if the sands are rotating around the mountain.'
            };
        }
        return {
            canSeeAcrossBorder: true,
            perceivedHorizon: 'MOUNTAIN_WALL_ABOVE_DUNES',
            perceivedMotion: 'MOUNTAIN_RING_ACTUALLY_SPINNING',
            description: 'Within 25 miles in the Dunes looking at the Mountains during a Shift: from the slow-motion sand ocean reference frame, the Mountain Ring itself is seen spinning.'
        };
    },

    tickDailyShadowOps(worldDay, campaignState = {}) {
        this.pressure.influencePool = Math.min(100, this.pressure.influencePool + this.pressure.influenceRegenPerDay);

        // Every 14 perceived Forest days, 7 objective days pass in the White Void:
        // Mountain & Dune observers experience those 7 days; the Mountain Ring rotates while reference points vanish.
        if (worldDay > 0 && worldDay % 14 === 0) {
            this.relativity.mountainRotationDegrees = Number(((this.relativity.mountainRotationDegrees + 5.4) % 360).toFixed(1));
            this.rollHuntsmanMarkCandidate(0.25);
        }

        if ((campaignState?.order?.blindSpotEntropy || 0) >= this.revealThreshold) {
            this.revealEpitaph(campaignState.order.blindSpotEntropy);
        }
    },

    formatGeneralLedgerAudit() {
        const entropy = CampaignManager?.state?.order?.blindSpotEntropy ?? 12;
        const revealed = this.isEpitaphRevealed();
        const skewPct = (this.getMarkSelectionSkew() * 100).toFixed(1);
        const commonerPct = (100 - Number(skewPct)).toFixed(1);

        return [
            `================================================================================`,
            `ðŸ•µï¸ THE GENERAL LEDGER: ROYAL ARCHIVE STATISTICAL & CASUALTY AUDIT`,
            `================================================================================`,
            `[1] OFFICIAL CHRONOLOGY & PARISH CENSUS`,
            `  â€¢ Royal Crucible Calendar:              Year ${this.relativity.perceivedForestYears} AF (14-Day Shift Cycle)`,
            `  â€¢ Registered Chained Settlements:       20 Active Parishes ("A Score of Places")`,
            `  â€¢ World-Wall Survey Confidence:         ${Math.round(this.relativity.terminusUnderstandingConfidence * 100)}% (Unexplained 5% marker variance post-Shift)`,
            ``,
            `[2] STATISTICAL ANOMALY â€” HUNTSMAN'S MARK (SPHERICAL IDOL) DISTRIBUTION`,
            `  â€¢ Observed Mark Recipients (Nobles):    ${skewPct}% Founder-Lineage Peers (Expected Baseline: 25.0%)`,
            `  â€¢ Observed Mark Recipients (Commoners): ${commonerPct}% Parish Commoners (Expected Baseline: 75.0%)`,
            `  â€¢ Auditor's Margin Note:                "Founder-bloodline heirs are claiming the Huntsman's Mark at`,
            `                                           statistically improbable rates while commoners turn back."`,
            ``,
            `[3] ARCHIVAL LEDGER INTEGRITY`,
            `  â€¢ Scraped-Vellum Discrepancy Index:     ${entropy}%`,
            `  â€¢ Parish Roll Audit Status:             ${revealed ? 'âš ï¸ BREACH: Unindexed 21st Parish Roll uncovered beneath scraped ink [Ref: Settlement #7]' : 'Nominal â€” All 20 surface parish rolls sealed under Crown wax.'}`,
            `================================================================================`
        ].join('\n');
    }
};
rootScope.ShadowInfluenceEngine = ShadowInfluenceEngine;

// ============================================================================
// 5.6 CRISIS RESPONSE TRIAGE & DAILY GOAL ENGINE
// ============================================================================
const CrisisEngine = rootScope.CrisisEngine || {
    minCrisisDayThreshold: 4,        // 4-day onboarding grace window before emergent crises & procedural collisions unlock
    minRealTimeElapsedMs: 30 * 60 * 1000,
    sessionStartedAtMs: Date.now(),
    volatilityIndex: 0,              // Builds gradually each day toward 100
    activeCrisis: null,
    pendingDreamIntervention: false, // Pre-emptive or active Dream Siphon ward against Crisis catastrophe
    nextDayGoal: 'MAINTAIN_WARDS',   // Decisive end-of-day strategic posture chosen by player
    crisisHistory: [],

    DAILY_GOALS: {
        MAINTAIN_WARDS: { id: 'MAINTAIN_WARDS', label: 'ðŸ›¡ï¸ Fortify Wards & Conserve Fuel', desc: '-1 Daily Fuel Burn; -3 Volatility buildup tomorrow.' },
        MAXIMIZE_MONOPOLY: { id: 'MAXIMIZE_MONOPOLY', label: 'âš™ï¸ Push Monopoly Output & Trade', desc: '+4 Resource/Fuel output tomorrow; +6 Industrial Volatility.' },
        SHADOW_INQUEST: { id: 'SHADOW_INQUEST', label: 'ðŸ•µï¸ Counter-Espionage & Ledger Audit', desc: '+15% Spy Detection; reduces Unrest & Scrutiny.' },
        AGGRESSIVE_SORTIE: { id: 'AGGRESSIVE_SORTIE', label: 'âš”ï¸ Boundary Sortie & Leverage', desc: '+20% Patrol/Raid yield tomorrow; +8 Volatility.' }
    },

    // Role-Specific End-of-Day Strategic Targets (Production Goals / Ambush Sites / Hunting Grounds)
    ROLE_DAILY_TARGETS: {
        NOBLE_HOUSE: [
            { id: 'PROD_MONOPOLY_SURPLUS', label: 'ðŸ­ Production Goal: Maximize Monopoly Extraction', supplyGain: '+6 House Monopoly Stock, +4 Barrier Fuel', desc: 'Overtime extraction of your House monopoly commodity.' },
            { id: 'PROD_CROWN_TITHE', label: 'ðŸ‘‘ Production Goal: Refine Crown Tithe Reserves', supplyGain: '+3 Barrier Fuel, +5% Crown Favor', desc: 'Prioritize pure fuel synthesis for the Royal Crucible.' },
            { id: 'PROD_CHAIN_FORGE', label: 'â›“ï¸ Production Goal: Reinforce 50-Ton Anchor Chains', supplyGain: '+10% Chains Integrity, +1 Squad Armor', desc: 'Divert foundry crews to anchor-link maintenance.' }
        ],
        TERMINUS: [
            { id: 'TERM_BRAZIER_STOCK', label: 'ðŸ”¥ Production Goal: Stockpile World-Wall Braziers', supplyGain: '+5 Barrier Fuel, +5% Chains Integrity', desc: 'Distill legal Horizon fuel reserves for the Gate.' },
            { id: 'TERM_BONE_CARVING', label: 'ðŸ¦´ Production Goal: Prepare Bone-Carving Crucibles', supplyGain: '+1 Guardian Cultivation Progress, +2 Squad Poise', desc: 'Refine runic marrow for the 300 Guardians.' }
        ],
        SYNDICATE: [
            { id: 'AMBUSH_SHADOWFEN_CONVOY', label: 'ðŸ—¡ï¸ Ambush Target: Shadowfen Pre-Fuel Convoy', supplyGain: '+14 Contraband Resin, +1 Gloom-Glass Lantern', desc: 'Rob the Shadowfenâ€“Capital chemical wagons for volatile resin.' },
            { id: 'AMBUSH_OAKHEART_WAIN', label: 'ðŸŒ² Ambush Target: Oakheart Ironwood Timber Wains', supplyGain: '+12 Ironwood Timber, +1 Oakheart Ironwood Spear', desc: 'Rob the Oakhavenâ€“Gallows logging road for heartwood weapons.' },
            { id: 'AMBUSH_CULL_TRAIN', label: 'ðŸ¥© Ambush Target: Cullfield Slaughter-Train', supplyGain: '+18 Salted Rations, +25 Gallows Toll Coin', desc: 'Rob the Cullfield meat-wagons for provisions and silver.' }
        ],
        SOVEREIGN: [
            { id: 'HUNT_TWILIGHT_VALLEYS', label: 'ðŸº Hunting Ground: Twilight Valleys (Stalk Noble Scions)', supplyGain: '+120 Significance, +0.4 Squad Stealth & Speed', desc: 'Train Heralds by hunting marked noble patrols in the valleys.' },
            { id: 'HUNT_SMOLDERING_CRAGS', label: 'ðŸª¨ Hunting Ground: Smoldering Crags (Gorge on Basalt-Beasts)', supplyGain: '+80 Significance, +0.5 Squad Toughness & Max HP', desc: 'Harden Herald bone-carapaces against crag-horrors.' },
            { id: 'HUNT_DROWNED_LOWLANDS', label: 'ðŸ©¸ Hunting Ground: Drowned Lowlands (Ambush Warden Outposts)', supplyGain: '+150 Significance, +0.5 Squad Melee Attack', desc: 'Blood the pack against heavily armed perimeter wardens.' }
        ],
        GUILD: [
            { id: 'GUILD_MIST_SWEEP', label: 'ðŸ§­ Contract Target: Outer Mist Marker Sweep', supplyGain: '+15 Guild Coin, +0.3 Squad Survival & Martial', desc: 'Clear corrupted road markers along the shifting paths.' },
            { id: 'GUILD_RELIC_ESCORT', label: 'ðŸ›¡ï¸ Contract Target: Basalt Vault Relic Escort', supplyGain: '+1 Armory Gear Piece, -4% Anomaly Entropy', desc: 'Escort sealed Directorate crates to the vault.' }
        ],
        MERCHANT: [
            { id: 'TRADE_RESIN_ARBITRAGE', label: 'âš–ï¸ Trade Goal: Widowâ€“Shadowfen Resin Arbitrage', supplyGain: '+20 Merchant Gold, +4 Candidate Significance', desc: 'Move cold-resin casks along high-margin warded roads.' },
            { id: 'TRADE_IRON_ARBITRAGE', label: 'âš’ï¸ Trade Goal: Blackwoodâ€“Grimsby Ore Arbitrage', supplyGain: '+15 Merchant Gold, +1 Grimsby Hauberk', desc: 'Broker deep-crust iron ore to the Grimsby foundries.' }
        ]
    },

    pendingDailyReconciliation: false,
    lastDayReport: null,

    CRISIS_CATALOG: [
        {
            id: 'wraith_deep_oil_fire',
            title: "ðŸ”¥ CRISIS AT WRAITH'S END: LEVIATHAN DEEP-OIL VAT FIRE",
            boundHouseId: 'House Wraith',
            boundSettlement: "Wraith's End",
            allowedRoles: ['NOBLE_HOUSE', 'SYNDICATE', 'GUILD'],
            description: "A rendering vat of pressurized Leviathan deep-oil and fish-blubber at Wraith's End (House Wraith) has ruptured near the boiler flues! Boiling abyssal oil is spilling across the iron dock grating toward the main storage casks.",
            choices: [
                {
                    id: 'WATER_BRIGADE',
                    label: 'ðŸ’§ Dispatch Squad with Water Buckets to Douse the Vats',
                    outcomeType: 'CATASTROPHIC_FLARE',
                    resolution: "ðŸ’¥ CATASTROPHIC FLARE! Cold water struck boiling Leviathan deep-oil, instantly flashing into a superheated steam-and-oil fireball! The explosion shattered three adjacent vats across Wraith's End (-14 Fuel, -15% Chains Integrity, squad severely burned)."
                },
                {
                    id: 'SMOTHER_SILT',
                    label: 'ðŸª¨ Order Dredge-Squad to Smother Vats with Heavy Caldera Silt & Seal Vents',
                    outcomeType: 'CONTAINED',
                    resolution: "âœ… FIRE SMOTHERED: Heavy damp caldera silt and iron hatch-covers starved the boiling fish-oil vats of oxygen without flashing. Refinery saved (+6 Crown Favor, +4 Salvaged Deep-Oil Fuel)."
                },
                {
                    id: 'JETTISON_CASKS',
                    label: 'âš“ Cut Winch-Chains & Dump Burning Vats into the Abyssal Trench',
                    outcomeType: 'PARTIAL_LOSS',
                    resolution: "âš ï¸ CONTAINED AT COST: The burning vats plunged into the black trench waters before reaching the main magazine. Docks saved, but -8 units of refined oil were lost."
                }
            ]
        },
        {
            id: 'gallows_sluice_ambush',
            title: "ðŸ—¡ï¸ CRISIS AT GALLOWS-GATE SLUICES: CROWN INSPECTOR BLOCKADE",
            boundHouseId: 'House Gallows',
            boundSettlement: "Gallows-Gate Sluices",
            allowedRoles: ['SYNDICATE'],
            description: "Crown Iron-Clad Assessors have dropped the portcullis chain across the lower sluice canal while three of your unstamped resin skiffs are trapped inside the lock!",
            choices: [
                {
                    id: 'RAM_THE_CHAIN',
                    label: 'â›µ Order Skiffs to Ram the Iron Toll-Chain at Full Oar',
                    outcomeType: 'CATASTROPHIC_FLARE',
                    resolution: "ðŸ’¥ HULLS CRUSHED! The 50-ton Grimsby iron chain sheared the prows off two skiffs; casks ruptured and sank (-20 Contraband Resin, -25 Toll)."
                },
                {
                    id: 'BRIBE_LOCKKEEPER',
                    label: 'ðŸ’° Bribe the Night Lock-Keeper & Flood the Side-Weir',
                    outcomeType: 'CONTAINED',
                    resolution: "âœ… SLIPPED THE NET: The side-weir flooded on signal, floating all three resin skiffs into the marsh fog unseen (+12 Contraband Resin, -10 Toll)."
                }
            ]
        }
    ],

    setNextDayGoal(goalId) {
        this.getTargetsForRole('SOVEREIGN');
        if (this.DAILY_GOALS[goalId]) {
            this.nextDayGoal = goalId;
            return { success: true, goal: this.DAILY_GOALS[goalId] };
        }
        for (const list of Object.values(this.ROLE_DAILY_TARGETS)) {
            const found = list.find(t => t.id === goalId);
            if (found) {
                this.nextDayGoal = found.id;
                this.pendingDailyReconciliation = false;
                return { success: true, goal: found };
            }
        }
        return { success: false };
    },

    getTargetsForRole(roleKey = 'NOBLE_HOUSE') {
        const r = (roleKey || 'NOBLE_HOUSE').toUpperCase();
        this.ROLE_DAILY_TARGETS.SOVEREIGN = [
            { id: 'CULT_AQUIFER_ROOTS', label: '🌿 Cultivation: Infiltrate Subterranean Aquifer Roots', supplyGain: '+180 Historical Weight, +0.4 Herald Stealth & Frost-Marrow', desc: 'Send Frost-Marrow tendrils along subterranean river filaments to drink from the 20 Chained Parishes.' },
            { id: 'HARVEST_NOBLE_ESSENCE', label: '🩸 Harvest: Gorge Frost-Heralds on Captured Noble Essence', supplyGain: '+240 Historical Weight, +0.5 Pack Savagery, -4 Rival House Power', desc: 'Devour the marrow and memories of marked noble patrols to accelerate Herald mutation.' },
            { id: 'CULT_VOID_FRACTURE', label: '🌌 Cultivation: Meditate in the White Void Fracture', supplyGain: '+300 Historical Weight, +15 Endured Years, +0.5 Carapace Toughness', desc: 'Draw 6,000-year blind-spot entropy directly into your Porcelain Bone Carapace.' }
        ];
        if (r === 'PALE_SOVEREIGN' || r === 'SOVEREIGN') return this.ROLE_DAILY_TARGETS.SOVEREIGN;
        return this.ROLE_DAILY_TARGETS[r] || this.ROLE_DAILY_TARGETS.NOBLE_HOUSE;
    },

    compileDailyReconciliation(day, activeRole = 'NOBLE_HOUSE') {
        const r = (activeRole || 'NOBLE_HOUSE').toUpperCase();
        const targets = this.getTargetsForRole(r);
        const chosen = targets.find(t => t.id === this.nextDayGoal) || targets[0];
        const h = CampaignManager.state.house;
        const o = CampaignManager.state.order;
        const syn = CampaignManager.state.syndicate;
        const pat = CampaignManager.state.patron;
        const sov = CampaignManager.state.sovereign;
        const sq = RoleStateMachine.computeSquadCapabilityMetrics();
        const facMult = RoleStateMachine.computeFacilityMultipliers();
        const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
        const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);

        let gains = chosen.supplyGain;
        let losses = `Standard Garrison Rations (-${Math.max(2, sq.count)} Food)`;

        if (r === 'NOBLE_HOUSE' || r === 'TERMINUS') {
            const burnCost = Math.max(1, 3 + (hMods.dailyFuelBurnDelta || 0));
            losses = `Barrier Brazier Burn (-${burnCost}u Fuel), Garrison Upkeep (-${Math.max(2, sq.count)} Rations)`;
            if (chosen.id === 'PROD_MONOPOLY_SURPLUS') {
                const fuelGain = Math.round(4 * facMult.productionMult * (hMods.stillEfficiencyMult || 1));
                const resGain = Math.round(6 * facMult.productionMult);
                h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + fuelGain);
                FacilityEngine.settlementResources += resGain;
                gains = `+${resGain} ${hMods.primaryCommodity || 'House Monopoly Stock'}, +${fuelGain} Barrier Fuel`;
            } else if (chosen.id === 'PROD_CROWN_TITHE') {
                const fuelGain = Math.round(3 * facMult.productionMult);
                const favorGain = 5 + (hMods.crownTitheFavorBonus || 0);
                h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + fuelGain);
                h.crownFavor = Math.min(100, h.crownFavor + favorGain);
                gains = `+${fuelGain} Barrier Fuel, +${favorGain}% Crown Favor`;
            } else if (chosen.id === 'PROD_CHAIN_FORGE') {
                const chainGain = Math.round(10 + (hMods.chainRepairBonus || 0) + facMult.barracksLv * 2);
                h.chainsIntegrity = Math.min(100, h.chainsIntegrity + chainGain);
                AgentRosterManager.squadArmoryStock.push('grimsby_plate');
                gains = `+${chainGain}% Chains Integrity, +1 Grimsby Runic-Dusted Hauberk`;
            } else if (chosen.id === 'TERM_BRAZIER_STOCK') {
                const fuelGain = Math.round(5 * facMult.productionMult);
                const chainGain = 5 + facMult.stillLv * 2;
                h.barrierFuelUnits = Math.min(maxFuel, h.barrierFuelUnits + fuelGain);
                h.chainsIntegrity = Math.min(100, h.chainsIntegrity + chainGain);
                gains = `+${fuelGain} Barrier Fuel, +${chainGain}% Chains Integrity`;
            } else if (chosen.id === 'TERM_BONE_CARVING') {
                AgentRosterManager.agents.forEach(a => {
                    if (!a.alive) return;
                    a.vitals.poise = Math.min(100, (a.vitals.poise || 60) + 2);
                    if (a.cultivation) a.cultivation.foundationFireDays = (a.cultivation.foundationFireDays || 0) + 1;
                });
                gains = `+1 Guardian Cultivation Progress, +2 Squad Poise`;
            }
        } else if (r === 'SYNDICATE') {
            losses = `Bribes & Lookout Cut (-6 Toll Coin), Barge Wear (-2 Resin)`;
            if (chosen.id === 'AMBUSH_SHADOWFEN_CONVOY') {
                const resinGain = Math.round((12 + sq.avgStealth) * facMult.covertMult);
                syn.contrabandResin += resinGain;
                AgentRosterManager.squadArmoryStock.push('gloom_lens_lantern');
                CampaignManager.mutateWarBoard('House Shadowfen', -3, 'SKIRMISH');
                gains = `+${resinGain} Contraband Resin, +1 Gloom-Glass Lantern`;
            } else if (chosen.id === 'AMBUSH_OAKHEART_WAIN') {
                const resinGain = Math.round((8 + sq.avgMartial) * facMult.covertMult);
                syn.contrabandResin += resinGain;
                FacilityEngine.settlementResources += 12;
                AgentRosterManager.squadArmoryStock.push('ironwood_spear');
                CampaignManager.mutateWarBoard('House Oakheart', -3, 'SKIRMISH');
                gains = `+12 Ironwood Timber, +${resinGain} Contraband Resin, +1 Oakheart Ironwood Spear`;
            } else if (chosen.id === 'AMBUSH_CULL_TRAIN') {
                const tollGain = Math.round((22 + sq.avgStealth * 1.5) * facMult.covertMult);
                syn.gallowsTollCollected += tollGain;
                CampaignManager.mutateWarBoard('House Cull', -4, 'WAR_PREP');
                gains = `+18 Salted Rations, +${tollGain} Gallows Toll Coin`;
            }
        } else if (r === 'GUILD' || r === 'ORDER') {
            losses = `Field Kit Wear (-3 Guild Coin), Ward-Torch Oil (-2u)`;
            if (chosen.id === 'GUILD_MIST_SWEEP') {
                const coinGain = Math.round((14 + sq.avgSurvival) * facMult.martialMult);
                FacilityEngine.settlementResources += coinGain;
                o.containedAnomalies++;
                AgentRosterManager.agents.forEach(a => {
                    if (!a.alive) return;
                    a.skills.survival = Number((a.skills.survival + 0.3).toFixed(2));
                    a.skills.meleeAtt = Number((a.skills.meleeAtt + 0.2).toFixed(2));
                });
                gains = `+${coinGain} Guild Coin, +1 Contained Anomaly, +0.3 Squad Survival`;
            } else if (chosen.id === 'GUILD_RELIC_ESCORT') {
                const entropyDrop = Math.round((4 + sq.avgLore * 0.5) * facMult.covertMult);
                o.blindSpotEntropy = Math.max(0, o.blindSpotEntropy - entropyDrop);
                AgentRosterManager.squadArmoryStock.push('gloom_lens_lantern');
                gains = `+1 Armory Gear Piece, -${entropyDrop}% Anomaly Entropy`;
            }
        } else if (r === 'MERCHANT' || r === 'PATRON') {
            losses = `Road Toll & Mule Feed (-5 Merchant Gold)`;
            if (chosen.id === 'TRADE_RESIN_ARBITRAGE') {
                const goldGain = Math.round((18 + sq.avgSurvival) * facMult.tradeMult);
                const sigGain = Math.round((4 + sq.avgLore * 0.5) * facMult.tradeMult);
                FacilityEngine.settlementResources += goldGain;
                pat.candidateSignificance += sigGain;
                CampaignManager.mutateWarBoard('House Widow', 2, 'PEACE');
                gains = `+${goldGain} Merchant Gold, +${sigGain} Candidate Significance`;
            } else if (chosen.id === 'TRADE_IRON_ARBITRAGE') {
                const goldGain = Math.round((14 + sq.avgSurvival) * facMult.tradeMult);
                FacilityEngine.settlementResources += goldGain;
                pat.verifiedTruths++;
                AgentRosterManager.squadArmoryStock.push('grimsby_plate');
                CampaignManager.mutateWarBoard('House Grim', 2, 'PEACE');
                gains = `+${goldGain} Merchant Gold, +1 Grimsby Hauberk, +1 Verified Truth`;
            }
        } else if (r === 'SOVEREIGN' || r === 'PALE_SOVEREIGN') {
            losses = `Deep-Bedrock Frost Torpor & Void Entropy Bleed (Zero Settlement Upkeep)`;
            let baseWeight = 180;
            let cultNote = 'Aquifer Root Infiltration';
            if (chosen.id === 'HARVEST_NOBLE_ESSENCE') {
                baseWeight = 240;
                cultNote = 'Noble Essence Harvest (-4 Rival House Power)';
                CampaignManager.mutateWarBoard('House Cull', -4, 'DEFENSIVE', 'Noble scions harvested in the mist by Frost-Heralds');
            } else if (chosen.id === 'CULT_VOID_FRACTURE') {
                baseWeight = 300;
                sov.yearsEndured = Number(((sov.yearsEndured || 0) + 15).toFixed(2));
                cultNote = 'White Void Fracture Cultivation (+15 Endured Years)';
            }
            const sigHarvest = Math.round((baseWeight + sq.avgMartial * 12) * facMult.martialMult);
            sov.significanceHarvested = (sov.significanceHarvested || 0) + sigHarvest;
            AgentRosterManager.agents.forEach(a => {
                if (!a.alive) return;
                if (chosen.id === 'CULT_AQUIFER_ROOTS') a.skills.stealth = Number((a.skills.stealth + 0.4).toFixed(2));
                if (chosen.id === 'CULT_VOID_FRACTURE') {
                    a.skills.toughness = Number((a.skills.toughness + 0.5).toFixed(2));
                    a.vitals.maxHp += 5;
                    a.vitals.hp += 5;
                }
                if (chosen.id === 'HARVEST_NOBLE_ESSENCE') a.skills.meleeAtt = Number((a.skills.meleeAtt + 0.5).toFixed(2));
            });
            gains = `+${sigHarvest} Historical Weight, ${cultNote}`;
        }

        // Award +1 Chrono-Seal Fragment automatically on each completed Daily Reconciliation
        const shardRes = FacilityEngine.addChronoSealFragments(1, 'End-of-Day Reconciliation Stipend');
        if (shardRes) {
            gains += ` | 💎 +1 Chrono-Fragment (${shardRes.fragments}/7${shardRes.sealsMinted > 0 ? ' -> ✨ +1 SEAL MINTED!' : ''})`;
        }

        this.lastDayReport = {
            day,
            role: r,
            executedGoal: chosen.label,
            gains,
            losses,
            availableNextTargets: targets
        };
        this.pendingDailyReconciliation = true;
        return this.lastDayReport;
    },

    isGracePeriodComplete(daysActive = 0, forceBypass = false) {
        if (forceBypass) return true;
        const elapsedMs = Date.now() - this.sessionStartedAtMs;
        return daysActive >= this.minCrisisDayThreshold || elapsedMs >= this.minRealTimeElapsedMs;
    },

    tickDailyVolatility(daysActive = 0, activeRole = 'NOBLE_HOUSE', houseState = {}) {
        const goal = this.nextDayGoal || 'MAINTAIN_WARDS';
        let deltaVol = 2.5;
        if (goal === 'MAINTAIN_WARDS') {
            deltaVol = 1.0;
            if (houseState.barrierFuelUnits !== undefined) houseState.barrierFuelUnits = Math.min(60, houseState.barrierFuelUnits + 1);
        } else if (goal === 'MAXIMIZE_MONOPOLY') {
            deltaVol = 5.5;
            if (houseState.barrierFuelUnits !== undefined) houseState.barrierFuelUnits = Math.min(60, houseState.barrierFuelUnits + 4);
        } else if (goal === 'SHADOW_INQUEST') {
            deltaVol = 1.5;
            if (houseState.crownScrutiny !== undefined) houseState.crownScrutiny = Math.max(0, houseState.crownScrutiny - 4);
        } else if (goal === 'AGGRESSIVE_SORTIE') {
            deltaVol = 6.5;
        }

        this.volatilityIndex = Math.min(100, Number((this.volatilityIndex + deltaVol).toFixed(1)));

        // Enforce 4-day grace period before any crisis event can interrupt
        if (!this.activeCrisis && this.isGracePeriodComplete(daysActive) && this.volatilityIndex >= 65) {
            this.triggerContextualCrisis(activeRole, houseState?.houseId);
        }
    },

    synthesizeEmergentCrisis(activeRole = 'NOBLE_HOUSE', activeHouseId = null) {
        const r = (activeRole || 'NOBLE_HOUSE').toUpperCase();
        const h = CampaignManager.state.house || {};
        const o = CampaignManager.state.order || {};
        const syn = CampaignManager.state.syndicate || {};
        const warBoard = CampaignManager.getWarBoard();
        const hostileRival = warBoard.find(w => w.name !== activeHouseId && (w.status === 'WAR_PREP' || w.status === 'SKIRMISH')) || { name: 'House Cull', power: 62, status: 'WAR_PREP' };
        const settlement = h.settlementName || syn.baseSettlement || "World's End Gate";

        if (activeHouseId === 'House Wraith') return this.CRISIS_CATALOG.find(c => c.id === 'wraith_deep_oil_fire');
        if (r === 'SYNDICATE' && (syn.contrabandResin || 0) >= 35) return this.CRISIS_CATALOG.find(c => c.id === 'gallows_sluice_ambush');

        if ((r === 'NOBLE_HOUSE' || r === 'TERMINUS') && (h.barrierFuelUnits <= 12 || h.chainsIntegrity < 75)) {
            return {
                id: `emergent_ward_starvation_${rootScope.EngineParams?.worldDay || 1}`,
                title: `🚨 EMERGENT WARD CRISIS AT ${settlement.toUpperCase()}: TETHER-CHAIN FRACTURE`,
                boundHouseId: activeHouseId || h.houseId,
                boundSettlement: settlement,
                allowedRoles: ['NOBLE_HOUSE', 'TERMINUS'],
                description: `Low barrier pressure (${h.barrierFuelUnits}u Fuel, ${h.chainsIntegrity}% Chains) allowed White Void frost to seize the 50-ton anchor links at ${settlement}!`,
                choices: [
                    { id: 'OVERDRIVE_BRAZIERS', label: '🔥 Force Cold-Draft Overburn on Unshielded Links', outcomeType: 'CATASTROPHIC_FLARE', resolution: `💥 THERMAL SHATTER! Rapid cold-draft ignition cracked two primary anchor links across ${settlement} (-14 Fuel, -15% Chains Integrity).` },
                    { id: 'DEPLOY_WARDEN_CREWS', label: '⛓️ Dispatch Garrison Squad with Runic Grease & Auxiliaries', outcomeType: 'CONTAINED', resolution: `✅ TETHERS STABILIZED: Squad wardens braced the capstans and sealed the frost-fissures (+6 Crown Favor, +4 Salvaged Fuel).` },
                    { id: 'VENT_RESERVE_CASKS', label: '⚠️ Dump Reserve Resin Directly into the Moat Trench', outcomeType: 'PARTIAL_LOSS', resolution: `⚠️ CONTAINED AT COST: Moat flare held the perimeter, but emergency resin reserves were consumed (-8 Fuel).` }
                ]
            };
        }
        return {
            id: `emergent_rival_sabotage_${rootScope.EngineParams?.worldDay || 1}`,
            title: `⚔️ BORDER CRISIS AT ${settlement.toUpperCase()}: ${hostileRival.name.toUpperCase()} SABOTAGE`,
            boundHouseId: hostileRival.name,
            boundSettlement: settlement,
            allowedRoles: ['NOBLE_HOUSE', 'TERMINUS', 'MERCHANT', 'SYNDICATE', 'SOVEREIGN', 'GUILD', 'ORDER'],
            description: `Operatives from ${hostileRival.name} (Posture: ${hostileRival.status}, Power: ${hostileRival.power}, Entropy: ${o.blindSpotEntropy || 12}%) planted bone-dust charges along ${settlement}!`,
            choices: [
                { id: 'WATER_BRIGADE', label: '💧 Flood the Magazine Sluices Without Disarming Detonators', outcomeType: 'CATASTROPHIC_FLARE', resolution: `💥 MAGAZINE DETONATION! Flooding triggered primers across ${settlement} (-14 Fuel, -15% Chains Integrity).` },
                { id: 'SMOTHER_SILT', label: '🛡️ Deploy Squad Wardens to Sever Fuse-Wires & Smother Charges', outcomeType: 'CONTAINED', resolution: `✅ SABOTAGE FOILED: Squad disarmed the ${hostileRival.name} charges (+6 Crown Favor, +4 Fuel).` },
                { id: 'JETTISON_CASKS', label: '⚓ Jettison Threatened Casks into the Outer Ditch', outcomeType: 'PARTIAL_LOSS', resolution: `⚠️ CONTAINED AT COST: Magazine saved, but jettisoned casks were lost (-8 Fuel).` }
            ]
        };
    },

    triggerContextualCrisis(activeRole = 'NOBLE_HOUSE', activeHouseId = null, forceCrisisId = null) {
        let candidate = null;
        if (forceCrisisId) {
            candidate = this.CRISIS_CATALOG.find(c => c.id === forceCrisisId);
        } else if (activeHouseId === 'House Wraith') {
            candidate = this.CRISIS_CATALOG.find(c => c.id === 'wraith_deep_oil_fire');
        } else {
            candidate = this.synthesizeEmergentCrisis(activeRole, activeHouseId);
        }
        if (candidate) {
            this.activeCrisis = {
                ...candidate,
                triggeredDay: rootScope.EngineParams?.worldDay || 1,
                isMitigationActive: Boolean(this.pendingDreamIntervention)
            };
            RoleStateMachine.transitionTo('CRISIS_TRIAGE');
            rootScope.EventBus?.emit('CRISIS_TRIGGERED', this.activeCrisis);
        }
        return this.activeCrisis;
    },

    triggerDreamIntervention(crisisId = null, resourceCost = 10) {
        const cost = Math.max(0, Number(resourceCost) || 10);
        const modeKey = (CampaignManager.campaignMode || 'HOUSE').toLowerCase();
        const roleState = CampaignManager.state[modeKey] || CampaignManager.state.house;

        if (typeof roleState.dreamSiphon !== 'number') {
            roleState.dreamSiphon = 30;
        }
        if (roleState.dreamSiphon < cost) {
            return {
                success: false,
                message: `Insufficient Dream Siphon reserves (${roleState.dreamSiphon}/${cost}u).`
            };
        }

        roleState.dreamSiphon -= cost;
        this.pendingDreamIntervention = true;

        if (this.activeCrisis && (!crisisId || this.activeCrisis.id === crisisId)) {
            this.activeCrisis.isMitigationActive = true;
        }

        // Apply symbolic prescience buff to living squad members (Poise & Shock stabilization)
        AgentRosterManager.agents.forEach(agent => {
            if (!agent.alive) return;
            agent.vitals.poise = Math.min(100, (agent.vitals.poise || 60) + 5);
            if (agent.reflexes) agent.reflexes.shock = Math.max(0, (agent.reflexes.shock || 0) - 10);
        });

        rootScope.EventBus?.emit('DREAM_INTERVENTION_TRIGGERED', {
            crisisId: crisisId || this.activeCrisis?.id || 'PREEMPTIVE_WARD',
            cost,
            remainingDreamSiphon: roleState.dreamSiphon
        });

        return {
            success: true,
            remainingDreamSiphon: roleState.dreamSiphon,
            isMitigationActive: true,
            message: `🌙 [DREAM INTERVENTION] Siphoned ${cost}u Dream-Resin (${roleState.dreamSiphon}u remaining). Squad Poise fortified; next Crisis catastrophe will be mitigated.`
        };
    },

    resolveActiveCrisis(choiceId) {
        if (!this.activeCrisis) return { success: false, message: "No active crisis to resolve." };
        const crisis = this.activeCrisis;
        let choice = crisis.choices.find(c => c.id === choiceId) || crisis.choices[0];
        const day = rootScope.EngineParams?.worldDay || 1;
        const h = CampaignManager.state.house;
        const syn = CampaignManager.state.syndicate;
        const mitigatedByDream = Boolean(crisis.isMitigationActive || this.pendingDreamIntervention || choiceId === 'DREAM_MITIGATE');

        let effectiveOutcomeType = choice.outcomeType;
        let effectiveResolution = choice.resolution;

        if (mitigatedByDream && (effectiveOutcomeType === 'CATASTROPHIC_FLARE' || choiceId === 'DREAM_MITIGATE')) {
            effectiveOutcomeType = 'MITIGATED';
            effectiveResolution = `🌙 [DREAM INTERVENTION MITIGATED] Prescient dream-wards guided the squad before disaster struck during ${crisis.title}. Catastrophic flare averted with minimal reserve drain.`;
        }

        if (effectiveOutcomeType === 'CATASTROPHIC_FLARE') {
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
            const fuelPenalty = Math.max(4, Math.round(14 / facMult.martialMult));
            const chainPenalty = Math.max(5, Math.round(15 * (hMods.chainDecayMult || 1)));

            if (CampaignManager.campaignMode === 'HOUSE') {
                h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - fuelPenalty);
                h.chainsIntegrity = Math.max(0, h.chainsIntegrity - chainPenalty);
            } else if (CampaignManager.campaignMode === 'SYNDICATE') {
                syn.contrabandResin = Math.max(0, syn.contrabandResin - 20);
                syn.gallowsTollCollected = Math.max(0, syn.gallowsTollCollected - 25);
            } else if (CampaignManager.campaignMode === 'ORDER') {
                CampaignManager.state.order.blindSpotEntropy = Math.min(100, (CampaignManager.state.order.blindSpotEntropy || 12) + 10);
            }
            const aliveAgents = Array.from(AgentRosterManager.agents.values()).filter(a => a.alive);
            const scarredAgent = aliveAgents.find(a => a.id === 'agt_2') || aliveAgents[0] || { id: 'agt_2', name: 'Garrison Operative' };
            if (scarredAgent.vitals) {
                scarredAgent.vitals.hp = Math.max(20, scarredAgent.vitals.hp - 15);
                scarredAgent.vitals.poise = Math.max(15, (scarredAgent.vitals.poise || 60) - 12);
            }
            CrucibleNarrativeEngine.recordCrucible(scarredAgent.id, {
                day,
                type: 'CRISIS_CATASTROPHE',
                title: crisis.title,
                location: crisis.boundSettlement,
                catalyst: `Ordered [${choice.label}] during ${crisis.title}.`,
                fallout: effectiveResolution,
                scar: `Bears burn-scars from the ${crisis.boundSettlement} catastrophe.`
            });
        } else if (effectiveOutcomeType === 'MITIGATED') {
            if (CampaignManager.campaignMode === 'HOUSE') {
                h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - 3);
                h.crownFavor = Math.min(100, h.crownFavor + 2);
            } else if (CampaignManager.campaignMode === 'SYNDICATE') {
                syn.contrabandResin = Math.max(0, syn.contrabandResin - 4);
            }
            this.pendingDreamIntervention = false;
        } else if (effectiveOutcomeType === 'CONTAINED') {
            const sq = RoleStateMachine.computeSquadCapabilityMetrics();
            const facMult = RoleStateMachine.computeFacilityMultipliers();
            const bonusFuel = Math.round((4 + (sq.avgSurvival - 2) * 0.5) * facMult.productionMult);
            if (CampaignManager.campaignMode === 'HOUSE') {
                h.crownFavor = Math.min(100, h.crownFavor + 6);
                h.barrierFuelUnits = Math.min(60, h.barrierFuelUnits + bonusFuel);
            } else if (CampaignManager.campaignMode === 'SYNDICATE') {
                syn.contrabandResin += Math.round(12 * facMult.covertMult);
            } else if (CampaignManager.campaignMode === 'ORDER') {
                CampaignManager.state.order.containedAnomalies++;
                CampaignManager.state.order.blindSpotEntropy = Math.max(0, CampaignManager.state.order.blindSpotEntropy - 6);
            }
            if (crisis.boundHouseId && crisis.boundHouseId !== h.houseId) {
                CampaignManager.mutateWarBoard(crisis.boundHouseId, -4, 'DEFENSIVE');
            }
        } else if (effectiveOutcomeType === 'PARTIAL_LOSS') {
            if (CampaignManager.campaignMode === 'HOUSE') {
                h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - 8);
            }
        }

        RoleStateMachine.transitionTo('FIELD_OPERATIONS');

        LogDispatchManager.dispatches.unshift({
            id: `crisis_res_${day}_${Date.now()}`,
            day,
            type: `CRISIS AFTERMATH [${effectiveOutcomeType}]`,
            sender: `${crisis.boundSettlement} Emergency Watch`,
            title: crisis.title,
            body: effectiveResolution,
            read: false
        });

        this.crisisHistory.push({ crisisId: crisis.id, choiceId: choice.id, outcomeType: effectiveOutcomeType, day });
        this.activeCrisis = null;
        this.volatilityIndex = 20;
        return { success: true, outcomeType: effectiveOutcomeType, message: effectiveResolution };
    },

    getDirectivesForRole(roleKey = 'NOBLE_HOUSE') {
        const r = (roleKey || 'NOBLE_HOUSE').toUpperCase();
        const isSov = (r === 'SOVEREIGN' || r === 'PALE_SOVEREIGN');
        const fac = FacilityEngine.facilities;
        const factCount = RealityEditorVault.facts?.length || 0;
        const dirs = isSov
            ? [
                [`window.viewTruthVault()`, `📜 Harvested Truths & Relics (${factCount})`],
                [`window.viewTelemetry()`, '🏛️ Survey 20 Bedrock Prey Parishes']
            ]
            : [
                [`window.viewFacilities()`, '🏗️ Base Upgrades & Facilities'],
                [`window.viewTruthVault()`, `📜 Truth & Relic Vault (${factCount})`],
                [`window.viewTelemetry()`, '🏛️ 20 Bedrock Settlements']
            ];

        // Base Start: Everyone (except Sovereign) can send Unguarded Trade Caravans from Day 1
        if (!isSov) {
            dirs.push([`window.sendExpedition('UNGUARDED_CARAVAN','Oakhaven')`, '📦 Send Unguarded Caravan']);
        }

        // Emergent Feral Wendigo Perimeter Hunt (Appears whenever a Starved+Frozen actor rises on the Shift)
        if ((AgentRosterManager.spawnedFeralWendigos?.length || 0) > 0 && !isSov) {
            const topFeral = AgentRosterManager.spawnedFeralWendigos[0];
            dirs.push([`window.dispatchCmd('HUNT_FERAL_WENDIGO')`, `🩸 Hunt ${topFeral.name}`]);
        }

        // Guard Barracks Unlock: Unlocks Guarded Caravans (uses regenerated Village Guards) & Squad Mist Patrols
        if (fac.guard_barracks?.unlocked && r !== 'SOVEREIGN') {
            dirs.push([`window.sendExpedition('GUARDED_CARAVAN','Oakhaven')`, 'ðŸ›¡ï¸ Send Guarded Caravan']);
            dirs.push([`window.sendExpedition('PATROL_MIST','Border Mist')`, 'ðŸ§­ Send Squad Patrol']);
        }

        // Inquest Chamber Unlock: Unlocks Inquest & General Ledger Statistical Audit
        if (fac.inquest_chamber?.unlocked) {
            dirs.push([`window.viewShadowLedger()`, 'ðŸ•µï¸ General Ledger Audit']);
            dirs.push([`window.interrogateSuspect()`, 'âš–ï¸ Inquest / Interrogate']);
        }

        // Role-specific core & facility-gated actions
        if (r === 'NOBLE_HOUSE' || r === 'TERMINUS') {
            dirs.push([`window.dispatchCmd('CROWN_FILL_FULL')`, 'Crown: Fill Full']);
            dirs.push([`window.dispatchCmd('CROWN_DENY')`, 'Crown: Deny']);
            if (fac.alchemical_still?.unlocked) {
                dirs.push([`window.dispatchCmd('REQUISITION_FUEL')`, 'âš—ï¸ Requisition Fuel']);
                if (r === 'TERMINUS') dirs.push([`window.dispatchCmd('DEVELOP_AUTARKY')`, 'Expand Horizon Stills']);
            }
            if (fac.war_table?.unlocked) {
                dirs.push([`window.viewWarBoard()`, 'ðŸ° 19-House War Board']);
                dirs.push([`window.sendExpedition('PROXY_RAID','Rival Convoy')`, 'âš”ï¸ Send Proxy Raid Squad']);
                if (r === 'TERMINUS') dirs.push([`window.dispatchCmd('CULTIVATE_RUNIC','agt_1')`, 'ðŸ”¥ Cultivate 300 Guardian']);
            }
        } else if (r === 'SYNDICATE') {
            dirs.push([`window.sendExpedition('SMUGGLE_RESIN','Gallows Sluice')`, 'ðŸ›¶ Send Smuggler Skiff']);
            if (fac.war_table?.unlocked) {
                dirs.push([`window.viewWarBoard()`, 'ðŸ° 19-House War Board']);
                dirs.push([`window.dispatchCmd('EXTORT_HOUSE')`, 'ðŸ—¡ï¸ Extort House']);
                dirs.push([`window.dispatchCmd('PROXY_SABOTAGE')`, 'Sabotage Rival']);
            }
        } else if (r === 'GUILD') {
            if (fac.alchemical_still?.unlocked) {
                dirs.push([`window.dispatchCmd('AUDIT_ANOMALY')`, 'Audit Anomaly (12-B)']);
                dirs.push([`window.dispatchCmd('SCRUB_MONUMENT')`, 'Scrub Monolith']);
            }
        } else if (r === 'MERCHANT') {
            if (fac.alchemical_still?.unlocked) dirs.push([`window.dispatchCmd('VERIFY_TRUTH')`, 'Verify Ledger Truth']);
            if (fac.war_table?.unlocked) {
                dirs.push([`window.viewWarBoard()`, '🏰 19-House War Board']);
                dirs.push([`window.dispatchCmd('TRANSMIT_DREAM')`, 'Sponsor Candidate']);
            }
        } else if (r === 'SOVEREIGN' || r === 'PALE_SOVEREIGN') {
            const sovStage = RoleStateMachine.getSovereignEscalationStage();
            dirs.push([`window.dispatchCmd('HIBERNATE',25)`, '❄️ Brood in Frost (+25y / +250 Weight)']);
            dirs.push([`window.sendExpedition('SUMMON_HUNTSMAN','Twilight Valleys')`, '🐺 Stalk Lowlands (Bound Huntsman)']);
            if (sovStage.stage >= 1 || fac.war_table?.unlocked) {
                dirs.push([`window.dispatchCmd('MACABRE_COMMUNION')`, '🥩 Macabre Communion (Mutate Herald)']);
            }
            if (sovStage.stage >= 2 || fac.war_table?.unlocked) {
                dirs.push([`window.viewWarBoard()`, '🏰 19-House Prey Board']);
                dirs.push([`window.dispatchCmd('HERALD_PACK_RAID','House Cull')`, '🩸 Herald Pack Raid (-18 House Power)']);
            }
            if (sovStage.stage >= 3 || (CampaignManager.state.sovereign?.yearsEndured >= 1000 && CampaignManager.state.sovereign?.heraldsMutated >= 5)) {
                dirs.push([`window.dispatchCmd('ASCEND_SOVEREIGN')`, '👑 Shatter Chains (Ascend Void Emperor)']);
                dirs.push([`window.dispatchCmd('APOCALYPTIC_HARVEST','House Gallows')`, '💀 Apocalyptic Harvest (Destroy Settlement)']);
            }
        }
        return dirs;
    }
};
rootScope.CrisisEngine = CrisisEngine;

// ============================================================================
// 5.7 BASE UPGRADE & VILLAGE GUARD PROSPERITY ENGINE
// ============================================================================
const FacilityEngine = rootScope.FacilityEngine || {
    settlementProsperity: 65,
    settlementResources: 35,
    villageGuardsCurrent: 6,
    villageGuardsMaxThreshold: 12,
    chronoSeals: 3, // Mobile Microtransaction / Royal Chrono-Seal tokens for full-day instant skip

    facilities: {
        scriptorium: {
            id: 'scriptorium',
            name: 'ðŸ“œ Archive Scriptorium & Trade Post',
            level: 1,
            unlocked: true,
            cost: 0,
            unlocksDesc: 'Base Start: Allows Census Telemetry & Unguarded Trade Caravans.'
        },
        guard_barracks: {
            id: 'guard_barracks',
            name: 'ðŸ›¡ï¸ Garrison Barracks & Watchtower',
            level: 0,
            unlocked: false,
            cost: 8,
            unlocksDesc: 'Unlocks Guarded Trade Caravans, Squad Mist Patrols & raises Village Guard cap to 24.'
        },
        inquest_chamber: {
            id: 'inquest_chamber',
            name: 'âš–ï¸ Inquest & Statistical Audit Chamber',
            level: 0,
            unlocked: false,
            cost: 10,
            unlocksDesc: 'Unlocks Suspect Interrogation Desk & General Ledger Statistical Audit.'
        },
        alchemical_still: {
            id: 'alchemical_still',
            name: 'âš—ï¸ Alchemical Still & Assay Vault',
            level: 0,
            unlocked: false,
            cost: 12,
            unlocksDesc: 'Unlocks Fuel Requisition, Domestic Stills, Anomaly 12-B Audits & Truth Verification.'
        },
        war_table: {
            id: 'war_table',
            name: 'ðŸ° Grand War Table & Crucible Sanctum',
            level: 0,
            unlocked: false,
            cost: 15,
            unlocksDesc: 'Unlocks 19-House War Board, Proxy Raid Squads, House Extortion & Runic Cultivation.'
        },
        armory_market: {
            id: 'armory_market',
            name: '⚔️ Armory & Weaponry Exchange Market',
            level: 0,
            unlocked: false,
            cost: 10,
            unlocksDesc: 'Unlocks Gear & Weapon Trading/Buying Market (Purchase & sell canonical weapons, armor & ward-trinkets; higher levels discount prices).'
        }
    },

    resetForNewRun() {
        this.settlementProsperity = 65;
        this.settlementResources = 35;
        this.villageGuardsCurrent = 6;
        this.villageGuardsMaxThreshold = 12;
        this.chronoSeals = 10;
        this.chronoSealFragments = 0;
        this.loginStreakDays = 0;
        this.lastDailyLoginClaimDay = 0;
        Object.values(this.facilities).forEach(f => {
            f.unlocked = false;
            f.level = 0;
            f.isConstructing = false;
            f.hoursRemaining = 0;
            f.totalHours = 0;
        });
        this.facilities.scriptorium.unlocked = true;
        this.facilities.scriptorium.level = 1;
    },

    unlockFacility(facilityId, instant = true) {
        const f = this.facilities[facilityId];
        if (!f) return { success: false, message: `Unknown facility: ${facilityId}` };
        const durationHours = Math.min(720, (f.level + 1) * 48);

        if (f.unlocked) {
            const upgradeCost = Math.max(6, Math.round((f.cost || 6) * (1 + f.level * 0.5)));
            if (this.settlementResources < upgradeCost) return { success: false, message: `Insufficient Settlement Resources (${this.settlementResources}/${upgradeCost}).` };
            this.settlementResources -= upgradeCost;
            if (!instant) {
                f.isConstructing = true;
                f.hoursRemaining = durationHours;
                f.totalHours = durationHours;
                f.targetLevel = f.level + 1;
                return { success: true, facility: f, message: `Started upgrading [${f.name}] to Lv ${f.targetLevel} (-${upgradeCost}r).` };
            }
            f.level += 1;
            this.settlementProsperity = Math.min(100, this.settlementProsperity + 8);
            if (facilityId === 'guard_barracks') this.villageGuardsMaxThreshold += 4;
            return { success: true, facility: f, message: `Upgraded [${f.name}] to Level ${f.level} (-${upgradeCost}r)! Prosperity: ${this.settlementProsperity}%.` };
        }

        if (this.settlementResources < f.cost) {
            return { success: false, message: `Insufficient Settlement Resources (${this.settlementResources}/${f.cost}) to construct ${f.name}.` };
        }
        this.settlementResources -= f.cost;
        if (!instant) {
            f.isConstructing = true;
            f.hoursRemaining = durationHours;
            f.totalHours = durationHours;
            f.targetLevel = 1;
            return { success: true, facility: f, message: `Started construction of [${f.name}].` };
        }
        f.unlocked = true;
        f.level = 1;
        this.settlementProsperity = Math.min(100, this.settlementProsperity + 10);
        if (facilityId === 'guard_barracks') {
            this.villageGuardsMaxThreshold += 6;
            this.villageGuardsCurrent = Math.min(this.villageGuardsMaxThreshold, this.villageGuardsCurrent + 4);
        }
        rootScope.EventBus?.emit('FACILITY_UNLOCKED', f);
        return { success: true, facility: f, message: `ðŸ—ï¸ Constructed [${f.name}]! ${f.unlocksDesc}` };
    },

    addChronoSealFragments(count = 1, reason = 'Daily Archivist Login') {
        const added = Math.max(1, parseInt(count, 10) || 1);
        this.chronoSealFragments = (this.chronoSealFragments || 0) + added;
        let sealsMinted = 0;
        while (this.chronoSealFragments >= 7) {
            this.chronoSealFragments -= 7;
            this.chronoSeals = (this.chronoSeals || 0) + 1;
            sealsMinted++;
        }
        const day = rootScope.EngineParams?.worldDay || 1;
        let msg = `💎 [CHRONO-FRAGMENT ACQUIRED] +${added} Chrono-Seal Fragment(s) from ${reason} (Progress: ${this.chronoSealFragments}/7 Fragments).`;
        if (sealsMinted > 0) {
            msg += ` ✨ [7/7 FRAGMENTS ASSEMBLED] Forged +${sealsMinted} full Royal Chrono-Seal(s)! (Total Seals: ${this.chronoSeals}💎).`;
            LogDispatchManager.dispatches.unshift({
                id: `seal_mint_${day}_${Date.now()}`,
                day,
                type: 'ROYAL CHRONO-SEAL FORGED',
                sender: 'Royal Crucible Mint',
                title: `7/7 Fragments Assembled -> +${sealsMinted} Royal Chrono-Seal`,
                body: msg,
                read: false
            });
        }
        return {
            success: true,
            added,
            fragments: this.chronoSealFragments,
            sealsMinted,
            chronoSeals: this.chronoSeals,
            message: msg
        };
    },

    claimDailyLoginFragments(forceClaim = false) {
        const day = rootScope.EngineParams?.worldDay || 1;
        if (!forceClaim && this.lastDailyLoginClaimDay === day) {
            return {
                success: false,
                fragments: this.chronoSealFragments || 0,
                chronoSeals: this.chronoSeals || 0,
                message: `Daily Log-In Fragment already claimed for Day ${day} AF (Current Fragments: ${this.chronoSealFragments || 0}/7 | Seals: ${this.chronoSeals || 0}💎).`
            };
        }
        this.lastDailyLoginClaimDay = day;
        this.loginStreakDays = (this.loginStreakDays || 0) + 1;
        const bonusFragments = (this.loginStreakDays % 7 === 0) ? 2 : 1;
        const res = this.addChronoSealFragments(bonusFragments, `Day #${this.loginStreakDays} Royal Auditor Log-In Check-In`);
        return {
            ...res,
            streak: this.loginStreakDays,
            message: `📅 [DAILY LOG-IN REWARD — STREAK DAY #${this.loginStreakDays}] ${res.message}`
        };
    },

    mintChronoSealFromResources(resCost = 10) {
        const cost = Math.max(5, parseInt(resCost, 10) || 10);
        if ((this.settlementResources || 0) < cost) {
            return {
                success: false,
                message: `Insufficient Settlement Resources (${this.settlementResources || 0}/${cost}u) to mint a Royal Chrono-Seal.`
            };
        }
        this.settlementResources -= cost;
        this.chronoSeals = (this.chronoSeals || 0) + 1;
        return {
            success: true,
            chronoSeals: this.chronoSeals,
            message: `💎 [ROYAL PROCUREMENT MINT] Exchanged -${cost}u Settlement Resources for +1 full Royal Chrono-Seal (Total: ${this.chronoSeals}💎).`
        };
    },

    tickDailyGuardGeneration() {
        this.settlementResources += 10;
        if (this.settlementProsperity >= 55 && this.settlementResources >= 30) {
            const regen = this.facilities.guard_barracks?.unlocked ? 3 : 2;
            const before = this.villageGuardsCurrent;
            this.villageGuardsCurrent = Math.min(this.villageGuardsMaxThreshold, this.villageGuardsCurrent + regen);
            return this.villageGuardsCurrent - before;
        }
        return 0;
    }
};
rootScope.FacilityEngine = FacilityEngine;

// ============================================================================
// 5.8 FALLOUT SHELTERâ€“STYLE EXPEDITION & FIELD LOG ENGINE
// ============================================================================
const ExpeditionEngine = rootScope.ExpeditionEngine || {
    activeExpeditions: [],
    completedLogs: [],

    computeExpeditionCombatProfile(exp) {
        const day = rootScope.EngineParams?.worldDay || 1;
        const shiftProximity = 14 - (day % 14);
        const shiftHazardBonus = shiftProximity <= 3 ? (4 - shiftProximity) * 4 : 0;
        const facMult = RoleStateMachine.computeFacilityMultipliers();
        const hMods = RoleStateMachine.getHouseModifiers(CampaignManager?.state?.house?.houseId);

        let missionBaseHazard = 12;
        if (exp.type === 'PROXY_RAID' || exp.type === 'SUMMON_HUNTSMAN') missionBaseHazard = 22;
        else if (exp.type === 'PATROL_MIST' || exp.type === 'SMUGGLE_RESIN') missionBaseHazard = 16;
        else if (exp.type === 'GUARDED_CARAVAN') missionBaseHazard = 14;

        const warBoard = CampaignManager?.getWarBoard?.() || [];
        const targetLower = String(exp.targetName || '').toLowerCase();
        const linkedHouse = warBoard.find(w => w.name.toLowerCase().includes(targetLower) || targetLower.includes(w.name.replace('House ', '').toLowerCase()));
        const warHazardBonus = linkedHouse?.status === 'WAR_PREP' ? 8 : (linkedHouse?.status === 'SKIRMISH' ? 4 : 0);
        const feralHazardBonus = (AgentRosterManager.spawnedFeralWendigos?.length || 0) * 4;
        const mistrustBonus = (RealityEditorVault?.worldQualities?.rivalMistrust || 0) * 2;

        const hazardRating = Math.round((missionBaseHazard + shiftHazardBonus + warHazardBonus + feralHazardBonus + mistrustBonus) * (hMods.volatilityDampener || 1));

        let agt = exp.leadAgentId && AgentRosterManager.agents.get(exp.leadAgentId);
        let agentPower = 6;
        let equippedSummary = [];
        if (agt && agt.alive) {
            const sk = agt.skills || {};
            const scarCombatBonus = (agt.scars?.length || 0) * 1.5;
            agentPower = Number(sk.meleeAtt || 2) + Number(sk.meleeDef || 2) + Number(sk.survival || 2) + Number(sk.stealth || 2) * 0.5 + scarCombatBonus;
            const eq = agt.equipment || {};
            if (eq.weapon) equippedSummary.push(eq.weapon.name);
            if (eq.armor) equippedSummary.push(eq.armor.name);
            if (eq.trinket) equippedSummary.push(eq.trinket.name);
            if (agt.birthright?.scoutBonus) agentPower += 3;
            if (agt.birthright?.attackBonus) agentPower += 2;
        }

        const guardDefense = (exp.guardsAssigned || 0) * (4 + facMult.barracksLv * 1.5) + (exp.guarded ? 6 : 0);
        const squadDefense = Math.round((agentPower + guardDefense) * facMult.martialMult);

        return {
            hazardRating,
            squadDefense,
            netAdvantage: squadDefense - hazardRating,
            shiftProximity,
            equippedSummary,
            agent: agt || null
        };
    },

    launchExpedition(missionType = 'UNGUARDED_CARAVAN', targetName = 'Oakhaven') {
        const type = (missionType || 'UNGUARDED_CARAVAN').toUpperCase();
        const day = rootScope.EngineParams?.worldDay || 1;
        let guarded = false;
        let guardsAssigned = 0;
        let totalHours = 8;

        if (type === 'GUARDED_CARAVAN') {
            if (!FacilityEngine.facilities.guard_barracks?.unlocked) {
                return { success: false, message: "Guarded Caravans locked! Construct the [Garrison Barracks & Watchtower] first." };
            }
            if (FacilityEngine.villageGuardsCurrent < 2) {
                return { success: false, message: "Insufficient regenerated Village Guards (Requires 2). Wait for settlement prosperity/resources to refill guards." };
            }
            guarded = true;
            guardsAssigned = 2;
            FacilityEngine.villageGuardsCurrent -= 2;
            totalHours = 8;
        } else if (type === 'PATROL_MIST' || type === 'PROXY_RAID' || type === 'SMUGGLE_RESIN' || type === 'SUMMON_HUNTSMAN') {
            totalHours = 6;
            guarded = true;
        }

        const availableAgents = Array.from(AgentRosterManager.agents.values()).filter(a => a.alive && a.operatingStance?.mode !== 'OUT_ON_MISSION');
        const leadAgent = (type === 'UNGUARDED_CARAVAN') ? null : (availableAgents[0] || null);
        if (leadAgent) {
            leadAgent.operatingStance = { mode: 'OUT_ON_MISSION', discipline: null, task: type, daysTrained: 0 };
        }

        const exp = {
            id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            type,
            targetName,
            guarded,
            guardsAssigned,
            cargoIntegrity: 100,
            hazardEncounters: 0,
            leadAgentId: leadAgent?.id || null,
            leadAgentName: leadAgent?.name || (guarded ? 'Village Guard Escort' : 'Unarmed Drover Crew'),
            startedDay: day,
            hoursElapsed: 0,
            totalHours,
            status: 'OUTBOUND',
            logs: [
                `[00:00] ${leadAgent ? leadAgent.name : 'Caravan Drovers'} departed gates for ${targetName} (${guarded ? `Guarded Escort: ${guardsAssigned || 2} Guards` : '⚠️ UNGUARDED — Vulnerable to Mist Raiders'}).`
            ]
        };

        const profile = this.computeExpeditionCombatProfile(exp);
        exp.hazardRating = profile.hazardRating;
        exp.squadDefense = profile.squadDefense;

        this.activeExpeditions.unshift(exp);
        return {
            success: true,
            expedition: exp,
            message: `🧭 Dispatched [${type}] to ${targetName} (${exp.leadAgentName} | Def: ${exp.squadDefense} vs Hazard: ${exp.hazardRating}). Est: ${totalHours}h.`
        };
    },

    tickExpeditionHours(hours = 1) {
        const step = Math.max(1, parseInt(hours, 10) || 1);
        const day = rootScope.EngineParams?.worldDay || 1;
        const h = CampaignManager.state.house;
        const o = CampaignManager.state.order;
        const syn = CampaignManager.state.syndicate;
        const pat = CampaignManager.state.patron;
        const sov = CampaignManager.state.sovereign;
        const facMult = RoleStateMachine.computeFacilityMultipliers();
        const hMods = RoleStateMachine.getHouseModifiers(h.houseId);

        this.activeExpeditions = this.activeExpeditions.filter(exp => {
            for (let i = 0; i < step; i++) {
                exp.hoursElapsed++;
                const hh = String(exp.hoursElapsed).padStart(2, '0');
                const profile = this.computeExpeditionCombatProfile(exp);
                const agt = profile.agent;

                if (exp.status === 'RETURNING_EARLY') {
                    exp.returnHoursRemaining = Math.max(0, (exp.returnHoursRemaining ?? 1) - 1);
                    if (exp.returnHoursRemaining > 0) {
                        exp.logs.push(`[${hh}:00] 🏃 Return march through the mist (${exp.returnHoursRemaining}h left to home gates | Salvaged Cargo: ${exp.salvagedFuelPending || 2}u).`);
                        continue;
                    } else {
                        exp.status = 'RECALLED_RETURNED';
                        const yieldFuel = exp.salvagedFuelPending || 2;
                        exp.logs.push(`[${hh}:00] 📯 Squad cleared the home gatehouse after recall march (+${yieldFuel}u salvaged cargo & field intel banked).`);
                        if (agt) {
                            agt.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
                            agt.skills.survival = Number((agt.skills.survival + 0.15).toFixed(2));
                        }
                        if (exp.guardsAssigned > 0) {
                            FacilityEngine.villageGuardsCurrent = Math.min(FacilityEngine.villageGuardsMaxThreshold, FacilityEngine.villageGuardsCurrent + exp.guardsAssigned);
                        }
                        LogDispatchManager.dispatches.unshift({
                            id: `exp_rec_done_${Date.now()}_${Math.random()}`,
                            day,
                            type: 'RECALLED SQUAD ARRIVAL',
                            sender: exp.leadAgentName,
                            title: `${exp.type} Completed Return March from ${exp.targetName}`,
                            body: exp.logs.join(' | '),
                            read: false
                        });
                        this.completedLogs.unshift(exp);
                        return false;
                    }
                }

                // Fallout Shelter hourly wasteland breadcrumb log for hours without major threshold events
                const isMajorThreshold = (exp.hoursElapsed === Math.ceil(exp.totalHours * 0.35)) || (exp.hoursElapsed === Math.ceil(exp.totalHours * 0.7)) || (exp.hoursElapsed >= exp.totalHours);
                if (!isMajorThreshold) {
                    const trailNotes = [
                        `Checked compass bearings along ${exp.targetName} runic chain-markers; scavenged +1 scrap iron cache in the peat.`,
                        `Crossed a sunken culvert half-swallowed by silver moss; outriders kept formation tight.`,
                        `Spotted fresh claw-gouges on a petrified ironwood trunk; ${exp.leadAgentName} doubled perimeter lookouts.`,
                        `Cleared damp ash from the wagon axles near milestone #${(exp.hoursElapsed % 7) + 1}; no casualties.`
                    ];
                    exp.logs.push(`[${hh}:00] 🧭 ${trailNotes[(exp.hoursElapsed + day) % trailNotes.length]}`);
                }

                if (exp.hoursElapsed === Math.ceil(exp.totalHours * 0.35)) {
                    exp.status = 'EN_ROUTE';
                    exp.hazardEncounters = (exp.hazardEncounters || 0) + 1;

                    if (profile.netAdvantage >= 0 || exp.guarded) {
                        const gearUsed = profile.equippedSummary.length > 0 ? ` [${profile.equippedSummary[0]}]` : '';
                        exp.logs.push(`[${hh}:00] ⚔️ Escort repelled a pack of bracken-hounds in the copper fog${gearUsed}; perimeter held (Def ${profile.squadDefense} vs Hazard ${profile.hazardRating}).`);
                        if (agt && agt.skills) {
                            agt.skills.meleeAtt = Number((agt.skills.meleeAtt + 0.15).toFixed(2));
                        }
                    } else {
                        const cargoLoss = Math.min(40, Math.max(10, Math.abs(profile.netAdvantage) * 3));
                        exp.cargoIntegrity = Math.max(20, (exp.cargoIntegrity ?? 100) - cargoLoss);
                        exp.logs.push(`[${hh}:00] ⚠️ Mist-stalkers shadowed the unguarded wagons near mile-stone four; drovers whipped the mules hard (-${Math.round(cargoLoss / 10)} Cargo lost | Integrity: ${exp.cargoIntegrity}%).`);
                        if (agt && agt.vitals) {
                            const hpLoss = Math.max(8, Math.abs(profile.netAdvantage) * 2);
                            agt.vitals.hp = Math.max(15, agt.vitals.hp - hpLoss);
                            agt.vitals.poise = Math.max(10, (agt.vitals.poise || 60) - 18);
                            if (agt.reflexes) agt.reflexes.shock = Math.min(100, (agt.reflexes.shock || 0) + 20);
                        }
                    }

                    if (agt && (agt.vitals.hp <= 25 || agt.vitals.poise <= 20)) {
                        exp.status = 'RETREATED';
                        exp.logs.push(`[${hh}:00] 🛡️ [WILL TO LIVE] ${agt.name} (HP: ${agt.vitals.hp}, Poise: ${Math.round(agt.vitals.poise)}) ordered an emergent tactical retreat from ${exp.targetName} to preserve squad lives!`);
                        agt.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
                        agt.skills.survival = Number((agt.skills.survival + 0.25).toFixed(2));
                        if (exp.guardsAssigned > 0) {
                            FacilityEngine.villageGuardsCurrent = Math.min(FacilityEngine.villageGuardsMaxThreshold, FacilityEngine.villageGuardsCurrent + Math.max(1, exp.guardsAssigned - 1));
                        }
                        CrucibleNarrativeEngine.recordCrucible(agt.id, {
                            day,
                            type: 'TACTICAL_RETREAT',
                            title: `The Fog-Line Retreat of ${exp.targetName}`,
                            location: `${exp.targetName} Approach Road`,
                            catalyst: `Ambushed at Hazard ${profile.hazardRating} vs Defense ${profile.squadDefense}.`,
                            fallout: `${agt.name} sounded the horn and withdrew the column before slaughter.`,
                            scar: `Wears a notched iron bracer from the ${exp.targetName} mist ambush.`
                        });
                        this.completedLogs.unshift(exp);
                        return false;
                    }
                } else if (exp.hoursElapsed === Math.ceil(exp.totalHours * 0.7)) {
                    exp.status = 'RETURNING';
                    exp.logs.push(`[${hh}:00] 📦 Reached ${exp.targetName} checkpoint. Loaded casks and turned back toward home gates.`);
                }
                if (exp.hoursElapsed >= exp.totalHours) {
                    exp.status = 'COMPLETED';
                    const integrityRatio = (exp.cargoIntegrity ?? 100) / 100;
                    const baseYield = exp.guarded ? 14 : 7;
                    const advantageBonus = Math.max(0, Math.round(profile.netAdvantage * 0.25));
                    const yieldFuel = Math.max(2, Math.round((baseYield + advantageBonus) * integrityRatio * (hMods.caravanYieldMult || 1) * facMult.tradeMult));

                    exp.logs.push(`[${hh}:00] ✅ Returned safely through the gatehouse (+${yieldFuel} Supply/Fuel secured).`);

                    if (agt) {
                        agt.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
                        agt.skills.survival = Number((agt.skills.survival + 0.3).toFixed(2));
                        if (exp.type === 'PROXY_RAID' || exp.type === 'SUMMON_HUNTSMAN') {
                            agt.skills.meleeAtt = Number((agt.skills.meleeAtt + 0.25).toFixed(2));
                        } else if (exp.type === 'SMUGGLE_RESIN' || exp.type === 'PATROL_MIST') {
                            agt.skills.stealth = Number((agt.skills.stealth + 0.25).toFixed(2));
                        }
                    }
                    if (exp.guardsAssigned > 0) {
                        FacilityEngine.villageGuardsCurrent = Math.min(FacilityEngine.villageGuardsMaxThreshold, FacilityEngine.villageGuardsCurrent + exp.guardsAssigned);
                    }

                    const mode = CampaignManager.campaignMode;
                    if (mode === 'SYNDICATE') {
                        syn.contrabandResin += yieldFuel;
                        syn.gallowsTollCollected += Math.round(yieldFuel * 0.5);
                    } else if (mode === 'ORDER') {
                        o.containedAnomalies++;
                        o.blindSpotEntropy = Math.max(0, o.blindSpotEntropy - Math.max(2, Math.round(yieldFuel * 0.3)));
                        FacilityEngine.settlementResources += yieldFuel;
                    } else if (mode === 'PATRON') {
                        pat.candidateSignificance += Math.max(3, Math.round(yieldFuel * 0.5));
                        FacilityEngine.settlementResources += yieldFuel;
                    } else if (mode === 'SOVEREIGN') {
                        sov.significanceHarvested = (sov.significanceHarvested || 0) + yieldFuel * 12;
                    } else {
                        const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);
                        h.barrierFuelUnits = Math.min(maxFuel, (h.barrierFuelUnits || 0) + yieldFuel);
                        FacilityEngine.settlementResources += 6;
                    }

                    if (exp.type === 'PROXY_RAID') {
                        CampaignManager.mutateWarBoard(exp.targetName, -4, 'SKIRMISH');
                    } else if (exp.type === 'GUARDED_CARAVAN' || exp.type === 'UNGUARDED_CARAVAN') {
                        CampaignManager.mutateWarBoard(exp.targetName, 2, 'PEACE');
                    }

                    RealityEditorVault.discoverFact({
                        title: `${exp.targetName} Field Recon & Toll Manifest`,
                        source: `${exp.leadAgentName} (${exp.type} Return)`,
                        targetHouse: exp.targetName,
                        valueFuel: Math.max(8, Math.round(yieldFuel * 0.8)),
                        valueRes: 14,
                        costPaid: `${exp.totalHours}h Field March (${exp.cargoIntegrity ?? 100}% Cargo Integrity)`
                    });

                    LogDispatchManager.dispatches.unshift({
                        id: `exp_done_${Date.now()}_${Math.random()}`,
                        day,
                        type: 'EXPEDITION RETURN LOG',
                        sender: exp.leadAgentName,
                        title: `${exp.type} Returned from ${exp.targetName}`,
                        body: exp.logs.join(' | '),
                        read: false
                    });
                    this.completedLogs.unshift(exp);
                    return false;
                }
            }
            return true;
        });
    },

    recallExpedition(expId = null, instant = false) {
        const idx = expId ? this.activeExpeditions.findIndex(e => e.id === expId) : 0;
        if (idx < 0 || !this.activeExpeditions[idx]) {
            return { success: false, message: "No active expedition in the field to recall." };
        }
        const exp = this.activeExpeditions[idx];
        const day = rootScope.EngineParams?.worldDay || 1;
        const elapsed = Math.max(1, exp.hoursElapsed || 1);
        const hh = String(exp.hoursElapsed || 0).padStart(2, '0');
        const progressRatio = Math.max(0.20, Math.min(0.90, elapsed / (exp.totalHours || 6)));
        const integrityRatio = (exp.cargoIntegrity ?? 100) / 100;
        const baseYield = exp.guarded ? 14 : 7;
        const salvagedFuel = Math.max(2, Math.round(baseYield * progressRatio * integrityRatio * 0.65));

        const h = CampaignManager.state.house;
        const o = CampaignManager.state.order;
        const syn = CampaignManager.state.syndicate;
        const pat = CampaignManager.state.patron;
        const sov = CampaignManager.state.sovereign;
        const hMods = RoleStateMachine.getHouseModifiers(h.houseId);
        const maxFuel = 60 + (hMods.maxFuelStorageBonus || 0);

        if (!exp.salvageCredited) {
            exp.salvageCredited = true;
            exp.salvagedFuelPending = salvagedFuel;
            const mode = CampaignManager.campaignMode;
            if (mode === 'SYNDICATE') syn.contrabandResin += salvagedFuel;
            else if (mode === 'ORDER') FacilityEngine.settlementResources += salvagedFuel;
            else if (mode === 'PATRON') FacilityEngine.settlementResources += salvagedFuel;
            else if (mode === 'SOVEREIGN') sov.significanceHarvested = (sov.significanceHarvested || 0) + salvagedFuel * 10;
            else h.barrierFuelUnits = Math.min(maxFuel, (h.barrierFuelUnits || 0) + salvagedFuel);
            FacilityEngine.settlementResources += 3;
        }

        const fieldFinds = [
            `ambushed a lone mist-scavenger at mile-post ${elapsed} and stripped +${salvagedFuel}u resin & +3 scrap supplies before wheeling back`,
            `recovered an abandoned survey crate in the bracken (+${salvagedFuel}u salvaged fuel & +3 resources) and sounded the recall horn`,
            `skirmished with border outriders near ${exp.targetName} approach, securing +${salvagedFuel}u cargo before turning the column around`
        ];
        const encounterNote = fieldFinds[(elapsed + day) % fieldFinds.length];

        if (!instant && exp.status !== 'RETURNING_EARLY' && (exp.hoursElapsed || 0) > 0) {
            exp.status = 'RETURNING_EARLY';
            exp.returnHoursRemaining = elapsed;
            exp.totalHours = elapsed * 2;
            const turnMsg = `[${hh}:00] 📯 [RECALL HORN SOUNDED — FALLOUT SHELTER RETURN MARCH] ${exp.leadAgentName} halted the march to ${exp.targetName} at hour ${elapsed}h, ${encounterNote}. Marching back to gates (${exp.returnHoursRemaining}h return trek).`;
            exp.logs.push(turnMsg);
            LogDispatchManager.dispatches.unshift({
                id: `exp_recall_${Date.now()}_${Math.random()}`,
                day,
                type: 'FIELD RECALL LOG',
                sender: exp.leadAgentName,
                title: `Recall Ordered: ${exp.type} Turning Back from ${exp.targetName} (${exp.returnHoursRemaining}h Trek)`,
                body: turnMsg,
                read: false
            });
            return { success: true, expedition: exp, salvagedFuel, returnHoursRemaining: exp.returnHoursRemaining, message: turnMsg };
        }

        // If already returning early and clicked again (or instant=true / 0h elapsed), complete return immediately
        this.activeExpeditions.splice(idx, 1);
        if (exp.leadAgentId) {
            const agt = AgentRosterManager.agents.get(exp.leadAgentId);
            if (agt) agt.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
        }
        if (exp.guardsAssigned > 0) {
            FacilityEngine.villageGuardsCurrent = Math.min(FacilityEngine.villageGuardsMaxThreshold, FacilityEngine.villageGuardsCurrent + exp.guardsAssigned);
        }

        exp.status = 'RECALLED';
        const msg = `[${hh}:00] 📯 [EARLY RECALL COMPLETED] ${exp.leadAgentName} returned from ${exp.targetName} after ${elapsed}h in the mist (${encounterNote}).`;
        exp.logs.push(msg);
        LogDispatchManager.dispatches.unshift({
            id: `exp_recall_done_${Date.now()}_${Math.random()}`,
            day,
            type: 'FIELD RECALL LOG',
            sender: exp.leadAgentName,
            title: `${exp.type} Recalled from ${exp.targetName}`,
            body: exp.logs.join(' | '),
            read: false
        });
        this.completedLogs.unshift(exp);
        return { success: true, expedition: exp, salvagedFuel, message: msg };
    }
};
rootScope.ExpeditionEngine = ExpeditionEngine;

// ============================================================================
// 5.9 ROYAL ARCHIVE TUTORIAL ADVISOR (FIRST-CLICK & EMISSARY WALKTHROUGH)
// ============================================================================
export const TutorialAdvisor = rootScope.TutorialAdvisor || {
    seenTopics: new Set(),
    activeTip: null,
    advisorEnabled: true,

    TOPICS: {
        BOOK_TAB_COMMAND: {
            id: 'BOOK_TAB_COMMAND',
            title: '📖 Book Page I: Command & Daily Triage',
            body: 'Your primary Command Page. Issue faction directives ([Base & Archives], [Field & Logistics], [Politics & Tithe]), respond to Crisis Triage events, and negotiate with Gatehouse Emissaries. Select Tomorrow\'s Target at the top of the page to focus daily production.'
        },
        BOOK_TAB_GARRISON: {
            id: 'BOOK_TAB_GARRISON',
            title: '🛡️ Book Page II: Garrison, Recruitment & Armory Market',
            body: 'Manage operatives, recruit fresh faction units ([➕ Recruit Warden / Scout / Scribe]), assign daily Martial/Logistics drills, and trade canonical weapons, armor, and trinkets once you build the [⚔️ Armory & Weaponry Exchange Market].'
        },
        BOOK_TAB_FIELD: {
            id: 'BOOK_TAB_FIELD',
            title: '🧭 Book Page III: Field Expeditions, Dispatches & Dossiers',
            body: 'Track squads and caravans in real time as they march through the mist (Fallout Shelter style). Recalling a squad mid-march orders them to salvage nearby goods and trek back over the hours they traveled. Review Courier Dispatches and Family Lineage Death Certificates here.'
        },
        BOOK_TAB_TRUTH: {
            id: 'BOOK_TAB_TRUTH',
            title: '📜 Book Page IV: The Truth & Relic Vault (Editor of Reality)',
            body: 'Information is property and Truth is leverage. Every Fact or Relic Dossier uncovered from field expeditions or turned double agents can be acted upon with 6 Editor Verbs: PUBLISH, LEAK, SELL, ARCHIVE, SUPPRESS, or DESTROY — permanently reshaping World Qualities and House power.'
        },
        BOOK_TAB_WARBOARD: {
            id: 'BOOK_TAB_WARBOARD',
            title: '🏰 Book Page V: 19-House War Board & 20-Parish Telemetry',
            body: 'Monitor the 19 competing Noble Houses and 20 Chained Bedrock Settlements. Each House\'s Power Rating (0–100) reflects their composite Garrison Strength, Barrier Fuel reserves, and Monopoly Leverage. Watch their postures (PEACE, SKIRMISH, WAR_PREP, ALLIED) before launching caravans or raids.'
        },
        FACILITIES_BTN: {
            id: 'FACILITIES_BTN',
            title: '🏗️ Base Upgrades & Facilities',
            body: 'Spend Settlement Resources to construct and upgrade facilities: Garrison Barracks (unlocks Guarded Caravans, Mist Patrols & higher unit recruitment caps), Armory & Weaponry Exchange Market (unlocks buying/selling weapons & armor), Inquest Chamber, Alchemical Still, and Grand War Table.'
        },
        EXPEDITION_BTN: {
            id: 'EXPEDITION_BTN',
            title: '🧭 Dispatching Squads & Caravans (Fallout Shelter March)',
            body: 'Every expedition is a live hourly march into the Dark Forest. Squads log hourly wasteland encounters against regional hazard ratings. Advance field hours (+2H FIELD) or hit [🔄 Recall] at any point to have them salvage local goods and march back home.'
        },
        TIME_ADVANCE_DAY: {
            id: 'TIME_ADVANCE_DAY',
            title: '⏩ +1 DAY (Interactive Turn Advance)',
            body: 'Advances the simulation by 1 full day (24 hours) interactively. At dusk, the clock pauses for End-of-Day Reconciliation so you can review supplies gained/expended and personally intervene in any active Crisis or Emissary Petition.'
        },
        TIME_DREAM_SKIP: {
            id: 'TIME_DREAM_SKIP',
            title: '⏭️ Dream World +1D Chrono-Skip vs. 🌙 Dream Ward',
            body: 'UNLIKE [+1 DAY] (which pauses for manual decisions), [⏭️ DREAM +1D SKIP] consumes 1 Royal Chrono-Seal to fast-forward a full day unattended in the Dream Plane (auto-clearing daily reconciliation). If a Crisis strikes while unattended, it inflicts heavy damage UNLESS you pre-cast [🌙 DREAM WARD (-10u Dream Siphon)] to shield your squad!'
        },
        INQUEST_BTN: {
            id: 'INQUEST_BTN',
            title: '⚖️ Formal Inquest & Dynamic Stress Index',
            body: 'Summon a suspect to the Basalt Inquest Chamber. Their Observed Stress Index shifts dynamically based on live shock, poise, parish unrest, and interrogation rounds. Render one of four executive verdicts: Exonerate, Demote, Execute, or Turn Double Agent.'
        },
        RECRUIT_UNIT_BTN: {
            id: 'RECRUIT_UNIT_BTN',
            title: '➕ Faction Unit Generation & Recruitment',
            body: 'Muster new operatives directly into your faction roster using Settlement Resources (or Historical Weight for the Pale Sovereign). Upgrading your Garrison Barracks expands maximum unit capacity and grants combat stat bonuses to all newly mustered recruits.'
        },
        ARMORY_MARKET_BTN: {
            id: 'ARMORY_MARKET_BTN',
            title: '⚔️ Armory & Weaponry Exchange Market',
            body: 'Once unlocked via Base Upgrades, the Armory Market lets you buy and sell canonical weapons (Oakheart Spears, Blackwood Crossbows), armor (Kinetic-Silk, Titan-Bone Shields), and ward-trinkets to customize your squad\'s combat profile.'
        },
        EMISSARY_FIRST_ARRIVAL: {
            id: 'EMISSARY_FIRST_ARRIVAL',
            title: '📯 Royal Archive Advisor: Your First Gatehouse Emissary!',
            body: 'An envoy from a rival Noble House has arrived at your gatehouse! Notice their POWER RATING (0–100), which measures their military, fuel, and monopoly leverage rank among the 19 Houses.\n\n• PROS OF ACCEPTING: Immediate influx of Barrier Fuel, Settlement Resources, and an ALLIED posture.\n• PROS OF REJECTING: Gains Crown Favor and lowers Royal Assessor Scrutiny.\n\n⚠️ ADVISOR WARNING ON HIDDEN CASCADING CONSEQUENCES: Neither choice is safe! Accepting anti-Crown pacts quietly erodes Crown Orthodoxy and triggers delayed Royal Bailiff tariff seizures or Inquisitorial Crusher raids on your stills. Rejecting an envoy humiliates their House, shifting them into SKIRMISH/WAR_PREP and secretly raising future caravan ambush hazards along their border roads!'
        }
    },

    resetForNewRun() {
        this.seenTopics.clear();
        this.activeTip = null;
    },

    checkAndTrigger(topicId, force = false) {
        if (!this.advisorEnabled && !force) return null;
        const t = this.TOPICS[topicId];
        if (!t) return null;
        if (!force && this.seenTopics.has(topicId)) return null;
        this.seenTopics.add(topicId);
        this.activeTip = { ...t, triggeredAt: Date.now() };
        rootScope.EventBus?.emit('TUTORIAL_ADVISOR_POPUP', this.activeTip);
        return this.activeTip;
    },

    dismiss() {
        const prev = this.activeTip;
        this.activeTip = null;
        return prev;
    }
};
rootScope.TutorialAdvisor = TutorialAdvisor;

// ============================================================================
// 6. UNIFIED COMMANDER ENGINE FACADE (PROLOGUE + FUTURE FOLD-IN SYSTEM)
// ============================================================================
export const CommanderEngine = {
    initialized: false,
    isUnlockedInSandbox: false, // Roadmap Hook: Unlocks as in-game Commander System in 3D Sandbox
    baseDayDurationMs: 12 * 60 * 60 * 1000, // 1 In-Game Day = 12 Real-World Hours (43,200,000 ms) at 1x
    maxTimeScale: 8,                        // Players can accelerate up to 8x (1.5 Real-World Hours / Day)
    timeScale: 1,
    currentHour: 6,                         // 0â€“23 in-game hour within the current day

    setTimeScale(scale = 1, requirePremium = false) {
        const clamped = Math.max(1, Math.min(this.maxTimeScale, Number(scale) || 1));
        const costMap = { 1: 0, 2: 1, 4: 2, 8: 4 };
        const sealCost = costMap[clamped] ?? Math.max(0, Math.floor(clamped / 2));
        if (requirePremium && clamped > (this.timeScale || 1) && sealCost > 0) {
            if ((FacilityEngine.chronoSeals || 0) < sealCost) {
                return {
                    success: false,
                    timeScale: this.timeScale,
                    sealCost,
                    sealsRemaining: FacilityEngine.chronoSeals,
                    message: `Insufficient Royal Chrono-Seals (${FacilityEngine.chronoSeals}/${sealCost} Seals required) to accelerate Day Timer to ${clamped}x.`
                };
            }
            FacilityEngine.chronoSeals -= sealCost;
        }
        this.timeScale = clamped;
        if (rootScope.EngineParams) rootScope.EngineParams.timeScale = clamped;
        rootScope.EventBus?.emit('TIMESCALE_CHANGED', {
            timeScale: clamped,
            sealCost: requirePremium ? sealCost : 0,
            sealsRemaining: FacilityEngine.chronoSeals,
            effectiveDayHours: Number((12 / clamped).toFixed(2)),
            effectiveDayDurationMs: this.getEffectiveDayDurationMs()
        });
        return this.timeScale;
    },

    computeChronoSealCostForHours(hours = 2) {
        const h = Math.max(1, parseInt(hours, 10) || 1);
        return Math.max(1, Math.ceil(h / 2));
    },

    computeChronoSealCostForDays(days = 1) {
        const d = Math.max(1, parseInt(days, 10) || 1);
        // Most expensive hour skip (+6H) costs 3 Seals; full-day skip (24h) costs 6 Seals per day
        return d * 6;
    },

    premiumStepHours(hours = 2) {
        const step = Math.max(1, parseInt(hours, 10) || 2);
        const sealCost = this.computeChronoSealCostForHours(step);
        if ((FacilityEngine.chronoSeals || 0) < sealCost) {
            return {
                success: false,
                sealCost,
                sealsRemaining: FacilityEngine.chronoSeals,
                message: `Insufficient Royal Chrono-Seals (${FacilityEngine.chronoSeals}/${sealCost} Seals required) to fast-forward +${step}h on the Day Timer.`
            };
        }
        FacilityEngine.chronoSeals -= sealCost;
        const tickRes = this.tickInGameHour(step);
        return {
            success: true,
            hoursAdvanced: step,
            sealCost,
            sealsRemaining: FacilityEngine.chronoSeals,
            day: tickRes.day,
            hour: tickRes.hour,
            message: `⏭️ [CHRONO-SEAL TIME BOOST] Spent -${sealCost} Royal Chrono-Seal(s) (${FacilityEngine.chronoSeals} left) to fast-forward +${step}h (Now Day ${tickRes.day}, ${String(tickRes.hour).padStart(2, '0')}:00).`
        };
    },

    getEffectiveDayDurationMs() {
        return Math.round(this.baseDayDurationMs / (this.timeScale || 1));
    },

    getEffectiveHourDurationMs() {
        return Math.round(this.getEffectiveDayDurationMs() / 24);
    },

    tickInGameHour(hours = 1) {
        const step = Math.max(1, parseInt(hours, 10) || 1);
        ExpeditionEngine.tickExpeditionHours(step);
        Object.values(FacilityEngine.facilities).forEach(f => {
            if (f.isConstructing && f.hoursRemaining > 0) {
                f.hoursRemaining = Math.max(0, f.hoursRemaining - step);
                if (f.hoursRemaining === 0) {
                    f.unlocked = true;
                    f.level = f.targetLevel;
                    f.isConstructing = false;
                    rootScope.EventBus?.emit('UI_LOG', `[CONSTRUCTION] ${f.name} completed!`);
                }
            }
        });
        this.currentHour += step;
        while (this.currentHour >= 24) {
            this.currentHour -= 24;
            this.advanceDays(1);
        }
        return { day: rootScope.EngineParams?.worldDay || 1, hour: this.currentHour };
    },
    boot(defaultMode = 'HOUSE') {
        if (!this.initialized || AgentRosterManager.agents.size === 0) {
            CampaignManager.selectCampaign(defaultMode);
            this.initialized = true;
        }
        return CampaignManager.getCampaignStatus();
    },

    unlockInSandbox(reason = 'Claimed Command Desk') {
        this.isUnlockedInSandbox = true;
        rootScope.EventBus?.emit('COMMANDER_SYSTEM_UNLOCKED', { reason });
        rootScope.EventBus?.emit('UI_LOG', `ðŸŒŒ [COMMANDER] Macro-Logistics Command Desk Unlocked (${reason}).`);
    },

    advanceDays(days = 1) {
        const count = Math.max(1, parseInt(days, 10) || 1);
        for (let i = 0; i < count; i++) {
            ExpeditionEngine.tickExpeditionHours(24);
            FacilityEngine.tickDailyGuardGeneration();
            rootScope.EngineParams.worldDay = (rootScope.EngineParams.worldDay || 1) + 1;
            const d = rootScope.EngineParams.worldDay;
            rootScope.EventBus?.emit('DAY_TICK', { day: d });
            rootScope.BarrierPipeline?.tickDailyProduction?.();
            rootScope.DuneDriftSystem?.tickDailyDrift?.();
            rootScope.ShiftDirector?.checkCycle?.();
            if (!rootScope.EventBus?.events?.['DAY_TICK']?.length) {
                CampaignManager.processDailyLogistics();
            }
        }
        return CampaignManager.getCampaignStatus();
    },

    /**
     * Mobile Microtransaction "Chrono-Skip" Full-Day Instant Simulation:
     * Consumes 1 Royal Chrono-Seal per skipped day, simulates all 24 hours of squad logs & village ticks,
     * and if a Crisis occurs during the skip, the player CANNOT intervene (auto-resolves with default penalty).
     */
    chronoSkipDays(days = 1) {
        const count = Math.max(1, parseInt(days, 10) || 1);
        const scaledSealCost = this.computeChronoSealCostForDays(count);
        if (FacilityEngine.chronoSeals < scaledSealCost) {
            return { success: false, sealCost: scaledSealCost, message: `Insufficient Royal Chrono-Seals (${FacilityEngine.chronoSeals}/${scaledSealCost} Seals required for +${count}D Skip).` };
        }
        FacilityEngine.chronoSeals -= scaledSealCost;
        const skippedEvents = [];

        for (let i = 0; i < count; i++) {
            this.advanceDays(1);
            // Auto-clear daily reconciliation pause during unattended Dream World Chrono-Skip
            CrisisEngine.pendingDailyReconciliation = false;
            // If a crisis triggered during the unattended skip, check for active Dream Intervention ward first!
            if (CrisisEngine.activeCrisis) {
                const cTitle = CrisisEngine.activeCrisis.title;
                if (CrisisEngine.activeCrisis.isMitigationActive || CrisisEngine.pendingDreamIntervention) {
                    const res = CrisisEngine.resolveActiveCrisis('DREAM_MITIGATE');
                    skippedEvents.push(`🌙 DREAM-MITIGATED CRISIS DURING SKIP (${cTitle}): ${res.message}`);
                } else {
                    const worstChoice = CrisisEngine.activeCrisis.choices.find(c => c.outcomeType === 'CATASTROPHIC_FLARE') || CrisisEngine.activeCrisis.choices[0];
                    const res = CrisisEngine.resolveActiveCrisis(worstChoice.id);
                    skippedEvents.push(`⚠️ UNATTENDED CRISIS DURING SKIP (${cTitle}): ${res.message}`);
                }
            } else {
                skippedEvents.push(`📜 Day ${rootScope.EngineParams.worldDay}: ${CrisisEngine.lastDayReport?.executedGoal || 'Routine operations'} (${CrisisEngine.lastDayReport?.gains || ''})`);
            }
        }
        return {
            success: true,
            sealCost: scaledSealCost,
            sealsRemaining: FacilityEngine.chronoSeals,
            skippedEvents,
            message: `⏭️ [CHRONO-SEAL +${count}D SKIP COMPLETE] Spent -${scaledSealCost} Royal Chrono-Seal(s) (${FacilityEngine.chronoSeals} left) to fast-forward ${count} full day(s).\n` + skippedEvents.join('\n')
        };
    },

    triggerDreamIntervention(crisisId = null, resourceCost = 10) {
        return CrisisEngine.triggerDreamIntervention(crisisId, resourceCost);
    },


    CampaignManager,
    RoleStateMachine,
    ProceduralCollisionEngine,
    PRESSURE_TAG_REGISTRY,
    RealityEditorVault,
    TutorialAdvisor,
    HOUSE_MONOPOLY_MODIFIERS,
    AgentRosterManager,
    LogDispatchManager,
    CrucibleNarrativeEngine,
    InterrogationDesk,
    ShadowInfluenceEngine,
    CrisisEngine,
    FacilityEngine,
    ExpeditionEngine,
    NOBLE_HOUSE_PROFILES,
    ROLE_CATALOG,
    SQUAD_ARMORY_CATALOG
};

// Auto-boot default HOUSE campaign so state, agents, and dispatches are ready immediately
CommanderEngine.boot('HOUSE');
rootScope.CommanderEngine = CommanderEngine;
export default CommanderEngine;






