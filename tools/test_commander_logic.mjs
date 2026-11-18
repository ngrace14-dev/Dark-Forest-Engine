/**
 * File: tools/test_commander_logic.mjs
 * Headless verification test for Phase 1 Clean-Room Commander Simulation Core.
 */

import CommanderEngine from '../src/core/commander_engine.js';

console.log("================================================================================");
console.log("🧪 PHASE 1 VERIFICATION: HEADLESS COMMANDER CORE (ZERO-DOM / ZERO-THREE.JS)");
console.log("================================================================================");

let failures = [];

// 1. Verify immediate boot state
const initialStatus = CommanderEngine.CampaignManager.getCampaignStatus();
console.log(`[1] Initial Campaign Mode: ${initialStatus.mode} | Day: ${initialStatus.day}`);
if (initialStatus.mode !== 'HOUSE') failures.push('Expected default mode HOUSE');

// 2. Verify initial garrison roster seeded
const rosterCount = CommanderEngine.AgentRosterManager.agents.size;
console.log(`[2] Seeded Garrison Roster: ${rosterCount} agents`);
if (rosterCount === 0) failures.push('Expected non-empty agent roster on boot');

// 3. Verify initial dispatches generated
const dispatchCount = CommanderEngine.LogDispatchManager.dispatches.length;
console.log(`[3] Initial Dispatches: ${dispatchCount} items`);
if (dispatchCount === 0) failures.push('Expected initial dispatches on boot');

// 4. Verify 20 Bedrock Settlements telemetry (20 surface vs 21 physical with Epitaph masked)
const bedrock = CommanderEngine.CampaignManager.getBedrockTelemetry();
const physicalRegistry = CommanderEngine.CampaignManager.getPhysicalBedrockRegistry();
console.log(`[4] Surface Census: ${bedrock.length} settlements | Physical Registry: ${physicalRegistry.length} nodes (Epitaph masked: ${!bedrock.some(s => s.name === 'Epitaph')})`);
if (bedrock.length !== 20) failures.push(`Expected 20 surface Bedrock settlements, got ${bedrock.length}`);
if (physicalRegistry.length !== 21) failures.push(`Expected 21 physical Bedrock nodes (including Epitaph), got ${physicalRegistry.length}`);
if (bedrock.some(s => s.name === 'Epitaph')) failures.push('Epitaph should be masked from surface telemetry while blindSpotEntropy < 85');

// 5. Verify 19-House War Board (Epitaph excluded from competing Houses; House Bleak present)
const warBoard = CommanderEngine.CampaignManager.getWarBoard();
console.log(`[5] Feudal War Board: ${warBoard.length} Noble Houses (Epitaph excluded: ${!warBoard.some(h => h.name === 'House Epitaph')})`);
if (warBoard.length !== 19) failures.push(`Expected 19 Noble Houses, got ${warBoard.length}`);
if (warBoard.some(h => h.name === 'House Epitaph')) failures.push('Epitaph does not participate in Noble House competition loops');

// 6. Verify Directives & Time Advancement across a 14-day Shift
const patrolRes = CommanderEngine.CampaignManager.dispatchAction('PATROL');
console.log(`[6] Directive [PATROL]: ${patrolRes.message}`);
if (!patrolRes.success) failures.push('Expected PATROL directive to succeed');

CommanderEngine.advanceDays(14);
const postShiftStatus = CommanderEngine.CampaignManager.getCampaignStatus();
console.log(`[7] Post-Shift Day: ${postShiftStatus.day} | Fuel: ${postShiftStatus.state.barrierFuelUnits}u | Dispatches: ${CommanderEngine.LogDispatchManager.dispatches.length}`);
if (postShiftStatus.day !== 15) failures.push(`Expected Day 15 after +14 days, got ${postShiftStatus.day}`);

// 7. Verify Inquest & Necrology / Legacy Save Export
const inq = CommanderEngine.InterrogationDesk.interrogate('agt_2');
const verdict = CommanderEngine.InterrogationDesk.renderVerdict('agt_2', 'execute');
console.log(`[8] Inquest Verdict: ${verdict.message}`);
const bios = CommanderEngine.CrucibleNarrativeEngine.getAllBiographies();
console.log(`[9] Recorded Biographies after execution: ${bios.length}`);
if (bios.length === 0) failures.push('Expected biography recorded in CrucibleNarrativeEngine');

const legacy = CommanderEngine.CampaignManager.exportLegacySave();
console.log(`[10] Legacy Save Export: Candidate=${legacy.candidate?.name}, Settlements=${legacy.settlements.length}, Ancestors=${legacy.ancestors.length}`);
if (!legacy.candidate || legacy.settlements.length < 20) failures.push('Legacy save export incomplete');

