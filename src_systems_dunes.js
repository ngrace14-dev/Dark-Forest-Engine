import * as THREE from 'three';

/**
 * Endless Dunes System
 * Reference: IMG_3348.jpeg Architecture
 */
export class DunesSystem {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;
        // [GLOBAL SHADER UNIFORMS & LOD]
        this.epochState = 0.0; // Drives 14-Day Shift logic
        
        this.initMaterials();
        this.initGeometries();
        this.duneChunks = [];
    }

    initMaterials() {
        // --- 1. PROCEDURAL DESERT SURFACE & WEATHERING ---
        // Applies to the Cube/Wedge primitive assemblies.
        this.duneMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.95,
            metalness: 0.0,
            transparent: true, // For Ground Clipping Fade / Distance Masking
        });

        this.duneMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uCameraPos = { value: new THREE.Vector3() };
            shader.uniforms.uEpochState = { value: 0.0 };

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                #endif
                vNormal = normalize(normalMatrix * normal);
                `
            );

            shader.fragmentShader = `
                uniform vec3 uCameraPos;
                uniform float uEpochState;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>

                // [PROCEDURAL WEATHERING SHADERS]
                // dFdx/dFdy derivatives for deep rock grooves and crevice detection
                vec3 dX = dFdx(vWorldPos * 3.0);
                vec3 dY = dFdy(vWorldPos * 3.0);
                vec3 derivedNormal = normalize(cross(dX, dY));
                
                // Blend flat primitive normals with the high-frequency derived noise
                vec3 finalNormal = normalize(mix(vNormal, derivedNormal, 0.8));

                // [PROCEDURAL DESERT SURFACE]
                // Height-Based Blend (Shader: DuneShadow)
                vec3 dampMudColor = vec3(0.25, 0.20, 0.15);
                vec3 drySandColor = vec3(0.76, 0.69, 0.50);
                
                // Blend based on world height (bases are damp/muddy, peaks are dry sand)
                float heightBlend = smoothstep(-2.0, 6.0, vWorldPos.y);
                vec3 surfaceColor = mix(dampMudColor, drySandColor, heightBlend);

                // Moss & Decay accumulation in crevices (based on normal y and Epoch state)
                float crevice = 1.0 - max(0.0, finalNormal.y);
                vec3 decayColor = vec3(0.22, 0.26, 0.15); // Mossy green/brown
                
                // Epoch shift modifies how much decay is present
                float decayAmount = smoothstep(0.4, 0.8, crevice) * (0.5 + sin(uEpochState) * 0.5);
                diffuseColor.rgb = mix(surfaceColor, decayColor, decayAmount);

                // [SSAO & CONTACT SHADOWS]: Ground Clipping Fade
                float distToCam = distance(vWorldPos, uCameraPos);
                diffuseColor.a *= 1.0 - smoothstep(2500.0, 3000.0, distToCam);
                `
            );
            this.duneShader = shader;
        };

        // --- 2. STAGNANT SWAMP WATER (OASIS) ---
        this.oasisMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2b22, // Swampy green-black
            roughness: 0.05,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });

        this.oasisMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uCameraPos = { value: new THREE.Vector3() };

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vNormal = normalize(normalMatrix * normal);
                `
            );

            shader.fragmentShader = `
                uniform vec3 uCameraPos;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                
                // [STAGNANT SWAMP WATER - (OASIS)]
                // SSS & Fresnel for Complex Reflection
                vec3 viewDir = normalize(uCameraPos - vWorldPos);
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0);
                
                vec3 skyReflectColor = vec3(0.65, 0.70, 0.60); // Murky sky reflection
                diffuseColor.rgb = mix(diffuseColor.rgb, skyReflectColor, fresnel * 0.8);
                `
            );
            this.oasisShader = shader;
        };

        // --- 3. ALPHA-TESTED EVERGREEN TEXTURE - DESERT SCRUB ---
        this.scrubMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d4a2b, // Dry evergreen scrub
            roughness: 0.8,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            transparent: false
        });

        this.scrubMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                varying float vHeight;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vHeight = uv.y;
                `
            );

            shader.fragmentShader = `
                varying float vHeight;
                ${shader.fragmentShader}
            `.replace(
                '#include <lights_fragment_begin>',
                `
                #include <lights_fragment_begin>
                // [Shader: FoliageSSS] Backlighting transmission
                #if NUM_DIR_LIGHTS > 0
                    float backLight = max(0.0, dot(-geometry.normal, directionalLights[0].direction));
                    float sssScatter = pow(backLight, 3.0) * 0.4;
                    vec3 sssGlow = directionalLights[0].color * vec3(0.7, 0.8, 0.2) * sssScatter * vHeight;
                    reflectedLight.directDiffuse += sssGlow;
                #endif
                `
            );
        };
    }

    initGeometries() {
        // [DUNE STRUCTURE: CUBE ASSEMBLIES]
        // Main Form: Scaled Cubes
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        this.cubeGeo.translate(0, 0.5, 0); // Pivot at base
        
        // Windward/Leeward Slopes: Wedge Wedges
        // A cylinder with 3 radial segments creates a triangular prism (wedge)
        this.wedgeGeo = new THREE.CylinderGeometry(1, 1, 1, 3);
        this.wedgeGeo.rotateZ(Math.PI / 2); // Lay it on its side to form a ramp
        this.wedgeGeo.translate(0, 0.5, 0);

        // Oasis Water Plane
        this.oasisGeo = new THREE.PlaneGeometry(60, 60, 16, 16);
        this.oasisGeo.rotateX(-Math.PI / 2);

        // Desert Scrub (Instanced Quad)
        this.scrubGeo = new THREE.PlaneGeometry(1.5, 1.5, 1, 2);
        this.scrubGeo.translate(0, 0.75, 0);
    }

    spawnDuneChunk(scene, centerX, centerZ) {
        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        const duneClusters = 15;
        const cubesPerCluster = 8;
        const wedgesPerCluster = 8;

        const totalCubes = duneClusters * cubesPerCluster;
        const totalWedges = duneClusters * wedgesPerCluster;

        const instancedCubes = new THREE.InstancedMesh(this.cubeGeo, this.duneMaterial, totalCubes);
        const instancedWedges = new THREE.InstancedMesh(this.wedgeGeo, this.duneMaterial, totalWedges);
        
        instancedCubes.castShadow = true; instancedCubes.receiveShadow = true;
        instancedWedges.castShadow = true; instancedWedges.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let cubeIdx = 0;
        let wedgeIdx = 0;

        // Construct composite primitive assemblies
        for (let c = 0; c < duneClusters; c++) {
            const clusterX = (Math.random() - 0.5) * 80;
            const clusterZ = (Math.random() - 0.5) * 80;
            const clusterScale = 5 + Math.random() * 10;
            const clusterRot = Math.random() * Math.PI * 2;

            // Cubes form the core bulk
            for (let i = 0; i < cubesPerCluster; i++) {
                dummy.position.set(
                    clusterX + (Math.random() - 0.5) * clusterScale,
                    -1.0, // Sink into ground slightly
                    clusterZ + (Math.random() - 0.5) * clusterScale
                );
                dummy.rotation.set(0, clusterRot + (Math.random()-0.5)*0.5, 0);
                dummy.scale.set(clusterScale * 0.8, clusterScale * Math.random(), clusterScale * 0.8);
                dummy.updateMatrix();
                instancedCubes.setMatrixAt(cubeIdx++, dummy.matrix);
            }

            // Wedges form the windward/leeward slopes against the cubes
            for (let i = 0; i < wedgesPerCluster; i++) {
                dummy.position.set(
                    clusterX + (Math.random() - 0.5) * (clusterScale * 1.5),
                    -1.0,
                    clusterZ + (Math.random() - 0.5) * (clusterScale * 1.5)
                );
                // Align wedges to roughly face the same wind direction (clusterRot)
                dummy.rotation.set(0, clusterRot + (Math.random() > 0.5 ? 0 : Math.PI), 0);
                dummy.scale.set(clusterScale, clusterScale * 0.6, clusterScale);
                dummy.updateMatrix();
                instancedWedges.setMatrixAt(wedgeIdx++, dummy.matrix);
            }
        }

        instancedCubes.instanceMatrix.needsUpdate = true;
        instancedWedges.instanceMatrix.needsUpdate = true;
        chunkGroup.add(instancedCubes);
        chunkGroup.add(instancedWedges);

        // Oasis Plane (Stagnant Swamp Water)
        const oasis = new THREE.Mesh(this.oasisGeo, this.oasisMaterial);
        oasis.position.y = -0.5; // Slightly submerged into the damp soil base
        chunkGroup.add(oasis);

        // Desert Scrub (Instanced Quad clusters ~3,000x)
        const scrubInstances = new THREE.InstancedMesh(this.scrubGeo, this.scrubMaterial, 3000);
        scrubInstances.castShadow = true;
        
        for (let i = 0; i < 3000; i++) {
            dummy.position.set(
                (Math.random() - 0.5) * 100,
                0, // Base level, usually sticking out of the mud/sand transition
                (Math.random() - 0.5) * 100
            );
            dummy.rotation.set(0, Math.random() * Math.PI, 0);
            const scale = 0.5 + Math.random() * 0.8;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            scrubInstances.setMatrixAt(i, dummy.matrix);
        }
        scrubInstances.instanceMatrix.needsUpdate = true;
        chunkGroup.add(scrubInstances);

        scene.add(chunkGroup);
        this.duneChunks.push(chunkGroup);
        return chunkGroup;
    }

    update(delta, camera, worldDay = 0) {
        this.time += delta;
        
        // Epoch state simulates a 14-day global shift
        this.epochState = (worldDay % 14) / 14.0 * Math.PI * 2.0;

        if (this.duneShader) {
            this.duneShader.uniforms.uCameraPos.value.copy(camera.position);
            this.duneShader.uniforms.uEpochState.value = this.epochState;
        }
        if (this.oasisShader) {
            this.oasisShader.uniforms.uCameraPos.value.copy(camera.position);
        }
    }
}
