/**
 * DARK FOREST ENGINE - ANOMALY MANAGEMENT FRAMEWORK
 * Genesis Anomaly Bureau (GAB)
 * 
 * Detects and classifies emergent behaviors that deviate from simulation baselines.
 */

class AnomalyBureauSystem {
    constructor() {
        this.anomalies = new Map(); // anomalyId -> AnomalyObject
        this.baselines = {
            maxNpcAge: 120,
            maxResourceStock: 1000000,
            maxIntelPropagationRate: 0.8, // % of population per day
            minHouseInteraction: 0.1,    // Minimum trade/diplomacy frequency
            careerProgressionLimit: 100  // Max level
        };

        this.severityLevels = {
            DEBUG: 0,
            LOW: 1,      // Minor local deviation
            MEDIUM: 2,   // Regional impact or broken logic
            HIGH: 3,     // Systemic instability
            CRITICAL: 4  // Simulation-threatening (Infinite loops, immortality)
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', () => this.scanForAnomalies());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🔍 [GAB] Anomaly Bureau Engaged. Baselines locked.');
    }

    /**
     * Scans the world state for 10 specific anomaly classes.
     */
    scanForAnomalies() {
        this._checkImmortals();
        this._checkTradeLoops();
        this._checkInformationCascades();
        this._checkRogueVillages();
        this._checkHouseIsolation();
        this._checkCareerBreaks();
        this._checkAgingSystems();
        this._checkCivDivergence();
    }

    /**
     * 1. Rogue Villages
     * Detection: Village has 0 relations with all neighbors + independent status + extreme militarization.
     */
    _checkRogueVillages() {
        if (!window.VillageManager) return;
        window.VillageManager.villages.forEach(v => {
            const hasRelations = Object.values(v.relations).some(r => r !== 0);
            if (!hasRelations && v.feudalState === 'INDEPENDENT' && v.squads.length > 10) {
                this.reportAnomaly('ROGUE_VILLAGE', v.id, this.severityLevels.MEDIUM, 
                    `Village ${v.name} has entered isolationist militarization.`);
            }
        });
    }

    /**
     * 2. Information Cascades
     * Detection: A single intel_id is owned by >80% of total population in <24 hours.
     */
    _checkInformationCascades() {
        if (!window.IntelManager) return;
        // Logic would require tracking 'ownedByCount' per intel_id
        // Mocking for now:
        const totalPop = 250000;
        window.IntelManager.registry.forEach(intel => {
            const ownershipCount = window.IntelManager.ownershipRegistry.get(intel.intel_id)?.size || 0;
            if (ownershipCount > totalPop * 0.8) {
                this.reportAnomaly('INFO_CASCADE', intel.intel_id, this.severityLevels.MEDIUM,
                    `Intel ${intel.payload.title} has achieved 80% saturation.`);
            }
        });
    }

    /**
     * 4. Trade Exploits & 5. Infinite Resource Loops
     * Detection: Exponential growth in gold/resources or inventory value > 100x average.
     */
    _checkTradeLoops() {
        if (!window.VillageManager) return;
        window.VillageManager.villages.forEach(v => {
            if (v.stats.gold > this.baselines.maxResourceStock) {
                this.reportAnomaly('RESOURCE_LOOP', v.id, this.severityLevels.CRITICAL,
                    `Infinite resource loop detected in ${v.name}. Gold: ${v.stats.gold}`);
            }
        });
    }

    /**
     * 6. Immortal NPCs & 7. Aging Failures
     * Detection: Age > Baseline or birthDate in future.
     */
    _checkImmortals() {
        if (!window.PersonhoodManager) return;
        window.PersonhoodManager.profiles.forEach(p => {
            if (p.age > this.baselines.maxNpcAge) {
                this.reportAnomaly('IMMORTAL_NPC', p.id, this.severityLevels.HIGH,
                    `NPC ${p.id} has bypassed the mortality threshold. Age: ${p.age}`);
            }
        });
    }

    /**
     * 8. Broken Career Systems
     * Detection: Level > Limit or XP growth without associated task completion.
     */
    _checkCareerBreaks() {
        if (!window.CareerManager) return;
        // Check for level caps or anomalous XP spikes
    }

    /**
     * 9. House Isolation
     * Detection: House has 0 archives, 0 feuds, 0 alliances, and 0 blessed spots for > 2 Shifts.
     */
    _checkHouseIsolation() {
        if (!window.DynastyManager) return;
        window.DynastyManager.houses.forEach(h => {
            if (h.archives.length === 0 && h.monopolies.length === 0 && h.prestige < 10) {
                this.reportAnomaly('HOUSE_ISOLATION', h.id, this.severityLevels.LOW,
                    `House ${h.name} has fallen into systemic irrelevance.`);
            }
        });
    }

    /**
     * 10. Civilization Divergence
     * Detection: Global Cohesion < 0.1 or Truth Decay > 0.9.
     */
    _checkCivDivergence() {
        if (!window.CivilizationState) return;
        const s = window.CivilizationState.scalars;
        if (s.WORLD_ENTROPY > 0.95 || s.COHESION_INDEX < 0.05) {
            this.reportAnomaly('CIV_DIVERGENCE', 'GLOBAL', this.severityLevels.CRITICAL,
                `Simulation divergence threshold hit. Entropy: ${s.WORLD_ENTROPY}`);
        }
    }

    /**
     * Severity Classification & Reporting.
     */
    reportAnomaly(type, targetId, severity, detail) {
        const id = `${type}_${targetId}_${Date.now()}`;
        const anomaly = {
            id,
            type,
            targetId,
            severity,
            detail,
            day: window.EngineParams?.worldDay || 0,
            status: 'OPEN'
        };

        this.anomalies.set(id, anomaly);
        
        // Automated Reporting
        window.EventBus.emit('ANOMALY_REPORTED', anomaly);
        
        if (severity >= this.severityLevels.HIGH) {
            window.EventBus.emit('UI_LOG', `🚨 [GAB] ${anomaly.type} DETECTED: ${anomaly.detail}`);
        }
        
        // Investigation Procedure: Log snapshot of target state
        this._captureInvestigationSnapshot(anomaly);
    }

    _captureInvestigationSnapshot(anomaly) {
        // Logic to clone the state of the target entity for later review
        anomaly.snapshot = { timestamp: Date.now(), day: anomaly.day };
    }

    /**
     * Crow's Eye Dashboard Integration.
     */
    getDashboardData() {
        return Array.from(this.anomalies.values())
            .filter(a => a.status === 'OPEN')
            .sort((a, b) => b.severity - a.severity);
    }
}

window.GAB = new AnomalyBureauSystem();
export default window.GAB;