// 8. Verify Phase 2 DOM View Layer (CommanderUI) with simulated DOM elements
const mockElements = new Map();
const makeEl = (id) => ({
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    dataset: {},
    classList: {
        _set: new Set(['hidden']),
        remove(c) { this._set.delete(c); },
        add(c) { this._set.add(c); },
        contains(c) { return this._set.has(c); }
    }
});
['commander-terminal-root', 'text-commander-viewport', 'status-bar', 'commander-action-banner', 'crisis-triage-panel', 'btn-autotick-state', 'timescale-bar', 'daily-goal-bar', 'role-directives-bar', 'expeditions-list', 'dispatches-list', 'roster-list', 'story-archive', 'inquest-verdict-bar', 'story-reader'].forEach(id => {
    mockElements.set(id, makeEl(id));
});
globalThis.document = {
    readyState: 'complete',
    getElementById: (id) => mockElements.get(id) || null
};
globalThis.window = globalThis;

const { CommanderUI } = await import('../src/systems/commander_ui.js');
CommanderUI.openRoleSelection();
if (!mockElements.get('commander-terminal-root').innerHTML.includes('SELECT YOUR VANTAGE ROLE')) {
    failures.push('Royal Archive Role Selection menu failed to render on openRoleSelection()');
}

// Verify Noble House Scion random 1-of-18 house roll & Crown Favor mandate
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE');
const rolledHouse = CommanderEngine.CampaignManager.state.house;
console.log(`[11] Rolled Noble House: ${rolledHouse.houseId} (${rolledHouse.settlementName}) | Monopoly: ${rolledHouse.monopoly} | Crown Favor: ${rolledHouse.crownFavor}% | Dispensation: ${rolledHouse.hasHorizonDispensation}`);
if (!rolledHouse.monopoly || rolledHouse.hasHorizonDispensation !== false) {
    failures.push('Noble House Scion should roll a non-Terminus house with a unique monopoly and hasHorizonDispensation=false');
}

// Verify Terminus role restores legal Horizon Dispensation & 300 Guardians
CommanderUI.selectRoleAndLaunch('TERMINUS');
const termHouse = CommanderEngine.CampaignManager.state.house;
if (termHouse.houseId !== 'House Terminus' || termHouse.hasHorizonDispensation !== true || termHouse.guardiansCount !== 300) {
    failures.push('Terminus role failed to restore House Terminus & 300 Guardians');
}

// Verify Role-Scoped & Facility-Gated Directives for Crime Syndicate Boss (no Crown Fuel or Sovereign buttons)
CommanderUI.selectRoleAndLaunch('SYNDICATE');
const synDirsHtml = mockElements.get('role-directives-bar').innerHTML;
if (!synDirsHtml.includes('Send Smuggler Skiff') || synDirsHtml.includes('Crown: Fill Full') || synDirsHtml.includes('Dispatch Bound Huntsman')) {
    failures.push('Syndicate role directives were not properly scoped');
}

// Verify Base Start Gating, Facility Unlocks, Village Guard Prosperity Regen & Fallout Shelter Expedition Log
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE', 'House Oakheart');
const lockedGuardedRes = CommanderEngine.ExpeditionEngine.launchExpedition('GUARDED_CARAVAN', 'Gallows Hill');
if (lockedGuardedRes.success !== false) {
    failures.push('Guarded Caravan must be locked at Base Start before Guard Barracks is constructed');
}
const unguardedRes = CommanderEngine.ExpeditionEngine.launchExpedition('UNGUARDED_CARAVAN', 'Gallows Hill');
if (!unguardedRes.success || CommanderEngine.ExpeditionEngine.activeExpeditions.length !== 1) {
    failures.push('Unguarded Caravan must be available at Base Start and populate activeExpeditions');
}
CommanderEngine.FacilityEngine.unlockFacility('guard_barracks');
const guardedRes = CommanderEngine.ExpeditionEngine.launchExpedition('GUARDED_CARAVAN', 'Gallows Hill');
if (!guardedRes.success) {
    failures.push('Guarded Caravan should unlock after constructing Guard Barracks');
}
CommanderEngine.tickInGameHour(4);
console.log(`[11f] Active Expedition Mid-Mission Log: ${guardedRes.expedition.logs[guardedRes.expedition.logs.length - 1]}`);
const skipRes = CommanderEngine.chronoSkipDays(1);
console.log(`[11g] Chrono-Skip Result (Seals Left: ${skipRes.sealsRemaining}): ${skipRes.skippedEvents[0]}`);
if (!skipRes.success) failures.push('Chrono-Skip failed');

