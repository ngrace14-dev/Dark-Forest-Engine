import * as THREE from 'three';
import { BlockTerrainChunk, createProceduralBlockMaterial } from './src_systems_block_terrain.js';

class RoadRenderer {
    constructor() {
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
        
        this.flagstoneMat = createProceduralBlockMaterial({
            topColor: '#4a4d46',      
            sideColor: '#2d302a',     
            bottomColor: '#1a1c18',   
            noiseScale: 0.3,
            displacement: 0.05
        });
    }

    buildDecorationsForChunk(chunkKey, chunkX, chunkZ, scene) {
        const roadPoints = window.RoadManager?.getRoadPointsNear(chunkX, chunkZ, 45);
        if (!roadPoints || roadPoints.length === 0) return;

        const blockData = [];
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const getTerrainY = (x, z) => {
            const h = window.WorldGenerator?.getTerrainHeight?.(x, z) ?? 0;
            return Number.isFinite(h) ? h : 0;
        };

        for (let i = 0; i < roadPoints.length; i++) {
            const pt = roadPoints[i];
            if (!Number.isFinite(pt.x) || !Number.isFinite(pt.z)) continue;

            for (let s = 0; s < 3; s++) {
                const offsetX = (hash(pt.x + s, pt.z) - 0.5) * 4.0;
                const offsetZ = (hash(pt.x, pt.z + s) - 0.5) * 4.0;
                const wx = pt.x + offsetX;
                const wz = pt.z + offsetZ;
                const wy = getTerrainY(wx, wz) + 0.06;

                if (!Number.isFinite(wy)) continue;

                blockData.push({
                    x: wx,
                    y: wy,
                    z: wz,
                    scaleX: 0.8 + hash(wx, wz) * 0.5,
                    scaleY: 0.12,
                    scaleZ: 0.8 + hash(wx + s, wz) * 0.5,
                    rotX: 0,
                    rotY: hash(s, wz) * Math.PI,
                    rotZ: 0
                });
            }
        }

        if (blockData.length > 0) {
            const chunk = new BlockTerrainChunk(blockData.length, this.cubeGeo, this.flagstoneMat);
            chunk.buildChunk(blockData);
            scene.add(chunk.mesh);
        }
    }
}

window.RoadRenderer = new RoadRenderer();
