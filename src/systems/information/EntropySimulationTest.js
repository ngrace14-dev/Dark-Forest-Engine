// File: src/systems/information/EntropySimulationTest.js
import { InformationConsolidationFramework } from './InformationConsolidationFramework.js';

export function runEntropySimulation() {
    console.log("--- Starting Information Entropy Laboratory ---");

    const lab = new InformationConsolidationFramework();

    // 1. Initial State: High Noise
    console.log("\n--- PHASE 1: High Entropy Ingestion ---");
    lab.ingestInfo('Fact', 'The Quarry is in Sector 4', 0.8);
    lab.ingestInfo('Rumor', 'The Warden is a Ghost', 0.2);
    lab.ingestInfo('Fabrication', 'The River is poisoned', 0.1);
    lab.ingestInfo('Rumor', 'There is gold in the Dunes', 0.3);

    console.log(JSON.stringify(lab.generateEntropyReport(), null, 2));

    // 2. Consolidation Phase: Verification
    console.log("\n--- PHASE 2: Knowledge Consolidation ---");
    const fact = lab.dataPoints[0];
    lab.verifyInfo(fact.id);

    // Ingest more facts
    lab.ingestInfo('Fact', 'The Warden is human', 1.0);
    lab.ingestInfo('Fact', 'The River is clean', 1.0);

    console.log(JSON.stringify(lab.generateEntropyReport(), null, 2));
}
