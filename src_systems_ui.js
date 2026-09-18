let floatingTexts = [];

// ==========================================
// SQUAD & FACTION MANAGEMENT UI
// ==========================================

function openSquadManager() {
    const panel = document.getElementById('squad-manager-panel');
    if (!panel) return;
    
    // Refresh the content
    window.EventBus.emit('RENDER_SQUAD_MANAGER');
    
    // Toggle visibility
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
}

window.EventBus.on('TOGGLE_SQUAD_MANAGER', openSquadManager);

window.EventBus.on('RENDER_SQUAD_MANAGER', () => {
    const content = document.getElementById('squad-manager-content');
    if (!content) return;
    
    const party = window.GameState.party.members.filter(m => m.recruited);
    
    let html = `
        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h2 class="text-cyan-400 font-bold tracking-widest text-sm uppercase">🛡️ Party Management</h2>
            <div class="text-[10px] text-gray-400">Total Members: ${party.length}</div>
        </div>
        
        <div class="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
    `;
    
    if (party.length === 0) {
        html += `<div class="text-gray-500 text-center text-xs py-4">No companions recruited. Talk to adventurers in the world.</div>`;
    } else {
        party.forEach(member => {
            const isSelected = window.GameState.party.selectedMembers.includes(member.id);
            const isDowned = member.downed;
            
            const hpPercent = (member.hp / (member.maxHp || 100)) * 100;
            const hungerPercent = (member.hunger / 100) * 100;
            const loyaltyPercent = (member.loyalty / 100) * 100;
            
            const borderClass = isSelected ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-gray-700 hover:border-gray-500';
            const bgClass = isDowned ? 'bg-red-900/20' : 'bg-gray-800/80';
            
            html += `
                <div class="p-3 rounded border ${borderClass} ${bgClass} transition-colors cursor-pointer" onclick="window.EventBus.emit('TOGGLE_PARTY_MEMBER_SELECTION', '${member.id}'); window.EventBus.emit('RENDER_SQUAD_MANAGER');">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} class="pointer-events-none accent-cyan-500">
                            <span class="text-white font-bold text-xs">${member.name}</span>
                            ${isDowned ? '<span class="bg-red-600 text-white text-[9px] px-1 rounded font-bold uppercase">Downed</span>' : ''}
                        </div>
                        <div class="text-[10px] text-cyan-200 uppercase">${member.role}</div>
                    </div>
                    
                                                    <div class="grid grid-cols-4 gap-2 mb-2">
                                                                <div class="flex flex-col">
                                                                    <div class="text-[8px] text-gray-500 uppercase font-bold">Tier</div>
                                                                    <div class="text-[10px] ${member.tier === 'war_master' ? 'text-yellow-400 font-bold' : 'text-indigo-400'} capitalize">${member.tier.replace('_', ' ')}</div>
                                                                </div>
                                                                <div class="flex flex-col">
                                                                    <div class="text-[8px] text-gray-500 uppercase font-bold">Authority</div>
                                                                    <div class="text-[10px] text-white">${member.commandAuthority} Units</div>
                                                                </div>
                                                                <div class="flex flex-col">
                                                                    <div class="text-[8px] text-gray-500 uppercase font-bold">Exp (Led)</div>
                                                                    <div class="text-[10px] text-green-400">${member.battlesLed || 0}/100</div>
                                                                </div>
                                                                <div class="flex flex-col">
                                                                    <div class="text-[8px] text-gray-500 uppercase font-bold">Dispatch</div>
                                                                    <div class="text-[10px] text-gray-400 truncate">${member.dispatchTarget || 'With Player'}</div>
                                                                </div>
                                                            </div>


                    
                    <div class="grid grid-cols-3 gap-3">

                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>HP</span><span>${Math.floor(member.hp)}/${member.maxHp||100}</span></div>
                            <div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-red-500" style="width: ${hpPercent}%"></div></div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>Hunger</span><span>${Math.floor(member.hunger)}%</span></div>
                            <div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-yellow-500" style="width: ${hungerPercent}%"></div></div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>Loyalty</span><span>${Math.floor(member.loyalty)}%</span></div>
                            <div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width: ${loyaltyPercent}%"></div></div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>
                <div class="border-t border-gray-700 pt-3">
            <div class="flex justify-between items-center mb-2">
                <div class="text-[10px] text-gray-400 font-bold uppercase">Tactical Formation</div>
                <select class="bg-gray-800 text-cyan-400 text-[10px] border border-gray-700 rounded px-1" onchange="window.GameState.party.formation = this.value; window.EventBus.emit('UI_LOG', 'Formation changed: ' + this.value.toUpperCase());">
                    <option value="line" ${window.GameState.party.formation === 'line' ? 'selected' : ''}>Line</option>
                    <option value="shield_wall" ${window.GameState.party.formation === 'shield_wall' ? 'selected' : ''}>Shield Wall</option>
                    <option value="skirmish" ${window.GameState.party.formation === 'skirmish' ? 'selected' : ''}>Loose Skirmish</option>
                </select>
            </div>
            <div class="text-[10px] text-gray-400 font-bold uppercase mb-2">Issue Squad Command (Selected: ${window.GameState.party.selectedMembers.length})</div>
            <div class="grid grid-cols-5 gap-2">

                <button class="bg-gray-700 hover:bg-cyan-600 text-white text-[10px] py-2 rounded font-bold transition-colors" onclick="window.EventBus.emit('PARTY_COMMAND', 'follow')">Follow</button>
                <button class="bg-gray-700 hover:bg-yellow-600 text-white text-[10px] py-2 rounded font-bold transition-colors" onclick="window.EventBus.emit('PARTY_COMMAND', 'hold')">Hold</button>
                <button class="bg-gray-700 hover:bg-blue-600 text-white text-[10px] py-2 rounded font-bold transition-colors" onclick="window.EventBus.emit('PARTY_COMMAND', 'guard')">Guard</button>
                <button class="bg-gray-700 hover:bg-red-600 text-white text-[10px] py-2 rounded font-bold transition-colors" onclick="window.EventBus.emit('PARTY_COMMAND', 'attack')">Attack</button>
                <button class="bg-gray-700 hover:bg-purple-600 text-white text-[10px] py-2 rounded font-bold transition-colors" onclick="window.EventBus.emit('PARTY_COMMAND', 'retreat')">Retreat</button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
});

// Setup Initial Squad UI Container on Load
window.addEventListener('DOMContentLoaded', () => {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'squad-manager-panel';
    uiContainer.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-cyan-700 rounded-lg p-5 shadow-2xl z-40 hidden flex-col w-[450px] backdrop-blur-md';
    
    uiContainer.innerHTML = `
        <button onclick="document.getElementById('squad-manager-panel').classList.add('hidden'); document.getElementById('squad-manager-panel').classList.remove('flex');" class="absolute top-2 right-2 text-gray-500 hover:text-white font-bold">&times;</button>
        <div id="squad-manager-content"></div>
    `;
    
    document.body.appendChild(uiContainer);
    // Create Map Modal
    const mapModal = document.createElement('div');
    mapModal.id = 'faction-map-panel';
    mapModal.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-indigo-700 rounded-lg p-5 shadow-2xl z-40 hidden flex-col w-[600px] h-[600px] backdrop-blur-md';
    mapModal.innerHTML = `
        <button onclick="document.getElementById('faction-map-panel').classList.add('hidden'); document.getElementById('faction-map-panel').classList.remove('flex');" class="absolute top-2 right-2 text-gray-500 hover:text-white font-bold">&times;</button>
        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h2 class="text-indigo-400 font-bold tracking-widest text-sm uppercase">🗺️ Kingdom Cartography</h2>
            <div class="text-[10px] text-gray-400">Day <span id="map-day-counter">0</span></div>
        </div>
        <div id="map-canvas-container" class="relative flex-1 bg-gray-950 border border-gray-700 rounded overflow-hidden">
            <canvas id="faction-map-canvas" class="w-full h-full"></canvas>
            <div id="map-tooltip" class="absolute bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg border border-gray-600 hidden pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] z-50"></div>
        </div>
        <div class="mt-4 flex justify-between text-[10px] uppercase font-bold text-gray-400">
            <div class="flex items-center gap-2"><div class="w-3 h-3 bg-blue-500 rounded-full"></div> Kingdom Control</div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 bg-red-900 rounded-full border border-red-500"></div> Forest Control (Occupied)</div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 bg-yellow-400 rotate-45"></div> The Capital</div>
        </div>
    `;
    document.body.appendChild(mapModal);
    
    // Add Map Button to HUD
    const hudControls = document.querySelector('#hud .flex.gap-2.pointer-events-auto');
    if (hudControls && !document.getElementById('btn-map')) {
        const mapBtn = document.createElement('button');
        mapBtn.id = 'btn-map';
        mapBtn.className = 'bg-indigo-900/60 hover:bg-indigo-700 text-indigo-200 hover:text-white px-3 py-1.5 rounded border border-indigo-800 transition-colors font-bold tracking-widest text-[10px] shadow-lg backdrop-blur-sm uppercase';
        mapBtn.innerText = 'MAP (M)';
        hudControls.appendChild(mapBtn);
        
        mapBtn.addEventListener('click', () => window.EventBus.emit('TOGGLE_MAP'));
    }
});

// ==========================================
// FACTION MAP RENDERING LOGIC
// ==========================================
window.EventBus.on('TOGGLE_MAP', () => {
    const panel = document.getElementById('faction-map-panel');
    if (!panel) return;
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
        window.EventBus.emit('RENDER_MAP');
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
});

window.EventBus.on('RENDER_MAP', () => {
    const canvas = document.getElementById('faction-map-canvas');
    if (!canvas || !window.VillageManager) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set actual canvas resolution to match display size to prevent blurring
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    document.getElementById('map-day-counter').innerText = window.EngineParams?.worldDay || 0;

    // Clear map
    ctx.fillStyle = '#030712'; // Very dark blue/gray
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const villages = window.VillageManager.villages;
    if (!villages || villages.length === 0) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Settlement web not yet generated.', canvas.width/2, canvas.height/2);
        return;
    }

    // Map bounds calculation (find the min/max X and Z coordinates)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    villages.forEach(v => {
        if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
        if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
    });
    
    // Add padding to bounds
    const padding = 15000;
    minX -= padding; maxX += padding; minZ -= padding; maxZ += padding;
    
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const scaleX = canvas.width / rangeX;
    const scaleZ = canvas.height / rangeZ;
    const scale = Math.min(scaleX, scaleZ) * 0.9; // Keep aspect ratio, zoom out slightly
    
    const offsetX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
    const offsetZ = canvas.height / 2 - ((minZ + maxZ) / 2) * scale;

    const toCanvas = (worldX, worldZ) => ({
        x: worldX * scale + offsetX,
        y: worldZ * scale + offsetZ
    });

    // 1. Draw Road Network (Connections)
    ctx.strokeStyle = '#374151'; // Gray-700
    ctx.lineWidth = 1.5;
    villages.forEach(v => {
        const start = toCanvas(v.x, v.z);
        v.connections.forEach(targetId => {
            const target = villages.find(t => t.id === targetId);
            if (target) {
                const end = toCanvas(target.x, target.z);
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        });
    });

    // 2. Draw Territory Radius
    villages.forEach(v => {
        const pos = toCanvas(v.x, v.z);
        const pixelRadius = (v.territory.radius || 90) * 10 * scale; // exaggerate radius for map visibility
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pixelRadius, 0, Math.PI * 2);
        
        if (v.territory.faction === 'forest') {
            ctx.fillStyle = 'rgba(127, 29, 29, 0.15)'; // Red tint for occupied
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red border
        } else {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Blue tint for kingdom
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; // Blue border
        }
        
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Store mapped positions for the hover tooltip
    canvas.mappedNodes = [];

    // 3. Draw Village Nodes
    villages.forEach(v => {
        const pos = toCanvas(v.x, v.z);
        
        // Save for hover detection
        canvas.mappedNodes.push({
            x: pos.x, y: pos.y,
            radius: 8,
            data: v
        });

        // Node Color based on status
        let fillColor = '#3b82f6'; // Default Blue
        let strokeColor = '#93c5fd';
        
        if (v.territory.faction === 'forest') {
            fillColor = '#450a0a'; // Dark Red
            strokeColor = '#ef4444';
        } else if (v.territory.underRaid) {
            fillColor = '#f59e0b'; // Amber (Under Attack)
            strokeColor = '#fcd34d';
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;

                if (v.capital) {
            // Draw a diamond for the capital
            const s = 8;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - s);
            ctx.lineTo(pos.x + s, pos.y);
            ctx.lineTo(pos.x, pos.y + s);
            ctx.lineTo(pos.x - s, pos.y);
            ctx.closePath();
            ctx.fillStyle = '#eab308'; // Gold
            ctx.strokeStyle = '#fef08a';
            ctx.fill();
            ctx.stroke();

                        // --- MONARCH ARMY STRENGTH DISPLAY ---
            if (v.royalArmySize) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`LEGION: ${Math.floor(v.royalArmySize)}`, pos.x, pos.y + 20);
            }
        } else {
            // ... existing code ...
            // Draw circle for standard village
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // --- NOBLE LEVY DISPLAY ---
            if (v.nobleLevySize) {
                ctx.fillStyle = '#60a5fa';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`LEVY: ${Math.floor(v.nobleLevySize)}`, pos.x, pos.y + 15);
            }
            
            if (v.terminusEliteGuard) {
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 9px monospace';
                ctx.fillText(`ELITE: ${v.terminusEliteGuard}`, pos.x, pos.y + 25);
            }
        }

        
        // Draw Village Name
        ctx.fillStyle = v.territory.faction === 'forest' ? '#ef4444' : '#9ca3af';
        ctx.font = v.capital ? 'bold 11px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(v.name, pos.x, pos.y - 12);
    });
    
    // Draw Player Position (if active)
    if (window.GameCore && window.GameCore.playerObj) {
        const pTrans = window.GameCore.playerObj.body.translation();
        const pPos = toCanvas(pTrans.x, pTrans.z);
        
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e'; // Green for player
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Pulse effect
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, 8 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.stroke();
    }
});

// Setup Hover Tooltips for the Map
window.addEventListener('DOMContentLoaded', () => {
    // We attach this via DOMContentLoaded to ensure the canvas exists when we bind the event
    setTimeout(() => {
        const canvas = document.getElementById('faction-map-canvas');
        const tooltip = document.getElementById('map-tooltip');
        
        if (canvas && tooltip) {
            canvas.addEventListener('mousemove', (e) => {
                if (!canvas.mappedNodes) return;
                
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                let hoveredNode = null;
                
                // Find if mouse is over any node
                for (const node of canvas.mappedNodes) {
                    const dx = mouseX - node.x;
                    const dy = mouseY - node.y;
                    if (dx*dx + dy*dy <= node.radius * node.radius * 4) { // slightly generous hitbox
                        hoveredNode = node;
                        break;
                    }
                }
                
                if (hoveredNode) {
                    const v = hoveredNode.data;
                    const isOccupied = v.territory.faction === 'forest';
                    
                    let html = `
                        <div class="font-bold text-sm ${isOccupied ? 'text-red-400' : 'text-blue-300'} mb-1">${v.name} ${v.capital ? '(Capital)' : ''}</div>
                        <div class="text-[9px] text-gray-400 mb-2">${v.nobleHouse} | ${v.industry?.industry || 'Unknown'}</div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span class="text-gray-500">Pop:</span> ${v.population?.current || 0}/${v.population?.capacity || 0}</div>
                            <div><span class="text-gray-500">Prosperity:</span> <span class="${v.stats.prosperity > 70 ? 'text-green-400' : 'text-white'}">${v.stats.prosperity}%</span></div>
                            <div><span class="text-gray-500">Food:</span> ${v.stats.food || 0}</div>
                            <div><span class="text-gray-500">Ward:</span> ${v.barrierIntegrity}%</div>
                        </div>
                    `;
                    
                    if (v.territory.underRaid) {
                        html += `<div class="mt-2 text-yellow-400 font-bold bg-yellow-900/30 px-1 py-0.5 rounded text-center">⚠️ UNDER ATTACK</div>`;
                    } else if (isOccupied) {
                        html += `<div class="mt-2 text-red-400 font-bold bg-red-900/30 px-1 py-0.5 rounded text-center">💀 OCCUPIED BY FOREST</div>`;
                    }
                    
                    tooltip.innerHTML = html;
                    tooltip.style.left = `${hoveredNode.x}px`;
                    tooltip.style.top = `${hoveredNode.y}px`;
                    tooltip.classList.remove('hidden');
                    canvas.style.cursor = 'pointer';
                } else {
                    tooltip.classList.add('hidden');
                    canvas.style.cursor = 'crosshair';
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                tooltip.classList.add('hidden');
            });
        }
    }, 1000);
});

window.EventBus.on('UI_LOG', (msg) => {
    const el = document.getElementById('event-log'); if(!el) return;
    const entry = document.createElement('div'); entry.innerText = `> ${msg}`; el.appendChild(entry); el.scrollTop = el.scrollHeight;
});

window.EventBus.on('UI_UPDATE_HUD', () => {
    document.getElementById('hp-bar').style.width = `${(window.GameState.pStats.hp / window.GameState.pStats.maxHp) * 100}%`;
    document.getElementById('stamina-bar').style.width = `${(window.GameState.pStats.stamina / window.GameState.pStats.maxStamina) * 100}%`;
    document.getElementById('poise-bar').style.width = `${(window.GameState.pStats.poise / window.GameState.pStats.maxPoise) * 100}%`;
    document.getElementById('hud-food').innerText = window.GameState.inventory.food; 
    document.getElementById('hud-gold').innerText = window.GameState.inventory.gold;
    const renownLine = document.getElementById('renown-line');
    const renown = window.GameState.renown || { title: 'Unknown', score: 0, infamy: 0 };
    if (renownLine) renownLine.innerText = `RENOWN | ${renown.title.toUpperCase()} ${renown.score} | INFAMY ${renown.infamy}`;
    const arenaLine = document.getElementById('arena-line');
    if (arenaLine) arenaLine.innerText = `ARENA | ${window.GameState.gladiator.matchState.toUpperCase()} | ${window.GameState.gladiator.objective}`;
    document.getElementById('rep-village').innerText = window.GameState.reputation.village; 
    document.getElementById('rep-adventurer').innerText = window.GameState.reputation.adventurer;
    document.getElementById('rep-monster').innerText = window.GameState.reputation.monster;
    document.getElementById('rep-village').className = window.GameState.reputation.village <= -50 ? 'text-red-500 font-bold' : 'text-blue-400';
    const statusText = window.GameState.statusEffects.map(effect => `${effect.type.toUpperCase()} ${Math.ceil(effect.remaining)}s`).join(' | ');
    let statusLine = document.getElementById('status-effects');
    if (!statusLine) { statusLine = document.createElement('div'); statusLine.id = 'status-effects'; statusLine.className = 'mt-2 text-[10px] font-mono text-green-300'; document.getElementById('hp-bar').parentElement.parentElement.appendChild(statusLine); }
    statusLine.textContent = statusText;
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
    window.EventBus.emit('UI_UPDATE_HUD');
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
        const price = window.GameCore.getMerchantPrice(entry.price, 'kingdom');
        return `<button class="merchant-buy-item border border-amber-700 bg-gray-900 p-2 text-left hover:border-amber-300 disabled:opacity-40" data-chest="${chest.id}" data-index="${index}" ${entry.quantity <= 0 ? 'disabled' : ''}>${item ? item.icon : '•'} ${item?.name || entry.itemId} <span class="float-right text-amber-300">${price}g | ${entry.quantity}</span></button>`;
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
    const selectedNames = window.GameState.party.members.filter(member => member.recruited && window.GameState.party.selectedMembers.includes(member.id)).map(member => member.name).join(', ') || 'No companions selected';
    dialogue.innerHTML = `<div class="mb-4 border-b border-amber-700 pb-3"><div class="text-amber-300 font-bold tracking-widest">${base.name.toUpperCase()}</div><div class="text-xs text-gray-500 mt-1">Storage | Structures ${base.structures.length} | Farms ${base.farms.length} | Research ${base.researchPoints || 0}${base.wardRadius ? ` | Ward ${base.wardRadius}m` : ''}</div></div><div class="grid grid-cols-2 gap-3"><div><div class="text-xs text-amber-200 mb-2">CAMP STORAGE</div><div class="grid gap-2">${stored}</div></div><div><div class="text-xs text-gray-300 mb-2">YOUR PACK</div><div class="grid gap-2">${carried}</div></div></div><div class="mt-4 border-t border-gray-700 pt-3"><div class="text-xs text-amber-200 mb-2">CONSTRUCTION</div><div class="grid grid-cols-2 gap-2"><button class="build-base-item border border-amber-700 px-2 py-2 text-xs hover:border-amber-300" data-prefab="Camp Storage Cache">Storage: 5 Wood, 2 Stone</button><button class="build-base-item border border-amber-700 px-2 py-2 text-xs hover:border-amber-300" data-prefab="Camp Farm Plot">Farm: 4 Wood, 1 Stone</button><button class="build-base-item col-span-2 border border-cyan-700 px-2 py-2 text-xs hover:border-cyan-300" data-prefab="Rune Tower">Rune Tower: 12 Wood, 10 Stone, 5 Research</button></div></div><div class="mt-4 border-t border-gray-700 pt-3"><div class="text-xs text-cyan-200 mb-1">SELECTED WORKERS</div><div class="text-[10px] text-gray-500 mb-2">${selectedNames}</div><div class="grid grid-cols-2 gap-2"><button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="farm">Farm</button><button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="research">Research</button><button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="guard">Guard</button><button class="assign-base-job border border-gray-600 px-2 py-2 text-xs hover:border-gray-300" data-job="idle">Idle</button></div></div><button id="btn-close-base" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelectorAll('.withdraw-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('WITHDRAW_BASE_ITEM', Number(button.dataset.index))));
    dialogue.querySelectorAll('.deposit-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('DEPOSIT_BASE_ITEM', Number(button.dataset.index))));
    dialogue.querySelectorAll('.build-base-item').forEach(button => button.addEventListener('click', () => { window.EventBus.emit('BUILD_BASE_STRUCTURE', button.dataset.prefab); openPlayerCamp(); }));
    dialogue.querySelectorAll('.assign-base-job').forEach(button => button.addEventListener('click', () => window.EventBus.emit('ASSIGN_BASE_JOB', button.dataset.job)));
    dialogue.querySelector('#btn-close-base').addEventListener('click', closeCompanionDialogue);
}

function openGladiatorProfile() {
    const dialogue = document.getElementById('companion-dialogue');
    const gladiator = window.GameState.gladiator;
    const weapon = window.GameState.inventory.equipment.weapon || 'unarmed';
    const injuries = gladiator.injuries.length ? gladiator.injuries.map(injury => `<li>${injury}</li>`).join('') : '<li>No recorded injuries</li>';
    const injuryCost = (window.GameState.combatRecord?.injuries?.length || 0) * 10;
    dialogue.innerHTML = `<div class="mb-4 border-b border-orange-700 pb-3"><div class="text-orange-300 font-bold tracking-widest">GLADIATOR PROFILE</div><div class="text-xs text-gray-500 mt-1">${gladiator.name} | ${gladiator.matchState.toUpperCase()}</div></div><div class="grid grid-cols-2 gap-3 mb-4 text-xs"><div><div class="text-gray-500">FAME</div><div class="text-white text-lg font-bold">${gladiator.fame}</div></div><div><div class="text-gray-500">GOLD</div><div class="text-amber-300 text-lg font-bold">${gladiator.gold}</div></div><div><div class="text-gray-500">RENOWN</div><div class="text-amber-200">${window.GameState.renown.title} ${window.GameState.renown.score}</div></div><div><div class="text-gray-500">INFAMY</div><div class="text-red-300">${window.GameState.renown.infamy}</div></div><div><div class="text-gray-500">RECORD</div><div class="text-white">${gladiator.wins}W - ${gladiator.losses}L</div></div><div><div class="text-gray-500">WEAPON</div><div class="text-white">${window.ItemDatabase[weapon]?.name || weapon}</div></div></div><div class="border-t border-gray-800 pt-3 mb-4"><div class="text-xs text-orange-200 mb-1">CURRENT OBJECTIVE</div><div class="text-gray-300">${gladiator.objective}</div></div><div class="border-t border-gray-800 pt-3 mb-4"><div class="text-xs text-red-300 mb-1">INJURIES</div><ul class="text-xs text-gray-400 list-disc list-inside">${injuries}</ul></div><div class="grid grid-cols-3 gap-2"><button id="btn-start-gladiator-match" class="border border-orange-700 px-3 py-2 text-xs text-orange-200 hover:border-orange-300">Start Match</button><button id="btn-treat-gladiator" class="border border-green-700 px-3 py-2 text-xs text-green-200 hover:border-green-300">Treat ${injuryCost}g</button><button id="btn-close-gladiator-profile" class="border border-gray-600 px-3 py-2 text-xs hover:border-gray-300">Close</button></div>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-start-gladiator-match').addEventListener('click', () => { dialogue.classList.add('hidden'); window.EventBus.emit('START_ARENA_MATCH'); });
    dialogue.querySelector('#btn-treat-gladiator').addEventListener('click', () => { window.GameCore.treatCombatInjuries(); openGladiatorProfile(); });
    dialogue.querySelector('#btn-close-gladiator-profile').addEventListener('click', closeCompanionDialogue);
}

window.EventBus.on('OPEN_GLADIATOR_PROFILE', openGladiatorProfile);

function openArenaResult({ result, reward = 0 }) {
    const dialogue = document.getElementById('companion-dialogue');
    const gladiator = window.GameState.gladiator;
    const victory = result === 'victory';
    const injuries = gladiator.injuries.length ? gladiator.injuries[gladiator.injuries.length - 1] : 'No new injuries';
    dialogue.innerHTML = `<div class="mb-4 border-b ${victory ? 'border-amber-700' : 'border-red-700'} pb-3"><div class="${victory ? 'text-amber-300' : 'text-red-300'} font-bold tracking-widest">${victory ? 'ARENA VICTORY' : 'ARENA DEFEAT'}</div><div class="text-xs text-gray-500 mt-1">${gladiator.name}</div></div><div class="grid grid-cols-2 gap-3 mb-4 text-xs"><div><div class="text-gray-500">REWARD</div><div class="text-amber-300 text-lg font-bold">${reward} GOLD</div></div><div><div class="text-gray-500">FAME</div><div class="text-white text-lg font-bold">${gladiator.fame}</div></div><div><div class="text-gray-500">RECORD</div><div class="text-white">${gladiator.wins}W - ${gladiator.losses}L</div></div><div><div class="text-gray-500">INJURY</div><div class="text-red-300">${injuries}</div></div></div><div class="grid grid-cols-2 gap-2"><button id="btn-result-profile" class="border border-orange-700 px-3 py-2 text-xs text-orange-200 hover:border-orange-300">Gladiator Profile</button><button id="btn-result-exit" class="border border-gray-600 px-3 py-2 text-xs hover:border-gray-300">Return to World</button></div>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-result-profile').addEventListener('click', openGladiatorProfile);
    dialogue.querySelector('#btn-result-exit').addEventListener('click', () => { dialogue.classList.add('hidden'); window.EventBus.emit('EXIT_ARENA_TEST'); });
}

window.EventBus.on('OPEN_ARENA_RESULT', openArenaResult);

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
    const pack = window.GameState.inventory.backpack;
    const gold = window.GameState.inventory.gold;

    const runeRows = Object.entries(runeRecipes).map(([runeId, cost]) => {
        const rune = window.ItemDatabase[runeId];
        const canAfford = gold >= cost.gold && pack.filter(id => id === 'wood').length >= cost.wood && pack.filter(id => id === 'stone').length >= cost.stone;
        return `<button class="craft-rune border border-orange-700 bg-gray-900 p-2 text-left hover:border-orange-300 disabled:opacity-50" data-rune="${runeId}" ${!canAfford ? 'disabled' : ''}>
            ${rune.icon} Craft ${rune.name}
            <span class="float-right text-amber-300 text-[9px]">${cost.gold}g, ${cost.wood}w, ${cost.stone}s</span>
        </button>`;
    }).join('');

    const prosthetics = [
        { type: 'clockwork', side: 'leftArm', label: 'Clockwork Arm (L)' },
        { type: 'clockwork', side: 'rightArm', label: 'Clockwork Arm (R)' },
        { type: 'clockwork', side: 'leftLeg', label: 'Clockwork Leg (L)' },
        { type: 'clockwork', side: 'rightLeg', label: 'Clockwork Leg (R)' },
        { type: 'void', side: 'leftArm', label: 'Void Arm (L)' },
        { type: 'void', side: 'rightArm', label: 'Void Arm (R)' },
        { type: 'void', side: 'leftLeg', label: 'Void Leg (L)' },
        { type: 'void', side: 'rightLeg', label: 'Void Leg (R)' }
    ];

    const prostheticRows = prosthetics.map(p => {
        const type = p.type;
        const side = p.side;
        const costs = {
            'clockwork': { gold: 250, wood: 10, stone: 5 },
            'void': { gold: 1000, corrupted_resin: 15, beast_bones: 10 }
        };
        const cost = costs[type];
        let canAfford = gold >= cost.gold;
        let costLabel = `${cost.gold}g`;
        for (const [res, amt] of Object.entries(cost)) {
            if (res === 'gold') continue;
            const count = pack.filter(id => id === res).length;
            if (count < amt) canAfford = false;
            costLabel += `, ${amt}${res[0]}`;
        }

        return `<button class="forge-prosthetic border border-orange-700 bg-gray-900 p-2 text-left hover:border-orange-300 disabled:opacity-50" data-type="${type}" data-side="${side}" ${!canAfford ? 'disabled' : ''}>
            🛠️ Forge ${p.label}
            <span class="float-right text-amber-300 text-[9px]">${costLabel}</span>
        </button>`;
    }).join('');

    // Upgrade Section (Tempering & Masterworking)
    const equippedItems = Object.entries(window.GameState.inventory.equipment)
        .filter(([slot, id]) => id !== null)
        .map(([slot, id]) => ({ slot, id, ...window.ItemDatabase[id] }));

    const upgradeRows = equippedItems.map(item => {
        const mwCost = (item.masterworkLevel || 0) * 100 + 100;
        const canMW = gold >= mwCost;
        
        return `
            <div class="border border-gray-700 bg-gray-900 p-2 mb-2 rounded">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-white font-bold text-xs">${item.icon} ${item.name} (Rank ${item.masterworkLevel || 0})</span>
                    <button class="masterwork-btn bg-amber-700 hover:bg-amber-600 px-2 py-1 text-[9px] rounded disabled:opacity-50" data-id="${item.id}" ${!canMW ? 'disabled' : ''}>
                        MASTERWORK (${mwCost}g)
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-1">
                    ${Object.entries(window.BlacksmithManager.temperingRecipes).map(([key, recipe]) => {
                        let canTemper = true;
                        let costStr = "";
                        for (const [res, amt] of Object.entries(recipe.cost)) {
                            const count = pack.filter(id => id === res).length;
                            if (count < amt) canTemper = false;
                            costStr += `${amt}${res[0]} `;
                        }
                        return `<button class="temper-btn border border-gray-600 bg-gray-800 p-1 text-[9px] hover:border-orange-400 disabled:opacity-50" data-id="${item.id}" data-recipe="${key}" ${!canTemper ? 'disabled' : ''}>
                            ${recipe.name} (${costStr})
                        </button>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    dialogue.innerHTML = `
        <div class="mb-4 border-b border-orange-700 pb-3">
            <div class="text-orange-300 font-bold tracking-widest uppercase">Ancient Runic Blacksmith</div>
            <div class="text-[10px] text-gray-500 mt-1">Gold: ${gold} | Mastery: ${window.GameState.renown.score}</div>
        </div>
        
        <div class="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            <div class="text-xs text-orange-200 mb-2 uppercase font-bold border-l-2 border-orange-600 pl-2">Rune Binding</div>
            <div class="grid gap-1 mb-4">${runeRows}</div>

            <div class="text-xs text-orange-200 mb-2 uppercase font-bold border-l-2 border-orange-600 pl-2">Prosthetic Forging</div>
            <div class="grid gap-1 mb-4">${prostheticRows}</div>

            <div class="text-xs text-orange-200 mb-2 uppercase font-bold border-l-2 border-orange-600 pl-2">Equipment Modification</div>
            <div class="space-y-1 mb-4">${upgradeRows || '<div class="text-gray-500 text-[10px]">No equipment to modify.</div>'}</div>
        </div>

        <button id="btn-close-forge" class="w-full mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-orange-400">Leave Forge</button>
    `;

    dialogue.classList.remove('hidden');

    dialogue.querySelectorAll('.craft-rune').forEach(btn => btn.addEventListener('click', () => { window.EventBus.emit('CRAFT_RUNE', btn.dataset.rune); openArmorerForge(); }));
    dialogue.querySelectorAll('.forge-prosthetic').forEach(btn => btn.addEventListener('click', () => { window.BlacksmithManager.forgeProsthetic(btn.dataset.type, btn.dataset.side); openArmorerForge(); }));
    dialogue.querySelectorAll('.masterwork-btn').forEach(btn => btn.addEventListener('click', () => { window.BlacksmithManager.masterwork(btn.dataset.id); openArmorerForge(); }));
    dialogue.querySelectorAll('.temper-btn').forEach(btn => btn.addEventListener('click', () => { window.BlacksmithManager.temperItem(btn.dataset.id, btn.dataset.recipe); openArmorerForge(); }));
    dialogue.querySelector('#btn-close-forge').addEventListener('click', closeCompanionDialogue);
}


function openTreatmentCenter() {
    const dialogue = document.getElementById('companion-dialogue');
    const injuryCount = window.GameState.combatRecord?.injuries?.length || 0;
    const injuryCost = injuryCount * 10;
    dialogue.innerHTML = `<div class="mb-4 border-b border-green-700 pb-3"><div class="text-green-300 font-bold tracking-widest">PLAGUE TREATMENT</div><div class="text-xs text-gray-500 mt-1">Restore the party and tend injuries.</div></div><button id="btn-treatment" class="w-full border border-green-700 bg-gray-900 p-3 text-left hover:border-green-300">Treat Party <span class="float-right text-amber-300">10g</span></button><button id="btn-combat-treatment" class="mt-2 w-full border border-orange-700 bg-gray-900 p-3 text-left hover:border-orange-300">Treat Combat Injuries <span class="float-right text-amber-300">${injuryCost}g</span></button><button id="btn-close-treatment" class="mt-3 border border-gray-600 px-3 py-2 text-xs hover:border-green-400">Leave</button>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-treatment').addEventListener('click', () => window.EventBus.emit('TREAT_PARTY'));
    dialogue.querySelector('#btn-combat-treatment').addEventListener('click', () => { window.GameCore.treatCombatInjuries(); openTreatmentCenter(); });
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
    
    // Check for Huntsman Scorn (Village Outcast)
    if (window.EncounterDirector && window.EncounterDirector.huntsmanMarkTimer > 0) {
        const playerPosition = window.GameCore.playerObj.visual.position;
        const inVillage = window.RoadManager.isVillageProtected(playerPosition);
        
        if (inVillage) {
            window.EventBus.emit('UI_LOG', `[OUTCAST] The villagers recoil at the Huntsman's mark. "Away with you, cursed one!"`);
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'SHUNNED', pos: playerPosition, color: '#f87171' });
            return; // Block interaction in villages
        }
    }

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
    const price = window.GameCore.getMerchantPrice(stock.price, 'kingdom');
    if (window.GameState.inventory.gold < price) {
        window.EventBus.emit('UI_LOG', 'Not enough gold.');
        return;
    }
    if (window.GameState.inventory.backpack.length >= 25) {
        window.EventBus.emit('UI_LOG', 'Backpack is full.');
        return;
    }
    window.GameState.inventory.gold -= price;
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
    
    // --- PHASE 2: BLACKSMITH & RUNE ENGINEER XP ---
    window.CareerManager.addXP('blacksmith', 30);
    window.CareerManager.addXP('rune_engineer', 15);
    
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
    if (village) {
        village.stats[quest.resource] = (village.stats[quest.resource] || 0) + quest.amount;
        if (quest.purpose === 'reclaiming occupied territory' && village.territory?.reclamation?.[quest.resource] !== undefined) {
            village.territory.reclamation[quest.resource] += quest.amount;
            const reclaim = village.territory.reclamation;
            const activeRaiders = window.GameCore.activeEntities.some(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && Math.hypot(entity.visual.position.x - village.x, entity.visual.position.z - village.z) <= village.territory.radius);
            if (!activeRaiders && reclaim.wood >= reclaim.requiredWood && reclaim.stone >= reclaim.requiredStone) {
                village.territory.faction = 'kingdom';
                village.territory.control = 50;
                village.territory.underRaid = false;
                village.territory.reclamation = null;
                village.stats.prosperity = Math.min(100, (village.stats.prosperity || 0) + 20);
                window.EventBus.emit('UI_LOG', `[RECLAIMED] ${village.name} returned to Kingdom control.`);
            }
        }
    }
    window.GameState.inventory.gold += quest.reward;
    window.GameCore.recordRenown({ renown: 5, faction: 'village', reason: `fulfilled ${village?.name || 'village'} request` });
    window.GameState.questBoard.splice(questIndex, 1);
    window.EventBus.emit('UI_LOG', `Delivered ${quest.amount} ${quest.resource}. Earned ${quest.reward} gold.`);
    closeCompanionDialogue();
    window.EventBus.emit('UI_UPDATE_HUD');
    window.EventBus.emit('RENDER_INVENTORY');
});

  window.EventBus.on('PICKUP_GROUND_LOOT', lootId => {
      const lootIndex = window.GameCore.groundLoot.findIndex(entry => entry.id === lootId);
      if (lootIndex < 0) return;
        
      const [loot] = window.GameCore.groundLoot.splice(lootIndex, 1);
        
      // --- PHASE 1: GATHERER CAREER XP ---
      if (loot.itemId === 'food') {
           // If it came from a "Berry Bush" or similar
           window.CareerManager.addXP('gatherer', 10);
      }

      if (window.GameState.inventory.backpack.length >= 25) {
          window.EventBus.emit('UI_LOG', 'Backpack is full.');
          window.GameCore.groundLoot.push(loot); // Put it back
          return;
      }
        
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

window.EventBus.on('ASSIGN_BASE_JOB', job => {
    const selectedMembers = window.GameState.party.members.filter(member => member.recruited && window.GameState.party.selectedMembers.includes(member.id));
    if (!selectedMembers.length) {
        window.EventBus.emit('UI_LOG', 'Select companions through their dialogue before assigning camp work.');
        return;
    }
    selectedMembers.forEach(member => { member.job = job; });
    window.EventBus.emit('UI_LOG', `${selectedMembers.map(member => member.name).join(', ')} assigned to ${job} duty.`);
    openPlayerCamp();
});
window.EventBus.on('DEV_TOOLS_TOGGLE_ASSETS', () => {
    const panel = document.getElementById('asset-manager-panel');
    if(panel) { panel.classList.toggle('hidden'); panel.classList.toggle('flex'); if(!panel.classList.contains('hidden')) window.EventBus.emit('RENDER_ASSETS'); }
});

document.getElementById('btn-close-asset')?.addEventListener('click', () => { document.getElementById('asset-manager-panel').classList.add('hidden'); document.getElementById('asset-manager-panel').classList.remove('flex'); });
document.getElementById('btn-stats')?.addEventListener('click', () => document.getElementById('stats-panel').classList.toggle('hidden'));
document.getElementById('btn-inv')?.addEventListener('click', () => { document.getElementById('inventory-panel').classList.toggle('hidden'); if(!document.getElementById('inventory-panel').classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); });
document.getElementById('btn-asset')?.addEventListener('click', () => { window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS'); });

// Add Squad Button to HUD if it exists
window.addEventListener('DOMContentLoaded', () => {
    const hudControls = document.querySelector('#hud .flex.gap-2.pointer-events-auto');
    if (hudControls && !document.getElementById('btn-squad')) {
        const squadBtn = document.createElement('button');
        squadBtn.id = 'btn-squad';
        squadBtn.className = 'bg-cyan-900/60 hover:bg-cyan-700 text-cyan-200 hover:text-white px-3 py-1.5 rounded border border-cyan-800 transition-colors font-bold tracking-widest text-[10px] shadow-lg backdrop-blur-sm uppercase';
        squadBtn.innerText = 'SQUAD (G)';
        hudControls.appendChild(squadBtn);
        
        squadBtn.addEventListener('click', () => window.EventBus.emit('TOGGLE_SQUAD_MANAGER'));
    }
});



