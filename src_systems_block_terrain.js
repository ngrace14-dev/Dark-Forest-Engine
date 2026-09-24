// ============================================================================
// Dark Forest Engine - Node-Driven Ecosystem Placement & Forest Duff Floor
// File: src/systems/block_terrain.js
// ============================================================================

import * as THREE from 'three';

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

export function createForestFloorMaterial(options = {}) {
    const mat = new THREE.MeshStandardMaterial({
        color: 0x1a120b,
        roughness: 0.92,
        metalness: 0.02,
        vertexColors: true,
        ...options
    });

    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
            varying vec3 vWorldPosFloor;
            varying vec3 vWorldNormalFloor;
            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `
            #include <begin_vertex>
            vWorldPosFloor = (modelMatrix * vec4(position, 1.0)).xyz;
            vWorldNormalFloor = normalize(mat3(modelMatrix) * normal);
            `
        );

                shader.fragmentShader = `
            varying vec3 vWorldPosFloor;
            varying vec3 vWorldNormalFloor;
            
            // 1. Shared noise lifecycle
            float getForestBump(vec3 pos) {
                vec2 duffUV = pos.xz * 0.15;
                float noiseA = sin(duffUV.x) * cos(duffUV.y);
                float noiseB = sin(pos.x * 0.8) * cos(pos.z * 0.8) * 0.5 + 0.5;
                float noiseC = sin(pos.x * 4.0) * cos(pos.z * 4.0);
                
                // Micro-relief: Duff is bumpy, moss is smoother
                float duffBump = noiseA * 0.5 + noiseC * 0.1;
                return mix(duffBump, noiseC * 0.05, smoothstep(0.4, 0.7, noiseB));
            }
            
            ${shader.fragmentShader}
        `.replace(
            `#include <normal_fragment_begin>`,
            `
            #include <normal_fragment_begin>
            
            // 2. Procedural normal perturbation
            float bumpVal = getForestBump(vWorldPosFloor);
            float dbdx = dFdx(bumpVal);
            float dbdy = dFdy(bumpVal);

            vec3 vPdx = dFdx(vViewPosition);
            vec3 vPdy = dFdy(vViewPosition);

            vec3 rx = cross(vPdy, normal);
            vec3 ry = cross(normal, vPdx);

            float det = dot(vPdx, rx);
            
            // 3. Distance-faded bump intensity
            float dist = length(vViewPosition);
            float bumpIntensity = smoothstep(80.0, 10.0, dist) * 1.5;

            vec3 bumpNormal = (rx * dbdx + ry * dbdy) * sign(det) / max(abs(det), 1e-7);
            normal = normalize(normal - bumpNormal * bumpIntensity);
            `
        ).replace(
            `#include <color_fragment>`,
            `
            #include <color_fragment>

            // 4. Existing color logic reuse
            vec2 duffUV = vWorldPosFloor.xz * 0.15;
            float noiseA = sin(duffUV.x) * cos(duffUV.y);
            float noiseB = sin(vWorldPosFloor.x * 0.8) * cos(vWorldPosFloor.z * 0.8) * 0.5 + 0.5;

            vec3 darkHumus = vec3(0.08, 0.05, 0.03);
            vec3 redwoodDuff = vec3(0.18, 0.09, 0.05);
            vec3 mossPatch = vec3(0.10, 0.18, 0.07);

            float slopeFactor = 1.0 - clamp(vWorldNormalFloor.y, 0.0, 1.0);
            
            vec3 groundColor = mix(redwoodDuff, darkHumus, noiseA * 0.5 + 0.5);
            groundColor = mix(groundColor, mossPatch, smoothstep(0.4, 0.7, noiseB) * (1.0 - slopeFactor));
            groundColor = mix(groundColor, darkHumus * 0.7, smoothstep(0.3, 0.8, slopeFactor));

            diffuseColor.rgb = groundColor;
            `
        );
    };

    if (typeof window !== 'undefined' && window.VolumetricFogSystem?.patchMaterial) {
        window.VolumetricFogSystem.patchMaterial(mat);
    }

    return mat;
}

