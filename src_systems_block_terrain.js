// ============================================================================
// Dark Forest Engine - Old-Growth Redwood Forest Placement System
// File: src_systems_block_terrain.js
// ============================================================================

import * as THREE from 'three';

/**
 * Terrain Chunk wrapper required by src_systems_ruins.js
 */
export class BlockTerrainChunk {
    constructor(cx, cz, chunkSize = 60.0) {
        this.cx = cx;
        this.cz = cz;
        this.chunkSize = chunkSize;
        this.key = `chunk_${cx}_${cz}`;
        this.mesh = null;
        this.vegetation = new Map();
    }
}

/**
 * Procedural block material factory required by structural generators.
 */
export function createProceduralBlockMaterial(options = {}) {
    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: options.roughness ?? 0.9,
        metalness: options.metalness ?? 0.1,
        color: options.color ?? 0xffffff,
        ...options
    });

    if (typeof window !== 'undefined' && window.VolumetricFogSystem?.patchMaterial) {
        window.VolumetricFogSystem.patchMaterial(mat);
    }

    return mat;
}

/**
 * Procedural Ecosystem Placement Manager
 */
export class BlockTerrainSystem {
    constructor() {
        this.chunkSize = 60.0;
        this.activeChunks = new Set();
        this.chunkVegetationMap = new Map();
        
        // Lore & Landmark Registry (Queryable by Oracle Board & Rumor System)
        this.loreTreeRegistry = new Map();
        this.landmarkRegistry = new Map();

        this.initialized = false;
        this.scene = null;

        // Curated Lore Tree Names for the 0.05% Champion subset
        this.loreTreeNames = [
            "The Widow of Oakhaven",
            "Crow Root",
            "The Fallen Saint",
            "The King's Spine",
            "The Iron Sentinel",
            "Sorrow's Canopy",
            "The Elder Monarch",
            "The Blind Titan",
            "Watcher of the Mist",
            "The Cathedral Pillar"
        ];

        this.bindEvents();
    }

    init(scene) {
        if (this.initialized) return;
        this.scene = scene;
        this.initialized = true;
        console.log('[BlockTerrainSystem] Old-Growth Ecosystem Placement Engine Initialized.');
    }

