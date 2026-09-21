import * as THREE from 'three';

class ForestRenderer {
    constructor() {
        this.group = new THREE.Group();
        this.instancedMeshes = new Map();
        this.chunkInstances = new Map();
        this.geometries = new Map();
        this.materials = new Map();
        this.instances = new Map();
        this.windUniforms = [];
        this.assetsInitialized = false;
        
        this.dummyMatrix = new THREE.Matrix4();
        this.dummyPosition = new THREE.Vector3();
        this.dummyQuaternion = new THREE.Quaternion();
        this.dummyScale = new THREE.Vector3();
        this.dummyEuler = new THREE.Euler();
    }

    ensureAssets() {
        if (this.assetsInitialized) return;

        // --- 100-FOOT REDWOOD PROCEDURAL GEOMETRY (30.5m) ---
        const trunkHeight = 20.0;
        const trunkGeo = new THREE.CylinderGeometry(1.1, 1.8, trunkHeight, 8);
        trunkGeo.translate(0, trunkHeight / 2, 0);

        const coneHeight = 14.0;
        const coneGeo = new THREE.ConeGeometry(5.5, coneHeight, 8);
        coneGeo.translate(0, trunkHeight + coneHeight / 2 - 3.5, 0);

        let redwoodGeo;
        const utils = window.BufferGeometryUtils || THREE.BufferGeometryUtils;
        if (utils?.mergeGeometries) {
            redwoodGeo = utils.mergeGeometries([trunkGeo, coneGeo], true);
        } else {
            redwoodGeo = trunkGeo;
        }

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a2817, roughness: 0.9 });
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x173820, roughness: 0.8 });

        // Valheim-style Wind Sway Shader
        [trunkMat, coneMat].forEach(mat => {
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = { value: 0 };
                this.windUniforms.push(shader.uniforms.uTime);
                
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <common>`,
                    `#include <common>\nuniform float uTime;`
                );
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
                     float heightFactor = clamp(position.y / 30.0, 0.0, 1.0);
                     float wave = sin(uTime * 2.5 + position.x * 0.05 + position.z * 0.05) * 0.6 * heightFactor;
                     transformed.x += wave;
                     transformed.z += wave * 0.4;`
                );
            };
        });

        const matArray = (Array.isArray(redwoodGeo.groups) && redwoodGeo.groups.length > 1) ? [trunkMat, coneMat] : trunkMat;

        this.geometries.set('Redwood Tree', redwoodGeo);
        this.materials.set('Redwood Tree', matArray);

        // --- BRAMBLE BUSH PROCEDURAL GEOMETRY ---
        const bushGeo = new THREE.DodecahedronGeometry(1.5, 1);
        bushGeo.translate(0, 1.2, 0);
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.9 });

        bushMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            this.windUniforms.push(shader.uniforms.uTime);
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>\nuniform float uTime;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 float wave = sin(uTime * 3.0 + position.x * 0.1) * 0.15;
                 transformed.x += wave;`
            );
        };

        this.geometries.set('Bramble Bush', bushGeo);
        this.materials.set('Bramble Bush', bushMat);

        this.assetsInitialized = true;
    }

    initInstancedMesh(prefabName, maxCapacity = 30000) {
        this.ensureAssets();
        if (this.instancedMeshes.has(prefabName)) return;

        const geo = this.geometries.get(prefabName) || new THREE.BoxGeometry(1, 5, 1);
        const mat = this.materials.get(prefabName) || new THREE.MeshStandardMaterial({ color: 0x228b22 });

        const instMesh = new THREE.InstancedMesh(geo, mat, maxCapacity);
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        instMesh.count = 0;
        instMesh.frustumCulled = true;
        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.instancedMeshes.set(prefabName, instMesh);
        this.instances.set(prefabName, instMesh);
        this.group.add(instMesh);
    }

    update(delta) {
        const time = performance.now() / 1000;
        for (let i = 0; i < this.windUniforms.length; i++) {
            this.windUniforms[i].value = time;
        }
    }

    updateInstances(prefabName, points) {
        this.initInstancedMesh(prefabName);
        const instMesh = this.instancedMeshes.get(prefabName);
        if (!instMesh || !points) return;

        let index = 0;
        for (let i = 0; i < points.length; i++) {
            if (index >= instMesh.capacity) break;
            const pt = points[i];
            const px = Number.isFinite(pt.x) ? pt.x : 0;
            const py = Number.isFinite(pt.y) ? pt.y : 0;
            const pz = Number.isFinite(pt.z) ? pt.z : 0;
            const scale = Number.isFinite(pt.scale) ? pt.scale : 1.0;

            this.dummyPosition.set(px, py, pz);
            this.dummyEuler.set(0, pt.rotation || 0, 0);
            this.dummyQuaternion.setFromEuler(this.dummyEuler);
            this.dummyScale.set(scale, scale, scale);

            this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);
            instMesh.setMatrixAt(index, this.dummyMatrix);
            index++;
        }

        instMesh.count = index;
        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
    }

    setChunkInstances(chunkKey, prefabName, points) {
        if (!this.chunkInstances.has(chunkKey)) {
            this.chunkInstances.set(chunkKey, new Map());
        }
        
        this.chunkInstances.get(chunkKey).set(prefabName, points);
        this.rebuildInstances(prefabName);
    }

    clearChunkInstances(chunkKey) {
        if (!this.chunkInstances.has(chunkKey)) return;

        const chunkMap = this.chunkInstances.get(chunkKey);
        const affectedPrefabs = Array.from(chunkMap.keys());
        
        this.chunkInstances.delete(chunkKey);
        
        affectedPrefabs.forEach(prefabName => {
            this.rebuildInstances(prefabName);
        });
    }

    rebuildInstances(prefabName) {
        this.initInstancedMesh(prefabName);
        const instMesh = this.instancedMeshes.get(prefabName);
        if (!instMesh) return;

        let index = 0;
        for (const [chunkKey, prefabMap] of this.chunkInstances.entries()) {
            const points = prefabMap.get(prefabName);
            if (!points) continue;

            for (let i = 0; i < points.length; i++) {
                if (index >= instMesh.capacity) break;

                const pt = points[i];
                const px = Number.isFinite(pt.x) ? pt.x : 0;
                const py = Number.isFinite(pt.y) ? pt.y : 0;
                const pz = Number.isFinite(pt.z) ? pt.z : 0;
                const scale = Number.isFinite(pt.scale) ? pt.scale : 1.0;
                
                this.dummyPosition.set(px, py, pz);
                this.dummyEuler.set(0, pt.rotation || 0, 0);
                this.dummyQuaternion.setFromEuler(this.dummyEuler);
                this.dummyScale.set(scale, scale, scale);

                this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);
                instMesh.setMatrixAt(index, this.dummyMatrix);
                index++;
            }
        }

        instMesh.count = index;
        instMesh.instanceMatrix.needsUpdate = true;
        instMesh.computeBoundingSphere();
    }
}

// Bind to global scope so src_engine.js can use it
window.ForestRenderer = new ForestRenderer();
