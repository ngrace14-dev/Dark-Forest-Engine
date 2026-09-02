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
        equipment: { head: null, chest: 'leather_armor', legs: 'pants', weapon: 'iron_sword' },
        backpack: ['rusty_sword', 'food', 'food', 'food']
    },
    derivedStats: { armor: 0, weaponDamage: 0 },
    reputation: { village: 0, adventurer: 0, monster: -100 },
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
    playMode: true, brushActive: false, selectedPrefab: 'Village Hub',
    bloom: 0.8, vignette: 1.1, filterColor: '#2b4461', filterIntensity: 0.65,
    timeOfDay: 14.0, fogDensity: 0.03, timeScale: 1.0, godMode: false,
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
    }
};
console.log("%c🟢 Core Hub: State & EventBus Restored", "color: #4ade80; font-weight: bold; font-size: 11px;");
