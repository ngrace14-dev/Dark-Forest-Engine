/**
 * File: src_systems_entropy.js
 * BUREAU OF NARRATIVE THERMODYNAMICS (BNT)
 * 
 * Tracks the "Ω (Omega)" value: The Information Heat Death of the World.
 * When significance is too saturated, reality refacts.
 */

window.NarrativeThermodynamics = {
    omega: 0.0,
    heatDeathThreshold: 50000, // Adjusted for early game responsiveness
    
    init: function() {
        window.EventBus.on('HEARTBEAT_T1', () => this.update());
        window.EventBus.on('HEAT_DEATH_CRITICAL', () => this.handleCriticalOmega());
        window.EventBus.on('ENTITY_DEATH', (data) => this.handleInformationDestruction(data));
        window.EventBus.emit('UI_LOG', '📉 [BNT] Narrative Thermodynamics Active. Monitoring Ω...');
    },

    update: function() {
        if (window.CataclysmManager?.active) {
            // During Cataclysm, Ω only moves via destruction/combat, not growth.
            return;
        }

        const globalSignificance = this.calculateGlobalSignificance();
        const prevOmega = this.omega;
        this.omega = Math.min(1.0, globalSignificance / this.heatDeathThreshold);
        
        // ... state transitions ...
    },

    /**
     * Combat as Information Destruction.
     * Killing shades "deletes" historical data from the world's memory.
     */
    handleInformationDestruction: function(data) {
        if (!window.CataclysmManager?.active) return;
        
        const victim = data.victim;
        if (victim?.isShade) {
            // Each shade death destroys a chunk of global significance
            const destructionAmount = victim.isMirror ? 0.005 : 0.001;
            this.omega = Math.max(0, this.omega - destructionAmount);

            if (this.omega <= 0.1 && !this.championSpawned) {
                this.championSpawned = true;
                window.EventBus.emit('CHAMPION_SPAWN_READY');
            }
            
            if (this.omega === 0) {
                window.EventBus.emit('HEAT_DEATH_REVERSED');
            }
        }
    },

    calculateGlobalSignificance: function() {
        if (!window.GameState || !window.DynastyManager || !window.GameCore) return 0;

        const legends = (window.GameState.legends || []).length * 1000;
        const pillars = window.GameCore.activeEntities?.filter(e => e.is_static_node).length * 500 || 0;
        
        const archives = Array.from(window.DynastyManager.houses.values()).reduce((acc, h) => {
            return acc + (h.archives?.length || 0) * 10;
        }, 0);

        const artifacts = 0; // Future hook: window.LootManager.getLegendaryCount() * 200

        return legends + pillars + archives + artifacts;
    },

    handleCriticalOmega: function() {
        window.EventBus.emit('UI_LOG', '🚨 [BNT] CRITICAL OMEGA REACHED. THE CHAMPION STIRS.');
        if (window.CataclysmManager) {
            window.CataclysmManager.triggerHeatDeath();
        }
    }
};

window.NarrativeThermodynamics.init();
export default window.NarrativeThermodynamics;
