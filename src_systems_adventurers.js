import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

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
        const deltaSeconds = 43200 / 24; // 1 in-game hour in real seconds
        
        this.records.forEach(record => {
            if (record.activeEntityId) return;
            record.morale ??= 70;
            record.supplies ??= 8;
            record.party ??= [];
            record.quest ??= { type: 'hunt', progress: 0, goal: 4 };
            
            // --- PHASE 2: ABSTRACT HERO TRAVEL ---
            // If they are unloaded, they move 10x faster mathematically
            const recordIndex = Math.max(0, Number(record.id.split('-').pop()) - 1);
            const destination = window.VillageManager.villages[recordIndex % Math.max(1, window.VillageManager.villages.length)];
            
            const targetX = destination?.x || 0; 
            const targetZ = destination?.z || 0;
            const directionX = targetX - record.position.x; 
            const directionZ = targetZ - record.position.z;
            const distance = Math.hypot(directionX, directionZ);

            if (distance > 6) {
                // Heroes move at ~5m/s physically. 
                // Abstract speed = 50m/s (10x)
                const moveAmount = 50 * 60; // 60 seconds of abstract time per tick
                const t = Math.min(1.0, moveAmount / distance);
                record.position.x += directionX * t;
                record.position.z += directionZ * t;
            }
            
            record.destination = { x: targetX, z: targetZ };
            
            // Story Heat rewards for traveling large distances
            if (distance > 5000) record.storyHeat = Math.min(100, (record.storyHeat || 0) + 0.5);

            // Simulation of questing while unloaded
            const threat = 3 + Math.floor(distance / 1000) + (record.quest.type === 'rescue' ? 2 : 0);
            const suppliesBonus = Math.min(3, record.supplies / 3);
            const success = Math.random() * 10 + this.partyPower(record) + suppliesBonus >= threat + 4;
            
            if (success) {
                record.xp += 20 + record.level * 5;
                record.morale = Math.min(100, record.morale + 1);
                record.quest.progress = Math.min(record.quest.goal, record.quest.progress + 1);
                if (record.quest.progress >= record.quest.goal) {
                    record.level++;
                    record.supplies += 4;
                    this.chooseQuest(record);
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



