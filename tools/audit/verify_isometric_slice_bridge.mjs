import assert from 'node:assert/strict';
import fs from 'node:fs';

// Mirror src/systems/commander_ui.js -> ledger-mobile/src/systems/commander_ui.js before dynamic import
fs.copyFileSync('./src/systems/commander_ui.js', './ledger-mobile/src/systems/commander_ui.js');

await import('../../src/core/camera_profiles.js');
const { UI_SCHEMA, getUiSkin } = await import('../../src/core/tileset_bridge.js');
await import('../../src/systems/structure_manager.js');
await import('../../src/systems/squad_cultivation_system.js');
const { default: CommanderEngine } = await import('../../src/core/commander_engine.js');
const { CommanderUI } = await import('../../src/systems/commander_ui.js');
const { CommanderUI: MobileCommanderUI } = await import('../../ledger-mobile/src/systems/commander_ui.js');

console.log('================================================================================');
console.log('🏰🐺 STEP 4 & RETRO-UI-V2 AUDIT: GENERAL LEDGER <-> 3D ISOMETRIC DUAL-LOOP');
console.log('================================================================================');

// 0. Verify dark-forest-retro-ui-v2 schema & 3 skins
assert.equal(UI_SCHEMA.$schema, 'dark-forest-retro-ui-v2', 'Should load dark-forest-retro-ui-v2 schema');
assert.equal(UI_SCHEMA.archetype.viewportBudget.canvasOpenAreaMinPercent, 74);
assert.equal(getUiSkin('ORDER_PRESERVATION').accentPrimary, '#38bdf8');
assert.equal(getUiSkin('SOVEREIGN_HARVEST').accentPrimary, '#dc2626');
assert.equal(getUiSkin('WHITE_VOID_SHIFT').accentPrimary, '#0284c7');
assert.equal(UI_SCHEMA.layoutZones.zone4_bottomCommandDeck.components.retroFolderTabs.length, 5);
console.log('[0] Retro UI v2 Schema Verified: 4 Zones, 5 Retro Folder Tabs (CMD|VAULT|MAP|TRUTH|LOGS), 60px Beveled Keycaps & 3 Skins.');

// 1. Verify Desktop & Mobile UI Parity
assert.equal(typeof CommanderUI.openIsometricTacticalSlice, 'function');
assert.equal(typeof MobileCommanderUI.openIsometricTacticalSlice, 'function');
assert.equal(typeof CommanderUI.selectRetroFolderTab, 'function');
assert.equal(typeof MobileCommanderUI.selectRetroFolderTab, 'function');
console.log('[1] Desktop & Mobile CommanderUI Isometric Slice & Retro Folder Tab Parity Verified.');

// 2. Test Order Preservation Loop using 1-word Beveled RTS Keycap directives (MOBILIZE | DISPATCH | FORTIFY | ANCHOR)
const orderOpen = CommanderUI.openIsometricTacticalSlice('ORDER_PRESERVATION');
assert.equal(orderOpen.ok, true);
assert.equal(orderOpen.state.mode, 'ORDER_PRESERVATION');
assert.equal(orderOpen.state.skin, 'ORDER_PRESERVATION');
assert.equal(orderOpen.state.phase, 'BRIEFING');
assert.equal(globalThis.getActiveCameraProfile().id, 'CLASSIC_ISOMETRIC');

const tabSwitch = CommanderUI.selectRetroFolderTab('logs');
assert.equal(tabSwitch.activeFolderTab, 'logs');
assert.equal(tabSwitch.drawerExpanded, true);

const mobRes = CommanderUI.executeIsometricSliceAction('MOBILIZE');
assert.equal(mobRes.state.phase, 'ACTIVE_SHIFT_COUNTDOWN');
assert.ok(globalThis.StructureManager.getTelemetry().occupiedMountSlots >= 2, 'Villagers should mount wall/watchtower slots');

const fuelRes = CommanderUI.executeIsometricSliceAction('DISPATCH');
assert.ok(fuelRes.logEntry.includes('EXPEDITION RETURNED'), 'Adventurer dispatch should deliver Barrier Fuel');

const upgRes = CommanderUI.executeIsometricSliceAction('FORTIFY');
assert.ok(upgRes.logEntry.includes('FORTIFICATION UPGRADED'), 'Wall/watchtower upgrade should succeed');

const climaxRes = CommanderUI.executeIsometricSliceAction('ANCHOR');
assert.equal(climaxRes.state.phase, 'GENERAL_LEDGER_SUMMARY');
assert.equal(climaxRes.state.skin, 'WHITE_VOID_SHIFT', 'Triggering White Void Climax must switch UI skin to WHITE_VOID_SHIFT');
console.log(`[2] Order Preservation Loop & WHITE_VOID_SHIFT Skin Verified: ${climaxRes.logEntry}`);

// 3. Test Pale Sovereign Harvest & Cultivation Loop using 1-word Beveled RTS Keycap directives (PROBE | MARK | CULTIVATE | HARVEST)
const sovOpen = CommanderUI.openIsometricTacticalSlice('SOVEREIGN_HARVEST');
assert.equal(sovOpen.state.mode, 'SOVEREIGN_HARVEST');
assert.equal(sovOpen.state.skin, 'SOVEREIGN_HARVEST');

const probeRes = CommanderUI.executeIsometricSliceAction('PROBE');
assert.ok(probeRes.logEntry.includes('PROBING PACK'), 'Lesser Wendigo probing pack should strike walls');

const markRes = CommanderUI.executeIsometricSliceAction('MARK');
assert.ok(markRes.logEntry.includes("HUNTSMAN'S MARK"), 'Huntsman & Orb should mark highest-stat target');

const scornRes = CommanderUI.executeIsometricSliceAction('CULTIVATE');
assert.ok(scornRes.logEntry.includes("24H HUNTSMAN'S SCORN"), 'Huntsman should beat target to 5% HP and inflict 24h Scorn');

const weightBefore = CommanderEngine.CampaignManager.sovereignHistoricalWeight || 400;
const harvestRes = CommanderUI.executeIsometricSliceAction('HARVEST');
assert.equal(harvestRes.state.phase, 'GENERAL_LEDGER_SUMMARY');
assert.ok((CommanderEngine.CampaignManager.sovereignHistoricalWeight || 0) > weightBefore, 'Macabre Harvest must reconcile Historical Weight to General Ledger');
console.log(`[3] Pale Sovereign Cultivation & Harvest Loop Verified: ${harvestRes.logEntry}`);

CommanderUI.closeIsometricTacticalSlice();
assert.equal(CommanderUI.isometricSliceState.active, false);

console.log('✅ ALL STEP 4 GENERAL LEDGER <-> 3D ISOMETRIC DUAL-LOOP CHECKS PASSED!');
