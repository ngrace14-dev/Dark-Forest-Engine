/**
 * File: tools/audit/verify_tidewater_hydrology_coupling.mjs
 * Phase 8 Audit: Tidewater System <-> Orphic Hydrology Blueprint & Geological Dissonance Coupling
 *
 * Verifies:
 * 1. TidewaterSystem instantiates cleanly in a headless Node.js environment (Zero-WebGL crash safety).
 * 2. TidewaterSystem.syncWithReality() binds the 8 Orphic Inner Basin River mouths from OrphicHydrologyBlueprint.idealBlueprint.
 * 3. Rising GeologicalDissonance (via GeometerRegistry) dynamically raises seaLevelY (flooding the Inner Basin from -10.0m toward +35.0m) and scales Gerstner wave amplitude (uAmplitudeMult).
 * 4. Killing The Geometer (wiping IdealBlueprint to null) triggers an immediate 2.5x Gerstner storm surge and clears river-mouth damping.
 */

import { TidewaterSystem } from '../../src/systems/tidewater.js';
import CommanderEngine, {
    OrphicHydrologyBlueprint,
    GeometerRegistry
} from '../../src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('🌊 DARK FOREST ENGINE — PHASE 8: TIDEWATER <-> ORPHIC HYDROLOGY COUPLING AUDITOR');
console.log('================================================================================');

GeometerRegistry.resetForNewRun();
const tidewater = new TidewaterSystem();

// 1. Verify Baseline Coupling at Low Dissonance (0.05)
const baselineSync = tidewater.syncWithReality();
if (baselineSync.coupledRiverMouths !== 8 || !baselineSync.idealBlueprintIntact || baselineSync.seaLevelY >= 0) {
    failures.push(`Expected 8 coupled Orphic river mouths and intact IdealBlueprint at baseline, got ${JSON.stringify(baselineSync)}`);
}
console.log(`[1/3] Baseline Orphic Coupling Verified: ${baselineSync.coupledRiverMouths} Orphic Tributary mouths bound | SeaLevelY=${baselineSync.seaLevelY}m | AmplitudeMult=${baselineSync.amplitudeMult}x.`);

// 2. Verify Dissonance-Driven Sea Level Rise (Flooding the Inner Basin at 0.90 Dissonance)
GeometerRegistry.setGeologicalDissonance(0.90);
let highDissSync = null;
for (let i = 0; i < 12; i++) {
    highDissSync = tidewater.syncWithReality();
}
if (highDissSync.seaLevelY <= 15.0 || highDissSync.amplitudeMult <= 1.5) {
    failures.push(`Expected high GeologicalDissonance (0.90) to raise sea level > 15m and wave amplitude > 1.5x, got ${JSON.stringify(highDissSync)}`);
}
console.log(`[2/3] Dissonance Sea-Level Surge Verified: At Dissonance=${highDissSync.coupledDissonance}, SeaLevelY rose to +${highDissSync.seaLevelY}m (Target: +${highDissSync.targetSeaLevelY}m) | Wave Amplitude=${highDissSync.amplitudeMult}x.`);

// 3. Verify Geometer Termination Storm Surge (IdealBlueprint Wiped -> 2.5x Wave Amplitude)
GeometerRegistry.killGeometer('Audit_Tidewater');
const postKillSync = tidewater.syncWithReality();
if (postKillSync.idealBlueprintIntact || postKillSync.coupledRiverMouths !== 0 || postKillSync.amplitudeMult !== 2.5) {
    failures.push(`Expected Geometer death to wipe river mouth damping and trigger 2.5x storm surge, got ${JSON.stringify(postKillSync)}`);
}
console.log(`[3/3] Geometer Termination Storm Surge Verified: IdealBlueprintIntact=${postKillSync.idealBlueprintIntact} | CoupledRiverMouths=${postKillSync.coupledRiverMouths} | Storm Surge AmplitudeMult=${postKillSync.amplitudeMult}x.`);

GeometerRegistry.resetForNewRun();

if (failures.length > 0) {
    console.error('\n❌ PHASE 8 TIDEWATER COUPLING AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 8 TIDEWATER <-> ORPHIC HYDROLOGY COUPLING AUDIT PASSED (Zero Issues).');
