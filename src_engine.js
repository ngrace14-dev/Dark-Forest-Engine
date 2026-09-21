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

// ==========================================
// WORLD CLOCK & SIMULATION
// ==========================================

function updateWorldClock(delta) {
    if (!window.NetworkSession?.connected) {
        const hoursPerSecond = 24 / (window.EngineParams?.dayLengthSeconds || 1200);
        window.EngineParams.timeOfDay += delta * hoursPerSecond;
        if (window.EngineParams.timeOfDay >= 24) {
            const elapsedDays = Math.floor(window.EngineParams.timeOfDay / 24);
            window.EngineParams.timeOfDay %= 24;
            window.EngineParams.worldDay += elapsedDays;
            
            for (let day = 0; day < elapsedDays; day++) {
                processCompanionNeeds(); 
                processBaseJobs();
                window.AdventurerManager?.advanceDay();
                window.GameState?.processCrowDay?.();
            }
            
            if (window.EngineParams.worldDay > 0 && window.EngineParams.worldDay % (window.EngineParams.cycleLengthDays || 14) === 0) {
                regenerateWorldCycle();
            }
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
    
    // Regenerate stamina when not sprinting or blocking
    if (!window.Input.isSprinting && !window.Input.isBlocking) {
        window.GameState.pStats.stamina = Math.min(
            window.GameState.pStats.maxStamina, 
            window.GameState.pStats.stamina + 12 * staminaMultiplier * delta
        );
    }

    // Regenerate poise
    if (performance.now() >= (window.GameState.pStats.guardBrokenUntil || 0)) {
        window.GameState.pStats.poise = Math.min(
            window.GameState.pStats.maxPoise, 
            window.GameState.pStats.poise + 10 * delta
        );
    }
    
    // Process status effects (poison, burning, etc)
    if (window.GameState.statusEffects) {
        window.GameState.statusEffects = window.GameState.statusEffects.filter(effect => {
            effect.remaining -= delta; 
            effect.tickTimer -= delta;
            
            if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
                effect.tickTimer = 1;
                const resistance = window.GameCore?.getResistance?.(effect.type) || 0;
                const tickDamage = Math.max(1, effect.tickDamage - resistance);
                window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - tickDamage);
                window.EventBus?.emit('ENTITY_DAMAGED', { 
                    damage: tickDamage, 
                    position: window.GameCore.playerObj.visual.position, 
                    isPlayer: true 
                });
            }
            return effect.remaining > 0;
        });
    }
}

// ==========================================
// ENTITY MANAGEMENT & COMBAT PROCESSING
// ==========================================

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
            // Align base to the terrain surface
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
                        window.EventBus?.emit('SPAWN_HIT_VFX', { 
                            type: entity.def.touchEffect, 
                            pos: entity.visual.position.clone().add(_v1.set(0, 1, 0)) 
                        });
                        
                        if (entity.def.touchEffect === 'Poison') {
                            window.GameCore.applyStatusEffect?.('poison', 6, 3);
                        }
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

            // Punish player for wandering off safe paths if hostile nearby
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
            
            window.EventBus?.emit('ENTITY_DAMAGED', { 
                damage: tickDamage, 
                position: entity.visual.position, 
                isPlayer: false 
            });
            window.EventBus?.emit('SPAWN_HIT_VFX', { 
                type: effect.type === 'burning' ? 'Fire' : 'Void', 
                pos: entity.visual.position 
            });
            
            if (entity.hp <= 0) {
                handleEntityDeath(entity);
                break;
            }
        }
        
        if (effect.remaining <= 0) {
            entity.statusEffects.splice(j, 1);
        }
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
        if (window.GameCore?.AnimationSystem) {
            window.GameCore.AnimationSystem.disposeEntity(entity.id);
        }
        if (window.GameCore?.releaseEntityIndex) {
            window.GameCore.releaseEntityIndex(entity.memoryIndex);
        }
        window.GameCore?.SpatialGrid?.unregisterEntity?.(entity);
        
        if (entity.visual && window.GameCore?.scene) {
            window.GameCore.scene.remove(entity.visual);
        }
        if (entity.body && window.GameCore?.world) {
            window.GameCore.world.removeRigidBody(entity.body);
            entity.body = null;
        }
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(candidate => candidate.id !== entity.id);
        }
    }, 2000);
}

// ==========================================
// PLAYER MOVEMENT & SPRINT ENGINE
// ==========================================

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
        
        // CALIBRATED 15-MINUTE MILE BASE SPEED: ~1.7882 m/s
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
            if (window.GameState?.pStats) {
                window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 8 * delta);
            }
        } else if (window.Input.isSprinting) {
            maxSpeed *= 1.75; // Sprint multiplier
            if (window.GameState?.pStats) {
                window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 15 * delta); 
            }
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
                
                if (window.Input.isSprinting) {
                    playEntityAnimation(window.GameCore.playerObj, 'dash'); // Assuming dash serves as sprint animation
                } else {
                    playEntityAnimation(window.GameCore.playerObj, 'walk'); 
                }
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
// COMBAT ENGINE
// ==========================================

