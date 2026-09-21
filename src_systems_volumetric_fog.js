// ============================================================================
// Dark Forest Engine - Volumetric Height Fog & Atmospheric In-Scattering
// File: src_systems_volumetric_fog.js
// ============================================================================

import * as THREE from 'three';

class VolumetricFogSystem {
    constructor() {
        this.fogUniforms = {
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uSunColor: { value: new THREE.Color(0xdbeafe) },
            uSunDirection: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uFogDensity: { value: 0.0018 },
            uHeightFogFloor: { value: -5.0 },
            uHeightFogFalloff: { value: 0.028 }, // Calibrated for 100m Redwood height piercing
            uSunScatterIntensity: { value: 0.65 },
            uTime: { value: 0 }
        };
        this.initialized = false;
        
        // Target colors for smooth time-of-day interpolation
        this.currentTargets = {
            fogColor: new THREE.Color(0x0c131a),
            sunColor: new THREE.Color(0xdbeafe)
        };
    }

    /**
     * Patches a Three.js material to inject volumetric height fog equations and directional god-ray scattering.
     * Safe against double-patching.
     * @param {THREE.Material} material 
     */
    patchMaterial(material) {
        if (!material || material.userData.hasVolumetricFog) return;
        material.userData.hasVolumetricFog = true;

        const previousOnBeforeCompile = material.onBeforeCompile;

        material.onBeforeCompile = (shader, renderer) => {
            if (previousOnBeforeCompile) previousOnBeforeCompile(shader, renderer);

            // Bind shared global fog uniforms
            Object.assign(shader.uniforms, this.fogUniforms);

            // Hook Vertex Shader: Pass world space position for height and distance calculation
            shader.vertexShader = `
                varying vec3 vWorldPositionFog;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
                #include <begin_vertex>
                #ifdef USE_INSTANCING
                    vWorldPositionFog = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                #else
                    vWorldPositionFog = (modelMatrix * vec4(position, 1.0)).xyz;
                #endif
                `
            );

            // Hook Fragment Shader: Replace standard linear/exp2 fog with volumetric height fog & god-rays
            shader.fragmentShader = `
                uniform vec3 uFogColor;
                uniform vec3 uSunColor;
                uniform vec3 uSunDirection;
                uniform float uFogDensity;
                uniform float uHeightFogFloor;
                uniform float uHeightFogFalloff;
                uniform float uSunScatterIntensity;
                uniform float uTime;
                varying vec3 vWorldPositionFog;

                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <fog_fragment>`,
                `
                // 1. Ray path and view distance calculation
                vec3 viewVector = vWorldPositionFog - cameraPosition;
                float viewDistance = length(viewVector);
                vec3 rayDir = viewVector / max(viewDistance, 0.0001);

                // 2. Analytical Exponential Height Fog Integral
                float cameraY = cameraPosition.y;
                float heightFactor = exp(-(cameraY - uHeightFogFloor) * uHeightFogFalloff);
                
                // Avoid division by zero when ray is parallel to horizon
                float rayY = abs(rayDir.y) < 0.001 ? 0.001 * sign(rayDir.y + 0.00001) : rayDir.y;
                float heightFog = heightFactor * (1.0 - exp(-viewDistance * rayY * uHeightFogFalloff)) / rayY;

                // 3. Combine distance fog density with height integration
                float effectiveDensity = uFogDensity * clamp(heightFog, 0.15, 4.0);
                float fogFactor = 1.0 - exp(-viewDistance * effectiveDensity);

                // 4. Directional Sunlight In-Scattering (Mie phase approximation for Canopy God-Rays)
                float sunScatter = max(0.0, dot(rayDir, uSunDirection));
                float miePhase = pow(sunScatter, 6.0) * uSunScatterIntensity;
                
                // Add soft dynamic noise flicker to fog rays
                float rayNoise = sin(vWorldPositionFog.x * 0.02 + vWorldPositionFog.z * 0.02 + uTime * 0.5) * 0.05;
                vec3 scatterColor = mix(uFogColor, uSunColor, clamp(miePhase + rayNoise, 0.0, 1.0));

                // 5. Final Color Blend
                gl_FragColor.rgb = mix(gl_FragColor.rgb, scatterColor, clamp(fogFactor, 0.0, 0.94));
                `
            );
        };

        material.needsUpdate = true;
    }

    /**
     * Updates simulation uniforms and smoothly transitions atmospheric colors based on time of day.
     * @param {number} timeSecs - Current engine running time in seconds
     * @param {number} timeOfDayHours - Current game world hour (0.0 to 24.0)
     */
    update(timeSecs, timeOfDayHours) {
        this.fogUniforms.uTime.value = timeSecs;

        if (timeOfDayHours !== undefined) {
            const isNight = timeOfDayHours < 5.0 || timeOfDayHours > 20.0;
            const isSunset = (timeOfDayHours >= 17.5 && timeOfDayHours <= 20.0);
            const isDawn = (timeOfDayHours >= 5.0 && timeOfDayHours <= 7.5);

            if (isNight) {
                this.currentTargets.fogColor.setHex(0x04080e);
                this.currentTargets.sunColor.setHex(0x1e293b);
                this.fogUniforms.uSunScatterIntensity.value = 0.15;
            } else if (isSunset || isDawn) {
                this.currentTargets.fogColor.setHex(0x2d1b2d);
                this.currentTargets.sunColor.setHex(0xf97316); // Golden Amber Sun Rays
                this.fogUniforms.uSunScatterIntensity.value = 1.10; // High in-scattering at low sun angle
            } else {
                // Midday / Daylight
                this.currentTargets.fogColor.setHex(0x0c131a);
                this.currentTargets.sunColor.setHex(0xdbeafe);
                this.fogUniforms.uSunScatterIntensity.value = 0.65;
            }

            // Smoothly interpolate fog and sun colors to avoid abrupt lighting pops
            this.fogUniforms.uFogColor.value.lerp(this.currentTargets.fogColor, 0.02);
            this.fogUniforms.uSunColor.value.lerp(this.currentTargets.sunColor, 0.02);

            // Dynamically update sun vector direction across the sky arc
            const sunAngle = ((timeOfDayHours - 6.0) / 12.0) * Math.PI;
            this.fogUniforms.uSunDirection.value.set(
                Math.cos(sunAngle) * 0.8,
                Math.sin(sunAngle),
                0.4
            ).normalize();
        }
    }
}

// Global Singleton Binding
window.VolumetricFogSystem = new VolumetricFogSystem();
export default VolumetricFogSystem;
