window.EventBus.on('ENGINE_READY', () => {
    try {
        // 1. Guarantee EngineParams and required properties are defined
        window.EngineParams = window.EngineParams || {};
        const defaults = {
            playMode: true,
            timeScale: 1.0,
            timeOfDay: 12,
            globalBrightness: 1.0,
            fogDensity: 0.02,
            worldSeed: 'dark_forest_seed',
            bloom: 0.35,
            vignette: 0.5,
            filterColor: 0xffffff,
            filterIntensity: 0.2,
            godMode: false,
            worldDay: 1
        };

        for (const [key, val] of Object.entries(defaults)) {
            if (window.EngineParams[key] === undefined) {
                window.EngineParams[key] = val;
            }
        }

        const gui = new window.lil.GUI({ title: 'God Mode Tools' });

        // Helper function to safely attach controllers without throwing on undefined properties
        const safeAdd = (folder, target, prop, ...args) => {
            if (target && prop in target && target[prop] !== undefined) {
                return folder.add(target, prop, ...args);
            }
            console.warn(`[DevTools] Skipped binding for missing property: "${prop}"`);
            return { name: () => ({ onChange: () => {} }), onChange: () => {} };
        };

        gui.add({
            toggleEditor: () => window.EventBus.emit('TOGGLE_EDITOR')
        }, 'toggleEditor').name('2️⃣ Open Animation/World Editor');

        const envFolder = gui.addFolder('🌍 World & Environment');
        safeAdd(envFolder, window.EngineParams, 'playMode').name('▶️ Play Mode');
        safeAdd(envFolder, window.EngineParams, 'timeScale', 0.1, 3).name('⏱️ Time Scale');
        safeAdd(envFolder, window.EngineParams, 'timeOfDay', 0, 24).name('☀️ Time of Day').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        safeAdd(envFolder, window.EngineParams, 'globalBrightness', 0, 5).name('💡 Brightness').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        safeAdd(envFolder, window.EngineParams, 'fogDensity', 0, 0.1).name('🌫️ Fog Density').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        safeAdd(envFolder, window.EngineParams, 'worldSeed').name('🌱 World Seed');
        envFolder.add({ r: () => window.EventBus.emit('WORLD_REGENERATE') }, 'r').name('🔄 Regenerate Math');

        envFolder.add({ tp1: () => window.EventBus.emit('CMD_TELEPORT', {x:0, z:0}) }, 'tp1').name('🚀 Warp: Center (0,0)');
        envFolder.add({ tp2: () => { if(window.VillageManager?.villages?.length > 0) window.EventBus.emit('CMD_TELEPORT', {x:window.VillageManager.villages[0].x, z:window.VillageManager.villages[0].z}); else window.EventBus.emit('UI_LOG', "Generate villages first!"); } }, 'tp2').name('🚀 Warp: Village 1');
        envFolder.add({ tp3: () => { if(window.VillageManager?.villages?.length > 19) window.EventBus.emit('CMD_TELEPORT', {x:window.VillageManager.villages[19].x, z:window.VillageManager.villages[19].z}); else window.EventBus.emit('UI_LOG', "Generate villages first!"); } }, 'tp3').name('🚀 Warp: Node 20 (Terminus)');
        envFolder.add({ tp4: () => window.EventBus.emit('CMD_TELEPORT', {x:286000, z:0}) }, 'tp4').name('🚀 Warp: Sierra Wall');
        envFolder.add({ tp5: () => window.EventBus.emit('CMD_TELEPORT', {x:288000, z:0}) }, 'tp5').name('🚀 Warp: Deep Desert');

        const fxFolder = gui.addFolder('✨ Cinematic FX');
        safeAdd(fxFolder, window.EngineParams, 'bloom', 0, 3).name('Bloom').onChange(v => { if(window.GameCore?.passes?.bloom) window.GameCore.passes.bloom.strength = v; });
        safeAdd(fxFolder, window.EngineParams, 'vignette', 0, 3).name('Vignette').onChange(v => { if(window.GameCore?.passes?.vignette) window.GameCore.passes.vignette.uniforms.darkness.value = v; });
        
        if (window.EngineParams.filterColor !== undefined) {
            fxFolder.addColor(window.EngineParams, 'filterColor').name('🎨 Filter Tint').onChange(c => { if(window.GameCore?.passes?.colorTint) window.GameCore.passes.colorTint.uniforms.tintColor.value.set(c); });
        }
        safeAdd(fxFolder, window.EngineParams, 'filterIntensity', 0, 1).name('🎚️ Filter Intensity').onChange(v => { if(window.GameCore?.passes?.colorTint) window.GameCore.passes.colorTint.uniforms.tintIntensity.value = v; });

        const animationFolder = gui.addFolder('🎞️ Animation Presets');
        animationFolder.add({ player: () => window.AnimationPresetManager?.applyToPrefab('Player', 'swordShield') }, 'player').name('⚔️ Player Sword and Shield');
        animationFolder.add({ humanoids: () => window.AnimationPresetManager?.applyToPrefabs(['Adventurer', 'Female Adventurer', 'Guard', 'Female Guard', 'Village Scout', 'City Scout'], 'swordShield') }, 'humanoids').name('🧍 Sword and Shield Set');
        animationFolder.add({ agile: () => window.AnimationPresetManager?.applyToPrefabs(['Adventurer', 'Female Adventurer', 'Village Scout', 'City Scout'], 'agileMelee') }, 'agile').name('🏃 Agile Melee Set');
        animationFolder.add({ monsters: () => window.AnimationPresetManager?.applyToPrefabs(['Ghoul', 'Flesh Horror', 'Wendigo', 'Dark Forest Boss', 'Swamp Siren', 'Slender Woman'], 'creatureCombat') }, 'monsters').name('👹 Creature Combat Set');

        const debugFolder = gui.addFolder('🐛 Debug Sandbox');
        safeAdd(debugFolder, window.EngineParams, 'godMode').name('🛡️ Invincibility');
        debugFolder.add({ x: () => { window.GameCore?.addXP?.('athletics', 50); window.GameCore?.addXP?.('meleeAtt', 50); window.GameCore?.addXP?.('meleeDef', 50); } }, 'x').name('⭐ Grant XP');
        debugFolder.add({ s: () => window.EventBus.emit('SPAWN_INVASION') }, 's').name('💀 Spawn Ghoul Invasion');
        debugFolder.add({ b: () => window.EventBus.emit('SPAWN_BLIGHT') }, 'b').name('🥀 Spawn Road Blight');
        debugFolder.add({ c: () => window.EventBus.emit('CLEAR_MAP') }, 'c').name('💣 Clear Entities');

        const arenaFolder = gui.addFolder('⚔️ Gladiator Arena Test');
        arenaFolder.add({ enter: () => window.EventBus.emit('ENTER_ARENA_TEST') }, 'enter').name('🏟️ Enter Locked Arena');
        arenaFolder.add({ profile: () => window.EventBus.emit('OPEN_GLADIATOR_PROFILE') }, 'profile').name('📜 Open Gladiator Profile');
        arenaFolder.add({ start: () => window.EventBus.emit('START_ARENA_MATCH') }, 'start').name('🎟️ Start 3-Wave Match');
        arenaFolder.add({ wave: () => window.EventBus.emit('SPAWN_ARENA_WAVE') }, 'wave').name('👹 Spawn Monster Wave');
        arenaFolder.add({ clear: () => window.EventBus.emit('CLEAR_ARENA_TEST') }, 'clear').name('🧹 Clear Arena Monsters');
        arenaFolder.add({ exit: () => window.EventBus.emit('EXIT_ARENA_TEST') }, 'exit').name('🚪 Exit Arena Test');

        const narratorFolder = gui.addFolder('🐦 Crow Interest Tests');
        narratorFolder.add({ gain: () => window.GameState?.recordFeat?.({ impact: 10, label: 'Developer-forced feat' }) }, 'gain').name('⬆️ Gain Interest');
        narratorFolder.add({ lose: () => window.GameState?.loseCrowInterest?.(10, 'Developer-forced loss.') }, 'lose').name('⬇️ Lose Interest');
        narratorFolder.add({ resolve: () => { if(window.GameState?.narrator) { window.GameState.narrator.targetHeat = 0; window.GameState.evaluateCrowInterest(); } } }, 'resolve').name('🔀 Force Target Handoff');
        narratorFolder.add({ player: () => {
            if (window.GameState?.narrator) {
                window.GameState.narrator.targetId = 'player';
                window.GameState.narrator.targetName = 'The Wanderer';
                window.GameState.narrator.targetHeat = 50;
                window.GameState.narrator.attention = 50;
                window.GameState.narrator.playerClaimed = true;
                if (window.GameCore?.playerObj) window.GameCore.applyForestBlessing(window.GameCore.playerObj, true);
            }
        } }, 'player').name('🎭 Mark Player Chosen');
        narratorFolder.add({ day: () => {
            window.EngineParams.worldDay++;
            window.AdventurerManager?.advanceDay?.();
            window.GameState?.processCrowDay?.();
            window.EventBus.emit('UI_LOG', '[DEV] Simulated one world day.');
        } }, 'day').name('📅 Simulate Day');
        narratorFolder.add({ ledger: () => {
            const records = window.AdventurerManager?.records || [];
            console.table(records.map(record => ({ id: record.id, name: record.name, alive: record.alive, level: record.level, storyHeat: record.storyHeat, quest: record.quest?.type, progress: `${record.quest?.progress || 0}/${record.quest?.goal || 0}` })));
            console.table({ ...window.GameState?.narrator });
            window.EventBus.emit('UI_LOG', '[DEV] Adventurer ledger and crow state written to the console.');
        } }, 'ledger').name('📊 Dump Hidden Ledger');

    } catch(e) {
        console.warn("LIL-GUI failed initialization safely:", e);
    }
});
