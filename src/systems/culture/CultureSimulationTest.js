// File: src/systems/culture/CultureSimulationTest.js
import { CulturalEmergenceFramework } from './CulturalEmergenceFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runCultureSimulation() {
    console.log("--- Starting Cultural Emergence Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const culture = new CulturalEmergenceFramework(settlement);

    // Mock actors with specific trait clusters to force emergence
    const zealots = Array.from({ length: 5 }, (_, i) => ({
        id: `Zealot_${i}`,
        traits: { superstition: 0.9, fear: 0.8, altruism: 0.2, cynicism: 0.2, loyalty: 0.5 },
        isDead: false
    }));

    const philosophers = Array.from({ length: 5 }, (_, i) => ({
        id: `Philosopher_${i}`,
        traits: { altruism: 0.9, conscientiousness: 0.9, superstition: 0.1, cynicism: 0.1, loyalty: 0.8 },
        isDead: false
    }));

    settlement.actors.push(...zealots, ...philosophers);

    console.log("\n--- PHASE 1: Emergence Scan ---");
    culture.scanForEmergence();

    console.log("\n--- PHASE 2: Adoption Cycle ---");
    // Process multiple ticks
    for (let i = 0; i < 5; i++) {
        culture.processBeliefDynamics();
    }

    console.log("\n--- FINAL OBSERVATORY REPORT ---");
    const report = culture.generateObservatoryReport();
    console.log(JSON.stringify(report, null, 2));
}
