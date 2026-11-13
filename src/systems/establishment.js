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
        
        // --- PHASE 4: ARCANE PROPRIETOR XP ---
        // Award XP for opening the interdimensional gates
        window.CareerManager.addXP('arcane_proprietor', 50);
        
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
        
        // --- PHASE 3: INFO BROKER XP ---
        // Award XP for updating your network's knowledge
        window.CareerManager.addXP('info_broker', 20);
        
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

    // --- PHASE 4: SOCIAL HUB SIMULATION ---
    populateHub: function() {
        if (!this.active || !window.GameCore.pocketScene) return;

        // Clear existing NPCs in the hub first
        this.clearHubNPCs();

        // Spawn a representative for each village with an unlocked door
        this.unlockedDoors.forEach((villageId, index) => {
            const village = window.VillageManager.villages[villageId];
            if (!village) return;

            // Spacing them around the tavern walls
            const angle = (index / Math.max(1, this.unlockedDoors.length)) * Math.PI * 2;
            const x = Math.cos(angle) * 8;
            const z = Math.sin(angle) * 8;

            // Determine which type of NPC to spawn based on village industry
            let prefab = 'Adventurer';
            if (village.capital) prefab = 'Noble NPC';
            else if (village.industry.mountainGatekeeper) prefab = 'City Guard';
            else if (village.industry.produces === 'wood') prefab = 'Village Scout';
            
            // Physical instantiation in the pocket dimension
            this.spawnHubNPC(prefab, x, z, village);
        });
    },

    spawnHubNPC: function(prefabName, x, z, village) {
        const def = window.AssetManager.prefabs[prefabName];
        if (!def) return;

        // Note: Hub NPCs are non-physics visual representations
        const group = new THREE.Group();
        const visual = window.GameCore.getVisualMesh(def);
        group.add(visual);
        group.position.set(x, 0.5, z);
        
        // Face the center of the room
        group.lookAt(0, 0.5, 0);

        // Metadata for interaction
        group.userData = {
            isHubNPC: true,
            villageId: village.id,
            villageName: village.name,
            rank: 'Representative'
        };

        window.GameCore.pocketScene.add(group);
        
        // Add a small spotlight on the representative
        const spot = new THREE.SpotLight(0xffffff, 2, 10, Math.PI/4);
        spot.position.set(x, 5, z);
        spot.target = group;
        window.GameCore.pocketScene.add(spot);
    },

    clearHubNPCs: function() {
        if (!window.GameCore.pocketScene) return;
        const toRemove = [];
        window.GameCore.pocketScene.traverse(child => {
            if (child.userData && child.userData.isHubNPC) toRemove.push(child);
            if (child.isSpotLight) toRemove.push(child);
        });
        toRemove.forEach(obj => window.GameCore.pocketScene.remove(obj));
    }
};

// Update: Hub population triggers on entry
window.EventBus.on('SCENE_SWAP', ({ target }) => {
    if (target === 'establishment') {
        window.EstablishmentManager.refreshRumors();
        window.EstablishmentManager.populateHub();
    }
});
