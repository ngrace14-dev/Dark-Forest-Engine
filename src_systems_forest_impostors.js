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
            uMinRadius: { value: 150.0 },
            uMaxRadius: { value: 3000.0 },
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uFogDensity: { value: 0.0018 }
        };
    }

    init(scene) {
        if (this.initialized) return;

        const quadGeo = new THREE.PlaneGeometry(12, 28, 1, 1);
        quadGeo.translate(0, 14, 0);

        const impostorMat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: true,

            vertexShader: `
                uniform float uTime;
                uniform float uMinRadius;
                uniform float uMaxRadius;
                
                varying vec2 vUv;
                varying float vDist;
                varying vec3 vWorldPos;

                void main() {
                    vUv = uv;

                    #ifdef USE_INSTANCING
                        vec3 worldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #else
                        vec3 worldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #endif

                    vWorldPos = worldOrigin;
                    vDist = length(cameraPosition.xz - worldOrigin.xz);

                    // Safe cylindrical billboarding look calculation
                    vec3 look = cameraPosition - worldOrigin;
                    look.y = 0.0;
                    float lookLen = length(look);
                    look = lookLen > 0.001 ? look / lookLen : vec3(0.0, 0.0, 1.0);
                    
                    vec3 up = vec3(0.0, 1.0, 0.0);
                    vec3 right = cross(up, look);

                    vec3 localPos = position;
                    vec3 billboardPos = worldOrigin + right * localPos.x + up * localPos.y;

                    gl_Position = projectionMatrix * viewMatrix * vec4(billboardPos, 1.0);
                }
            `,

            fragmentShader: `
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                uniform float uMinRadius;
                uniform float uMaxRadius;

                varying vec2 vUv;
                varying float vDist;
                varying vec3 vWorldPos;

                void main() {
                    if (vDist < uMinRadius) discard;
                    if (vDist > uMaxRadius) discard;

                    vec2 uv = vUv;

                    float trunkMask = smoothstep(0.12, 0.04, abs(uv.x - 0.5)) * step(uv.y, 0.35);

                    float conePattern = 0.0;
                    for (int i = 0; i < 5; i++) {
                        float tierY = 0.2 + float(i) * 0.16;
                        float tierWidth = (1.0 - (uv.y - tierY) * 2.2) * 0.45;
                        if (uv.y >= tierY && uv.y <= tierY + 0.22) {
                            conePattern += smoothstep(tierWidth, tierWidth - 0.08, abs(uv.x - 0.5));
                        }
                    }

                    float alpha = clamp(trunkMask + conePattern, 0.0, 1.0);
                    if (alpha < 0.1) discard;

                    vec3 darkNeedle = vec3(0.03, 0.09, 0.04);
                    vec3 sunlitTip = vec3(0.12, 0.28, 0.10);
                    vec3 trunkColor = vec3(0.20, 0.11, 0.06);

                    vec3 finalColor = mix(darkNeedle, sunlitTip, uv.y);
                    if (trunkMask > 0.5 && conePattern < 0.2) {
                        finalColor = trunkColor;
                    }

                    float fogFactor = 1.0 - exp(-vDist * uFogDensity);
                    finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 0.95));

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        });

        this.instancedMesh = new THREE.InstancedMesh(quadGeo, impostorMat, this.maxImpostors);
        this.instancedMesh.count = 0;
        this.instancedMesh.frustumCulled = false;

        scene.add(this.instancedMesh);
        this.initialized = true;
    }

    generateDistantForest(centerX, centerZ) {
        if (!this.initialized || !this.instancedMesh) return;

        let index = 0;
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const getTerrainY = (x, z) => {
            const h = window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
            return Number.isFinite(h) ? h : 0;
        };

        const step = 18;
        const maxDistSq = 3000 * 3000;
        const minDistSq = 140 * 140;

        for (let x = -3000; x <= 3000; x += step) {
            for (let z = -3000; z <= 3000; z += step) {
                if (index >= this.maxImpostors) break;

                const distSq = x * x + z * z;
                if (distSq < minDistSq || distSq > maxDistSq) continue;

                const wx = centerX + x + (hash(x, z) - 0.5) * step;
                const wz = centerZ + z + (hash(z, x) - 0.5) * step;

                if (window.RoadManager?.isSafeZone?.({ x: wx, z: wz })) continue;

                const densityNoise = hash(wx * 0.005, wz * 0.005);
                if (densityNoise < 0.25) continue;

                const wy = getTerrainY(wx, wz);
                if (!Number.isFinite(wy)) continue;

                const scale = 0.8 + hash(wx, wz) * 0.6;

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
}

window.ForestImpostorSystem = new ForestImpostorSystem();
