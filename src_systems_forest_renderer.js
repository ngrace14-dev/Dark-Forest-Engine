// ============================================================================
// Dark Forest Engine - AAA Instanced Forest & Foliage Shader Renderer
// File: src_systems_forest_renderer.js
// ============================================================================

import * as THREE from 'three';

class ForestRenderer {
    constructor() {
        this.group = new THREE.Group();
        this.materials = new Map();
        this.instancedMeshes = new Map(); // key: chunkKey_prefabKey -> InstancedMesh
        this.initialized = false;

        this.sharedUniforms = {
            uTime: { value: 0 },
            uWindSpeed: { value: 1.2 },
            uSunDirection: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uSunColor: { value: new THREE.Color(0xdbeafe) }
        };
    }

    /**
     * Initializes material assets and injects SSS translucency & bark shaders.
     */
    async ensureAssets() {
        if (this.initialized) return;

        const ageStates = ['ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

        for (const ageState of ageStates) {
            for (let varIdx = 0; varIdx < 4; varIdx++) {
                const prefabKey = `Redwood_${ageState}_${varIdx}`;

                const mat = new THREE.MeshStandardMaterial({
                    color: 0x3d2015,
                    roughness: 0.85,
                    metalness: 0.05,
                    side: THREE.DoubleSide
                });

                // Inject AAA Shaders: SSS Backlight Translucency & Bark Groove Parallax
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

                        // Multi-frequency GPU Wind Simulation driven by color.r (Branch Sway) and color.g (Leaf Flutter)
                        float branchSway = sin(uTime * 1.5 + vWorldPos.x * 0.05 + vWorldPos.z * 0.05) * color.r * 1.2;
                        float leafFlutter = sin(uTime * 8.0 + vWorldPos.y * 0.2) * color.g * 0.35;

                        transformed.x += (branchSway + leafFlutter) * uWindSpeed;
                        transformed.z += (branchSway * 0.5 + leafFlutter) * uWindSpeed;
                        `
                    );

                    shader.fragmentShader = `
                        uniform vec3 uSunDirection;
                        uniform vec3 uSunColor;
                        varying vec3 vWorldPos;
                        varying vec3 vColorAttr;
                        ${shader.fragmentShader}
                    `.replace(
                        `#include <color_fragment>`,
                        `
                        #include <color_fragment>

                        // 1. Bark Base & Moss Masking (color.b)
                        vec3 barkBaseColor = vec3(0.18, 0.09, 0.05);
                        vec3 foliageNeedleColor = vec3(0.08, 0.22, 0.10);
                        vec3 mossColor = vec3(0.12, 0.28, 0.08);

                        if (vColorAttr.g > 0.5) {
                            diffuseColor.rgb = foliageNeedleColor;
                        } else {
                            diffuseColor.rgb = mix(barkBaseColor, mossColor, vColorAttr.b);
                        }

                        // 2. Subsurface Scattering (SSS) Sunlight Translucency on Needles (vColorAttr.g)
                        if (vColorAttr.g > 0.5) {
                            vec3 viewDir = normalize(cameraPosition - vWorldPos);
                            float backLight = max(0.0, dot(-viewDir, uSunDirection));
                            float sssScatter = pow(backLight, 3.5) * 1.8;
                            vec3 sssGlow = uSunColor * vec3(0.35, 0.85, 0.15) * sssScatter;
                            diffuseColor.rgb += sssGlow;
                        }
                        `
                    );
                };

                // Patch with Volumetric Fog System if available
                if (window.VolumetricFogSystem?.patchMaterial) {
                    window.VolumetricFogSystem.patchMaterial(mat);
                }

                this.materials.set(prefabKey, mat);
            }
        }

        this.initialized = true;
        console.log('[ForestRenderer] AAA Hero Materials & SSS Shaders Initialized.');
    }

    /**
     * Uploads instance matrices for a specific chunk and archetype.
     */
    setChunkInstances(chunkKey, prefabKey, points) {
        if (!chunkKey || !prefabKey || !points) return;

        const meshKey = `${chunkKey}_${prefabKey}`;

        // Remove existing instanced mesh if present
        if (this.instancedMeshes.has(meshKey)) {
            const oldMesh = this.instancedMeshes.get(meshKey);
            this.group.remove(oldMesh);
            oldMesh.geometry.dispose();
            this.instancedMeshes.delete(meshKey);
        }

        if (points.length === 0) return;

        // Fetch pre-generated archetype geometry from RedwoodGenerator Web Worker
        let geo = window.RedwoodGenerator?.getArchetypeGeometry?.(prefabKey);

        if (!geo) {
            // Fallback geometry if worker generation is still in flight
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
            dummy.rotation.set(0, p.rotation || 0, 0);
            const scale = p.scale || 1.0;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            imesh.setMatrixAt(i, dummy.matrix);
        });

        imesh.instanceMatrix.needsUpdate = true;
        this.group.add(imesh);
        this.instancedMeshes.set(meshKey, imesh);
    }

    /**
     * Clears all instanced meshes for a chunk when streamed out.
     */
    clearChunkInstances(chunkKey) {
        for (const [meshKey, imesh] of this.instancedMeshes.entries()) {
            if (meshKey.startsWith(`${chunkKey}_`)) {
                this.group.remove(imesh);
                this.instancedMeshes.delete(meshKey);
            }
        }
    }

    /**
     * Updates frame time for multi-frequency GPU wind simulation.
     * @param {number} delta 
     */
    update(delta) {
        const timeSecs = performance.now() / 1000;
        this.sharedUniforms.uTime.value = timeSecs;

        if (window.VolumetricFogSystem?.fogUniforms?.uSunDirection) {
            this.sharedUniforms.uSunDirection.value.copy(window.VolumetricFogSystem.fogUniforms.uSunDirection.value);
            this.sharedUniforms.uSunColor.value.copy(window.VolumetricFogSystem.fogUniforms.uSunColor.value);
        }
    }
}

// Global Singleton Binding
window.ForestRenderer = new ForestRenderer();
export default window.ForestRenderer;
