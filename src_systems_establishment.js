/**
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

    // --- INFORMATION NEXUS ---
    // Spawns rumor NPCs inside the establishment based on world events
    refreshRumors: function() {
        if (!this.active) return;
        // Pull events from WarManager, VillageManager, and AdventurerManager
    }
};
