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

let renderer, clock, composer, ambientLight, dirLight;
const fixedTimeStep = 1.0 / 60.0; let accumulator = 0.0;

const ChunkManager = {
    activeChunks: new Map(), currentChunkX: null, currentChunkZ: null,
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
            
            let minRoadDist = 9999;
            for(let r=0; r<localRoadPoints.length; r++) { const dist = Math.sqrt(Math.pow(vx - localRoadPoints[r].x, 2) + Math.pow(vz - localRoadPoints[r].z, 2)); if(dist < minRoadDist) minRoadDist = dist; }
            if(minRoadDist < ROAD_WIDTH + 2) { const dirtInfluence = Math.max(0, 1.0 - (minRoadDist / (ROAD_WIDTH + 2))); c.lerp(new THREE.Color('#38281d'), dirtInfluence); }

            vertices[i+1] = window.WorldGenerator.getTerrainHeight(vx, vz); 
            const colorNoise = window.currentNoise2D(vx * 0.1, vz * 0.1) * 0.05; c.r += colorNoise; c.g += colorNoise; c.b += colorNoise;
            colors.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 }); const mesh = new THREE.Mesh(geo, mat); mesh.position.set(chunkX, 0, chunkZ); mesh.receiveShadow = true; window.GameCore.scene.add(mesh);

        const physicsVertices = new Float32Array(vertices); const indicesU32 = new Uint32Array(geo.index.array); 
        const groundBody = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(chunkX, 0, chunkZ));
        const collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.trimesh(physicsVertices, indicesU32), groundBody);
        this.activeChunks.set(key, { mesh, body: groundBody, collider });
        
        const rng = alea(`${window.EngineParams.worldSeed}_${cx}_${cz}`);
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
                    instantiatePrefab('Guard', v.x + 4, window.WorldGenerator.getTerrainHeight(v.x + 4, v.z + 4), v.z + 4, key);
                    window.AssetManager.prefabs['Village Hub'].customModel = originalModel;
                }
            });
        }
        
        const chunkBiomeSpawns = {}; 
        for(let i=0; i<150; i++) {
            const px = chunkX + (rng() - 0.5) * 60; const pz = chunkZ + (rng() - 0.5) * 60; const biomeKey = window.WorldGenerator.getBiome(px, pz); const biome = window.WorldGenConfig.biomes[biomeKey];
            if (!chunkBiomeSpawns[biomeKey]) chunkBiomeSpawns[biomeKey] = 0;
            if (chunkBiomeSpawns[biomeKey] < biome.density && rng() < 0.5) { if (biome.prefab !== 'None' && window.AssetManager.prefabs[biome.prefab]) { instantiatePrefab(biome.prefab, px, window.WorldGenerator.getTerrainHeight(px, pz), pz, key); chunkBiomeSpawns[biomeKey]++; } }
        }
    },
    unloadChunk: function(key) {
        const chunk = this.activeChunks.get(key); if(!chunk) return;
        chunk.mesh.geometry.dispose(); chunk.mesh.material.dispose(); window.GameCore.scene.remove(chunk.mesh); window.GameCore.world.removeRigidBody(chunk.body);
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => { if(en.chunkKey === key) { window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); return false; } return true; });
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

    const entity = { id: Math.random().toString(36).substr(2, 9), name: name, def: def, visual: mesh, body: body, collider: collider, hp: def.hp || 50, chunkKey: chunkKey };
    if(collider) collider.handle = Math.floor(Math.random() * 1000000); 
    body.userData = { entityId: entity.id };
    
    if(def.type === 'hub') { const light = new THREE.PointLight(def.color, 2, 15); light.position.y = def.height/2; mesh.add(light); entity.ap = 0; entity.food = 100; }
    if(def.type === 'powerStone') { const light = new THREE.PointLight(0x7dd3fc, def.active === false ? 0.2 : 3, 25); light.position.y = def.height / 2; mesh.add(light); }
    if(def.type === 'firePit') { const light = new THREE.PointLight(0xff8a32, def.active === false ? 0 : 2.5, 12); light.position.y = def.height; mesh.add(light); }
    if(def.type === 'streetLight') { const light = new THREE.PointLight(0x9bdcff, def.active === false ? 0 : 2.5, 18); light.position.y = def.height; mesh.add(light); }
    setupEntityAnimations(entity); window.VFXManager.applyAura(entity, def); window.GameCore.activeEntities.push(entity); return entity;
}

