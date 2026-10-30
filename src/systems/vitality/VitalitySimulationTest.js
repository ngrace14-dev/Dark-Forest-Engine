// File: src/systems/vitality/VitalitySimulationTest.js
import { RegionalVitalityObservatory } from './RegionalVitalityObservatory.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';

export function runVitalitySimulation() {
    console.log("--- Initializing Settlement Vitality Directorate ---");

    const observatory = new RegionalVitalityObservatory();

    // Settlement 1: Flourishing
    const city = new SocialDynamicsSystem();
    city.id = "Aethelgard";
    city.tradeVolume = 100;
    city.arrivals = 10;
    city.actors = Array.from({ length: 50 }, (_, i) => ({ prestige: 0.8, traits: { cynicism: 0.5 } }));
    city.culture = { beliefSystems: [{ adopters: new Set([1,2,3,4,5,6,7,8,9,10]) }] };

    // Settlement 2: Decaying
    const ruins = new SocialDynamicsSystem();
    ruins.id = "ShadowCrest";
    ruins.tradeVolume = 0;
    ruins.deaths = 5;
    ruins.actors = [];
    ruins.culture = { beliefSystems: [] };

    console.log("\n--- PHASE 1: Vitality Mapping ---");
    observatory.updateVitalityMetrics(city);
    observatory.updateVitalityMetrics(ruins);

    console.log("\n--- FINAL VITALITY REPORT ---");
    const report = observatory.generateVitalityReport();
    console.log(JSON.stringify(report, null, 2));
}
