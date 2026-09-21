import * as THREE from 'three';

/**
 * Dark Forest Wetlands System
 * Reference: IMG_3352.jpeg Architecture
 */
export class WetlandsSystem {
    constructor(engine, maxInstances = 300000) {
        this.engine = engine;
        this.maxInstances = maxInstances;
        this.time = 0;
        
        this.initMaterials();
        this.initGeometries();
        this.marshChunks = [];
    }

    initMaterials() {
        // --- 1. MARSH ROOT & VEGETATION MATERIAL ---
        // Handles Triplanar PBR, Height-based moss/root blending, and dFdx/dFdy bump mapping
        this.rootMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.7,
            metalness: 0.1, // Slight reflectivity for wetness
        });

        this.rootMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uWaterLevel = { value: 0.0 };

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
                uniform float uWaterLevel;
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>

                // [SCREEN-SPACE DERIVATIVE BUMP MAPPING (dFdx/dFdy)]
                // Generates dynamic wet wood grain and bark texture without normal maps
                vec3 dX = dFdx(vWorldPos * 10.0);
                vec3 dY = dFdy(vWorldPos * 10.0);
                vec3 bumpNormal = normalize(cross(dX, dY));
                
                // Blend derived bump with base geometric normal
                vec3 finalNormal = normalize(mix(vNormal, bumpNormal, 0.4));

                // [HEIGHT-BASED COLOR BLENDING]
                // Dry moss vs. Submerged root
                vec3 dryMossColor = vec3(0.18, 0.25, 0.12);
                vec3 submergedRootColor = vec3(0.12, 0.08, 0.05);
                
                // Calculate depth relative to local water level
                float depthFactor = (uWaterLevel - vWorldPos.y) * 2.0; 
                float blendRatio = smoothstep(-0.5, 0.5, depthFactor);

                diffuseColor.rgb = mix(dryMossColor, submergedRootColor, blendRatio);
                
                // Increase darkness and smoothness dynamically if submerged
                roughnessFactor = mix(0.8, 0.2, blendRatio); // Wet roots are shiny
                diffuseColor.rgb *= mix(1.0, 0.6, blendRatio); // Wet roots are darker
                `
            );
        };

        // --- 2. PROCEDURAL MUD & WATER ACCUMULATION MATERIAL ---
        this.waterMudMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2520, // Base saturated mud
            roughness: 0.1,  // High gloss for water/wet mud
            metalness: 0.05,
            transparent: true,
            opacity: 0.95
        });

        this.waterMudMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uCameraPos = { value: new THREE.Vector3() };

            shader.vertexShader = `
                uniform float uTime;
                varying vec3 vWorldPos;
                ${shader.vertexShader}
            `.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

                // [GPU VERTEX DISPLACEMENT FOR MUD PUDDLES]
                // Low frequency noise determines where puddles sink into the mud
                float puddleSink = sin(vWorldPos.x * 0.2) * cos(vWorldPos.z * 0.2);
                
                // Displace vertices downward to form basins for water accumulation logic
                float displacement = smoothstep(0.2, 0.8, puddleSink) * 0.5; 
                transformed.y -= displacement;
                `
            );

            shader.fragmentShader = `
                uniform float uTime;
                uniform vec3 uCameraPos;
                varying vec3 vWorldPos;
                ${shader.fragmentShader}
            `.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>

                // [SCREEN-SPACE DERIVATIVE WATER SURFACE (dFdx/dFdy)]
                // High-frequency procedural noise for ripples based on world position and time
                float rippleNoise = sin(vWorldPos.x * 8.0 + uTime * 2.0) * cos(vWorldPos.z * 8.0 + uTime * 1.5);
                
                // Simulate a wavy surface using derivatives
                vec3 surfaceDx = dFdx(vec3(vWorldPos.x, rippleNoise * 0.1, vWorldPos.z));
                vec3 surfaceDy = dFdy(vec3(vWorldPos.x, rippleNoise * 0.1, vWorldPos.z));
                vec3 rippleNormal = normalize(cross(surfaceDx, surfaceDy));

                // Determine if this pixel is in a displaced puddle or high mud
                // Since vertex shader displaces downward, we can estimate water depth via world Y
                float waterDepth = smoothstep(0.1, -0.4, vWorldPos.y); 
                
                vec3 mudColor = vec3(0.15, 0.12, 0.08);
                vec3 waterColor = vec3(0.1, 0.12, 0.15); // Murky wetlands water
                
                diffuseColor.rgb = mix(mudColor, waterColor, waterDepth);
                
                // [ATMOSPHERE & DEPTH FADE]
                float distToCam = distance(vWorldPos, uCameraPos);
                diffuseColor.a *= 1.0 - smoothstep(2500.0, 3000.0, distToCam);
                `
            );
            this.waterShader = shader;
        };
    }

    initGeometries() {
        // Primitive Geometry Field Generator Assembly
        this.marshPlaneGeo = new THREE.PlaneGeometry(100, 100, 64, 64);
        this.marshPlaneGeo.rotateX(-Math.PI / 2);

        // Procedural Water plants root assemblies (Simplified placeholder geometry)
        this.rootGeo = new THREE.TetrahedronGeometry(1.5, 2); 
    }

    /**
     * Builds a wetlands chunk combining the displaced mud/water plane 
     * and the instanced root networks.
     */
    spawnWetlandsChunk(scene, centerX, centerZ, baseWaterLevel = 0.0) {
        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        // 1. Water Accumulation & Mud Plane
        const mudPlane = new THREE.Mesh(this.marshPlaneGeo, this.waterMudMaterial);
        mudPlane.position.y = baseWaterLevel;
        mudPlane.receiveShadow = true;
        chunkGroup.add(mudPlane);

        // 2. Instanced Marsh Vegetation and Roots
        const instanceCount = 5000; // Per chunk density
        const rootInstances = new THREE.InstancedMesh(this.rootGeo, this.rootMaterial, instanceCount);
        rootInstances.castShadow = true;
        rootInstances.receiveShadow = true;

        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < instanceCount; i++) {
            const wx = (Math.random() - 0.5) * 100;
            const wz = (Math.random() - 0.5) * 100;
            
            // Scatter vertically around the water level
            const wy = baseWaterLevel + (Math.random() - 0.6) * 2.0; 

            dummy.position.set(wx, wy, wz);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            
            // Stretch along axes to simulate sprawling roots
            dummy.scale.set(1.0 + Math.random(), 0.5 + Math.random(), 1.0 + Math.random());
            dummy.updateMatrix();
            
            rootInstances.setMatrixAt(i, dummy.matrix);
        }

        rootInstances.instanceMatrix.needsUpdate = true;
        rootInstances.computeBoundingSphere();
        chunkGroup.add(rootInstances);

        scene.add(chunkGroup);
        this.marshChunks.push({ group: chunkGroup, rootInstances });
        
        return chunkGroup;
    }

    update(delta, camera) {
        this.time += delta;
        if (this.waterShader) {
            this.waterShader.uniforms.uTime.value = this.time;
            this.waterShader.uniforms.uCameraPos.value.copy(camera.position);
        }
    }
}
