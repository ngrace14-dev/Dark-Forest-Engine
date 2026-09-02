import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.AssetManager = {
    models: {}, animations: {}, textures: {}, globalAnimations: [],
    prefabs: {
        'Player': { type: 'character', category: 'characters', radius: 0.5, height: 2, modelScale: 1.0, color: 0xffffff, faction: 'player', customModel: null, animMap: { idle: 'None', walk: 'None', attack: 'None', block: 'None', dash: 'None', hit: 'None', die: 'None' }, vfx: { aura: 'None', onHit: 'Blood' } },
        'Ghoul': { type: 'npc', category: 'npcs', radius: 0.5, height: 1.8, modelScale: 1.0, color: 0x991b1b, faction: 'monster', behavior: 'wander_aggro', speed: 3, customModel: null, animMap: { idle: 'None', walk: 'None', attack: 'None', block: 'None', dash: 'None', hit: 'None', die: 'None' }, vfx: { aura: 'Void', onHit: 'Blood' } },
        'Guard': { type: 'npc', category: 'npcs', radius: 0.5, height: 2.1, modelScale: 1.0, color: 0x2563eb, faction: 'village', behavior: 'patrol', speed: 2.5, customModel: null, animMap: { idle: 'None', walk: 'None', attack: 'None', block: 'None', dash: 'None', hit: 'None', die: 'None' }, vfx: { aura: 'None', onHit: 'Blood' } },
        'Adventurer': { type: 'npc', category: 'npcs', radius: 0.5, height: 1.9, modelScale: 1.0, color: 0x10b981, faction: 'adventurer', behavior: 'questing', speed: 3.5, customModel: null, animMap: { idle: 'None', walk: 'None', attack: 'None', block: 'None', dash: 'None', hit: 'None', die: 'None' }, vfx: { aura: 'None', onHit: 'Blood' } },
        'Sierra Peak': { type: 'mountain', category: 'terrain', radius: 30, height: 50, modelScale: 1.0, color: 0x555566, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Dust' } },
        'Sand Dune': { type: 'mountain', category: 'terrain', radius: 40, height: 15, modelScale: 1.0, color: 0xc2b280, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Dust' } },
        'Redwood Tree': { type: 'structure', category: 'terrain', radius: 1.5, height: 25, modelScale: 1.0, color: 0x3d2817, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Dust' } },
        'Oak Tree': { type: 'structure', category: 'terrain', radius: 1.0, height: 8, modelScale: 1.0, color: 0x4a5e28, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Dust' } },
        'Coastal Driftwood': { type: 'structure', category: 'terrain', radius: 0.6, height: 1.2, modelScale: 1.0, color: 0x887766, isObstacle: false, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Dust' } },
        'Alpine Rock': { type: 'mountain', category: 'terrain', radius: 2.0, height: 4, modelScale: 1.0, color: 0x555566, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Sparks' } },
        'Village Hub': { type: 'hub', category: 'terrain', radius: 2, height: 4, modelScale: 1.0, color: 0x3b82f6, isObstacle: true, emitsLight: true, customModel: null, animMap: {}, vfx: { aura: 'Holy', onHit: 'Sparks' } },
        'Blight Root': { type: 'structure', category: 'terrain', radius: 1.5, height: 6, modelScale: 1.0, color: 0x8b5cf6, isObstacle: true, customModel: null, animMap: {}, vfx: { aura: 'Void', onHit: 'Blood' } },
        'Iron Sword': { type: 'weapon', category: 'weapons', radius: 0.2, height: 1, modelScale: 1.0, color: 0xcccccc, customModel: null, animMap: {}, vfx: { aura: 'None', onHit: 'Sparks' } }
    }
};

window.renameVillage = function(id) {
    const v = window.VillageManager.villages.find(vil => vil.id === id);
    if(v) { const newName = prompt(`Enter new name for ${v.name}:`, v.name); if(newName && newName.trim() !== '') { v.name = newName.trim(); window.EventBus.emit('UI_LOG', `Village renamed to ${v.name}`); window.EventBus.emit('RENDER_ASSETS'); } }
};
window.openLayoutEditor = function(id) { window.EngineState.editingVillageId = id; window.EventBus.emit('RENDER_ASSETS'); };
window.closeLayoutEditor = function() { window.EngineState.editingVillageId = null; window.EventBus.emit('RENDER_ASSETS'); };
window.addLayoutItem = function(id) {
    const v = window.VillageManager.villages.find(vil => vil.id === id);
    if(v) {
        const prefab = document.getElementById('layout-prefab-select').value; const ox = parseFloat(document.getElementById('layout-ox').value) || 0; const oz = parseFloat(document.getElementById('layout-oz').value) || 0;
        v.layout.push({ id: Math.random().toString(36).substring(7), prefab, ox, oz }); window.EventBus.emit('UI_LOG', `Added ${prefab} to blueprint.`); window.EventBus.emit('RENDER_ASSETS');
    }
};
window.removeLayoutItem = function(vid, itemId) { const v = window.VillageManager.villages.find(vil => vil.id === vid); if(v) { v.layout = v.layout.filter(l => l.id !== itemId); window.EventBus.emit('RENDER_ASSETS'); } };

window.renderAssetManager = function() {
    const content = document.getElementById('asset-content'); content.innerHTML = '';
    
    if (window.EngineState.currentAssetTab === 'mods') {
        content.innerHTML = `<div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2"><div class="text-pink-400 font-bold text-sm uppercase tracking-widest">🧩 Engine Extensions & Mods</div></div>
        <div class="bg-gray-800 p-4 rounded border border-gray-700 shadow-lg mb-4">
            <p class="text-xs text-gray-400 mb-4 font-mono">Upload custom JavaScript (.js) files to instantly inject new features, UI panels, logic, or procedural animations into the live engine.</p>
            <div class="flex gap-4">
                <button id="btn-upload-mod" class="bg-pink-700 hover:bg-pink-600 text-white px-4 py-2 rounded text-xs font-bold transition-colors shadow-lg">Inject Mod File (.js)</button>
                <input type="file" id="mod-file-input" class="hidden" accept=".js,.txt">
            </div>
        </div>`;
        
        setTimeout(() => {
            document.getElementById('btn-upload-mod').addEventListener('click', () => { document.getElementById('mod-file-input').click(); });
            document.getElementById('mod-file-input').addEventListener('change', (e) => {
                const file = e.target.files[0]; if(!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const script = document.createElement('script');
                        script.type = 'module';
                        script.textContent = ev.target.result;
                        document.body.appendChild(script);
                        window.EventBus.emit('UI_LOG', `🧩 Mod successfully injected: ${file.name}`);
                    } catch (err) {
                        window.EventBus.emit('UI_LOG', `❌ Mod failed to execute: ${err.message}`);
                    }
                };
                reader.readAsText(file);
            });
        }, 0);
        return;
    }

    if (window.EngineState.currentAssetTab === 'world') {
        const headerRow = document.createElement('div'); headerRow.className = "flex justify-between items-center mb-4 border-b border-gray-700 pb-2";
        headerRow.innerHTML = `<div><div class="text-green-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2">🌍 NorCal 1:1 Scale Terrain Generator</div><div class="text-gray-400 text-[10px] mt-1">Assign custom prefabs to regional biomes. Adjust scale for realistic sprawling landscapes.</div></div><button id="btn-regen-world-ui" class="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-xs font-bold transition-colors shadow-[0_0_15px_rgba(21,128,61,0.4)]">🔄 Regenerate World</button>`;
        content.appendChild(headerRow);
        
        const simRow = document.createElement('div'); simRow.className = "flex gap-4 mb-4 bg-gray-900/50 p-4 border border-indigo-900 rounded-lg shadow-inner";
        simRow.innerHTML = `<div class="flex-1"><h3 class="text-purple-400 text-[10px] font-bold mb-2 uppercase tracking-wider border-b border-gray-700 pb-1">🏘️ Phase 1: Settlement Web</h3><button id="test-village-gen" class="bg-gray-800 hover:bg-purple-700 text-white font-bold text-xs py-1.5 px-3 rounded border border-gray-600 w-full transition-colors">⚙️ Generate Nodes (Check Log)</button></div><div class="flex-1"><h3 class="text-green-300 text-[10px] font-bold mb-2 uppercase tracking-wider border-b border-gray-700 pb-1">🛤️ Phase 2: Safe Roads</h3><button id="test-road-gen" class="bg-gray-800 hover:bg-green-700 text-white font-bold text-xs py-1.5 px-3 rounded border border-gray-600 w-full transition-colors">⚙️ Test Meander Math (Check Log)</button></div>`;
        content.appendChild(simRow);

        setTimeout(() => {
            document.getElementById('test-village-gen').addEventListener('click', () => { window.VillageManager.generateWeb(); window.EventBus.emit('WORLD_REGENERATE'); });
            document.getElementById('test-road-gen').addEventListener('click', () => { window.EventBus.emit('UI_LOG', '🛤️ Pathfinding simulation...'); window.RoadManager.generateRoads([{id:1, x:0, z:0}, {id:2, x:1000, z:1000}]); });
            document.getElementById('btn-regen-world-ui').addEventListener('click', () => { window.EventBus.emit('WORLD_REGENERATE'); window.EventBus.emit('RENDER_ASSETS'); });
        }, 0);
        
        const globalSettings = document.createElement('div'); globalSettings.className = "flex gap-4 mb-4 bg-gray-900/50 p-3 border border-gray-800 rounded";
        globalSettings.innerHTML = `<div class="flex flex-col flex-1"><label class="text-[10px] text-gray-500 uppercase font-bold mb-1">Master World Seed</label><input type="text" id="world-seed-input" class="bg-gray-950 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 outline-none focus:border-green-500 font-mono" value="${window.EngineParams.worldSeed}"></div><div class="flex flex-col flex-1"><label class="text-[10px] text-gray-500 uppercase font-bold mb-1">Biome Scale (Lower = Larger Geography)</label><input type="range" id="biome-scale-slider" class="accent-green-500 mt-1" min="0.0001" max="0.02" step="0.0001" value="${window.WorldGenConfig.noiseScale}"><div class="text-[9px] text-gray-600 text-right mt-1" id="scale-val-disp">${window.WorldGenConfig.noiseScale}</div></div>`;
        content.appendChild(globalSettings);

        setTimeout(() => {
            document.getElementById('world-seed-input').addEventListener('change', (e) => { window.EngineParams.worldSeed = e.target.value; });
            document.getElementById('biome-scale-slider').addEventListener('input', (e) => { window.WorldGenConfig.noiseScale = parseFloat(e.target.value); document.getElementById('scale-val-disp').innerText = window.WorldGenConfig.noiseScale.toFixed(4); });
        }, 0);
        
        const availableTerrain = ['None', ...Object.keys(window.AssetManager.prefabs).filter(k => window.AssetManager.prefabs[k].category === 'terrain')];
        Object.entries(window.WorldGenConfig.biomes).forEach(([bKey, biome]) => {
            const row = document.createElement('div'); row.className = 'flex justify-between items-center bg-gray-800/80 p-3 rounded border border-gray-700 hover:border-gray-500 transition-colors mb-2';
            let optionsHTML = availableTerrain.map(t => `<option value="${t}" ${biome.prefab === t ? 'selected' : ''}>${t}</option>`).join('');
            row.innerHTML = `<div class="flex items-center gap-4"><div class="w-10 h-10 rounded border border-gray-600 shadow-inner" style="background-color: #${biome.color.toString(16).padStart(6, '0')}"></div><div><div class="font-bold text-gray-200 text-xs uppercase tracking-wide">${biome.name}</div><div class="text-[9px] text-gray-500 font-mono mt-0.5">Biome ID: ${bKey}</div></div></div><div class="flex items-center gap-6 pr-2"><div class="flex flex-col gap-1 w-48"><label class="text-[9px] text-gray-500 uppercase font-bold">Terrain Prefab Assignment</label><select class="biome-prefab-select bg-gray-950 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none focus:border-green-500" data-biome="${bKey}">${optionsHTML}</select></div><div class="flex flex-col gap-1 w-32"><label class="text-[9px] text-gray-500 uppercase font-bold spawn-label">Spawn Density (${biome.density})</label><input type="range" class="biome-density-slider accent-green-500" data-biome="${bKey}" min="0" max="150" step="1" value="${biome.density}"></div></div>`;
            content.appendChild(row);
        });

        setTimeout(() => {
            document.querySelectorAll('.biome-prefab-select').forEach(sel => { sel.addEventListener('change', (e) => { const bKey = e.target.getAttribute('data-biome'); window.WorldGenConfig.biomes[bKey].prefab = e.target.value; }); });
            document.querySelectorAll('.biome-density-slider').forEach(sel => { sel.addEventListener('input', (e) => { const bKey = e.target.getAttribute('data-biome'); window.WorldGenConfig.biomes[bKey].density = parseInt(e.target.value); e.target.previousElementSibling.innerText = `Spawn Density (${e.target.value})`; }); });
        }, 0);
        return; 
    }

    if (window.EngineState.currentAssetTab === 'biomes') {
        content.innerHTML = `<div class="text-blue-400 font-bold mb-4 text-sm uppercase tracking-widest border-b border-gray-700 pb-2">🏞️ Biome Material Editor</div><div class="grid grid-cols-3 gap-6">${Object.keys(window.WorldGenConfig.biomes).map(biome => `<div class="bg-gray-800 p-4 rounded border border-gray-700 flex flex-col items-center shadow-lg"><div class="text-white font-bold mb-2 capitalize text-xs">${window.WorldGenConfig.biomes[biome].name}</div><div class="w-full h-32 bg-gray-900 border-2 border-dashed border-gray-600 rounded flex items-center justify-center mb-4 relative overflow-hidden">${window.EngineState.biomeTextures[biome] ? `<img src="${window.EngineState.biomeTextures[biome]}" class="w-full h-full object-cover">` : `<span class="text-gray-500 text-[10px] text-center px-2">Procedural Voxel Noise Active</span>`}</div><div class="upload-btn-wrapper w-full relative overflow-hidden inline-block text-center cursor-pointer"><button class="bg-blue-600/20 text-blue-400 border border-blue-600 w-full py-1.5 rounded text-[10px] hover:bg-blue-600 hover:text-white transition-colors uppercase font-bold">Upload Texture</button><input type="file" accept="image/*" class="biome-upload absolute left-0 top-0 opacity-0 cursor-pointer h-full" data-biome="${biome}"></div></div>`).join('')}</div>`;
        setTimeout(() => {
            document.querySelectorAll('.biome-upload').forEach(input => {
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0]; if(!file) return; const biome = e.target.dataset.biome; const reader = new FileReader();
                    reader.onload = (ev) => { window.EngineState.biomeTextures[biome] = ev.target.result; const img = new Image(); img.src = ev.target.result; img.onload = () => { const tex = new THREE.Texture(img); tex.needsUpdate = true; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter; window.AssetManager.textures[biome] = tex; window.EventBus.emit('WORLD_REGENERATE'); window.EventBus.emit('UI_LOG', `${biome} texture mapped. World regenerated.`); }; window.EventBus.emit('RENDER_ASSETS'); }; reader.readAsDataURL(file);
                });
            });
        }, 0); return;
    }

    if (window.EngineState.currentAssetTab === 'villages') {
        if(window.VillageManager.villages.length === 0) {
            content.innerHTML = `<div class="text-center text-gray-500 py-10 font-mono flex flex-col items-center gap-4"><span class="text-4xl block">🌍</span><div>The Settlement Web has not been generated yet.</div><button class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold transition-colors shadow-lg" onclick="document.querySelector('[data-tab=world]').click()">Go to World Gen Tab</button></div>`; return;
        } 
        if (window.EngineState.editingVillageId !== null) {
            const v = window.VillageManager.villages.find(vil => vil.id === window.EngineState.editingVillageId); if (!v) { window.EngineState.editingVillageId = null; window.EventBus.emit('RENDER_ASSETS'); return; }
            const placeablePrefabs = Object.keys(window.AssetManager.prefabs).filter(k => window.AssetManager.prefabs[k].category === 'terrain' || window.AssetManager.prefabs[k].category === 'npcs');
            content.innerHTML = `<div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-700"><div class="flex items-center gap-4"><button onclick="window.closeLayoutEditor()" class="text-gray-400 hover:text-white bg-gray-800 px-3 py-1 rounded text-xs border border-gray-600 transition-colors">&larr; Back</button><h3 class="text-yellow-400 font-bold uppercase tracking-widest text-lg">📐 Blueprint: ${v.name}</h3></div><button onclick="window.EventBus.emit('WORLD_REGENERATE')" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow-[0_0_15px_rgba(21,128,61,0.4)]">🔄 Render Changes in World</button></div><div class="flex gap-4 h-[450px]"><div class="w-1/3 bg-gray-800/80 p-4 rounded-lg border border-gray-700 flex flex-col gap-4 shadow-lg"><h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-600 pb-1">Spawn Structure / NPC</h4><div class="flex flex-col gap-1"><label class="text-[10px] text-gray-500 uppercase font-bold">Select Asset</label><select id="layout-prefab-select" class="bg-gray-950 border border-gray-600 text-gray-300 text-xs rounded px-2 py-2 outline-none focus:border-yellow-500 transition-colors w-full">${placeablePrefabs.map(p => `<option value="${p}">${p}</option>`).join('')}</select></div><div class="grid grid-cols-2 gap-2"><div class="flex flex-col gap-1"><label class="text-[10px] text-gray-500 uppercase font-bold">X Offset (m)</label><input type="number" id="layout-ox" placeholder="0" value="0" class="bg-gray-950 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1.5 outline-none focus:border-yellow-500"></div><div class="flex flex-col gap-1"><label class="text-[10px] text-gray-500 uppercase font-bold">Z Offset (m)</label><input type="number" id="layout-oz" placeholder="0" value="0" class="bg-gray-950 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1.5 outline-none focus:border-yellow-500"></div></div><button onclick="window.addLayoutItem(${v.id})" class="mt-2 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded text-xs font-bold transition-colors uppercase tracking-widest border border-yellow-800 shadow-md">➕ Add to Blueprint</button><div class="mt-auto bg-gray-900/50 border border-gray-700 p-3 rounded text-[10px] text-gray-400"><p class="mb-1"><strong class="text-yellow-500">Note:</strong> Offsets are in meters relative to the Village Hub (Center). Height is calculated automatically to rest on terrain.</p></div></div><div class="w-2/3 bg-gray-900/80 p-4 rounded-lg border border-gray-700 flex flex-col shadow-inner"><h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1 mb-3">Saved Layout Entities (${v.layout.length})</h4><div class="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">${v.layout.length === 0 ? `<div class="text-center text-gray-600 py-10 font-mono text-xs">No custom structures added. Layout is empty.</div>` : ''}${v.layout.map(item => `<div class="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center hover:border-gray-500 transition-colors group"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-gray-900 border border-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-500">${window.AssetManager.prefabs[item.prefab].type === 'npc' ? '👤' : '🧱'}</div><div><div class="text-white text-xs font-bold">${item.prefab}</div><div class="text-gray-500 text-[10px] font-mono">Offset: X: ${item.ox}m | Z: ${item.oz}m</div></div></div><button onclick="window.removeLayoutItem(${v.id}, '${item.id}')" class="text-gray-600 hover:text-red-500 font-bold px-2 py-1 bg-gray-900 rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-all text-xs">&times; Remove</button></div>`).join('')}</div></div></div>`;
            return;
        }
        const availableModels = ['None', ...Object.keys(window.AssetManager.models)];
        let html = `<div class="text-yellow-400 font-bold mb-4 text-sm uppercase tracking-widest border-b border-gray-700 pb-2 flex justify-between items-center"><span>🏘️ Major Settlements (20 Nodes)</span></div><div class="grid grid-cols-2 gap-4">`;
        window.VillageManager.villages.forEach(v => {
            let optionsHTML = availableModels.map(m => `<option value="${m}" ${v.assignedModel === m ? 'selected' : ''}>${m}</option>`).join('');
            html += `<div class="bg-gray-800 p-3 rounded border border-gray-700 shadow-lg flex flex-col justify-between group relative"><div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onclick="window.renameVillage(${v.id})" class="bg-gray-700 hover:bg-blue-600 text-white text-[10px] px-2 py-1 rounded border border-gray-600 transition-colors">✏️ Rename</button><button onclick="window.openLayoutEditor(${v.id})" class="bg-yellow-700 hover:bg-yellow-600 text-white text-[10px] px-2 py-1 rounded border border-yellow-900 font-bold shadow-md transition-colors">📐 Layout</button></div><div class="flex justify-between items-start mb-2 mt-1"><div><div class="text-white font-bold text-sm flex items-center gap-2">${v.name} ${v.layout.length > 0 ? `<span class="bg-yellow-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">Modified</span>` : ''}</div><div class="text-gray-400 text-[10px] font-mono mt-1">Pos: X:${v.x} Z:${v.z}</div></div></div><div class="grid grid-cols-2 gap-2 mt-1 mb-2 text-[10px] bg-gray-900/50 p-1.5 rounded border border-gray-700"><div class="text-indigo-400 font-bold">🛡️ AP: ${v.stats.ap}</div><div class="text-gray-500 text-right">Links: [${v.connections.join(', ')}]</div></div><div class="flex items-center gap-2 mt-auto border-t border-gray-700 pt-2"><label class="text-[9px] text-gray-400 uppercase font-bold">Override 3D Model:</label><select class="village-model-select bg-gray-950 border border-gray-600 text-gray-300 text-[10px] rounded px-1.5 py-1 flex-1 outline-none focus:border-yellow-500 transition-colors" data-vid="${v.id}">${optionsHTML}</select></div></div>`;
        });
        html += `</div>`; content.innerHTML = html;
        setTimeout(() => { document.querySelectorAll('.village-model-select').forEach(sel => { sel.addEventListener('change', (e) => { const vId = parseInt(e.target.getAttribute('data-vid')); const v = window.VillageManager.villages.find(vil => vil.id === vId); if(v) { v.assignedModel = e.target.value === 'None' ? null : e.target.value; } }); }); }, 0); return;
    }

    if (window.EngineState.currentAssetTab === 'factions') {
        content.innerHTML = `<div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2"><div class="text-purple-400 font-bold text-sm uppercase tracking-widest">🛡️ Factions & Alignments</div><button class="bg-purple-600 hover:bg-purple-500 transition-colors text-white px-3 py-1 rounded text-[10px] uppercase font-bold shadow-lg">+ New Faction</button></div><div class="space-y-3">${window.EngineState.factions.map(f => `<div class="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700 shadow-lg"><div class="flex items-center gap-4"><div class="w-6 h-6 rounded border border-gray-600" style="background-color: ${f.color}"></div><span class="text-white font-bold tracking-wider">${f.name}</span></div><button class="text-[10px] font-bold uppercase bg-gray-700 px-3 py-1.5 rounded text-gray-300 border border-gray-600 hover:bg-gray-600 transition-colors">Manage NPCS</button></div>`).join('')}</div>`; return;
    }

    if (window.EngineState.currentAssetTab === 'vfx') {
        const headerRow = document.createElement('div'); headerRow.className = "flex justify-between items-center mb-4 border-b border-gray-700 pb-2";
        headerRow.innerHTML = `<div><div class="text-red-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2">✨ Particle & VFX Editor</div><div class="text-gray-400 text-[10px] mt-1">Create custom particle systems, apply textures, and tune visual properties.</div></div><button id="btn-add-vfx" class="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold transition-colors shadow-[0_0_15px_rgba(185,28,28,0.4)]">➕ New Custom VFX</button>`;
        content.appendChild(headerRow);
        setTimeout(() => { document.getElementById('btn-add-vfx').addEventListener('click', () => { const newId = 'Custom_' + Math.floor(Math.random() * 1000); window.VFXManager.defs[newId] = { type: 'aura', color: '#ffffff', size: 0.2, blend: THREE.AdditiveBlending, sprite: null }; window.EventBus.emit('RENDER_ASSETS'); }); }, 0);

        Object.entries(window.VFXManager.defs).forEach(([vName, vDef]) => {
            const row = document.createElement('div'); row.className = 'flex justify-between items-center bg-gray-800/80 p-3 rounded border border-gray-700 hover:border-gray-500 transition-colors mb-2 gap-4';
            row.innerHTML = `<div class="flex items-center gap-2 group w-1/4"><input type="text" class="vfx-name-input bg-transparent text-white font-bold tracking-wide border-b border-dashed border-gray-600 focus:border-solid focus:border-red-500 focus:bg-gray-800 outline-none w-full px-1 py-0.5 transition-all rounded-t-sm" value="${vName}" data-oldname="${vName}"><span class="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">✏️</span></div><div class="flex items-center gap-4 flex-1 justify-end"><div class="flex flex-col gap-1 w-32"><label class="text-[9px] text-gray-500 uppercase font-bold">Type</label><select class="vfx-type-select bg-gray-950 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none focus:border-red-500" data-vfx="${vName}"><option value="aura" ${vDef.type === 'aura' ? 'selected' : ''}>Aura (Passive)</option><option value="onHit" ${vDef.type === 'onHit' ? 'selected' : ''}>On-Hit (Burst)</option></select></div><div class="flex flex-col gap-1 w-20"><label class="text-[9px] text-gray-500 uppercase font-bold">Color</label><input type="color" class="vfx-color-picker bg-gray-950 border border-gray-700 rounded h-7 w-full cursor-pointer" value="${vDef.color}" data-vfx="${vName}"></div><div class="flex flex-col gap-1 w-24"><label class="text-[9px] text-gray-500 uppercase font-bold">Size (${vDef.size})</label><input type="range" class="vfx-size-slider accent-red-500" data-vfx="${vName}" min="0.05" max="1.0" step="0.05" value="${vDef.size}"></div><button class="vfx-sprite-btn bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1" data-vfx="${vName}">🖼️ Sprite</button></div>`;
            content.appendChild(row);
        });

        setTimeout(() => {
            document.querySelectorAll('.vfx-sprite-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const vfxName = e.target.getAttribute('data-vfx'); const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/png, image/jpeg, image/webp';
                    fileInput.onchange = (event) => {
                        const file = event.target.files[0]; if(file) {
                            const url = URL.createObjectURL(file); new THREE.TextureLoader().load(url, (tex) => { window.VFXManager.defs[vfxName].sprite = tex; window.EventBus.emit('UI_LOG', `Custom sprite applied to ${vfxName}`); window.EventBus.emit('RENDER_ASSETS'); });
                        }
                    }; fileInput.click();
                });
            });
        }, 0); return;
    }

    const availableModels = ['None', ...Object.keys(window.AssetManager.models)];
    const relevantPrefabs = Object.entries(window.AssetManager.prefabs).filter(([name, def]) => def.category === window.EngineState.currentAssetTab);
    if (relevantPrefabs.length === 0) { content.innerHTML = '<div class="text-gray-500 text-center mt-10 font-mono">No prefabs found for this category.</div>'; return; }

    relevantPrefabs.forEach(([name, def]) => {
        const row = document.createElement('div'); row.className = 'flex flex-col bg-gray-800/80 p-3 rounded border border-gray-700 hover:border-gray-500 transition-colors gap-2';
        let optionsHTML = availableModels.map(m => `<option value="${m}" ${def.customModel === m ? 'selected' : ''}>${m}</option>`).join('');
        
        let animSettingsHTML = `<div class="flex-1 pr-4 flex items-center justify-center border border-dashed border-gray-700 rounded bg-gray-900/30"><span class="text-[10px] text-gray-600">No Animations Available</span></div>`;
        
        let allAnims = [];
        if (def.customModel && def.customModel !== 'None' && window.AssetManager.animations[def.customModel]) {
            allAnims = [...window.AssetManager.animations[def.customModel]];
        }
        window.AssetManager.globalAnimations.forEach(ga => {
            if (!allAnims.find(a => a.name === ga.name)) allAnims.push(ga);
        });

        if (allAnims.length > 0) {
            let animOptions = '<option value="None">None</option>'; 
            allAnims.forEach(anim => { animOptions += `<option value="${anim.name}">${anim.name}</option>`; });
            
            if (!def.animMap) def.animMap = {};
            const states = ['idle', 'walk', 'attack', 'block', 'dash', 'hit', 'die'];
            states.forEach(s => { if(!def.animMap[s]) def.animMap[s] = 'None'; });

            animSettingsHTML = `<div class="flex-1 pr-4"><span class="text-[10px] font-bold text-indigo-400 block mb-1">ANIMATIONS:</span><div class="grid grid-cols-4 gap-2">`;
            states.forEach(state => {
                animSettingsHTML += `<div class="flex flex-col gap-1 w-full"><label class="text-[9px] text-gray-500 capitalize">${state}</label><select class="anim-select bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-1 py-1 focus:border-indigo-500 outline-none w-full" data-prefab="${name}" data-state="${state}">${animOptions.replace(`value="${def.animMap[state]}"`, `value="${def.animMap[state]}" selected`)}</select></div>`;
            });
            animSettingsHTML += `</div></div>`;
        }

        if (!def.vfx) def.vfx = { aura: 'None', onHit: 'None' };
        let vfxSettingsHTML = `<div class="w-48 pl-4 border-l border-gray-700"><span class="text-[10px] font-bold text-red-400 block mb-1">PARTICLES & VFX:</span><div class="flex flex-col gap-1"><label class="text-[9px] text-gray-500">Aura (Passive)</label><select class="vfx-select bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-1 py-1 focus:border-red-500 outline-none w-full" data-prefab="${name}" data-type="aura">${window.VFXManager.auras.map(v => `<option value="${v}" ${def.vfx.aura === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="flex flex-col gap-1 mt-1"><label class="text-[9px] text-gray-500">On Hit (Transient)</label><select class="vfx-select bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-1 py-1 focus:border-red-500 outline-none w-full" data-prefab="${name}" data-type="onHit">${window.VFXManager.onHits.map(v => `<option value="${v}" ${def.vfx.onHit === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>`;
        
        row.innerHTML = `<div class="flex justify-between items-center w-full mb-2">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded bg-gray-900 border border-gray-600 flex items-center justify-center text-[10px] text-center shadow-inner">${def.customModel ? '<span class="text-green-400 font-bold">3D<br>Model</span>' : (def.type==='mountain' ? '<span class="text-gray-500">Cone<br>Mesh</span>' : '<span class="text-gray-500">Prim<br>Mesh</span>')}</div>
                <div class="flex flex-col">
                    <div class="flex items-center gap-1 group">
                        <input type="text" class="prefab-name-input bg-transparent text-white font-bold tracking-wide border-b border-dashed border-gray-600 focus:border-solid focus:border-indigo-500 focus:bg-gray-800 outline-none w-32 px-1 py-0.5 transition-all rounded-t-sm" value="${name}" data-oldname="${name}" title="Edit Name">
                        <span class="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">✏️</span>
                    </div>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 px-1">TYPE: ${def.type}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] text-gray-500 uppercase font-bold">Model Override</label>
                    <select class="asset-model-select bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1.5 w-48 focus:border-indigo-500 outline-none transition-colors" data-prefab="${name}">${optionsHTML}</select>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] text-gray-500 uppercase font-bold">Scale Mult.</label>
                    <input type="number" step="0.001" min="0.001" class="asset-scale-input bg-gray-950 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1.5 w-20 outline-none focus:border-indigo-500" data-prefab="${name}" value="${def.modelScale || 1.0}">
                </div>
                <button class="asset-apply-btn mt-4 bg-indigo-900/50 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs px-4 py-1.5 rounded border border-indigo-700 hover:border-indigo-400 transition-all font-bold" data-prefab="${name}">APPLY</button>
            </div>
        </div><div class="flex items-stretch bg-gray-900/50 border border-gray-800 p-2 rounded w-full">${animSettingsHTML}${vfxSettingsHTML}</div>`;
        content.appendChild(row);
    });

    setTimeout(() => {
        document.querySelectorAll('.asset-apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pName = e.target.getAttribute('data-prefab'); 
                const select = document.querySelector(`.asset-model-select[data-prefab="${pName}"]`);
                const scaleInp = document.querySelector(`.asset-scale-input[data-prefab="${pName}"]`);
                
                if (window.AssetManager.prefabs[pName]) {
                    const def = window.AssetManager.prefabs[pName]; 
                    def.customModel = select.value === 'None' ? null : select.value;
                    def.modelScale = parseFloat(scaleInp.value) || 1.0;

                    if (pName === 'Player' && window.GameCore.playerObj) {
                        window.EventBus.emit('UI_LOG', `> Player 3D Model live-updated successfully.`);
                        window.GameCore.swapPlayerModel();
                    } else {
                        window.EventBus.emit('UI_LOG', `> Applied ${select.value} and Scale ${def.modelScale} to ${pName}`); 
                        window.EventBus.emit('WORLD_REGENERATE'); 
                    }
                    window.EventBus.emit('RENDER_ASSETS');
                }
            });
        });

        document.querySelectorAll('.anim-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const pName = e.target.getAttribute('data-prefab');
                const state = e.target.getAttribute('data-state');
                if (window.AssetManager.prefabs[pName]) {
                    window.AssetManager.prefabs[pName].animMap[state] = e.target.value;
                    if (pName === 'Player' && window.GameCore.playerObj) {
                        window.GameCore.swapPlayerModel(); 
                    }
                }
            });
        });
    }, 0);
};

