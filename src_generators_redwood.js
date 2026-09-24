
// ============================================================================
// Dark Forest Engine - Old-Growth Redwood Procedural Generator
// File: src_generators_redwood.js
// ============================================================================

import * as THREE from 'three';

// --- Species Parameter Specifications (Sequoia sempervirens) ---
export const REDWOOD_SPECIES_CONFIG = {
    ANCIENT: {
        heightRange: [85.0, 100.0],       // ~280 - 325 ft
        baseRadiusRange: [3.8, 5.2],     // ~25 - 34 ft base diameter
        topRadius: 0.35,
        flareAggression: 4.2,             // Massive root buttresses
        bareTrunkRatio: 0.62,             // Bottom 62% bare trunk (self-pruned)
        branchCount: 45,
        canopySpread: 14.0,
        foliageDensity: 0.85
    },
    MATURE: {
        heightRange: [60.0, 80.0],
        baseRadiusRange: [2.2, 3.5],
        topRadius: 0.25,
        flareAggression: 2.8,
        bareTrunkRatio: 0.48,
        branchCount: 38,
        canopySpread: 10.0,
        foliageDensity: 0.90
    },
    YOUNG: {
        heightRange: [30.0, 45.0],
        baseRadiusRange: [1.0, 1.6],
        topRadius: 0.15,
        flareAggression: 1.4,
        bareTrunkRatio: 0.25,
        branchCount: 28,
        canopySpread: 6.0,
        foliageDensity: 0.95
    },
    DYING: {
        heightRange: [75.0, 90.0],
        baseRadiusRange: [3.2, 4.5],
        topRadius: 0.15,
        flareAggression: 3.8,
        bareTrunkRatio: 0.75,             // Mostly bare, shattered top
        branchCount: 18,
        canopySpread: 8.0,
        foliageDensity: 0.25
    }
};

export class RedwoodGenerator {
    constructor() {
        this.worker = null;
        this.archetypes = new Map();
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Initializes the Web Worker and generates all 16 archetype geometries in background threads.
     * @param {string} workerPath - Path to src_workers_tree_worker.js
     * @returns {Promise<Map<string, THREE.BufferGeometry>>}
     */
    init(workerPath = 'src_workers_tree_worker.js') {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(workerPath);
            } catch (err) {
                console.error('[RedwoodGenerator] Failed to spawn worker, falling back:', err);
                reject(err);
                return;
            }

            // Define 16 Archetypes (4 per Age State)
            const archetypesToGenerate = [];
            const ageStates = ['ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

                        ageStates.forEach(ageState => {
                for (let i = 0; i < 4; i++) {
                    const seed = (ageStates.indexOf(ageState) + 1) * 1000 + (i * 257) + 1337;
                    archetypesToGenerate.push({
                        key: `Redwood_${ageState}_${i}`,
                        ageState: ageState,
                        seed: seed
                    });
                }
            });

            // Inject Mid-Story Procedural Assets
            archetypesToGenerate.push({
                key: 'Procedural_Fern_Cluster',
                type: 'Fern_Cluster',
                seed: 9999
            });

            this.worker.onmessage = (e) => {
                const { generatedBuffers } = e.data;
                if (!generatedBuffers) {
                    reject(new Error('[RedwoodGenerator] Received empty buffers from worker.'));
                    return;
                }

                // Construct Three.js BufferGeometries from transferred ArrayBuffers
                Object.keys(generatedBuffers).forEach(key => {
                    const data = generatedBuffers[key];
                    const geo = new THREE.BufferGeometry();

                    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
                    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
                    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
                    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3)); // Wind/Moss metadata
                    
                                        if (data.indices) {
                                            geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
                                        }
                    
                                        if (data.trunkIndexCount !== undefined && data.foliageIndexCount !== undefined) {
                                            geo.addGroup(0, data.trunkIndexCount, 0);
                                            geo.addGroup(data.trunkIndexCount, data.foliageIndexCount, 1);
                                        }

                    geo.computeBoundingBox();
                    geo.computeBoundingSphere();

                    if (key.startsWith('Procedural_')) {
                        const dummyGroup = new THREE.Group();
                        dummyGroup.add(new THREE.Mesh(geo));
                        if (window.AssetManager) {
                            window.AssetManager.models[key] = dummyGroup;
                        }
                    } else {
                        this.archetypes.set(key, geo);
                    }
                });

                this.isInitialized = true;
                console.log(`[RedwoodGenerator] Generated ${this.archetypes.size} Redwood Archetypes off-main-thread.`);
                resolve(this.archetypes);
            };

