// ============================================================================
// Dark Forest Engine - Forest Rendering & Instancing Pipeline
// File: src_systems_forest_renderer.js
// ============================================================================

import * as THREE from 'three';

class ForestRenderer {
    constructor() {
        this.group = new THREE.Group();
        this.instancedMeshes = new Map();
        this.chunkInstances = new Map();
        this.geometries = new Map();
        this.materials = new Map();
        this.instances = new Map(); // Backwards compatibility alias
        this.windUniforms = [];
        this.assetsInitialized = false;

        // Reusable transform dummies to avoid GC allocations during rebuild
        this.dummyMatrix = new THREE.Matrix4();
        this.dummyPosition = new THREE.Vector3();
        this.dummyQuaternion = new THREE.Quaternion();
        this.dummyScale = new THREE.Vector3();
        this.dummyEuler = new THREE.Euler();
    }

    /**
     * Initializes procedural materials, loads Web Worker archetypes, and sets up fallback geometry.
     */
    async ensureAssets() {
        if (this.assetsInitialized) return;

        // --- 1. UNIFIED REDWOOD MATERIAL (Bark + Foliage Shading) ---
        const redwoodMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d2015,
            roughness: 0.85,
            metalness: 0.05,
            vertexColors: true,
            side: THREE.DoubleSide
        });

        redwoodMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.windUniforms.push(shader.uniforms.uTime);

            // Hook Vertex Shader: Pass world space & vertex color wind masks
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uTime;
                 varying vec3 vWorldNormalVec;
                 varying vec3 vWorldPosVec;
                 varying vec3 vCustomColorData;`
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vCustomColorData = color;
                 
                 #ifdef USE_INSTANCING
                     vWorldPosVec = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                     vWorldNormalVec = normalize(mat3(modelMatrix * instanceMatrix) * normal);
                 #else
                     vWorldPosVec = (modelMatrix * vec4(position, 1.0)).xyz;
                     vWorldNormalVec = normalize(mat3(modelMatrix) * normal);
                 #endif

                 float heightFactor = clamp(position.y / 90.0, 0.0, 1.0);
                 
                 // 1. Rigid Trunk Sway (Minimal low-frequency bend at upper trunk)
                 float trunkSway = sin(uTime * 1.2 + vWorldPosVec.x * 0.01 + vWorldPosVec.z * 0.01) * 0.4 * pow(heightFactor, 2.5);
                 
                 // 2. Primary Branch Sway (Driven by Vertex Color R)
                 float branchSway = sin(uTime * 2.8 + vWorldPosVec.y * 0.2) * 0.8 * color.r;
                 
                 // 3. Foliage High-Frequency Flutter (Driven by Vertex Color G)
                 float leafFlutter = cos(uTime * 8.0 + vWorldPosVec.x) * 0.15 * color.g;

                 transformed.x += trunkSway + branchSway + leafFlutter;
                 transformed.z += (trunkSway * 0.6) + branchSway;`
            );

            // Hook Fragment Shader: Procedural Bark Grooves, Albedo Blending, and Moss
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 varying vec3 vWorldNormalVec;
                 varying vec3 vWorldPosVec;
                 varying vec3 vCustomColorData;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 
                 // Compute derivative procedural bark grooves
                 float h1 = sin(vWorldPosVec.y * 4.0 + sin(vWorldPosVec.x * 2.0) * 0.5);
                 float h2 = cos(atan(vWorldNormalVec.z, vWorldNormalVec.x) * 20.0);
                 float barkGroove = h1 * h2;

                 vec3 deepBarkColor = vec3(0.08, 0.03, 0.01);
                 vec3 surfaceBarkColor = vec3(0.28, 0.14, 0.08);
                 vec3 baseBark = mix(deepBarkColor, surfaceBarkColor, smoothstep(-0.4, 0.4, barkGroove));

                 // Foliage needles albedo selection based on Green vertex color weight
                 vec3 darkNeedle = vec3(0.03, 0.09, 0.04);
                 vec3 brightNeedle = vec3(0.14, 0.28, 0.11);
                 vec3 foliageColor = mix(darkNeedle, brightNeedle, clamp(vWorldPosVec.y / 90.0, 0.0, 1.0));

                 vec3 finalAlbedo = mix(baseBark, foliageColor, step(0.1, vCustomColorData.g));

                 // Moss layer applied to North-facing surfaces and base flares (Blue channel)
                 float upNorm = clamp(vWorldNormalVec.y, 0.0, 1.0);
                 float mossMask = smoothstep(0.3, 0.8, vCustomColorData.b + upNorm * 0.4);
                 vec3 mossColor = vec3(0.11, 0.26, 0.07);

                 diffuseColor.rgb = mix(finalAlbedo, mossColor, mossMask * 0.75);`
            );
        };

        // --- 2. VOLUMETRIC FOG SYSTEM INTEGRATION ---
        if (window.VolumetricFogSystem?.patchMaterial) {
            window.VolumetricFogSystem.patchMaterial(redwoodMaterial);
        }

        // --- 3. FETCH ARCHETYPES FROM WORKER GENERATOR ---
        if (window.RedwoodGenerator?.init) {
            try {
                await window.RedwoodGenerator.init('src_workers_tree_worker.js');
                const ageStates = ['ANCIENT', 'MATURE', 'YOUNG', 'DYING'];
                ageStates.forEach(ageState => {
                    for (let i = 0; i < 4; i++) {
                        const key = `Redwood_${ageState}_${i}`;
                        const geo = window.RedwoodGenerator.getArchetype(ageState, i);
                        if (geo) {
                            this.geometries.set(key, geo);
                            this.materials.set(key, redwoodMaterial);
                        }
                    }
                });
            } catch (err) {
                console.warn('[ForestRenderer] Redwood Generator init deferred or failed, falling back to legacy primitives:', err);
            }
        }

        // --- 4. LEGACY FALLBACK PREFABS (Backwards Compatibility) ---
        const trunkHeight = 20.0;
        const trunkGeo = new THREE.CylinderGeometry(1.1, 1.8, trunkHeight, 8);
        trunkGeo.translate(0, trunkHeight / 2, 0);

        const coneHeight = 14.0;
        const coneGeo = new THREE.ConeGeometry(5.5, coneHeight, 8);
        coneGeo.translate(0, trunkHeight + coneHeight / 2 - 3.5, 0);

        const utils = window.BufferGeometryUtils || THREE.BufferGeometryUtils;
        const legacyRedwoodGeo = utils?.mergeGeometries ? utils.mergeGeometries([trunkGeo, coneGeo], true) : trunkGeo;

        this.geometries.set('Redwood Tree', legacyRedwoodGeo);
        this.materials.set('Redwood Tree', redwoodMaterial);

        const bushGeo = new THREE.DodecahedronGeometry(1.5, 1);
        bushGeo.translate(0, 1.2, 0);
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.9 });
        this.geometries.set('Bramble Bush', bushGeo);
        this.materials.set('Bramble Bush', bushMat);

        this.assetsInitialized = true;
    }

    /**
     * Initializes an InstancedMesh pool for a given prefab or archetype key.
     */
    initInstancedMesh(prefabName, maxCapacity = 30000) {
        this.ensureAssets();
        if (this.instancedMeshes.has(prefabName)) return;

        const geo = this.geometries.get(prefabName) || new THREE.BoxGeometry(1, 10, 1);
        const mat = this.materials.get(prefabName) || new THREE.MeshStandardMaterial({ color: 0x3d2015 });

        const instMesh = new THREE.InstancedMesh(geo, mat, maxCapacity);
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        instMesh.count = 0;
        instMesh.frustumCulled = true;
        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.instancedMeshes.set(prefabName, instMesh);
        this.instances.set(prefabName, instMesh);
        this.group.add(instMesh);
    }

    /**
     * Updates wind simulation uniforms across all compiled materials.
     * @param {number} delta - Frame delta time in seconds
     */
    update(delta) {
        const time = performance.now() / 1000;
        for (let i = 0; i < this.windUniforms.length; i++) {
            this.windUniforms[i].value = time;
        }
    }

    /**
     * Replaces or updates instance matrices for a given prefab from point data.
     */
    updateInstances(prefabName, points) {
        this.initInstancedMesh(prefabName);
        const instMesh = this.instancedMeshes.get(prefabName);
        if (!instMesh || !points) return;

        let index = 0;
        for (let i = 0; i < points.length; i++) {
            if (index >= instMesh.capacity) break;
            const pt = points[i];

            this.dummyPosition.set(pt.x || 0, pt.y || 0, pt.z || 0);
            this.dummyEuler.set(0, pt.rotation || 0, 0);
            this.dummyQuaternion.setFromEuler(this.dummyEuler);

            const scale = pt.scale || 1.0;
            this.dummyScale.set(scale, scale, scale);

            this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);
            instMesh.setMatrixAt(index, this.dummyMatrix);
            index++;
        }

        instMesh.count = index;
        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
    }

    /**
     * Set chunk instances and trigger an instance buffer rebuild.
     */
    setChunkInstances(chunkKey, prefabName, points) {
        if (!this.chunkInstances.has(chunkKey)) {
            this.chunkInstances.set(chunkKey, new Map());
        }
        this.chunkInstances.get(chunkKey).set(prefabName, points);
        this.rebuildInstances(prefabName);
    }

    /**
     * Clear chunk instance data and rebuild affected instance buffers.
     */
    clearChunkInstances(chunkKey) {
        if (!this.chunkInstances.has(chunkKey)) return;

        const chunkMap = this.chunkInstances.get(chunkKey);
        const affectedPrefabs = Array.from(chunkMap.keys());

        this.chunkInstances.delete(chunkKey);

        affectedPrefabs.forEach(prefabName => {
            this.rebuildInstances(prefabName);
        });
    }

    /**
     * Rebuilds global InstancedMesh buffers from accumulated streaming chunk data.
     */
    rebuildInstances(prefabName) {
        this.initInstancedMesh(prefabName);
        const instMesh = this.instancedMeshes.get(prefabName);
        if (!instMesh) return;

        let index = 0;
        for (const [chunkKey, prefabMap] of this.chunkInstances.entries()) {
            const points = prefabMap.get(prefabName);
            if (!points) continue;

            for (let i = 0; i < points.length; i++) {
                if (index >= instMesh.capacity) break;

                const pt = points[i];
                this.dummyPosition.set(pt.x || 0, pt.y || 0, pt.z || 0);
                this.dummyEuler.set(0, pt.rotation || 0, 0);
                this.dummyQuaternion.setFromEuler(this.dummyEuler);

                const scale = pt.scale || 1.0;
                this.dummyScale.set(scale, scale, scale);

                this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);
                instMesh.setMatrixAt(index, this.dummyMatrix);
                index++;
            }
        }

        instMesh.count = index;
        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
    }
}

// Global scope binding for engine integration
window.ForestRenderer = new ForestRenderer();
export default ForestRenderer;
