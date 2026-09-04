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
    const potential = window.GameState.runPotential;
    if (potential) container.innerHTML += `<div class="mb-4 bg-gray-800/50 p-2 border border-gray-700 shadow-inner"><div class="flex justify-between text-xs mb-1 font-bold tracking-wider"><span class="text-gray-400">RUNIC POTENTIAL</span><span style="color: ${potential.color}">${potential.name}</span></div><div class="text-[10px] text-gray-300 uppercase">${potential.skill}: +${potential.bonus} permanent</div></div>`;
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

function openMerchantShop(chest) {
    const dialogue = document.getElementById('companion-dialogue');
    const stock = chest.merchantInventory || [];
    const rows = stock.map((entry, index) => {
        const item = window.ItemDatabase[entry.itemId];
        return `<button class="merchant-buy-item border border-amber-700 bg-gray-900 p-2 text-left hover:border-amber-300 disabled:opacity-40" data-chest="${chest.id}" data-index="${index}" ${entry.quantity <= 0 ? 'disabled' : ''}>${item ? item.icon : '•'} ${item?.name || entry.itemId} <span class="float-right text-amber-300">${entry.price}g | ${entry.quantity}</span></button>`;
    }).join('') || '<div class="text-gray-500">Sold out.</div>';
    dialogue.innerHTML = `<div class="mb-4 border-b border-amber-700 pb-3"><div class="text-amber-300 font-bold tracking-widest">PLAGUE DOCTOR MERCHANT</div><div class="text-xs text-gray-500 mt-1">Gold: ${window.GameState.inventory.gold}</div></div><div class="grid gap-2 mb-4">${rows}</div><button id="btn-close-merchant" class="border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.merchant-buy-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('BUY_MERCHANT_ITEM', { chestId: button.dataset.chest, index: Number(button.dataset.index) })));
    dialogue.querySelector('#btn-close-merchant').addEventListener('click', closeCompanionDialogue);
}

function openPlayerCamp() {
    const dialogue = document.getElementById('companion-dialogue');
    const base = window.GameState.base;
    const stored = base.storage.length ? base.storage.map((itemId, index) => `<button class="withdraw-base-item border border-amber-700 bg-gray-900 p-2 text-left hover:border-amber-300" data-index="${index}">Withdraw ${window.ItemDatabase[itemId]?.name || itemId}</button>`).join('') : '<div class="text-gray-500">Storage is empty.</div>';
    const carried = window.GameState.inventory.backpack.map((itemId, index) => `<button class="deposit-base-item border border-gray-700 bg-gray-900 p-2 text-left hover:border-amber-300" data-index="${index}">Store ${window.ItemDatabase[itemId]?.name || itemId}</button>`).join('') || '<div class="text-gray-500">Nothing to store.</div>';
    dialogue.innerHTML = `<div class="mb-4 border-b border-amber-700 pb-3"><div class="text-amber-300 font-bold tracking-widest">${base.name.toUpperCase()}</div><div class="text-xs text-gray-500 mt-1">Storage | Structures ${base.structures.length}</div></div><div class="grid grid-cols-2 gap-3"><div><div class="text-xs text-amber-200 mb-2">CAMP STORAGE</div><div class="grid gap-2">${stored}</div></div><div><div class="text-xs text-gray-300 mb-2">YOUR PACK</div><div class="grid gap-2">${carried}</div></div></div><button id="btn-close-base" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.withdraw-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('WITHDRAW_BASE_ITEM', Number(button.dataset.index))));
    dialogue.querySelectorAll('.deposit-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('DEPOSIT_BASE_ITEM', Number(button.dataset.index))));
    dialogue.querySelector('#btn-close-base').addEventListener('click', closeCompanionDialogue);
}

