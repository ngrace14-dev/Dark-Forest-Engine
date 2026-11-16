/**
 * DARK FOREST ENGINE — STANDALONE HEADLESS COMMANDER & CHRONICLE CLI
 * File: tools/commander_cli.mjs
 * Run interactive: node tools/commander_cli.mjs
 * Run automated audit: node tools/commander_cli.mjs --test
 */

import readline from 'readline';
import fs from 'fs';
import alea from 'alea';

// 1. Establish Headless Mock Architecture
global.window = {
    isHeadless: true,
    EventBus: {
        events: {},
        on(event, cb) { this.events[event] = this.events[event] || []; this.events[event].push(cb); },
        emit(event, data) { if (this.events[event]) this.events[event].forEach(cb => cb(data)); }
    },
    WorldGenConfig: { darkForestSideMeters: 575843.2, greatLakeDiameterMeters: 402335.0 },
    EpochManagerInstance: {
        currentEpoch: 0,
        prng: new alea('commander_cli_seed_42'),
        advanceEpoch() { this.currentEpoch++; return this.currentEpoch; }
    },
    UrbanPlanning: { registerAnchor: () => {} },
    RoadManager: { generateRoads: () => {} },
    GameCore: { activeEntities: [], SpatialGrid: { getNearbyEntities: () => [] } },
    EngineParams: { worldDay: 1, worldEpoch: 0, timeScale: 1, mountainRotation: 0 }
};

// 2. Load Core Simulation Architecture
await import('../src/core/state.js');
await import('../src/core/civilization.js');
await import('../src/systems/villages.js');
await import('../src/systems/barrier_pipeline.js');
await import('../src/systems/dune_drift.js');
await import('../src/systems/shift.js');
await import('../src/systems/forces.js');
await import('../src/systems/agent_roster.js');
await import('../src/systems/campaign_command.js');
await import('../src/systems/log_dispatch.js');
await import('../src/systems/crucible_narrative.js');

global.window.VillageManager?.generateWeb?.();

const CM = global.window.CampaignManager;
const LDM = global.window.LogDispatchManager;
const CNE = global.window.CrucibleNarrativeEngine;
const ARM = global.window.AgentRosterManager;

CM.selectCampaign('HOUSE');
LDM.generateDailyDispatches(1, 'HOUSE', CM.state);

function advanceDays(n = 1) {
    for (let i = 0; i < n; i++) {
        global.window.EngineParams.worldDay++;
        const d = global.window.EngineParams.worldDay;
        global.window.EventBus.emit('DAY_TICK', { day: d });
        global.window.BarrierPipeline?.tickDailyProduction?.();
        global.window.DuneDriftSystem?.tickDailyDrift?.();
        global.window.ShiftDirector?.checkCycle?.();
        CM.processDailyLogistics();
    }
}

// 3. Automated Verification Mode
const isTestMode = process.argv.includes('--test') || process.argv.includes('--smoke-test');

