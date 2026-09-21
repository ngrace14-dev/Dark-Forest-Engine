import * as THREE from 'three';

window.EventBus = {
    events: {},
    on: function(event, callback) { if(!this.events[event]) this.events[event] = []; this.events[event].push(callback); },
    emit: function(event, data) { if(this.events[event]) this.events[event].forEach(cb => cb(data)); }
};

const runPotentialTiers = [
    { name: 'Common', chance: 55, bonus: 1, color: '#9ca3af' },
    { name: 'Uncommon', chance: 23, bonus: 2, color: '#4ade80' },
    { name: 'Rare', chance: 12, bonus: 3, color: '#60a5fa' },
    { name: 'Epic', chance: 6, bonus: 5, color: '#c084fc' },
    { name: 'Legendary', chance: 2.5, bonus: 8, color: '#fbbf24' },
    { name: 'S', chance: 1, bonus: 12, color: '#fb7185' },
    { name: 'SS', chance: 0.35, bonus: 18, color: '#f97316' },
    { name: 'SSS', chance: 0.12, bonus: 28, color: '#ef4444' },
    { name: 'God Tier', chance: 0.03, bonus: 45, color: '#f5f3ff' }
];

function rollRunPotential() {
    const roll = Math.random() * 100;
    let threshold = 0;
    const tier = runPotentialTiers.find(candidate => (threshold += candidate.chance) >= roll) || runPotentialTiers[0];
    const skills = ['strength', 'toughness', 'athletics', 'dodge', 'meleeAtt', 'meleeDef'];
    return { ...tier, skill: skills[Math.floor(Math.random() * skills.length)] };
}

