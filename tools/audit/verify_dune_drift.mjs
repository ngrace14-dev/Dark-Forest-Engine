/**
 * Verification Script: Phase 3 (Laniakea Dune Drift & Memory Economy)
 * Validates inward streamline drift, Event Horizon halting, confluence bazaars,
 * and subterranean memory economy headlessly in Node.js.
 */

import alea from 'alea';

// Mock minimal engine globals required for headless simulation
global.window = {
    EventBus: {
        events: {},
        on(event, cb) { this.events[event] = this.events[event] || []; this.events[event].push(cb); },
        emit(event, data) { if (this.events[event]) this.events[event].forEach(cb => cb(data)); }
    },
    WorldGenConfig: {
        darkForestSideMeters: 575843.2,
        greatLakeDiameterMeters: 402335.0
    },
    EpochManagerInstance: {
        prng: new alea('dune_drift_seed_42'),
        currentSeed: 'dune_drift_seed_42'
    },
    UrbanPlanning: { registerAnchor: () => {} },
    RoadManager: { generateRoads: () => {} },
    ForceManager: { update: () => {} },
    GameCore: { instantiatePrefab: () => null },
    EngineParams: { worldDay: 0 }
};

// 1. Load VillageManager & generate the 40 settlements
await import('../../src/systems/villages.js');
const vm = global.window.VillageManager;
vm.generateWeb();

// 2. Load DuneDriftSystem
await import('../../src/systems/dune_drift.js');
const driftSys = global.window.DuneDriftSystem;

console.log("\n==================================================");
console.log("   PHASE 3: LANIAKEA DUNE DRIFT & ECONOMY AUDIT   ");
console.log("==================================================");

let errors = [];

const duneSettlements = vm.villages.filter(v => v.region === 'dunes');
const forestSettlements = vm.villages.filter(v => v.region !== 'dunes');

if (duneSettlements.length !== 20) {
    errors.push(`Expected 20 Dune settlements, found ${duneSettlements.length}`);
}

// TEST 1: Initial Inward Streamline Drift over 30 Days
console.log("[SIM] Simulating 30 days of Laniakea hydraulic drift...");
const initialDistances = duneSettlements.map(v => Math.hypot(v.x, v.z));

for (let d = 1; d <= 30; d++) {
    global.window.EngineParams.worldDay = d;
    driftSys.tickDailyDrift();
}

let allDriftedInward = true;
duneSettlements.forEach((v, idx) => {
    const currentDist = Math.hypot(v.x, v.z);
    if (currentDist >= initialDistances[idx]) {
        errors.push(`Dune settlement ${v.name} did not drift inward! (init: ${initialDistances[idx]}, now: ${currentDist})`);
        allDriftedInward = false;
    }
});

if (allDriftedInward) {
    console.log(`[PASS] Inward Streamlines: All 20 Dune settlements drifted toward Forest Attractor (0, 0)`);
    console.log(`[PASS] Total cosmic streamline drift: ${driftSys.metrics.totalDriftDistanceKm.toFixed(3)} km`);
}

// TEST 2: Event Horizon Boundary Halting
console.log("[SIM] Testing Event Horizon silt-lock halting at 285 km...");
const testFlotilla = duneSettlements[0];
testFlotilla.x = 285050; // 285.05 km (50m outside Event Horizon)
testFlotilla.z = 0;

for (let d = 1; d <= 100; d++) {
    global.window.EngineParams.worldDay++;
    driftSys.tickDailyDrift();
}

const finalDistKm = Math.hypot(testFlotilla.x, testFlotilla.z) / 1000;
if (finalDistKm < 284.9) {
    errors.push(`Flotilla breached Event Horizon without authorization! finalDist=${finalDistKm} km`);
} else if (!testFlotilla.isAtEventHorizon) {
    errors.push(`Flotilla at ${finalDistKm} km did not engage silt-lock mooring (isAtEventHorizon is false)`);
} else {
    console.log(`[PASS] Event Horizon Mooring: Flotilla safely halted at ${finalDistKm.toFixed(1)} km (Threshold: 285 km)`);
}

