/**
 * File: src_systems_sim_test.js
 * 1000-Year Simulation Stress Test & Historical Analysis
 * 
 * Objective: 
 * 1. Accelerate time to simulate 1000 years (365,000 days).
 * 2. Track Major Events, Forces, and Dune Proximity.
 * 3. Generate a report on the cycle of civilization and memory.
 */

class SimulationTestSystem {
    constructor() {
        this.stats = {
            yearsSimulated: 0,
            majorEvents: [],
            pillarEvents: [],
            forceHistory: [], // Array of snapshots
            duneExploration: [] // Actors who reached the dunes
        };
    }

    async run1000YearTest() {
        console.log("%c --- STARTING 1000 YEAR SIMULATION TEST --- ", "background: #1e1e1e; color: #fbbf24; font-weight: bold; padding: 10px;");
        
        const totalYears = 1000;
        const daysPerYear = 365;
        const totalDays = totalYears * daysPerYear;
        
        // Reset world state for clean test
        window.EngineParams.worldDay = 0;
        window.EngineParams.worldEpoch = 0;

        // Disable rendering/VFX for speed
        const originalTimeScale = window.EngineParams.timeScale;
        window.EngineParams.timeScale = 0; // Pause visual engine

        for (let d = 0; d < totalDays; d++) {
            this.stepSimulation();

            // Periodic snapshot of forces
            if (d % (daysPerYear * 10) === 0) {
                this.snapshotForces(d);
                console.log(`[SIM] Year ${Math.floor(d/daysPerYear)} reached...`);
            }

            // Yield every 100 days to keep the UI from freezing entirely if running in main thread
            if (d % 100 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }

        window.EngineParams.timeScale = originalTimeScale;
        this.generateReport();
    }

    stepSimulation() {
        window.EngineParams.worldDay++;
        const currentDay = window.EngineParams.worldDay;

        // --- PHASE 1-1 & 1-2: HEARTBEAT INJECTION & SCALING ---
        // Purpose: Activate dormant civilizational systems and scale high-frequency accumulation logic.
        
        // T1 Scaling Factor: 
        // In production, T1 fires 43,200x per day. 
        // We provide a scale object so systems can "catch up" high-frequency logic in one tick.
        const t1Payload = { 
            worldDay: currentDay, 
            simScale: 43200, 
            isAccelerated: true 
        };

        // T1: High-frequency logic (Harvest, Instability, etc.)
        window.EventBus.emit('HEARTBEAT_T1', t1Payload);
        
        // T6H: 2x per game day (assuming 12h real = 1d game). Political/Resource logic.
        window.EventBus.emit('HEARTBEAT_T6H', { worldDay: currentDay });
        window.EventBus.emit('HEARTBEAT_T6H', { worldDay: currentDay });

        // T12H: 1x per game day. Dynastic/Information logic.
        window.EventBus.emit('HEARTBEAT_T12H', { worldDay: currentDay });

        // T24H: 1x per game day. Institutional audits.
        window.EventBus.emit('HEARTBEAT_T24H', { worldDay: currentDay });

        // T2: Weekly updates
        if (currentDay % 7 === 0) {
            window.EventBus.emit('HEARTBEAT_T2', { worldDay: currentDay });
        }

        // T3: Monthly updates (Approx)
        if (currentDay % 30 === 0) {
            window.EventBus.emit('HEARTBEAT_T3', { worldDay: currentDay });
            window.EventBus.emit('HEARTBEAT_T30D', { worldDay: currentDay }); // Longitudinal Decay
        }

        // Seasonal updates
        if (currentDay % 90 === 0) {
            window.EventBus.emit('HEARTBEAT_T90D', { worldDay: currentDay });
        }

        // Annual updates
        if (currentDay % 365 === 0) {
            window.EventBus.emit('HEARTBEAT_T365D', { worldDay: currentDay });
        }

        // Epoch Shifts (Every 14 days)
        if (currentDay % 14 === 0) {
            window.EventBus.emit('SHIFT_START');
            this.stats.pillarEvents.push({ day: currentDay, type: 'EPOCH_SHIFT', detail: 'The world shifted.' });
        }

        // Track Major Events from Chronicle
        if (window.ChronicleManager?.worldLedger) {
            const lastEvent = window.ChronicleManager.worldLedger[window.ChronicleManager.worldLedger.length - 1];
            if (lastEvent && lastEvent.day === currentDay && lastEvent.historicalWeight > 500) {
                this.stats.majorEvents.push(lastEvent);
            }
        }

        // Track Dune Proximity
        this.trackDuneProximity(currentDay);

        // Update Sim Resolvers (Phase 2-2)
        if (window.HarvestEngine?.updateSimResolutions) {
            window.HarvestEngine.updateSimResolutions();
        }
    }

    snapshotForces(day) {
        if (!window.ForceManager) return;
        
        const forces = {};
        for (const [key, force] of Object.entries(window.ForceManager.forces || {})) {
            forces[key] = force.strength;
        }

        this.stats.forceHistory.push({
            day,
            year: Math.floor(day / 365),
            forces
        });
    }

    trackDuneProximity(day) {
        if (!window.GameCore?.activeEntities) return;

        window.GameCore.activeEntities.forEach(en => {
            if (en.visual?.position) {
                const dist = Math.sqrt(en.visual.position.x ** 2 + en.visual.position.z ** 2);
                // Assume Dunes start at X=280000+ (Sierra Wall)
                if (dist > 280000) {
                    const profile = window.PersonhoodManager?.getProfile(en.id);
                    this.stats.duneExploration.push({
                        id: en.id,
                        day,
                        dist,
                        fate: en.alive ? 'EXPLORING' : 'PERISHED',
                        significance: window.ChronicleManager?.calculateSignificance(en.id) || 0,
                        traits: profile ? { ...profile.traits } : null
                    });
                }
            }
        });
    }

    generateReport() {
        console.log("%c --- 1000 YEAR SIMULATION REPORT --- ", "background: #1e1e1e; color: #4ade80; font-weight: bold; padding: 10px;");
        
        // 0. SYSTEMIC ACTIVATION AUDIT (Phase 1 & 2 Validation)
        console.group("Category 0: Systemic Activation Audit");
        const poly = window.PoliticalObservatory;
        if (poly) {
            console.log(`Political Audits Executed: ${poly.causalRegistry.length + poly.houseHistory.size * (window.EngineParams.worldDay / 14)} (Estimated)`);
            console.log(`Political Fragmentation (Gini): ${poly.globalMetrics.politicalFragmentation.toFixed(3)}`);
            console.log(`Causal Events Recorded: ${poly.causalRegistry.length}`);
        }
        const sig = window.CrowObservatory;
        if (sig) {
            console.log(`Global Significance Supply: ${sig.metrics.globalSignificanceSupply.toLocaleString()} / ${sig.SUPPLY_CAP.toLocaleString()}`);
            console.log(`Narrative Concentration: ${(sig.metrics.narrativeConcentration * 100).toFixed(1)}%`);
        }
        const intel = window.IntelManager;
        if (intel) {
            const activeCount = intel.registry.size;
            const archiveCount = intel.archive.size;
            const totalOwners = Array.from(intel.ownershipRegistry.values()).reduce((sum, s) => sum + s.size, 0);
            console.log(`Intel Registry Size: ${activeCount} (Active) / ${archiveCount} (Archived)`);
            console.log(`Knowledge Propagation: ${totalOwners} physical ownership links`);
            console.log(`Intel Density: ${(totalOwners / (window.GameCore?.activeEntities?.length || 1)).toFixed(2)} facts/NPC`);
        }
        const wendigo = window.HarvestEngine;
        if (wendigo) {
            console.log(`Wendigo Harvests Initiated: ${wendigo.activeHarvests.length + (window.ChronicleManager?.worldLedger.filter(e => e.type === 'WENDIGO_HARVEST').length || 0)}`);
            console.log(`Top Candidate Pressure: ${wendigo.getCandidates()[0]?.[1]?.pressureScore.toFixed(0) || 0}`);
        }
        const demog = window.DemographicDirectorate;
        if (demog) {
            const m = demog.metrics;
            const h = demog.getObservatoryMetrics();
            console.log(`Demographic Stability: ${m.demographicStability.toFixed(2)} (${h.health.populationHealth})`);
            console.log(`Extinct Houses: ${h.status.extinctHouses} / Houses at Risk: ${h.status.housesAtRisk}`);
            console.log(`Birth/Death Rate: ${m.birthRate.toFixed(2)} / ${m.deathRate.toFixed(2)} per day`);
        }
        console.groupEnd();

        // 1. Major World Events
        console.group("Category 1: Major World Events");
        console.table(this.stats.majorEvents.slice(-20).map(e => ({ Day: e.day, Type: e.type, Significance: e.historicalWeight, Detail: e.detail })));
        console.log(`Total Major Events: ${this.stats.majorEvents.length}`);
        console.groupEnd();

        // 2. Pillar Events & Regional Shifts
        console.group("Category 2: Pillar Events (Epoch Shifts & Institutional Crises)");
        const crises = this.stats.pillarEvents.filter(e => e.type.includes('CRISIS') || e.type.includes('SCHISM'));
        console.table(crises.slice(-10));
        console.groupEnd();

        // 3. Foundational Forces Analysis
        console.group("Category 3: Foundational Forces (Evolution)");
        this.stats.forceHistory.forEach(snap => {
            if (snap.year % 100 === 0) {
                console.log(`Year ${snap.year}:`, snap.forces);
            }
        });
        console.groupEnd();

        // 4. Dune Proximity & The Lost
        console.group("Category 4: The Lost (Dune Explorers)");
        const uniqueExplorers = Array.from(new Set(this.stats.duneExploration.map(e => e.id)));
        console.log(`Total Unique Dune Explorers: ${uniqueExplorers.length}`);
        
        const notable = this.stats.duneExploration.filter(e => e.significance > 500).slice(-5);
        notable.forEach(e => {
            console.log(`Explorer ${e.id} (Sig: ${e.significance}): Reached ${e.dist.toFixed(0)}m on Day ${e.day}. Fate: ${e.fate}.`);
        });
        console.groupEnd();
    }
}

window.SimTest = new SimulationTestSystem();
