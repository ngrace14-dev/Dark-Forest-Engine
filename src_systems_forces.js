/**
 * File: src_systems_forces.js
 * Phase 5: Force Ecology
 * Manages the global strengths and influence of the fundamental forces of Dark Forest.
 */

window.ForceManager = {
    forces: {
        'Forest': { 
            strength: 500, 
            label: 'Possibility', 
            description: 'Encourages unexpected outcomes and chaos.',
            metric: 'Corrupted Chunks',
            pressure: 'unexpected_outcomes',
            value: 0 
        },
        'Crow': { 
            strength: 100, 
            label: 'Significance', 
            description: 'Increases the historical weight and importance of events.',
            metric: 'Legend Count',
            pressure: 'significance',
            value: 0
        },
        'Tree': { 
            strength: 300, 
            label: 'Continuity', 
            description: 'Encourages survival, regrowth, and stable paths.',
            metric: 'Vitality',
            pressure: 'continuity',
            value: 300
        },
        'Huntsman': { 
            strength: 400, 
            label: 'Cultivation', 
            description: 'Encourages the development of greatness in individuals.',
            metric: 'Scorn Level',
            pressure: 'greatness',
            value: 0
        },
        'Crown': { 
            strength: 600, 
            label: 'Order', 
            description: 'Encourages stability, hierarchy, and political control.',
            metric: 'Territory Control',
            pressure: 'stability',
            value: 0
        },
        'Wendigo': { 
            strength: 200, 
            label: 'Consumption', 
            description: 'Encourages destruction, hunger, and loss of memory.',
            metric: 'Feral Activity',
            pressure: 'consumption',
            value: 0
        },
        'Truth': { 
            strength: 500, 
            label: 'Accuracy', 
            description: 'Encourages verification and factual clarity.',
            metric: 'Verified Facts',
            pressure: 'verification',
            value: 0
        },
                'Orb': {
            strength: 300,
            label: 'Witness',
            description: 'Encourages interpretation and observation.',
            metric: 'Observer Count',
            pressure: 'interpretation',
            value: 0
        },
        'Houses': { 
            strength: 400, 
            label: 'Prosperity', 
            description: 'Encourages economic growth and resource accumulation.',
            metric: 'Total Prosperity',
            pressure: 'prosperity',
            value: 0 
        }
    },


    /**
     * Calculates the "Force Signature" for a major event.
     * Bible §18: Every major event carries dominant, secondary, and opposing forces.
     */
    calculateSignature: function(event) {
        const type = event.type.toUpperCase();
        let dominant = 'Forest';
        let secondary = 'Orb';
        let opposing = 'Truth';

        if (type.includes('DEFEAT') || type.includes('DEATH')) {
            dominant = 'Wendigo';
            secondary = 'Forest';
            opposing = 'Tree';
        } else if (type.includes('VERIFIED') || type.includes('TRUTH')) {
            dominant = 'Truth';
            secondary = 'Crow';
            opposing = 'Wendigo';
        } else if (type.includes('SUCCESSION') || type.includes('OFFICIAL')) {
            dominant = 'Crown';
            secondary = 'Crow';
            opposing = 'Truth';
        } else if (type.includes('LEGEND')) {
            dominant = 'Crow';
            secondary = 'Orb';
            opposing = 'Wendigo';
        }

        return { dominant, secondary, opposing };
    },

    /**
     * Probability Drift: Forces influence the chance of outcomes.
     * Bible §18: "Probability shifts, not direct commands."
     */
    getDrift: function(forceName) {
        const force = this.forces[forceName];
        if (!force) return 1.0;
        // High strength = higher probability shift (0.5 to 1.5x)
        return 0.5 + (force.strength / 1000);
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
        if (!force || !window.VillageManager?.villages) return;
        
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
