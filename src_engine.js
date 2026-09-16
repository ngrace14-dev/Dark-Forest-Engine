import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import RAPIER from 'rapier';
import alea from 'alea';

window.THREE = THREE; 
window.SkeletonUtils = SkeletonUtils;
window.RAPIER = RAPIER;

window.RAPIER = RAPIER;


let renderer, clock, composer, ambientLight, dirLight;
const fixedTimeStep = 1.0 / 60.0; let accumulator = 0.0;

const ChunkManager = {
    activeChunks: new Map(), currentChunkX: null, currentChunkZ: null,
    
    // --- INSTANCED SCENERY (Diablo 4 Style Batching) ---
    // Stores InstancedMesh objects for each prefab type per chunk
    // Structure: key -> Map(prefabName -> InstancedMesh)
    instancedMeshes: new Map(),

    update: function(playerPos) {
        const cx = Math.floor(playerPos.x / 60); const cz = Math.floor(playerPos.z / 60);
        if (cx !== this.currentChunkX || cz !== this.currentChunkZ) { this.currentChunkX = cx; this.currentChunkZ = cz; this.loadChunksAround(cx, cz); }
    },
    loadChunksAround: function(cx, cz) {
        const expectedChunks = new Set();
        for (let x = cx - 1; x <= cx + 1; x++) { for (let z = cz - 1; z <= cz + 1; z++) { const key = `${x},${z}`; expectedChunks.add(key); if (!this.activeChunks.has(key)) this.generateChunk(x, z); } }
        const toRemove = []; for (const key of this.activeChunks.keys()) if (!expectedChunks.has(key)) toRemove.push(key);
        toRemove.forEach(k => this.unloadChunk(k));
    },
    generateChunk: function(cx, cz) {
        const key = `${cx},${cz}`; const chunkX = cx * 60 + 30; const chunkZ = cz * 60 + 30;
        const geo = new THREE.PlaneGeometry(60, 60, 30, 30); geo.rotateX(-Math.PI / 2);
        const vertices = geo.attributes.position.array; const colors = [];
        
        const localRoadPoints = window.RoadManager.getRoadPointsNear(cx, cz); const ROAD_WIDTH = 5;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + chunkX; const vz = vertices[i+2] + chunkZ;
            const biomeKey = window.WorldGenerator.getBiome(vx, vz); const biome = window.WorldGenConfig.biomes[biomeKey]; let c = new THREE.Color(biome.color);
            
                        let minRoadDistSq = 999999;
            for(let r=0; r<localRoadPoints.length; r++) { 
                const dx = vx - localRoadPoints[r].x;
                const dz = vz - localRoadPoints[r].z;
                const distSq = (dx * dx) + (dz * dz);
                if(distSq < minRoadDistSq) minRoadDistSq = distSq; 
            }
            const minRoadDist = Math.sqrt(minRoadDistSq);
            if(minRoadDist < ROAD_WIDTH + 2) { const dirtInfluence = Math.max(0, 1.0 - (minRoadDist / (ROAD_WIDTH + 2))); c.lerp(new THREE.Color('#38281d'), dirtInfluence); }

            vertices[i+1] = window.WorldGenerator.getTerrainHeight(vx, vz); 
            const colorNoise = window.currentNoise2D(vx * 0.1, vz * 0.1) * 0.05; c.r += colorNoise; c.g += colorNoise; c.b += colorNoise;
            colors.push(c.r, c.g, c.b);
        }
                geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 }); const mesh = new THREE.Mesh(geo, mat); mesh.position.set(chunkX, 0, chunkZ); mesh.receiveShadow = true; mesh.userData.isTerrain = true; mesh.userData.chunkKey = key; window.GameCore.scene.add(mesh);

        const physicsVertices = new Float32Array(vertices); const indicesU32 = new Uint32Array(geo.index.array); 
 
        const groundBody = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(chunkX, 0, chunkZ));
        const collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.trimesh(physicsVertices, indicesU32), groundBody);
        this.activeChunks.set(key, { mesh, body: groundBody, collider });
        
        const rng = alea(`${window.EngineParams.worldSeed}_${cx}_${cz}`);
        
        // --- INSTANCING PREPARATION ---
        const chunkInstances = new Map(); // prefabName -> Array of transforms
        this.instancedMeshes.set(key, chunkInstances);

        const placedLightCells = new Set();
        localRoadPoints.forEach(point => {
            if (point.x < chunkX - 30 || point.x >= chunkX + 30 || point.z < chunkZ - 30 || point.z >= chunkZ + 30) return;
            const cell = `${Math.floor(point.x / 30)},${Math.floor(point.z / 30)}`;
            if (placedLightCells.has(cell)) return;
            placedLightCells.add(cell);
            const lightY = window.WorldGenerator.getTerrainHeight(point.x, point.z);
            instantiatePrefab('Floating Street Light', point.x, lightY, point.z, key);
        });
        
        if (window.VillageManager.villages.length > 0) {
            window.VillageManager.villages.forEach(v => {
                if (v.x >= chunkX - 30 && v.x < chunkX + 30 && v.z >= chunkZ - 30 && v.z < chunkZ + 30) {
                    const originalModel = window.AssetManager.prefabs['Village Hub'].customModel; window.AssetManager.prefabs['Village Hub'].customModel = v.assignedModel || originalModel;
                    const hy = window.WorldGenerator.getTerrainHeight(v.x, v.z); const hub = instantiatePrefab('Village Hub', v.x, hy, v.z, key);
                    if(hub) { hub.villageId = v.id; window.EventBus.emit('UI_LOG', `*** Discovered Major Settlement: ${v.name} ***`); window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: v.name, pos: new THREE.Vector3(v.x, hy + 8, v.z), color: '#ffd700'}); }
                    if (v.layout && v.layout.length > 0) { v.layout.forEach(l => { instantiatePrefab(l.prefab, v.x + l.ox, window.WorldGenerator.getTerrainHeight(v.x + l.ox, v.z + l.oz), v.z + l.oz, key); }); }
                    if (!v.residents) v.residents = [];
                    if (v.residents.length === 0) v.residents.push({ prefab: 'Guard', ox: 4, oz: 4 });
                    v.residents.forEach(resident => {
                        const residentX = v.x + (resident.ox || 0); const residentZ = v.z + (resident.oz || 0);
                        const residentEntity = instantiatePrefab(resident.prefab || 'Guard', residentX, window.WorldGenerator.getTerrainHeight(residentX, residentZ), residentZ, key);
                        if (residentEntity) { 
                            residentEntity.villageId = v.id; 
                            residentEntity.squadId = resident.squadId || null; 
                        
                            // --- NOBLE HOUSE TERMINUS STAT BOOSTS ---
                            if (v.nobleHouse === 'House Terminus') {
                                const isLeader = resident.prefab === 'City Guard' || resident.prefab === 'Noble NPC';
                                const baseStat = isLeader ? 85 : 65;
                                const variance = Math.random() * 10;
                            
                                residentEntity.attackDamage = baseStat + variance;
                                residentEntity.hp = (baseStat + variance) * 5;
                                residentEntity.poise = (baseStat + variance) * 1.5;
                                residentEntity.name = isLeader ? `Terminus Commander` : `Terminus Elite Guard`;
                            
                                // Visual distinction for Terminus (Obsidian Steel)
                                residentEntity.visual.traverse(child => {
                                    if (child.isMesh) {
                                        child.material.color.set(0x111827); 
                                    }
                                });
                            }
                        }
                });
                    window.AssetManager.prefabs['Village Hub'].customModel = originalModel;
                }
            });
        }
        
        // --- SCENERY INSTANCING LOGIC ---
        const sceneryData = new Map(); // prefabName -> transform list

        for(let i=0; i<150; i++) {
            const px = chunkX + (rng() - 0.5) * 60; const pz = chunkZ + (rng() - 0.5) * 60; 
            const biomeKey = window.WorldGenerator.getBiome(px, pz); const biome = window.WorldGenConfig.biomes[biomeKey];
            
            if (biome.prefab !== 'None' && window.AssetManager.prefabs[biome.prefab]) {
                const def = window.AssetManager.prefabs[biome.prefab];
                // Only instance static non-animated structures/mountains
                if ((def.type === 'structure' || def.type === 'mountain') && !def.customModel) {
                    if (!sceneryData.has(biome.prefab)) sceneryData.set(biome.prefab, []);
                    const py = window.WorldGenerator.getTerrainHeight(px, pz);
                    sceneryData.get(biome.prefab).push({ x: px, y: py, z: pz, scale: 0.8 + rng() * 0.4, rot: rng() * Math.PI * 2 });
                } else {
                    // Dynamic or custom models still use normal instantiation
                    instantiatePrefab(biome.prefab, px, window.WorldGenerator.getTerrainHeight(px, pz), pz, key);
                }
            }
        }

        // Finalize Instanced Meshes
        sceneryData.forEach((transforms, prefabName) => {
            const def = window.AssetManager.prefabs[prefabName];
            let geometry;
            if(def.type === 'structure') geometry = new THREE.BoxGeometry(def.radius*2, def.height, def.radius*2);
            else if(def.type === 'mountain') geometry = new THREE.ConeGeometry(def.radius, def.height, 16);
            
            const material = new THREE.MeshStandardMaterial({ color: def.color });
            const imesh = new THREE.InstancedMesh(geometry, material, transforms.length);
            imesh.receiveShadow = true; imesh.castShadow = true;
            
            const dummy = new THREE.Object3D();
            transforms.forEach((t, i) => {
                dummy.position.set(t.x, t.y + def.height/2, t.z);
                dummy.rotation.y = t.rot;
                dummy.scale.setScalar(t.scale);
                dummy.updateMatrix();
                imesh.setMatrixAt(i, dummy.matrix);
                
                // Create physical colliders for instances
                const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(t.x, t.y + def.height/2, t.z);
                const body = window.GameCore.world.createRigidBody(rbDesc);
                let colDesc;
                if(def.type === 'structure') colDesc = RAPIER.ColliderDesc.cuboid(def.radius * t.scale, def.height/2 * t.scale, def.radius * t.scale);
                else colDesc = RAPIER.ColliderDesc.cone(def.height/2 * t.scale, def.radius * t.scale);
                window.GameCore.world.createCollider(colDesc, body);
                
                // Track these for cleanup
                if (!this.activeChunks.get(key).instanceBodies) this.activeChunks.get(key).instanceBodies = [];
                this.activeChunks.get(key).instanceBodies.push(body);
            });
            
            window.GameCore.scene.add(imesh);
            chunkInstances.set(prefabName, imesh);
        });
    },
    unloadChunk: function(key) {
        const chunk = this.activeChunks.get(key); if(!chunk) return;
        chunk.mesh.geometry.dispose(); chunk.mesh.material.dispose(); window.GameCore.scene.remove(chunk.mesh); window.GameCore.world.removeRigidBody(chunk.body);
        
        // Cleanup Instances
        const instances = this.instancedMeshes.get(key);
        if (instances) {
            instances.forEach(imesh => {
                imesh.geometry.dispose(); imesh.material.dispose(); window.GameCore.scene.remove(imesh);
            });
            this.instancedMeshes.delete(key);
        }
        if (chunk.instanceBodies) {
            chunk.instanceBodies.forEach(body => window.GameCore.world.removeRigidBody(body));
        }

        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => { 
            if(en.chunkKey === key) { 
                window.GameCore.releaseEntityIndex(en.memoryIndex);
                window.GameCore.SpatialGrid.unregisterEntity(en);
                window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); 
                return false; 
            } 
            return true; 
        });
        this.activeChunks.delete(key);
    }
};