export class BlockTerrainSystem {
    constructor() {
        this.chunkSize = 60.0;
        this.activeChunks = new Set();
        this.chunkVegetationMap = new Map();
        
        this.loreTreeRegistry = new Map();
        this.landmarkRegistry = new Map();
        this.activeNodes = new Map();

        this.initialized = false;
        this.scene = null;

        this.CHAMPION_EXCLUSION_RADIUS = 120.0;

        this.loreArchives = {
            standingTitles: [
                "The Widow of Oakhaven", "Crow Root", "The Fallen Saint", "The King's Spine",
                "The Iron Sentinel", "Sorrow's Canopy", "The Elder Monarch", "The Blind Titan",
                "Watcher of the Mist", "The Cathedral Pillar", "The Silent Sovereign", "Grief's Anchor"
            ],
            fallenTitles: [
                "The Collapsed Sovereign", "Monarch's Tomb", "The Broken Spine", "Shattered Pillar",
                "The Rotting Titan", "Grave of the First Crown", "The Sleeping Saint"
            ],
            clearingCauses: [
                "Ancient Battlefield", "Collapsed Giant Opening", "Rock Outcrop Glade",
                "Settlement Ruins", "Mist Marsh Expansion", "Lightning Strike Crater"
            ]
        };

        this.bindEvents();
    }

