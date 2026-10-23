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
            const seeker = window.GameCore.activeEntities.find(e => e.id === data.seekerId);
            const factionId = seeker?.villageId || seeker?.houseId || 'independent';
            
            window.EventBus.emit(ConsequenceEvents.REQ_BELIEF_UPDATE, {
                factionId: factionId,
                packet: {
                    intelId: data.intelId,
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
     */
    tick({ delta, worldDay }) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const inventories = Array.from(window.ModelLayer.inventories.values());
            const activeEntities = window.GameCore.activeEntities;

            // 1. DECAY: Erosion (Daily Gated - Issue 1)
            if (worldDay > this.lastDriftDay) {
                DriftProcessor.applyDailyDrift(inventories);
                this.lastDriftDay = worldDay;
            }

            // 2. OBSERVATION: Perception (Decoupled frequency handled in ObservationLayer)
            ObservationLayer.processObservation(activeEntities, window.ModelLayer.latentRegistry, performance.now());

            // 3 & 4. STRATEGY & DEMAND (Daily Gated - Issue 2 & 3)
            if (worldDay > this.lastStrategicAuditDay) {
                inventories.forEach(inv => {
                    Strategist.evaluateFaction(inv, worldDay);
                    inv.generateContracts(); // Demand generation now linked to strategic audit
                });
                this.lastStrategicAuditDay = worldDay;
            }

            // 5. DISPATCH: Labor Allocation (Every tick to ensure rapid recruitment)
            const baseIdleNPCs = activeEntities.filter(en => en.def.type === 'npc' && !en.assignedContractId);
            
            inventories.forEach(inv => {
                // Issue 4: Filter NPCs by faction for the labor auction
                const factionIdleNPCs = baseIdleNPCs.filter(npc => 
                    npc.villageId === inv.factionId || npc.houseId === inv.factionId
                );
                
                Dispatcher.processDispatcher(inv, factionIdleNPCs, worldDay);
            });

        } catch (e) {
            console.error("[Consequence] Cycle Failure:", e);
        } finally {
            this.isProcessing = false;
        }
    }
}

export const Engine = new ConsequenceEngine();