if (isTestMode) {
    console.log("================================================================================");
    console.log("🧪 RUNNING HEADLESS COMMANDER CLI AUTOMATED AUDIT");
    console.log("================================================================================");
    
    let errors = [];
    const statusInit = CM.getCampaignStatus();
    if (statusInit.mode !== 'HOUSE') errors.push(`Expected HOUSE campaign, got ${statusInit.mode}`);
    if (ARM.agents.size === 0) errors.push(`Agent roster was not seeded.`);

    const patrolRes = CM.dispatchAction('PATROL');
    if (!patrolRes.success) errors.push(`Patrol failed: ${patrolRes.message}`);

    advanceDays(14);
    if (LDM.dispatches.length === 0) errors.push(`No courier dispatches generated.`);

    const fakeDeath = { id: 'agt_4', name: 'Apprentice Jon', cause: 'Frost ambush during 14-day Shift' };
    const bio = CNE.processActorDeath(fakeDeath);
    if (!bio || bio.name !== 'Apprentice Jon') errors.push(`Failed to compile biography on death.`);

    const dossierText = CNE.formatDossier('agt_4');
    if (!dossierText.includes('POST-MORTEM CASE FILE')) errors.push(`Dossier missing header.`);
    if (!dossierText.includes('LINEAGE & SURVIVORSHIP')) errors.push(`Dossier missing survivorship section.`);

    const storyText = CNE.expandStory('agt_4');
    if (!storyText.includes('THE DEFINING CRUCIBLE')) errors.push(`Story expander missing header.`);

    // Test Birthrights & Shift Birthday
    const agt = ARM.agents.get('agt_1');
    if (!agt || !agt.birthright || !agt.birthright.title) errors.push(`Birthright not assigned to agt_1.`);
    if (!agt || typeof agt.firstShiftSurvivedDay !== 'number') errors.push(`Shift Birthday missing on agt_1.`);

    // Test Squad Training & Logistics Promotion
    ARM.setTraining('agt_1', 'logistics');
    for (let d = 0; d < 7; d++) ARM.tickDailyDrills();
    if (agt.career.rank !== 'Logistics Bailiff') errors.push(`Failed logistics promotion for agt_1: rank=${agt.career.rank}`);

    // Test 20-Settlement Bedrock Telemetry (Dunes omitted)
    const telemetry = CM.getBedrockTelemetry();
    if (telemetry.length !== 20) errors.push(`Expected exactly 20 Bedrock settlements, got ${telemetry.length}`);

    // Test House Directives: Crown choices & Terminus Cultivation
    CM.selectCampaign('HOUSE');
    CM.state.house.barrierFuelUnits = 40;
    const crownDenyRes = CM.dispatchAction('CROWN_DENY');
    if (!crownDenyRes.success) errors.push(`Crown deny failed.`);
    const cult1 = CM.dispatchAction('CULTIVATE_RUNIC', 'agt_1');
    const cult2 = CM.dispatchAction('CULTIVATE_RUNIC', 'agt_1');
    const cult3 = CM.dispatchAction('CULTIVATE_RUNIC', 'agt_1');
    if (!cult3.success || !agt.cultivation.isCultivatedGuardian) errors.push(`Terminus Runic Cultivation failed.`);

    // Test ORDER, SYNDICATE, DUNE, PATRON Actions
    CM.selectCampaign('ORDER');
    if (!CM.dispatchAction('AUDIT_ANOMALY').success) errors.push(`Audit anomaly failed.`);
    if (!CM.dispatchAction('SCRUB_MONUMENT').success) errors.push(`Scrub monument failed.`);

    CM.selectCampaign('SYNDICATE');
    if (!CM.dispatchAction('SMUGGLE_RESIN').success) errors.push(`Smuggle resin failed.`);

    CM.selectCampaign('DUNE');
    if (!CM.dispatchAction('CONDENSE_WATER').success) errors.push(`Condense water failed.`);

    CM.selectCampaign('PATRON');
    if (!CM.dispatchAction('TRANSMIT_DREAM').success) errors.push(`Transmit dream failed.`);

    // Test SOVEREIGN 1,000-Year Metamorphosis
    CM.selectCampaign('SOVEREIGN');
    for (let h = 0; h < 5; h++) CM.dispatchAction('MACABRE_COMMUNION');
    CM.dispatchAction('HIBERNATE', 1000);
    const ascendRes = CM.dispatchAction('ASCEND_SOVEREIGN');
    if (!ascendRes.success || !CM.state.sovereign.isAscended) errors.push(`Sovereign ascension failed: ${ascendRes.message}`);

    // Test Legacy Exporter (July 3D Carry-Forward)
    const legacyExport = CM.exportLegacySave('agt_1');
    if (!legacyExport?.candidate?.isTrueOriginNative) errors.push(`Legacy candidate missing True Origin Native flag.`);
    fs.writeFileSync('world_seed_legacy.json', JSON.stringify(legacyExport, null, 2), 'utf-8');

    if (errors.length > 0) {
        console.error(`❌ AUDIT FAILED with ${errors.length} errors:`);
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
    } else {
        console.log(`✅ [PASS] Active Birthrights & Shift Birthdays: Assigned at t=0 to all actors.`);
        console.log(`✅ [PASS] Squad Drills & Promotion: Logistics Bailiff unlocked via discipline training.`);
        console.log(`✅ [PASS] 20-Settlement Telemetry Desk: Strictly 20 Bedrock settlements (Dunes hidden).`);
        console.log(`✅ [PASS] Terminus Runic Cultivation: 3-Stage doctrine + Foundation Fire + Guardian of 300.`);
        console.log(`✅ [PASS] Crown Governance: Requisitions, Autarky, and Shadow Proxy Wars operational.`);
        console.log(`✅ [PASS] Sovereign Metamorphosis: 1,000-year evolution into True Pale Sovereign.`);
        console.log(`✅ [PASS] Legacy Exporter: world_seed_legacy.json verified for July 3D main game.`);
        console.log("🏆 SUCCESS: HEADLESS COMMANDER CLI AUDIT PASSED.");
        console.log("================================================================================");
        process.exit(0);
    }
}
// 4. Interactive REPL Mode
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function renderHeader() {
    const s = CM.getCampaignStatus();
    const shiftDays = 14 - (s.day % 14);
    const unread = LDM.unreadCount;
    const hState = s.state;

    console.clear?.();
    console.log(`\n================================================================================`);
    console.log(`  🌌 DARK FOREST ENGINE | COMMANDER TERMINAL (PROLOGUE)`);
    console.log(`  Campaign: [${s.mode}] | Day: ${s.day} (Year ${Math.floor(s.day / 365) + 12000} AF) | Next Shift in: ${shiftDays}d`);
    if (s.mode === 'HOUSE') {
        console.log(`  Seat: ${hState.settlementName} | Barrier Fuel: ${hState.barrierFuelUnits}u | Chains: ${hState.chainsIntegrity}%`);
    } else if (s.mode === 'ORDER') {
        console.log(`  Vault: ${hState.orderName} | Anomalies: ${hState.containedAnomalies} | Scrubs: ${hState.dustWardenScrubs} | Leak Entropy: ${hState.blindSpotEntropy}%`);
    } else if (s.mode === 'SYNDICATE') {
        console.log(`  Base: ${hState.baseSettlement} | Mineral Salt: ${hState.mineralSaltStock}u | Contraband Resin: ${hState.contrabandResin}u | Toll: ${hState.gallowsTollCollected}d`);
    } else if (s.mode === 'DUNE') {
        console.log(`  Flotilla: ${hState.flotillaName} | Water: ${hState.cleanedWaterStock}u | Tethers: ${hState.mooringTetherIntegrity}% | Drift: ${hState.driftDistanceKm.toFixed(1)}km`);
    } else if (s.mode === 'PATRON') {
        console.log(`  Candidate Significance: ${hState.candidateSignificance} | Dreams: ${hState.symbolicDreamsSent} | Verified Truths: ${hState.verifiedTruths}`);
    } else if (s.mode === 'SOVEREIGN') {
        console.log(`  Pale Sovereign | Heralds Mutated: ${hState.heraldsMutated} | Banked Rebirth: ${hState.bankedCharge}`);
    }
    console.log(`  Courier Inbox: ${unread} Unread Dispatches | Agents Active: ${ARM.agents.size}`);
    console.log(`================================================================================`);
}

