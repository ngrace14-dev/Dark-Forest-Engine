import * as THREE from 'three';


import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from 'rapier';
import alea from 'alea';

// Your AAA system imports
import WetlandsSystem from './src_systems_wetlands.js';
import MountainSystem from './src_systems_mountains.js';
import DunesSystem from './src_systems_dunes.js';
import TidewaterSystem from './src_systems_tidewater.js';


// Redwood Ecosystem imports
import RedwoodGenerator from './src_generators_redwood.js';
import ForestRenderer from './src_systems_forest_renderer.js';
import ForestImpostorSystem from './src_systems_forest_impostors.js';
import VolumetricFogSystem from './src_systems_volumetric_fog.js';
import BlockTerrainSystem from './src_systems_block_terrain.js';

window.THREE = THREE;
window.SkeletonUtils = SkeletonUtils;
window.BufferGeometryUtils = BufferGeometryUtils;
window.RAPIER = RAPIER;

let renderer, clock;
const fixedTimeStep = 1.0 / 60.0;
let accumulator = 0.0;

// ==========================================
// OPTIMIZATION: TERRAIN CACHE
// ==========================================
const terrainHeightCache = new Map();

// ==========================================

// PHYSICS ISOLATION SYSTEM
// ==========================================
const physicsWriteQueue = [];
const physicsReadCache = new Map();
let isPhysicsStepping = false;

window.PhysicsQueue = {
    enqueue: (fn) => physicsWriteQueue.push(fn),
    flush: () => {
        if (!window.GameCore?.world) return;
        while (physicsWriteQueue.length > 0) {
            const cmd = physicsWriteQueue.shift();
            try { cmd(); } catch(e) { console.warn("[Physics] Mutation failed", e); }
        }
    }
};

function updatePhysicsReadCache() {
    if (!window.GameCore?.world) return;
    physicsReadCache.clear();
    
    const entities = window.GameCore.activeEntities || [];
    for (let i = 0; i < entities.length; i++) {
        const en = entities[i];
        if (en.body) {
            try {
                const t = en.body.translation();
                const r = en.body.rotation();
                const v = en.body.linvel();
                physicsReadCache.set(en.id, {
                    translation: { x: t.x, y: t.y, z: t.z },
                    rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
                    linvel: { x: v.x, y: v.y, z: v.z }
                });
            } catch (e) {}
        }
    }
    
    const pObj = window.GameCore?.playerObj;
    if (pObj && pObj.body) {
        try {
            const t = pObj.body.translation();
            const r = pObj.body.rotation();
            const v = pObj.body.linvel();
            physicsReadCache.set('player', {
                translation: { x: t.x, y: t.y, z: t.z },
                rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
                linvel: { x: v.x, y: v.y, z: v.z }
            });
        } catch (e) {}
    }
}


const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _e1 = new THREE.Euler();
const _m1 = new THREE.Matrix4();
const _colorScratch = new THREE.Color();
const _dirtColorScratch = new THREE.Color('#4a3e31');

const _targetCamPos = new THREE.Vector3();
const _currentCamTarget = new THREE.Vector3();

function safeGetTerrainHeight(x, z) {
    if (!window.WorldGenerator?.getTerrainHeight) return 0;
    
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    if (terrainHeightCache.has(key)) return terrainHeightCache.get(key);
    
    const h = window.WorldGenerator.getTerrainHeight(x, z);
    const result = Number.isFinite(h) ? h : 0;
    
    terrainHeightCache.set(key, result);
    return result;
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

    const dirLight = window.RenderPipeline?.dirLight;
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
                    window.processCompanionNeeds?.();
                    window.processBaseJobs?.();
                    window.AdventurerManager?.advanceDay();
                    window.GameCore?.processCrowDay?.();
                    // --- WENDIGO EVOLUTION TICK ---
                    window.GameCore?.processMonsterEvolution?.();
                }

                // --- PHYSICAL CROW SYNC ---
                if (window.GameCore?.syncCrowModel && window.GameState?.narrator?.targetId) {
                    window.GameCore.syncCrowModel(window.GameState.narrator.targetId);
                }
            
                                // --- THE SHIFT SCATTERING ---
    if (window.EngineParams.worldDay > 0 && window.EngineParams.worldDay % (window.EngineParams.cycleLengthDays || 14) === 0) {
        window.GameCore?.applyShiftScattering?.();
    }


        }
    }
    window.EventBus?.emit('ENV_UPDATE');
}

function updatePeriodicSystems() {
    // Moved to VillageManager.initScheduler (Tier-based)
    window.AdventurerManager?.syncDeparted();
    window.AdventurerManager?.syncNearby();
}


