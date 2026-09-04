window.EventBus.on('PARTY_COMMAND', command => {
    window.GameState.party.command = command;
    window.GameCore.activeEntities.filter(entity => entity.companionId).forEach(entity => {
        const selected = window.GameState.party.selectedMembers.includes(entity.companionId);
        entity.groupCommand = selected ? command : 'follow';
        entity.holdPosition = selected && command === 'hold' ? entity.visual.position.clone() : null;
    });
    window.EventBus.emit('UI_LOG', `Party command: ${command.toUpperCase()}.`);
});

function moveCompanion(companion, destination, speedMultiplier = 1, delta = 0) {
    const member = companion.companionId && window.GameState.party.members.find(candidate => candidate.id === companion.companionId);
    const conditionMultiplier = member && (member.hunger >= 80 || member.injuries.length > 0) ? 0.65 : 1;
    const destinationChanged = !companion.routeDestination || companion.routeDestination.distanceToSquared(destination) > 9;
    companion.routeRefreshTimer = Math.max(0, (companion.routeRefreshTimer || 0) - delta);
    if (destinationChanged || companion.routeRefreshTimer === 0 || !companion.route?.length) {
        companion.route = window.Navigation.findRoute(companion.visual.position, destination, companion.def.radius || 0.5);
        companion.routeDestination = destination.clone();
        companion.routeRefreshTimer = 1;
    }
    while (companion.route.length > 1 && companion.visual.position.distanceTo(companion.route[0]) < 1.5) companion.route.shift();
    const waypoint = companion.route[0] || destination;
    const direction = new window.THREE.Vector3().subVectors(waypoint, companion.visual.position);
    direction.y = 0;
    if (direction.lengthSq() < 1) {
        companion.body.setLinvel({ x: 0, y: companion.body.linvel().y, z: 0 }, true);
        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(companion, 'idle');
        return;
    }
    direction.normalize();
    const obstacles = window.GameCore.activeEntities.filter(entity => entity !== companion && entity.def.isObstacle);
    obstacles.forEach(obstacle => {
        const offset = new window.THREE.Vector3().subVectors(companion.visual.position, obstacle.visual.position);
        offset.y = 0;
        const clearance = (obstacle.def.radius || 1) + (companion.def.radius || 0.5) + 0.8;
        if (offset.lengthSq() > 0.001 && offset.length() < clearance) direction.add(offset.normalize().multiplyScalar((clearance - offset.length()) * 1.5));
    });
    window.GameCore.activeEntities.filter(entity => entity !== companion && entity.companionId).forEach(other => {
        const offset = new window.THREE.Vector3().subVectors(companion.visual.position, other.visual.position);
        offset.y = 0;
        if (offset.lengthSq() > 0.001 && offset.length() < 1.5) direction.add(offset.normalize().multiplyScalar(1.5 - offset.length()));
    });
    direction.normalize();
    const velocity = companion.body.linvel();
    if (delta > 0 && new window.THREE.Vector2(velocity.x, velocity.z).length() < 0.1) companion.stuckSeconds = (companion.stuckSeconds || 0) + delta; else companion.stuckSeconds = 0;
    if (companion.stuckSeconds > 3 && companion.visual.position.distanceTo(destination) > 6) {
        const recoveryPoint = companion.route[0] || destination;
        const recoveryY = window.WorldGenerator.getTerrainHeight(recoveryPoint.x, recoveryPoint.z) + companion.def.height / 2;
        companion.body.setTranslation({ x: recoveryPoint.x, y: recoveryY, z: recoveryPoint.z }, true);
        companion.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        companion.stuckSeconds = 0;
        return;
    }
    companion.body.setLinvel({ x: direction.x * companion.def.speed * speedMultiplier * conditionMultiplier, y: companion.body.linvel().y, z: direction.z * companion.def.speed * speedMultiplier * conditionMultiplier }, true);
    companion.visual.lookAt(companion.visual.position.clone().add(direction));
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(companion, 'walk');
}

function isHostileFaction(faction) {
    return faction === 'monster' || faction === 'forest';
}

