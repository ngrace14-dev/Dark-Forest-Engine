import * as THREE from 'three';

class RoadManager {
    constructor() {
        this.roadNodes = [];
        this.roadWidth = 6.0;
    }

    generateWorldRoads(seed = 1337) {
        this.roadNodes = [];

        const waypoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(180, 0, -220),
            new THREE.Vector3(420, 0, 60),
            new THREE.Vector3(120, 0, 360),
            new THREE.Vector3(-240, 0, 220),
            new THREE.Vector3(-320, 0, -180),
            new THREE.Vector3(-100, 0, -380)
        ];

        const curve = new THREE.CatmullRomCurve3(waypoints, true);
        const points = curve.getPoints(140);

        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            if (Number.isFinite(pt.x) && Number.isFinite(pt.z)) {
                this.roadNodes.push({ x: pt.x, z: pt.z, width: this.roadWidth });
            }
        }
    }

    getRoadPointsNear(chunkX, chunkZ, searchRadius = 90) {
        const cx = chunkX * 60 + 30;
        const cz = chunkZ * 60 + 30;
        const rSq = searchRadius * searchRadius;

        return this.roadNodes.filter(node => {
            const dx = node.x - cx;
            const dz = node.z - cz;
            return (dx * dx + dz * dz) <= rSq;
        });
    }

    isSafeZone(pos) {
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return false;
        const radiusSq = (this.roadWidth + 2.5) ** 2;
        for (let i = 0; i < this.roadNodes.length; i++) {
            const n = this.roadNodes[i];
            const dx = n.x - pos.x;
            const dz = n.z - pos.z;
            if (dx * dx + dz * dz <= radiusSq) return true;
        }
        return false;
    }

    getRandomPathPoint() {
        if (this.roadNodes.length === 0) this.generateWorldRoads();
        const randIdx = Math.floor(Math.random() * this.roadNodes.length);
        return this.roadNodes[randIdx];
    }
}

window.RoadManager = new RoadManager();
window.RoadManager.generateWorldRoads();
