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

    if (window.GameState?.pStats) window.GameState.pStats.stamina = Math.max(0, currentStamina - profile.stamina); 
    
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
    if (currentStamina < 30) { window.EventBus?.emit('UI_LOG', 'Too exhausted to use Guardbreaker.'); return; }
    
    const profile = { stamina: 30, cooldown: 0.7, reach: 3.5, radius: 1.0, angle: Math.PI * 0.4, multiplier: 0.7, poise: 999, windup: 0.2, duration: 0.2, isGuardbreaker: true };
    
    if (window.GameState?.pStats) window.GameState.pStats.stamina -= profile.stamina;
    window.Input.guardbreakerCooldown = 5;
    window.Input.isAttacking = true;
    window.Input.attackCooldown = profile.cooldown;
    
    playEntityAnimation(window.GameCore.playerObj, 'attack');
    window.EventBus?.emit('SPAWN_FLOATING_TEXT', { text: 'GUARDBREAKER', pos: window.GameCore.playerObj.visual.position, color: '#fbbf24' });
    
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

// EVENT BUS LISTENERS
window.EventBus?.on('PRIMARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(); });
window.EventBus?.on('SECONDARY_CLICK_DOWN', () => { if(window.Input?.attackCooldown <= 0) performAttack(true); });
window.EventBus?.on('GUARDBREAKER', performGuardbreaker);

window.EventBus?.on('TOGGLE_STEALTH', () => {
    if (!window.GameCore.playerObj) return;
    window.Input.isStealth = !window.Input.isStealth;
    
    const player = window.GameCore.playerObj;
    if (window.Input.isStealth) {
        window.EventBus.emit('UI_LOG', '[STEALTH] You blend into the surroundings.');
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'STEALTH', pos: player.visual.position, color: '#94a3b8' });
        
        if (player.body) {
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
        }
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
    window.VFXManager.spawnProjectile({ position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), direction, damage: 22 + window.GameCore.getBuffBonus('meleeAtt'), damageType: 'void', speed: 16, range: 20, color: '#a855f7', owner: 'player' });
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
    window.VFXManager.spawnProjectile({ position: player.visual.position.clone().add(new THREE.Vector3(0, 1, 0)).addScaledVector(direction, 0.9), direction, damage: 28 + window.GameCore.getBuffBonus('meleeAtt'), damageType: 'fire', speed: 14, range: 18, color: '#fb923c', owner: 'player', statusEffect: { type: 'burning', duration: 3, tickDamage: 2 } });
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
            window.GameCore.releaseEntityIndex(target.memoryIndex);
            if (target.visual) window.GameCore.scene.remove(target.visual);
            if (target.body) {
                window.GameCore.world.removeRigidBody(target.body);
                target.body = null;
            }
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
        if (en.body) {
            window.GameCore.world.removeRigidBody(en.body); 
            en.body = null;
        }
    }); 
    window.GameCore.activeEntities = window.GameCore.activeEntities.filter(en => en.def.faction === 'player'); 
    window.GameState.questBoard = []; 
    window.EventBus.emit('UI_LOG', "World Entities Cleared."); 
});

// ==========================================
// CAMP & BASE SYSTEMS
// ==========================================

function spawnPartyMembers() {
    if (!window.GameCore?.playerObj || !window.GameState?.party?.members) return;
    const playerPosition = window.GameCore.playerObj.body.translation();
    window.GameState.party.members.forEach((member, index) => {
        if (window.GameCore.activeEntities.some(entity => entity.companionId === member.id || entity.recruitId === member.id)) return;
        const companionX = playerPosition.x + 2 + index * 2;
        const companionZ = playerPosition.z + 2;
        const companion = instantiatePrefab(member.prefab, companionX, safeGetTerrainHeight(companionX, companionZ), companionZ, 'persistent');
        if (companion) {
            if (member.recruited) companion.companionId = member.id; else companion.recruitId = member.id;
            companion.hp = member.hp || member.maxHp || 100;
            companion.name = member.name;
        }
    });
}

function processCompanionNeeds() {
    if (!window.GameState?.pStats || !window.GameState?.party?.members) return;
    
    const hoursPerSecond = 24 / (window.EngineParams?.dayLengthSeconds || 1200);
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
            window.EventBus?.emit('UI_LOG', "You have starved to death.");
        } else {
            window.EventBus?.emit('UI_LOG', `Starvation: You are growing weak (${Math.floor(weakness*100)}% debuff)`);
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
                window.EventBus?.emit('UI_LOG', `${member.name} has starved to death.`);
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
    const base = window.GameState?.base;
    if (!base?.owned) return;
    const workers = window.GameState.party.members.filter(member => member.recruited && !member.downed);
    const farmers = workers.filter(member => member.job === 'farm').length;
    const researchers = workers.filter(member => member.job === 'research').length;
    if (farmers > 0 && base.farms.length > 0) {
        const harvest = farmers * base.farms.length * 2;
        for (let index = 0; index < harvest; index++) base.storage.push('food');
        window.EventBus?.emit('UI_LOG', `[CAMP] Harvested ${harvest} rations.`);
    }
    if (researchers > 0) {
        base.researchPoints = (base.researchPoints || 0) + researchers;
        window.EventBus?.emit('UI_LOG', `[CAMP] Generated ${researchers} runic research point${researchers === 1 ? '' : 's'}.`);
    }
}

