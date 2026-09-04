window.EventBus = {
    events: {},
    on: function(event, callback) { if(!this.events[event]) this.events[event] = []; this.events[event].push(callback); },
    emit: function(event, data) { if(this.events[event]) this.events[event].forEach(cb => cb(data)); }
};

window.GameState = {
    pStats: {
        hp: 100, maxHp: 100,
        strength: { level: 1, xp: 0, next: 100 }, toughness: { level: 1, xp: 0, next: 100 },
        athletics: { level: 1, xp: 0, next: 100 }, dodge: { level: 1, xp: 0, next: 100 },
        meleeAtt: { level: 1, xp: 0, next: 100 }, meleeDef: { level: 1, xp: 0, next: 100 }
    },
    inventory: { 
        food: 100, gold: 0, 
        equipment: { head: null, chest: 'leather_armor', waist: null, hands: null, legs: 'pants', weapon: 'iron_sword' },
        backpack: ['rusty_sword', 'food', 'food', 'food']
    },
    derivedStats: { armor: 0, weaponDamage: 0 },
    reputation: { village: 0, adventurer: 0, monster: -100 },
    activeBuffs: {},
    party: { command: 'follow', selectedMembers: ['lyra-scout'], members: [
        { id: 'lyra-scout', name: 'Lyra', prefab: 'Female Adventurer', role: 'scout', hp: 100, maxHp: 100, recruited: true, inventory: ['mushrooms', 'food'], equipment: {}, skills: { scouting: 1, athletics: 1 }, personality: 'cautious', knowledge: [], loyalty: 65, hunger: 0, injuries: [], downed: false },
        { id: 'maris-guard', name: 'Maris', prefab: 'Female Guard', role: 'guardian', hp: 130, maxHp: 130, recruited: false, inventory: ['food'], equipment: { weapon: 'iron_sword' }, skills: { guarding: 2, meleeDef: 1 }, personality: 'steadfast', knowledge: [], loyalty: 50, hunger: 0, injuries: [], downed: false },
        { id: 'corvin-runic', name: 'Corvin', prefab: 'Tech Adventurer', role: 'runic adept', hp: 85, maxHp: 85, recruited: false, inventory: ['mushrooms'], equipment: {}, skills: { runecraft: 2, meleeAtt: 1 }, personality: 'curious', knowledge: [], loyalty: 45, hunger: 0, injuries: [], downed: false }
    ] },
    questBoard: []
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
    attackCooldown: 0, dashTimer: 0, camAngle: Math.PI / 4, camPitch: Math.PI / 4, camDistance: 15,
    isDraggingCam: false, lastMouseX: 0, lastMouseY: 0
};

window.EngineParams = {
    playMode: true, brushActive: false, selectedPrefab: 'Village Hub', isPlayerHidden: false,
    bloom: 0.8, vignette: 1.1, filterColor: '#2b4461', filterIntensity: 0.65,
    timeOfDay: 14.0, worldDay: 0, dayLengthSeconds: 120, offPathCaptureCooldown: 0,
    mapTileSizeMeters: 8046.72, visitedMapTiles: [], currentMapTile: null, sandReaverEncountered: false,
    fogDensity: 0.03, timeScale: 1.0, godMode: false,
    globalBrightness: 1.2, worldSeed: 'dark_forests_1337', isPlayerSafe: false
};

window.GameCore = {
    playerObj: null, activeEntities: [], engineState: 'menu', worldTimer: 0,
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
    }
};

window.EventBus.on('GAME_SAVE', () => {
    try {
        window.GameCore.activeEntities.filter(entity => entity.companionId).forEach(entity => {
            const member = window.GameState.party.members.find(candidate => candidate.id === entity.companionId);
            if (member) member.hp = entity.hp;
        });
        localStorage.setItem('dark-forest-save', JSON.stringify({ gameState: window.GameState, engineParams: window.EngineParams, villages: window.VillageManager ? window.VillageManager.villages : [] }));
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
