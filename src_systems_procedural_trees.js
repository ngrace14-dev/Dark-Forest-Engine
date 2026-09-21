import * as THREE from 'three';

class ProceduralTreeBuilder {
    constructor() {
        this.trunkMaterial = null;
        this.foliageMaterial = null;
        this.treeGeometries = {};
        this.dummy = new THREE.Object3D();
        this.initialized = false;
    }

    initMaterials() {
        if (this.initialized) return;

        // --- 1. PROCEDURAL TRIPLANAR BARK MATERIAL ---
        this.trunkMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.05
        });

        this.trunkMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
                #include <begin_vertex>
                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                    vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vWorldNormal = normalize(mat3(modelMatrix) * normal);
                #endif

                // Subtle trunk wind sway
                float heightFactor = clamp(position.y / 25.0, 0.0, 1.0);
                float sway = sin(vWorldPos.x * 0.1 + vWorldPos.z * 0.1) * 0.3 * pow(heightFactor, 2.0);
                transformed.x += sway;
                `
            );

            shader.fragmentShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `
                #include <color_fragment>

                vec3 norm = normalize(vWorldNormal);
                
                // Vertical Bark Ridge Noise
                float barkGroove = sin(vWorldPos.y * 2.5) * cos(atan(norm.z, norm.x) * 12.0);
                float barkNoise = smoothstep(-0.2, 0.5, barkGroove) * 0.15;

                vec3 darkBark = vec3(0.18, 0.09, 0.05);
                vec3 lightBark = vec3(0.35, 0.20, 0.12);
                vec3 mossColor = vec3(0.12, 0.28, 0.08);

                // Base Bark Color
                vec3 finalBark = mix(darkBark, lightBark, 0.5 + barkNoise);

                // Moss accumulation on northern/upward surfaces
                float mossMask = smoothstep(0.2, 0.8, norm.y) + smoothstep(0.3, 0.9, norm.z * 0.8);
                diffuseColor.rgb = mix(finalBark, mossColor, clamp(mossMask * 0.45, 0.0, 0.8));
                `
            );
        };

        // --- 2. PROCEDURAL FOLIAGE MATERIAL (WITH SUBSURFACE SCATTERING) ---
        this.foliageMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        this.foliageMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                varying float vHeight;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
                #include <begin_vertex>
                vHeight = position.y;

                #ifdef USE_INSTANCING
                    vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                    vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
                #else
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vWorldNormal = normalize(mat3(modelMatrix) * normal);
                #endif

                // Multi-frequency Branch & Needle Wind Sway
                float heightFactor = clamp(position.y / 20.0, 0.0, 1.0);
                float windMain = sin(vWorldPos.x * 0.2 + vWorldPos.z * 0.2) * 0.5 * heightFactor;
                float windJitter = cos(vWorldPos.y * 3.0) * 0.12 * heightFactor;

                transformed.x += windMain + windJitter;
                transformed.z += (windMain * 0.5) + windJitter;
                `
            );

            shader.fragmentShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                varying float vHeight;
                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `
                #include <color_fragment>

                // Gradient from dark deep interior to vibrant sunlit needle tips
                vec3 innerNeedle = vec3(0.04, 0.12, 0.05);
                vec3 outerNeedle = vec3(0.12, 0.32, 0.11);
                vec3 tipHighlight = vec3(0.25, 0.48, 0.18);

                float gradient = clamp(vHeight / 18.0, 0.0, 1.0);
                vec3 baseFoliage = mix(innerNeedle, outerNeedle, gradient);
                baseFoliage = mix(baseFoliage, tipHighlight, pow(gradient, 2.0) * 0.5);

                diffuseColor.rgb = baseFoliage;
                `
            );
        };

        this.initialized = true;
    }

    // --- 3. PROCEDURAL HIGH-DETAIL TREE GEOMETRY GENERATOR ---
    createTreeGeometry(height = 22, baseRadius = 1.6) {
        const group = new THREE.Group();

        // Fluted Trunk Base (Displaced cylinder)
        const trunkGeo = new THREE.CylinderGeometry(baseRadius * 0.4, baseRadius, height, 12, 16);
        const posAttr = trunkGeo.attributes.position;

        for (let i = 0; i < posAttr.count; i++) {
            let x = posAttr.getX(i);
            let y = posAttr.getY(i);
            let z = posAttr.getZ(i);

            // Fluted root flare at base
            if (y < -height * 0.3) {
                let angle = Math.atan2(z, x);
                let flare = (1.0 + Math.sin(angle * 5.0) * 0.35) * (( -y - (height * 0.3) ) / (height * 0.2));
                x += x * flare * 0.25;
                z += z * flare * 0.25;
            }

            posAttr.setXYZ(i, x, y + height / 2, z); // Shift origin to ground level
        }
        trunkGeo.computeVertexNormals();

        const trunkMesh = new THREE.Mesh(trunkGeo, this.trunkMaterial);
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        group.add(trunkMesh);

        // Tiered Canopy (5 overlapping layered bough cones)
        const tiers = 5;
        for (let t = 0; t < tiers; t++) {
            const tierRatio = t / tiers;
            const coneRadius = (1.0 - tierRatio * 0.6) * 5.5;
            const coneHeight = 6.0 - tierRatio * 1.5;

            const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8, 4);
            coneGeo.translate(0, coneHeight / 2, 0);

            const coneMesh = new THREE.Mesh(coneGeo, this.foliageMaterial);
            coneMesh.position.y = (height * 0.35) + (t * (height * 0.14));
            coneMesh.rotation.y = t * 0.75; // Rotate tiers for asymmetrical silhouettes
            coneMesh.castShadow = true;
            coneMesh.receiveShadow = true;
            group.add(coneMesh);
        }

        return group;
    }

    // --- 4. INSTANCED FOREST GROVE GENERATOR ---
    spawnProceduralGrove(scene, centerX, centerZ, count = 40, radius = 50) {
        this.initMaterials();

        const group = new THREE.Group();
        const baseTree = this.createTreeGeometry(22, 1.6);

        // Separate mesh children into instanced batches
        const trunkMesh = baseTree.children[0];
        const instancedTrunks = new THREE.InstancedMesh(trunkMesh.geometry, this.trunkMaterial, count);
        instancedTrunks.castShadow = true;
        instancedTrunks.receiveShadow = true;

        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * radius;
            const wx = centerX + Math.cos(angle) * dist;
            const wz = centerZ + Math.sin(angle) * dist;
            const wy = getTerrainY(wx, wz);

            const scale = 0.75 + Math.random() * 0.5;

            this.dummy.position.set(wx, wy, wz);
            this.dummy.rotation.set((Math.random() - 0.5) * 0.08, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.08);
            this.dummy.scale.set(scale, scale, scale);
            this.dummy.updateMatrix();

            instancedTrunks.setMatrixAt(i, this.dummy.matrix);

            // Spawn canopy tiers
            for (let c = 1; c < baseTree.children.length; c++) {
                const bough = baseTree.children[c];
                const boughClone = bough.clone();
                boughClone.position.add(this.dummy.position);
                boughClone.scale.multiplyScalar(scale);
                group.add(boughClone);
            }
        }

        instancedTrunks.instanceMatrix.needsUpdate = true;
        group.add(instancedTrunks);
        scene.add(group);
        return group;
    }
}

window.ProceduralTreeBuilder = new ProceduralTreeBuilder();
