/**
 * File: src_systems_forces.js
 * Phase 5: Force Ecology
 * Manages the global strengths and influence of the fundamental forces of Dark Forest.
 */

window.ForceManager = {
// ==========================================
// 1. FORCE REGISTRY & METRICS
// ==========================================
forces: {
'Forest': {
strength: 500,
label: 'Possibility',
description: 'Encourages unexpected outcomes and chaos.',
metric: 'Corrupted Chunks',
pressure: 'unexpected_outcomes',
active: true,
value: 0
},
'Crow': {
strength: 100,
label: 'Significance',
description: 'Increases the historical weight and importance of events.',
metric: 'Legend Count',
pressure: 'significance',
active: true,
value: 0
},
'Tree': {
strength: 300,
label: 'Continuity',
description: 'Encourages survival, regrowth, and stable paths.',
metric: 'Vitality',
pressure: 'continuity',
active: true,
value: 300
},
'Huntsman': {
strength: 400,
label: 'Cultivation',
description: 'Encourages the development of greatness in individuals.',
metric: 'Scorn Level',
pressure: 'greatness',
active: true,
value: 0
},
'Crown': {
strength: 600,
label: 'Order',
description: 'Encourages stability, hierarchy, and political control.',
metric: 'Territory Control',
pressure: 'stability',
active: true,
value: 0
},
'Wendigo': {
strength: 200,
label: 'Consumption',
description: 'Encourages destruction, hunger, and loss of memory.',
metric: 'Feral Activity',
pressure: 'consumption',
active: true,
value: 0
},
'Truth': {
strength: 500,
label: 'Accuracy',
description: 'Encourages verification and factual clarity.',
metric: 'Verified Facts',
pressure: 'verification',
active: true,
value: 0
},
'Watcher': {
strength: 0,
label: 'Anomalous Observation',
description: 'The presence of Nicholas and Daylong during turning points.',
metric: 'Sighting Count',
pressure: 'awe',
active: false,
value: 0
},
'Orb': {
strength: 300,
label: 'Witness',
description: 'Encourages interpretation and observation.',
metric: 'Observer Count',
pressure: 'interpretation',
active: true,
value: 0
},
'Houses': {
strength: 400,
label: 'Prosperity',
description: 'Encourages economic growth and resource accumulation.',
metric: 'Total Prosperity',
pressure: 'prosperity',
active: true,
value: 0
},
'The Shackle': {
strength: 150,
label: 'The Bound Walker',
description: 'The Shambling Shadow that enforces the entropy of the path.',
metric: 'Villages Crossed',
pressure: 'mutation',
active: true,
value: 0
}
},
// ==========================================
// 2. STATE MANAGERS & REGISTRIES
// ==========================================
watchers: {
names: ['Nicholas', 'Daylong'],
dialoguePool: [
["Nicholas: Look at that. Another succession.", "Daylong: They never learn, do they?"],
["Daylong: This one has high significance.", "Nicholas: Let's see if the Sovereign notices."],
["Nicholas: The thread is stretching.", "Daylong: Almost to the breaking point."],
["Daylong: A fine vintage indeed.", "Nicholas: The Huntsman is doing his job well."]
]
},
huntsman: {
activeHuntsman: null,
strengthScore: 100,
scornedIds: new Set(),
interventionCooldownDays: 3,
lastInterventionDay: -3,
activeIntervention: false,
timeoutId: null
},
orbMessenger: {
attachedToId: null,
lastPosition: { x: 0, y: 0, z: 0 },
state: 'IDLE',
dialoguePool: [
"The forest remembers your hunger...",
"A shift is coming. The trees are restless.",
"You are being watched, little spark.",
"The Great Lake is deeper than your history."
],
triggerDialogue: function() {
if (Math.random() < 0.1) {
const bark = this.dialoguePool[Math.floor(Math.random() * this.dialoguePool.length)];
window.EventBus.emit('UI_LOG', `[THE ORB] "${bark}"`);
}
}
},
// ==========================================
// 3. INITIALIZATION & EVENT HOOKS
// ==========================================
init: function() {
window.EventBus.on('CHRONICLE_EVENT_RECORDED', (event) => {
if (event.significance >= 500) {
this.triggerWatcherSighting(event.location);
}
});
window.EventBus.on('HEARTBEAT_T30D', () => this.processOwnedVillageEconomy());
window.EventBus.on('HEARTBEAT_T1', () => this.checkSovereignResurrection());
window.EventBus.on('HUNTSMAN_INTERVENTION', (candidateId) => this.twistedRescue(candidateId || 'player'));
},
// ==========================================
// 4. WATCHERS (NICHOLAS & DAYLONG)
// ==========================================
triggerWatcherSighting: function(pos) {
if (!pos || this.forces['Watcher'].active) return;
window.EventBus.emit('UI_LOG', `[ANOMALY] Nicholas and Daylong have appeared to observe the event.`);
const watcher1 = window.GameCore.instantiatePrefab('Watcher', pos.x + 2, pos.y, pos.z);
const watcher2 = window.GameCore.instantiatePrefab('Watcher', pos.x - 2, pos.y, pos.z);
if (watcher1) watcher1.name = 'Nicholas';
if (watcher2) watcher2.name = 'Daylong';
this.forces['Watcher'].active = true;
this.forces['Watcher'].value++;
const dialogue = this.watchers.dialoguePool[Math.floor(Math.random() * this.watchers.dialoguePool.length)];
dialogue.forEach((line, index) => {
setTimeout(() => window.EventBus.emit('UI_LOG', line), index * 3000);
});
setTimeout(() => {
if (watcher1) this.cleanupPhysicalEntity(watcher1);
if (watcher2) this.cleanupPhysicalEntity(watcher2);
if (Array.isArray(window.GameCore.activeEntities)) {
window.GameCore.activeEntities = window.GameCore.activeEntities.filter(
e => e.name !== 'Nicholas' && e.name !== 'Daylong' && e.name !== 'Watcher'
);
}
this.forces['Watcher'].active = false;
}, 15000);
},
// ==========================================
// 5. HUNTSMAN CULTIVATION & INTERVENTION
// ==========================================
applyScorn: function(entityId, durationHours = 12) {
if (!this.huntsman.scornedIds) this.huntsman.scornedIds = new Set();
this.huntsman.scornedIds.add(entityId);
window.EventBus.emit('UI_LOG', `[THE MARK] You are Scorned. The forest ignores your presence.`);
setTimeout(() => {
this.huntsman.scornedIds.delete(entityId);
window.EventBus.emit('UI_LOG', `[THE MARK] The Huntsman's Scorn has faded.`);
}, durationHours * 60 * 1000);
},
checkIntervention: function(candidateId, candidateHpPercent) {
const day = window.EngineParams?.worldDay || 0;
if (candidateHpPercent < 0.45 && (day - this.huntsman.lastInterventionDay >= this.huntsman.interventionCooldownDays)) {
this.twistedRescue(candidateId);
}
},
twistedRescue: function(candidateId) {
if (this.huntsman.activeIntervention) return;
const candidate = window.GameCore.activeEntities.find(e => e.id === candidateId) || (candidateId === 'player' ? window.GameCore.playerObj : null);
if (!candidate) return;
this.huntsman.activeIntervention = true;
this.huntsman.lastInterventionDay = window.EngineParams?.worldDay || 0;
if (candidateId === 'player') window.Input.frozen = true;
const pPos = candidate.visual.position;
const spawnPos = pPos.clone().add(new window.THREE.Vector3(5, 0, 5));
const huntsman = window.GameCore.instantiatePrefab('Huntsman', spawnPos.x, spawnPos.y, spawnPos.z);
if (huntsman) {
huntsman.name = 'Huntsman';
huntsman.isIntervening = true;
// Timeout Failsafe (60s)
this.huntsman.timeoutId = setTimeout(() => {
if (this.huntsman.activeIntervention) {
this.huntsman.activeIntervention = false;
if (candidateId === 'player') window.Input.frozen = false;
this.cleanupPhysicalEntity(huntsman);
}
}, 60000);
// Step 1: Threat Clearance (30m)
const nearby = window.GameCore.SpatialGrid.getNearbyEntities(pPos.x, pPos.z, 30);
nearby.forEach(en => {
if (en !== huntsman && en !== candidate && (en.def?.faction === 'monster' || en.def?.faction === 'forest')) {
en.hp = 0;
if (window.defeatNpc) window.defeatNpc(en, 'huntsman_intervention');
}
});
// Step 2: The Beating (HP to 5%)
setTimeout(() => {
if (!this.huntsman.activeIntervention) return;
if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(huntsman, 'attack');
if (candidateId === 'player' && window.playerHealth?.limbs) {
Object.values(window.playerHealth.limbs).forEach(l => l.hp = l.max * 0.05);
window.playerHealth.updateUI();
} else {
candidate.hp = (candidate.maxHp || 100) * 0.05;
}
window.EventBus.emit('UI_LOG', `[HUNTSMAN] "Not yet. You are not ready for the harvest."`);
// Step 3: Attach Orb & Apply Scorn
this.orbMessenger.attachedToId = candidateId;
this.orbMessenger.state = 'WITNESSING';
this.applyScorn(candidateId, 12);
if (candidateId === 'player') window.Input.frozen = false;
// Step 4: Huntsman Depart
setTimeout(() => {
clearTimeout(this.huntsman.timeoutId);
this.huntsman.activeIntervention = false;
this.cleanupPhysicalEntity(huntsman);
}, 5000);
}, 3000);
}
},
checkHuntsmanVoluntaryEnd: function(huntsman, targetId) {
const targetSignificance = window.ChronicleManager?.calculateSignificance(targetId) || 0;
const sovStrength = window.GameState.paleSovereign?.significance || 1000;
// If target grows to 85% of Sovereign strength, Huntsman self-terminates
if (targetSignificance >= sovStrength * 0.85) {
window.EventBus.emit('UI_LOG', `[THE HUNTSMAN] "The light is too bright. I must return to the root."`);
this.executeHuntsmanSuccession(targetId, huntsman);
return true;
}
return false;
},
executeHuntsmanSuccession: function(victorId, deadHuntsman) {
// Sever Orb from candidate
this.orbMessenger.attachedToId = null;
this.orbMessenger.state = 'RETURNING_TO_SOVEREIGN';
window.EventBus.emit('UI_LOG', `👁️ [ORB] ".......I tried to warn you."`);
this.cleanupPhysicalEntity(deadHuntsman);
// Summon Pale Sovereign for the physical kill
this.executeSovereignKillAndBind(victorId);
},
// ==========================================
// 6. PALE SOVEREIGN (FIRST WENDIGO)
// ==========================================
executeSovereignKillAndBind: function(targetId) {
const sov = window.GameState.paleSovereign;
const mantle = window.GameState.huntsmanMantle || window.GameState.huntsman;
const target = window.GameCore.activeEntities.find(e => e.id === targetId) || (targetId === 'player' ? window.GameCore.playerObj : null);
if (!target) return;
const significance = window.ChronicleManager?.calculateSignificance(targetId) || 0;
// Progressive Consumption Check
if (significance > sov.highestConsumedSignificance) {
sov.significance += (significance * 0.5); // 50% permanent absorption
sov.highestConsumedSignificance = significance;
window.EventBus.emit('UI_LOG', `🩸 [SOVEREIGN] The First Wendigo has feasted upon ${target.name || targetId}.`);
} else {
window.EventBus.emit('UI_LOG', `🦴 [SOVEREIGN] The First Wendigo scorns the weak offering. No value gained.`);
}
sov.harvestHistory.push({
targetId: targetId,
yield: significance,
day: window.EngineParams?.worldDay || 0
});
// Binding: Victim is reborn as the new Huntsman
mantle.activeHuntsman = targetId;
mantle.lastVictimId = targetId;
mantle.targetSignificanceFloor = significance;
window.EventBus.emit('UI_LOG', `💀 [MANTLE] ${target.name || targetId} has been bound to the Sovereign's service. They are the new Huntsman.`);
if (targetId === 'player') {
window.EventBus.emit('PLAYER_WENDIGO_TRANSFORM');
}
},
handleSovereignDeath: function(killerId) {
const sov = window.GameState.paleSovereign;
const killer = window.GameCore.activeEntities.find(e => e.id === killerId) || (killerId === 'player' ? window.GameCore.playerObj : null);
window.EventBus.emit('UI_LOG', `⚔️ [REVELATION] The First Wendigo has fallen... but the root remains.`);
sov.isDead = true;
sov.returnDay = (window.EngineParams?.worldDay || 0) + 365;
if (killer && sov.stats) {
const killerStats = killer.stats || { strength: 50, toughness: 50, speed: 50 };
sov.stats.strength = (sov.stats.strength || 100) + (killerStats.strength * 0.2);
sov.stats.toughness = (sov.stats.toughness || 100) + (killerStats.toughness * 0.2);
sov.stats.speed = (sov.stats.speed || 100) + (killerStats.speed * 0.2);
}
const sovEntity = window.GameCore.activeEntities.find(e => e.isSovereign);
if (sovEntity) this.cleanupPhysicalEntity(sovEntity);
},
checkSovereignResurrection: function() {
const sov = window.GameState.paleSovereign;
const currentDay = window.EngineParams?.worldDay || 0;
if (!sov.isDead || currentDay < sov.returnDay) return;
const currentMonth = Math.floor(currentDay / 30) % 12 + 1;
const isWinter = (currentMonth === 12 || currentMonth === 1 || currentMonth === 2);
if (isWinter) {
sov.isDead = false;
window.EventBus.emit('UI_LOG', `❄️ [SOVEREIGN] The winter has returned. The First Wendigo is reborn.`);
}
},
// ==========================================
// 7. VILLAGE RESTORATION & ECONOMY
// ==========================================
restoreLostVillage: function(villageId, actorId) {
if (!window.VillageManager) return;
const village = window.VillageManager.villages.find(v => v.id === villageId);
if (!village || village.state !== 'LOST') return;
village.state = 'ACTIVE';
village.barrierIntegrity = 1.0;
village.ownerId = actorId;
if (actorId === 'player' || actorId === 'player_node') {
if (!window.GameState.ownedVillages) window.GameState.ownedVillages = new Map();
window.GameState.ownedVillages.set(villageId, {
level: 1,
taxRate: 0.10,
specialty: 'TRADE_HUB',
population_capacity: 50,
structures: ['Anchor Stone', 'Restored Well'],
governance: 'Sovereign_Actor'
});
window.EventBus.emit('UI_LOG', `🏗️ [RESTORATION] You have restored ${village.name}. It is now your economic hub.`);
}
window.ChronicleManager?.recordEvent({
actorId: actorId,
type: 'VILLAGE_RESTORED',
detail: `${actorId} has breathed life back into the ruins of ${village.name}.`,
significance: 300,
historicalWeight: 150,
location: { x: village.x, z: village.z }
});
window.EventBus.emit('VILLAGE_REINTEGRATED', villageId);
},
processOwnedVillageEconomy: function() {
if (!window.GameState?.ownedVillages) return;
window.GameState.ownedVillages.forEach((data, villageId) => {
const village = window.VillageManager?.villages?.find(v => v.id === villageId);
if (!village) return;
const revenue = Math.floor((village.population?.current || 0) * data.taxRate * data.level * 5);
if (village.ownerId === 'player' && window.GameState.inventory) {
window.GameState.inventory.gold = (window.GameState.inventory.gold || 0) + revenue;
window.EventBus.emit('UI_LOG', `💰 [REVENUE] Your hub ${village.name} generated ${revenue} gold this month.`);
}
if (village.stats?.prosperity > 80 && Math.random() < 0.1) {
data.level++;
window.EventBus.emit('UI_LOG', `🏗️ [UPGRADE] ${village.name} has expanded. Hub Level: ${data.level}`);
}
});
},
// ==========================================
// 8. FORCE SIGNATURE & DRIFT CALCULATIONS
// ==========================================
calculateSignature: function(event) {
const type = (event.type || '').toUpperCase();
let dominant = 'Forest';
let secondary = 'Orb';
let opposing = 'Truth';
if (type.includes('DEFEAT') || type.includes('DEATH')) {
dominant = 'Wendigo';
secondary = 'Forest';
opposing = 'Tree';
} else if (type.includes('VERIFIED') || type.includes('TRUTH')) {
dominant = 'Truth';
secondary = 'Crow';
opposing = 'Wendigo';
} else if (type.includes('SUCCESSION') || type.includes('OFFICIAL')) {
dominant = 'Crown';
secondary = 'Crow';
opposing = 'Truth';
} else if (type.includes('LEGEND')) {
dominant = 'Crow';
secondary = 'Orb';
opposing = 'Wendigo';
}
return { dominant, secondary, opposing };
},
getDrift: function(forceName) {
const force = this.forces[forceName];
if (!force) return 1.0;
return 0.8 + (force.strength / 2500);
},
getForceStrength: function(name) {
return this.forces[name]?.strength || 0;
},
cleanupPhysicalEntity: function(entity) {
if (!entity) return;
if (window.GameCore?.scene && entity.visual) window.GameCore.scene.remove(entity.visual);
if (window.GameCore?.world && entity.body) {
window.PhysicsQueue.enqueue(() => window.GameCore.world.removeRigidBody(entity.body));
}
if (Array.isArray(window.GameCore?.activeEntities)) {
window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e !== entity);
}
},
// ==========================================
// 9. RECALCULATION ROUTINES
// ==========================================
update: function(delta) {
this.recalculateCrow();
this.recalculateTruth();
this.recalculateCrown();
this.recalculateForest();
this.recalculateHouses();
this.recalculateWendigo();
this.recalculateTree();
this.recalculateShackle();
},
recalculateTree: function() {
const force = this.forces['Tree'];
if (!window.VillageManager?.villages) return;
const barriers = window.VillageManager.villages.reduce((acc, v) => acc + (v.barrierIntegrity || 0), 0);
const archives = Array.from(window.DynastyManager?.houses.values() || []).reduce((acc, h) => acc + (h.archives?.length || 0), 0);
const playerBonus = (window.DynastyManager?.playerFootprint?.civilizational || 0);
force.value = Math.floor(barriers / 10) + archives + playerBonus;
force.strength = Math.min(1000, 200 + (barriers / 2) + (archives * 10) + (playerBonus * 5));
},
recalculateCrow: function() {
const force = this.forces['Crow'];
const legends = window.GameState?.legends?.length || 0;
const totalHistoricalWeight = (window.ChronicleManager?.worldLedger || []).reduce((acc, e) => acc + (e.historicalWeight || 0), 0);
const gini = window.CrowObservatory ? window.CrowObservatory.metrics.giniCoefficient : 0;
const concentrationPenalty = Math.max(0.2, 1.0 - gini);
force.value = legends;
force.strength = Math.min(1000, (100 + (legends * 50) + (totalHistoricalWeight / 10)) * concentrationPenalty);
},
recalculateTruth: function() {
const force = this.forces['Truth'];
if (!force || !window.IntelTracker) return;
const fidelity = window.IntelTracker.stats?.globalFidelity || 0;
force.value = Math.floor(fidelity * 100);
force.strength = Math.floor(fidelity * 1000);
},
recalculateCrown: function() {
const force = this.forces['Crown'];
if (!window.VillageManager?.villages) return;
const controlled = window.VillageManager.villages.filter(v => v.territory?.faction === 'kingdom').length;
const total = window.VillageManager.villages.length || 1;
force.value = controlled;
force.strength = Math.floor((controlled / total) * 1000);
},
recalculateForest: function() {
const force = this.forces['Forest'];
if (!window.VillageManager?.villages) return;
const occupied = window.VillageManager.villages.filter(v => v.territory?.faction === 'forest').length;
const aedBonus = window.AED ? (window.AED.metrics.forestPressureIndex * 200) : 0;
force.value = occupied;
force.strength = 300 + (occupied * 100) + aedBonus;
},
recalculateHouses: function() {
const force = this.forces['Houses'];
if (!force || !window.VillageManager?.villages) return;
const prosperity = window.VillageManager.villages.reduce((acc, v) => acc + (v.stats?.prosperity || 0), 0);
force.value = Math.floor(prosperity / 10);
force.strength = Math.min(1000, 200 + (prosperity / 2));
},
recalculateWendigo: function() {
const force = this.forces['Wendigo'];
const events = window.ChronicleManager?.worldLedger || [];
const deaths = events.filter(e => e.type === 'DEFEAT' || e.type === 'die').length;
const aedBonus = window.AED ? (window.AED.metrics.predatorInnovationScore * 150 + window.AED.metrics.harvestEfficiencyScore * 100) : 0;
force.value = deaths;
force.strength = Math.min(1200, 100 + (deaths * 20) + aedBonus);
},
recalculateShackle: function() {
const force = this.forces['The Shackle'];
if (!force) return;
const mutationCount = (window.ChronicleManager?.worldLedger || []).filter(e => e.type === 'SPONTANEOUS_MUTATION').length;
force.value = mutationCount;
force.strength = Math.min(1000, 150 + (mutationCount * 10));
}
};
window.ForceManager.init();
window.ForceManager.update(0);
window.EventBus.on('HUNTSMAN_INTERVENTION', () => {
    window.ForceManager.handleInterventionEvent();
});



