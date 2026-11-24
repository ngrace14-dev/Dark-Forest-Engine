/**
 * File: tools/audit/verify_phase_shift_breaches.mjs
 * Phase 4 Audit: Phase-Shift Breaches (Quantum Tunnelling, Reality Eviction & 5x5 Corruption Burst)
 *
 * Verifies:
 * 1. Breach Hazard operates at 10^-7 (1e-7) per-tick probability, setting a breached object's isSolid to false.
 * 2. Reality Eviction Protocol triggers a random Overworld teleport when an actor overlaps a non-solid (isSolid: false) breached object.
 * 3. Corruption Burst stamps a persistent 5x5 tile (25-tile) CORRUPTION_ZONE that permutes local terrain upon teleportation.
 */

import CommanderEngine, {
    PhaseShiftBreachEngine,
    ForestOverworldEngine,
    MaterialRegistry,
    GeometerRegistry
} from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('🌀 DARK FOREST ENGINE — PHASE 4: PHASE-SHIFT BREACHES (QUANTUM TUNNELLING) AUDIT');
console.log('================================================================================');

PhaseShiftBreachEngine.resetForNewRun();
MaterialRegistry.resetForNewRun();
GeometerRegistry.resetForNewRun();
ForestOverworldEngine.resetForNewRun();

// 1. Verify 10^-7 Per-Tick Breach Hazard
if (PhaseShiftBreachEngine.breachProbabilityPerTick !== 1e-7) {
    failures.push(`Expected breachProbabilityPerTick=1e-7, got ${PhaseShiftBreachEngine.breachProbabilityPerTick}`);
}

const normalTick = PhaseShiftBreachEngine.evaluateTickBreach({ forceRoll: 0.01 });
if (normalTick.breached) {
    failures.push('Expected roll=0.01 not to trigger a 10^-7 Phase-Shift Breach.');
}

const breachTick = PhaseShiftBreachEngine.evaluateTickBreach({
    forceRoll: 1e-8, // < 1e-7
    objectId: 'quantum_basalt_obelisk_07',
    gx: 8,
    gy: 11,
    worldX: 2260,
    worldY: 2180
});

if (!breachTick.breached || breachTick.object?.isSolid !== false) {
    failures.push(`Expected roll=1e-8 to trigger a Phase-Shift Breach with isSolid: false, got ${JSON.stringify(breachTick)}`);
}
console.log(`[1/3] 10^-7 Breach Hazard Verified: Object "${breachTick.object.objectId}" breached at tick roll=1e-8 -> isSolid=${breachTick.object.isSolid}.`);

// 2. Verify Reality Eviction Protocol (Actor overlapping isSolid: false object triggers random Overworld teleport)
const startX = ForestOverworldEngine.partyX;
const startY = ForestOverworldEngine.partyY;

const evictionRes = PhaseShiftBreachEngine.evaluateActorOverlap(
    { id: 'agt_1', name: 'Vanguard Scout Lyra', gx: 8, gy: 11 },
    'quantum_basalt_obelisk_07'
);

if (!evictionRes.evicted || (ForestOverworldEngine.partyX === startX && ForestOverworldEngine.partyY === startY)) {
    failures.push(`Expected overlapping breached isSolid:false object to teleport party on Overworld Map, got ${JSON.stringify(evictionRes)}`);
}
console.log(`[2/3] Reality Eviction Protocol Verified: Actor "${evictionRes.record.actorName}" overlapped non-solid object and quantum-teleported from (${startX}, ${startY}) to (${ForestOverworldEngine.partyX}, ${ForestOverworldEngine.partyY}).`);

// 3. Verify 5x5 Tile CORRUPTION_ZONE Burst upon teleportation
const cz = evictionRes.corruptionZone;
if (!cz || cz.type !== 'CORRUPTION_ZONE' || cz.width !== 5 || cz.height !== 5 || cz.tileCount !== 25 || cz.tiles.length !== 25) {
    failures.push(`Expected 5x5 (25-tile) CORRUPTION_ZONE burst on teleportation, got ${JSON.stringify(cz)}`);
}
const sectorPermutations = MaterialRegistry.getPersistentSectorData(`${ForestOverworldEngine.partyX},${ForestOverworldEngine.partyY}`)?.terrainPermutations || [];
if (sectorPermutations.length === 0) {
    failures.push('Expected 5x5 CORRUPTION_ZONE to persist in destination sector terrainPermutations.');
}
console.log(`[3/3] 5x5 Corruption Burst Verified: Stamped ${cz.width}x${cz.height} (${cz.tileCount} tiles) [${cz.type}] at destination sector (${cz.worldX}, ${cz.worldY}).`);

if (!MobileCommanderEngine.PhaseShiftBreachEngine) {
    failures.push('Mobile General Ledger mirror is missing PhaseShiftBreachEngine.');
}

PhaseShiftBreachEngine.resetForNewRun();
MaterialRegistry.resetForNewRun();
GeometerRegistry.resetForNewRun();
ForestOverworldEngine.resetForNewRun();

if (failures.length > 0) {
    console.error('\n❌ PHASE 4 PHASE-SHIFT BREACH AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 4 PHASE-SHIFT BREACHES (QUANTUM TUNNELLING) AUDIT PASSED.');