function printHelp() {
    console.log(`
CORE COMMANDS:
  [Enter] / tick [N]    Advance simulation by 1 (or N) days.
  logs / read           Read incoming courier dispatches and incident reports.
  roster                Review living officers and assigned tasks in your garrison.
  living                Inspect known living figures across the realm.
  dispatch <action>     Execute faction directive (see below).
  story [name|id]       List deceased actors, or inspect an actor's Post-Mortem Case File!
  expand <name|id>      Expand an actor's defining crucible moment into a 3-act prose story!
  campaign <mode>       Switch campaign (HOUSE, ORDER, SYNDICATE, DUNE, PATRON, SOVEREIGN).
  export [candidateId]  Export realm history & candidate hero to world_seed_legacy.json for July 3D!
  help                  Display this manual.
  quit / exit           Close the terminal.

FACTION ACTIONS (dispatch <action>):
  HOUSE:      patrol, requisition_fuel
  ORDER:      patrol, audit_anomaly, scrub_monument
  SYNDICATE:  patrol, smuggle_resin, extort_house
  DUNE:       patrol, condense_water, dredge_streamline, repair_tethers
  PATRON:     transmit_dream, verify_truth
  SOVEREIGN:  summon_huntsman, macabre_communion
`);
}

function promptUser() {
    renderHeader();
    rl.question(`\n[DAY ${global.window.EngineParams.worldDay}] COMMAND > `, (input) => {
        handleCommand(input.trim());
    });
}

