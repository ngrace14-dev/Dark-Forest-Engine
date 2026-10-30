/**
 * File: tools/audit/OscillationTrace.js
 * Granular trace to determine the Time to Stability (T2S).
 */

import { AdminBureau } from '../../src/systems/administration/AdminBureau.js';
import { AdminConstants } from '../../src/constants/AdminConstants.js';

// Mock Globals
global.window = {
    EventBus: {
        on: () => {},
        emit: (event, data) => {}
    },
    EngineParams: {
        worldDay: 0
    },
    GameCore: {
        activeEntities: [
            { id: 'gov_1', stats: { intelligence: 10, administration: 10 }, isDead: false },
            { id: 'gov_2', stats: { intelligence: 10, administration: 10 }, isDead: false },
            { id: 'gov_3', stats: { intelligence: 10, administration: 10 }, isDead: false }
        ]
    }
};

const admin = new AdminBureau();
admin.registerInstitution('cap', {
    name: 'Capital',
    population: 100,
    distanceToHub: 0,
    governingIds: ['gov_1', 'gov_2', 'gov_3']
});

const inst = admin.institutions.get('cap');
console.log("Day,DecayPoints,Complexity,Competence");

for (let day = 0; day <= 10000; day += 30) {
    global.window.EngineParams.worldDay = day;
    admin.processAdministrativeTick();
    
    const complexity = (inst.population * AdminConstants.COMPLEXITY_SCALARS.POPULATION) + 
                       (inst.distanceToHub * AdminConstants.COMPLEXITY_SCALARS.DISTANCE) + 
                       ((day - (inst.lastReformDay || 0)) * AdminConstants.COMPLEXITY_SCALARS.TIME);
    
    const competence = 60; // 3 * (10 + 10)
    
    console.log(`${day},${inst.decayPoints},${complexity.toFixed(2)},${competence}`);
    
    // Check for "stable oscillation" - when we see the first repeat of a reset cycle
}
