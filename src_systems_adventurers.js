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
            feats: [], lastUpdateDay: window.EngineParams.worldDay, activeEntityId: null,
            // Action Ledger Requirement
            currentTask: 'Idle', taskTarget: 'None', taskReason: 'Waiting for story.', taskTimestamp: Date.now()
        }));
        window.EventBus.emit('UI_LOG', `[ADVENTURERS] ${this.records.length} potential protagonists entered the woods.`);
    },
    recordEvent: function(record, type, detail, significance = 1, historicalWeight = 0.1) {
        const event = { actorId: record.id, actor: record.name, type, detail, significance, historicalWeight };
        window.ChronicleManager.recordEvent(event);
        record.feats.push({ day: window.EngineParams.worldDay, label: detail });
    },
    partyPower: function(record) {
        return record.level * 2 + record.party.reduce((total, member) => total + member.level, 0) + (record.morale || 0) / 25;
    },
    chooseQuest: function(record) {
        const types = ['hunt', 'relic', 'escort', 'rescue'];
        record.quest = { type: types[Math.floor(Math.random() * types.length)], progress: 0, goal: 3 + Math.floor(Math.random() * 5) };
    },
    
    /**
     * Translates a successful expedition into a tradeable information asset.
     * Bible Doctrine: Knowledge is currency.
     */
    produceIntelRecord: function(record) {
        if (!window.IntelManager || !window.PersonhoodManager) return;

        const profile = window.PersonhoodManager.getProfile(record.id);
        const questType = record.quest.type;
        
        let significance = { historical: 0, survival: 0, economic: 0, political: 0 };
        let rarity = window.IntelEnums.RARITY.COMMON;
        let title = "";
        let description = "";

        switch(questType) {
            case 'relic':
                title = `Discovery: Ancient Fragment`;
                description = `${record.name} recovered a physical trace of the pre-fracture era.`;
                significance.historical = 40 + (record.level * 10);
                significance.political = 20;
                rarity = window.IntelEnums.RARITY.RARE;
                break;
            case 'hunt':
                title = `Sighting: Forest Horror`;
                description = `Detailed behavioral patterns of a predator recorded by ${record.name}.`;
                significance.survival = 50;
                rarity = window.IntelEnums.RARITY.UNCOMMON;
                break;
            case 'rescue':
                title = `Intel: Lost Survivor Account`;
                description = `Information extracted from a survivor found by ${record.name}.`;
                significance.political = 30;
                significance.historical = 10;
                rarity = window.IntelEnums.RARITY.UNCOMMON;
                break;
            default:
                title = `Report: Wild Exploration`;
                description = `Standard terrain and resource survey conducted by ${record.name}.`;
                significance.economic = 20;
                rarity = window.IntelEnums.RARITY.COMMON;
        }

        const intelId = window.IntelManager.register({
            type: window.IntelEnums.TYPES.FACT,
            rarity: rarity,
            payload: {
                title: title,
                description: description,
                target_coord: { x: record.position.x, z: record.position.z },
                tags: ['EXPEDITION_RESULT', questType.toUpperCase()]
            },
            significance: significance,
            certainty: Math.min(1.0, 0.5 + (profile.traits.credibility || 0.3)),
            source_credibility: profile.traits.credibility || 0.3
        });

        // Attribution & Ownership
        window.IntelManager.grantOwnership(intelId, record.id);
        
        // Provenance entry
        const intel = window.IntelManager.lookup(intelId);
        intel.provenance.push({
            node_id: record.id,
            timestamp: window.EngineParams?.worldDay || 0,
            origin_type: 'ADVENTURER',
            source_faction: 'adventurer'
        });

        window.EventBus.emit('UI_LOG', `[DISCOVERY] ${record.name} has returned with new information from their ${questType} quest.`);
        return intelId;
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
                // Action Ledger: Travel
                record.currentTask = 'Traveling';
                record.taskTarget = destination?.name || 'Destination';
                record.taskReason = `Pursuing ${record.quest.type} quest.`;
                record.taskTimestamp = Date.now();

                // Heroes move at ~5m/s physically. 
                // Abstract speed = 50m/s (10x)
                const moveAmount = 50 * 60; // 60 seconds of abstract time per tick
                const t = Math.min(1.0, moveAmount / distance);
                record.position.x += directionX * t;
                record.position.z += directionZ * t;
            } else {
                record.currentTask = 'Questing';
                record.taskTarget = destination?.name || 'Local Area';
                record.taskReason = `Performing deeds for ${record.quest.type} quest.`;
                record.taskTimestamp = Date.now();
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
                
                // --- PHASE: INTEL PRODUCTION ---
                // Every time a quest stage is successfully completed, there is a chance to produce intel
                if (Math.random() < 0.4) {
                    this.produceIntelRecord(record);
                }

                if (record.quest.progress >= record.quest.goal) {
                    record.level++;
                    record.supplies += 4;
                    
                    // Final Quest Completion always produces high-value intel
                    this.produceIntelRecord(record);
                    
                    this.chooseQuest(record);
                }
            }
        });
        window.GameState.evaluateCrowInterest();
    },
    syncNearby: function() {
        if (!window.GameCore.playerObj || !window.GameCore.instantiatePrefab) return;
        
        // --- CROW'S EYE OVERRIDE ---
        // If the player is in Crow's Eye mode, use the map focus as the spawn center
        const focusX = window.CrowsEye?.isActive ? window.CrowsEye.pan.x : window.GameCore.playerObj.visual.position.x;
        const focusZ = window.CrowsEye?.isActive ? window.CrowsEye.pan.z : window.GameCore.playerObj.visual.position.z;
        
        const activePartyIds = new Set(window.GameCore.activeEntities.filter(entity => entity.adventurerPartyId).map(entity => entity.adventurerPartyId));
        this.records.forEach(record => {
            const existing = window.GameCore.activeEntities.find(entity => entity.adventurerRecordId === record.id);
            if (existing) { record.activeEntityId = existing.id; this.syncParty(record, existing); return; }
            
            if (Math.hypot(record.position.x - focusX, record.position.z - focusZ) > 100) return;
            if (activePartyIds.size >= 5) return; // Increased limit for Crow's Eye visibility

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
        window.ChronicleManager.recordEvent({
            actorId: record.id,
            type: 'death',
            detail: `${record.name} has perished in the woods.`,
            significance: 150,
            historicalWeight: 50
        });

        if (window.GameState.narrator.targetId === record.id) {
            window.GameState.loseCrowInterest(100, `${record.name}'s story ends here.`);
            window.GameState.evaluateCrowInterest();
        }
    }
};
window.AdventurerManager.generate();



