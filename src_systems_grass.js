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
                    varying vec3 vDebugColor;
                    ${shader.vertexShader}
                `.replace('#include <begin_vertex>', `
                    #include <begin_vertex>
                    vY = position.y;
                    vDebugColor = color;
                `);
                shader.fragmentShader = `
                    varying float vY;
                    varying vec3 vDebugColor;
                    ${shader.fragmentShader}
                `.replace('#include <color_fragment>', `
                    #include <color_fragment>
                    // VISIBILITY VALIDATION MODE: Use bright debug colors
                    diffuseColor.rgb = vDebugColor;
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

        const totalMoss = baseDensity;
        const totalFern = Math.floor(baseDensity * 0.4);
        const totalShard = Math.floor(baseDensity * 0.3);
        const totalSentinel = Math.floor(baseDensity * 0.1);
        
        const group = new THREE.Group();
        const mossMesh = new THREE.InstancedMesh(this.mossGeo, this.floorMaterial, totalMoss);
        const fernMesh = new THREE.InstancedMesh(this.fernGeo, this.floorMaterial, totalFern);
        const shardMesh = new THREE.InstancedMesh(this.shardGeo, this.floorMaterial, totalShard);
        const sentinelMesh = new THREE.InstancedMesh(this.sentinelGeo, this.floorMaterial, totalSentinel);

        // --- DEBUG COLORS ---
        const magenta = new THREE.Color(0xff00ff);
        const cyan = new THREE.Color(0x00ffff);
        const yellow = new THREE.Color(0xffff00);
        const red = new THREE.Color(0xff0000);

        const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        let mIdx = 0, fIdx = 0, shIdx = 0, sIdx = 0;
        const chunkX = cx * 60 + 30;
        const chunkZ = cz * 60 + 30;

        // --- 2. ROOT ACCENTS & CLUSTERED PLACEMENT ---
        clusterPoints.forEach(pt => {
            const clusterSize = 16 + Math.floor(Math.random() * 12);
            for (let i = 0; i < clusterSize; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1.0 + Math.random() * 5.0;
                const wx = pt.x + Math.cos(angle) * dist;
                const wz = pt.z + Math.sin(angle) * dist;
                const wy = getTerrainY(wx, wz);

                if (mIdx < totalMoss) {
                    dummy.position.set(wx, wy + 0.1, wz); 
                    dummy.scale.set(1.2 + Math.random() * 0.8, 0.8 + Math.random(), 1.2 + Math.random() * 0.8);
                    dummy.updateMatrix();
                    mossMesh.setMatrixAt(mIdx++, dummy.matrix);
                    mossMesh.setColorAt(mIdx - 1, magenta);
                }
                if (fIdx < totalFern && i % 2 === 0) {
                    dummy.position.set(wx, wy + 0.1, wz);
                    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
                    dummy.updateMatrix();
                    fernMesh.setMatrixAt(fIdx++, dummy.matrix);
                    fernMesh.setColorAt(fIdx - 1, cyan);
                }
            }
        });

        // --- 3. LAYERED SCATTER (PATCHY COVERAGE) ---
        const getPatchDensity = (x, z) => {
            const n = Math.sin(x * 0.05) * Math.cos(z * 0.05) + 
                      Math.sin(x * 0.15) * 0.5 + 
                      Math.cos(z * 0.12) * 0.5;
            return (n + 1.0) * 0.5;
        };

        let attempts = 0;
        const remainingMoss = totalMoss - mIdx;
        const maxAttempts = remainingMoss * 4;

        while (mIdx < totalMoss && attempts < maxAttempts) {
            attempts++;
            const wx = chunkX + (Math.random() - 0.5) * 60;
            const wz = chunkZ + (Math.random() - 0.5) * 60;
            
            const patchMask = getPatchDensity(wx, wz);
            if (Math.random() > patchMask) continue;

            let coverageMod = 1.0;
            if (roadPoints && roadPoints.length > 0) {
                let minDistSq = 10000.0;
                roadPoints.forEach(rp => {
                    const d2 = Math.pow(wx - rp.x, 2) + Math.pow(wz - rp.z, 2);
                    if (d2 < minDistSq) minDistSq = d2;
                });
                if (minDistSq < 16.0) coverageMod = 0.1; 
                else if (minDistSq < 64.0) coverageMod = 0.4;
            }
            if (Math.random() > coverageMod) continue;

            const wy = getTerrainY(wx, wz);

            // Layer 1: Moss Carpet (High organic variation)
            const moundRoll = Math.random();
            dummy.position.set(wx, wy + 0.05, wz);
            dummy.rotation.y = Math.random() * Math.PI;
            
            if (moundRoll < 0.25) { // The Mound
                dummy.scale.set(1.5 + Math.random(), 1.2 + Math.random() * 2.5, 1.5 + Math.random());
            } else { // The Slab
                dummy.scale.set(1.5 + Math.random() * 1.5, 0.4 + Math.random() * 0.4, 1.5 + Math.random() * 1.5);
            }
            
            dummy.updateMatrix();
            mossMesh.setMatrixAt(mIdx++, dummy.matrix);
            mossMesh.setColorAt(mIdx - 1, magenta);

            // Layer 2: Fern Tiers (Attracted to Moss Patches)
            if (fIdx < totalFern && Math.random() < 0.35) {
                dummy.position.set(wx + (Math.random()-0.5), wy + 0.1, wz + (Math.random()-0.5));
                dummy.scale.setScalar(0.6 + Math.random() * 1.4);
                dummy.updateMatrix();
                fernMesh.setMatrixAt(fIdx++, dummy.matrix);
                fernMesh.setColorAt(fIdx - 1, cyan);
            }

            // Layer 3: Ground Shards
            if (shIdx < totalShard && Math.random() < 0.25) {
                dummy.position.set(wx, wy + 0.1, wz);
                dummy.rotation.y = Math.random() * Math.PI * 2;
                dummy.scale.setScalar(0.5 + Math.random() * 1.2);
                dummy.updateMatrix();
                shardMesh.setMatrixAt(shIdx++, dummy.matrix);
                shardMesh.setColorAt(shIdx - 1, yellow);
            }

            // Layer 4: Sentinels
            if (sIdx < totalSentinel && Math.random() < 0.06) {
                dummy.position.set(wx, wy + 0.1, wz);
                dummy.scale.setScalar(0.8 + Math.random() * 1.2);
                dummy.updateMatrix();
                sentinelMesh.setMatrixAt(sIdx++, dummy.matrix);
                sentinelMesh.setColorAt(sIdx - 1, red);
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