function getVisualMesh(def) {
    let meshGroup = new THREE.Group();
    if (def.customModel && window.AssetManager.models[def.customModel]) {
        const sourceModel = window.AssetManager.models[def.customModel];
        
        // SKINNED MESH FIX: Use SkeletonUtils to properly clone bones
        const customModel = window.SkeletonUtils.clone(sourceModel); 
        
        customModel.traverse(child => { 
            if (child.isMesh) { 
                child.castShadow = true; 
                child.receiveShadow = true; 
                child.frustumCulled = false; // Fixes meshes vanishing when animating
            } 
        });
        
        // EXACT SCALE FIX: No more bounding box auto-scaling math
        const absoluteScale = def.modelScale || 1.0;
        customModel.scale.setScalar(absoluteScale); 
        customModel.position.y = -def.height / 2; 
        meshGroup.add(customModel);
    } else {
        let mesh; if(def.type === 'structure' || def.type === 'hub') mesh = new THREE.Mesh(new THREE.BoxGeometry(def.radius*2, def.height, def.radius*2), new THREE.MeshStandardMaterial({ color: def.color })); else if(def.type === 'mountain') mesh = new THREE.Mesh(new THREE.ConeGeometry(def.radius, def.height, 16), new THREE.MeshStandardMaterial({ color: def.color })); else mesh = new THREE.Mesh(new THREE.CylinderGeometry(def.radius, def.radius, def.height, 8), new THREE.MeshStandardMaterial({ color: def.color }));
        mesh.castShadow = true; mesh.receiveShadow = true; meshGroup.add(mesh);
    }
    return meshGroup;
}

function playEntityAnimation(entity, state) {
    if (!entity.mixer || !entity.actions || !entity.actions[state]) return; 
    if (entity.currentAnimState === 'die') return; // Cannot override death
    if (entity.currentAnimState === state) return; 
    
    const newAction = entity.actions[state]; const oldAction = entity.currentAnimState ? entity.actions[entity.currentAnimState] : null;
    newAction.reset(); 
    newAction.play(); 
    if (oldAction) newAction.crossFadeFrom(oldAction, 0.35, true); 
    entity.currentAnimState = state;
    
    if (state === 'attack' || state === 'dash' || state === 'hit') { 
        entity.mixer.addEventListener('finished', function restoreIdle(e) { 
            if (e.action === newAction) { 
                entity.mixer.removeEventListener('finished', restoreIdle); 
                if(entity.hp > 0) {
                    if (window.Input && window.Input.isBlocking && entity.def.faction === 'player') {
                        playEntityAnimation(entity, 'block');
                    } else {
                        playEntityAnimation(entity, 'idle');
                    }
                }
            } 
        }); 
    }
}
window.GameCore.playEntityAnimation = playEntityAnimation;

function setupEntityAnimations(entity, isPlayer = false) {
    const def = isPlayer ? window.AssetManager.prefabs['Player'] : entity.def; 
    if (!def.customModel) return;
    
    let clips = window.AssetManager.animations[def.customModel] || [];
    clips = clips.concat(window.AssetManager.globalAnimations || []);
    if (clips.length === 0) return;

    entity.mixer = new THREE.AnimationMixer(entity.visual); entity.actions = {}; entity.currentAnimState = null; 
    
    const states = ['idle', 'walk', 'attack', 'block', 'dash', 'hit', 'die'];
    states.forEach(state => {
        if (def.animMap[state] && def.animMap[state] !== 'None') {
            const clip = clips.find(c => c.name === def.animMap[state]);
            if (clip) {
                const action = entity.mixer.clipAction(clip);
                if (state === 'attack' || state === 'dash' || state === 'hit' || state === 'die') {
                    action.setLoop(THREE.LoopOnce); action.clampWhenFinished = true;
                }
                entity.actions[state] = action;
            }
        }
    });
    playEntityAnimation(entity, 'idle');
}

function instantiatePrefab(name, x, y, z, chunkKey = 'persistent') {
    const def = window.AssetManager.prefabs[name]; if(!def) return;
    let mesh = getVisualMesh(def); mesh.position.set(x, y + def.height/2, z); window.GameCore.scene.add(mesh);
    let rigidBodyDesc = (def.type === 'structure' || def.type === 'hub' || def.type === 'mountain' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic().lockRotations();
    
    if(def.type !== 'structure' && def.type !== 'hub' && def.type !== 'mountain' && def.type !== 'runeTower' && def.type !== 'powerStone' && def.type !== 'firePit' && def.type !== 'streetLight' && def.type !== 'merchantChest') {
        rigidBodyDesc.setLinearDamping(4.0);
    }
    
    rigidBodyDesc.setTranslation(x, y + def.height/2, z); let body = window.GameCore.world.createRigidBody(rigidBodyDesc);
    
    let collider = null;
    if (def.isObstacle !== false) {
        let colliderDesc; if (def.type === 'structure' || def.type === 'hub' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') colliderDesc = RAPIER.ColliderDesc.cuboid(def.radius, def.height/2, def.radius); else if (def.type === 'mountain') colliderDesc = RAPIER.ColliderDesc.cone(def.height/2, def.radius); else colliderDesc = RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius);
        collider = window.GameCore.world.createCollider(colliderDesc, body);
    }

    const entity = { id: Math.random().toString(36).substr(2, 9), name: name, def: def, visual: mesh, body: body, collider: collider, chunkKey: chunkKey };
    
    // DOD Optimization: Bind NPC stats to Memory Buffer
    window.GameCore.bindEntityToBuffer(entity, def.hp || 50, def.poise || 30);

    if(collider) collider.handle = Math.floor(Math.random() * 1000000); 
    body.userData = { entityId: entity.id };
    
    if(def.type === 'hub') { const light = new THREE.PointLight(def.color, 2, 15); light.position.y = def.height/2; mesh.add(light); entity.ap = 0; entity.food = 100; }
    if(def.type === 'merchantChest') entity.merchantInventory = def.merchantInventory.map(item => ({ ...item }));
    if(def.type === 'powerStone') { const light = new THREE.PointLight(0x7dd3fc, def.active === false ? 0.2 : 3, 25); light.position.y = def.height / 2; mesh.add(light); }
    if(def.type === 'firePit') { const light = new THREE.PointLight(0xff8a32, def.active === false ? 0 : 2.5, 12); light.position.y = def.height; mesh.add(light); }
    if(def.type === 'streetLight') { const light = new THREE.PointLight(0x9bdcff, def.active === false ? 0 : 2.5, 18); light.position.y = def.height; mesh.add(light); }
        setupEntityAnimations(entity); window.VFXManager.applyAura(entity, def); 
    
    // SPATIAL GRID: Register entity on spawn
    window.GameCore.SpatialGrid.registerEntity(entity);

    // --- MONSTER HUNGER TRACKING ---
    if (def.faction === 'monster' || def.faction === 'forest') {
        entity.lastFedDay = window.EngineParams.worldDay;
        entity.hungerLevel = 0; // 0 = full, 100 = starving
        entity.isFeral = false;
    }

    window.GameCore.activeEntities.push(entity);
    if (!window.GameState.narrator.targetId && (def.faction === 'village' || def.faction === 'adventurer')) {
        window.GameState.narrator.targetId = entity.id;
        window.GameState.narrator.targetName = entity.name;
        applyForestBlessing(entity);
        window.EventBus.emit('UI_LOG', `[THE CROW] It chooses ${entity.name} as the story's main character.`);
    }
    return entity;
}
window.GameCore.instantiatePrefab = instantiatePrefab;
window.GameCore.ChunkManager = ChunkManager;

window.GameCore.ChunkManager = ChunkManager;


window.ArenaTestManager = {
    center: { x: 120, z: 120 },
    size: 40,
    walls: [],
    match: null,
    ensureArena: function() {
        if (this.walls.length > 0) return;
        const groundY = window.WorldGenerator.getTerrainHeight(this.center.x, this.center.z);
        const wallHeight = 8;
        const wallThickness = 1;
        const wallSpecs = [
            { x: this.center.x, z: this.center.z - this.size / 2, width: this.size + 2, depth: wallThickness },
            { x: this.center.x, z: this.center.z + this.size / 2, width: this.size + 2, depth: wallThickness },
            { x: this.center.x - this.size / 2, z: this.center.z, width: wallThickness, depth: this.size },
            { x: this.center.x + this.size / 2, z: this.center.z, width: wallThickness, depth: this.size }
        ];
        wallSpecs.forEach(spec => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.width, wallHeight, spec.depth), new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.9 }));
            mesh.position.set(spec.x, groundY + wallHeight / 2, spec.z);
            mesh.castShadow = true; mesh.receiveShadow = true; window.GameCore.scene.add(mesh);
            const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(spec.x, groundY + wallHeight / 2, spec.z));
            window.GameCore.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.width / 2, wallHeight / 2, spec.depth / 2), body);
            this.walls.push({ mesh, body });
        });
    },
    enter: function() {
        this.ensureArena();
        window.EngineParams.arenaMode = true;
        window.EventBus.emit('CMD_TELEPORT', this.center);
        window.EventBus.emit('UI_LOG', '[ARENA] Locked gladiator test arena entered.');
    },
    startMatch: function(totalWaves = 3) {
        if (this.match?.state === 'fighting') {
            window.EventBus.emit('UI_LOG', '[ARENA] A match is already in progress.');
            return;
        }
        this.enter();
        this.clear();
        this.match = { state: 'fighting', totalWaves, transitionTimer: 0, waveCleared: false };
        window.EngineParams.arenaWave = 0;
        window.GameState.gladiator.matchState = 'fighting';
        window.GameState.gladiator.objective = `Survive ${totalWaves} waves`;
        window.EventBus.emit('UI_LOG', `[ARENA] ${window.GameState.gladiator.name} enters the arena.`);
        this.spawnWave();
    },
    spawnWave: function() {
        if (!window.EngineParams.arenaMode) this.enter();
        const wave = ++window.EngineParams.arenaWave;
        const prefabs = ['Ghoul', 'Flesh Horror', 'Wendigo'];
        const count = Math.min(8, 2 + wave);
        for (let index = 0; index < count; index++) {
            const angle = (index / count) * Math.PI * 2;
            const radius = this.size * 0.35;
            const x = this.center.x + Math.cos(angle) * radius;
            const z = this.center.z + Math.sin(angle) * radius;
            const prefab = prefabs[(wave + index) % prefabs.length];
            const entity = instantiatePrefab(prefab, x, window.WorldGenerator.getTerrainHeight(x, z), z, 'arena');
            if (entity) { entity.arenaEntity = true; entity.arenaWave = wave; }
        }
        window.EventBus.emit('UI_LOG', `[ARENA] Monster wave ${wave} spawned.`);
    },
    update: function(delta) {
        if (!this.match || this.match.state !== 'fighting') return;
        if (window.GameState.pStats.hp <= 0) { this.defeat(); return; }
        const living = window.GameCore.activeEntities.filter(entity => entity.arenaEntity && entity.hp > 0);
        if (living.length > 0) { this.match.waveCleared = false; return; }
        if (!this.match.waveCleared) {
            this.match.waveCleared = true;
            this.match.transitionTimer = 2;
            window.EventBus.emit('UI_LOG', `[ARENA] Wave ${window.EngineParams.arenaWave} cleared.`);
        }
        this.match.transitionTimer -= delta;
        if (this.match.transitionTimer > 0) return;
        if (window.EngineParams.arenaWave >= this.match.totalWaves) this.victory();
        else { this.match.waveCleared = false; this.spawnWave(); }
    },
    victory: function() {
        if (!this.match || this.match.state !== 'fighting') return;
        this.match.state = 'victory';
        const reward = 50 + this.match.totalWaves * 25;
        window.GameCore.recordCombatVictory({ source: 'arena', reward, fame: this.match.totalWaves * 5, label: 'won an arena match' });
        window.GameState.gladiator.matchState = 'victory';
        window.GameState.gladiator.objective = `Victory. Reward: ${reward} gold`;
        window.EventBus.emit('UI_LOG', `[ARENA] Victory. ${reward} gold awarded.`);
        window.EventBus.emit('OPEN_ARENA_RESULT', { result: 'victory', reward });
        window.EventBus.emit('UI_UPDATE_HUD');
    },
    defeat: function() {
        if (!this.match || this.match.state !== 'fighting') return;
        this.match.state = 'defeat';
        window.GameCore.recordCombatDefeat({ source: 'arena', injury: `arena defeat on day ${window.EngineParams.worldDay}` });
        window.GameState.gladiator.matchState = 'defeat';
        window.GameState.gladiator.objective = 'Defeated. Recover before the next match.';
        this.clear();
        window.EventBus.emit('UI_LOG', '[ARENA] Defeat. The gladiator is dragged from the sand.');
        window.EventBus.emit('OPEN_ARENA_RESULT', { result: 'defeat', reward: 0 });
        window.EventBus.emit('UI_UPDATE_HUD');
    },
        clear: function() {
        window.GameCore.activeEntities.filter(entity => entity.arenaEntity).forEach(entity => {
            window.GameCore.releaseEntityIndex(entity.memoryIndex); // Recycle memory
            window.GameCore.scene.remove(entity.visual);
            window.GameCore.world.removeRigidBody(entity.body);
        });
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(entity => !entity.arenaEntity);
        window.EventBus.emit('UI_LOG', '[ARENA] Arena monsters cleared.');
    },
    exit: function() {
        this.clear();
        this.walls.forEach(wall => { window.GameCore.scene.remove(wall.mesh); window.GameCore.world.removeRigidBody(wall.body); });
        this.walls = [];
        window.EngineParams.arenaMode = false;
        window.EngineParams.arenaWave = 0;
        this.match = null;
        window.GameState.gladiator.matchState = 'hub';
        window.GameState.gladiator.objective = 'Awaiting a match';
        window.EventBus.emit('CMD_TELEPORT', { x: 0, z: 0 });
        window.EventBus.emit('UI_LOG', '[ARENA] Returned to the open world.');
    }
};
window.EventBus.on('ENTER_ARENA_TEST', () => window.ArenaTestManager.enter());
window.EventBus.on('START_ARENA_MATCH', () => window.ArenaTestManager.startMatch());
window.EventBus.on('SPAWN_ARENA_WAVE', () => window.ArenaTestManager.spawnWave());
window.EventBus.on('CLEAR_ARENA_TEST', () => window.ArenaTestManager.clear());
window.EventBus.on('EXIT_ARENA_TEST', () => window.ArenaTestManager.exit());

