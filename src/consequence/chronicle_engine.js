/**
 * DARK FOREST ENGINE - CHRONICLE ENGINE (FRAMEWORK 4)
 * 
 * Role: Modifies the transition from World State -> History.
 * Identifies high-significance events for folklore generation.
 */

window.ChronicleEngine = {
    init: function() {
        console.log("%c🟢 Framework 4: Chronicle Engine Initialized", "color: #10b981; font-weight: bold;");
        
        window.EventBus.on('WORLD_STATE_CHANGE', (event) => this.processEvent(event));
    },

    /**
     * Evaluates a world event and determines if it should become History.
     */
    processEvent: function(event) {
        const scalars = window.CivilizationState.scalars;
        
        // Calculate narrative significance
        // Base event significance + Scalar density
        const historicalWeight = (event.baseSignificance || 0.1) * (1.0 + scalars.SIGNIFICANCE_DENSITY);

        if (historicalWeight > 0.7) {
            this.archiveAsHistory(event, historicalWeight);
        } else if (historicalWeight > 0.3) {
            this.archiveAsFolklore(event, historicalWeight);
        }
    },

    archiveAsHistory: function(event, weight) {
        console.log(`%c[CHRONICLE] Archiving as History: ${event.name} (Weight: ${weight.toFixed(2)})`, "color: #fbbf24;");
        
        const historyPacket = {
            id: `hist_${Date.now()}`,
            name: event.name,
            weight: weight,
            scalars_at_time: { ...window.CivilizationState.scalars },
            type: "HistoricalFact"
        };

        window.EventBus.emit('HISTORY_ARCHIVED', historyPacket);
    },

    archiveAsFolklore: function(event, weight) {
        console.log(`%c[CHRONICLE] Archiving as Folklore: ${event.name} (Weight: ${weight.toFixed(2)})`, "color: #60a5fa;");
        
        const lorePacket = {
            id: `lore_${Date.now()}`,
            name: event.name,
            weight: weight,
            type: "Folklore"
        };

        window.EventBus.emit('FOLKLORE_ARCHIVED', lorePacket);
    }
};

// Auto-initialize Framework 4
window.ChronicleEngine.init();
