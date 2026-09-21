import * as THREE from 'three';

class GrassSystem {
    constructor() {
        this.instancedMesh = null;
        this.maxBlades = 100000;
        this.windUniforms = { 
            uTime: { value: 0 },
            uMaxRadius: { value: 120.0 },
            uPlayerPos: { value: new THREE.Vector3() }
        };
        this.dummy = new THREE.Object3D();
        this.initialized = false;
        this.lastPos = null;
    }

    init(scene) {
        if (this.initialized) return;

        const bladeGeo = new THREE.PlaneGeometry(0.3, 1.4, 1, 3);
        bladeGeo.translate(0, 0.7, 0); 

        const bladeMat = new THREE.MeshStandardMaterial({
            roughness: 0.75,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        bladeMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.windUniforms.uTime;
            shader.uniforms.uMaxRadius = this.windUniforms.uMaxRadius;
            shader.uniforms.uPlayerPos = this.windUniforms.uPlayerPos;

            shader.vertexShader = `
                uniform float uTime;
                uniform float uMaxRadius;
                uniform vec3 uPlayerPos;
                varying float vHeightFactor;
                varying float vDistFade;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
                #include <begin_vertex>

                float heightFactor = clamp(position.y / 1.4, 0.0, 1.0);
                vHeightFactor = heightFactor;

                #ifdef USE_INSTANCING
                    vec3 worldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                #else
                    vec3 worldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                #endif

                // Safe Player Trampling (Guards against NaN division by zero)
                vec3 playerVec = worldOrigin - uPlayerPos;
                float playerDist = length(playerVec.xz);
                float pushRadius = 2.2;
                if (playerDist < pushRadius) {
                    float pushStrength = (1.0 - (playerDist / pushRadius)) * heightFactor * 1.2;
                    vec3 pushDir = playerDist > 0.001 ? normalize(vec3(playerVec.x, 0.0, playerVec.z)) : vec3(0.0, 0.0, 1.0);
                    transformed.xz += pushDir.xz * pushStrength;
                    transformed.y -= pushStrength * 0.4;
                }

                // Curved Geometry Bend
                transformed.z += pow(heightFactor, 2.0) * 0.3;

                // Horizon Distance Fade
                float dist = length(cameraPosition.xz - worldOrigin.xz);
                vDistFade = 1.0 - smoothstep(uMaxRadius * 0.7, uMaxRadius, dist);

                // Wind Sway
                float wave = sin(uTime * 2.8 + worldOrigin.x * 0.15 + worldOrigin.z * 0.15) * 0.4 * heightFactor;
                transformed.x += wave;
                transformed.z += wave * 0.5;
                `
            );

            shader.fragmentShader = `
                varying float vHeightFactor;
                varying float vDistFade;
                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `
                #include <color_fragment>
                vec3 rootColor = vec3(0.02, 0.08, 0.02);
                vec3 tipColor = vec3(0.22, 0.52, 0.14);
                vec3 dryTipColor = vec3(0.45, 0.42, 0.18);

                vec3 bladeGrad = mix(rootColor, tipColor, vHeightFactor);
                if (vHeightFactor > 0.8) {
                    bladeGrad = mix(bladeGrad, dryTipColor, (vHeightFactor - 0.8) * 2.0);
                }

                diffuseColor.rgb = bladeGrad;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <dither_fragment>`,
                `
                #include <dither_fragment>
                if (vDistFade < 0.05) discard;
                `
            );
        };

        this.instancedMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, this.maxBlades);
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.castShadow = false;
        this.instancedMesh.count = 0;

        scene.add(this.instancedMesh);
        this.initialized = true;
    }

    generateAroundPlayer(centerX, centerZ, radius = 120) {
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

        for (let i = 0; i < this.maxBlades; i++) {
            const r = Math.sqrt(hash(i, centerX)) * radius;
            const theta = hash(centerZ, i) * Math.PI * 2;

            const worldX = centerX + r * Math.cos(theta);
            const worldZ = centerZ + r * Math.sin(theta);

            if (window.RoadManager?.isSafeZone?.({ x: worldX, z: worldZ })) continue;

            const worldY = getTerrainY(worldX, worldZ);

            const distRatio = r / radius; 
            const distanceScaleBonus = 1.0 + (distRatio * 1.4); 
            const baseScale = (0.7 + hash(worldX, worldZ) * 0.5) * distanceScaleBonus;

            this.dummy.position.set(worldX, worldY, worldZ);
            this.dummy.rotation.set(0, hash(i, i) * Math.PI * 2, 0);
            this.dummy.scale.set(baseScale, baseScale, baseScale);
            this.dummy.updateMatrix();

            this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
            index++;
        }

        this.instancedMesh.count = index;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.instancedMesh.computeBoundingSphere();
    }

    update(delta) {
        this.windUniforms.uTime.value = performance.now() / 1000;

        if (window.GameCore?.playerObj?.visual && this.initialized) {
            const pos = window.GameCore.playerObj.visual.position;
            this.windUniforms.uPlayerPos.value.copy(pos);

            if (!this.lastPos || this.lastPos.distanceToSquared(pos) > 144) {
                this.generateAroundPlayer(pos.x, pos.z, 120);
                this.lastPos = pos.clone();
            }
        }
    }
}

window.GrassSystem = new GrassSystem();
