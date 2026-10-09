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
            window.EventBus.emit('PLAYBACK_STATE_CHANGED', snapshot);
        } else {
            this.isPlaybackActive = false;
            this.currentPlaybackDay = null;
        }
    }

    /**
     * Resets the Atlas to the objective present.
     */
    resetToPresent() {
        this.isPlaybackActive = false;
        this.currentPlaybackDay = null;
        window.EventBus.emit('PLAYBACK_STATE_CHANGED', null);
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
