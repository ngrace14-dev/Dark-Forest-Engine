
// ============================================================================
// Dark Forest Engine - Foliage Alpha Calibration & Shaders
// File: src/shaders/forest_materials.js
// ============================================================================

import * as THREE from 'three';

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
        ...options
    });

    mat.onBeforeCompile = (shader) => {
        // Expose time and wind uniforms for vertex sway
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWindSpeed = { value: 1.0 };
        shader.uniforms.uFogIntensity = { value: 1.0 }; // Hook for Dev Tools RAW_RENDER_MODE

        shader.vertexShader = `
            uniform float uTime;
            uniform float uWindSpeed;
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `.replace(
            `#include <begin_vertex>`,
            `
            #include <begin_vertex>
            
            #ifdef USE_INSTANCING
                vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
            #else
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            #endif

            // Canopy flutter math (distinct from trunk sway)
            float flutter = sin(uTime * 4.0 + vWorldPos.x * 0.5 + vWorldPos.z * 0.5) * 0.1;
            transformed.y += flutter * uWindSpeed;
            transformed.x += (flutter * 0.5) * uWindSpeed;
            `
        );

        shader.fragmentShader = `
            uniform float uFogIntensity;
            varying vec3 vWorldPos;
            ${shader.fragmentShader}
        `.replace(
            `#include <fog_fragment>`,
            `
            // Phase 6 FIX: Protect canopy silhouette readability in heavy fog
            #ifdef USE_FOG
                float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
                fogFactor *= uFogIntensity; // Allow UI to toggle/scale fog interference
                gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
            #endif
            `
        );
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
        ...options
    });

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
