import * as THREE from 'three';

class ForestRenderer {
    constructor() {
        this.group = new THREE.Group();
        this.instancedMeshes = new Map(); // prefabName -> THREE.InstancedMesh
        this.chunkInstances = new Map();  // chunkKey -> Map(prefabName -> Array<{x, y, z, scale, rotation}>)
        this.geometries = new Map();
        this.materials = new Map();
        this.instances = new Map();      // Alias map for legacy compatibility
        
        this.dummyMatrix = new THREE.Matrix4();
        this.dummyPosition = new THREE.Vector3();
        this.dummyQuaternion = new THREE.Quaternion();
        this.dummyScale = new THREE.Vector3();
        this.dummyEuler = new THREE.Euler();
        
        this.initAssets();
    }

    initAssets() {
        // --- 100-FOOT REDWOOD PROCEDURAL GEOMETRY (30.5m) ---
        const trunkHeight = 20.0;
        const trunkGeo = new THREE.CylinderGeometry(1.1, 1.8, trunkHeight, 8);
        trunkGeo.translate(0, trunkHeight / 2, 0);

        const coneHeight = 14.0;
        const coneGeo = new THREE.ConeGeometry(5.5, coneHeight, 8);
        coneGeo.translate(0, trunkHeight + coneHeight / 2 - 3.5, 0);

        // Merge trunk and canopy geometry
        let redwoodGeo;
        if (window.BufferGeometryUtils?.mergeGeometries) {
            redwoodGeo = window.BufferGeometryUtils.mergeGeometries([trunkGeo, coneGeo], true);
        } else {
            redwoodGeo = trunkGeo;
        }

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a2817, roughness: 0.9 });
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x173820, roughness: 0.8 });

        const matArray = (Array.isArray(redwoodGeo.groups) && redwoodGeo.groups.length > 1) ? [trunkMat, coneMat] : trunkMat;

        this.geometries.set('Redwood Tree', redwoodGeo);
        this.materials.set('Redwood Tree', matArray);

        // --- BRAMBLE BUSH PROCEDURAL GEOMETRY ---
        const bushGeo = new THREE.DodecahedronGeometry(1.5, 1);
        bushGeo.translate(0, 1.2, 0);
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.9 });

        this.geometries.set('Bramble Bush', bushGeo);
        this.materials.set('Bramble Bush', bushMat);
    }

    initInstancedMesh(prefabName, maxCapacity = 5000) {
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
        this.instances.set(prefabName, instMesh); // Legacy alias check
        this.group.add(instMesh);
    }

    /**
     * Legacy direct update compatibility method
     */
    updateInstances(prefabName, points) {
        this.initInstancedMesh(prefabName);
        const instMesh = this.instancedMeshes.get(prefabName);
        if (!instMesh) return;

        let index = 0;
        for (let i = 0; i < points.length; i++) {
            if (index >= instMesh.capacity) break;
            const pt = points[i];
            const scale = pt.scale || 1.0;

            this.dummyPosition.set(pt.x, pt.y || 0, pt.z);
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

    /**
     * Stores tree positions for a chunk and rebuilds instanced mesh matrices
     */
    setChunkInstances(chunkKey, prefabName, points) {
        if (!this.chunkInstances.has(chunkKey)) {
            this.chunkInstances.set(chunkKey, new Map());
        }
        
        this.chunkInstances.get(chunkKey).set(prefabName, points);
        this.rebuildInstances(prefabName);
    }

    /**
     * Removes instances associated with an unloaded chunk
     */
    clearChunkInstances(chunkKey) {
        if (!this.chunkInstances.has(chunkKey)) return;

        const chunkMap = this.chunkInstances.get(chunkKey);
        const affectedPrefabs = Array.from(chunkMap.keys());
        
        this.chunkInstances.delete(chunkKey);
        
        affectedPrefabs.forEach(prefabName => {
            this.rebuildInstances(prefabName);
        });
    }

    /**
     * Rebuilds InstancedMesh buffer for a prefab from active chunk registry
     */
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
                const scale = pt.scale || 1.0;
                
                this.dummyPosition.set(pt.x, pt.y, pt.z);
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

window.ForestRenderer = new ForestRenderer();
