/**
 * File: src_systems_instability.js
 * Phase: Institutional Crisis Engine
 * 
 * Implements Historical Schisms, Succession Crises, and Political Coverups.
 * Allows civilizations to drift into instability from internal belief pressures.
 */

class InstitutionalInstabilitySystem {
    constructor() {
        this.activeCrises = []; // Array of { id, type, houseId, intensity, startDay }
        this.movements = new Map(); // Map<movementId, { id, type, leaderId, strength, doctrine }>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.evaluatePressure());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Instability] Civilizational Pressure Monitor Active');
    }

    /**
     * Monitors the world for systemic tensions.
     * Answers: Why did this civilization create its own problem?
     */
    evaluatePressure() {
        if (!window.DynastyManager || !window.HistoryOffice) return;

        window.DynastyManager.houses.forEach(house => {
            // 1. SCHISM CHECK: Truth Divergence vs Conviction
            const officialRecords = window.HistoryOffice.officialLedger.filter(n => n.bias === house.id);
            const totalDivergence = officialRecords.reduce((sum, r) => sum + (r.divergence || 0), 0);
            const avgDivergence = totalDivergence / (officialRecords.length || 1);

            if (avgDivergence > 0.6 && house.prestige > 50) {
                this.triggerSchism(house);
            }

            // 2. POLITICAL COVERUP: Low stability leads to truth suppression
            if (house.prestige < 30 && !this.isCrisisActive(house.id, 'COVERUP')) {
                this.triggerCoverup(house);
            }
        });
    }

    triggerSchism(house) {
        if (this.isCrisisActive(house.id, 'SCHISM')) return;

        const crisis = {
            id: 'schism_' + Math.random().toString(36).substr(2, 5),
            type: 'SCHISM',
            houseId: house.id,
            intensity: 0.7,
            startDay: window.EngineParams?.worldDay || 0,
            detail: `Internal disagreement over the ${house.name} Official History has led to an institutional split.`
        };

        this.activeCrises.push(crisis);
        house.prestige -= 20;

        window.ChronicleManager?.recordEvent({
            actorId: house.id,
            type: 'INSTITUTIONAL_SCHISM',
            detail: crisis.detail,
            significance: 180,
            historicalWeight: 120
        });

        window.EventBus.emit('UI_LOG', `⚖️ [SCHISM] ${house.name} is fracturing under the weight of its own revisionism.`);
    }

    triggerCoverup(house) {
        const crisis = {
            id: 'coverup_' + Math.random().toString(36).substr(2, 5),
            type: 'COVERUP',
            houseId: house.id,
            intensity: 0.9,
            startDay: window.EngineParams?.worldDay || 0
        };

        this.activeCrises.push(crisis);

        window.EventBus.emit('UI_LOG', `🤐 [COVERUP] ${house.name} has begun a systematic suppression of inconvenient truths.`);
        
        // Impact on History Office: future records from this house have higher divergence
    }

    isCrisisActive(houseId, type) {
        return this.activeCrises.some(c => c.houseId === houseId && c.type === type);
    }

    getCrises() {
        return this.activeCrises;
    }
}

window.InstabilityEngine = new InstitutionalInstabilitySystem();
export default window.InstabilityEngine;
