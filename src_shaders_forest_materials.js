
// ============================================================================
// Dark Forest Engine - Foliage Alpha Calibration & Shaders
// File: src/shaders/forest_materials.js
// ============================================================================

import * as THREE from 'three';

/**
 * Structured Shader Snippet Compiler
 * Replaces fragile regex injections with deterministic block assignments.
 */
function assembleShader(shader, snippets) {
    // 1. Vertex Declarations (always includes instanced data routing)
    const vertDecl = `
        uniform float uTime;
        uniform float uWindSpeed;
        
        #ifdef USE_INSTANCING
            attribute vec4 aInstanceData; // x: seed, y: lean, z: scale/height, w: windPhase
            varying vec4 vInstanceData;
        #endif
        
        varying vec3 vWorldPos;
        varying vec3 vColorAttr;
        ${snippets.VERTEX_DECLARATIONS || ''}
    `;

    // 2. Vertex Transform (world position capture and sway math)
    const vertTransform = `
        vColorAttr = color;
        
        #ifdef USE_INSTANCING
            vInstanceData = aInstanceData;
            vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        #else
            vInstanceData = vec4(1.0, 0.0, 1.0, 0.0); // Fallback for non-instanced objects
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        #endif
        
        ${snippets.VERTEX_TRANSFORM || ''}
    `;

    // 3. Fragment Declarations
    const fragDecl = `
        uniform float uFogIntensity;
        uniform vec3 uForestSunDir;
        uniform vec3 uForestSunCol;
        uniform float uRawDebugMode;
        
        varying vec3 vWorldPos;
        varying vec3 vColorAttr;
        
        #ifdef USE_INSTANCING
            varying vec4 vInstanceData;
        #endif
        
        ${snippets.FRAG_DECLARATIONS || ''}
    `;

    // Patch Vertex Shader
    shader.vertexShader = vertDecl + '\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' + vertTransform
    );

    // Patch Fragment Shader
    shader.fragmentShader = fragDecl + '\n' + shader.fragmentShader;

    // FRAG_NORMAL: Inject after normal setup
    if (snippets.FRAG_NORMAL) {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_begin>',
            '#include <normal_fragment_begin>\n' + snippets.FRAG_NORMAL
        );
    }

    // FRAG_COLOR: Inject after diffuse color is calculated but before lighting
    if (snippets.FRAG_COLOR) {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            '#include <color_fragment>\n' + snippets.FRAG_COLOR
        );
    }

    // FRAG_LIGHTING: Inject custom SSS/Lighting overrides
    if (snippets.FRAG_LIGHTING) {
        // Appending to the end of the standard lighting chunk
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <lights_fragment_end>',
            '#include <lights_fragment_end>\n' + snippets.FRAG_LIGHTING
        );
    }

    // FOG OVERRIDE: Maintain silhouette readability in dense fog
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `
        #ifdef USE_FOG
            float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
            fogFactor *= uFogIntensity; 
            gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
        #endif
        `
    );
}

/**
 * Phase 6 FIX: Canopy Material Generator
 * Solves the invisible canopy issue by recalibrating alpha clipping thresholds, 
 * adjusting depth-write rules for volumetric fog, and enabling double-sided rendering.
 */
