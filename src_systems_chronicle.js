/**
 * File: src_systems_chronicle.js
 * Phase 5: World Events & Chronology
 * Manages the "World Ledger" – a persistent history of every entity's major life events.
 */
window.ChronicleManager = {
    // The Master Chronology (Global Events)
    worldLedger: [],
    
    // Playback snapshots
    snapshots: new Map(), // day -> snapshot

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
        // ... existing code ...
        // 5. Narrative Echo (Optional: UI Log for major events)
        if (entry.significance > 80 || entry.historicalWeight > 100) {
            window.EventBus.emit('UI_LOG', `[HISTORY] ${entry.detail}`);
        }

        // 6. Snapshot periodic state for playback
        this.captureSnapshot();
    },

    captureSnapshot: function() {
        const day = window.EngineParams?.worldDay || 0;
        // Bible §5: Reality Shift every 14 days. Capture on shifts and every 5 days for granularity.
        if (day % 5 !== 0 || this.snapshots.has(day)) return;

        const snapshot = {
            day: day,
            epoch: window.EngineParams?.worldEpoch || 0,
            villages: window.VillageManager.villages.map(v => ({
                id: v.id,
                name: v.name,
                pop: v.population.current,
                pros: v.stats.prosperity,
                food: v.stats.food,
                gold: v.stats.gold,
                x: v.x,
                z: v.z,
                house: v.nobleHouse
            })),
            forces: JSON.parse(JSON.stringify(window.ForceManager?.forces || {})),
            houses: Array.from(window.DynastyManager?.houses.values() || []).map(h => ({
                id: h.id,
                prestige: h.prestige,
                isBlessed: h.isBlessed
            })),
            truth: window.IntelTracker?.stats.globalFidelity || 1.0,
            activeMysteries: Array.from(window.InvestigationManager?.mysteries.values() || []).map(m => ({
                id: m.id,
                progress: m.discoveryProgress,
                state: m.state
            }))
        };
        this.snapshots.set(day, snapshot);
    },

    getHistoryFor: function(actorId) {
        return this.entityRecords.get(actorId) || [];
    },

    getRecentGlobal: function(limit = 10) {
        return this.worldLedger.slice(-limit).reverse();
    },

    // --- PHASE 4: NARRATIVE EVOLUTION ---
    evolveNarrative: function() {
        // Find events with high historical weight that haven't become legends yet
        const candidates = this.worldLedger.filter(e => e.historicalWeight > 100 && !e.legendId);
        
        candidates.forEach(event => {
            const legend = {
                id: 'leg_' + Math.random().toString(36).substr(2, 9),
                originalEventId: event.id,
                title: this.generateLegendTitle(event),
                narrative: this.generateMythicNarrative(event),
                power: event.historicalWeight * 1.5,
                forces: this.identifyInvolvedForces(event),
                // FORCE PIVOT: Calculate Signature (Bible §18)
                signature: window.ForceManager?.calculateSignature(event)
            };
            
            event.legendId = legend.id;
            window.GameState.legends ??= [];
            window.GameState.legends.push(legend);

            // --- PHASE 6: FOLKLORE HOOK ---
            window.EventBus.emit('LEGEND_CREATED', legend);
            
            window.EventBus.emit('UI_LOG', `[LEGEND] A new story is taking root: ${legend.title}`);
        });
    },

    generateLegendTitle: function(event) {
        const nouns = ['Slayer', 'Bane', 'Hope', 'Shadow', 'Flame', 'Silence'];
        const subjects = ['Forest', 'Beast', 'Village', 'Crown', 'Mountain'];
        return `The ${nouns[Math.floor(Math.random() * nouns.length)]} of ${subjects[Math.floor(Math.random() * subjects.length)]}`;
    },

    generateMythicNarrative: function(event) {
        return `It is said that in the days of ${event.timestamp.year}, a great ${event.type} occurred near ${event.detail}. The world remembers.`;
    },

    identifyInvolvedForces: function(event) {
        const forces = [];
        if (event.detail.includes('Forest')) forces.push('Forest');
        if (event.detail.includes('King') || event.detail.includes('Capital')) forces.push('Crown');
        return forces;
    },

    // --- PHASE 8: PROCEDURAL FOLKLORE ---
    generatePoem: function(legend) {
        const verses = [
            `In the shadow of the ${legend.forces.includes('Forest') ? 'Whispering Woods' : 'Tall Pines'},`,
            `Where the ${legend.title} once stood,`,
            `The ${legend.forces.includes('Crown') ? 'King\'s' : 'Villager\'s'} hearts were heavy,`,
            `As they remembered the ${legend.originalEventId ? 'day of fire' : 'ancient story'}.`
        ];
        
        const poem = {
            id: 'poem_' + Math.random().toString(36).substr(2, 9),
            title: `Lament of the ${legend.title}`,
            text: verses.join('\n'),
            classification: 'Historical Legend',
            historicalWeight: legend.power,
            truthScore: 500 + Math.random() * 400
        };

        window.GameState.anthology ??= [];
        window.GameState.anthology.push(poem);
        window.EventBus.emit('UI_LOG', `[FOLKLORE] A new poem has been written: ${poem.title}`);
    }
};

window.ChronicleManager.init();
