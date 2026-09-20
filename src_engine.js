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

// ==========================================
// LIGHT POOL SYSTEM (Prevents WebGL Uniform Overflow)
// ==========================================
const MAX_POOLED_LIGHTS = 8;
const lightPool = [];
const activeLightEmitters = [];

function initLightPool(scene) {
    lightPool.length = 0;
    for (let i = 0; i < MAX_POOLED_LIGHTS; i++) {
        const pl = new THREE.PointLight(0xffffff, 0, 10);
        pl.visible = false;
        scene.add(pl);
        lightPool.push(pl);
    }
}

function updateLightPool() {
    if (!window.GameCore?.playerObj?.visual) return;
    const pPos = window.GameCore.playerObj.visual.position;

    // Filter valid emitters and sort by distance to player
    const validEmitters = [];
    for (let i = activeLightEmitters.length - 1; i >= 0; i--) {
        const emitter = activeLightEmitters[i];
        if (!emitter || !emitter.mesh || !emitter.mesh.parent) {
            activeLightEmitters.splice(i, 1);
            continue;
        }
        emitter.mesh.getWorldPosition(_v1);
        const distSq = _v1.distanceToSquared(pPos);
        validEmitters.push({ emitter, pos: _v1.clone(), distSq });
    }

    validEmitters.sort((a, b) => a.distSq - b.distSq);

    // Assign closest emitters to light pool
    for (let i = 0; i < MAX_POOLED_LIGHTS; i++) {
        const pLight = lightPool[i];
        if (!pLight) continue;

        if (i < validEmitters.length) {
            const item = validEmitters[i];
            pLight.position.copy(item.pos);
            pLight.color.set(item.emitter.color);
            pLight.intensity = item.emitter.intensity;
            pLight.distance = item.emitter.distance;
            pLight.visible = true;
        } else {
            pLight.intensity = 0;
            pLight.visible = false;
        }
    }
}

// ==========================================
// CAMERA & WORLD CLOCK LOGIC
// ==========================================

function updateCameraPosition() {
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

    const camX = playerPos.x + dist * Math.sin(angle) * Math.cos(pitch) + shakeX;
    const camY = playerPos.y + 1.5 + dist * Math.sin(pitch) + shakeY;
    const camZ = playerPos.z + dist * Math.cos(angle) * Math.cos(pitch) + shakeZ;

    window.GameCore.camera.position.set(camX, camY, camZ);
    window.GameCore.camera.lookAt(playerPos.x, playerPos.y + 1.5, playerPos.z);
}

function updateWorldClock(delta) {
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
                window.GameState?.processCrowDay?.();
            }
            if (window.EngineParams.worldDay > 0 && window.EngineParams.worldDay % window.EngineParams.cycleLengthDays === 0) regenerateWorldCycle();
        }
    }
    window.EventBus.emit('ENV_UPDATE');
}

function updatePeriodicSystems() {
    if (window.VillageManager && window.VillageManager.simulateNextVillage) {
        window.VillageManager.simulateNextVillage();
    }
    window.AdventurerManager?.syncDeparted();
    window.AdventurerManager?.syncNearby();
}

function updatePlayerStats(delta) {
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
}

function updateEntities(delta) {
    const playerAlive = window.GameCore.playerObj && window.GameState.pStats.hp > 0;
    const playerPosition = playerAlive ? window.GameCore.playerObj.visual.position : null;
    const detectionRadiusSq = playerAlive ? Math.pow(window.GameState.forestBlessing?.dangerSense ? 18 : 15, 2) : 0;
    const nowSecs = performance.now() / 1000;
    const camPos = window.GameCore.camera ? window.GameCore.camera.position : new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);

    let isHidden = false;
    let hostileNearby = false;

    for (let i = window.GameCore.activeEntities.length - 1; i >= 0; i--) {
        const entity = window.GameCore.activeEntities[i];
        if (!entity || !entity.visual || !entity.body) continue;
        
        const eTrans = entity.body.translation();
        entity.visual.position.set(eTrans.x, eTrans.y, eTrans.z);

        window.GameCore.SpatialGrid.updateEntity(entity);
        window.VATManager?.processLOD(entity, camPos);

        if (entity.def.type === 'npc' && entity.statusEffects?.length > 0 && entity.hp > 0) {
            processEntityStatusEffects(entity, delta);
        }

        if (entity.def.type === 'npc' || entity.def.type === 'character') {
            alignEntityToGround(entity, delta, raycaster, downVector);
        }

        if (playerAlive && entity.hp !== 0) {
            const distSq = entity.visual.position.distanceToSquared(playerPosition);
            if (!isHidden && entity.def.concealment) {
                const hideRad = entity.def.hideRadius || entity.def.radius;
                if (distSq <= hideRad * hideRad) isHidden = true;
            }
            if (entity.def.touchEffect && entity.def.active !== false) {
                const touchRad = entity.def.touchRadius || entity.def.radius + 1;
                if (distSq <= touchRad * touchRad) {
                    if (!entity.touchEffectAvailableAt || nowSecs >= entity.touchEffectAvailableAt) {
                        entity.touchEffectAvailableAt = nowSecs + (entity.def.touchCooldown || 4);
                        window.EventBus.emit('SPAWN_HIT_VFX', { type: entity.def.touchEffect, pos: entity.visual.position.clone().add(_v1.set(0, 1, 0)) });
                        if (entity.def.touchEffect === 'Poison') window.GameCore.applyStatusEffect('poison', 6, 3);
                        window.EventBus.emit('UI_LOG', 'Poison cloud released by the flesh pods.');
                    }
                }
            }
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
                const safeY = window.WorldGenerator.getTerrainHeight(pathPoint.x, pathPoint.z) + 1;
                window.GameCore.playerObj.body.setTranslation({ x: pathPoint.x, y: safeY, z: pathPoint.z }, true);
                window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                window.EngineParams.offPathCaptureCooldown = 10;
                window.EventBus.emit('UI_LOG', 'The forest caught you off the safe path and dragged you back to the road.');
            }
        }
    }
}

function processEntityStatusEffects(entity, delta) {
    for (let j = entity.statusEffects.length - 1; j >= 0; j--) {
        const effect = entity.statusEffects[j];
        effect.remaining -= delta; effect.tickTimer -= delta;
        if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
            effect.tickTimer = 1;
            entity.hp = Math.max(0, entity.hp - effect.tickDamage);
            window.EventBus.emit('ENTITY_DAMAGED', { damage: effect.tickDamage, position: entity.visual.position, isPlayer: false });
            window.EventBus.emit('SPAWN_HIT_VFX', { type: effect.type === 'burning' ? 'Fire' : 'Void', pos: entity.visual.position });
            
            if (entity.hp <= 0) {
                handleEntityDeath(entity);
                break;
            }
        }
        if (effect.remaining <= 0) entity.statusEffects.splice(j, 1);
    }
}

