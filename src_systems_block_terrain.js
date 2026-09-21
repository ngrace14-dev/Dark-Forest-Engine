// ============================================================================
// Dark Forest Engine - Terrain Chunk & Forest Scatter Generator
// File: src_systems_block_terrain.js
// ============================================================================

import * as THREE from 'three';

class BlockTerrainSystem {
    constructor() {
        this.chunkSize = 60.0; // Synchronized with Engine ChunkManager (60m x 60m)
        this.activeChunks = new Set();
        this.chunkVegetationMap = new Map();
        this.initialized = false;
        this.scene = null;

        // Calibration parameters for Climax Ancient Redwood Ecosystem
        this.calibration = {
            gridStep: 24.0,             // 24m grid spacing for massive 100m trees
            fairyRingProbability: 0.35, // 35% chance a cluster forms a fairy ring
            clearingNoiseThreshold: 0.25, // Threshold for natural forest clearings
            ageDistribution: {
                ANCIENT: 0.10,
                MATURE: 0.35,
                YOUNG: 0.35,
                DYING: 0.20
            }
        };

        this.bindEvents();
    }

    /**
     * Initializes the system and binds to the main scene.
     * @param {THREE.Scene} scene 
     */
    init(scene) {
        if (this.initialized) return;
        this.scene = scene;
        this.initialized = true;
        console.log('[BlockTerrainSystem] Initialized successfully.');
    }

    /**
     * Binds lifecycle event listeners for automatic startup and resets.
     */
    bindEvents() {
        window.EventBus?.on('ENGINE_READY', () => {
            if (window.GameCore?.scene) {
                this.init(window.GameCore.scene);
            }
        });

        window.EventBus?.on('GAME_STARTED', () => {
            if (window.GameCore?.playerObj?.visual) {
                const pos = window.GameCore.playerObj.visual.position;
                this.updateStreaming(pos.x, pos.z, 6);
            }
        });

        window.EventBus?.on('WORLD_REGENERATE', () => {
            this.clearAll();
        });
    }

