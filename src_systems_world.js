import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

window.WorldGenConfig = {
    noiseScale: 0.003,
    biomes: {
        'redwoods': { name: 'NorCal Redwoods', color: 0x1a2f21, prefab: 'Redwood Tree', density: 40 },
        'alpine': { name: 'Shasta Alpine', color: 0x363a40, prefab: 'Alpine Rock', density: 15 },
        'valley': { name: 'Central Valley', color: 0x453f2c, prefab: 'Oak Tree', density: 8 },
        'coastal': { name: 'Lost Coast', color: 0x22303d, prefab: 'Coastal Driftwood', density: 12 },
        'sierra': { name: 'Sierra Nevada Wall', color: 0x4a4a4a, prefab: 'Sierra Peak', density: 8 },
        'desert': { name: 'Deep Desert', color: 0xc2b280, prefab: 'Sand Dune', density: 10 }
    }
};

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
        window.EventBus.emit('UI_LOG', `🛤️ Generated ${this.paths.length} meandering road splines.`);
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
    }
};

window.VillageManager = {
    villages: [], names: ["Oakhaven", "Gallows Hill", "Mire's Edge", "Blackwood", "Hollow Creek", "Ashen Hold", "Dire Rest", "Crow's Perch", "Widow's Peak", "Thornbury", "Gloomhaven", "Duskendale", "Grimsby", "Shadowfen", "Blighted Watch", "Bleakmire", "Wraith's End", "Cullfield", "Bonegate", "Terminus"],
    generateWeb: function() {
        this.villages = []; let currentRadius = 0; let currentAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < 20; i++) {
            let x = 0, z = 0;
            if (i > 0) {
                const distanceStep = 10000 + (Math.random() * 10000); currentRadius += distanceStep; currentAngle += (Math.random() - 0.5) * (Math.PI / 1.5); 
                x = Math.cos(currentAngle) * currentRadius; z = Math.sin(currentAngle) * currentRadius;
            }
            let connections = []; if (i > 0) connections.push(i - 1); if (i < 19) connections.push(i + 1); 
            this.villages.push({ id: i, name: this.names[i], x: Math.round(x), z: Math.round(z), connections: connections, stats: { ap: 50 + Math.floor(Math.random()*50), wood: 200, stone: 100 }, assignedModel: null, layout: [] });
        }
        window.RoadManager.generateRoads(this.villages);
        window.EventBus.emit('UI_LOG', "🌲 20 Settlements generated. Road Network integrated.");
        if(window.EngineState.currentAssetTab === 'villages' || window.EngineState.currentAssetTab === 'world') window.EventBus.emit('RENDER_ASSETS');
    }
};

window.currentPrng = alea(window.EngineParams.worldSeed);
window.currentNoise2D = createNoise2D(window.currentPrng);

window.WorldGenerator = class {
    static getNoise(x, z) { return window.currentNoise2D(x * window.WorldGenConfig.noiseScale, z * window.WorldGenConfig.noiseScale); }
    static getBiome(x, z) {
        if (x >= 286000 && x < 287000) return 'sierra';
        if (x >= 287000) return 'desert';
        const val = this.getNoise(x, z);
        if (val > 0.45) return 'alpine'; if (val < -0.3) return 'coastal'; if (val > -0.3 && val < 0.1) return 'valley'; return 'redwoods';
    }
    static getTerrainHeight(x, z) {
        let height = window.currentNoise2D(x * 0.005, z * 0.005) * 8; const biomeKey = this.getBiome(x, z);
        if(biomeKey === 'alpine' || biomeKey === 'sierra') height += Math.max(0, window.currentNoise2D(x * 0.01, z * 0.01) * 20);
        return height;
    }
};
