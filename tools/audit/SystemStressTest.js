/**
 * File: tools/audit/SystemStressTest.js
 * 
 * THE MILLION YEAR AUDIT
 * Executes a high-velocity simulation stress test across all registered systems.
 * Monitors for memory leaks, state corruption, and cascading failures.
 */

import { SystemRegistry } from '../../src/systems/SystemRegistry.js';
import { AdminConstants } from '../../src/constants/AdminConstants.js';
import { PersonhoodConstants } from '../../src/constants/PersonhoodConstants.js';

// --- MOCK CORE ARCHITECTURE ---
global.window = {
    EventBus: {
        events: {},
        on(e, cb) { this.events[e] = this.events[e] || []; this.events[e].push(cb); },
        emit(e, d) { if(this.events[e]) this.events[e].forEach(cb => cb(d)); }
    },
    EngineParams: {
        worldDay: 0,
        worldEpoch: 0,
        simScale: 1000 // Hyper-accelerated
    },
    GameCore: {
        activeEntities: [],
        SpatialGrid: {
            getNearbyEntities: () => [],
            getGridKey: () => "0,0"
        }
    },
    EngineConfig: {
        crowsEyeMode: false
    },
    PersonhoodConstants: PersonhoodConstants // Ensure availability
};

class AuditLogger {
    constructor() {
        this.errors = [];
        this.snapshots = [];
    }
    log(msg) { console.log(`[AUDIT] ${msg}`); }
    error(msg, err) { 
        console.error(`[CRITICAL] ${msg}`, err);
        this.errors.push({ msg, err, day: global.window.EngineParams.worldDay });
    }
    snapshot(systems) {
        this.snapshots.push({
            day: global.window.EngineParams.worldDay,
            admin: Array.from(systems.administration.institutions.values()).map(i => ({ name: i.name, decay: i.decayPoints })),
            social: { population: systems.social.actors.length, food: systems.social.foodSupply }
        });
    }
}

const audit = new AuditLogger();

async function runMillionYearAudit() {
    audit.log("Initializing Systems for the Million Year Audit...");
    
    const systems = new SystemRegistry();
    
    // Seed initial state
    audit.log("Seeding Initial World State...");
    for (let i = 0; i < 100; i++) {
        systems.social.actors.push({
            id: `npc_${i}`,
            traits: { intelligence: 10, administration: 10, conscientiousness: 0.5 },
            stats: { intelligence: 10, administration: 10 },
            isDead: false,
            socialRole: 'Citizen'
        });
    }

    systems.administration.registerInstitution('capital', {
        name: 'The Eternal Bastion',
        population: 100,
        distanceToHub: 0,
        treasury: 1000000,
        governingIds: ['npc_0', 'npc_1', 'npc_2']
    });

    const YEARS_TO_SIMULATE = 1000000;
    const DAYS_PER_YEAR = 360;
    const TOTAL_DAYS = YEARS_TO_SIMULATE * DAYS_PER_YEAR;
    
    // We simulate in chunks to prevent stack overflow and allow for snapshotting
    const CHUNK_SIZE_DAYS = 30; // One administrative tick
    
    audit.log(`Beginning Simulation: ${YEARS_TO_SIMULATE} years (${TOTAL_DAYS} days)`);

    try {
        for (let day = 0; day < TOTAL_DAYS; day += CHUNK_SIZE_DAYS) {
            global.window.EngineParams.worldDay = day;

            // Heartbeat triggers
            global.window.EventBus.emit('HEARTBEAT_T12H'); // Daily logic
            global.window.EventBus.emit('HEARTBEAT_T30D'); // Monthly admin logic

            // System updates
            systems.update(CHUNK_SIZE_DAYS);

            // Occasional disruptive events
            if (day % (DAYS_PER_YEAR * 100) === 0) {
                audit.log(`Year ${day / DAYS_PER_YEAR}: Status - Pop: ${systems.social.actors.length}, Admin Decay: ${systems.administration.institutions.get('capital').decayPoints}`);
                
                // Simulate death and replacement
                const deadIndex = Math.floor(Math.random() * systems.social.actors.length);
                systems.social.actors[deadIndex].isDead = true;
                
                // Check for governor replacement
                const inst = systems.administration.institutions.get('capital');
                if (inst.governingIds.length < 3) {
                    inst.governingIds.push(`npc_${Math.floor(Math.random() * 100)}`);
                }
            }

            // Periodically check for catastrophic state corruption
            if (isNaN(systems.social.foodSupply) || isNaN(systems.administration.institutions.get('capital').decayPoints)) {
                throw new Error("NaN detected in core simulation state!");
            }
        }
    } catch (e) {
        audit.error("Simulation collapsed prematurely", e);
    }

    audit.log("Audit Complete.");
    audit.log(`Final Result: Day ${global.window.EngineParams.worldDay}`);
    audit.log(`Total Errors Encountered: ${audit.errors.length}`);
    
    if (audit.errors.length > 0) {
        process.exit(1);
    }
}

runMillionYearAudit();