function performAttack(isHeavy = false) {
    if (!window.GameCore?.playerObj?.visual) return;
    if (window.Input?.isBlocking || window.Input?.isAttacking) return; 
    if (window.GameCore.playerObj.currentAnimState === 'hit' || window.GameCore.playerObj.currentAnimState === 'die') return;
    
    const isDashStrike = !isHeavy && window.Input?.isSprinting;
    
    const profile = isHeavy ? 
        { stamina: 35, cooldown: 1.2, reach: 4.5, radius: 1.5, angle: Math.PI * 0.8, multiplier: 2.2, poise: 2.5, windup: 0.15, duration: 0.35 } : 
        isDashStrike ? 
        { stamina: 20, cooldown: 1.0, reach: 5.0, radius: 1.2, angle: Math.PI * 0.4, multiplier: 1.6, poise: 1.8, windup: 0.1, duration: 0.25 } : 
        { stamina: 15, cooldown: 0.8, reach: 3.5, radius: 1.0, angle: Math.PI * 0.6, multiplier: 1.0, poise: 1.0, windup: 0.1, duration: 0.25 };
        
    const currentStamina = window.GameState?.pStats?.stamina ?? 100;
    
    if (currentStamina < profile.stamina) { 
        window.EventBus?.emit('UI_LOG', 'Too exhausted to attack.'); 
        return; 
    }

    if (window.NetworkSession?.connected) window.NetworkSession.sendAttack(isHeavy);

    if (window.GameState?.pStats) {
        window.GameState.pStats.stamina = Math.max(0, currentStamina - profile.stamina); 
    }
    
    if (window.Input) {
        window.Input.isAttacking = true; 
        window.Input.attackCooldown = profile.cooldown;
    }
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    
    if (window.Input) {
        window.Input.activeSweep = {
            profile: profile,
            timer: profile.windup + profile.duration,
            activeAt: profile.duration, 
            alreadyHit: new Set(),
            isHeavy: isHeavy,
            playerPos: new THREE.Vector3(), 
            playerForward: new THREE.Vector3()
        };
    }

    window.GameCore?.addXP?.('meleeAtt', isHeavy ? 4 : 2); 
}

function performGuardbreaker() {
    if (!window.Input || window.Input.isBlocking || window.Input.isAttacking || window.Input.guardbreakerCooldown > 0 || !window.GameCore?.playerObj?.visual) return;
    
    const currentStamina = window.GameState?.pStats?.stamina ?? 100;
    
    if (currentStamina < 30) { 
        window.EventBus?.emit('UI_LOG', 'Too exhausted to use Guardbreaker.'); 
        return; 
    }
    
    const profile = { 
        stamina: 30, cooldown: 0.7, reach: 3.5, radius: 1.0, 
        angle: Math.PI * 0.4, multiplier: 0.7, poise: 999, 
        windup: 0.2, duration: 0.2, isGuardbreaker: true 
    };
    
    if (window.GameState?.pStats) {
        window.GameState.pStats.stamina -= profile.stamina;
    }
    
    window.Input.guardbreakerCooldown = 5;
    window.Input.isAttacking = true;
    window.Input.attackCooldown = profile.cooldown;
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    window.EventBus?.emit('SPAWN_FLOATING_TEXT', { 
        text: 'GUARDBREAKER', 
        pos: window.GameCore.playerObj.visual.position, 
        color: '#fbbf24' 
    });
    
    window.Input.activeSweep = {
        profile: profile,
        timer: profile.windup + profile.duration,
        activeAt: profile.duration,
        alreadyHit: new Set(),
        isHeavy: true 
    };
}

