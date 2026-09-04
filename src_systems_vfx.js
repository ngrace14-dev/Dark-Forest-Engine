import * as THREE from 'three';
window.VFXManager = {
    defs: {
        'Fire': { type: 'aura', color: '#ffaa00', size: 0.15, blend: THREE.AdditiveBlending, sprite: null },
        'Void': { type: 'aura', color: '#8800ff', size: 0.15, blend: THREE.AdditiveBlending, sprite: null },
        'Holy': { type: 'aura', color: '#ffffaa', size: 0.15, blend: THREE.AdditiveBlending, sprite: null },
        'Blood': { type: 'onHit', color: '#ff0000', size: 0.20, blend: THREE.NormalBlending, sprite: null },
        'Sparks': { type: 'onHit', color: '#ffff00', size: 0.20, blend: THREE.AdditiveBlending, sprite: null },
        'Dust': { type: 'onHit', color: '#887755', size: 0.20, blend: THREE.NormalBlending, sprite: null },
        'Poison': { type: 'onHit', color: '#7cff3b', size: 0.35, blend: THREE.AdditiveBlending, sprite: null }
    },
    get auras() { return ['None', ...Object.keys(this.defs).filter(k => this.defs[k].type === 'aura')]; },
    get onHits() { return ['None', ...Object.keys(this.defs).filter(k => this.defs[k].type === 'onHit')]; },
    transientVFX: [],
    projectiles: [],
    
    applyAura: function(entity, def) {
        if(entity.auraMesh) { entity.visual.remove(entity.auraMesh); entity.auraMesh.geometry.dispose(); entity.auraMesh.material.dispose(); entity.auraMesh = null; }
        const type = def.vfx.aura; if(type === 'None' || !this.defs[type]) return;
        const vfxDef = this.defs[type];
        
        const count = 60; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(count * 3);
        for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * (def.radius*2.5);
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        
        const mat = new THREE.PointsMaterial({ color: new THREE.Color(vfxDef.color), size: vfxDef.size, transparent: true, opacity: 0.8, blending: vfxDef.blend, depthWrite: false, map: vfxDef.sprite || null, alphaTest: vfxDef.sprite ? 0.01 : 0 });
        const pts = new THREE.Points(geo, mat); pts.userData = { type: type, height: def.height }; pts.position.y = def.height / 2; 
        entity.auraMesh = pts; entity.visual.add(pts);
    },
    spawnHit: function(type, pos) {
        if(type === 'None' || !this.defs[type] || !window.GameCore.scene) return;
        const vfxDef = this.defs[type]; const count = 20; const geo = new THREE.BufferGeometry(); const positions = new Float32Array(count * 3); const velocities = [];
        for(let i=0; i<count; i++) {
            positions[i*3] = pos.x; positions[i*3+1] = pos.y; positions[i*3+2] = pos.z;
            velocities.push(new THREE.Vector3((Math.random()-0.5)*5, Math.random()*5, (Math.random()-0.5)*5));
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: new THREE.Color(vfxDef.color), size: vfxDef.size, transparent: true, depthWrite: false, blending: vfxDef.blend, map: vfxDef.sprite || null, alphaTest: vfxDef.sprite ? 0.01 : 0 });
        const pts = new THREE.Points(geo, mat); window.GameCore.scene.add(pts);
        this.transientVFX.push({ mesh: pts, velocities: velocities, life: 1.0, type: type });
    },
    spawnProjectile: function({ position, direction, damage, damageType, speed, range, color, owner = 'enemy', statusEffect = null }) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
        mesh.position.copy(position);
        window.GameCore.scene.add(mesh);
        this.projectiles.push({ mesh, direction: direction.clone().normalize(), damage, damageType, speed, remaining: range, owner, statusEffect });
    },
    update: function(delta) {
        for (let i = this.transientVFX.length - 1; i >= 0; i--) {
            let vfx = this.transientVFX[i]; vfx.life -= delta * 2.0;
            if (vfx.life <= 0) { window.GameCore.scene.remove(vfx.mesh); vfx.mesh.geometry.dispose(); vfx.mesh.material.dispose(); this.transientVFX.splice(i, 1); } 
            else {
                const positions = vfx.mesh.geometry.attributes.position.array;
                for(let j=0; j<vfx.velocities.length; j++) {
                    if (vfx.type !== 'Dust') vfx.velocities[j].y -= 9.8 * delta;
                    positions[j*3] += vfx.velocities[j].x * delta; positions[j*3+1] += vfx.velocities[j].y * delta; positions[j*3+2] += vfx.velocities[j].z * delta;
                }
                vfx.mesh.geometry.attributes.position.needsUpdate = true; vfx.mesh.material.opacity = vfx.life;
            }
        }
        for (let index = this.projectiles.length - 1; index >= 0; index--) {
            const projectile = this.projectiles[index];
            const distance = projectile.speed * delta;
            const previousPosition = projectile.mesh.position.clone();
            projectile.mesh.position.addScaledVector(projectile.direction, distance);
            projectile.remaining -= distance;
            const player = window.GameCore.playerObj;
            if (projectile.owner === 'player') {
                const target = window.GameCore.activeEntities.find(entity => {
                    if (entity.def.type !== 'npc' || entity.hp <= 0) return false;
                    const targetPosition = entity.visual.position.clone().add(new THREE.Vector3(0, 1, 0));
                    const travel = projectile.mesh.position.clone().sub(previousPosition);
                    const travelLengthSq = travel.lengthSq();
                    const progress = travelLengthSq ? Math.max(0, Math.min(1, targetPosition.clone().sub(previousPosition).dot(travel) / travelLengthSq)) : 0;
                    return previousPosition.clone().addScaledVector(travel, progress).distanceTo(targetPosition) < 0.9;
                });
                if (target) {
                    window.EventBus.emit('PLAYER_PROJECTILE_HIT', { target, damage: projectile.damage, damageType: projectile.damageType, position: projectile.mesh.position, statusEffect: projectile.statusEffect });
                    projectile.remaining = 0;
                }
            }
            if (projectile.owner === 'enemy' && player && projectile.mesh.position.distanceTo(player.visual.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8 && !window.EngineParams.godMode) {
                if (window.Input.isBlocking) {
                    const poiseDamage = Math.max(8, Math.floor(projectile.damage * 0.7));
                    window.GameState.pStats.poise = Math.max(0, window.GameState.pStats.poise - poiseDamage);
                    if (window.GameState.pStats.poise <= 0) {
                        window.GameState.pStats.guardBrokenUntil = performance.now() + 1000;
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'GUARD BREAK!', pos: player.visual.position, color: '#ef4444' });
                    } else {
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'BLOCKED!', pos: player.visual.position, color: '#4ade80' });
                    }
                    window.EventBus.emit('UI_UPDATE_HUD');
                    this.spawnHit('Sparks', projectile.mesh.position);
                } else {
                    const damage = Math.max(1, projectile.damage - window.GameCore.getResistance(projectile.damageType));
                    window.GameState.pStats.hp = Math.max(0, window.GameState.pStats.hp - damage);
                    window.EventBus.emit('ENTITY_DAMAGED', { damage, position: player.visual.position, isPlayer: true });
                    window.EventBus.emit('UI_UPDATE_HUD');
                    this.spawnHit(projectile.damageType === 'void' ? 'Void' : 'Sparks', projectile.mesh.position);
                    if (window.GameState.pStats.hp <= 0) {
                        if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(player, 'die');
                        window.EventBus.emit('UI_LOG', 'You were struck down.');
                        setTimeout(() => window.EventBus.emit('PLAYER_RESPAWN'), 3000);
                    }
                }
                projectile.remaining = 0;
            }
            if (projectile.remaining <= 0) {
                window.GameCore.scene.remove(projectile.mesh);
                projectile.mesh.geometry.dispose();
                projectile.mesh.material.dispose();
                this.projectiles.splice(index, 1);
            }
        }
        window.GameCore.activeEntities.forEach(en => { if (en.auraMesh) this.animateAura(en.auraMesh, delta); });
        if (window.GameCore.playerObj && window.GameCore.playerObj.auraMesh) this.animateAura(window.GameCore.playerObj.auraMesh, delta);
    },
    animateAura: function(mesh, delta) {
        mesh.rotation.y += delta * 0.5; const pos = mesh.geometry.attributes.position.array; const type = mesh.userData.type; const h = mesh.userData.height;
        for(let i=0; i<pos.length; i+=3) {
            if (type === 'Fire') { pos[i+1] += delta * 2; if(pos[i+1] > h/2) pos[i+1] = -h/2; } 
            else if (type === 'Void') { pos[i] *= 0.98; pos[i+2] *= 0.98; pos[i+1] -= delta * 0.5; if(pos[i+1] < -h/2) { pos[i+1] = h/2; pos[i] = (Math.random() - 0.5) * 3; pos[i+2] = (Math.random() - 0.5) * 3; } } 
            else if (type === 'Holy') { pos[i+1] += delta * 0.5; if(pos[i+1] > h/2) pos[i+1] = -h/2; }
        }
        mesh.geometry.attributes.position.needsUpdate = true;
    }
};
