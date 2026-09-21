import * as THREE from 'three';
import { BlockTerrainChunk, createProceduralBlockMaterial } from './src_systems_block_terrain.js';

class RuinsSystem {
    constructor() {
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4); // Subdivided for edge distortion
        
        // Weathered Ancient Stone Material (Mossy Top, Granite Sides, Damp Soil Base)
        this.stoneMat = createProceduralBlockMaterial({
            topColor: '#3a4f38',      
            sideColor: '#524f48',     
            bottomColor: '#26221c',   
            noiseScale: 0.2,
            displacement: 0.25
        });

        // Weathered Cobblestone Road Material
        this.cobbleMat = createProceduralBlockMaterial({
            topColor: '#3e423b',
            sideColor: '#2c2e29',
            bottomColor: '#1d1f1b',
            noiseScale: 0.35,
            displacement: 0.15
        });

        this.ruinChunks = [];
        this.cobbleChunks = [];
    }

    // --- 1. PROCEDURAL COBBLESTONE PATH GENERATOR ---
    generateCobblePath(scene, roadPoints, density = 3) {
        if (!roadPoints || roadPoints.length < 2) return;

        const blockData = [];
        const hash = (x, z) => {
            let h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);

        for (let i = 0; i < roadPoints.length; i++) {
            const pt = roadPoints[i];
            for (let d = 0; d < density; d++) {
                const offsetX = (hash(pt.x + d, pt.z) - 0.5) * 4.5;
                const offsetZ = (hash(pt.x, pt.z + d) - 0.5) * 4.5;
                const wx = pt.x + offsetX;
                const wz = pt.z + offsetZ;
                const wy = getTerrainY(wx, wz) + 0.05; // Slightly embedded into ground

                blockData.push({
                    x: wx,
                    y: wy,
                    z: wz,
                    scaleX: 0.8 + hash(wx, wz) * 0.6,
                    scaleY: 0.2 + hash(wz, wx) * 0.15, // Flat slabs
                    scaleZ: 0.8 + hash(wx + d, wz) * 0.6,
                    rotX: (hash(wx, d) - 0.5) * 0.15, // Slight tilt for weathered look
                    rotY: hash(d, wz) * Math.PI,
                    rotZ: (hash(wz, d) - 0.5) * 0.15
                });
            }
        }

        const chunk = new BlockTerrainChunk(blockData.length, this.cubeGeo, this.cobbleMat);
        chunk.buildChunk(blockData);
        scene.add(chunk.mesh);
        this.cobbleChunks.push(chunk);
        return chunk;
    }

    // --- 2. PROCEDURAL RUINED WALL & ARCHWAY GENERATOR ---
    spawnRuinedWall(scene, startX, startZ, length = 15, height = 5) {
        const blockData = [];
        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);
        const basePosY = getTerrainY(startX, startZ);

        const hash = (x, y) => {
            let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
            return h - Math.floor(h);
        };

        // Build staggered stone blocks in a wall row with damage decay
        for (let x = 0; x < length; x += 1.8) {
            const wallProfile = Math.sin((x / length) * Math.PI); // Shorter ruined ends
            const maxStack = Math.floor(height * wallProfile) + 1;

            for (let y = 0; y < maxStack; y++) {
                if (y > 1 && hash(x, y) > 0.75) continue; // Random missing blocks in gap

                const bx = startX + x;
                const by = basePosY + (y * 1.1) + 0.5;
                const bz = startZ + (hash(x, y) - 0.5) * 0.3;

                blockData.push({
                    x: bx,
                    y: by,
                    z: bz,
                    scaleX: 1.8 + (hash(x, y) - 0.5) * 0.2,
                    scaleY: 1.0,
                    scaleZ: 1.2 + (hash(y, x) - 0.5) * 0.2,
                    rotX: (hash(x, y) - 0.5) * 0.08,
                    rotY: (hash(y, x) - 0.5) * 0.1,
                    rotZ: (hash(x + y, y) - 0.5) * 0.08
                });

                // Spawn fallen debris blocks nearby on ground
                if (y === maxStack - 1 && hash(x, y) > 0.4) {
                    const debrisX = bx + (hash(x * 2, y) - 0.5) * 3.5;
                    const debrisZ = bz + (hash(y * 2, x) - 0.5) * 3.5;
                    blockData.push({
                        x: debrisX,
                        y: getTerrainY(debrisX, debrisZ) + 0.4,
                        z: debrisZ,
                        scaleX: 1.2,
                        scaleY: 0.8,
                        scaleZ: 1.0,
                        rotX: hash(debrisX, debrisZ) * Math.PI,
                        rotY: hash(debrisZ, debrisX) * Math.PI,
                        rotZ: hash(debrisX + debrisZ, x) * Math.PI
                    });
                }
            }
        }

        const chunk = new BlockTerrainChunk(blockData.length, this.cubeGeo, this.stoneMat);
        chunk.buildChunk(blockData);
        scene.add(chunk.mesh);
        this.ruinChunks.push(chunk);
        return chunk;
    }

    // --- 3. PROCEDURAL CIRCULAR TEMPLE / SHRINE ---
    spawnRuinedTemple(scene, centerX, centerZ, radius = 8, pillarCount = 6) {
        const blockData = [];
        const getTerrainY = window.WorldGenerator?.getTerrainHeight || (() => 0);
        const centerY = getTerrainY(centerX, centerZ);

        // Tiered Center Dais (Altar Platform)
        for (let ring = 0; ring < 3; ring++) {
            const ringRadius = radius * (1.0 - ring * 0.25);
            const stepHeight = 0.5;
            const blocksInRing = Math.floor(ringRadius * 3);

            for (let i = 0; i < blocksInRing; i++) {
                const angle = (i / blocksInRing) * Math.PI * 2;
                const bx = centerX + Math.cos(angle) * ringRadius;
                const bz = centerZ + Math.sin(angle) * ringRadius;
                const by = centerY + (ring * stepHeight) + 0.25;

                blockData.push({
                    x: bx,
                    y: by,
                    z: bz,
                    scaleX: 1.5,
                    scaleY: 0.5,
                    scaleZ: 1.5,
                    rotX: 0,
                    rotY: angle,
                    rotZ: 0
                });
            }
        }

        // Outer Pillars
        for (let i = 0; i < pillarCount; i++) {
            const angle = (i / pillarCount) * Math.PI * 2;
            const px = centerX + Math.cos(angle) * (radius + 2);
            const pz = centerZ + Math.sin(angle) * (radius + 2);
            const py = getTerrainY(px, pz);

            const pillarHeight = 3 + Math.floor(Math.random() * 4); // Variable ruined pillar heights

            for (let h = 0; h < pillarHeight; h++) {
                const isTop = h === pillarHeight - 1;
                const tilt = isTop ? 0.35 : 0.05; // Broken top pillar block tilts dangerously

                blockData.push({
                    x: px,
                    y: py + (h * 1.2) + 0.6,
                    z: pz,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    scaleZ: 1.2,
                    rotX: (Math.random() - 0.5) * tilt,
                    rotY: Math.random() * Math.PI,
                    rotZ: (Math.random() - 0.5) * tilt
                });
            }
        }

        const chunk = new BlockTerrainChunk(blockData.length, this.cubeGeo, this.stoneMat);
        chunk.buildChunk(blockData);
        scene.add(chunk.mesh);
        this.ruinChunks.push(chunk);
        return chunk;
    }
}

window.RuinsSystem = new RuinsSystem();
