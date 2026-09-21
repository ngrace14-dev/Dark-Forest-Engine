import * as THREE from 'three';

class RoadManager {
    constructor() {
        this.roadNodes = [];
        this.roadSegments = [];
        this.minPathDistance = 180; // Minimum distance between parallel road branches (prevents seeing paths through trees)
        this.roadWidth = 6.0;
        this.decorMeshGroup = null;
    }

    // --- 1. SPREAD OUT ROAD NETWORK GENERATION ---
    generateWorldRoads(seed = 1337) {
        this.roadNodes = [];
        this.roadSegments = [];

        // Generates widely spaced highways extending across major biome regions
        const waypoints = [
            { x: 0, z: 0 },
            { x: 220, z: -180 },
            { x: 480, z: 80 },
            { x: 150, z: 380 },
            { x: -280, z: 240 },
            { x: -350, z: -190 },
            { x: -120, z: -420 }
        ];

        // Connect main waypoints into a single sprawling highway spine
        for (let i = 0; i < waypoints.length - 1; i++) {
            this.createCurvedRoadSegment(waypoints[i], waypoints[i + 1]);
        }
    }

    createCurvedRoadSegment(start, end) {
        const dist = Math.hypot(end.x - start.x, end.z - start.z);
        const steps = Math.max(8, Math.floor(dist / 12)); // 12m resolution between points
        
        // Perpendicular offset for gentle, natural winding curves
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        const dirX = (end.x - start.x) / dist;
        const dirZ = (end.z - start.z) / dist;
        const perpX = -dirZ;
        const perpZ = dirX;

        const curveOffset = (Math.sin(start.x * 0.05 + end.z * 0.05) - 0.5) * 45.0;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curveFactor = Math.sin(t * Math.PI) * curveOffset;

            const px = start.x + (end.x - start.x) * t + perpX * curveFactor;
            const pz = start.z + (end.z - start.z) * t + perpZ * curveFactor;

            // Enforce minimum isolation spacing from existing non-connected road points
            if (!this.isTooCloseToOtherPaths(px, pz, 30.0)) {
                this.roadNodes.push({ x: px, z: pz, width: this.roadWidth });
            }
        }
    }

    isTooCloseToOtherPaths(x, z, minDistThreshold) {
        for (let i = 0; i < this.roadNodes.length - 10; i++) {
            const node = this.roadNodes[i];
            const dx = node.x - x;
            const dz = node.z - z;
            if (dx * dx + dz * dz < minDistThreshold * minDistThreshold) {
                return true;
            }
        }
        return false;
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
        if (!pos) return false;
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
