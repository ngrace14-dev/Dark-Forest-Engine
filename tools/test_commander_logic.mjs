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
['commander-terminal-root', 'text-commander-viewport', 'status-bar', 'commander-action-banner', 'dispatches-list', 'roster-list', 'story-archive', 'inquest-verdict-bar', 'story-reader'].forEach(id => {
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