function spawnPlayer(x, y, z) {
    const def = window.AssetManager.prefabs['Player'];
    
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().lockRotations().setTranslation(x, y, z).setCcdEnabled(true).setLinearDamping(5.0);
    
    let body = window.GameCore.world.createRigidBody(rigidBodyDesc);
    let collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius), body);
    window.GameCore.playerObj = { visual: getVisualMesh(def), body: body, collider: collider };
    
    // DOD Optimization: Bind Player stats to Memory Buffer
    window.GameCore.bindEntityToBuffer(window.GameCore.playerObj, window.GameState.pStats.maxHp, window.GameState.pStats.maxPoise);
    
    // Proxy the global GameState.pStats to the memory buffer as well so existing UI code works
    const pMemIdx = window.GameCore.playerObj.memoryIndex * 4;
    Object.defineProperties(window.GameState.pStats, {
        'hp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 0], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 0] = v; } },
        'maxHp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 1], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 1] = v; } },
        'poise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 2], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 2] = v; } },
        'maxPoise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 3], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 3] = v; } }
    });

    const p = body.translation(); window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z); window.GameCore.scene.add(window.GameCore.playerObj.visual);
    setupEntityAnimations(window.GameCore.playerObj, true); window.VFXManager.applyAura(window.GameCore.playerObj, def);
}

function applyForestBlessing(entity, isPlayer = false) {
    if (!entity) return;
    const targetDef = entity.def || window.AssetManager.prefabs['Player'];
    const blessing = isPlayer ? {
        active: true, tier: 'true', name: "Forest's True Chosen", athletics: 3, dodge: 2, staminaRegen: 0.15, dangerSense: true, combatLuck: 0.30, teleportLuck: 0.35
    } : {
        active: true, tier: 'chosen', name: "Forest's Chosen", athletics: 2, dodge: 1, staminaRegen: 0.10, dangerSense: false, combatLuck: 0.20, teleportLuck: 0.20
    };
    if (isPlayer) {
        const current = window.GameState.forestBlessing;
        if (current.active && current.tier === blessing.tier) return;
        window.GameState.forestBlessing = blessing;
        window.GameCore.applyBuff('athletics', blessing.athletics, 315360000, blessing.name);
        window.GameCore.applyBuff('dodge', blessing.dodge, 315360000, blessing.name);
        window.GameCore.adjustFactionStanding('village', -5, 'the crow marked you');
        window.EventBus.emit('UI_LOG', `[FOREST] ${blessing.name}: +${blessing.athletics} Athletics, +${blessing.dodge} Dodge, ${Math.round(blessing.combatLuck * 100)}% enemy miss chance.`);
    } else {
        entity.forestChosen = true;
        entity.forestBlessing = blessing;
        entity.speedMultiplier = 1.1;
    }
    window.VFXManager.applyAura(entity, { ...targetDef, vfx: { ...(targetDef.vfx || {}), aura: 'ForestChosen' } });
}
window.GameCore.applyForestBlessing = applyForestBlessing;

function spawnGroundLoot(itemId, position) {
    if (!window.ItemDatabase[itemId]) return;
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x8a5a00, emissiveIntensity: 1 }));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.4, 0));
    window.GameCore.scene.add(mesh);
    window.GameCore.groundLoot.push({ id: Math.random().toString(36).slice(2), itemId, visual: mesh });
}
window.GameCore.spawnGroundLoot = spawnGroundLoot;

function awardMonsterKill(target) {
    if (!target?.def || (target.def.faction !== 'monster' && target.def.faction !== 'forest')) return;
    const essence = Math.max(1, Math.ceil((target.def.hp || target.hp || 50) / 25));
    const nearestVillage = window.VillageManager.villages.reduce((nearest, village) => {
        const distance = Math.hypot(target.visual.position.x - village.x, target.visual.position.z - village.z);
        return !nearest || distance < nearest.distance ? { village, distance } : nearest;
    }, null)?.village;
    if (nearestVillage) {
        nearestVillage.stats ??= {};
        nearestVillage.stats.essence = (nearestVillage.stats.essence || 0) + essence;
    }
    const impact = target.def.boss ? 12 : (target.def.faction === 'forest' ? 4 : 2);
    window.GameCore.recordRenown({ renown: target.def.boss ? 8 : 2, faction: 'village', reason: `defeated ${target.name}` });
    window.GameCore.recordFeat({ impact, label: `The ${target.name} fed a village's ward.` });
    window.EventBus.emit('UI_LOG', `[ESSENCE] ${nearestVillage?.name || 'The settlements'} gained ${essence} life essence.`);
}
window.GameCore.awardMonsterKill = awardMonsterKill;

function spawnPartyMembers() {
    if (!window.GameCore.playerObj) return;
    const playerPosition = window.GameCore.playerObj.body.translation();
    window.GameState.party.members.forEach((member, index) => {
        if (window.GameCore.activeEntities.some(entity => entity.companionId === member.id || entity.recruitId === member.id)) return;
        const companionX = playerPosition.x + 2 + index * 2;
        const companionZ = playerPosition.z + 2;
        const companion = instantiatePrefab(member.prefab, companionX, window.WorldGenerator.getTerrainHeight(companionX, companionZ), companionZ, 'persistent');
        if (companion) {
            if (member.recruited) companion.companionId = member.id; else companion.recruitId = member.id;
            companion.hp = member.hp || member.maxHp || 100;
            companion.name = member.name;
        }
    });
}
window.GameCore.spawnPartyMembers = spawnPartyMembers;

function processCompanionNeeds() {
    window.GameState.party.members.filter(member => member.recruited).forEach(member => {
        member.hunger = Math.min(100, (member.hunger || 0) + 15);
        const rationIndex = member.inventory.indexOf('food');
        if (member.hunger >= 40 && rationIndex >= 0) {
            member.inventory.splice(rationIndex, 1);
            member.hunger = Math.max(0, member.hunger - 45);
            member.loyalty = Math.min(100, (member.loyalty || 0) + 1);
        }
        if (member.hunger >= 80) {
            member.hp = Math.max(1, member.hp - 10);
            if (!member.injuries.includes('starvation')) member.injuries.push('starvation');
            member.loyalty = Math.max(0, (member.loyalty || 0) - 5);
        }
        const entity = window.GameCore.activeEntities.find(candidate => candidate.companionId === member.id);
        if (entity) entity.hp = member.hp;
    });
}

function processBaseJobs() {
    const base = window.GameState.base;
    if (!base.owned) return;
    const workers = window.GameState.party.members.filter(member => member.recruited && !member.downed);
    const farmers = workers.filter(member => member.job === 'farm').length;
    const researchers = workers.filter(member => member.job === 'research').length;
    if (farmers > 0 && base.farms.length > 0) {
        const harvest = farmers * base.farms.length * 2;
        for (let index = 0; index < harvest; index++) base.storage.push('food');
        window.EventBus.emit('UI_LOG', `[CAMP] Harvested ${harvest} rations.`);
    }
    if (researchers > 0) {
        base.researchPoints = (base.researchPoints || 0) + researchers;
        window.EventBus.emit('UI_LOG', `[CAMP] Generated ${researchers} runic research point${researchers === 1 ? '' : 's'}.`);
    }
}

function syncCaravanAgents() {
    window.VillageManager.villages.forEach(village => {
        village.caravans?.filter(caravan => caravan.status === 'traveling').forEach(caravan => {
            if (window.GameCore.activeEntities.some(entity => entity.caravanId === caravan.id)) return;
            const position = caravan.position || { x: village.x + 3, z: village.z };
            const agent = instantiatePrefab('Merchant Caravan', position.x, window.WorldGenerator.getTerrainHeight(position.x, position.z), position.z, 'persistent');
            if (agent) { agent.caravanId = caravan.id; agent.villageId = village.id; }
        });
    });
}
window.GameCore.syncCaravanAgents = syncCaravanAgents;

function syncPlayerBase() {
    const base = window.GameState.base;
    if (!base.owned) return;
    base.structures.forEach(structure => {
        if (window.GameCore.activeEntities.some(entity => entity.playerBase && entity.name === structure.prefab)) return;
        const entity = instantiatePrefab(structure.prefab, structure.x, window.WorldGenerator.getTerrainHeight(structure.x, structure.z), structure.z, 'persistent');
        if (entity) entity.playerBase = true;
    });
}
window.GameCore.syncPlayerBase = syncPlayerBase;

window.GameCore.swapPlayerModel = function() {
    if (!window.GameCore.playerObj || !window.GameCore.scene) return;
    const def = window.AssetManager.prefabs['Player'];
    
    const oldPos = window.GameCore.playerObj.visual.position.clone();
    const oldRot = window.GameCore.playerObj.visual.rotation.clone();
    
    window.GameCore.scene.remove(window.GameCore.playerObj.visual);
    if (window.GameCore.playerObj.auraMesh) {
        window.GameCore.playerObj.visual.remove(window.GameCore.playerObj.auraMesh);
        window.GameCore.playerObj.auraMesh = null;
    }
    
    window.GameCore.playerObj.visual = getVisualMesh(def);
    window.GameCore.playerObj.visual.position.copy(oldPos);
    window.GameCore.playerObj.visual.rotation.copy(oldRot);
    
    window.GameCore.scene.add(window.GameCore.playerObj.visual);
    setupEntityAnimations(window.GameCore.playerObj, true);
    window.VFXManager.applyAura(window.GameCore.playerObj, def);
};