// Verify Phase 2 Emergence: Expedition Combat Profile & Manifesto §8 Will-to-Live Tactical Retreat
const retreatAgent = CommanderEngine.AgentRosterManager.agents.get('agt_2');
if (retreatAgent) {
    retreatAgent.vitals.hp = 20;
    retreatAgent.vitals.poise = 18;
    retreatAgent.operatingStance = { mode: 'IDLE', discipline: null, task: null, daysTrained: 0 };
}
// Temporarily mark agt_1 busy so agt_2 leads the high-hazard raid
const leadOne = CommanderEngine.AgentRosterManager.agents.get('agt_1');
if (leadOne) leadOne.operatingStance.mode = 'OUT_ON_MISSION';
const raidExpRes = CommanderEngine.ExpeditionEngine.launchExpedition('PROXY_RAID', 'Cullfield');
if (leadOne) leadOne.operatingStance.mode = 'IDLE';
CommanderEngine.ExpeditionEngine.tickExpeditionHours(3);
if (raidExpRes.expedition.status !== 'RETREATED') {
    failures.push(`Expected critically wounded/low-poise agent to trigger Will-to-Live RETREATED status, got ${raidExpRes.expedition.status}`);
}
console.log(`[11f-Retreat] Emergent Will-to-Live Retreat Verified: ${raidExpRes.expedition.logs[raidExpRes.expedition.logs.length - 1]}`);

// Verify 30–60min / 40-Day Crisis Grace Period & House Wraith (Wraith's End) Deep-Oil Fire Crisis
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE', 'House Wraith');
const ce = CommanderEngine.CrisisEngine;
if (ce.isGracePeriodComplete(10) !== false || ce.isGracePeriodComplete(42) !== true) {
    failures.push('Crisis Grace Period check failed (should block before Day 40 and allow at Day 40+)');
}
window.setNextDayGoal('MAXIMIZE_MONOPOLY');
ce.triggerContextualCrisis('NOBLE_HOUSE', 'House Wraith');
CommanderUI.render();
if (ce.activeCrisis?.id !== 'wraith_deep_oil_fire' || ce.activeCrisis?.boundSettlement !== "Wraith's End") {
    failures.push("House Wraith should trigger the Wraith's End Leviathan Deep-Oil Vat Fire crisis");
}
const waterRes = ce.resolveActiveCrisis('WATER_BRIGADE');
console.log(`[11b] House Wraith Oil Fire + Water Brigade Outcome: [${waterRes.outcomeType}] ${waterRes.message}`);
if (waterRes.outcomeType !== 'CATASTROPHIC_FLARE') {
    failures.push('Sending Water Brigade to House Wraith oil fire must cause CATASTROPHIC_FLARE');
}

// Verify Option B: Dream Intervention Mitigation during Active Crisis & Chrono-Skip
const dreamRes = CommanderEngine.triggerDreamIntervention('wraith_deep_oil_fire', 10);
if (!dreamRes.success || CommanderEngine.CampaignManager.state.house.dreamSiphon !== 20) {
    failures.push(`Expected Dream Intervention to deduct 10u Dream Siphon (20u remaining), got ${CommanderEngine.CampaignManager.state.house.dreamSiphon}`);
}
ce.triggerContextualCrisis('NOBLE_HOUSE', 'House Wraith');
const mitigatedRes = ce.resolveActiveCrisis('WATER_BRIGADE');
console.log(`[11b-Dream] Dream-Mitigated Crisis Outcome: [${mitigatedRes.outcomeType}] ${mitigatedRes.message}`);
if (mitigatedRes.outcomeType !== 'MITIGATED') {
    failures.push(`Expected MITIGATED outcome when Dream Intervention is active, got ${mitigatedRes.outcomeType}`);
}

// Verify 12-Hour Real-World Day (1x) & 8x Max Time Scale Clamping
if (CommanderEngine.baseDayDurationMs !== 12 * 60 * 60 * 1000) {
    failures.push(`Expected 12h baseDayDurationMs (43,200,000 ms), got ${CommanderEngine.baseDayDurationMs}`);
}
window.setTimeScale(16); // Should clamp to max 8x
if (CommanderEngine.timeScale !== 8 || CommanderEngine.getEffectiveDayDurationMs() !== 5400000) {
    failures.push(`Expected 8x clamped timeScale (5,400,000 ms = 1.5h/day), got ${CommanderEngine.timeScale}x (${CommanderEngine.getEffectiveDayDurationMs()} ms)`);
}
window.setTimeScale(1);
console.log(`[11c] TimeScale Verified: 1x=${CommanderEngine.getEffectiveDayDurationMs() / 3600000}h/day | Max=8x (1.5h/day)`);

