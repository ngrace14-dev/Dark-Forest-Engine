/**
 * DARK FOREST ENGINE - HISTORICAL MEMORY COMPRESSION
 * Grand Historical Office (GHO)
 * 
 * Manages the multi-layered compression of world history to ensure 1000-year survivability.
 */

class HistoricalCompressionSystem {
    constructor() {
        this.layers = {
            LEVEL_1: 'RAW_EVENTS',       // The worldLedger (Temporary, high detail)
            LEVEL_2: 'CHRONICLES',       // Grouped events (Medium-term persistence)
            LEVEL_3: 'OFFICIAL_HISTORY', // Verified/Biased narratives (Long-term persistence)
            LEVEL_4: 'INSTITUTIONAL',    // DNA-anchored memory (Permanent for Houses)
            LEVEL_5: 'FOLKLORE'          // Poem/Myth-anchored memory (Permanent/Global)
        };

        this.retentionPolicies = {
            [this.layers.LEVEL_1]: 14, // 14 days (1 Shift)
            [this.layers.LEVEL_2]: 100, // 100 days (1 Century)
            [this.layers.LEVEL_3]: 500, // 500 days
            [this.layers.LEVEL_4]: Infinity,
            [this.layers.LEVEL_5]: Infinity
        };

        this.thresholds = {
            CHRONICLE: 50,      // Significance to reach Level 2
            OFFICIAL: 150,      // Significance to reach Level 3
            INSTITUTIONAL: 500, // Significance to reach Level 4
            MYTHIC: 1500        // Significance to reach Level 5
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_COMPLETE', () => this.processCompressionCycle());
    }

    init() {
        window.EventBus.emit('UI_LOG', '📚 [GHO] Historical Memory Compression Active');
    }

    /**
     * Primary Compression Loop: Promotes and Prunes the Ledger.
     */
    processCompressionCycle() {
        if (!window.ChronicleManager) return;

        const ledger = window.ChronicleManager.worldLedger;
        const day = window.EngineParams.worldDay;

        // 1. IMPORTANCE SCORING & PROMOTION
        ledger.forEach(event => {
            const score = event.significance + (event.historicalWeight || 0);
            
            // LEVEL 5: FOLKLORE (Legend Generation)
            if (score >= this.thresholds.MYTHIC && !event.isFolklore) {
                this._promoteToFolklore(event);
            }
            // LEVEL 4: INSTITUTIONAL (DNA Anchoring)
            else if (score >= this.thresholds.INSTITUTIONAL && !event.isInstitutional) {
                this._promoteToInstitutional(event);
            }
            // LEVEL 3: OFFICIAL NARRATIVE (History Office)
            else if (score >= this.thresholds.OFFICIAL && !event.isOfficial) {
                this._promoteToOfficial(event);
            }
            // LEVEL 2: CHRONICLE
            else if (score >= this.thresholds.CHRONICLE && !event.isChronicle) {
                event.isChronicle = true;
            }
        });

        // 2. PRUNING (The Great Forgetting)
        this._pruneLedger(day);
    }

    _promoteToOfficial(event) {
        if (window.HistoryOffice) {
            // Find a historian and publish
            const historians = window.HistoryOffice.getAvailableHistorians();
            if (historians.length > 0) {
                // Find a truth fact for this event
                const facts = Array.from(window.IntelManager?.registry.values() || [])
                    .filter(i => i.payload.sourceEventId === event.id);
                
                if (facts.length > 0) {
                    window.HistoryOffice.publishOfficialNarrative(event, facts[0], historians[0]);
                    event.isOfficial = true;
                }
            }
        }
    }

    _promoteToInstitutional(event) {
        if (window.DynastyManager && event.actorId) {
            const houseId = event.actorId.startsWith('house_') ? event.actorId : 
                           (window.PersonhoodManager?.getProfile(event.actorId)?.houseId || null);
            
            if (houseId) {
                window.DynastyManager.recordHouseEvent(houseId, event);
                
                // Also anchor to GCO DNA
                const house = window.DynastyManager.houses.get(houseId);
                if (house && house.dna) {
                    house.dna.historicalMemory.push({ eventId: event.id, day: event.timestamp.day, weight: event.significance });
                }
                event.isInstitutional = true;
            }
        }
    }

    _promoteToFolklore(event) {
        if (window.FolkloreEngine) {
            // Legends are Level 5
            window.ChronicleManager.evolveNarrative(event);
            event.isFolklore = true;
            
            // --- PHASE 3-1: PHYSICAL ANCHORING ---
            // High-significance events attempt to crystallize into physical monuments
            this.crystallizePhysicalPillar(event);
        }
    }

    crystallizePhysicalPillar(event) {
        if (!window.GameCore?.instantiatePrefab) return;
        
        // Determine monument type based on event detail
        let prefab = 'Ancient Monument';
        if (event.type === 'WAR' || event.type === 'SCHISM') prefab = 'Rune Tower';
        if (event.type === 'BETRAYAL') prefab = 'Cursed Altar';
        
        const loc = event.location || { x: (Math.random()-0.5)*500, z: (Math.random()-0.5)*500 };
        const surfaceY = window.WorldGenerator?.getTerrainHeight?.(loc.x, loc.z) || 0;
        
        const pillar = window.GameCore.instantiatePrefab(prefab, loc.x, surfaceY, loc.z, 'persistent');
        if (pillar) {
            pillar.is_static_node = true;
            pillar.is_anchored = true;
            pillar.lore_id = event.id;
            pillar.description = `The Pillar of ${event.type}: ${event.detail}`;
            
            window.EventBus.emit('UI_LOG', `🗿 [GHO] A truth has physically crystallized at ${loc.x.toFixed(0)}, ${loc.z.toFixed(0)}.`);
        }
    }

    _pruneLedger(currentDay) {
        const oldSize = window.ChronicleManager.worldLedger.length;
        
        window.ChronicleManager.worldLedger = window.ChronicleManager.worldLedger.filter(event => {
            const age = currentDay - event.timestamp.day;
            
            // KEEPS:
            if (event.isFolklore || event.isInstitutional || event.isLegendary) return true;
            
            // PRUNE LEVEL 3 (Official) after 500 days
            if (event.isOfficial && age > this.retentionPolicies[this.layers.LEVEL_3]) return false;
            
            // PRUNE LEVEL 2 (Chronicle) after 100 days
            if (event.isChronicle && age > this.retentionPolicies[this.layers.LEVEL_2]) return false;
            
            // PRUNE LEVEL 1 (Raw) after 14 days
            if (age > this.retentionPolicies[this.layers.LEVEL_1]) return false;

            return true;
        });

        const newSize = window.ChronicleManager.worldLedger.length;
        if (oldSize > newSize) {
            window.EventBus.emit('UI_LOG_DEBUG', `[GHO] Memory Compression complete. ${oldSize - newSize} events converted to higher-order structures or purged.`);
        }
    }
}

window.GHO = new HistoricalCompressionSystem();
export default window.GHO;
