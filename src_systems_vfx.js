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
