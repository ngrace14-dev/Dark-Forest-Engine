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
            flatShading: true,
            vertexColors: true // Enable vertex colors for debug pass
        });

        this.floorMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                varying float vY;
                varying vec3 vColor;
                ${shader.vertexShader}
            `.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                vY = position.y;
                vColor = color;
            `);
            shader.fragmentShader = `
                varying float vY;
                varying vec3 vColor;
                ${shader.fragmentShader}
            `.replace('#include <color_fragment>', `
                #include <color_fragment>
                // VISIBILITY VALIDATION MODE: Use bright debug colors
                diffuseColor.rgb = vColor;
                // Add top-down gradient for volume
                diffuseColor.rgb *= mix(0.7, 1.0, vY);
            `);
        };
    }

    spawnFloorPatch(chunkKey, cx, cz, biomeKey, clusterPoints = [], roadPoints = []) {
        if (!this.initialized || !this.scene) return;
        if (this.grassChunks.has(chunkKey)) return;

        // --- 1. DENSITY ALLOCATION ---
        let baseDensity = 50;
        if (biomeKey === 'redwoods') baseDensity = 4000;
        else if (biomeKey === 'valley') baseDensity = 2000;

        // Budget split across layers
        const mossCount = Math.floor(baseDensity * 1.0);     // Layer 1
        const fernCount = Math.floor(baseDensity * 0.4);     // Layer 2
        const shardCount = Math.floor(baseDensity * 0.3);    // Layer 3
        const sentinelCount = Math.floor(baseDensity * 0.1); // Layer 4
        
        const group = new THREE.Group();
        const mossMesh = new THREE.InstancedMesh(this.mossGeo, this.floorMaterial, mossCount);
        const fernMesh = new THREE.InstancedMesh(this.fernGeo, this.floorMaterial, fernCount);
        const shardMesh = new THREE.InstancedMesh(this.shardGeo, this.floorMaterial, shardCount);
        const sentinelMesh = new THREE.InstancedMesh(this.sentinelGeo, this.floorMaterial, sentinelCount);

        // --- DEBUG COLORS ---
        const magenta = new THREE.Color(0xff00ff);
        const cyan = new THREE.Color(0x00ffff);
        const yellow = new THREE.Color(0xffff00);
        const red = new THREE.Color(0xff0000);

        const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        let mIdx = 0, fIdx = 0, shIdx = 0, sIdx = 0;
        const chunkX = cx * 60 + 30; // SYNCED: cx * 60 + 30
        const chunkZ = cz * 60 + 30; // SYNCED: cz * 60 + 30

        // --- 2. ROOT ACCENTS & CLUSTERED PLACEMENT ---
        clusterPoints.forEach(pt => {
            const clusterSize = 12 + Math.floor(Math.random() * 8);
            for (let i = 0; i < clusterSize; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1.0 + Math.random() * 4.0;
                const wx = pt.x + Math.cos(angle) * dist;
                const wz = pt.z + Math.sin(angle) * dist;
                const wy = getTerrainY(wx, wz);

                // Cluster priority: Skirt the trunks with moss and ferns
                if (mIdx < mossCount) {
                    dummy.position.set(wx, wy + 0.1, wz); // LIFTED: wy + 0.1
                    dummy.scale.set(2.0, 0.8 + Math.random(), 2.0);
                    dummy.updateMatrix();
                    mossMesh.setMatrixAt(mIdx++, dummy.matrix);
                    mossMesh.setColorAt(mIdx - 1, magenta);
                }
                if (fIdx < fernCount && i % 2 === 0) {
                    dummy.position.set(wx, wy + 0.1, wz);
                    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
                    dummy.updateMatrix();
                    fernMesh.setMatrixAt(fIdx++, dummy.matrix);
                    fernMesh.setColorAt(fIdx - 1, cyan);
                }
            }
        });

        // --- 3. LAYERED SCATTER (AMBIENT COVERAGE) ---
        const remainingMossCount = Math.max(1, mossCount - mIdx);
        const step = 60.0 / Math.sqrt(remainingMossCount);
        for (let x = -30.0; x < 30.0; x += step) {
            for (let z = -30.0; z < 30.0; z += step) {
                const wx = chunkX + x + (Math.random() - 0.5) * step;
                const wz = chunkZ + z + (Math.random() - 0.5) * step;
                
                // --- ROAD & VILLAGE MASKING ---
                let coverageMod = 1.0;
                if (roadPoints && roadPoints.length > 0) {
                    let minDistSq = 10000.0;
                    roadPoints.forEach(rp => {
                        const d2 = Math.pow(wx - rp.x, 2) + Math.pow(wz - rp.z, 2);
                        if (d2 < minDistSq) minDistSq = d2;
                    });
                    if (minDistSq < 16.0) coverageMod = 0.2; 
                    else if (minDistSq < 64.0) coverageMod = 0.5;
                }

                if (Math.random() > coverageMod) continue;

                const wy = getTerrainY(wx, wz);

                // Layer 1: Moss Carpet (High coverage)
                if (mIdx < mossCount) {
                    dummy.position.set(wx, wy + 0.05, wz); // LIFTED: wy + 0.05
                    dummy.rotation.y = Math.random() * Math.PI;
                    dummy.scale.set(3.0 + Math.random() * 2.0, 0.5, 3.0 + Math.random() * 2.0);
                    dummy.updateMatrix();
                    mossMesh.setMatrixAt(mIdx++, dummy.matrix);
                    mossMesh.setColorAt(mIdx - 1, magenta);
                }

                // Layer 2: Fern Tiers (Island clusters)
                if (fIdx < fernCount && Math.random() < 0.25) {
                    dummy.position.set(wx, wy + 0.1, wz);
                    dummy.scale.setScalar(0.5 + Math.random() * 1.5);
                    dummy.updateMatrix();
                    fernMesh.setMatrixAt(fIdx++, dummy.matrix);
                    fernMesh.setColorAt(fIdx - 1, cyan);
                }

                // Layer 3: Ground Shards (Details)
                if (shIdx < shardCount && Math.random() < 0.2) {
                    dummy.position.set(wx, wy + 0.1, wz);
                    dummy.rotation.y = Math.random() * Math.PI * 2;
                    dummy.scale.setScalar(0.4 + Math.random() * 1.2);
                    dummy.updateMatrix();
                    shardMesh.setMatrixAt(shIdx++, dummy.matrix);
                    shardMesh.setColorAt(shIdx - 1, yellow);
                }

                // Layer 4: Sentinels (Accents)
                if (sIdx < sentinelCount && Math.random() < 0.05) {
                    dummy.position.set(wx, wy + 0.1, wz);
                    dummy.scale.setScalar(0.8 + Math.random() * 1.0);
                    dummy.updateMatrix();
                    sentinelMesh.setMatrixAt(sIdx++, dummy.matrix);
                    sentinelMesh.setColorAt(sIdx - 1, red);
                }
            }
        }

        // Finalize
        [mossMesh, fernMesh, shardMesh, sentinelMesh].forEach(m => {
            m.count = (m === mossMesh) ? mIdx : (m === fernMesh) ? fIdx : (m === shardMesh) ? shIdx : sIdx;
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

