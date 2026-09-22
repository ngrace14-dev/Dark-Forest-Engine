// ============================================================================
// Dark Forest Engine - Procedural Stone Ruins & Ancient Cobblestones System
// File: src/systems/ruins.js
// ============================================================================

import * as THREE from 'three';
// FIX: Removed ES6 import for block_terrain.js that was causing 404 errors

class RuinsSystem {
    constructor() {
        this.activeRuins = new Map();
        this.initialized = false;
        this.scene = null;

        this.stoneMaterial = null;
        this.cobbleMaterial = null;

        this.pillarGeo = null;
        this.wallBlockGeo = null;
        this.cobbleGeo = null;

        this.bindEvents();
    }

    bindEvents() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENGINE_READY', () => {
                if (window.GameCore?.scene) {
                    this.init(window.GameCore.scene);
                }
            });

            window.EventBus.on('WORLD_REGENERATE', () => {
                this.clearAll();
            });
        }
    }

    init(scene) {
        if (this.initialized) return;
        this.scene = scene;

        this.initMaterials();
        this.initGeometries();

        this.initialized = true;
        console.log('[RuinsSystem] Initialized successfully.');
    }

    initMaterials() {
        // FIX: Route material generation through global scope, with safe fallbacks
        const generateMaterial = (options) => {
            if (window.BlockTerrainSystem && window.BlockTerrainSystem.createProceduralBlockMaterial) {
                return window.BlockTerrainSystem.createProceduralBlockMaterial(options);
            } else {
                return new THREE.MeshStandardMaterial(options);
            }
        };

        this.stoneMaterial = generateMaterial({
            color: 0x6b7280,
            roughness: 0.85,
            metalness: 0.05
        });

        this.cobbleMaterial = generateMaterial({
            color: 0x4b5563,
            roughness: 0.95,
            metalness: 0.02
        });
    }

    initGeometries() {
        this.pillarGeo = new THREE.CylinderGeometry(0.8, 1.1, 7.0, 10);
        this.pillarGeo.translate(0, 3.5, 0);

        this.wallBlockGeo = new THREE.BoxGeometry(2.5, 1.2, 1.2);
        this.wallBlockGeo.translate(0, 0.6, 0);

        this.cobbleGeo = new THREE.BoxGeometry(1.2, 0.3, 1.2);
        this.cobbleGeo.translate(0, 0.15, 0);
    }

    hash2D(x, z) {
        let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    }

    getTerrainHeight(x, z) {
        if (typeof window !== 'undefined' && window.WorldGenerator?.getTerrainHeight) {
            const h = window.WorldGenerator.getTerrainHeight(x, z);
            if (Number.isFinite(h)) return h;
        }
        return 0;
    }

    generateRuinsForChunk(cx, cz, chunkSize = 60.0) {
        if (!this.initialized && window.GameCore?.scene) {
            this.init(window.GameCore.scene);
        }

        const chunkKey = `chunk_${cx}_${cz}`;
        if (this.activeRuins.has(chunkKey)) return;

        const ruinRoll = this.hash2D(cx * 0.31, cz * 0.31);
        if (ruinRoll > 0.12) return;

        const centerX = cx * chunkSize + chunkSize / 2;
        const centerZ = cz * chunkSize + chunkSize / 2;

        if (window.RoadManager?.isSafeZone?.({ x: centerX, z: centerZ }) ||
            window.CapitalCityManager?.isInsideCapital?.(centerX, centerZ)) {
            return;
        }

        const chunkGroup = new THREE.Group();
        chunkGroup.position.set(centerX, 0, centerZ);

        const groundY = this.getTerrainHeight(centerX, centerZ);

        const cobbleCount = 25;
        const cobbleMesh = new THREE.InstancedMesh(this.cobbleGeo, this.cobbleMaterial, cobbleCount);
        cobbleMesh.castShadow = true;
        cobbleMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let cobbleIdx = 0;

        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                const px = x * 2.2 + (this.hash2D(x, z) - 0.5) * 0.4;
                const pz = z * 2.2 + (this.hash2D(z, x) - 0.5) * 0.4;
                const py = groundY + (this.hash2D(px, pz) - 0.5) * 0.1;

                dummy.position.set(px, py, pz);
                dummy.rotation.set(
                    (this.hash2D(px, py) - 0.5) * 0.1,
                    this.hash2D(px, pz) * Math.PI * 2,
                    (this.hash2D(py, pz) - 0.5) * 0.1
                );
                dummy.scale.set(0.9 + this.hash2D(px, z) * 0.3, 1.0, 0.9 + this.hash2D(x, pz) * 0.3);
                dummy.updateMatrix();

                cobbleMesh.setMatrixAt(cobbleIdx++, dummy.matrix);
            }
        }
        cobbleMesh.instanceMatrix.needsUpdate = true;
        chunkGroup.add(cobbleMesh);

        const pillarCount = 4;
        const pillarMesh = new THREE.InstancedMesh(this.pillarGeo, this.stoneMaterial, pillarCount);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;

        const pillarPositions = [
            { x: -4.5, z: -4.5 },
            { x:  4.5, z: -4.5 },
            { x: -4.5, z:  4.5 },
            { x:  4.5, z:  4.5 }
        ];

        pillarPositions.forEach((pos, i) => {
            const py = this.getTerrainHeight(centerX + pos.x, centerZ + pos.z);
            const isToppled = this.hash2D(pos.x, pos.z) < 0.4;

            dummy.position.set(pos.x, py, pos.z);
            if (isToppled) {
                dummy.rotation.set(
                    Math.PI / 2 + (this.hash2D(i, pos.x) - 0.5) * 0.2,
                    this.hash2D(pos.x, pos.z) * Math.PI * 2,
                    0
                );
            } else {
                dummy.rotation.set(
                    (this.hash2D(pos.x, i) - 0.5) * 0.12,
                    this.hash2D(i, pos.z) * Math.PI * 2,
                    (this.hash2D(i, pos.y) - 0.5) * 0.12
                );
            }

            const heightScale = 0.6 + this.hash2D(pos.x * 2, pos.z * 2) * 0.5;
            dummy.scale.set(1.0, heightScale, 1.0);
            dummy.updateMatrix();

            pillarMesh.setMatrixAt(i, dummy.matrix);

            if (window.GameCore?.world && window.RAPIER) {
                try {
                    const bodyDesc = window.RAPIER.RigidBodyDesc.fixed()
                        .setTranslation(centerX + pos.x, py + 3.5, centerZ + pos.z);
                    const body = window.GameCore.world.createRigidBody(bodyDesc);
                    const colliderDesc = window.RAPIER.ColliderDesc.cylinder(3.5, 0.9);
                    window.GameCore.world.createCollider(colliderDesc, body);
                } catch (e) {
                }
            }
        });

        pillarMesh.instanceMatrix.needsUpdate = true;
        chunkGroup.add(pillarMesh);

        if (this.scene) {
            this.scene.add(chunkGroup);
        }

        this.activeRuins.set(chunkKey, chunkGroup);
    }

    unloadRuinsForChunk(chunkKey) {
        const group = this.activeRuins.get(chunkKey);
        if (!group) return;

        group.traverse(child => {
            if (child.isMesh || child.isInstancedMesh) {
                child.geometry?.dispose();
            }
        });

        if (group.parent) {
            group.parent.remove(group);
        }

        this.activeRuins.delete(chunkKey);
    }

    clearAll() {
        for (const [key, group] of this.activeRuins.entries()) {
            group.traverse(child => {
                if (child.isMesh || child.isInstancedMesh) {
                    child.geometry?.dispose();
                }
            });
            if (group.parent) {
                group.parent.remove(group);
            }
        }
        this.activeRuins.clear();
    }
}

if (typeof window !== 'undefined') {
    window.RuinsSystem = new RuinsSystem();
}

export { RuinsSystem };
export default window.RuinsSystem;
