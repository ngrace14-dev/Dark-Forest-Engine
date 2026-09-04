let floatingTexts = [];

window.EventBus.on('UI_LOG', (msg) => {
    const el = document.getElementById('event-log'); if(!el) return;
    const entry = document.createElement('div'); entry.innerText = `> ${msg}`; el.appendChild(entry); el.scrollTop = el.scrollHeight;
});

window.EventBus.on('UI_UPDATE_HUD', () => {
    document.getElementById('hp-bar').style.width = `${(window.GameState.pStats.hp / window.GameState.pStats.maxHp) * 100}%`;
    document.getElementById('hud-food').innerText = window.GameState.inventory.food; 
    document.getElementById('hud-gold').innerText = window.GameState.inventory.gold;
    document.getElementById('rep-village').innerText = window.GameState.reputation.village; 
    document.getElementById('rep-adventurer').innerText = window.GameState.reputation.adventurer;
    document.getElementById('rep-monster').innerText = window.GameState.reputation.monster;
    document.getElementById('rep-village').className = window.GameState.reputation.village <= -50 ? 'text-red-500 font-bold' : 'text-blue-400';
});

window.EventBus.on('UI_UPDATE_STATS', () => {
    const container = document.getElementById('stats-container'); container.innerHTML = '';
    container.innerHTML += `<div class="mb-4 bg-gray-800/50 p-2 rounded border border-gray-700 shadow-inner">
        <div class="flex justify-between text-blue-400 text-xs mb-1 font-bold tracking-wider"><span>WEAPON DAMAGE</span><span>${window.GameState.derivedStats.weaponDamage}</span></div>
        <div class="flex justify-between text-green-400 text-xs font-bold tracking-wider"><span>TOTAL ARMOR</span><span>${window.GameState.derivedStats.armor}</span></div>
    </div>`;
    for(const [key, stat] of Object.entries(window.GameState.pStats)) {
        if(key === 'hp' || key === 'maxHp') continue;
        const percent = (stat.xp / stat.next) * 100;
        container.innerHTML += `<div class="mb-2"><div class="flex justify-between text-gray-400 mb-1"><span class="capitalize">${key}</span><span class="text-white font-bold">Lv.${stat.level}</span></div><div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div class="h-full bg-indigo-500" style="width: ${percent}%"></div></div></div>`;
    }
});

window.EventBus.on('ENTITY_DAMAGED', ({ damage, position, isPlayer }) => {
    window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: damage, pos: position, color: isPlayer ? '#ff0000' : '#ff4444' });
    if (!isPlayer) {
        window.EventBus.emit('PLAY_SOUND', { url: 'https://tonejs.github.io/audio/drum-samples/snare-analog.mp3', pos: position });
    } else {
        const overlay = document.getElementById('damage-overlay');
        overlay.classList.remove('hit-flash'); void overlay.offsetWidth; overlay.classList.add('hit-flash'); 
        setTimeout(() => overlay.classList.remove('hit-flash'), 300);
    }
});

window.EventBus.on('SPAWN_FLOATING_TEXT', ({ text, pos, color }) => {
    const el = document.createElement('div'); el.className = 'floating-dmg'; el.style.color = color; el.innerText = text;
    document.getElementById('damage-overlay').appendChild(el);
    floatingTexts.push({ el: el, pos: {x: pos.x, y: pos.y + 1.5, z: pos.z}, life: 1.0, velocity: {x:0, y:1, z:0} });
});

window.EventBus.on('UI_TICK', ({ delta, camera }) => {
    if(!camera) return;
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i]; ft.life -= delta * 1.5;
        if (ft.life <= 0) { ft.el.remove(); floatingTexts.splice(i, 1); continue; }
        ft.pos.x += ft.velocity.x * delta; ft.pos.y += ft.velocity.y * delta; ft.pos.z += ft.velocity.z * delta;
        
        if (window.THREE) {
            const pVec = new window.THREE.Vector3(ft.pos.x, ft.pos.y, ft.pos.z).project(camera);
            if (pVec.z > 1) { ft.el.style.display = 'none'; } else {
                ft.el.style.display = 'block'; ft.el.style.left = `${(pVec.x * 0.5 + 0.5) * window.innerWidth}px`; ft.el.style.top = `${-(pVec.y * 0.5 - 0.5) * window.innerHeight}px`; ft.el.style.opacity = Math.max(0, ft.life);
            }
        }
    }
    const safeUI = document.getElementById('safe-zone-indicator');
    if(safeUI && window.GameCore.playerObj) {
        if(window.EngineParams.isPlayerSafe) safeUI.classList.remove('hidden'); else safeUI.classList.add('hidden');
    }
});

window.EventBus.on('PLAYER_LEVEL_UP', ({ statName, level }) => { window.EventBus.emit('UI_LOG', `Level Up! ${statName.toUpperCase()} is now ${level}`); });
function closeCompanionDialogue() {
    document.getElementById('companion-dialogue').classList.add('hidden');
}