window.GameState = {
    pStats: {
        hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, poise: 60, maxPoise: 60, guardBrokenUntil: 0,
        hunger: 100, maxHunger: 100, // 100 = Full, 0 = Starving
        strength: { level: 1, xp: 0, next: 100 }, toughness: { level: 1, xp: 0, next: 100 },
        athletics: { level: 1, xp: 0, next: 100 }, dodge: { level: 1, xp: 0, next: 100 },
        meleeAtt: { level: 1, xp: 0, next: 100 }, meleeDef: { level: 1, xp: 0, next: 100 }
    },
    inventory: { 
        food: 100, gold: 0, 
        equipment: { 
            head: null, chest: 'leather_armor', waist: null, hands: null, legs: 'pants', weapon: 'iron_sword',
            leftArm_prosthetic: null, rightArm_prosthetic: null, leftLeg_prosthetic: null, rightLeg_prosthetic: null
        },
        runes: { 
            head: null, chest: null, waist: null, hands: null, legs: null, weapon: null,
            leftArm_prosthetic: null, rightArm_prosthetic: null, leftLeg_prosthetic: null, rightLeg_prosthetic: null
        },
        backpack: ['rusty_sword', 'food', 'food', 'food', 'ember_rune']
    },
    derivedStats: { armor: 0, weaponDamage: 0 },
    reputation: { village: 0, adventurer: 0, monster: -100 },
    factionRelations: {
        kingdom: { kingdom: 100, adventurer: 30, forest: -100, monster: -100 },
        adventurer: { kingdom: 30, adventurer: 100, forest: -75, monster: -75 },
        forest: { kingdom: -100, adventurer: -75, forest: 100, monster: 20 },
        monster: { kingdom: -100, adventurer: -75, forest: 20, monster: 100 },
        player: { kingdom: 0, adventurer: 0, forest: -100, monster: -100 }
    },
    bounties: { kingdom: 0, adventurer: 0 },
    activeBuffs: {},
    statusEffects: [],
    runPotential: null,
    combatRecord: { wins: 0, losses: 0, fame: 0, injuries: [] },
    renown: { score: 0, infamy: 0, title: 'Unknown', history: [] },
    coop: { sessionId: null, localPlayerId: null, partyMode: 'solo' },
    base: { owned: false, name: 'Wayfarer Camp', position: null, storage: [], structures: [], farms: [], research: [] },
    party: { 
        command: 'follow', selectedMembers: ['lyra-scout'], escortCaravanId: null, formation: 'line', 
        resonanceLevel: 0,
        tacticalLearning: { aggression: 0.5, flanking: 0.5, skillPreference: {}, averageEngagementDist: 10 },
        members: [
            { 
                id: 'lyra-scout', name: 'Lyra', prefab: 'Female Adventurer', role: 'scout', group: 'archers', hp: 100, maxHp: 100, recruited: true, 
                tier: 'commander', commandAuthority: 15, dispatchTarget: null, learningWeights: { aggression: 0.5, flanking: 0.5 },
                inventory: ['mushrooms', 'food'], equipment: { weapon: 'short_bow' }, 
                skills: { scouting: 3, athletics: 2, ranged: 4 }, 
                personality: 'cautious', 
                knowledge: { locations: ['Wayfarer Camp', 'Riverwood'], enemies: ['Wolf'], materials: ['mushrooms'] },
                loyalty: 65, hunger: 0, injuries: [], downed: false,
                voicePitch: 1.1, specialization: 'Gatherer'
            },
            { 
                id: 'maris-guard', name: 'Maris', prefab: 'Female Guard', role: 'guardian', group: 'infantry', hp: 130, maxHp: 130, recruited: false, 
                tier: 'elite', commandAuthority: 5, dispatchTarget: null, learningWeights: { aggression: 0.5, flanking: 0.5 },
                inventory: ['food'], equipment: { weapon: 'iron_sword', shield: 'wooden_shield' }, 
                skills: { guarding: 3, meleeDef: 2 }, 
                personality: 'steadfast', 
                knowledge: { locations: ['Stronghold'], enemies: ['Bandit', 'Wendigo'], materials: [] },
                loyalty: 50, hunger: 0, injuries: [], downed: false,
                voicePitch: 0.9, specialization: 'Challenger'
            },
            { 
                id: 'corvin-runic', name: 'Corvin', prefab: 'Tech Adventurer', role: 'runic adept', group: 'infantry', hp: 85, maxHp: 85, recruited: false, 
                tier: 'pawn', commandAuthority: 0, dispatchTarget: null, learningWeights: { aggression: 0.5, flanking: 0.5 },
                inventory: ['mushrooms'], equipment: {}, 
                skills: { runecraft: 3, meleeAtt: 1 }, 
                personality: 'curious', 
                knowledge: { locations: [], enemies: ['Void Wraith'], materials: ['ember_rune'] },
                loyalty: 45, hunger: 0, injuries: [], downed: false,
                voicePitch: 1.0, specialization: 'Medic'
            }
        ] 
    },
    questBoard: [],
    worldEvents: [],
    gladiator: {
        name: 'The Unblooded',
        fame: 0,
        gold: 0,
        wins: 0,
        losses: 0,
        injuries: [],
        matchState: 'hub',
        objective: 'Awaiting a match'
    },
    narrator: {
        avatar: 'crow',
        targetId: null,
        targetName: 'An unnamed survivor',
        attention: 0,
        targetHeat: 0,
        lastActionDay: 0,
        safeDays: 0,
        playerClaimed: false,
        feats: 0,
        secretProgress: 0
    },
    forestBlessing: {
        active: false,
        tier: 'none',
        name: 'No forest blessing',
        athletics: 0,
        dodge: 0,
        staminaRegen: 0,
        dangerSense: false,
        combatLuck: 0,
        teleportLuck: 0
    }
};

window.EngineState = {
    factions: [
        { id: 1, name: "The Ashen", color: "#ff4444" },
        { id: 2, name: "Wildwood Cult", color: "#44ff44" },
        { id: 3, name: "Royal Guard", color: "#4444ff" }
    ],
    biomeTextures: { redwoods: null, alpine: null, valley: null, coastal: null, sierra: null, desert: null },
    currentAssetTab: 'characters',
    editingVillageId: null
};

window.Input = {
    keys: { w: false, a: false, s: false, d: false, ' ': false, shift: false, x: false },
    isMoving: false, isDashing: false, isBlocking: false, isAttacking: false, isStealth: false,
    attackCooldown: 0, guardbreakerCooldown: 0, rationCooldown: 0, runeShotCooldown: 0, fireShotCooldown: 0, dashTimer: 0, 
    activeSweep: null, // Tracks if an attack hitbox is currently sweeping
    hitPauseTimer: 0,  // Dragon's Dogma hit-stop micro-freeze
    camShake: 0,       // Intensity of camera shake
    camAngle: Math.PI / 4, camPitch: Math.PI / 4, camDistance: 15,
    isDraggingCam: false, lastMouseX: 0, lastMouseY: 0
};

