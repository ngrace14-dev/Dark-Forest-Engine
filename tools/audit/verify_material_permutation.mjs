/**
 * File: tools/audit/verify_material_permutation.mjs
 * Phase 3 Audit: Stochastic Material Permutation (The Corruption)
 *
 * Verifies:
 * 1. Dynamic MaterialRegistry supports canonical materials (Ironbark Wood, Basalt Stone, Siphon Resin, Gloom Glass).
 * 2. Reality Fracture Event operates at a 1 in 100,000 (1e-5) collision chance and permutes two material properties (e.g. Tree density vs. Stone hardness).
 * 3. Corrupted objects and permuted material properties persist in persistentSectorMapData across simulation ticks.
 */

import CommanderEngine, { MaterialRegistry, GeometerRegistry } from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('🪨 DARK FOREST ENGINE — PHASE 3: STOCHASTIC MATERIAL PERMUTATION AUDITOR');
console.log('================================================================================');

MaterialRegistry.resetForNewRun();
GeometerRegistry.resetForNewRun();

// 1. Verify Ideal Material Baselines
const woodBefore = { ...MaterialRegistry.getMaterial('WOOD_IRONBARK') };
const stoneBefore = { ...MaterialRegistry.getMaterial('STONE_BASALT') };

if (woodBefore.density !== 1.15 || stoneBefore.hardness !== 8.8 || MaterialRegistry.fractureChance !== 1e-5) {
    failures.push(`Unexpected baseline material properties: wood=${JSON.stringify(woodBefore)}, stone=${JSON.stringify(stoneBefore)}`);
}
console.log(`[1/3] Dynamic Material Registry Verified: Ironbark Wood (density=${woodBefore.density}) & Columnar Basalt Stone (hardness=${stoneBefore.hardness}) | Fracture Probability=${MaterialRegistry.fractureChance} (1 in 100,000).`);

// 2. Verify non-fracture roll (> 1e-5) leaves Ideal Geology untouched
const safeRollRes = MaterialRegistry.evaluateCollisionFracture({ forceRoll: 0.25 });
if (safeRollRes.fractured) {
    failures.push('Expected roll=0.25 not to trigger a 1-in-100,000 Reality Fracture.');
}

// 3. Verify 1-in-100,000 Reality Fracture Event permutes WOOD_IRONBARK.density <-> STONE_BASALT.hardness
const fractureRes = MaterialRegistry.evaluateCollisionFracture({
    forceRoll: 0.000005, // < 1e-5
    matIdA: 'WOOD_IRONBARK',
    propA: 'density',
    matIdB: 'STONE_BASALT',
    propB: 'hardness',
    sectorKey: '2260,2180',
    objectId: 'ancient_ironbark_monolith_01'
});

const woodAfter = MaterialRegistry.getMaterial('WOOD_IRONBARK');
const stoneAfter = MaterialRegistry.getMaterial('STONE_BASALT');

if (!fractureRes.fractured || woodAfter.density !== stoneBefore.hardness || stoneAfter.hardness !== woodBefore.density) {
    failures.push(`Expected Reality Fracture to permute WOOD_IRONBARK.density (${woodBefore.density}->${stoneBefore.hardness}) and STONE_BASALT.hardness (${stoneBefore.hardness}->${woodBefore.density}), got wood.density=${woodAfter.density}, stone.hardness=${stoneAfter.hardness}`);
}
console.log(`[2/3] Reality Fracture Event Verified: ${fractureRes.record.swapped}.`);

// 4. Verify Persistent Sector Map Data retains corrupted objects across ticks
CommanderEngine.advanceDays(1);
const sectorData = MaterialRegistry.getPersistentSectorData('2260,2180');
const persistedObj = sectorData?.corruptedObjects?.['ancient_ironbark_monolith_01'];
if (!persistedObj || !persistedObj.persistent || persistedObj.newValA !== 8.8 || persistedObj.newValB !== 1.15) {
    failures.push(`Expected corrupted object to persist in sector map data after day advance, got ${JSON.stringify(persistedObj)}`);
}
console.log(`[3/3] Sector Persistence Verified: Corrupted object "${persistedObj.objectId}" persisted in sector [${persistedObj.sectorKey}] across daily ticks.`);

if (!MobileCommanderEngine.MaterialRegistry) {
    failures.push('Mobile General Ledger mirror is missing MaterialRegistry.');
}

MaterialRegistry.resetForNewRun();
GeometerRegistry.resetForNewRun();

if (failures.length > 0) {
    console.error('\n❌ PHASE 3 MATERIAL PERMUTATION AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 3 STOCHASTIC MATERIAL PERMUTATION AUDIT PASSED.');
