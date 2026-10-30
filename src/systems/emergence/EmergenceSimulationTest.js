// File: src/systems/emergence/EmergenceSimulationTest.js
import { EmergenceBalanceAudit } from './EmergenceBalanceAudit.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runEmergenceAuditSimulation() {
    console.log("--- Starting Emergence Balance Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const audit = new EmergenceBalanceAudit();

    // 1. Scenario: Frozen World
    console.log("\n--- PHASE 1: Systemic Stagnation (Frozen) ---");
    settlement.justiceSystem = { diversityPurgeTracker: 0.8 }; // Heavy purges
    settlement.walkerPresence = true; // Walker is suppressing traits
    settlement.calculateTraitDiversityIndex = () => 0.05; // Maximum homogenization
    settlement.culture = { beliefSystems: [] }; // No new ideas

    console.log(JSON.stringify(audit.runAudit(settlement), null, 2));

    // 2. Scenario: Dynamic Emergence
    console.log("\n--- PHASE 2: Healthy Emergence (Dynamic) ---");
    settlement.justiceSystem.diversityPurgeTracker = 0.1;
    settlement.walkerPresence = false;
    settlement.calculateTraitDiversityIndex = () => 0.4;
    settlement.culture = { beliefSystems: [{ mutationIndex: 0.9 }] }; // Mutating beliefs
    settlement.mobility = { calculateMobilityMetrics: () => ({ mobilityIndex: 0.8 }) }; // High mobility
    settlement.independent = { calculateCDI: () => 0.7 }; // Rogue success

    console.log(JSON.stringify(audit.runAudit(settlement), null, 2));
}
