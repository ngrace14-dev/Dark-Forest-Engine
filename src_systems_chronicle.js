/**
 * File: src_systems_chronicle.js
 * Phase 5: World Events & Chronology
 * Manages the "World Ledger" – a persistent history of every entity's major life events.
 */
window.ChronicleManager = {
    // The Master Chronology (Global Events)
    worldLedger: [],
    
    // Per-Entity History (Scoped to ID)
    entityRecords: new Map(),

    init: function() {
        // Hydrate from existing worldEvents if they exist
        if (window.GameState?.worldEvents) {
            window.GameState.worldEvents.forEach(e => this.recordEvent(e));
        }
    },

    /**
     * Records a significant event into the world's memory.
     * @param {Object} event - { actorId, type, detail, significance, historicalWeight }
     */
    recordEvent: function(event) {
        const timestamp = {
            day: window.EngineParams?.worldDay || 0,
            year: Math.floor((window.EngineParams?.worldDay || 0) / 120) + 1,
            epoch: window.EngineParams?.worldEpoch || 0,
            realTime: Date.now()
        };

        const significance = event.significance || 1;
        const historicalWeight = event.historicalWeight || (significance * 0.1);

        const entry = {
            ...event,
            significance,
            historicalWeight,
            timestamp,
            id: 'evt_' + Math.random().toString(36).substr(2, 9)
        };

        // 1. Add to Global Ledger
        this.worldLedger.push(entry);
        if (this.worldLedger.length > 500) this.worldLedger.shift(); // Hard limit

        // 2. Add to Entity Scoped History
        if (entry.actorId) {
            if (!this.entityRecords.has(entry.actorId)) {
                this.entityRecords.set(entry.actorId, []);
            }
            const records = this.entityRecords.get(entry.actorId);
            records.push(entry);
            if (records.length > 50) records.shift(); // Per-entity limit
        }

        // 3. Career XP Hooks
        if (entry.significance > 50 || entry.historicalWeight > 10) {
            const xp = Math.floor(entry.significance / 10) + Math.floor(entry.historicalWeight);
            window.CareerManager.addXP('archivist', xp);
        }
        
        // 4. Update GameState for persistence
        window.GameState.worldEvents = this.worldLedger;

        // 5. Narrative Echo (Optional: UI Log for major events)
        if (entry.significance > 80 || entry.historicalWeight > 100) {
            window.EventBus.emit('UI_LOG', `[HISTORY] ${entry.detail}`);
        }
    },

    getHistoryFor: function(actorId) {
        return this.entityRecords.get(actorId) || [];
    },

    getRecentGlobal: function(limit = 10) {
        return this.worldLedger.slice(-limit).reverse();
    }
};

window.ChronicleManager.init();
