import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from 'rapier';
import alea from 'alea';

window.THREE = THREE; 
window.SkeletonUtils = SkeletonUtils;
window.BufferGeometryUtils = BufferGeometryUtils;
window.RAPIER = RAPIER;

let renderer, clock, composer, ambientLight, dirLight;
const fixedTimeStep = 1.0 / 60.0; 
let accumulator = 0.0;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _e1 = new THREE.Euler();
const _m1 = new THREE.Matrix4();
const _colorScratch = new THREE.Color();

const _targetCamPos = new THREE.Vector3();
const _currentCamTarget = new THREE.Vector3();

function safeGetTerrainHeight(x, z) {
    if (!window.WorldGenerator?.getTerrainHeight) return 0;
    const h = window.WorldGenerator.getTerrainHeight(x, z);
    return Number.isFinite(h) ? h : 0;
}

// ==========================================
// LIGHT POOL SYSTEM
// ==========================================
const MAX_POOLED_LIGHTS = 8;
const lightPool = [];
const activeLightEmitters = [];

function initLightPool(scene) {
    lightPool.length = 0;
    for (let i = 0; i < MAX_POOLED_LIGHTS; i++) {
        const pl = new THREE.PointLight(0xffffff, 0, 10);
        pl.castShadow = false;
        pl.visible = false;
        scene.add(pl);
        lightPool.push(pl);
    }
}

function updateLightPool() {
    if (!window.GameCore?.playerObj?.visual) return;
    const pPos = window.GameCore.playerObj.visual.position;

    const validEmitters = [];
    for (let i = activeLightEmitters.length - 1; i >= 0; i--) {
        const emitter = activeLightEmitters[i];
        if (!emitter || !emitter.mesh || !emitter.mesh.parent) {
            activeLightEmitters.splice(i, 1);
            continue;
        }
        emitter.mesh.getWorldPosition(_v1);
        const distSq = _v1.distanceToSquared(pPos);
        if (distSq < 3600) {
            validEmitters.push({ emitter, pos: _v1.clone(), distSq });
        }
    }

    validEmitters.sort((a, b) => a.distSq - b.distSq);

    for (let i = 0; i < MAX_POOLED_LIGHTS; i++) {
        const pLight = lightPool[i];
        if (!pLight) continue;

        if (i < validEmitters.length) {
            const item = validEmitters[i];
            pLight.position.copy(item.pos);
            pLight.color.set(item.emitter.color);
            
            const distRatio = Math.sqrt(item.distSq) / 60.0;
            const fade = Math.max(0, 1.0 - distRatio);
            
            pLight.intensity = item.emitter.intensity * fade;
            pLight.distance = item.emitter.distance;
            pLight.visible = pLight.intensity > 0.01;
        } else {
            pLight.intensity = 0;
            pLight.visible = false;
        }
    }
}

// ==========================================
// SMOOTH CAMERA & SHADOW DRIVER
// ==========================================

function updateCameraAndShadows(delta) {
    if (!window.GameCore?.camera || !window.GameCore?.playerObj?.visual) return;

    const playerPos = window.GameCore.playerObj.visual.position;
    const dist = window.Input?.camDistance || 15;
    const pitch = window.Input?.camPitch || 0.4;
    const angle = window.Input?.camAngle || Math.PI;

    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (window.Input?.camShake > 0) {
        shakeX = (Math.random() - 0.5) * window.Input.camShake;
        shakeY = (Math.random() - 0.5) * window.Input.camShake;
        shakeZ = (Math.random() - 0.5) * window.Input.camShake;
        window.Input.camShake *= 0.9;
        if (window.Input.camShake < 0.01) window.Input.camShake = 0;
    }

    const targetX = playerPos.x + dist * Math.sin(angle) * Math.cos(pitch) + shakeX;
    const targetY = playerPos.y + 1.5 + dist * Math.sin(pitch) + shakeY;
    const targetZ = playerPos.z + dist * Math.cos(angle) * Math.cos(pitch) + shakeZ;

    const lerpFactor = Math.min(1.0, (delta || fixedTimeStep) * 16.0);
    _targetCamPos.set(targetX, targetY, targetZ);
    window.GameCore.camera.position.lerp(_targetCamPos, lerpFactor);

    _v1.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
    _currentCamTarget.lerp(_v1, lerpFactor);
    window.GameCore.camera.lookAt(_currentCamTarget);

    if (dirLight && dirLight.castShadow) {
        dirLight.target.position.copy(playerPos);
        dirLight.target.updateMatrixWorld();
    }
}

function updateWorldClock(delta) {
    if (!window.NetworkSession?.connected) {
        const hoursPerSecond = 24 / (window.EngineParams?.dayLengthSeconds || 1200);
        window.EngineParams.timeOfDay += delta * hoursPerSecond;
        if (window.EngineParams.timeOfDay >= 24) {
            const elapsedDays = Math.floor(window.EngineParams.timeOfDay / 24);
            window.EngineParams.timeOfDay %= 24;
            window.EngineParams.worldDay += elapsedDays;
            for (let day = 0; day < elapsedDays; day++) {
                processCompanionNeeds(); processBaseJobs();
                window.AdventurerManager?.advanceDay();
                window.GameState?.processCrowDay?.();
            }
            if (window.EngineParams.worldDay > 0 && window.EngineParams.worldDay % (window.EngineParams.cycleLengthDays || 14) === 0) regenerateWorldCycle();
        }
    }
    window.EventBus?.emit('ENV_UPDATE');
}

function updatePeriodicSystems() {
    if (window.VillageManager?.simulateNextVillage) {
        window.VillageManager.simulateNextVillage();
    }
    window.AdventurerManager?.syncDeparted();
    window.AdventurerManager?.syncNearby();
}

function updatePlayerStats(delta) {
    if (!window.GameState?.pStats || !window.Input) return;
    
    window.EngineParams.isPlayerSafe = false; 
    window.EngineParams.isPlayerHidden = false;
    const staminaMultiplier = 1 + (window.GameState.forestBlessing?.staminaRegen || 0);
    
    if (!window.Input.isSprinting && !window.Input.isBlocking) {
        window.GameState.pStats.stamina = Math.min(
            window.GameState.pStats.maxStamina, 
            window.GameState.pStats.stamina + 12 * staminaMultiplier * delta
        );
    }

    if (performance.now() >= (window.GameState.pStats.guardBrokenUntil || 0)) {
        window.GameState.pStats.poise = Math.min(window.GameState.pStats.maxPoise, window.GameState.pStats.poise + 10 * delta);
    }
    
    if (window.GameState.statusEffects) {
        window.GameState.statusEffects = window.GameState.statusEffects.filter(effect => {
            effect.remaining -= delta; effect.tickTimer -= delta;
            if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
                effect.tickTimer = 1;
                const resistance = window.GameCore?.getResistance?.(effect.type) || 0;
                const tickDamage = Math.max(1, effect.tickDamage - resistance);
                window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - tickDamage);
                window.EventBus?.emit('ENTITY_DAMAGED', { damage: tickDamage, position: window.GameCore.playerObj.visual.position, isPlayer: true });
            }
            return effect.remaining > 0;
        });
    }
}

