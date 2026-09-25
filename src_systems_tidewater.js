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
            }
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
                varying vec2 vUv;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                
                void main() {
                    // Normalize the varying just in case interpolation warped it
                    vec3 n = normalize(vNormal);
                    
                    // Basic directional light placeholder to prove the analytical normal is working
                    vec3 lightDir = normalize(vec3(0.3, 0.6, 0.7));
                    float ndotl = max(0.0, dot(n, lightDir));
                    
                    // Deep ocean blue base color mixed with simple directional diffuse lighting
                    vec3 oceanBase = vec3(0.05, 0.15, 0.30);
                    vec3 litColor = oceanBase + (vec3(0.1, 0.2, 0.3) * ndotl);
                    
                    gl_FragColor = vec4(litColor, 0.85); 
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
        console.log('[TidewaterSystem] Initialized with placeholder mesh.');
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