function alignEntityToGround(entity, delta, raycaster, downVector) {
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
    window.AdventurerManager?.markDefeated(entity);
    
    if (entity.name === 'Deer') {
        window.CareerManager?.addXP('hunter', 25);
        window.EventBus.emit('UI_LOG', `[HUNTER] You have harvested a deer carcass.`);
    }

    if (window.GameCore.spawnGroundLoot) {
        const lootType = entity.name === 'Deer' ? 'food' : (entity.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones');
        window.GameCore.spawnGroundLoot(lootType, entity.visual.position);
    }

    awardMonsterKill(entity);
    window.GameState.inventory.gold += entity.def.faction === 'monster' ? 10 : 50;
    window.EventBus.emit('UI_UPDATE_HUD');
    
    setTimeout(() => {
        if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(entity.id);
        window.GameCore.releaseEntityIndex(entity.memoryIndex);
        window.GameCore.scene.remove(entity.visual);
        window.GameCore.world.removeRigidBody(entity.body);
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(candidate => candidate.id !== entity.id);
    }, 2000);
}

function updatePlayerMovement(delta) {
    if (!window.GameCore.playerObj || !window.GameCore.playerObj.visual || !window.GameCore.playerObj.body) return;
    
    const p = window.GameCore.playerObj.body.translation();
    window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z);

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
        moveDir.normalize().applyAxisAngle(_v2.set(0, 1, 0), window.Input.camAngle || Math.PI); 
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
                window.GameCore.playerObj.body.applyImpulse(_v2.set(moveDir.x * 30, 0, moveDir.z * 30), true);
                playEntityAnimation(window.GameCore.playerObj, 'dash');
                setTimeout(() => window.Input.isDashing = false, 200); 
                window.EventBus.emit('PLAY_SOUND', {url:'https://cdn.jsdelivr.net/gh/Tonejs/audio/drum-samples/hihat.mp3', pos: window.GameCore.playerObj.visual.position}); 
            }
        }

        window.GameCore.playerObj.body.applyImpulse(_v2.set(moveDir.x * accelerationForce * delta, 0, moveDir.z * accelerationForce * delta), true);

        const currentVel = window.GameCore.playerObj.body.linvel();
        const maxSpeed = (window.Input.isBlocking ? 2.0 : 6.0) * window.GameCore.getCombatInjuryMultiplier();
        const flatVelLenSq = currentVel.x * currentVel.x + currentVel.z * currentVel.z;

        if (flatVelLenSq > maxSpeed * maxSpeed && !window.Input.isDashing) {
            const multiplier = maxSpeed / Math.sqrt(flatVelLenSq);
            window.GameCore.playerObj.body.setLinvel(_v2.set(currentVel.x * multiplier, currentVel.y, currentVel.z * multiplier), true);
        }

        if (!window.Input.isAttacking && !window.Input.isDashing && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
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
}

function updateCombatHitboxes(delta) {
    if (!window.Input.activeSweep) return;
    
    window.Input.activeSweep.timer -= delta;
    
    if (window.Input.activeSweep.timer <= window.Input.activeSweep.activeAt) {
        const sweep = window.Input.activeSweep;
        const pTrans = window.GameCore.playerObj.body.translation();
        sweep.playerPos.set(pTrans.x, pTrans.y, pTrans.z);
        sweep.playerForward.set(0, 0, 1).applyQuaternion(window.GameCore.playerObj.visual.quaternion).normalize();
        
        const nearbyEntities = window.GameCore.SpatialGrid.getNearbyEntities(sweep.playerPos.x, sweep.playerPos.z, sweep.profile.reach);
        
        for (let i = nearbyEntities.length - 1; i >= 0; i--) {
            const en = nearbyEntities[i];
            if (!en || en.hp <= 0 || sweep.alreadyHit.has(en.id)) continue;
            if (en.def.type !== 'npc' && en.name !== 'Blight Root') continue;
            
            const eTrans = en.body.translation();
            const distSq = (eTrans.x - sweep.playerPos.x)**2 + (eTrans.z - sweep.playerPos.z)**2;
            
            if (distSq <= sweep.profile.reach * sweep.profile.reach) {
                _v1.set(eTrans.x - sweep.playerPos.x, 0, eTrans.z - sweep.playerPos.z).normalize();
                if (sweep.playerForward.angleTo(_v1) <= sweep.profile.angle / 2) {
                    sweep.alreadyHit.add(en.id);
                    
                    let damageMultiplier = sweep.profile.multiplier;
                    if (window.Input.isStealth && sweep.isHeavy) {
                        damageMultiplier *= 5.0;
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "ASSASSINATION!", pos: en.visual.position, color: '#ff0000'});
                        window.EventBus.emit('UI_LOG', `[CRITICAL] You assassinated ${en.name}!`);
                        window.EventBus.emit('TOGGLE_STEALTH');
                    }

                    const rawDamage = window.GameState.derivedStats.weaponDamage + ((window.GameState.pStats.strength.level + window.GameCore.getBuffBonus('strength')) * 2) + window.GameCore.getBuffBonus('meleeAtt');
                    const damage = Math.max(1, Math.floor(rawDamage * damageMultiplier * window.GameCore.getCombatInjuryMultiplier()) - (en.def.armor || 0)); 
                    
                    en.hp -= damage; 
                    en.poise = Math.max(0, en.poise - (sweep.profile.poise || 10));

                    window.EventBus.emit('ENTITY_DAMAGED', { damage: damage, position: en.visual.position, isPlayer: false });
                    window.EventBus.emit('SPAWN_HIT_VFX', { type: en.def.vfx.onHit, pos: en.visual.position.clone().add(_v1.set(0, 1, 0)) });
                    window.EventBus.emit('PLAY_SOUND', {url: sweep.isHeavy ? 'https://cdn.jsdelivr.net/gh/Tonejs/audio/drum-samples/snare.mp3' : 'https://cdn.jsdelivr.net/gh/Tonejs/audio/drum-samples/kick.mp3', pos: en.visual.position, vol: -5});
                    
                    if (sweep.isHeavy || sweep.profile.isGuardbreaker) {
                        window.Input.hitPauseTimer = 0.08; 
                        window.Input.camShake = 0.5;
                        const recoilDir = sweep.playerForward.clone().negate();
                        window.GameCore.playerObj.body.applyImpulse(_v2.set(recoilDir.x * 5, 0, recoilDir.z * 5), true);
                    } else {
                        window.Input.hitPauseTimer = 0.03;
                    }
                }
            }
        }
    }
}