function syncCaravanAgents() {
    if (!window.VillageManager?.villages) return;
    window.VillageManager.villages.forEach(village => {
        village.caravans?.filter(caravan => caravan.status === 'traveling').forEach(caravan => {
            if (window.GameCore.activeEntities.some(entity => entity.caravanId === caravan.id)) return;
            const position = caravan.position || { x: village.x + 3, z: village.z };
            const agent = instantiatePrefab('Merchant Caravan', position.x, safeGetTerrainHeight(position.x, position.z), position.z, 'persistent');
            if (agent) { agent.caravanId = caravan.id; agent.villageId = village.id; }
        });
    });
}
window.GameCore.syncCaravanAgents = syncCaravanAgents;

function syncPlayerBase() {
    const base = window.GameState?.base;
    if (!base?.owned) return;
    base.structures.forEach(structure => {
        if (window.GameCore.activeEntities.some(entity => entity.playerBase && entity.name === structure.prefab)) return;
        const entity = instantiatePrefab(structure.prefab, structure.x, safeGetTerrainHeight(structure.x, structure.z), structure.z, 'persistent');
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
    if (window.VFXManager?.applyAura) window.VFXManager.applyAura(window.GameCore.playerObj, def);
};

function punishExposedActors() {
    const player = window.GameCore?.playerObj;
    const playerSafe = player && (window.RoadManager?.isSafeZone?.(player.visual.position) || window.RoadManager?.isVillageProtected?.(player.visual.position));
    const destination = () => window.RoadManager?.getRandomPathPoint?.() || { x: 0, z: 0 };
    
    if (player && player.body && !playerSafe) {
        if ((window.GameCore?.getForestLuck?.() || 0) > 0 && Math.random() < (window.GameState?.forestBlessing?.teleportLuck || 0)) {
            window.EventBus?.emit('UI_LOG', '[THE CROW] The woods reach for you, but the landing bends away.');
        } else {
            const point = destination(); 
            const y = safeGetTerrainHeight(point.x, point.z) + 5.0;
            
            player.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            player.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            player.body.setTranslation({ x: point.x, y, z: point.z }, true); 
            ChunkManager.forceUpdatePosition(new THREE.Vector3(point.x, y, point.z));
            window.EventBus?.emit('UI_LOG', '[THE WOODS] The shift catches you. You are thrown across the new landscape.');
        }
    }
    
    if (window.GameCore?.activeEntities) {
        window.GameCore.activeEntities.filter(entity => entity.body && entity.def?.type === 'npc' && !window.RoadManager?.isVillageProtected?.(entity.visual.position)).forEach(entity => {
            if ((window.GameCore?.getForestLuck?.(entity) || 0) > 0 && Math.random() < (entity.forestBlessing?.teleportLuck || 0)) return;
            const point = destination(); 
            const y = safeGetTerrainHeight(point.x, point.z) + 2.0;
            entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            entity.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            entity.body.setTranslation({ x: point.x, y, z: point.z }, true); 
        });
    }
}

function regenerateWorldCycle() {
    if (window.EngineParams?.suppressWorldRegenerate) return;
    
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
            
            const newEpoch = window.EpochManagerInstance?.advanceEpoch?.() || 1;
            
            if (window.EngineParams) {
                window.EngineParams.worldSeed = window.EpochManagerInstance?.currentSeed || window.EngineParams.worldSeed;
                window.EngineParams.lastCycleDay = window.EngineParams.worldDay;
            }
            
            if (window.VillageManager && window.VillageManager.villages?.length > 0) {
                window.VillageManager.shiftLocations?.();
            }

            let playerShiftedSafely = false;
            
            if (window.GameCore?.playerObj && window.GameCore.playerObj.body) {
              const playerPos = window.GameCore.playerObj.visual.position;
                
              const protectedVillage = window.VillageManager?.villages?.find(v => {
                  const distSq = Math.pow(playerPos.x - v.x, 2) + Math.pow(playerPos.z - v.z, 2);
                  return distSq <= Math.pow(v.territory?.barrierRadius || 90, 2);
              });
                
              const hasAnchorItem = window.GameState?.inventory?.equipment?.waist === 'epoch_anchor' || 
                                    window.GameState?.inventory?.backpack?.includes('epoch_anchor');
                
              if (protectedVillage) {
                  const newY = safeGetTerrainHeight(protectedVillage.x, protectedVillage.z) + 5.0;
                  window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
                  window.GameCore.playerObj.body.setAngvel({x: 0, y: 0, z: 0}, true);
                  window.GameCore.playerObj.body.setTranslation({x: protectedVillage.x, y: newY, z: protectedVillage.z}, true);
                  ChunkManager.forceUpdatePosition(new THREE.Vector3(protectedVillage.x, newY, protectedVillage.z));
                  playerShiftedSafely = true;
                  window.EventBus?.emit('UI_LOG', `[EPOCH ${newEpoch}] The ward held. You shifted safely with ${protectedVillage.name}.`);
              } 
              else if (hasAnchorItem) {
                  const nearestRoadPt = window.RoadManager?.getRandomPathPoint?.();
                  if (nearestRoadPt) {
                      const newY = safeGetTerrainHeight(nearestRoadPt.x, nearestRoadPt.z) + 5.0;
                      window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
                      window.GameCore.playerObj.body.setAngvel({x: 0, y: 0, z: 0}, true);
                      window.GameCore.playerObj.body.setTranslation({x: nearestRoadPt.x, y: newY, z: nearestRoadPt.z}, true);
                      ChunkManager.forceUpdatePosition(new THREE.Vector3(nearestRoadPt.x, newY, nearestRoadPt.z));
                      playerShiftedSafely = true;
                      window.EventBus?.emit('UI_LOG', `[EPOCH ${newEpoch}] The Anchor burns in your pocket, pulling you to the nearest road.`);
                  }
              }
            }
            
            if (!playerShiftedSafely && !window.EngineParams?.isPlayerSafe && window.GameCore?.playerObj?.body) {
              const forestExtent = (window.WorldGenConfig?.darkForestSideMeters || 100000) / 2 - 1000;
              let newX, newZ;
              let valid = false;
              while(!valid) {
                  newX = (Math.random() * 2 - 1) * forestExtent;
                  newZ = (Math.random() * 2 - 1) * forestExtent;
                  if (Math.abs(newX) > 500 || Math.abs(newZ) > 500) valid = true;
              }
              const newY = safeGetTerrainHeight(newX, newZ) + 5.0;
              window.GameCore.playerObj.body.setLinvel({x: 0, y: 0, z: 0}, true);
              window.GameCore.playerObj.body.setAngvel({x: 0, y: 0, z: 0}, true);
              window.GameCore.playerObj.body.setTranslation({x: newX, y: newY, z: newZ}, true);
              ChunkManager.forceUpdatePosition(new THREE.Vector3(newX, newY, newZ));
              window.EventBus?.emit('UI_LOG', `[EPOCH ${newEpoch}] You were caught unprotected. You are lost in the deep forest.`);
            }

            window.EventBus?.emit('WORLD_REGENERATE');
            
            window.CareerManager?.addXP?.('navigator', 100);
            window.CareerManager?.addXP?.('archivist', 50);
            
            window.EventBus?.emit('UI_LOG', `[EPOCH ${newEpoch}] The white wave passed. The forest has shifted.`);

            setTimeout(() => {
                uiOverlay.style.opacity = '0';
                setTimeout(() => { document.body.removeChild(uiOverlay); }, 3000);
            }, 1000); 

        }, 3000); 
    }, 100);
}

