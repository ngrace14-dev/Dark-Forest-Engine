/**
 * File: tools/audit/verify_geometer_system.mjs
 * Phase 2 Audit: The Geometer (The Systemic Actor) & HOST_ONLY Visibility Protocol
 *
 * Verifies:
 * 1. THE_GEOMETER is registered in ForceCatalog (src/core/civilization.js) with visibility: 'HOST_ONLY'.
 * 2. HostVisibilityController strictly strips Geometer dialogue and position when viewerIsHost === false.
 * 3. ProceduralCollisionEngine ("Grammar of Chaos") manifests The Geometer when GeologicalDissonance >= 0.65.
 * 4. Narrative Decay evolves The Geometer's dialogue across 4 physical dissolution stages (0 -> 3).
 * 5. Killing The Geometer triggers an immediate 10x EntropyMultiplier and wipes IdealBlueprint (null).
 */

import { ForceCatalog, CivilizationState } from '../../src/core/civilization.js';
import CommanderEngine, {
    GeometerRegistry,
    HostVisibilityController,
    OrphicHydrologyBlueprint,
    ProceduralCollisionEngine,
    ForestOverworldEngine
} from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('📐 DARK FOREST ENGINE — PHASE 2: THE GEOMETER & HOST_ONLY VISIBILITY AUDITOR');
console.log('================================================================================');

GeometerRegistry.resetForNewRun();
HostVisibilityController.setHostMode(true);

// 1. Verify ForceCatalog Registration in src/core/civilization.js
const geoForce = ForceCatalog.THE_GEOMETER;
if (!geoForce || geoForce.id !== 'THE_GEOMETER' || geoForce.visibility !== 'HOST_ONLY') {
    failures.push(`Expected THE_GEOMETER in ForceCatalog with HOST_ONLY visibility, got ${JSON.stringify(geoForce)}`);
}
console.log(`[1/5] ForceCatalog Registry Verified: ${geoForce.id} (${geoForce.label}) | Visibility=${geoForce.visibility}.`);

// 2. Verify Procedural Collision Integration when GeologicalDissonance reaches critical threshold (>= 0.65)
GeometerRegistry.setGeologicalDissonance(0.88);
const collisionRes = ProceduralCollisionEngine.evaluateSector({
    FORCE_THE_GEOMETER: 0.91,
    GEOLOGICAL_DISSONANCE_SHEAR: 0.89,
    ANOMALY_CONTAINMENT_ENTROPY: 0.90
}, 0.85);

if (!collisionRes || !collisionRes.payload_tags.includes('MANIFEST_THE_GEOMETER') || !GeometerRegistry.manifested) {
    failures.push(`Expected Grammar of Chaos collision to manifest The Geometer at high GeologicalDissonance, got ${JSON.stringify(collisionRes)}`);
}
console.log(`[2/5] Grammar of Chaos Manifestation Verified: "${collisionRes.eventName}" manifested The Geometer at (${GeometerRegistry.position.x}, ${GeometerRegistry.position.y}).`);

// 3. Verify Narrative Decay (4 Dissolution Stages as he merges with the landscape)
GeometerRegistry.resetForNewRun();
const stagesObserved = new Set();
const dialoguesObserved = [];
for (const dVal of [0.10, 0.35, 0.60, 0.85]) {
    GeometerRegistry.setGeologicalDissonance(dVal);
    const state = GeometerRegistry.advanceNarrativeDecay(0.02);
    stagesObserved.add(state.dissolutionStage);
    dialoguesObserved.push(`[Stage ${state.dissolutionStage}] "${state.dialogue}"`);
}
if (stagesObserved.size < 4) {
    failures.push(`Expected 4 distinct narrative dissolution stages (0, 1, 2, 3), observed ${Array.from(stagesObserved).join(', ')}`);
}
console.log(`[3/5] Narrative Decay Verified across all 4 Dissolution Stages:\n  ${dialoguesObserved.join('\n  ')}`);

// 4. Verify HOST_ONLY Visibility Controller (Clients never see Geometer's dialogue or position)
HostVisibilityController.setHostMode(true);
const hostView = GeometerRegistry.getVisibleState(HostVisibilityController.isHost);
const hostPacket = ForestOverworldEngine.exportCompanionSyncPacket(true);

HostVisibilityController.setHostMode(false);
const clientView = GeometerRegistry.getVisibleState(HostVisibilityController.isHost);
const clientPacket = ForestOverworldEngine.exportCompanionSyncPacket(false);

if (!hostView.visible || !hostView.dialogue || !hostView.position || !hostPacket.geometerState) {
    failures.push(`Expected Host view to see Geometer dialogue and position, got ${JSON.stringify(hostView)}`);
}
if (clientView.visible || clientView.dialogue !== null || clientView.position !== null || clientPacket.geometerState !== null) {
    failures.push(`HOST_ONLY breach: Client view received Geometer data: ${JSON.stringify(clientView)}`);
}
HostVisibilityController.setHostMode(true);
console.log(`[4/5] HOST_ONLY Visibility Protocol Verified: Host sees Position=(${hostView.position.x},${hostView.position.y}) & Dialogue; Client receives visible=${clientView.visible}, position=${clientView.position}, dialogue=${clientView.dialogue}.`);

// 5. Verify Killing The Geometer triggers immediate 10x EntropyMultiplier and wipes IdealBlueprint
const killRes = GeometerRegistry.killGeometer('Audit_Vanguard');
if (!killRes.success || GeometerRegistry.entropyMultiplier !== 10.0 || OrphicHydrologyBlueprint.idealBlueprint !== null || CivilizationState.entropyMultiplier !== 10.0) {
    failures.push(`Expected killing The Geometer to set 10x EntropyMultiplier and wipe IdealBlueprint to null, got ${JSON.stringify(killRes)}`);
}
console.log(`[5/5] Entropy Acceleration & Blueprint Wipe Verified: Geometer Slain -> EntropyMultiplier=${GeometerRegistry.entropyMultiplier}x, IdealBlueprint=${OrphicHydrologyBlueprint.idealBlueprint}.`);

// Restore clean state after audit
GeometerRegistry.resetForNewRun();
if (!MobileCommanderEngine.GeometerRegistry || !MobileCommanderEngine.HostVisibilityController) {
    failures.push('Mobile General Ledger mirror is missing GeometerRegistry or HostVisibilityController.');
}

if (failures.length > 0) {
    console.error('\n❌ PHASE 2 GEOMETER AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 2 THE GEOMETER & HOST_ONLY VISIBILITY AUDIT PASSED.');
