import assert from 'node:assert/strict';
import StructureManager from '../../src/systems/structure_manager.js';
import SquadCultivationSystem from '../../src/systems/squad_cultivation_system.js';

console.log('================================================================================');
console.log('🐺🏹 STEP 3 AUDIT: WOODLAND SQUAD DISPATCH & HUNTSMAN CULTIVATION SYSTEM');
console.log('================================================================================');

// 1. Seed settlement perimeter & spawn actors from assets/tileset.json
StructureManager.seedDefaultSettlementPerimeter(0, 0);
const jess = SquadCultivationSystem.spawnActor('jess_nedaf', { martial: 22, survival: 18, storyDensity: 35 });
const adv1 = SquadCultivationSystem.spawnActor('adventurer_dispatch', { name: 'Outrider Kael', martial: 16, survival: 15, storyDensity: 20 });
const militia1 = SquadCultivationSystem.spawnActor('villager_militia', { name: 'Wall-Spearman Hal', martial: 9, survival: 8, storyDensity: 5 });
const huntsman = SquadCultivationSystem.spawnActor('the_huntsman');
const sovereign = SquadCultivationSystem.spawnActor('pale_sovereign');

assert.equal(jess.primaryColor, '#1e293b', 'Actor primaryColor must read directly from assets/tileset.json');
assert.equal(huntsman.accentColor, '#fbbf24', 'Huntsman Orb accentColor must read directly from assets/tileset.json');
console.log(`[1] Actors Spawned from assets/tileset.json: ${jess.name}, ${adv1.name}, ${militia1.name}, ${huntsman.name}, ${sovereign.name}`);

// 2. Verify Doctrine Hierarchy & Career Integrity
const invalidDispatch = SquadCultivationSystem.dispatchOrderSquad([militia1.id], 'BARRIER_FUEL_RUN');
assert.equal(invalidDispatch.ok, false, 'Civilians / villager_militia must not dispatch into the forest');
console.log(`[2] Career Integrity Verified: ${invalidDispatch.reason}`);

StructureManager.mobilizeVillagersToWalls([militia1]);
const validDispatch = SquadCultivationSystem.dispatchOrderSquad([adv1.id], 'BARRIER_FUEL_RUN', { x: 48, z: 48 });
assert.equal(validDispatch.ok, true);
const returnRes = SquadCultivationSystem.completeSquadExpedition(validDispatch.squad.id);
assert.equal(returnRes.ok, true);
console.log(`[3] Order Fuel Expedition Verified: Delivered`, returnRes.cargoDelivered, `| Anchor-Stone Fuel: ${StructureManager.getAnchorStone().barrierFuel}u`);

// 3. Probing Wendigo Pack vs. Manned Perimeter Walls
const packRes = SquadCultivationSystem.spawnProbingWendigoPack(3, { x: -30, z: 30 });
assert.equal(packRes.ok, true);
const probeOutcome = SquadCultivationSystem.resolvePackProbeOnSettlement(packRes.pack.id);
assert.equal(probeOutcome.ok, true);
console.log(`[4] Sovereign Probing Pack Verified: Target=${probeOutcome.targetStructureId}, Wall HP=${probeOutcome.structureResult.remainingHp}`);

// 4. The Huntsman & The Orb Scouting (target.stats > lastHarvestedStats), Mark, 5% HP Beatdown & 24h Scorn
const baselineBefore = SquadCultivationSystem.lastHarvestedStats.compositeScore;
const scoutRes = SquadCultivationSystem.scoutHuntsmanTarget();
assert.equal(scoutRes.ok, true);
assert.equal(scoutRes.target.id, jess.id);
assert.equal(jess.activeStatusVisuals.HUNTSMAN_MARK.colorHex, '#dc2626');
console.log(`[5] Huntsman Scouting & Mark Verified: Target=${jess.name} (Score ${scoutRes.compositeScore} > Baseline ${baselineBefore})`);

const beatdownRes = SquadCultivationSystem.executeHuntsmanCultivationBeatdown(jess.id);
assert.equal(beatdownRes.ok, true);
assert.equal(jess.hp, Math.round(jess.maxHp * 0.05));
assert.equal(jess.scornHoursRemaining, 24.0);
assert.equal(jess.isHostileOrNonInteractiveToAllies, true);
assert.equal(jess.activeStatusVisuals.HUNTSMAN_SCORN_24H.colorHex, '#d97706');
assert.equal(jess.activeStatusVisuals.STORY_DENSITY_HIGH.colorHex, '#fef08a');
console.log(`[6] Near-Death Cultivation & 24h Scorn Verified: HP=${jess.hp}/${jess.maxHp} (5%), Scorn=${jess.scornHoursRemaining}h, GrowthMult=${jess.cultivationGrowthMultiplier}x`);

const scornBlockedDispatch = SquadCultivationSystem.dispatchOrderSquad([jess.id], 'RUNIC_RELIC_EXTRACTION');
assert.equal(scornBlockedDispatch.ok, false);
SquadCultivationSystem.tickHours(24.0);
assert.equal(jess.scornHoursRemaining, 0);
assert.equal(jess.isHostileOrNonInteractiveToAllies, false);

// 5. Macabre Harvest & Wendigo -> Vampire Evolution
const harvestRes = SquadCultivationSystem.executeMacabreHarvest(jess.id);
assert.equal(harvestRes.ok, true);
assert.ok(SquadCultivationSystem.lastHarvestedStats.compositeScore > baselineBefore);
assert.equal(harvestRes.evolvedWendigo.evolutionStage, 'VAMPIRE');
console.log(`[7] Macabre Harvest & Escalation Verified: New Baseline=${SquadCultivationSystem.lastHarvestedStats.compositeScore} | Evolved ${harvestRes.evolvedWendigo.name} -> ${harvestRes.evolvedWendigo.evolutionStage}`);

// 6. 14-Day Shift Wave & Starving + Freezing -> Lesser Feral Wendigo Transformation
const doomedScout = SquadCultivationSystem.spawnActor('adventurer_dispatch', {
    name: 'Frostbitten Runner',
    position: { x: 95, y: 0, z: 95 },
    isDispatchedOutside: true,
    isAnchored: false,
    isStarving: true,
    isFreezing: true
});
const shiftRes = SquadCultivationSystem.triggerShiftWave();
assert.equal(shiftRes.lightingState, 'whiteVoidShift');
assert.ok(shiftRes.wendigoRebirthIds.includes(doomedScout.id));
assert.equal(doomedScout.tilesetActorKey, 'lesser_wendigo');
console.log(`[8] 14-Day Shift & Feral Wendigo Rebirth Verified: Lighting=${shiftRes.lightingState}, Reborn=${doomedScout.name} (${doomedScout.tilesetActorKey})`);

console.log('✅ ALL STEP 3 WOODLAND SQUAD & HUNTSMAN CULTIVATION CHECKS PASSED!');
