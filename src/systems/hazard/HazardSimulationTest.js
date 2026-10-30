// File: src/systems/hazard/HazardSimulationTest.js
import { HazardCascade } from './HazardCascade.js';
import { MortalitySystem } from '../mortality/MortalitySystem.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

export function runHazardSimulation() {
    console.log("--- Starting Hazard Cascade & Mortality Simulation ---");

    const settlement = new SocialDynamicsSystem();
    const mortality = new MortalitySystem(settlement);
    const hazards = new HazardCascade(mortality);
    
    settlement.mortalitySystem = mortality;
    settlement.hazardCascade = hazards;

    const testActor = {
        id: "Actor_001",
        age: 260,
        fatigue: 0.9,
        prestige: 0.2,
        wealth: 0.1,
        traits: {
            riskTolerance: 1.0, // Absolute Risk Taker
            ambition: 1.0,      
            conscientiousness: 0.0, 
            constitution: 0.2,
            sociability: 0.5,
            cynicism: 0.2,
            fear: 0.0           // No fear
        },
        tags: [],
        isDead: false
    };

    settlement.actors.push(testActor);

    const environment = {
        tileDecay: 0.8,
        weatherSeverity: 0.5,
        baseHazardRisk: 0.1,
        catastropheSeverity: 0.9
    };

    console.log(`Initial State: Age ${testActor.age}, Fatigue ${testActor.fatigue}, Traits: RT ${testActor.traits.riskTolerance}, AMB ${testActor.traits.ambition}, CONSC ${testActor.traits.conscientiousness}`);
    
    // Simulate activity
    hazards.processActivity(testActor, environment);

    console.log("Final State:", JSON.stringify(testActor, null, 2));
    console.log("--- Simulation Complete ---");
}
