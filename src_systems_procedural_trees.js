import * as THREE from 'three';

class ProceduralTreeBuilder {
    constructor() {
        this.trunkMaterial = null;
        this.foliageMaterial = null;
        this.dummy = new THREE.Object3D();
        this.tierDummy = new THREE.Object3D();
        this.initialized = false;
        this.time = 0;
    }

    initMaterials() {
        if (this.initialized) return;

        // --- TRUNK MATERIAL ---
        this.trunkMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.9,
            metalness: 0.05
        });

        this.trunkMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.trunkShader = shader; // Save reference to update uTime

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

                vec3 norm = length(vWorldNormal) > 0.0001 ? normalize(vWorldNormal) : vec3(0.0, 1.0, 0.0);
                
                float h1 = sin(vWorldPos.y * 3.0 + sin(vWorldPos.x * 4.0) * 0.5);
                float h2 = cos(atan(norm.z, norm.x) * 16.0);
                float barkHeight = h1 * h2;

                // Safe Derivative Bump Normal calculation
                vec3 dX = dFdx(vWorldPos);
                vec3 dY = dFdy(vWorldPos);
                vec3 crossN = cross(dX, dY);
                vec3 bumpNorm = length(crossN) > 0.00001 ? normalize(crossN) : norm;

                vec3 darkBark = vec3(0.12, 0.06, 0.03);
                vec3 lightBark = vec3(0.32, 0.18, 0.10);
                vec3 mossColor = vec3(0.10, 0.25, 0.06);

                vec3 finalBark = mix(darkBark, lightBark, smoothstep(-0.5, 0.5, barkHeight));

                float mossMask = smoothstep(0.2, 0.85, norm.y) + smoothstep(0.3, 0.9, norm.z);
                diffuseColor.rgb = mix(finalBark, mossColor, clamp(mossMask * 0.5, 0.0, 0.85));
                `
            );
        };

        // --- FOLIAGE MATERIAL ---
        this.foliageMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        this.foliageMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.foliageShader = shader; // Save reference to update uTime

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vWorldNormal;
                varying float vHeight;
                uniform float uTime;
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

                float heightFactor = clamp(position.y / 20.0, 0.0, 1.0);
                
                // Animated Wind integration (using uTime)
                float windMain = sin(vWorldPos.x * 0.2 + vWorldPos.z * 0.2 + (uTime * 1.5)) * 0.5 * heightFactor;
                float windJitter = cos(vWorldPos.y * 3.0 + (uTime * 3.0)) * 0.12 * heightFactor;

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

    createTrunkGeometry(height = 22, baseRadius = 1.6) {
        const trunkGeo = new THREE.CylinderGeometry(baseRadius * 0.4, baseRadius, height, 12, 16);
        const posAttr = trunkGeo.attributes.position;

        for (let i = 0; i < posAttr.count; i++) {
            let x = posAttr.getX(i);
            let y = posAttr.getY(i);
            let z = posAttr.getZ(i);

            // Base flare mapping
            if (y < -height * 0.3) {
                let angle = Math.atan2(z, x);
                let flare = (1.0 + Math.sin(angle * 5.0) * 0.35) * (( -y - (height * 0.3) ) / (height * 0.2));
                x += x * flare * 0.25;
                z += z * flare * 0.25;
            }

            // Pivot shift to base
            posAttr.setXYZ(i, x, y + height / 2, z);
        }
        trunkGeo.computeVertexNormals();
        return trunkGeo;
    }

    createFoliageGeometry() {
        // Base cone geometry normalized for reuse across tiers
        const coneGeo = new THREE.ConeGeometry(1, 1, 8, 4);
        coneGeo.translate(0, 0.5, 0); // Pivot at base of cone
        return coneGeo;
    }

    spawnProceduralGrove(scene, centerX, centerZ, count = 40, radius = 50) {
        this.initMaterials();

        const height = 22;
        const tiers = 5;

        // 1. Initialize Geometries
        const trunkGeo = this.createTrunkGeometry(height, 1.6);
        const foliageGeo = this.createFoliageGeometry();

        // 2. Setup Instanced Meshes (The Core Optimization)
        // Draw Calls: 2 (1 for all trunks, 1 for all foliage across all trees)
        const instancedTrunks = new THREE.InstancedMesh(trunkGeo, this.trunkMaterial, count);
        instancedTrunks.castShadow = true;
        instancedTrunks.receiveShadow = true;

        const instancedFoliage = new THREE.InstancedMesh(foliageGeo, this.foliageMaterial, count * tiers);
        instancedFoliage.castShadow = true;
        instancedFoliage.receiveShadow = true;

        const getTerrainY = (x, z) => {
            const h = window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
            return Number.isFinite(h) ? h : 0;
        };

        let foliageIndex = 0;

        // 3. Populate Instance Matrices
        for (let i = 0; i < count; i++) {
            // Tree Transform
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * radius;
            const wx = centerX + Math.cos(angle) * dist;
            const wz = centerZ + Math.sin(angle) * dist;
            const wy = getTerrainY(wx, wz);

            const scale = 0.75 + Math.random() * 0.5;

            // Compute Trunk Matrix
            this.dummy.position.set(wx, wy, wz);
            this.dummy.rotation.set((Math.random() - 0.5) * 0.08, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.08);
            this.dummy.scale.set(scale, scale, scale);
            this.dummy.updateMatrix();

            instancedTrunks.setMatrixAt(i, this.dummy.matrix);

            // Compute Foliage Tier Matrices
            for (let t = 0; t < tiers; t++) {
                const tierRatio = t / tiers;
                const coneRadius = (1.0 - tierRatio * 0.6) * 5.5;
                const coneHeight = 6.0 - tierRatio * 1.5;
                const yPos = (height * 0.35) + (t * (height * 0.14));

                // Local tier transform
                this.tierDummy.position.set(0, yPos, 0);
                this.tierDummy.rotation.set(0, t * 0.75, 0);
                this.tierDummy.scale.set(coneRadius, coneHeight, coneRadius);
                this.tierDummy.updateMatrix();

                // Multiply local tier matrix by global tree matrix
                this.tierDummy.matrix.premultiply(this.dummy.matrix);

                instancedFoliage.setMatrixAt(foliageIndex, this.tierDummy.matrix);
                foliageIndex++;
            }
        }

        instancedTrunks.instanceMatrix.needsUpdate = true;
        instancedFoliage.instanceMatrix.needsUpdate = true;

        const group = new THREE.Group();
        group.add(instancedTrunks);
        group.add(instancedFoliage);
        scene.add(group);

        return group;
    }

    update(delta) {
        this.time += delta;
        if (this.trunkShader) this.trunkShader.uniforms.uTime.value = this.time;
        if (this.foliageShader) this.foliageShader.uniforms.uTime.value = this.time;
    }
}

window.ProceduralTreeBuilder = new ProceduralTreeBuilder();