window.EngineParams = {
    playMode: true, brushActive: false, selectedPrefab: 'Village Hub', isPlayerHidden: false,
    bloom: 0.35, vignette: 1.1, filterColor: '#2b4461', filterIntensity: 0.65,
    timeOfDay: 14.0, worldDay: 0,         dayLengthSeconds: 43200, // 24 in-game hours = 12 real-life hours (12 * 60 * 60)
    offPathCaptureCooldown: 0,
    mapTileSizeMeters: 8046.72, visitedMapTiles: [], currentMapTile: null, sandReaverEncountered: false,
    fogDensity: 0.005, // Much clearer fog to let the brightness through
    timeScale: 1.0, godMode: false,
    globalBrightness: 2.0, // Double the base global brightness
    cycleLengthDays: 14, lastCycleDay: 0,
    arenaMode: false, arenaWave: 0, suppressWorldRegenerate: false
};

window.GameCore = {
    playerObj: null, activeEntities: [], groundLoot: [], engineState: 'menu', worldTimer: 0,
    scene: null, world: null, camera: null, passes: {}, playEntityAnimation: null, swapPlayerModel: null,
    
    // --- PHASE 4: FLOATING ORIGIN ---
    worldOffset: new THREE.Vector3(0, 0, 0),
    getAbsolutePos: function(localPos) {
        return new THREE.Vector3(localPos.x + this.worldOffset.x, localPos.y + this.worldOffset.y, localPos.z + this.worldOffset.z);
    },
    getLocalPos: function(absPos) {
        return new THREE.Vector3(absPos.x - this.worldOffset.x, absPos.y - this.worldOffset.y, absPos.z - this.worldOffset.z);
    },
    checkFloatingOrigin: function() {
        if (!this.playerObj) return;
        const pPos = this.playerObj.visual.position;
        const threshold = 2000; // 2km threshold before snapping
        
        if (Math.abs(pPos.x) > threshold || Math.abs(pPos.z) > threshold) {
            const shift = new THREE.Vector3(pPos.x, 0, pPos.z);
            this.worldOffset.add(shift);
            
            // 1. Shift all Physics RigidBodies
            this.world.forEachRigidBody(body => {
                const trans = body.translation();
                body.setTranslation({ x: trans.x - shift.x, y: trans.y, z: trans.z - shift.z }, true);
            });
            
            // 2. Shift all Three.js Scene Objects (that aren't parented to player)
            this.scene.children.forEach(child => {
                if (child !== this.camera && !child.isLight) {
                    child.position.x -= shift.x;
                    child.position.z -= shift.z;
                }
            });

            // 2.1 Re-orient the global Sun/Light to follow the player's new local [0,0,0]
            if (window.EventBus) window.EventBus.emit('ENV_UPDATE');

            // 3. Update the Chunk Manager's origin-tracking
            if (typeof ChunkManager !== 'undefined') {
                ChunkManager.currentChunkX = null; // Force a reload/re-alignment of chunks
                ChunkManager.update(this.playerObj.visual.position);
            }
            
            window.EventBus.emit('UI_LOG', "[SYSTEM] Floating origin shifted. Precision restored.");
        }
    },

    
    // DATA-ORIENTED DESIGN (DOD) OPTIMIZATION
    // Flat memory buffer for all entity combat stats (HP, MaxHP, Poise, MaxPoise)
    // Allows 10,000 entities. Layout: [Index * 4 + 0] = HP, [1] = MaxHP, [2] = Poise, [3] = MaxPoise
    MAX_ENTITIES: 10000,
    entityStatBuffer: new Float32Array(40000), 
    entityIndexPool: Array.from({length: 10000}, (_, i) => i).reverse(), // Stack of available indices
    
    // --- SPATIAL PARTITIONING GRID (Kenshi 1:1 Scale Optimization) ---
    // Divides the world into 20m x 20m cells. Entities only check their own and 8 neighbors.
    SpatialGrid: {
        cellSize: 20,
        cells: new Map(), // Key: "x,z" -> Value: Set of Entity IDs

        getGridKey: function(x, z) {
            return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
        },

        registerEntity: function(entity) {
            const pos = entity.visual.position;
            const key = this.getGridKey(pos.x, pos.z);
            if (!this.cells.has(key)) this.cells.set(key, new Set());
            this.cells.get(key).add(entity);
            entity.currentGridKey = key;
        },

        unregisterEntity: function(entity) {
            if (entity.currentGridKey && this.cells.has(entity.currentGridKey)) {
                this.cells.get(entity.currentGridKey).delete(entity);
            }
        },

        updateEntity: function(entity) {
            const pos = entity.visual.position;
            const newKey = this.getGridKey(pos.x, pos.z);
            if (newKey !== entity.currentGridKey) {
                this.unregisterEntity(entity);
                if (!this.cells.has(newKey)) this.cells.set(newKey, new Set());
                this.cells.get(newKey).add(entity);
                entity.currentGridKey = newKey;
            }
        },

        // Returns all entities within the entity's cell and its 8 neighbors
        getNearbyEntities: function(x, z, radius = 20) {
            const nearby = [];
            const centerX = Math.floor(x / this.cellSize);
            const centerZ = Math.floor(z / this.cellSize);
            const range = Math.ceil(radius / this.cellSize);

            for (let ox = -range; ox <= range; ox++) {
                for (let oz = -range; oz <= range; oz++) {
                    const key = `${centerX + ox},${centerZ + oz}`;
                    const cell = this.cells.get(key);
                    if (cell) {
                        for (const en of cell) nearby.push(en);
                    }
                }
            }
            return nearby;
        }
    },

    // MEMORY MANAGEMENT HELPERS
    // Binds an entity object's HP/Poise to the high-performance Float32 buffer
    bindEntityToBuffer: function(entity, hp, poise) {
        const index = this.entityIndexPool.pop();
        if (index === undefined) { console.error("CRITICAL: ENTITY MEMORY LIMIT REACHED!"); return null; }
        
        const base = index * 4;
        this.entityStatBuffer[base + 0] = hp;
        this.entityStatBuffer[base + 1] = hp; // MaxHP
        this.entityStatBuffer[base + 2] = poise;
        this.entityStatBuffer[base + 3] = poise; // MaxPoise
        
        // Use property definitions to proxy existing code to the flat buffer
        Object.defineProperties(entity, {
            'hp': {
                get: () => this.entityStatBuffer[base + 0],
                set: (val) => { this.entityStatBuffer[base + 0] = val; },
                configurable: true
            },
            'maxHp': {
                get: () => this.entityStatBuffer[base + 1],
                set: (val) => { this.entityStatBuffer[base + 1] = val; },
                configurable: true
            },
            'poise': {
                get: () => this.entityStatBuffer[base + 2],
                set: (val) => { this.entityStatBuffer[base + 2] = val; },
                configurable: true
            },
            'maxPoise': {
                get: () => this.entityStatBuffer[base + 3],
                set: (val) => { this.entityStatBuffer[base + 3] = val; },
                configurable: true
            },
            'memoryIndex': { value: index, writable: false, configurable: true }
        });
        
        return index;
    },

    releaseEntityIndex: function(index) {
        if (index !== null && index !== undefined) this.entityIndexPool.push(index);
    },
    
    addXP: function(statName, amount) {
        let stat = window.GameState.pStats[statName]; if(!stat) return;
        stat.xp += amount;
        if(stat.xp >= stat.next) {
            stat.level++; stat.xp -= stat.next; stat.next = Math.floor(stat.next * 1.5); 
            window.EventBus.emit('PLAYER_LEVEL_UP', { statName, level: stat.level });
            if(statName === 'toughness') { window.GameState.pStats.maxHp += 10; window.GameState.pStats.hp = window.GameState.pStats.maxHp; window.EventBus.emit('UI_UPDATE_HUD'); }
        }
        window.EventBus.emit('UI_UPDATE_STATS');
    },
    applyBuff: function(statName, amount, duration, name) {
        window.GameState.activeBuffs[statName] = { amount, expiresAt: performance.now() + duration * 1000, name };
        window.EventBus.emit('UI_UPDATE_STATS');
    },
    getBuffBonus: function(statName) {
        const buff = window.GameState.activeBuffs[statName];
        if (!buff) return 0;
        if (performance.now() >= buff.expiresAt) {
            delete window.GameState.activeBuffs[statName];
            return 0;
        }
        return buff.amount;
    },
    getForestLuck: function(entity = null) {
        if (entity?.forestBlessing?.active) return entity.forestBlessing.combatLuck || 0;
        if (!entity && window.GameState.forestBlessing?.active) return window.GameState.forestBlessing.combatLuck || 0;
        return 0;
    },
    getCombatInjuryMultiplier: function() {
        return Math.max(0.65, 1 - ((window.GameState.combatRecord?.injuries || []).length) * 0.05);
    },
    getRenownTitle: function() {
        const renown = window.GameState.renown || { score: 0, infamy: 0 };
        if (renown.infamy >= 75) return 'Dreaded';
        if (renown.infamy >= 35) return 'Infamous';
        if (renown.score >= 100) return 'Legend';
        if (renown.score >= 50) return 'Renowned';
        if (renown.score >= 20) return 'Known';
        return 'Unknown';
    },
    recordRenown: function({ renown = 0, infamy = 0, faction = 'kingdom', reason = 'word spread' } = {}) {
        const record = window.GameState.renown ??= { score: 0, infamy: 0, title: 'Unknown', history: [] };
        
        // --- ADVENTURER LIMITER ---
        // Player's basic global impact is capped to NPC-levels (limit growth rate)
        // until they hit high renown levels.
        let finalRenown = renown;
        if (record.score < 500) {
            finalRenown = Math.min(renown, 5); // Capped impact per event for "Average Joe"
        }

        record.history ??= [];
        record.score = Math.max(0, Math.min(1000, record.score + finalRenown));

        record.infamy = Math.max(0, Math.min(1000, record.infamy + infamy));
        record.title = this.getRenownTitle();
        record.history.push({ day: window.EngineParams.worldDay, renown, infamy, faction, reason });
        if (record.history.length > 100) record.history.shift();
        const standingChange = Math.floor((renown - infamy) / 5);
        if (standingChange !== 0) {
            this.adjustFactionStanding(faction, standingChange, reason);
            
            // --- PHASE 5: NOBLE RETAINER XP ---
            // Award XP for improving relations with any Noble House
            if (standingChange > 0 && (faction === 'kingdom' || faction === 'adventurer')) {
                window.CareerManager.addXP('noble_retainer', standingChange * 10);
            }
        }
        window.EventBus.emit('RENOWN_CHANGED', { renown, infamy, faction, reason });
    },
    getRenownDiscount: function(faction = 'kingdom') {
        const record = window.GameState.renown || { score: 0, infamy: 0 };
        const politicalFaction = faction === 'village' ? 'kingdom' : faction;
        const standing = window.GameState.factionRelations.player[politicalFaction] || 0;
        return Math.max(-0.25, Math.min(0.25, record.score * 0.002 + standing * 0.001 - record.infamy * 0.001));
    },
    getMerchantPrice: function(basePrice, faction = 'kingdom') {
        return Math.max(1, Math.ceil(basePrice * (1 - this.getRenownDiscount(faction))));
    },
    treatCombatInjuries: function() {
        const record = window.GameState.combatRecord ??= { wins: 0, losses: 0, fame: 0, injuries: [] };
        record.injuries ??= [];
        if (record.injuries.length === 0) {
            window.EventBus.emit('UI_LOG', 'No combat injuries require treatment.');
            return false;
        }
        const cost = record.injuries.length * 10;
        if (window.GameState.inventory.gold < cost) {
            window.EventBus.emit('UI_LOG', `Treatment requires ${cost} gold.`);
            return false;
        }
        window.GameState.inventory.gold -= cost;
        record.injuries = [];
        window.GameState.gladiator.injuries = [];
        window.EventBus.emit('UI_LOG', `Combat injuries treated for ${cost} gold.`);
        window.EventBus.emit('COMBAT_INJURIES_TREATED', { cost });
        window.EventBus.emit('UI_UPDATE_HUD');
        return true;
    },
    recordCombatVictory: function({ source = 'open-world', reward = 0, fame = 0, label = 'won a fight' } = {}) {
        const record = window.GameState.combatRecord ??= { wins: 0, losses: 0, fame: 0, injuries: [] };
        record.injuries ??= [];
        record.wins++;
        record.fame += fame;
        window.GameState.inventory.gold += reward;
        if (source === 'arena') {
            window.GameState.gladiator.wins = record.wins;
            window.GameState.gladiator.fame = record.fame;
            window.GameState.gladiator.gold += reward;
        }
        this.recordRenown({ renown: Math.max(2, fame), faction: source === 'arena' ? 'adventurer' : 'kingdom', reason: label });
        window.GameCore.recordFeat({ impact: Math.max(1, fame), label });
        window.EventBus.emit('COMBAT_VICTORY', { source, reward, fame });
    },
    recordCombatDefeat: function({ source = 'open-world', injury = 'combat injury' } = {}) {
        const record = window.GameState.combatRecord ??= { wins: 0, losses: 0, fame: 0, injuries: [] };
        record.injuries ??= [];
        record.losses++;
        record.injuries.push(injury);
        if (source === 'arena') {
            window.GameState.gladiator.losses = record.losses;
            window.GameState.gladiator.injuries = [...record.injuries];
        }
        this.recordRenown({ infamy: 3, faction: source === 'arena' ? 'adventurer' : 'kingdom', reason: injury });
        window.EventBus.emit('COMBAT_DEFEAT', { source, injury });
    },
    forestAttackMisses: function(entity = null) {
        const chance = this.getForestLuck(entity);
        return chance > 0 && Math.random() < chance;
    },
    applyStatusEffect: function(type, duration, tickDamage = 0) {
        const active = window.GameState.statusEffects.find(effect => effect.type === type);
        if (active) {
            active.remaining = Math.max(active.remaining, duration);
            return;
        }
        window.GameState.statusEffects.push({ type, remaining: duration, tickDamage, tickTimer: 1 });
        window.EventBus.emit('UI_LOG', `${type.toUpperCase()} applied.`);
    },
    getResistance: function(type) {
        return Object.values(window.GameState.inventory.runes || {}).reduce((total, runeId) => total + (window.ItemDatabase[runeId]?.stats.resistances?.[type] || 0), 0);
    },
    adjustFactionStanding: function(faction, amount, reason) {
        const politicalFaction = faction === 'village' ? 'kingdom' : faction;
        const current = window.GameState.factionRelations.player[politicalFaction] || 0;
        const next = Math.max(-100, Math.min(100, current + amount));
        window.GameState.factionRelations.player[politicalFaction] = next;
        const reputationKey = politicalFaction === 'kingdom' ? 'village' : (politicalFaction === 'forest' ? 'monster' : politicalFaction);
        if (window.GameState.reputation[reputationKey] !== undefined) window.GameState.reputation[reputationKey] = next;
        if (current > -50 && next <= -50 && window.GameState.bounties[politicalFaction] !== undefined) {
            window.GameState.bounties[politicalFaction] += 50;
            window.EventBus.emit('UI_LOG', `[BOUNTY] ${politicalFaction.toUpperCase()} placed a bounty on you.`);
        }
        if (reason) window.EventBus.emit('UI_LOG', `[STANDING] ${politicalFaction}: ${amount >= 0 ? '+' : ''}${amount} (${reason})`);
        window.EventBus.emit('UI_UPDATE_HUD');
    },
    recordFeat: function({ impact = 1, label = 'A noteworthy deed' } = {}) {
        const narrator = window.GameState.narrator;
        narrator.attention = Math.min(100, narrator.attention + impact);
        narrator.targetHeat = Math.min(100, narrator.targetHeat + impact);
        narrator.lastActionDay = window.EngineParams.worldDay;
        narrator.feats++;
        narrator.secretProgress = Math.min(99, narrator.secretProgress + Math.max(1, Math.floor(impact / 5)));
        if (!narrator.playerClaimed && narrator.attention >= 25) {
            narrator.playerClaimed = true;
            narrator.targetId = 'player';
            narrator.targetName = 'The Wanderer';
            if (window.GameCore.applyForestBlessing) window.GameCore.applyForestBlessing(window.GameCore.playerObj, true);
            window.EventBus.emit('UI_LOG', '[THE CROW] The eye leaves its chosen hero. It follows you now.');
        } else if (narrator.playerClaimed) {
            window.EventBus.emit('UI_LOG', `[THE CROW] ${label}.`);
        }
        
        // --- PHASE 5: NARRATIVE PACING ---
        // Clearing the Huntsman's Mark via Feats
        if (impact >= 5 && window.EncounterDirector && window.EncounterDirector.huntsmanMarkTimer > 0) {
            window.EncounterDirector.clearHuntsmanMark();
        }

        // --- PHASE 6: CHRONICLER XP ---
        // Chroniclers gain XP for performing noteworthy deeds that catch the Crow's eye
        if (narrator.playerClaimed) {
            window.CareerManager.addXP('chronicler', impact * 5);
        }

        window.EventBus.emit('UI_UPDATE_HUD');
    },
    loseCrowInterest: function(amount = 1, reason = 'The story grows quiet.') {
        const narrator = window.GameState.narrator;
        narrator.targetHeat = Math.max(0, narrator.targetHeat - amount);
        narrator.attention = Math.max(0, narrator.attention - amount);
        window.EventBus.emit('UI_LOG', `[THE CROW] ${reason}`);
        window.EventBus.emit('UI_UPDATE_HUD');
    },
    evaluateCrowInterest: function() {
        const narrator = window.GameState.narrator;
        if (!narrator.targetId) return;
        if (narrator.targetId === 'player' && window.GameState.forestBlessing?.active && narrator.targetHeat <= 0) {
            delete window.GameState.activeBuffs.athletics;
            delete window.GameState.activeBuffs.dodge;
            window.GameState.forestBlessing = { active: false, tier: 'none', name: 'No forest blessing', athletics: 0, dodge: 0, staminaRegen: 0, dangerSense: false, combatLuck: 0, teleportLuck: 0 };
            window.EventBus.emit('UI_LOG', '[THE CROW] Your story has gone still. The forest mark fades.');
        }
        if (narrator.targetHeat > 0) return;
        const candidate = (window.AdventurerManager?.records || [])
            .filter(record => record.alive !== false)
            .sort((a, b) => (b.storyHeat || 0) - (a.storyHeat || 0))[0];
        if (candidate) {
            narrator.targetId = candidate.id;
            narrator.targetName = candidate.name;
            narrator.targetHeat = Math.max(10, candidate.storyHeat || 10);
            narrator.playerClaimed = false;
            window.EventBus.emit('UI_LOG', `[THE CROW] It abandons the quiet tale and follows ${candidate.name}.`);
        }
    },
    processCrowDay: function() {
        const narrator = window.GameState.narrator;
        if (narrator.targetId === 'player') {
            const player = window.GameCore.playerObj;
            const sheltered = player && (window.EngineParams.isPlayerSafe || window.RoadManager?.isVillageProtected(player.visual.position));
            if (sheltered) narrator.safeDays++;
            else narrator.safeDays = 0;
            if (sheltered) this.loseCrowInterest(2, 'The crow finds only a sheltered silhouette.');
            if (window.EngineParams.worldDay - narrator.lastActionDay > 1) this.loseCrowInterest(3, 'The crow grows bored with your silence.');
        } else {
            const record = window.AdventurerManager?.records.find(candidate => candidate.id === narrator.targetId);
            if (record) narrator.targetHeat = record.storyHeat;
        }
        this.evaluateCrowInterest();
    }
};

