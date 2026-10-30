// File: src/systems/dreaming/DreamSimulationTest.js
import { WorldDreamIndexFramework } from './WorldDreamIndexFramework.js';

export function runDreamSimulation() {
    console.log("--- Starting Dreaming World Laboratory ---");

    const framework = new WorldDreamIndexFramework();

    // Mock Settlements
    const settlements = [
        {
            id: "Divergent_01",
            identity: { calculateIdentityMetrics: () => ({ beliefDivergence: 0.9 }) },
            independent: { calculateCDI: () => 0.85 },
            mobility: { calculateMobilityMetrics: () => ({ mobilityIndex: 2.5 }) }
        },
        {
            id: "Divergent_02",
            identity: { calculateIdentityMetrics: () => ({ beliefDivergence: 0.8 }) },
            independent: { calculateCDI: () => 0.70 },
            mobility: { calculateMobilityMetrics: () => ({ mobilityIndex: 1.8 }) }
        }
    ];

    console.log("\n--- PHASE 1: Novel Future Generation ---");
    console.log(JSON.stringify(framework.generateDreamReport(settlements), null, 2));

    // Stagnant Scenario
    const stagnantSettlements = [
        {
            id: "Stagnant_01",
            identity: { calculateIdentityMetrics: () => ({ beliefDivergence: 0.1 }) },
            independent: { calculateCDI: () => 0.10 },
            mobility: { calculateMobilityMetrics: () => ({ mobilityIndex: 0.1 }) }
        }
    ];

    console.log("\n--- PHASE 2: Historical Recursion ---");
    console.log(JSON.stringify(framework.generateDreamReport(stagnantSettlements), null, 2));
}
