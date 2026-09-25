// ============================================================================
// Dark Forest Engine - Distant Redwood Impostor Billboard System (3km Draw Distance)
// File: src_systems_forest_impostors.js
// ============================================================================

import * as THREE from 'three';

class ForestImpostorSystem {
    constructor() {
        this.instancedMesh = null;
        this.maxImpostors = 200000;
        this.dummy = new THREE.Object3D();
        this.initialized = false;
        this.lastPlayerChunk = { x: null, z: null };

        this.uniforms = {
            uTime: { value: 0 },
            uMinRadius: { value: 480.0 },  // Distance where LOD3 transitions to LOD4 Impostor
            uMaxRadius: { value: 3500.0 }, // Maximum draw distance (3.5km)
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uFogDensity: { value: 0.0018 }
        };
    }

    /**
     * Initializes quad geometry, cylindrical billboarding material, and InstancedMesh pool.
     * @param {THREE.Scene} scene 
     */
    init(scene) {
        if (this.initialized) return;

        // Scale quad to match mature Northern California Redwood dimensions (45m wide x 100m tall)
        const quadGeo = new THREE.PlaneGeometry(45, 100, 1, 1);
        quadGeo.translate(0, 50, 0); // Ground pivot at base of trunk

        const impostorMat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            side: THREE.DoubleSide,
            transparent: false, // CRITICAL: Disabled to force solid WebGL depth writes
            depthWrite: true,
            depthTest: true,

                        vertexShader: `
                uniform float uTime;
                uniform float uMinRadius;
                uniform float uMaxRadius;
                uniform float uNumVariations;
                uniform float uGridSize;
                
                varying vec2 vUv;
                varying float vDist;
                
                // Deterministic seed matching the 3D procedural generation
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    #ifdef USE_INSTANCING
                        vec3 worldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #else
                        vec3 worldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #endif

                    vDist = length(cameraPosition.xz - worldOrigin.xz);

                    // UV Grid sampling logic mapping the specific variant cell
                    float seed = hash(worldOrigin.xz);
                    
                    // Multiply by a large number and floor to get an integer variant index
                    // This matches the deterministic mapping philosophy of the 3D trees
                    float variantIndex = floor(mod(seed * 10000.0, uNumVariations)); 
                    
                    float col = mod(variantIndex, uGridSize);
                    float row = floor(variantIndex / uGridSize);

                    // Scale base UV down to grid cell size and translate to specific row/col
                    // Note: UV origin is bottom-left
                    vec2 cellUv = uv * (1.0 / uGridSize);
                    cellUv.x += col * (1.0 / uGridSize);
                    cellUv.y += row * (1.0 / uGridSize);

                    vUv = cellUv;

                    // Cylindrical Billboarding (Rotates quad on Y axis toward camera position)
                    vec3 look = cameraPosition - worldOrigin;
                    look.y = 0.0;
                    float lookLen = length(look);
                    look = lookLen > 0.001 ? look / lookLen : vec3(0.0, 0.0, 1.0);
                    
                    vec3 up = vec3(0.0, 1.0, 0.0);
                    vec3 right = cross(up, look);

                    vec3 localPos = position;
                    
                    // Low-frequency wind sway applied to top crown of billboard plane
                    float sway = sin(uTime * 1.0 + worldOrigin.x * 0.005) * pow(localPos.y / 100.0, 2.0) * 2.5;
                    localPos.x += sway;

                    vec3 billboardPos = worldOrigin + right * localPos.x + up * localPos.y;

                    gl_Position = projectionMatrix * viewMatrix * vec4(billboardPos, 1.0);
                }
            `,

            fragmentShader: `
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                uniform float uMinRadius;
                uniform float uMaxRadius;
                uniform sampler2D uAtlasTexture;

                varying vec2 vUv;
                varying float vDist;

                void main() {
                    // Distance clipping bounds
                    if (vDist < uMinRadius || vDist > uMaxRadius) discard;

                    // Sample the exact baked variant from the texture atlas
                    vec4 texColor = texture2D(uAtlasTexture, vUv);

                    // HARD DISCARD: Alpha carving for the billboard profile
                    if (texColor.a < 0.5) discard;

                    vec3 finalColor = texColor.rgb;

                    // Atmospheric Scattering & Fog Absorption
                    float fogFactor = 1.0 - exp(-vDist * uFogDensity);
                    finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 0.98));

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });

        this.instancedMesh = new THREE.InstancedMesh(quadGeo, impostorMat, this.maxImpostors);
        this.instancedMesh.count = 0;
        this.instancedMesh.frustumCulled = false;

        scene.add(this.instancedMesh);
        this.initialized = true;
    }

    /**
     * Regenerates distant forest instance matrix positions around player center.
     * Uses "Fairy Ring" spatial clustering noise logic.
     */
    generateDistantForest(centerX, centerZ) {
        if (!this.initialized || !this.instancedMesh) return;

                let index = 0;
        const hash = (x, z) => window.ForestManager?.getTreeSeed(x, z) ?? 0;

        const getTerrainY = (x, z) => {
            const h = window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
            return Number.isFinite(h) ? h : 0;
        };

        const step = 28; // Spacing step calibrated for massive crown sizes
        const maxDistSq = 3500 * 3500;
        const minDistSq = 480 * 480;

        for (let x = -3500; x <= 3500; x += step) {
            for (let z = -3500; z <= 3500; z += step) {
                if (index >= this.maxImpostors) break;

                const distSq = x * x + z * z;
                if (distSq < minDistSq || distSq > maxDistSq) continue;

                const wx = centerX + x + (hash(x, z) - 0.5) * step;
                const wz = centerZ + z + (hash(z, x) - 0.5) * step;

                if (window.RoadManager?.isSafeZone?.({ x: wx, z: wz })) continue;

                // Density mask for natural glades and clustered groves
                const clusterNoise = hash(wx * 0.002, wz * 0.002);
                if (clusterNoise < 0.35) continue;

                const wy = getTerrainY(wx, wz);
                if (!Number.isFinite(wy)) continue;

                const scale = 0.85 + hash(wx, wz) * 0.4;

                this.dummy.position.set(wx, wy, wz);
                this.dummy.scale.set(scale, scale, scale);
                this.dummy.updateMatrix();

                this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
                index++;
            }
        }

        this.instancedMesh.count = index;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Updates uniforms and recalculates distant tree grid when player crosses chunk boundary.
     * @param {number} timeSecs 
     */
    update(timeSecs) {
        if (!this.initialized) return;

        this.uniforms.uTime.value = timeSecs;

        if (window.VolumetricFogSystem?.fogUniforms?.uFogColor) {
            this.uniforms.uFogColor.value.copy(window.VolumetricFogSystem.fogUniforms.uFogColor.value);
        }

        if (window.GameCore?.playerObj?.visual) {
            const pos = window.GameCore.playerObj.visual.position;
            const chunkX = Math.floor(pos.x / 120);
            const chunkZ = Math.floor(pos.z / 120);

                        if (chunkX !== this.lastPlayerChunk.x || chunkZ !== this.lastPlayerChunk.z) {
                this.generateDistantForest(pos.x, pos.z);
                this.lastPlayerChunk = { x: chunkX, z: chunkZ };
            }
        }
    }

    /**
     * PILLAR 4 (OBSERVABILITY RULE)
     * Exposes runtime metrics for active 2D billboards and the state of the texture atlas.
     */
    getTelemetry() {
        const atlasTexture = this.uniforms.uAtlasTexture.value;
        const atlasStatus = atlasTexture ? 'Loaded' : 'Missing';
        let atlasResolution = 'N/A';
        
        if (atlasTexture && atlasTexture.image) {
            atlasResolution = `${atlasTexture.image.width}x${atlasTexture.image.height}`;
        } else if (atlasTexture && atlasTexture.source && atlasTexture.source.data) {
            atlasResolution = `${atlasTexture.source.data.width}x${atlasTexture.source.data.height}`;
        }

        return {
            systemInitialized: this.initialized,
            active2DImpostors: this.instancedMesh ? this.instancedMesh.count : 0,
            atlasStatus: atlasStatus,
            atlasResolution: atlasResolution,
            atlasGridSize: this.uniforms.uGridSize.value,
            totalVariations: this.uniforms.uNumVariations.value
        };
    }
}

window.ForestImpostorSystem = new ForestImpostorSystem();

// Global Debug Accessor
if (typeof window !== 'undefined') {
    if (!window.ForestDebug) window.ForestDebug = {};
    window.ForestDebug.getImpostorTelemetry = () => window.ForestImpostorSystem.getTelemetry();
}

export default ForestImpostorSystem;