window.EventBus.on('RENDER_ASSETS', window.renderAssetManager);

const gltfLoader = new GLTFLoader();
document.getElementById('btn-upload-file').addEventListener('click', () => { document.getElementById('asset-file-input').click(); });
document.getElementById('asset-file-input').addEventListener('change', (e) => {
    for (const file of e.target.files) {
        if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
            const url = URL.createObjectURL(file); 
            gltfLoader.load(url, (gltf) => { 
                window.AssetManager.models[file.name] = gltf.scene; 
                
                if (gltf.animations && gltf.animations.length > 0) {
                    window.AssetManager.animations[file.name] = gltf.animations; 
                    gltf.animations.forEach(anim => {
                        if(!window.AssetManager.globalAnimations.find(a => a.name === anim.name)) {
                            window.AssetManager.globalAnimations.push(anim);
                        }
                    });
                }
                window.EventBus.emit('UI_LOG', `Asset Imported: ${file.name}`); 
                window.EventBus.emit('RENDER_ASSETS'); 
            }, undefined, (err) => console.error(err));
        }
    }
});

document.querySelectorAll('.asset-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.asset-tab').forEach(b => { b.classList.remove('active', 'bg-indigo-600', 'text-white'); b.classList.add('bg-gray-800'); if (b.dataset.tab === 'villages') b.classList.add('text-yellow-400'); else if (b.dataset.tab === 'factions') b.classList.add('text-purple-400'); else if (b.dataset.tab === 'biomes') b.classList.add('text-blue-400'); else if (b.dataset.tab === 'vfx') b.classList.add('text-red-400'); else if (b.dataset.tab === 'world') b.classList.add('text-green-400'); else if (b.dataset.tab === 'mods') b.classList.add('text-pink-400'); else b.classList.add('text-gray-300'); });
        e.target.className = `asset-tab active bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors ${e.target.classList.contains('border') ? 'border border-indigo-900/50' : ''}`;
        window.EngineState.currentAssetTab = e.target.getAttribute('data-tab'); window.EngineState.editingVillageId = null; window.EventBus.emit('RENDER_ASSETS');
    });
});

const overlay = document.getElementById('dnd-overlay');
window.addEventListener('dragover', (e) => { e.preventDefault(); overlay.classList.remove('hidden'); });
window.addEventListener('dragleave', (e) => { e.preventDefault(); if (e.relatedTarget === null) overlay.classList.add('hidden'); });
window.addEventListener('drop', (e) => { e.preventDefault(); overlay.classList.add('hidden'); document.getElementById('asset-file-input').files = e.dataTransfer.files; document.getElementById('asset-file-input').dispatchEvent(new Event('change')); });
