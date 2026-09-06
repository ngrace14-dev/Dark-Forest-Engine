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
        strength: { level: 1, xp: 0, next: 100 }, toughness: { level: 1, xp: 0, next: 100 },
        athletics: { level: 1, xp: 0, next: 100 }, dodge: { level: 1, xp: 0, next: 100 },
        meleeAtt: { level: 1, xp: 0, next: 100 }, meleeDef: { level: 1, xp: 0, next: 100 }
    },
    inventory: { 
        food: 100, gold: 0, 
        equipment: { head: null, chest: 'leather_armor', waist: null, hands: null, legs: 'pants', weapon: 'iron_sword' },
        runes: { head: null, chest: null, waist: null, hands: null, legs: null, weapon: null },
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
    party: { command: 'follow', selectedMembers: ['lyra-scout'], escortCaravanId: null, members: [
        { id: 'lyra-scout', name: 'Lyra', prefab: 'Female Adventurer', role: 'scout', hp: 100, maxHp: 100, recruited: true, inventory: ['mushrooms', 'food'], equipment: {}, skills: { scouting: 1, athletics: 1 }, personality: 'cautious', knowledge: [], loyalty: 65, hunger: 0, injuries: [], downed: false },
        { id: 'maris-guard', name: 'Maris', prefab: 'Female Guard', role: 'guardian', hp: 130, maxHp: 130, recruited: false, inventory: ['food'], equipment: { weapon: 'iron_sword' }, skills: { guarding: 2, meleeDef: 1 }, personality: 'steadfast', knowledge: [], loyalty: 50, hunger: 0, injuries: [], downed: false },
        { id: 'corvin-runic', name: 'Corvin', prefab: 'Tech Adventurer', role: 'runic adept', hp: 85, maxHp: 85, recruited: false, inventory: ['mushrooms'], equipment: {}, skills: { runecraft: 2, meleeAtt: 1 }, personality: 'curious', knowledge: [], loyalty: 45, hunger: 0, injuries: [], downed: false }
    ] },
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
    keys: { w: false, a: false, s: false, d: false, ' ': false, shift: false },
    isMoving: false, isDashing: false, isBlocking: false, isAttacking: false,
    attackCooldown: 0, guardbreakerCooldown: 0, rationCooldown: 0, runeShotCooldown: 0, fireShotCooldown: 0, dashTimer: 0, camAngle: Math.PI / 4, camPitch: Math.PI / 4, camDistance: 15,
    isDraggingCam: false, lastMouseX: 0, lastMouseY: 0
};

window.EngineParams = {
    playMode: true, brushActive: false, selectedPrefab: 'Village Hub', isPlayerHidden: false,
    bloom: 0.35, vignette: 1.1, filterColor: '#2b4461', filterIntensity: 0.65,
    timeOfDay: 14.0, worldDay: 0, dayLengthSeconds: 120, offPathCaptureCooldown: 0,
    mapTileSizeMeters: 8046.72, visitedMapTiles: [], currentMapTile: null, sandReaverEncountered: false,
    fogDensity: 0.03, timeScale: 1.0, godMode: false,
    globalBrightness: 1.5, worldSeed: 'dark_forests_1337', isPlayerSafe: false,
    cycleLengthDays: 14, lastCycleDay: 0,
    arenaMode: false, arenaWave: 0, suppressWorldRegenerate: false
};

window.GameCore = {
    playerObj: null, activeEntities: [], groundLoot: [], engineState: 'menu', worldTimer: 0,
    scene: null, world: null, camera: null, passes: {}, playEntityAnimation: null, swapPlayerModel: null,
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
        record.history ??= [];
        record.score = Math.max(0, Math.min(1000, record.score + renown));
        record.infamy = Math.max(0, Math.min(1000, record.infamy + infamy));
        record.title = this.getRenownTitle();
        record.history.push({ day: window.EngineParams.worldDay, renown, infamy, faction, reason });
        if (record.history.length > 100) record.history.shift();
        const standingChange = Math.floor((renown - infamy) / 5);
        if (standingChange !== 0) this.adjustFactionStanding(faction, standingChange, reason);
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
        localStorage.setItem('dark-forest-save', JSON.stringify({ gameState: window.GameState, engineParams: window.EngineParams, villages: window.VillageManager ? window.VillageManager.villages : [], adventurers: window.AdventurerManager ? window.AdventurerManager.records : [] }));
        window.EventBus.emit('UI_LOG', 'Game saved locally.');
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
        const save = JSON.parse(rawSave);
        if (save.gameState) Object.assign(window.GameState, save.gameState);
        if (save.engineParams) Object.assign(window.EngineParams, save.engineParams);
        if (Array.isArray(save.villages) && window.VillageManager) {
            window.VillageManager.villages = save.villages;
            window.RoadManager.generateRoads(window.VillageManager.villages);
        }
        if (Array.isArray(save.adventurers) && window.AdventurerManager) window.AdventurerManager.records = save.adventurers;
        window.EventBus.emit('UI_UPDATE_HUD');
        window.EventBus.emit('UI_UPDATE_STATS');
        window.EventBus.emit('RENDER_INVENTORY');
        window.EventBus.emit('WORLD_REGENERATE');
        window.EventBus.emit('UI_LOG', 'Game loaded from local storage.');
    } catch (error) {
        console.error('GAME_LOAD failed', error);
        window.EventBus.emit('UI_LOG', 'Unable to load the game save.');
    }
});
console.log("%c🟢 Core Hub: State & EventBus Restored", "color: #4ade80; font-weight: bold; font-size: 11px;");
