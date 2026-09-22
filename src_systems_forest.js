// ============================================================================
// Dark Forest Engine - Mid-Story Ecosystem Scatter & Instance Dispatch
// File: src/systems/forest.js
// ============================================================================

import * as THREE from 'three';

class ForestManager {
    constructor() {
        this.seed = window.EngineParams?.worldSeed || 1337;
    }

    getTerrainHeight(x, z) {
        if (typeof window !== 'undefined') {
            if (window.WorldGenerator?.getTerrainHeight) {
                const h = window.WorldGenerator.getTerrainHeight(x, z);
                if (Number.isFinite(h)) return h;
            }
            if (window.BlockTerrainSystem?.getTerrainHeight) {
                const h = window.BlockTerrainSystem.getTerrainHeight(x, z);
                if (Number.isFinite(h)) return h;
            }
        }
        return 0;
    }

    generateChunk(cx, cz) {
        const tierA = []; // Redwoods / Primary Trees
        const tierB = []; // General Understory / Bushes
        const midStoryMap = new Map(); // Phase 5 FIX: Categorized Mid-Story Instantiation

        const chunkX = cx * 60;
        const chunkZ = cz * 60;
        const chunkKey = `chunk_${cx}_${cz}`;

        // Deterministic hash to keep tree/mid-story positions consistent per chunk
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const addMidStoryPoint = (prefabKey, pt) => {
            if (!midStoryMap.has(prefabKey)) {
                midStoryMap.set(prefabKey, []);
            }
            midStoryMap.get(prefabKey).push(pt);
        };

        // Generate Trees (Tier A)
        const treeCount = Math.floor(hash(cx, cz) * 8) + 3; // 3 to 10 trees per chunk
        for (let i = 0; i < treeCount; i++) {
            const px = chunkX + (hash(cx + i, cz) - 0.5) * 60;
            const pz = chunkZ + (hash(cx, cz + i) - 0.5) * 60;
            const py = this.getTerrainHeight(px, pz);
            
            const isSafe = window.RoadManager?.isSafeZone?.({x: px, z: pz}) || false;
            if (!isSafe) {
                tierA.push({
                    x: px,
                    y: py,
                    z: pz,
                    scale: 0.8 + hash(px, pz) * 0.5,
                    rotation: hash(pz, px) * Math.PI * 2
                });
            }
        }

        // Generate Bushes & Mid-Story Vegetation (Tier B & Mid-Story Layer)
        const bushCount = Math.floor(hash(cx + 100, cz + 100) * 16) + 8; // Phase 5 FIX: Increased density for mid-story cover
        for (let i = 0; i < bushCount; i++) {
            const px = chunkX + (hash(cx + i + 100, cz) - 0.5) * 60;
            const pz = chunkZ + (hash(cx, cz + i + 100) - 0.5) * 60;
            const py = this.getTerrainHeight(px, pz);
            
            const isSafe = window.RoadManager?.isSafeZone?.({x: px, z: pz}) || false;
            if (!isSafe) {
                const scale = 0.6 + hash(px, pz) * 0.6;
                const rotation = hash(pz, px) * Math.PI * 2;

                const pt = { x: px, y: py, z: pz, scale, rotation, leanX: 0, leanZ: 0 };
                tierB.push(pt);

                // Phase 5 FIX: Distribute specific mid-story prefabs to render layers
                const typeRoll = hash(px * 0.3, pz * 0.3);
                let midStoryType = 'Fern_Cluster';
                if (typeRoll < 0.25) midStoryType = 'Sword_Fern_Large';
                else if (typeRoll < 0.55) midStoryType = 'Forest_Shrub_Dense';
                else if (typeRoll < 0.80) midStoryType = 'Fern_Cluster';
                else midStoryType = 'Moss_Mound_Big';

                addMidStoryPoint(midStoryType, pt);
            }
        }

        // Phase 5 FIX: Direct dispatch of mid-story instances to ForestRenderer
        if (typeof window !== 'undefined' && window.ForestRenderer?.setChunkInstances) {
            for (const [prefabKey, points] of midStoryMap.entries()) {
                window.ForestRenderer.setChunkInstances(chunkKey, prefabKey, points);
            }
        }

        return { tierA, tierB, midStoryMap };
    }

    clearChunk(cx, cz) {
        const chunkKey = `chunk_${cx}_${cz}`;
        if (typeof window !== 'undefined' && window.ForestRenderer?.clearChunkInstances) {
            window.ForestRenderer.clearChunkInstances(chunkKey);
        }
    }
}

// Bind to global scope so engine components can consume it
if (typeof window !== 'undefined') {
    window.ForestManager = new ForestManager();
}

export default window.ForestManager;
