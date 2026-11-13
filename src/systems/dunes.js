// ============================================================================
// Dark Forest Engine - Dunes & Desert Oasis System
// File: src_systems_dunes.js
// ============================================================================

import * as THREE from 'three';

export class DunesSystem {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;
        this.epochState = 0.0;
        this.initialized = false;
        this.duneChunks = [];

        // Shared uniform objects across all material instances
        this.sharedUniforms = {
            uCameraPos: { value: new THREE.Vector3() },
            uEpochState: { value: 0.0 }
        };

        this.initMaterials();
        this.initGeometries();
        this.bindEvents();
    }

    /**
     * Binds engine lifecycle event listeners.
     */
    bindEvents() {
        window.EventBus?.on('ENGINE_READY', () => {
            if (window.GameCore?.scene && !this.initialized) {
                this.init(window.GameCore.scene);
            }
        });

        window.EventBus?.on('WORLD_REGENERATE', () => {
            this.clearAll();
        });
    }

    /**
     * System initialization hook.
     * @param {THREE.Scene} scene 
     */
    init(scene) {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[DunesSystem] Initialized successfully.');
    }

    /**
     * Initializes standard PBR materials and GLSL shader hooks.
     */
    initMaterials() {
        // --- 1. DUNE SAND MATERIAL ---
        this.duneMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.95,
            metalness: 0.0,
            transparent: true
        });

        this.duneMaterial.onBeforeCompile = (shader) => {
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
                uniform vec3 uCameraPos;
                uniform float uEpochState;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec3 dX = dFdx(vWorldPos * 3.0);
                vec3 dY = dFdy(vWorldPos * 3.0);
                vec3 derivedNormal = normalize(cross(dX, dY));
                
                vec3 finalNormal = normalize(mix(vNormal, derivedNormal, 0.8));

                vec3 dampMudColor = vec3(0.25, 0.20, 0.15);
                vec3 drySandColor = vec3(0.76, 0.69, 0.50);
                
                float heightBlend = smoothstep(-2.0, 6.0, vWorldPos.y);
                vec3 surfaceColor = mix(dampMudColor, drySandColor, heightBlend);

                float crevice = 1.0 - max(0.0, finalNormal.y);
                vec3 decayColor = vec3(0.22, 0.26, 0.15); 
                
                float decayAmount = smoothstep(0.4, 0.8, crevice) * (0.5 + sin(uEpochState) * 0.5);
                diffuseColor.rgb = mix(surfaceColor, decayColor, decayAmount);

                float distToCam = distance(vWorldPos, uCameraPos);
                diffuseColor.a *= 1.0 - smoothstep(2500.0, 3000.0, distToCam);
                `
            );
        };

        // Patch with Volumetric Fog if available
        if (window.VolumetricFogSystem?.patchMaterial) {
            window.VolumetricFogSystem.patchMaterial(this.duneMaterial);
        }

        // --- 2. OASIS WATER MATERIAL ---
        this.oasisMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2b22, 
            roughness: 0.05,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });

        this.oasisMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.sharedUniforms);

            shader.vertexShader = `
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                `
            );

            shader.fragmentShader = `
                uniform vec3 uCameraPos;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec3 viewDir = normalize(uCameraPos - vWorldPos);
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
                
                vec3 skyReflectColor = vec3(0.65, 0.70, 0.60); 
                diffuseColor.rgb = mix(diffuseColor.rgb, skyReflectColor, fresnel * 0.8);
                `
            );
        };

        // --- 3. DESERT SCRUB MATERIAL ---
        this.scrubMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d4a2b, 
            roughness: 0.8,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            transparent: false
        });

        this.scrubMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                varying float vHeight;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vHeight = uv.y;
                `
            );

            shader.fragmentShader = `
                varying float vHeight;
                ${shader.fragmentShader}
            `.replace(
                '#include <lights_fragment_begin>',
                `
                #include <lights_fragment_begin>
                #if NUM_DIR_LIGHTS > 0
                    float backLight = max(0.0, dot(-normal, directionalLights[0].direction));
                    float sssScatter = pow(backLight, 3.0) * 0.4;
                    vec3 sssGlow = directionalLights[0].color * vec3(0.7, 0.8, 0.2) * sssScatter * vHeight;
                    reflectedLight.directDiffuse += sssGlow;
                #endif
                `
            );
        };
    }

    /**
     * Initializes primitive geometries used for instanced dune scattering.
     */
    initGeometries() {
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        this.cubeGeo.translate(0, 0.5, 0); 
        this.wedgeGeo = new THREE.CylinderGeometry(1, 1, 1, 3);
        this.wedgeGeo.rotateZ(Math.PI / 2); 
        this.wedgeGeo.translate(0, 0.5, 0);
        this.oasisGeo = new THREE.PlaneGeometry(60, 60, 16, 16);
        this.oasisGeo.rotateX(-Math.PI / 2);
        this.scrubGeo = new THREE.PlaneGeometry(1.5, 1.5, 1, 2);
        this.scrubGeo.translate(0, 0.75, 0);
    }

    /**
     * Spawns a procedural dune chunk group in the scene.
     * @param {THREE.Scene} scene 
     * @param {number} centerX 
     * @param {number} centerZ 
     * @returns {THREE.Group}
     */
    spawnDuneChunk(scene, centerX, centerZ) {
        if (!scene) return null;

        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        const duneClusters = 15;
        const cubesPerCluster = 8;
        const wedgesPerCluster = 8;

        const totalCubes = duneClusters * cubesPerCluster;
        const totalWedges = duneClusters * wedgesPerCluster;

        const instancedCubes = new THREE.InstancedMesh(this.cubeGeo, this.duneMaterial, totalCubes);
        const instancedWedges = new THREE.InstancedMesh(this.wedgeGeo, this.duneMaterial, totalWedges);
        
        instancedCubes.castShadow = true; 
        instancedCubes.receiveShadow = true;
        instancedWedges.castShadow = true; 
        instancedWedges.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let cubeIdx = 0;
        let wedgeIdx = 0;

        for (let c = 0; c < duneClusters; c++) {
            const clusterX = (Math.random() - 0.5) * 80;
            const clusterZ = (Math.random() - 0.5) * 80;
            const clusterScale = 5 + Math.random() * 10;
            const clusterRot = Math.random() * Math.PI * 2;

            for (let i = 0; i < cubesPerCluster; i++) {
                dummy.position.set(
                    clusterX + (Math.random() - 0.5) * clusterScale,
                    -1.0, 
                    clusterZ + (Math.random() - 0.5) * clusterScale
                );
                dummy.rotation.set(0, clusterRot + (Math.random() - 0.5) * 0.5, 0);
                dummy.scale.set(clusterScale * 0.8, clusterScale * Math.random(), clusterScale * 0.8);
                dummy.updateMatrix();
                instancedCubes.setMatrixAt(cubeIdx++, dummy.matrix);
            }

            for (let i = 0; i < wedgesPerCluster; i++) {
                dummy.position.set(
                    clusterX + (Math.random() - 0.5) * (clusterScale * 1.5),
                    -1.0,
                    clusterZ + (Math.random() - 0.5) * (clusterScale * 1.5)
                );
                dummy.rotation.set(0, clusterRot + (Math.random() > 0.5 ? 0 : Math.PI), 0);
                dummy.scale.set(clusterScale, clusterScale * 0.6, clusterScale);
                dummy.updateMatrix();
                instancedWedges.setMatrixAt(wedgeIdx++, dummy.matrix);
            }
        }

        instancedCubes.instanceMatrix.needsUpdate = true;
        instancedWedges.instanceMatrix.needsUpdate = true;
        chunkGroup.add(instancedCubes);
        chunkGroup.add(instancedWedges);

        const oasis = new THREE.Mesh(this.oasisGeo, this.oasisMaterial);
        oasis.position.y = -0.5; 
        chunkGroup.add(oasis);

        const scrubInstances = new THREE.InstancedMesh(this.scrubGeo, this.scrubMaterial, 3000);
        scrubInstances.castShadow = true;
        
        for (let i = 0; i < 3000; i++) {
            dummy.position.set(
                (Math.random() - 0.5) * 100,
                0, 
                (Math.random() - 0.5) * 100
            );
            dummy.rotation.set(0, Math.random() * Math.PI, 0);
            const scale = 0.5 + Math.random() * 0.8;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            scrubInstances.setMatrixAt(i, dummy.matrix);
        }
        scrubInstances.instanceMatrix.needsUpdate = true;
        chunkGroup.add(scrubInstances);

        scene.add(chunkGroup);
        this.duneChunks.push(chunkGroup);
        return chunkGroup;
    }

    /**
     * Updates frame time uniforms, camera tracking vectors, and epoch states.
     * @param {number} delta 
     * @param {THREE.Camera} camera 
     * @param {number} worldDay 
     */
    update(delta, camera, worldDay = 0) {
        this.time += delta;
        this.epochState = (worldDay % 14) / 14.0 * Math.PI * 2.0;

        if (camera && camera.position) {
            this.sharedUniforms.uCameraPos.value.copy(camera.position);
        }
        this.sharedUniforms.uEpochState.value = this.epochState;
    }

    /**
     * Clears all dune chunks and disposes of Three.js objects.
     */
    clearAll() {
        this.duneChunks.forEach(chunkGroup => {
            chunkGroup.traverse(child => {
                if (child.isMesh || child.isInstancedMesh) {
                    child.geometry?.dispose();
                }
            });
            if (chunkGroup.parent) {
                chunkGroup.parent.remove(chunkGroup);
            }
        });
        this.duneChunks = [];
    }
}

// Global Singleton Binding
window.DunesSystem = DunesSystem;