function spawnPlayer(x, y, z) {
    const def = window.AssetManager.prefabs['Player'];
    
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().lockRotations().setTranslation(x, y, z).setCcdEnabled(true).setLinearDamping(5.0);
    
    let body = window.GameCore.world.createRigidBody(rigidBodyDesc);
    let collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius), body);
    window.GameCore.playerObj = { visual: getVisualMesh(def), body: body, collider: collider };
    const p = body.translation(); window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z); window.GameCore.scene.add(window.GameCore.playerObj.visual);
    setupEntityAnimations(window.GameCore.playerObj, true); window.VFXManager.applyAura(window.GameCore.playerObj, def);
}

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

function performAttack() {
    if (window.Input.isBlocking || window.Input.isAttacking || !window.GameCore.playerObj.visual) return; 
    if (window.GameCore.playerObj.currentAnimState === 'hit' || window.GameCore.playerObj.currentAnimState === 'die') return;

    window.Input.isAttacking = true; window.Input.attackCooldown = 0.8;
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    
    const pPos = window.GameCore.playerObj.visual.position; const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(window.GameCore.playerObj.visual.quaternion).normalize();
    
    const slashGeo = new THREE.BoxGeometry(2, 0.1, 0.5); const slashMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); const slash = new THREE.Mesh(slashGeo, slashMat);
    slash.position.copy(pPos).add(new THREE.Vector3(0, 1, 0)).add(forwardDir.clone().multiplyScalar(1.5)); slash.quaternion.copy(window.GameCore.playerObj.visual.quaternion); window.GameCore.scene.add(slash);
    
    window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/handclap.mp3', pos: pPos, vol: -10});
    setTimeout(() => window.GameCore.scene.remove(slash), 100); window.GameCore.addXP('meleeAtt', 2); 

    const rayOrigin = window.GameCore.playerObj.body.translation(); rayOrigin.x += forwardDir.x * 0.6; rayOrigin.y += 1.0; rayOrigin.z += forwardDir.z * 0.6;
    const ray = new RAPIER.Ray(rayOrigin, { x: forwardDir.x, y: 0, z: forwardDir.z });
    const hit = window.GameCore.world.castRay(ray, 3.0, true, RAPIER.QueryFilterFlags.EXCLUDE_STATIC);

    if (hit && hit.collider) {
        let hitHandle = hit.collider.handle; let hitBody = hit.collider.parent();
        let en = window.GameCore.activeEntities.find(e => e.collider === hit.collider || (e.collider && e.collider.handle === hitHandle) || (hitBody && hitBody.userData && e.id === hitBody.userData.entityId));
        
        if(en && (en.def.type === 'npc' || en.name === 'Blight Root')) {
            const dmg = window.GameState.derivedStats.weaponDamage + (window.GameState.pStats.strength.level * 2); en.hp -= dmg;
            window.EventBus.emit('ENTITY_DAMAGED', { damage: dmg, position: en.visual.position, isPlayer: false });
            window.EventBus.emit('SPAWN_HIT_VFX', { type: en.def.vfx.onHit, pos: en.visual.position.clone().add(new THREE.Vector3(0, 1, 0)) });

            if(en.def.faction !== 'monster' && en.name !== 'Blight Root') {
                window.GameState.reputation[en.def.faction] -= 20; window.EventBus.emit('UI_LOG', `Crime Reported! Assaulted ${en.name}.`); window.EventBus.emit('UI_UPDATE_HUD');
                if(window.GameState.reputation[en.def.faction] <= -50) window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "HOSTILE!", pos: en.visual.position, color: '#ff0000'});
            }

            if(en.hp <= 0) {
                playEntityAnimation(en, 'die');
                setTimeout(() => {
                    window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e.id !== en.id);
                }, 2000);
                if (en.name === 'Blight Root') { window.EventBus.emit('UI_LOG', `Destroyed the Blight Root! Safe zone restored.`); } 
                else { window.GameState.inventory.gold += (en.def.faction === 'monster' ? 10 : 50); window.EventBus.emit('UI_UPDATE_HUD'); window.EventBus.emit('UI_LOG', `Killed ${en.name}. Looted gold.`); }
            } else {
                playEntityAnimation(en, 'hit');
            }
        }
    }
}

