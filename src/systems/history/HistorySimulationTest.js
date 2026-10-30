// File: src/systems/history/HistorySimulationTest.js
import { HistoricalEchoFramework } from './HistoricalEchoFramework.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runHistorySimulation() {
    console.log("--- Starting Historical Echo Laboratory ---");

    const settlement = new SocialDynamicsSystem();
    settlement.currentYear = 1000;
    const history = new HistoricalEchoFramework(settlement);

    // 1. Record an Ancient Pillar (500 years ago)
    history.recordPillar('Famine', 'The Great Frost of Year 500', 1.0, 'SouthGate');
    const ancientPillar = history.pillars[0];
    ancientPillar.yearFound = 500;
    ancientPillar.currentStrength = 0.6; // Decayed over 500 years

    // 2. Record a Recent Pillar
    history.recordPillar('Betrayal', 'The Night of Long Knives', 0.8, 'CouncilChamber');
    
    console.log("\n--- PHASE 1: Decision Influence ---");
    const resourceInfluence = history.calculateEchoInfluence('ResourceAllocation', { cynicism: 0.2 });
    console.log(`Historical Influence on Resource Allocation: ${resourceInfluence.toFixed(3)}`);

    const councilInfluence = history.calculateEchoInfluence('CouncilVote', { cynicism: 0.2 });
    console.log(`Historical Influence on Council Vote: ${councilInfluence.toFixed(3)}`);

    console.log("\n--- PHASE 2: Generational Decay (100 Years) ---");
    settlement.getAverageTrait = () => 0.8; // High cynicism settlement
    for(let i=0; i<100; i++) {
        history.processYearlyDecay();
    }

    console.log("\n--- FINAL ECHO REPORT ---");
    const report = history.getGenerationalReport();
    console.log(JSON.stringify(report, null, 2));
}