function updateEntities(delta) {
    const playerAlive = window.GameCore?.playerObj && window.GameState?.pStats?.hp > 0;
    const playerPosition = playerAlive ? window.GameCore.playerObj.visual.position : null;
    const detectionRadiusSq = playerAlive ? Math.pow(window.GameState?.forestBlessing?.dangerSense ? 18 : 15, 2) : 0;
    const nowSecs = performance.now() / 1000;
    const camPos = window.GameCore?.camera ? window.GameCore.camera.position : _v1.set(0,0,0);
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);

    let isHidden = false;
    let hostileNearby = false;

    for (let i = (window.GameCore?.activeEntities?.length || 0) - 1; i >= 0; i--) {
        const entity = window.GameCore.activeEntities[i];
        if (!entity || !entity.visual || !entity.body) continue;
        
        try {
            const eTrans = entity.body.translation();
            const totalHeight = entity.def?.height || 2.0;
            entity.visual.position.set(eTrans.x, eTrans.y - (totalHeight / 2), eTrans.z);
        } catch (e) {
            entity.body = null;
            continue;
        }

        window.GameCore.SpatialGrid?.updateEntity?.(entity);
        window.VATManager?.processLOD?.(entity, camPos);

        if (entity.def?.type === 'npc' && entity.statusEffects?.length > 0 && entity.hp > 0) {
            processEntityStatusEffects(entity, delta);
        }

        if (entity.def?.type === 'npc' || entity.def?.type === 'character') {
            alignEntityToGround(entity, delta, raycaster, downVector);
        }

        if (playerAlive && entity.hp > 0) {
            const distSq = entity.visual.position.distanceToSquared(playerPosition);
            if (!isHidden && entity.def?.concealment) {
                const hideRad = entity.def.hideRadius || entity.def.radius;
                if (distSq <= hideRad * hideRad) isHidden = true;
            }
            if (entity.def?.touchEffect && entity.def?.active !== false) {
                const touchRad = entity.def.touchRadius || entity.def.radius + 1;
                if (distSq <= touchRad * touchRad) {
                    if (!entity.touchEffectAvailableAt || nowSecs >= entity.touchEffectAvailableAt) {
                        entity.touchEffectAvailableAt = nowSecs + (entity.def.touchCooldown || 4);
                        window.EventBus?.emit('SPAWN_HIT_VFX', { type: entity.def.touchEffect, pos: entity.visual.position.clone().add(_v1.set(0, 1, 0)) });
                        if (entity.def.touchEffect === 'Poison') window.GameCore.applyStatusEffect?.('poison', 6, 3);
                        window.EventBus?.emit('UI_LOG', 'Poison cloud released by the flesh pods.');
                    }
                }
            }
            if (!hostileNearby && entity.def?.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest')) {
                if (distSq < detectionRadiusSq) hostileNearby = true;
            }
        }
    }
    
    if (playerAlive && window.GameCore.playerObj.body) {
        window.EngineParams.isPlayerHidden = isHidden;
        try {
            const p = window.GameCore.playerObj.body.translation(); 
            window.EngineParams.isPlayerSafe = window.RoadManager?.isSafeZone?.(p) || window.CapitalCityManager?.isInsideCapital?.(p.x, p.z) || false;

            if (!window.EngineParams.isPlayerSafe && !window.EngineParams.isPlayerHidden && hostileNearby && !window.EngineParams.godMode && window.EngineParams.offPathCaptureCooldown <= 0) {
                const pathPoint = window.RoadManager?.getRandomPathPoint?.();
                if (pathPoint) {
                    ChunkManager.forceUpdatePosition(new THREE.Vector3(pathPoint.x, 0, pathPoint.z));
                    const safeY = safeGetTerrainHeight(pathPoint.x, pathPoint.z) + 5.0;
                    window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setTranslation({ x: pathPoint.x, y: safeY, z: pathPoint.z }, true);
                    window.EngineParams.offPathCaptureCooldown = 10;
                    window.EventBus?.emit('UI_LOG', 'The forest caught you off the safe path and dragged you back to the road.');
                }
            }
        } catch (e) {
            console.warn("Player translation query skipped.", e);
        }
    }
}

function processEntityStatusEffects(entity, delta) {
    if (!entity.statusEffects) return;
    for (let j = entity.statusEffects.length - 1; j >= 0; j--) {
        const effect = entity.statusEffects[j];
        effect.remaining -= delta; 
        effect.tickTimer -= delta;
        if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
            effect.tickTimer = 1;
            const resistance = window.GameCore?.getResistance?.(effect.type) || 0;
            const tickDamage = Math.max(1, effect.tickDamage - resistance);
            entity.hp = Math.max(0, entity.hp - tickDamage);
            window.EventBus?.emit('ENTITY_DAMAGED', { damage: tickDamage, position: entity.visual.position, isPlayer: false });
            window.EventBus?.emit('SPAWN_HIT_VFX', { type: effect.type === 'burning' ? 'Fire' : 'Void', pos: entity.visual.position });
            
            if (entity.hp <= 0) {
                handleEntityDeath(entity);
                break;
            }
        }
        if (effect.remaining <= 0) entity.statusEffects.splice(j, 1);
    }
}

function alignEntityToGround(entity, delta, raycaster, downVector) {
    if (!entity?.visual) return;
    const ePos = entity.visual.position;
    raycaster.set(_v1.set(ePos.x, ePos.y + 2, ePos.z), downVector);
    const activeMeshes = [];
    for (const chunk of ChunkManager.activeChunks.values()) {
        if (chunk.mesh) activeMeshes.push(chunk.mesh);
    }
    
    const intersects = raycaster.intersectObjects(activeMeshes, false);
    if (intersects.length > 0) {
        const hitNormal = intersects[0].face.normal;
        const targetQuaternion = _q1.setFromUnitVectors(_v2.set(0, 1, 0), hitNormal);
        const currentYRotation = _e1.setFromQuaternion(entity.visual.quaternion, 'YXZ').y;
        const yQuat = _q1.setFromAxisAngle(_v2.set(0, 1, 0), currentYRotation);
        
        targetQuaternion.multiply(yQuat);
        entity.visual.quaternion.slerp(targetQuaternion, delta * 5.0);
    }
}

function handleEntityDeath(entity) {
    playEntityAnimation(entity, 'die');
    window.AdventurerManager?.markDefeated?.(entity);
    
    if (entity.name === 'Deer') {
        window.CareerManager?.addXP?.('hunter', 25);
        window.EventBus?.emit('UI_LOG', `[HUNTER] You have harvested a deer carcass.`);
    }

    if (window.GameCore?.spawnGroundLoot) {
        const lootType = entity.name === 'Deer' ? 'food' : (entity.def?.faction === 'forest' ? 'corrupted_resin' : 'beast_bones');
        window.GameCore.spawnGroundLoot(lootType, entity.visual.position);
    }

    awardMonsterKill(entity);
    if (window.GameState?.inventory) {
        window.GameState.inventory.gold += entity.def?.faction === 'monster' ? 10 : 50;
    }
    window.EventBus?.emit('UI_UPDATE_HUD');
    
    setTimeout(() => {
        if (window.GameCore?.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(entity.id);
        if (window.GameCore?.releaseEntityIndex) window.GameCore.releaseEntityIndex(entity.memoryIndex);
        window.GameCore?.SpatialGrid?.unregisterEntity?.(entity);
        if (entity.visual && window.GameCore?.scene) window.GameCore.scene.remove(entity.visual);
        if (entity.body && window.GameCore?.world) {
            window.GameCore.world.removeRigidBody(entity.body);
            entity.body = null;
        }
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(candidate => candidate.id !== entity.id);
        }
    }, 2000);
}

