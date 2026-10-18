/**
 * File: src_systems_playback.js
 * Phase 12: Historical Playback & 5D Perspective
 * 
 * Implements Bible §12 (Meaning Networks) and §27 (Living Atlas).
 * Allows the Crow's Eye to scrub through time and visualize connections.
 */

class PlaybackSystem {
    constructor() {
        this.currentPlaybackDay = null;
        this.isPlaybackActive = false;
        
        // --- PHASE: THE LOOM OF PROPHECY (§24, §25) ---
        this.predictionWindowDays = 5;
        this.futureForecasts = []; // Array of { type, actorId, detail, day, probability }

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.updateLoom());
    }

    /**
     * Predictive Simulation (The Loom)
     * Bible §24: "Predicts probable deaths, famines, and spawns."
     */
    updateLoom() {
        if (!window.VillageManager || !window.InstabilityEngine) return;
        
        this.futureForecasts = [];
        const currentDay = window.EngineParams?.worldDay || 0;

        // 1. Probable Famines
        window.VillageManager.villages.forEach(v => {
            if (v.stats.food < (v.population.current * 0.1)) {
                this.futureForecasts.push({
                    type: 'FAMINE_PREDICTION',
                    actorId: v.id,
                    detail: `Probable famine at ${v.name} in 3 days.`,
                    day: currentDay + 3,
                    probability: 0.85
                });
            }
        });

        // 2. Probable Civil Unrest (Pressure Analysis)
        const crises = window.InstabilityEngine.getCrises();
        crises.forEach(c => {
            if (c.intensity > 0.8) {
                this.futureForecasts.push({
                    type: 'REVOLT_PREDICTION',
                    actorId: c.houseId,
                    detail: `Probable revolt in ${c.houseId} territories.`,
                    day: currentDay + 2,
                    probability: 0.9
                });
            }
        });

        // 3. Probable Harvest (Significance Analysis)
        if (window.HarvestEngine) {
            const candidates = window.HarvestEngine.getCandidates();
            candidates.slice(0, 3).forEach(([id, data]) => {
                if (data.pressureScore > 850) {
                    this.futureForecasts.push({
                        type: 'WENDIGO_SPAWN_PREDICTION',
                        actorId: id,
                        detail: `Probable Wendigo manifestation targeting high-significance node: ${id}`,
                        day: currentDay + 1,
                        probability: 0.95
                    });
                }
            });
        }
    }


    init() {
        window.EventBus.emit('UI_LOG', '[Playback] Time-Scrubbing Channels Synchronized');
    }

        /**
         * Sets the simulation's visual state to a previous day.
         * Bible §27: "Supports Historical Playback."
         */
        setPlaybackDay(day) {
            if (!window.ChronicleManager) return;
        
            const snapshot = window.ChronicleManager.snapshots.get(day);
            if (snapshot) {
                this.currentPlaybackDay = day;
                this.isPlaybackActive = true;
                const ghostCount = this.updateGhostMeshes(snapshot);
            
                // Drift calculation for logging
                const present = window.ChronicleManager.snapshots.get(Array.from(window.ChronicleManager.snapshots.keys()).sort((a,b)=>a-b).pop());
                let avgDrift = 0;
                if (present) {
                    const drifts = snapshot.villages.map(v => {
                        const pv = present.villages.find(p => p.id === v.id);
                        return pv ? Math.hypot(pv.x - v.x, pv.z - v.z) : 0;
                    });
                    avgDrift = drifts.reduce((a,b)=>a+b, 0) / (drifts.length || 1);
                }

                window.EventBus.emit('PLAYBACK_STATE_CHANGED', snapshot);
                window.EventBus.emit('UI_LOG', `[PLAYBACK] Temporal Scrub → DAY ${day} | Ghost Meshes: ${ghostCount} | Drift: ${avgDrift.toFixed(1)}m`);
            } else {
                this.isPlaybackActive = false;
                this.currentPlaybackDay = null;
                this.clearGhostMeshes();
            }
        }

        /**
         * Resets the Atlas to the objective present.
         */
        resetToPresent() {
            this.isPlaybackActive = false;
            this.currentPlaybackDay = null;
            this.clearGhostMeshes();
            window.EventBus.emit('PLAYBACK_STATE_CHANGED', null);
            window.EventBus.emit('UI_LOG', `[PLAYBACK] Temporal Scrub → PRESENT | Ghost Meshes: 0 | Drift: 0m`);
        }

        updateGhostMeshes(snapshot) {
            this.clearGhostMeshes();
            if (!window.GameCore?.scene) return 0;

            let count = 0;
            snapshot.villages.forEach(v => {
                const geometry = new window.THREE.BoxGeometry(5, 10, 5);
                const material = new window.THREE.MeshBasicMaterial({ 
                    color: 0xfbbf24, 
                    transparent: true, 
                    opacity: 0.3,
                    wireframe: true 
                });
                const ghost = new window.THREE.Mesh(geometry, material);
                ghost.position.set(v.x, 5, v.z);
                ghost.name = `ghost_village_${v.id}`;
            
                this.ghostGroup = this.ghostGroup || new window.THREE.Group();
                this.ghostGroup.add(ghost);
                count++;
            });

            if (this.ghostGroup && !this.ghostGroup.parent) {
                window.GameCore.scene.add(this.ghostGroup);
            }
            return count;
        }


    clearGhostMeshes() {
        if (this.ghostGroup && window.GameCore?.scene) {
            window.GameCore.scene.remove(this.ghostGroup);
            this.ghostGroup.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.ghostGroup.clear();
        }
    }


        /**
     * Visualizes the "Meaning Network" (Bible §12).
     * Connects unrelated facts into a causal chain.
     */
    getNetworkNodes() {
        if (!window.InvestigationManager) return { nodes: [], links: [] };

        const mysteries = window.InvestigationManager.getMysteries();
        const nodes = [];
        const links = [];

        mysteries.forEach(m => {
            nodes.push({ id: m.id, type: 'MYSTERY', label: m.title });
            
            // Connect Evidence
            m.linkedEvidence.forEach(intelId => {
                const intel = window.IntelManager?.lookup(intelId);
                if (intel) {
                    nodes.push({ id: intelId, type: 'EVIDENCE', label: intel.payload.title });
                    links.push({ source: m.id, target: intelId, type: 'SUPPORT' });
                }
            });

            // Connect Contradictions
            m.contradictions.forEach(c => {
                links.push({ source: c.ids[0], target: c.ids[1], type: 'CONTRADICTION' });
            });
        });

        if (nodes.length !== (this.lastNodeCount || 0)) {
            window.EventBus.emit('UI_LOG', `[MEANING] Causal Link Update → ${nodes.length} nodes active`);
            this.lastNodeCount = nodes.length;
        }

        return { nodes, links };
    }

}

window.PlaybackManager = new PlaybackSystem();
export default window.PlaybackManager;