export function createCanopyMaterial(options = {}) {
        const mat = new THREE.MeshStandardMaterial({
        color: options.color || 0x1e3622, // Dark Redwood Foliage Green
        roughness: 0.85,
        metalness: 0.05,
        
        // Phase 6 FIX: DoubleSide ensures cards are visible from below (crucial for ground perspective)
        side: THREE.DoubleSide, 
        
        // Phase 6 FIX: Use alphaTest for foliage cards instead of pure transparency.
        // Pure transparency breaks volumetric fog depth sorting.
        transparent: false, 
        
        // Phase 6 FIX: Lowered from default high values to 0.15. 
        // This ensures thin needle cards aren't entirely culled by mipmap alpha erosion at a distance.
        alphaTest: 0.15, 
        
        depthWrite: true,
        vertexColors: true, // FIX: Required for injected vColorAttr = color; in ForestRenderer
        ...options
    });

    mat.onBeforeCompile = (shader) => {
        // Expose time and wind uniforms for vertex sway
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWindSpeed = { value: 1.0 };
        shader.uniforms.uFogIntensity = { value: 1.0 }; // Hook for Dev Tools RAW_RENDER_MODE
        shader.uniforms.uForestSunDir = { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() };
        shader.uniforms.uForestSunCol = { value: new THREE.Color(0xfef3c7) };
        shader.uniforms.uRawDebugMode = { value: 0.0 };

        assembleShader(shader, {
            VERTEX_TRANSFORM: `
                // Canopy flutter math utilizing instance windPhase (w) and scaling sway by height (z)
                float windPhase = vInstanceData.w * 6.28318;
                float branchSway = sin(uTime * 1.2 + vWorldPos.x * 0.04 + vWorldPos.z * 0.04 + windPhase) * color.r * 0.8 * vInstanceData.z;
                float leafFlutter = sin(uTime * 6.0 + vWorldPos.y * 0.15 + windPhase) * 0.20; 

                transformed.x += (branchSway + leafFlutter) * uWindSpeed;
                transformed.y += leafFlutter * uWindSpeed;
                transformed.z += (branchSway * 0.5 + leafFlutter) * uWindSpeed;
            `,
                        FRAG_COLOR: `
                // Enforce sharp alpha-testing to carve out evergreen needle shapes
                if (diffuseColor.a < 0.5) {
                    discard;
                }

                // Deterministic color variation using the instance seed
                float seedNoise = fract(sin(vInstanceData.x * 12.9898) * 43758.5453);
                
                vec3 baseNeedleColor = vec3(0.06, 0.18, 0.08);
                vec3 driedNeedleColor = vec3(0.12, 0.15, 0.05);
                
                // Slightly mix in dried needle colors based on seed to break uniformity
                diffuseColor.rgb = mix(baseNeedleColor, driedNeedleColor, seedNoise * 0.3);
            `,
            FRAG_LIGHTING: `
                if (uRawDebugMode < 0.5) {
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    vec3 lightDir = normalize(uForestSunDir);
                    
                    // Subsurface Scattering (SSS) approximation
                    // Distort light vector by normal for structural subsurface thickness simulation
                    vec3 sssHalf = normalize(lightDir + normal * 0.3); 
                    
                    // Transmission occurs when light is behind the surface relative to view
                    float transmission = pow(max(0.0, dot(-viewDir, sssHalf)), 4.0);
                    
                    // Weight by normal to emphasize back-illumination
                    float backfacing = clamp(1.0 - dot(normal, lightDir), 0.0, 1.0);
                    
                    // Warm, scattered light color
                    vec3 sssGlow = uForestSunCol * vec3(0.25, 0.60, 0.10) * transmission * backfacing * 1.5;
                    
                    // Add SSS directly to the final lighting output (gl_FragColor is calculated after this chunk)
                    outgoingLight += sssGlow * diffuseColor.rgb; 
                }
            `
        });
    };

    // Auto-patch into the custom volumetric fog system if it exists globally
    if (typeof window !== 'undefined' && window.VolumetricFogSystem?.patchMaterial) {
        window.VolumetricFogSystem.patchMaterial(mat);
    }

    return mat;
}

/**
 * Bark/Trunk material generator for completeness.
 */