function performAttack(isHeavy = false) {
    if (window.Input.isBlocking || window.Input.isAttacking || !window.GameCore.playerObj.visual) return; 
    if (window.GameCore.playerObj.currentAnimState === 'hit' || window.GameCore.playerObj.currentAnimState === 'die') return;
    
    const isDashStrike = !isHeavy && window.Input.isDashing;
    
        // ARC SWEEP PROFILE (AAA Style Hitboxes)
    const profile = isHeavy ? 
        { stamina: 35, cooldown: 1.2, reach: 4.5, radius: 1.5, angle: Math.PI * 0.8, multiplier: 2.2, poise: 2.5, windup: 0.25, duration: 0.3, color: 0xffaa33 } : 
        isDashStrike ? 
        { stamina: 20, cooldown: 1.0, reach: 5.0, radius: 1.2, angle: Math.PI * 0.4, multiplier: 1.6, poise: 1.8, windup: 0.1, duration: 0.2, color: 0x60a5fa } : 
        { stamina: 15, cooldown: 0.8, reach: 3.5, radius: 1.0, angle: Math.PI * 0.6, multiplier: 1.0, poise: 1.0, windup: 0.15, duration: 0.2, color: 0xffffff };
        
    if (window.GameState.pStats.stamina < profile.stamina) { window.EventBus.emit('UI_LOG', 'Too exhausted to attack.'); return; }

    if (window.NetworkSession?.connected) window.NetworkSession.sendAttack(isHeavy);

    window.GameState.pStats.stamina -= profile.stamina; 
    window.Input.isAttacking = true; 
    window.Input.attackCooldown = profile.cooldown;
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    
    // Register the active sweep hitbox to be evaluated during fixedUpdateLogic
    window.Input.activeSweep = {
        profile: profile,
        timer: profile.windup + profile.duration,
        activeAt: profile.duration, // Start hitting after windup
        alreadyHit: new Set(),
        isHeavy: isHeavy,
        playerPos: new THREE.Vector3(), // Pre-allocate to avoid GC
        playerForward: new THREE.Vector3()
    };

    
    // Play sound immediately on windup to sync with character exertion
    window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/handclap.mp3', pos: window.GameCore.playerObj.visual.position, vol: -10});
    window.GameCore.addXP('meleeAtt', isHeavy ? 4 : 2); 
}

function performGuardbreaker() {
    if (window.Input.isBlocking || window.Input.isAttacking || window.Input.guardbreakerCooldown > 0 || !window.GameCore.playerObj.visual) return;
    if (window.GameState.pStats.stamina < 30) { window.EventBus.emit('UI_LOG', 'Too exhausted to use Guardbreaker.'); return; }
    
    // ARC SWEEP PROFILE FOR GUARDBREAKER
    const profile = { stamina: 30, cooldown: 0.7, reach: 3.5, radius: 1.0, angle: Math.PI * 0.4, multiplier: 0.7, poise: 999, windup: 0.2, duration: 0.2, color: '#fbbf24', isGuardbreaker: true };
    
    window.GameState.pStats.stamina -= profile.stamina;
    window.Input.guardbreakerCooldown = 5;
    window.Input.isAttacking = true;
    window.Input.attackCooldown = profile.cooldown;
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'GUARDBREAKER', pos: window.GameCore.playerObj.visual.position, color: '#fbbf24' });
    
    // Register the active sweep hitbox
    window.Input.activeSweep = {
        profile: profile,
        timer: profile.windup + profile.duration,
        activeAt: profile.duration,
        alreadyHit: new Set(),
        isHeavy: true // Use heavy impact sounds
    };
    
    window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/handclap.mp3', pos: window.GameCore.playerObj.visual.position, vol: -10});
}

window.EventBus.on('PRIMARY_CLICK_DOWN', () => { if(window.Input.attackCooldown <= 0) performAttack(); });
window.EventBus.on('SECONDARY_CLICK_DOWN', () => { if(window.Input.attackCooldown <= 0) performAttack(true); });
window.EventBus.on('GUARDBREAKER', performGuardbreaker);
window.EventBus.on('TOGGLE_STEALTH', () => {
    if (!window.GameCore.playerObj) return;
    window.Input.isStealth = !window.Input.isStealth;
    
    const player = window.GameCore.playerObj;
    if (window.Input.isStealth) {
        window.EventBus.emit('UI_LOG', '[STEALTH] You blend into the surroundings.');
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'STEALTH', pos: player.visual.position, color: '#94a3b8' });
        
        // Chameleon Texture Logic: Match terrain color
        const pPos = player.body.translation();
        const biomeKey = window.WorldGenerator.getBiome(pPos.x, pPos.z);
        const biomeColor = window.WorldGenConfig.biomes[biomeKey].color;
        
        player.visual.traverse(child => {
            if (child.isMesh) {
                child.userData.originalColor = child.material.color.clone();
                child.material.color.set(biomeColor);
                child.material.transparent = true;
                child.material.opacity = 0.5;
            }
        });
    } else {
        window.EventBus.emit('UI_LOG', '[STEALTH] You reveal yourself.');
        player.visual.traverse(child => {
            if (child.isMesh && child.userData.originalColor) {
                child.material.color.copy(child.userData.originalColor);
                child.material.opacity = 1.0;
            }
        });
    }
});
window.EventBus.on('VOID_RUNE_SHOT', () => {
    if (window.Input.runeShotCooldown > 0 || window.Input.isBlocking || !Object.values(window.GameState.inventory.runes).includes('voidward_rune')) return;
    if (window.GameState.pStats.stamina < 20 || !window.GameCore.playerObj.visual) { window.EventBus.emit('UI_LOG', 'A Voidward Rune and 20 stamina are required.'); return; }
    const player = window.GameCore.playerObj;
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.visual.quaternion).normalize();
    window.GameState.pStats.stamina -= 20;
    window.Input.runeShotCooldown = 3;
    window.VFXManager.spawnProjectile({ position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), direction, damage: 22 + window.GameCore.getBuffBonus('meleeAtt'), damageType: 'void', speed: 16, range: 20, color: '#a855f7', owner: 'player' });
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'VOID SHOT', pos: player.visual.position, color: '#a855f7' });
    window.EventBus.emit('UI_UPDATE_HUD');
});
window.EventBus.on('FIRE_RUNE_SHOT', () => {
    if (window.Input.fireShotCooldown > 0 || window.Input.isBlocking || !Object.values(window.GameState.inventory.runes).includes('ember_rune')) return;
    if (window.GameState.pStats.stamina < 25 || !window.GameCore.playerObj.visual) { window.EventBus.emit('UI_LOG', 'An Ember Rune and 25 stamina are required.'); return; }
    const player = window.GameCore.playerObj;
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.visual.quaternion).normalize();
    window.GameState.pStats.stamina -= 25;
    window.Input.fireShotCooldown = 4;
    window.VFXManager.spawnProjectile({ position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), direction, damage: 28 + window.GameCore.getBuffBonus('meleeAtt'), damageType: 'fire', speed: 14, range: 18, color: '#fb923c', owner: 'player', statusEffect: { type: 'burning', duration: 3, tickDamage: 2 } });
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'FIRE SHOT', pos: player.visual.position, color: '#fb923c' });
    window.EventBus.emit('UI_UPDATE_HUD');
});
window.EventBus.on('PLAYER_PROJECTILE_HIT', ({ target, damage, damageType, position, statusEffect }) => {
    const actualDamage = Math.max(1, damage - (target.def.armor || 0));
    target.hp -= actualDamage;
    target.poise = Math.max(0, target.poise - actualDamage);
    window.EventBus.emit('ENTITY_DAMAGED', { damage: actualDamage, position, isPlayer: false });
    window.EventBus.emit('SPAWN_HIT_VFX', { type: damageType === 'fire' ? 'Fire' : 'Void', pos: position });
    if (statusEffect) {
        target.statusEffects = target.statusEffects || [];
        const activeEffect = target.statusEffects.find(effect => effect.type === statusEffect.type);
        if (activeEffect) activeEffect.remaining = Math.max(activeEffect.remaining, statusEffect.duration);
        else target.statusEffects.push({ ...statusEffect, remaining: statusEffect.duration, tickTimer: 1 });
    }
    if (target.hp <= 0) {
        playEntityAnimation(target, 'die');
        window.AdventurerManager?.markDefeated(target);
        spawnGroundLoot(target.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones', target.visual.position);
        awardMonsterKill(target);
        window.GameState.inventory.gold += target.def.faction === 'monster' ? 10 : 50;
        window.EventBus.emit('UI_UPDATE_HUD');
        setTimeout(() => {
            window.GameCore.scene.remove(target.visual);
            window.GameCore.world.removeRigidBody(target.body);
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(entity => entity.id !== target.id);
        }, 2000);
    } else if (target.poise <= 0) {
        target.poise = target.maxPoise;
        target.staggeredUntil = performance.now() + 800;
        playEntityAnimation(target, 'hit');
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'STAGGERED', pos: target.visual.position, color: '#fbbf24' });
    } else {
        playEntityAnimation(target, 'hit');
    }
});
window.EventBus.on('SPAWN_HIT_VFX', ({type, pos}) => window.VFXManager.spawnHit(type, pos));
window.EventBus.on('SPAWN_INVASION', () => { const p = window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : new THREE.Vector3(); for(let i=0; i<3; i++) instantiatePrefab('Ghoul', p.x + (Math.random()-0.5)*15, window.WorldGenerator.getTerrainHeight(p.x, p.z), p.z + (Math.random()-0.5)*15); window.EventBus.emit('UI_LOG', "Ghoul Invasion Spawned!"); });
window.EventBus.on('SPAWN_BLIGHT', () => {
    if (!window.GameCore.playerObj) return; const p = window.GameCore.playerObj.visual.position; const pts = window.RoadManager.getRoadPointsNear(Math.floor(p.x/60), Math.floor(p.z/60));
    if (pts.length > 0) { const pt = pts[Math.floor(Math.random() * pts.length)]; const root = instantiatePrefab('Blight Root', pt.x, window.WorldGenerator.getTerrainHeight(pt.x, pt.z), pt.z, 'persistent'); if (root) { root.hp = 150; window.EventBus.emit('UI_LOG', "🥀 A Blight Root has corrupted a nearby road!"); } } 
    else window.EventBus.emit('UI_LOG', "No roads nearby to corrupt!");
});
window.EventBus.on('CLEAR_MAP', () => { 
    window.GameCore.activeEntities.forEach(en => { 
        if(en.def.faction === 'player') return; 
        window.GameCore.releaseEntityIndex(en.memoryIndex); // Recycle memory
        window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); 
    }); 
    window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => en.def.faction === 'player'); 
    window.GameState.questBoard = []; window.EventBus.emit('UI_LOG', "World Entities Cleared."); 
});
window.EventBus.on('CLAIM_PLAYER_CAMP', () => {
    const base = window.GameState.base;
    if (base.owned || !window.GameCore.playerObj) {
        window.EventBus.emit('UI_LOG', base.owned ? 'You already control a camp.' : 'No valid camp location.');
        return;
    }
    const pack = window.GameState.inventory.backpack;
    if (pack.filter(itemId => itemId === 'wood').length < 3 || pack.filter(itemId => itemId === 'stone').length < 2) {
        window.EventBus.emit('UI_LOG', 'Claiming a camp requires 3 timber and 2 stone.');
        return;
    }
    const playerPosition = window.GameCore.playerObj.visual.position;
    if (window.EngineParams.isPlayerSafe || window.RoadManager.isVillageProtected(playerPosition)) {
        window.EventBus.emit('UI_LOG', 'Claim camps away from settlements and protected paths.');
        return;
    }
    let woodNeeded = 3; let stoneNeeded = 2;
    window.GameState.inventory.backpack = pack.filter(itemId => {
        if (itemId === 'wood' && woodNeeded > 0) { woodNeeded--; return false; }
        if (itemId === 'stone' && stoneNeeded > 0) { stoneNeeded--; return false; }
        return true;
    });
    const camp = instantiatePrefab('Iron Fire Pit', playerPosition.x, window.WorldGenerator.getTerrainHeight(playerPosition.x, playerPosition.z), playerPosition.z, 'persistent');
    if (!camp) return;
    camp.playerBase = true;
    base.owned = true;
    base.position = { x: playerPosition.x, z: playerPosition.z };
    base.structures.push({ prefab: 'Iron Fire Pit', x: playerPosition.x, z: playerPosition.z });
    window.EventBus.emit('UI_LOG', 'Wayfarer Camp claimed. The fire marks your territory.');
    window.EventBus.emit('RENDER_INVENTORY');
});
window.EventBus.on('BUILD_BASE_STRUCTURE', prefab => {
    const base = window.GameState.base;
    const blueprints = { 'Camp Storage Cache': { wood: 5, stone: 2 }, 'Camp Farm Plot': { wood: 4, stone: 1 }, 'Rune Tower': { wood: 12, stone: 10, research: 5 } };
    const cost = blueprints[prefab];
    if (!base.owned || !cost) return;
    if ((cost.research && (base.researchPoints || 0) < cost.research) || Object.entries(cost).filter(([resource]) => resource !== 'research').some(([resource, amount]) => base.storage.filter(itemId => itemId === resource).length < amount)) {
        window.EventBus.emit('UI_LOG', `Camp storage lacks materials for ${prefab}.`);
        return;
    }
    Object.entries(cost).filter(([resource]) => resource !== 'research').forEach(([resource, amount]) => {
        for (let index = 0; index < amount; index++) base.storage.splice(base.storage.indexOf(resource), 1);
    });
    if (cost.research) base.researchPoints -= cost.research;
    const buildIndex = base.structures.length;
    const x = base.position.x + 4 + (buildIndex % 3) * 4; const z = base.position.z + Math.floor(buildIndex / 3) * 4;
    const entity = instantiatePrefab(prefab, x, window.WorldGenerator.getTerrainHeight(x, z), z, 'persistent');
    if (!entity) return;
    entity.playerBase = true;
    base.structures.push({ prefab, x, z });
    if (prefab === 'Camp Farm Plot') base.farms.push({ x, z });
    if (prefab === 'Rune Tower') base.wardRadius = 30;
    window.EventBus.emit('UI_LOG', `[CAMP] Built ${prefab}.`);
});
window.EventBus.on('WORLD_REGENERATE', () => {
    window.EventBus.emit('CLEAR_MAP'); const keys = Array.from(ChunkManager.activeChunks.keys()); keys.forEach(k => ChunkManager.unloadChunk(k)); ChunkManager.currentChunkX = null; 
    window.currentPrng = alea(window.EngineParams.worldSeed); window.currentNoise2D = window.createNoise2D(window.currentPrng);
    if (window.GameCore.playerObj) { const vy = window.WorldGenerator.getTerrainHeight(window.GameCore.playerObj.visual.position.x, window.GameCore.playerObj.visual.position.z) + 15; window.GameCore.playerObj.body.setTranslation({x: window.GameCore.playerObj.visual.position.x, y: vy, z: window.GameCore.playerObj.visual.position.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); spawnPartyMembers(); syncCaravanAgents(); syncPlayerBase(); ChunkManager.update(new THREE.Vector3(window.GameCore.playerObj.visual.position.x, vy, window.GameCore.playerObj.visual.position.z)); }
    window.EventBus.emit('UI_LOG', `World Math Regenerated with Seed: ${window.EngineParams.worldSeed}`);
});
function punishExposedActors() {
    const player = window.GameCore.playerObj;
    const playerSafe = player && (window.RoadManager.isSafeZone(player.visual.position) || window.RoadManager.isVillageProtected(player.visual.position));
    const destination = () => window.RoadManager.getRandomPathPoint() || { x: 0, z: 0 };
    if (player && !playerSafe) {
        if (window.GameCore.getForestLuck() > 0 && Math.random() < (window.GameState.forestBlessing.teleportLuck || 0)) {
            window.EventBus.emit('UI_LOG', '[THE CROW] The woods reach for you, but the landing bends away.');
        } else {
        const point = destination(); const y = window.WorldGenerator.getTerrainHeight(point.x, point.z) + 15;
        player.body.setTranslation({ x: point.x, y, z: point.z }, true); player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        window.EventBus.emit('UI_LOG', '[THE WOODS] The shift catches you. You are thrown across the new landscape.');
        }
    }
    window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && !window.RoadManager.isVillageProtected(entity.visual.position)).forEach(entity => {
        if (window.GameCore.getForestLuck(entity) > 0 && Math.random() < (entity.forestBlessing.teleportLuck || 0)) return;
        const point = destination(); const y = window.WorldGenerator.getTerrainHeight(point.x, point.z) + entity.def.height / 2;
        entity.body.setTranslation({ x: point.x, y, z: point.z }, true); entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    });
}

