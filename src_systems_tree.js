/**
 * File: src_systems_tree.js
 * Phase 13: Continuity Manifestation & World Tree Doctrine
 * 
 * Implements the "World Tree" as a Primordial Force.
 * Manages Continuity Chains (Lineage, Knowledge, Archive) and Root Nodes.
 * Manifests Continuity as physical world consequences.
 */

class WorldTreeSystem {
    constructor() {
        this.rootNodes = new Map(); // nodeId -> { type, health, chains: [] }
        this.activeChains = new Map(); // chainId -> { type, nodes: [], depth, status }
        this.continuityRating = 500; // 0-1000
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.handleContinuityLoss(data));
        window.EventBus.on('POEM_COMPOSED', (poem) => this.handleCulturalPreservation(poem));
    }

    init() {
        this.scanForRoots();
        window.EventBus.emit('UI_LOG', '[TREE] Primordial Force Continuity Engaged');
        
        // Heartbeat for Continuity Manifestation
        window.EventBus.on('HEARTBEAT_T3', () => this.updateContinuity());
    }

    /**
     * Manifestation Rule: The world demonstrates.
     * Scans existing systems for Root Nodes (Villages, Archives, Houses).
     */
    scanForRoots() {
        if (!window.VillageManager || !window.DynastyManager) return;

        // 1. Villages as Root Nodes
        window.VillageManager.villages.forEach(v => {
            this.registerRoot(`village_${v.id}`, 'VILLAGE');
        });

        // 2. Institutions/Houses as Root Nodes
        window.DynastyManager.houses.forEach(h => {
            this.registerRoot(h.id, 'INSTITUTION');
        });
    }

    registerRoot(id, type) {
        if (this.rootNodes.has(id)) return;
        this.rootNodes.set(id, {
            id,
            type,
            health: 1.0,
            knowledgeDensity: 0,
            lastMaintenanceDay: window.EngineParams?.worldDay || 0
        });
    }

    /**
     * Tracks the "Chains" of existence.
     * Lineage: Bloodline depth.
     * Knowledge: Apprenticeship success.
     * Archive: Long-term data survival.
     */
    updateContinuity() {
        this.refreshChains();
        this.calculateContinuityRating();
        this.manifestContinuitySigns();
    }

    refreshChains() {
        this.activeChains.clear();

        // 1. Lineage Chains (Dynasty)
        if (window.DynastyManager) {
            window.DynastyManager.houses.forEach(h => {
                const chainId = `lineage_${h.id}`;
                this.activeChains.set(chainId, {
                    id: chainId,
                    type: 'LINEAGE',
                    depth: h.lineage.length + 1,
                    status: h.currentLeader ? 'INTACT' : 'BROKEN'
                });
            });
        }

        // 2. Knowledge Chains (Apprenticeships)
        if (window.PersonhoodManager) {
            window.PersonhoodManager.profiles.forEach(p => {
                if (p.apprentices && p.apprentices.length > 0) {
                    const chainId = `knowledge_${p.id}`;
                    this.activeChains.set(chainId, {
                        id: chainId,
                        type: 'KNOWLEDGE',
                        depth: p.apprentices.length,
                        status: 'INTACT'
                    });
                }
            });
        }
    }

    calculateContinuityRating() {
        let totalDepth = 0;
        let brokenChains = 0;

        this.activeChains.forEach(c => {
            totalDepth += c.depth;
            if (c.status === 'BROKEN') brokenChains++;
        });

        const base = 500;
        const depthBonus = totalDepth * 5;
        const brokenPenalty = brokenChains * 50;
        
        this.continuityRating = Math.max(0, Math.min(1000, base + depthBonus - brokenPenalty));
    }

    /**
     * Manifestation Rule: The player experiences consequences.
     * Physically displays continuity state in the 3D world.
     */
    manifestContinuitySigns() {
        if (!window.VillageManager) return;

        window.VillageManager.villages.forEach(v => {
            const root = this.rootNodes.get(`village_${v.id}`);
            if (!root) return;

            // Health is tied to barrier integrity and prosperity
            root.health = (v.barrierIntegrity / 100) * (v.stats.prosperity / 100);

            // Manifest Root Strength (Physical Presence)
            if (root.health > 0.8 && Math.random() < 0.01) {
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                    text: "🌿 [ROOT] Continuity is strong here.", 
                    pos: { x: v.x, y: 15, z: v.z }, 
                    color: '#10b981' 
                });
            }

            // Manifest Root Decay (Crisis Warning)
            if (root.health < 0.3 && Math.random() < 0.03) {
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                    text: "🍂 [WITHER] The roots are fraying...", 
                    pos: { x: v.x, y: 15, z: v.z }, 
                    color: '#d97706' 
                });
            }
        });
    }

    /**
     * Handles the "Death of Continuity".
     * Triggers TREE_ALERT events.
     */
    handleContinuityLoss(entity) {
        // 1. Check for Lineage Break
        if (entity.houseId && window.DynastyManager) {
            const house = window.DynastyManager.getHouse(entity.houseId);
            if (house && house.currentLeader === entity.id) {
                // If no heir exists in profiles (simplified check)
                const heirs = Array.from(window.PersonhoodManager.profiles.values())
                    .filter(p => p.houseId === house.id && p.id !== entity.id);
                
                if (heirs.length === 0) {
                    this.triggerTreeAlert('DYNASTIC_EXTINCTION', house.name, entity.visual?.position);
                }
            }
        }

        // 2. Check for Knowledge Break (Last Apprentice)
        const profile = window.PersonhoodManager?.getProfile(entity.id);
        if (profile && profile.apprentices && profile.apprentices.length > 0) {
            const deadApprentices = profile.apprentices.filter(id => {
                const p = window.PersonhoodManager.getProfile(id);
                return p && p.isDead;
            });
            
            if (deadApprentices.length === profile.apprentices.length) {
                this.triggerTreeAlert('LAST_APPRENTICE_DEAD', profile.id, entity.visual?.position);
            }
        }
    }

    handleCulturalPreservation(poem) {
        if (poem.purpose === 'MEMORIALIZATION') {
            this.continuityRating = Math.min(1000, this.continuityRating + 10);
            window.EventBus.emit('UI_LOG_DEBUG', `[TREE] Continuity reinforced by poem: ${poem.title}`);
        }
    }

    triggerTreeAlert(type, subject, pos) {
        const detail = `[TREE_ALERT] ${type.replace(/_/g, ' ')}: ${subject}`;
        
        window.EventBus.emit('UI_LOG', detail);
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
            text: `⚠️ ${detail}`, 
            pos: pos || { x: 0, y: 20, z: 0 }, 
            color: '#ef4444' 
        });

        // Tree vs Wendigo Balance
        if (window.ForceManager) {
            const tree = window.ForceManager.forces['Tree'];
            const wendigo = window.ForceManager.forces['Wendigo'];
            
            tree.strength = Math.max(0, tree.strength - 50);
            wendigo.strength = Math.min(1000, wendigo.strength + 50);
        }

        window.ChronicleManager?.recordEvent({
            type: 'CONTINUITY_CRISIS',
            detail: detail,
            significance: 150,
            historicalWeight: 100,
            location: pos
        });
    }
}

window.WorldTree = new WorldTreeSystem();
export default window.WorldTree;
