// File: src/systems/observatory/ExodusSimulationTest.js

import { ExodusCausalityObservatory } from './ExodusCausalityObservatory.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';
import { LegitimacyPressureFramework } from '../politics/LegitimacyPressureFramework.js';
import { InformationConsolidationFramework } from '../information/InformationConsolidationFramework.js';

export function runExodusSimulation() {
    console.log("--- Starting Exodus Causality Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const politics = new LegitimacyPressureFramework(settlement);
    const info = new InformationConsolidationFramework();
    const observatory = new ExodusCausalityObservatory(settlement, politics, info);

    // 1. Scenario: Political Collapse
    console.log("\n--- PHASE 1: Political Instability ---");
    // Populate settlement to ensure LQ and Econ Performance calculate correctly
    settlement.actors = Array.from({ length: 50 }, () => ({ traits: { loyalty: 0.1, fear: 0.8, cynicism: 0.9 }, isDead: false }));
    settlement.foodSupply = 100; // Low food
    
    const actor = { id: "Refugee_001", status: 'Indigent', traits: { ambition: 0.9, fear: 0.1, cynicism: 0.9 } };
    const p = observatory.calculateActorExodusProbability(actor);
    console.log(`Exodus Probability for Refugee_001: ${p.toFixed(3)}`);
    
    if (p > 0.4) observatory.trackDeparture(actor);

    // 2. Scenario: Rumor Influence
    console.log("\n--- PHASE 2: Informational Noise ---");
    info.ingestInfo('Rumor', 'Paradise is in the Dunes', 0.1);
    info.ingestInfo('Fabrication', 'The King of the Dunes is giving away gold', 0.05);
    info.ingestInfo('Rumor', 'Infinite water found east', 0.05);
    
    const dreamer = { id: "Dreamer_002", status: 'Indigent', traits: { ambition: 1.0, fear: 0.0, superstition: 1.0 } };
    const p2 = observatory.calculateActorExodusProbability(dreamer);
    console.log(`Exodus Probability for Dreamer_002: ${p2.toFixed(3)}`);
    
    if (p2 > 0.4) observatory.trackDeparture(dreamer);

    console.log("\n--- FINAL EXODUS REPORT ---");
    const report = observatory.generateExodusReport();
    console.log(JSON.stringify(report, null, 2));
}
