let floatingTexts = [];

// ==========================================
// INTEL UI (Phase 6.4)
// ==========================================

window.EventBus.on('TOGGLE_INTEL_BAG', () => { if (window.UIEngineInstance) { window.UIEngineInstance.components.get('intel-bag').toggle(); } });

window.EventBus.on('RENDER_INTEL_BAG', () => {
    const panel = document.getElementById('intel-bag-panel');
    if (!panel || !window.IntelManager) return;
    
    // Assumes 'player_node' is the physical owner
    const playerIntel = window.IntelManager.getIntelForNode('player_node');
    
    let html = `
        <div class="flex justify-between items-center mb-4 border-b border-blue-700 pb-2">
            <h2 class="text-blue-400 font-bold tracking-widest text-sm uppercase">📜 Personal Ledger</h2>
            <div class="text-[10px] text-gray-400">Total Records: ${playerIntel.length}</div>
        </div>
        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
    `;

    if (playerIntel.length === 0) {
        html += `<div class="text-gray-500 text-center text-xs py-4">Your ledger is empty. Speak to the world.</div>`;
    } else {
        playerIntel.forEach(intel => {
            const isFact = intel.type === window.IntelEnums.TYPES.FACT;
            const borderClass = isFact ? 'border-green-700/50' : 'border-gray-700 hover:border-blue-500/50';
            const rarityColors = {
                COMMON: 'text-gray-400', UNCOMMON: 'text-green-400', RARE: 'text-blue-400',
                RESTRICTED: 'text-purple-400', SECRET: 'text-red-400', LEGENDARY: 'text-yellow-400'
            };
            const rColor = rarityColors[intel.rarity] || 'text-gray-400';
            const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);

            html += `
                <div class="bg-gray-800/80 p-3 border ${borderClass} rounded flex flex-col gap-2">
                    <div class="flex justify-between items-start">
                        <div class="font-bold text-white text-xs">${intel.payload.title}</div>
                        <div class="text-[9px] px-1 py-0.5 rounded bg-gray-900 border border-gray-700 ${rColor}">${intel.rarity}</div>
                    </div>
                    <div class="text-[10px] text-gray-400 leading-snug">${intel.payload.description}</div>
                    
                    <div class="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-700/50">
                        <div class="flex flex-col">
                            <span class="text-[8px] uppercase text-gray-500">Type</span>
                            <span class="text-[10px] ${isFact ? 'text-green-400' : 'text-yellow-400'} font-bold">${intel.type}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] uppercase text-gray-500">Certainty</span>
                            <span class="text-[10px] text-white">${Math.floor(intel.certainty * 100)}%</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] uppercase text-gray-500">Age / Gen</span>
                            <span class="text-[10px] text-white">${age}d / G${intel.spread_generation}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] uppercase text-gray-500">Base Value</span>
                            <span class="text-[10px] text-amber-300 font-bold">${window.IntelEconomy.calculateValue(intel, {id: 'null_buyer'})}g</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>
        <button onclick="window.EventBus.emit('TOGGLE_INTEL_BAG')" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-blue-400 transition-colors w-full text-center">Close Ledger</button>
    `;

    panel.innerHTML = html;
});

// ==========================================
// INTEL DEBUG VIEW (Developer Only)
// ==========================================

window.EventBus.on('TOGGLE_INTEL_DEBUG', () => { if (window.UIEngineInstance) { window.UIEngineInstance.components.get('intel-debug').toggle(); } });

window.EventBus.on('RENDER_INTEL_DEBUG', () => {
    const panel = document.getElementById('intel-debug-panel');
    if (!panel || !window.IntelManager) return;

    const allRecords = Array.from(window.IntelManager.registry.values());
    const archiveRecords = Array.from(window.IntelManager.archive.values());
    
    let html = `
        <div class="flex justify-between items-center mb-4 border-b border-red-700 pb-2">
            <h2 class="text-red-400 font-bold tracking-widest text-sm uppercase">⚠️ IntelManager Diagnostic Terminal</h2>
            <div class="text-[10px] text-gray-400">Active: ${allRecords.length} | Archive: ${archiveRecords.length}</div>
        </div>
        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-gray-500 border-b border-gray-800">
                        <th class="py-2">ID / Version</th>
                        <th class="py-2">Title</th>
                        <th class="py-2">Holders</th>
                        <th class="py-2">Gen</th>
                        <th class="py-2">Cert / Truth</th>
                        <th class="py-2">Supp</th>
                        <th class="py-2">Lineage Depth</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
    `;

    allRecords.forEach(intel => {
        const holders = window.IntelManager.ownershipRegistry.get(intel.intel_id);
        const holderCount = holders ? holders.size : 0;
        const lineage = window.IntelManager.resolveLineage(intel.intel_id);
        
        const truthColor = intel.truth_state === 'TRUE' ? 'text-green-500' : (intel.truth_state === 'FALSE' ? 'text-red-500' : 'text-yellow-500');

        html += `
            <tr class="hover:bg-gray-900 transition-colors">
                <td class="py-2 text-gray-500 truncate max-w-[100px]" title="${intel.intel_id}">${intel.intel_id.substring(0,12)} (v${intel.version})</td>
                <td class="py-2 text-blue-300 truncate max-w-[150px]">${intel.payload.title}</td>
                <td class="py-2 ${holderCount === 0 ? 'text-red-400 font-bold' : 'text-white'}">${holderCount}</td>
                <td class="py-2 text-gray-400">G${intel.spread_generation}</td>
                <td class="py-2"><span class="text-white">${intel.certainty.toFixed(2)}</span> / <span class="font-bold ${truthColor}">${intel.truth_state.substring(0,1)}</span></td>
                <td class="py-2 text-purple-400">${intel.suppression_level}</td>
                <td class="py-2 text-gray-400">${lineage.length}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <button onclick="window.EventBus.emit('TOGGLE_INTEL_DEBUG')" class="mt-4 border border-gray-800 px-3 py-2 text-xs hover:border-red-400 transition-colors w-full text-center text-red-500">Close Diagnostic</button>
    `;
    panel.innerHTML = html;
});

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

// ==========================================
// PHASE 6.4E: INTEL TAGS (World Intelligence Overlays)
// ==========================================
const intelTags = new Map(); // entity_id -> DOM Element

window.EventBus.on('UI_TICK', ({ delta, camera }) => {
    window.EventBus.emit('UI_UPDATE_HUD');
    if(!camera) return;

    // 1. Floating Text updates
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

    // 2. Intel Tags (Phase 6.4E) Updates
    if (window.IntelManager && window.GameCore?.activeEntities) {
        const tagLayer = document.getElementById('intel-tags-layer');
        if (tagLayer) {
            window.GameCore.activeEntities.forEach(entity => {
                if (!entity.visual || !entity.id) return;
                
                // Only evaluate Brokers, Hubs, or specific marked NPCs for now to save performance
                if (entity.def.serviceType !== 'broker' && entity.def.type !== 'hub') return;
                
                // Distance cull (Only show tags if within 40 meters)
                const distSq = entity.visual.position.distanceToSquared(window.GameCore.playerObj.visual.position);
                if (distSq > 1600) {
                    if (intelTags.has(entity.id)) {
                        intelTags.get(entity.id).style.display = 'none';
                    }
                    return;
                }

                // Check if they hold any intelligence the player DOESN'T know
                const theirIntel = window.IntelManager.getIntelForNode(entity.id);
                const myIntel = window.IntelManager.getIntelForNode('player_node');
                
                // Find highest value secret they hold that player lacks
                let topSecret = null;
                let topVal = 0;
                
                for (const intel of theirIntel) {
                    if (!myIntel.some(m => m.intel_id === intel.intel_id || m.parent_intel_id === intel.intel_id)) {
                        const val = window.IntelEconomy.calculateValue(intel, {id: 'player_node'});
                        if (val > topVal) {
                            topVal = val;
                            topSecret = intel;
                        }
                    }
                }

                let el = intelTags.get(entity.id);
                
                if (!topSecret) {
                    // Hide tag if they have nothing to say
                    if (el) el.style.display = 'none';
                    return;
                }

                // Create element if it doesn't exist
                if (!el) {
                    el = document.createElement('div');
                    el.className = 'absolute flex flex-col items-center pointer-events-none transition-opacity duration-300';
                    tagLayer.appendChild(el);
                    intelTags.set(entity.id, el);
                }

                // Update icon based on Rarity/Type
                let icon = '📜';
                if (topSecret.type === window.IntelEnums.TYPES.WARNING) icon = '⚠️';
                if (topSecret.type === window.IntelEnums.TYPES.FACT) icon = '👁️';
                
                let colorClass = 'text-gray-300';
                if (topSecret.rarity === window.IntelEnums.RARITY.RARE) colorClass = 'text-blue-400';
                if (topSecret.rarity === window.IntelEnums.RARITY.RESTRICTED) colorClass = 'text-purple-400';
                if (topSecret.rarity === window.IntelEnums.RARITY.SECRET) colorClass = 'text-red-400';
                if (topSecret.rarity === window.IntelEnums.RARITY.LEGENDARY) colorClass = 'text-yellow-400';

                el.innerHTML = `
                    <span class="text-sm shadow-black drop-shadow-md filter ${colorClass}">${icon}</span>
                    <span class="text-[8px] font-bold bg-black/60 px-1 rounded border border-gray-700 ${colorClass}">${topSecret.type}</span>
                `;

                // Project to screen
                const pVec = entity.visual.position.clone();
                pVec.y += (entity.def.height || 2) + 1.5; // Hover above head
                pVec.project(camera);
                
                if (pVec.z > 1) { 
                    el.style.display = 'none'; 
                } else {
                    el.style.display = 'flex'; 
                    el.style.left = `${(pVec.x * 0.5 + 0.5) * window.innerWidth}px`; 
                    el.style.top = `${-(pVec.y * 0.5 - 0.5) * window.innerHeight}px`; 
                    // Fade out based on distance
                    const opacity = Math.max(0, 1.0 - (distSq / 1600));
                    el.style.opacity = opacity;
                }
            });
        }
    }

    const safeUI = document.getElementById('safe-zone-indicator');
    if(safeUI && window.GameCore.playerObj) {
        if(window.EngineParams.isPlayerSafe) safeUI.classList.remove('hidden'); else safeUI.classList.add('hidden');
    }
    
    // --- PHASE 6.5: INVESTIGATION TRACKER UPDATE ---
    updateInvestigationHUD();
});

// ==========================================
// PHASE 6.5: VERIFICATION INPUT WIRING
// ==========================================
function updateInvestigationHUD() {
    const tracker = document.getElementById('investigation-tracker');
    const state = window.GameState.investigation;
    
    if (!state || !state.activeIntelId || !window.GameCore.playerObj) {
        if (tracker && !tracker.classList.contains('hidden')) tracker.classList.add('hidden');
        return;
    }
    
    const intel = window.IntelManager.lookup(state.activeIntelId);
    if (!intel || intel.certainty >= 1.0 || intel.persistence !== window.IntelEnums.PERSISTENCE.ACTIVE) {
        // Abandon focus if verified or lost
        window.GameState.investigation.activeIntelId = null;
        return;
    }
    
    if (tracker) {
        tracker.classList.remove('hidden');
        const pPos = window.GameCore.playerObj.visual.position;
        const target = intel.payload.target_coord;
        
        // Calculate Distance
        const distSq = (pPos.x - target.x)**2 + (pPos.z - target.z)**2;
        
        document.getElementById('inv-title').innerText = intel.payload.title;
        // DISTANCE UI REMOVED - The player must navigate using landmarks and lore, not a GPS.
        
        // --- VERIFICATION TRIGGERS ---
        // If within 30 meters of the target coordinate, attempt verification
        if (distSq <= 900) {
            // Check Complexity Cost
            let canVerify = true;
            if (intel.verification_complexity === 'HARD' || intel.verification_complexity === 'EXPERT' || intel.verification_complexity === 'LEGENDARY') {
                const hasArchivist = window.GameState.party.members.some(m => m.recruited && m.role === 'Archivist' && !m.downed);
                if (!hasArchivist && intel.verification_complexity === 'LEGENDARY') {
                    canVerify = false;
                    if (Math.random() < 0.05) window.EventBus.emit('UI_LOG', `[FOCUS] The truth here is obscured. You require an Archivist's eyes.`);
                }
            }

            if (canVerify && !state.verifying) {
                state.verifying = true; // Prevent spam
                
                const truthConditionMet = intel.truth_state === window.IntelEnums.TRUTH_STATE.TRUE;
                
                window.EventBus.emit('UI_LOG', `[FOCUS] The culmination of your search is at hand...`);
                
                setTimeout(() => {
                    const newId = window.IntelEconomy.verifyIntel(intel.intel_id, {id: 'player_node', faction: 'Player'}, truthConditionMet);
                    if (newId) {
                        // Investigation complete, reward XP
                        window.CareerManager?.addXP('archivist', 50);
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'TRUTH REVEALED', pos: pPos, color: '#a855f7' });
                        window.GameState.investigation.activeIntelId = null;
                        state.verifying = false;
                    }
                }, 2000);
            }
        } else {
            state.verifying = false;
        }
    }
}

window.EventBus.on('START_INVESTIGATION', (intelId) => {
    const intel = window.IntelManager.lookup(intelId);
    if (!intel || intel.certainty >= 1.0) {
        window.EventBus.emit('UI_LOG', 'Cannot focus. Record is either already verified or corrupted.');
        return;
    }
    
    window.GameState.investigation = {
        activeIntelId: intelId,
        verifying: false
    };
    
    window.EventBus.emit('UI_LOG', `[FOCUS] Your mind locks onto the possibility of: ${intel.payload.title}`);
    closeCompanionDialogue();
});

window.EventBus.on('PLAYER_LEVEL_UP', ({ statName, level }) => { window.EventBus.emit('UI_LOG', `Level Up! ${statName.toUpperCase()} is now ${level}`); });



    dialogue.querySelector('#btn-treat-gladiator').addEventListener('click', () => { window.GameCore.treatCombatInjuries(); openGladiatorProfile(); });
    dialogue.querySelector('#btn-close-gladiator-profile').addEventListener('click', closeCompanionDialogue);
}




}




    dialogue.querySelector('#btn-close-treatment').addEventListener('click', closeCompanionDialogue);
}