function fixedUpdateLogic(delta) {
    if (window.GameCore.playerObj) ChunkManager.update(window.GameCore.playerObj.visual.position);
    if (window.EngineParams.offPathCaptureCooldown > 0) window.EngineParams.offPathCaptureCooldown = Math.max(0, window.EngineParams.offPathCaptureCooldown - delta);
    
    window.GameCore.worldTimer += delta;

    updateWorldClock(delta);
    
    if (window.GameCore.worldTimer > 0.25) { 
        updatePeriodicSystems();
        updateLightPool(); // Distribute active PointLights to closest light-emitting prefabs
        
        const checkInterval = (4 / 24) * window.EngineParams.dayLengthSeconds; 
        if (!window.GameCore.lastNeedsCheck || window.GameCore.worldTimerAbsolute > window.GameCore.lastNeedsCheck + checkInterval) {
             processCompanionNeeds();
             window.GameCore.lastNeedsCheck = window.GameCore.worldTimerAbsolute || 0;
        }

        window.GameCore.worldTimer = 0; 
    }

    window.GameCore.worldTimerAbsolute = (window.GameCore.worldTimerAbsolute || 0) + delta;

    window.ArenaTestManager?.update(delta);
    window.VATManager?.update(delta);
    window.EncounterDirector?.update(delta);
    if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.update(delta);

    updatePlayerStats(delta);
    updateEntities(delta);
    updatePlayerMovement(delta);
    updateCombatHitboxes(delta);
}

// ==========================================
// CHUNK & SCENERY MANAGERS
// ==========================================

