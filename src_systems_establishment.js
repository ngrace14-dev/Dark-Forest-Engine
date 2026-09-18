/**
 * 
 * File: src_systems_establishment.js
 * Boilerplate for the Arcane Door Network and the Player's interdimensional property.
 */
window.EstablishmentManager = {
    active: false,
    currentEntryPoint: null, // Stores {x, z, villageId} where player entered
    unlockedDoors: [], // List of village IDs that have an active Arcane Door link
    propertyLevel: 1,
    
    // --- ARCANE DOOR LOGIC ---
    // Rule: Doors do not teleport between cities. You leave where you entered.
    
    enterEstablishment: function(villageId, x, z) {
        if (this.active) return;
        
        // 1. Record Physical World return point (Absolute)
        const localPos = new THREE.Vector3(x, 0, z);
        const absPos = window.GameCore.getAbsolutePos(localPos);
        this.currentEntryPoint = { x: absPos.x, y: 0, z: absPos.z, villageId };
        
        this.active = true;
        window.EventBus.emit('UI_LOG', `[ARCANE] Reality folds. You step into your pocket dimension.`);
        
        // 2. Trigger Scene Swap in Engine
        window.EventBus.emit('SCENE_SWAP', { target: 'establishment' });
    },
    
    exitEstablishment: function() {
        if (!this.active || !this.currentEntryPoint) return;
        
        this.active = false;
        const entry = this.currentEntryPoint;
        
        // 3. Convert Absolute Entry Point back to Local space (in case origin shifted while inside)
        const localPos = window.GameCore.getLocalPos(new THREE.Vector3(entry.x, 0, entry.z));
        
        window.EventBus.emit('UI_LOG', `[ARCANE] You return to ${window.VillageManager.villages[entry.villageId]?.name || 'the forest'}.`);
        window.EventBus.emit('SCENE_SWAP', { target: 'world', pos: localPos });
    },
    
    unlockDoor: function(villageId) {
        if (this.unlockedDoors.includes(villageId)) return;
        // Requirement logic (Relations, Resources, Magic)
        this.unlockedDoors.push(villageId);
        window.EventBus.emit('UI_LOG', `[ARCANE] A new door link has been established in a distant village.`);
    },

    // --- PHASE 3: INFORMATION NEXUS ---
    rumors: [],
    
    refreshRumors: function() {
        this.rumors = [];
        const villages = window.VillageManager.villages;
        
        // 1. Economic Rumors (Shortages)
        villages.forEach(v => {
            if (v.stats.food < v.population.current * 3) {
                this.rumors.push({
                    id: `econ-${v.id}`,
                    type: 'economic',
                    title: `Starvation in ${v.name}`,
                    text: `${v.name} is running out of food. Prices are skyrocketing.`,
                    originVillageId: v.id,
                    value: 50
                });
            }
        });

        // 2. Political Rumors (Wars/Tensions)
        if (window.WarManager && window.WarManager.crisis.active) {
            this.rumors.push({
                id: 'crisis-active',
                type: 'political',
                title: 'Global Crisis Detected',
                text: `Whispers of a ${window.WarManager.crisis.type} are spreading throughout the forest.`,
                value: 200
            });
        }

        // 3. Military Rumors (Raids)
        villages.forEach(v => {
            const raid = v.expeditions?.find(e => e.status === 'raiding');
            if (raid) {
                this.rumors.push({
                    id: `raid-${v.id}`,
                    type: 'military',
                    title: `Raid on ${v.name}`,
                    text: `A ${raid.type} is descending upon ${v.name}!`,
                    originVillageId: v.id,
                    value: 75
                });
            }
        });

        window.EventBus.emit('RUMORS_UPDATED', this.rumors);
    },

    // --- PHASE 3: THE GLOBAL MAP UI ---
    // This provides a high-level overview of the 128k sq mile world 
    // accessible only from within the Establishment
    getGlobalIntel: function() {
        return {
            unlockedVillages: this.unlockedDoors.length,
            totalPopulation: window.VillageManager.villages.reduce((sum, v) => sum + v.population.current, 0),
            activeWars: window.VillageManager.villages.filter(v => v.tensions > 70).length,
            nextShiftDay: Math.ceil(window.EngineParams.worldDay / 14) * 14
        };
    }
};

// Auto-refresh rumors when entering
window.EventBus.on('SCENE_SWAP', ({ target }) => {
    if (target === 'establishment') {
        window.EstablishmentManager.refreshRumors();
    }
});
