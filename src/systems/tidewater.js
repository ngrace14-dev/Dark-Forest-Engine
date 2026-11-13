// ============================================================================
// Dark Forest Engine - Tidewater System (Oceans & Rivers)
// File: src_systems_tidewater.js
// ============================================================================

import * as THREE from 'three';

/**
 * Single Authority for the Tidewater System.
 * Manages the global ocean surface, future river splines, and fluid simulations.
 */
export class TidewaterSystem {
    constructor() {
        this.initialized = false;
        this.scene = null;
        this.renderer = null;
        this.oceanMesh = null;
        
        this.uniforms = {
            uTime: { value: 0.0 },
            // Array of 4 Gerstner waves [dirX, dirZ, steepness, wavelength]
            uWaves: {
                value: [
                    new THREE.Vector4(1.0, 0.4, 0.20, 60.0),   // Primary Swell
                    new THREE.Vector4(0.7, 0.7, 0.25, 31.0),   // Secondary Cross-Swell
                    new THREE.Vector4(-0.2, 1.0, 0.30, 18.0),  // High-frequency chop
                    new THREE.Vector4(0.8, -0.6, 0.15, 11.0)   // High-frequency interference
                ]
            },
            uSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uSunColor: { value: new THREE.Color(0xfef3c7) },
            uSkyColor: { value: new THREE.Color(0x5a7b93) },
            uWaterShallow: { value: new THREE.Color(0x0f5e6a) },
            uWaterDeep: { value: new THREE.Color(0x02101a) }
        };
    }

