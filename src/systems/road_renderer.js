import * as THREE from 'three';

/**
 * Hyper-Realistic Grass Engine Generation
 * Reference: IMG_3344.jpeg
 */
export class GrassRenderer {
    constructor(engine, maxInstances = 500000) {
        this.engine = engine;
        this.maxInstances = maxInstances;
        this.time = 0;
        
        // Dynamic interaction tracking (e.g. Player, Adventurers, Mounts)
        this.maxInteractiveEntities = 16;
        this.playerPositions = new Array(this.maxInteractiveEntities).fill(null).map(() => new THREE.Vector3(9999, 9999, 9999));
        this.activePlayerCount = 0;

        this.initMaterials();
        this.initGeometry();
        this.grassChunks = [];
    }

    initMaterials() {
        // [ALPHA-TESTED EVERGREEN TEXTURE]
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a7c29, // Vibrant evergreen base
            roughness: 0.6,
            side: THREE.DoubleSide,
            alphaTest: 0.5, 
            transparent: false, // High-performance depth buffer sorting
        });

        this.grassMaterial.onBeforeCompile = (shader) => {
            // Setup Uniforms
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uPlayerPositions = { value: this.playerPositions };
            shader.uniforms.uPlayerCount = { value: 0 };
            
            // --- VERTEX SHADER ---
            shader.vertexShader = `
                uniform float uTime;
                uniform vec3 uPlayerPositions[${this.maxInteractiveEntities}];
                uniform int uPlayerCount;

                varying float vHeight;
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                
                // Height mapping (0.0 at root, 1.0 at tip) based on UVs
                vHeight = uv.y; 

                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                #endif

                // 1. [WORLD-SPACE WIND DISTORTION] (Simplex Noise Proxy)
                float windWave = sin(vWorldPos.x * 0.5 + uTime) * cos(vWorldPos.z * 0.5 + (uTime * 0.8));
                float gust = sin(uTime * 2.0 + vWorldPos.x * 0.1) * 0.5 + 0.5;
                float swayAmount = windWave * (0.2 + gust * 0.3) * pow(vHeight, 2.0);
                
                transformed.x += swayAmount;
                transformed.z += swayAmount;

                // 2. [ENTITY TRAMPLE / DISPLACEMENT EFFECT]
                // Bends grass blades away from players/adventurers standing on or near them
                vec2 totalTrample = vec2(0.0);
                for (int i = 0; i < ${this.maxInteractiveEntities}; i++) {
                    if (i >= uPlayerCount) break;
                    
                    vec3 playerPos = uPlayerPositions[i];
                    float dist = distance(vWorldPos.xz, playerPos.xz);
                    float trampleRadius = 1.5; // Radius of interaction in world units
                    
                    if (dist < trampleRadius) {
                        vec2 pushDir = normalize(vWorldPos.xz - playerPos.xz + vec2(0.001)); // Prevent div-by-zero
                        float pushFactor = (1.0 - (dist / trampleRadius)) * pow(vHeight, 1.5);
                        totalTrample += pushDir * pushFactor * 1.2;
                    }
                }

                transformed.x += totalTrample.x;
                transformed.z += totalTrample.y;

                // 3. [PARABOLIC DROP]
                // Grass blades arc downwards as wind or trample forces bend them
                float totalOffset = length(vec2(swayAmount) + totalTrample);
                transformed.y -= abs(totalOffset) * 0.4 * vHeight; 
                `
            );

            // --- FRAGMENT SHADER ---
            shader.fragmentShader = `
                varying float vHeight;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `;

            // Ground Clipping Fade & Soil Blending
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>

                // [GROUND CLIPPING FADE] (Distance Culling / LOD)
                float dist = distance(vWorldPos, cameraPosition);
                if (dist > 150.0) discard; 

                // [DAMP SOIL ROOT BLENDING]
                vec3 rootColor = vec3(0.06, 0.08, 0.02); // Dark, damp soil green/brown
                vec3 tipColor = diffuseColor.rgb;
                
                diffuseColor.rgb = mix(rootColor, tipColor, smoothstep(0.0, 0.4, vHeight));
                `
            );

            // [SUBSURFACE SCATTERING (SSS)] Injection
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_begin>',
                `
                #include <lights_fragment_begin>
                
                // Backlighting transmission approximation for leaf translucent glow
                #if NUM_DIR_LIGHTS > 0
                    vec3 mainLightDir = directionalLights[0].direction;
                    float backLight = max(0.0, dot(-geometry.normal, mainLightDir));
                    float sssScatter = pow(backLight, 3.0) * 0.6;
                    
                    vec3 sssGlow = directionalLights[0].color * vec3(0.6, 0.9, 0.2) * sssScatter * vHeight;
                    reflectedLight.directDiffuse += sssGlow;
                #endif
                `
            );
            
            this.grassShader = shader;
        };
    }

    initGeometry() {
        // [BLADE STRUCTURE]
        // 1x3 segmented plane for parabolic bending along height
        this.bladeGeo = new THREE.PlaneGeometry(0.1, 0.6, 1, 3);
        
        // Pivot at base (root)
        this.bladeGeo.translate(0, 0.3, 0); 
    }

    /**
     * Spawns a chunk of the Foliage Canopy - Grass Field
     */
    spawnGrassChunk(scene, startX, startZ, patchSize = 20, density = 40000) {
        const instancedGrass = new THREE.InstancedMesh(this.bladeGeo, this.grassMaterial, density);
        instancedGrass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        instancedGrass.receiveShadow = true;

        const dummy = new THREE.Object3D();
        
        const getTerrainY = (x, z) => {
            return window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
        };

        for (let i = 0; i < density; i++) {
            const wx = startX + (Math.random() - 0.5) * patchSize;
            const wz = startZ + (Math.random() - 0.5) * patchSize;
            const wy = getTerrainY(wx, wz);

            dummy.position.set(wx, wy, wz);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.7 + Math.random() * 0.6;
            dummy.scale.set(scale, scale, scale);
            
            dummy.updateMatrix();
            instancedGrass.setMatrixAt(i, dummy.matrix);
        }

        instancedGrass.instanceMatrix.needsUpdate = true;
        instancedGrass.computeBoundingSphere();
        
        scene.add(instancedGrass);
        this.grassChunks.push(instancedGrass);
        
        return instancedGrass;
    }

    /**
     * Main System Loop Update
     * @param {number} delta Frame delta time
     * @param {THREE.Vector3[]} entityPositions Array of Vector3 positions for entities that trample grass
     */
    update(delta, entityPositions = []) {
        this.time += delta;

        if (this.grassShader) {
            this.grassShader.uniforms.uTime.value = this.time;

            // Update interactive entity positions for trample calculation
            const count = Math.min(entityPositions.length, this.maxInteractiveEntities);
            this.grassShader.uniforms.uPlayerCount.value = count;

            for (let i = 0; i < count; i++) {
                this.playerPositions[i].copy(entityPositions[i]);
            }
        }
    }
}