function updatePlayerMovement(delta) {
    if (!window.Input || !window.GameCore?.playerObj?.visual || !window.GameCore.playerObj.body) return;
    
    let p;
    try {
        p = window.GameCore.playerObj.body.translation();
    } catch (e) {
        return;
    }

    const pDef = window.GameCore.playerObj.def || { height: 2 };
    const totalHeight = pDef.height || 2.0;
    window.GameCore.playerObj.visual.position.set(p.x, p.y - (totalHeight / 2), p.z);

    const moveDir = _v1.set(0, 0, 0); 
    if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') {
        if (window.Input.keys?.w) moveDir.z -= 1; 
        if (window.Input.keys?.s) moveDir.z += 1; 
        if (window.Input.keys?.a) moveDir.x -= 1; 
        if (window.Input.keys?.d) moveDir.x += 1;
    }

    window.Input.isBlocking = window.Input.keys?.shift && (window.GameState?.pStats?.stamina || 0) > 0 && performance.now() >= (window.GameState?.pStats?.guardBrokenUntil || 0); 
    window.Input.isMoving = moveDir.lengthSq() > 0;

    const currentVel = window.GameCore.playerObj.body.linvel();

    if (window.Input.isMoving) {
        moveDir.normalize().applyAxisAngle(_v2.set(0, 1, 0), window.Input.camAngle || Math.PI); 
        
        const BASE_STARTING_SPEED = 1609.344 / 900.0; 
        const athleticsLvl = window.GameState?.pStats?.athletics?.level || 0;
        const athleticsBonus = window.GameCore?.getBuffBonus?.('athletics') || 0;
        
        const speedMultiplier = 1.0 + (athleticsLvl * 0.05) + (athleticsBonus * 0.05);
        let maxSpeed = BASE_STARTING_SPEED * speedMultiplier;

        const isSpaceHeld = window.Input.keys?.[' '];
        const canSprint = isSpaceHeld && (window.GameState?.pStats?.stamina || 0) > 0 && !window.Input.isBlocking;
        window.Input.isSprinting = canSprint;

        if (window.Input.isBlocking) {
            maxSpeed *= 0.3; 
            if (window.GameState?.pStats) window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 8 * delta);
        } else if (window.Input.isSprinting) {
            maxSpeed *= 1.75; 
            if (window.GameState?.pStats) window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 15 * delta); 
            window.GameCore?.addXP?.('athletics', 0.25 * delta);
        } else {
            window.GameCore?.addXP?.('athletics', 0.05 * delta); 
        }

        maxSpeed *= (window.GameCore?.getCombatInjuryMultiplier?.() || 1.0);

        window.GameCore.playerObj.body.setLinvel({
            x: moveDir.x * maxSpeed,
            y: currentVel.y,
            z: moveDir.z * maxSpeed
        }, true);

        if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
            if (window.Input.isBlocking) {
                playEntityAnimation(window.GameCore.playerObj, 'block');
            } else {
                const targetFacing = _v2.copy(window.GameCore.playerObj.visual.position).add(moveDir);
                _m1.lookAt(window.GameCore.playerObj.visual.position, targetFacing, _v3.set(0,1,0));
                const targetYRot = _e1.setFromRotationMatrix(_m1).y;
                
                const euler = _e1.setFromQuaternion(window.GameCore.playerObj.visual.quaternion, 'YXZ');
                euler.y = targetYRot;
                window.GameCore.playerObj.visual.quaternion.setFromEuler(euler);
                playEntityAnimation(window.GameCore.playerObj, 'walk'); 
            }
        }
    } else if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
        window.Input.isSprinting = false;
        window.GameCore.playerObj.body.setLinvel({
            x: currentVel.x * 0.8,
            y: currentVel.y,
            z: currentVel.z * 0.8
        }, true);

        if (window.Input.isBlocking) {
            playEntityAnimation(window.GameCore.playerObj, 'block');
        } else {
            playEntityAnimation(window.GameCore.playerObj, 'idle'); 
        }
    }

    if (window.Input.dashTimer > 0) window.Input.dashTimer -= delta; 
    if (window.Input.attackCooldown > 0) window.Input.attackCooldown -= delta; 
    else window.Input.isAttacking = false;
}

// ==========================================
// CHUNK & SCENERY MANAGERS
// ==========================================

let _lastChunkCheckPos = new THREE.Vector3(Infinity, Infinity, Infinity);

