import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

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

window.createNoise2D = createNoise2D;


window.currentPrng = alea(window.EngineParams.worldSeed);
window.currentNoise2D = createNoise2D(window.currentPrng);

window.WorldGenerator = class {
    static getNoise(x, z) { return window.currentNoise2D(x * window.WorldGenConfig.noiseScale, z * window.WorldGenConfig.noiseScale); }
    static getBiome(x, z) {
        const halfForestSide = window.WorldGenConfig.darkForestSideMeters / 2;
        const furthestAxisDistance = Math.max(Math.abs(x), Math.abs(z));
        if (furthestAxisDistance > halfForestSide + window.WorldGenConfig.mountainRingWidthMeters) return 'desert';
        if (furthestAxisDistance > halfForestSide) return 'sierra';
        const val = this.getNoise(x, z);
        if (val > 0.45) return 'alpine'; if (val < -0.3) return 'coastal'; if (val > -0.3 && val < 0.1) return 'valley'; return 'redwoods';
    }
    static getTerrainHeight(x, z) {
        let height = window.currentNoise2D(x * 0.005, z * 0.005) * 8; const biomeKey = this.getBiome(x, z);
        if(biomeKey === 'alpine' || biomeKey === 'sierra') height += Math.max(0, window.currentNoise2D(x * 0.01, z * 0.01) * 20);
        return height;
    }
};
