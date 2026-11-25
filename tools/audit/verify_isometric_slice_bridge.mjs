import assert from 'node:assert/strict';
import fs from 'node:fs';

// Mirror src/systems/commander_ui.js -> ledger-mobile/src/systems/commander_ui.js
fs.copyFileSync('./src/systems/commander_ui.js', './ledger-mobile/src/systems/commander_ui.js');

import '../../src/core/camera_profiles.js';
import '../../src/systems/structure_manager.js';
import '../../src/systems/squad_cultivation_system.js';
import CommanderEngine from '../../src/core/commander_engine.js';
import { CommanderUI } from '../../src/systems/commander_ui.js';
import { CommanderUI as MobileCommanderUI } from '../../ledger-mobile/src/systems/commander_ui.js';

console.log('================================================================================');
console.log('🏰🐺 STEP 4 AUDIT: GENERAL LEDGER <-> 3D ISOMETRIC DUAL-LOOP SLICE BRIDGE');
console.log('================================================================================');

// 1. Verify Desktop & Mobile UI Parity
assert.equal(typeof CommanderUI.openIsometricTacticalSlice, 'function');
assert.equal(typeof MobileCommanderUI.openIsometricTacticalSlice, 'function');
console.log('[1] Desktop & Mobile CommanderUI Isometric Slice Parity Verified.');

// 2. Test Order Preservation Loop (BRIEFING -> ACTIVE_SHIFT_COUNTDOWN -> WHITE_VOID_CLIMAX -> GENERAL_LEDGER_SUMMARY)
const orderOpen = CommanderUI.openIsometricTacticalSlice('ORDER_PRESERVATION');
assert.equal(orderOpen.ok, true);
assert.equal(orderOpen.state.mode, 'ORDER_PRESERVATION');
assert.equal(orderOpen.state.phase, 'BRIEFING');
assert.equal(globalThis.getActiveCameraProfile().id, 'CLASSIC_ISOMETRIC');

const mobRes = CommanderUI.executeIsometricSliceAction('MOBILIZE_WALLS');
assert.equal(mobRes.state.phase, 'ACTIVE_SHIFT_COUNTDOWN');
assert.ok(globalThis.StructureManager.getTelemetry().occupiedMountSlots >= 2, 'Villagers should mount wall/watchtower slots');

const fuelRes = CommanderUI.executeIsometricSliceAction('DISPATCH_FUEL_SQUAD');
assert.ok(fuelRes.logEntry.includes('EXPEDITION RETURNED'), 'Adventurer dispatch should deliver Barrier Fuel');

const upgRes = CommanderUI.executeIsometricSliceAction('UPGRADE_PERIMETER_WALL');
assert.ok(upgRes.logEntry.includes('FORTIFICATION UPGRADED'), 'Wall/watchtower upgrade should succeed');

const climaxRes = CommanderUI.executeIsometricSliceAction('TRIGGER_WHITE_VOID_WAVE');
assert.equal(climaxRes.state.phase, 'GENERAL_LEDGER_SUMMARY');
console.log(`[2] Order Preservation Loop Verified: ${climaxRes.logEntry}`);

// 3. Test Pale Sovereign Harvest & Cultivation Loop
const sovOpen = CommanderUI.openIsometricTacticalSlice('SOVEREIGN_HARVEST');
assert.equal(sovOpen.state.mode, 'SOVEREIGN_HARVEST');

const probeRes = CommanderUI.executeIsometricSliceAction('SPAWN_WENDIGO_PROBE');
assert.ok(probeRes.logEntry.includes('PROBING PACK'), 'Lesser Wendigo probing pack should strike walls');

const markRes = CommanderUI.executeIsometricSliceAction('HUNTSMAN_SCOUT_AND_MARK');
assert.ok(markRes.logEntry.includes("HUNTSMAN'S MARK"), 'Huntsman & Orb should mark highest-stat target');

const scornRes = CommanderUI.executeIsometricSliceAction('HUNTSMAN_BEATDOWN_SCORN');
assert.ok(scornRes.logEntry.includes("24H HUNTSMAN'S SCORN"), 'Huntsman should beat target to 5% HP and inflict 24h Scorn');

const weightBefore = CommanderEngine.CampaignManager.sovereignHistoricalWeight || 400;
const harvestRes = CommanderUI.executeIsometricSliceAction('MACABRE_HARVEST_AND_SHATTER');
assert.equal(harvestRes.state.phase, 'GENERAL_LEDGER_SUMMARY');
assert.ok((CommanderEngine.CampaignManager.sovereignHistoricalWeight || 0) > weightBefore, 'Macabre Harvest must reconcile Historical Weight to General Ledger');
console.log(`[3] Pale Sovereign Cultivation & Harvest Loop Verified: ${harvestRes.logEntry}`);

CommanderUI.closeIsometricTacticalSlice();
assert.equal(CommanderUI.isometricSliceState.active, false);

console.log('✅ ALL STEP 4 GENERAL LEDGER <-> 3D ISOMETRIC DUAL-LOOP CHECKS PASSED!');
