import { ConsequenceEvents } from './src_consequence_types/events.js';
import { DriftProcessor } from './src_consequence_drift.js';
import { ObservationLayer } from './src_consequence_observation.js';
import { Strategist } from './src_consequence_strategy.js';
import { Dispatcher } from './src_consequence_dispatch.js';

/**
 * ConsequenceEngine: The Orchestrator
 * Manages the Cognition-to-Consequence cycle.
 * Enforces timing decoupling to prevent simulation burnout.
 */
class ConsequenceEngine {
    constructor() {
        this.isProcessing = false;
        this.lastDriftDay = -1;
        this.lastStrategicAuditDay = -1;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_TICK', (data) => this.tick(data));

        // Fix #3: Bridge Observation to Epistemology (Belief Update)
        window.EventBus.on(ConsequenceEvents.TRUTH_EXTRACTED, (data) => {
            // Null Safety: Verify engine and data are ready
            if (!window.GameCore?.activeEntities || !window.ModelLayer || !window.VillageManager) return;

            const seeker = window.GameCore.activeEntities.find(e => e.id === data.seekerId);
            if (!seeker) return;

            // Identity Mapping: Convert integer villageId to House/Faction Name string
            let factionId = seeker.houseId; 
            if (!factionId && seeker.villageId !== undefined) {
                const village = window.VillageManager.villages[seeker.villageId];
                factionId = village?.nobleHouse || 'independent';
            }

            // Payload Fetch: Get actual truth data from registry to fulfill Seeker extraction
            const latentTruth = window.ModelLayer.latentRegistry.get(data.intelId);
            if (!latentTruth) return;

            window.EventBus.emit(ConsequenceEvents.REQ_BELIEF_UPDATE, {
                factionId: factionId,
                packet: {
                    intelId: data.intelId,
                    value: latentTruth.value,
                    type: latentTruth.type,
                    fidelity: data.fidelity,
                    timestamp: Date.now()
                }
            });
        });
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Consequence] Engine Synchronized');
    }

    /**
     * The Decoupled Consequence Cycle
     * Re-CADENCED for 12-Hour Day (Phase 4 Refactor)
     */
    tick({ delta, worldDay }) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const inventories = Array.from(window.ModelLayer.inventories.values());
            const activeEntities = window.GameCore.activeEntities;
            const ticks = window.Heartbeat.ticks;

            // 1. DECAY: Erosion (Daily Gated - Tier 6)
            if (ticks.t12h) {
                DriftProcessor.applyDailyDrift(inventories);
            }

            // 2. OBSERVATION: Perception (Tier 1: 30s)
            if (ticks.t30s) {
                ObservationLayer.processObservation(activeEntities, window.ModelLayer.latentRegistry, performance.now());
            }

            // 3 & 4. STRATEGY & DEMAND (Tier 3: 30m)
            if (ticks.t30m) {
                inventories.forEach(inv => {
                    Strategist.evaluateFaction(inv, worldDay);
                    inv.generateContracts(); 
                });
            }

            // 5. DISPATCH: Labor Allocation (Tier 4: 2h)
            if (ticks.t2h) {
                const baseIdleNPCs = activeEntities.filter(en => en.def.type === 'npc' && !en.assignedContractId);
                
                inventories.forEach(inv => {
                    const factionIdleNPCs = baseIdleNPCs.filter(npc => 
                        npc.villageId === inv.factionId || npc.houseId === inv.factionId
                    );
                    
                    Dispatcher.processDispatcher(inv, factionIdleNPCs, worldDay);
                });
            }

        } catch (e) {
            console.error("[Consequence] Cycle Failure:", e);
        } finally {
            this.isProcessing = false;
        }
    }
}

export const Engine = new ConsequenceEngine();