function openCaravanDialogue(caravanEntity) {
    const dialogue = document.getElementById('companion-dialogue');
    const village = window.VillageManager.villages.find(candidate => candidate.id === caravanEntity.villageId);
    const caravan = village?.caravans.find(candidate => candidate.id === caravanEntity.caravanId);
    const destination = caravan && window.VillageManager.villages.find(candidate => candidate.id === caravan.targetVillageId);
    if (!caravan || !destination) return;
    const isEscorting = window.GameState.party.escortCaravanId === caravan.id;
    dialogue.innerHTML = `<div class="mb-4 border-b border-amber-700 pb-3"><div class="text-amber-300 font-bold tracking-widest">MERCHANT CARAVAN</div><div class="text-xs text-gray-500 mt-1">${village.name} to ${destination.name}</div></div><p class="mb-4 text-gray-300">Cargo: ${caravan.amount} ${caravan.cargo}</p><button id="btn-escort-caravan" class="w-full border border-amber-700 px-3 py-2 text-xs text-amber-200 hover:border-amber-300">${isEscorting ? 'Abandon Escort' : 'Escort Caravan'}</button><button id="btn-close-caravan" class="mt-3 border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-escort-caravan').addEventListener('click', () => window.EventBus.emit(isEscorting ? 'ABANDON_CARAVAN_ESCORT' : 'ESCORT_CARAVAN', caravan.id));
    dialogue.querySelector('#btn-close-caravan').addEventListener('click', closeCompanionDialogue);
}

const runeRecipes = {
    ember_rune: { gold: 10, wood: 1, stone: 1 },
    ward_rune: { gold: 15, wood: 1, stone: 2 },
    swift_rune: { gold: 20, wood: 2, stone: 1 }
};

function openArmorerForge() {
    const dialogue = document.getElementById('companion-dialogue');
    const rows = Object.entries(runeRecipes).map(([runeId, cost]) => {
        const rune = window.ItemDatabase[runeId];
        return `<button class="craft-rune border border-orange-700 bg-gray-900 p-2 text-left hover:border-orange-300" data-rune="${runeId}">${rune.icon} Craft ${rune.name}<span class="float-right text-amber-300">${cost.gold}g, ${cost.wood} wood, ${cost.stone} stone</span></button>`;
    }).join('');
    dialogue.innerHTML = `<div class="mb-4 border-b border-orange-700 pb-3"><div class="text-orange-300 font-bold tracking-widest">RUNEFORGE</div><div class="text-xs text-gray-500 mt-1">Bind runic power into your equipment.</div></div><div class="grid gap-2 mb-4">${rows}</div><button id="btn-close-forge" class="border border-gray-600 px-3 py-2 text-xs hover:border-orange-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.craft-rune').forEach(button => button.addEventListener('click', () => window.EventBus.emit('CRAFT_RUNE', button.dataset.rune)));
    dialogue.querySelector('#btn-close-forge').addEventListener('click', closeCompanionDialogue);
}

function openTreatmentCenter() {
    const dialogue = document.getElementById('companion-dialogue');
    dialogue.innerHTML = `<div class="mb-4 border-b border-green-700 pb-3"><div class="text-green-300 font-bold tracking-widest">PLAGUE TREATMENT</div><div class="text-xs text-gray-500 mt-1">Restore the party and tend injuries.</div></div><button id="btn-treatment" class="w-full border border-green-700 bg-gray-900 p-3 text-left hover:border-green-300">Treat Party <span class="float-right text-amber-300">10g</span></button><button id="btn-close-treatment" class="mt-3 border border-gray-600 px-3 py-2 text-xs hover:border-green-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-treatment').addEventListener('click', () => window.EventBus.emit('TREAT_PARTY'));
    dialogue.querySelector('#btn-close-treatment').addEventListener('click', closeCompanionDialogue);
}

function openRuneSocketMenu(packIndex) {
    const runeId = window.GameState.inventory.backpack[packIndex];
    const rune = window.ItemDatabase[runeId];
    if (!rune || rune.type !== 'rune') return;
    const dialogue = document.getElementById('companion-dialogue');
    const slots = Object.entries(window.GameState.inventory.equipment).filter(([, itemId]) => itemId).map(([slot, itemId]) => {
        const gear = window.ItemDatabase[itemId];
        const existingRune = window.GameState.inventory.runes[slot];
        return `<button class="rune-socket-target border border-cyan-700 bg-gray-900 p-2 text-left hover:border-cyan-300" data-pack-index="${packIndex}" data-slot="${slot}">${gear?.icon || '•'} ${slot.toUpperCase()}${existingRune ? ` <span class="text-gray-500">(${window.ItemDatabase[existingRune]?.name})</span>` : ''}</button>`;
    }).join('') || '<div class="text-gray-500">Equip gear before socketing a rune.</div>';
    dialogue.innerHTML = `<div class="mb-4 border-b border-cyan-700 pb-3"><div class="text-cyan-300 font-bold tracking-widest">SOCKET ${rune.name.toUpperCase()}</div><div class="text-xs text-gray-500 mt-1">Choose equipped gear</div></div><div class="grid gap-2 mb-4">${slots}</div><button id="btn-close-runes" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Cancel</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.rune-socket-target').forEach(button => button.addEventListener('click', () => window.EventBus.emit('SOCKET_RUNE', { packIndex: Number(button.dataset.packIndex), slot: button.dataset.slot })));
    dialogue.querySelector('#btn-close-runes').addEventListener('click', closeCompanionDialogue);
}

