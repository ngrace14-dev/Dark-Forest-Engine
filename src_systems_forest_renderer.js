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
                                trunkMat.onBeforeCompile = (shader) => {
                    Object.assign(shader.uniforms, this.sharedUniforms);
                    // Minimal sway for trunk (taken from previous standard material vertex block)
                    shader.vertexShader = `
                        uniform float uTime;
                        uniform float uWindSpeed;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        varying vec2 vTrunkUv;
                        ${shader.vertexShader}
                    `.replace(
                        `#include <begin_vertex>`,
                        `
                        #include <begin_vertex>
                        vColorAttr = color;
                        vTrunkUv = uv;

                        #ifdef USE_INSTANCING
                            vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                        #else
                            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                        #endif

                        float branchSway = sin(uTime * 1.2 + vWorldPos.x * 0.04 + vWorldPos.z * 0.04) * color.r * 0.8;
                        transformed.x += branchSway * uWindSpeed;
                        transformed.z += (branchSway * 0.5) * uWindSpeed;
                        `
                    );
                    
                                        shader.fragmentShader = `
                        uniform vec3 uForestSunDir;
                        uniform vec3 uForestSunCol;
                        uniform float uRawDebugMode;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        varying vec2 vTrunkUv;
                        
                        // 1. Procedural Bark Height Generator
                        float getBarkBump(vec2 trunkUV, float worldY) {
                            // High-frequency anisotropic bark ridges
                            // U wraps 8 times around the trunk, V is raw height
                            
                            // Slow low-frequency wave to cause plates to drift/weave vertically
                            float weave = sin(trunkUV.y * 0.15) * 0.2;
                            
                            // Fast vertical plates
                            float platesA = sin(trunkUV.x * 24.0 + weave);
                            float platesB = sin(trunkUV.x * 15.0 - weave);
                            
                                                                                                                // Splitting/merging interference pattern
                            float interference = (platesA + platesB) * 0.5;
                            
                            // Soften terracing: Restore continuous normal derivatives across the plate
                            float barkShape = 1.0 - pow(abs(interference), 0.7);
                            
                            // Fade depth based on height (older bark at base is deeper)
                            float ageFade = clamp(1.0 - (worldY * 0.015), 0.2, 1.0);
                            
                            // Add micro-noise for splintered fiber texture
                            float microFibers = sin(trunkUV.x * 120.0) * cos(trunkUV.y * 40.0) * 0.05;
                            
                            return (barkShape + microFibers) * ageFade;
                        }

                        ${shader.fragmentShader}
                    `.replace(
                        `#include <normal_fragment_begin>`,
                        `
                        #include <normal_fragment_begin>
                        
                        // 2. Compute screen-space bark derivatives
                        float barkVal = getBarkBump(vTrunkUv, vWorldPos.y);
                        float dbdx = dFdx(barkVal);
                        float dbdy = dFdy(barkVal);
                        
                        vec3 vPdx = dFdx(vViewPosition);
                        vec3 vPdy = dFdy(vViewPosition);
                        
                        vec3 rx = cross(vPdy, normal);
                        vec3 ry = cross(normal, vPdx);
                        
                        float det = dot(vPdx, rx);
                        
                                                // 3. Distance fade to prevent shimmering
                                                float dist = length(vViewPosition);
                                                float bumpIntensity = smoothstep(100.0, 15.0, dist) * 1.5;
                        
                                                vec3 bumpNormal = (rx * dbdx + ry * dbdy) * sign(det) / max(abs(det), 1e-7);
                                                normal = normalize(normal - bumpNormal * bumpIntensity);
                                                `
                    ).replace(
                                                `#include <color_fragment>`,
                                                `
                                                #include <color_fragment>

                                                vec3 barkBaseColor = vec3(0.16, 0.08, 0.04);
                                                vec3 mossColor = vec3(0.09, 0.22, 0.06);

                                                float barkVal = getBarkBump(vTrunkUv, vWorldPos.y);
                        
                                                // Fake Ambient Occlusion: Darken the deep crevices so they read despite high ambient light
                                                float creviceAO = mix(0.4, 1.0, barkVal);
                                                barkBaseColor *= creviceAO;
                                                mossColor *= creviceAO;

                                                diffuseColor.rgb = mix(barkBaseColor, mossColor, vColorAttr.b);
                                                `
                    );
                };
                
                canopyMat.onBeforeCompile = (shader) => {
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
                        float leafFlutter = sin(uTime * 6.0 + vWorldPos.y * 0.15) * 0.20; // foliage relies entirely on leaf flutter over base branch sway

                        transformed.x += (branchSway + leafFlutter) * uWindSpeed;
                        transformed.y += leafFlutter * uWindSpeed;
                        transformed.z += (branchSway * 0.5 + leafFlutter) * uWindSpeed;
                        `
                    );

                    shader.fragmentShader = `
                        uniform vec3 uForestSunDir;
                        uniform vec3 uForestSunCol;
                        uniform float uRawDebugMode;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        ${shader.fragmentShader}
                    `.replace(
                        `#include <color_fragment>`,
                        `
                        #include <color_fragment>

                        vec3 foliageNeedleColor = vec3(0.06, 0.18, 0.08);
                        diffuseColor.rgb = foliageNeedleColor;

                        if (uRawDebugMode < 0.5) {
                            vec3 viewDir = normalize(cameraPosition - vWorldPos);
                            float backLight = max(0.0, dot(-viewDir, uForestSunDir));
                            float sssScatter = pow(backLight, 4.0) * 0.65;
                            vec3 sssGlow = uForestSunCol * vec3(0.20, 0.55, 0.10) * sssScatter;
                            diffuseColor.rgb += sssGlow;
                        }
                        `
                    );
                };

                this.materials.set(prefabKey, [trunkMat, canopyMat]);
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
            geo = window.RedwoodGenerator?.getArchetypeGeometry?.(prefabKey);
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
            // FIX: Suppress logs for missing procedural trees, only warn for missing 3D models
            if (!prefabKey.startsWith('Redwood_')) {
                console.warn(`[ForestRenderer] Missing geometry for "${prefabKey}". Deploying low-profile fallback.`);
            }
            if (prefabKey.includes('Fern') || prefabKey.includes('Shrub') || prefabKey.includes('Moss')) {
                geo = new THREE.BoxGeometry(1.8, 0.8, 1.8);
                geo.translate(0, 0.4, 0);
            } else {
                geo = new THREE.CylinderGeometry(0.5, 2.5, 40, 12);
                geo.translate(0, 20, 0);
            }
            geo.isShared = true;
        }

        const mat = this.materials.get(prefabKey) || new THREE.MeshStandardMaterial({ color: 0x2d3a29 });
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