// Verify End-of-Day Pause, Supplies Gain/Loss Report & Role-Specific Ambush/Hunting/Production Targets
CommanderUI.selectRoleAndLaunch('SYNDICATE');
window.setNextDayGoal('AMBUSH_SHADOWFEN_CONVOY');
window.advanceDays(1);
if (!ce.pendingDailyReconciliation || CommanderUI.autoTickEnabled !== false) {
    failures.push('Expected simulation to pause at end of day with pendingDailyReconciliation=true');
}
if (!ce.lastDayReport?.gains.includes('Contraband Resin')) {
    failures.push('Expected Syndicate ambush target to report Contraband Resin supply gain');
}
console.log(`[11d] End-of-Day Reconciliation Report: Gains="${ce.lastDayReport.gains}" | Losses="${ce.lastDayReport.losses}"`);

// Verify Phase 1 Emergence: 6-Role State Machine, Active Monopoly Modifiers & Dynamic 19-House War Board
const rsm = CommanderEngine.RoleStateMachine;
if (rsm.currentPhase !== 'EVENING_RECONCILIATION') {
    failures.push(`Expected RoleStateMachine phase EVENING_RECONCILIATION at end of day, got ${rsm.currentPhase}`);
}
const shadowfenAfterAmbush = CommanderEngine.CampaignManager.getWarBoard().find(h => h.name === 'House Shadowfen');
if (!shadowfenAfterAmbush || shadowfenAfterAmbush.power >= 66) {
    failures.push(`Expected House Shadowfen War Board power to drop below 66 after Syndicate convoy ambush, got ${shadowfenAfterAmbush?.power}`);
}

// Verify GUILD & MERCHANT daily reconciliation systemic math
CommanderUI.selectRoleAndLaunch('GUILD');
const prevAnom = CommanderEngine.CampaignManager.state.order.containedAnomalies;
window.setNextDayGoal('GUILD_MIST_SWEEP');
window.advanceDays(1);
if (CommanderEngine.CampaignManager.state.order.containedAnomalies <= prevAnom) {
    failures.push('Expected GUILD_MIST_SWEEP daily reconciliation to increment containedAnomalies');
}

CommanderUI.selectRoleAndLaunch('MERCHANT');
const prevSig = CommanderEngine.CampaignManager.state.patron.candidateSignificance;
window.setNextDayGoal('TRADE_RESIN_ARBITRAGE');
window.advanceDays(1);
if (CommanderEngine.CampaignManager.state.patron.candidateSignificance <= prevSig) {
    failures.push('Expected TRADE_RESIN_ARBITRAGE daily reconciliation to increment candidateSignificance');
}
console.log(`[11d-Roles] 6-Role State Machine & Dynamic War Board Verified (Shadowfen Power=${shadowfenAfterAmbush?.power}, Guild Anomalies=${CommanderEngine.CampaignManager.state.order.containedAnomalies}, Merchant Sig=${CommanderEngine.CampaignManager.state.patron.candidateSignificance})`);

// Verify Phase 3 Emergence: State-Driven Emergent Crisis Synthesis (Ward Starvation & Rival Sabotage)
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE', 'House Oakheart');
CommanderEngine.CampaignManager.state.house.barrierFuelUnits = 8; // Starve fuel below 12u threshold
const starvationCrisis = ce.triggerContextualCrisis('NOBLE_HOUSE', 'House Oakheart');
if (!starvationCrisis?.id.startsWith('emergent_ward_starvation_')) {
    failures.push(`Expected low fuel (8u) to synthesize emergent_ward_starvation crisis, got ${starvationCrisis?.id}`);
}
const containRes = ce.resolveActiveCrisis('DEPLOY_WARDEN_CREWS');
if (containRes.outcomeType !== 'CONTAINED') {
    failures.push(`Expected DEPLOY_WARDEN_CREWS to contain emergent ward starvation crisis, got ${containRes.outcomeType}`);
}
console.log(`[11d-EmergentCrisis] State-Driven Crisis Verified: ${starvationCrisis?.title} -> [${containRes.outcomeType}]`);

CommanderUI.selectRoleAndLaunch('SYNDICATE');

