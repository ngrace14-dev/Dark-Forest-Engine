// File: src/systems/significance/MobilitySimulationTest.js
import { SignificanceMobilityFramework } from './SignificanceMobilityFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runMobilitySimulation() {
    console.log("--- Starting Significance Mobility Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const mobility = new SignificanceMobilityFramework(settlement);

    // 1. Scenario: Geriatric Stagnation
    console.log("\n--- PHASE 1: Hero Monopoly ---");
    const elders = Array.from({ length: 5 }, (_, i) => ({ id: `Elder_${i}`, age: 260, prestige: 0.9 }));
    const youth = Array.from({ length: 20 }, (_, i) => ({ id: `Youth_${i}`, age: 30, prestige: 0.05 }));
    settlement.actors = [...elders, ...youth];

    console.log(JSON.stringify(mobility.generateMobilityReport(), null, 2));

    // 2. Scenario: Healthy Circulation
    console.log("\n--- PHASE 2: Healthy Mobility ---");
    const newElders = Array.from({ length: 5 }, (_, i) => ({ id: `Elder_${i}`, age: 260, prestige: 0.4 }));
    const newYouth = Array.from({ length: 10 }, (_, i) => ({ id: `Youth_${i}`, age: 30, prestige: 0.5 }));
    settlement.actors = [...newElders, ...newYouth];

    console.log(JSON.stringify(mobility.generateMobilityReport(), null, 2));
}
