// File: src/systems/vitality/IdentitySimulationTest.js
import { IdentityDivergenceFramework } from './IdentityDivergenceFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runIdentitySimulation() {
    console.log("--- Starting Settlement Identity Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const identity = new IdentityDivergenceFramework(settlement);

    // 1. Scenario: Generic Settlement
    console.log("\n--- PHASE 1: Generic Hub ---");
    settlement.getAverageTrait = () => 0.5; // Neutral
    settlement.calculateTraitDiversityIndex = () => 0.5;
    settlement.culture = { beliefSystems: [] };
    settlement.history = { pillars: [] };

    console.log(JSON.stringify(identity.generateIdentityReport(), null, 2));

    // 2. Scenario: Unique Cultural Outlier
    console.log("\n--- PHASE 2: Cultural Outlier ---");
    settlement.getAverageTrait = (t) => t === 'superstition' ? 0.9 : 0.5; 
    settlement.calculateTraitDiversityIndex = () => 0.15; // High homogenization
    settlement.culture = { 
        beliefSystems: [{ mutationIndex: 0.8, expansionRate: 0.9 }] 
    };
    settlement.history = { 
        pillars: [{ currentStrength: 1.0 }, { currentStrength: 0.8 }, { currentStrength: 0.7 }] 
    };

    console.log(JSON.stringify(identity.generateIdentityReport(), null, 2));
}
