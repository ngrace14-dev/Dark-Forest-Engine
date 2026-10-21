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
    
    // LEGEND ENGINE: Tracking weight for individuals (Bible §1)
    npcHistoricalWeights: new Map(), // nodeId -> totalWeight

    init: function() {
        // Hydrate from existing worldEvents if they exist
        if (window.GameState?.worldEvents) {
            window.GameState.worldEvents.forEach(e => this.recordEvent(e));
        }
    },

        /**
     * Records a significant event into the world's memory.
     * Bible §1: Action -> Intent -> Event -> Chronicle.
     */
    recordEvent: function(event) {
        // 1. Validation & Enrichment
        event.id ??= 'evt_' + Math.random().toString(36).substr(2, 9);
        event.timestamp ??= {
            day: window.EngineParams?.worldDay || 0,
            epoch: window.EngineParams?.worldEpoch || 0,
            year: (window.EngineParams?.worldEpoch || 0) * 1000 + (window.EngineParams?.worldDay || 0)
        };
        event.significance ??= 10;
        event.historicalWeight ??= 5;
        event.participants ??= [];
        event.witnesses ??= [];
        event.location ??= { x: 0, z: 0 };

        // 2. Global Ledger
        this.worldLedger.push(event);

        // 3. Entity Scoped Ledger
        if (event.actorId) {
            if (!this.entityRecords.has(event.actorId)) {
                this.entityRecords.set(event.actorId, []);
            }
            this.entityRecords.get(event.actorId).push(event);
        }

        // 4. Witness Logic (Phase 1B: Filtering & Discovery)
        this.generateWitnessIntel(event);

        // 5. Weight Accumulation (Bible §1)
        if (event.actorId) {
            const currentWeight = this.npcHistoricalWeights.get(event.actorId) || 0;
            const newWeight = currentWeight + (event.historicalWeight || 1);
            this.npcHistoricalWeights.set(event.actorId, newWeight);

            // LEGACY INTEGRATION: Feed weight into LegacyManager
            if (window.LegacyManager) {
                window.LegacyManager.addSignificance(event.actorId, event.historicalWeight || 1);
            }

            // --- PHASE 1C/6: LEGEND GENERATION (REFINED SCORING §1) ---
            const typeModifier = this.getEventTypeModifier(event.type);
            const witnessFactor = event.witnesses.length * 10;
            const legendScore = (newWeight * typeModifier) + witnessFactor;

            if (legendScore > 500 && !event.isLegendary) {
                 this.checkLegendThreshold(event.actorId, newWeight);
            }
        }

        // 6. Narrative Echo
        if (event.significance > 80 || event.historicalWeight > 100) {
            window.EventBus.emit('UI_LOG', `[HISTORY] ${event.detail}`);
        }

        this.captureSnapshot();
    },

    getEventTypeModifier: function(type) {
        const modifiers = {
            'death': 3.0,
            'famine_start': 2.5,
            'barrier_failure': 4.0,
            'growth_milestone': 1.5,
            'house_sanctioned': 5.0,
            'house_favored': 2.0,
            'SHIFT_COMPLETE': 0.5, // Common world event
            'entity_death': 1.0
        };
        return modifiers[type] || 1.0;
    },

    /**
     * Phase 1B: Witness Layer & Discovery
     * Bible §13: Event -> Witness -> Intel
     */
    generateWitnessIntel: function(event) {
        if (!window.IntelManager || !window.GameCore?.SpatialGrid) return;

        // 1. Identify Physical Witnesses (Direct & Recorded)
        let candidates = [];
        if (window.GameCore.SpatialGrid.getNearbyEntities) {
            candidates = window.GameCore.SpatialGrid.getNearbyEntities(event.location.x, event.location.z, 30);
        }

        // 2. Filter & Prioritize (Top 5 §4)
        const witnesses = [];
        const seenIds = new Set();
        
        // Always include actor if they can witness their own deed
        if (event.actorId) seenIds.add(event.actorId);

        // Prioritize Named NPCs and Player
        candidates.sort((a, b) => {
            const weightA = (a.id === 'player' ? 1000 : (this.npcHistoricalWeights.get(a.id) || 0));
            const weightB = (b.id === 'player' ? 1000 : (this.npcHistoricalWeights.get(b.id) || 0));
            return weightB - weightA;
        });

        for (const cand of candidates) {
            if (witnesses.length >= 5) break;
            if (seenIds.has(cand.id)) continue;
            
            witnesses.push({
                id: cand.id,
                type: cand.id === 'player' ? 'DIRECT' : (cand.def?.type === 'npc' ? 'DIRECT' : 'RECORDED'),
                significance: cand.id === 'player' ? 100 : (this.npcHistoricalWeights.get(cand.id) || 10)
            });
            seenIds.add(cand.id);
        }

        // 3. Identify Institutional Witnesses (§4)
        if (window.VillageManager) {
            window.VillageManager.villages.forEach(v => {
                const dist = Math.hypot(v.x - event.location.x, v.z - event.location.z);
                if (dist < (v.territory?.radius || 100)) {
                    if (!seenIds.has(`village_${v.id}`)) {
                        witnesses.push({
                            id: `village_${v.id}`,
                            type: 'INSTITUTIONAL',
                            significance: 50
                        });
                        seenIds.add(`village_${v.id}`);
                    }
                }
            });
        }

        // 4. Update Event Record
        event.witnesses = witnesses.map(w => w.id);

                // 5. Generate Intel Records (Phase 1C: Pipeline Activation)
        witnesses.forEach(w => {
            const intelId = window.IntelManager.register({
                type: event.significance > 50 ? window.IntelEnums.TYPES.FACT : window.IntelEnums.TYPES.RUMOR,
                payload: {
                    title: event.type.toUpperCase().replace(/_/g, ' '),
                    description: event.detail,
                    timestamp_day: event.timestamp.day,
                    target_coord: { x: event.location.x, z: event.location.z },
                    tags: ['CHRONICLE', event.type, w.type]
                },
                significance: {
                    historical: event.historicalWeight,
                    crow: event.significance
                },
                certainty: w.type === 'DIRECT' ? 0.9 : 0.6,
                source_credibility: w.type === 'DIRECT' ? 0.8 : 0.5,
                truth_state: window.IntelEnums.TRUTH_STATE.UNKNOWN, // Must be verified by TruthSystem (§14)
                
                // --- THE RARE PART: Source Attribution ---
                provenance: [{
                    node_id: w.id,
                    timestamp: window.EngineParams?.worldDay || 0,
                    origin_type: 'WITNESS',
                    source_faction: 'Neutral'
                }]
            });

                    // --- PLAYER INTEGRATION: INFORMATION PIPELINE (Node 8) ---
        if (w.id === 'player') {
             // The player's specific witness event is automatically registered
             window.IntelManager.grantOwnership(intelId, 'player_node');
        } else {
             window.IntelManager.grantOwnership(intelId, w.id);
        }

        });


        // 6. Legend/Folklore Hook (Phase 3)
        if (event.historicalWeight > 100 || event.significance > 80) {
            this.evolveNarrative(event);
        }
    },

    checkLegendThreshold: function(nodeId, weight) {
        const ent = window.GameCore?.activeEntities.find(e => e.id === nodeId);
        if (!ent) return;

        const legend = {
            id: 'leg_' + Math.random().toString(36).substr(2, 9),
            actorId: nodeId,
            name: ent.name,
            power: weight,
            type: 'INDIVIDUAL',
            title: this.generateLegendTitle({ actor: ent.name }),
            archetype: this.identifyArchetype(ent, weight)
        };

        window.GameState.legends ??= [];
        if (!window.GameState.legends.some(l => l.actorId === nodeId)) {
            window.GameState.legends.push(legend);
            window.EventBus.emit('UI_LOG', `🌟 [LEGEND] ${ent.name} has crossed the threshold of memory. A new legend is born.`);
            window.EventBus.emit('LEGEND_CREATED', legend);
        }
    },

        /**
     * Unified Significance Calculation (§1, §BN)
     * Consolidates storyDensity, historicalWeight, and Event modifiers.
     */
    calculateSignificance: function(nodeId) {
        // 1. Historical Weight (Chronicle)
        const weight = this.npcHistoricalWeights.get(nodeId) || 0;
        
        // 2. Story Density (Runes §BN)
        const storyDensity = window.RuneSystem?.getCarvings(nodeId)?.storyDensity || 0;
        
        // 3. Mystery Impact (Investigation)
        let mysteryBonus = 0;
        if (window.InvestigationManager) {
            const solved = window.InvestigationManager.getMysteries().filter(m => 
                m.state === 'RESOLVED' && (m.relatedPeople?.includes(nodeId) || nodeId === 'player')
            );
            mysteryBonus = solved.length * 50;
        }

        // 4. Consolidation
        const score = (weight * 0.5) + (storyDensity * 1000) + mysteryBonus;
        
        // Legend Multiplier
        const isLegend = window.GameState.legends?.some(l => l.actorId === nodeId);
        return isLegend ? score * 1.5 : score;
    },

        // Bible §22: Based on Drives and Force influence
        const profile = window.PersonhoodManager?.getProfile(ent.id);
        if (!profile) return 'UNSPECIAL';

        const { aggression, loyalty, investigation } = profile.traits;

        if (investigation > 0.7) return 'SCHOLAR';
        if (aggression > 0.7) return 'MONSTER';
        if (loyalty > 0.7) return 'FOUNDER';
        return 'HERO';
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
            legendCount: window.GameState?.legends?.length || 0,
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

            /**
     * Phase 3 & 4: Witness Layer & Intel Pipeline
     * Bible §13: Event -> Witness -> Intel
     * (DEPRECATED - Moved to recordEvent in Phase 1B)
     */
    _generateWitnessIntel_DEPRECATED: function(event) {

        if (!window.IntelManager) return;

        // 1. Identify Witnesses (Boilerplate: Entities near the event)
        // For now, we simulate witnesses as the actor's village and nearby nodes
        const witnesses = [...(event.witnesses || [])];
        
        if (event.actorId && !witnesses.includes(event.actorId)) {
            witnesses.push(event.actorId);
        }

        // 2. Generate Intel for each witness
        witnesses.forEach(witnessId => {
            const intelId = window.IntelManager.register({
                type: event.significance > 50 ? window.IntelEnums.TYPES.FACT : window.IntelEnums.TYPES.RUMOR,
                payload: {
                    title: event.type.toUpperCase().replace(/_/g, ' '),
                    description: event.detail,
                    timestamp_day: event.timestamp.day,
                    tags: ['CHRONICLE', event.type]
                },
                significance: {
                    historical: event.historicalWeight,
                    crow: event.significance
                },
                certainty: 0.7, // Initial witness certainty
                source_credibility: 0.8
            });

            window.IntelManager.grantOwnership(intelId, witnessId);
        });

        // 3. Folklore Hook (Phase 5)
        if (event.historicalWeight > 100 || event.significance > 80) {
            this.evolveNarrative(event);
        }
    },

    // --- PHASE 4: NARRATIVE EVOLUTION ---
    evolveNarrative: function(triggerEvent) {
        // Find events with high historical weight that haven't become legends yet
        const candidates = triggerEvent ? [triggerEvent] : this.worldLedger.filter(e => e.historicalWeight > 100 && !e.legendId);
        
        candidates.forEach(event => {
            if (event.legendId) return;

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
            if (window.FolkloreEngine) {
                window.FolkloreEngine.generatePoem(legend);
            }
            
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

        // --- PHASE 8: PROCEDURAL FOLKLORE --- (Redundant - moved to FolkloreEngine)
    generatePoem: function(legend) {
        if (window.FolkloreEngine) {
            window.FolkloreEngine.generatePoem(legend);
        }
    }
};


window.ChronicleManager.init();