function updateCombatHitboxes(delta) {
    if (!window.Input?.activeSweep || !window.GameCore?.playerObj?.body) return;
    
    const sweep = window.Input.activeSweep;
    sweep.timer -= delta;

    if (sweep.timer <= 0) {
        window.Input.activeSweep = null;
        return;
    }

    if (sweep.timer <= sweep.activeAt) {
        let pTrans;
        try {
            pTrans = window.GameCore.playerObj.body.translation();
        } catch (e) {
            return;
        }

        if (!sweep.playerPos) sweep.playerPos = new THREE.Vector3();
        if (!sweep.playerForward) sweep.playerForward = new THREE.Vector3();

        sweep.playerPos.set(pTrans.x, pTrans.y, pTrans.z);
        sweep.playerForward.set(0, 0, 1).applyQuaternion(window.GameCore.playerObj.visual.quaternion).normalize();
        
        let candidates = [];
        if (window.GameCore.SpatialGrid?.getNearbyEntities) {
            candidates = window.GameCore.SpatialGrid.getNearbyEntities(sweep.playerPos.x, sweep.playerPos.z, sweep.profile.reach + 2);
        }
        
        if (!candidates || candidates.length === 0) {
            candidates = window.GameCore.activeEntities || [];
        }

        for (let i = candidates.length - 1; i >= 0; i--) {
            const en = candidates[i];
            if (!en || en === window.GameCore.playerObj || en.hp <= 0 || sweep.alreadyHit.has(en.id)) continue;
            if (en.def?.faction === 'player') continue;

            let ePos = en.visual ? en.visual.position : null;
            if (!ePos && en.body) {
                try {
                    const t = en.body.translation();
                    ePos = _v3.set(t.x, t.y, t.z);
                } catch(e) { continue; }
            }
            if (!ePos) continue;

            const dx = ePos.x - sweep.playerPos.x;
            const dz = ePos.z - sweep.playerPos.z;
            const distSq = dx * dx + dz * dz;
            const reachSq = (sweep.profile.reach + (en.def?.radius || 0.5)) ** 2;

            if (distSq <= reachSq) {
                _v1.set(dx, 0, dz).normalize();
                const angleToTarget = sweep.playerForward.angleTo(_v1);
                
                if (angleToTarget <= (sweep.profile.angle / 2) || distSq < 1.0) {
                    sweep.alreadyHit.add(en.id);
                    
                    let damageMultiplier = sweep.profile.multiplier;
                    if (window.Input.isStealth && sweep.isHeavy) {
                        damageMultiplier *= 5.0;
                        window.EventBus?.emit('SPAWN_FLOATING_TEXT', {text: "ASSASSINATION!", pos: ePos, color: '#ff0000'});
                        window.EventBus?.emit('UI_LOG', `[CRITICAL] You assassinated ${en.name}!`);
                        window.EventBus?.emit('TOGGLE_STEALTH');
                    }

                    const weaponDmg = window.GameState?.derivedStats?.weaponDamage ?? 10;
                    const strLvl = window.GameState?.pStats?.strength?.level ?? 1;
                    const strBuff = window.GameCore?.getBuffBonus?.('strength') ?? 0;
                    const attBuff = window.GameCore?.getBuffBonus?.('meleeAtt') ?? 0;
                    const injuryMult = window.GameCore?.getCombatInjuryMultiplier?.() ?? 1.0;

                    const rawDamage = weaponDmg + ((strLvl + strBuff) * 2) + attBuff;
                    const damage = Math.max(1, Math.floor(rawDamage * damageMultiplier * injuryMult) - (en.def?.armor || 0)); 
                    
                    en.hp = Math.max(0, en.hp - damage); 
                    en.poise = Math.max(0, (en.poise || 10) - (sweep.profile.poise || 10));

                    window.EventBus?.emit('ENTITY_DAMAGED', { damage: damage, position: ePos, isPlayer: false });
                    window.EventBus?.emit('SPAWN_HIT_VFX', { type: en.def?.vfx?.onHit || 'Blood', pos: ePos.clone().add(_v1.set(0, 1, 0)) });
                    
                    if (sweep.isHeavy || sweep.profile.isGuardbreaker) {
                        window.Input.hitPauseTimer = 0.08; 
                        window.Input.camShake = 0.5;
                        const recoilDir = sweep.playerForward.clone().negate();
                        if (window.GameCore.playerObj.body) {
                            window.GameCore.playerObj.body.applyImpulse(_v2.set(recoilDir.x * 5, 0, recoilDir.z * 5), true);
                        }
                    } else {
                        window.Input.hitPauseTimer = 0.03;
                    }

                    if (en.hp <= 0) {
                        handleEntityDeath(en);
                    }
                }
            }
        }
    }
}

// ==========================================
// CORE UPDATE LOOP
// ==========================================