function updatePlayerStats(delta) {
    if (!window.GameState?.pStats || !window.Input) return;
    
    window.EngineParams.isPlayerSafe = false;
    window.EngineParams.isPlayerHidden = false;
    
        const staminaMultiplier = 1 + (window.GameState.forestBlessing?.staminaRegen || 0);
    
            // --- NOBLE HOUSE CROW: PASSIVE STAMINA BUFF ---
            // If the Crow is watching the player, provide an additional stamina regen boost
            const crowWatchBonus = (window.GameState.narrator?.targetId === 'player') ? 1.5 : 1.0;

            if (!window.Input.isSprinting && !window.Input.isBlocking) {
                window.GameState.pStats.stamina = Math.min(
                    window.GameState.pStats.maxStamina, 
                    window.GameState.pStats.stamina + 12 * staminaMultiplier * crowWatchBonus * delta
                );
            }



    if (performance.now() >= (window.GameState.pStats.guardBrokenUntil || 0)) {
        window.GameState.pStats.poise = Math.min(
            window.GameState.pStats.maxPoise, 
            window.GameState.pStats.poise + 10 * delta
        );
    }
    
    if (window.GameState.statusEffects) {
        window.GameState.statusEffects = window.GameState.statusEffects.filter(effect => {
            effect.remaining -= delta;
            effect.tickTimer -= delta;
            
                        if (effect.tickDamage > 0 && effect.tickTimer <= 0) {
                effect.tickTimer = 1;
                const resistance = window.GameCore?.getResistance?.(effect.type) || 0;
                const tickDamage = Math.max(1, effect.tickDamage - resistance);
                window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - tickDamage);
                
                // Only spawn floating text and VFX periodically for DoT to prevent DOM spam
                if (!effect.lastVisualTick || performance.now() - effect.lastVisualTick > 1000) {
                    window.EventBus?.emit('ENTITY_DAMAGED', { 
                        damage: tickDamage, 
                        position: window.GameCore.playerObj.visual.position, 
                        isPlayer: true 
                    });
                    effect.lastVisualTick = performance.now();
                }
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

    let isHidden = false;
    let hostileNearby = false;

    for (let i = (window.GameCore?.activeEntities?.length || 0) - 1; i >= 0; i--) {
        const entity = window.GameCore.activeEntities[i];
        if (!entity || !entity.visual || !entity.body) continue;
        
        const cached = physicsReadCache.get(entity.id);
        const eTrans = cached ? cached.translation : entity.body.translation();

        try {
            const groundY = safeGetTerrainHeight(eTrans.x, eTrans.z);
            if (eTrans.y < groundY - 2.0) {
                const targetY = groundY + 3.0;
                window.PhysicsQueue.enqueue(() => {
                    if (entity.body) {
                        entity.body.setTranslation({ x: eTrans.x, y: targetY, z: eTrans.z }, true);
                        entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    }
                });
                eTrans.y = targetY; 
            }

            const totalHeight = entity.def?.height || 2.0;
            entity.visual.position.set(eTrans.x, eTrans.y - (totalHeight / 2), eTrans.z);
        } catch (e) {
            continue;
        }


        window.GameCore.SpatialGrid?.updateEntity?.(entity);
        window.VATManager?.processLOD?.(entity, camPos);

        if (entity.def?.type === 'npc' && entity.statusEffects?.length > 0 && entity.hp > 0) {
            processEntityStatusEffects(entity, delta);
        }

if (entity.def?.type === String.fromCharCode(110,112,99) || entity.def?.type === String.fromCharCode(99,104,97,114,97,99,116,101,114)) {
    let isVisible = false; let distSq = 0;
    if (playerAlive) { distSq = entity.visual.position.distanceToSquared(playerPosition);
        if (window.GameCore?.camera) {
            _v3.subVectors(entity.visual.position, camPos).normalize();
            const camForward = window.GameCore.camera.getWorldDirection(_v2);
            const dot = camForward.dot(_v3);
            isVisible = (dot > 0.5 && distSq < 10000); } }
    entity.userData = entity.userData || {};
    entity.userData.isVisible = isVisible; entity.userData.distSq = distSq;
    let shouldUpdateAI = false;
    if (isVisible && distSq < 400) { shouldUpdateAI = window.Heartbeat?.ticks.t60 ?? true;
    } else if (isVisible && distSq < 3600) { shouldUpdateAI = window.Heartbeat?.ticks.t20 ?? false;
    } else if (!isVisible && distSq < 1600) { shouldUpdateAI = window.Heartbeat?.ticks.t5 ?? false;
    } else { shouldUpdateAI = window.Heartbeat?.ticks.t1 ?? false; }
    if (shouldUpdateAI) { alignEntityToGround(entity, delta); } }

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
        const cachedP = physicsReadCache.get('player');
        const p = cachedP ? cachedP.translation : window.GameCore.playerObj.body.translation();
        
        try {
            window.EngineParams.isPlayerSafe = window.RoadManager?.isSafeZone?.(p) || window.CapitalCityManager?.isInsideCapital?.(p.x, p.z) || false;

            if (!window.EngineParams.isPlayerSafe && !window.EngineParams.isPlayerHidden && hostileNearby && !window.EngineParams.godMode && window.EngineParams.offPathCaptureCooldown <= 0) {
                const pathPoint = window.RoadManager?.getRandomPathPoint?.();
                if (pathPoint) {
                    ChunkManager.forceUpdatePosition(new THREE.Vector3(pathPoint.x, 0, pathPoint.z));
                    const safeY = safeGetTerrainHeight(pathPoint.x, pathPoint.z) + 5.0;
                    window.PhysicsQueue.enqueue(() => {
                        if (window.GameCore.playerObj.body) {
                            window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                            window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                            window.GameCore.playerObj.body.setTranslation({ x: pathPoint.x, y: safeY, z: pathPoint.z }, true);
                        }
                    });
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
            
            // Only spawn floating text and VFX periodically for DoT to prevent DOM/Particle spam
            if (!effect.lastVisualTick || performance.now() - effect.lastVisualTick > 1000) {
                window.EventBus?.emit('ENTITY_DAMAGED', { 
                    damage: tickDamage, 
                    position: entity.visual.position, 
                    isPlayer: false 
                });
                window.EventBus?.emit('SPAWN_HIT_VFX', { 
                    type: effect.type === 'burning' ? 'Fire' : 'Void', 
                    pos: entity.visual.position 
                });
                effect.lastVisualTick = performance.now();
            }
            
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

function alignEntityToGround(entity, delta) {
    if (!entity?.visual) return;
    const ePos = entity.visual.position;
    
    const step = 0.5;
    const hL = safeGetTerrainHeight(ePos.x - step, ePos.z);
    const hR = safeGetTerrainHeight(ePos.x + step, ePos.z);
    const hD = safeGetTerrainHeight(ePos.x, ePos.z - step);
    const hU = safeGetTerrainHeight(ePos.x, ePos.z + step);
    
    _v3.set(hL - hR, 2.0 * step, hD - hU).normalize();
    const hitNormal = _v3;
    
    const targetQuaternion = _q1.setFromUnitVectors(_v2.set(0, 1, 0), hitNormal);
    const currentYRotation = _e1.setFromQuaternion(entity.visual.quaternion, 'YXZ').y;
    const yQuat = _q1.setFromAxisAngle(_v2.set(0, 1, 0), currentYRotation);
    
    targetQuaternion.multiply(yQuat);
    entity.visual.quaternion.slerp(targetQuaternion, delta * 5.0);
}

function handleEntityDeath(entity) {
    playEntityAnimation(entity, 'die');
    window.AdventurerManager?.markDefeated?.(entity);
    
    // --- PHASE 1A: CHRONICLE ACTIVATION ---
    window.ChronicleManager?.recordEvent?.({
        actorId: entity.id,
        type: 'entity_death',
        detail: `${entity.name} has perished.`,
        significance: entity.def?.faction === 'monster' ? 20 : 50,
        historicalWeight: entity.def?.faction === 'monster' ? 5 : 15,
        location: { x: entity.visual.position.x, z: entity.visual.position.z }
    });

    if (entity.name === 'Deer') {

        window.CareerManager?.addXP?.('hunter', 25);
        window.EventBus?.emit('UI_LOG', `[HUNTER] You have harvested a deer carcass.`);
    }

        if (window.GameCore?.spawnGroundLoot) {
        // --- PHASE 1 ARTIFACT BRIDGE: WENDIGO DISCOVERY ---
        let lootType = entity.def?.faction === 'forest' ? 'corrupted_resin' : 'beast_bones';
        
        if (entity.name === 'Wendigo' || entity.name === 'Greater Wendigo') {
            lootType = 'wendigo_fragment';
            window.EventBus?.emit('UI_LOG', `[REVELATION] An ancient fragment has fallen from the horror.`);
        } else if (entity.name === 'Deer') {
            lootType = 'food';
        }

        window.GameCore.spawnGroundLoot(lootType, entity.visual.position);
    }


    window.awardMonsterKill?.(entity);
    
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
        
        if (entity.body) {
            const b = entity.body;
            window.PhysicsQueue.enqueue(() => {
                if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
            });
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
    
    const cached = physicsReadCache.get('player');
    const p = cached ? cached.translation : window.GameCore.playerObj.body.translation();

    const groundY = safeGetTerrainHeight(p.x, p.z);
    if (p.y < groundY - 2.0) { 
        const targetY = groundY + 5.0;
        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setTranslation({ x: p.x, y: targetY, z: p.z }, true);
                window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
        });
        p.y = targetY;
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

    const currentVel = cached ? cached.linvel : window.GameCore.playerObj.body.linvel();

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
            if (window.GameState?.pStats) {
                window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 8 * delta);
            }
        } else if (window.Input.isSprinting) {
            maxSpeed *= 1.75; 
            if (window.GameState?.pStats) {
                window.GameState.pStats.stamina = Math.max(0, window.GameState.pStats.stamina - 15 * delta); 
            }
            window.GameCore?.addXP?.('athletics', 0.25 * delta);
        } else {
            window.GameCore?.addXP?.('athletics', 0.05 * delta); 
        }

        maxSpeed *= (window.GameCore?.getCombatInjuryMultiplier?.() || 1.0);

        const targetVel = {
            x: moveDir.x * maxSpeed,
            y: currentVel.y,
            z: moveDir.z * maxSpeed
        };
        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setLinvel(targetVel, true);
            }
        });


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
                    playEntityAnimation(window.GameCore.playerObj, 'dash');
                } else {
                    playEntityAnimation(window.GameCore.playerObj, 'walk'); 
                }
            }
        }
        } else if (!window.Input.isAttacking && window.GameCore.playerObj.currentAnimState !== 'hit' && window.GameCore.playerObj.currentAnimState !== 'die') { 
        window.Input.isSprinting = false;
        const stopVel = {
            x: currentVel.x * 0.8,
            y: currentVel.y,
            z: currentVel.z * 0.8
        };
        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setLinvel(stopVel, true);
            }
        });

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
        const cachedP = physicsReadCache.get('player');
        const pTrans = cachedP ? cachedP.translation : window.GameCore.playerObj.body.translation();

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
                    const cachedE = physicsReadCache.get(en.id);
                    const t = cachedE ? cachedE.translation : en.body.translation();
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
                    en.poise = Math.max(0, (en.poise || 10) - (sweep.profile?.poise || 10));

                    // --- THE STEEL STRAND: COMBAT PROVENANCE ---
                    if (window.GameState?.inventory?.equipment?.weapon && window.MountainArchives?.anchorIntelToItem) {
                        const weaponId = window.GameState.inventory.equipment.weapon;
                        // For demonstration: Slaying high-significance targets anchors their death truth to the sword
                        if (en.hp <= 0 && (en.significance > 50 || en.name === 'Greater Wendigo')) {
                             // This should ideally use a properly generated Death Intel ID
                             // For now, we mock the association
                             window.MountainArchives.anchorIntelToItem(weaponId, `death_${en.id}`);
                        }
                    }

                    // --- PHASE 3: FRACTAL BLADE HOOK ---
                    if (en.hp <= 0 && window.GameState?.inventory?.equipment?.weapon === 'fractal_blade') {
                        // Reconstruction Event: affinity to MAX
                        en.affinity = 1.0; 
                        if (window.EncounterDirector?.recordFractalKill) {
                            window.EncounterDirector.recordFractalKill();
                        }
                        window.EventBus?.emit('UI_LOG', `⚔️ [RECONSTRUCTION] ${en.name} has been reconstructed by the Fractal Blade.`);
                    }

                    window.EventBus?.emit('ENTITY_DAMAGED', { damage: damage, position: ePos, isPlayer: false });




                    window.EventBus?.emit('SPAWN_HIT_VFX', { type: en.def?.vfx?.onHit || 'Blood', pos: ePos.clone().add(_v1.set(0, 1, 0)) });
                    
                    if (sweep.isHeavy || sweep.profile.isGuardbreaker) {
                        window.Input.hitPauseTimer = 0.08; 
                        window.Input.camShake = 0.5;
                        const recoilDir = sweep.playerForward.clone().negate();
                        window.PhysicsQueue.enqueue(() => {
                            if (window.GameCore.playerObj.body) {
                                window.GameCore.playerObj.body.applyImpulse(_v2.set(recoilDir.x * 5, 0, recoilDir.z * 5), true);
                            }
                        });
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
    terrainHeightCache.clear();
    if (window.Heartbeat) window.Heartbeat.update(delta);

    // --- PHASE 1D: TRUTH ACTIVATION (§14) ---
    if (window.TruthSystem?.update) {
        window.TruthSystem.update();
    }


    
    // Update Regional Relativity State
    if (window.EpochManagerInstance && window.GameCore?.playerObj) {
        const pPos = window.GameCore.playerObj.visual.position;
        const dist = Math.sqrt(pPos.x*pPos.x + pPos.z*pPos.z);
        const forestSide = window.WorldGenConfig?.darkForestSideMeters || 575843.2;
        const totalRadius = (forestSide / 2) + (window.WorldGenConfig?.mountainRingWidthMeters || 160934.4);
        
        window.EpochManagerInstance.updateDuneState(dist > totalRadius);
    }

    if (window.AssetBudget) window.AssetBudget.update();

    if (window.Profiler) window.Profiler.begin('Physics');
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
             window.processCompanionNeeds?.();
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
    
        if (window.CrowsEye) {
        window.CrowsEye.update(delta);
    }

    if (window.ForceManager) {
        window.ForceManager.update(delta);
    }
    
    if (window.GameCore?.AnimationSystem) {
        if (window.Profiler) window.Profiler.begin('Animation');
        window.GameCore.AnimationSystem.update(delta);
        if (window.Profiler) window.Profiler.end('Animation');
    }
    if (window.ForestRenderer) window.ForestRenderer.update(delta);
    
    if (window.GrassSystem) {
        if (!window.GrassSystem.initialized && window.GameCore?.scene) {
            window.GrassSystem.init(window.GameCore.scene);
        }
        
        const activePos = [];
        if (window.GameCore.playerObj?.visual) {
            activePos.push(window.GameCore.playerObj.visual.position);
        }
        
        window.GrassSystem.update(delta, activePos);
    }

        // AAA SYSTEM UPDATES
    if (window.GameCore?.wetlandsSystem && window.GameCore.camera) {
        window.GameCore.wetlandsSystem.update(delta, window.GameCore.camera);
    }
    
    if (window.GameCore?.mountainSystem && window.GameCore.camera) {
        window.GameCore.mountainSystem.update(delta, window.GameCore.camera);
    }

    if (window.GameCore?.dunesSystem && window.GameCore.camera) {
        window.GameCore.dunesSystem.update(
            delta, 
            window.GameCore.camera, 
            window.EngineParams?.worldDay || 0
        );
    }
    
    if (window.GameCore?.tidewaterSystem && window.GameCore.camera) {
        window.GameCore.tidewaterSystem.update(delta, window.GameCore.camera);
    }

    // REDWOOD ECOSYSTEM UPDATES
    if (window.BlockTerrainSystem && window.GameCore?.playerObj?.visual) {
        const pPos = window.GameCore.playerObj.visual.position;
        window.BlockTerrainSystem.updateStreaming(pPos.x, pPos.z, 6);
    }

    if (window.ForestImpostorSystem) {
        if (!window.ForestImpostorSystem.initialized && window.GameCore?.scene) {
            window.ForestImpostorSystem.init(window.GameCore.scene);
        }
        window.ForestImpostorSystem.update(window.GameCore?.worldTimerAbsolute || 0);
    }

    if (window.VolumetricFogSystem && window.EngineParams) {
        window.VolumetricFogSystem.update(
            window.GameCore?.worldTimerAbsolute || 0,
            window.EngineParams.timeOfDay
        );
    }

    updatePlayerStats(delta);
    if (window.Profiler) window.Profiler.begin('AI');
    updateEntities(delta);
    if (window.Profiler) window.Profiler.end('AI');

    if (window.RenderOptimizer && window.GameCore?.camera) {
        window.RenderOptimizer.updateEntityLOD(window.GameCore.activeEntities || [], window.GameCore.camera.position);
    }

        updatePlayerMovement(delta);
    updateCombatHitboxes(delta);
    if (window.Profiler) window.Profiler.end('Physics');
}