function regenerateWorldCycle() {
    punishExposedActors();
    if (window.VillageManager.villages.length > 0) window.VillageManager.shiftLocations();
    window.EngineParams.worldSeed = `${window.EngineParams.worldSeed.split('_cycle_')[0]}_cycle_${window.EngineParams.worldDay}`;
    window.EventBus.emit('WORLD_REGENERATE');
    window.EngineParams.lastCycleDay = window.EngineParams.worldDay;
    window.EventBus.emit('UI_LOG', `Day ${window.EngineParams.worldDay}: settlements shifted and the world regenerated at midnight.`);
}
window.EventBus.on('CMD_TELEPORT', (pos) => { const vy = window.WorldGenerator.getTerrainHeight(pos.x, pos.z) + 15; window.GameCore.playerObj.body.setTranslation({x:pos.x, y:vy, z:pos.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); ChunkManager.update(new THREE.Vector3(pos.x, vy, pos.z)); });
window.EventBus.on('PLAYER_RESPAWN', () => { if (!window.EngineParams.arenaMode && window.GameState.pStats.hp <= 0) window.GameCore.recordCombatDefeat({ source: 'open-world', injury: `open-world defeat on day ${window.EngineParams.worldDay}` }); const respawnY = window.WorldGenerator.getTerrainHeight(0,0) + 15; window.GameCore.playerObj.body.setTranslation({x:0, y:respawnY, z:0}, true); window.GameState.pStats.hp = window.GameState.pStats.maxHp; window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); playEntityAnimation(window.GameCore.playerObj, 'idle'); window.EventBus.emit('UI_UPDATE_HUD'); });

async function bootEngine() {
    try {
        document.getElementById('loading-bar').style.width = "50%"; await RAPIER.init(); 
        document.getElementById('loading-bar').style.width = "100%"; document.getElementById('loading-container').classList.add('hidden'); document.getElementById('btn-start').classList.remove('hidden');
        
        window.GameCore.scene = new THREE.Scene(); window.GameCore.scene.fog = new THREE.FogExp2(0x040608, 0.03); window.GameCore.scene.background = new THREE.Color(0x040608);
        window.GameCore.camera = new THREE.PerspectiveCamera(60, (window.innerWidth || 800) / (window.innerHeight || 600), 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); renderer.setSize(window.innerWidth || 800, window.innerHeight || 600); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; document.body.appendChild(renderer.domElement);
        clock = new THREE.Clock(); window.GameCore.world = new RAPIER.World({ x: 0.0, y: -20.0, z: 0.0 });

        ambientLight = new THREE.AmbientLight(0x506070, 0.8); window.GameCore.scene.add(ambientLight);
        dirLight = new THREE.DirectionalLight(0xaaccff, 1.2); dirLight.position.set(20, 40, 20); dirLight.castShadow = true; dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50; dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50; window.GameCore.scene.add(dirLight);

        composer = new EffectComposer(renderer); composer.addPass(new RenderPass(window.GameCore.scene, window.GameCore.camera));
        window.GameCore.passes.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), window.EngineParams.bloom, 0.25, 0.9); composer.addPass(window.GameCore.passes.bloom);
        
        const VignetteShader = { uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }` };
        window.GameCore.passes.vignette = new ShaderPass(VignetteShader); composer.addPass(window.GameCore.passes.vignette);
        
        const ColorTintShader = { uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }` };
        window.GameCore.passes.colorTint = new ShaderPass(ColorTintShader); composer.addPass(window.GameCore.passes.colorTint);

        const startY = window.WorldGenerator.getTerrainHeight(0, 0); const safeY = isNaN(startY) ? 10 : startY;
        spawnPlayer(0, safeY + 15, 0); spawnPartyMembers(); ChunkManager.update(new THREE.Vector3(0, safeY + 15, 0));
        
        window.EventBus.on('ENV_UPDATE', () => {
            const angle = ((window.EngineParams.timeOfDay - 6) / 24) * Math.PI * 2; dirLight.position.x = Math.cos(angle) * 50; dirLight.position.y = Math.sin(angle) * 50; dirLight.position.z = Math.cos(angle) * 20;
            const sunHeight = Math.sin(angle); let baseDirIntensity = 1.55; let baseAmbientIntensity = 1.25;
            if (sunHeight > 0.2) { baseDirIntensity = 1.55; dirLight.color.setHex(0xffffff); ambientLight.color.setHex(0x8090a0); window.GameCore.scene.fog.color.setHex(0x182028); window.GameCore.scene.background = new THREE.Color(0x182028); }
            else if (sunHeight > 0.0) { baseDirIntensity = 1.15; baseAmbientIntensity = 1.05; dirLight.color.setHex(0xffbb77); ambientLight.color.setHex(0x6a5660); window.GameCore.scene.fog.color.setHex(0x2a1710); window.GameCore.scene.background = new THREE.Color(0x2a1710); }
            else { baseDirIntensity = 0.8; baseAmbientIntensity = 0.95; dirLight.color.setHex(0x7590b5); ambientLight.color.setHex(0x58687a); window.GameCore.scene.fog.color.setHex(0x101820); window.GameCore.scene.background = new THREE.Color(0x101820); }
            dirLight.intensity = baseDirIntensity * window.EngineParams.globalBrightness; ambientLight.intensity = baseAmbientIntensity * window.EngineParams.globalBrightness; renderer.toneMappingExposure = Math.max(0.8, window.EngineParams.globalBrightness); window.GameCore.scene.fog.density = window.EngineParams.fogDensity;
        });
        
        window.EventBus.emit('ENGINE_READY'); window.EventBus.emit('ENV_UPDATE');
    } catch(e) { console.error("CRITICAL BOOT ERROR", e); }
}

function postVillageNeed(village, resource, amount, purpose) {
    const existing = window.GameState.questBoard.find(quest => quest.issuer === village.id && quest.resource === resource && quest.purpose === purpose);
    if (existing) return;
    window.GameState.questBoard.push({ type: 'fetch', issuer: village.id, resource, amount, purpose, reward: Math.max(20, amount * 2) });
    window.EventBus.emit('UI_LOG', `[REQUEST] ${village.name} needs ${amount} ${resource} for ${purpose}.`);
}

function canFundVillageAction(village, cost, purpose) {
    for (const [resource, amount] of Object.entries(cost)) {
        if ((village.stats[resource] || 0) < amount) {
            postVillageNeed(village, resource, amount - (village.stats[resource] || 0), purpose);
            return false;
        }
    }
    return true;
}

function spendVillageResources(village, cost) {
    Object.entries(cost).forEach(([resource, amount]) => { village.stats[resource] -= amount; });
}