// SAFE WARP & TELEPORT HANDLERS
window.EventBus?.on('CMD_TELEPORT', (pos) => { 
    if (window.GameCore?.playerObj?.body) {
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
    if (!window.EngineParams?.arenaMode && window.GameState?.pStats?.hp <= 0) {
        window.GameCore?.recordCombatDefeat?.({ source: 'open-world', injury: `open-world defeat on day ${window.EngineParams.worldDay}` });
    }
    
    const respawnY = safeGetTerrainHeight(0, 0) + 5.0; 
    
    if (window.GameCore?.playerObj?.body) {
        window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        window.GameCore.playerObj.body.setTranslation({ x: 0, y: respawnY, z: 0 }, true); 
    }
    
    ChunkManager.forceUpdatePosition(new THREE.Vector3(0, respawnY, 0));
    if (window.GameState?.pStats) window.GameState.pStats.hp = window.GameState.pStats.maxHp; 
    if (window.GameState?.inventory) window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); 
    playEntityAnimation(window.GameCore?.playerObj, 'idle'); 
    window.EventBus?.emit('UI_UPDATE_HUD'); 
});

window.EventBus?.on('GAME_STARTED', () => {
    if (window.CapitalCityManager && !window.CapitalCityManager.isGenerated) {
        window.CapitalCityManager.generateCapital();
    }
    
    if (window.GameCore?.playerObj && window.GameCore.playerObj.body) {
        ChunkManager.activeChunks.forEach((chunk, key) => ChunkManager.unloadChunk(key));
        ChunkManager.currentChunkX = null;
        ChunkManager.currentChunkZ = null;
        
        const p = window.GameCore.playerObj.visual.position;
        ChunkManager.forceUpdatePosition(new THREE.Vector3(p.x, 0, p.z));
    }
    
    window.EventBus?.emit('UI_LOG', "World Simulation Engaged. Wilderness Synchronized.");
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
