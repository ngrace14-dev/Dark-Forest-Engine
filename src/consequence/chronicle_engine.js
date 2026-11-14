/**
 * DARK FOREST ENGINE - CHRONICLE ENGINE (FRAMEWORK 4)
 * 
 * Role: Modifies the transition from World State -> History.
 * Identifies high-significance events for folklore generation.
 */

window.ChronicleEngine = {
    historyCount: 0,
    folkloreCount: 0,
    activeModifiers: {},

    init: function() {
        console.log("%c🟢 Framework 4: Chronicle Engine Initialized", "color: #10b981; font-weight: bold;");
        
        window.EventBus.on('WORLD_STATE_CHANGE', (event) => this.processEvent(event));
        window.EventBus.on('ACTIVE_SYSTEMS_UPDATED', (systems) => this.updateModifiers(systems));
    },

    updateModifiers: function(systems) {
        this.activeModifiers = {};
        systems.forEach(sys => {
            if (sys.vectors && sys.vectors.scalar_to_framework) {
                for (const [mod, val] of Object.entries(sys.vectors.scalar_to_framework)) {
                    this.activeModifiers[mod] = (this.activeModifiers[mod] || 0) + val;
                }
            }
        });
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
        this.historyCount++;
        if (!window.isHeadless) {
            console.log(`%c[CHRONICLE] Archiving as History: ${event.name} (Weight: ${weight.toFixed(2)})`, "color: #fbbf24;");
        }
        
        const historyPacket = {
            id: `hist_${window.EngineParams?.worldDay || 0}_${this.historyCount}`,
            name: event.name,
            weight: weight,
            scalars_at_time: { ...window.CivilizationState.scalars },
            type: "HistoricalFact"
        };

        window.EventBus.emit('HISTORY_ARCHIVED', historyPacket);
    },

    archiveAsFolklore: function(event, weight) {
        this.folkloreCount++;
        if (!window.isHeadless) {
            console.log(`%c[CHRONICLE] Archiving as Folklore: ${event.name} (Weight: ${weight.toFixed(2)})`, "color: #60a5fa;");
        }
        
        const lorePacket = {
            id: `lore_${window.EngineParams?.worldDay || 0}_${this.folkloreCount}`,
            name: event.name,
            weight: weight,
            type: "Folklore"
        };

        window.EventBus.emit('FOLKLORE_ARCHIVED', lorePacket);
    }
};

// Auto-initialize Framework 4
window.ChronicleEngine.init();
