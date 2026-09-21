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
        
        this.initMaterials();
        this.initGeometry();
        this.grassChunks = [];
    }

    initMaterials() {
        // [ALPHA-TESTED EVERGREEN TEXTURE]
        // Base material with Alpha Cutout enabled
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a7c29, // Vibrant evergreen base
            roughness: 0.6,
            side: THREE.DoubleSide,
            alphaTest: 0.5, 
            transparent: false, // Must be false for depth buffer sorting speed
            // map: this.engine.assets.get('grass_blade_atlas') // Assume loaded atlas
        });

        this.grassMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            
            // --- VERTEX SHADER ---
            shader.vertexShader = `
                uniform float uTime;
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

                // [WORLD-SPACE WIND DISTORTION]
                // Simplex Noise proxy: sine waves interacting in world space
                float windWave = sin(vWorldPos.x * 0.5 + uTime) * cos(vWorldPos.z * 0.5 + (uTime * 0.8));
                float gust = sin(uTime * 2.0 + vWorldPos.x * 0.1) * 0.5 + 0.5;
                
                // Apply vertex offset (WindWave Shader), stronger at the tips
                float swayAmount = windWave * (0.2 + gust * 0.3) * pow(vHeight, 2.0);
                
                transformed.x += swayAmount;
                transformed.z += swayAmount;
                // Parabolic drop: Grass blades arc downwards as they bend
                transformed.y -= abs(swayAmount) * 0.5 * vHeight; 
                `
            );

            // --- FRAGMENT SHADER ---
            shader.fragmentShader = `
                varying float vHeight;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `;

            // 1. Damp Soil Root Blending & Distance Culling
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>

                // [GROUND CLIPPING FADE] (Distance Culling / LOD)
                float dist = distance(vWorldPos, cameraPosition);
                // Hard clip blades beyond 150 units to save fragment processing
                if (dist > 150.0) discard; 

                // [DAMP SOIL ROOT BLENDING]
                // Height-Based Blend Shader: RootShadow
                vec3 rootColor = vec3(0.06, 0.08, 0.02); // Dark, damp soil green/brown
                vec3 tipColor = diffuseColor.rgb;
                
                // Mix base color with root shadow based on height
                diffuseColor.rgb = mix(rootColor, tipColor, smoothstep(0.0, 0.4, vHeight));
                `
            );

            // 2. Subsurface Scattering (SSS) Light Pass
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_physical_pars_fragment>',
                `
                #include <lights_physical_pars_fragment>
                
                // [SUBSURFACE SCATTERING (SSS)]
                // Custom backlighting injects light transmission through the quad planes
                void RE_Direct_GrassSSS(const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
                    float backLight = max(0.0, dot(-geometry.normal, directLight.direction));
                    float scatter = pow(backLight, 4.0) * 0.5; // Narrow, intense transmission
                    
                    // Add yellow-green glow based on light color and blade height
                    vec3 sssGlow = directLight.color * vec3(0.6, 0.9, 0.2) * scatter * vHeight;
                    reflectedLight.directDiffuse += sssGlow;
                }
                `
            );
            
            this.grassShader = shader;
        };
    }

    initGeometry() {
        // [BLADE STRUCTURE]
        // Simple Quad Plane. Using 1x3 segments allows for the Parabolic Geometry bend 
        // in the vertex shader without excessive poly count.
        // Thickness (0.1mm) is implied visually via DoubleSide rendering.
        this.bladeGeo = new THREE.PlaneGeometry(0.1, 0.6, 1, 3);
        
        // Pivot from the bottom (root) instead of the center
        this.bladeGeo.translate(0, 0.3, 0); 
    }

    /**
     * Spawns a chunk of the Foliage Canopy - Grass Field
     * @param {THREE.Scene} scene 
     * @param {number} startX 
     * @param {number} startZ 
     * @param {number} patchSize 
     * @param {number} density target blades per patch area
     */
    spawnGrassChunk(scene, startX, startZ, patchSize = 20, density = 40000) {
        // [FOLIAGE CANOPY - GRASS FIELD] -> Instanced Quad Planes
        const instancedGrass = new THREE.InstancedMesh(this.bladeGeo, this.grassMaterial, density);
        instancedGrass.instanceMatrix.setUsage(THREE.StaticDrawUsage); // Static until regenerated
        instancedGrass.receiveShadow = true;

        const dummy = new THREE.Object3D();
        
        const getTerrainY = (x, z) => {
            return window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
        };

        for (let i = 0; i < density; i++) {
            // Distribute across patch
            const wx = startX + (Math.random() - 0.5) * patchSize;
            const wz = startZ + (Math.random() - 0.5) * patchSize;
            const wy = getTerrainY(wx, wz);

            dummy.position.set(wx, wy, wz);
            
            // Randomize rotation and add slight random scaling for organic look
            dummy.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.7 + Math.random() * 0.6;
            dummy.scale.set(scale, scale, scale);
            
            dummy.updateMatrix();
            instancedGrass.setMatrixAt(i, dummy.matrix);
        }

        instancedGrass.instanceMatrix.needsUpdate = true;
        
        // Compute bounding sphere for proper frustum culling
        instancedGrass.computeBoundingSphere();
        
        scene.add(instancedGrass);
        this.grassChunks.push(instancedGrass);
        
        return instancedGrass;
    }

    update(delta) {
        this.time += delta;
        if (this.grassShader) {
            this.grassShader.uniforms.uTime.value = this.time;
        }
    }
}
