import * as THREE from 'three';

/**
 * File: src_systems_vat.js
 * Vertex Animation Texture (VAT) System for high-density crowds.
 * Manages distal units (30m+) using InstancedMesh and a custom shader.
 * Includes a background "Horde" simulation for flocking/collision.
 */

window.VATManager = {
    // Configuration
    MAX_INSTANCES: 5000,
    LOD_THRESHOLD: 30, // 30m
    SIM_TICK: 1/30,    // 30Hz simulation for background horde
    
    // Per-prefab VAT data
    atlases: new Map(), 
    
    // Instance Management
    instancedMeshes: new Map(), // prefabName -> THREE.InstancedMesh
    instanceData: new Map(),   // prefabName -> Array of { entityId, lastActive, targetPos }
    
    // GPU State (DataTexture)
    stateTextures: new Map(),

    // Shared Simulation Buffers (to avoid GC)
    _tempVec3: new THREE.Vector3(),
    _repelVec3: new THREE.Vector3(),
    _dummy: new THREE.Object3D(),

    init: function() {
        console.log("VAT Manager: Initializing Crowd LOD System...");
        this.lastSimTime = 0;
    },

    /**
     * Creates an InstancedMesh for a specific prefab type if it doesn't exist.
     */
    getOrCreateInfo: function(prefabName) {
        if (this.instancedMeshes.has(prefabName)) return this.instancedMeshes.get(prefabName);

        const def = window.AssetManager.prefabs[prefabName];
        if (!def) return null;

        // 1. Setup Geometry (Kenshi-style Boxy LOD)
        // Composite geometry: Small base (legs), wider center (torso), square top (head)
        const geometry = new THREE.BufferGeometry();
        
        const legsGeo = new THREE.BoxGeometry(def.radius * 0.8, def.height * 0.3, def.radius * 0.8);
        legsGeo.translate(0, def.height * 0.15 - def.height/2, 0);
        
        const torsoGeo = new THREE.BoxGeometry(def.radius * 1.5, def.height * 0.5, def.radius * 1.2);
        torsoGeo.translate(0, def.height * 0.55 - def.height/2, 0);
        
        const headGeo = new THREE.BoxGeometry(def.radius, def.radius, def.radius);
        headGeo.translate(0, def.height * 0.85 - def.height/2, 0);
        
        // Merge geometries using THREE.BufferGeometryUtils
        // We'll use the static method directly since the import might be tricky in this environment
        const mergedGeo = window.BufferGeometryUtils ? 
            window.BufferGeometryUtils.mergeGeometries([legsGeo, torsoGeo, headGeo]) :
            legsGeo; // Fallback
        
        // 2. Setup State Texture (GPU Side)
        const stateData = new Float32Array(this.MAX_INSTANCES * 4);
        const stateTexture = new THREE.DataTexture(stateData, this.MAX_INSTANCES, 1, THREE.RGBAFormat, THREE.FloatType);
        stateTexture.needsUpdate = true;
        this.stateTextures.set(prefabName, stateTexture);

        // 3. Create VAT Shader Material (AAA Parity)
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uStateTexture: { value: stateTexture },
                uTime: { value: 0 },
                uVATAtlas: { value: null }, 
                uBaseColor: { value: new THREE.Color(def.color) },
                uFogColor: { value: new THREE.Color(0x040608) },
                uFogDensity: { value: 0.03 }
            },
            vertexShader: `
                uniform sampler2D uStateTexture;
                uniform float uTime;
                varying vec3 vColor;
                varying float vFogDepth;
                
                // VAT Helpers (Simulated)
                vec3 getVATPosition(int instanceIdx, int animID, float time, vec3 pos) {
                    vec4 state = texelFetch(uStateTexture, ivec2(instanceIdx, 0), 0);
                    bool isDamaged = mod(state.w, 2.0) >= 1.0;
                    
                    vec3 offset = vec3(0.0);
                    if (isDamaged) {
                        // Procedural "AAA" Limp
                        // We affect the legs based on height and a sine-wave gait
                        float gait = sin(uTime * 8.0 + float(instanceIdx));
                        if (pos.y < -0.1) {
                            offset.x = gait * 0.15;
                            offset.y = abs(gait) * 0.1;
                        }
                    } else {
                        // Normal procedural walk for distal units
                        float walk = sin(uTime * 12.0 + float(instanceIdx));
                        if (pos.y < -0.1) {
                            offset.z = walk * 0.2;
                        }
                    }
                    
                    return pos + offset;
                }

                void main() {
                    vec4 state = texelFetch(uStateTexture, ivec2(gl_InstanceID, 0), 0);
                    
                    vec3 transformed = getVATPosition(gl_InstanceID, int(state.x), uTime + state.y, position);
                    
                    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    vColor = uBaseColor;
                    vFogDepth = -mvPosition.z;
                }
            `,
            fragmentShader: `
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                varying vec3 vColor;
                varying float vFogDepth;

                void main() {
                    // AAA Style Fog Integration for distal units
                    float fogFactor = 1.0 - exp( - uFogDensity * uFogDensity * vFogDepth * vFogDepth );
                    
                    vec3 finalColor = mix(vColor * 0.6, uFogColor, fogFactor);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });

        const imesh = new THREE.InstancedMesh(mergedGeo, material, this.MAX_INSTANCES);
        imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        imesh.frustumCulled = false;
        
        window.GameCore.scene.add(imesh);
        this.instancedMeshes.set(prefabName, imesh);
        this.instanceData.set(prefabName, []);
        
        return imesh;
    },

    /**
     * Updates an entity's GPU state (Animation, Damage Flags).
     */
    updateInstanceStat: function(entity, isDamaged) {
        const prefabName = entity.name;
        const stateTexture = this.stateTextures.get(prefabName);
        if (!stateTexture || entity.vatIndex === undefined) return;

        const idx = entity.vatIndex * 4;
        const data = stateTexture.image.data;
        
        // Update flags (bit 0 = Damaged)
        data[idx + 3] = isDamaged ? 1.0 : 0.0;
        
        stateTexture.needsUpdate = true;
    },

    /**
     * LOD Core Logic: Swaps between SkinnedMesh and VAT InstancedMesh
     */
    processLOD: function(entity, cameraPos) {
        if (!entity.visual || !entity.def || entity.def.type !== 'npc') return;
        
        const distSq = entity.visual.position.distanceToSquared(cameraPos);
        const thresholdSq = this.LOD_THRESHOLD * this.LOD_THRESHOLD;

        if (distSq > thresholdSq) {
            // --- DISTAL (VAT) ---
            if (entity.visual.visible) {
                entity.visual.visible = false;
                // Disable physics to save CPU - distal units use "Horde" math
                if (entity.body) entity.body.setTranslation({ x: 0, y: -1000, z: 0 }, true);
                this.registerInVAT(entity);
            }
            // Transform update is now handled by VATManager.simulateHorde()
        } else {
            // --- PROXIMAL (SkinnedMesh) ---
            if (!entity.visual.visible) {
                entity.visual.visible = true;
                this.unregisterFromVAT(entity);
                // Re-enable physics at the new position
                if (entity.body) {
                    const pos = entity.visual.position;
                    entity.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
                }
            }
        }
    },

    registerInVAT: function(entity) {
        const prefabName = entity.name;
        this.getOrCreateInfo(prefabName);
        
        const instances = this.instanceData.get(prefabName);
        const freeIdx = instances.findIndex(i => i === null);
        
        const idx = freeIdx === -1 ? instances.length : freeIdx;
        entity.vatIndex = idx;
        
        const data = { entityId: entity.id, active: true };
        if (freeIdx === -1) instances.push(data);
        else instances[freeIdx] = data;

        // Initialize state
        this.updateInstanceStat(entity, entity.isCrippled || entity.hp < (entity.def.hp * 0.5));
    },

    unregisterFromVAT: function(entity) {
        if (entity.vatIndex === undefined) return;
        
        const prefabName = entity.name;
        const instances = this.instanceData.get(prefabName);
        instances[entity.vatIndex] = null;
        
        // Move VAT instance far away so it's not rendered
        const imesh = this.instancedMeshes.get(prefabName);
        const dummy = new THREE.Object3D();
        dummy.position.set(0, -1000, 0);
        dummy.updateMatrix();
        imesh.setMatrixAt(entity.vatIndex, dummy.matrix);
        imesh.instanceMatrix.needsUpdate = true;
        
        entity.vatIndex = undefined;
    },

    updateVATTransform: function(entity) {
        if (entity.vatIndex === undefined) return;
        
        const prefabName = entity.name;
        const imesh = this.instancedMeshes.get(prefabName);
        
        imesh.setMatrixAt(entity.vatIndex, entity.visual.matrixWorld);
        imesh.instanceMatrix.needsUpdate = true;
    },

    update: function(delta) {
        this.instancedMeshes.forEach((imesh) => {
            imesh.material.uniforms.uTime.value += delta;
        });

        // --- BACKGROUND HORDE SIMULATION ---
        // Sliced/Throttled simulation for thousands of distal units
        this.lastSimTime += delta;
        if (this.lastSimTime >= this.SIM_TICK) {
            this.simulateHorde(this.lastSimTime);
            this.lastSimTime = 0;
        }
    },

    simulateHorde: function(dt) {
        const playerPos = window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : null;
        if (!playerPos) return;

        this.instancedMeshes.forEach((imesh, prefabName) => {
            const instances = this.instanceData.get(prefabName);
            const matrixAttr = imesh.instanceMatrix;
            const matrixArray = matrixAttr.array;

            for (let i = 0; i < instances.length; i++) {
                const data = instances[i];
                if (!data || !data.active) continue;

                // 1. Extract position from matrix
                const offset = i * 16;
                this._tempVec3.set(matrixArray[offset + 12], matrixArray[offset + 13], matrixArray[offset + 14]);

                // 2. Simple Flocking/Movement Logic (Move towards player)
                const dir = this._repelVec3.subVectors(playerPos, this._tempVec3);
                const distSq = dir.lengthSq();
                
                if (distSq > 4) { // Don't converge perfectly on player (stop at 2m)
                    dir.normalize().multiplyScalar(2.0 * dt); // Move at 2m/s
                    this._tempVec3.add(dir);
                }

                // 3. Fast Collision Avoidance (Distal units only collide with each other)
                // In a Compute Shader, this would be a spatial grid check. 
                // Here we use a fast "Lazy Repulsion" against a few neighbors
                for (let j = 0; j < 5; j++) {
                    const neighborIdx = (i + j + 1) % instances.length;
                    const neighbor = instances[neighborIdx];
                    if (!neighbor) continue;

                    const nOffset = neighborIdx * 16;
                    const nx = matrixArray[nOffset + 12];
                    const nz = matrixArray[nOffset + 14];
                    
                    const dx = this._tempVec3.x - nx;
                    const dz = this._tempVec3.z - nz;
                    const dSq = dx*dx + dz*dz;
                    
                    if (dSq < 1.44) { // 1.2m radius repulsion
                        const d = Math.sqrt(dSq) || 0.001;
                        const force = (1.2 - d) * 0.5;
                        this._tempVec3.x += (dx/d) * force;
                        this._tempVec3.z += (dz/d) * force;
                    }
                }

                // 4. Update Matrix (Position and LookAt)
                this._dummy.position.copy(this._tempVec3);
                this._dummy.lookAt(playerPos.x, this._tempVec3.y, playerPos.z);
                this._dummy.updateMatrix();
                
                imesh.setMatrixAt(i, this._dummy.matrix);
            }
            imesh.instanceMatrix.needsUpdate = true;
        });
    }
};
