import { ConsequenceEvents } from '../../src_consequence_types/events.js';
import { DriftProcessor } from './drift.js';
import { ObservationLayer } from './observation.js';
import { Strategist } from './strategy.js';
import { Dispatcher } from './dispatch.js';

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
                    sourceId: data.seekerId,
                    version: (latentTruth.version || 1),
                    timestamp: window.EngineParams?.worldDay || 0
                }
            });
        });

        // Headless / Abstract Expedition Completion Bridge
        window.EventBus.on(ConsequenceEvents.EXPEDITION_DEPART, ({ contract }) => {
            if (!contract || !window.ModelLayer) return;
            const targetId = contract.targetIntelId;
            const seekerId = contract.teamMembers?.[0]?.id || 'seeker_agent';

            if (!window.ModelLayer.latentRegistry.has(targetId)) {
                window.ModelLayer.updateLatent(targetId, {
                    type: contract.type || 'historical',
                    value: { type: contract.type || 'historical', x: 0, z: 0, amount: 80 },
                    magnitude: 85,
                    version: (window.EngineParams?.worldDay || 1)
                });
            }

            window.EventBus.emit(ConsequenceEvents.TRUTH_EXTRACTED, {
                seekerId,
                intelId: targetId,
                fidelity: 0.85
            });

            contract.status = 'DELIVERED';
            if (window.GameCore?.activeEntities) {
                contract.teamMembers?.forEach(m => {
                    const npc = window.GameCore.activeEntities.find(e => e.id === m.id);
                    if (npc) npc.assignedContractId = null;
                });
            }

            window.EventBus.emit('WORLD_STATE_CHANGE', {
                name: `Expedition resolved ${targetId}`,
                baseSignificance: 0.65
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
            if (!window.ModelLayer) return;
            const inventories = Array.from(window.ModelLayer.inventories.values());
            const activeEntities = window.GameCore?.activeEntities || [];
            const ticks = window.Heartbeat?.ticks || { t12h: true, t30s: true, t30m: true, t2h: true };
            const simTime = (typeof performance !== 'undefined' && !window.isHeadless)
                ? performance.now()
                : ((worldDay || window.EngineParams?.worldDay || 0) * 86400000);

            // 1. DECAY: Erosion (Daily Gated - Tier 6)
            if (ticks.t12h) {
                DriftProcessor.applyDailyDrift(inventories);
            }

            // 2. OBSERVATION: Perception (Tier 1: 30s)
            if (ticks.t30s) {
                ObservationLayer.processObservation(activeEntities, window.ModelLayer.latentRegistry, simTime);
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
                const baseIdleNPCs = activeEntities.filter(en => (en.def?.type === 'npc' || en.role) && !en.assignedContractId && !en.isHarvested && en.alive !== false);
                
                inventories.forEach(inv => {
                    const factionIdleNPCs = baseIdleNPCs.filter(npc => 
                        npc.villageId === inv.factionId || npc.houseId === inv.factionId || inv.factionId === 'House Aethel'
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