function fixedUpdateLogic(delta) {
    if (window.GameCore?.playerObj) {
        ChunkManager.update(window.GameCore.playerObj.visual.position);
    }
    
    if (window.EngineParams?.offPathCaptureCooldown > 0) {
        window.EngineParams.offPathCaptureCooldown = Math.max(0, window.EngineParams.offPathCaptureCooldown - delta);
    }
    
    if (window.GameCore) {
        window.GameCore.worldTimer = (window.GameCore.worldTimer || 0) + delta;
    }
    
    updateWorldClock(delta);
    
    if (window.GameCore && window.GameCore.worldTimer > 0.25) { 
        updatePeriodicSystems();
        updateLightPool(); 
        
        const checkInterval = (4 / 24) * (window.EngineParams?.dayLengthSeconds || 1200); 
        if (!window.GameCore.lastNeedsCheck || (window.GameCore.worldTimerAbsolute || 0) > window.GameCore.lastNeedsCheck + checkInterval) {
             processCompanionNeeds();
             window.GameCore.lastNeedsCheck = window.GameCore.worldTimerAbsolute || 0;
        }

        window.GameCore.worldTimer = 0; 
    }

    if (window.GameCore) {
        window.GameCore.worldTimerAbsolute = (window.GameCore.worldTimerAbsolute || 0) + delta;
    }

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

// ==========================================
// CHUNK & SCENERY MANAGERS
// ==========================================

let _lastChunkCheckPos = new THREE.Vector3(Infinity, Infinity, Infinity);

const ChunkManager = {
    activeChunks: new Map(), 
    currentChunkX: null, 
    currentChunkZ: null,
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
            c.r += colorNoise; 
            c.g += colorNoise; 
            c.b += colorNoise;
            
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
        const chunk = this.activeChunks.get(key); 
        if(!chunk) return;
        
        chunk.mesh.geometry.dispose(); 
        chunk.mesh.material.dispose(); 
        
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
                imesh.geometry.dispose(); 
                imesh.material.dispose(); 
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
            legs.castShadow = true; 
            legs.receiveShadow = true;
            meshGroup.add(legs);

            const torso = new THREE.Mesh(
                new THREE.BoxGeometry(r * 1.5, h * 0.5, r * 1.2),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            torso.position.y = h * 0.55;
            torso.castShadow = true; 
            torso.receiveShadow = true;
            meshGroup.add(torso);

            const head = new THREE.Mesh(
                new THREE.BoxGeometry(r, r, r),
                new THREE.MeshStandardMaterial({ color: def.color || 0xcccccc, roughness: 0.8 })
            );
            head.position.y = h * 0.85;
            head.castShadow = true; 
            head.receiveShadow = true;
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
            mesh.castShadow = true; 
            mesh.receiveShadow = true; 
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

    entity.mixer = new THREE.AnimationMixer(entity.visual); 
    entity.actions = {}; 
    entity.currentAnimState = null; 
    
    const states = ['idle', 'walk', 'attack', 'block', 'dash', 'hit', 'die'];
    states.forEach(state => {
        if (def.animMap?.[state] && def.animMap[state] !== 'None') {
            const clip = clips.find(c => c.name === def.animMap[state]);
            if (clip) {
                const action = entity.mixer.clipAction(clip);
                if (state === 'attack' || state === 'dash' || state === 'hit' || state === 'die') {
                    action.setLoop(THREE.LoopOnce); 
                    action.clampWhenFinished = true;
                }
                entity.actions[state] = action;
            }
        }
    });
    playEntityAnimation(entity, 'idle');
}

function instantiatePrefab(name, x, y, z, chunkKey = 'persistent') {
    const def = window.AssetManager?.prefabs?.[name]; 
    if(!def) return;
    
    let mesh = getVisualMesh(def);
    
    const height = def.height || 2.0;
    const halfHeight = height / 2.0;
    const spawnY = y + halfHeight;

    mesh.position.set(x, y, z); 
    if (window.GameCore?.scene) window.GameCore.scene.add(mesh);

    let rigidBodyDesc = (def.type === 'structure' || def.type === 'hub' || def.type === 'mountain' || def.type === 'runeTower' || def.type === 'powerStone' || def.type === 'firePit' || def.type === 'streetLight' || def.type === 'merchantChest') ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic().lockRotations();
    
    if(!['structure', 'hub', 'mountain', 'runeTower', 'powerStone', 'firePit', 'streetLight', 'merchantChest'].includes(def.type)) {
        rigidBodyDesc.setLinearDamping(4.0);
    }
    
    rigidBodyDesc.setTranslation(x, spawnY, z); 
    let body = window.GameCore?.world ? window.GameCore.world.createRigidBody(rigidBodyDesc) : null;
    
    let collider = null;
    if (def.isObstacle !== false && body && window.GameCore?.world) {
        let colliderDesc; 
        if (['structure', 'hub', 'runeTower', 'powerStone', 'firePit', 'streetLight', 'merchantChest'].includes(def.type)) {
            colliderDesc = RAPIER.ColliderDesc.cuboid(def.radius, def.height/2, def.radius); 
        } else if (def.type === 'mountain') {
            colliderDesc = RAPIER.ColliderDesc.cone(def.height/2, def.radius); 
        } else {
            colliderDesc = RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius);
        }
        collider = window.GameCore.world.createCollider(colliderDesc, body);
    }

    const entity = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: name, 
        def: def, 
        visual: mesh, 
        body: body, 
        collider: collider, 
        chunkKey: chunkKey 
    };
    
    if (window.GameCore?.bindEntityToBuffer) {
        window.GameCore.bindEntityToBuffer(entity, def.hp || 50, def.poise || 30);
    }

    if(collider) collider.handle = Math.floor(Math.random() * 1000000); 
    if(body) body.userData = { entityId: entity.id };
    
    if (def.type === 'hub') { 
        activeLightEmitters.push({ mesh, color: def.color || 0xffd700, intensity: 2, distance: 15 });
        entity.ap = 0; 
        entity.food = 100; 
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

// ==========================================
// ARENA & COMBAT MANAGERS
// ==========================================

window.ArenaTestManager = {
    center: { x: 120, z: 120 }, 
    size: 40, 
    walls: [], 
    match: null,
    
    ensureArena: function() {
        if (this.walls.length > 0) return;
        const groundY = safeGetTerrainHeight(this.center.x, this.center.z);
        const wallHeight = 8; 
        const wallThickness = 1;
        
        const wallSpecs = [
            { x: this.center.x, z: this.center.z - this.size / 2, width: this.size + 2, depth: wallThickness },
            { x: this.center.x, z: this.center.z + this.size / 2, width: this.size + 2, depth: wallThickness },
            { x: this.center.x - this.size / 2, z: this.center.z, width: wallThickness, depth: this.size },
            { x: this.center.x + this.size / 2, z: this.center.z, width: wallThickness, depth: this.size }
        ];
        
        wallSpecs.forEach(spec => {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(spec.width, wallHeight, spec.depth), 
                new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.9 })
            );
            mesh.position.set(spec.x, groundY + wallHeight / 2, spec.z);
            mesh.castShadow = true; 
            mesh.receiveShadow = true; 
            window.GameCore.scene.add(mesh);
            
            const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(spec.x, groundY + wallHeight / 2, spec.z));
            window.GameCore.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.width / 2, wallHeight / 2, spec.depth / 2), body);
            this.walls.push({ mesh, body });
        });
    },
    
    enter: function() { 
        this.ensureArena(); 
        window.EngineParams.arenaMode = true; 
        window.EventBus?.emit('CMD_TELEPORT', this.center); 
        window.EventBus?.emit('UI_LOG', '[ARENA] Locked gladiator test arena entered.'); 
    },
    
    startMatch: function(totalWaves = 3) {
        if (this.match?.state === 'fighting') { 
            window.EventBus?.emit('UI_LOG', '[ARENA] A match is already in progress.'); 
            return; 
        }
        this.enter(); 
        this.clear(); 
        this.match = { state: 'fighting', totalWaves, transitionTimer: 0, waveCleared: false }; 
        window.EngineParams.arenaWave = 0; 
        window.GameState.gladiator.matchState = 'fighting'; 
        window.GameState.gladiator.objective = `Survive ${totalWaves} waves`; 
        window.EventBus?.emit('UI_LOG', `[ARENA] ${window.GameState.gladiator.name} enters the arena.`); 
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
            const entity = instantiatePrefab(prefab, x, safeGetTerrainHeight(x, z), z, 'arena');
            if (entity) { 
                entity.arenaEntity = true; 
                entity.arenaWave = wave; 
            }
        }
        window.EventBus?.emit('UI_LOG', `[ARENA] Monster wave ${wave} spawned.`);
    },
    
    update: function(delta) {
        if (!this.match || this.match.state !== 'fighting') return;
        if (window.GameState.pStats.hp <= 0) { 
            this.defeat(); 
            return; 
        }
        
        const living = window.GameCore.activeEntities.filter(entity => entity.arenaEntity && entity.hp > 0);
        
        if (living.length > 0) { 
            this.match.waveCleared = false; 
            return; 
        }
        
        if (!this.match.waveCleared) { 
            this.match.waveCleared = true; 
            this.match.transitionTimer = 2; 
            window.EventBus?.emit('UI_LOG', `[ARENA] Wave ${window.EngineParams.arenaWave} cleared.`); 
        }
        
        this.match.transitionTimer -= delta; 
        if (this.match.transitionTimer > 0) return;
        
        if (window.EngineParams.arenaWave >= this.match.totalWaves) {
            this.victory(); 
        } else { 
            this.match.waveCleared = false; 
            this.spawnWave(); 
        }
    },
    
    victory: function() { 
        this.match.state = 'victory'; 
        const reward = 50 + this.match.totalWaves * 25; 
        window.GameCore.recordCombatVictory({ source: 'arena', reward, fame: this.match.totalWaves * 5, label: 'won an arena match' }); 
        window.GameState.gladiator.matchState = 'victory'; 
        window.GameState.gladiator.objective = `Victory. Reward: ${reward} gold`; 
        window.EventBus?.emit('UI_LOG', `[ARENA] Victory. ${reward} gold awarded.`); 
        window.EventBus?.emit('OPEN_ARENA_RESULT', { result: 'victory', reward }); 
        window.EventBus?.emit('UI_UPDATE_HUD'); 
    },
    
    defeat: function() { 
        this.match.state = 'defeat'; 
        window.GameCore.recordCombatDefeat({ source: 'arena', injury: `arena defeat on day ${window.EngineParams.worldDay}` }); 
        window.GameState.gladiator.matchState = 'defeat'; 
        window.GameState.gladiator.objective = 'Defeated. Recover before the next match.'; 
        this.clear(); 
        window.EventBus?.emit('UI_LOG', '[ARENA] Defeat. The gladiator is dragged from the sand.'); 
        window.EventBus?.emit('OPEN_ARENA_RESULT', { result: 'defeat', reward: 0 }); 
        window.EventBus?.emit('UI_UPDATE_HUD'); 
    },
    
    clear: function() {
        window.GameCore.activeEntities.filter(entity => entity.arenaEntity).forEach(entity => {
            if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(entity.id);
            window.GameCore.releaseEntityIndex(entity.memoryIndex); 
            if (entity.visual) window.GameCore.scene.remove(entity.visual); 
            if (entity.body) { 
                window.GameCore.world.removeRigidBody(entity.body); 
                entity.body = null; 
            }
        });
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(entity => !entity.arenaEntity); 
        window.EventBus?.emit('UI_LOG', '[ARENA] Arena monsters cleared.');
    },
    
    exit: function() {
        this.clear(); 
        this.walls.forEach(wall => { 
            window.GameCore.scene.remove(wall.mesh); 
            if (wall.body) window.GameCore.world.removeRigidBody(wall.body); 
        }); 
        this.walls = [];
        window.EngineParams.arenaMode = false; 
        window.EngineParams.arenaWave = 0; 
        this.match = null; 
        window.GameState.gladiator.matchState = 'hub'; 
        window.GameState.gladiator.objective = 'Awaiting a match'; 
        window.EventBus?.emit('CMD_TELEPORT', { x: 0, z: 0 }); 
        window.EventBus?.emit('UI_LOG', '[ARENA] Returned to the open world.');
    }
};
window.EventBus?.on('ENTER_ARENA_TEST', () => window.ArenaTestManager.enter()); 
window.EventBus?.on('START_ARENA_MATCH', () => window.ArenaTestManager.startMatch()); 
window.EventBus?.on('SPAWN_ARENA_WAVE', () => window.ArenaTestManager.spawnWave()); 
window.EventBus?.on('CLEAR_ARENA_TEST', () => window.ArenaTestManager.clear()); 
window.EventBus?.on('EXIT_ARENA_TEST', () => window.ArenaTestManager.exit());

