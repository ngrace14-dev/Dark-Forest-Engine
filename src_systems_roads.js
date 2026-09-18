import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

window.RoadManager = {
    paths: [], roadChunks: new Map(),
    generateRoads: function(villages) {
        this.paths = []; this.roadChunks.clear();
        for (let i = 0; i < villages.length - 1; i++) {
            const start = new THREE.Vector3(villages[i].x, 0, villages[i].z); const end = new THREE.Vector3(villages[i+1].x, 0, villages[i+1].z);
            const points = [start]; const dist = start.distanceTo(end); const meanderFactor = 5.0 + Math.random() * 5.0; 
            const numSegments = Math.max(3, Math.floor(dist / 2000)); const dir = end.clone().sub(start).normalize(); const perp = new THREE.Vector3(-dir.z, 0, dir.x);
            
            for (let j = 1; j < numSegments; j++) {
                const t = j / numSegments; const basePt = start.clone().lerp(end, t); const sign = (j % 2 === 0) ? 1 : -1;
                const offsetMag = dist * meanderFactor * 0.1 * (0.5 + Math.random() * 0.5); 
                points.push(basePt.add(perp.clone().multiplyScalar(sign * offsetMag)));
            }
            points.push(end);
            const curve = new THREE.CatmullRomCurve3(points); this.paths.push({ startVillage: villages[i].id, endVillage: villages[i+1].id, curve: curve });
            
            const curveLength = curve.getLength(); const numSamples = Math.floor(curveLength / 5); 
            for(let k=0; k<=numSamples; k++) {
                const pt = curve.getPoint(k / numSamples); const cx = Math.floor(pt.x / 60); const cz = Math.floor(pt.z / 60);
                const key = `${cx},${cz}`; if(!this.roadChunks.has(key)) this.roadChunks.set(key, []); this.roadChunks.get(key).push({x: pt.x, z: pt.z});
            }
        }
        window.EventBus.emit('UI_LOG', `Road network generated between ${villages.length} settlements.`);
    },
    getRoadPointsNear: function(cx, cz) {
        let pts = []; for(let x = cx - 2; x <= cx + 2; x++) { for(let z = cz - 2; z <= cz + 2; z++) { const key = `${x},${z}`; if(this.roadChunks.has(key)) pts.push(...this.roadChunks.get(key)); } }
        return pts;
    },
    isSafeZone: function(pos) {
        for (let i = 0; i < window.GameCore.activeEntities.length; i++) { if (window.GameCore.activeEntities[i].name === 'Blight Root') { if (window.GameCore.activeEntities[i].visual.position.distanceTo(pos) < 30.0) return false; } }
        const cx = Math.floor(pos.x / 60); const cz = Math.floor(pos.z / 60); const pts = this.getRoadPointsNear(cx, cz);
        for (let i = 0; i < pts.length; i++) { if (Math.sqrt(Math.pow(pos.x - pts[i].x, 2) + Math.pow(pos.z - pts[i].z, 2)) < 7.0) return true; }
        return false;
    },
    isRuneProtected: function(pos) {
        if (!this.isSafeZone(pos)) return false;
        return window.GameCore.activeEntities.some(entity => entity.name === 'Rune Tower' && entity.def.active !== false && entity.visual.position.distanceTo(pos) <= (entity.def.protectionRadius || 18));
    },
    isVillageProtected: function(pos) {
        return window.VillageManager.villages.some(village => {
            const radius = village.territory?.barrierRadius || 22;
            return village.barrierIntegrity > 0 && Math.hypot(pos.x - village.x, pos.z - village.z) <= radius;
        }) || window.GameCore.activeEntities.some(entity => entity.name === 'Floating Power Stone' && entity.def.active !== false && entity.visual.position.distanceTo(pos) <= (entity.def.barrierRadius || 22));
    },
    getRandomPathPoint: function() {
        const points = Array.from(this.roadChunks.values()).flat();
        if (points.length === 0) return null;
        return points[Math.floor(Math.random() * points.length)];
    }
};


