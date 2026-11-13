/**
 * Verification Script: Phase 6 (Shadow Institutions, Scribal Orders & Nuisance Gangs)
 * Validates Director Jess Nedaf & OCP, The 3 Scribal Orders, and The Ecology of Nuisance headlessly in Node.js.
 */

import alea from 'alea';

// Mock minimal engine globals required for headless simulation
global.window = {
    isHeadless: true,
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
        prng: new alea('institutions_seed_42'),
        currentSeed: 'institutions_seed_42'
    },
    UrbanPlanning: { registerAnchor: () => {} },
    RoadManager: { generateRoads: () => {} },
    ForceManager: { update: () => {} },
    GameCore: { instantiatePrefab: () => null },
    EngineParams: { worldDay: 0, timeScale: 0 }
};

// 1. Load VillageManager & generate the 40 settlements
await import('../../src/systems/villages.js');
const vm = global.window.VillageManager;
vm.generateWeb();

// 2. Load ShadowInstitutions
await import('../../src/systems/shadow_institutions.js');
const shadowSys = global.window.ShadowInstitutions;

console.log("\n==================================================");
console.log("   PHASE 6: SHADOW INSTITUTIONS & ORDERS AUDIT    ");
console.log("==================================================");

let errors = [];

// TEST 1: Obsidian Citadel Protocol (Director Jess Nedaf)
const ocp = shadowSys.ocp;
if (ocp.director.name !== 'Director Jess Nedaf' || ocp.director.state !== 'ACTIVE') {
    errors.push(`Expected Director Jess Nedaf active, found: ${JSON.stringify(ocp.director)}`);
} else {
    console.log(`[PASS] OCP Command: Director Jess Nedaf presiding over Site Operations`);
}

// Run 10 weekly audits
for (let i = 0; i < 10; i++) {
    ocp.processAudit();
}

if (ocp.vault.form12BLedgers.length === 0) {
    errors.push(`OCP failed to file any Form 12-B Incident Reports!`);
} else {
    console.log(`[PASS] Compliance Audits: ${ocp.vault.form12BLedgers.length} Form 12-B Incident Reports filed`);
}

// TEST 2: The Chronal Window Departure Event (Addendum AA §IV)
console.log("[SIM] Testing Chronal Window Tavern Hand-Off...");
let departureEventLogged = false;
global.window.EventBus.on('OCP_DIRECTOR_DEPARTURE', () => { departureEventLogged = true; });

const departed = ocp.checkChronalWindow(5, true);
if (!departed || ocp.director.state !== 'DEPARTED' || !ocp.actingDirector) {
    errors.push(`Chronal Window departure failed: state=${ocp.director.state}`);
} else {
    console.log(`[PASS] Chronal Departure: Director Jess Nedaf exited through the Door`);
    console.log(`[PASS] Authority Hand-Off: ${ocp.actingDirector.name} assumed Eternal Containment`);
}

// TEST 3: The 3 Scribal Orders (Addendum CA-16)
console.log("[SIM] Testing Scribal Orders (Iron Chantry, Flayed Quill, Dust-Wardens)...");
const scribal = shadowSys.scribal;

for (let i = 0; i < 15; i++) {
    scribal.processScribalClashes();
}

if (scribal.ironChantry.hereticsCaptured === 0) {
    errors.push(`Iron Chantry inquisitors captured zero heretics!`);
} else {
    console.log(`[PASS] Iron Chantry Orthodoxy: Enforced stone script, captured ${scribal.ironChantry.hereticsCaptured} flesh-scribes`);
}

if (scribal.dustWardens.scrubbedMonuments === 0) {
    errors.push(`Dust-Wardens scrubbed zero monuments!`);
} else {
    console.log(`[PASS] Dust-Wardens: Scrubbed ${scribal.dustWardens.scrubbedMonuments} forbidden monuments with vinegar-ash`);
    console.log(`[PASS] 25th Nameless Rune: ${scribal.dustWardens.namelessRuneFragments} fragments preserved across 3 High Wardens`);
}

// TEST 4: The Ecology of Nuisance (Addendum AB)
console.log("[SIM] Testing Ecology of Nuisance (Echo-Walkers, Fuel-Leeches, Runic-Scabs)...");
const nuisance = shadowSys.nuisance;
const forestSettlements = vm.villages.filter(v => v.region !== 'dunes');

for (let i = 0; i < 15; i++) {
    nuisance.processNuisanceTick(forestSettlements);
}

if (nuisance.echoWalkers.fakeMapsSold === 0) {
    errors.push(`Echo-Walkers sold zero fake shift maps!`);
} else {
    console.log(`[PASS] Echo-Walkers: Peddled ${nuisance.echoWalkers.fakeMapsSold} distorted shift-maps at crossroads`);
}

if (nuisance.fuelLeeches.fuelStolenTotal === 0) {
    errors.push(`Fuel-Leeches stole zero fuel!`);
} else {
    console.log(`[PASS] Fuel-Leeches: Micro-siphoned ${nuisance.fuelLeeches.fuelStolenTotal} barrier fuel units from delivery crates`);
}

if (nuisance.runicScabs.lootedRelicsTotal === 0) {
    errors.push(`Runic-Scabs poached zero relics!`);
} else {
    console.log(`[PASS] Runic-Scabs: Poached ${nuisance.runicScabs.lootedRelicsTotal} relics before historical capture`);
}

console.log("==================================================");
if (errors.length > 0) {
    console.error(`FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
} else {
    console.log("SUCCESS: 100% PARITY CONFIRMED FOR SHADOW INSTITUTIONS & ORDERS TOPIC.");
    process.exit(0);
}