// Verify Squad Armory Auto-Sort, Individual Equip & Character Stat Sheet
const autoSortRes = CommanderEngine.AgentRosterManager.giveGearToSquadAutoSort('widow_resin_blade');
const directEquipRes = CommanderEngine.AgentRosterManager.assignGearToAgent('agt_1', 'grimsby_plate');
window.viewAgentStatSheet('agt_1');
const statSheetText = mockElements.get('story-reader').innerText;
console.log(`[11e] Squad Gear & Stat Sheet: ${autoSortRes.message} | ${directEquipRes.message}`);
if (!statSheetText.includes('SQUAD MEMBER CHARACTER STAT SHEET') || !statSheetText.includes('Grimsby Runic-Dusted Hauberk')) {
    failures.push('Character Stat Sheet failed to display equipped Grimsby Runic-Dusted Hauberk');
}

CommanderUI.selectRoleAndLaunch('TERMINUS');

window.viewTelemetry();
if (!mockElements.get('story-reader').innerText.includes('THE 20 BEDROCK CHAINED SETTLEMENTS')) {
    failures.push('CommanderUI telemetry reader failed to render');
}
window.viewWarBoard();
if (!mockElements.get('story-reader').innerText.includes('THE 19 NOBLE HOUSES')) {
    failures.push('CommanderUI war board reader failed to render');
}
window.viewShadowLedger();
if (!mockElements.get('story-reader').innerText.includes('THE GENERAL LEDGER: ROYAL ARCHIVE STATISTICAL & CASUALTY AUDIT')) {
    failures.push('CommanderUI General Ledger Audit reader failed to render');
}

// 9. Verify Temporal Relativity, Mountain Rotation in 7-day Void, Tragic Alignment, and Entropy Breach
const sie = CommanderEngine.ShadowInfluenceEngine;
if (sie.relativity.perceivedForestYears !== 12000 || sie.relativity.objectiveYears !== 18000 || sie.relativity.missingGapYears !== 6000) {
    failures.push('Temporal relativity 12k/18k/6k invariant mismatch');
}
if (sie.relativity.mountainRotationDegrees <= 0) {
    failures.push('Expected Mountain Ring rotation drift > 0 after 14-day Shift / 7-day White Void');
}
const korvanCheck = sie.evaluateKorvanTarget({ faction: 'Epitaph' });
if (korvanCheck.immune !== false || korvanCheck.actualKorvanStance !== 'KORVAN_ONLY') {
    failures.push('Tragic Alignment violation: Korvan must only be Korvan\'s ally and grant zero immunity to Epitaph');
}

// Verify 25-Mile Border Optical Mirage & Relative Rotation Law
const farMountain = sie.evaluateBorderPerception('mountain', 40, true);
const farDune = sie.evaluateBorderPerception('dune', 40, true);
const nearMountainShift = sie.evaluateBorderPerception('mountain', 15, true);
const nearDuneShift = sie.evaluateBorderPerception('dune', 15, true);
if (farMountain.perceivedHorizon !== 'ENDLESS_MOUNTAINS' || farDune.perceivedHorizon !== 'ENDLESS_DUNES') {
    failures.push('Outside 25 miles, Mountains must look like endless mountains and Dunes must look like endless dunes');
}
if (nearMountainShift.perceivedMotion !== 'DUNES_APPEAR_TO_ROTATE_AROUND_MOUNTAIN' || nearDuneShift.perceivedMotion !== 'MOUNTAIN_RING_ACTUALLY_SPINNING') {
    failures.push('Within 25 miles during a Shift, Mountain observer sees sands rotating around mountain; Dune observer sees Mountain Ring spinning');
}
CommanderEngine.CampaignManager.dispatchAction('BREACH_BLIND_SPOT');
const postBreachTelemetry = CommanderEngine.CampaignManager.getBedrockTelemetry({ allowTwentyFirst: true });
console.log(`[11] Post-Breach Telemetry Count: ${postBreachTelemetry.length} (Epitaph Revealed: ${postBreachTelemetry.some(s => s.name === 'Epitaph')})`);
if (postBreachTelemetry.length !== 21 || !postBreachTelemetry.some(s => s.name === 'Epitaph')) {
    failures.push('Expected 21 nodes with Epitaph exposed after blindSpotEntropy >= 85');
}
console.log(`[12] Phase 2 General Ledger UI Status="${mockElements.get('status-bar').innerText}"`);

if (failures.length > 0) {
    console.error("❌ FAILURES:", failures);
    process.exit(1);
} else {
    console.log("✅ ALL PHASE 1 & PHASE 2 GENERAL LEDGER & EPITAPH RELATIVITY CHECKS PASSED!");
}
