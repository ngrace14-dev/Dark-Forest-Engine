import * as THREE from 'three';

export class GrassRenderer {
    constructor(engine, maxInstances = 500000) {
        this.engine = engine;
        this.maxInstances = maxInstances;
        this.time = 0;
        
        this.maxInteractiveEntities = 16;
        this.playerPositions = new Array(this.maxInteractiveEntities).fill(null).map(() => new THREE.Vector3(9999, 9999, 9999));
        this.activePlayerCount = 0;

        this.initMaterials();
        this.initGeometry();
        this.grassChunks = [];
    }

    initMaterials() {
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a7c29, 
            roughness: 0.6,
            side: THREE.DoubleSide,
            alphaTest: 0.5, 
            transparent: false, 
        });

        this.grassMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uPlayerPositions = { value: this.playerPositions };
            shader.uniforms.uPlayerCount = { value: 0 };
            
            shader.vertexShader = `
                uniform float uTime;
                uniform vec3 uPlayerPositions[${this.maxInteractiveEntities}];
                uniform int uPlayerCount;

                varying float vHeight;
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vHeight = uv.y; 

                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                #endif

                float windWave = sin(vWorldPos.x * 0.5 + uTime) * cos(vWorldPos.z * 0.5 + (uTime * 0.8));
                float gust = sin(uTime * 2.0 + vWorldPos.x * 0.1) * 0.5 + 0.5;
                float swayAmount = windWave * (0.2 + gust * 0.3) * pow(vHeight, 2.0);
                
                transformed.x += swayAmount;
                transformed.z += swayAmount;

                vec2 totalTrample = vec2(0.0);
                for (int i = 0; i < ${this.maxInteractiveEntities}; i++) {
                    if (i >= uPlayerCount) break;
                    vec3 playerPos = uPlayerPositions[i];
                    float dist = distance(vWorldPos.xz, playerPos.xz);
                    float trampleRadius = 1.5; 
                    if (dist < trampleRadius) {
                        vec2 pushDir = normalize(vWorldPos.xz - playerPos.xz + vec2(0.001)); 
                        float pushFactor = (1.0 - (dist / trampleRadius)) * pow(vHeight, 1.5);
                        totalTrample += pushDir * pushFactor * 1.2;
                    }
                }

                transformed.x += totalTrample.x;
                transformed.z += totalTrample.y;

                float totalOffset = length(vec2(swayAmount) + totalTrample);
                transformed.y -= abs(totalOffset) * 0.4 * vHeight; 
                `
            );

            shader.fragmentShader = `
                varying float vHeight;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                float dist = distance(vWorldPos, cameraPosition);
                if (dist > 150.0) discard; 

                vec3 rootColor = vec3(0.06, 0.08, 0.02);
                vec3 tipColor = diffuseColor.rgb;
                
                diffuseColor.rgb = mix(rootColor, tipColor, smoothstep(0.0, 0.4, vHeight));
                `
            ).replace(
                '#include <lights_fragment_begin>',
                `
                #include <lights_fragment_begin>
                #if NUM_DIR_LIGHTS > 0
                    vec3 mainLightDir = directionalLights[0].direction;
                    float backLight = max(0.0, dot(-normal, mainLightDir));
                    float sssScatter = pow(backLight, 3.0) * 0.6;
                    vec3 sssGlow = directionalLights[0].color * vec3(0.6, 0.9, 0.2) * sssScatter * vHeight;
                    reflectedLight.directDiffuse += sssGlow;
                #endif
                `
            );
            this.grassShader = shader;
        };
    }

    initGeometry() {
        this.bladeGeo = new THREE.PlaneGeometry(0.1, 0.6, 1, 3);
        this.bladeGeo.translate(0, 0.3, 0); 
    }

    spawnGrassChunk(scene, startX, startZ, patchSize = 20, density = 40000) {
        const instancedGrass = new THREE.InstancedMesh(this.bladeGeo, this.grassMaterial, density);
        instancedGrass.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        instancedGrass.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        for (let i = 0; i < density; i++) {
            const wx = startX + (Math.random() - 0.5) * patchSize;
            const wz = startZ + (Math.random() - 0.5) * patchSize;
            const wy = getTerrainY(wx, wz);

            dummy.position.set(wx, wy, wz);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.7 + Math.random() * 0.6;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            instancedGrass.setMatrixAt(i, dummy.matrix);
        }

        instancedGrass.instanceMatrix.needsUpdate = true;
        instancedGrass.computeBoundingSphere();
        scene.add(instancedGrass);
        this.grassChunks.push(instancedGrass);
        return instancedGrass;
    }

    update(delta, entityPositions = []) {
        this.time += delta;
        if (this.grassShader) {
            this.grassShader.uniforms.uTime.value = this.time;
            const count = Math.min(entityPositions.length, this.maxInteractiveEntities);
            this.grassShader.uniforms.uPlayerCount.value = count;
            for (let i = 0; i < count; i++) {
                this.playerPositions[i].copy(entityPositions[i]);
            }
        }
    }
}
