import * as THREE from 'three';

class ForestImpostorSystem {
    constructor() {
        this.instancedMesh = null;
        this.maxImpostors = 200000; // Capacity for ~200,000 distant trees
        this.dummy = new THREE.Object3D();
        this.initialized = false;
        this.lastPlayerChunk = { x: null, z: null };

        this.uniforms = {
            uTime: { value: 0 },
            uMinRadius: { value: 150.0 }, // Switch threshold from 3D trees to impostors
            uMaxRadius: { value: 3000.0 }, // 3km draw distance
            uFogColor: { value: new THREE.Color(0x0c131a) },
            uFogDensity: { value: 0.0018 }
        };
    }

    init(scene) {
        if (this.initialized) return;

        // Low-poly 2D quad for billboarding
        const quadGeo = new THREE.PlaneGeometry(12, 28, 1, 1);
        quadGeo.translate(0, 14, 0); // Origin at tree base

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

                    // Cylindrical Billboarding (Always face camera horizontally around Y-axis)
                    vec3 look = cameraPosition - worldOrigin;
                    look.y = 0.0;
                    look = normalize(look);
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
                    // Culling boundaries: hide near 3D tree zone (<150m) and beyond horizon (>3km)
                    if (vDist < uMinRadius) discard;
                    if (vDist > uMaxRadius) discard;

                    vec2 uv = vUv;

                    // --- PROCEDURAL REDWOOD / PINE SILHOUETTE ---
                    // Trunk center stem
                    float trunkMask = smoothstep(0.12, 0.04, abs(uv.x - 0.5)) * step(uv.y, 0.35);

                    // Tiered bough triangles math
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

                    // --- PROCEDURAL COLOR GRADIENT & BACKLIGHTING ---
                    vec3 darkNeedle = vec3(0.03, 0.09, 0.04);
                    vec3 sunlitTip = vec3(0.12, 0.28, 0.10);
                    vec3 trunkColor = vec3(0.20, 0.11, 0.06);

                    vec3 finalColor = mix(darkNeedle, sunlitTip, uv.y);
                    if (trunkMask > 0.5 && conePattern < 0.2) {
                        finalColor = trunkColor;
                    }

                    // --- VOLUMETRIC HORIZON FOG BLEND ---
                    float fogFactor = 1.0 - exp(-vDist * uFogDensity);
                    finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 0.95));

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        });

        this.instancedMesh = new THREE.InstancedMesh(quadGeo, impostorMat, this.maxImpostors);
        this.instancedMesh.count = 0;
        this.instancedMesh.frustumCulled = false; // Custom GPU clip handling inside vertex shader

        scene.add(this.instancedMesh);
        this.initialized = true;
    }

    // Populate vast 3km forest canopy grid using deterministic spatial hashing
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

        // Grid stepping over 3km outer radius (18m tree distribution grid)
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

                // Skip roads & safe path zones
                if (window.RoadManager?.isSafeZone?.({ x: wx, z: wz })) continue;

                // Density noise check (creates realistic forest clearings & thickets)
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

        // Inherit fog color dynamically from VolumetricFogSystem
        if (window.VolumetricFogSystem?.fogUniforms?.uFogColor) {
            this.uniforms.uFogColor.value.copy(window.VolumetricFogSystem.fogUniforms.uFogColor.value);
        }

        // Re-center distant canopy grid when player moves across chunk boundaries (120m step)
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
