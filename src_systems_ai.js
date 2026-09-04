window.EventBus.on('PARTY_COMMAND', command => {
    window.GameState.party.command = command;
    window.GameCore.activeEntities.filter(entity => entity.companionId).forEach(entity => {
        entity.holdPosition = command === 'hold' ? entity.visual.position.clone() : null;
    });
    window.EventBus.emit('UI_LOG', `Party command: ${command.toUpperCase()}.`);
});

function moveCompanion(companion, destination, speedMultiplier = 1) {
    const direction = new window.THREE.Vector3().subVectors(destination, companion.visual.position);
    if (direction.lengthSq() < 1) {
        companion.body.setLinvel({ x: 0, y: companion.body.linvel().y, z: 0 }, true);
        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(companion, 'idle');
        return;
    }
    direction.normalize();
    companion.body.setLinvel({ x: direction.x * companion.def.speed * speedMultiplier, y: companion.body.linvel().y, z: direction.z * companion.def.speed * speedMultiplier }, true);
    companion.visual.lookAt(companion.visual.position.clone().add(direction));
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(companion, 'walk');
}

window.EventBus.on('AI_TICK', ({ delta, isPlayerSafe }) => {
    if(!window.GameCore || !window.GameCore.playerObj) return;
    const pPos = window.GameCore.playerObj.visual.position;
    const obstacles = window.GameCore.activeEntities.filter(e => e.def.isObstacle);

    window.GameCore.activeEntities.forEach(en => {
        if(en.body && en.body.isDynamic && en.body.isDynamic()) { const p = en.body.translation(); en.visual.position.set(p.x, p.y, p.z); }
        if (en.def.type !== 'npc') return;

        if (en.companionId) {
            const command = window.GameState.party.command;
            const hostileEntities = window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && entity.hp > 0);
            const nearestHostile = hostileEntities.sort((a, b) => en.visual.position.distanceTo(a.visual.position) - en.visual.position.distanceTo(b.visual.position))[0];
            if (command === 'hold') {
                if (en.holdPosition) moveCompanion(en, en.holdPosition);
                return;
            }
            if (command === 'attack' && nearestHostile && en.visual.position.distanceTo(nearestHostile.visual.position) < 20) {
                const distance = en.visual.position.distanceTo(nearestHostile.visual.position);
                if (distance > 1.8) {
                    moveCompanion(en, nearestHostile.visual.position, 1.1);
                } else if ((!en.companionAttackReadyAt || performance.now() >= en.companionAttackReadyAt) && window.GameCore.playEntityAnimation) {
                    en.companionAttackReadyAt = performance.now() + 900;
                    const damage = 10 + window.GameState.pStats.strength.level;
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
            moveCompanion(en, pPos.clone().add(offset), command === 'retreat' ? 1.3 : 1);
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
        let target = null;
        if (hostile && !onProtectedPath && !inVillageBarrier) {
            if (en.visual.position.distanceTo(pPos) < 15 && !isPlayerSafe && !window.EngineParams.isPlayerHidden) target = pPos;
        }

        if (onProtectedPath || inVillageBarrier) {
            const nearestTower = window.GameCore.activeEntities
                .filter(entity => (onProtectedPath ? entity.name === 'Rune Tower' : entity.name === 'Floating Power Stone') && entity.def.active !== false)
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

        if (target) {
            let dir = new window.THREE.Vector3().subVectors(target, en.visual.position);
            if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 1);
            
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
            en.body.setLinvel({ x: dir.x * en.def.speed, y: en.body.linvel().y, z: dir.z * en.def.speed }, true);
            
            if (en.visual && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') {
                en.visual.lookAt(en.visual.position.clone().add(dir));
                if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'walk');
            }

            if(en.visual.position.distanceTo(pPos) < 1.8 && Math.random() < 0.05 && en.currentAnimState !== 'hit' && en.currentAnimState !== 'die') {
                if(window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(en, 'attack');
                
                if (!window.EngineParams.godMode) {
                    if (window.Input.isBlocking) {
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', {text: "BLOCKED!", pos: pPos, color: '#4ade80'}); 
                        window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/tom-analog.mp3', pos: pPos, vol: -5});
                    } else {
                        const rawDmg = en.def.attackDamage || 15; const armorDef = window.GameState.derivedStats.armor + window.GameCore.getBuffBonus('meleeDef') + window.GameCore.getBuffBonus('toughness'); const actualDmg = Math.max(1, rawDmg - armorDef);
                        window.GameState.pStats.hp -= actualDmg; 
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
