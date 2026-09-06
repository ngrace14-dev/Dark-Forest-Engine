import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

window.WorldGenConfig = {
    noiseScale: 0.003,
    darkForestSideMeters: 575843.2,
    mountainRingWidthMeters: 160934.4,
    biomes: {
        'redwoods': { name: 'NorCal Redwoods', color: 0x1a2f21, prefab: 'Oak Tree', density: 12 },
        'alpine': { name: 'Shasta Alpine', color: 0x363a40, prefab: 'Razor Rock Monolith', density: 6 },
        'valley': { name: 'Central Valley', color: 0x453f2c, prefab: 'Bramble Bush', density: 10 },
        'coastal': { name: 'Lost Coast', color: 0x22303d, prefab: 'Moss-Covered Log', density: 8 },
        'sierra': { name: 'Sierra Nevada Wall', color: 0x4a4a4a, prefab: 'Razor Rock Monolith', density: 4 },
        'desert': { name: 'Deep Desert', color: 0xc2b280, prefab: 'Stone Path', density: 5 }
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

window.VillageManager = {
    villages: [], kingdomPopulation: 250000, capitalPopulationShare: 0.25, names: ["Oakhaven", "Gallows Hill", "Mire's Edge", "Blackwood", "Hollow Creek", "Ashen Hold", "Dire Rest", "Crow's Perch", "Widow's Peak", "Thornbury", "Gloomhaven", "Duskendale", "Grimsby", "Shadowfen", "Blighted Watch", "Bleakmire", "Wraith's End", "Cullfield", "Terminus"],
    settlementProfiles: [
        { house: 'The Royal Family', title: 'Royal House', tier: 'major', industry: 'Royal Mint', produces: 'gold', imports: ['food', 'wood', 'stone'] },
        { house: 'House Oakheart', title: 'Baronial House', tier: 'minor', industry: 'Timberwrights', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Gallows', title: 'Baronial House', tier: 'minor', industry: 'Ropeworks', produces: 'wood', imports: ['food', 'gold'] },
        { house: 'House Mire', title: 'Baronial House', tier: 'minor', industry: 'Herbalists', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Blackwood', title: 'Ducal House', tier: 'major', industry: 'Ironworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Hollow', title: 'Baronial House', tier: 'minor', industry: 'Tanners', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Ashen', title: 'Ducal House', tier: 'major', industry: 'Stoneworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Dire', title: 'Baronial House', tier: 'minor', industry: 'Milling', produces: 'food', imports: ['wood', 'stone'] },
        { house: 'House Crow', title: 'Baronial House', tier: 'minor', industry: 'Courier Guild', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Widow', title: 'Ducal House', tier: 'major', industry: 'Redwood Monopoly', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Thorn', title: 'Baronial House', tier: 'minor', industry: 'Apiaries', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Gloom', title: 'Baronial House', tier: 'minor', industry: 'Glassworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Dusken', title: 'Baronial House', tier: 'minor', industry: 'Textiles', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Grim', title: 'Baronial House', tier: 'minor', industry: 'Foundry', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Shadowfen', title: 'Ducal House', tier: 'major', industry: 'Alchemy Monopoly', produces: 'gold', imports: ['food', 'wood', 'stone'] },
        { house: 'House Blightwatch', title: 'Baronial House', tier: 'minor', industry: 'Rangers', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Bleak', title: 'Baronial House', tier: 'minor', industry: 'Quarries', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Wraith', title: 'Baronial House', tier: 'minor', industry: 'Fisheries', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Cull', title: 'Baronial House', tier: 'minor', industry: 'Leatherworks', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Terminus', title: 'High Marshal House', tier: 'major', industry: 'Mountain Arsenal', produces: 'stone', imports: ['food', 'wood', 'gold'], mountainGatekeeper: true, martial: true, endgameGateway: true }
    ],
    provisionProfiles: [
        { itemId: 'royal_spiced_wine', name: 'Royal Spiced Wine', heal: 30, buff: 'toughness', amount: 1, duration: 90 },
        { itemId: 'oakhaven_cider', name: 'Oakhaven Cider', heal: 32, buff: 'athletics', amount: 1, duration: 90 },
        { itemId: 'gallows_stew', name: 'Gallows Hunter Stew', heal: 34, buff: 'strength', amount: 1, duration: 100 },
        { itemId: 'mire_tea', name: 'Mire Herbal Tea', heal: 36, buff: 'meleeDef', amount: 1, duration: 100 },
        { itemId: 'blackwood_ale', name: 'Blackwood Iron Ale', heal: 38, buff: 'toughness', amount: 2, duration: 110 },
        { itemId: 'hollow_broth', name: 'Hollow Creek Broth', heal: 40, buff: 'dodge', amount: 2, duration: 110 },
        { itemId: 'ashen_roast', name: 'Ashen Hold Stone Roast', heal: 42, buff: 'strength', amount: 2, duration: 120 },
        { itemId: 'dire_malt', name: 'Dire Rest Malt', heal: 44, buff: 'athletics', amount: 2, duration: 120 },
        { itemId: 'crow_coffee', name: 'Crow Perch Black Coffee', heal: 46, buff: 'dodge', amount: 2, duration: 130 },
        { itemId: 'widow_mead', name: 'Widow Peak Redwood Mead', heal: 48, buff: 'meleeAtt', amount: 2, duration: 130 },
        { itemId: 'thorn_honey', name: 'Thornbury Honey Cakes', heal: 50, buff: 'toughness', amount: 3, duration: 140 },
        { itemId: 'gloom_tonic', name: 'Gloomhaven Glass Tonic', heal: 52, buff: 'meleeDef', amount: 3, duration: 140 },
        { itemId: 'dusken_wine', name: 'Duskendale Velvet Wine', heal: 54, buff: 'dodge', amount: 3, duration: 150 },
        { itemId: 'grimsby_stout', name: 'Grimsby Foundry Stout', heal: 56, buff: 'strength', amount: 3, duration: 150 },
        { itemId: 'shadowfen_elixir', name: 'Shadowfen Alchemical Elixir', heal: 60, buff: 'meleeAtt', amount: 4, duration: 160 },
        { itemId: 'blightwatch_ration', name: 'Blightwatch Ranger Ration', heal: 64, buff: 'athletics', amount: 4, duration: 160 },
        { itemId: 'bleakmire_mushroom_wine', name: 'Bleakmire Mushroom Wine', heal: 68, buff: 'meleeDef', amount: 4, duration: 170 },
        { itemId: 'wraith_fish_stew', name: 'Wraith End Fish Stew', heal: 72, buff: 'toughness', amount: 5, duration: 170 },
        { itemId: 'cullfield_hunter_brew', name: 'Cullfield Hunter Brew', heal: 76, buff: 'dodge', amount: 5, duration: 180 },
        { itemId: 'terminus_war_brew', name: 'Terminus War Brew', heal: 90, buff: 'strength', amount: 7, duration: 240 }
    ],
    generateWeb: function() {
        this.villages = []; let currentRadius = 0; let currentAngle = Math.random() * Math.PI * 2;
        const capitalPopulation = Math.floor(this.kingdomPopulation * this.capitalPopulationShare);
        const settlementPopulation = Math.floor((this.kingdomPopulation - capitalPopulation) / 19);
        let remainingPopulation = this.kingdomPopulation - capitalPopulation;
        for (let i = 0; i < 20; i++) {
            let x = 0, z = 0;
            if (i > 0) {
                const distanceStep = 10000 + (Math.random() * 10000); currentRadius += distanceStep; currentAngle += (Math.random() - 0.5) * (Math.PI / 1.5); 
                x = Math.cos(currentAngle) * currentRadius; z = Math.sin(currentAngle) * currentRadius;
            }
            let connections = []; if (i > 0) connections.push(i - 1); if (i < 19) connections.push(i + 1); 
            const population = i === 0 ? capitalPopulation : (i === 19 ? remainingPopulation : settlementPopulation);
            if (i > 0) remainingPopulation -= population;
            const profile = this.settlementProfiles[i];
            const provision = this.provisionProfiles[i];
            this.villages.push({ id: i, name: i === 0 ? 'The Capital' : this.names[i - 1], x: Math.round(x), z: Math.round(z), connections: connections, capital: i === 0, nobleHouse: profile.house, nobleTitle: profile.title, industry: profile, provision, provisionStock: { [provision.itemId]: Math.max(10, Math.floor(population / 100)) }, territory: { faction: 'kingdom', radius: i === 0 ? 140 : 90, barrierRadius: i === 0 ? 140 : 90, control: 100, underRaid: false }, barrierIntegrity: 100, expeditions: [], stats: { ap: 50 + Math.floor(Math.random() * 50), food: population * 20, wood: population * 8, stone: population * 5, gold: population * 4, essence: 0, prosperity: 55 }, population: { current: population, capacity: Math.ceil(population * 1.2) }, expansionLevel: 0, squads: [], caravans: [], assignedModel: null, layout: [], residents: [] });
        }
        window.RoadManager.generateRoads(this.villages);
        window.EventBus.emit('UI_LOG', "🌲 20 Settlements generated. Road Network integrated.");
        if(window.EngineState.currentAssetTab === 'villages' || window.EngineState.currentAssetTab === 'world') window.EventBus.emit('RENDER_ASSETS');
    },
    shiftLocations: function() {
        let currentAngle = Math.random() * Math.PI * 2;
        let currentRadius = 0;
        this.villages.forEach((v, index) => {
            if (!v.residents) v.residents = [];
            if (!v.population) v.population = { current: 8, capacity: 12 };
            if (!v.squads) v.squads = [];
            if (!v.caravans) v.caravans = [];
            if (!v.expeditions) v.expeditions = [];
            if (!v.territory) v.territory = { faction: 'kingdom', radius: v.capital ? 140 : 90, control: 100, underRaid: false };
            if (!v.capital) {
                currentRadius += 10000 + Math.random() * 10000;
                currentAngle += (Math.random() - 0.5) * (Math.PI / 1.5);
                v.x = Math.round(Math.cos(currentAngle) * currentRadius);
                v.z = Math.round(Math.sin(currentAngle) * currentRadius);
            } else {
                v.x = 0;
                v.z = 0;
            }
        });
        window.RoadManager.generateRoads(this.villages);
    }
};

window.AdventurerManager = {
    records: [],
    names: ['Aveline', 'Bram', 'Cerys', 'Dorian', 'Elian', 'Fara', 'Garrick', 'Hester', 'Ivo', 'Juniper', 'Kestrel', 'Lio'],
    generate: function() {
        if (this.records.length > 0) return;
        this.records = this.names.map((name, index) => ({
            id: `adventurer-${index + 1}`,
            faction: 'adventurer', name, prefab: index % 3 === 0 ? 'Female Adventurer' : 'Adventurer',
            level: 1 + Math.floor(Math.random() * 3), xp: 0, storyHeat: 8 + Math.floor(Math.random() * 12),
            alive: true, position: { x: (Math.random() - 0.5) * 120, z: (Math.random() - 0.5) * 120 },
            hp: 100, maxHp: 100, morale: 70, supplies: 8, quest: { type: 'hunt', progress: 0, goal: 3 + Math.floor(Math.random() * 5) },
            party: [{ id: `${name.toLowerCase()}-guardian`, prefab: 'Female Guard', name: `${name}'s companion`, role: 'guardian', level: 1, hp: 90, maxHp: 90 }, { id: `${name.toLowerCase()}-scout`, prefab: 'Adventurer', name: `${name}'s scout`, role: 'scout', level: 1, hp: 80, maxHp: 80 }],
            feats: [], lastUpdateDay: window.EngineParams.worldDay, activeEntityId: null
        }));
        window.EventBus.emit('UI_LOG', `[ADVENTURERS] ${this.records.length} potential protagonists entered the woods.`);
    },
    recordEvent: function(record, type, detail) {
        const event = { day: window.EngineParams.worldDay, actorId: record.id, actor: record.name, type, detail };
        window.GameState.worldEvents ??= [];
        window.GameState.worldEvents.push(event);
        if (window.GameState.worldEvents.length > 250) window.GameState.worldEvents.shift();
        record.feats.push({ day: event.day, label: detail });
    },
    partyPower: function(record) {
        return record.level * 2 + record.party.reduce((total, member) => total + member.level, 0) + (record.morale || 0) / 25;
    },
    chooseQuest: function(record) {
        const types = ['hunt', 'relic', 'escort', 'rescue'];
        record.quest = { type: types[Math.floor(Math.random() * types.length)], progress: 0, goal: 3 + Math.floor(Math.random() * 5) };
    },
    advanceDay: function() {
        this.generate();
        this.records.forEach(record => {
            if (record.activeEntityId) return;
            record.morale ??= 70;
            record.supplies ??= 8;
            record.party ??= [];
            record.quest ??= { type: 'hunt', progress: 0, goal: 4 };
            record.lastUpdateDay = window.EngineParams.worldDay;
            const recordIndex = Math.max(0, Number(record.id.split('-').pop()) - 1);
            const destination = window.VillageManager.villages[recordIndex % Math.max(1, window.VillageManager.villages.length)];
            const targetX = destination?.x || 0; const targetZ = destination?.z || 0;
            const directionX = targetX - record.position.x; const directionZ = targetZ - record.position.z;
            const distance = Math.hypot(directionX, directionZ);
            if (distance > 6) {
                record.position.x += directionX / distance * 12;
                record.position.z += directionZ / distance * 12;
            }
            record.destination = { x: targetX, z: targetZ };
            const threat = 3 + Math.floor(distance / 120) + (record.quest.type === 'rescue' ? 2 : 0);
            const suppliesBonus = Math.min(3, record.supplies / 3);
            const success = Math.random() * 10 + this.partyPower(record) + suppliesBonus >= threat + 4;
            record.supplies = Math.max(0, record.supplies - 1);
            if (success) {
                record.xp += 20 + record.level * 5;
                record.morale = Math.min(100, record.morale + 4);
                record.storyHeat = Math.min(100, record.storyHeat + 2);
                record.quest.progress = Math.min(record.quest.goal, record.quest.progress + 1);
                this.recordEvent(record, 'quest_progress', `${record.quest.type} progress ${record.quest.progress}/${record.quest.goal}`);
                if (record.quest.progress >= record.quest.goal) {
                    record.level++;
                    record.supplies += 4;
                    record.morale = Math.min(100, record.morale + 10);
                    this.recordEvent(record, 'quest_complete', `completed a ${record.quest.type} quest`);
                    this.chooseQuest(record);
                }
            } else {
                record.hp = Math.max(1, record.hp - (10 + Math.floor(Math.random() * 12)));
                record.morale = Math.max(0, record.morale - 12);
                record.storyHeat = Math.max(0, record.storyHeat - 2);
                this.recordEvent(record, 'party_injury', `failed a ${record.quest.type} attempt and suffered injuries`);
                if (record.supplies === 0) this.recordEvent(record, 'supplies_depleted', 'ran out of supplies');
                if (record.morale === 0) {
                    this.recordEvent(record, 'quest_abandoned', 'abandoned the quest after morale collapsed');
                    this.chooseQuest(record);
                    record.morale = 45;
                }
            }
        });
        window.GameState.evaluateCrowInterest();
    },
    syncNearby: function() {
        if (!window.GameCore.playerObj || !window.GameCore.instantiatePrefab) return;
        const playerPosition = window.GameCore.playerObj.visual.position;
        const activePartyIds = new Set(window.GameCore.activeEntities.filter(entity => entity.adventurerPartyId).map(entity => entity.adventurerPartyId));
        this.records.forEach(record => {
            const existing = window.GameCore.activeEntities.find(entity => entity.adventurerRecordId === record.id);
            if (existing) { record.activeEntityId = existing.id; this.syncParty(record, existing); return; }
            if (Math.hypot(record.position.x - playerPosition.x, record.position.z - playerPosition.z) > 70) return;
            if (activePartyIds.size >= 3) return;
            const entity = window.GameCore.instantiatePrefab(record.prefab, record.position.x, window.WorldGenerator.getTerrainHeight(record.position.x, record.position.z), record.position.z, 'persistent');
            if (entity) {
                entity.adventurerRecordId = record.id;
                entity.adventurerPartyId = record.id;
                entity.name = record.name;
                entity.hp = record.hp;
                entity.forestBlessing = record.forestBlessing || null;
                record.activeEntityId = entity.id;
                activePartyIds.add(record.id);
                if (window.GameState.narrator.targetId === record.id) window.GameCore.applyForestBlessing(entity);
                this.syncParty(record, entity);
                window.EventBus.emit('UI_LOG', `[ADVENTURERS] ${record.name} has entered the local story.`);
            }
        });
    },
    syncParty: function(record, leader) {
        record.party ??= [];
        record.partyEntities ??= [];
        record.party.forEach((member, index) => {
            member.id ??= `${record.id}-member-${index + 1}`;
            const existing = window.GameCore.activeEntities.find(entity => entity.adventurerMemberId === member.id);
            if (existing) { record.partyEntities[index] = existing.id; return; }
            const offset = index % 2 === 0 ? 2 : -2;
            const x = leader.visual.position.x + offset;
            const z = leader.visual.position.z + 2;
            const entity = window.GameCore.instantiatePrefab(member.prefab || 'Adventurer', x, window.WorldGenerator.getTerrainHeight(x, z), z, 'persistent');
            if (!entity) return;
            entity.name = member.name;
            entity.adventurerPartyId = record.id;
            entity.adventurerMemberId = member.id;
            entity.hp = member.hp ?? member.maxHp ?? 80;
            record.partyEntities[index] = entity.id;
        });
    },
    syncDeparted: function() {
        this.records.forEach(record => {
            const entity = window.GameCore.activeEntities.find(candidate => candidate.adventurerRecordId === record.id);
            if (!entity) { record.activeEntityId = null; return; }
            record.position = { x: entity.visual.position.x, z: entity.visual.position.z };
            record.hp = entity.hp;
            record.party.forEach(member => {
                const memberEntity = window.GameCore.activeEntities.find(candidate => candidate.adventurerMemberId === member.id);
                if (memberEntity) member.hp = memberEntity.hp;
            });
        });
    },
    markDefeated: function(entity) {
        const record = this.records.find(candidate => candidate.id === entity?.adventurerRecordId);
        if (!record) return;
        record.alive = false;
        record.activeEntityId = null;
        record.storyHeat = 0;
        if (window.GameState.narrator.targetId === record.id) {
            window.GameState.loseCrowInterest(100, `${record.name}'s story ends here.`);
            window.GameState.evaluateCrowInterest();
        }
    }
};
window.AdventurerManager.generate();

window.createNoise2D = createNoise2D;
window.currentPrng = alea(window.EngineParams.worldSeed);
window.currentNoise2D = createNoise2D(window.currentPrng);

window.WorldGenerator = class {
    static getNoise(x, z) { return window.currentNoise2D(x * window.WorldGenConfig.noiseScale, z * window.WorldGenConfig.noiseScale); }
    static getBiome(x, z) {
        const halfForestSide = window.WorldGenConfig.darkForestSideMeters / 2;
        const furthestAxisDistance = Math.max(Math.abs(x), Math.abs(z));
        if (furthestAxisDistance > halfForestSide + window.WorldGenConfig.mountainRingWidthMeters) return 'desert';
        if (furthestAxisDistance > halfForestSide) return 'sierra';
        const val = this.getNoise(x, z);
        if (val > 0.45) return 'alpine'; if (val < -0.3) return 'coastal'; if (val > -0.3 && val < 0.1) return 'valley'; return 'redwoods';
    }
    static getTerrainHeight(x, z) {
        let height = window.currentNoise2D(x * 0.005, z * 0.005) * 8; const biomeKey = this.getBiome(x, z);
        if(biomeKey === 'alpine' || biomeKey === 'sierra') height += Math.max(0, window.currentNoise2D(x * 0.01, z * 0.01) * 20);
        return height;
    }
};