// ==========================================
// PHASE 6.4C: ORACLE BOARD (Public Knowledge Terminal)
// ==========================================


    if (state.filter !== 'ALL') {
        displayIntel = displayIntel.filter(intel => intel.payload.tags.includes(state.filter.toLowerCase()));
    }

    // Sort by Priority (Significance)
    displayIntel.sort((a, b) => window.IntelPropagation._calculatePriority(b) - window.IntelPropagation._calculatePriority(a));

    const tabs = ['BOARD', 'ARCHIVE', 'DISPUTES'].map(t => 
        `<button class="px-3 py-1 text-[10px] font-bold border-b-2 ${state.tab === t ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'} transition-colors" onclick="window.OracleBoardState.tab='${t}'; window.OracleBoardState.selectedIntelId=null; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">${t}</button>`
    ).join('');

    const filters = ['ALL', 'MONSTER', 'TRADE', 'POLITICAL', 'WAR'].map(f => 
        `<button class="px-2 py-0.5 text-[9px] rounded border ${state.filter === f ? 'bg-cyan-900 border-cyan-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition-colors" onclick="window.OracleBoardState.filter='${f}'; window.OracleBoardState.selectedIntelId=null; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">${f}</button>`
    ).join('');

    // List Generation
    const listRows = displayIntel.map(intel => {
        const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);
        const certColor = intel.certainty > 0.8 ? 'text-green-400' : (intel.certainty > 0.4 ? 'text-yellow-400' : 'text-red-400');
        const isSelected = state.selectedIntelId === intel.intel_id;
        
        return `
            <div class="border ${isSelected ? 'border-cyan-500 bg-gray-800' : 'border-gray-700 bg-gray-900'} p-2 cursor-pointer hover:border-cyan-400 transition-colors mb-1" onclick="window.OracleBoardState.selectedIntelId='${intel.intel_id}'; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-white font-bold text-[10px] truncate max-w-[150px]">${intel.payload.title}</span>
                    <span class="text-[8px] uppercase px-1 rounded bg-gray-800 border border-gray-600 ${certColor}">Cert: ${Math.floor(intel.certainty*100)}%</span>
                </div>
                <div class="flex justify-between items-center text-[8px] text-gray-500">
                    <span>${intel.payload.tags[0] ? '[' + intel.payload.tags[0].toUpperCase() + ']' : ''} ${intel.type}</span>
                    <span>Age: ${age}d | Src: ${intel.provenance[0]?.origin_type || 'Unknown'}</span>
                </div>
            </div>
        `;
    }).join('') || `<div class="text-gray-500 text-[10px] text-center mt-4">No records found.</div>`;

    // Inspection Panel (Phase 6.4D / 6.4E)
    let inspectionHtml = `<div class="h-full flex items-center justify-center text-gray-600 text-[10px]">Select a record to inspect</div>`;
    
    if (state.selectedIntelId) {
        const intel = window.IntelManager.lookup(state.selectedIntelId);
        if (intel) {
            const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);
            const value = window.IntelEconomy.calculateValue(intel, {id: 'null'}); // Base value
            
            // Provenance Chain UI
            const lineagePath = intel.provenance.map((p, i) => `
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-gray-600 text-[8px] w-4 text-right">${i===0 ? 'Orig' : 'L'+i}</span>
                    <span class="text-cyan-600 text-[10px] font-bold">↓</span>
                    <span class="text-[9px] text-gray-300"><span class="text-cyan-200">${p.origin_type}</span> on Day ${p.timestamp}</span>
                </div>
            `).join('');

            inspectionHtml = `
                <div class="flex flex-col h-full">
                    <div class="border-b border-gray-700 pb-2 mb-2">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="text-cyan-300 font-bold text-xs uppercase tracking-wider">${intel.payload.title}</h3>
                            <span class="text-[8px] px-1 rounded border border-gray-600 text-gray-400">${intel.rarity}</span>
                        </div>
                        <p class="text-[10px] text-gray-300 leading-snug">${intel.payload.description}</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 text-[9px] mb-3">
                        <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                            <span class="text-gray-500 block mb-0.5">Status</span>
                            <span class="text-white">${intel.type} | Gen ${intel.spread_generation}</span>
                        </div>
                        <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                            <span class="text-gray-500 block mb-0.5">Metrics</span>
                            <span class="text-white">Age ${age}d | Val ${value}g</span>
                        </div>
                        <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                            <span class="text-gray-500 block mb-0.5">Certainty</span>
                            <span class="${intel.certainty >= 1.0 ? 'text-green-400' : 'text-yellow-400'}">${Math.floor(intel.certainty*100)}%</span>
                        </div>
                        <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                            <span class="text-gray-500 block mb-0.5">Dispute</span>
                            <span class="${intel.dispute_state !== 'NONE' ? 'text-red-400 font-bold' : 'text-gray-400'}">${intel.dispute_state}</span>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar bg-gray-950 border border-gray-800 p-2 rounded mb-3">
                        <div class="text-[9px] text-gray-500 uppercase font-bold mb-2 tracking-widest border-b border-gray-800 pb-1">Provenance Chain</div>
                        ${lineagePath}
                    </div>

                                        <div class="mt-auto">
                                            ${intel.certainty < 1.0 ? `<button class="w-full bg-purple-900/50 border border-purple-700 hover:bg-purple-800 hover:text-white text-purple-200 px-2 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors shadow-[0_0_10px_rgba(168,85,247,0.15)]" onclick="window.EventBus.emit('START_INVESTIGATION', '${intel.intel_id}')">Focus (Active Tracking)</button>` : `<div class="w-full bg-gray-800 border border-gray-700 text-gray-500 px-2 py-1.5 text-[10px] uppercase font-bold tracking-widest text-center cursor-not-allowed">Verified</div>`}
                                        </div>
                </div>
            `;
        }
    }

    dialogue.innerHTML = `
        <div class="mb-3 border-b border-cyan-700 pb-2">
            <div class="text-cyan-400 font-bold tracking-widest uppercase text-sm">Oracle Board</div>
            <div class="text-[10px] text-gray-500 mt-0.5">Public Intelligence Terminal</div>
        </div>
        
        <div class="flex gap-2 mb-3 border-b border-gray-800 pb-2">
            ${tabs}
        </div>

        <div class="flex gap-1 mb-2">
            ${filters}
        </div>

        <div class="flex gap-3 h-[350px]">
            <div class="w-1/2 overflow-y-auto custom-scrollbar pr-1">
                ${listRows}
            </div>
            <div class="w-1/2 bg-gray-900 border border-gray-700 p-3 rounded">
                ${inspectionHtml}
            </div>
        </div>
        
        <button id="btn-close-oracle" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400 w-full transition-colors text-gray-300">Leave Terminal</button>
    `;

    // Make dialogue wider for Oracle Board
    dialogue.style.width = '600px';
    dialogue.classList.remove('hidden');
    
    dialogue.querySelector('#btn-close-oracle').addEventListener('click', () => {
        dialogue.style.width = ''; // Reset width
        closeCompanionDialogue();
    });
}




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
    
        // --- PHASE 6.4B: BROKER INTERACTION HOOK ---
        const broker = window.GameCore.activeEntities.find(entity => entity.def.serviceType === 'broker' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (broker) {
        if (window.UIEngineInstance) {
            window.UIEngineInstance.components.get('intel-broker').render(broker);
        }
        return;
    }

        const villageHub = window.GameCore.activeEntities.find(entity => entity.def.type === 'hub' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
        if (villageHub) {
            // --- PHASE 6.4C: ORACLE BOARD REPLACES QUEST BOARD ---
            if (window.UIEngineInstance) {
                window.UIEngineInstance.components.get('oracle-board').render(villageHub);
            }
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
        
        // --- PHASE 3: MERCHANT XP ---
        // Award XP for participating in the economy
        window.CareerManager.addXP('merchant', 15);
        
        if (stock.itemId === 'food') window.GameState.inventory.food++;
        window.EventBus.emit('UI_LOG', `Purchased ${window.ItemDatabase[stock.itemId]?.name || stock.itemId}.`);
        openMerchantShop(chest);
        window.EventBus.emit('UI_UPDATE_HUD');
        window.EventBus.emit('RENDER_INVENTORY');
    });

  // ==========================================
  // PHASE 6.4B: INFORMATION BROKER TRADING
  // ==========================================
  
          window.IntelManager.grantOwnership(mockId, broker.id);
          brokerIntel.push(window.IntelManager.lookup(mockId));
      }
    
      const brokerRows = brokerIntel.map(intel => {
          const price = window.IntelEconomy.calculateValue(intel, { id: 'player_node' });
          if (price <= 0) return ''; // Player already knows it
          return `<button class="border border-purple-700 bg-gray-900 p-2 text-left hover:border-purple-300 w-full mb-1 flex flex-col gap-1 transition-colors" onclick="window.EventBus.emit('BUY_INTEL', { brokerId: '${broker.id}', intelId: '${intel.intel_id}', price: ${price} })">
              <div class="flex justify-between items-center"><span class="font-bold text-white text-[10px]">${intel.payload.title}</span><span class="text-amber-300 text-[10px] font-bold">${price}g</span></div>
              <div class="flex justify-between items-center text-[8px] text-gray-500"><span>${intel.type} | Cert: ${Math.floor(intel.certainty*100)}%</span><span>Gen ${intel.spread_generation}</span></div>
          </button>`;
      }).join('') || '<div class="text-gray-500 text-[10px] py-2">No new secrets to share.</div>';

      const playerRows = playerIntel.map(intel => {
          const price = window.IntelEconomy.calculateValue(intel, broker);
          if (price <= 0) return ''; // Broker already knows it
          return `<button class="border border-gray-700 bg-gray-900 p-2 text-left hover:border-blue-300 w-full mb-1 flex flex-col gap-1 transition-colors" onclick="window.EventBus.emit('SELL_INTEL', { brokerId: '${broker.id}', intelId: '${intel.intel_id}', price: ${price} })">
              <div class="flex justify-between items-center"><span class="font-bold text-white text-[10px]">${intel.payload.title}</span><span class="text-amber-300 text-[10px] font-bold">${price}g</span></div>
              <div class="flex justify-between items-center text-[8px] text-gray-500"><span>${intel.type} | Cert: ${Math.floor(intel.certainty*100)}%</span><span>Gen ${intel.spread_generation}</span></div>
          </button>`;
      }).join('') || '<div class="text-gray-500 text-[10px] py-2">You possess no secrets of value to me.</div>';

      dialogue.innerHTML = `
          <div class="mb-4 border-b border-purple-700 pb-3">
              <div class="text-purple-400 font-bold tracking-widest uppercase">Information Broker</div>
              <div class="text-[10px] text-gray-500 mt-1">Gold: <span class="text-amber-300">${window.GameState.inventory.gold}</span></div>
          </div>
          <div class="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-4">
              <div>
                  <div class="text-[10px] text-purple-400 font-bold mb-2 uppercase border-b border-purple-900/50 pb-1">Buy Secrets</div>
                  ${brokerRows}
              </div>
              <div>
                  <div class="text-[10px] text-blue-400 font-bold mb-2 uppercase border-b border-blue-900/50 pb-1">Sell Secrets</div>
                  ${playerRows}
              </div>
          </div>
          <button id="btn-close-broker" class="border border-gray-600 px-3 py-2 text-xs hover:border-purple-400 w-full transition-colors">Step Away</button>
      `;
      dialogue.classList.remove('hidden');
      dialogue.querySelector('#btn-close-broker').addEventListener('click', closeCompanionDialogue);
  }

  

  

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
document.getElementById('btn-intel')?.addEventListener('click', () => window.EventBus.emit('TOGGLE_INTEL_BAG'));
document.getElementById('btn-asset')?.addEventListener('click', () => { window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS'); });

window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        window.EventBus.emit('TOGGLE_INTEL_DEBUG');
    }
    if (e.key === 'k' || e.key === 'K') {
        // Prevent toggle if typing in an input
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        window.EventBus.emit('TOGGLE_INTEL_BAG');
    }
});

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



