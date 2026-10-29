/**
 * GENESIS ENGINE - DYNASTIC CONTINUITY OBSERVATORY
 * Directorate: Dynastic Continuity
 * 
 * Audits leadership transitions to determine if Institutional Intent is preserved.
 * Tracks mission drift, ideological decay, and the "Death of the Founder's Dream."
 */

class DynasticContinuityObservatory {
    constructor() {
        this.stats = {
            globalSuccessionFidelity: 1.0,
            averageMissionDrift: 0.0,
            ideologicalAlignment: 1.0
        };

        this.houseFidelityLedger = new Map(); // HouseID -> { snapshots: [] }

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SUCCESSION', (data) => this.auditSuccession(data));
        window.EventBus.on('HEARTBEAT_T12H', () => this.calculateGlobalHealth());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏛️ [Continuity] Dynastic Observatory Active');
    }

    /**
     * Measures the fidelity of a leadership transition.
     * Bible §36: "Individuals die; institutions persist."
     */
    auditSuccession(successionData) {
        if (!window.DynastyManager || !window.PersonhoodManager) return;

        const houseId = successionData.actorId;
        const house = window.DynastyManager.houses.get(houseId);
        if (!house) return;

        // Correct regex parsing for the detail string
        // "House Terminus: Succession from lord_terminus_0 to npc_7_gen0_1739546250785_0."
        const match = successionData.detail.match(/from (.*) to (.*)\./);
        if (!match) return;

        const oldLeaderId = match[1];
        const newLeaderId = match[2];

        // Access profiles safely
        const oldProfile = window.PersonhoodManager.profiles.get(oldLeaderId);
        const newProfile = window.PersonhoodManager.profiles.get(newLeaderId);

        if (!newProfile) return;

        // 1. IDEOLOGICAL ALIGNMENT (Trait Delta)
        let fidelity = 1.0;
        if (oldProfile && oldProfile.traits && newProfile.traits) {
            const traits = ['ambition', 'loyalty', 'fear', 'riskTolerance'];
            let totalDelta = 0;
            let validTraits = 0;
            traits.forEach(t => {
                if (oldProfile.traits[t] !== undefined && newProfile.traits[t] !== undefined) {
                    totalDelta += Math.abs(oldProfile.traits[t] - newProfile.traits[t]);
                    validTraits++;
                }
            });
            const alignment = validTraits > 0 ? 1.0 - (totalDelta / validTraits) : 1.0;
            fidelity = alignment;
        }

        // 2. MISSION DRIFT
        const mission = house.currentIdentity?.mission || 'PRESERVE_ORDER';
        const successorGoal = newProfile.ambition?.lifeGoal || 'NONE';
        const missionMatch = this._checkMissionMatch(mission, successorGoal);
        
        if (!missionMatch && successorGoal !== 'NONE') {
            fidelity *= 0.8; // Penalty for mismatched intent
        }

        // 3. ARCHIVE RETENTION
        const houseArchiveCount = house.archives?.length || 1;
        const successorArchiveCount = newProfile.property?.archives?.length || 0;
        const archiveFidelity = successorArchiveCount / houseArchiveCount;
        fidelity *= (0.5 + (Math.min(1.0, archiveFidelity) * 0.5));

        this.recordSuccessionEvent(house.id, fidelity, missionMatch);
    }

    _checkMissionMatch(mission, goal) {
        const mapping = {
            'PRESERVE_ORDER': ['PROTECT_VILLAGE', 'FOUND_DYNASTY', 'REFORM_INSTITUTION'],
            'ADAPT_AND_SURVIVE': ['DISCOVER_LOST_TRUTH', 'COMPILE_RUNIC_THEORY', 'ADAPT_AND_SURVIVE'],
            'ACQUIRE_POWER': ['ACCUMULATE_WEALTH', 'LEGENDARY_HUNTER', 'ACQUIRE_POWER'],
            'OVERTURN_THE_OLD': ['DISCOVER_LOST_TRUTH', 'COMPILE_RUNIC_THEORY']
        };
        return mapping[mission]?.includes(goal) ?? false;
    }

    recordSuccessionEvent(houseId, fidelity, missionMatch) {
        if (!this.houseFidelityLedger.has(houseId)) {
            this.houseFidelityLedger.set(houseId, { snapshots: [] });
        }
        
        const history = this.houseFidelityLedger.get(houseId);
        const drift = 1.0 - fidelity;

        history.snapshots.push({
            day: window.EngineParams?.worldDay || 0,
            fidelity,
            missionMatch,
            drift
        });

        if (fidelity < 0.4) {
            window.EventBus.emit('UI_LOG', `⚠️ [CONTINUITY] House ${houseId} has undergone a RADICAL SUCCESSION. The founder's intent is lost.`);
        }
    }

    calculateGlobalHealth() {
        let totalFidelity = 0;
        let totalDrift = 0;
        let houseCount = 0;

        this.houseFidelityLedger.forEach(history => {
            const last = history.snapshots[history.snapshots.length - 1];
            if (last) {
                totalFidelity += last.fidelity;
                totalDrift += last.drift;
                houseCount++;
            }
        });

        this.stats.globalSuccessionFidelity = totalFidelity / (houseCount || 1);
        this.stats.averageMissionDrift = totalDrift / (houseCount || 1);
    }

    generateContinuityReport() {
        return {
            title: "DYNASTIC CONTINUITY OBSERVATORY REPORT",
            global_fidelity: this.stats.globalSuccessionFidelity,
            mission_drift: this.stats.averageMissionDrift,
            verdict: this._getContinuityVerdict()
        };
    }

    _getContinuityVerdict() {
        if (this.stats.globalSuccessionFidelity < 0.5) return "INSTITUTIONAL DECAY: Leadership changes have erased historical intent.";
        if (this.stats.averageMissionDrift > 0.4) return "MISSION DRIFT: Houses are prioritizing individual ambition over institutional goals.";
        return "HIGH FIDELITY: The 19 Houses remain anchored to their founding principles.";
    }
}

window.ContinuityObservatory = new DynasticContinuityObservatory();
export default window.ContinuityObservatory;