window.EventBus.on('OPEN_RUNE_SOCKET', openRuneSocketMenu);

window.EventBus.on('SOCKET_RUNE', ({ packIndex, slot }) => {
    const runeId = window.GameState.inventory.backpack[packIndex];
    if (!runeId || !window.GameState.inventory.equipment[slot] || window.ItemDatabase[runeId]?.type !== 'rune') return;
    const replacedRune = window.GameState.inventory.runes[slot];
    window.GameState.inventory.backpack.splice(packIndex, 1);
    if (replacedRune) window.GameState.inventory.backpack.push(replacedRune);
    window.GameState.inventory.runes[slot] = runeId;
    window.EventBus.emit('UI_LOG', `Socketed ${window.ItemDatabase[runeId].name} into ${slot}.`);
    closeCompanionDialogue();
    window.EventBus.emit('RECALCULATE_STATS');
    window.EventBus.emit('RENDER_INVENTORY');
});

function openVillageQuestBoard(hub) {
    const village = window.VillageManager.villages.find(candidate => candidate.id === hub.villageId);
    if (!village) return;
    const dialogue = document.getElementById('companion-dialogue');
    const quests = window.GameState.questBoard.filter(quest => quest.issuer === village.id);
    const rows = quests.length ? quests.map((quest, index) => `<button class="quest-delivery border border-green-800 bg-gray-900 p-2 text-left hover:border-green-300" data-quest-index="${window.GameState.questBoard.indexOf(quest)}">Deliver ${quest.amount} ${quest.resource} <span class="float-right text-amber-300">${quest.reward}g</span><span class="block text-[10px] text-gray-500">${quest.purpose}</span></button>`).join('') : '<div class="text-gray-500">No outstanding settlement requests.</div>';
    dialogue.innerHTML = `<div class="mb-4 border-b border-green-700 pb-3"><div class="text-green-300 font-bold tracking-widest">${village.name.toUpperCase()} REQUESTS</div><div class="text-xs text-gray-500 mt-1">${village.nobleHouse}</div></div><div class="grid gap-2 mb-4">${rows}</div><button id="btn-close-quest-board" class="border border-gray-600 px-3 py-2 text-xs hover:border-green-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.quest-delivery').forEach(button => button.addEventListener('click', () => window.EventBus.emit('DELIVER_FETCH_QUEST', Number(button.dataset.questIndex))));
    dialogue.querySelector('#btn-close-quest-board').addEventListener('click', closeCompanionDialogue);
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
    const loot = window.GameCore.groundLoot.find(entry => Math.hypot(entry.visual.position.x - playerPosition.x, entry.visual.position.z - playerPosition.z) <= 2.5);
    if (loot) {
        window.EventBus.emit('PICKUP_GROUND_LOOT', loot.id);
        return;
    }
    const playerBase = window.GameCore.activeEntities.find(entity => entity.playerBase && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (playerBase) {
        openPlayerCamp();
        return;
    }
    const caravan = window.GameCore.activeEntities.find(entity => entity.caravanId && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (caravan) {
        openCaravanDialogue(caravan);
        return;
    }
    const merchantChest = window.GameCore.activeEntities.find(entity => entity.def.type === 'merchantChest' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 3.5);
    if (merchantChest) {
        openMerchantShop(merchantChest);
        return;
    }
    const armorer = window.GameCore.activeEntities.find(entity => entity.def.forge && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (armorer) {
        openArmorerForge();
        return;
    }
    const treatmentCenter = window.GameCore.activeEntities.find(entity => entity.def.serviceType === 'plagueTreatment' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (treatmentCenter) {
        openTreatmentCenter();
        return;
    }
    const villageHub = window.GameCore.activeEntities.find(entity => entity.def.type === 'hub' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (villageHub) {
        openVillageQuestBoard(villageHub);
        return;
    }
    const companion = window.GameCore.activeEntities.find(entity => (entity.companionId || entity.recruitId) && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 3.5);
    if (!companion) {
        window.EventBus.emit('GATHER_NEARBY');
        return;
    }
    const member = window.GameState.party.members.find(candidate => candidate.id === (companion.companionId || companion.recruitId));
    if (!member) return;
    const dialogue = document.getElementById('companion-dialogue');
    const status = member.downed ? 'Downed | Needs a ration to recover' : (member.recruited ? `Loyalty ${member.loyalty} | Hunger ${member.hunger}` : `Unrecruited ${member.role}`);
    const action = member.downed ? `<button id="btn-revive-companion" class="col-span-2 border border-red-700 px-3 py-2 text-xs text-red-200 hover:border-red-300">Use Ration to Revive</button>` : (member.recruited ? `<button id="btn-companion-inventory" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Open Inventory</button><button id="btn-select-companion" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Select for Orders</button>` : `<button id="btn-recruit-companion" class="col-span-2 border border-green-700 px-3 py-2 text-xs text-green-200 hover:border-green-300">Recruit</button>`);
    dialogue.innerHTML = `<div class="mb-4 border-b border-gray-700 pb-3"><div class="text-cyan-300 font-bold tracking-widest">${member.name}</div><div class="text-xs text-gray-500 mt-1">${status}</div></div><p class="mb-4 text-gray-300">${member.downed ? 'I need help getting back up.' : (member.recruited ? 'Ready when you are.' : 'I will travel with someone worth trusting.')}</p><div class="grid grid-cols-2 gap-2"><button id="btn-talk-companion" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Talk</button>${action}<button id="btn-leave-companion" class="col-span-2 border border-gray-700 px-3 py-2 text-xs hover:border-gray-400">Leave</button></div>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-talk-companion').addEventListener('click', () => { window.EventBus.emit('UI_LOG', `${member.name}: I am with you.`); });
    dialogue.querySelector('#btn-companion-inventory')?.addEventListener('click', () => openCompanionInventory(member));
    dialogue.querySelector('#btn-recruit-companion')?.addEventListener('click', () => window.EventBus.emit('RECRUIT_COMPANION', member.id));
    dialogue.querySelector('#btn-select-companion')?.addEventListener('click', () => window.EventBus.emit('TOGGLE_PARTY_MEMBER_SELECTION', member.id));
    dialogue.querySelector('#btn-revive-companion')?.addEventListener('click', () => window.EventBus.emit('REVIVE_COMPANION', member.id));
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

window.EventBus.on('REVIVE_COMPANION', memberId => {
    const member = window.GameState.party.members.find(candidate => candidate.id === memberId);
    const entity = window.GameCore.activeEntities.find(candidate => candidate.companionId === memberId);
    if (!member?.downed || !entity) return;
    const rationIndex = window.GameState.inventory.backpack.indexOf('food');
    if (rationIndex < 0) {
        window.EventBus.emit('UI_LOG', 'A ration is required to revive a companion.');
        return;
    }
    window.GameState.inventory.backpack.splice(rationIndex, 1);
    window.GameState.inventory.food = Math.max(0, window.GameState.inventory.food - 1);
    member.downed = false;
    member.hp = Math.ceil(member.maxHp * 0.3);
    member.injuries.push('recently revived');
    entity.hp = member.hp;
    entity.body.setTranslation({ x: entity.visual.position.x, y: entity.visual.position.y + 0.5, z: entity.visual.position.z }, true);
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'idle');
    window.EventBus.emit('UI_LOG', `${member.name} was revived at ${member.hp} HP.`);
    closeCompanionDialogue();
    window.EventBus.emit('UI_UPDATE_HUD');
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

window.EventBus.on('BUY_MERCHANT_ITEM', ({ chestId, index }) => {
    const chest = window.GameCore.activeEntities.find(entity => entity.id === chestId);
    const stock = chest?.merchantInventory?.[index];
    if (!stock || stock.quantity <= 0) return;
    if (window.GameState.inventory.gold < stock.price) {
        window.EventBus.emit('UI_LOG', 'Not enough gold.');
        return;
    }
    if (window.GameState.inventory.backpack.length >= 25) {
        window.EventBus.emit('UI_LOG', 'Backpack is full.');
        return;
    }
    window.GameState.inventory.gold -= stock.price;
    stock.quantity--;
    window.GameState.inventory.backpack.push(stock.itemId);
    if (stock.itemId === 'food') window.GameState.inventory.food++;
    window.EventBus.emit('UI_LOG', `Purchased ${window.ItemDatabase[stock.itemId]?.name || stock.itemId}.`);
    openMerchantShop(chest);
    window.EventBus.emit('UI_UPDATE_HUD');
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('ESCORT_CARAVAN', caravanId => {
    window.GameState.party.escortCaravanId = caravanId;
    window.EventBus.emit('UI_LOG', 'Party is escorting the merchant caravan.');
    closeCompanionDialogue();
});

window.EventBus.on('ABANDON_CARAVAN_ESCORT', () => {
    window.GameState.party.escortCaravanId = null;
    window.EventBus.emit('UI_LOG', 'Caravan escort abandoned.');
    closeCompanionDialogue();
});

window.EventBus.on('CRAFT_RUNE', runeId => {
    const cost = runeRecipes[runeId];
    if (!cost || window.GameState.inventory.backpack.length >= 25) return;
    const pack = window.GameState.inventory.backpack;
    if (window.GameState.inventory.gold < cost.gold || pack.filter(itemId => itemId === 'wood').length < cost.wood || pack.filter(itemId => itemId === 'stone').length < cost.stone) {
        window.EventBus.emit('UI_LOG', 'Runeforge requires more gold, timber, or stone.');
        return;
    }
    window.GameState.inventory.gold -= cost.gold;
    ['wood', 'stone'].forEach(resource => {
        let count = cost[resource];
        for (let index = pack.length - 1; index >= 0 && count > 0; index--) if (pack[index] === resource) { pack.splice(index, 1); count--; }
    });
    pack.push(runeId);
    window.EventBus.emit('UI_LOG', `Crafted ${window.ItemDatabase[runeId].name}.`);
    openArmorerForge();
    window.EventBus.emit('UI_UPDATE_HUD');
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('TREAT_PARTY', () => {
    if (window.GameState.inventory.gold < 10) {
        window.EventBus.emit('UI_LOG', 'The treatment center requires 10 gold.');
        return;
    }
    window.GameState.inventory.gold -= 10;
    window.GameState.pStats.hp = window.GameState.pStats.maxHp;
    window.GameState.party.members.filter(member => member.recruited).forEach(member => {
        member.downed = false;
        member.hp = member.maxHp;
        member.injuries = [];
        const entity = window.GameCore.activeEntities.find(candidate => candidate.companionId === member.id);
        if (entity) { entity.hp = member.hp; entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true); if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'idle'); }
    });
    window.EventBus.emit('UI_LOG', 'The treatment center restored the party.');
    closeCompanionDialogue();
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus.on('DELIVER_FETCH_QUEST', questIndex => {
    const quest = window.GameState.questBoard[questIndex];
    if (!quest || quest.type !== 'fetch' || !['food', 'wood', 'stone'].includes(quest.resource)) return;
    const matchingItems = window.GameState.inventory.backpack.filter(itemId => itemId === quest.resource).length;
    if (matchingItems < quest.amount) {
        window.EventBus.emit('UI_LOG', `Need ${quest.amount - matchingItems} more ${quest.resource} to complete this request.`);
        return;
    }
    let remaining = quest.amount;
    window.GameState.inventory.backpack = window.GameState.inventory.backpack.filter(itemId => {
        if (itemId === quest.resource && remaining > 0) {
            remaining--;
            return false;
        }
        return true;
    });
    if (quest.resource === 'food') window.GameState.inventory.food = Math.max(0, window.GameState.inventory.food - quest.amount);
    const village = window.VillageManager.villages.find(candidate => candidate.id === quest.issuer);
    if (village) village.stats[quest.resource] = (village.stats[quest.resource] || 0) + quest.amount;
    window.GameState.inventory.gold += quest.reward;
    window.GameState.reputation.village += 5;
    window.GameState.questBoard.splice(questIndex, 1);
    window.EventBus.emit('UI_LOG', `Delivered ${quest.amount} ${quest.resource}. Earned ${quest.reward} gold.`);
    closeCompanionDialogue();
    window.EventBus.emit('UI_UPDATE_HUD');
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('PICKUP_GROUND_LOOT', lootId => {
    const lootIndex = window.GameCore.groundLoot.findIndex(entry => entry.id === lootId);
    if (lootIndex < 0) return;
    if (window.GameState.inventory.backpack.length >= 25) {
        window.EventBus.emit('UI_LOG', 'Backpack is full.');
        return;
    }
    const [loot] = window.GameCore.groundLoot.splice(lootIndex, 1);
    window.GameCore.scene.remove(loot.visual);
    window.GameState.inventory.backpack.push(loot.itemId);
    window.EventBus.emit('UI_LOG', `Picked up ${window.ItemDatabase[loot.itemId]?.name || loot.itemId}.`);
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('DEPOSIT_BASE_ITEM', packIndex => {
    const itemId = window.GameState.inventory.backpack[packIndex];
    if (!itemId) return;
    window.GameState.inventory.backpack.splice(packIndex, 1);
    window.GameState.base.storage.push(itemId);
    openPlayerCamp();
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('WITHDRAW_BASE_ITEM', storageIndex => {
    if (window.GameState.inventory.backpack.length >= 25 || !window.GameState.base.storage[storageIndex]) return;
    const [itemId] = window.GameState.base.storage.splice(storageIndex, 1);
    window.GameState.inventory.backpack.push(itemId);
    openPlayerCamp();
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
