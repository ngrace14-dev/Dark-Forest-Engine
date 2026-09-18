import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EpochManager } from './src_epoch_manager.js';

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



