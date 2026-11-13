/**
 * File: src_systems_information_velocity_observatory.js
 * Information Velocity Bureau (IVB)
 * 
 * Purpose:
 * Analyze how information travels across the Dark Forest.
 * Measure the speed of Rumors, Facts, and Verification.
 * Determine if information can outrun geography.
 */

class InformationVelocityObservatory {
    constructor() {
        // --- CONFIGURATION ---
        this.MAX_TRACKED_SAMPLES = 500;
        this.LATENCY_WINDOW_SIZE = 50;

        // --- METRICS BINS ---
        this.velocityData = {
            rumorSpeeds: [],      // transmission_count per day since creation
            factSpeeds: [],       // same for facts
            verificationLatency: [], // rolling window of latency
            reachBySignificance: new Map(), // significance vs unique nodes reached
            houseCommunication: new Map(),  // houseId -> { incoming: 0, outgoing: 0, internal: 0 }
        };

        this.samples = {
            trackedLineages: new Map(), // intel_id -> { startTime, nodes: Set, type }
            factionCache: new Map(),    // nodeId -> faction
        };

        this.metrics = {
            intelVelocity: 0,      // average nodes per day
            knowledgeReach: 0,     // % of world nodes that hold at least one fact
            communicationLatency: 0, // average day-delay in propagation
            informationBottlenecks: [], // factions/locations where propagation stalls
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        // Track the birth of information
        window.EventBus.on('INTEL_REGISTERED', (intel) => this.onIntelRegistered(intel));
        
        // Track the movement of information
        window.EventBus.on('INTEL_GAINED', (data) => this.onIntelGained(data));
        
        // Track verification events
        window.EventBus.on('INTEL_VERIFIED', (intel) => this.onIntelVerified(intel));

        // Periodic Analysis
        window.EventBus.on('SHIFT_COMPLETE', () => this.analyzeVelocity());
        
        window.EventBus.emit('UI_LOG', '[Bureau] Information Velocity Bureau Online. Monitoring Mobility.');
    }

    onIntelRegistered(intel) {
        if (!intel || !intel.intel_id) return;

        if (!this.samples.trackedLineages.has(intel.intel_id)) {
            // Memory Management: Prune oldest if too many
            if (this.samples.trackedLineages.size > this.MAX_TRACKED_SAMPLES) {
                const firstKey = this.samples.trackedLineages.keys().next().value;
                this.samples.trackedLineages.delete(firstKey);
            }

            this.samples.trackedLineages.set(intel.intel_id, {
                startTime: window.EngineParams?.worldDay || 0,
                nodes: new Set(),
                type: intel.type,
                significance: (intel.significance?.historical || 0) + (intel.significance?.survival || 0) || 1,
                birthEpoch: window.EngineParams?.worldEpoch || 0
            });
        }
    }

    onIntelGained({ intelId, nodeId }) {
        if (!intelId || !nodeId) return;

        const lineage = this.samples.trackedLineages.get(intelId);
        if (lineage) {
            lineage.nodes.add(nodeId);
            
            // Track House Communication
            const intel = window.IntelManager?.lookup(intelId);
            if (intel) {
                const lastSource = intel.provenance?.last_source;
                if (!lastSource) return;

                const sourceFaction = lastSource.source_faction;
                const targetFaction = this.getNodeFaction(nodeId);

                if (sourceFaction && targetFaction) {
                    this.updateHouseComm(sourceFaction, targetFaction);
                }
            }
        }
    }

    onIntelVerified(intel) {
        if (!intel || !intel.parent_intel_id) return;

        // Find the parent rumor to calculate verification latency
        const parent = this.samples.trackedLineages.get(intel.parent_intel_id);
        if (parent) {
            const latency = (window.EngineParams?.worldDay || 0) - parent.startTime;
            
            this.velocityData.verificationLatency.push(latency);
            if (this.velocityData.verificationLatency.length > this.LATENCY_WINDOW_SIZE) {
                this.velocityData.verificationLatency.shift();
            }
            
            window.EventBus.emit('UI_LOG_DEBUG', `[IVB] Verification Latency: ${latency} days for ${intel.payload?.title || 'Unknown'}`);
        }
    }

    updateHouseComm(sourceFaction, targetFaction) {
        const getStats = (faction) => {
            if (!this.velocityData.houseCommunication.has(faction)) {
                this.velocityData.houseCommunication.set(faction, { incoming: 0, outgoing: 0, internal: 0 });
            }
            return this.velocityData.houseCommunication.get(faction);
        };

        if (sourceFaction === targetFaction) {
            getStats(sourceFaction).internal++;
        } else {
            getStats(sourceFaction).outgoing++;
            getStats(targetFaction).incoming++;
        }
    }

    getNodeFaction(nodeId) {
        if (!nodeId) return 'independent';
        
        // Check cache first
        if (this.samples.factionCache.has(nodeId)) {
            return this.samples.factionCache.get(nodeId);
        }

        // Check if the nodeId itself is a faction/house
        if (typeof nodeId === 'string' && (nodeId.startsWith('house_') || nodeId === 'monster' || nodeId === 'forest')) {
            this.samples.factionCache.set(nodeId, nodeId);
            return nodeId;
        }

        // Fallback to spatial lookup if node is an entity
        const entity = window.GameCore?.activeEntities?.find(e => e.id === nodeId);
        if (entity) {
            const faction = entity.def?.faction || 'independent';
            this.samples.factionCache.set(nodeId, faction);
            return faction;
        }
        
        return 'independent';
    }

    analyzeVelocity() {
        const currentDay = window.EngineParams?.worldDay || 0;
        let totalVelocity = 0;
        let totalTracked = 0;

        const worldNodeCount = Math.max(1, window.GameCore?.activeEntities?.length || 0);
        const nodesWithFacts = new Set();

        // Clear speed records for this cycle
        const currentRumorSpeeds = [];
        const currentFactSpeeds = [];

        this.samples.trackedLineages.forEach((lineage, id) => {
            const age = Math.max(0.1, currentDay - lineage.startTime);
            const velocity = lineage.nodes.size / age;
            
            if (lineage.type === 'FACT') {
                currentFactSpeeds.push(velocity);
                lineage.nodes.forEach(n => nodesWithFacts.add(n));
            } else {
                currentRumorSpeeds.push(velocity);
            }

            totalVelocity += velocity;
            totalTracked++;
        });

        this.velocityData.rumorSpeeds = currentRumorSpeeds;
        this.velocityData.factSpeeds = currentFactSpeeds;

        this.metrics.intelVelocity = totalTracked > 0 ? totalVelocity / totalTracked : 0;
        this.metrics.knowledgeReach = nodesWithFacts.size / worldNodeCount;
        
        const avgLatency = this.velocityData.verificationLatency.length > 0 
            ? this.velocityData.verificationLatency.reduce((a, b) => a + b, 0) / this.velocityData.verificationLatency.length
            : 0;
        this.metrics.communicationLatency = avgLatency;

        // Cleanup Cache occasionally
        if (this.samples.factionCache.size > 1000) {
            this.samples.factionCache.clear();
        }

        this.identifyBottlenecks();
        this.outputObservatoryReport();
    }

    identifyBottlenecks() {
        // Find factions with high incoming but low outgoing internal sharing
        this.metrics.informationBottlenecks = [];
        this.velocityData.houseCommunication.forEach((stats, faction) => {
            if (stats.incoming > 5 && stats.outgoing < 2) {
                this.metrics.informationBottlenecks.push(faction);
            }
        });
    }

    outputObservatoryReport() {
        const canOutrunGeography = this.metrics.intelVelocity > 5.0; // Arb threshold: 5 nodes/day is "fast"

        console.log("%c --- INFORMATION MOBILITY OBSERVATORY ---", "color: #60a5fa; font-weight: bold;");
        console.log(`Intel Velocity:       ${this.metrics.intelVelocity.toFixed(2)} nodes/day`);
        console.log(`Knowledge Reach:      ${(this.metrics.knowledgeReach * 100).toFixed(1)}% of population`);
        console.log(`Comm Latency:         ${this.metrics.communicationLatency.toFixed(1)} days (Verification)`);
        console.log(`Bottlenecks:          ${this.metrics.informationBottlenecks.join(', ') || 'None'}`);
        console.log(`Geographic Defiance:  ${canOutrunGeography ? "YES - Information outruns geography via Arcane Door Network." : "NO - Information bound by physical travel."}`);
        console.log("%c -----------------------------------------", "color: #60a5fa;");

        window.EventBus.emit('OBSERVATORY_VELOCITY_REPORT', {
            metrics: this.metrics,
            canOutrunGeography
        });
    }
}

window.InformationVelocityObservatory = new InformationVelocityObservatory();
export default window.InformationVelocityObservatory;
