// File: src/systems/independent/IndependentSimulationTest.js
import { AlternativeCivilizationFramework } from './AlternativeCivilizationFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runIndependentSimulation() {
    console.log("--- Starting Independent Civilization Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const independent = new AlternativeCivilizationFramework(settlement);

    // 1. Scenario: Mainstream Village
    console.log("\n--- PHASE 1: Mainstream Settlement ---");
    settlement.tradeVolume = 500;
    settlement.actors = Array.from({ length: 50 }, () => ({ traits: { cynicism: 0.2 }, isDead: false }));
    settlement.culture = { beliefSystems: [{ type: 'Philosophy' }] };
    settlement.history = { pillars: [{ currentStrength: 1.0 }] };
    settlement.politics = { calculateLegitimacy: () => 0.8 };

    console.log(JSON.stringify(independent.generateDivergenceReport(), null, 2));

    // 2. Scenario: Rogue Settlement
    console.log("\n--- PHASE 2: Rogue Civilization ---");
    settlement.tradeVolume = 5; // Low trade
    settlement.culture = { beliefSystems: [{ type: 'Heresy' }] }; // Alternative faith
    settlement.politics = { calculateLegitimacy: () => 0.1 }; // Alternative power (failed mandate)

    console.log(JSON.stringify(independent.generateDivergenceReport(), null, 2));
}
