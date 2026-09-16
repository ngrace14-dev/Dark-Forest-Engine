import * as THREE from 'three';

window.Navigation = {
    cellSize: 3,
    routeRange: 36,
    findRoute: function(start, goal, agentRadius = 0.5) {
        const direct = new THREE.Vector3().subVectors(goal, start); direct.y = 0;
        if (direct.lengthSq() === 0) return [];
        const localGoal = direct.length() > this.routeRange ? start.clone().add(direct.normalize().multiplyScalar(this.routeRange)) : goal.clone();
        const toCell = point => ({ x: Math.round(point.x / this.cellSize), z: Math.round(point.z / this.cellSize) });
        const startCell = toCell(start); const goalCell = toCell(localGoal);
        const key = cell => `${cell.x},${cell.z}`;
        const obstacles = window.GameCore.activeEntities.filter(entity => entity.def.isObstacle && entity.def.type !== 'npc');
        const blocked = cell => {
            const worldX = cell.x * this.cellSize; const worldZ = cell.z * this.cellSize;
            return obstacles.some(entity => Math.hypot(worldX - entity.visual.position.x, worldZ - entity.visual.position.z) < (entity.def.radius || 1) + agentRadius + 0.5);
        };
        const open = [{ cell: startCell, g: 0, f: Math.abs(startCell.x - goalCell.x) + Math.abs(startCell.z - goalCell.z) }];
        const cameFrom = new Map(); const costs = new Map([[key(startCell), 0]]); let found = null;
        const maxSteps = 500;
        for (let step = 0; open.length && step < maxSteps; step++) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            if (current.cell.x === goalCell.x && current.cell.z === goalCell.z) { found = current.cell; break; }
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, z]) => {
                const next = { x: current.cell.x + x, z: current.cell.z + z };
                const nextKey = key(next); const nextCost = current.g + 1;
                if (blocked(next) || (costs.has(nextKey) && costs.get(nextKey) <= nextCost)) return;
                costs.set(nextKey, nextCost); cameFrom.set(nextKey, current.cell);
                open.push({ cell: next, g: nextCost, f: nextCost + Math.abs(next.x - goalCell.x) + Math.abs(next.z - goalCell.z) });
            });
        }
        if (!found) return [localGoal];
        const route = [];
        for (let current = found; key(current) !== key(startCell); current = cameFrom.get(key(current))) route.unshift(new THREE.Vector3(current.x * this.cellSize, localGoal.y, current.z * this.cellSize));
        return route;
    }
};
