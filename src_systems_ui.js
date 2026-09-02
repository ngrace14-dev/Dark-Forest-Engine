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
window.EventBus.on('DEV_TOOLS_TOGGLE_ASSETS', () => {
    const panel = document.getElementById('asset-manager-panel');
    if(panel) { panel.classList.toggle('hidden'); panel.classList.toggle('flex'); if(!panel.classList.contains('hidden')) window.EventBus.emit('RENDER_ASSETS'); }
});

document.getElementById('btn-close-asset')?.addEventListener('click', () => { document.getElementById('asset-manager-panel').classList.add('hidden'); document.getElementById('asset-manager-panel').classList.remove('flex'); });
document.getElementById('btn-stats')?.addEventListener('click', () => document.getElementById('stats-panel').classList.toggle('hidden'));
document.getElementById('btn-inv')?.addEventListener('click', () => { document.getElementById('inventory-panel').classList.toggle('hidden'); if(!document.getElementById('inventory-panel').classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); });
document.getElementById('btn-asset')?.addEventListener('click', () => { window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS'); });
