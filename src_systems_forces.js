/**
 * File: src_systems_forces.js
 * Phase 5: Force Ecology
 * Manages the global strengths and influence of the fundamental forces of Dark Forest.
 */

window.ForceManager = {
    forces: {
        'Forest': { 
            strength: 500, 
            label: 'Growth & Corruption', 
            description: 'The primal power of the woods.',
            metric: 'Corrupted Chunks',
            value: 0 
        },
        'Crow': { 
            strength: 100, 
            label: 'Story Density', 
            description: 'The narrative weight of the world.',
            metric: 'Legend Count',
            value: 0
        },
        'Tree': { 
            strength: 300, 
            label: 'The Great Pulse', 
            description: 'The life-force of the deep redwoods.',
            metric: 'Vitality',
            value: 300
        },
        'Huntsman': { 
            strength: 400, 
            label: 'The Balance', 
            description: 'The mediator between man and beast.',
            metric: 'Scorn Level',
            value: 0
        },
        'Crown': { 
            strength: 600, 
            label: 'Stability', 
            description: 'The authority of the Royal Family.',
            metric: 'Territory Control',
            value: 0
        },
        'Houses': { 
            strength: 450, 
            label: 'Influence', 
            description: 'Political power of the noble families.',
            metric: 'Trade Volume',
            value: 0
        },
        'Wendigo': { 
            strength: 200, 
            label: 'The Hunger', 
            description: 'The cold terror of the mountain peaks.',
            metric: 'Feral Activity',
            value: 0
        },
        'Truth': { 
            strength: 500, 
            label: 'Global Fidelity', 
            description: 'The clarity of information in the world.',
            metric: 'Verified Facts',
            value: 0
        }
    },

    update: function(delta) {
        // Recalculate strengths based on world state
        this.recalculateCrow();
        this.recalculateTruth();
        this.recalculateCrown();
        this.recalculateForest();
        this.recalculateHouses();
        this.recalculateWendigo();
    },

    recalculateCrow: function() {
        const force = this.forces['Crow'];
        const legends = window.GameState?.legends?.length || 0;
        const totalHistoricalWeight = (window.ChronicleManager?.worldLedger || []).reduce((acc, e) => acc + (e.historicalWeight || 0), 0);
        
        force.value = legends;
        force.strength = Math.min(1000, 100 + (legends * 50) + (totalHistoricalWeight / 10));
    },

    recalculateTruth: function() {
        const force = this.forces['Truth'];
        if (!window.IntelManager) return;
        
        const facts = Array.from(window.IntelManager.registry.values()).filter(i => i.type === window.IntelEnums.TYPES.FACT).length;
        const total = window.IntelManager.registry.size || 1;
        
        force.value = facts;
        force.strength = Math.floor((facts / total) * 1000);
    },

    recalculateCrown: function() {
        const force = this.forces['Crown'];
        if (!window.VillageManager) return;
        
        const controlled = window.VillageManager.villages.filter(v => v.territory.faction === 'kingdom').length;
        const total = window.VillageManager.villages.length || 1;
        
        force.value = controlled;
        force.strength = Math.floor((controlled / total) * 1000);
    },

    recalculateForest: function() {
        const force = this.forces['Forest'];
        if (!window.VillageManager) return;
        
        const occupied = window.VillageManager.villages.filter(v => v.territory.faction === 'forest').length;
        force.value = occupied;
        force.strength = 300 + (occupied * 100);
    },

    recalculateHouses: function() {
        const force = this.forces['Houses'];
        if (!window.VillageManager) return;
        
        const prosperity = window.VillageManager.villages.reduce((acc, v) => acc + (v.stats.prosperity || 0), 0);
        force.value = Math.floor(prosperity / 10);
        force.strength = Math.min(1000, 200 + (prosperity / 2));
    },

    recalculateWendigo: function() {
        const force = this.forces['Wendigo'];
        // Strength grows with fear (low prosperity) and deaths
        const events = window.ChronicleManager?.worldLedger || [];
        const deaths = events.filter(e => e.type === 'DEFEAT' || e.type === 'die').length;
        
        force.value = deaths;
        force.strength = Math.min(1000, 100 + (deaths * 20));
    },

    getForceStrength: function(name) {
        return this.forces[name]?.strength || 0;
    }
};

window.ForceManager.update(0);
