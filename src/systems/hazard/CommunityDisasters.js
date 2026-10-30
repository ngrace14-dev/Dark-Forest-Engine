// File: src/systems/hazard/CommunityDisasters.js
/**
 * CommunityDisasters
 * Handles large-scale hazards like Thatch Fires and Mine Cave-ins.
 */
export class CommunityDisasters {
    static triggerThatchFire(settlement, startTile) {
        if (!settlement || !startTile) return;
        console.warn(`[Disaster] Thatch Fire started at ${startTile.id}`);
        
        const queue = [startTile];
        const visited = new Set();
        visited.add(startTile.id);

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Effect on occupants
            const occupants = settlement.getActorsOnTile ? settlement.getActorsOnTile(current) : [];
            for (const actor of occupants) {
                if (actor.isDead) continue;
                
                if (actor.age >= 250 || (actor.mobilityMod && actor.mobilityMod < 0.5)) {
                    // Elder/Non-mobile mortality hazard
                    if (Math.random() < 0.85) {
                        settlement.mortalitySystem.executeDeath(actor, "Urban Fire");
                    }
                } else {
                    // Stage 2 injury for others
                    settlement.hazardCascade.triggerStage2(actor, { catastropheSeverity: 0.5 });
                }
            }

            // Propagate fire
            if (!settlement.hasWaterCisterns) {
                const neighbors = settlement.getAdjacentTiles ? settlement.getAdjacentTiles(current) : [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor.id) && neighbor.type === 'thatch_building') {
                        visited.add(neighbor.id);
                        queue.push(neighbor);
                    }
                }
            }
        }
    }

    static triggerMineCaveIn(settlement, mineSector) {
        console.error(`[Disaster] Mine Cave-in at ${mineSector.id}`);
        
        const workers = settlement.getActorsInSector(mineSector);
        for (const worker of workers) {
            // High severity Stage 3
            settlement.hazardCascade.triggerStage3(worker, { catastropheSeverity: 1.0 });
        }
    }
}
