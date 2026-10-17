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
        
        window.EventBus.on('ENGINE_READY', () => this.init());
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
            this.updateGhostMeshes(snapshot);
            window.EventBus.emit('PLAYBACK_STATE_CHANGED', snapshot);
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
        window.EventBus.emit('UI_LOG', '[Playback] Returned to the Objective Present.');
    }


    updateGhostMeshes(snapshot) {
        this.clearGhostMeshes();
        if (!window.GameCore?.scene) return;

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
        });

        if (this.ghostGroup && !this.ghostGroup.parent) {
            window.GameCore.scene.add(this.ghostGroup);
        }
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
        if (!window.InvestigationManager) return [];

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

        return { nodes, links };
    }
}

window.PlaybackManager = new PlaybackSystem();
export default window.PlaybackManager;
