// ============================================================================
// Dark Forest Engine - Recalibrated Canopy Shading & Instanced Renderer
// File: src/systems/forest_renderer.js
// ============================================================================

import * as THREE from 'three';
import { createForestFloorMaterial } from './block_terrain.js'; // Phase 3 FIX: Import explicit floor material

class ForestRenderer {
    constructor() {
        this.group = new THREE.Group();
        this.materials = new Map();
        this.instancedMeshes = new Map();
        this.terrainMeshes = new Map(); // Phase 3 FIX: Track terrain chunks
        this.forestFloorMaterial = null; // Phase 3 FIX: Cached floor material
        this.initialized = false;

        this.sharedUniforms = {
            uTime: { value: 0 },
            uWindSpeed: { value: 1.0 },
            uSunDirection: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uSunColor: { value: new THREE.Color(0xfef3c7) },
            uRawDebugMode: { value: 0.0 }
        };
    }

    async ensureAssets() {
        if (this.initialized) return;

        const ageStates = ['COLOSSAL_ANCIENT', 'ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

        for (const ageState of ageStates) {
            for (let varIdx = 0; varIdx < 4; varIdx++) {
                const prefabKey = `Redwood_${ageState}_${varIdx}`;

                const mat = new THREE.MeshStandardMaterial({
                    color: 0x3d2015,
                    roughness: 0.82,
                    metalness: 0.03,
                    side: THREE.DoubleSide,
                    alphaTest: 0.18
                });

                mat.onBeforeCompile = (shader) => {
                    Object.assign(shader.uniforms, this.sharedUniforms);

                    shader.vertexShader = `
                        uniform float uTime;
                        uniform float uWindSpeed;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        ${shader.vertexShader}
                    `.replace(
                        `#include <begin_vertex>`,
                        `
                        #include <begin_vertex>
                        vColorAttr = color;

                        #ifdef USE_INSTANCING
                            vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                        #else
                            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                        #endif

                        float branchSway = sin(uTime * 1.2 + vWorldPos.x * 0.04 + vWorldPos.z * 0.04) * color.r * 0.8;
                        float leafFlutter = sin(uTime * 6.0 + vWorldPos.y * 0.15) * color.g * 0.20;

                        transformed.x += (branchSway + leafFlutter) * uWindSpeed;
                        transformed.z += (branchSway * 0.5 + leafFlutter) * uWindSpeed;
                        `
                    );

                    shader.fragmentShader = `
                        uniform vec3 uSunDirection;
                        uniform vec3 uSunColor;
                        uniform float uRawDebugMode;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        ${shader.fragmentShader}
                    `.replace(
                        `#include <color_fragment>`,
                        `
                        #include <color_fragment>

                        vec3 barkBaseColor = vec3(0.16, 0.08, 0.04);
                        vec3 foliageNeedleColor = vec3(0.06, 0.18, 0.08);
                        vec3 mossColor = vec3(0.09, 0.22, 0.06);

                        if (vColorAttr.g > 0.5) {
                            diffuseColor.rgb = foliageNeedleColor;
                        } else {
                            diffuseColor.rgb = mix(barkBaseColor, mossColor, vColorAttr.b);
                        }

                        if (vColorAttr.g > 0.5 && uRawDebugMode < 0.5) {
                            vec3 viewDir = normalize(cameraPosition - vWorldPos);
                            float backLight = max(0.0, dot(-viewDir, uSunDirection));
                            float sssScatter = pow(backLight, 4.0) * 0.65;
                            vec3 sssGlow = uSunColor * vec3(0.20, 0.55, 0.10) * sssScatter;
                            diffuseColor.rgb += sssGlow;
                        }
                        `
                    );
                };

                if (window.VolumetricFogSystem?.patchMaterial) {
                    window.VolumetricFogSystem.patchMaterial(mat);
                }

                this.materials.set(prefabKey, mat);
            }
        }

        this.initialized = true;
        console.log('[ForestRenderer] Foliage shading & bloom-clamped materials loaded.');
    }

    // Phase 3 FIX: Enforce forest floor material binding on chunk mesh instantiation
    setTerrainMesh(chunkKey, geometry) {
        if (!this.forestFloorMaterial) {
            // Lazy load and cache the specialized duff/humus shader material
            this.forestFloorMaterial = createForestFloorMaterial();
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

    setChunkInstances(chunkKey, prefabKey, points) {
        if (!chunkKey || !prefabKey || !points || points.length === 0) return;

        const meshKey = `${chunkKey}_${prefabKey}`;

        if (this.instancedMeshes.has(meshKey)) {
            const oldMesh = this.instancedMeshes.get(meshKey);
            this.group.remove(oldMesh);
            oldMesh.geometry.dispose();
            this.instancedMeshes.delete(meshKey);
        }

        let geo = window.RedwoodGenerator?.getArchetypeGeometry?.(prefabKey);
        if (!geo) {
            geo = new THREE.CylinderGeometry(0.5, 2.5, 40, 12);
            geo.translate(0, 20, 0);
        }

        const mat = this.materials.get(prefabKey) || new THREE.MeshStandardMaterial({ color: 0x3d2015 });
        const imesh = new THREE.InstancedMesh(geo, mat, points.length);

        imesh.castShadow = true;
        imesh.receiveShadow = true;

        const dummy = new THREE.Object3D();

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
        });

        imesh.instanceMatrix.needsUpdate = true;
        this.group.add(imesh);
        this.instancedMeshes.set(meshKey, imesh);
    }

    clearChunkInstances(chunkKey) {
        for (const [meshKey, imesh] of this.instancedMeshes.entries()) {
            if (meshKey.startsWith(`${chunkKey}_`)) {
                this.group.remove(imesh);
                this.instancedMeshes.delete(meshKey);
            }
        }
    }

    update(delta) {
        const timeSecs = performance.now() / 1000;
        this.sharedUniforms.uTime.value = timeSecs;
    }
}

window.ForestRenderer = new ForestRenderer();
export default window.ForestRenderer;
