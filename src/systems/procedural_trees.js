// ============================================================================
// Dark Forest Engine - Procedural Tree Builder System
// File: src_systems_procedural_trees.js
// ============================================================================

import * as THREE from 'three';

class ProceduralTreeBuilder {
    constructor() {
        this.trunkMaterial = null;
        this.foliageMaterial = null;
        this.redwoodMaterial = null;
        this.dummy = new THREE.Object3D();
        this.tierDummy = new THREE.Object3D();
        this.initialized = false;
        this.time = 0;
        this.windUniforms = [];
    }

    /**
     * Initializes unified bark and foliage materials, patching shaders for GPU wind,
     * derivative bark grooves, and volumetric fog integration.
     */
    initMaterials() {
        if (this.initialized) return;

        // --- 1. UNIFIED REDWOOD MATERIAL (Worker Archetype Compatible) ---
        this.redwoodMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d2015,
            roughness: 0.85,
            metalness: 0.05,
            vertexColors: true,
            side: THREE.DoubleSide
        });

        this.redwoodMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.windUniforms.push(shader.uniforms.uTime);

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 uniform float uTime;
                 varying vec3 vWorldNormalVec;
                 varying vec3 vWorldPosVec;
                 varying vec3 vCustomColorData;`
            );

            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vCustomColorData = color;

                 #ifdef USE_INSTANCING
                     vWorldPosVec = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
                     vWorldNormalVec = normalize(mat3(modelMatrix * instanceMatrix) * normal);
                 #else
                     vWorldPosVec = (modelMatrix * vec4(position, 1.0)).xyz;
                     vWorldNormalVec = normalize(mat3(modelMatrix) * normal);
                 #endif

                 float heightFactor = clamp(position.y / 90.0, 0.0, 1.0);
                 
                 // 1. Rigid Trunk Sway (Minimal low-frequency motion)
                 float trunkSway = sin(uTime * 1.2 + vWorldPosVec.x * 0.01 + vWorldPosVec.z * 0.01) * 0.4 * pow(heightFactor, 2.5);
                 
                 // 2. Primary Branch Movement (Driven by Vertex Color R)
                 float branchSway = sin(uTime * 2.8 + vWorldPosVec.y * 0.2) * 0.8 * color.r;
                 
                 // 3. Foliage High-Frequency Flutter (Driven by Vertex Color G)
                 float leafFlutter = cos(uTime * 8.0 + vWorldPosVec.x) * 0.15 * color.g;

                 transformed.x += trunkSway + branchSway + leafFlutter;
                 transformed.z += (trunkSway * 0.6) + branchSway;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 varying vec3 vWorldNormalVec;
                 varying vec3 vWorldPosVec;
                 varying vec3 vCustomColorData;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 
                 // Derivative procedural bark grooves
                 float h1 = sin(vWorldPosVec.y * 4.0 + sin(vWorldPosVec.x * 2.0) * 0.5);
                 float h2 = cos(atan(vWorldNormalVec.z, vWorldNormalVec.x) * 20.0);
                 float barkGroove = h1 * h2;

                 vec3 deepBarkColor = vec3(0.08, 0.03, 0.01);
                 vec3 surfaceBarkColor = vec3(0.28, 0.14, 0.08);
                 vec3 baseBark = mix(deepBarkColor, surfaceBarkColor, smoothstep(-0.4, 0.4, barkGroove));

                 // Foliage needles albedo selection
                 vec3 darkNeedle = vec3(0.03, 0.09, 0.04);
                 vec3 brightNeedle = vec3(0.14, 0.28, 0.11);
                 vec3 foliageColor = mix(darkNeedle, brightNeedle, clamp(vWorldPosVec.y / 90.0, 0.0, 1.0));

                 vec3 finalAlbedo = mix(baseBark, foliageColor, step(0.1, vCustomColorData.g));

                 // Moss layer applied to North/Up facing surfaces (Blue channel)
                 float upNorm = clamp(vWorldNormalVec.y, 0.0, 1.0);
                 float mossMask = smoothstep(0.3, 0.8, vCustomColorData.b + upNorm * 0.4);
                 vec3 mossColor = vec3(0.11, 0.26, 0.07);

                 diffuseColor.rgb = mix(finalAlbedo, mossColor, mossMask * 0.75);`
            );
        };

        // Fog system patch
        if (window.VolumetricFogSystem?.patchMaterial) {
            window.VolumetricFogSystem.patchMaterial(this.redwoodMaterial);
        }

        // --- 2. LEGACY TRUNK MATERIAL (Backwards Compatibility) ---
        this.trunkMaterial = this.redwoodMaterial;

        // --- 3. LEGACY FOLIAGE MATERIAL (Backwards Compatibility) ---
        this.foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x173820,
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        if (window.VolumetricFogSystem?.patchMaterial) {
            window.VolumetricFogSystem.patchMaterial(this.foliageMaterial);
        }

        this.initialized = true;
    }

    /**
     * Generates a procedural trunk BufferGeometry with exponential taper and root flare buttresses.
     * @param {number} height - Trunk height in meters (default 80m for mature redwood)
     * @param {number} baseRadius - Base trunk radius in meters (default 3.5m)
     * @returns {THREE.BufferGeometry}
     */
    createTrunkGeometry(height = 80.0, baseRadius = 3.5) {
        const topRadius = 0.3;
        const radialSegments = 20;
        const heightSegments = 32;

        const trunkGeo = new THREE.CylinderGeometry(topRadius, baseRadius, height, radialSegments, heightSegments);
        const posAttr = trunkGeo.attributes.position;
        const colorAttr = new THREE.Float32BufferAttribute(posAttr.count * 3, 3);

        const positions = posAttr.array;
        const colors = colorAttr.array;

        for (let i = 0; i < posAttr.count; i++) {
            let x = posAttr.getX(i);
            let y = posAttr.getY(i);
            let z = posAttr.getZ(i);

            // Shift pivot to base ground line
            y += height / 2.0;

            const v = y / height;

            // Exponential taper math: slow mid-trunk taper, sharp upper taper
            const taperPower = 3.5;
            const currentRadius = baseRadius * (1.0 - Math.pow(v, taperPower)) + topRadius;

            const currentLen = Math.sqrt(x * x + z * z);
            if (currentLen > 0.0001) {
                const nx = x / currentLen;
                const nz = z / currentLen;

                // Root flare noise application on bottom 18% of trunk
                let flareAmount = 0.0;
                if (v < 0.18) {
                    const flareIntensity = Math.pow(1.0 - (v / 0.18), 2.0);
                    const angle = Math.atan2(nz, nx);
                    const noise = Math.max(0.0, Math.sin(angle * 5.0) * 0.4 + Math.cos(angle * 3.0 + 1.2) * 0.3);
                    flareAmount = noise * flareIntensity * 3.5;
                }

                const finalRadius = currentRadius + flareAmount;
                x = nx * finalRadius;
                z = nz * finalRadius;
            }

            posAttr.setXYZ(i, x, y, z);

            // Vertex Color encoding: R=Branch sway, G=Foliage flutter, B=Moss mask
            const isNorth = z < -0.1 ? Math.abs(z / (currentRadius || 1.0)) : 0.0;
            const mossWeight = (v < 0.18 ? (1.0 - v / 0.18) * 0.8 : 0.0) + isNorth * (1.0 - v);
            
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.0;
            colors[i * 3 + 2] = Math.min(1.0, mossWeight);
        }

        trunkGeo.setAttribute('color', colorAttr);
        trunkGeo.computeVertexNormals();
        trunkGeo.computeBoundingBox();
        trunkGeo.computeBoundingSphere();

        return trunkGeo;
    }

    /**
     * Generates normalized foliage cluster geometry cards.
     * @returns {THREE.BufferGeometry}
     */
    createFoliageGeometry() {
        const coneGeo = new THREE.ConeGeometry(1, 1, 8, 4);
        coneGeo.translate(0, 0.5, 0); // Pivot at base of cone
        return coneGeo;
    }

    /**
     * Spawns a procedural grove around a world center using either Web Worker archetypes
     * or procedural fallback geometry, clustered into natural "Fairy Rings".
     * @param {THREE.Scene} scene 
     * @param {number} centerX 
     * @param {number} centerZ 
     * @param {number} count 
     * @param {number} radius 
     * @returns {THREE.Group}
     */
    spawnProceduralGrove(scene, centerX, centerZ, count = 40, radius = 60) {
        this.initMaterials();

        const group = new THREE.Group();

        const getTerrainY = (x, z) => {
            const h = window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
            return Number.isFinite(h) ? h : 0;
        };

        // Use RedwoodGenerator worker archetypes if initialized
        if (window.RedwoodGenerator?.isInitialized) {
            const ageStates = ['ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

            // Divide grove count into clustered "Fairy Rings"
            const ringsCount = Math.max(1, Math.floor(count / 6));
            for (let r = 0; r < ringsCount; r++) {
                const ringAngle = Math.random() * Math.PI * 2;
                const ringDist = Math.sqrt(Math.random()) * radius;
                const ringX = centerX + Math.cos(ringAngle) * ringDist;
                const ringZ = centerZ + Math.sin(ringAngle) * ringDist;

                const ringPoints = window.RedwoodGenerator.generateFairyRingCluster(
                    ringX, ringZ, Math.floor(count / ringsCount), 10.0, getTerrainY
                );

                ringPoints.forEach(pt => {
                    const geo = window.RedwoodGenerator.getArchetype(pt.ageState, Math.floor(Math.random() * 4));
                    if (!geo) return;

                    const mesh = new THREE.Mesh(geo, this.redwoodMaterial);
                    mesh.position.set(pt.x, pt.y, pt.z);
                    mesh.rotation.y = pt.rotation;
                    mesh.scale.setScalar(pt.scale);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    group.add(mesh);
                });
            }
        } else {
            // Fallback Instanced System for immediate rendering
            const height = 80.0;
            const tiers = 5;

            const trunkGeo = this.createTrunkGeometry(height, 3.5);
            const foliageGeo = this.createFoliageGeometry();

            const instancedTrunks = new THREE.InstancedMesh(trunkGeo, this.trunkMaterial, count);
            instancedTrunks.castShadow = true;
            instancedTrunks.receiveShadow = true;

            const instancedFoliage = new THREE.InstancedMesh(foliageGeo, this.foliageMaterial, count * tiers);
            instancedFoliage.castShadow = true;
            instancedFoliage.receiveShadow = true;

            let foliageIndex = 0;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.sqrt(Math.random()) * radius;
                const wx = centerX + Math.cos(angle) * dist;
                const wz = centerZ + Math.sin(angle) * dist;
                const wy = getTerrainY(wx, wz);

                const scale = 0.85 + Math.random() * 0.4;

                this.dummy.position.set(wx, wy, wz);
                this.dummy.rotation.set((Math.random() - 0.5) * 0.04, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.04);
                this.dummy.scale.set(scale, scale, scale);
                this.dummy.updateMatrix();

                instancedTrunks.setMatrixAt(i, this.dummy.matrix);

                // Populate Redwood Upper Canopy Tiers
                for (let t = 0; t < tiers; t++) {
                    const tierRatio = t / tiers;
                    const coneRadius = (1.0 - tierRatio * 0.5) * 12.0;
                    const coneHeight = 10.0 - tierRatio * 2.0;
                    const yPos = (height * 0.55) + (t * (height * 0.08));

                    this.tierDummy.position.set(0, yPos, 0);
                    this.tierDummy.rotation.set(0, t * 1.2, 0);
                    this.tierDummy.scale.set(coneRadius, coneHeight, coneRadius);
                    this.tierDummy.updateMatrix();

                    this.tierDummy.matrix.premultiply(this.dummy.matrix);

                    instancedFoliage.setMatrixAt(foliageIndex, this.tierDummy.matrix);
                    foliageIndex++;
                }
            }

            instancedTrunks.instanceMatrix.needsUpdate = true;
            instancedFoliage.instanceMatrix.needsUpdate = true;

            group.add(instancedTrunks);
            group.add(instancedFoliage);
        }

        scene.add(group);
        return group;
    }

    /**
     * Updates frame time uniforms for wind animation shaders.
     * @param {number} delta - Frame delta time in seconds
     */
    update(delta) {
        this.time += delta;
        for (let i = 0; i < this.windUniforms.length; i++) {
            this.windUniforms[i].value = this.time;
        }
    }
}

// Global Singleton Binding
window.ProceduralTreeBuilder = new ProceduralTreeBuilder();
export default ProceduralTreeBuilder;
