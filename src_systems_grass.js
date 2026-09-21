import * as THREE from 'three';

class GrassSystem {
    constructor() {
        this.instancedMesh = null;
        this.maxBlades = 40000;
        this.windUniforms = { uTime: { value: 0 } };
        this.dummy = new THREE.Object3D();
        this.initialized = false;
    }

    init(scene) {
        if (this.initialized) return;

        // Low-poly blade geometry (3 vertices per blade)
        const bladeGeo = new THREE.ConeGeometry(0.12, 1.2, 3);
        bladeGeo.translate(0, 0.6, 0); // Align base to ground level

        // Procedural Grass Shader (Gradient + Wind Sway)
        const bladeMat = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        bladeMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.windUniforms.uTime;

            shader.vertexShader = `
                uniform float uTime;
                varying float vHeightFactor;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
                #include <begin_vertex>

                float heightFactor = clamp(position.y / 1.2, 0.0, 1.0);
                vHeightFactor = heightFactor;

                // Wind sway calculation on top vertices
                #ifdef USE_INSTANCING
                    vec3 worldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                #else
                    vec3 worldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                #endif

                float wave = sin(uTime * 3.0 + worldOrigin.x * 0.2 + worldOrigin.z * 0.2) * 0.35 * heightFactor;
                transformed.x += wave;
                transformed.z += wave * 0.5;
                `
            );

            shader.fragmentShader = `
                varying float vHeightFactor;
                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `
                #include <color_fragment>
                // Procedural Gradient: Dark root to vibrant tip
                vec3 rootColor = vec3(0.05, 0.15, 0.04);
                vec3 tipColor = vec3(0.22, 0.52, 0.15);
                diffuseColor.rgb = mix(rootColor, tipColor, vHeightFactor);
                `
            );
        };

        this.instancedMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, this.maxBlades);
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.count = 0;

        scene.add(this.instancedMesh);
        this.initialized = true;
    }

    generateAroundPlayer(centerX, centerZ, radius = 40) {
        if (!this.initialized || !this.instancedMesh) return;

        let index = 0;
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);

        for (let i = 0; i < this.maxBlades; i++) {
            const rx = (hash(i, centerX) - 0.5) * radius * 2;
            const rz = (hash(centerZ, i) - 0.5) * radius * 2;
            const worldX = centerX + rx;
            const worldZ = centerZ + rz;

            // Skip safe paths / roads
            const isRoad = window.RoadManager?.isSafeZone?.({ x: worldX, z: worldZ });
            if (isRoad) continue;

            const worldY = getTerrainY(worldX, worldZ);
            const scale = 0.7 + hash(worldX, worldZ) * 0.6;

            this.dummy.position.set(worldX, worldY, worldZ);
            this.dummy.rotation.set(0, hash(i, i) * Math.PI * 2, 0);
            this.dummy.scale.set(scale, scale, scale);
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
        
        // Follow player position
        if (window.GameCore?.playerObj?.visual && this.initialized) {
            const pos = window.GameCore.playerObj.visual.position;
            // Regenerate foliage grid if player moves significantly
            if (!this.lastPos || this.lastPos.distanceToSquared(pos) > 100) {
                this.generateAroundPlayer(pos.x, pos.z);
                this.lastPos = pos.clone();
            }
        }
    }
}

window.GrassSystem = new GrassSystem();
