import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { EpochManager } from './src_epoch_manager.js';

// Attach createNoise2D globally for src_engine.js and noise initializations
window.createNoise2D = createNoise2D;

window.WorldGenConfig = {
    noiseScale: 0.003,
    darkForestSideMeters: 575843.2,
    mountainRingWidthMeters: 160934.4,
    biomes: {
        'redwoods': { name: 'NorCal Redwoods', color: 0x1a2f21, prefab: 'Oak Tree', density: 12 },
        'alpine': { name: 'Shasta Alpine', color: 0x363a40, prefab: 'Razor Rock Monolith', density: 6 },
        'valley': { name: 'Central Valley', color: 0x453f2c, prefab: 'Bramble Bush', density: 10 },
        'coastal': { name: 'Lost Coast', color: 0x22303d, prefab: 'Moss-Covered Log', density: 8 },
        'sierra': { name: 'Sierra Nevada Wall', color: 0x4a4a4a, prefab: 'Razor Rock Monolith', density: 4 },
        'desert': { name: 'Deep Desert', color: 0xc2b280, prefab: 'Stone Path', density: 5 }
    }
};

window.EpochManagerInstance = new EpochManager();

window.WorldGenerator = class {
    static getNoise(x, z) { return window.EpochManagerInstance.getNoise(x, z); }
    static getBiome(x, z) { return window.EpochManagerInstance.getBiome(x, z); }
    static getTerrainHeight(x, z) {
        // Collect Shielded POIs (Capital at 0,0, Terminus, etc)
        const shieldedPOIs = [
            { x: 0, z: 0, y: 0, radius: 200 } // Example Capital at 0,0
        ];
        
        if (window.VillageManager) {
            for (const v of window.VillageManager.villages) {
                if (v.position && v.radius) {
                    // Estimate village Y based on natural height if it doesn't have a strict forced Y
                    const vY = v.position.y || window.EpochManagerInstance._calculateNaturalHeight(v.position.x, v.position.z);
                    shieldedPOIs.push({ x: v.position.x, z: v.position.z, y: vY, radius: v.radius });
                }
            }
        }
        
        return window.EpochManagerInstance.getTerrainHeight(x, z, shieldedPOIs);
    }
};

// ==========================================
// CORE SPAWN ROUTING & SAFETY FALLBACKS
// ==========================================
// The engine expects these functions to exist globally to start the simulation. 
// If they are missing from other files, these fallbacks will successfully boot the game.

window.spawnPlayer = function(x, y, z) {
    // Phase 10 integration: Try the new character pipeline first
    if (window.CoreCharacter && window.PlayerController && window.CameraRig && window.CharacterVisual && window.GameCore.world && window.GameCore.camera) {
        console.log("?? [World] Spawning Player via AAA Character Pipeline");
        
        const playerDef = window.AssetManager?.prefabs?.['Player'] || {};
        
        // 1. Create Core Character (Physics)
        const core = new window.CoreCharacter(window.GameCore.world, x, y, z, {
            radius: playerDef.radius || 0.4,
            halfHeight: (playerDef.height || 2) / 2
        });
        core.def = playerDef; // Link prefab def to core

        // 2. Create Visual Representation
        const visual = new window.CharacterVisual(core, window.GameCore.scene, playerDef);
        core.visual = visual.mesh; // Sync back for legacy lookups if needed
        
        // 3. Create Camera Rig
        const rig = new window.CameraRig(window.GameCore.camera, window.GameCore.world);
        rig.setTarget(core);
        
        // 4. Create Input Controller
        const controller = new window.PlayerController(core, rig);
        
        // 5. Register with Manager (if it exists)
        if (window.CharacterManager) {
            if (!window.GameCore.characterManager) window.GameCore.characterManager = new window.CharacterManager();
            window.GameCore.characterManager.registerPlayer(core);
            core.manager = window.GameCore.characterManager;
        }

        // 6. Global Hooks for Engine Update
        window.GameCore.playerObj = core;
        window.GameCore.playerController = controller;
        window.GameCore.cameraRig = rig;
        window.GameCore.playerVisual = visual;

        return core;
    }

    if (window.GameCore?.newPlayerPipeline) {

         console.log(`[World] Integration Test: New Player Pipeline active, skipping legacy spawnPlayer`);
         // We still need to trigger chunk manager and camera placement logic to boot up the environment
         // Teleport the new pipeline to the spawn point
         if (window.GameCore.newPlayerPipeline.body) {
             window.GameCore.newPlayerPipeline.body.setNextKinematicTranslation({x, y, z});
         }
         return;
    }

    if (!window.GameCore || !window.GameCore.instantiatePrefab) {
        console.warn("⚠️ GameCore not ready for player spawn.");
        return;
    }
    
    // If the player already exists, teleport them to the safe start instead of making a duplicate
    if (window.GameCore.playerObj) {
         window.EventBus?.emit('CMD_TELEPORT', { x: x, z: z });
         return;
    }

    // Spawn the player and bind it to the camera
    console.log(`🟢 [World] Spawning Player at ${x}, ${y}, ${z}`);
    const player = window.GameCore.instantiatePrefab('Player', x, y, z, 'persistent');
    
    if (player) {
        if (player.def) player.def.faction = 'player'; // Ensure monsters treat you as hostile
        window.GameCore.playerObj = player;
    } else {
        console.error("❌ [World] Failed to instantiate 'Player' prefab. Does it exist in AssetManager?");
    }
};

// Safe, non-crashing stubs for advanced mechanics until their specific modules load
window.spawnPartyMembers = window.spawnPartyMembers || function() {
    console.log("🟢 [World] Party members synchronized.");
};

window.regenerateWorldCycle = window.regenerateWorldCycle || function() {
    window.EventBus?.emit('WORLD_REGENERATE');
};

// Empty fallback catchers to prevent game loop crashes
window.processCompanionNeeds = window.processCompanionNeeds || function() {};
window.processBaseJobs = window.processBaseJobs || function() {};
window.awardMonsterKill = window.awardMonsterKill || function() {};
window.syncCaravanAgents = window.syncCaravanAgents || function() {};
window.syncPlayerBase = window.syncPlayerBase || function() {};
window.applyForestBlessing = window.applyForestBlessing || function() {};
window.spawnGroundLoot = window.spawnGroundLoot || function() {};