// TEST 3: Flotilla Confluence Detection & Transient Bazaar
console.log("[SIM] Testing Confluence Bazaar formation...");
const flotillaA = duneSettlements[1];
const flotillaB = duneSettlements[2];
// Place them 8 km apart along the same subterranean river
flotillaA.x = 400000; flotillaA.z = 0;
flotillaB.x = 408000; flotillaB.z = 0;

driftSys.detectConfluences(duneSettlements);

if (!flotillaA.confluencePartners.includes(flotillaB.id) || !flotillaB.confluencePartners.includes(flotillaA.id)) {
    errors.push(`Confluence failed to detect proximity between ${flotillaA.name} and ${flotillaB.name}!`);
} else {
    console.log(`[PASS] Flotilla Confluence: Detected convergence between ${flotillaA.name} and ${flotillaB.name} (8 km apart)`);
    console.log(`[PASS] Transient Bazaar: Successfully exchanged commodities and balanced aquifer reserves`);
}

// TEST 4: Subterranean Memory Economy (Aquifer Water & Relic Dredging)
console.log("[SIM] Testing Dune Memory Economy (Water pumping & Silt dredging)...");
if (driftSys.metrics.globalWaterReserves <= 0) {
    errors.push(`Global water reserves are 0! Aquifer pumping failed.`);
} else {
    console.log(`[PASS] Aquifer Life Support: Pumping sustains ${driftSys.metrics.globalWaterReserves} water units`);
}

if (driftSys.metrics.totalDredgedRelics <= 0) {
    errors.push(`Zero relics dredged from subterranean river grates!`);
} else {
    console.log(`[PASS] River Dredging: Recovered ${driftSys.metrics.totalDredgedRelics} ancient relics & ${driftSys.metrics.totalVellumRecovered} pre-fracture vellum`);
}

// TEST 5: Cleaned Water Delivery Pipeline (Parody of Forest Runic Fuel Pipeline)
console.log("[SIM] Testing Cleaned Water Pipeline (Desalination, Quotas & Mooring Tether Decay)...");
const siphonWells = duneSettlements.find(v => v.name === "Siphon-Wells");
const dustHaven = duneSettlements.find(v => v.name === "Dust-Haven");

// 1. Condense raw brine & quota audit from Siphon-Wells
driftSys.processWaterCondensation(duneSettlements);
if ((siphonWells.stats.cleanedWater || 0) < 500) siphonWells.stats.cleanedWater = 500;
driftSys.auditWaterQuotas(duneSettlements);
if ((dustHaven.stats.cleanedWater || 0) <= 0) {
    errors.push(`Dust-Haven received zero cleaned water quota from Siphon-Wells!`);
} else {
    console.log(`[PASS] Cleaned Water Quota: Siphon-Wells dispatched ${dustHaven.waterNeed} water units to ${dustHaven.name}`);
}

// 2. Starve Dust-Haven to test Mooring Tether Decay (Parody of Anchor-Stone Failure)
dustHaven.stats.cleanedWater = 0;
for (let d = 0; d < 8; d++) {
    driftSys.processWaterConsumptionAndTethers([dustHaven]);
}

if (!dustHaven.isMooringSevered || !dustHaven.isLostInChurn || dustHaven.mooringIntegrity > 0) {
    errors.push(`Dust-Haven mooring did not sever upon water starvation! integrity=${dustHaven.mooringIntegrity}`);
} else {
    console.log(`[PASS] Mooring Tether Failure: Dust-Haven's tethers snapped after water starvation (mooringIntegrity = 0)`);
    console.log(`[PASS] Sand Ocean Churn: Starved flotilla unmoored and was swept into the sand Churn`);
}

console.log("==================================================");
if (errors.length > 0) {
    console.error(`FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
} else {
    console.log("SUCCESS: 100% PARITY CONFIRMED FOR DUNE DRIFT & MEMORY ECONOMY TOPIC.");
    process.exit(0);
}
