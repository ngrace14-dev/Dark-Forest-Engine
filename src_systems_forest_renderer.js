// ============================================================================
// Dark Forest Engine - Recalibrated Canopy Shading & Instanced Renderer
// File: src/systems/forest_renderer.js
// ============================================================================

import * as THREE from 'three';
import { createTrunkMaterial, createCanopyMaterial } from './src_shaders_forest_materials.js';

class ForestRenderer {
        constructor() {
        this.group = new THREE.Group();
        this.materials = new Map();
        this.instancedMeshes = new Map();
        this.terrainMeshes = new Map(); 
        this.forestFloorMaterial = null; 
        this.initialized = false;
        
        // Singletons for fallback geometries to prevent VRAM leaks
        this.fallbackBoxGeo = new THREE.BoxGeometry(1.8, 0.8, 1.8);
        this.fallbackBoxGeo.translate(0, 0.4, 0);
        this.fallbackBoxGeo.isShared = true;
        
        const trunkHeight = 45.0;
        const trunkGeo = new THREE.CylinderGeometry(0.8, 3.5, trunkHeight, 6);
        trunkGeo.translate(0, trunkHeight / 2, 0);

        const tier1 = new THREE.CylinderGeometry(1.0, 9.0, 12, 6);
        tier1.translate(0, trunkHeight * 0.45, 0);

        const tier2 = new THREE.CylinderGeometry(0.8, 7.0, 10, 6);
        tier2.translate(0, trunkHeight * 0.65, 0);

        const tier3 = new THREE.CylinderGeometry(0.2, 5.0, 9, 6);
        tier3.translate(0, trunkHeight * 0.85, 0);

        this.fallbackTreeGeo = window.BufferGeometryUtils ? 
            window.BufferGeometryUtils.mergeGeometries([trunkGeo, tier1, tier2, tier3]) : 
            trunkGeo;
        this.fallbackTreeGeo.isShared = true;

        this.fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3a29 });

        this.sharedUniforms = {
            uTime: { value: 0 },
            uWindSpeed: { value: 1.0 },
            uForestSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uForestSunCol: { value: new THREE.Color(0xfef3c7) },
            uRawDebugMode: { value: 0.0 }
        };
    }

    async ensureAssets() {
        if (this.initialized) return;

        const ageStates = ['COLOSSAL_ANCIENT', 'ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

                for (const ageState of ageStates) {
            for (let varIdx = 0; varIdx < 4; varIdx++) {
                const prefabKey = `Redwood_${ageState}_${varIdx}`;

                const trunkMat = createTrunkMaterial();
                const canopyMat = createCanopyMaterial();

                // Phase 6 FIX: Share uniforms on both materials for sway to work correctly
                // Note: Shader snippet assembly and injection logic has been moved to src_shaders_forest_materials.js
                // adhering to the Single Authority Rule.
                
                // Keep the shared uniforms continuously updated
                if (!trunkMat.userData) trunkMat.userData = {};
                if (!canopyMat.userData) canopyMat.userData = {};
                
                // In order to allow shared uniforms to be updated, we hook into the standard
                // onBeforeCompile created by the snippet compiler to inject our shared object references.
                const originalTrunkCompile = trunkMat.onBeforeCompile;
                trunkMat.onBeforeCompile = (shader) => {
                    originalTrunkCompile(shader);
                    shader.uniforms.uTime = this.sharedUniforms.uTime;
                    shader.uniforms.uWindSpeed = this.sharedUniforms.uWindSpeed;
                    shader.uniforms.uForestSunDir = this.sharedUniforms.uForestSunDir;
                    shader.uniforms.uForestSunCol = this.sharedUniforms.uForestSunCol;
                    shader.uniforms.uRawDebugMode = this.sharedUniforms.uRawDebugMode;
                };

                const originalCanopyCompile = canopyMat.onBeforeCompile;
                canopyMat.onBeforeCompile = (shader) => {
                    originalCanopyCompile(shader);
                    shader.uniforms.uTime = this.sharedUniforms.uTime;
                    shader.uniforms.uWindSpeed = this.sharedUniforms.uWindSpeed;
                    shader.uniforms.uForestSunDir = this.sharedUniforms.uForestSunDir;
                    shader.uniforms.uForestSunCol = this.sharedUniforms.uForestSunCol;
                    shader.uniforms.uRawDebugMode = this.sharedUniforms.uRawDebugMode;
                };

                this.materials.set(prefabKey, [trunkMat, canopyMat]);

                // Prewarm and compile shaders synchronously during load
                if (window.AssetBudget) {
                    window.AssetBudget.queueMaterial({ color: 0x2d3a29 }, () => {});
                }
            }
        }

        this.initialized = true;
        console.log('[ForestRenderer] Foliage shading & bloom-clamped materials loaded.');
    }

    setTerrainMesh(chunkKey, geometry) {
        if (!this.forestFloorMaterial) {
            if (window.createForestFloorMaterial) {
                this.forestFloorMaterial = window.createForestFloorMaterial();
            } else {
                this.forestFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a120b });
            }
        }

        if (this.terrainMeshes.has(chunkKey)) {
            const oldMesh = this.terrainMeshes.get(chunkKey);
            this.group.remove(oldMesh);
            if (oldMesh.geometry) oldMesh.geometry.dispose();
            this.terrainMeshes.delete(chunkKey);
        }

        const terrainMesh = new THREE.Mesh(geometry, this.forestFloorMaterial);
        terrainMesh.name = `terrain_${chunkKey}`;
        terrainMesh.receiveShadow = true;
        terrainMesh.castShadow = false;

        this.group.add(terrainMesh);
        this.terrainMeshes.set(chunkKey, terrainMesh);
    }

    clearTerrainMesh(chunkKey) {
        if (this.terrainMeshes.has(chunkKey)) {
            const mesh = this.terrainMeshes.get(chunkKey);
            this.group.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            this.terrainMeshes.delete(chunkKey);
        }
    }

        // Deterministic hash utility for instancing properties is now centralized in ForestManager.
    // Preserving the method stub if anything else in the class expected it, but routing to the global.
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; 
        }
        return Math.abs(hash) / 2147483647;
    }

    setChunkInstances(chunkKey, prefabKey, points) {
        if (!chunkKey || !prefabKey || !points || points.length === 0) return;

        const meshKey = `${chunkKey}_${prefabKey}`;

        if (this.instancedMeshes.has(meshKey)) {
            const oldMesh = this.instancedMeshes.get(meshKey);
            this.group.remove(oldMesh);
            if (oldMesh.geometry && !oldMesh.geometry.isShared) oldMesh.geometry.dispose();
            this.instancedMeshes.delete(meshKey);
        }

        let geo = null;

                if (prefabKey.startsWith('Redwood_')) {
            geo = window.RedwoodGenerator?.archetypes?.get(prefabKey);
        } else if (window.AssetManager?.prefabs[prefabKey]) {
            const customModelName = window.AssetManager.prefabs[prefabKey].customModel;
            if (customModelName && window.AssetManager.models[customModelName]) {
                const modelScene = window.AssetManager.models[customModelName];
                modelScene.traverse(child => {
                    if (child.isMesh && !geo) geo = child.geometry;
                });
            }
        }

                if (!geo) {
                    if (prefabKey.includes('Fern') || prefabKey.includes('Shrub') || prefabKey.includes('Moss') || prefabKey.includes('Bramble Bush')) {
                        geo = this.fallbackBoxGeo;
                    } else {
                        geo = this.fallbackTreeGeo;
                    }
                }

        // Clone the geometry if it's shared so we don't pollute other chunks' instance data buffers.
        // We only do this if it's not a shared fallback geometry OR if we are explicitly injecting new attributes.
                // For dense forest instancing, we clone the master archetype geometry here for safety.
        let instanceGeo = geo;
        if (geo.isShared || prefabKey.startsWith('Redwood_')) {
            instanceGeo = geo.clone();
            instanceGeo.isShared = false;
        }

                const mats = this.materials.get(prefabKey);
        let mat;
        if (mats && mats.length === 2) {
             // If we have procedural dual-materials (Trunk and Canopy), pass the array
             mat = mats;
        } else {
             mat = mats || this.fallbackMaterial;
        }
        
        const imesh = new THREE.InstancedMesh(instanceGeo, mat, points.length);

        imesh.castShadow = true;
        imesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const instanceDataArray = new Float32Array(points.length * 4);

        points.forEach((p, i) => {
            dummy.position.set(p.x, p.y, p.z);
            
            if (p.leanX || p.leanZ) {
                dummy.rotation.set(p.leanX || 0, p.rotation || 0, p.leanZ || 0);
            } else {
                dummy.rotation.set(0, p.rotation || 0, 0);
            }

            const scale = p.scale || 1.0;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            imesh.setMatrixAt(i, dummy.matrix);

                        // Pack Dense Attributes (aInstanceData: x=seed, y=lean(unused atm), z=scale, w=windPhase)
            // Phase 6 FIX: Route seed generation to the global Single Authority to align with Impostors
            const seed = window.ForestManager?.getTreeSeed(p.x, p.z) ?? this._hashString(`${chunkKey}_${i}_${p.x}_${p.z}`);
            const windPhase = seed; // Reuse seed for a deterministic 0-1 phase offset
            
            instanceDataArray[i * 4 + 0] = seed;
            instanceDataArray[i * 4 + 1] = 0; // Reserved for lean magnitude if needed by vertex shader later
            instanceDataArray[i * 4 + 2] = scale;
            instanceDataArray[i * 4 + 3] = windPhase;
        });

        // Inject the dense attribute into the instanced geometry
        instanceGeo.setAttribute('aInstanceData', new THREE.InstancedBufferAttribute(instanceDataArray, 4));

        imesh.instanceMatrix.needsUpdate = true;
        this.group.add(imesh);
        this.instancedMeshes.set(meshKey, imesh);
    }

        clearChunkInstances(chunkKey) {
        for (const [meshKey, imesh] of this.instancedMeshes.entries()) {
            if (meshKey.startsWith(`${chunkKey}_`)) {
                this.group.remove(imesh);
                
                // ASSET DISPOSAL RULE: Clean up cloned geometry and custom instanced buffers
                // Shared materials are NOT disposed here as they are reused by other chunks
                if (imesh.geometry && !imesh.geometry.isShared) {
                    imesh.geometry.dispose();
                }
                
                this.instancedMeshes.delete(meshKey);
            }
        }
    }

        update(delta) {
        const timeSecs = performance.now() / 1000;
        this.sharedUniforms.uTime.value = timeSecs;
    }

    /**
     * PILLAR 4 (OBSERVABILITY RULE)
     * Exposes runtime metrics for active 3D chunks and instanced trees.
     */
    getTelemetry() {
        let totalInstances = 0;
        for (const imesh of this.instancedMeshes.values()) {
            totalInstances += imesh.count;
        }

        const activeChunks = new Set();
        for (const key of this.instancedMeshes.keys()) {
            const chunkId = key.split('_')[0];
            activeChunks.add(chunkId);
        }

        return {
            activeChunks: activeChunks.size,
            instancedMeshCount: this.instancedMeshes.size,
            total3DTreeInstances: totalInstances,
            terrainMeshCount: this.terrainMeshes.size
        };
    }
}

window.ForestRenderer = new ForestRenderer();

// Global Debug Accessor
if (typeof window !== 'undefined') {
    if (!window.ForestDebug) window.ForestDebug = {};
    window.ForestDebug.getRendererTelemetry = () => window.ForestRenderer.getTelemetry();
}

export default window.ForestRenderer;
