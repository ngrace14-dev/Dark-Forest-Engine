window.EventBus.on('ENGINE_READY', () => {
    try {
        const gui = new window.lil.GUI({ title: 'God Mode Tools' });
        const envFolder = gui.addFolder('🌍 World & Environment');
        envFolder.add(window.EngineParams, 'playMode').name('▶️ Play Mode');
        envFolder.add(window.EngineParams, 'timeScale', 0.1, 3).name('⏱️ Time Scale');
        envFolder.add(window.EngineParams, 'timeOfDay', 0, 24).name('☀️ Time of Day').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        envFolder.add(window.EngineParams, 'globalBrightness', 0, 5).name('💡 Brightness').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        envFolder.add(window.EngineParams, 'fogDensity', 0, 0.1).name('🌫️ Fog Density').onChange(() => window.EventBus.emit('ENV_UPDATE'));
        envFolder.add(window.EngineParams, 'worldSeed').name('🌱 World Seed');
        envFolder.add({ r: () => window.EventBus.emit('WORLD_REGENERATE') }, 'r').name('🔄 Regenerate Math');
        
        envFolder.add({ tp1: () => window.EventBus.emit('CMD_TELEPORT', {x:0, z:0}) }, 'tp1').name('🚀 Warp: Center (0,0)');
        envFolder.add({ tp2: () => { if(window.VillageManager.villages.length > 0) window.EventBus.emit('CMD_TELEPORT', {x:window.VillageManager.villages[0].x, z:window.VillageManager.villages[0].z}); else window.EventBus.emit('UI_LOG', "Generate villages first!"); } }, 'tp2').name('🚀 Warp: Village 1');
        envFolder.add({ tp3: () => { if(window.VillageManager.villages.length > 19) window.EventBus.emit('CMD_TELEPORT', {x:window.VillageManager.villages[19].x, z:window.VillageManager.villages[19].z}); else window.EventBus.emit('UI_LOG', "Generate villages first!"); } }, 'tp3').name('🚀 Warp: Node 20 (Terminus)');
        envFolder.add({ tp4: () => window.EventBus.emit('CMD_TELEPORT', {x:286000, z:0}) }, 'tp4').name('🚀 Warp: Sierra Wall');
        envFolder.add({ tp5: () => window.EventBus.emit('CMD_TELEPORT', {x:288000, z:0}) }, 'tp5').name('🚀 Warp: Deep Desert');
        
        const fxFolder = gui.addFolder('✨ Cinematic FX');
        fxFolder.add(window.EngineParams, 'bloom', 0, 3).name('Bloom').onChange(v => { if(window.GameCore.passes.bloom) window.GameCore.passes.bloom.strength = v; });
        fxFolder.add(window.EngineParams, 'vignette', 0, 3).name('Vignette').onChange(v => { if(window.GameCore.passes.vignette) window.GameCore.passes.vignette.uniforms.darkness.value = v; });
        fxFolder.addColor(window.EngineParams, 'filterColor').name('🎨 Filter Tint').onChange(c => { if(window.GameCore.passes.colorTint) window.GameCore.passes.colorTint.uniforms.tintColor.value.set(c); });
        fxFolder.add(window.EngineParams, 'filterIntensity', 0, 1).name('🎚️ Filter Intensity').onChange(v => { if(window.GameCore.passes.colorTint) window.GameCore.passes.colorTint.uniforms.tintIntensity.value = v; });

        const debugFolder = gui.addFolder('🐛 Debug Sandbox');
        debugFolder.add(window.EngineParams, 'godMode').name('🛡️ Invincibility');
        debugFolder.add({ x: () => { window.GameCore.addXP('athletics', 50); window.GameCore.addXP('meleeAtt', 50); window.GameCore.addXP('meleeDef', 50); } }, 'x').name('⭐ Grant XP');
        debugFolder.add({ s: () => window.EventBus.emit('SPAWN_INVASION') }, 's').name('💀 Spawn Ghoul Invasion');
        debugFolder.add({ b: () => window.EventBus.emit('SPAWN_BLIGHT') }, 'b').name('🥀 Spawn Road Blight');
        debugFolder.add({ c: () => window.EventBus.emit('CLEAR_MAP') }, 'c').name('💣 Clear Entities');
    } catch(e) { console.warn("LIL-GUI failed.", e); }
});
