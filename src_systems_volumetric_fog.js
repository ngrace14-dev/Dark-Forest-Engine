import * as THREE from 'three';

class VolumetricFogSystem {
    constructor() {
        this.fogUniforms = {
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uSunColor: { value: new THREE.Color(0xdbeafe) },
            uSunDirection: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
            uFogDensity: { value: 0.0018 },
            uHeightFogFloor: { value: -5.0 },
            uHeightFogFalloff: { value: 0.045 },
            uTime: { value: 0 }
        };
        this.initialized = false;
    }

    // Patch Three.js Standard Materials to inject atmospheric height-fog GLSL
    patchMaterial(material) {
        if (!material || material.userData.hasVolumetricFog) return;
        material.userData.hasVolumetricFog = true;

        const previousOnBeforeCompile = material.onBeforeCompile;

        material.onBeforeCompile = (shader, renderer) => {
            if (previousOnBeforeCompile) previousOnBeforeCompile(shader, renderer);

            Object.assign(shader.uniforms, this.fogUniforms);

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

            shader.fragmentShader = `
                uniform vec3 uFogColor;
                uniform vec3 uSunColor;
                uniform vec3 uSunDirection;
                uniform float uFogDensity;
                uniform float uHeightFogFloor;
                uniform float uHeightFogFalloff;
                uniform float uTime;
                varying vec3 vWorldPositionFog;

                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <fog_fragment>`,
                `
                // Calculate distance and height-based volumetric fog density
                vec3 viewVector = vWorldPositionFog - cameraPosition;
                float viewDistance = length(viewVector);
                vec3 rayDir = viewVector / viewDistance;

                // Height attenuation (fog settles thick in low valleys, clears on peaks)
                float deltaY = vWorldPositionFog.y - cameraPosition.y;
                float heightFactor = exp(- (cameraPosition.y - uHeightFogFloor) * uHeightFogFalloff);
                float heightFog = heightFactor * (1.0 - exp(-viewDistance * rayDir.y * uHeightFogFalloff)) / max(rayDir.y, 0.0001);

                // Combine distance fog with height fog
                float fogFactor = 1.0 - exp(-viewDistance * uFogDensity * clamp(heightFog, 0.2, 3.0));

                // Sun scattering (in-scattering glow when looking toward the sun)
                float sunScatter = max(0.0, dot(rayDir, uSunDirection));
                vec3 finalFogColor = mix(uFogColor, uSunColor, pow(sunScatter, 4.0) * 0.45);

                gl_FragColor.rgb = mix(gl_FragColor.rgb, finalFogColor, clamp(fogFactor, 0.0, 0.92));
                `
            );
        };

        material.needsUpdate = true;
    }

    update(timeSecs, timeOfDayHours) {
        this.fogUniforms.uTime.value = timeSecs;

        // Dynamic Time-of-Day Atmospheric Tint Shift
        if (timeOfDayHours !== undefined) {
            const isNight = timeOfDayHours < 6 || timeOfDayHours > 19;
            const isSunset = (timeOfDayHours >= 17 && timeOfDayHours <= 19) || (timeOfDayHours >= 5 && timeOfDayHours <= 7);

            if (isNight) {
                this.fogUniforms.uFogColor.value.setHex(0x04080e);
                this.fogUniforms.uSunColor.value.setHex(0x1e293b);
            } else if (isSunset) {
                this.fogUniforms.uFogColor.value.setHex(0x2d1b2d);
                this.fogUniforms.uSunColor.value.setHex(0xf97316);
            } else {
                this.fogUniforms.uFogColor.value.setHex(0x0c131a);
                this.fogUniforms.uSunColor.value.setHex(0xdbeafe);
            }
        }
    }
}

window.VolumetricFogSystem = new VolumetricFogSystem();
