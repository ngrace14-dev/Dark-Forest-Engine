/**
 * DARK FOREST ENGINE - INSTITUTIONAL CONTINUITY FRAMEWORK
 * Genesis Continuity Office (GCO)
 * 
 * Manages the survival of identity, culture, and memory across generations.
 */

class InstitutionalContinuitySystem {
    constructor() {
        this.entityDNA = new Map(); // EntityID -> DNA Object
        this.historySnapshots = new Map(); // EntityID -> Array of snapshots (by Century)
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.recordSnapshots());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏛️ [GCO] Institutional Continuity Office Engaged');
    }

    /**
     * Registers a new entity into the continuity registry.
     */
    registerEntity(id, type, initialData = {}) {
        const dna = {
            id,
            type, // 'VILLAGE', 'HOUSE', 'GUILD', 'ORDER'
            culture: new Map(initialData.culture || []),
            values: {
                tradition: 0.8,
                innovation: 0.2,
                order: 0.7,
                liberty: 0.3,
                piety: 0.5
            },
            traditions: initialData.traditions || [],
            foundingMyth: initialData.foundingMyth || `The Founding of ${id}`,
            economicFunction: initialData.industry || 'Subsistence',
            dominantCareers: new Map(),
            historicalMemory: [], // Array of { eventId, day, subjectiveWeight }
            knownTruths: new Set(),
            
            // Metrics
            metrics: {
                continuityScore: 1.0,
                culturalDrift: 0.0,
                institutionalDrift: 0.0,
                memoryLossRate: 0.01,
                traditionRetention: 1.0,
                collapseRisk: 0.0
            }
        };

        this.entityDNA.set(id, dna);
        return dna;
    }

    /**
     * Process Lifecycle: Updates DNA and metrics based on simulation events.
     */
    updateContinuity(entityId, deltaDays) {
        const dna = this.entityDNA.get(entityId);
        if (!dna) return;

        // 1. MEMORY LOSS (Bible §17)
        // Memory fades naturally unless reinforced by History Office or Monuments
        dna.historicalMemory = dna.historicalMemory.filter(m => {
            const age = window.EngineParams.worldDay - m.day;
            const decayProb = dna.metrics.memoryLossRate * (age / 100);
            return Math.random() > decayProb;
        });

        // 2. CULTURAL DRIFT
        // Exposure to other cultures/player actions causes drift
        dna.metrics.culturalDrift += 0.001 * deltaDays;

        // 3. TRADITION RETENTION
        // Traditions fail if resources are low or population turns over too fast
        if (dna.traditions.length > 0 && Math.random() < 0.005) {
            const lostIdx = Math.floor(Math.random() * dna.traditions.length);
            const lostTradition = dna.traditions.splice(lostIdx, 1)[0];
            dna.metrics.traditionRetention = dna.traditions.length / (initialCount || 1);
            window.EventBus.emit('UI_LOG_DEBUG', `[CONTINUITY] ${entityId} has lost the tradition: ${lostTradition}`);
        }

        // 4. CALCULATE COLLAPSE RISK
        // Risk increases as continuity score drops and memory is lost
        const cScore = this.calculateContinuityScore(dna);
        dna.metrics.continuityScore = cScore;
        dna.metrics.collapseRisk = (1.0 - cScore) * (1.0 + dna.metrics.culturalDrift);

        if (dna.metrics.collapseRisk > 0.8) {
            window.EventBus.emit('INSTITUTIONAL_COLLAPSE_WARNING', { entityId, risk: dna.metrics.collapseRisk });
        }
    }

    calculateContinuityScore(dna) {
        const memoryWeight = Math.min(1.0, dna.historicalMemory.length / 10);
        const traditionWeight = dna.metrics.traditionRetention;
        const driftPenalty = 1.0 - Math.min(1.0, dna.metrics.culturalDrift);
        
        return (memoryWeight * 0.3) + (traditionWeight * 0.4) + (driftPenalty * 0.3);
    }

    /**
     * Long-term Reporting: Snapshots recorded every century (or Epoch).
     */
    recordSnapshots() {
        const century = Math.floor(window.EngineParams.worldDay / 100);
        this.entityDNA.forEach((dna, id) => {
            if (!this.historySnapshots.has(id)) this.historySnapshots.set(id, []);
            
            const snapshot = JSON.parse(JSON.stringify(dna));
            snapshot.century = century;
            this.historySnapshots.get(id).push(snapshot);
        });
    }

    /**
     * Century-Level Comparison System.
     */
    compareCenturies(entityId, centuryA, centuryB) {
        const snapshots = this.historySnapshots.get(entityId);
        if (!snapshots) return null;

        const snapA = snapshots.find(s => s.century === centuryA);
        const snapB = snapshots.find(s => s.century === centuryB);

        if (!snapA || !snapB) return "Insufficient Data";

        return {
            entity: entityId,
            period: `${centuryA} -> ${centuryB}`,
            identityDivergence: this._calculateDivergence(snapA, snapB),
            survivingTraditions: snapB.traditions.filter(t => snapA.traditions.includes(t)),
            lostMemoryCount: snapA.historicalMemory.length - snapB.historicalMemory.filter(m => snapA.historicalMemory.some(am => am.eventId === m.eventId)).length,
            dominantShift: snapB.dominantCareers !== snapA.dominantCareers
        };
    }

    _calculateDivergence(a, b) {
        // High-level heuristic of institutional change
        let diff = 0;
        if (a.foundingMyth !== b.foundingMyth) diff += 0.5;
        if (a.economicFunction !== b.economicFunction) diff += 0.3;
        // Value drift
        for (let v in a.values) {
            diff += Math.abs(a.values[v] - b.values[v]) * 0.1;
        }
        return Math.min(1.0, diff);
    }
}

window.GCO = new InstitutionalContinuitySystem();
export default window.GCO;
