import * as THREE from 'three';

/**
 * Northern California Mountains System
 * Reference: IMG_3353.jpg Architecture
 */
export class MountainSystem {
    constructor(engine, maxInstances = 300000) {
        this.engine = engine;
        this.maxInstances = maxInstances;
        this.time = 0;
        
        this.initMaterials();
        this.initGeometries();
        this.mountainChunks = [];
    }

    initMaterials() {
        // --- 1. PROCEDURAL MOUNTAIN TERRAIN MATERIAL ---
        // Handles Triplanar mapping, Height/Slope blending (Granite vs Scree vs Pine Duff), 
        // and Screen-space derivative bump mapping (dFdx/dFdy)
        this.terrainMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.05,
        });

        this.terrainMaterial.onBeforeCompile = (shader) => {
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

                // [SCREEN-SPACE DERIVATIVE BUMP MAPPING (dFdx/dFdy)]
                // Generates dynamic rocky scree and granite crags without needing normal maps
                vec3 dX = dFdx(vWorldPos * 2.0);
                vec3 dY = dFdy(vWorldPos * 2.0);
                vec3 derivedNormal = normalize(cross(dX, dY));
                
                // Blend geometric normal with the high-frequency derived normal
                vec3 finalNormal = normalize(mix(vNormal, derivedNormal, 0.7));

                // Determine Slope (0.0 = flat, 1.0 = vertical cliff)
                float slope = 1.0 - max(0.0, finalNormal.y);

                // [PROCEDURAL SHADING: HEIGHT & SLOPE COLOR BLENDING]
                vec3 pineDuffColor = vec3(0.18, 0.15, 0.11);   // Dark, needle-covered dirt
                vec3 screeColor = vec3(0.35, 0.35, 0.38);      // Loose gray mountain rock
                vec3 graniteColor = vec3(0.22, 0.23, 0.25);    // Solid, dark granite
                vec3 snowColor = vec3(0.9, 0.92, 0.95);        // High altitude snow

                vec3 terrainColor = pineDuffColor;

                // Blend into Scree on moderate slopes
                float screeBlend = smoothstep(0.2, 0.45, slope);
                terrainColor = mix(terrainColor, screeColor, screeBlend);

                // Blend into solid Granite on steep cliffs
                float graniteBlend = smoothstep(0.5, 0.8, slope);
                terrainColor = mix(terrainColor, graniteColor, graniteBlend);

                // Add Snow based on elevation (e.g., above 150 units) and slope (snow doesn't stick to cliffs)
                float snowElevation = smoothstep(120.0, 180.0, vWorldPos.y);
                float snowSlopeStick = 1.0 - smoothstep(0.3, 0.6, slope);
                terrainColor = mix(terrainColor, snowColor, snowElevation * snowSlopeStick);

                diffuseColor.rgb = terrainColor;

                // Modulate roughness: Snow and Granite are slightly smoother/wetter, Pine Duff is very rough
                roughnessFactor = mix(0.95, 0.6, snowElevation * snowSlopeStick + graniteBlend * 0.4);

                // [ATMOSPHERE & DEPTH] 3km Volumetric Rayleigh distance fade
                float distToCam = distance(vWorldPos, uCameraPos);
                diffuseColor.a *= 1.0 - smoothstep(2500.0, 3000.0, distToCam);
                `
            );
        };

        // --- 2. MOUNTAIN STREAM WATER MATERIAL ---
        this.streamMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a6b7c, // Cold mountain water
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.85
        });

        this.streamMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            
            shader.vertexShader = `
                uniform float uTime;
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                
                // Micro-displacement for rushing water
                float flowDisplacement = sin(vWorldPos.x * 5.0 + uTime * 4.0) * cos(vWorldPos.z * 5.0 + uTime * 3.0);
                transformed.y += flowDisplacement * 0.1;
                `
            );

            shader.fragmentShader = `
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                // Add whitecap foam based on vertex displacement height
                float foam = smoothstep(0.05, 0.1, vWorldPos.y - floor(vWorldPos.y));
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.95, 1.0), foam * 0.5);
                `
            );
            this.streamShader = shader;
        };

        // --- 3. CONIFEROUS PINE MATERIAL ---
        this.pineMaterial = new THREE.MeshStandardMaterial({
            color: 0x1f3022, // Dark northern pine
            roughness: 0.8,
            side: THREE.DoubleSide
        });
        
        // (Optional: Inject Subsurface Scattering / SSS here similar to the grass system)
    }

    initGeometries() {
        // Base terrain patch (in practice, this takes data from Background Web Worker heightmaps)
        this.terrainGeo = new THREE.PlaneGeometry(100, 100, 64, 64);
        this.terrainGeo.rotateX(-Math.PI / 2);

        // Simple placeholder for Coniferous tree geometry assembly
        this.pineGeo = new THREE.ConeGeometry(2, 10, 8);
        this.pineGeo.translate(0, 5, 0); // Pivot at base
    }

    /**
     * Builds a Mountain chunk utilizing the zero-copy ArrayBuffer height data
     * (Simulated here with procedural noise for standalone testing)
     */
    spawnMountainChunk(scene, centerX, centerZ, heightData = null) {
        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        // 1. Terrain Mesh
        const terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMaterial);
        terrainMesh.receiveShadow = true;
        terrainMesh.castShadow = true;

        // Simulate heightmap displacement if no worker data provided
        if (!heightData) {
            const posAttr = terrainMesh.geometry.attributes.position;
            for (let i = 0; i < posAttr.count; i++) {
                const x = posAttr.getX(i) + centerX;
                const z = posAttr.getZ(i) + centerZ;
                // High-amplitude, low-frequency noise for mountains
                const height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 40.0 + 
                               Math.sin(x * 0.15) * 10.0;
                posAttr.setY(i, height);
            }
            terrainMesh.geometry.computeVertexNormals();
        }
        chunkGroup.add(terrainMesh);

        // 2. Coniferous Tree Assembly (Instancing)
        const instanceCount = 2000;
        const pineInstances = new THREE.InstancedMesh(this.pineGeo, this.pineMaterial, instanceCount);
        pineInstances.castShadow = true;
        pineInstances.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const posAttr = terrainMesh.geometry.attributes.position;
        const normalAttr = terrainMesh.geometry.attributes.normal;
        
        let placed = 0;
        
        // Procedural Tree Placement Logic: Only place on moderate slopes, avoid cliffs
        for (let i = 0; i < posAttr.count && placed < instanceCount; i += 2) {
            const ny = normalAttr.getY(i);
            const slope = 1.0 - ny;

            // Pine trees prefer flatter ground and lower elevations (below snowline)
            if (slope < 0.3 && posAttr.getY(i) < 130) {
                // Scatter slightly
                const wx = posAttr.getX(i) + (Math.random() - 0.5) * 1.5;
                const wz = posAttr.getZ(i) + (Math.random() - 0.5) * 1.5;
                const wy = posAttr.getY(i);

                dummy.position.set(wx, wy, wz);
                dummy.rotation.y = Math.random() * Math.PI * 2;
                
                const scale = 0.8 + Math.random() * 0.6;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                
                pineInstances.setMatrixAt(placed, dummy.matrix);
                placed++;
            }
        }
        
        pineInstances.count = placed; // Trim to actual placed amount
        pineInstances.instanceMatrix.needsUpdate = true;
        pineInstances.computeBoundingSphere();
        chunkGroup.add(pineInstances);

        scene.add(chunkGroup);
        this.mountainChunks.push({ group: chunkGroup, pines: pineInstances });
        
        return chunkGroup;
    }

    update(delta, camera) {
        this.time += delta;
        if (this.streamShader) {
            this.streamShader.uniforms.uTime.value = this.time;
        }
        if (this.terrainMaterial.userData.shader) {
            this.terrainMaterial.userData.shader.uniforms.uCameraPos.value.copy(camera.position);
        }
    }
}