function processVillageCaravans(village) {
    village.caravans.forEach(caravan => {
        if (caravan.status !== 'arrived') return;
        const destination = window.VillageManager.villages.find(candidate => candidate.id === caravan.targetVillageId);
        if (!destination) return;
        destination.stats = { ap: 0, food: 0, wood: 0, stone: 0, gold: 0, prosperity: 0, ...destination.stats };
        const cargo = caravan.cargo || village.industry.produces;
        const amount = caravan.amount || Math.max(1, Math.floor(village.population.current / 1000));
        if ((village.stats[cargo] || 0) < amount) return;
        village.stats[cargo] -= amount;
        destination.stats[cargo] += amount;
        if (village.provision && (village.provisionStock?.[village.provision.itemId] || 0) > 0) {
            const provisionAmount = Math.min(amount, village.provisionStock[village.provision.itemId]);
            destination.provisionStock ??= {};
            destination.provisionStock[village.provision.itemId] = (destination.provisionStock[village.provision.itemId] || 0) + provisionAmount;
            village.provisionStock[village.provision.itemId] -= provisionAmount;
        }
        caravan.lastArrivalDay = window.EngineParams.worldDay;
        caravan.status = 'complete';
        window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} delivered ${amount} ${cargo} to ${destination.name}.`);
    });
}

function launchHostileExpedition(village) {
    const isTerminus = village.industry?.mountainGatekeeper;
    const expedition = { id: `${village.id}-raid-${window.EngineParams.worldDay}-${village.expeditions.length + 1}`, type: isTerminus ? 'mountainIncursion' : 'forestRaid', status: 'raiding', targetVillageId: village.id, strength: isTerminus ? 4 : 2, launchedOnDay: window.EngineParams.worldDay };
    village.expeditions.push(expedition);
    for (let index = 0; index < expedition.strength; index++) {
        const angle = Math.random() * Math.PI * 2; const distance = village.territory.radius + 18 + Math.random() * 10;
        const x = village.x + Math.cos(angle) * distance; const z = village.z + Math.sin(angle) * distance;
        const raider = instantiatePrefab(isTerminus && index === 0 ? 'Wendigo' : 'Flesh Horror', x, window.WorldGenerator.getTerrainHeight(x, z), z, 'persistent');
        if (raider) { raider.expeditionId = expedition.id; raider.targetVillageId = village.id; }
    }
    window.EventBus.emit('UI_LOG', isTerminus ? '[MOUNTAIN INCURSION] Terminus calls its martial houses to the gate.' : `[RAID] A forest expedition advances on ${village.name}.`);
}

function simulateVillage(village) {
    village.stats = { ap: 0, food: 0, wood: 0, stone: 0, gold: 0, essence: 0, ...village.stats };
    village.barrierIntegrity ??= 100;
    village.population ??= { current: 8, capacity: 12 };
    village.squads ??= [];
    village.caravans ??= [];
    village.expeditions ??= [];
    village.residents ??= [];
    village.industry ??= window.VillageManager.settlementProfiles[village.id];
    village.provision ??= window.VillageManager.provisionProfiles[village.id];
    village.provisionStock ??= { [village.provision.itemId]: 0 };
    village.territory ??= { faction: 'kingdom', radius: village.capital ? 140 : 90, control: 100, underRaid: false };
    village.stats.ap = Math.min(200, (village.stats.ap || 0) + 10);
    const production = Math.max(1, Math.floor(village.population.current / 1500));
    village.stats[village.industry.produces] += production;
    const essenceCost = Math.max(1, Math.ceil(village.population.current / 5000));
    village.barrierIntegrity = Math.max(0, (village.barrierIntegrity ?? 100) - essenceCost);
    if ((village.stats.essence || 0) >= essenceCost) {
        village.stats.essence -= essenceCost;
        village.barrierIntegrity = Math.min(100, village.barrierIntegrity + 8);
    } else if (village.barrierIntegrity === 0) {
        postVillageNeed(village, 'essence', essenceCost, 'fueling the rune barrier');
        if (Math.random() < 0.15) window.EventBus.emit('UI_LOG', `[BARRIER] ${village.name}'s ward is failing. Hunters must enter the woods.`);
    }
    village.provisionStock[village.provision.itemId] = (village.provisionStock[village.provision.itemId] || 0) + Math.max(1, Math.floor(production / 2));
    village.stats.food = Math.max(0, (village.stats.food || 0) - Math.ceil(village.population.current / 24));
    processVillageCaravans(village);

    const localRaiders = window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && Math.hypot(entity.visual.position.x - village.x, entity.visual.position.z - village.z) <= village.territory.radius);
    village.territory.underRaid = localRaiders.length > 0;
    village.territory.control = Math.max(0, Math.min(100, village.territory.control + (village.territory.underRaid ? -localRaiders.length * 2 : 1)));
    if (village.territory.underRaid) window.EventBus.emit('UI_LOG', `[RAID] ${village.name} is under attack by ${localRaiders.length} hostile creature${localRaiders.length === 1 ? '' : 's'}.`);
    const activeExpedition = village.expeditions.some(expedition => expedition.status === 'raiding');
    if (!village.territory.underRaid && !activeExpedition && Math.random() < (village.industry?.mountainGatekeeper ? 0.03 : 0.01)) launchHostileExpedition(village);
    if (village.territory.control === 0 && village.territory.faction === 'kingdom') {
        village.territory.faction = 'forest';
        village.territory.reclamation = { wood: 0, stone: 0, requiredWood: 50, requiredStone: 30 };
        village.stats.prosperity = Math.max(0, village.stats.prosperity - 25);
        postVillageNeed(village, 'wood', 50, 'reclaiming occupied territory');
        postVillageNeed(village, 'stone', 30, 'reclaiming occupied territory');
        window.EventBus.emit('UI_LOG', `[OCCUPIED] ${village.name} has fallen under forest control.`);
    }

    const importGoal = Math.ceil(village.population.current * 0.5);
    const suppliedImports = village.industry.imports.filter(resource => (village.stats[resource] || 0) >= importGoal);
    village.industry.imports.forEach(resource => {
        if ((village.stats[resource] || 0) < importGoal) postVillageNeed(village, resource, importGoal - (village.stats[resource] || 0), `supporting ${village.industry.industry}`);
    });
    const connectedTrade = village.caravans.some(caravan => caravan.status === 'traveling' || caravan.status === 'arrived') || window.VillageManager.villages.some(candidate => candidate.caravans && candidate.caravans.some(caravan => (caravan.status === 'traveling' || caravan.status === 'arrived') && caravan.targetVillageId === village.id));
    const foodSecurity = Math.min(25, Math.floor((village.stats.food / Math.max(1, village.population.current * 5)) * 25));
    const tradeDisruption = village.tradeDisruptionUntil > window.EngineParams.worldDay ? 30 : 0;
    village.stats.prosperity = Math.max(0, Math.min(100, 20 + foodSecurity + suppliedImports.length * 15 + (connectedTrade ? 25 : 0) - tradeDisruption));

    if (village.lastGrowthDay !== window.EngineParams.worldDay && village.population.current < village.population.capacity && village.stats.prosperity >= 70 && village.stats.food >= village.population.current * 8) {
        const growth = Math.min(village.population.capacity - village.population.current, Math.max(1, Math.floor(village.population.current * village.stats.prosperity / 10000)));
        village.population.current += growth;
        village.lastGrowthDay = window.EngineParams.worldDay;
        window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} gained ${growth} residents from prosperity.`);
    }

    if (village.stats.food < village.population.current * 3) {
        postVillageNeed(village, 'food', village.population.current * 5 - village.stats.food, 'feeding the settlement');
        return;
    }

    const expansionCost = { ap: 80, wood: 100, stone: 60, food: 30 };
    if (village.population.current >= village.population.capacity && canFundVillageAction(village, expansionCost, 'expansion')) {
        spendVillageResources(village, expansionCost);
        village.population.capacity += 6;
        village.expansionLevel = (village.expansionLevel || 0) + 1;
        village.layout.push({ id: `expansion-${village.expansionLevel}`, prefab: 'Watertight Gothic House', ox: 6 + village.expansionLevel * 3, oz: 0 });
        window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} expanded to house ${village.population.capacity} people.`);
        return;
    }

    const squadCost = { ap: 50, food: 20, wood: 10 };
    const freePopulation = village.population.current - village.squads.length * 3 - village.caravans.length;
    const maxSquads = Math.max(1, Math.min(20, Math.floor(village.population.current / 5000)));
    if (village.squads.length < maxSquads) {
        if (freePopulation < 3) {
            postVillageNeed(village, 'population', 3 - Math.max(0, freePopulation), 'raising a guard squad');
            return;
        }
        if (canFundVillageAction(village, squadCost, 'raising a guard squad')) {
            spendVillageResources(village, squadCost);
            const squadId = `${village.id}-squad-${village.squads.length + 1}`;
            village.squads.push({ id: squadId, type: 'guard', size: 3, casualties: 0, status: 'patrolling', patrolPhase: 0 });
            for (let index = 0; index < 3; index++) village.residents.push({ prefab: 'Guard', ox: 4 + index * 2, oz: 4, squadId });
            window.EventBus.emit('UI_LOG', `[DEFENSE] ${village.name} formed a new guard squad.`);
            return;
        }
    }

    const caravanCost = { ap: 35, food: 15, gold: 20 };
    if (!village.caravans.some(caravan => caravan.status === 'traveling' || caravan.status === 'arrived') && freePopulation >= 1 && canFundVillageAction(village, caravanCost, 'sending a merchant caravan')) {
        spendVillageResources(village, caravanCost);
        const destination = window.VillageManager.villages.find(candidate => village.connections.includes(candidate.id) && candidate.industry && candidate.industry.imports.includes(village.industry.produces));
        const targetVillage = destination || window.VillageManager.villages.find(candidate => village.connections.includes(candidate.id));
        const caravan = { id: `${village.id}-caravan-${window.EngineParams.worldDay}-${village.caravans.length + 1}`, status: 'traveling', targetVillageId: targetVillage.id, cargo: village.industry.produces, amount: Math.max(1, Math.floor(village.population.current / 1000)), launchedOnDay: window.EngineParams.worldDay };
        village.caravans.push(caravan);
        const caravanEntity = instantiatePrefab('Merchant Caravan', village.x + 3, window.WorldGenerator.getTerrainHeight(village.x + 3, village.z), village.z, 'persistent');
        if (caravanEntity) { caravanEntity.caravanId = caravan.id; caravanEntity.villageId = village.id; }
        window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} dispatched a merchant caravan.`);
    }
}

function fixedUpdateLogic(delta) {
    if (window.GameCore.playerObj) ChunkManager.update(window.GameCore.playerObj.visual.position);
    if (window.EngineParams.offPathCaptureCooldown > 0) window.EngineParams.offPathCaptureCooldown = Math.max(0, window.EngineParams.offPathCaptureCooldown - delta);
    window.GameCore.worldTimer += delta;

    if (!window.NetworkSession?.connected) {
        const hoursPerSecond = 24 / window.EngineParams.dayLengthSeconds;
        window.EngineParams.timeOfDay += delta * hoursPerSecond;
        if (window.EngineParams.timeOfDay >= 24) {
            const elapsedDays = Math.floor(window.EngineParams.timeOfDay / 24);
            window.EngineParams.timeOfDay %= 24;
            window.EngineParams.worldDay += elapsedDays;
            for (let day = 0; day < elapsedDays; day++) {
                processCompanionNeeds(); processBaseJobs();
                window.AdventurerManager?.advanceDay();
                window.GameState.processCrowDay();
            }
            if (window.EngineParams.worldDay > 0 && window.EngineParams.worldDay % window.EngineParams.cycleLengthDays === 0) regenerateWorldCycle();
        }
    }
    window.EventBus.emit('ENV_UPDATE');

    // --- TERRAIN ALIGNMENT RAYCASTER ---
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);


    if (window.GameCore.playerObj) {
        const playerPosition = window.GameCore.playerObj.visual.position;
        if (window.WorldGenerator.getBiome(playerPosition.x, playerPosition.z) === 'desert' && !window.EngineParams.sandReaverEncountered) {
            const encounterX = playerPosition.x + (Math.random() - 0.5) * 50;
            const encounterZ = playerPosition.z + (Math.random() - 0.5) * 50;
            const guardian = instantiatePrefab('Sand Reaver', encounterX, window.WorldGenerator.getTerrainHeight(encounterX, encounterZ), encounterZ, 'persistent');
            if (guardian) {
                window.EngineParams.sandReaverEncountered = true;
                window.EventBus.emit('UI_LOG', 'The Sand Reaver rises to guard the Endless Dunes.');
            }
        }
        const tileX = Math.floor(playerPosition.x / window.EngineParams.mapTileSizeMeters);
        const tileZ = Math.floor(playerPosition.z / window.EngineParams.mapTileSizeMeters);
        const tileKey = `${tileX},${tileZ}`;
        if (tileKey !== window.EngineParams.currentMapTile) {
            window.EngineParams.currentMapTile = tileKey;
            if (!window.EngineParams.visitedMapTiles.includes(tileKey)) {
                window.EngineParams.visitedMapTiles.push(tileKey);
                const settlementInTile = window.VillageManager.villages.some(village => Math.floor(village.x / window.EngineParams.mapTileSizeMeters) === tileX && Math.floor(village.z / window.EngineParams.mapTileSizeMeters) === tileZ);
                if (!settlementInTile && window.EngineParams.worldDay >= 7 && !window.GameCore.activeEntities.some(entity => entity.name === 'Dark Forest Boss') && Math.random() < 0.0005) {
                    const encounterX = playerPosition.x + (Math.random() - 0.5) * 60;
                    const encounterZ = playerPosition.z + (Math.random() - 0.5) * 60;
                    const boss = instantiatePrefab('Dark Forest Boss', encounterX, window.WorldGenerator.getTerrainHeight(encounterX, encounterZ), encounterZ, 'persistent');
                    if (boss) window.EventBus.emit('UI_LOG', 'A Dark Forest boss has emerged nearby!');
                }
            }
        }
    }

    if (window.NetworkSession?.connected && window.GameCore.playerObj) {
        const moveX = (window.Input.keys.d ? 1 : 0) - (window.Input.keys.a ? 1 : 0);
        const moveZ = (window.Input.keys.s ? 1 : 0) - (window.Input.keys.w ? 1 : 0);
        window.NetworkSession.sendInput(moveX, moveZ);
    }
    
        if(window.GameCore.worldTimer > 0.25) { 
            if (window.VillageManager && window.VillageManager.simulateNextVillage) {
                window.VillageManager.simulateNextVillage(); // Sliced Simulation
            }
            window.AdventurerManager?.syncDeparted();
            window.AdventurerManager?.syncNearby();
            window.GameCore.worldTimer = 0; 
        }


    window.ArenaTestManager?.update(delta);

    window.EngineParams.isPlayerSafe = false; 
    window.EngineParams.isPlayerHidden = false;
    const staminaMultiplier = 1 + (window.GameState.forestBlessing?.staminaRegen || 0);
    window.GameState.pStats.stamina = Math.min(window.GameState.pStats.maxStamina, window.GameState.pStats.stamina + (window.Input.isBlocking ? 3 : 12) * staminaMultiplier * delta);
    if (performance.now() >= window.GameState.pStats.guardBrokenUntil) window.GameState.pStats.poise = Math.min(window.GameState.pStats.maxPoise, window.GameState.pStats.poise + 10 * delta);
    window.GameState.statusEffects = window.GameState.statusEffects.filter(effect => {
        effect.remaining -= delta; effect.tickTimer -= delta;
        if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
            effect.tickTimer = 1;
            const resistance = window.GameCore.getResistance(effect.type);
            const tickDamage = Math.max(1, effect.tickDamage - resistance);
            window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - tickDamage);
            window.EventBus.emit('ENTITY_DAMAGED', { damage: tickDamage, position: window.GameCore.playerObj.visual.position, isPlayer: true });
        }
        return effect.remaining > 0;
    });
        let isHidden = false;
    let hostileNearby = false;
    const playerAlive = window.GameCore.playerObj && window.GameState.pStats.hp > 0;
    const playerPosition = playerAlive ? window.GameCore.playerObj.visual.position : null;
    const detectionRadiusSq = playerAlive ? Math.pow(window.GameState.forestBlessing?.dangerSense ? 18 : 15, 2) : 0;
        const nowSecs = performance.now() / 1000;

    // Single optimized O(N) backward pass over all active entities
    for (let i = window.GameCore.activeEntities.length - 1; i >= 0; i--) {
        const entity = window.GameCore.activeEntities[i];
        if (!entity || !entity.visual) continue;
        
        // --- SPATIAL GRID: Update position in grid ---
        window.GameCore.SpatialGrid.updateEntity(entity);

                // 1. Process Status Effects In-Place (No .filter arrays)
        if (entity.def.type === 'npc' && entity.statusEffects?.length > 0 && entity.hp > 0) {
            for (let j = entity.statusEffects.length - 1; j >= 0; j--) {
                const effect = entity.statusEffects[j];
                effect.remaining -= delta;
                effect.tickTimer -= delta;
                if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
                    effect.tickTimer = 1;
                    entity.hp = Math.max(0, entity.hp - effect.tickDamage);
                    window.EventBus.emit('ENTITY_DAMAGED', { damage: effect.tickDamage, position: entity.visual.position, isPlayer: false });
                    window.EventBus.emit('SPAWN_HIT_VFX', { type: effect.type === 'burning' ? 'Fire' : 'Void', pos: entity.visual.position });
                    
                                        if (entity.hp <= 0) {
                        playEntityAnimation(entity, 'die');
                        window.AdventurerManager?.markDefeated(entity);
                        spawnGroundLoot(entity.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones', entity.visual.position);
                        awardMonsterKill(entity);
                        window.GameState.inventory.gold += entity.def.faction === 'monster' ? 10 : 50;
                        window.EventBus.emit('UI_UPDATE_HUD');
                        setTimeout(() => {
                            window.GameCore.releaseEntityIndex(entity.memoryIndex); // Recycle memory
                            window.GameCore.scene.remove(entity.visual);
                            window.GameCore.world.removeRigidBody(entity.body);
                            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(candidate => candidate.id !== entity.id);
                        }, 2000);
                        break; // Entity died, stop processing effects
                    }
                }
                if (effect.remaining <= 0) entity.statusEffects.splice(j, 1);
            }
        }

        // --- VISUAL GROUND ALIGNMENT (Dragon's Dogma Style) ---
        // Align characters so they don't look like they are floating on slopes
        if (entity.def.type === 'npc' || entity.def.type === 'character') {
            const ePos = entity.visual.position;
            // Raycast straight down from slightly above the entity
            raycaster.set(new THREE.Vector3(ePos.x, ePos.y + 2, ePos.z), downVector);
            const activeMeshes = [];
            // Optimize: Only check collision against the ground chunks, not other actors
            for (const chunk of ChunkManager.activeChunks.values()) {
                if (chunk.mesh) activeMeshes.push(chunk.mesh);
            }
            
            const intersects = raycaster.intersectObjects(activeMeshes, false);
            if (intersects.length > 0) {
                const hitNormal = intersects[0].face.normal;
                
                // We want to align the entity's Y axis with the ground normal, 
                // but preserve its current Y-rotation (facing direction).
                const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hitNormal);
                
                // Extract current Y rotation
                const currentYRotation = new THREE.Euler().setFromQuaternion(entity.visual.quaternion, 'YXZ').y;
                const yQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentYRotation);
                
                // Combine slope alignment + facing direction
                targetQuaternion.multiply(yQuat);
                
                // Slerp for smooth transition (looks natural as they walk over bumps)
                entity.visual.quaternion.slerp(targetQuaternion, delta * 5.0);
            }
        }

        // 2. Spatial Checks (Distance to Player)
        if (playerAlive && entity.hp !== 0) {
            const distSq = entity.visual.position.distanceToSquared(playerPosition);
            
            // Check Concealment
            if (!isHidden && entity.def.concealment) {
                const hideRad = entity.def.hideRadius || entity.def.radius;
                if (distSq <= hideRad * hideRad) isHidden = true;
            }
            
            // Check Touch Effects (Poison Clouds, etc)
            if (entity.def.touchEffect && entity.def.active !== false) {
                const touchRad = entity.def.touchRadius || entity.def.radius + 1;
                if (distSq <= touchRad * touchRad) {
                    if (!entity.touchEffectAvailableAt || nowSecs >= entity.touchEffectAvailableAt) {
                        entity.touchEffectAvailableAt = nowSecs + (entity.def.touchCooldown || 4);
                        window.EventBus.emit('SPAWN_HIT_VFX', { type: entity.def.touchEffect, pos: entity.visual.position.clone().add(new THREE.Vector3(0, 1, 0)) });
                        if (entity.def.touchEffect === 'Poison') window.GameCore.applyStatusEffect('poison', 6, 3);
                        window.EventBus.emit('UI_LOG', 'Poison cloud released by the flesh pods.');
                    }
                }
            }
            
            // Check Hostiles Nearby
            if (!hostileNearby && entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest')) {
                if (distSq < detectionRadiusSq) hostileNearby = true;
            }
        }
    }

    if (playerAlive) {
        window.EngineParams.isPlayerHidden = isHidden;
        const p = window.GameCore.playerObj.body.translation(); 
        window.EngineParams.isPlayerSafe = window.RoadManager.isSafeZone(p);

        if (!window.EngineParams.isPlayerSafe && !window.EngineParams.isPlayerHidden && hostileNearby && !window.EngineParams.godMode && window.EngineParams.offPathCaptureCooldown <= 0) {
            const pathPoint = window.RoadManager.getRandomPathPoint();
            if (pathPoint) {
                const safeY = window.WorldGenerator.getTerrainHeight(pathPoint.x, pathPoint.z) + 15;
                window.GameCore.playerObj.body.setTranslation({ x: pathPoint.x, y: safeY, z: pathPoint.z }, true);
                window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                window.EngineParams.offPathCaptureCooldown = 10;
                window.EventBus.emit('UI_LOG', 'The forest caught you off the safe path and dragged you back to the road.');
                return;
            }
        }
        
                const moveDir = _v1.set(0, 0, 0); 
                if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') {
                    if (window.Input.keys.w) moveDir.z -= 1; 
                    if (window.Input.keys.s) moveDir.z += 1; 
                    if (window.Input.keys.a) moveDir.x -= 1; 
                    if (window.Input.keys.d) moveDir.x += 1;
                }
        
                window.Input.isBlocking = window.Input.keys.shift && window.GameState.pStats.stamina > 0 && performance.now() >= window.GameState.pStats.guardBrokenUntil; 
                window.Input.isMoving = moveDir.lengthSq() > 0;
        
                if (window.Input.isMoving) {
                    moveDir.normalize(); moveDir.applyAxisAngle(_v2.set(0, 1, 0), window.Input.camAngle); 
            
                    let accelerationForce = 35 + ((window.GameState.pStats.athletics.level + window.GameCore.getBuffBonus('athletics')) * 0.5);
            
                    if (window.Input.isBlocking) {
                        accelerationForce *= 0.2; 
                        window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 8 * delta);
                    } else {
                        window.GameCore.addXP('athletics', 0.1 * delta); 
                        if (window.Input.keys[' '] && window.Input.dashTimer <= 0 && window.GameState.pStats.stamina >= 25) { 
                            window.GameState.pStats.stamina -= 25;
                            window.Input.dashTimer = Math.max(0.25, 2.0 - ((window.GameState.pStats.dodge.level + window.GameCore.getBuffBonus('dodge')) * 0.05)); 
                            window.Input.isDashing = true; 
                            window.GameCore.addXP('dodge', 15); 
                    
                            window.GameCore.playerObj.body.applyImpulse({ x: moveDir.x * 30, y: 0, z: moveDir.z * 30 }, true);
                            playEntityAnimation(window.GameCore.playerObj, 'dash');
                    
                            setTimeout(() => window.Input.isDashing = false, 200); 
                            window.EventBus.emit('PLAY_SOUND', {url:'https://tonejs.github.io/audio/drum-samples/hihat-analog.mp3', pos: window.GameCore.playerObj.visual.position}); 
                        }
                    }
            
                    window.GameCore.playerObj.body.applyImpulse({ x: moveDir.x * accelerationForce * delta, y: 0, z: moveDir.z * accelerationForce * delta }, true);
            
                    const currentVel = window.GameCore.playerObj.body.linvel();
                    const maxSpeed = (window.Input.isBlocking ? 2.0 : 6.0) * window.GameCore.getCombatInjuryMultiplier();
                    const flatVelX = currentVel.x;
                    const flatVelZ = currentVel.z;
                    const flatVelLenSq = flatVelX * flatVelX + flatVelZ * flatVelZ;
            
                    if (flatVelLenSq > maxSpeed * maxSpeed && !window.Input.isDashing) {
                        const multiplier = maxSpeed / Math.sqrt(flatVelLenSq);
                        window.GameCore.playerObj.body.setLinvel({ x: flatVelX * multiplier, y: currentVel.y, z: flatVelZ * multiplier }, true);
                    }

                    if (!window.Input.isAttacking && !window.Input.isDashing && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
                        if (window.Input.isBlocking) {
                            playEntityAnimation(window.GameCore.playerObj, 'block');
                        } else {
                            // Update facing direction using an Euler to avoid overriding the slope alignment
                            const targetFacing = _v2.copy(window.GameCore.playerObj.visual.position).add(moveDir);
                            const lookMatrix = new THREE.Matrix4().lookAt(window.GameCore.playerObj.visual.position, targetFacing, new THREE.Vector3(0,1,0));
                            const targetYRot = new THREE.Euler().setFromRotationMatrix(lookMatrix).y;
                    
                            const currentQuat = window.GameCore.playerObj.visual.quaternion;
                            const euler = new THREE.Euler().setFromQuaternion(currentQuat, 'YXZ');
                            euler.y = targetYRot;
                            window.GameCore.playerObj.visual.quaternion.setFromEuler(euler);
                    
                            playEntityAnimation(window.GameCore.playerObj, 'walk'); 
                        }
                    }

                } else if (!window.Input.isAttacking && !window.Input.isDashing && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
                    if (window.Input.isBlocking) {
                        playEntityAnimation(window.GameCore.playerObj, 'block');
                    } else {
                        playEntityAnimation(window.GameCore.playerObj, 'idle'); 
                    }
                }

        
                if (window.Input.dashTimer > 0) window.Input.dashTimer -= delta; 
        if (window.Input.attackCooldown > 0) window.Input.attackCooldown -= delta; 
        else window.Input.isAttacking = false;
        
                // --- DYNAMIC ARC SWEEP HITBOX LOGIC ---
                if (window.Input.activeSweep) {
                    window.Input.activeSweep.timer -= delta;
            
                    // If we have passed the windup phase, check for hits
                    if (window.Input.activeSweep.timer <= window.Input.activeSweep.activeAt) {
                        const sweep = window.Input.activeSweep;
                        const pTrans = window.GameCore.playerObj.body.translation();
                        sweep.playerPos.set(pTrans.x, pTrans.y, pTrans.z);
                        sweep.playerForward.set(0, 0, 1).applyQuaternion(window.GameCore.playerObj.visual.quaternion).normalize();
                
                        // --- SPATIAL GRID OPTIMIZATION (Diablo Style) ---
                        const nearbyEntities = window.GameCore.SpatialGrid.getNearbyEntities(sweep.playerPos.x, sweep.playerPos.z, sweep.profile.reach);
                
                        for (let i = nearbyEntities.length - 1; i >= 0; i--) {
                            const en = nearbyEntities[i];
                            if (!en || en.hp <= 0 || sweep.alreadyHit.has(en.id)) continue;
                            if (en.def.type !== 'npc' && en.name !== 'Blight Root') continue;
                    
                            const eTrans = en.body.translation();
                            const distSq = (eTrans.x - sweep.playerPos.x)**2 + (eTrans.z - sweep.playerPos.z)**2;
                    
                            if (distSq <= sweep.profile.reach * sweep.profile.reach) {
                                _v1.set(eTrans.x - sweep.playerPos.x, 0, eTrans.z - sweep.playerPos.z).normalize();
                                const angleToEnemy = sweep.playerForward.angleTo(_v1);
                        
                                if (angleToEnemy <= sweep.profile.angle / 2) {
                                    sweep.alreadyHit.add(en.id);
                            
                                    // COMBAT MULTIPLIERS
                                    let damageMultiplier = sweep.profile.multiplier;


                            // --- ASSASSINATION MECHANIC (Kenshi Style) ---
                            // 5x damage if Heavy Attacking from Stealth
                            if (window.Input.isStealth && sweep.isHeavy) {
                                damageMultiplier *= 5.0;
                                window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "ASSASSINATION!", pos: en.visual.position, color: '#ff0000'});
                                window.EventBus.emit('UI_LOG', `[CRITICAL] You assassinated ${en.name}!`);
                                // Break stealth upon assassination
                                window.EventBus.emit('TOGGLE_STEALTH');
                            }

                            const rawDamage = window.GameState.derivedStats.weaponDamage + ((window.GameState.pStats.strength.level + window.GameCore.getBuffBonus('strength')) * 2) + window.GameCore.getBuffBonus('meleeAtt');
                            const damage = Math.max(1, Math.floor(rawDamage * damageMultiplier * window.GameCore.getCombatInjuryMultiplier()) - (en.def.armor || 0)); 
                            
                                                        en.hp -= damage; 
                            
                            // POISE DAMAGE
                            const poiseDamage = sweep.profile.poise || 10;
                            en.poise = Math.max(0, en.poise - poiseDamage);

                            window.EventBus.emit('ENTITY_DAMAGED', { damage: damage, position: en.visual.position, isPlayer: false });
                            window.EventBus.emit('SPAWN_HIT_VFX', { type: en.def.vfx.onHit, pos: en.visual.position.clone().add(new THREE.Vector3(0, 1, 0)) });
                            
                                                        // Audio sync & Hit Pause (Dragon's Dogma feel)
                                                        window.EventBus.emit('PLAY_SOUND', {url: sweep.isHeavy ? 'https://tonejs.github.io/audio/drum-samples/CRASH_1.mp3' : 'https://tonejs.github.io/audio/drum-samples/handclap.mp3', pos: en.visual.position, vol: -5});
                            
                                                        if (sweep.isHeavy || sweep.profile.isGuardbreaker) {
                                                            window.Input.hitPauseTimer = 0.08; // 80ms freeze (DD2 style)
                                                            window.Input.camShake = 0.5;       // Start camera shake
                                
                                                            // RECOIL (DD2 style): Small pushback for the attacker on heavy impact
                                                            const recoilDir = sweep.playerForward.clone().negate();
                                                            window.GameCore.playerObj.body.applyImpulse({ 
                                                                x: recoilDir.x * 5, 
                                                                y: 0, 
                                                                z: recoilDir.z * 5 
                                                            }, true);
                                                        } else {
                                                            window.Input.hitPauseTimer = 0.03; // Light hit-pause
                                                        }

                            
                            if(en.def.faction !== 'monster' && en.def.faction !== 'forest' && en.name !== 'Blight Root') {
                                window.GameCore.adjustFactionStanding(en.def.faction, -20, `assaulted ${en.name}`);
                                window.GameCore.recordRenown({ infamy: 5, faction: en.def.faction, reason: `assaulted ${en.name}` });
                                if(window.GameState.factionRelations.player[en.def.faction === 'village' ? 'kingdom' : en.def.faction] <= -50) window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "HOSTILE!", pos: en.visual.position, color: '#ff0000'});
                            }

                                        if(en.hp <= 0) {
                playEntityAnimation(en, 'die');
                window.AdventurerManager?.markDefeated(en);
                if (en.def.type === 'npc') spawnGroundLoot(en.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones', en.visual.position);
                awardMonsterKill(en);
                setTimeout(() => {
                    window.GameCore.releaseEntityIndex(en.memoryIndex); // Recycle memory
                    window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e.id !== en.id);
                }, 2000);
                if (en.name === 'Blight Root') { window.EventBus.emit('UI_LOG', `Destroyed the Blight Root! Safe zone restored.`); } 
                else { window.GameState.inventory.gold += (en.def.faction === 'monster' ? 10 : 50); window.EventBus.emit('UI_UPDATE_HUD'); window.EventBus.emit('UI_LOG', `Killed ${en.name}. Looted gold.`); }
            } else if (en.poise <= 0) {
                                en.poise = en.maxPoise;
                                en.staggeredUntil = performance.now() + 800;
                                playEntityAnimation(en, 'hit');
                                window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: 'STAGGERED', pos: en.visual.position, color: '#fbbf24'});
                            } else {
                                playEntityAnimation(en, 'hit');
                            }
                        }
                    }
                }
            }
            if (window.Input.activeSweep.timer <= 0) window.Input.activeSweep = null;
        }

        if (window.Input.guardbreakerCooldown > 0) window.Input.guardbreakerCooldown -= delta;
        if (window.Input.rationCooldown > 0) window.Input.rationCooldown -= delta;
        if (window.Input.runeShotCooldown > 0) window.Input.runeShotCooldown -= delta;
        if (window.Input.fireShotCooldown > 0) window.Input.fireShotCooldown -= delta;
        
        window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z); const target = window.GameCore.playerObj.visual.position.clone();
        if(isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) { target.set(0, 15, 0); }
        
        window.GameCore.camera.position.set(target.x + Math.sin(window.Input.camAngle)*Math.cos(window.Input.camPitch)*window.Input.camDistance, target.y + Math.sin(window.Input.camPitch)*window.Input.camDistance, target.z + Math.cos(window.Input.camAngle)*Math.cos(window.Input.camPitch)*window.Input.camDistance);
        window.GameCore.camera.lookAt(target);
    }
}

// MATH POOLING (Prevents GC Stutter)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m1 = new THREE.Matrix4();
const _q1 = new THREE.Quaternion();

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta(); const delta = Math.min(rawDelta, 0.1) * window.EngineParams.timeScale;

    if (window.EngineParams.playMode && window.GameCore.engineState === 'running') {
        accumulator += delta;
        
        let updatePhysics = true;
        if (window.Input.hitPauseTimer > 0) {
            window.Input.hitPauseTimer -= delta;
            updatePhysics = false;
        }
        
                if (updatePhysics) {
            if (!window.EngineParams.editMode) {
                while (accumulator >= fixedTimeStep) { window.GameCore.world.step(); fixedUpdateLogic(fixedTimeStep); accumulator -= fixedTimeStep; }
            } else {
                // If in Edit Mode, do not step physics, but still call Editor Update for free-cam
                window.EditorManager?.update(delta);
                accumulator = 0; // Prevent death spiral buildup
            }
            
            // ANIMATION OPTIMIZATION: Only update visible or nearby mixers
            if (!window.EngineParams.editMode && window.GameCore.playerObj && window.GameCore.playerObj.mixer) {
                window.GameCore.playerObj.mixer.update(delta);
            }

            
            const playerPos = window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : null;
            const frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(_m1.multiplyMatrices(window.GameCore.camera.projectionMatrix, window.GameCore.camera.matrixWorldInverse));

            for (let i = 0; i < window.GameCore.activeEntities.length; i++) {
                const en = window.GameCore.activeEntities[i];
                if (!en.mixer) continue;
                
                // Only update if within 60 units OR visible in camera
                const distSq = playerPos ? en.visual.position.distanceToSquared(playerPos) : 0;
                if (distSq < 3600 || frustum.containsPoint(en.visual.position)) {
                    en.mixer.update(delta);
                    en.visual.visible = true; // Optimization: Toggle visibility for GPU
                } else {
                    en.visual.visible = false;
                }
            }
        }
        
                window.VFXManager.update(delta);
        if (!window.EngineParams.editMode) {
            window.EventBus.emit('AI_TICK', { delta, isPlayerSafe: window.EngineParams.isPlayerSafe });
        }
        window.EventBus.emit('UI_TICK', { delta, camera: window.GameCore.camera });

        
        if (window.Input.camShake > 0) {
            window.GameCore.camera.position.x += (Math.random() - 0.5) * window.Input.camShake;
            window.GameCore.camera.position.y += (Math.random() - 0.5) * window.Input.camShake;
            window.GameCore.camera.position.z += (Math.random() - 0.5) * window.Input.camShake;
            window.Input.camShake *= 0.9;
            if (window.Input.camShake < 0.01) window.Input.camShake = 0;
        }
    }
    if (composer) composer.render();
}


document.getElementById('btn-start').addEventListener('click', async () => {
    try { if(window.Tone) await window.Tone.start(); } catch(e) { console.warn("Audio Context blocked, proceeding silently."); }
    document.getElementById('start-screen').classList.add('hidden'); document.getElementById('hud').classList.remove('hidden'); document.getElementById('hud').classList.add('flex');
    window.GameCore.engineState = 'running'; window.EventBus.emit('UI_UPDATE_HUD'); animate();
});

window.addEventListener('resize', () => { 
    if (window.GameCore.camera && renderer) { window.GameCore.camera.aspect = window.innerWidth/window.innerHeight; window.GameCore.camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); if(composer) composer.setSize(window.innerWidth, window.innerHeight); }
});

bootEngine();
