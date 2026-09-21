import * as THREE from 'three';

class GrassSystem {
    constructor() {
        this.instancedMesh = null;
        this.maxBlades = 100000; // Expanded pool for 120m draw distance
        this.windUniforms = { 
            uTime: { value: 0 },
            uMaxRadius: { value: 120.0 }
        };
        this.dummy = new THREE.Object3D();
        this.initialized = false;
        this.lastPos = null;
    }

    init(scene) {
        if (this.initialized) return;

        // Ultra-light 2-triangle cross blade
        const bladeGeo = new THREE.PlaneGeometry(0.3, 1.4, 1, 2);
        bladeGeo.translate(0, 0.7, 0); 

        const bladeMat = new THREE.MeshStandardMaterial({
            roughness: 0.85,
            metalness: 0.05,
            side: THREE.DoubleSide
        });

        bladeMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.windUniforms.uTime;
            shader.uniforms.uMaxRadius = this.windUniforms.uMaxRadius;

            shader.vertexShader = `
                uniform float uTime;
                uniform float uMaxRadius;
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

                // Smooth horizon fade out at maximum distance
                float dist = length(cameraPosition.xz - worldOrigin.xz);
                vDistFade = 1.0 - smoothstep(uMaxRadius * 0.7, uMaxRadius, dist);

                // Wind sway calculation
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
                vec3 rootColor = vec3(0.04, 0.12, 0.03);
                vec3 tipColor = vec3(0.18, 0.45, 0.12);
                diffuseColor.rgb = mix(rootColor, tipColor, vHeightFactor);
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <dither_fragment>`,
                `
                #include <dither_fragment>
                // Discard distant blades smoothly to eliminate popping lines
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

        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);

        for (let i = 0; i < this.maxBlades; i++) {
            const r = Math.sqrt(hash(i, centerX)) * radius;
            const theta = hash(centerZ, i) * Math.PI * 2;

            const worldX = centerX + r * Math.cos(theta);
            const worldZ = centerZ + r * Math.sin(theta);

            const isRoad = window.RoadManager?.isSafeZone?.({ x: worldX, z: worldZ });
            if (isRoad) continue;

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
            if (!this.lastPos || this.lastPos.distanceToSquared(pos) > 144) {
                this.generateAroundPlayer(pos.x, pos.z, 120);
                this.lastPos = pos.clone();
            }
        }
    }
}

window.GrassSystem = new GrassSystem();