// ==========================================
// EVENT BUS LISTENERS (UI, INTERACTIONS)
// ==========================================

window.EventBus?.on('PRIMARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(); });
window.EventBus?.on('SECONDARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(true); });
window.EventBus?.on('GUARDBREAKER', performGuardbreaker);

window.EventBus?.on('TOGGLE_STEALTH', () => {
    if (!window.GameCore?.playerObj || !window.Input) return;
    window.Input.isStealth = !window.Input.isStealth;
    
    const player = window.GameCore.playerObj;
    if (window.Input.isStealth) {
        window.EventBus.emit('UI_LOG', '[STEALTH] You blend into the surroundings.');
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'STEALTH', pos: player.visual.position, color: '#94a3b8' });
        try {
            const pPos = player.body.translation();
            const biomeColor = window.WorldGenConfig?.biomes?.[window.WorldGenerator?.getBiome(pPos.x, pPos.z)]?.color || '#94a3b8';
            player.visual.traverse(child => {
                if (child.isMesh) {
                    child.userData.originalColor = child.material.color.clone();
                    child.material.color.set(biomeColor);
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
        } catch(e){}
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

window.EventBus?.on('VOID_RUNE_SHOT', () => {
    if (window.Input.runeShotCooldown > 0 || window.Input.isBlocking || !Object.values(window.GameState.inventory.runes).includes('voidward_rune')) return;
    if (window.GameState.pStats.stamina < 20 || !window.GameCore.playerObj.visual) { window.EventBus.emit('UI_LOG', 'A Voidward Rune and 20 stamina are required.'); return; }
    
    const player = window.GameCore.playerObj;
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.visual.quaternion).normalize();
    window.GameState.pStats.stamina -= 20;
    window.Input.runeShotCooldown = 3;
    
    window.VFXManager.spawnProjectile({ 
        position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), 
        direction, 
        damage: 22 + window.GameCore.getBuffBonus('meleeAtt'), 
        damageType: 'void', speed: 16, range: 20, color: '#a855f7', owner: 'player' 
    });
    
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'VOID SHOT', pos: player.visual.position, color: '#a855f7' });
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus?.on('FIRE_RUNE_SHOT', () => {
    if (window.Input.fireShotCooldown > 0 || window.Input.isBlocking || !Object.values(window.GameState.inventory.runes).includes('ember_rune')) return;
    if (window.GameState.pStats.stamina < 25 || !window.GameCore.playerObj.visual) { window.EventBus.emit('UI_LOG', 'An Ember Rune and 25 stamina are required.'); return; }
    
    const player = window.GameCore.playerObj;
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.visual.quaternion).normalize();
    window.GameState.pStats.stamina -= 25;
    window.Input.fireShotCooldown = 4;
    
    window.VFXManager.spawnProjectile({ 
        position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), 
        direction, 
        damage: 28 + window.GameCore.getBuffBonus('meleeAtt'), 
        damageType: 'fire', speed: 14, range: 18, color: '#fb923c', owner: 'player', 
        statusEffect: { type: 'burning', duration: 3, tickDamage: 2 } 
    });
    
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'FIRE SHOT', pos: player.visual.position, color: '#fb923c' });
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus?.on('PLAYER_PROJECTILE_HIT', ({ target, damage, damageType, position, statusEffect }) => {
    const actualDamage = Math.max(1, damage - (target.def.armor || 0));
    target.hp -= actualDamage;
    target.poise = Math.max(0, target.poise - actualDamage);
    window.EventBus.emit('ENTITY_DAMAGED', { damage: actualDamage, position, isPlayer: false });
    window.EventBus.emit('SPAWN_HIT_VFX', { type: damageType === 'fire' ? 'Fire' : 'Void', pos: position });
    
    if (statusEffect) {
        target.statusEffects = target.statusEffects || [];
        const activeEffect = target.statusEffects.find(effect => effect.type === statusEffect.type);
        if (activeEffect) {
            activeEffect.remaining = Math.max(activeEffect.remaining, statusEffect.duration);
        } else {
            target.statusEffects.push({ ...statusEffect, remaining: statusEffect.duration, tickTimer: 1 });
        }
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
            window.GameCore.releaseEntityIndex(target.memoryIndex);
            if (target.visual) window.GameCore.scene.remove(target.visual);
            if (target.body) { window.GameCore.world.removeRigidBody(target.body); target.body = null; }
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

window.EventBus?.on('SPAWN_HIT_VFX', ({type, pos}) => window.VFXManager?.spawnHit(type, pos));

window.EventBus?.on('SPAWN_INVASION', () => { 
    const p = window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : new THREE.Vector3(); 
    for(let i=0; i<3; i++) instantiatePrefab('Ghoul', p.x + (Math.random()-0.5)*15, safeGetTerrainHeight(p.x, p.z), p.z + (Math.random()-0.5)*15); 
    window.EventBus.emit('UI_LOG', "Ghoul Invasion Spawned!"); 
});

window.EventBus?.on('SPAWN_BLIGHT', () => {
    if (!window.GameCore.playerObj) return; 
    const p = window.GameCore.playerObj.visual.position; 
    const pts = window.RoadManager.getRoadPointsNear(Math.floor(p.x/60), Math.floor(p.z/60));
    
    if (pts.length > 0) { 
        const pt = pts[Math.floor(Math.random() * pts.length)]; 
        const root = instantiatePrefab('Blight Root', pt.x, safeGetTerrainHeight(pt.x, pt.z), pt.z, 'persistent'); 
        if (root) { root.hp = 150; window.EventBus.emit('UI_LOG', "A Blight Root has corrupted a nearby road!"); } 
    } else {
        window.EventBus.emit('UI_LOG', "No roads nearby to corrupt!");
    }
});

window.EventBus?.on('CLEAR_MAP', () => { 
    window.GameCore.activeEntities.forEach(en => { 
        if(en.def.faction === 'player') return; 
        if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(en.id);
        window.GameCore.releaseEntityIndex(en.memoryIndex); 
        if (en.visual) window.GameCore.scene.remove(en.visual);
        if (en.body) { window.GameCore.world.removeRigidBody(en.body); en.body = null; }
    }); 
    window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => en.def.faction === 'player'); 
    window.GameState.questBoard = []; 
    window.EventBus.emit('UI_LOG', "World Entities Cleared."); 
});

window.EventBus?.on('CLAIM_PLAYER_CAMP', () => {
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
    
    const camp = instantiatePrefab('Iron Fire Pit', playerPosition.x, safeGetTerrainHeight(playerPosition.x, playerPosition.z), playerPosition.z, 'persistent');
    if (!camp) return;
    camp.playerBase = true;
    base.owned = true;
    base.position = { x: playerPosition.x, z: playerPosition.z };
    base.structures.push({ prefab: 'Iron Fire Pit', x: playerPosition.x, z: playerPosition.z });
    window.EventBus.emit('UI_LOG', 'Wayfarer Camp claimed. The fire marks your territory.');
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus?.on('BUILD_BASE_STRUCTURE', prefab => {
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
    const x = base.position.x + 4 + (buildIndex % 3) * 4; 
    const z = base.position.z + Math.floor(buildIndex / 3) * 4;
    
    const entity = instantiatePrefab(prefab, x, safeGetTerrainHeight(x, z), z, 'persistent');
    if (!entity) return;
    
    entity.playerBase = true;
    base.structures.push({ prefab, x, z });
    if (prefab === 'Camp Farm Plot') base.farms.push({ x, z });
    if (prefab === 'Rune Tower') base.wardRadius = 30;
    
    window.CareerManager?.addXP('builder', 50);
    window.EventBus.emit('UI_LOG', `[CAMP] Built ${prefab}.`);
});

// ==========================================
// WORLD GENERATION & REGENERATION
// ==========================================

window.EventBus?.on('WORLD_REGENERATE', () => {
    window.EventBus.emit('CLEAR_MAP'); 
    
    const keys = Array.from(ChunkManager.activeChunks.keys()); 
    keys.forEach(k => ChunkManager.unloadChunk(k)); 
    ChunkManager.currentChunkX = null; 
    
    window.currentPrng = alea(window.EngineParams?.worldSeed ?? 1337); 
    window.currentNoise2D = window.createNoise2D(window.currentPrng);
    
    if (window.GameCore.playerObj && window.GameCore.playerObj.body) { 
        ChunkManager.forceUpdatePosition(new THREE.Vector3(window.GameCore.playerObj.visual.position.x, 0, window.GameCore.playerObj.visual.position.z));
        const vy = safeGetTerrainHeight(window.GameCore.playerObj.visual.position.x, window.GameCore.playerObj.visual.position.z) + 5.0; 
        window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true);
        window.GameCore.playerObj.body.setAngvel({x:0, y:0, z:0}, true);
        window.GameCore.playerObj.body.setTranslation({x: window.GameCore.playerObj.visual.position.x, y: vy, z: window.GameCore.playerObj.visual.position.z}, true); 
        spawnPartyMembers(); 
        syncCaravanAgents(); 
        syncPlayerBase(); 
    }
    window.EventBus.emit('UI_LOG', `World Math Regenerated with Seed: ${window.EngineParams.worldSeed}`);
});

window.EventBus?.on('CMD_TELEPORT', (pos) => { 
    if (window.GameCore.playerObj?.body) {
        const groundY = safeGetTerrainHeight(pos.x, pos.z);
        const safeY = (isNaN(groundY) ? 10 : groundY) + 5.0; 

        window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setTranslation({ x: pos.x, y: safeY, z: pos.z }, true);
        
        if (window.GameCore.playerObj.visual) {
            window.GameCore.playerObj.visual.position.set(pos.x, safeY - 1.0, pos.z);
        }

        ChunkManager.forceUpdatePosition(new THREE.Vector3(pos.x, safeY, pos.z));
    }
});

window.EventBus?.on('PLAYER_RESPAWN', () => { 
    if (!window.EngineParams.arenaMode && window.GameState.pStats.hp <= 0) {
        window.GameCore.recordCombatDefeat({ source: 'open-world', injury: `open-world defeat on day ${window.EngineParams.worldDay}` });
    }
    
    const respawnY = safeGetTerrainHeight(0, 0) + 5.0; 
    
    if (window.GameCore.playerObj?.body) {
        window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setTranslation({ x: 0, y: respawnY, z: 0 }, true); 
    }
    
    ChunkManager.forceUpdatePosition(new THREE.Vector3(0, respawnY, 0));
    window.GameState.pStats.hp = window.GameState.pStats.maxHp; 
    window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); 
    playEntityAnimation(window.GameCore.playerObj, 'idle'); 
    window.EventBus.emit('UI_UPDATE_HUD'); 
});

window.EventBus?.on('GAME_STARTED', () => {
    // 1. Force Capital City Generation
    if (window.CapitalCityManager && !window.CapitalCityManager.isGenerated) {
        window.CapitalCityManager.generateCapital();
    }
    
    // 2. Clear all potentially corrupted boot chunks and explicitly rebuild them 
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
        document.getElementById('loading-bar').style.width = "100%"; 
        document.getElementById('loading-container').classList.add('hidden'); 
        document.getElementById('btn-start').classList.remove('hidden');
        
        window.GameCore.scene = new THREE.Scene(); 
        window.GameCore.scene.fog = new THREE.FogExp2(0x040608, 0.00008); 
        window.GameCore.scene.background = new THREE.Color(0x040608);
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

        if (window.RenderOptimizer?.prewarmShaders) {
            window.RenderOptimizer.prewarmShaders(renderer, window.GameCore.scene, window.GameCore.camera);
        }

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
          
        clock = new THREE.Clock(); 
        window.GameCore.world = new RAPIER.World({ x: 0.0, y: -20.0, z: 0.0 });
  
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

        ambientLight = new THREE.AmbientLight(0xffffff, 1.5); 
        window.GameCore.scene.add(ambientLight);

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
        
        const VignetteShader = { 
            uniforms: { "tDiffuse": { value: null }, "darkness": { value: 0.35 } }, 
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, 
            fragmentShader: `uniform float darkness; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); float dist = distance(vUv, vec2(0.5)); float edge = smoothstep(0.25, 0.75, dist); texel.rgb *= 1.0 - edge * clamp(darkness, 0.0, 0.85); gl_FragColor = texel; }` 
        };
        window.GameCore.passes.vignette = new ShaderPass(VignetteShader); 
        composer.addPass(window.GameCore.passes.vignette);
        
        const ColorTintShader = { 
            uniforms: { "tDiffuse": { value: null }, "tintColor": { value: new THREE.Color('#2b4461') }, "tintIntensity": { value: 0.65 } }, 
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`, 
            fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 tintColor; uniform float tintIntensity; varying vec2 vUv; void main() { vec4 texel = texture2D( tDiffuse, vUv ); vec3 tinted = texel.rgb * tintColor * 2.0; vec3 finalColor = mix(texel.rgb, tinted, tintIntensity); gl_FragColor = vec4( finalColor, texel.a ); }` 
        };
        window.GameCore.passes.colorTint = new ShaderPass(ColorTintShader); 
        composer.addPass(window.GameCore.passes.colorTint);

        const startY = safeGetTerrainHeight(0, 0); 
        const safeY = isNaN(startY) ? 1 : startY;
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

        window.EventBus?.emit('ENGINE_READY'); 
        window.EventBus?.emit('ENV_UPDATE');
    } catch(e) { 
        console.error("CRITICAL BOOT ERROR", e); 
    }
}

window.bootEngine = bootEngine;

// ==========================================
// RENDER LOOP & INPUT BINDING
// ==========================================

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
                if (window.GameCore?.world) window.GameCore.world.step(); 
                if (window.GameCore?.checkFloatingOrigin) window.GameCore.checkFloatingOrigin();
        
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