const ChunkManager = {
    activeChunks: new Map(), currentChunkX: null, currentChunkZ: null,
    instancedMeshes: new Map(),

    forceUpdatePosition: function(playerPos) {
        if (window.EngineParams?.suppressChunkLoading || !playerPos) return;
        _lastChunkCheckPos.set(playerPos.x, 0, playerPos.z);
        const cx = Math.floor(playerPos.x / 60); 
        const cz = Math.floor(playerPos.z / 60);
        this.currentChunkX = cx; 
        this.currentChunkZ = cz; 
        this.loadChunksAround(cx, cz);
    },

    update: function(playerPos) {
        if (window.EngineParams?.suppressChunkLoading || !playerPos) return;
        
        const dx = playerPos.x - _lastChunkCheckPos.x;
        const dz = playerPos.z - _lastChunkCheckPos.z;
        if ((dx * dx + dz * dz) < 25) return; 
        _lastChunkCheckPos.set(playerPos.x, 0, playerPos.z);

        const cx = Math.floor(playerPos.x / 60); 
        const cz = Math.floor(playerPos.z / 60);
        if (cx !== this.currentChunkX || cz !== this.currentChunkZ) { 
            this.currentChunkX = cx; 
            this.currentChunkZ = cz; 
            this.loadChunksAround(cx, cz); 
        }
    },
    loadChunksAround: function(cx, cz) {
        const expectedChunks = new Set();
        
        for (let x = cx - 10; x <= cx + 10; x++) { 
            for (let z = cz - 10; z <= cz + 10; z++) { 
                const dist = Math.max(Math.abs(x - cx), Math.abs(z - cz));
                const key = `${x},${z}`; 
                
                if (dist <= 10) {
                    expectedChunks.add(key);
                    
                    let targetLod = 'C';
                    if (dist <= 1) targetLod = 'A';
                    else if (dist <= 3) targetLod = 'B';
                        
                    if (!this.activeChunks.has(key)) {
                        this.generateChunk(x, z, targetLod);
                    } else {
                        const chunk = this.activeChunks.get(key);
                        if (chunk.lod !== targetLod) {
                            this.unloadChunk(key);
                            this.generateChunk(x, z, targetLod);
                        }
                    }
                } 
            } 
        }

        const toRemove = [];
        for (const key of this.activeChunks.keys()) {
            if (!expectedChunks.has(key)) toRemove.push(key);
        }
        toRemove.forEach(k => this.unloadChunk(k));
    },
    generateChunk: function(cx, cz, lod = 'A') {
        const key = `${cx},${cz}`; 
        const chunkX = cx * 60 + 30; 
        const chunkZ = cz * 60 + 30;

        const isInsideAethelgard = window.CapitalCityManager?.isInsideCapital?.(chunkX, chunkZ) || false;
        
        const segments = lod === 'A' ? 30 : (lod === 'B' ? 10 : 2);
        const geo = new THREE.PlaneGeometry(60, 60, segments, segments); 
        geo.rotateX(-Math.PI / 2);

        const vertices = geo.attributes.position.array; 
        const colors = [];
        const roadEdgeData = new Float32Array(geo.attributes.position.count);
        const localRoadPoints = window.RoadManager?.getRoadPointsNear?.(cx, cz) || []; 
        const ROAD_WIDTH = 5;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + chunkX; 
            const vz = vertices[i+2] + chunkZ;
            
            let c = _colorScratch;

            if (isInsideAethelgard) {
                vertices[i+1] = 0; 
                c.set('#1e293b'); 
            } else {
                const biomeKey = window.WorldGenerator?.getBiome?.(vx, vz) || 'plains'; 
                const biome = window.WorldGenConfig?.biomes?.[biomeKey] || { color: '#4ade80' }; 
                c.set(biome.color);
                
                let minRoadDistSq = 999999;
                for(let r=0; r<localRoadPoints.length; r++) { 
                    const dx = vx - localRoadPoints[r].x;
                    const dz = vz - localRoadPoints[r].z;
                    const distSq = (dx * dx) + (dz * dz);
                    if(distSq < minRoadDistSq) minRoadDistSq = distSq; 
                }
                const minRoadDist = Math.sqrt(minRoadDistSq);
                if(minRoadDist < ROAD_WIDTH + 2) { 
                    const dirtInfluence = Math.max(0, 1.0 - (minRoadDist / (ROAD_WIDTH + 2))); 
                    c.lerp(_colorScratch.set('#38281d'), dirtInfluence); 
                }

                vertices[i+1] = safeGetTerrainHeight(vx, vz); 
                
                let edgeGlow = 0.0;
                const distFromEdge = Math.abs(minRoadDist - ROAD_WIDTH);
                if (distFromEdge < 1.2) {
                    edgeGlow = Math.pow(1.0 - (distFromEdge / 1.2), 2.0);
                }
                roadEdgeData[i / 3] = edgeGlow;
            }

            const colorNoise = window.currentNoise2D ? window.currentNoise2D(vx * 0.1, vz * 0.1) * 0.05 : 0; 
            c.r += colorNoise; c.g += colorNoise; c.b += colorNoise;
            colors.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); 
        geo.setAttribute('roadEdge', new THREE.BufferAttribute(roadEdgeData, 1));
        geo.attributes.position.needsUpdate = true; 
        geo.computeVertexNormals();
        
        const normalArray = geo.attributes.normal.array;
        
        const clutterData = new Float32Array(geo.attributes.position.count);
        const noiseFn = window.WorldGenerator?.getNoise || (() => 0);

        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + chunkX; 
            const vz = vertices[i+2] + chunkZ;
            clutterData[i/3] = isInsideAethelgard ? 0 : noiseFn(vx * 0.5, vz * 0.5); 
            
            const hL = safeGetTerrainHeight(vx - 0.1, vz);
            const hR = safeGetTerrainHeight(vx + 0.1, vz);
            const hD = safeGetTerrainHeight(vx, vz - 0.1);
            const hU = safeGetTerrainHeight(vx, vz + 0.1);
            const n = _v1.set(hL - hR, 0.2, hD - hU).normalize();
            normalArray[i] = n.x;
            normalArray[i+1] = n.y;
            normalArray[i+2] = n.z;
        }
        geo.setAttribute('clutter', new THREE.BufferAttribute(clutterData, 1));
        geo.attributes.normal.needsUpdate = true;

        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 });
        
        mat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `#include <common>
                 attribute float clutter;
                 attribute float roadEdge;
                 varying float vClutter;
                 varying float vRoadEdge;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vClutter = clutter;
                 vRoadEdge = roadEdge;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 varying float vClutter;
                 varying float vRoadEdge;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 vec3 grassColor = vec3(0.1, 0.3, 0.1);
                 diffuseColor.rgb = mix(diffuseColor.rgb, grassColor, vClutter * 0.4);
                 vec3 pathGlowColor = vec3(0.1, 0.75, 1.0);
                 diffuseColor.rgb += pathGlowColor * vRoadEdge * 2.5;`
            );
        };
        
        const mesh = new THREE.Mesh(geo, mat);  
        mesh.position.set(chunkX, 0, chunkZ); 
        mesh.receiveShadow = true; 
        mesh.userData.isTerrain = true; 
        mesh.userData.chunkKey = key; 
        if (window.GameCore?.scene) window.GameCore.scene.add(mesh);

        const physicsVertices = new Float32Array(vertices); 
        const indicesU32 = new Uint32Array(geo.index.array); 

        let groundBody = null;
        let collider = null;
        if (window.GameCore?.world) {
            groundBody = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(chunkX, 0, chunkZ));
            collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.trimesh(physicsVertices, indicesU32), groundBody);
        }
        this.activeChunks.set(key, { mesh, body: groundBody, collider, lod });
        
        if (isInsideAethelgard) {
            window.EventBus?.emit('CHUNK_GENERATED');
            return;
        }

        const chunkData = window.ForestManager?.generateChunk?.(cx, cz) || { tierA: [], tierB: [] };
        
        if (window.ForestRenderer?.setChunkInstances) {
            const redwoodPoints = [];
            const bushPoints = [];

            chunkData.tierA.forEach(point => {
                const px = point.x;
                const pz = point.z;
                const py = safeGetTerrainHeight(px, pz);
                redwoodPoints.push({ x: px, y: py, z: pz, scale: 0.8 + Math.random() * 0.4, rotation: Math.random() * Math.PI * 2 });
            });

            chunkData.tierB.forEach(point => {
                const px = point.x;
                const pz = point.z;
                const py = safeGetTerrainHeight(px, pz);
                bushPoints.push({ x: px, y: py, z: pz, scale: 0.7 + Math.random() * 0.5, rotation: Math.random() * Math.PI * 2 });
            });

            window.ForestRenderer.setChunkInstances(key, 'Redwood Tree', redwoodPoints);
            window.ForestRenderer.setChunkInstances(key, 'Bramble Bush', bushPoints);

            if (lod === 'A' && window.GameCore?.world) {
                redwoodPoints.forEach(pt => {
                    const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pt.x, pt.y + 15.0, pt.z));
                    window.GameCore.world.createCollider(RAPIER.ColliderDesc.cylinder(15.0, 1.8), body);
                    if (!this.activeChunks.get(key).instanceBodies) this.activeChunks.get(key).instanceBodies = [];
                    this.activeChunks.get(key).instanceBodies.push(body);
                });
            }
        }

        window.EventBus?.emit('CHUNK_GENERATED');
    },
    unloadChunk: function(key) {
        const chunk = this.activeChunks.get(key); if(!chunk) return;
        chunk.mesh.geometry.dispose(); chunk.mesh.material.dispose(); 
        if (window.GameCore?.scene) window.GameCore.scene.remove(chunk.mesh); 
        if (chunk.body && window.GameCore?.world) {
            window.GameCore.world.removeRigidBody(chunk.body);
            chunk.body = null;
        }

        if (window.ForestRenderer?.clearChunkInstances) {
            window.ForestRenderer.clearChunkInstances(key);
        }
        
        const instances = this.instancedMeshes.get(key);
        if (instances) {
            instances.forEach(imesh => {
                imesh.geometry.dispose(); imesh.material.dispose(); 
                if (window.GameCore?.scene) window.GameCore.scene.remove(imesh);
            });
            this.instancedMeshes.delete(key);
        }
        if (chunk.instanceBodies && window.GameCore?.world) {
            chunk.instanceBodies.forEach(body => {
                if (body) window.GameCore.world.removeRigidBody(body);
            });
            chunk.instanceBodies = [];
        }

        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => { 
                if(en.chunkKey === key) { 
                    if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(en.id);
                    if (window.GameCore.releaseEntityIndex) window.GameCore.releaseEntityIndex(en.memoryIndex);
                    window.GameCore.SpatialGrid?.unregisterEntity?.(en);
                    if (en.visual && window.GameCore.scene) window.GameCore.scene.remove(en.visual); 
                    if (en.body && window.GameCore.world) {
                        window.GameCore.world.removeRigidBody(en.body); 
                        en.body = null;
                    }
                    return false; 
                } 
                return true; 
            });
        }
        this.activeChunks.delete(key);
        window.EventBus?.emit('CHUNK_UNLOADED');
    }
};

