window.ItemDatabase = {
    'rusty_sword': { id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', slot: 'weapon', stats: { damage: 5 }, icon: '🗡️', color: 'text-gray-400' },
    'iron_sword': { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', slot: 'weapon', stats: { damage: 15 }, icon: '⚔️', color: 'text-blue-400' },
    'rags': { id: 'rags', name: 'Rags', type: 'armor', slot: 'chest', stats: { defense: 1 }, icon: '👕', color: 'text-gray-500' },
    'leather_armor': { id: 'leather_armor', name: 'Leather Armor', type: 'armor', slot: 'chest', stats: { defense: 8 }, icon: '🦺', color: 'text-green-400' },
    'pants': { id: 'pants', name: 'Pants', type: 'armor', slot: 'legs', stats: { defense: 2 }, icon: '👖', color: 'text-gray-500' },
    'food': { id: 'food', name: 'Rations', type: 'consumable', slot: 'backpack', stats: { heal: 30 }, icon: '🍖', color: 'text-yellow-500' }
};

function recalculateStats() {
    let totalArmor = 0; let totalDamage = 0;
    const eq = window.GameState.inventory.equipment;
    ['head', 'chest', 'legs'].forEach(slot => { if (eq[slot] && window.ItemDatabase[eq[slot]]) totalArmor += window.ItemDatabase[eq[slot]].stats.defense; });
    if (eq.weapon && window.ItemDatabase[eq.weapon]) totalDamage += window.ItemDatabase[eq.weapon].stats.damage; else totalDamage += 2; 
    
    window.GameState.derivedStats.armor = totalArmor;
    window.GameState.derivedStats.weaponDamage = totalDamage;
    window.EventBus.emit('UI_UPDATE_STATS');
}

function renderInventory() {
    const panel = document.getElementById('inventory-panel'); if(!panel) return;
    const eq = window.GameState.inventory.equipment; const pack = window.GameState.inventory.backpack;
    
    const getSlotHtml = (slotId, label, heightClass) => {
        const item = eq[slotId] ? window.ItemDatabase[eq[slotId]] : null;
        const border = item ? 'border-blue-900/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'border-gray-700';
        const content = item ? `<div class="text-2xl mb-1">${item.icon}</div><div class="${item.color} font-bold">${item.name}</div><div class="text-[9px] text-gray-400 mt-1">${item.stats.defense ? 'DEF: +'+item.stats.defense : 'DMG: '+item.stats.damage}</div>` : `<div class="text-gray-600">${label}<br>(Empty)</div>`;
        return `<div class="border ${border} bg-gray-800 p-2 text-center text-xs h-${heightClass} flex flex-col items-center justify-center rounded cursor-pointer hover:bg-gray-700 transition-colors" onclick="window.EventBus.emit('INV_UNEQUIP', '${slotId}')">${content}</div>`;
    };

    let html = `
        <div class="flex justify-between items-end border-b border-gray-600 pb-2 mb-4">
            <h2 class="text-xl font-bold text-white tracking-widest uppercase">Inventory</h2>
            <div class="text-[10px] text-gray-400 font-mono text-right">
                <div>WEAPON DMG: <span class="text-blue-400 font-bold">${window.GameState.derivedStats.weaponDamage}</span></div>
                <div>TOTAL ARMOR: <span class="text-green-400 font-bold">${window.GameState.derivedStats.armor}</span></div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="space-y-3">${getSlotHtml('head', 'HEAD', '16')} ${getSlotHtml('chest', 'CHEST', '24')} ${getSlotHtml('legs', 'LEGS', '24')}</div>
            <div class="space-y-3">${getSlotHtml('weapon', 'WEAPON', '40')} <div class="border border-gray-700 bg-gray-800 p-2 text-center text-xs h-24 flex flex-col items-center justify-center rounded text-gray-600">BACKPACK<br>(No Mod)</div></div>
        </div>
        <h3 class="text-xs font-bold text-gray-400 border-b border-gray-700 pb-1 mb-2 flex justify-between">
            <span>BACKPACK CONTENTS</span><span class="text-gray-600 font-normal text-[9px] uppercase">Click to Use</span>
        </h3>
        <div class="grid grid-cols-5 gap-2 overflow-y-auto flex-1 custom-scrollbar content-start">
    `;
    
    for(let i=0; i<25; i++) {
        if(i < pack.length && pack[i]) {
            const item = window.ItemDatabase[pack[i]];
            html += `<div class="bg-gray-800 border border-gray-700 aspect-square rounded flex flex-col items-center justify-center text-[10px] ${item.color} hover:bg-gray-700 hover:border-gray-500 cursor-pointer transition-colors relative group shadow-sm" onclick="window.EventBus.emit('INV_USE', ${i})">
                <span class="text-xl mb-0.5">${item.icon}</span>
                <div class="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max bg-gray-950 text-gray-300 text-[10px] p-1.5 rounded border border-gray-600 z-10 pointer-events-none shadow-lg">
                    <span class="font-bold block text-white">${item.name}</span><span class="text-gray-500 block">${item.stats.defense ? 'DEF: +'+item.stats.defense : (item.stats.damage ? 'DMG: '+item.stats.damage : 'HEAL: '+item.stats.heal)}</span>
                </div></div>`;
        } else { html += `<div class="bg-gray-800/40 border border-gray-700/50 aspect-square rounded"></div>`; }
    }
    html += `</div>`; panel.innerHTML = html;
}

window.EventBus.on('INV_UNEQUIP', (slotId) => {
    const itemId = window.GameState.inventory.equipment[slotId];
    if(itemId) {
        if(window.GameState.inventory.backpack.length < 25) {
            window.GameState.inventory.backpack.push(itemId); window.GameState.inventory.equipment[slotId] = null;
            window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/hihat-analog.mp3', pos: window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : {x:0,y:0,z:0}, vol: -10});
            recalculateStats(); renderInventory();
        } else { window.EventBus.emit('UI_LOG', "Backpack is full!"); }
    }
});

window.EventBus.on('INV_USE', (packIndex) => {
    const itemId = window.GameState.inventory.backpack[packIndex]; if(!itemId) return;
    const item = window.ItemDatabase[itemId];
    if(item.type === 'consumable') {
        if(item.id === 'food') {
            if(window.GameState.inventory.food <= 0) {
                window.EventBus.emit('UI_LOG', 'No food remaining.');
                return;
            }
            window.GameState.pStats.hp = Math.min(window.GameState.pStats.hp + item.stats.heal, window.GameState.pStats.maxHp);
            window.GameState.inventory.food -= 1; window.GameState.inventory.backpack.splice(packIndex, 1);
            window.EventBus.emit('UI_LOG', `Ate ${item.name}. Recovered ${item.stats.heal} HP.`);
            window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/tom-analog.mp3', pos: window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : {x:0,y:0,z:0}, vol: -5});
            window.EventBus.emit('UI_UPDATE_HUD');
        }
    } else if(item.type === 'weapon' || item.type === 'armor') {
        const currentEquipped = window.GameState.inventory.equipment[item.slot];
        window.GameState.inventory.equipment[item.slot] = itemId; window.GameState.inventory.backpack.splice(packIndex, 1);
        if(currentEquipped) window.GameState.inventory.backpack.push(currentEquipped);
        window.EventBus.emit('PLAY_SOUND', {url: 'https://tonejs.github.io/audio/drum-samples/handclap.mp3', pos: window.GameCore.playerObj ? window.GameCore.playerObj.visual.position : {x:0,y:0,z:0}, vol: -10});
        recalculateStats();
    }
    renderInventory();
});

window.EventBus.on('RENDER_INVENTORY', renderInventory);
window.EventBus.on('ENGINE_READY', () => { recalculateStats(); });
