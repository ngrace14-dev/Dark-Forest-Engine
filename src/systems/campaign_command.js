/**
 * File: src/systems/campaign_command.js
 * Implements the 5 Locked-In Campaign modes and macro-logistics governance.
 */

window.CampaignManager = {
    campaignMode: 'HOUSE', // PATRON, HOUSE, SYNDICATE, ORDER, DUNE, SOVEREIGN
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
            activeCaravans: []
        },
        order: { orderName: "Order of the Basalt Quill & OCP", containedAnomalies: 4, form12BReports: 2, dustWardenScrubs: 5, blindSpotEntropy: 12 },
        syndicate: { syndicateName: "Salt Syndicate", baseSettlement: "Salt-Marrow", mineralSaltStock: 150, contrabandResin: 45, gallowsTollCollected: 80 },
        dune: { flotillaName: "Dust-Haven", riverStreamline: "Silt Veil", cleanedWaterStock: 80, dailyWaterConsumption: 5, mooringTetherIntegrity: 100, driftDistanceKm: 0 },
        patron: { candidateSignificance: 25, symbolicDreamsSent: 0, verifiedTruths: 0, legendaryAwakenings: 0 },
        sovereign: { 
            title: "Korvan the Variable (Chained Hybrid)",
            isAscended: false,
            yearsEndured: 0,
            significanceHarvested: 0,
            heraldsMutated: 0,
            lastSummonDay: -10, 
            bankedCharge: 0, 
            summonCooldown: 3 
        }
    },

    init: function() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('HEARTBEAT_T12H', () => this.tickDayCycle());
            window.EventBus.on('DAY_TICK', () => this.processDailyLogistics());
        }
    },

    selectCampaign: function(mode, customFactionId = null) {
        const validModes = ['HOUSE', 'ORDER', 'SYNDICATE', 'DUNE', 'PATRON', 'SOVEREIGN'];
        const chosen = (mode || 'HOUSE').toUpperCase();
        if (!validModes.includes(chosen)) throw new Error(`Unknown campaign mode: ${mode}`);
        this.campaignMode = chosen;
        this.activeFaction = customFactionId;
        this.dayStarted = window.EngineParams?.worldDay || 0;
        this.victoryConditionsMet = false;
        this.collapseTriggered = false;
        this.collapseReason = null;
        if (window.AgentRosterManager && window.AgentRosterManager.agents.size === 0) this._seedInitialRoster();
        if (window.EventBus) window.EventBus.emit('CAMPAIGN_INITIALIZED', { mode: this.campaignMode });
        return this.getCampaignStatus();
    },

    _seedInitialRoster: function() {
        if (!window.AgentRosterManager) return;
        const arm = window.AgentRosterManager;
        const seeds = {
            HOUSE: [['agt_1', 'High Marshal Vane', 'WAR_MASTER'], ['agt_2', 'Scout-Sergeant Kaelen', 'SCOUT'], ['agt_3', 'Warden Maris', 'WARDEN'], ['agt_4', 'Apprentice Jon', 'APPRENTICE']],
            ORDER: [['agt_1', 'Director Jess Nedaf', 'INSPECTOR'], ['agt_2', 'Chronicler Elyse', 'SCRIBE'], ['agt_3', 'Dust-Warden Gareth', 'WARDEN']],
            SYNDICATE: [['agt_1', 'Brine-Lord Harl', 'CARTEL_LEADER'], ['agt_2', 'Vance the Leech', 'SMUGGLER'], ['agt_3', 'Iron-Jaw Ron', 'ENFORCER']],
            DUNE: [['agt_1', 'Matron Morwen', 'ELDER_KEEPER'], ['agt_2', 'Sand-Pilot Dane', 'PILOT'], ['agt_3', 'Dredger Cael', 'DREDGER']],
            PATRON: [['agt_1', 'Lyra the Keen', 'SURVIVOR'], ['agt_2', 'Justin the Fowler', 'HUNTER']],
            SOVEREIGN: [['agt_1', 'The Bound Huntsman', 'PREDATOR']]
        };
        (seeds[this.campaignMode] || []).forEach(([id, name, arch]) => arm.createAgent(id, name, arch));
    },

    getCampaignStatus: function() {
        const day = window.EngineParams?.worldDay || 0;
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

    tickDayCycle: function() {
        this.checkSovereignCooldown();
    },

    processDailyLogistics: function() {
        const day = window.EngineParams?.worldDay || 0;
        window.AgentRosterManager?.tickDailyDrills?.();

        if (this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            const consumption = Math.max(1, 4 - Math.floor((h.autarkyLevel || 0) / 35));
            h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - consumption);
            h.shiftCountdown = 14 - (day % 14);

            if (day % 14 === 0) {
                window.AgentRosterManager?.applyShiftSurvivalConditions?.(h.barrierFuelUnits > 0, h.barrierFuelUnits <= 0, false);
                h.crownDemand = 14 + Math.floor(Math.random() * 8);

                // Crown Crusher check for non-Terminus illegal autarky
                if (!h.hasHorizonDispensation && h.crownScrutiny > 65) {
                    h.barrierFuelUnits = Math.floor(h.barrierFuelUnits / 2);
                    h.autarkyLevel = Math.max(0, h.autarkyLevel - 30);
                    h.crownFavor = Math.max(0, h.crownFavor - 25);
                    if (window.EventBus) window.EventBus.emit('UI_LOG', '⚔️ [CROWN INQUEST] Inquisitorial Crusher Force raided unauthorized stills! Fuel seized.');
                }
            }

            // Progress active caravans
            h.activeCaravans = (h.activeCaravans || []).filter(c => {
                c.daysLeft--;
                if (c.daysLeft <= 0) {
                    h.barrierFuelUnits = Math.min(60, h.barrierFuelUnits + c.yieldFuel);
                    if (window.EventBus) window.EventBus.emit('UI_LOG', `📦 [TRADE] Caravan returned from ${c.dest}: +${c.yieldFuel} Barrier Fuel secured.`);
                    return false;
                }
                return true;
            });

            if (h.barrierFuelUnits <= 0) {
                h.chainsIntegrity = Math.max(0, h.chainsIntegrity - 15);
                if (h.chainsIntegrity <= 0) {
                    this.collapseTriggered = true;
                    this.collapseReason = "Runic barrier depleted; anchor chains snapped in the White Void.";
                }
            }
        } else if (this.campaignMode === 'ORDER') {
            const o = this.state.order;
            if (Math.random() < 0.25) o.blindSpotEntropy = Math.min(100, o.blindSpotEntropy + 2);
            if (o.blindSpotEntropy >= 85) {
                this.collapseTriggered = true;
                this.collapseReason = "Reality leak exceeded threshold; memory of 6,000-year blind spot leaked.";
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

        if (window.LogDispatchManager) window.LogDispatchManager.generateDailyDispatches(day, this.campaignMode, this.state);
    },

    dispatchAction: function(actionType, arg = null) {
        const day = window.EngineParams?.worldDay || 0;
        let res = { success: false, message: "" };
        const act = (actionType || '').toUpperCase();

        if (act === 'PATROL') {
            res = { success: true, message: "Scout patrol dispatched into mist. Observed subtle coordinate drift on marker posts." };
            if (this.campaignMode === 'HOUSE' && Math.random() < 0.4) {
                this.state.house.barrierFuelUnits = Math.min(40, this.state.house.barrierFuelUnits + 6);
                res.message += " Intercepted an unmonitored wagon with 6 units cold pine resin.";
            }
        } else if (act === 'REQUISITION_FUEL' && this.campaignMode === 'HOUSE') {
            this.state.house.barrierFuelUnits += 14;
            res = { success: true, message: "Emergency levy executed: +14 Barrier Fuel secured for World's End Gate." };
        } else if (act === 'CROWN_FILL_FULL' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            if (h.barrierFuelUnits < h.crownDemand) return { success: false, message: `Insufficient fuel (${h.barrierFuelUnits}/${h.crownDemand}u).` };
            h.barrierFuelUnits -= h.crownDemand;
            h.crownFavor = Math.min(100, h.crownFavor + 20);
            res = { success: true, message: `Full Crown quota fulfilled (-${h.crownDemand}u Fuel, +20 Crown Favor). Local moats run thin.` };
        } else if (act === 'CROWN_FILL_PARTIAL' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            const half = Math.floor(h.crownDemand / 2);
            h.barrierFuelUnits = Math.max(0, h.barrierFuelUnits - half);
            h.crownFavor = Math.min(100, h.crownFavor + 5);
            res = { success: true, message: `Partial tribute delivered (-${half}u Fuel, +5 Crown Favor). Royal Assessors noted compromise.` };
        } else if (act === 'CROWN_DENY' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            h.crownFavor = Math.max(0, h.crownFavor - 15);
            res = { success: true, message: `Crown requisition denied. Preserved 100% fuel. Royal courier left severe reprimand (-15 Favor).` };
        } else if (act === 'DEVELOP_AUTARKY' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            h.autarkyLevel = Math.min(100, h.autarkyLevel + 15);
            if (!h.hasHorizonDispensation) h.crownScrutiny += 15;
            res = { success: true, message: `Domestic stills expanded (Autarky: ${h.autarkyLevel}%). ${h.hasHorizonDispensation ? 'Terminus Horizon Dispensation legalizes stills.' : 'Crown scrutiny rose!'}` };
        } else if (act === 'PROXY_RAID' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            h.barrierFuelUnits = Math.min(60, h.barrierFuelUnits + 16);
            res = { success: true, message: `Covert proxy raid ambushed rival supply line: +16 units cold resin seized without open war.` };
        } else if (act === 'PROXY_SABOTAGE' && this.campaignMode === 'HOUSE') {
            res = { success: true, message: `Rival house ballistas sabotaged with bone-dust. Their Crown ranking deteriorated.` };
        } else if (act === 'CONSTRUCT_SANCTUARY' && this.campaignMode === 'HOUSE') {
            this.state.house.sanctuaryBuilt = true;
            res = { success: true, message: "Sanctuary of the Hearth sealed beneath bedrock. +15% population recovery during Shifts." };
        } else if (act === 'OPEN_PRIVATE_WING' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            h.privateWingOpen = true;
            h.blackmailDossiers++;
            h.unrest += 15;
            res = { success: true, message: "Private wing opened to visiting noble elites: +50 Gold, +1 Blackmail Dossier. Lower-bailey unrest rose." };
        } else if (act === 'ASSIGN_BAILIFF' && this.campaignMode === 'HOUSE') {
            this.state.house.assignedBailiffId = arg || 'agt_1';
            res = { success: true, message: `Logistics Bailiff assigned (${this.state.house.assignedBailiffId}). Official House trade caravans unlocked!` };
        } else if (act === 'DISPATCH_CARAVAN' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            if (!h.assignedBailiffId) return { success: false, message: "Official trade locked: Assign a Logistics Bailiff first (assign_bailiff <id>)." };
            h.activeCaravans.push({ dest: arg || 'Oakhaven', daysLeft: 4, yieldFuel: 18 });
            res = { success: true, message: `Official House Trade Caravan departed for ${arg || 'Oakhaven'} under Bailiff seal (Returns in 4 days).` };
        } else if (act === 'CULTIVATE_RUNIC' && this.campaignMode === 'HOUSE') {
            if (!window.AgentRosterManager) return { success: false, message: "Roster offline." };
            res = window.AgentRosterManager.cultivateTerminusRunic(arg || 'agt_1', this.state.house);
        } else if (act === 'AUDIT_ANOMALY' && this.campaignMode === 'ORDER') {
            this.state.order.containedAnomalies++;
            this.state.order.form12BReports++;
            this.state.order.blindSpotEntropy = Math.max(0, this.state.order.blindSpotEntropy - 8);
            res = { success: true, message: "Form 12-B issued. Non-Euclidean spatial anomaly contained in Basalt Vault." };
        } else if (act === 'SCRUB_MONUMENT' && this.campaignMode === 'ORDER') {
            this.state.order.dustWardenScrubs++;
            this.state.order.blindSpotEntropy = Math.max(0, this.state.order.blindSpotEntropy - 5);
            res = { success: true, message: "Dust-Wardens scrubbed a forbidden monolith with vinegar-ash. Blind spot record erased." };
        } else if (act === 'SMUGGLE_RESIN' && this.campaignMode === 'SYNDICATE') {
            this.state.syndicate.contrabandResin += 18;
            this.state.syndicate.gallowsTollCollected -= 15;
            res = { success: true, message: "Midnight barge diverted: +18 Contraband Resin seized from Crown supply chain." };
        } else if (act === 'EXTORT_HOUSE' && this.campaignMode === 'SYNDICATE') {
            this.state.syndicate.gallowsTollCollected += 35;
            res = { success: true, message: "Extortion levied on House Cull: +35 Salt-Deniers extorted under threat of sabotage." };
        } else if (act === 'CONDENSE_WATER' && this.campaignMode === 'DUNE') {
            this.state.dune.cleanedWaterStock += 15;
            res = { success: true, message: "Solar condensers scraped of silica. +15 Cleaned Water added to tanks." };
        } else if (act === 'DREDGE_STREAMLINE' && this.campaignMode === 'DUNE') {
            this.state.dune.driftDistanceKm += 0.8;
            res = { success: true, message: "Sounding dredge dropped into Silt Veil: Pre-Fracture vellum cylinder recovered from the riverbed." };
        } else if (act === 'REPAIR_TETHERS' && this.campaignMode === 'DUNE') {
            this.state.dune.mooringTetherIntegrity = Math.min(100, this.state.dune.mooringTetherIntegrity + 25);
            res = { success: true, message: "Flotilla hemp and bronze mooring tethers re-tensioned to bedrock anchor." };
        } else if (act === 'TRANSMIT_DREAM' && this.campaignMode === 'PATRON') {
            this.state.patron.symbolicDreamsSent++;
            this.state.patron.candidateSignificance += 8;
            res = { success: true, message: `Symbolic dream whispered. Candidate significance reached ${this.state.patron.candidateSignificance}.` };
        } else if (act === 'VERIFY_TRUTH' && this.campaignMode === 'PATRON') {
            this.state.patron.verifiedTruths++;
            this.state.patron.candidateSignificance += 12;
            res = { success: true, message: "Divine revelation granted. Historical rumor verified into canonical Truth." };
        } else if (act === 'SUMMON_HUNTSMAN' && this.campaignMode === 'SOVEREIGN') {
            const ok = this.executeHuntsmanSummon();
            res = { success: ok, message: ok ? "The Bound Huntsman awakens from frost to harvest prey." : "Huntsman bound to void cooldown." };
        } else if (act === 'MACABRE_COMMUNION' && this.campaignMode === 'SOVEREIGN') {
            this.state.sovereign.heraldsMutated++;
            this.state.sovereign.significanceHarvested = (this.state.sovereign.significanceHarvested || 0) + 1500;
            res = { success: true, message: "The Macabre Communion performed: Frozen fungal flesh fed to captive commander. Herald Wendigo mutated." };
        } else if (act === 'LEVERAGE_HOUSE' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            if ((h.blackmailDossiers || 0) < 1) return { success: false, message: "No Blackmail Dossiers available. Monetize private sanctuary wing first." };
            h.blackmailDossiers--;
            res = { success: true, message: `Blackmail Dossier spent against ${arg || 'House Cull'}: Rival house yielded monopoly leverage (+15 Standing).` };
        } else if (act === 'SPONSOR_HOUSE' && this.campaignMode === 'HOUSE') {
            const h = this.state.house;
            if (h.barrierFuelUnits < 8) return { success: false, message: "Insufficient fuel to sponsor ally house." };
            h.barrierFuelUnits -= 8;
            h.crownFavor = Math.min(100, h.crownFavor + 10);
            res = { success: true, message: `Sponsored ${arg || 'House Oakheart'} with 8u fuel: Defense coalition secured (+10 Crown Standing).` };
        } else if (act === 'HIBERNATE' && this.campaignMode === 'SOVEREIGN') {
            const yrs = parseInt(arg, 10) || 100;
            const sov = this.state.sovereign;
            sov.yearsEndured = (sov.yearsEndured || 0) + yrs;
            sov.significanceHarvested = (sov.significanceHarvested || 0) + (yrs * 10);
            res = { success: true, message: `Korvan hibernated in deep bedrock for ${yrs} years. Endured: ${sov.yearsEndured}/1000 Years.` };
        } else if (act === 'ASCEND_SOVEREIGN' && this.campaignMode === 'SOVEREIGN') {
            const sov = this.state.sovereign;
            if ((sov.yearsEndured || 0) < 1000 || (sov.heraldsMutated || 0) < 5) {
                return { success: false, message: `Ascension threshold not met. Requires 1,000 years (${sov.yearsEndured || 0}/1000) and 5 Herald Wendigos (${sov.heraldsMutated || 0}/5).` };
            }
            sov.isAscended = true;
            sov.title = "The True Pale Sovereign (Void Emperor)";
            res = { success: true, message: `CHAINS SHATTERED! Korvan evolves into The True Pale Sovereign (Porcelain bone carapace, Imperial antler-crown, Crimson mantle)!` };
        } else {
            res = { success: false, message: `Command '${actionType}' is not available for ${this.campaignMode}.` };
        }
        if (window.EventBus) window.EventBus.emit('COMMAND_EXECUTED', { actionType, res, day });
        return res;
    },

    checkSovereignCooldown: function() {
        if (this.campaignMode !== 'SOVEREIGN') return;
        const currentDay = window.EngineParams?.worldDay || 0;
        const sov = this.state.sovereign;
        if (currentDay - sov.lastSummonDay >= sov.summonCooldown && sov.bankedCharge === 0) {
            sov.bankedCharge = 1;
            if (window.EventBus) window.EventBus.emit('UI_LOG', '🦇 [SOVEREIGN] Resummon charge stacked. Huntsman immortal today.');
        }
    },

    executeHuntsmanSummon: function() {
        if (this.campaignMode !== 'SOVEREIGN') return false;
        const currentDay = window.EngineParams?.worldDay || 0;
        const sov = this.state.sovereign;
        if (sov.bankedCharge > 0) {
            sov.bankedCharge = 0;
            sov.lastSummonDay = currentDay;
            if (window.EventBus) window.EventBus.emit('UI_LOG', '💀 [SOVEREIGN] Instant Rebirth: Consuming banked charge!');
            return true;
        }
        if (currentDay - sov.lastSummonDay >= sov.summonCooldown) {
            sov.lastSummonDay = currentDay;
            if (window.EventBus) window.EventBus.emit('UI_LOG', '💀 [SOVEREIGN] Huntsman summoned.');
            return true;
        }
        return false;
    },

    exportLegacySave: function(chosenCandidateId = null) {
        const day = window.EngineParams?.worldDay || 1;
        const seed = window.EpochManagerInstance?.currentSeed || 'millennium_audit_seed_1000';
        const shiftSys = window.ShiftDirector;
        
        // 1. Select the True Origin Native Candidate
        const arm = window.AgentRosterManager;
        let candidate = null;
        if (arm && arm.agents.size > 0) {
            if (chosenCandidateId && arm.agents.has(chosenCandidateId)) {
                candidate = arm.agents.get(chosenCandidateId);
            } else {
                candidate = Array.from(arm.agents.values()).sort((a, b) => (b.significance || 0) - (a.significance || 0))[0];
            }
        }

        // 2. Gather Necrology & Ancestors
        const ancestors = window.CrucibleNarrativeEngine?.getAllBiographies() || [];

        // 3. Gather Settlement States
        const settlements = (window.VillageManager?.villages || []).map(v => ({
            name: v.name,
            region: v.region || (v.y > 10 ? 'mountains' : 'forest'),
            house: v.nobleHouse || 'Unblessed',
            x: Number(v.x?.toFixed(1) || 0),
            z: Number(v.z?.toFixed(1) || 0),
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
                totalDispatches: window.LogDispatchManager?.dispatches?.length || 0,
                recentDispatches: (window.LogDispatchManager?.dispatches || []).slice(0, 5)
            }
        };

        if (window.EventBus) {
            window.EventBus.emit('LEGACY_SAVE_EXPORTED', legacyDossier);
            window.EventBus.emit('UI_LOG', `🏆 [LEGACY] World Line Exported: Candidate ${candidate?.name || 'Wanderer'} stamped as True Origin Native.`);
        }

        return legacyDossier;
    },

    getBedrockTelemetry: function() {
        const villages = (window.VillageManager?.villages || []).slice(0, 20); // STRICTLY 20 Bedrock settlements!
        return villages.map(v => ({
            id: v.id,
            name: v.name,
            house: v.nobleHouse || 'Unblessed',
            industry: v.industry?.produces || v.produces || 'raw_goods',
            population: v.population?.current || 5000,
            barrierFuel: v.stats?.essence || 14,
            chainsIntegrity: 100
        }));
    },

    getWarBoard: function() {
        return [
            { name: "House Aethel", monopoly: "Royal Crucible Fuel", blessed: true, status: "PEACE", power: 95 },
            { name: "House Terminus", monopoly: "Horizon Gate Defense", blessed: true, status: "MOBILIZED", power: 90 },
            { name: "House Oakheart", monopoly: "14-Day Ironwood", blessed: true, status: "SKIRMISH", power: 78 },
            { name: "House Gallows", monopoly: "Runic Dust & Tethers", blessed: true, status: "PEACE", power: 75 },
            { name: "House Widow", monopoly: "Siphon-Vine Cold Resins", blessed: true, status: "PEACE", power: 72 },
            { name: "House Blackwood", monopoly: "Slag-Weevil Fluid", blessed: true, status: "SKIRMISH", power: 70 },
            { name: "House Ashen", monopoly: "Basalt Tablets", blessed: true, status: "PEACE", power: 68 },
            { name: "House Shadowfen", monopoly: "Pre-Fuel Matrix Synthesis", blessed: true, status: "PEACE", power: 66 },
            { name: "House Epitaph", monopoly: "18k Objective Records", blessed: true, status: "ISOLATED", power: 65 },
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
    }
};

window.CampaignManager.init();
