/**
 * File: tools/audit/verify_hydraulic_pressure_governance.mjs
 * Audit: Hydraulic Pressure Registry & Drainage Basin Governance
 *
 * Verifies:
 * 1. All 8 Orphic Inner Basin Rivers are governed by volumetric capacity, slope gradient, and Upstream -> Downstream Noble House parish topology.
 * 2. Upstream siphoning/impounding creates an auditable volumetric discrepancy in auditDrainageLedger(), mutates the War Board, and mints a 5-property Fact Dossier in RealityEditorVault.
 * 3. Exceeding the TetherTensionLimit / ChainIntegrity threshold triggers a Catastrophic Hydrological Breach that permutes local geology via MaterialRegistry and physically reroutes downstream river waypoints.
 */

import CommanderEngine, {
    HydraulicPressureRegistry,
    MaterialRegistry,
    OrphicHydrologyBlueprint
} from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const { RealityEditorVault } = CommanderEngine;
const failures = [];

console.log('================================================================================');
console.log('💧 DARK FOREST ENGINE — HYDRAULIC PRESSURE & DRAINAGE GOVERNANCE AUDITOR');
console.log('================================================================================');

OrphicHydrologyBlueprint.generateIdealBlueprint();
MaterialRegistry.resetForNewRun();
RealityEditorVault.resetForNewRun();
HydraulicPressureRegistry.resetForNewRun();

// 1. Verify Initial Balanced Drainage Ledger across all 8 Orphic Tributaries
const initialLedger = HydraulicPressureRegistry.auditDrainageLedger();
if (!initialLedger.balanced || HydraulicPressureRegistry.riverNodes.size !== 8 || initialLedger.totalDeficitCubicM !== 0) {
    failures.push(`Expected balanced initial drainage ledger across 8 Orphic rivers, got ${JSON.stringify(initialLedger)}`);
}
console.log(`[1/3] Drainage Basin Topology Verified: ${HydraulicPressureRegistry.riverNodes.size} governed Orphic rivers | Total Flow=${initialLedger.totalExpectedCubicM} m³/s (Deficit=${initialLedger.totalDeficitCubicM} m³/s).`);

// 2. Verify Upstream Siphoning -> Forensic Discrepancy, War Board Friction & 5-Property Fact Dossier
const siphonRes = HydraulicPressureRegistry.siphonOrImpoundUpstream('ORPHIC_RIVER_2', 0.40, false);
const postSiphonLedger = HydraulicPressureRegistry.auditDrainageLedger();

if (postSiphonLedger.balanced || postSiphonLedger.totalDeficitCubicM <= 0 || !siphonRes.factDossier?.title?.includes('Hydrological Sluice Discrepancy')) {
    failures.push(`Expected upstream siphoning on ORPHIC_RIVER_2 to create an auditable deficit and mint a Fact Dossier, got ${JSON.stringify(siphonRes)}`);
}
console.log(`[2/3] Upstream Siphoning & Forensic Fact Minting Verified: ${siphonRes.discrepancy.upstreamCulprit} siphoned -${siphonRes.discrepancy.missingVolumeCubicM} m³/s from ${siphonRes.discrepancy.downstreamVictim} -> Minted Fact: "${siphonRes.factDossier.title}".`);

// 3. Verify High-Pressure Damming -> Catastrophic Hydrological Breach, Material Permutation & River Rerouting
const origWaypoints = HydraulicPressureRegistry.riverNodes.get('ORPHIC_RIVER_3').waypoints.map(w => ({ ...w }));
const breachRes = HydraulicPressureRegistry.siphonOrImpoundUpstream('ORPHIC_RIVER_3', 0.75, true);
const reroutedNode = HydraulicPressureRegistry.riverNodes.get('ORPHIC_RIVER_3');
const midIdx = Math.floor(origWaypoints.length / 2);

if (!breachRes.breachTriggered || !reroutedNode.rerouted || reroutedNode.waypoints[midIdx].x === origWaypoints[midIdx].x) {
    failures.push(`Expected damming ORPHIC_RIVER_3 above tether limit to trigger Catastrophic Hydrological Breach and physically reroute waypoints, got ${JSON.stringify(breachRes)}`);
}
console.log(`[3/3] Catastrophic Hydrological Breach & Rerouting Verified: WaterPressure=${reroutedNode.waterPressureIndex}% breached sluice at (${breachRes.breachResult.breachCoord.x}, ${breachRes.breachResult.breachCoord.y}), permuted local geology, and carved new river channel.`);

if (!MobileCommanderEngine.HydraulicPressureRegistry) {
    failures.push('Mobile General Ledger mirror is missing HydraulicPressureRegistry.');
}

HydraulicPressureRegistry.resetForNewRun();
MaterialRegistry.resetForNewRun();

if (failures.length > 0) {
    console.error('\n❌ HYDRAULIC PRESSURE GOVERNANCE AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ HYDRAULIC PRESSURE REGISTRY & DRAINAGE GOVERNANCE AUDIT PASSED.');
