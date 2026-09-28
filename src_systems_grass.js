import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export class GrassSystem {
    constructor() {
        this.time = 0;
        this.initialized = false;
        this.scene = null;
        this.grassChunks = new Map();
        
        this.initGeometry();
        this.initMaterials();
    }

    init(scene) {
        if (this.initialized) return;
        this.scene = scene;
        this.initialized = true;
        console.log('[GrassSystem] Gothic Forest Floor Proto Initialized.');
    }

    initGeometry() {
        // Archetype 1: Moss Block (Low profile beveled volume)
        this.mossGeo = new THREE.BoxGeometry(0.4, 0.2, 0.4);
        this.mossGeo.translate(0, 0.1, 0);

        // Archetype 2: Fern Wedge (Gothic cluster of 3 wedges)
        const wedgeParts = [];
        for (let i = 0; i < 3; i++) {
            const w = new THREE.ConeGeometry(0.15, 0.4, 3);
            w.rotateX(0.2); // Lean
            w.rotateY((i / 3) * Math.PI * 2);
            w.translate(0, 0.2, 0);
            wedgeParts.push(w);
        }
        this.fernGeo = BufferGeometryUtils.mergeGeometries(wedgeParts);

        // Archetype 3: Tall Sentinel (Single vertical gothic wedge)
        this.sentinelGeo = new THREE.ConeGeometry(0.1, 0.8, 3);
        this.sentinelGeo.translate(0, 0.4, 0);
    }

    initMaterials() {
        // Shared Opaque Standard Material (Zero Transparency, Zero Alpha Cards)
        this.floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2b1a, 
            roughness: 0.9,
            metalness: 0.0,
            flatShading: true
        });

        this.floorMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                varying float vY;
                ${shader.vertexShader}
            `.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vY = position.y;
            `);
            shader.fragmentShader = `
                varying float vY;
                ${shader.fragmentShader}
            `.replace('#include <color_fragment>', `
                #include <color_fragment>
                // Subtle gradient for vertical wedges
                diffuseColor.rgb *= mix(0.6, 1.0, vY);
            `);
        };
    }

        spawnFloorPatch(chunkKey, cx, cz, biomeKey, clusterPoints = []) {
        if (!this.initialized || !this.scene) return;
        if (this.grassChunks.has(chunkKey)) return;

        let baseDensity = 20;
        if (biomeKey === 'redwoods') baseDensity = 1000;
        else if (biomeKey === 'valley') baseDensity = 500;

        const totalMoss = baseDensity;
        const totalFern = Math.floor(baseDensity * 0.4);
        const totalSentinel = Math.floor(baseDensity * 0.2);
        
        const group = new THREE.Group();
        const mossMesh = new THREE.InstancedMesh(this.mossGeo, this.floorMaterial, totalMoss);
        const fernMesh = new THREE.InstancedMesh(this.fernGeo, this.floorMaterial, totalFern);
        const sentinelMesh = new THREE.InstancedMesh(this.sentinelGeo, this.floorMaterial, totalSentinel);

        const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        let mossIdx = 0;
        let fernIdx = 0;
        let sentinelIdx = 0;

        // 1. Clustered Placement (Priority)
        if (clusterPoints.length > 0) {
            clusterPoints.forEach(pt => {
                // Place 8-12 moss blocks and 3-5 ferns per cluster
                const itemsInCluster = 8 + Math.floor(Math.random() * 5);
                for (let c = 0; c < itemsInCluster; c++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 1.5 + Math.random() * 3.5;
                    const wx = pt.x + Math.cos(angle) * dist;
                    const wz = pt.z + Math.sin(angle) * dist;
                    const wy = getTerrainY(wx, wz);

                    if (mossIdx < totalMoss) {
                        dummy.position.set(wx, wy - 0.05, wz);
                        dummy.rotation.y = Math.random() * Math.PI;
                        dummy.scale.setScalar(1.2 + Math.random() * 2.0); // Increased scale
                        dummy.updateMatrix();
                        mossMesh.setMatrixAt(mossIdx++, dummy.matrix);
                    }
                    
                    if (c % 3 === 0 && fernIdx < totalFern) {
                        dummy.position.set(wx, wy, wz);
                        dummy.scale.setScalar(0.7 + Math.random() * 0.8);
                        dummy.updateMatrix();
                        fernMesh.setMatrixAt(fernIdx++, dummy.matrix);
                    }
                }
            });
        }

        // 2. Random Scatter (Fill remaining)
        const chunkOriginX = cx * 60;
        const chunkOriginZ = cz * 60;

        while (mossIdx < totalMoss) {
            const wx = chunkOriginX + (Math.random() - 0.5) * 60;
            const wz = chunkOriginZ + (Math.random() - 0.5) * 60;
            const wy = getTerrainY(wx, wz);

            dummy.position.set(wx, wy - 0.05, wz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.8 + Math.random() * 1.5);
            dummy.updateMatrix();
            mossMesh.setMatrixAt(mossIdx++, dummy.matrix);
        }

        while (fernIdx < totalFern) {
            const wx = chunkOriginX + (Math.random() - 0.5) * 60;
            const wz = chunkOriginZ + (Math.random() - 0.5) * 60;
            const wy = getTerrainY(wx, wz);
            dummy.position.set(wx, wy, wz);
            dummy.scale.setScalar(0.5 + Math.random() * 1.0);
            dummy.updateMatrix();
            fernMesh.setMatrixAt(fernIdx++, dummy.matrix);
        }

        while (sentinelIdx < totalSentinel) {
            const wx = chunkOriginX + (Math.random() - 0.5) * 60;
            const wz = chunkOriginZ + (Math.random() - 0.5) * 60;
            const wy = getTerrainY(wx, wz);
            dummy.position.set(wx, wy, wz);
            dummy.scale.setScalar(0.5 + Math.random() * 1.2);
            dummy.updateMatrix();
            sentinelMesh.setMatrixAt(sentinelIdx++, dummy.matrix);
        }

        [mossMesh, fernMesh, sentinelMesh].forEach(m => {
            m.instanceMatrix.needsUpdate = true;
            m.castShadow = true;
            m.receiveShadow = true;
            group.add(m);
        });

        this.scene.add(group);
        this.grassChunks.set(chunkKey, group);
    }

    unloadFloorPatch(chunkKey) {
        const group = this.grassChunks.get(chunkKey);
        if (group) {
            group.children.forEach(m => {
                m.geometry.dispose();
                m.material.dispose();
            });
            this.scene.remove(group);
            this.grassChunks.delete(chunkKey);
        }
    }

    update(delta, entityPositions = []) {
        this.time += delta;
    }
}

if (typeof window !== 'undefined') {
    window.GrassSystem = new GrassSystem();
}