function openCompanionInventory(member) {
    const dialogue = document.getElementById('companion-dialogue');
    const inventory = member.inventory || [];
    const items = inventory.length ? inventory.map((itemId, index) => {
        const item = window.ItemDatabase[itemId];
        return `<button class="companion-take-item border border-gray-700 bg-gray-900 p-2 text-left hover:border-cyan-500" data-member="${member.id}" data-index="${index}">${item ? `${item.icon} ${item.name}` : itemId}</button>`;
    }).join('') : '<div class="text-gray-500">No items carried.</div>';
    dialogue.innerHTML = `<div class="mb-4 border-b border-gray-700 pb-3"><div class="text-cyan-300 font-bold tracking-widest">${member.name}'S PACK</div><div class="text-xs text-gray-500 mt-1">Role: ${member.role}</div></div><div class="grid gap-2 mb-4">${items}</div><button id="btn-close-companion" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Back</button>`;
    dialogue.querySelectorAll('.companion-take-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('TAKE_COMPANION_ITEM', { memberId: button.dataset.member, index: Number(button.dataset.index) })));
    dialogue.querySelector('#btn-close-companion').addEventListener('click', closeCompanionDialogue);
}

window.EventBus.on('INTERACT_NEARBY', () => {
    if (!window.GameCore.playerObj) return;
    const playerPosition = window.GameCore.playerObj.visual.position;
    const companion = window.GameCore.activeEntities.find(entity => (entity.companionId || entity.recruitId) && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 3.5);
    if (!companion) {
        window.EventBus.emit('GATHER_NEARBY');
        return;
    }
    const member = window.GameState.party.members.find(candidate => candidate.id === (companion.companionId || companion.recruitId));
    if (!member) return;
    const dialogue = document.getElementById('companion-dialogue');
    const status = member.recruited ? `Loyalty ${member.loyalty} | Hunger ${member.hunger}` : `Unrecruited ${member.role}`;
    const action = member.recruited ? `<button id="btn-companion-inventory" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Open Inventory</button><button id="btn-select-companion" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Select for Orders</button>` : `<button id="btn-recruit-companion" class="col-span-2 border border-green-700 px-3 py-2 text-xs text-green-200 hover:border-green-300">Recruit</button>`;
    dialogue.innerHTML = `<div class="mb-4 border-b border-gray-700 pb-3"><div class="text-cyan-300 font-bold tracking-widest">${member.name}</div><div class="text-xs text-gray-500 mt-1">${status}</div></div><p class="mb-4 text-gray-300">${member.recruited ? 'Ready when you are.' : 'I will travel with someone worth trusting.'}</p><div class="grid grid-cols-2 gap-2"><button id="btn-talk-companion" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Talk</button>${action}<button id="btn-leave-companion" class="col-span-2 border border-gray-700 px-3 py-2 text-xs hover:border-gray-400">Leave</button></div>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-talk-companion').addEventListener('click', () => { window.EventBus.emit('UI_LOG', `${member.name}: I am with you.`); });
    dialogue.querySelector('#btn-companion-inventory')?.addEventListener('click', () => openCompanionInventory(member));
    dialogue.querySelector('#btn-recruit-companion')?.addEventListener('click', () => window.EventBus.emit('RECRUIT_COMPANION', member.id));
    dialogue.querySelector('#btn-select-companion')?.addEventListener('click', () => window.EventBus.emit('TOGGLE_PARTY_MEMBER_SELECTION', member.id));
    dialogue.querySelector('#btn-leave-companion').addEventListener('click', closeCompanionDialogue);
});

window.EventBus.on('RECRUIT_COMPANION', memberId => {
    const member = window.GameState.party.members.find(candidate => candidate.id === memberId);
    const entity = window.GameCore.activeEntities.find(candidate => candidate.recruitId === memberId);
    if (!member || !entity) return;
    member.recruited = true;
    entity.companionId = memberId;
    delete entity.recruitId;
    window.GameState.party.selectedMembers.push(memberId);
    window.EventBus.emit('UI_LOG', `${member.name} joined the party.`);
    closeCompanionDialogue();
});

window.EventBus.on('TOGGLE_PARTY_MEMBER_SELECTION', memberId => {
    const selected = window.GameState.party.selectedMembers;
    const index = selected.indexOf(memberId);
    if (index >= 0) selected.splice(index, 1); else selected.push(memberId);
    window.EventBus.emit('UI_LOG', `${memberId} ${index >= 0 ? 'removed from' : 'added to'} group orders.`);
});

window.EventBus.on('TAKE_COMPANION_ITEM', ({ memberId, index }) => {
    const member = window.GameState.party.members.find(candidate => candidate.id === memberId);
    if (!member || !member.inventory[index]) return;
    if (window.GameState.inventory.backpack.length >= 25) {
        window.EventBus.emit('UI_LOG', 'Backpack is full.');
        return;
    }
    const [itemId] = member.inventory.splice(index, 1);
    window.GameState.inventory.backpack.push(itemId);
    window.EventBus.emit('UI_LOG', `Took ${window.ItemDatabase[itemId]?.name || itemId} from ${member.name}.`);
    openCompanionInventory(member);
    window.EventBus.emit('RENDER_INVENTORY');
});
window.EventBus.on('DEV_TOOLS_TOGGLE_ASSETS', () => {
    const panel = document.getElementById('asset-manager-panel');
    if(panel) { panel.classList.toggle('hidden'); panel.classList.toggle('flex'); if(!panel.classList.contains('hidden')) window.EventBus.emit('RENDER_ASSETS'); }
});

document.getElementById('btn-close-asset')?.addEventListener('click', () => { document.getElementById('asset-manager-panel').classList.add('hidden'); document.getElementById('asset-manager-panel').classList.remove('flex'); });
document.getElementById('btn-stats')?.addEventListener('click', () => document.getElementById('stats-panel').classList.toggle('hidden'));
document.getElementById('btn-inv')?.addEventListener('click', () => { document.getElementById('inventory-panel').classList.toggle('hidden'); if(!document.getElementById('inventory-panel').classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); });
document.getElementById('btn-asset')?.addEventListener('click', () => { window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS'); });
