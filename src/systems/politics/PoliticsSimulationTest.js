// File: src/systems/politics/PoliticsSimulationTest.js
import { LegitimacyPressureFramework } from './LegitimacyPressureFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runPoliticsSimulation() {
    console.log("--- Starting Legitimacy Pressure Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const politics = new LegitimacyPressureFramework(settlement);

    // 1. Scenario: Stable Governance
    console.log("\n--- PHASE 1: Stable Governance ---");
    settlement.foodSupply = 2000;
    settlement.actors = Array.from({ length: 50 }, () => ({ traits: { loyalty: 0.8, fear: 0.2, cynicism: 0.1 } }));
    console.log(JSON.stringify(politics.generateLegitimacyReport(), null, 2));

    // 2. Scenario: Economic Collapse & High Cynicism
    console.log("\n--- PHASE 2: Institutional Decay ---");
    settlement.foodSupply = 100;
    settlement.getAverageTrait = (t) => {
        if (t === 'loyalty') return 0.2;
        if (t === 'fear') return 0.8;
        if (t === 'cynicism') return 0.9;
        return 0.5;
    };
    
    // Simulate fatigue build-up
    for(let i=0; i<20; i++) politics.updateGovernance(1);

    console.log(JSON.stringify(politics.generateLegitimacyReport(), null, 2));
}