function getVisualMesh(def) {
    let meshGroup = new THREE.Group();
    
    if (def.customModel && window.AssetManager?.models?.[def.customModel]) {
        const sourceModel = window.AssetManager.models[def.customModel];
        const clone = window.SkeletonUtils.clone(sourceModel);
        
        clone.position.y = 0;
        if (def.scale) clone.scale.setScalar(def.scale);

        clone.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) child.material = child.material.clone();
            }
        });

        meshGroup.add(clone);

    } else if (def.type === 'redwood' || def.name === 'Redwood Tree') {
        const trunkHeight = 20.0;
        const trunkRadiusBottom = 1.8;
        const trunkRadiusTop = 1.1;
        const coneHeight = 14.0;
        const coneRadius = 5.5;
        const overlap = 3.5;

        const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a2817, roughness: 0.9 });
        const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
        trunkMesh.position.y = trunkHeight / 2;
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        meshGroup.add(trunkMesh);

        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x173820, roughness: 0.8 });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.y = trunkHeight + (coneHeight / 2) - overlap;
        coneMesh.castShadow = true;
        coneMesh.receiveShadow = true;
        meshGroup.add(coneMesh);

    } else {
        if (def.type === 'character' || def.type === 'npc') {
            const h = def.height || 2.0;
            const r = def.radius || 0.5;

            const legs = new THREE.Mesh(
                new THREE.BoxGeometry(r * 0.8, h * 0.3, r * 0.8),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            legs.position.y = h * 0.15;
            legs.castShadow = true; legs.receiveShadow = true;
            meshGroup.add(legs);

            const torso = new THREE.Mesh(
                new THREE.BoxGeometry(r * 1.5, h * 0.5, r * 1.2),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            torso.position.y = h * 0.55;
            torso.castShadow = true; torso.receiveShadow = true;
            meshGroup.add(torso);

            const head = new THREE.Mesh(
                new THREE.BoxGeometry(r, r, r),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            head.position.y = h * 0.85;
            head.castShadow = true; head.receiveShadow = true;
            meshGroup.add(head);
        } else {
            let mesh; 
            const h = def.height || 2.0;
            if(def.type === 'structure' || def.type === 'hub') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(def.radius*2, h, def.radius*2), new THREE.MeshStandardMaterial({ color: def.color || 0x888888 }));
                mesh.position.y = h / 2;
            } else if(def.type === 'mountain') {
                mesh = new THREE.Mesh(new THREE.ConeGeometry(def.radius, h, 16), new THREE.MeshStandardMaterial({ color: def.color || 0x444444 }));
                mesh.position.y = h / 2;
            } else {
                mesh = new THREE.Mesh(new THREE.CylinderGeometry(def.radius, def.radius, h, 8), new THREE.MeshStandardMaterial({ color: def.color || 0x666666 }));
                mesh.position.y = h / 2;
            }
            mesh.castShadow = true; mesh.receiveShadow = true; 
            meshGroup.add(mesh);
        }
    }
    return meshGroup;
}