window.EventBus.on('PRIMARY_CLICK_DOWN', () => { if(window.Input.attackCooldown <= 0) performAttack(); });
window.EventBus.on('SPAWN_HIT_VFX', ({type, pos}) => window.VFXManager.spawnHit(type, pos));
window.EventBus.on('SPAWN_INVASION', () => { const p = window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : new THREE.Vector3(); for(let i=0; i<3; i++) instantiatePrefab('Ghoul', p.x + (Math.random()-0.5)*15, window.WorldGenerator.getTerrainHeight(p.x, p.z), p.z + (Math.random()-0.5)*15); window.EventBus.emit('UI_LOG', "Ghoul Invasion Spawned!"); });
window.EventBus.on('SPAWN_BLIGHT', () => {
    if (!window.GameCore.playerObj) return; const p = window.GameCore.playerObj.visual.position; const pts = window.RoadManager.getRoadPointsNear(Math.floor(p.x/60), Math.floor(p.z/60));
    if (pts.length > 0) { const pt = pts[Math.floor(Math.random() * pts.length)]; const root = instantiatePrefab('Blight Root', pt.x, window.WorldGenerator.getTerrainHeight(pt.x, pt.z), pt.z, 'persistent'); if (root) { root.hp = 150; window.EventBus.emit('UI_LOG', "🥀 A Blight Root has corrupted a nearby road!"); } } 
    else window.EventBus.emit('UI_LOG', "No roads nearby to corrupt!");
});
window.EventBus.on('CLEAR_MAP', () => { window.GameCore.activeEntities.forEach(en => { if(en.def.faction === 'player') return; window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); }); window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => en.def.faction === 'player'); window.GameState.questBoard = []; window.EventBus.emit('UI_LOG', "World Entities Cleared."); });
window.EventBus.on('WORLD_REGENERATE', () => {
    window.EventBus.emit('CLEAR_MAP'); const keys = Array.from(ChunkManager.activeChunks.keys()); keys.forEach(k => ChunkManager.unloadChunk(k)); ChunkManager.currentChunkX = null; 
    window.currentPrng = alea(window.EngineParams.worldSeed); window.currentNoise2D = window.createNoise2D(window.currentPrng);
    if (window.GameCore.playerObj) { const vy = window.WorldGenerator.getTerrainHeight(window.GameCore.playerObj.visual.position.x, window.GameCore.playerObj.visual.position.z) + 15; window.GameCore.playerObj.body.setTranslation({x: window.GameCore.playerObj.visual.position.x, y: vy, z: window.GameCore.playerObj.visual.position.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); ChunkManager.update(new THREE.Vector3(window.GameCore.playerObj.visual.position.x, vy, window.GameCore.playerObj.visual.position.z)); }
    window.EventBus.emit('UI_LOG', `World Math Regenerated with Seed: ${window.EngineParams.worldSeed}`);
});
window.EventBus.on('CMD_TELEPORT', (pos) => { const vy = window.WorldGenerator.getTerrainHeight(pos.x, pos.z) + 15; window.GameCore.playerObj.body.setTranslation({x:pos.x, y:vy, z:pos.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); ChunkManager.update(new THREE.Vector3(pos.x, vy, pos.z)); });
window.EventBus.on('PLAYER_RESPAWN', () => { const respawnY = window.WorldGenerator.getTerrainHeight(0,0) + 15; window.GameCore.playerObj.body.setTranslation({x:0, y:respawnY, z:0}, true); window.GameState.pStats.hp = window.GameState.pStats.maxHp; window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); playEntityAnimation(window.GameCore.playerObj, 'idle'); window.EventBus.emit('UI_UPDATE_HUD'); });

async function bootEngine() {
    try {
        document.getElementById('loading-bar').style.width = "50%"; await RAPIER.init(); 
        document.getElementById('loading-bar').style.width = "100%"; document.getElementById('loading-container').classList.add('hidden'); document.getElementById('btn-start').classList.remove('hidden');
        
        window.GameCore.scene = new THREE.Scene(); window.GameCore.scene.fog = new THREE.FogExp2(0x040608, 0.03); window.GameCore.scene.background = new THREE.Color(0x040608);
        window.GameCore.camera = new THREE.PerspectiveCamera(60, (window.innerWidth || 800) / (window.innerHeight || 600), 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); renderer.setSize(window.innerWidth || 800, window.innerHeight || 600); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; document.body.appendChild(renderer.domElement);
        clock = new THREE.Clock(); window.GameCore.world = new RAPIER.World({ x: 0.0, y: -20.0, z: 0.0 });

        ambientLight = new THREE.AmbientLight(0x202530, 0.5); window.GameCore.scene.add(ambientLight);
        dirLight = new THREE.DirectionalLight(0xaaccff, 0.8); dirLight.position.set(20, 40, 20); dirLight.castShadow = true; dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50; dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50; window.GameCore.scene.add(dirLight);

        composer = new EffectComposer(renderer); composer.addPass(new RenderPass(window.GameCore.scene, window.GameCore.camera));
        window.GameCore.passes.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85); composer.addPass(window.GameCore.passes.bloom);
        
        const VignetteShader = { uniforms: { "tDiffuse": { value: null }, "darkness": { value: 1.1 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); texel.rgb *= smoothstep(0.8, 0.2, dist * darkness); gl_FragColor = texel; }` };
        window.GameCore.passes.vignette = new ShaderPass(VignetteShader); composer.addPass(window.GameCore.passes.vignette);
        
        const ColorTintShader = { uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }` };
        window.GameCore.passes.colorTint = new ShaderPass(ColorTintShader); composer.addPass(window.GameCore.passes.colorTint);

        const startY = window.WorldGenerator.getTerrainHeight(0, 0); const safeY = isNaN(startY) ? 10 : startY;
        spawnPlayer(0, safeY + 15, 0); ChunkManager.update(new THREE.Vector3(0, safeY + 15, 0));
        
        window.EventBus.on('ENV_UPDATE', () => {
            const angle = ((window.EngineParams.timeOfDay - 6) / 24) * Math.PI * 2; dirLight.position.x = Math.cos(angle) * 50; dirLight.position.y = Math.sin(angle) * 50; dirLight.position.z = Math.cos(angle) * 20;
            const sunHeight = Math.sin(angle); let baseDirIntensity = 1.5; let baseAmbientIntensity = 1.0;
            if (sunHeight > 0.2) { baseDirIntensity = 1.5; dirLight.color.setHex(0xffffff); ambientLight.color.setHex(0x606070); window.GameCore.scene.fog.color.setHex(0x0a0c10); window.GameCore.scene.background = new THREE.Color(0x0a0c10); } 
            else if (sunHeight > 0.0) { baseDirIntensity = 0.8; dirLight.color.setHex(0xffaa55); ambientLight.color.setHex(0x403030); window.GameCore.scene.fog.color.setHex(0x1a0a05); window.GameCore.scene.background = new THREE.Color(0x1a0a05); } 
            else { baseDirIntensity = 0.2; dirLight.color.setHex(0x334466); ambientLight.color.setHex(0x202030); window.GameCore.scene.fog.color.setHex(0x040608); window.GameCore.scene.background = new THREE.Color(0x040608); }
            dirLight.intensity = baseDirIntensity * (window.EngineParams.globalBrightness * 0.8); ambientLight.intensity = baseAmbientIntensity * window.EngineParams.globalBrightness; renderer.toneMappingExposure = window.EngineParams.globalBrightness; window.GameCore.scene.fog.density = window.EngineParams.fogDensity;
        });
        
        window.EventBus.emit('ENGINE_READY'); window.EventBus.emit('ENV_UPDATE');
    } catch(e) { console.error("CRITICAL BOOT ERROR", e); }
}