// ==========================================
// CHUNK & SCENERY MANAGERS
// ==========================================

const PERSISTENT_REALITY_LAYER = ['mountain', 'archive', 'runeTower', 'guardian_outpost', 'powerStone', 'arcaneDoor', 'firePit', 'streetLight'];

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
        const radius = window.EngineParams?.chunkRadius || 5;
        
        for (let x = cx - radius; x <= cx + radius; x++) { 
            for (let z = cz - radius; z <= cz + radius; z++) { 
                const dist = Math.max(Math.abs(x - cx), Math.abs(z - cz));
                const key = `${x},${z}`; 
                
                if (dist <= radius) {
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
        const localRoadPoints = window.RoadManager?.getRoadPointsNear?.(cx, cz) || [];

        this.activeChunks.set(key, { state: window.ChunkState.LOADING, mesh: null, body: null, collider: null, lod });

                window.TerrainWorkerPool.requestChunkData(
            cx, cz, lod, 60, window.EngineParams?.worldSeed || 1337, localRoadPoints,
            ({ positions, normals, colors, clutter }) => {
                if (!this.activeChunks.has(key)) return;

                // DIAGNOSTIC CHECK: Fix 4.1 Terrain Validation
                let minH = Infinity, maxH = -Infinity;
                for (let i = 1; i < positions.length; i += 3) {
                    const h = positions[i];
                    if (h < minH) minH = h;
                    if (h > maxH) maxH = h;
                }
                
                                const segments = lod === 'A' ? 30 : (lod === 'B' ? 10 : 2);
                
                const gridIndices = [];
                const gridX = segments + 1;
                for (let j = 0; j < segments; j++) {
                    for (let i = 0; i < segments; i++) {
                        const a = i + gridX * j;
                        const b = i + gridX * (j + 1);
                        const c = (i + 1) + gridX * (j + 1);
                        const d = (i + 1) + gridX * j;
                        gridIndices.push(a, b, d);
                        gridIndices.push(b, c, d);
                    }
                }
                


                const geo = new THREE.BufferGeometry();

                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geo.setAttribute('clutter', new THREE.BufferAttribute(clutter, 1));
                
                geo.setIndex(gridIndices);

                                const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 });

                // TEMPORARILY DISABLED FOG PATCH: To isolate geometry rendering issues
                // if (window.VolumetricFogSystem) {
                //     window.VolumetricFogSystem.patchMaterial(mat);
                // }

                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(chunkX, 0, chunkZ);
                mesh.receiveShadow = true;
                mesh.userData.isTerrain = true;
                mesh.userData.chunkKey = key;
                if (window.GameCore?.scene) window.GameCore.scene.add(mesh);

                                if (window.GameCore?.world) {
                    const indicesU32 = new Uint32Array(gridIndices);
                    window.PhysicsQueue.enqueue(() => {
                        if (!window.GameCore?.world) return;
                        const groundBody = window.GameCore.world.createRigidBody(
                            RAPIER.RigidBodyDesc.fixed().setTranslation(chunkX, 0, chunkZ)
                        );
                        const collider = window.GameCore.world.createCollider(
                            RAPIER.ColliderDesc.trimesh(positions, indicesU32),
                            groundBody
                        );
                        const activeRecord = this.activeChunks.get(key);
                        if (activeRecord) {
                            activeRecord.body = groundBody;
                            activeRecord.collider = collider;
                        }
                    });
                }


                if (window.RoadRenderer && window.GameCore?.scene) {
                    window.RoadRenderer.buildDecorationsForChunk(key, cx, cz, window.GameCore.scene);
                }

                if (isInsideAethelgard) {
                    window.EventBus?.emit('CHUNK_GENERATED');
                    return;
                }

                const chunkData = window.ForestManager?.generateChunk?.(cx, cz) || { tierA: [], tierB: [] };

                if (window.ForestRenderer?.setChunkInstances) {
                    const bushPoints = [];

                    if (chunkData.tierA && chunkData.tierA.length > 0) {
                        if (window.RedwoodGenerator?.isInitialized) {
                            const pointsByArchetype = new Map();
                            const ageStates = ['ANCIENT', 'MATURE', 'YOUNG', 'DYING'];

                            chunkData.tierA.forEach((point, idx) => {
                                const px = point.x;
                                const pz = point.z;
                                const py = safeGetTerrainHeight(px, pz);
                                const ageState = ageStates[idx % 4];
                                const varIdx = idx % 4;
                                const archKey = `Redwood_${ageState}_${varIdx}`;

                                if (!pointsByArchetype.has(archKey)) pointsByArchetype.set(archKey, []);
                                pointsByArchetype.get(archKey).push({
                                    x: px, y: py, z: pz,
                                    scale: 0.85 + Math.random() * 0.4,
                                    rotation: Math.random() * Math.PI * 2
                                });
                            });

                            for (const [archKey, pts] of pointsByArchetype.entries()) {
                                window.ForestRenderer.setChunkInstances(key, archKey, pts);
                            }
                                                } else {
                            // FIX: Dispatch fallback using an explicit archetype key instead of generic "Redwood Tree"
                            // to trigger the proper generator retrieval or advanced fallback inside ForestRenderer
                            
                            // Scale down trunk size and randomize overall scale
                            const redwoodPoints = chunkData.tierA.map(point => ({
                                x: point.x,
                                y: safeGetTerrainHeight(point.x, point.z),
                                z: point.z,
                                scale: 0.6 + Math.random() * 0.3,
                                rotation: Math.random() * Math.PI * 2
                            }));
                            window.ForestRenderer.setChunkInstances(key, 'Redwood_ANCIENT_0', redwoodPoints);
                        }
                    }

                    chunkData.tierB.forEach(point => {
                        const px = point.x;
                        const pz = point.z;
                        const py = safeGetTerrainHeight(px, pz);
                        bushPoints.push({ x: px, y: py, z: pz, scale: 0.7 + Math.random() * 0.5, rotation: Math.random() * Math.PI * 2 });
                    });

                    window.ForestRenderer.setChunkInstances(key, 'Bramble Bush', bushPoints);

                                        if (lod === 'A' && window.GameCore?.world && chunkData.tierA) {
                        chunkData.tierA.forEach(pt => {
                            const py = safeGetTerrainHeight(pt.x, pt.z);
                            window.PhysicsQueue.enqueue(() => {
                                if (!window.GameCore?.world) return;
                                const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pt.x, py + 15.0, pt.z));
                                window.GameCore.world.createCollider(RAPIER.ColliderDesc.cylinder(15.0, 1.8), body);
                                const record = this.activeChunks.get(key);
                                if (record) {
                                    if (!record.instanceBodies) record.instanceBodies = [];
                                    record.instanceBodies.push(body);
                                }
                            });
                        });
                    }

                }

                                                                                                const biomeKey = window.WorldGenerator?.getBiome?.(chunkX, chunkZ) || 'redwoods';
                
                if (window.GrassSystem) {
                    window.GrassSystem.spawnFloorPatch(key, cx, cz, biomeKey, chunkData.tierA, localRoadPoints);
                }

                window.EventBus?.emit('CHUNK_GENERATED');




            }
        );
    },
        unloadChunk: function(key) {
        const chunk = this.activeChunks.get(key); 

        if (window.GrassSystem) {
            window.GrassSystem.unloadFloorPatch(key);
        }

        if (window.RoadRenderer && window.GameCore?.scene) {
            window.RoadRenderer.removeDecorationsForChunk(key, window.GameCore.scene);
        }

        if(!chunk) return;

        // --- PHASE 2: PERSISTENT REALITY LAYER (§5, §12) ---
        // Verify if any entity in this chunk belongs to the Persistent Layer before full disposal.
        if (window.GameCore?.activeEntities) {
            const hasPersistentEntity = window.GameCore.activeEntities.some(en => 
                en.chunkKey === key && PERSISTENT_REALITY_LAYER.includes(en.def?.type)
            );
            
            if (hasPersistentEntity && window.EngineParams?.worldDay % 14 === 0) {
                // During a Shift, we preserve the state of persistent chunks.
                // We detach from scene to stop rendering, but keep the record.
                if (chunk.mesh) window.GameCore.scene.remove(chunk.mesh);
                chunk.state = window.ChunkState.UNLOADING; 
                return; 
            }
        }
        
        if (chunk.mesh) {

            chunk.mesh.geometry?.dispose(); 
            chunk.mesh.material?.dispose(); 
            if (window.GameCore?.scene) window.GameCore.scene.remove(chunk.mesh); 
        }
        
                if (chunk.body && window.GameCore?.world) {
            const b = chunk.body;
            window.PhysicsQueue.enqueue(() => {
                if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
            });
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
            const bodies = [...chunk.instanceBodies];
            window.PhysicsQueue.enqueue(() => {
                if (!window.GameCore?.world) return;
                bodies.forEach(body => {
                    if (body) window.GameCore.world.removeRigidBody(body);
                });
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
                        const b = en.body;
                        window.PhysicsQueue.enqueue(() => {
                            if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
                        });
                        en.body = null;
                    }

                    return false; 
                } 
                return true; 
            });
        }
        // this.activeChunks.delete(key); // DEPRECATED: Phase 1 Incremental Teardown
        if (chunk) chunk.state = window.ChunkState.UNLOADING;
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
        if (window.RedwoodGenerator?.isInitialized) {
            const geo = window.RedwoodGenerator.getArchetype('ANCIENT', 0);
            const mat = window.ForestRenderer?.materials.get('Redwood_ANCIENT_0') || new THREE.MeshStandardMaterial({ color: 0x3d2015 });
            if (geo) {
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                meshGroup.add(mesh);
                return meshGroup;
            }
        }

        // Fallback if archetype is not initialized yet
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
                    const r = def.radius || 0.5;

                    if(def.type === 'structure' || def.type === 'hub') {
                        // --- DARK FOREST SHAPE LANGUAGE: Gothic Placeholder Architecture ---
                        // 1. Tapered Frustum Body (Walls)
                        const bodyH = h * 0.6;
                        const bodyGeo = new THREE.CylinderGeometry(r * 0.8, r, bodyH, 4);
                        bodyGeo.rotateY(Math.PI / 4); // Align flat sides with grid
                        bodyGeo.translate(0, bodyH / 2 - (h / 2), 0); // Center relative to full height
                
                        // 2. Steep Gothic Wedge (Roof)
                        const roofH = h * 0.4;
                        const roofGeo = new THREE.ConeGeometry(r * 1.1, roofH, 4);
                        roofGeo.rotateY(Math.PI / 4);
                        roofGeo.translate(0, bodyH + (roofH / 2) - (h / 2), 0);
                
                        // 3. Merge primitives to maintain 1 draw call
                        const mergedGeo = window.BufferGeometryUtils ? 
                            window.BufferGeometryUtils.mergeGeometries([bodyGeo, roofGeo]) : 
                            bodyGeo; // Fallback if Utils not loaded
                    
                        mesh = new THREE.Mesh(mergedGeo, new THREE.MeshStandardMaterial({ color: def.color || 0x888888 }));
                        mesh.position.y = h / 2;
                    } else if(def.type === 'mountain') {
                        mesh = new THREE.Mesh(new THREE.ConeGeometry(def.radius, h, 16), new THREE.MeshStandardMaterial({ color: def.color || 0x444444 }));
                        mesh.position.y = h / 2;
                    } else if (def.type === 'prop' || def.type === 'merchantChest') {
                        mesh = new THREE.Mesh(new THREE.BoxGeometry(r*2, h, r*2), new THREE.MeshStandardMaterial({ color: def.color || 0x5a4230 }));
                        mesh.position.y = h / 2;
                    } else if (def.type === 'powerStone' || def.type === 'streetLight') {
                        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(r), new THREE.MeshStandardMaterial({ color: def.color || 0x334155 }));
                        mesh.position.y = h / 2;
                    } else if (def.type === 'firePit') {
                        mesh = new THREE.Mesh(new THREE.CylinderGeometry(r*0.8, r, h, 6), new THREE.MeshStandardMaterial({ color: def.color || 0x292929 }));
                        mesh.position.y = h / 2;
                    } else {
                        mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), new THREE.MeshStandardMaterial({ color: def.color || 0x666666 }));
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
    if (entity.userData?.isVisible === false && entity.userData?.distSq > 1600) return; // Phase 3: Skip unseen distant animation triggers 
    if (entity.currentAnimState === state) return; 
    
    // FIX: Remove orphan listener before switching states
    if (entity._activeAnimListener) {
        entity.mixer.removeEventListener('finished', entity._activeAnimListener);
        entity._activeAnimListener = null;
    }
    
    const newAction = entity.actions[state]; 
    const oldAction = entity.currentAnimState ? entity.actions[entity.currentAnimState] : null;
    
    newAction.reset(); 
    newAction.play(); 
    if (oldAction) newAction.crossFadeFrom(oldAction, 0.35, true); 
    
    entity.currentAnimState = state;
    
    if (state === 'attack' || state === 'dash' || state === 'hit') { 
        entity._activeAnimListener = function restoreIdle(e) { 
            if (e.action === newAction) { 
                entity.mixer.removeEventListener('finished', entity._activeAnimListener); 
                entity._activeAnimListener = null;
                if(entity.hp > 0) {
                    if (window.Input?.isBlocking && entity.def?.faction === 'player') {
                        playEntityAnimation(entity, 'block');
                    } else {
                        playEntityAnimation(entity, 'idle');
                    }
                }
            } 
        };
        entity.mixer.addEventListener('finished', entity._activeAnimListener); 
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

function createBlobShadow(radius) {
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.5, 
        depthWrite: false 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.05; // Slightly above ground
    mesh.isBlobShadow = true;
    return mesh;
}
function instantiatePrefab(name, x, y, z, chunkKey = 'persistent') {
    const def = window.AssetManager?.prefabs?.[name]; 
    if(!def) return null;
    
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
    
    const entity = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: name, 
        def: def, 
        visual: mesh, 
        body: null, 
        collider: null, 
        chunkKey: chunkKey 
    };

    window.PhysicsQueue.enqueue(() => {
        if (!window.GameCore?.world) return;
        
        let colliderDesc; 
        if (['structure', 'hub', 'runeTower', 'powerStone', 'firePit', 'streetLight', 'merchantChest'].includes(def.type)) {
            colliderDesc = RAPIER.ColliderDesc.cuboid(def.radius, def.height/2, def.radius); 
        } else if (def.type === 'mountain') {
            colliderDesc = RAPIER.ColliderDesc.cone(def.height/2, def.radius); 
        } else {
            colliderDesc = RAPIER.ColliderDesc.capsule(Math.max(0.1, def.height/2 - def.radius), def.radius);
        }

        try {
            const body = window.GameCore.world.createRigidBody(rigidBodyDesc);
            const collider = window.GameCore.world.createCollider(colliderDesc, body);
            collider.handle = Math.floor(Math.random() * 1000000); 
            body.userData = { entityId: entity.id };
            entity.body = body;
            entity.collider = collider;
        } catch(e) {
            console.warn("[Physics] Prefab instantiation failed:", name, e);
        }
    });

    if (window.GameCore?.bindEntityToBuffer) {
        window.GameCore.bindEntityToBuffer(entity, def.hp || 50, def.poise || 30);
    }
    
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
    if (!window.EngineConfig?.quality?.shadowsEnabled) {
        const blob = createBlobShadow(def.radius || 0.5);
        mesh.add(blob);
        entity.blobShadow = blob;
    } 
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
        window.applyForestBlessing?.(entity);
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
            
                        window.PhysicsQueue.enqueue(() => {
                if (!window.GameCore?.world) return;
                const body = window.GameCore.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(spec.x, groundY + wallHeight / 2, spec.z));
                window.GameCore.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.width / 2, wallHeight / 2, spec.depth / 2), body);
                this.walls.push({ mesh, body });
            });

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
            if (window.AssetBudget) {
                window.AssetBudget.queueInstantiation(prefab, x, safeGetTerrainHeight(x, z), z, String.fromCharCode(97,114,101,110,97), (entity) => {
                    if (entity) {
                        entity.arenaEntity = true;
                        entity.arenaWave = wave;
                    }
                });
            } else {
                const entity = instantiatePrefab(prefab, x, safeGetTerrainHeight(x, z), z, String.fromCharCode(97,114,101,110,97));
                if (entity) {
                    entity.arenaEntity = true;
                    entity.arenaWave = wave;
                }
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
                const b = entity.body;
                window.PhysicsQueue.enqueue(() => {
                    if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
                });
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
            if (wall.body) {
                const b = wall.body;
                window.PhysicsQueue.enqueue(() => {
                    if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
                });
            }
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
        
        const cached = physicsReadCache.get('player');
        const pPos = cached ? cached.translation : player.body.translation();
        const biomeColor = window.WorldGenConfig?.biomes?.[window.WorldGenerator?.getBiome(pPos.x, pPos.z)]?.color || '#94a3b8';
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
        window.GameCore?.spawnGroundLoot?.(target.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones', target.visual.position);
        window.awardMonsterKill?.(target);
        window.GameState.inventory.gold += target.def.faction === 'monster' ? 10 : 50;
        window.EventBus.emit('UI_UPDATE_HUD');
        setTimeout(() => {
            if (window.GameCore.AnimationSystem) window.GameCore.AnimationSystem.disposeEntity(target.id);
            window.GameCore.releaseEntityIndex(target.memoryIndex);
                        if (target.visual) window.GameCore.scene.remove(target.visual);
            if (target.body) { 
                const b = target.body;
                window.PhysicsQueue.enqueue(() => {
                    if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
                });
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
            const b = en.body;
            window.PhysicsQueue.enqueue(() => {
                if (window.GameCore?.world) window.GameCore.world.removeRigidBody(b);
            });
            en.body = null; 
        }
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
    // ... existing code ...
    entity.playerBase = true;
    base.structures.push({ prefab, x, z });
    if (prefab === 'Camp Farm Plot') base.farms.push({ x, z });
    if (prefab === 'Rune Tower') base.wardRadius = 30;
    
    // --- PHASE 1A: CHRONICLE ACTIVATION ---
    window.ChronicleManager?.recordEvent?.({
        actorId: 'player',
        type: 'structure_built',
        detail: `The Player built a ${prefab} at their camp.`,
        significance: 30,
        historicalWeight: 10,
        location: { x, z }
    });

    window.CareerManager?.addXP('builder', 50);

    window.EventBus.emit('UI_LOG', `[CAMP] Built ${prefab}.`);
});

// ==========================================
// WORLD GENERATION & REGENERATION
// ==========================================

window.EventBus?.on('WORLD_REGENERATE', () => {
    if (window.EpochManagerInstance) {
        window.EpochManagerInstance.rotateMountains();
    }
    window.EventBus.emit('CLEAR_MAP'); 
 
    
    const keys = Array.from(ChunkManager.activeChunks.keys()); 
    keys.forEach(k => ChunkManager.unloadChunk(k)); 
    ChunkManager.currentChunkX = null; 
    
    window.currentPrng = alea(window.EngineParams?.worldSeed ?? 1337); 
    window.currentNoise2D = window.createNoise2D(window.currentPrng);
    
        if (window.GameCore.playerObj && window.GameCore.playerObj.body) { 
        ChunkManager.forceUpdatePosition(new THREE.Vector3(window.GameCore.playerObj.visual.position.x, 0, window.GameCore.playerObj.visual.position.z));
        const vy = safeGetTerrainHeight(window.GameCore.playerObj.visual.position.x, window.GameCore.playerObj.visual.position.z) + 5.0; 
        const px = window.GameCore.playerObj.visual.position.x;
        const pz = window.GameCore.playerObj.visual.position.z;
        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setLinvel({x:0, y:0, z:0}, true);
                window.GameCore.playerObj.body.setAngvel({x:0, y:0, z:0}, true);
                window.GameCore.playerObj.body.setTranslation({x: px, y: vy, z: pz}, true); 
            }
        });
        window.spawnPartyMembers?.(); 
 
        window.syncCaravanAgents?.(); 
        window.syncPlayerBase?.(); 
    }
    window.EventBus.emit('UI_LOG', `World Math Regenerated with Seed: ${window.EngineParams.worldSeed}`);
});

