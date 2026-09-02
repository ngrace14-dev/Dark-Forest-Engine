window.EventBus.on('AI_TICK', ({ delta, isPlayerSafe }) => {
    if(!window.GameCore || !window.GameCore.playerObj) return;
    const pPos = window.GameCore.playerObj.visual.position;
    const obstacles = window.GameCore.activeEntities.filter(e => e.def.isObstacle);

    window.GameCore.activeEntities.forEach(en => {
        if(en.body && en.body.isDynamic && en.body.isDynamic()) { const p = en.body.translation(); en.visual.position.set(p.x, p.y, p.z); }
        if (en.def.type !== 'npc') return;

        let target = null;
        if (en.def.faction === 'monster' || window.GameState.reputation[en.def.faction] <= -50) {
            if (en.visual.position.distanceTo(pPos) < 15 && !isPlayerSafe) target = pPos;
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
                        const rawDmg = 15; const armorDef = window.GameState.derivedStats.armor; const actualDmg = Math.max(1, rawDmg - armorDef);
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
