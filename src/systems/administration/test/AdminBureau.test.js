/**
 * File: src/systems/administration/test/AdminBureau.test.js
 * 
 * Simple validation suite for AdminBureau.
 */

import { AdminBureau } from '../AdminBureau.js';
import { AdminConstants } from '../../../constants/AdminConstants.js';

// Mock Globals
global.window = {
    EventBus: {
        on: () => {},
        emit: (event, data) => {
            console.log(`[MOCK EVENT] ${event}`, data);
        }
    },
    EngineParams: {
        worldDay: 0
    },
    GameCore: {
        activeEntities: []
    }
};

// Re-import after global mock if necessary, or pass mocks to constructor
// For this environment, we'll assume the imports in AdminBureau work with these globals.

async function runTests() {
    console.log("Starting AdminBureau Validation...");

    const admin = new AdminBureau();
    
    // Test 1: Registration
    console.log("Test 1: Registering Institution...");
    admin.registerInstitution('test_inst', {
        name: 'The Great Archive',
        population: 100,
        distanceToHub: 10,
        treasury: 1000
    });

    const inst = admin.institutions.get('test_inst');
    if (!inst || inst.name !== 'The Great Archive') {
        throw new Error("Registration failed");
    }
    console.log("✓ Registration successful");

    // Test 2: Complexity Calculation
    // Complexity = (100 * 0.5) + (10 * 2) + (0 * 0.1) = 50 + 20 = 70
    console.log("Test 2: Validating Decay Logic (No Governors)...");
    admin.processAdministrativeTick();
    
    // Competence = 0
    // Entropy = 70 - 0 = 70
    if (inst.decayPoints !== 70) {
        throw new Error(`Decay calculation mismatch. Expected 70, got ${inst.decayPoints}`);
    }
    console.log("✓ Decay calculation successful (Points: 70)");

    // Test 3: Threshold Effects (Level 1: Tax Leak)
    console.log("Test 3: Threshold Effects (Tax Leak)...");
    // Manually push to threshold
    inst.decayPoints = AdminConstants.DECAY_THRESHOLDS.LEVEL_1 + 10; 
    const initialTreasury = inst.treasury;
    admin.processAdministrativeTick();
    
    const expectedLeak = Math.floor(initialTreasury * AdminConstants.LEAK_PERCENTAGE);
    if (inst.treasury !== initialTreasury - expectedLeak) {
        throw new Error(`Treasury leak failed. Expected ${initialTreasury - expectedLeak}, got ${inst.treasury}`);
    }
    console.log(`✓ Tax leak successful (Leak: ${expectedLeak})`);

    // Test 4: Competence Repair
    console.log("Test 4: Competence Repair...");
    // Mock a super-competent governor
    global.window.GameCore.activeEntities.push({
        id: 'gov_1',
        stats: { intelligence: 50, administration: 50 },
        isDead: false
    });
    inst.governingIds = ['gov_1'];
    
    // Complexity 70, Competence 100.
    // 70 < 100, so it should repair by REPAIR_RATE (5)
    const decayBefore = inst.decayPoints;
    admin.processAdministrativeTick();
    
    if (inst.decayPoints !== decayBefore - AdminConstants.REPAIR_RATE) {
         throw new Error(`Repair failed. Expected ${decayBefore - AdminConstants.REPAIR_RATE}, got ${inst.decayPoints}`);
    }
    console.log("✓ Competence repair successful");

    // Test 5: Reform
    console.log("Test 5: Reform...");
    inst.decayPoints = 500;
    admin.executeReform('test_inst');
    if (inst.decayPoints !== 250) {
        throw new Error(`Reform failed. Expected 250, got ${inst.decayPoints}`);
    }
    console.log("✓ Reform successful");

    // Test 6: Collapse
    console.log("Test 6: Collapse...");
    // Clear governors to ensure complexity > competence
    inst.governingIds = [];
    inst.decayPoints = AdminConstants.DECAY_THRESHOLDS.COLLAPSE + 1;
    admin.processAdministrativeTick();
    
    console.log(`Collapse Check: decayPoints=${inst.decayPoints}, govCount=${inst.governingIds.length}, treasury=${inst.treasury}`);
    
    if (inst.decayPoints !== AdminConstants.COLLAPSE_RESET_DECAY || inst.governingIds.length !== 0 || inst.treasury !== 0) {
        throw new Error("Collapse failure state invalid");
    }
    console.log("✓ Collapse successful");

    console.log("\nALL ADMINBUREAU TESTS PASSED.");
}

runTests().catch(err => {
    console.error("\nTEST FAILED:");
    console.error(err);
    process.exit(1);
});