function defeatNpc(entity) {
    if (entity.expeditionId) {
        const village = window.VillageManager.villages.find(candidate => candidate.id === entity.targetVillageId);
        const expedition = village?.expeditions.find(candidate => candidate.id === entity.expeditionId);
        const alliesRemain = window.GameCore.activeEntities.some(candidate => candidate !== entity && candidate.expeditionId === entity.expeditionId && candidate.hp > 0);
        if (expedition && !alliesRemain) {
            expedition.status = 'defeated';
            window.EventBus.emit('UI_LOG', `[DEFENSE] ${village.name} repelled the ${expedition.type}.`);
        }
    }
    if (entity.squadId) {
        const village = window.VillageManager.villages.find(candidate => candidate.id === entity.villageId);
        const squad = village?.squads.find(candidate => candidate.id === entity.squadId);
        if (squad) {
            squad.casualties = (squad.casualties || 0) + 1;
            squad.size = Math.max(0, squad.size - 1);
            if (squad.size === 0) squad.status = 'destroyed';
        }
    }
    if (entity.caravanId) {
        const village = window.VillageManager.villages.find(candidate => candidate.id === entity.villageId);
        const caravan = village?.caravans.find(candidate => candidate.id === entity.caravanId);
        if (caravan) caravan.status = 'lost';
        if (village) village.tradeDisruptionUntil = Math.max(village.tradeDisruptionUntil || 0, window.EngineParams.worldDay + 2);
        if (window.GameState.party.escortCaravanId === entity.caravanId) window.GameState.party.escortCaravanId = null;
        window.EventBus.emit('UI_LOG', 'A merchant caravan was lost on the road.');
    }
    if (entity.companionId) {
        const member = window.GameState.party.members.find(candidate => candidate.id === entity.companionId);
        if (member) {
            member.hp = 0;
            member.downed = true;
            member.injuries.push('downed in combat');
        }
        entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'die');
        window.EventBus.emit('UI_LOG', `${entity.name} is downed and needs revival.`);
        return;
    }
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'die');
    if (window.GameCore.spawnGroundLoot) window.GameCore.spawnGroundLoot(entity.def.faction === 'forest' ? 'corrupted_resin' : 'beast_bones', entity.visual.position);
    setTimeout(() => {
        window.GameCore.scene.remove(entity.visual);
        window.GameCore.world.removeRigidBody(entity.body);
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(candidate => candidate.id !== entity.id);
    }, 2000);
}

function attackNpc(attacker, target) {
    if (attacker.npcAttackReadyAt && performance.now() < attacker.npcAttackReadyAt) return;
    attacker.npcAttackReadyAt = performance.now() + 1000;
    const damage = Math.max(1, (attacker.def.attackDamage || 15) - (target.def.armor || 0));
    target.hp -= damage;
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(attacker, 'attack');
    window.EventBus.emit('ENTITY_DAMAGED', { damage, position: target.visual.position, isPlayer: false });
    if (target.hp <= 0) defeatNpc(target);
}