    init(scene) {
        if (this.initialized) return;
        this.scene = scene;
        this.initialized = true;
        console.log('[BlockTerrainSystem] Node-Driven Ecosystem & Floor Materials Initialized.');
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

    hash2D(x, z) {
        let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    hash3D(x, y, z) {
        let h = Math.sin(x * 12.9898 + y * 156.432 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    getTerrainHeight(x, z) {
        if (typeof window !== 'undefined' && window.WorldGenerator?.getTerrainHeight) {
            const h = window.WorldGenerator.getTerrainHeight(x, z);
            if (Number.isFinite(h)) return h;
        }
        return 0;
    }

    getTerrainSlope(x, z) {
        const delta = 1.0;
        const hL = this.getTerrainHeight(x - delta, z);
        const hR = this.getTerrainHeight(x + delta, z);
        const hD = this.getTerrainHeight(x, z - delta);
        const hU = this.getTerrainHeight(x, z + delta);

        const dx = (hR - hL) / (2 * delta);
        const dz = (hU - hD) / (2 * delta);
        return Math.sqrt(dx * dx + dz * dz);
    }

    getTerrainEcoProfile(wx, wz, wy) {
        const slope = this.getTerrainSlope(wx, wz);
        const valleyMoisture = Math.max(0.0, 1.0 - (wy / 45.0)) * (1.0 - Math.min(1.0, slope * 1.5));
        const ridgeExposure = Math.min(1.0, Math.max(0.0, (wy - 25.0) / 35.0) + slope * 0.8);
        return { slope, valleyMoisture, ridgeExposure };
    }

    calculateTreeLean(ageState, densityMode, wx, wz) {
        let baseLeanMin = 0.5;
        let baseLeanMax = 3.0;

        if (densityMode === 'RIPARIAN') {
            baseLeanMin = 2.0; baseLeanMax = 6.0;
        } else if (densityMode === 'MOUNTAIN_RIDGE') {
            baseLeanMin = 3.0; baseLeanMax = 10.0;
        }

        if (ageState === 'DYING') {
            baseLeanMin = 5.0; baseLeanMax = 15.0;
        } else if (ageState.includes('ANCIENT')) {
            baseLeanMin = 0.5; baseLeanMax = 4.0;
        }

        const leanDeg = baseLeanMin + this.hash2D(wx * 0.4, wz * 0.4) * (baseLeanMax - baseLeanMin);
        const leanRad = THREE.MathUtils.degToRad(leanDeg);
        const leanDir = this.hash2D(wz * 0.9, wx * 0.9) * Math.PI * 2.0;

        return {
            leanX: Math.cos(leanDir) * leanRad,
            leanZ: Math.sin(leanDir) * leanRad
        };
    }

    getEcosystemNodesForChunk(chunkX, chunkZ) {
        const chunkNodeKey = `node_chunk_${chunkX}_${chunkZ}`;
        if (this.activeNodes.has(chunkNodeKey)) {
            return this.activeNodes.get(chunkNodeKey);
        }

        const nodes = [];
        const startX = chunkX * this.chunkSize;
        const startZ = chunkZ * this.chunkSize;

        const nodeRoll = this.hash2D(chunkX * 0.31, chunkZ * 0.31);
        const nx = startX + this.hash2D(chunkX * 1.7, chunkZ * 0.3) * this.chunkSize;
        const nz = startZ + this.hash2D(chunkZ * 0.3, chunkX * 1.7) * this.chunkSize;
        const ny = this.getTerrainHeight(nx, nz);

        const eco = this.getTerrainEcoProfile(nx, nz, ny);

        if (nodeRoll < 0.0035 && eco.slope < 0.22) {
            nodes.push({
                type: 'CHAMPION_NODE',
                x: nx, y: ny, z: nz,
                radius: 40.0,
                exclusionRadius: this.CHAMPION_EXCLUSION_RADIUS
            });
        }
        else if (nodeRoll < 0.0055 && eco.valleyMoisture > 0.30) {
            nodes.push({
                type: 'FALLEN_TITAN_NODE',
                x: nx, y: ny, z: nz,
                radius: 35.0,
                title: this.loreArchives.fallenTitles[Math.floor(this.hash2D(nx, nz) * this.loreArchives.fallenTitles.length)]
            });
        }
        else if (nodeRoll < 0.155 && eco.valleyMoisture > 0.35) {
            nodes.push({
                type: 'ANCIENT_GROVE_NODE',
                x: nx, y: ny, z: nz,
                radius: 45.0,
                moistureBias: eco.valleyMoisture,
                averageAge: 'ANCIENT',
                canopyDensity: 1.4
            });
        }
        else if (nodeRoll < 0.255) {
            const cause = this.loreArchives.clearingCauses[Math.floor(this.hash2D(nx, nz) * this.loreArchives.clearingCauses.length)];
            nodes.push({
                type: 'STORIED_CLEARING_NODE',
                x: nx, y: ny, z: nz,
                radius: 30.0 + this.hash2D(nz, nx) * 30.0,
                cause: cause
            });
        }

        this.activeNodes.set(chunkNodeKey, nodes);
        return nodes;
    }

    isInsideChampionTerritory(wx, wz) {
        for (const nodes of this.activeNodes.values()) {
            for (const node of nodes) {
                if (node.type === 'CHAMPION_NODE') {
                    const dx = wx - node.x;
                    const dz = wz - node.z;
                    if (dx * dx + dz * dz < node.exclusionRadius * node.exclusionRadius) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    generateChunkVegetation(chunkX, chunkZ) {
        const chunkKey = `chunk_${chunkX}_${chunkZ}`;
        if (this.chunkVegetationMap.has(chunkKey)) return;

        const nodes = this.getEcosystemNodesForChunk(chunkX, chunkZ);

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

        nodes.forEach(node => {
            if (node.type === 'CHAMPION_NODE') {
                const loreRoll = this.hash3D(node.x, node.y, node.z);
                const titleIdx = Math.floor(this.hash2D(node.x * 2.1, node.z * 2.1) * this.loreArchives.standingTitles.length);
                const title = this.loreArchives.standingTitles[titleIdx];
                const landmarkId = `champion_${Math.floor(node.x)}_${Math.floor(node.z)}`;

                addPoint('Redwood_COLOSSAL_ANCIENT_0', {
                    x: node.x, y: node.y, z: node.z,
                    rotation: this.hash2D(node.x, node.z) * Math.PI * 2.0,
                    scale: 1.25,
                    leanX: 0, leanZ: 0
                });

                if (loreRoll < 0.05) {
                    this.loreTreeRegistry.set(landmarkId, {
                        id: landmarkId, name: title, x: node.x, y: node.y, z: node.z,
                        category: 'Lore Champion',
                        rumorText: `In the deep mist stands ${title}, an ancient titan untouched by centuries.`
                    });
                }
                this.landmarkRegistry.set(landmarkId, { x: node.x, y: node.y, z: node.z, label: title });
            } 
            else if (node.type === 'FALLEN_TITAN_NODE') {
                const landmarkId = `fallen_${Math.floor(node.x)}_${Math.floor(node.z)}`;
                addPoint('Redwood_Deadfall_Log', {
                    x: node.x, y: node.y + 1.2, z: node.z,
                    rotation: this.hash2D(node.x, node.z) * Math.PI * 2.0,
                    scale: 2.2,
                    leanX: 0, leanZ: 0
                });

                this.loreTreeRegistry.set(landmarkId, {
                    id: landmarkId, name: node.title, x: node.x, y: node.y, z: node.z,
                    category: 'Fallen Titan',
                    rumorText: `Scouts report finding ${node.title}, an ancient redwood titan collapsed across the valley.`
                });
                this.landmarkRegistry.set(landmarkId, { x: node.x, y: node.y, z: node.z, label: node.title });
            }
            else if (node.type === 'ANCIENT_GROVE_NODE') {
                const groveId = `grove_${Math.floor(node.x)}_${Math.floor(node.z)}`;
                this.landmarkRegistry.set(groveId, { x: node.x, y: node.y, z: node.z, label: 'Ancient Cathedral Grove' });
            }
        });

        const step = 24.0;

        for (let x = startX; x < endX; x += step) {
            for (let z = startZ; z < endZ; z += step) {
                const wx = x + (this.hash2D(x, z) - 0.5) * (step * 0.75);
                const wz = z + (this.hash2D(z, x) - 0.5) * (step * 0.75);

                const isSafe = window.RoadManager?.isSafeZone?.({ x: wx, z: wz }) || 
                               window.CapitalCityManager?.isInsideCapital?.(wx, wz);
                if (isSafe) continue;

                const wy = this.getTerrainHeight(wx, wz);
                if (!Number.isFinite(wy)) continue;

                const eco = this.getTerrainEcoProfile(wx, wz, wy);

                let activeNodeInfluence = null;
                for (const node of nodes) {
                    const dx = wx - node.x;
                    const dz = wz - node.z;
                    if (dx * dx + dz * dz < node.radius * node.radius) {
                        activeNodeInfluence = node;
                        break;
                    }
                }

                if (activeNodeInfluence?.type === 'STORIED_CLEARING_NODE') {
                    if (this.hash2D(wx * 0.5, wz * 0.5) < 0.20) {
                        const varIdx = Math.floor(this.hash2D(wz, wx) * 4);
                        const lean = this.calculateTreeLean('YOUNG', 'CLEARING', wx, wz);
                        addPoint(`Redwood_YOUNG_${varIdx}`, {
                            x: wx, y: wy, z: wz,
                            rotation: this.hash2D(wx, wz) * Math.PI * 2.0,
                            scale: 0.7 + this.hash2D(wx, wz) * 0.3,
                            ...lean
                        });
                    }
                    continue;
                }

                const inChampionTerritory = this.isInsideChampionTerritory(wx, wz);

                const ageRoll = this.hash2D(wx * 0.1, wz * 0.1);
                let ageState = 'MATURE';

                if (activeNodeInfluence?.type === 'ANCIENT_GROVE_NODE') {
                    if (ageRoll < 0.20 && !inChampionTerritory) ageState = 'COLOSSAL_ANCIENT';
                    else if (ageRoll < 0.65) ageState = 'ANCIENT';
                    else ageState = 'MATURE';
                } else if (eco.ridgeExposure > 0.70) {
                    if (ageRoll < 0.35) ageState = 'DYING';
                    else ageState = 'MATURE';
                } else {
                    if (ageRoll < 0.05 && !inChampionTerritory) ageState = 'COLOSSAL_ANCIENT';
                    else if (ageRoll < 0.25) ageState = 'ANCIENT';
                    else if (ageRoll < 0.70) ageState = 'MATURE';
                    else if (ageRoll < 0.90) ageState = 'YOUNG';
                    else ageState = 'DYING';
                }

                const varIdx = Math.floor(this.hash2D(wz * 0.3, wx * 0.3) * 4);
                const prefabKey = `Redwood_${ageState}_${varIdx}`;

                const scale = 0.90 + this.hash2D(wx * 0.7, wz * 0.7) * 0.30;
                const rotation = this.hash2D(wx, wz) * Math.PI * 2.0;

                const lean = this.calculateTreeLean(ageState, eco.ridgeExposure > 0.6 ? 'MOUNTAIN_RIDGE' : 'STANDARD', wx, wz);

                addPoint(prefabKey, {
                    x: wx,
                    y: wy,
                    z: wz,
                    rotation: rotation,
                    scale: scale,
                    ...lean
                });

                // MID-STORY & UNDERSTORY LAYER SCATTER
                const midStoryRoll = this.hash2D(wx * 0.4, wz * 0.4);
                if (midStoryRoll < 0.45) {
                    let midStoryType = 'Fern_Cluster';
                    if (midStoryRoll < 0.18) midStoryType = 'Sword_Fern_Large';
                    else if (midStoryRoll < 0.32) midStoryType = 'Forest_Shrub_Dense';
                    else if (midStoryRoll < 0.40) midStoryType = 'Moss_Mound_Big';

                    addPoint(midStoryType, {
                        x: wx + (this.hash2D(wx, wz) - 0.5) * 4.0,
                        y: wy,
                        z: wz + (this.hash2D(wz, wx) - 0.5) * 4.0,
                        rotation: this.hash2D(wx, wz) * Math.PI * 2.0,
                        scale: 0.8 + this.hash2D(wx, wz) * 0.6,
                        leanX: 0, leanZ: 0
                    });
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

    getLoreTrees() {
        return Array.from(this.loreTreeRegistry.values());
    }

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
        this.activeNodes.clear();
        this.loreTreeRegistry.clear();
        this.landmarkRegistry.clear();
    }
}

if (typeof window !== 'undefined') {
    window.BlockTerrainSystem = new BlockTerrainSystem();
    // FIX: Expose material creation explicitly to the global window object to bypass ES6 import errors
    window.createForestFloorMaterial = createForestFloorMaterial;
}

export default BlockTerrainSystem;