    /**
     * Deterministic pseudo-random hash based on world coordinates.
     */
    hash2D(x, z) {
        let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    /**
     * Evaluates terrain height at world coordinates (x, z).
     * @param {number} x 
     * @param {number} z 
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        if (window.WorldGenerator?.getTerrainHeight) {
            const h = window.WorldGenerator.getTerrainHeight(x, z);
            if (Number.isFinite(h)) return h;
        }
        return 0;
    }

    /**
     * Generates vegetation scattering points for a chunk.
     * @param {number} chunkX - Chunk coordinate X
     * @param {number} chunkZ - Chunk coordinate Z
     */
    generateChunkVegetation(chunkX, chunkZ) {
        const chunkKey = `chunk_${chunkX}_${chunkZ}`;
        if (this.chunkVegetationMap.has(chunkKey)) return;

        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        const endX = startX + this.chunkSize;
        const endZ = startZ + this.chunkSize;

        // Container map: archetypeKey -> array of point transforms
        const prefabPointsMap = new Map();

        const addPoint = (prefabKey, pt) => {
            if (!prefabPointsMap.has(prefabKey)) {
                prefabPointsMap.set(prefabKey, []);
            }
            prefabPointsMap.get(prefabKey).push(pt);
        };

        const step = this.calibration.gridStep;

        for (let x = startX; x < endX; x += step) {
            for (let z = startZ; z < endZ; z += step) {
                // Jitter position within grid cell
                const wx = x + (this.hash2D(x, z) - 0.5) * (step * 0.7);
                const wz = z + (this.hash2D(z, x) - 0.5) * (step * 0.7);

                // Safe zone check (roads, villages, capital city)
                const isSafe = window.RoadManager?.isSafeZone?.({ x: wx, z: wz }) || 
                               window.CapitalCityManager?.isInsideCapital?.(wx, wz);
                if (isSafe) continue;

                // Natural Forest Clearing Glade Noise
                const gladeNoise = this.hash2D(wx * 0.003, wz * 0.003);
                if (gladeNoise < this.calibration.clearingNoiseThreshold) continue;

                const wy = this.getTerrainHeight(wx, wz);
                if (!Number.isFinite(wy)) continue;

                // Determine whether to spawn a Fairy Ring cluster or an individual tree
                const ringRoll = this.hash2D(wx * 0.05, wz * 0.05);

                if (ringRoll < this.calibration.fairyRingProbability && window.RedwoodGenerator?.generateFairyRingCluster) {
                    // Spawn Fairy Ring Cluster (4 to 7 trees around an old central burl)
                    const ringCount = 4 + Math.floor(this.hash2D(wx, wz) * 4);
                    const ringRadius = 8.0 + this.hash2D(wz, wx) * 6.0;

                    const ringPoints = window.RedwoodGenerator.generateFairyRingCluster(
                        wx, wz, ringCount, ringRadius, (rx, rz) => this.getTerrainHeight(rx, rz)
                    );

                    if (Array.isArray(ringPoints)) {
                        ringPoints.forEach(pt => {
                            addPoint(pt.prefabKey || 'Redwood_ANCIENT_0', {
                                x: pt.x,
                                y: pt.y,
                                z: pt.z,
                                rotation: pt.rotation || 0,
                                scale: pt.scale || 1.0
                            });
                        });
                    }
                } else {
                    // Spawn Individual Redwood Tree based on Age State distribution
                    const ageRoll = this.hash2D(wx * 0.1, wz * 0.1);
                    let ageState = 'MATURE';

                    if (ageRoll < this.calibration.ageDistribution.ANCIENT) {
                        ageState = 'ANCIENT';
                    } else if (ageRoll < this.calibration.ageDistribution.ANCIENT + this.calibration.ageDistribution.MATURE) {
                        ageState = 'MATURE';
                    } else if (ageRoll < 1.0 - this.calibration.ageDistribution.DYING) {
                        ageState = 'YOUNG';
                    } else {
                        ageState = 'DYING';
                    }

                    // Select variation index (0 to 3)
                    const varIdx = Math.floor(this.hash2D(wz * 0.3, wx * 0.3) * 4);
                    const prefabKey = `Redwood_${ageState}_${varIdx}`;

                    const scale = 0.85 + this.hash2D(wx * 0.7, wz * 0.7) * 0.35;
                    const rotation = this.hash2D(wx, wz) * Math.PI * 2.0;

                    addPoint(prefabKey, {
                        x: wx,
                        y: wy,
                        z: wz,
                        rotation: rotation,
                        scale: scale
                    });
                }
            }
        }

        // Store chunk vegetation data
        this.chunkVegetationMap.set(chunkKey, prefabPointsMap);
        this.activeChunks.add(chunkKey);

        // Upload instance matrices to ForestRenderer
        if (window.ForestRenderer?.setChunkInstances) {
            for (const [prefabKey, points] of prefabPointsMap.entries()) {
                window.ForestRenderer.setChunkInstances(chunkKey, prefabKey, points);
            }
        }
    }

    /**
     * Unloads vegetation instances for a chunk when streamed out.
     * @param {number} chunkX 
     * @param {number} chunkZ 
     */
    unloadChunkVegetation(chunkX, chunkZ) {
        const chunkKey = `chunk_${chunkX}_${chunkZ}`;
        if (!this.chunkVegetationMap.has(chunkKey)) return;

        if (window.ForestRenderer?.clearChunkInstances) {
            window.ForestRenderer.clearChunkInstances(chunkKey);
        }

        this.chunkVegetationMap.delete(chunkKey);
        this.activeChunks.delete(chunkKey);
    }

    /**
     * Synchronizes chunk streaming around player position.
     * @param {number} playerX 
     * @param {number} playerZ 
     * @param {number} viewRadiusChunks - Load radius in chunks (default 6 chunks / ~360m)
     */
    updateStreaming(playerX, playerZ, viewRadiusChunks = 6) {
        if (!this.initialized && window.GameCore?.scene) {
            this.init(window.GameCore.scene);
        }

        const centerChunkX = Math.floor(playerX / this.chunkSize);
        const centerChunkZ = Math.floor(playerZ / this.chunkSize);

        const neededChunkKeys = new Set();

        for (let cx = centerChunkX - viewRadiusChunks; cx <= centerChunkX + viewRadiusChunks; cx++) {
            for (let cz = centerChunkZ - viewRadiusChunks; cz <= centerChunkZ + viewRadiusChunks; cz++) {
                const dx = cx - centerChunkX;
                const dz = cz - centerChunkZ;
                if (dx * dx + dz * dz > viewRadiusChunks * viewRadiusChunks) continue;

                const key = `chunk_${cx}_${cz}`;
                neededChunkKeys.add(key);

                if (!this.chunkVegetationMap.has(key)) {
                    this.generateChunkVegetation(cx, cz);
                }
            }
        }

        // Unload out-of-range chunks
        for (const activeKey of Array.from(this.activeChunks)) {
            if (!neededChunkKeys.has(activeKey)) {
                const parts = activeKey.split('_');
                if (parts.length === 3) {
                    const cx = parseInt(parts[1], 10);
                    const cz = parseInt(parts[2], 10);
                    this.unloadChunkVegetation(cx, cz);
                }
            }
        }
    }

    /**
     * Clears all active chunk vegetation data.
     */
    clearAll() {
        for (const activeKey of Array.from(this.activeChunks)) {
            const parts = activeKey.split('_');
            if (parts.length === 3) {
                const cx = parseInt(parts[1], 10);
                const cz = parseInt(parts[2], 10);
                if (window.ForestRenderer?.clearChunkInstances) {
                    window.ForestRenderer.clearChunkInstances(activeKey);
                }
            }
        }
        this.chunkVegetationMap.clear();
        this.activeChunks.clear();
    }
}

// Global Singleton Binding
window.BlockTerrainSystem = new BlockTerrainSystem();
export default BlockTerrainSystem;
