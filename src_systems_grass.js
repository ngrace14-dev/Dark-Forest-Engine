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

    spawnFloorPatch(chunkKey, cx, cz, biomeKey) {
        if (!this.initialized || !this.scene) return;
        if (this.grassChunks.has(chunkKey)) return;

        const density = (biomeKey === 'redwoods' || biomeKey === 'valley') ? 150 : 20;
        
        const group = new THREE.Group();
        const mossMesh = new THREE.InstancedMesh(this.mossGeo, this.floorMaterial, density);
        const fernMesh = new THREE.InstancedMesh(this.fernGeo, this.floorMaterial, Math.floor(density * 0.4));
        const sentinelMesh = new THREE.InstancedMesh(this.sentinelGeo, this.floorMaterial, Math.floor(density * 0.2));

        const dummy = new THREE.Object3D();
        const getTerrainY = (x, z) => window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;

        for (let i = 0; i < density; i++) {
            const wx = cx * 60 + (Math.random() - 0.5) * 60;
            const wz = cz * 60 + (Math.random() - 0.5) * 60;
            const wy = getTerrainY(wx, wz);

            // Moss Block
            dummy.position.set(wx, wy - 0.05, wz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.8 + Math.random() * 1.5);
            dummy.updateMatrix();
            mossMesh.setMatrixAt(i, dummy.matrix);

            // Fern Wedge (Probability-based)
            if (i < Math.floor(density * 0.4)) {
                dummy.position.set(wx + 0.5, wy, wz + 0.5);
                dummy.scale.setScalar(0.5 + Math.random() * 1.0);
                dummy.updateMatrix();
                fernMesh.setMatrixAt(i, dummy.matrix);
            }

            // Sentinel (Probability-based)
            if (i < Math.floor(density * 0.2)) {
                dummy.position.set(wx - 0.5, wy, wz - 0.5);
                dummy.scale.setScalar(0.5 + Math.random() * 1.2);
                dummy.updateMatrix();
                sentinelMesh.setMatrixAt(i, dummy.matrix);
            }
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

