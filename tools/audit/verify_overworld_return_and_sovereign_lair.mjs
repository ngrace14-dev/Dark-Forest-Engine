/**
 * File: tools/audit/verify_overworld_return_and_sovereign_lair.mjs
 * Audit: Timed Overworld Return Walk, Multi-Hour Village Travel & Pale Sovereign 25% Mountain Ring Lair
 */

import CommanderEngine, { ForestOverworldEngine } from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const { CampaignManager } = CommanderEngine;
const failures = [];

console.log('================================================================================');
console.log('🐺🧭 DARK FOREST ENGINE — TIMED RETURN WALK & SOVEREIGN MOUNTAIN LAIR AUDITOR');
console.log('================================================================================');

// 1. Verify Pale Sovereign Starts 25% Deep into the Mountain Ring (Not in the Woods)
CampaignManager.selectRole('PALE_SOVEREIGN');
ForestOverworldEngine.resetForNewRun();

const sovX = ForestOverworldEngine.partyX;
const sovY = ForestOverworldEngine.partyY;
const distFromCenterPx = Math.hypot(sovX - 2000, sovY - 2000);
// Mountain Ring spans 980px (Inner Rim) to 1360px (Outer Rim), thickness = 380px.
const mountainDepthRatio = (distFromCenterPx - 980) / (1360 - 980);
const mountainDepthPercent = Math.round(mountainDepthRatio * 100);
const sovBiome = ForestOverworldEngine.getBiomeAt(sovX, sovY);

if (mountainDepthPercent !== 25 || sovBiome.id !== 'MOUNTAIN_RING') {
    failures.push(`Expected Pale Sovereign to start 25% into the Mountain Ring (radius=1075px, biome=MOUNTAIN_RING), got pos=(${sovX},${sovY}), radius=${distFromCenterPx}, depth=${mountainDepthPercent}%, biome=${sovBiome.id}`);
}
console.log(`[1/3] Pale Sovereign 25% Mountain Ring Lair Verified: Spawned at (${sovX}, ${sovY}) | Radius=${distFromCenterPx}px (25% into Mountain Ring [980..1360px]) | Biome="${sovBiome.label}".`);

// 2. Verify Travel Time to Nearest Village Takes Several Real-World Hours
CampaignManager.selectRole('NOBLE_HOUSE', 'House Oakheart');
ForestOverworldEngine.resetForNewRun();

const homeX = ForestOverworldEngine.homeX;
const homeY = ForestOverworldEngine.homeY;
const nearestVillageHours = ForestOverworldEngine.computeTravelHoursForSegment(homeX, homeY, 2000, 2000);
const irlHoursAt1x = Number((nearestVillageHours * 0.5).toFixed(1));

if (irlHoursAt1x < 2.0) {
    failures.push(`Expected trek to nearest village to take multiple real-world hours at 1x speed, got ${irlHoursAt1x} IRL hours (${nearestVillageHours} in-game hours).`);
}
console.log(`[2/3] Multi-Hour Village Trek Verified: Oakhaven (${homeX},${homeY}) -> Nearest Settlement (2000,2000) takes ${nearestVillageHours} in-game hours (${irlHoursAt1x} real-world hours at 1x speed).`);

// 3. Verify Return Home Trip is a Timed Walk Back (NOT Instantaneous Teleport)
ForestOverworldEngine.setWaypoint(1620, 1690, { nodeId: 4, label: 'Blackwood', instantArrival: true });
ForestOverworldEngine.setWaypoint(1460, 2040, { nodeId: 8, label: "Crow's Perch", instantArrival: true });
const leg3Res = ForestOverworldEngine.setWaypoint(2280, 1460, { nodeId: 10, label: 'Thornbury', instantArrival: true });

if (!leg3Res.autoReturned || !ForestOverworldEngine.isMoving || !ForestOverworldEngine.isAutoReturning) {
    failures.push(`Expected supply depletion to initiate an active timed return walk (isMoving: true, isAutoReturning: true), got isMoving=${ForestOverworldEngine.isMoving}, isAutoReturning=${ForestOverworldEngine.isAutoReturning}`);
}
if (ForestOverworldEngine.partyX === homeX && ForestOverworldEngine.partyY === homeY) {
    failures.push(`Expected return home trip NOT to be instant! Squad teleported immediately to (${homeX}, ${homeY}).`);
}
if (ForestOverworldEngine.suppliesDaysRemaining !== 0) {
    failures.push(`Expected suppliesDaysRemaining to stay at 0 during the return march until reaching camp, got ${ForestOverworldEngine.suppliesDaysRemaining}`);
}

const returnStartPos = { x: ForestOverworldEngine.partyX, y: ForestOverworldEngine.partyY };
let ticksMarched = 0;
while (ForestOverworldEngine.isMoving && ticksMarched < 5000) {
    ForestOverworldEngine.updatePartyMovement(0.05);
    ticksMarched++;
}

if (ticksMarched < 50 || ForestOverworldEngine.partyX !== homeX || ForestOverworldEngine.partyY !== homeY || ForestOverworldEngine.suppliesDaysRemaining < 3) {
    failures.push(`Expected timed return walk to march step-by-step back to (${homeX},${homeY}) and restock supplies upon arrival.`);
}
console.log(`[3/3] Timed Return Walk Verified: Squad started return walk at (${returnStartPos.x}, ${returnStartPos.y}) with 0/3 supplies, marched step-by-step across ${ticksMarched} movement ticks to Home Camp (${ForestOverworldEngine.partyX}, ${ForestOverworldEngine.partyY}), and restocked to ${ForestOverworldEngine.suppliesDaysRemaining}/${ForestOverworldEngine.maxSuppliesDays} Days upon arrival.`);

if (MobileCommanderEngine.ForestOverworldEngine?.SOVEREIGN_MOUNTAIN_LAIR?.mountainDepthPercent !== 25) {
    failures.push('Mobile General Ledger mirror is missing SOVEREIGN_MOUNTAIN_LAIR parity.');
}

if (failures.length > 0) {
    console.error('\n❌ TIMED RETURN WALK & SOVEREIGN LAIR AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ TIMED RETURN WALK & PALE SOVEREIGN 25% MOUNTAIN RING LAIR AUDIT PASSED.');