    /**
     * Initializes the placeholder ocean mesh and shader material.
     * @param {THREE.Scene} scene - The main game scene
     * @param {THREE.WebGLRenderer} renderer - The active WebGL renderer
     */
    init(scene, renderer) {
        if (this.initialized) return;
        
        this.scene = scene;
        this.renderer = renderer;

        // Highly subdivided plane for wave displacement (Gerstner waves require dense geometry)
        const geometry = new THREE.PlaneGeometry(4000, 4000, 512, 512);
        geometry.rotateX(-Math.PI / 2); // Lay flat on the XZ plane

        // Basic ShaderMaterial placeholder
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: `
                uniform float uTime;
                uniform vec4 uWaves[4]; // [dirX, dirZ, steepness, wavelength]
                
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                
                // Gerstner Wave Function
                // Mathematically pulls vertices horizontally towards the crest while pushing them vertically up
                // to create sharp, realistic ocean peaks and wide troughs.
                vec3 calculateGerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
                    float steepness = wave.z;
                    float wavelength = wave.w;
                    
                    // The frequency of the wave
                    float k = 2.0 * 3.14159 / wavelength;
                    
                    // Wave propagation speed based on gravity (9.8) and wavelength (phase speed dispersion relation)
                    float c = sqrt(9.8 / k);
                    
                    // Direction vector
                    vec2 d = normalize(wave.xy);
                    
                    // Phase argument: dot(direction, position) * frequency - time * speed
                    float f = k * (dot(d, p.xz) - c * uTime);
                    
                    // Amplitude bounded by steepness to prevent looping over itself
                    float a = steepness / k;
                    
                    float cosf = cos(f);
                    float sinf = sin(f);
                    
                    // Calculate partial derivatives to accumulate the analytical surface normal
                    float dX = d.x * d.x * steepness * sinf;
                    float dY = d.x * d.y * steepness * sinf;
                    float dZ = d.y * d.y * steepness * sinf;
                    
                    tangent.x -= dX;
                    tangent.y += d.x * steepness * cosf;
                    tangent.z -= dY;
                    
                    binormal.x -= dY;
                    binormal.y += d.y * steepness * cosf;
                    binormal.z -= dZ;
                    
                    // Return the 3D displacement vector for this specific wave
                    return vec3(
                        d.x * (a * cosf),
                        a * sinf,
                        d.y * (a * cosf)
                    );
                }
                
                void main() {
                    vUv = uv;
                    vec3 gridPos = position;
                    vec3 finalPos = gridPos;
                    
                    // Base tangent and binormal (aligned to X and Z axes for a flat plane)
                    vec3 tangent = vec3(1.0, 0.0, 0.0);
                    vec3 binormal = vec3(0.0, 0.0, 1.0);
                    
                    // Summation of all 4 Gerstner waves
                    for(int i = 0; i < 4; i++) {
                        finalPos += calculateGerstnerWave(uWaves[i], gridPos, tangent, binormal);
                    }
                    
                    // Calculate the precise analytical normal using the modified tangent and binormal
                    // This ensures the lighting exactly matches the radically displaced geometry
                    vec3 displacedNormal = normalize(cross(binormal, tangent));
                    
                    // Pass world-space data to fragment shader
                    vec4 worldPosition = modelMatrix * vec4(finalPos, 1.0);
                    vWorldPos = worldPosition.xyz;
                    vNormal = normalize(mat3(modelMatrix) * displacedNormal);
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uSunDir;
                uniform vec3 uSunColor;
                uniform vec3 uSkyColor;
                uniform vec3 uWaterShallow;
                uniform vec3 uWaterDeep;

                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                
                // Procedural noise for foam breakup
                float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
                float noise(vec2 p) {
                    vec2 i = floor(p); vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
                }

                void main() {
                    // Normalize the varying just in case interpolation warped it
                    vec3 n = normalize(vNormal);
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    
                    // 1. Depth-Based Color Gradient
                    // Gerstner waves oscillate vertically around Y=0. Troughs are negative, crests are positive.
                    float depthBlend = smoothstep(-1.5, 1.5, vWorldPos.y);
                    vec3 baseColor = mix(uWaterDeep, uWaterShallow, depthBlend);
                    
                    // 2. Fresnel Reflection
                    // Glancing angles reflect the sky/environment color
                    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
                    baseColor = mix(baseColor, uSkyColor, fresnel * 0.7);
                    
                    // 3. Lighting & Specular Sun Glints
                    vec3 lightDir = normalize(uSunDir);
                    float diff = max(dot(n, lightDir), 0.0);
                    
                    // Blinn-Phong specular highlight calculation
                    vec3 halfVector = normalize(lightDir + viewDir);
                    float NdotH = max(0.0, dot(n, halfVector));
                    float specular = pow(NdotH, 150.0); // Sharp, bright sun glints
                    vec3 specularColor = uSunColor * specular * 1.5;
                    
                    // Apply diffuse light (with a base ambient term of 0.3) and add specular
                    vec3 litColor = baseColor * (diff * 0.7 + 0.3) + specularColor;
                    
                    // 4. Crest Foam
                    // Isolate sharp peaks: high world Y value AND steep normal (where Y component of normal drops)
                    float peakHeight = smoothstep(0.8, 2.5, vWorldPos.y);
                    float steepness = smoothstep(0.7, 0.95, 1.0 - n.y);
                    float foamMask = peakHeight * steepness;
                    
                    // Break up the foam organically with moving noise so it doesn't look like a solid polygon
                    float fNoise = noise(vWorldPos.xz * 2.0 - uTime * 0.8);
                    foamMask *= smoothstep(0.3, 0.7, fNoise);
                    foamMask = clamp(foamMask * 1.5, 0.0, 1.0); // Boost visibility
                    
                    vec3 foamColor = vec3(0.95, 0.98, 1.0);
                    vec3 finalColor = mix(litColor, foamColor, foamMask);
                    
                    gl_FragColor = vec4(finalColor, 0.92); 
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false // Standard for water, allows underwater geometry to render behind it
        });

        this.oceanMesh = new THREE.Mesh(geometry, material);
        this.oceanMesh.position.y = -10.0; // Default sea level
        
        this.scene.add(this.oceanMesh);

        this.initialized = true;
        console.log('[TidewaterSystem] Initialized successfully.');

        // PILLAR 4 (OBSERVABILITY RULE) - Bind Telemetry to Global Debug Object
        if (typeof window !== 'undefined') {
            if (!window.ForestDebug) window.ForestDebug = {};
            window.ForestDebug.getTidewaterTelemetry = () => this.getTelemetry();
        }
    }

    /**
     * PILLAR 4 (OBSERVABILITY RULE)
     * Returns key diagnostic metrics for the Tidewater System.
     */
    getTelemetry() {
        const telemetry = {
            isInitialized: this.initialized,
            isRendering: false,
            meshActive: false,
            vertexCount: 0,
            faceCount: 0,
            simulationTime: this.uniforms.uTime.value.toFixed(3),
            waveCount: this.uniforms.uWaves.value.length
        };

        if (this.oceanMesh) {
            telemetry.meshActive = true;
            // Check if mesh is actually in the active scene graph
            telemetry.isRendering = this.oceanMesh.parent !== null;
            
            if (this.oceanMesh.geometry) {
                // BufferGeometry vertex count is positions.length / 3
                const positions = this.oceanMesh.geometry.attributes.position;
                if (positions) telemetry.vertexCount = positions.count;
                
                // Face count (triangles)
                const indices = this.oceanMesh.geometry.index;
                if (indices) {
                    telemetry.faceCount = indices.count / 3;
                } else if (positions) {
                    // Non-indexed geometry fallback
                    telemetry.faceCount = positions.count / 3;
                }
            }
        }

        return telemetry;
    }

    /**
     * Updates the fluid simulation uniforms.
     * @param {number} deltaTime - Time elapsed since last frame
     * @param {THREE.Camera} camera - The active player camera
     */
    update(deltaTime, camera) {
        if (!this.initialized) return;
        
        this.uniforms.uTime.value += deltaTime;
        
        // Future logic: center the ocean grid on the camera XZ coordinates to create an infinite ocean illusion
    }

    /**
     * ASSET DISPOSAL RULE
     * Explicitly destroys the geometry, material, and removes the mesh from the scene to prevent VRAM leaks.
     */
    dispose() {
        if (!this.initialized) return;

        if (this.oceanMesh) {
            if (this.scene) {
                this.scene.remove(this.oceanMesh);
            }
            
            if (this.oceanMesh.geometry) {
                this.oceanMesh.geometry.dispose();
            }
            
            if (this.oceanMesh.material) {
                this.oceanMesh.material.dispose();
            }
            
            this.oceanMesh = null;
        }

        this.scene = null;
        this.renderer = null;
        this.initialized = false;
        console.log('[TidewaterSystem] Disposed cleanly.');
    }
}
