// File: src/systems/hazard/HazardSimulationTest.js
import { HazardCascade } from './HazardCascade.js';
import { MortalitySystem } from '../mortality/MortalitySystem.js';
import { SocialDynamicsSystem } from '../SocialDynamicsSystem.js';
import { SubversiveReactionPipeline } from '../underground/SubversiveReactionPipeline.js';
import { JurisprudenceSystem } from '../underground/JurisprudenceSystem.js';
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';

export function runHazardSimulation() {
    console.log("--- Starting Comprehensive Judicial Simulation ---");

    const settlement = new SocialDynamicsSystem();
    const mortality = new MortalitySystem(settlement);
    const hazards = new HazardCascade(mortality);
    const underground = new SubversiveReactionPipeline(settlement);
    const justice = new JurisprudenceSystem(settlement);
    
    settlement.mortalitySystem = mortality;
    settlement.hazardCascade = hazards;
    settlement.underground = underground;
    settlement.jurisprudence = justice;
    settlement.diversityPurgeTracker = 0;

    const testActor = {
        id: "Actor_001",
        age: 120,
        prestige: 0.1, 
        wealth: 0.05,
        status: 'Indigent',
        subversiveRole: 'HereticalFanatic',
        traits: {
            riskTolerance: 0.8, 
            ambition: 0.5,      
            conscientiousness: 0.1, 
            constitution: 0.5,
            sociability: 0.5,
            cynicism: 0.9,
            fear: 0.2,
            aggression: 0.8,
            superstition: 0.9,
            charisma: 0.4,
            loyalty: 0.1,
            altruism: 0.1
        },
        tags: ['TouchedByTheShade'],
        isDead: false
    };

    settlement.actors.push(testActor);

    console.log("\n--- PHASE 1: Sentencing ---");
    // Scenario: High-Aggression, High-Cynicism Council
    settlement.getAverageTrait = (trait) => {
        const means = {
            aggression: 0.8,
            fear: 0.7,
            cynicism: 0.9,
            ambition: 0.2,
            altruism: 0.1,
            sociability: 0.3,
            conscientiousness: 0.2
        };
        return means[trait];
    };

    justice.tryActor(testActor);

    console.log("\n--- PHASE 2: Execution & Martyrdom ---");
    if (testActor.isDead) {
        console.log("Actor was executed. Diversity Purge Tracker:", settlement.diversityPurgeTracker);
    }

    console.log("\n--- PHASE 3: Penal Labor Hazard ---");
    const laborActor = {
        id: "Convict_002",
        age: 40,
        status: 'Active',
        socialRole: 'PenalLaborer',
        traits: {
            riskTolerance: 0.5, 
            ambition: 0.5,      
            conscientiousness: 0.5, 
            constitution: 0.5
        },
        isDead: false
    };
    settlement.actors.push(laborActor);
    
    const env = { baseHazardRisk: 0.1, tileDecay: 0, weatherSeverity: 0 };
    console.log(`Calculating Prob for Penal Laborer...`);
    const p = hazards.calculateCascadeProbability(laborActor, env);
    console.log(`Penal Labor Cascade Probability: ${p.toFixed(4)}`);

    console.log("\n--- PHASE 4: Rehabilitation ---");
    const rebel = {
        id: "Rebel_003",
        status: 'Active',
        traits: { aggression: 1.0, cynicism: 1.0, loyalty: 0.0, riskTolerance: 0.5, superstition: 0.5 },
        penalRecord: {
            currentSentence: { type: 'Rehabilitation', cyclesRemaining: 5 }
        }
    };
    settlement.actors.push(rebel);
    console.log("Initial Rebel Traits:", rebel.traits);
    justice.processSentenceTick(rebel);
    console.log("Rebel Traits after 1 tick of Rehab:", rebel.traits);

    console.log("\n--- Simulation Complete ---");
}