window.GameCore.initializeFreshRunPotential = function() {
    const potential = rollRunPotential();
    window.GameState.runPotential = potential;
    window.GameState.pStats[potential.skill].level += potential.bonus;
    if (potential.skill === 'toughness') {
        window.GameState.pStats.maxHp += potential.bonus * 10;
        window.GameState.pStats.hp = window.GameState.pStats.maxHp;
    }
};
window.GameCore.initializeFreshRunPotential();

window.EventBus.on('GAME_SAVE', () => {
    try {
        window.GameCore.activeEntities.filter(entity => entity.companionId).forEach(entity => {
            const member = window.GameState.party.members.find(candidate => candidate.id === entity.companionId);
            if (member) member.hp = entity.hp;
        });

        // --- PHASE 1: ABSOLUTE COORDINATE SAVING ---
        // Save player and companion positions as absolute values
        if (window.GameCore.playerObj) {
            window.GameState.savedAbsPos = window.GameCore.getAbsolutePos(window.GameCore.playerObj.visual.position);
        }
        
        window.GameState.companionsAbsPos = {};
        window.GameCore.activeEntities.filter(en => en.companionId).forEach(en => {
            window.GameState.companionsAbsPos[en.companionId] = window.GameCore.getAbsolutePos(en.visual.position);
        });

        // --- COMPRESSION IMPLEMENTATION ---
        // Serialize and compress data to bypass QuotaExceededError in localStorage
        const saveData = { 
            gameState: window.GameState, 
            engineParams: window.EngineParams, 
            worldOffset: window.GameCore.worldOffset,
            villages: window.VillageManager ? window.VillageManager.villages : [], 
            adventurers: window.AdventurerManager ? window.AdventurerManager.records : [] 
        };
        
        const jsonString = JSON.stringify(saveData);
        // If LZString is loaded, compress. Otherwise, fall back to raw string.
        const finalSaveString = typeof LZString !== 'undefined' ? LZString.compressToUTF16(jsonString) : jsonString;

        localStorage.setItem('dark-forest-save', finalSaveString);
        
        window.EventBus.emit('UI_LOG', 'Game saved locally (Compressed & Origin-Aware).');
    } catch (error) {
        console.error('GAME_SAVE failed', error);
        window.EventBus.emit('UI_LOG', 'Unable to save the game.');
    }
});

