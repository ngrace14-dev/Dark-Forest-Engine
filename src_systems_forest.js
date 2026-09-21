import * as THREE from 'three';

class ForestManager {
    constructor() {
        this.seed = window.EngineParams?.worldSeed || 1337;
    }

    generateChunk(cx, cz) {
        const tierA = []; // Redwoods
        const tierB = []; // Bushes
        
        const chunkX = cx * 60;
        const chunkZ = cz * 60;

        // Deterministic hash to keep tree positions consistent per chunk
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        // Generate Trees (Tier A)
        const treeCount = Math.floor(hash(cx, cz) * 8) + 3; // 3 to 10 trees per chunk
        for (let i = 0; i < treeCount; i++) {
            const px = chunkX + (hash(cx + i, cz) - 0.5) * 60;
            const pz = chunkZ + (hash(cx, cz + i) - 0.5) * 60;
            
            // Basic check to keep trees slightly off the direct center paths
            const isSafe = window.RoadManager?.isSafeZone?.({x: px, z: pz}) || false;
            if (!isSafe) {
                tierA.push({
                    x: px,
                    z: pz,
                    scale: 0.8 + hash(px, pz) * 0.5,
                    rotation: hash(pz, px) * Math.PI * 2
                });
            }
        }

        // Generate Bushes (Tier B)
        const bushCount = Math.floor(hash(cx + 100, cz + 100) * 12) + 4; 
        for (let i = 0; i < bushCount; i++) {
            const px = chunkX + (hash(cx + i + 100, cz) - 0.5) * 60;
            const pz = chunkZ + (hash(cx, cz + i + 100) - 0.5) * 60;
            
            const isSafe = window.RoadManager?.isSafeZone?.({x: px, z: pz}) || false;
            if (!isSafe) {
                tierB.push({
                    x: px,
                    z: pz,
                    scale: 0.6 + hash(px, pz) * 0.6,
                    rotation: hash(pz, px) * Math.PI * 2
                });
            }
        }

        return { tierA, tierB };
    }
}

// Bind to global scope so src_engine.js can use it
window.ForestManager = new ForestManager();
