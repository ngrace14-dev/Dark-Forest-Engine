import * as THREE from 'three';


import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class GrassSystem {
    constructor() {
        this.time = 0;
        this.initialized = false;
        this.scene = null;
        this.grassChunks = new Map();
        
        this.initGeometry();
        this.initMaterials();
    }

    init(scene) {
        if (this.initialized) return;
        this.scene = scene;
        this.initialized = true;
        console.log('[GrassSystem] Gothic Forest Floor Proto Initialized.');
    }

        initGeometry() {
        // 1 grass mesh
        const tuftParts = [];
        for(let i=0; i<5; i++) {
            const blade = new THREE.ConeGeometry(0.08, 1.5, 3);
            blade.rotateX((Math.random()-0.5)*0.5);
            blade.translate((Math.random()-0.5)*0.3, 0.75, (Math.random()-0.5)*0.3);
            tuftParts.push(blade);
        }
        this.grassGeo = BufferGeometryUtils.mergeGeometries(tuftParts);
    }

                initMaterials() {
                    // Shared Opaque Standard Material (Zero Transparency, Zero Alpha Cards)
                    this.floorMaterial = new THREE.MeshStandardMaterial({
                        color: 0x1a2b1a, 
                        roughness: 0.9,
                        metalness: 0.0,
                        flatShading: true,
                        vertexColors: true 
                    });

            this.floorMaterial.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                shader.uniforms.uPlayerPos = { value: new THREE.Vector3() };

                // Store uniform references for updating later
                this.shaderUniforms = shader.uniforms;

                shader.vertexShader = `
                    uniform float uTime;
                    uniform vec3 uPlayerPos;
                    varying float vY;
                    varying vec3 vDebugColor;
                    ${shader.vertexShader}
                `.replace('#include <begin_vertex>', `
                    #include <begin_vertex>
                    vY = position.y;
                    vDebugColor = color;
                    
                    // Wind Sway Shader
                    // one low-frequency wave, one small detail wave
                    // wind sway using one cheap wave
                    // looks alive, not physically accurate
                    vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                    
                    // Root-anchored bending (vY controls how much it bends, 0 at root, 1 at tip)
                    float heightFactor = vY; 
                    float sway = sin(worldPos.x * 0.15 + uTime * 0.7) * heightFactor * 0.2;
                    transformed.x += sway;
                    
                                        // Interactive Grass Parting (player position, radius, affect upper third)
                    float distanceToPlayer = distance(worldPos.xz, uPlayerPos.xz);
                    float partingRadius = 1.5;
                    float falloff = smoothstep(partingRadius, 0.0, distanceToPlayer);
                    
                    // Only part the upper third of the blade
                    float partFactor = smoothstep(0.3, 1.0, vY);
                    
                    if (falloff > 0.0 && partFactor > 0.0) {
                        vec2 bendDir = normalize(worldPos.xz - uPlayerPos.xz);
                        transformed.x += bendDir.x * falloff * partFactor * 0.5;
                        transformed.z += bendDir.y * falloff * partFactor * 0.5;
                    }
                    
                    // Distance fade for animation
                    float distToCam = distance(worldPos.xyz, cameraPosition);
                    float animFade = 1.0 - smoothstep(20.0, 40.0, distToCam);
                    
                    transformed.x = mix(position.x, transformed.x, animFade);
                    transformed.z = mix(position.z, transformed.z, animFade);
                `);
                                shader.fragmentShader = `
                    varying float vY;
                    varying vec3 vDebugColor;
                    ${shader.fragmentShader}
                `.replace('#include <color_fragment>', `
                    #include <color_fragment>
                    diffuseColor.rgb = vDebugColor;
                    // Add top-down gradient for volume
                    diffuseColor.rgb *= mix(0.7, 1.0, vY);
                `);
            };
        }

        spawnFloorPatch(chunkKey, cx, cz, biomeKey, clusterPoints = [], roadPoints = []) {
        if (!this.initialized || !this.scene) return;
        if (this.grassChunks.has(chunkKey)) return;

                // --- 1. DENSITY ALLOCATION ---
        let baseDensity = 50;
        if (biomeKey === 'redwoods') baseDensity = 4000;
        else if (biomeKey === 'valley') baseDensity = 2000;

        const totalGrass = baseDensity;
        
        const group = new THREE.Group();
        const grassMesh = new THREE.InstancedMesh(this.grassGeo, this.floorMaterial, totalGrass);

                        // --- DEBUG COLORS ---
        const colors = [
            new THREE.Color(0x2d4c1e), // Dark green
            new THREE.Color(0x3a5a24), // Medium green
            new THREE.Color(0x4a6b2d), // Lighter green
            new THREE.Color(0x556b2f)  // Dark olive green
        ];

                const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        let gIdx = 0;
        const chunkX = cx * 60 + 30;
        const chunkZ = cz * 60 + 30;

        // --- 2. ROOT ACCENTS & CLUSTERED PLACEMENT ---
        clusterPoints.forEach(pt => {
            const clusterSize = 16 + Math.floor(Math.random() * 12);
            for (let i = 0; i < clusterSize; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1.0 + Math.random() * 5.0;
                const wx = pt.x + Math.cos(angle) * dist;
                const wz = pt.z + Math.sin(angle) * dist;
                const wy = getTerrainY(wx, wz);

                if (gIdx < totalGrass) {
                    dummy.position.set(wx, wy + 0.1, wz); 
                    dummy.rotation.x = (Math.random() - 0.5) * 0.6; // Aggressive organic lean
                    dummy.rotation.z = (Math.random() - 0.5) * 0.6;
                    dummy.rotation.y = Math.random() * Math.PI * 2;
                    dummy.scale.set(1.2 + Math.random() * 0.8, 0.8 + Math.random(), 1.2 + Math.random() * 0.8);
                    dummy.updateMatrix();
                    grassMesh.setMatrixAt(gIdx++, dummy.matrix);
                    
                                        // Variation logic
                    const randColor = Math.random();
                    if (randColor < 0.4) grassMesh.setColorAt(gIdx - 1, colors[0]);
                    else if (randColor < 0.8) grassMesh.setColorAt(gIdx - 1, colors[1]);
                    else if (randColor < 0.9) grassMesh.setColorAt(gIdx - 1, colors[2]);
                    else grassMesh.setColorAt(gIdx - 1, colors[3]);
                }
            }
        });

        // --- 3. LAYERED SCATTER (PATCHY COVERAGE) ---
        const getPatchDensity = (x, z) => {
            const n = Math.sin(x * 0.05) * Math.cos(z * 0.05) + 
                      Math.sin(x * 0.15) * 0.5 + 
                      Math.cos(z * 0.12) * 0.5;
            return (n + 1.0) * 0.5;
        };

        let attempts = 0;
        const remainingGrass = totalGrass - gIdx;
        const maxAttempts = remainingGrass * 4;

        while (gIdx < totalGrass && attempts < maxAttempts) {
            attempts++;
            const wx = chunkX + (Math.random() - 0.5) * 60;
            const wz = chunkZ + (Math.random() - 0.5) * 60;
            
            const patchMask = getPatchDensity(wx, wz);
            if (Math.random() > patchMask) continue;

            let coverageMod = 1.0;
            if (roadPoints && roadPoints.length > 0) {
                let minDistSq = 10000.0;
                roadPoints.forEach(rp => {
                    const d2 = Math.pow(wx - rp.x, 2) + Math.pow(wz - rp.z, 2);
                    if (d2 < minDistSq) minDistSq = d2;
                });
                if (minDistSq < 16.0) coverageMod = 0.1; 
                else if (minDistSq < 64.0) coverageMod = 0.4;
            }
            if (Math.random() > coverageMod) continue;

            const wy = getTerrainY(wx, wz);

            dummy.position.set(wx, wy + 0.05, wz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.rotation.x = (Math.random() - 0.5) * 0.6; // Aggressive organic lean
            dummy.rotation.z = (Math.random() - 0.5) * 0.6;
            
            // Randomly scale to simulate different types of plants/moss
            const scaleRoll = Math.random();
            if (scaleRoll < 0.4) {
                 dummy.scale.set(1.5 + Math.random(), 1.2 + Math.random() * 2.5, 1.5 + Math.random());
            } else if (scaleRoll < 0.8) {
                 dummy.scale.setScalar(0.8 + Math.random() * 0.6);
            } else if (scaleRoll < 0.9) {
                 dummy.scale.setScalar(0.5 + Math.random() * 1.2);
            } else {
                 dummy.scale.setScalar(0.8 + Math.random() * 1.2);
            }

            dummy.updateMatrix();
            grassMesh.setMatrixAt(gIdx++, dummy.matrix);
            
            // Variation logic
            const randColor = Math.random();
            if (randColor < 0.4) grassMesh.setColorAt(gIdx - 1, colors[0]);
            else if (randColor < 0.8) grassMesh.setColorAt(gIdx - 1, colors[1]);
            else if (randColor < 0.9) grassMesh.setColorAt(gIdx - 1, colors[2]);
            else grassMesh.setColorAt(gIdx - 1, colors[3]);
        }

        // Finalize
                grassMesh.count = gIdx;
        // Fix for up-close clipping by disabling frustum culling on instanced mesh 
        // since individual instances aren't culled correctly if the center is out of view
        grassMesh.frustumCulled = false;
        grassMesh.instanceMatrix.needsUpdate = true;
        if(grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
        grassMesh.castShadow = true;
        grassMesh.receiveShadow = true;
        group.add(grassMesh);

        this.scene.add(group);
        this.grassChunks.set(chunkKey, group);
    }

    unloadFloorPatch(chunkKey) {
        const group = this.grassChunks.get(chunkKey);
        if (group) {
            group.children.forEach(m => {
                m.geometry.dispose();
                m.material.dispose();
            });
            this.scene.remove(group);
            this.grassChunks.delete(chunkKey);
        }
    }

        update(delta, entityPositions = []) {
        this.time += delta;
        if (this.shaderUniforms) {
            this.shaderUniforms.uTime.value = this.time;
            if (entityPositions.length > 0) {
                // Update player position for interaction (using the first position, assuming it's the player)
                this.shaderUniforms.uPlayerPos.value.copy(entityPositions[0]);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.GrassSystem = new GrassSystem();
}