window.EventBus?.on('CMD_TELEPORT', (pos) => { 
    if (window.GameCore.playerObj?.body) {
        const groundY = safeGetTerrainHeight(pos.x, pos.z);
        const safeY = (isNaN(groundY) ? 10 : groundY) + 5.0; 

        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                window.GameCore.playerObj.body.setTranslation({ x: pos.x, y: safeY, z: pos.z }, true);
            }
        });
        
        if (window.GameCore.playerObj.visual) {

            window.GameCore.playerObj.visual.position.set(pos.x, safeY - 1.0, pos.z);
        }

        ChunkManager.forceUpdatePosition(new THREE.Vector3(pos.x, safeY, pos.z));
    }
});

window.EventBus?.on('PLAYER_WENDIGO_TRANSFORM', () => {
    if (window.GameCore.swapPlayerModel) {
        window.GameCore.swapPlayerModel('Wendigo');
    }
    window.GameState.gladiator.objective = 'Hunt and Feed';
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus?.on('PLAYER_RESPAWN', () => { 
    if (window.GameState.monsterState.isWendigo) {
        // Bypass normal respawn if rebirth occurred
        window.GameState.pStats.hp = window.GameState.pStats.maxHp;
        playEntityAnimation(window.GameCore.playerObj, 'idle');
        window.EventBus.emit('UI_UPDATE_HUD');
        return;
    }

    if (!window.EngineParams.arenaMode && window.GameState.pStats.hp <= 0) {

        window.GameCore.recordCombatDefeat({ source: 'open-world', injury: `open-world defeat on day ${window.EngineParams.worldDay}` });
        
        // --- RUN SUMMARY EPITAPH (§17) ---
        if (window.FolkloreEngine) {
            const epitaph = window.FolkloreEngine.generateRunEpitaph(window.GameState, window.ChronicleManager.worldLedger);
            // We don't show it here, it's crystallized in the Anthology for the NEXT run to discover.
        }
    }
    
    const respawnY = safeGetTerrainHeight(0, 0) + 5.0; 
 
    
        if (window.GameCore.playerObj?.body) {
        window.PhysicsQueue.enqueue(() => {
            if (window.GameCore.playerObj.body) {
                window.GameCore.playerObj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                window.GameCore.playerObj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                window.GameCore.playerObj.body.setTranslation({ x: 0, y: respawnY, z: 0 }, true); 
            }
        });
    }

    
    ChunkManager.forceUpdatePosition(new THREE.Vector3(0, respawnY, 0));
    window.GameState.pStats.hp = window.GameState.pStats.maxHp; 
    window.GameState.inventory.gold = Math.floor(window.GameState.inventory.gold / 2); 
    playEntityAnimation(window.GameCore.playerObj, 'idle'); 
    window.EventBus.emit('UI_UPD
