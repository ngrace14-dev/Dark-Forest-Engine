import * as THREE from 'three';
import { BlockTerrainChunk, createProceduralBlockMaterial } from './src_systems_block_terrain.js';

class RoadRenderer {
    constructor() {
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
        
        // Flagstone Material (Mossy slate-grey blocks embedded into dirt)
        this.flagstoneMat = createProceduralBlockMaterial({
            topColor: '#4a4d46',      
            sideColor: '#2d302a',     
            bottomColor: '#1a1c18',   
            noiseScale: 0.3,
            displacement: 0.12
        });

        // Lantern Post Wood
        this.woodMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
        this.lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // Cyan Ward Glow

        this.roadDecorationChunks = [];
        this.initialized = false;
    }

    buildDecorationsForChunk(chunkKey, chunkX, chunkZ, scene) {
        const roadPoints = window.RoadManager?.getRoadPointsNear(chunkX, chunkZ, 45);
        if (!roadPoints || roadPoints.length === 0) return;

        const blockData = [];
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);

        // 1. Spawn Embedded Cobble Slabs & Wagon Rut Lines
        for (let i = 0; i < roadPoints.length; i++) {
            const pt = roadPoints[i];
            
            // Scatter 4-6 flat stone slabs per road node
            for (let s = 0; s < 5; s++) {
                const offsetX = (hash(pt.x + s, pt.z) - 0.5) * 5.0;
                const offsetZ = (hash(pt.x, pt.z + s) - 0.5) * 5.0;
                const wx = pt.x + offsetX;
                const wz = pt.z + offsetZ;
                const wy = getTerrainY(wx, wz) + 0.08;

                blockData.push({
                    x: wx,
                    y: wy,
                    z: wz,
                    scaleX: 0.9 + hash(wx, wz) * 0.7,
                    scaleY: 0.15 + hash(wz, wx) * 0.1, // Embedded flat slab
                    scaleZ: 0.9 + hash(wx + s, wz) * 0.7,
                    rotX: (hash(wx, s) - 0.5) * 0.1,
                    rotY: hash(s, wz) * Math.PI,
                    rotZ: (hash(wz, s) - 0.5) * 0.1
                });
            }

            // 2. Spawn Roadside Wayfinder Lanterns every ~40 meters
            if (i % 4 === 0 && hash(pt.x, pt.z) > 0.4) {
                const side = hash(pt.x, i) > 0.5 ? 1 : -1;
                const lx = pt.x + side * 3.8;
                const lz = pt.z + (hash(i, pt.z) - 0.5) * 2.0;
                const ly = getTerrainY(lx, lz);

                this.spawnLanternPost(scene, lx, ly, lz);
            }
        }

        if (blockData.length > 0) {
            const chunk = new BlockTerrainChunk(blockData.length, this.cubeGeo, this.flagstoneMat);
            chunk.buildChunk(blockData);
            scene.add(chunk.mesh);
            this.roadDecorationChunks.push(chunk);
        }
    }

    spawnLanternPost(scene, x, y, z) {
        const postGroup = new THREE.Group();

        // Wooden Post (Cylinder primitive)
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.18, 3.2, 6),
            this.woodMat
        );
        post.position.set(x, y + 1.6, z);
        post.castShadow = true;
        postGroup.add(post);

        // Glowing Rune Lantern Head (Box primitive)
        const lantern = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.5, 0.4),
            this.lanternGlowMat
        );
        lantern.position.set(x, y + 3.2, z);
        postGroup.add(lantern);

        scene.add(postGroup);
    }
}

window.RoadRenderer = new RoadRenderer();