            this.worker.onerror = (err) => {
                console.error('[RedwoodGenerator] Worker script error:', err);
                reject(err);
            };

            // Dispatch build request to Web Worker
            this.worker.postMessage({ archetypesToGenerate });
        });

        return this.initPromise;
    }

    /**
     * Retrieves a generated archetype geometry.
     * @param {string} ageState - 'ANCIENT' | 'MATURE' | 'YOUNG' | 'DYING'
     * @param {number} variationIndex - 0 to 3
     * @returns {THREE.BufferGeometry | null}
     */
    getArchetype(ageState = 'ANCIENT', variationIndex = 0) {
        const index = Math.abs(Math.floor(variationIndex)) % 4;
        const key = `Redwood_${ageState}_${index}`;
        return this.archetypes.get(key) || null;
    }

    /**
     * Selects a random archetype key for a given age state.
     * @param {string} ageState 
     * @returns {string}
     */
    getRandomArchetypeKey(ageState = 'ANCIENT') {
        const randIdx = Math.floor(Math.random() * 4);
        return `Redwood_${ageState}_${randIdx}`;
    }

    /**
     * Calculates spatial positions for old-growth "Fairy Rings" (Root-sprout clusters).
     * @param {number} centerX - World X coordinate of ring center
     * @param {number} centerZ - World Z coordinate of ring center
     * @param {number} count - Number of trees in ring (4 to 8)
     * @param {number} radius - Ring radius (6m to 14m)
     * @param {Function} getTerrainY - Function returning terrain height at (x,z)
     * @returns {Array<{x: number, y: number, z: number, rotation: number, scale: number, ageState: string, prefabKey: string}>}
     */
    generateFairyRingCluster(centerX, centerZ, count = 6, radius = 10.0, getTerrainY = () => 0) {
        const points = [];
        const baseAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i / count) * Math.PI * 2.0 + (Math.random() - 0.5) * 0.3;
            const dist = radius + (Math.random() - 0.5) * 3.0;

            const wx = centerX + Math.cos(angle) * dist;
            const wz = centerZ + Math.sin(angle) * dist;
            const wy = getTerrainY(wx, wz);

            if (!Number.isFinite(wy)) continue;

            // Age State distribution within ring: Center parent was ancient, ring sprouts are mature/young
            const ageRoll = Math.random();
            let ageState = 'MATURE';
            if (ageRoll < 0.20) ageState = 'ANCIENT';
            else if (ageRoll < 0.70) ageState = 'MATURE';
            else if (ageRoll < 0.88) ageState = 'YOUNG';
            else ageState = 'DYING';

            const prefabKey = this.getRandomArchetypeKey(ageState);

            points.push({
                x: wx,
                y: wy,
                z: wz,
                rotation: Math.random() * Math.PI * 2,
                scale: 0.85 + Math.random() * 0.3,
                ageState: ageState,
                prefabKey: prefabKey
            });
        }

        return points;
    }

    /**
     * Terminate the background worker thread.
     */
    dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.archetypes.forEach(geo => geo.dispose());
        this.archetypes.clear();
        this.isInitialized = false;
    }
}

// Global Singleton Binding
window.RedwoodGenerator = new RedwoodGenerator();
export default RedwoodGenerator;
