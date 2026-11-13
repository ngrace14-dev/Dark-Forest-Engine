/**
 * Verification Script: Phase 2 (Runic Barrier Fuel Pipeline Parity)
 * Validates the full extraction -> synthesis -> imprinting -> distribution -> burning cycle headlessly in Node.js.
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
        prng: new alea('fuel_pipeline_seed_42'),
        currentSeed: 'fuel_pipeline_seed_42'
    },
    UrbanPlanning: { registerAnchor: () => {} },
    RoadManager: { generateRoads: () => {} },
    ForceManager: { update: () => {} },
    GameCore: { instantiatePrefab: () => null }
};

// 1. Load VillageManager & generate the 40 settlements
await import('../../src/systems/villages.js');
const vm = global.window.VillageManager;
vm.generateWeb();

// 2. Load BarrierPipeline & FuelObservatory
await import('../../src/systems/barrier_pipeline.js');
await import('../../src/systems/fuel_observatory.js');

const pipeline = global.window.BarrierPipeline;
const observatory = global.window.FuelObservatory;

console.log("\n==================================================");
console.log("   PHASE 2: RUNIC BARRIER FUEL PIPELINE AUDIT     ");
console.log("==================================================");

let errors = [];

// TEST 1: Initial State Audit
const forestSettlements = vm.villages.filter(v => v.region !== 'dunes');
const duneSettlements = vm.villages.filter(v => v.region === 'dunes');

if (forestSettlements.length !== 20) {
    errors.push(`Expected 20 Forest/Mountain settlements, found ${forestSettlements.length}`);
}
if (duneSettlements.length !== 20) {
    errors.push(`Expected 20 Dune settlements, found ${duneSettlements.length}`);
}

// TEST 2: Extraction & Synthesis over 7 daily ticks
console.log("[SIM] Running 7 daily extraction & synthesis cycles...");
for (let day = 1; day <= 7; day++) {
    pipeline.tickDailyProduction();
}

const shadowfen = forestSettlements.find(v => v.nobleHouse === 'House Shadowfen');
const capital = forestSettlements.find(v => v.capital);

if (pipeline.pipelineMetrics.finishedFuelCrates <= 0) {
    errors.push(`Pipeline failed to produce finished fuel crates (produced: ${pipeline.pipelineMetrics.finishedFuelCrates})`);
} else {
    console.log(`[PASS] Synthesis & Imprinting: Capital Crucible produced ${pipeline.pipelineMetrics.finishedFuelCrates} finished fuel crates`);
}

// TEST 3: Weekly Quota Distribution
console.log("[SIM] Auditing weekly quota distribution from Capital...");
const initialCapitalFuel = capital.stats.essence;
pipeline.auditQuotas();

let allQuotasFulfilled = true;
forestSettlements.forEach(v => {
    if (v.capital) return;
    if ((v.stats.essence || 0) <= 0) {
        allQuotasFulfilled = false;
        errors.push(`Village ${v.name} was not allocated barrier fuel essence!`);
    }
});

if (allQuotasFulfilled) {
    console.log(`[PASS] Quota Distribution: All 19 Forest/Mountain houses successfully received fuel allocations`);
}

// TEST 4: Observatory Integration
observatory.auditFuelChain();
const obsMetrics = observatory.metrics;
if (obsMetrics.stockpileLevels.essence <= 0) {
    errors.push(`FuelObservatory reported 0 essence stockpile!`);
} else {
    console.log(`[PASS] Fuel Observatory: Global essence monitored at ${obsMetrics.stockpileLevels.essence} units`);
}

// TEST 5: Controlled Starvation & Barrier Decay Test
console.log("[SIM] Testing Anchor-Stone decay on starved village (Oakhaven)...");
const testVillage = forestSettlements.find(v => v.nobleHouse === 'House Oakheart');
testVillage.stats.essence = 0; // Cut off fuel supply

// Run 8 days of burn
for (let d = 0; d < 8; d++) {
    pipeline.processAnchorBurn([testVillage]);
}

if (!testVillage.anchorFailed || testVillage.barrierIntegrity > 0) {
    errors.push(`Starved village barrier did not collapse as expected! integrity=${testVillage.barrierIntegrity}, anchorFailed=${testVillage.anchorFailed}`);
} else {
    console.log(`[PASS] Anchor Failure: Oakhaven barrier decayed to 0% after fuel starvation (anchorFailed = true)`);
}

// TEST 6: 14-Day Shift Reality Collapse Test
console.log("[SIM] Triggering 14-Day Shift cycle...");
pipeline.auditShiftSurvival();

if (!testVillage.isDisconnected) {
    errors.push(`Starved village Oakhaven was not disconnected into White Void during Shift!`);
} else {
    console.log(`[PASS] White Void Collapse: Unanchored village Oakhaven was swallowed by White Void`);
}

// Verify Capital and fueled villages survived
const survivors = forestSettlements.filter(v => !v.isDisconnected);
if (!survivors.includes(capital)) {
    errors.push(`Capital was disconnected! Capital must remain bedrock-anchored.`);
} else {
    console.log(`[PASS] Chained Stability: Capital and ${survivors.length - 1} fueled houses survived the Shift`);
}

console.log("==================================================");
if (errors.length > 0) {
    console.error(`FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
} else {
    console.log("SUCCESS: 100% PARITY CONFIRMED FOR FUEL PIPELINE TOPIC.");
    process.exit(0);
}
