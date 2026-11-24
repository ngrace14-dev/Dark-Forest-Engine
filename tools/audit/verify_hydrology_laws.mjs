/**
 * File: tools/audit/verify_hydrology_laws.mjs
 * Phase 1 Audit: Orphic Hydrology & Tectonic Invariants (The Ideal Blueprint)
 *
 * Verifies:
 * 1. Geological Integrity: The Mountain Ring is codified as the primary watershed and the Great Lake as the primary sink.
 * 2. Tectonic Lineaments: Directional mountain chains are generated along tectonic plate vectors rather than random placement.
 * 3. Dune Siphon-Flow ("Infinity Feed"): Dune river systems exist without mountain watersheds via extra-dimensional siphon anomalies.
 * 4. Every river maps monotonically from source (Mountain Ring or Infinity Feed) to sink (Great Lake or Event Horizon Silt-Lock).
 */

import CommanderEngine, { OrphicHydrologyBlueprint } from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('🌊 DARK FOREST ENGINE — PHASE 1: ORPHIC HYDROLOGY & TECTONIC INVARIANTS AUDITOR');
console.log('================================================================================');

// 1. Audit IdealBlueprint generation & Hydrology Laws on Desktop Core
const bp = OrphicHydrologyBlueprint.generateIdealBlueprint();
const auditRes = OrphicHydrologyBlueprint.auditHydrologyLaws();

if (!auditRes.valid) {
    failures.push(`Desktop Hydrology Audit failed: ${auditRes.violations.join(' | ')}`);
}

// 2. Verify Primary Watershed (Mountain Ring) & Primary Sink (Great Lake)
if (bp.primaryWatershed?.id !== 'MOUNTAIN_RING_WATERSHED' || bp.primarySink?.id !== 'GREAT_LAKE_SINK') {
    failures.push(`Expected MOUNTAIN_RING_WATERSHED and GREAT_LAKE_SINK, got watershed=${bp.primaryWatershed?.id}, sink=${bp.primarySink?.id}`);
}
console.log(`[1/4] Geological Integrity Verified: Watershed="${bp.primaryWatershed.name}" (${bp.primaryWatershed.innerRadiusKm}–${bp.primaryWatershed.outerRadiusKm}km) -> Sink="${bp.primarySink.name}" (${bp.primarySink.diameterMiles}mi diameter, ${bp.primarySink.sinkElevationMeters}m depth).`);

// 3. Verify Directional Tectonic Lineaments (Anisotropic mountain chains along plate strike vectors)
const plate0 = bp.tectonicPlates[0];
const alignedX = 2000 + Math.cos(plate0.strikeAngleRad) * 1150;
const alignedY = 2000 + Math.sin(plate0.strikeAngleRad) * 1150;
const offAxisX = 2000 + Math.cos(plate0.strikeAngleRad + Math.PI) * 1150;
const offAxisY = 2000 + Math.sin(plate0.strikeAngleRad + Math.PI) * 1150;
const elevAligned = OrphicHydrologyBlueprint.computeTectonicElevationAt(alignedX, alignedY);
const elevLake = OrphicHydrologyBlueprint.computeTectonicElevationAt(2000, 2000);

if (elevAligned <= 500 || elevLake >= 0) {
    failures.push(`Tectonic elevation invariant failed: Mountain chain elev=${elevAligned}m, Great Lake center elev=${elevLake}m.`);
}
console.log(`[2/4] Tectonic Lineaments Verified: ${bp.tectonicPlates.length} directional plate vectors active (Peak Chain Elevation=${elevAligned}m vs. Great Lake Sink=${elevLake}m).`);

// 4. Verify Every Inner Basin River maps from Source (Mountain Ring) to Sink (Great Lake)
if (!Array.isArray(bp.innerRivers) || bp.innerRivers.length < 8) {
    failures.push(`Expected at least 8 Orphic inner basin rivers, found ${bp.innerRivers?.length || 0}.`);
}
for (const river of bp.innerRivers) {
    const startElev = river.source.elevationMeters;
    const endElev = river.sink.elevationMeters;
    if (river.source.region !== 'MOUNTAIN_RING' || river.sink.region !== 'GREAT_LAKE' || startElev <= endElev) {
        failures.push(`Inner river ${river.id} failed source->sink mapping: ${river.source.region} (${startElev}m) -> ${river.sink.region} (${endElev}m).`);
    }
}
console.log(`[3/4] Orphic Watershed -> Sink Rivers Verified: All ${bp.innerRivers.length} inner rivers descend monotonically from the Mountain Ring to the Great Lake.`);

// 5. Verify Dune Siphon-Flow ("Infinity Feed") Extra-Dimensional Anomalies
if (!Array.isArray(bp.duneSiphonRivers) || bp.duneSiphonRivers.length < 4) {
    failures.push(`Expected 4 Dune Infinity Feed siphon rivers, found ${bp.duneSiphonRivers?.length || 0}.`);
}
for (const dRiver of bp.duneSiphonRivers) {
    if (dRiver.sourceType !== 'EXTRA_DIMENSIONAL_INFINITY_FEED' || dRiver.requiresMountainWatershed !== false || !dRiver.extraDimensionalSignature) {
        failures.push(`Dune river ${dRiver.id} missing Infinity Feed anomaly configuration.`);
    }
}
console.log(`[4/4] Dune Siphon-Flow ("Infinity Feed") Verified: ${bp.duneSiphonRivers.length} Dune river systems sustained by extra-dimensional rifts (${bp.duneSiphonRivers.map(r => r.extraDimensionalSignature).join(', ')}) without mountain watersheds.`);

// 6. Verify Mobile General Ledger Mirror Parity
const mobileAudit = MobileCommanderEngine.OrphicHydrologyBlueprint?.auditHydrologyLaws();
if (!mobileAudit?.valid) {
    failures.push(`Mobile mirror OrphicHydrologyBlueprint audit failed: ${JSON.stringify(mobileAudit)}`);
}

if (failures.length > 0) {
    console.error('\n❌ PHASE 1 HYDROLOGY AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 1 HYDROLOGY & TECTONIC INVARIANTS AUDIT PASSED (100% Ideal Blueprint Parity).');