export function createTrunkMaterial(options = {}) {
        const mat = new THREE.MeshStandardMaterial({
        color: options.color || 0x2b170f, // Redwood Bark Base
        roughness: 0.95,
        metalness: 0.02,
        vertexColors: true, // FIX: Required for injected vColorAttr = color; in ForestRenderer
        ...options
    });

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWindSpeed = { value: 1.0 };
        shader.uniforms.uFogIntensity = { value: 1.0 }; 
        shader.uniforms.uForestSunDir = { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() };
        shader.uniforms.uForestSunCol = { value: new THREE.Color(0xfef3c7) };
        shader.uniforms.uRawDebugMode = { value: 0.0 };

        assembleShader(shader, {
            VERTEX_DECLARATIONS: `
                varying vec2 vTrunkUv;
            `,
                        VERTEX_TRANSFORM: `
                vTrunkUv = uv;
                
                // --- Procedural Flared Buttress Base ---
                float rootAngle = atan(position.z, position.x);
                float rootSeed = vInstanceData.x;
                
                // Irregular fluted lobes based on angle and instance seed
                float rootNoise = sin(rootAngle * 3.0 + rootSeed * 17.0) * 0.5 + 
                                  cos(rootAngle * 5.0 - rootSeed * 11.0) * 0.3;
                
                // Inverse exponential taper: widest at y=0, sharply decaying upwards
                float flareDecay = exp(-max(0.0, position.y) * 0.45);
                float flareAmount = (1.5 + rootNoise) * flareDecay;
                
                // Displace vertices outward on the XZ plane
                float distXZ = length(position.xz);
                if (distXZ > 0.001) {
                    vec2 flareDir = position.xz / distXZ;
                    transformed.x += flareDir.x * flareAmount;
                    transformed.z += flareDir.y * flareAmount;
                }
                
                // --- Wind Sway ---
                float windPhase = vInstanceData.w * 6.28318;
                float branchSway = sin(uTime * 1.2 + vWorldPos.x * 0.04 + vWorldPos.z * 0.04 + windPhase) * color.r * 0.8 * vInstanceData.z;
                transformed.x += branchSway * uWindSpeed;
                transformed.z += (branchSway * 0.5) * uWindSpeed;
            `,
            FRAG_DECLARATIONS: `
                varying vec2 vTrunkUv;
                
                // 1. Procedural Bark Height Generator (Seeded)
                float getBarkBump(vec2 trunkUV, float worldY, float seed) {
                    float weave = sin(trunkUV.y * 0.15 + seed * 10.0) * 0.2;
                    float platesA = sin(trunkUV.x * 24.0 + weave);
                    float platesB = sin(trunkUV.x * 15.0 - weave);
                    float interference = (platesA + platesB) * 0.5;
                    float barkShape = 1.0 - pow(abs(interference), 0.7);
                    float ageFade = clamp(1.0 - (worldY * 0.015), 0.2, 1.0);
                    float microFibers = sin(trunkUV.x * 120.0) * cos(trunkUV.y * 40.0) * 0.05;
                    return (barkShape + microFibers) * ageFade;
                }
            `,
            FRAG_NORMAL: `
                // 2. Compute screen-space bark derivatives
                float barkVal = getBarkBump(vTrunkUv, vWorldPos.y, vInstanceData.x);
                float dbdx = dFdx(barkVal);
                float dbdy = dFdy(barkVal);
                
                vec3 vPdx = dFdx(vViewPosition);
                vec3 vPdy = dFdy(vViewPosition);
                
                vec3 rx = cross(vPdy, normal);
                vec3 ry = cross(normal, vPdx);
                
                float det = dot(vPdx, rx);
                
                // 3. Distance fade to prevent shimmering
                float dist = length(vViewPosition);
                float bumpIntensity = smoothstep(100.0, 15.0, dist) * 1.5;

                vec3 bumpNormal = (rx * dbdx + ry * dbdy) * sign(det) / max(abs(det), 1e-7);
                normal = normalize(normal - bumpNormal * bumpIntensity);
            `,
                        FRAG_COLOR: `
                // Deterministic variance using seed
                float seedNoise = fract(sin(vInstanceData.x * 78.233) * 43758.5453);
                
                // Procedural height-based color gradient for redwood trunks
                // Soil Brown -> Cinnamon Red -> Golden/Lighter tips
                vec3 soilBrown = vec3(0.20, 0.12, 0.07);
                vec3 cinnamonRed = vec3(0.42, 0.18, 0.10);
                vec3 goldenTips = vec3(0.55, 0.35, 0.18);
                
                float hFactor = clamp(vWorldPos.y / 100.0, 0.0, 1.0);
                
                vec3 gradientColor = mix(
                    mix(soilBrown, cinnamonRed, smoothstep(0.0, 0.4, hFactor)),
                    goldenTips,
                    smoothstep(0.4, 1.0, hFactor)
                );
                
                vec3 barkBaseColor = mix(gradientColor, gradientColor * 0.7, seedNoise * 0.4);
                vec3 mossColor = vec3(0.12, 0.28, 0.08);

                float barkValSample = getBarkBump(vTrunkUv, vWorldPos.y, vInstanceData.x);
                
                // Fake Ambient Occlusion: Darken the deep crevices so they read despite high ambient light
                float creviceAO = mix(0.55, 1.0, barkValSample);
                barkBaseColor *= creviceAO;
                mossColor *= creviceAO;

                // vColorAttr.b acts as a moss map provided by geometry
                diffuseColor.rgb = mix(barkBaseColor, mossColor, vColorAttr.b);
            `
        });
    };

    if (typeof window !== 'undefined' && window.VolumetricFogSystem?.patchMaterial) {
        window.VolumetricFogSystem.patchMaterial(mat);
    }

    return mat;
}

// Bind to window for global access by the generator systems
if (typeof window !== 'undefined') {
    window.ForestMaterials = {
        createCanopyMaterial,
        createTrunkMaterial
    };
}

export default {
    createCanopyMaterial,
    createTrunkMaterial
};