window.EventBus.on('AI_TICK', ({ delta, isPlayerSafe }) => {
    if(!window.GameCore || !window.GameCore.playerObj) return;
    const pPos = window.GameCore.playerObj.visual.position;
    const obstacles = window.GameCore.activeEntities.filter(e => e.def.isObstacle);

    window.GameCore.activeEntities.forEach(en => {
        if(en.body && en.body.isDynamic && en.body.isDynamic()) { const p = en.body.translation(); en.visual.position.set(p.x, p.y, p.z); }
        if (en.def.type !== 'npc') return;
        if (en.staggeredUntil && performance.now() < en.staggeredUntil) {
            en.body.setLinvel({ x: 0, y: en.body.linvel().y, z: 0 }, true);
            return;
        }

        if (en.caravanId) {
            const village = window.VillageManager.villages.find(candidate => candidate.id === en.villageId);
            const caravan = village?.caravans.find(candidate => candidate.id === en.caravanId);
            const destination = caravan && window.VillageManager.villages.find(candidate => candidate.id === caravan.targetVillageId);
            if (!caravan || caravan.status !== 'traveling' || !destination) return;
            caravan.position = { x: en.visual.position.x, z: en.visual.position.z };
            const destinationPosition = new window.THREE.Vector3(destination.x, en.visual.position.y, destination.z);
            if (en.visual.position.distanceTo(destinationPosition) <= 8) {
                caravan.status = 'arrived';
                if (window.GameState.party.escortCaravanId === caravan.id) window.GameState.party.escortCaravanId = null;
                en.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                window.EventBus.emit('UI_LOG', `Merchant caravan reached ${destination.name}.`);
            } else {
                moveCompanion(en, destinationPosition, 1.2, delta);
            }
            return;
        }

        if (en.companionId) {
            const member = window.GameState.party.members.find(candidate => candidate.id === en.companionId);
            if (member?.downed) return;
            const command = en.groupCommand || 'follow';
            const escortedCaravan = window.GameCore.activeEntities.find(entity => entity.caravanId === window.GameState.party.escortCaravanId);
            const formationAnchor = escortedCaravan ? escortedCaravan.visual.position : pPos;
            const hostileEntities = window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && entity.hp > 0);
            const nearestHostile = hostileEntities.sort((a, b) => en.visual.position.distanceTo(a.visual.position) - en.visual.position.distanceTo(b.visual.position))[0];
            if (command === 'hold') {
                if (en.holdPosition) moveCompanion(en, en.holdPosition, 1, delta);
                return;
            }
            if (command === 'attack' && nearestHostile && en.visual.position.distanceTo(nearestHostile.visual.position) < 20) {
                const distance = en.visual.position.distanceTo(nearestHostile.visual.position);
                if (distance > 1.8) {
                    moveCompanion(en, nearestHostile.visual.position, 1.1, delta);
                } else if ((!en.companionAttackReadyAt || performance.now() >= en.companionAttackReadyAt) && window.GameCore.playEntityAnimation) {
                    en.companionAttackReadyAt = performance.now() + 900;
                    const conditionPenalty = member.hunger >= 80 || member.injuries.length > 0 ? 0.6 : 1;
                    const damage = Math.max(1, Math.floor((10 + window.GameState.pStats.strength.level + (member.skills.meleeAtt || 0)) * conditionPenalty));
                    nearestHostile.hp -= damage;
                    window.GameCore.playEntityAnimation(en, 'attack');
                    window.EventBus.emit('ENTITY_DAMAGED', { damage, position: nearestHostile.visual.position, isPlayer: false });
                    if (nearestHostile.hp <= 0) {
                        window.GameCore.playEntityAnimation(nearestHostile, 'die');
                        setTimeout(() => {
                            window.GameCore.scene.remove(nearestHostile.visual);
                            window.GameCore.world.removeRigidBody(nearestHostile.body);
                            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(entity => entity.id !== nearestHostile.id);
                        }, 2000);
                    }
                }
                return;
            }
            const offset = new window.THREE.Vector3(en.companionId.length % 2 ? 2 : -2, 0, command === 'retreat' ? -5 : 3);
            if (command === 'guard' && nearestHostile && nearestHostile.visual.position.distanceTo(pPos) < 10) offset.copy(nearestHostile.visual.position).sub(pPos).multiplyScalar(0.5);
            moveCompanion(en, formationAnchor.clone().add(offset), command === 'retreat' ? 1.3 : 1, delta);
            return;
        }

        if (en.squadId) {
            const village = window.VillageManager.villages.find(candidate => candidate.id === en.villageId);
            const squad = village?.squads.find(candidate => candidate.id === en.squadId);
            if (!village || !squad || squad.status === 'destroyed') return;
            const threat = window.GameCore.activeEntities
                .filter(candidate => candidate.def.type === 'npc' && isHostileFaction(candidate.def.faction) && candidate.hp > 0 && candidate.visual.position.distanceTo(en.visual.position) < 30)
                .sort((a, b) => en.visual.position.distanceTo(a.visual.position) - en.visual.position.distanceTo(b.visual.position))[0];
            if (threat) {
                squad.status = 'defending';
                const distance = en.visual.position.distanceTo(threat.visual.position);
                if (distance > 1.8) moveCompanion(en, threat.visual.position, 1.15, delta); else attackNpc(en, threat);
                return;
            }
            squad.status = 'patrolling';
            const guardIndex = Math.max(0, village.residents.findIndex(resident => resident.squadId === squad.id));
            const angle = ((squad.patrolPhase || 0) + guardIndex * (Math.PI * 2 / Math.max(1, squad.size))) % (Math.PI * 2);
            const patrolPoint = new window.THREE.Vector3(village.x + Math.cos(angle) * 12, en.visual.position.y, village.z + Math.sin(angle) * 12);
            squad.patrolPhase = (squad.patrolPhase || 0) + delta * 0.15;
            moveCompanion(en, patrolPoint, 0.7, delta);
            return;
        }

        if (en.def.lureTargets === 'male') {
            window.GameCore.activeEntities.forEach(targetEntity => {
                if (targetEntity === en || targetEntity.def.type !== 'npc' || targetEntity.def.gender !== 'male' || targetEntity.currentAnimState === 'die') return;
                const distanceToSiren = targetEntity.visual.position.distanceTo(en.visual.position);
                if (distanceToSiren > (en.def.lureRadius || 24)) return;
                if (distanceToSiren < 1.8 && Math.random() < 0.05) {
                    targetEntity.hp -= 15;
                    window.EventBus.emit('UI_LOG', `${targetEntity.name} was claimed by the Swamp Siren.`);
                    if (targetEntity.hp <= 0) {
                        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(targetEntity, 'die');
                        setTimeout(() => {
                            window.GameCore.scene.remove(targetEntity.visual);
                            window.GameCore.world.removeRigidBody(targetEntity.body);
                            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(entity => entity.id !== targetEntity.id);
                        }, 2000);
                    }
                    return;
                }
                const lureDirection = new window.THREE.Vector3().subVectors(en.visual.position, targetEntity.visual.position);
                if (lureDirection.lengthSq() > 0.001) {
                    lureDirection.normalize();
                    targetEntity.body.setLinvel({ x: lureDirection.x * targetEntity.def.speed, y: targetEntity.body.linvel().y, z: lureDirection.z * targetEntity.def.speed }, true);
                    if (targetEntity.visual && targetEntity.currentAnimState !== 'hit' && targetEntity.currentAnimState !== 'die') {
                        targetEntity.visual.lookAt(targetEntity.visual.position.clone().add(lureDirection));
                        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(targetEntity, 'walk');
                    }
                }
            });
            return;
        }

        const hostile = en.def.faction === 'monster' || en.def.faction === 'forest' || window.GameState.reputation[en.def.faction] <= -50;
        const onProtectedPath = hostile && window.RoadManager.isRuneProtected(en.visual.position);
        const inVillageBarrier = hostile && window.RoadManager.isVillageProtected(en.visual.position);
        const base = window.GameState.base;
        const inPlayerWard = hostile && base.owned && base.wardRadius && base.position && Math.hypot(en.visual.position.x - base.position.x, en.visual.position.z - base.position.z) <= base.wardRadius;
        let target = null;
        if (hostile && !onProtectedPath && !inVillageBarrier && !inPlayerWard) {
            if (en.visual.position.distanceTo(pPos) < 15 && !isPlayerSafe && !window.EngineParams.isPlayerHidden) target = pPos;
        }

        if (onProtectedPath || inVillageBarrier || inPlayerWard) {
            const nearestTower = window.GameCore.activeEntities
            .filter(entity => ((inPlayerWard || onProtectedPath) ? entity.name === 'Rune Tower' : entity.name === 'Floating Power Stone') && entity.def.active !== false)
            .filter(entity => !inPlayerWard || entity.playerBase)
                .sort((a, b) => a.visual.position.distanceTo(en.visual.position) - b.visual.position.distanceTo(en.visual.position))[0];
            if (nearestTower) {
                const repel = new window.THREE.Vector3().subVectors(en.visual.position, nearestTower.visual.position);
                if (repel.lengthSq() > 0.001) {
                    repel.normalize();
                    en.body.setLinvel({ x: repel.x * en.def.speed, y: en.body.linvel().y, z: repel.z * en.def.speed }, true);
                    if (en.visual && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') {
                        en.visual.lookAt(en.visual.position.clone().add(repel));
                        if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'walk');
                    }
                }
            }
            return;
        }

        const npcTarget = window.GameCore.activeEntities
            .filter(candidate => candidate !== en && candidate.def.type === 'npc' && candidate.hp > 0 && isHostileFaction(candidate.def.faction) !== isHostileFaction(en.def.faction))
            .sort((a, b) => en.visual.position.distanceTo(a.visual.position) - en.visual.position.distanceTo(b.visual.position))[0];
        if (npcTarget && en.visual.position.distanceTo(npcTarget.visual.position) < 12) {
            const npcDistance = en.visual.position.distanceTo(npcTarget.visual.position);
            if (npcDistance > 1.8) moveCompanion(en, npcTarget.visual.position, 1, delta);
            else attackNpc(en, npcTarget);
            return;
        }

        if (target) {
            let dir = new window.THREE.Vector3().subVectors(target, en.visual.position);
            if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 1);

            if (en.def.phaseTwoAt && !en.phaseTwo && en.hp <= en.def.hp * en.def.phaseTwoAt) {
                en.phaseTwo = true;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'ENRAGED!', pos: en.visual.position, color: '#ff6600' });
                window.EventBus.emit('UI_LOG', `${en.name} entered phase two.`);
            }
            
            let avoidance = new window.THREE.Vector3(0,0,0);
            obstacles.forEach(obs => {
                let dist = en.visual.position.distanceTo(obs.visual.position);
                if(dist < obs.def.radius + 1.5 && dist > 0.001) {
                    let push = new window.THREE.Vector3().subVectors(en.visual.position, obs.visual.position).normalize();
                    avoidance.add(push.multiplyScalar((obs.def.radius + 1.5 - dist) * 2));
                }
            });
            dir.add(avoidance);
            if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 1);

            // AI moves instantly without acceleration dampening for simplicity
            const phaseSpeed = en.phaseTwo ? (en.def.phaseTwoSpeed || 1) : 1;
            en.body.setLinvel({ x: dir.x * en.def.speed * phaseSpeed, y: en.body.linvel().y, z: dir.z * en.def.speed * phaseSpeed }, true);
            
            if (en.visual && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') {
                en.visual.lookAt(en.visual.position.clone().add(dir));
                if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'walk');
            }

            if(en.visual.position.distanceTo(pPos) < 1.8 && Math.random() < 0.05 && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die' && !en.attackWindupUntil) {
                en.attackWindupUntil = performance.now() + 350;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: '!', pos: en.visual.position, color: '#ffcc00'});
                return;
            }
            if (en.def.voidBoltDamage && en.visual.position.distanceTo(pPos) <= en.def.voidBoltRange && en.visual.position.distanceTo(pPos) > 3 && !en.voidBoltWindupUntil && Math.random() < 0.025) {
                en.voidBoltWindupUntil = performance.now() + 600;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'VOID BOLT!', pos: en.visual.position, color: '#a855f7' });
                return;
            }
            if (en.voidBoltWindupUntil && performance.now() >= en.voidBoltWindupUntil) {
                en.voidBoltWindupUntil = null;
                const origin = en.visual.position.clone().add(new window.THREE.Vector3(0, 2.2, 0));
                const direction = new window.THREE.Vector3().subVectors(pPos.clone().add(new window.THREE.Vector3(0, 1, 0)), origin);
                window.VFXManager.spawnProjectile({ position: origin, direction, damage: en.def.voidBoltDamage, damageType: 'void', speed: en.def.voidBoltSpeed, range: en.def.voidBoltRange, color: '#a855f7' });
                if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'attack');
                return;
            }
            if (en.phaseTwo && en.def.fireBurstDamage && en.visual.position.distanceTo(pPos) < en.def.fireBurstRadius && !en.fireBurstWindupUntil && Math.random() < 0.02) {
                en.fireBurstWindupUntil = performance.now() + 700;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'FIRE BURST!', pos: en.visual.position, color: '#ff6600' });
                return;
            }
            if (en.fireBurstWindupUntil && performance.now() >= en.fireBurstWindupUntil) {
                en.fireBurstWindupUntil = null;
                const resistance = window.GameCore.getResistance('fire');
                const damage = Math.max(1, en.def.fireBurstDamage - resistance);
                window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - damage);
                window.GameCore.applyStatusEffect('burning', 4, 2);
                window.EventBus.emit('ENTITY_DAMAGED', { damage, position: pPos, isPlayer: true });
                window.EventBus.emit('SPAWN_HIT_VFX', { type: 'Fire', pos: en.visual.position.clone().add(new window.THREE.Vector3(0, 1, 0)) });
                return;
            }
            if(en.attackWindupUntil && performance.now() >= en.attackWindupUntil) {
                en.attackWindupUntil = null;
                if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'attack');
                
                if (!window.EngineParams.godMode) {
                    if (window.Input.isBlocking) {
                        const poiseDamage = en.def.poiseDamage || Math.max(8, Math.floor((en.def.attackDamage || 15) * 0.8));
                        window.GameState.pStats.poise = Math.max(0, window.GameState.pStats.poise - poiseDamage);
                        if (window.GameState.pStats.poise <= 0) {
                            window.GameState.pStats.guardBrokenUntil = performance.now() + 1000;
                            window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: 'GUARD BREAK!', pos: pPos, color: '#ef4444'});
                            if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(window.GameCore.playerObj, 'hit');
                        } else {
                            window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "BLOCKED!", pos: pPos, color: '#4ade80'});
                        }
                        window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/tom-analog.mp3', pos: pPos, vol: -5});
                    } else {
                        const rawDmg = en.def.attackDamage || 15;
                        const armorDef = window.GameState.derivedStats.armor + window.GameCore.getBuffBonus('meleeDef') + window.GameCore.getBuffBonus('toughness');
                        const damageType = en.def.damageType || 'physical';
                        const mitigation = damageType === 'physical' ? armorDef : window.GameCore.getResistance(damageType);
                        const actualDmg = Math.max(1, rawDmg - mitigation);
                        window.GameState.pStats.hp -= actualDmg; 
                        if (en.def.poisonDuration) window.GameCore.applyStatusEffect('poison', en.def.poisonDuration, en.def.poisonTickDamage);
                        window.EventBus.emit('ENTITY_DAMAGED', { damage: actualDmg, position: pPos, isPlayer: true }); 
                        window.EventBus.emit('UI_UPDATE_HUD');
                        window.EventBus.emit('SPAWN_HIT_VFX', { type: window.AssetManager ? window.AssetManager.prefabs['Player'].vfx.onHit : 'Blood', pos: pPos.clone().add(new window.THREE.Vector3(0, 1, 0)) });
                        
                        if(window.GameState.pStats.hp <= 0) {
                            if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(window.GameCore.playerObj, 'die');
                            window.EventBus.emit('UI_LOG', "You were struck down."); 
                            setTimeout(() => window.EventBus.emit('PLAYER_RESPAWN'), 3000);
                        } else {
                            if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(window.GameCore.playerObj, 'hit');
                        }
                    }
                } else { window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "BLOCKED", pos: pPos, color: '#aaaaaa'}); }
            }
        } else {
            if (Math.random() < 0.02) {
                const randomDir = new window.THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
                en.body.setLinvel({ x: randomDir.x * (en.def.speed*0.5), y: en.body.linvel().y, z: randomDir.z * (en.def.speed*0.5) }, true);
                if (en.visual && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') {
                    en.visual.lookAt(en.visual.position.clone().add(randomDir));
                    if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'walk');
                }
            } else if (en.body.linvel().x === 0 && en.body.linvel().z === 0) {
                if(window.GameCore.playEntityAnimation && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') window.GameCore.playEntityAnimation(en, 'idle');
            }
        }
    });
});
