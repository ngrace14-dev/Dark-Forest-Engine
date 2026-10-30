// File: src/systems/history/folklore/FolkloreSimulationTest.js
import { LegendDecayObservatory } from './LegendDecayObservatory.js';
import { HistoricalEchoFramework } from '../HistoricalEchoFramework.js';
import { SocialDynamicsSystem } from '../../SocialDynamicsSystem.js';

export function runFolkloreSimulation() {
    console.log("--- Starting Folklore Decay Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    const history = new HistoricalEchoFramework(settlement);
    const folklore = new LegendDecayObservatory(history);

    // 1. Create a Truth
    history.recordPillar('Discovery', 'The Iron Vein of the Weeping Crag', 0.9, 'Crag');
    const pillar = history.pillars[0];
    folklore.trackFolklore(pillar);

    console.log("\n--- PHASE 1: Generational Transitions (10 Generations) ---");
    settlement.getAverageTrait = () => 0.4; // Stable society
    
    for (let i = 0; i < 10; i++) {
        folklore.processGenerationTick();
    }

    console.log("\n--- FINAL FOLKORE REPORT ---");
    const report = folklore.generateFolkloreReport();
    console.log(JSON.stringify(report, null, 2));
}