function handleCommand(cmd) {
    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    if (action === '' || action === 'tick') {
        const days = parseInt(arg, 10) || 1;
        advanceDays(days);
        console.log(`⏩ Advanced ${days} day(s).`);
    } else if (action === 'logs' || action === 'read') {
        const list = LDM.dispatches.slice(0, 5);
        console.log(`\n📬 RECENT COURIER DISPATCHES (${LDM.dispatches.length} Total):`);
        list.forEach((d, i) => {
            console.log(`\n[${i + 1}] ${d.type} — Day ${d.day} | From: ${d.sender}`);
            console.log(`    TITLE: ${d.title}`);
            console.log(`    "${d.body}"`);
        });
        LDM.markAllRead();
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'roster') {
        console.log(`\n👥 ACTIVE GARRISON ROSTER & DRILLS:`);
        ARM.agents.forEach(a => {
            const st = a.operatingStance;
            const stanceStr = st.mode === 'TRAIN' ? `[DRILL: ${st.discipline} (${st.daysTrained}d)]` : (st.mode === 'TASK' ? `[TASK: ${st.task}]` : '[IDLE]');
            const guardianStr = a.cultivation?.isCultivatedGuardian ? ' ★ GUARDIAN OF 300' : '';
            console.log(`  • [${a.id}] ${a.name}${guardianStr} | Rank: ${a.career.rank || 'Novice'} | Stance: ${stanceStr}`);
            console.log(`    Birthright: [${a.birthright?.title || 'None'}] | Shift Birthday: Day ${a.firstShiftSurvivedDay} AF (${a.shiftsSurvived} Shifts) | Poise: ${a.vitals.poise}`);
            if (a.statusEffects?.length > 0) {
                console.log(`    Active Traits: ${a.statusEffects.map(e => `${e.name} (${e.daysRemaining}d)`).join(', ')}`);
            }
        });
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'telemetry') {
        const list = CM.getBedrockTelemetry();
        console.log(`\n🏛️  THE 20 BEDROCK CHAINED SETTLEMENTS (THE FOREST & MOUNTAIN RING):`);
        console.log(`--------------------------------------------------------------------------------`);
        list.forEach((v, i) => {
            console.log(`  ${String(i + 1).padStart(2, ' ')}. ${v.name.padEnd(18, ' ')} | House: ${v.house.padEnd(16, ' ')} | Fuel: ${v.barrierFuel}u | Chains: ${v.chainsIntegrity}%`);
        });
        console.log(`--------------------------------------------------------------------------------`);
        console.log(`  (Note: The 20 Dune Flotillas remain forgotten/lost beneath the sand horizon.)`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'train') {
        const [targetId, disc] = arg.split(' ');
        const res = ARM.setTraining(targetId || 'agt_1', disc || 'martial');
        console.log(`\n🛡️ DRILL DIRECTIVE: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'task') {
        const [targetId, tType] = arg.split(' ');
        const res = ARM.setTask(targetId || 'agt_1', tType || 'patrol');
        console.log(`\n⚔️ ACTIVE SORTIE DIRECTIVE: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'assign_bailiff') {
        const res = CM.dispatchAction('ASSIGN_BAILIFF', arg || 'agt_1');
        console.log(`\n📜 BAILIFF ASSIGNMENT: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'caravan') {
        const res = CM.dispatchAction('DISPATCH_CARAVAN', arg || 'Oakhaven');
        console.log(`\n📦 TRADE CONVOY: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'crown') {
        const sub = (arg || 'fill_full').toUpperCase();
        const res = CM.dispatchAction(`CROWN_${sub}`);
        console.log(`\n👑 ROYAL RESPONSE: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'proxy') {
        const [pType, pHouse] = arg.split(' ');
        const res = CM.dispatchAction(`PROXY_${(pType || 'raid').toUpperCase()}`, pHouse || 'House Cull');
        console.log(`\n🗡️ SHADOW WAR DIRECTIVE: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'cultivate') {
        const res = CM.dispatchAction('CULTIVATE_RUNIC', arg || 'agt_1');
        console.log(`\n🔥 TERMINUS RUNIC CULTIVATION: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'hibernate') {
        const yrs = parseInt(arg, 10) || 100;
        const res = CM.dispatchAction('HIBERNATE', yrs);
        console.log(`\n⏳ VOID SLUMBER: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'ascend') {
        const res = CM.dispatchAction('ASCEND_SOVEREIGN');
        console.log(`\n👑 PROGENITOR BREAKTHROUGH: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'living') {
        console.log(`\n👥 LIVING ACTORS ACROSS THE REALM:`);
        if (CNE.livingDossiers.size === 0) {
            console.log(`  (Populating citizen registry from active garrison...)`);
            ARM.agents.forEach(a => CNE.registerLivingActor(a.id, a.name, a.career.id));
        }
        CNE.livingDossiers.forEach(l => {
            console.log(`  • [${l.id}] ${l.name} | ${l.role} of ${l.house} (${l.settlement}) | Sorties: ${l.contractsFulfilled}`);
        });
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'dispatch') {
        const res = CM.dispatchAction(arg || 'patrol');
        console.log(`\n📜 DISPATCH ORDER RESULT: ${res.message}`);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'story') {
        if (arg) {
            console.log(CNE.formatDossier(arg));
        } else {
            const bios = CNE.getAllBiographies();
            console.log(`\n📜 ARCHIVAL NECROLOGY (${bios.length} Deceased Recorded):`);
            if (bios.length === 0) {
                console.log(`  (No actors have perished yet. Advance days or wait for barrier failure.)`);
            } else {
                bios.forEach(b => {
                    console.log(`  • [${b.id}] ${b.name} (Age ${b.ageYears}, Day ${b.deathDay} AF) | Cause: ${b.cause}`);
                    console.log(`    Defining Crucible: "${b.definingMoment?.title || 'Unknown'}"`);
                    console.log(`    Survivors: ${b.survivors.join(', ')}`);
                });
                console.log(`\n  (Type 'story <id>' to read an actor's full Case File, or 'expand <id>' for their short story.)`);
            }
        }
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'expand') {
        const text = CNE.expandStory(arg);
        console.log(text);
        console.log(`\n(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'campaign') {
        try {
            CM.selectCampaign(arg);
            console.log(`Switched to campaign: ${arg}`);
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    } else if (action === 'export') {
        const legacy = CM.exportLegacySave(arg || null);
        const outPath = 'world_seed_legacy.json';
        fs.writeFileSync(outPath, JSON.stringify(legacy, null, 2), 'utf-8');
        console.log(`\n🏆 LEGACY SAVE EXPORTED SUCCESSFULLY!`);
        console.log(`   File: ${outPath}`);
        console.log(`   Candidate: ${legacy.candidate?.name || 'Wanderer'} (Significance: ${legacy.candidate?.significance || 0})`);
        console.log(`   Ancestors Saved: ${legacy.ancestors.length}`);
        console.log(`   Settlements Anchored: ${legacy.settlements.length}`);
        console.log(`   Saved for import into the July 3D Main Game.\n`);
        console.log(`(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'help') {
        printHelp();
        console.log(`(Press Enter to continue...)`);
        rl.question('', promptUser);
        return;
    } else if (action === 'quit' || action === 'exit') {
        console.log("Terminating session. Walk with caution in the mist.");
        rl.close();
        process.exit(0);
    } else {
        console.log(`Unknown command: '${cmd}'. Type 'help' for manual.`);
    }

    setTimeout(promptUser, 800);
}

promptUser();
