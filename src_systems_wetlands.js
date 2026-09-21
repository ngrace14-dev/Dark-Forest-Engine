// ============================================================================
// Dark Forest Engine - Wetlands & Submerged Marsh System
// File: src_systems_wetlands.js
// ============================================================================

import * as THREE from 'three';

export class WetlandsSystem {
    constructor(engine, maxInstances = 300000) {
        this.engine = engine;
        this.maxInstances = maxInstances;
        this.time = 0;
        this.initialized = false;
        this.marshChunks = [];

        // Shared uniform objects across all material instances
        this.sharedUniforms = {
            uTime: { value: 0 },
            uCameraPos: { value: new THREE.Vector3() },
            uWaterLevel: { value: 0.0 }
        };

        this.initMaterials();
        this.initGeometries();
        this.bindEvents();
    }

    /**
     * Binds engine lifecycle event listeners.
     */
    bindEvents() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => {
                if (window.GameCore?.scene && !this.initialized) {
                    this.init(window.GameCore.scene);
                }
            });

            window.EventBus.on('WORLD_REGENERATE', () => {
                this.clearAll();
            });
        }
    }

    /**
     * System initialization hook.
     * @param {THREE.Scene} scene 
     */
    init(scene) {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[WetlandsSystem] Initialized successfully.');
    }

    /**
     * Initializes standard PBR materials and GLSL shader hooks.
     */
    initMaterials() {
        // --- 1. SUBMERGED MANGROVE ROOT MATERIAL ---
        this.rootMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.7,
            metalness: 0.1
        });

        this.rootMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.sharedUniforms);

            shader.vertexShader = `
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                #endif
                `
            );

            shader.fragmentShader = `
                uniform float uWaterLevel;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec3 dX = dFdx(vWorldPos * 10.0);
                vec3 dY = dFdy(vWorldPos * 10.0);
                vec3 bumpNormal = normalize(cross(dX, dY));
                vec3 finalNormal = normalize(mix(vNormal, bumpNormal, 0.4));

                vec3 dryMossColor = vec3(0.18, 0.25, 0.12);
                vec3 submergedRootColor = vec3(0.12, 0.08, 0.05);
                
                float depthFactor = (uWaterLevel - vWorldPos.y) * 2.0; 
                float blendRatio = smoothstep(-0.5, 0.5, depthFactor);

                diffuseColor.rgb = mix(dryMossColor, submergedRootColor, blendRatio);
                diffuseColor.rgb *= mix(1.0, 0.6, blendRatio); 
                `
            ).replace(
                '#include <roughnessmap_fragment>',
                `
                #include <roughnessmap_fragment>
                float depthFactorR = (uWaterLevel - vWorldPos.y) * 2.0; 
                float blendRatioR = smoothstep(-0.5, 0.5, depthFactorR);
                roughnessFactor = mix(0.8, 0.2, blendRatioR); 
                `
            );
        };

        // --- 2. WATER & MUD SURFACE MATERIAL ---
        this.waterMudMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2520, 
            roughness: 0.1,  
            metalness: 0.05,
            transparent: true,
            opacity: 0.95
        });

        this.waterMudMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.sharedUniforms);

            shader.vertexShader = `
                uniform float uTime;
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                float puddleSink = sin(vWorldPos.x * 0.2) * cos(vWorldPos.z * 0.2);
                float displacement = smoothstep(0.2, 0.8, puddleSink) * 0.5; 
                transformed.y -= displacement;
                `
            );

            shader.fragmentShader = `
                uniform float uTime;
                uniform vec3 uCameraPos;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                float rippleNoise = sin(vWorldPos.x * 8.0 + uTime * 2.0) * cos(vWorldPos.z * 8.0 + uTime * 1.5);
                vec3 surfaceDx = dFdx(vec3(vWorldPos.x, rippleNoise * 0.1, vWorldPos.z));
                vec3 surfaceDy = dFdy(vec3(vWorldPos.x, rippleNoise * 0.1, vWorldPos.z));
                vec3 rippleNormal = normalize(cross(surfaceDx, surfaceDy));

                float waterDepth = smoothstep(0.1, -0.4, vWorldPos.y); 
                vec3 mudColor = vec3(0.15, 0.12, 0.08);
                vec3 waterColor = vec3(0.1, 0.12, 0.15); 
                
                diffuseColor.rgb = mix(mudColor, waterColor, waterDepth);
                
                float distToCam = distance(vWorldPos, uCameraPos);
                diffuseColor.a *= 1.0 - smoothstep(2500.0, 3000.0, distToCam);
                `
            );
        };

        // Patch materials with Volumetric Fog if active
        if (typeof window !== 'undefined' && window.VolumetricFogSystem?.patchMaterial) {
            window.VolumetricFogSystem.patchMaterial(this.rootMaterial);
            window.VolumetricFogSystem.patchMaterial(this.waterMudMaterial);
        }
    }

    /**
     * Initializes geometries used for marsh surfaces and instanced root systems.
     */
    initGeometries() {
        this.marshPlaneGeo = new THREE.PlaneGeometry(100, 100, 64, 64);
        this.marshPlaneGeo.rotateX(-Math.PI / 2);
        this.rootGeo = new THREE.TetrahedronGeometry(1.5, 2); 
    }

    /**
     * Spawns a wetlands marsh chunk.
     * @param {THREE.Scene} scene 
     * @param {number} centerX 
     * @param {number} centerZ 
     * @param {number} baseWaterLevel 
     * @returns {THREE.Group}
     */
    spawnWetlandsChunk(scene, centerX, centerZ, baseWaterLevel = 0.0) {
        if (!scene) return null;

        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        const mudPlane = new THREE.Mesh(this.marshPlaneGeo, this.waterMudMaterial);
        mudPlane.position.y = baseWaterLevel;
        mudPlane.receiveShadow = true;
        chunkGroup.add(mudPlane);

        const instanceCount = 5000; 
        const rootInstances = new THREE.InstancedMesh(this.rootGeo, this.rootMaterial, instanceCount);
        rootInstances.castShadow = true;
        rootInstances.receiveShadow = true;

        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < instanceCount; i++) {
            const wx = (Math.random() - 0.5) * 100;
            const wz = (Math.random() - 0.5) * 100;
            const wy = baseWaterLevel + (Math.random() - 0.6) * 2.0; 

            dummy.position.set(wx, wy, wz);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.scale.set(1.0 + Math.random(), 0.5 + Math.random(), 1.0 + Math.random());
            dummy.updateMatrix();
            
            rootInstances.setMatrixAt(i, dummy.matrix);
        }

        rootInstances.instanceMatrix.needsUpdate = true;
        rootInstances.computeBoundingSphere();
        chunkGroup.add(rootInstances);

        scene.add(chunkGroup);
        this.marshChunks.push({ group: chunkGroup, rootInstances });
        
        return chunkGroup;
    }

    /**
     * Updates frame uniforms, time counters, and camera tracking.
     * @param {number} delta 
     * @param {THREE.Camera} camera 
     */
    update(delta, camera) {
        this.time += delta;
        this.sharedUniforms.uTime.value = this.time;

        if (camera && camera.position) {
            this.sharedUniforms.uCameraPos.value.copy(camera.position);
        }
    }

    /**
     * Clears all wetlands marsh chunks and disposes of allocated resources.
     */
    clearAll() {
        this.marshChunks.forEach(chunk => {
            if (chunk.group) {
                chunk.group.traverse(child => {
                    if (child.isMesh || child.isInstancedMesh) {
                        child.geometry?.dispose();
                    }
                });
                if (chunk.group.parent) {
                    chunk.group.parent.remove(chunk.group);
                }
            }
        });
        this.marshChunks = [];
    }
}

// Global Singleton Binding
if (typeof window !== 'undefined') {
    window.WetlandsSystem = WetlandsSystem;
}
export default WetlandsSystem;
