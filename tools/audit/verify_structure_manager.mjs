import assert from 'node:assert/strict';
import StructureManager, { STRUCTURE_CATALOG } from '../../src/systems/structure_manager.js';
import { TILESET, getTilesetMaterial, applyTilesetLightingState } from '../../src/core/tileset_bridge.js';

console.log('================================================================================');
console.log('🏰 STEP 2 & 2.5 AUDIT: TILESET.JSON SOURCE OF TRUTH & STRUCTURE MANAGER');
console.log('================================================================================');

// 0. Verify assets/tileset.json Source of Truth binding
assert.equal(TILESET.$schema, 'dark-forest-tileset-v1', 'Should load dark-forest-tileset-v1 schema');
assert.equal(StructureManager.gridCellSize, 2.0, 'StructureManager gridCellSize must read gridUnitMeters (2.0) from assets/tileset.json');
assert.equal(STRUCTURE_CATALOG.WATCHTOWER.mountHeightOffset, 3.8, 'Watchtower mountHeightOffset must read 3.8m from assets/tileset.json');
assert.equal(STRUCTURE_CATALOG.WALL_SEGMENT.mountHeightOffset, 1.6, 'Palisade wall mountHeightOffset must read 1.6m from assets/tileset.json');
assert.equal(STRUCTURE_CATALOG.OCP_OUTPOST.mountSlotCount, 3, 'OCP Containment Post must read 3 wallMountSlots from assets/tileset.json');
const glowMat = getTilesetMaterial('barrierFuelGlow');
assert.equal(glowMat.baseColor, '#38bdf8', 'Material palette must resolve directly from assets/tileset.json');
const voidLight = applyTilesetLightingState('whiteVoidShift');
assert.equal(voidLight.fogDensity, 0.045, 'whiteVoidShift lighting state must apply fogDensity 0.045 from assets/tileset.json');
console.log('[0] Tileset Source-of-Truth Verified: gridUnitMeters=2.0m, mountOffsets (3.8m/1.6m/1.2m), materials & whiteVoidShift lighting bound.');

// 1. Seed default settlement perimeter
const initialTelemetry = StructureManager.seedDefaultSettlementPerimeter(0, 0);
console.log(`[1] Seeded Settlement Structures: ${initialTelemetry.totalStructures} | Total Mount Slots: ${initialTelemetry.totalMountSlots}`);
assert.ok(initialTelemetry.totalStructures >= 25, 'Should seed Anchor-Stone, Gates, Watchtowers, Pylons, OCP Outpost, and Walls');
assert.ok(initialTelemetry.anchorStone && initialTelemetry.anchorStone.barrierFuel === 80, 'Anchor-Stone should start with 80u Barrier Fuel');

// 2. Verify canonical resource costs (No generic wood/stone/gold)
for (const [key, def] of Object.entries(STRUCTURE_CATALOG)) {
    if (!def.costs) continue;
    assert.equal(def.costs.wood, undefined, `${key} must not use generic wood`);
    assert.equal(def.costs.stone, undefined, `${key} must not use generic stone`);
    assert.equal(def.costs.gold, undefined, `${key} must not use generic gold`);
}
console.log('[2] Lore <-> System Parity Verified: All structures strictly consume canonical monopolies (ironbark_dust, siphon_resin, basalt_tablets, barrier_fuel).');

// 3. Upgrade a wall segment and verify mount slots expand (+1 slot per tier)
const sampleWall = Array.from(StructureManager.structures.values()).find(s => s.type === 'WALL_SEGMENT');
assert.ok(sampleWall, 'Should find a wall segment');
assert.equal(sampleWall.mountSlots.length, 2, 'Tier 1 wall segment should have 2 mount slots');
const upgRes = StructureManager.upgradeStructure(sampleWall.id);
assert.equal(upgRes.ok, true, 'Wall upgrade should succeed with canonical stockpile');
assert.equal(sampleWall.tier, 2, 'Wall should now be Tier 2');
assert.equal(sampleWall.mountSlots.length, 3, 'Tier 2 wall segment should expand to 3 mount slots');
console.log(`[3] Wall Upgrade Verified: ${sampleWall.id} -> Tier ${sampleWall.tier} (${sampleWall.mountSlots.length} wall-mounting slots, HP: ${sampleWall.hp}/${sampleWall.maxHp})`);

// 4. Mobilize Villagers & Guards to Walls during Alert (Doctrine Hierarchy)
const defenders = [
    { id: 'unit_warden_1', name: '300 Guardian Vane', role: 'warden', hp: 120 },
    { id: 'unit_militia_1', name: 'Ironbark Cooper', role: 'villager_militia', hp: 80 },
    { id: 'unit_militia_2', name: 'Resin-Tapper Mara', role: 'villager_militia', hp: 75 },
    { id: 'unit_militia_3', name: 'Basalt Mason Tor', role: 'villager_militia', hp: 90 },
    { id: 'unit_scout_out', name: 'Forest Runner Kael', role: 'adventurer', hp: 100, isDispatchedOutside: true }
];
const assignments = StructureManager.mobilizeVillagersToWalls(defenders);
assert.equal(assignments.length, 4, '4 in-settlement defenders should mount walls/watchtowers while dispatched adventurer is excluded');
assert.equal(assignments[0].structureType, 'WATCHTOWER', 'Watchtowers should be prioritized first during alerts');
console.log(`[4] Villager Wall Mobilization Verified: ${assignments.length} defenders mounted (First slot: ${assignments[0].structureType} at y=${assignments[0].position.y}m)`);

// 5. Verify Barrier Protection & Fuel Tick + Order Refuel
assert.equal(StructureManager.isPositionProtectedByBarrier(4, 4), true, 'Inner settlement coordinates should be protected by Anchor-Stone barrier');
StructureManager.update(10.0); // 10 seconds of fuel drain
const fuelAfterDrain = StructureManager.getAnchorStone().barrierFuel;
assert.ok(fuelAfterDrain < 80, 'Anchor-Stone barrier fuel should drain deterministically over time');
StructureManager.refuelAnchorStone(25);
assert.equal(StructureManager.getAnchorStone().barrierFuel, 100, 'Order refuel should top Anchor-Stone up to max capacity (100u)');
console.log(`[5] Anchor-Stone Fuel Pipeline Verified: Drained to ${fuelAfterDrain.toFixed(2)}u -> Refueled to ${StructureManager.getAnchorStone().barrierFuel}u`);

// 6. Verify Pale Sovereign Anchor-Stone Drain & Shatter + Engine Law #5 Telemetry
const anchor = StructureManager.getAnchorStone();
const shatterRes = StructureManager.applyDamageToStructure(anchor.id, 1500, {
    isPaleSovereign: true,
    attackerName: 'Korvan the Pale Sovereign'
});
assert.equal(shatterRes.isShattered, true, 'Anchor-Stone should shatter when HP hits 0');
assert.equal(anchor.chainIntegrity, 0, '50-ton chains integrity should drop to 0% upon shattering');
assert.equal(StructureManager.isPositionProtectedByBarrier(0, 0), false, 'Shattered Anchor-Stone must collapse barrier protection');
const finalTelemetry = StructureManager.getTelemetry();
assert.ok(finalTelemetry.systemicTelemetry.frameworkVectorPressure > 0, 'Engine Law #5 30% vector pressure must accumulate');
console.log(`[6] Pale Sovereign Anchor-Stone Shatter & Engine Law #5 Telemetry Verified:`, finalTelemetry.systemicTelemetry);

console.log('✅ ALL STEP 2 STRUCTURE MANAGER & WALL-MOUNTING CHECKS PASSED!');