    bindEvents() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => {
                if (window.GameCore?.scene) {
                    this.init(window.GameCore.scene);
                }
            });

            window.EventBus.on('GAME_STARTED', () => {
                if (window.GameCore?.playerObj?.visual) {
                    const pos = window.GameCore.playerObj.visual.position;
                    this.updateStreaming(pos.x, pos.z, 6);
                }
            });

            window.EventBus.on('WORLD_REGENERATE', () => {
                this.clearAll();
            });
        }
    }

    /**
     * Multi-scale deterministic hash generator.
     */
    hash2D(x, z) {
        let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    hash3D(x, y, z) {
        let h = Math.sin(x * 12.9898 + y * 156.432 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    /**
     * Samples terrain height at world coordinates (x, z).
     */
    getTerrainHeight(x, z) {
        if (typeof window !== 'undefined' && window.WorldGenerator?.getTerrainHeight) {
            const h = window.WorldGenerator.getTerrainHeight(x, z);
            if (Number.isFinite(h)) return h;
        }
        return 0;
    }

    /**
     * Computes slope gradient at world coordinates.
     */
    getTerrainSlope(x, z) {
        const delta = 1.0;
        const hL = this.getTerrainHeight(x - delta, z);
        const hR = this.getTerrainHeight(x + delta, z);
        const hD = this.getTerrainHeight(x, z - delta);
        const hU = getTerrainHeight(x, z + delta);

        const dx = (hR - hL) / (2 * delta);
        const dz = (hU - hD) / (2 * delta);
        return Math.sqrt(dx * dx + dz * dz); // Tangent of slope angle
    }

    /**
     * Evaluates ecological terrain attributes.
     */
    getTerrainEcoProfile(wx, wz, wy) {
        const slope = this.getTerrainSlope(wx, wz);
        
        // Valleys have low height relative to neighbors & low slope
        const valleyMoisture = Math.max(0.0, 1.0 - (wy / 45.0)) * (1.0 - Math.min(1.0, slope * 1.5));
        
        // Ridges have high elevation and high slope exposure
        const ridgeExposure = Math.min(1.0, Math.max(0.0, (wy - 25.0) / 35.0) + slope * 0.8);

        return { slope, valleyMoisture, ridgeExposure };
    }

    /**
     * Evaluates Biome Density Mode using noise-modified shapes.
     */
    getDensityMode(wx, wz, eco) {
        const densityNoise = this.hash2D(wx * 0.0015, wz * 0.0015);
        const clearingNoise = this.hash2D(wx * 0.004 + 50.0, wz * 0.004 + 50.0);

        // Noise-deformed non-circular clearings (20m - 100m openings)
        if (clearingNoise < 0.22) return 'CLEARING';

        if (eco.valleyMoisture > 0.65) return 'RIPARIAN';
        if (eco.ridgeExposure > 0.70) return 'MOUNTAIN_RIDGE';
        if (densityNoise > 0.72) return 'DENSE_ANCIENT';
        if (densityNoise < 0.38) return 'OPEN_WOODLAND';
        return 'MIXED_OLD_GROWTH';
    }

    /**
     * Main Ecosystem Placement Pipeline for a chunk.
     */
    generateChunkVegetation(chunkX, chunkZ) {
        const chunkKey = `chunk_${chunkX}_${chunkZ}`;
        if (this.chunkVegetationMap.has(chunkKey)) return;

        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;
        const endX = startX + this.chunkSize;
        const endZ = startZ + this.chunkSize;

        const prefabPointsMap = new Map();

        const addPoint = (prefabKey, pt) => {
            if (!prefabPointsMap.has(prefabKey)) {
                prefabPointsMap.set(prefabKey, []);
            }
            prefabPointsMap.get(prefabKey).push(pt);
        };

        // Grid stepping adapts per biome
        const baseStep = 24.0;

        for (let x = startX; x < endX; x += baseStep) {
            for (let z = startZ; z < endZ; z += baseStep) {
                const wx = x + (this.hash2D(x, z) - 0.5) * (baseStep * 0.75);
                const wz = z + (this.hash2D(z, x) - 0.5) * (baseStep * 0.75);

                // Skip safe zones (roads, capital city perimeters)
                const isSafe = window.RoadManager?.isSafeZone?.({ x: wx, z: wz }) || 
                               window.CapitalCityManager?.isInsideCapital?.(wx, wz);
                if (isSafe) continue;

                const wy = this.getTerrainHeight(wx, wz);
                if (!Number.isFinite(wy)) continue;

                const eco = this.getTerrainEcoProfile(wx, wz, wy);
                const densityMode = this.getDensityMode(wx, wz, eco);

                // 1. CLEARING RULE: Skip placement inside glades/clearings
                if (densityMode === 'CLEARING') {
                    // 15% chance to place young regrowth or fallen logs along clearing edges
                    if (this.hash2D(wx * 0.5, wz * 0.5) < 0.15) {
                        const varIdx = Math.floor(this.hash2D(wz, wx) * 4);
                        addPoint(`Redwood_YOUNG_${varIdx}`, {
                            x: wx, y: wy, z: wz,
                            rotation: this.hash2D(wx, wz) * Math.PI * 2.0,
                            scale: 0.7 + this.hash2D(wx, wz) * 0.3
                        });
                    }
                    continue;
                }

                // 2. DEADFALL SYSTEM: Rotting logs & collapsed ancient trunks
                const deadfallRoll = this.hash2D(wx * 0.8, wz * 0.8);
                const deadfallThreshold = (densityMode === 'RIPARIAN' || densityMode === 'DENSE_ANCIENT') ? 0.14 : 0.06;

                if (deadfallRoll < deadfallThreshold) {
                    addPoint('Redwood_Deadfall_Log', {
                        x: wx,
                        y: wy + 0.8,
                        z: wz,
                        rotation: this.hash2D(wx, wz) * Math.PI * 2.0,
                        scale: 1.0 + this.hash2D(wz, wx) * 0.6
                    });
                    
                    // Deadfall feeds young regrowth nearby
                    if (this.hash2D(wz * 1.2, wx * 1.2) < 0.50) {
                        const varIdx = Math.floor(this.hash2D(wx, wz) * 4);
                        addPoint(`Redwood_YOUNG_${varIdx}`, {
                            x: wx + (this.hash2D(wx, wz) - 0.5) * 6.0,
                            y: wy,
                            z: wz + (this.hash2D(wz, wx) - 0.5) * 6.0,
                            rotation: this.hash2D(wz, wx) * Math.PI * 2.0,
                            scale: 0.8 + this.hash2D(wx, wz) * 0.3
                        });
                    }
                    continue;
                }

                // 3. ECOLOGICAL HIERARCHY EVALUATION
                const championRoll = this.hash2D(wx * 0.01, wz * 0.01);
                const ageRoll = this.hash2D(wx * 0.1, wz * 0.1);
                let ageState = 'MATURE';

                // LAYER A: CHAMPION TREES (0.35%)
                if (championRoll < 0.0035 && eco.slope < 0.25) {
                    ageState = 'COLOSSAL_ANCIENT';

                    // LORE TREE SUBSET RULE: 0.05% of Champions designated as Lore Landmarks
                    const loreRoll = this.hash3D(wx, wy, wz);
                    if (loreRoll < 0.05) {
                        const nameIdx = Math.floor(this.hash2D(wx * 3.1, wz * 3.1) * this.loreTreeNames.length);
                        const loreName = this.loreTreeNames[nameIdx];
                        const loreId = `lore_tree_${Math.floor(wx)}_${Math.floor(wz)}`;

                        const loreData = {
                            id: loreId,
                            name: loreName,
                            x: wx, y: wy, z: wz,
                            description: `An ancient landmark tree known in Crow archives as ${loreName}.`,
                            rumorText: `Travelers speak of ${loreName} standing deep in the ancient grove.`
                        };

                        this.loreTreeRegistry.set(loreId, loreData);
                        console.log(`[LoreTree] World Landmark Spawned: "${loreName}" at (${Math.floor(wx)}, ${Math.floor(wz)})`);
                    }

                    // Register landmark titan for UI & mini-map tracking
                    this.landmarkRegistry.set(`titan_${Math.floor(wx)}_${Math.floor(wz)}`, {
                        x: wx, y: wy, z: wz, label: 'Colossal Redwood Titan'
                    });
                }
                // LAYER B: ANCIENT GROVES & COLOSSALS (5% - 20% based on density mode)
                else if (densityMode === 'DENSE_ANCIENT' || densityMode === 'RIPARIAN') {
                    if (ageRoll < 0.08) ageState = 'COLOSSAL_ANCIENT';
                    else if (ageRoll < 0.35) ageState = 'ANCIENT';
                    else if (ageRoll < 0.75) ageState = 'MATURE';
                    else if (ageRoll < 0.90) ageState = 'YOUNG';
                    else ageState = 'DYING';
                }
                // LAYER C: MOUNTAIN RIDGES (Wind-damaged, stunted, leaning, dying snags)
                else if (densityMode === 'MOUNTAIN_RIDGE') {
                    if (ageRoll < 0.25) ageState = 'DYING'; // High snag ratio on ridges
                    else if (ageRoll < 0.65) ageState = 'MATURE';
                    else ageState = 'YOUNG';
                }
                // LAYER D: STANDARD MIXED FOREST
                else {
                    if (ageRoll < 0.05) ageState = 'COLOSSAL_ANCIENT';
                    else if (ageRoll < 0.22) ageState = 'ANCIENT';
                    else if (ageRoll < 0.68) ageState = 'MATURE';
                    else if (ageRoll < 0.88) ageState = 'YOUNG';
                    else ageState = 'DYING';
                }

                const varIdx = Math.floor(this.hash2D(wz * 0.3, wx * 0.3) * 4);
                const prefabKey = `Redwood_${ageState}_${varIdx}`;

                const scale = 0.90 + this.hash2D(wx * 0.7, wz * 0.7) * 0.30;
                const rotation = this.hash2D(wx, wz) * Math.PI * 2.0;

                addPoint(prefabKey, {
                    x: wx,
                    y: wy,
                    z: wz,
                    rotation: rotation,
                    scale: scale
                });

                // ANCIENT GROVE CATHEDRAL CLUSTERING: Spawns 4-8 secondary trees around Ancients
                if ((ageState === 'ANCIENT' || ageState === 'COLOSSAL_ANCIENT') && eco.valleyMoisture > 0.40) {
                    const clusterTrees = 3 + Math.floor(this.hash2D(wx * 2.0, wz * 2.0) * 5);
                    for (let c = 0; c < clusterTrees; c++) {
                        const cAngle = (c / clusterTrees) * Math.PI * 2.0 + this.hash2D(c, wx);
                        const cDist = 8.0 + this.hash2D(c, wz) * 12.0;
                        const cx = wx + Math.cos(cAngle) * cDist;
                        const cz = wz + Math.sin(cAngle) * cDist;

                        const cy = this.getTerrainHeight(cx, cz);
                        if (!Number.isFinite(cy)) continue;

                        const cAgeState = (c % 2 === 0) ? 'MATURE' : 'YOUNG';
                        const cVarIdx = Math.floor(this.hash2D(cx, cz) * 4);

                        addPoint(`Redwood_${cAgeState}_${cVarIdx}`, {
                            x: cx,
                            y: cy,
                            z: cz,
                            rotation: this.hash2D(cx, cz) * Math.PI * 2.0,
                            scale: 0.85 + this.hash2D(cx, cz) * 0.30
                        });
                    }
                }
            }
        }

        this.chunkVegetationMap.set(chunkKey, prefabPointsMap);
        this.activeChunks.add(chunkKey);

        if (window.ForestRenderer?.setChunkInstances) {
            for (const [prefabKey, points] of prefabPointsMap.entries()) {
                window.ForestRenderer.setChunkInstances(chunkKey, prefabKey, points);
            }
        }
    }

    unloadChunkVegetation(chunkX, chunkZ) {
        const chunkKey = `chunk_${chunkX}_${chunkZ}`;
        if (!this.chunkVegetationMap.has(chunkKey)) return;

        if (window.ForestRenderer?.clearChunkInstances) {
            window.ForestRenderer.clearChunkInstances(chunkKey);
        }

        this.chunkVegetationMap.delete(chunkKey);
        this.activeChunks.delete(chunkKey);
    }

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
     * Public API: Retrieves all discovered Lore Trees for Oracle Board & UI Rumors.
     */
    getLoreTrees() {
        return Array.from(this.loreTreeRegistry.values());
    }

    /**
     * Public API: Retrieves all landmark titans for map rendering.
     */
    getLandmarks() {
        return Array.from(this.landmarkRegistry.values());
    }

    clearAll() {
        for (const activeKey of Array.from(this.activeChunks)) {
            if (window.ForestRenderer?.clearChunkInstances) {
                window.ForestRenderer.clearChunkInstances(activeKey);
            }
        }
        this.chunkVegetationMap.clear();
        this.activeChunks.clear();
        this.loreTreeRegistry.clear();
        this.landmarkRegistry.clear();
    }
}

// Global Singleton Binding
if (typeof window !== 'undefined') {
    window.BlockTerrainSystem = new BlockTerrainSystem();
}

export default BlockTerrainSystem;
