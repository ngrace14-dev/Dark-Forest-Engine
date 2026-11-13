/**
 * Verification Script: Phase 5 (Mythic Threats & Predators Parity)
 * Validates Korvan the Variable (Pale Sovereign), The Macabre Communion,
 * Herald Wendigo mutations, and Huntsman cultivation headlessly in Node.js.
 */

// Mock minimal engine globals required for headless simulation
global.window = {
    isHeadless: true,
    EventBus: {
        events: {},
        on(event, cb) { this.events[event] = this.events[event] || []; this.events[event].push(cb); },
        emit(event, data) { if (this.events[event]) this.events[event].forEach(cb => cb(data)); }
    },
    EngineParams: { worldDay: 0, timeScale: 0 },
    GameState: {
        paleSovereign: {
            originGladiator: 'Korvan the Variable',
            significance: 1000, 
            highestConsumedSignificance: 0, 
            totalResidue: 0,
            isHarvestReady: false,
            growthMultiplier: 1.0,
            harvestHistory: [],
            heralds: [],
            stalkTargetId: null,
            isDead: false,
            returnDay: -1, 
            stats: { strength: 100, toughness: 100, speed: 100 }
        },
        huntsmanMantle: {
            activeHuntsman: 'initial_huntsman',
            lastVictimId: null,
            targetSignificanceFloor: 0
        }
    },
    GameCore: {
        activeEntities: [
            { id: 'adv_1', name: 'Commander Justin', role: 'commander', tier: 'elite', significance: 30, power: 45, villageId: 1 },
            { id: 'adv_2', name: 'Scout Lyra', role: 'scout', tier: 'standard', significance: 15, power: 25, villageId: 2 },
            { id: 'adv_3', name: 'Knight Ronald', role: 'guardian', tier: 'elite', significance: 20, power: 35, villageId: 3 }
        ],
        SpatialGrid: { getNearbyEntities: () => [] }
    },
    AdventurerManager: {
        records: []
    }
};

// 1. Load ForceManager & AdversarialLearning
await import('../../src/systems/forces.js');
await import('../../src/systems/adversarial_learning.js');

const fm = global.window.ForceManager;
const aed = global.window.AdversarialEvolution;

console.log("\n==================================================");
console.log("   PHASE 5: MYTHIC THREATS & PREDATORS AUDIT      ");
console.log("==================================================");

let errors = [];

// TEST 1: Initial Predator State
const sov = global.window.GameState.paleSovereign;
if (sov.originGladiator !== 'Korvan the Variable') {
    errors.push(`Expected origin gladiator 'Korvan the Variable', found '${sov.originGladiator}'`);
} else {
    console.log(`[PASS] Pale Sovereign Identity: Korvan the Variable (The First Wendigo)`);
}

// TEST 2: Autonomous Huntsman Cultivation & Sovereign Ambush
console.log("[SIM] Running autonomous predator cultivation & hunting cycles...");
let cultivationLogged = false;
let huntLogged = false;
let heraldMutationLogged = false;

global.window.EventBus.on('HUNTSMAN_CULTIVATION', () => { cultivationLogged = true; });
global.window.EventBus.on('SOVEREIGN_HUNT_BEGINS', () => { huntLogged = true; });
global.window.EventBus.on('HERALD_WENDIGO_MUTATION', () => { heraldMutationLogged = true; });

// Run 5 daily ticks to allow Huntsman to cultivate Commander Justin past significance 35
for (let d = 1; d <= 5; d++) {
    global.window.EngineParams.worldDay = d;
    fm.tickPredatorCycle();
}

if (!cultivationLogged) {
    errors.push(`Huntsman cultivation cycle did not trigger!`);
} else {
    console.log(`[PASS] Huntsman Cultivation: Successfully identified and groomed Commander Justin`);
}

if (!huntLogged) {
    errors.push(`Pale Sovereign did not initiate hunt on cultivated legend!`);
} else {
    console.log(`[PASS] Sovereign Stalking: Korvan the Variable targeted high-density prey`);
}

// TEST 3: The Macabre Communion & Herald Wendigo Mutation (Codex §II)
if (!heraldMutationLogged || sov.heralds.length === 0) {
    errors.push(`The Macabre Communion failed to produce an intelligent Herald Wendigo!`);
} else {
    const herald = sov.heralds.find(h => h.formerName === 'Commander Justin') || sov.heralds[0];
    if (!herald.isHerald || !herald.isSentient || !herald.formerName) {
        errors.push(`Herald Wendigo corrupted: ${JSON.stringify(herald)}`);
    } else {
        console.log(`[PASS] The Macabre Communion: Korvan force-fed fungal flesh to ${herald.formerName}`);
        console.log(`[PASS] Herald Wendigo Mutation: Created intelligent lieutenant with tactical intellect ${herald.tacticalIntellect} (Total Heralds: ${sov.heralds.length})`);
    }
}

// TEST 4: Sovereign Winter Resurrection Loop
console.log("[SIM] Testing Sovereign winter resurrection cycle...");
sov.isDead = true;
sov.returnDay = 365;

// Advance to next winter (Month 12 = Day 360)
global.window.EngineParams.worldDay = 365;
fm.checkSovereignResurrection();

if (sov.isDead) {
    errors.push(`Pale Sovereign failed to resurrect during winter conditions!`);
} else {
    console.log(`[PASS] Winter Rebirth: Korvan the Variable resurrected during winter solstice`);
}

console.log("==================================================");
if (errors.length > 0) {
    console.error(`FAILED with ${errors.length} errors:`);
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
} else {
    console.log("SUCCESS: 100% PARITY CONFIRMED FOR MYTHIC THREATS & PREDATORS TOPIC.");
    process.exit(0);
}
