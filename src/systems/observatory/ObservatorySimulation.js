// File: src/systems/observatory/ObservatorySimulation.js
import { ExplorerCausalityObservatory } from './ExplorerCausalityObservatory.js';

export function runObservatorySimulation() {
    console.log("--- Initializing Explorer Causality Laboratory ---");
    
    const laboratory = new ExplorerCausalityObservatory();

    const explorers = [
        {
            id: "Curious_Veteran",
            wealth: 0.8,
            personalFoodReserve: 500,
            fatigue: 0,
            traits: {
                ambition: 1.0,
                fear: 0.0,
                conscientiousness: 1.0,
                constitution: 1.0,
                riskTolerance: 0.5,
                aggression: 0.0 // Zero metabolism penalty
            }
        },
        {
            id: "Desperate_Exile",
            wealth: 0.05,
            personalFoodReserve: 10,
            fatigue: 0.2,
            traits: {
                ambition: 0.4,
                fear: 0.9,
                conscientiousness: 0.2,
                constitution: 0.3,
                riskTolerance: 0.1,
                aggression: 0.5
            }
        }
    ];

    const env = { danger: 0.1 };

    explorers.forEach(e => laboratory.trackDeparture(e, "The Far North", "Discovery"));

    console.log("\n--- Simulating 50 Cycles of Transit ---");
    for (let i = 0; i < 50; i++) {
        explorers.forEach((e, idx) => {
            if (!laboratory.expeditions[idx].isResolved) {
                laboratory.processExpeditionTick(e, laboratory.expeditions[idx], env);
            }
        });
    }

    console.log("\n--- FINAL REPORT ---");
    const report = laboratory.generateReport();
    console.log(JSON.stringify(report, null, 2));
}