function playEntityAnimation(entity, state) {
    if (window.GameCore?.AnimationSystem) {
        window.GameCore.AnimationSystem.transitionTo(entity, state);
        return;
    }
    if (!entity.mixer || !entity.actions || !entity.actions[state]) return; 
    if (entity.currentAnimState === 'die') return;
    if (entity.currentAnimState === state) return; 
    
    const newAction = entity.actions[state]; 
    const oldAction = entity.currentAnimState ? entity.actions[entity.currentAnimState] : null;
    newAction.reset(); 
    newAction.play(); 
    if (oldAction) newAction.crossFadeFrom(oldAction, 0.35, true); 
    entity.currentAnimState = state;
    
    if (state === 'attack' || state === 'dash' || state === 'hit') { 
        entity.mixer.addEventListener('finished', function restoreIdle(e) { 
            if (e.action === newAction) { 
                entity.mixer.removeEventListener('finished', restoreIdle); 
                if(entity.hp > 0) {
                    if (window.Input?.isBlocking && entity.def?.faction === 'player') {
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
    const def = isPlayer ? window.AssetManager?.prefabs?.['Player'] : entity.def; 
    if (!def?.customModel) return;
    
    let clips = window.AssetManager?.animations?.[def.customModel] || [];
    clips = clips.concat(window.AssetManager?.globalAnimations || []);
    if (clips.length === 0) return;

    if (window.GameCore?.AnimationSystem) {
        window.GameCore.AnimationSystem.initEntity(entity, entity.visual, clips);
        return;
    }

    entity.mixer = new THREE.AnimationMixer(entity.visual); entity.actions = {}; entity.currentAnimState = null; 
    
    const states = ['idle', 'walk', 'attack', 'block', 'dash', 'hit', 'die'];
    states.forEach(state => {
        if (def.animMap?.[state] && def.animMap[state] !== 'None') {
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
    const def = window.AssetManager?.prefabs?.[name]; if(!def) return;
    let mesh = getVisualMesh(def);
    
    const height = def.height || 2.0;
    const halfHeight = height / 2.0;
    const spawnY = y + halfHeight;

    mesh.position.set(x, y, z); 
    if (window.GameCore?.scene) window.GameCore.scene.add(mesh);

    let rigidBodyDesc = (def.type === 'structure' || def.type === 'hub' || def.type === 'mountain' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic().lockRotations();
    
    if(def.type !== 'structure' && def.type !== 'hub' && def.type !== 'mountain' && def.type !== 'runeTower' && def.type !== 'powerStone' && def.type !== 'firePit' && def.type !== 'streetLight' && def.type !== 'merchantChest') {
        rigidBodyDesc.setLinearDamping(4.0);
    }
    
    rigidBodyDesc.setTranslation(x, spawnY, z); 
    let body = window.GameCore?.world ? window.GameCore.world.createRigidBody(rigidBodyDesc) : null;
    
    let collider = null;
    if (def.isObstacle !== false && body && window.GameCore?.world) {
        let colliderDesc; 
        if (def.type === 'structure' || def.type === 'hub' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') colliderDesc = RAPIER.ColliderDesc.cuboid(def.radius, def.height/2, def.radius); 
        else if (def.type === 'mountain') colliderDesc = RAPIER.ColliderDesc.cone(def.height/2, def.radius); 
        else colliderDesc = RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius);
        collider = window.GameCore.world.createCollider(colliderDesc, body);
    }

    const entity = { id: Math.random().toString(36).substr(2, 9), name: name, def: def, visual: mesh, body: body, collider: collider, chunkKey: chunkKey };
    
    if (window.GameCore?.bindEntityToBuffer) {
        window.GameCore.bindEntityToBuffer(entity, def.hp || 50, def.poise || 30);
    }

    if(collider) collider.handle = Math.floor(Math.random() * 1000000); 
    if(body) body.userData = { entityId: entity.id };
    
    if (def.type === 'hub') { 
        activeLightEmitters.push({ mesh, color: def.color || 0xffd700, intensity: 2, distance: 15 });
        entity.ap = 0; entity.food = 100; 
    }
    if (def.type === 'arcaneDoor') { 
        activeLightEmitters.push({ mesh, color: 0x6366f1, intensity: 3, distance: 10 });
    }
    if (def.type === 'merchantChest' && def.merchantInventory) {
        entity.merchantInventory = def.merchantInventory.map(item => ({ ...item }));
    }
    if (def.type === 'powerStone') { 
        activeLightEmitters.push({ mesh, color: 0x7dd3fc, intensity: def.active === false ? 0.2 : 3, distance: 25 });
    }
    if (def.type === 'firePit') { 
        activeLightEmitters.push({ mesh, color: 0xff8a32, intensity: def.active === false ? 0 : 2.5, distance: 12 });
    }
    if (def.type === 'streetLight') { 
        activeLightEmitters.push({ mesh, color: 0x9bdcff, intensity: def.active === false ? 0 : 2.5, distance: 18 });
    }

    setupEntityAnimations(entity); 
    if (window.VFXManager?.applyAura) window.VFXManager.applyAura(entity, def); 
    
    window.GameCore.SpatialGrid?.registerEntity?.(entity);

    if (def.faction === 'monster' || def.faction === 'forest') {
        entity.lastFedDay = window.EngineParams?.worldDay || 0;
        entity.hungerLevel = 0;
        entity.isFeral = false;
    }

    if (window.GameCore?.activeEntities) window.GameCore.activeEntities.push(entity);
    if (window.GameState?.narrator && !window.GameState.narrator.targetId && (def.faction === 'village' || def.faction === 'adventurer')) {
        window.GameState.narrator.targetId = entity.id;
        window.GameState.narrator.targetName = entity.name;
        applyForestBlessing(entity);
        window.EventBus?.emit('UI_LOG', `[THE CROW] It chooses ${entity.name} as the story's main character.`);
    }
    return entity;
}
window.GameCore.instantiatePrefab = instantiatePrefab;
window.GameCore.ChunkManager = ChunkManager;

function spawnPlayer(x, y, z) {
    const def = window.AssetManager?.prefabs?.['Player'] || { height: 2, radius: 0.5 };
    const halfHeight = (def.height || 2) / 2;
    const spawnY = y + halfHeight + 0.1;

    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .lockRotations()
        .setTranslation(x, spawnY, z)
        .setCcdEnabled(true)
        .setLinearDamping(2.0);
    
    let body = window.GameCore?.world ? window.GameCore.world.createRigidBody(rigidBodyDesc) : null;
    let collider = (body && window.GameCore?.world) ? window.GameCore.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius), body) : null;
    
    window.GameCore.playerObj = { visual: getVisualMesh(def), body: body, collider: collider, def: def };
    
    if (window.GameCore?.bindEntityToBuffer) {
        window.GameCore.bindEntityToBuffer(window.GameCore.playerObj, window.GameState?.pStats?.maxHp || 100, window.GameState?.pStats?.maxPoise || 100);
        
        const pMemIdx = window.GameCore.playerObj.memoryIndex * 4;
        if (window.GameState?.pStats) {
            Object.defineProperties(window.GameState.pStats, {
                'hp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 0], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 0] = v; } },
                'maxHp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 1], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 1] = v; } },
                'poise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 2], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 2] = v; } },
                'maxPoise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 3], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 3] = v; } }
            });
        }
    }

    const p = body ? body.translation() : {x, y: spawnY, z}; 
    window.GameCore.playerObj.visual.position.set(p.x, p.y - halfHeight, p.z); 
    if (window.GameCore?.scene) window.GameCore.scene.add(window.GameCore.playerObj.visual);
    setupEntityAnimations(window.GameCore.playerObj, true); 
    if (window.VFXManager?.applyAura) window.VFXManager.applyAura(window.GameCore.playerObj, def);
    
    window.GameCore.playerObj.node_id = 'player_node';
}

function fixedUpdateLogic(delta) {
    if (window.GameCore?.playerObj) ChunkManager.update(window.GameCore.playerObj.visual.position);
    if (window.EngineParams?.offPathCaptureCooldown > 0) window.EngineParams.offPathCaptureCooldown = Math.max(0, window.EngineParams.offPathCaptureCooldown - delta);
    
    window.GameCore.worldTimer += delta;

    updateWorldClock(delta);
    
    if (window.GameCore.worldTimer > 0.25) { 
        updatePeriodicSystems();
        updateLightPool(); 
        
        const checkInterval = (4 / 24) * (window.EngineParams?.dayLengthSeconds || 1200); 
        if (!window.GameCore.lastNeedsCheck || window.GameCore.worldTimerAbsolute > window.GameCore.lastNeedsCheck + checkInterval) {
             processCompanionNeeds();
             window.GameCore.lastNeedsCheck = window.GameCore.worldTimerAbsolute || 0;
        }

        window.GameCore.worldTimer = 0; 
    }

    window.GameCore.worldTimerAbsolute = (window.GameCore.worldTimerAbsolute || 0) + delta;

    window.ArenaTestManager?.update?.(delta);
    window.VATManager?.update?.(delta);
    window.EncounterDirector?.update?.(delta);
    if (window.GameCore?.AnimationSystem) window.GameCore.AnimationSystem.update(delta);
    if (window.ForestRenderer) window.ForestRenderer.update(delta);

    updatePlayerStats(delta);
    updateEntities(delta);

    if (window.RenderOptimizer && window.GameCore?.camera) {
        window.RenderOptimizer.updateEntityLOD(window.GameCore.activeEntities || [], window.GameCore.camera.position);
    }

    updatePlayerMovement(delta);
    updateCombatHitboxes(delta);
}

// RESTORED EVENT BUS LISTENERS
window.EventBus?.on('PRIMARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(); });
window.EventBus?.on('SECONDARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(true); });
window.EventBus?.on('GUARDBREAKER', performGuardbreaker);

window.EventBus?.on('GAME_STARTED', () => {
    // 1. Force Capital City Generation
    if (window.CapitalCityManager && !window.CapitalCityManager.isGenerated) {
        window.CapitalCityManager.generateCapital();
    }
    
    // 2. Clear all potentially corrupted boot chunks and explicitly rebuild them 
    //    now that we are 100% sure window.WorldGenerator and RoadManager are fully loaded.
    if (window.GameCore?.playerObj && window.GameCore.playerObj.body) {
        ChunkManager.activeChunks.forEach((chunk, key) => ChunkManager.unloadChunk(key));
        ChunkManager.currentChunkX = null;
        ChunkManager.currentChunkZ = null;
        
        const p = window.GameCore.playerObj.visual.position;
        ChunkManager.forceUpdatePosition(new THREE.Vector3(p.x, 0, p.z));
    }
    
    window.EventBus.emit('UI_LOG', "World Simulation Engaged. Wilderness Synchronized.");
});

// BOOT ENGINE
async function bootEngine() {
    try {
        document.getElementById('loading-bar').style.width = "50%"; 
        await RAPIER.init(); 
        document.getElementById('loading-bar').style.width = "100%"; document.getElementById('loading-container').classList.add('hidden'); document.getElementById('btn-start').classList.remove('hidden');
        
        window.GameCore.scene = new THREE.Scene(); window.GameCore.scene.fog = new THREE.FogExp2(0x040608, 0.00008); window.GameCore.scene.background = new THREE.Color(0x040608);
        window.GameCore.camera = new THREE.PerspectiveCamera(60, (window.innerWidth || 800) / (window.innerHeight || 600), 0.1, 2000000); 

        initLightPool(window.GameCore.scene);

        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); 
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); 
        renderer.setSize(window.innerWidth || 800, window.innerHeight || 600); 
        renderer.shadowMap.enabled = true; 
        renderer.shadowMap.type = THREE.PCFShadowMap; 
        renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        renderer.toneMappingExposure = 1.25; 
        document.body.appendChild(renderer.domElement);

        window.RenderOptimizer?.prewarmShaders?.(renderer, window.GameCore.scene, window.GameCore.camera);

        window.GameCore.pocketScene = new THREE.Scene();
        window.GameCore.pocketScene.background = new THREE.Color(0x020617);
        const pAmbient = new THREE.AmbientLight(0xffffff, 0.8);
        window.GameCore.pocketScene.add(pAmbient);
        const pPoint = new THREE.PointLight(0x6366f1, 5, 50);
        pPoint.position.set(0, 10, 0);
        window.GameCore.pocketScene.add(pPoint);

        if (window.ForestRenderer) {
            window.ForestRenderer.ensureAssets();
            window.GameCore.scene.add(window.ForestRenderer.group);
        }
        if (window.BillboardManager) {
            window.GameCore.scene.add(window.BillboardManager.group);
        }

        const roomGeo = new THREE.BoxGeometry(20, 10, 20);
        const roomMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.BackSide });
        const roomMesh = new THREE.Mesh(roomGeo, roomMat);
        roomMesh.position.y = 5;
        window.GameCore.pocketScene.add(roomMesh);
          
        clock = new THREE.Clock(); window.GameCore.world = new RAPIER.World({ x: 0.0, y: -20.0, z: 0.0 });
  
        // 128,000 SQ MILE CIRCULAR BASIN BOUNDED BY EVEREST-SCALE MOUNTAINS (2,000,000m x 2,000,000m)
        const horizonGeo = new THREE.PlaneGeometry(2000000, 2000000, 512, 512); 
        horizonGeo.rotateX(-Math.PI / 2);
          
        const horizonMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                worldSeed: { value: 1337.0 },
                sunPos: { value: new THREE.Vector3(0, 1, 0) },
                fogColor: { value: new THREE.Color(0x94a3b8) }
            },
            vertexShader: `
                varying float vHeight;
                varying vec3 vWorldPos;
                  
                float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
                float noise(vec2 p) {
                    vec2 i = floor(p); vec2 f = fract(p);
                    vec2 u = f*f*(3.0-2.0*f);
                    return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
                               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
                }

                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPos = worldPosition.xyz;
                      
                    float dist = length(worldPosition.xz);
                    
                    float mountainMask = smoothstep(315000.0, 345000.0, dist); 
                      
                    vec2 p = worldPosition.xz;
                    float h = noise(p * 0.000005) * 8800.0;
                    h += (1.0 - abs(noise(p * 0.00002) * 2.0 - 1.0)) * 4500.0;
                    h += noise(p * 0.0001) * 1200.0;
                      
                    worldPosition.y += h * mountainMask;
                    vHeight = h * mountainMask;
                      
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                varying float vHeight;
                varying vec3 vWorldPos;
                uniform vec3 sunPos;
                uniform vec3 fogColor;

                void main() {
                    vec3 rockColor = vec3(0.05, 0.07, 0.10);
                    vec3 peakColor = vec3(0.18, 0.22, 0.28);
                    vec3 snowColor = vec3(0.85, 0.90, 0.96);

                    vec3 color = mix(rockColor, peakColor, clamp(vHeight / 4000.0, 0.0, 1.0));
                    
                    float snowMask = smoothstep(4200.0, 6500.0, vHeight);
                    color = mix(color, snowColor, snowMask);

                    float dist = length(vWorldPos.xz);
                    float fogFactor = smoothstep(50000.0, 900000.0, dist);
                      
                    gl_FragColor = vec4(mix(color, fogColor, fogFactor * 0.80), 1.0);
                }
            `
        });
          
        const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
        horizonMesh.position.y = -5; 
        window.GameCore.scene.add(horizonMesh);
        window.GameCore.horizonMaterial = horizonMat;

        ambientLight = new THREE.AmbientLight(0xffffff, 1.5); window.GameCore.scene.add(ambientLight);

        dirLight = new THREE.DirectionalLight(0xffffff, 2.5); 
        dirLight.position.set(20, 60, 20); 
        dirLight.castShadow = true; 
        
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        
        dirLight.shadow.camera.left = -150; 
        dirLight.shadow.camera.right = 150; 
        dirLight.shadow.camera.top = 150; 
        dirLight.shadow.camera.bottom = -150; 
        dirLight.shadow.bias = -0.0005;
        window.GameCore.scene.add(dirLight);

        composer = new EffectComposer(renderer); 
        const worldPass = new RenderPass(window.GameCore.scene, window.GameCore.camera);
        const pocketPass = new RenderPass(window.GameCore.pocketScene, window.GameCore.camera);
        composer.addPass(worldPass);

        window.EventBus?.on('SCENE_SWAP', ({ target, pos }) => {
            if (target === 'establishment') {
                composer.removePass(worldPass);
                composer.insertPass(pocketPass, 0);
                  
                if (window.GameCore.playerObj && window.GameCore.playerObj.body) {
                    window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setTranslation({ x: 0, y: 3, z: 0 }, true);
                    if (window.EngineParams) window.EngineParams.suppressChunkLoading = true;
                }
            } else if (target === 'world') {
                composer.removePass(pocketPass);
                composer.insertPass(worldPass, 0);
                  
                if (window.GameCore.playerObj && window.GameCore.playerObj.body && pos) {
                    ChunkManager.forceUpdatePosition(new THREE.Vector3(pos.x, 0, pos.z));
                    const groundY = safeGetTerrainHeight(pos.x, pos.z) + 5.0;
                    window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    window.GameCore.playerObj.body.setTranslation({ x: pos.x, y: groundY, z: pos.z }, true);
                    if (window.EngineParams) window.EngineParams.suppressChunkLoading = false;
                }
            }
            window.EventBus?.emit('ENV_UPDATE');
        });

        window.GameCore.passes = window.GameCore.passes || {};
        window.GameCore.passes.bloom = new UnrealBloomPass(
            new THREE.Vector2((window.innerWidth || 800) * 0.5, (window.innerHeight || 600) * 0.5), 
            window.EngineParams?.bloom || 1.5, 
            0.25, 
            0.9
        ); 
        composer.addPass(window.GameCore.passes.bloom);
        
        const VignetteShader = { uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }` };
        window.GameCore.passes.vignette = new ShaderPass(VignetteShader); composer.addPass(window.GameCore.passes.vignette);
        
        const ColorTintShader = { uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }` };
        window.GameCore.passes.colorTint = new ShaderPass(ColorTintShader); composer.addPass(window.GameCore.passes.colorTint);

        const startY = safeGetTerrainHeight(0, 0); const safeY = isNaN(startY) ? 1 : startY;
        spawnPlayer(0, safeY + 3.0, 0); 
        spawnPartyMembers(); 
        ChunkManager.forceUpdatePosition(new THREE.Vector3(0, safeY + 3.0, 0));

        window.EventBus?.on('ENV_UPDATE', () => {
            if(!window.EngineParams) return;
            const hourNormalized = (window.EngineParams.timeOfDay % 24) / 24;
            const angle = hourNormalized * Math.PI * 2 - (Math.PI / 2); 
            
            const sunRadius = 200;
            dirLight.position.x = Math.cos(angle) * sunRadius;
            dirLight.position.y = Math.sin(angle) * sunRadius;
            dirLight.position.z = Math.cos(angle) * 100; 
            
            const sunHeight = Math.sin(angle); 
            let baseDirIntensity = 2.5; 
            let baseAmbientIntensity = 1.8;
            
            if (sunHeight > 0.3) { 
                baseDirIntensity = 3.0; 
                baseAmbientIntensity = 2.0;
                dirLight.color.setHex(0xffffff); 
                ambientLight.color.setHex(0xffffff); 
                window.GameCore.scene.fog.color.setHex(0x94a3b8); 
                window.GameCore.scene.background = new THREE.Color(0x94a3b8);
            }
            else if (sunHeight > -0.1) { 
                baseDirIntensity = 1.8; 
                baseAmbientIntensity = 1.4; 
                dirLight.color.setHex(0xffccaa); 
                ambientLight.color.setHex(0x7c2d12); 
                window.GameCore.scene.fog.color.setHex(0x451a03); 
                window.GameCore.scene.background = new THREE.Color(0x451a03);
            }
            else { 
                baseDirIntensity = 0.5; 
                baseAmbientIntensity = 0.6; 
                dirLight.color.setHex(0x1e293b); 
                ambientLight.color.setHex(0x0f172a); 
                window.GameCore.scene.fog.color.setHex(0x020617); 
                window.GameCore.scene.background = new THREE.Color(0x020617);
            }
            
            dirLight.intensity = baseDirIntensity * window.EngineParams.globalBrightness; 
            ambientLight.intensity = baseAmbientIntensity * window.EngineParams.globalBrightness; 
            renderer.toneMappingExposure = Math.max(1.0, window.EngineParams.globalBrightness * 1.5); 
            window.GameCore.scene.fog.density = window.EngineParams.fogDensity * (sunHeight < 0 ? 1.5 : 1.0);

            if (window.GameCore.horizonMaterial) {
                window.GameCore.horizonMaterial.uniforms.sunPos.value.copy(dirLight.position);
                window.GameCore.horizonMaterial.uniforms.fogColor.value.copy(window.GameCore.scene.fog.color);
            }
        });

        window.EventBus?.emit('ENGINE_READY'); window.EventBus?.emit('ENV_UPDATE');
    } catch(e) { console.error("CRITICAL BOOT ERROR", e); }
}

window.bootEngine = bootEngine;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-start')?.addEventListener('click', (e) => {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        if(window.GameCore) window.GameCore.engineState = 'running';

        window.EventBus?.emit('UI_UPDATE_HUD');
        window.EventBus?.emit('GAME_STARTED');

        (async () => {
            try {
                if (window.Tone) {
                    await window.Tone.start();
                    if (window.Tone.Transport.state !== 'started') {
                        window.Tone.Transport.start();
                    }
                    console.log('🔊 WebAudio Context resumed successfully.');
                }
            } catch (err) {
                console.warn('AudioContext failed to start:', err);
            }
        })();

        window.addEventListener('resize', () => { 
            if(window.GameCore?.camera) {
                window.GameCore.camera.aspect = window.innerWidth / window.innerHeight; 
                window.GameCore.camera.updateProjectionMatrix(); 
            }
            if(renderer) {
                renderer.setSize(window.innerWidth, window.innerHeight); 
                if(composer) composer.setSize(window.innerWidth, window.innerHeight); 
            }
        });
    
        function animate() { 
            requestAnimationFrame(animate); 
            let delta = clock.getDelta(); 
            if (delta > 0.1) delta = 0.1; 
            accumulator += delta; 
        
            while (accumulator >= fixedTimeStep) { 
                if(window.GameCore?.world) window.GameCore.world.step(); 
                if(window.GameCore?.checkFloatingOrigin) window.GameCore.checkFloatingOrigin();
        
                fixedUpdateLogic(fixedTimeStep); 
                accumulator -= fixedTimeStep; 
            } 

            updateCameraAndShadows(delta);

            if(composer) composer.render(); 
        }
    
        animate();
    
        window.EventBus?.emit('UI_LOG', "Welcome to the woods. Press U for Dev Tools.");
    }, { once: true }); 
});

bootEngine();