const ChunkManager = {
    activeChunks: new Map(), currentChunkX: null, currentChunkZ: null,
    instancedMeshes: new Map(),

    update: function(playerPos) {
        if (window.EngineParams.suppressChunkLoading) return;
        const cx = Math.floor(playerPos.x / 60); const cz = Math.floor(playerPos.z / 60);
        if (cx !== this.currentChunkX || cz !== this.currentChunkZ) { this.currentChunkX = cx; this.currentChunkZ = cz; this.loadChunksAround(cx, cz); }
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
        
        const segments = lod === 'A' ? 30 : (lod === 'B' ? 10 : 2);
        const geo = new THREE.PlaneGeometry(60, 60, segments, segments); 
        geo.rotateX(-Math.PI / 2);

        const vertices = geo.attributes.position.array; const colors = [];
        const localRoadPoints = window.RoadManager.getRoadPointsNear(cx, cz); const ROAD_WIDTH = 5;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + chunkX; 
            const vz = vertices[i+2] + chunkZ;
            
            const biomeKey = window.WorldGenerator.getBiome(vx, vz); 
            const biome = window.WorldGenConfig.biomes[biomeKey]; 
            let c = new THREE.Color(biome.color);
            
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
                c.lerp(new THREE.Color('#38281d'), dirtInfluence); 
            }

            vertices[i+1] = window.WorldGenerator.getTerrainHeight(vx, vz); 
            
            const hL = window.WorldGenerator.getTerrainHeight(vx - 0.5, vz);
            const hR = window.WorldGenerator.getTerrainHeight(vx + 0.5, vz);
            const hD = window.WorldGenerator.getTerrainHeight(vx, vz - 0.5);
            const hU = window.WorldGenerator.getTerrainHeight(vx, vz + 0.5);
            const normal = new THREE.Vector3(hL - hR, 1.0, hD - hU).normalize();
            
            const colorNoise = window.currentNoise2D ? window.currentNoise2D(vx * 0.1, vz * 0.1) * 0.05 : 0; 
            c.r += colorNoise; c.g += colorNoise; c.b += colorNoise;
            colors.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); 
        geo.attributes.position.needsUpdate = true; 
        geo.computeVertexNormals();
        
        const normalArray = geo.attributes.normal.array;
        
        const clutterData = new Float32Array(geo.attributes.position.count);
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + chunkX; 
            const vz = vertices[i+2] + chunkZ;
            clutterData[i/3] = window.WorldGenerator.getNoise(vx * 0.5, vz * 0.5); 
            
            const hL = window.WorldGenerator.getTerrainHeight(vx - 0.1, vz);
            const hR = window.WorldGenerator.getTerrainHeight(vx + 0.1, vz);
            const hD = window.WorldGenerator.getTerrainHeight(vx, vz - 0.1);
            const hU = window.WorldGenerator.getTerrainHeight(vx, vz + 0.1);
            const n = new THREE.Vector3(hL - hR, 0.2, hD - hU).normalize();
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
                 varying float vClutter;`
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>
                 vClutter = clutter;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `#include <common>
                 varying float vClutter;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
                 vec3 grassColor = vec3(0.1, 0.3, 0.1);
                 diffuseColor.rgb = mix(diffuseColor.rgb, grassColor, vClutter * 0.4);`
            );
        };
        
        const mesh = new THREE.Mesh(geo, mat);  mesh.position.set(chunkX, 0, chunkZ); mesh.receiveShadow = true; mesh.userData.isTerrain = true; mesh.userData.chunkKey = key; window.GameCore.scene.add(mesh);

        const physicsVertices = new Float32Array(vertices); const indicesU32 = new Uint32Array(geo.index.array); 

        const groundBody = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(chunkX, 0, chunkZ));
        const collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.trimesh(physicsVertices, indicesU32), groundBody);
        this.activeChunks.set(key, { mesh, body: groundBody, collider, lod });
        
        const rawSeed = window.EngineParams?.worldSeed ?? 1337;
        const seedValue = rawSeed.toString();
        const rng = alea(`${seedValue}_${cx}_${cz}`);
        
        function getPoissonPoints(width, height, radius, rngFunc) {
            const k = 30;
            const cellSize = radius / Math.sqrt(2);
            const gridWidth = Math.ceil(width / cellSize);
            const gridHeight = Math.ceil(height / cellSize);
            const grid = new Array(gridWidth * gridHeight).fill(undefined);
            const activeList = [];
            const points = [];

            const p0 = { x: rngFunc() * width, z: rngFunc() * height };
            insertPoint(p0);
            activeList.push(p0);

            function insertPoint(p) {
                const gx = Math.floor(p.x / cellSize);
                const gz = Math.floor(p.z / cellSize);
                grid[gx + gz * gridWidth] = p;
                points.push(p);
            }

            function isValidPoint(p) {
                if (p.x < 0 || p.x >= width || p.z < 0 || p.z >= height) return false;
                const gx = Math.floor(p.x / cellSize);
                const gz = Math.floor(p.z / cellSize);
                const searchRadius = 2;

                for (let i = Math.max(0, gx - searchRadius); i <= Math.min(gridWidth - 1, gx + searchRadius); i++) {
                    for (let j = Math.max(0, gz - searchRadius); j <= Math.min(gridHeight - 1, gz + searchRadius); j++) {
                        const neighbor = grid[i + j * gridWidth];
                        if (neighbor) {
                            const dx = p.x - neighbor.x;
                            const dz = p.z - neighbor.z;
                            if (dx * dx + dz * dz < radius * radius) return false;
                        }
                    }
                }
                return true;
            }

            while (activeList.length > 0) {
                const randIndex = Math.floor(rngFunc() * activeList.length);
                const p = activeList[randIndex];
                let found = false;

                for (let i = 0; i < k; i++) {
                    const angle = rngFunc() * Math.PI * 2;
                    const r = radius + rngFunc() * radius;
                    const candidate = { x: p.x + Math.cos(angle) * r, z: p.z + Math.sin(angle) * r };

                    if (isValidPoint(candidate)) {
                        insertPoint(candidate);
                        activeList.push(candidate);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    activeList.splice(randIndex, 1);
                }
            }
            return points;
        }

        const chunkInstances = new Map();
        this.instancedMeshes.set(key, chunkInstances);
        
        const chunkCenterBiome = window.WorldGenerator.getBiome(chunkX, chunkZ);
        const biomeData = window.WorldGenConfig.biomes[chunkCenterBiome];
        const treeSpacing = biomeData.density || 10;
        
        const poissonPoints = getPoissonPoints(60, 60, treeSpacing, rng);
        poissonPoints.forEach(point => {
            const vx = (chunkX - 30) + point.x;
            const vz = (chunkZ - 30) + point.z;
            
            let nearRoad = false;
            for(let r=0; r<localRoadPoints.length; r++) { 
                const dx = vx - localRoadPoints[r].x;
                const dz = vz - localRoadPoints[r].z;
                if ((dx * dx) + (dz * dz) < 81) { 
                    nearRoad = true; break; 
                }
            }
            if (nearRoad) return;
            
            let inVillage = false;
            if (window.VillageManager) {
                for (let v of window.VillageManager.villages) {
                    const dx = vx - v.x;
                    const dz = vz - v.z;
                    if ((dx * dx) + (dz * dz) < (v.radius || 45) * (v.radius || 45)) {
                        inVillage = true; break;
                    }
                }
            }
            if (inVillage) return;

            const biomeHere = window.WorldGenerator.getBiome(vx, vz);
            let prefabName = window.WorldGenConfig.biomes[biomeHere].prefab;
            
            if (rng() < 0.20 && biomeHere !== 'desert' && biomeHere !== 'sierra') {
                prefabName = 'Berry Bush';
            }

            if (rng() < 0.05 && (biomeHere === 'redwoods' || biomeHere === 'valley')) {
                const dy = window.WorldGenerator.getTerrainHeight(vx, vz);
                instantiatePrefab('Deer', vx, dy, vz, key);
                return;
            }

            const vy = window.WorldGenerator.getTerrainHeight(vx, vz);
            const ny = window.WorldGenerator.getTerrainHeight(vx + 1, vz);
            if (Math.abs(vy - ny) > 1.5) return; 
            
            const position = new THREE.Vector3(vx, vy, vz);
            const rotation = new THREE.Euler(0, rng() * Math.PI * 2, 0);
            const scale = new THREE.Vector3().setScalar(0.7 + rng() * 0.6);
            
            if (biomeHere === 'redwoods') {
                scale.setScalar(2.0 + rng() * 2.0);
                scale.y *= (1.5 + rng());
            }
        });

        const chunkData = window.ForestManager.generateChunk(cx, cz);
        
        if (lod === 'A' || lod === 'B') {
            const sceneryData = new Map();
            ['tierA', 'tierB'].forEach(tier => {
                chunkData[tier].forEach(point => {
                    const prefabName = point.type === 'redwood' ? 'Oak Tree' : 'Bramble Bush'; 
                    if (!sceneryData.has(prefabName)) sceneryData.set(prefabName, []);
                    sceneryData.get(prefabName).push({ x: (chunkX - 30) + (point.x - cx*60), z: (chunkZ - 30) + (point.z - cz*60) });
                });
            });

            sceneryData.forEach((points, prefabName) => {
                if (!window.ForestRenderer.instances.has(prefabName)) {
                    window.ForestRenderer.initInstancedMesh(prefabName, 1000);
                }
                window.ForestRenderer.updateInstances(prefabName, points);
            });

            if (lod === 'A') {
                chunkData.tierA.forEach(point => {
                    const px = (chunkX - 30) + (point.x - cx*60);
                    const pz = (chunkZ - 30) + (point.z - cz*60);
                    const py = window.WorldGenerator.getTerrainHeight(px, pz);
                    const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(px, py, pz));
                    window.GameCore.world.createCollider(RAPIER.ColliderDesc.cylinder(1.0, 0.5), body);
                    if (!this.activeChunks.get(key).instanceBodies) this.activeChunks.get(key).instanceBodies = [];
                    this.activeChunks.get(key).instanceBodies.push(body);
                });
            }
        } else if (lod === 'C') {
            const billboardPoints = [...chunkData.tierA, ...chunkData.tierB];
            const billboardData = billboardPoints.map(p => ({ 
                x: (chunkX - 30) + (p.x - cx*60), 
                z: (chunkZ - 30) + (p.z - cz*60) 
            }));
            window.BillboardManager.updateBillboards(billboardData);
        }

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
                    const originalModel = window.AssetManager.prefabs['Village Hub'].customModel; 
                    window.AssetManager.prefabs['Village Hub'].customModel = v.assignedModel || originalModel;
                    const hy = window.WorldGenerator.getTerrainHeight(v.x, v.z); 
                    const hub = instantiatePrefab('Village Hub', v.x, hy, v.z, key);
                    if(hub) { 
                        hub.villageId = v.id; 
                        window.EventBus.emit('UI_LOG', `*** Discovered Major Settlement: ${v.name} ***`); 
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: v.name, pos: new THREE.Vector3(v.x, hy + 8, v.z), color: '#ffd700'}); 
                    }
                    if (v.layout && v.layout.length > 0) { 
                        v.layout.forEach(l => { 
                            instantiatePrefab(l.prefab, v.x + l.ox, window.WorldGenerator.getTerrainHeight(v.x + l.ox, v.z + l.oz), v.z + l.oz, key); 
                        }); 
                    }
                    if (!v.residents) v.residents = [];
                    if (v.residents.length === 0) v.residents.push({ prefab: 'Guard', ox: 4, oz: 4 });
                    v.residents.forEach(resident => {
                        const residentX = v.x + (resident.ox || 0); const residentZ = v.z + (resident.oz || 0);
                        const residentEntity = instantiatePrefab(resident.prefab || 'Guard', residentX, window.WorldGenerator.getTerrainHeight(residentX, residentZ), residentZ, key);
                        if (residentEntity) { 
                            residentEntity.villageId = v.id; 
                            residentEntity.squadId = resident.squadId || null; 
                        
                            if (v.nobleHouse === 'House Terminus') {
                                const isLeader = resident.prefab === 'City Guard' || resident.prefab === 'Noble NPC';
                                const baseStat = isLeader ? 85 : 65;
                                const variance = Math.random() * 10;
                            
                                residentEntity.attackDamage = baseStat + variance;
                                residentEntity.hp = (baseStat + variance) * 5;
                                residentEntity.poise = (baseStat + variance) * 1.5;
                                residentEntity.name = isLeader ? `Terminus Commander` : `Terminus Elite Guard`;
                                residentEntity.isTerminusElite = true; 
                            
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
        window.EventBus.emit('CHUNK_GENERATED');
    },
    unloadChunk: function(key) {
        const chunk = this.activeChunks.get(key); if(!chunk) return;
        chunk.mesh.geometry.dispose(); chunk.mesh.material.dispose(); window.GameCore.scene.remove(chunk.mesh); window.GameCore.world.removeRigidBody(chunk.body);
        
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
                if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(en.id);
                window.GameCore.releaseEntityIndex(en.memoryIndex);
                window.GameCore.SpatialGrid.unregisterEntity(en);
                window.GameCore.scene.remove(en.visual); window.GameCore.world.removeRigidBody(en.body); 
                return false; 
            } 
            return true; 
        });
        this.activeChunks.delete(key);
        window.EventBus.emit('CHUNK_UNLOADED');
    }
};

function getVisualMesh(def) {
    let meshGroup = new THREE.Group();
    
    if (def.customModel && window.AssetManager && window.AssetManager.models[def.customModel]) {
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
    } else {
        if (def.type === 'character' || def.type === 'npc') {
            const legs = new THREE.Mesh(
                new THREE.BoxGeometry(def.radius * 0.8, def.height * 0.3, def.radius * 0.8),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            legs.position.y = def.height * 0.15 - def.height/2;
            legs.castShadow = true; legs.receiveShadow = true;
            meshGroup.add(legs);

            const torso = new THREE.Mesh(
                new THREE.BoxGeometry(def.radius * 1.5, def.height * 0.5, def.radius * 1.2),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            torso.position.y = def.height * 0.55 - def.height/2;
            torso.castShadow = true; torso.receiveShadow = true;
            meshGroup.add(torso);

            const head = new THREE.Mesh(
                new THREE.BoxGeometry(def.radius, def.radius, def.radius),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            head.position.y = def.height * 0.85 - def.height/2;
            head.castShadow = true; head.receiveShadow = true;
            meshGroup.add(head);
        } else {
            let mesh; 
            if(def.type === 'structure' || def.type === 'hub') mesh = new THREE.Mesh(new THREE.BoxGeometry(def.radius*2, def.height, def.radius*2), new THREE.MeshStandardMaterial({ color: def.color || 0x888888 })); 
            else if(def.type === 'mountain') mesh = new THREE.Mesh(new THREE.ConeGeometry(def.radius, def.height, 16), new THREE.MeshStandardMaterial({ color: def.color || 0x444444 })); 
            else mesh = new THREE.Mesh(new THREE.CylinderGeometry(def.radius, def.radius, def.height, 8), new THREE.MeshStandardMaterial({ color: def.color || 0x666666 }));
            mesh.castShadow = true; mesh.receiveShadow = true; 
            meshGroup.add(mesh);
        }
    }
    return meshGroup;
}

function playEntityAnimation(entity, state) {
    if (window.GameCore.AnimationSystem) {
        window.GameCore.AnimationSystem.transitionTo(entity, state);
        return;
    }
    if (!entity.mixer || !entity.actions || !entity.actions[state]) return; 
    if (entity.currentAnimState === 'die') return;
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

    if (window.GameCore.AnimationSystem) {
        window.GameCore.AnimationSystem.initEntity(entity, entity.visual, clips);
        return;
    }

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
    let mesh = getVisualMesh(def); mesh.position.set(x, y, z); window.GameCore.scene.add(mesh);
    let rigidBodyDesc = (def.type === 'structure' || def.type === 'hub' || def.type === 'mountain' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic().lockRotations();
    
    if(def.type !== 'structure' && def.type !== 'hub' && def.type !== 'mountain' && def.type !== 'runeTower' && def.type !== 'powerStone' && def.type !== 'firePit' && def.type !== 'streetLight' && def.type !== 'merchantChest') {
        rigidBodyDesc.setLinearDamping(4.0);
    }
    
    rigidBodyDesc.setTranslation(x, y, z); let body = window.GameCore.world.createRigidBody(rigidBodyDesc);
    
    let collider = null;
    if (def.isObstacle !== false) {
        let colliderDesc; if (def.type === 'structure' || def.type === 'hub' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') colliderDesc = RAPIER.ColliderDesc.cuboid(def.radius, def.height/2, def.radius); else if (def.type === 'mountain') colliderDesc = RAPIER.ColliderDesc.cone(def.height/2, def.radius); else colliderDesc = RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius);
        collider = window.GameCore.world.createCollider(colliderDesc, body);
    }

    const entity = { id: Math.random().toString(36).substr(2, 9), name: name, def: def, visual: mesh, body: body, collider: collider, chunkKey: chunkKey };
    
    window.GameCore.bindEntityToBuffer(entity, def.hp || 50, def.poise || 30);

    if(collider) collider.handle = Math.floor(Math.random() * 1000000); 
    body.userData = { entityId: entity.id };
    
    // REGISTER LIGHT SOURCES WITH GLOBAL LIGHT POOL (No inline PointLight creation)
    if (def.type === 'hub') { 
        activeLightEmitters.push({ mesh, color: def.color || 0xffd700, intensity: 2, distance: 15 });
        entity.ap = 0; entity.food = 100; 
    }
    if (def.type === 'arcaneDoor') { 
        activeLightEmitters.push({ mesh, color: 0x6366f1, intensity: 3, distance: 10 });
    }
    if (def.type === 'merchantChest') entity.merchantInventory = def.merchantInventory.map(item => ({ ...item }));
    if (def.type === 'powerStone') { 
        activeLightEmitters.push({ mesh, color: 0x7dd3fc, intensity: def.active === false ? 0.2 : 3, distance: 25 });
    }
    if (def.type === 'firePit') { 
        activeLightEmitters.push({ mesh, color: 0xff8a32, intensity: def.active === false ? 0 : 2.5, distance: 12 });
    }
    if (def.type === 'streetLight') { 
        activeLightEmitters.push({ mesh, color: 0x9bdcff, intensity: def.active === false ? 0 : 2.5, distance: 18 });
    }

    setupEntityAnimations(entity); window.VFXManager.applyAura(entity, def); 
    
    window.GameCore.SpatialGrid.registerEntity(entity);

    if (def.faction === 'monster' || def.faction === 'forest') {
        entity.lastFedDay = window.EngineParams.worldDay;
        entity.hungerLevel = 0;
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
            if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(entity.id);
            window.GameCore.releaseEntityIndex(entity.memoryIndex);
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
    const def = window.AssetManager?.prefabs?.['Player'] || { height: 2, radius: 0.5 };
    
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .lockRotations()
        .setTranslation(x, y + 1, z)
        .setCcdEnabled(true)
        .setLinearDamping(2.0);
    
    let body = window.GameCore.world.createRigidBody(rigidBodyDesc);
    let collider = window.GameCore.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius), body);
    window.GameCore.playerObj = { visual: getVisualMesh(def), body: body, collider: collider, def: def };
    
    window.GameCore.bindEntityToBuffer(window.GameCore.playerObj, window.GameState.pStats.maxHp, window.GameState.pStats.maxPoise);
    
    const pMemIdx = window.GameCore.playerObj.memoryIndex * 4;
    Object.defineProperties(window.GameState.pStats, {
        'hp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 0], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 0] = v; } },
        'maxHp': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 1], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 1] = v; } },
        'poise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 2], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 2] = v; } },
        'maxPoise': { get: () => window.GameCore.entityStatBuffer[pMemIdx + 3], set: (v) => { window.GameCore.entityStatBuffer[pMemIdx + 3] = v; } }
    });

    const p = body.translation(); 
    window.GameCore.playerObj.visual.position.set(p.x, p.y, p.z); 
    window.GameCore.scene.add(window.GameCore.playerObj.visual);
    setupEntityAnimations(window.GameCore.playerObj, true); window.VFXManager.applyAura(window.GameCore.playerObj, def);
    
    window.GameCore.playerObj.node_id = 'player_node';
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
    if (!window.ItemDatabase?.[itemId]) return;
    
    const groundY = window.WorldGenerator.getTerrainHeight(position.x, position.z);
    const finalPos = new THREE.Vector3(position.x, groundY + 0.4, position.z);
    
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x8a5a00, emissiveIntensity: 1 }));
    mesh.position.copy(finalPos);
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
        window.CareerManager.addXP('warden', essence * 5);
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
    const hoursPerSecond = 24 / window.EngineParams.dayLengthSeconds;
    const hungerPerSecond = 100 / (24 * 60 * 60 / hoursPerSecond); 
    
    const pStats = window.GameState.pStats;
    pStats.hunger = Math.max(0, pStats.hunger - (hungerPerSecond * 60)); 
    
    if (pStats.hunger <= 0) {
        window.GameState.starvationDays = (window.GameState.starvationDays || 0) + (1/6); 
        
        const dayT = window.GameState.starvationDays / 7;
        const weakness = Math.min(0.9, Math.pow(dayT, 1.5)); 
        
        pStats.maxHp = 100 * (1 - weakness);
        pStats.hp = Math.min(pStats.hp, pStats.maxHp);
        
        if (window.GameState.starvationDays >= 7) {
            pStats.hp = 0; 
            window.EventBus.emit('UI_LOG', "You have starved to death.");
        } else {
            window.EventBus.emit('UI_LOG', `Starvation: You are growing weak (${Math.floor(weakness*100)}% debuff)`);
        }
    } else {
        window.GameState.starvationDays = 0;
    }

    window.GameState.party.members.filter(member => member.recruited).forEach(member => {
        member.hunger = Math.max(0, (member.hunger || 100) - 25); 
        
        const rationIndex = member.inventory.indexOf('food');
        if (member.hunger <= 60 && rationIndex >= 0) {
            member.inventory.splice(rationIndex, 1);
            member.hunger = 100;
            member.loyalty = Math.min(100, (member.loyalty || 0) + 1);
        }
        
        if (member.hunger <= 0) {
            member.starvationDays = (member.starvationDays || 0) + (1/6);
            if (member.starvationDays >= 7) {
                member.hp = 0;
                member.downed = true;
                window.EventBus.emit('UI_LOG', `${member.name} has starved to death.`);
            } else {
                member.hp = Math.max(1, member.hp - (member.maxHp * 0.1)); 
            }
        } else {
            member.starvationDays = 0;
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
    
    window.Input.activeSweep = {
        profile: profile,
        timer: profile.windup + profile.duration,
        activeAt: profile.duration, 
        alreadyHit: new Set(),
        isHeavy: isHeavy,
        playerPos: new THREE.Vector3(), 
        playerForward: new THREE.Vector3()
    };

    window.EventBus.emit('PLAY_SOUND', {url: 'https://cdn.jsdelivr.net/gh/Tonejs/audio/drum-samples/snare.mp3', pos: window.GameCore.playerObj.visual.position});
    window.GameCore.addXP('meleeAtt', isHeavy ? 4 : 2); 
}

function performGuardbreaker() {
    if (window.Input.isBlocking || window.Input.isAttacking || window.Input.guardbreakerCooldown > 0 || !window.GameCore.playerObj.visual) return;
    if (window.GameState.pStats.stamina < 30) { window.EventBus.emit('UI_LOG', 'Too exhausted to use Guardbreaker.'); return; }
    
    const profile = { stamina: 30, cooldown: 0.7, reach: 3.5, radius: 1.0, angle: Math.PI * 0.4, multiplier: 0.7, poise: 999, windup: 0.2, duration: 0.2, color: '#fbbf24', isGuardbreaker: true };
    
    window.GameState.pStats.stamina -= profile.stamina;
    window.Input.guardbreakerCooldown = 5;
    window.Input.isAttacking = true;
    window.Input.attackCooldown = profile.cooldown;
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'GUARDBREAKER', pos: window.GameCore.playerObj.visual.position, color: '#fbbf24' });
    
    window.Input.activeSweep = {
        profile: profile,
        timer: profile.windup + profile.duration,
        activeAt: profile.duration,
        alreadyHit: new Set(),
        isHeavy: true 
    };
    
    window.EventBus.emit('PLAY_SOUND', {url: 'https://cdn.jsdelivr.net/gh/Tonejs/audio/drum-samples/kick.mp3', pos: window.GameCore.playerObj.visual.position});
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
            if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(target.id);
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
        if (pts.length > 0) { const pt = pts[Math.floor(Math.random() * pts.length)]; const root = instantiatePrefab('Blight Root', pt.x, window.WorldGenerator.getTerrainHeight(pt.x, pt.z), pt.z, 'persistent'); if (root) { root.hp = 150; window.EventBus.emit('UI_LOG', "A Blight Root has corrupted a nearby road!"); } } 
 
    else window.EventBus.emit('UI_LOG', "No roads nearby to corrupt!");
});
window.EventBus.on('CLEAR_MAP', () => { 
    window.GameCore.activeEntities.forEach(en => { 
        if(en.def.faction === 'player') return; 
        if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(en.id);
        window.GameCore.releaseEntityIndex(en.memoryIndex); 
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
    
    window.CareerManager?.addXP('builder', 50);
    
    window.EventBus.emit('UI_LOG', `[CAMP] Built ${prefab}.`);
});
window.EventBus.on('WORLD_REGENERATE', () => {
    window.EventBus.emit('CLEAR_MAP'); const keys = Array.from(ChunkManager.activeChunks.keys()); keys.forEach(k => ChunkManager.unloadChunk(k)); ChunkManager.currentChunkX = null; 
    window.currentPrng = alea(window.EngineParams?.worldSeed ?? 1337); window.currentNoise2D = window.createNoise2D(window.currentPrng);
    if (window.GameCore.playerObj) { const vy = window.WorldGenerator.getTerrainHeight(window.GameCore.playerObj.visual.position.x, window.GameCore.playerObj.visual.position.z) + 1; window.GameCore.playerObj.body.setTranslation({x: window.GameCore.playerObj.visual.position.x, y: vy, z: window.GameCore.playerObj.visual.position.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); spawnPartyMembers(); syncCaravanAgents(); syncPlayerBase(); ChunkManager.update(new THREE.Vector3(window.GameCore.playerObj.visual.position.x, vy, window.GameCore.playerObj.visual.position.z)); }
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
        const point = destination(); const y = window.WorldGenerator.getTerrainHeight(point.x, point.z) + 1;
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
    if (window.EngineParams.suppressWorldRegenerate) return;
    
    const uiOverlay = document.createElement('div');
    uiOverlay.style.position = 'fixed';
    uiOverlay.style.top = '0'; uiOverlay.style.left = '0';
    uiOverlay.style.width = '100vw'; uiOverlay.style.height = '100vh';
    uiOverlay.style.backgroundColor = 'white';
    uiOverlay.style.opacity = '0';
    uiOverlay.style.transition = 'opacity 3s ease-in-out';
    uiOverlay.style.zIndex = '9999';
    uiOverlay.style.pointerEvents = 'none';
    document.body.appendChild(uiOverlay);

    setTimeout(() => {
        uiOverlay.style.opacity = '1';
        
        setTimeout(() => {
            punishExposedActors();
            
            const newEpoch = window.EpochManagerInstance.advanceEpoch();
            
            window.EngineParams.worldSeed = window.EpochManagerInstance.currentSeed;
            window.EngineParams.lastCycleDay = window.EngineParams.worldDay;
            
            if (window.VillageManager && window.VillageManager.villages.length > 0) {
                window.VillageManager.shiftLocations();
            }

            let playerShiftedSafely = false;
            
            if (window.GameCore.playerObj) {
              const playerPos = window.GameCore.playerObj.visual.position;
                
              const protectedVillage = window.VillageManager.villages.find(v => {
                  const distSq = Math.pow(playerPos.x - v.x, 2) + Math.pow(playerPos.z - v.z, 2);
                  return distSq <= Math.pow(v.territory?.barrierRadius || 90, 2);
              });
                
              const hasAnchorItem = window.GameState.inventory.equipment.waist === 'epoch_anchor' || 
                                    window.GameState.inventory.backpack.includes('epoch_anchor');
                
              if (protectedVillage) {
                  const newY = window.WorldGenerator.getTerrainHeight(protectedVillage.x, protectedVillage.z) + 1;
                  window.GameCore.playerObj.body.setTranslation({x: protectedVillage.x, y: newY, z: protectedVillage.z}, true);
                  window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
                  playerShiftedSafely = true;
                  window.EventBus.emit('UI_LOG', `[EPOCH ${newEpoch}] The ward held. You shifted safely with ${protectedVillage.name}.`);
              } 
              else if (hasAnchorItem) {
                  const nearestRoadPt = window.RoadManager.getRandomPathPoint();
                  if (nearestRoadPt) {
                      const newY = window.WorldGenerator.getTerrainHeight(nearestRoadPt.x, nearestRoadPt.z) + 1;
                      window.GameCore.playerObj.body.setTranslation({x: nearestRoadPt.x, y: newY, z: nearestRoadPt.z}, true);
                      window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
                      playerShiftedSafely = true;
                      window.EventBus.emit('UI_LOG', `[EPOCH ${newEpoch}] The Anchor burns in your pocket, pulling you to the nearest road.`);
                  }
              }
            }
            
            if (!playerShiftedSafely && !window.EngineParams.isPlayerSafe) {
              const forestExtent = window.WorldGenConfig.darkForestSideMeters / 2 - 1000;
              let newX, newZ;
              let valid = false;
              while(!valid) {
                  newX = (Math.random() * 2 - 1) * forestExtent;
                  newZ = (Math.random() * 2 - 1) * forestExtent;
                  if (Math.abs(newX) > 500 || Math.abs(newZ) > 500) valid = true;
              }
              const newY = window.WorldGenerator.getTerrainHeight(newX, newZ) + 1;
              if (window.GameCore.playerObj) {
                  window.GameCore.playerObj.body.setTranslation({x: newX, y: newY, z: newZ}, true);
                  window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
              }
              window.EventBus.emit('UI_LOG', `[EPOCH ${newEpoch}] You were caught unprotected. You are lost in the deep forest.`);
            }
            
            if (window.GameCore.playerObj && typeof ChunkManager !== 'undefined') {
               ChunkManager.update(window.GameCore.playerObj.visual.position);
            }

            window.EventBus.emit('WORLD_REGENERATE');
            
            window.CareerManager?.addXP('navigator', 100);
            window.CareerManager?.addXP('archivist', 50);
            
            window.EventBus.emit('UI_LOG', `[EPOCH ${newEpoch}] The white wave passed. The forest has shifted.`);

            setTimeout(() => {
                uiOverlay.style.opacity = '0';
                setTimeout(() => { document.body.removeChild(uiOverlay); }, 3000);
            }, 1000); 

        }, 3000); 
    }, 100);
}
window.EventBus.on('CMD_TELEPORT', (pos) => { const vy = window.WorldGenerator.getTerrainHeight(pos.x, pos.z) + 1; window.GameCore.playerObj.body.setTranslation({x:pos.x, y:vy, z:pos.z}, true); window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true); ChunkManager.update(new THREE.Vector3(pos.x, vy, pos.z)); });
window.EventBus.on('PLAYER_RESPAWN', () => { if (!window.EngineParams.arenaMode && window.GameState.pStats.hp <= 0) window.GameCore.recordCombatDefeat({ source: 'open-world', injury: `open-world defeat on day ${window.EngineParams.worldDay}` }); const respawnY = window.WorldGenerator.getTerrainHeight(0,0) + 1; window.GameCore.playerObj.body.setTranslation({x:0, y:respawnY, z:0}, true); window.GameState.pStats.hp = window.GameState.pStats.maxHp; window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); playEntityAnimation(window.GameCore.playerObj, 'idle'); window.EventBus.emit('UI_UPDATE_HUD'); });

// BOOT ENGINE
async function bootEngine() {
    try {
        document.getElementById('loading-bar').style.width = "50%"; 
        await RAPIER.init({}); 
        document.getElementById('loading-bar').style.width = "100%"; document.getElementById('loading-container').classList.add('hidden'); document.getElementById('btn-start').classList.remove('hidden');
        
        window.GameCore.scene = new THREE.Scene(); window.GameCore.scene.fog = new THREE.FogExp2(0x040608, 0.03); window.GameCore.scene.background = new THREE.Color(0x040608);
        window.GameCore.camera = new THREE.PerspectiveCamera(60, (window.innerWidth || 800) / (window.innerHeight || 600), 0.1, 1000000); 

        initLightPool(window.GameCore.scene);

        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); 
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); 
        renderer.setSize(window.innerWidth || 800, window.innerHeight || 600); 
        renderer.shadowMap.enabled = true; 
        renderer.shadowMap.type = THREE.PCFShadowMap; 
        renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        renderer.toneMappingExposure = 1.25; 
        document.body.appendChild(renderer.domElement);

        window.GameCore.pocketScene = new THREE.Scene();
        window.GameCore.pocketScene.background = new THREE.Color(0x020617);
        const pAmbient = new THREE.AmbientLight(0xffffff, 0.8);
        window.GameCore.pocketScene.add(pAmbient);
        const pPoint = new THREE.PointLight(0x6366f1, 5, 50);
        pPoint.position.set(0, 10, 0);
        window.GameCore.pocketScene.add(pPoint);

        window.GameCore.scene.add(window.ForestRenderer.group);
        window.GameCore.scene.add(window.BillboardManager.group);

        const roomGeo = new THREE.BoxGeometry(20, 10, 20);
        const roomMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.BackSide });
        const roomMesh = new THREE.Mesh(roomGeo, roomMat);
        roomMesh.position.y = 5;
        window.GameCore.pocketScene.add(roomMesh);
          
        clock = new THREE.Clock(); window.GameCore.world = new RAPIER.World({ x: 0.0, y: -20.0, z: 0.0 });
  
        const horizonGeo = new THREE.PlaneGeometry(100000, 100000, 512, 512); 
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
                    float mountainMask = smoothstep(50000.0, 70000.0, dist); 
                      
                    float h = noise(worldPosition.xz * 0.0001) * 2500.0;
                    h += noise(worldPosition.xz * 0.001) * 200.0;
                      
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
                    vec3 color = mix(vec3(0.05, 0.08, 0.1), vec3(0.2, 0.25, 0.3), vHeight / 2500.0);
                      
                    float dist = length(vWorldPos.xz);
                    float fogFactor = smoothstep(1000.0, 80000.0, dist);
                      
                    gl_FragColor = vec4(mix(color, fogColor, fogFactor), 1.0);
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

        window.EventBus.on('SCENE_SWAP', ({ target, pos }) => {
            if (target === 'establishment') {
                composer.removePass(worldPass);
                composer.insertPass(pocketPass, 0);
                  
                if (window.GameCore.playerObj) {
                    window.GameCore.playerObj.body.setTranslation({ x: 0, y: 1, z: 0 }, true);
                    window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    window.EngineParams.suppressChunkLoading = true;
                }
            } else if (target === 'world') {
                composer.removePass(pocketPass);
                composer.insertPass(worldPass, 0);
                  
                if (window.GameCore.playerObj && pos) {
                    const groundY = window.WorldGenerator.getTerrainHeight(pos.x, pos.z) + 1;
                    window.GameCore.playerObj.body.setTranslation({ x: pos.x, y: groundY, z: pos.z }, true);
                    window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    window.EngineParams.suppressChunkLoading = false;
                    ChunkManager.update(new THREE.Vector3(pos.x, groundY, pos.z));
                }
            }
            window.EventBus.emit('ENV_UPDATE');
        });

        window.GameCore.passes.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), window.EngineParams.bloom, 0.25, 0.9); composer.addPass(window.GameCore.passes.bloom);
        
        const VignetteShader = { uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }` };
        window.GameCore.passes.vignette = new ShaderPass(VignetteShader); composer.addPass(window.GameCore.passes.vignette);
        
        const ColorTintShader = { uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }` };
        window.GameCore.passes.colorTint = new ShaderPass(ColorTintShader); composer.addPass(window.GameCore.passes.colorTint);

        const startY = window.WorldGenerator.getTerrainHeight(0, 0); const safeY = isNaN(startY) ? 1 : startY;
        spawnPlayer(0, safeY, 0); spawnPartyMembers(); ChunkManager.update(new THREE.Vector3(0, safeY, 0));
        
        window.EventBus.on('ENV_UPDATE', () => {
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
        
        window.EventBus.emit('ENGINE_READY'); window.EventBus.emit('ENV_UPDATE');
    } catch(e) { console.error("CRITICAL BOOT ERROR", e); }
}

window.bootEngine = bootEngine;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-start')?.addEventListener('click', (e) => {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        window.EventBus.emit('UI_UPDATE_HUD');
        window.EventBus.emit('GAME_STARTED');

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
            if(window.GameCore.camera) {
                window.GameCore.camera.aspect = window.innerWidth / window.innerHeight; 
                window.GameCore.camera.updateProjectionMatrix(); 
            }
            if(renderer) {
                renderer.setSize(window.innerWidth, window.innerHeight); 
                composer.setSize(window.innerWidth, window.innerHeight); 
            }
        });
    
        function animate() { 
            requestAnimationFrame(animate); 
            let delta = clock.getDelta(); 
            if (delta > 0.1) delta = 0.1; 
            accumulator += delta; 
        
            while (accumulator >= fixedTimeStep) { 
                if(window.GameCore.world) window.GameCore.world.step(); 
        
                window.GameCore.checkFloatingOrigin();
        
                fixedUpdateLogic(fixedTimeStep); 
                accumulator -= fixedTimeStep; 
            } 

            updateCameraPosition();

            if(composer) composer.render(); 
        }
    
        animate();
    
        window.EventBus.emit('UI_LOG', "Welcome to the woods. Press U for Dev Tools.");
    }, { once: true }); 
});

bootEngine();