function fixedUpdateLogic(delta) {
    if (window.GameCore.playerObj) ChunkManager.update(window.GameCore.playerObj.visual.position);
    window.GameCore.worldTimer += delta;
    
    if(window.GameCore.worldTimer > 5) { 
        let activeHubs = window.GameCore.activeEntities.filter(e => e.def.type === 'hub');
        activeHubs.forEach(hub => {
            hub.ap += 10; hub.food -= 5;
            if(hub.food <= 20 && !window.GameState.questBoard.find(q => q.issuer === hub.id)) { window.GameState.questBoard.push({ type: 'fetch', item: 'food', reward: 50, issuer: hub.id }); window.EventBus.emit('UI_LOG', `[TRADE] Village posts contract: Food for Gold.`); }
            if(hub.ap >= 50 && hub.food > 20) { hub.ap -= 50; instantiatePrefab('Guard', hub.visual.position.x + 3, window.WorldGenerator.getTerrainHeight(hub.visual.position.x + 3, hub.visual.position.z + 3), hub.visual.position.z + 3); window.EventBus.emit('UI_LOG', `Economy: Village trained a new Guard.`); }
        });
        if(window.GameState.questBoard.length > 0 && window.GameCore.activeEntities.filter(e => e.def.faction === 'adventurer').length > 0) {
            window.EventBus.emit('UI_LOG', `Adventurer accepted fetch contract...`); setTimeout(() => { if(window.GameState.questBoard.length > 0) { let q = window.GameState.questBoard.shift(); let hub = window.GameCore.activeEntities.find(e => e.id === q.issuer); if(hub) { hub.food += 30; window.EventBus.emit('UI_LOG', `Adventurer fulfilled contract. Village fed.`); } } }, 10000); 
        }
        if (window.GameCore.playerObj && !window.GameCore.activeEntities.some(entity => entity.name === 'Dark Forest Boss') && Math.random() < 0.05) {
            const playerPosition = window.GameCore.playerObj.visual.position;
            const encounterX = playerPosition.x + (Math.random() - 0.5) * 30;
            const encounterZ = playerPosition.z + (Math.random() - 0.5) * 30;
            const boss = instantiatePrefab('Dark Forest Boss', encounterX, window.WorldGenerator.getTerrainHeight(encounterX, encounterZ), encounterZ);
            if (boss) window.EventBus.emit('UI_LOG', 'A Dark Forest boss has emerged nearby!');
        }
        window.GameCore.worldTimer = 0; 
    }

    window.EngineParams.isPlayerSafe = false; 
    window.EngineParams.isPlayerHidden = false;

    if (window.GameCore.playerObj && window.GameState.pStats.hp > 0) {
        const playerPosition = window.GameCore.playerObj.visual.position;
        window.EngineParams.isPlayerHidden = window.GameCore.activeEntities.some(entity => entity.def.concealment && entity.visual.position.distanceTo(playerPosition) <= (entity.def.hideRadius || entity.def.radius));
        window.GameCore.activeEntities.forEach(entity => {
            if (!entity.def.touchEffect || entity.def.active === false) return;
            const touchRadius = entity.def.touchRadius || entity.def.radius + 1;
            if (entity.visual.position.distanceTo(playerPosition) <= touchRadius) {
                const now = performance.now() / 1000;
                if (!entity.touchEffectAvailableAt || now >= entity.touchEffectAvailableAt) {
                    entity.touchEffectAvailableAt = now + (entity.def.touchCooldown || 4);
                    window.EventBus.emit('SPAWN_HIT_VFX', { type: entity.def.touchEffect, pos: entity.visual.position.clone().add(new THREE.Vector3(0, 1, 0)) });
                    window.EventBus.emit('UI_LOG', 'Poison cloud released by the flesh pods.');
                }
            }
        });
    }

    if (window.GameCore.playerObj && window.GameState.pStats.hp > 0) {
        const p = window.GameCore.playerObj.body.translation(); window.EngineParams.isPlayerSafe = window.RoadManager.isSafeZone(p);
        
        const moveDir = new THREE.Vector3(0, 0, 0); 
        if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') {
            if (window.Input.keys.w) moveDir.z -= 1; 
            if (window.Input.keys.s) moveDir.z += 1; 
            if (window.Input.keys.a) moveDir.x -= 1; 
            if (window.Input.keys.d) moveDir.x += 1;
        }
        
        window.Input.isBlocking = window.Input.keys.shift; 
        window.Input.isMoving = moveDir.lengthSq() > 0;
        
        if (window.Input.isMoving) {
            moveDir.normalize(); moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), window.Input.camAngle); 
            
            let accelerationForce = 35 + (window.GameState.pStats.athletics.level * 0.5);
            
            if (window.Input.isBlocking) {
                accelerationForce *= 0.2; 
            } else {
                window.GameCore.addXP('athletics', 0.1 * delta); 
                if (window.Input.keys[' '] && window.Input.dashTimer <= 0) { 
                    window.Input.dashTimer = 2.0 - (window.GameState.pStats.dodge.level * 0.05); 
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
            const maxSpeed = window.Input.isBlocking ? 2.0 : 6.0;
            const flatVel = new THREE.Vector2(currentVel.x, currentVel.z);
            if (flatVel.length() > maxSpeed && !window.Input.isDashing) {
                flatVel.normalize().multiplyScalar(maxSpeed);
                window.GameCore.playerObj.body.setLinvel({ x: flatVel.x, y: currentVel.y, z: flatVel.y }, true);
            }

            if (!window.Input.isAttacking && !window.Input.isDashing && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
                if (window.Input.isBlocking) {
                    playEntityAnimation(window.GameCore.playerObj, 'block');
                } else {
                    window.GameCore.playerObj.visual.lookAt(window.GameCore.playerObj.visual.position.clone().add(moveDir)); 
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
        
        window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z); const target = window.GameCore.playerObj.visual.position.clone();
        if(isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) { target.set(0, 15, 0); }
        
        window.GameCore.camera.position.set(target.x + Math.sin(window.Input.camAngle)*Math.cos(window.Input.camPitch)*window.Input.camDistance, target.y + Math.sin(window.Input.camPitch)*window.Input.camDistance, target.z + Math.cos(window.Input.camAngle)*Math.cos(window.Input.camPitch)*window.Input.camDistance);
        window.GameCore.camera.lookAt(target);
    }
}

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta(); const delta = Math.min(rawDelta, 0.1) * window.EngineParams.timeScale;

    if (window.EngineParams.playMode && window.GameCore.engineState === 'running') {
        accumulator += delta;
        while (accumulator >= fixedTimeStep) { window.GameCore.world.step(); fixedUpdateLogic(fixedTimeStep); accumulator -= fixedTimeStep; }
        
        window.VFXManager.update(delta);
        window.EventBus.emit('AI_TICK', { delta, isPlayerSafe: window.EngineParams.isPlayerSafe });
        window.EventBus.emit('UI_TICK', { delta, camera: window.GameCore.camera });
        
        if (window.GameCore.playerObj && window.GameCore.playerObj.mixer) window.GameCore.playerObj.mixer.update(delta);
        window.GameCore.activeEntities.forEach(en => { if (en.mixer) en.mixer.update(delta); });
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