window.EventBus.on('GAME_LOAD', () => {
    try {
        const rawSave = localStorage.getItem('dark-forest-save');
        if (!rawSave) {
            window.EventBus.emit('UI_LOG', 'No local save found.');
            return;
        }

        let save;
        try {
            // Attempt to decompress first (Assuming standard LZString format)
            const decompressed = typeof LZString !== 'undefined' ? LZString.decompressFromUTF16(rawSave) : null;
            save = JSON.parse(decompressed || rawSave);
        } catch (e) {
            // Fallback for older saves that were not compressed
            save = JSON.parse(rawSave);
        }
        
        // --- PHASE 1: ORIGIN-AWARE LOADING ---
        if (save.gameState) Object.assign(window.GameState, save.gameState);
        if (save.engineParams) Object.assign(window.EngineParams, save.engineParams);
        
        // Restore the World Offset first so future coordinate math is correct
        if (save.worldOffset) {
            window.GameCore.worldOffset.copy(save.worldOffset);
        }

        if (Array.isArray(save.villages) && window.VillageManager) {
            window.VillageManager.villages = save.villages;
            window.RoadManager.generateRoads(window.VillageManager.villages);
        }
        if (Array.isArray(save.adventurers) && window.AdventurerManager) window.AdventurerManager.records = save.adventurers;
        
        window.EventBus.emit('UI_UPDATE_HUD');
        window.EventBus.emit('UI_UPDATE_STATS');
        window.EventBus.emit('RENDER_INVENTORY');
        
        // IMPORTANT: We emit WORLD_REGENERATE, which triggers chunk generation.
        // The player and companions must be placed AFTER this to ensure they don't fall through ground.
        window.EventBus.emit('WORLD_REGENERATE');
        
        // Restore Player to Local space based on saved Absolute position
        if (window.GameState.savedAbsPos && window.GameCore.playerObj) {
            const localPos = window.GameCore.getLocalPos(window.GameState.savedAbsPos);
            window.GameCore.playerObj.body.setTranslation(localPos, true);
        }

        window.EventBus.emit('UI_LOG', 'Game loaded (Coordinates Synced).');
    } catch (error) {
        console.error('GAME_LOAD failed', error);
        window.EventBus.emit('UI_LOG', 'Unable to load the game save.');
    }
});
console.log("%c🟢 Core Hub: State & EventBus Restored", "color: #4ade80; font-weight: bold; font-size: 11px;");
