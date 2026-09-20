// ==========================================
// DARK FOREST ENGINE - UI CONTROLLER
// Phase 6.5 - Component Refactor
// ==========================================

// ==========================================
// COMPONENT 1: INTEL BAG UI
// ==========================================
class IntelBagUI {
    constructor() {
        this.panel = document.getElementById('intel-bag-panel');
        if (!this.panel) return;
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus.on('TOGGLE_INTEL_BAG', () => this.toggle());
        window.EventBus.on('RENDER_INTEL_BAG', () => this.render());

        this.panel.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn && btn.getAttribute('data-action') === 'close') this.toggle();
        });
    }

    toggle() {
        if (window.UIEngineInstance) window.UIEngineInstance.components.get('intel-bag').toggle();
    }

    render() {
        if (!this.panel || !window.IntelManager) return;
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
            html += playerIntel.map(intel => this.generateIntelCard(intel)).join('');
        }

        html += `</div>
            <button data-action="close" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-blue-400 transition-colors w-full text-center">Close Ledger</button>
        `;
        this.panel.innerHTML = html;
    }

    generateIntelCard(intel) {
        const isFact = intel.type === window.IntelEnums.TYPES.FACT;
        const borderClass = isFact ? 'border-green-700/50' : 'border-gray-700 hover:border-blue-500/50';
        const rarityColors = { COMMON: 'text-gray-400', UNCOMMON: 'text-green-400', RARE: 'text-blue-400', RESTRICTED: 'text-purple-400', SECRET: 'text-red-400', LEGENDARY: 'text-yellow-400' };
        const rColor = rarityColors[intel.rarity] || 'text-gray-400';
        const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);

        return `
            <div class="bg-gray-800/80 p-3 border ${borderClass} rounded flex flex-col gap-2">
                <div class="flex justify-between items-start">
                    <div class="font-bold text-white text-xs">${intel.payload.title}</div>
                    <div class="text-[9px] px-1 py-0.5 rounded bg-gray-900 border border-gray-700 ${rColor}">${intel.rarity}</div>
                </div>
                <div class="text-[10px] text-gray-400 leading-snug">${intel.payload.description}</div>
                <div class="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-700/50">
                    <div class="flex flex-col"><span class="text-[8px] uppercase text-gray-500">Type</span><span class="text-[10px] ${isFact ? 'text-green-400' : 'text-yellow-400'} font-bold">${intel.type}</span></div>
                    <div class="flex flex-col"><span class="text-[8px] uppercase text-gray-500">Certainty</span><span class="text-[10px] text-white">${Math.floor(intel.certainty * 100)}%</span></div>
                    <div class="flex flex-col"><span class="text-[8px] uppercase text-gray-500">Age / Gen</span><span class="text-[10px] text-white">${age}d / G${intel.spread_generation}</span></div>
                    <div class="flex flex-col"><span class="text-[8px] uppercase text-gray-500">Base Value</span><span class="text-[10px] text-amber-300 font-bold">${window.IntelEconomy.calculateValue(intel, {id: 'null_buyer'})}g</span></div>
                </div>
            </div>
        `;
    }
}

// ==========================================
// COMPONENT 2: SQUAD MANAGER UI
// ==========================================
class SquadManagerUI {
    constructor() {
        this.panel = document.getElementById('squad-manager-panel');
        this.content = document.getElementById('squad-manager-content');
        if (!this.panel || !this.content) return;
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus.on('TOGGLE_SQUAD_MANAGER', () => this.toggle());
        window.EventBus.on('RENDER_SQUAD_MANAGER', () => this.render());

        this.panel.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const memberId = btn.getAttribute('data-member-id');
            const command = btn.getAttribute('data-command');

            if (action === 'close') this.toggle();
            if (action === 'toggle-member' && memberId) {
                window.EventBus.emit('TOGGLE_PARTY_MEMBER_SELECTION', memberId);
                this.render();
            }
            if (action === 'issue-command' && command) {
                window.EventBus.emit('PARTY_COMMAND', command);
            }
        });

        this.panel.addEventListener('change', (e) => {
            if (e.target.id === 'formation-select') {
                window.GameState.party.formation = e.target.value;
                window.EventBus.emit('UI_LOG', 'Formation changed: ' + e.target.value.toUpperCase());
            }
        });
    }

    toggle() {
        this.render();
        this.panel.classList.toggle('hidden');
        this.panel.classList.toggle('flex');
    }

    render() {
        if (!this.content) return;
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
            html += party.map(member => this.generateMemberCard(member)).join('');
        }
        
        html += `</div>
            <div class="border-t border-gray-700 pt-3">
                <div class="flex justify-between items-center mb-2">
                    <div class="text-[10px] text-gray-400 font-bold uppercase">Tactical Formation</div>
                    <select id="formation-select" class="bg-gray-800 text-cyan-400 text-[10px] border border-gray-700 rounded px-1">
                        <option value="line" ${window.GameState.party.formation === 'line' ? 'selected' : ''}>Line</option>
                        <option value="shield_wall" ${window.GameState.party.formation === 'shield_wall' ? 'selected' : ''}>Shield Wall</option>
                        <option value="skirmish" ${window.GameState.party.formation === 'skirmish' ? 'selected' : ''}>Loose Skirmish</option>
                    </select>
                </div>
                <div class="text-[10px] text-gray-400 font-bold uppercase mb-2">Issue Squad Command (Selected: ${window.GameState.party.selectedMembers.length})</div>
                <div class="grid grid-cols-5 gap-2">
                    <button data-action="issue-command" data-command="follow" class="bg-gray-700 hover:bg-cyan-600 text-white text-[10px] py-2 rounded font-bold transition-colors">Follow</button>
                    <button data-action="issue-command" data-command="hold" class="bg-gray-700 hover:bg-yellow-600 text-white text-[10px] py-2 rounded font-bold transition-colors">Hold</button>
                    <button data-action="issue-command" data-command="guard" class="bg-gray-700 hover:bg-blue-600 text-white text-[10px] py-2 rounded font-bold transition-colors">Guard</button>
                    <button data-action="issue-command" data-command="attack" class="bg-gray-700 hover:bg-red-600 text-white text-[10px] py-2 rounded font-bold transition-colors">Attack</button>
                    <button data-action="issue-command" data-command="retreat" class="bg-gray-700 hover:bg-purple-600 text-white text-[10px] py-2 rounded font-bold transition-colors">Retreat</button>
                </div>
            </div>
        `;
        this.content.innerHTML = html;
    }

    generateMemberCard(member) {
        const isSelected = window.GameState.party.selectedMembers.includes(member.id);
        const hpPercent = (member.hp / (member.maxHp || 100)) * 100;
        const hungerPercent = (member.hunger / 100) * 100;
        const loyaltyPercent = (member.loyalty / 100) * 100;
        const borderClass = isSelected ? 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-gray-700 hover:border-gray-500';
        const bgClass = member.downed ? 'bg-red-900/20' : 'bg-gray-800/80';
        
        return `
            <div data-action="toggle-member" data-member-id="${member.id}" class="p-3 rounded border ${borderClass} ${bgClass} transition-colors cursor-pointer">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} class="pointer-events-none accent-cyan-500">
                        <span class="text-white font-bold text-xs">${member.name}</span>
                        ${member.downed ? '<span class="bg-red-600 text-white text-[9px] px-1 rounded font-bold uppercase">Downed</span>' : ''}
                    </div>
                    <div class="text-[10px] text-cyan-200 uppercase">${member.role}</div>
                </div>
                <div class="grid grid-cols-4 gap-2 mb-2">
                    <div class="flex flex-col"><div class="text-[8px] text-gray-500 uppercase font-bold">Tier</div><div class="text-[10px] ${member.tier === 'war_master' ? 'text-yellow-400 font-bold' : 'text-indigo-400'} capitalize">${member.tier.replace('_', ' ')}</div></div>
                    <div class="flex flex-col"><div class="text-[8px] text-gray-500 uppercase font-bold">Authority</div><div class="text-[10px] text-white">${member.commandAuthority} Units</div></div>
                    <div class="flex flex-col"><div class="text-[8px] text-gray-500 uppercase font-bold">Exp (Led)</div><div class="text-[10px] text-green-400">${member.battlesLed || 0}/100</div></div>
                    <div class="flex flex-col"><div class="text-[8px] text-gray-500 uppercase font-bold">Dispatch</div><div class="text-[10px] text-gray-400 truncate">${member.dispatchTarget || 'With Player'}</div></div>
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <div class="flex flex-col gap-1"><div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>HP</span><span>${Math.floor(member.hp)}/${member.maxHp||100}</span></div><div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-red-500" style="width: ${hpPercent}%"></div></div></div>
                    <div class="flex flex-col gap-1"><div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>Hunger</span><span>${Math.floor(member.hunger)}%</span></div><div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-yellow-500" style="width: ${hungerPercent}%"></div></div></div>
                    <div class="flex flex-col gap-1"><div class="flex justify-between text-[9px] text-gray-400 font-bold uppercase"><span>Loyalty</span><span>${Math.floor(member.loyalty)}%</span></div><div class="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width: ${loyaltyPercent}%"></div></div></div>
                </div>
            </div>
        `;
    }
}

// ==========================================
// COMPONENT 3: FACTION MAP UI
// ==========================================
class FactionMapUI {
    constructor() {
        this.panel = document.getElementById('faction-map-panel');
        this.canvas = document.getElementById('faction-map-canvas');
        this.tooltip = document.getElementById('map-tooltip');
        this.dayCounter = document.getElementById('map-day-counter');
        if (!this.panel || !this.canvas || !this.tooltip) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.mappedNodes = []; 
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus.on('TOGGLE_MAP', () => this.toggle());
        window.EventBus.on('RENDER_MAP', () => this.render());

        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));
    }

    toggle() {
        if (this.panel.classList.contains('hidden')) {
            this.panel.classList.remove('hidden');
            this.panel.classList.add('flex');
            this.render();
        } else {
            this.panel.classList.add('hidden');
            this.panel.classList.remove('flex');
        }
    }

    render() {
        if (!window.VillageManager) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (this.dayCounter) this.dayCounter.innerText = window.EngineParams?.worldDay || 0;

        this.ctx.fillStyle = '#030712';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const villages = window.VillageManager.villages;
        if (!villages || villages.length === 0) {
            this.ctx.fillStyle = '#4b5563';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Settlement web not yet generated.', this.canvas.width/2, this.canvas.height/2);
            return;
        }

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        villages.forEach(v => {
            if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
            if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
        });
        
        const padding = 15000;
        minX -= padding; maxX += padding; minZ -= padding; maxZ += padding;
        const scale = Math.min(this.canvas.width / (maxX - minX), this.canvas.height / (maxZ - minZ)) * 0.9;
        const offsetX = this.canvas.width / 2 - ((minX + maxX) / 2) * scale;
        const offsetZ = this.canvas.height / 2 - ((minZ + maxZ) / 2) * scale;

        const toCanvas = (worldX, worldZ) => ({ x: worldX * scale + offsetX, y: worldZ * scale + offsetZ });
        this.mappedNodes = [];

        this.ctx.strokeStyle = '#374151';
        this.ctx.lineWidth = 1.5;
        villages.forEach(v => {
            const start = toCanvas(v.x, v.z);
            v.connections.forEach(targetId => {
                const target = villages.find(t => t.id === targetId);
                if (target) {
                    const end = toCanvas(target.x, target.z);
                    this.ctx.beginPath(); this.ctx.moveTo(start.x, start.y); this.ctx.lineTo(end.x, end.y); this.ctx.stroke();
                }
            });
        });

        villages.forEach(v => {
            const pos = toCanvas(v.x, v.z);
            const pixelRadius = (v.territory.radius || 90) * 10 * scale;
            this.ctx.beginPath(); this.ctx.arc(pos.x, pos.y, pixelRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = v.territory.faction === 'forest' ? 'rgba(127, 29, 29, 0.15)' : 'rgba(59, 130, 246, 0.1)';
            this.ctx.strokeStyle = v.territory.faction === 'forest' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)';
            this.ctx.fill(); this.ctx.lineWidth = 1; this.ctx.stroke();

            this.mappedNodes.push({ x: pos.x, y: pos.y, radius: 8, data: v });

            this.ctx.fillStyle = v.territory.faction === 'forest' ? '#450a0a' : (v.territory.underRaid ? '#f59e0b' : '#3b82f6');
            this.ctx.strokeStyle = v.territory.faction === 'forest' ? '#ef4444' : (v.territory.underRaid ? '#fcd34d' : '#93c5fd');
            this.ctx.lineWidth = 2;

            if (v.capital) {
                const s = 8;
                this.ctx.beginPath(); this.ctx.moveTo(pos.x, pos.y - s); this.ctx.lineTo(pos.x + s, pos.y); this.ctx.lineTo(pos.x, pos.y + s); this.ctx.lineTo(pos.x - s, pos.y); this.ctx.closePath();
                this.ctx.fillStyle = '#eab308'; this.ctx.strokeStyle = '#fef08a'; this.ctx.fill(); this.ctx.stroke();
            } else {
                this.ctx.beginPath(); this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2); this.ctx.fill(); this.ctx.stroke();
            }

            this.ctx.fillStyle = v.territory.faction === 'forest' ? '#ef4444' : '#9ca3af';
            this.ctx.font = v.capital ? 'bold 11px sans-serif' : '9px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(v.name, pos.x, pos.y - 12);
        });

        if (window.GameCore?.playerObj) {
            const pTrans = window.GameCore.playerObj.body.translation();
            const pPos = toCanvas(pTrans.x, pTrans.z);
            this.ctx.beginPath(); this.ctx.arc(pPos.x, pPos.y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#22c55e'; this.ctx.fill(); this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 1; this.ctx.stroke();
        }
    }

    handleMouseMove(e) {
        if (!this.mappedNodes || this.mappedNodes.length === 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
        
        let hoveredNode = null;
        for (const node of this.mappedNodes) {
            const dx = mouseX - node.x; const dy = mouseY - node.y;
            if (dx*dx + dy*dy <= node.radius * node.radius * 4) { hoveredNode = node; break; }
        }
        
        if (hoveredNode) {
            const v = hoveredNode.data;
            let html = `
                <div class="font-bold text-sm ${v.territory.faction === 'forest' ? 'text-red-400' : 'text-blue-300'} mb-1">${v.name} ${v.capital ? '(Capital)' : ''}</div>
                <div class="text-[9px] text-gray-400 mb-2">${v.nobleHouse} | ${v.industry?.industry || 'Unknown'}</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span class="text-gray-500">Pop:</span> ${v.population?.current || 0}/${v.population?.capacity || 0}</div>
                    <div><span class="text-gray-500">Prosperity:</span> <span class="${v.stats.prosperity > 70 ? 'text-green-400' : 'text-white'}">${v.stats.prosperity}%</span></div>
                    <div><span class="text-gray-500">Food:</span> ${v.stats.food || 0}</div>
                    <div><span class="text-gray-500">Ward:</span> ${v.barrierIntegrity}%</div>
                </div>
            `;
            if (v.territory.underRaid) html += `<div class="mt-2 text-yellow-400 font-bold bg-yellow-900/30 px-1 py-0.5 rounded text-center">⚠️ UNDER ATTACK</div>`;
            
            this.tooltip.innerHTML = html;
            this.tooltip.style.left = `${hoveredNode.x}px`; this.tooltip.style.top = `${hoveredNode.y}px`;
            this.tooltip.classList.remove('hidden');
            this.canvas.style.cursor = 'pointer';
        } else {
            this.tooltip.classList.add('hidden');
            this.canvas.style.cursor = 'crosshair';
        }
    }
}

// ==========================================
// COMPONENT 4: WORLD OVERLAY UI (Tick & Floating Text)
// ==========================================
class WorldOverlayUI {
    constructor() {
        this.floatingTexts = [];
        this.intelTags = new Map();
        this.damageOverlay = document.getElementById('damage-overlay');
        this.tagLayer = document.getElementById('intel-tags-layer');
        this.safeZoneIndicator = document.getElementById('safe-zone-indicator');
        this.bindEvents();
    }

    bindEvents() {
        window.EventBus.on('UI_TICK', (payload) => this.tick(payload));
        window.EventBus.on('SPAWN_FLOATING_TEXT', (data) => this.spawnFloatingText(data));
        window.EventBus.on('ENTITY_DAMAGED', (data) => this.handleDamage(data));
    }

    handleDamage({ damage, position, isPlayer }) {
        this.spawnFloatingText({ text: damage, pos: position, color: isPlayer ? '#ff0000' : '#ff4444' });
        if (!isPlayer) {
            window.EventBus.emit('PLAY_SOUND', { url: 'https://tonejs.github.io/audio/drum-samples/snare-analog.mp3', pos: position });
        } else if (this.damageOverlay) {
            this.damageOverlay.classList.remove('hit-flash'); void this.damageOverlay.offsetWidth; 
            this.damageOverlay.classList.add('hit-flash'); setTimeout(() => this.damageOverlay.classList.remove('hit-flash'), 300);
        }
    }

    spawnFloatingText({ text, pos, color }) {
        if (!this.damageOverlay) return;
        const el = document.createElement('div'); el.className = 'floating-dmg absolute pointer-events-none font-bold text-lg drop-shadow-md'; 
        el.style.color = color; el.innerText = text;
        this.damageOverlay.appendChild(el);
        this.floatingTexts.push({ el: el, pos: { x: pos.x, y: pos.y + 1.5, z: pos.z }, life: 1.0, velocity: { x: 0, y: 1, z: 0 } });
    }

    tick({ delta, camera }) {
        window.EventBus.emit('UI_UPDATE_HUD');
        if (!camera) return;

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i]; ft.life -= delta * 1.5;
            if (ft.life <= 0) { ft.el.remove(); this.floatingTexts.splice(i, 1); continue; }
            ft.pos.x += ft.velocity.x * delta; ft.pos.y += ft.velocity.y * delta; ft.pos.z += ft.velocity.z * delta;
            if (window.THREE) {
                const pVec = new window.THREE.Vector3(ft.pos.x, ft.pos.y, ft.pos.z).project(camera);
                if (pVec.z > 1) { ft.el.style.display = 'none'; } else {
                    ft.el.style.display = 'block'; ft.el.style.left = `${(pVec.x * 0.5 + 0.5) * window.innerWidth}px`; 
                    ft.el.style.top = `${-(pVec.y * 0.5 - 0.5) * window.innerHeight}px`; ft.el.style.opacity = Math.max(0, ft.life);
                }
            }
        }

        // Intel Tags
        if (window.IntelManager && window.GameCore?.activeEntities && this.tagLayer) {
            window.GameCore.activeEntities.forEach(entity => {
                if (!entity.visual || !entity.id || (entity.def.serviceType !== 'broker' && entity.def.type !== 'hub')) return;
                const distSq = entity.visual.position.distanceToSquared(window.GameCore.playerObj.visual.position);
                if (distSq > 1600) { if (this.intelTags.has(entity.id)) this.intelTags.get(entity.id).style.display = 'none'; return; }

                const theirIntel = window.IntelManager.getIntelForNode(entity.id);
                const myIntel = window.IntelManager.getIntelForNode('player_node');
                let topSecret = null; let topVal = 0;
                
                for (const intel of theirIntel) {
                    if (!myIntel.some(m => m.intel_id === intel.intel_id || m.parent_intel_id === intel.intel_id)) {
                        const val = window.IntelEconomy.calculateValue(intel, {id: 'player_node'});
                        if (val > topVal) { topVal = val; topSecret = intel; }
                    }
                }

                let el = this.intelTags.get(entity.id);
                if (!topSecret) { if (el) el.style.display = 'none'; return; }

                if (!el) {
                    el = document.createElement('div'); el.className = 'absolute flex flex-col items-center pointer-events-none transition-opacity duration-300 transform -translate-x-1/2 -translate-y-full';
                    this.tagLayer.appendChild(el); this.intelTags.set(entity.id, el);
                }

                const rarityColors = { RARE: 'text-blue-400', RESTRICTED: 'text-purple-400', SECRET: 'text-red-400', LEGENDARY: 'text-yellow-400' };
                const colorClass = rarityColors[topSecret.rarity] || 'text-gray-300';
                el.innerHTML = `<span class="text-xl shadow-black drop-shadow-md filter ${colorClass}">${topSecret.type === 'WARNING' ? '⚠️' : '📜'}</span><span class="text-[8px] font-bold bg-black/80 px-1 rounded border border-gray-700 ${colorClass} mt-1">${topSecret.type}</span>`;

                const pVec = entity.visual.position.clone(); pVec.y += (entity.def.height || 2) + 1.5; pVec.project(camera);
                if (pVec.z > 1) { el.style.display = 'none'; } else {
                    el.style.display = 'flex'; el.style.left = `${(pVec.x * 0.5 + 0.5) * window.innerWidth}px`; el.style.top = `${-(pVec.y * 0.5 - 0.5) * window.innerHeight}px`; 
                    el.style.opacity = Math.max(0, 1.0 - (distSq / 1600));
                }
            });
        }

        if (this.safeZoneIndicator && window.GameCore?.playerObj) {
            this.safeZoneIndicator.classList.toggle('hidden', !window.EngineParams.isPlayerSafe);
        }
        updateInvestigationHUD();
    }
}

// ==========================================
// REMAINDER OF ORIGINAL FILE (Pending Future Refactoring)
// ==========================================

window.EventBus.on('TOGGLE_INTEL_DEBUG', () => { if (window.UIEngineInstance) window.UIEngineInstance.components.get('intel-debug').toggle(); });

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
                        <th class="py-2">ID / Version</th><th class="py-2">Title</th><th class="py-2">Holders</th>
                        <th class="py-2">Gen</th><th class="py-2">Cert / Truth</th><th class="py-2">Supp</th><th class="py-2">Lineage Depth</th>
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

    html += `</tbody></table></div><button onclick="window.EventBus.emit('TOGGLE_INTEL_DEBUG')" class="mt-4 border border-gray-800 px-3 py-2 text-xs hover:border-red-400 transition-colors w-full text-center text-red-500">Close Diagnostic</button>`;
    panel.innerHTML = html;
});

window.EventBus.on('UI_LOG', (msg) => {
    const el = document.getElementById('event-log'); if(!el) return;
    const entry = document.createElement('div'); entry.innerText = `> ${msg}`; el.appendChild(entry); el.scrollTop = el.scrollHeight;
});

window.EventBus.on('UI_UPDATE_HUD', () => {
    if(!window.GameState) return;
    document.getElementById('hp-bar').style.width = `${(window.GameState.pStats.hp / window.GameState.pStats.maxHp) * 100}%`;
    document.getElementById('stamina-bar').style.width = `${(window.GameState.pStats.stamina / window.GameState.pStats.maxStamina) * 100}%`;
    document.getElementById('poise-bar').style.width = `${(window.GameState.pStats.poise / window.GameState.pStats.maxPoise) * 100}%`;
    document.getElementById('hud-food').innerText = window.GameState.inventory.food; 
    document.getElementById('hud-gold').innerText = window.GameState.inventory.gold;
    const renownLine = document.getElementById('renown-line');
    const renown = window.GameState.renown || { title: 'Unknown', score: 0, infamy: 0 };
    if (renownLine) renownLine.innerText = `RENOWN | ${renown.title.toUpperCase()} ${renown.score} | INFAMY ${renown.infamy}`;
    const arenaLine = document.getElementById('arena-line');
    if (arenaLine && window.GameState.gladiator) arenaLine.innerText = `ARENA | ${window.GameState.gladiator.matchState.toUpperCase()} | ${window.GameState.gladiator.objective}`;
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

function updateInvestigationHUD() {
    const tracker = document.getElementById('investigation-tracker');
    const state = window.GameState?.investigation;
    if (!state || !state.activeIntelId || !window.GameCore?.playerObj) {
        if (tracker && !tracker.classList.contains('hidden')) tracker.classList.add('hidden');
        return;
    }
    const intel = window.IntelManager.lookup(state.activeIntelId);
    if (!intel || intel.certainty >= 1.0 || intel.persistence !== window.IntelEnums.PERSISTENCE.ACTIVE) {
        window.GameState.investigation.activeIntelId = null;
        return;
    }
    if (tracker) {
        tracker.classList.remove('hidden');
        const pPos = window.GameCore.playerObj.visual.position;
        const target = intel.payload.target_coord;
        const distSq = (pPos.x - target.x)**2 + (pPos.z - target.z)**2;
        
        document.getElementById('inv-title').innerText = intel.payload.title;
        if (distSq <= 900) {
            let canVerify = true;
            if (['HARD', 'EXPERT', 'LEGENDARY'].includes(intel.verification_complexity)) {
                const hasArchivist = window.GameState.party.members.some(m => m.recruited && m.role === 'Archivist' && !m.downed);
                if (!hasArchivist && intel.verification_complexity === 'LEGENDARY') {
                    canVerify = false;
                    if (Math.random() < 0.05) window.EventBus.emit('UI_LOG', `[FOCUS] The truth here is obscured. You require an Archivist's eyes.`);
                }
            }
            if (canVerify && !state.verifying) {
                state.verifying = true;
                const truthConditionMet = intel.truth_state === window.IntelEnums.TRUTH_STATE.TRUE;
                window.EventBus.emit('UI_LOG', `[FOCUS] The culmination of your search is at hand...`);
                setTimeout(() => {
                    const newId = window.IntelEconomy.verifyIntel(intel.intel_id, {id: 'player_node', faction: 'Player'}, truthConditionMet);
                    if (newId) {
                        window.CareerManager?.addXP('archivist', 50);
                        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: 'TRUTH REVEALED', pos: pPos, color: '#a855f7' });
                        window.GameState.investigation.activeIntelId = null;
                        state.verifying = false;
                    }
                }, 2000);
            }
        } else { state.verifying = false; }
    }
}

window.EventBus.on('START_INVESTIGATION', (intelId) => {
    const intel = window.IntelManager.lookup(intelId);
    if (!intel || intel.certainty >= 1.0) return window.EventBus.emit('UI_LOG', 'Cannot focus. Record is already verified or corrupted.');
    window.GameState.investigation = { activeIntelId: intelId, verifying: false };
    window.EventBus.emit('UI_LOG', `[FOCUS] Your mind locks onto the possibility of: ${intel.payload.title}`);
    if (typeof closeCompanionDialogue === 'function') closeCompanionDialogue();
});

window.EventBus.on('PLAYER_LEVEL_UP', ({ statName, level }) => window.EventBus.emit('UI_LOG', `Level Up! ${statName.toUpperCase()} is now ${level}`));

function handleInteract() {
    if (!window.GameCore || !window.GameCore.playerObj || !window.GameCore.activeEntities) return;
    if (window.GameCore.playerObj.mountId || window.GameCore.playerObj.caravanId) return; 
    
    const nearbyVillages = window.VillageManager ? window.VillageManager.villages.filter(v => Math.hypot(v.x - window.GameCore.playerObj.visual.position.x, v.z - window.GameCore.playerObj.visual.position.z) <= v.territory.radius) : [];
    if (nearbyVillages.length > 0) {
        const canInteract = window.GameCore.activeEntities.some(e => e.def.type === 'hub' && Math.hypot(e.visual.position.x - window.GameCore.playerObj.visual.position.x, e.visual.position.z - window.GameCore.playerObj.visual.position.z) <= 4);
        if (!canInteract) return; 
    }

    const playerPosition = window.GameCore.playerObj.visual.position;
    const loot = window.GameCore.groundLoot.find(entry => Math.hypot(entry.visual.position.x - playerPosition.x, entry.visual.position.z - playerPosition.z) <= 2.5);
    if (loot) return window.EventBus.emit('PICKUP_GROUND_LOOT', loot.id);

    const playerBase = window.GameCore.activeEntities.find(entity => entity.playerBase && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (playerBase && typeof openPlayerCamp === 'function') return openPlayerCamp();

    const caravan = window.GameCore.activeEntities.find(entity => entity.caravanId && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (caravan && typeof openCaravanDialogue === 'function') return openCaravanDialogue(caravan);

    const merchantChest = window.GameCore.activeEntities.find(entity => entity.def.type === 'merchantChest' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 3.5);
    if (merchantChest && typeof openMerchantShop === 'function') return openMerchantShop(merchantChest);

    const armorer = window.GameCore.activeEntities.find(entity => entity.def.forge && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (armorer && typeof openArmorerForge === 'function') return openArmorerForge();

    const treatmentCenter = window.GameCore.activeEntities.find(entity => entity.def.serviceType === 'plagueTreatment' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (treatmentCenter && typeof openTreatmentCenter === 'function') return openTreatmentCenter();
    
    const broker = window.GameCore.activeEntities.find(entity => entity.def.serviceType === 'broker' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 5);
    if (broker && window.UIEngineInstance) return window.UIEngineInstance.components.get('intel-broker').render(broker);

    const villageHub = window.GameCore.activeEntities.find(entity => entity.def.type === 'hub' && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 4);
    if (villageHub && window.UIEngineInstance) return window.UIEngineInstance.components.get('oracle-board').render(villageHub);

    const companion = window.GameCore.activeEntities.find(entity => (entity.companionId || entity.recruitId) && Math.hypot(entity.visual.position.x - playerPosition.x, entity.visual.position.z - playerPosition.z) <= 3.5);
    if (!companion) return window.EventBus.emit('GATHER_NEARBY');

    const member = window.GameState.party.members.find(candidate => candidate.id === (companion.companionId || companion.recruitId));
    if (!member) return;
    
    const dialogue = document.getElementById('companion-dialogue');
    if (!dialogue) return;
    const status = member.downed ? 'Downed | Needs a ration to recover' : (member.recruited ? `Loyalty ${member.loyalty} | Hunger ${member.hunger}` : `Unrecruited ${member.role}`);
    const action = member.downed ? `<button id="btn-revive-companion" class="col-span-2 border border-red-700 px-3 py-2 text-xs text-red-200 hover:border-red-300">Use Ration to Revive</button>` : (member.recruited ? `<button id="btn-companion-inventory" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Open Inventory</button><button id="btn-select-companion" class="border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300">Select for Orders</button>` : `<button id="btn-recruit-companion" class="col-span-2 border border-green-700 px-3 py-2 text-xs text-green-200 hover:border-green-300">Recruit</button>`);
    dialogue.innerHTML = `<div class="mb-4 border-b border-gray-700 pb-3"><div class="text-cyan-300 font-bold tracking-widest">${member.name}</div><div class="text-xs text-gray-500 mt-1">${status}</div></div><p class="mb-4 text-gray-300">${member.downed ? 'I need help getting back up.' : (member.recruited ? 'Ready when you are.' : 'I will travel with someone worth trusting.')}</p><div class="grid grid-cols-2 gap-2"><button id="btn-talk-companion" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Talk</button>${action}<button id="btn-leave-companion" class="col-span-2 border border-gray-700 px-3 py-2 text-xs hover:border-gray-400">Leave</button></div>`;
    dialogue.classList.remove('hidden');
    dialogue.querySelector('#btn-talk-companion').addEventListener('click', () => window.EventBus.emit('UI_LOG', `${member.name}: I am with you.`));
    dialogue.querySelector('#btn-companion-inventory')?.addEventListener('click', () => { if(typeof openCompanionInventory === 'function') openCompanionInventory(member); });
    dialogue.querySelector('#btn-recruit-companion')?.addEventListener('click', () => window.EventBus.emit('RECRUIT_COMPANION', member.id));
    dialogue.querySelector('#btn-select-companion')?.addEventListener('click', () => window.EventBus.emit('TOGGLE_PARTY_MEMBER_SELECTION', member.id));
    dialogue.querySelector('#btn-revive-companion')?.addEventListener('click', () => window.EventBus.emit('REVIVE_COMPANION', member.id));
    dialogue.querySelector('#btn-leave-companion').addEventListener('click', () => { if(typeof closeCompanionDialogue === 'function') closeCompanionDialogue(); else dialogue.classList.add('hidden'); });
}

window.EventBus.on('RECRUIT_COMPANION', memberId => {
    const member = window.GameState.party.members.find(candidate => candidate.id === memberId);
    const entity = window.GameCore.activeEntities.find(candidate => candidate.recruitId === memberId);
    if (!member || !entity) return;
    member.recruited = true; entity.companionId = memberId; delete entity.recruitId;
    window.GameState.party.selectedMembers.push(memberId);
    window.EventBus.emit('UI_LOG', `${member.name} joined the party.`);
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
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
    if (rationIndex < 0) return window.EventBus.emit('UI_LOG', 'A ration is required to revive a companion.');
    window.GameState.inventory.backpack.splice(rationIndex, 1);
    window.GameState.inventory.food = Math.max(0, window.GameState.inventory.food - 1);
    member.downed = false; member.hp = Math.ceil(member.maxHp * 0.3); member.injuries.push('recently revived');
    entity.hp = member.hp; entity.body.setTranslation({ x: entity.visual.position.x, y: entity.visual.position.y + 0.5, z: entity.visual.position.z }, true);
    if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'idle');
    window.EventBus.emit('UI_LOG', `${member.name} was revived at ${member.hp} HP.`);
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus.on('TAKE_COMPANION_ITEM', ({ memberId, index }) => {
    const member = window.GameState.party.members.find(candidate => candidate.id === memberId);
    if (!member || !member.inventory[index]) return;
    if (window.GameState.inventory.backpack.length >= 25) return window.EventBus.emit('UI_LOG', 'Backpack is full.');
    const [itemId] = member.inventory.splice(index, 1);
    window.GameState.inventory.backpack.push(itemId);
    window.EventBus.emit('UI_LOG', `Took ${window.ItemDatabase?.[itemId]?.name || itemId} from ${member.name}.`);
    if(typeof openCompanionInventory === 'function') openCompanionInventory(member);
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('BUY_MERCHANT_ITEM', ({ chestId, index }) => {
    const chest = window.GameCore.activeEntities.find(entity => entity.id === chestId);
    const stock = chest?.merchantInventory?.[index];
    if (!stock || stock.quantity <= 0) return;
    const price = window.GameCore.getMerchantPrice(stock.price, 'kingdom');
    if (window.GameState.inventory.gold < price) return window.EventBus.emit('UI_LOG', 'Not enough gold.');
    if (window.GameState.inventory.backpack.length >= 25) return window.EventBus.emit('UI_LOG', 'Backpack is full.');
    window.GameState.inventory.gold -= price; stock.quantity--; window.GameState.inventory.backpack.push(stock.itemId);
    if(window.CareerManager) window.CareerManager.addXP('merchant', 15);
    if (stock.itemId === 'food') window.GameState.inventory.food++;
    window.EventBus.emit('UI_LOG', `Purchased ${window.ItemDatabase?.[stock.itemId]?.name || stock.itemId}.`);
    if(typeof openMerchantShop === 'function') openMerchantShop(chest);
    window.EventBus.emit('UI_UPDATE_HUD'); window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('ESCORT_CARAVAN', caravanId => {
    window.GameState.party.escortCaravanId = caravanId;
    window.EventBus.emit('UI_LOG', 'Party is escorting the merchant caravan.');
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
});

window.EventBus.on('ABANDON_CARAVAN_ESCORT', () => {
    window.GameState.party.escortCaravanId = null; window.EventBus.emit('UI_LOG', 'Caravan escort abandoned.');
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
});

window.EventBus.on('CRAFT_RUNE', runeId => {
    if(typeof runeRecipes === 'undefined') return;
    const cost = runeRecipes[runeId];
    if (!cost || window.GameState.inventory.backpack.length >= 25) return;
    const pack = window.GameState.inventory.backpack;
    if (window.GameState.inventory.gold < cost.gold || pack.filter(i => i === 'wood').length < cost.wood || pack.filter(i => i === 'stone').length < cost.stone) {
        return window.EventBus.emit('UI_LOG', 'Runeforge requires more gold, timber, or stone.');
    }
    window.GameState.inventory.gold -= cost.gold;
    ['wood', 'stone'].forEach(resource => {
        let count = cost[resource];
        for (let i = pack.length - 1; i >= 0 && count > 0; i--) if (pack[i] === resource) { pack.splice(i, 1); count--; }
    });
    pack.push(runeId);
    if(window.CareerManager) { window.CareerManager.addXP('blacksmith', 30); window.CareerManager.addXP('rune_engineer', 15); }
    window.EventBus.emit('UI_LOG', `Crafted ${window.ItemDatabase?.[runeId]?.name || runeId}.`);
    if(typeof openArmorerForge === 'function') openArmorerForge();
    window.EventBus.emit('UI_UPDATE_HUD'); window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('TREAT_PARTY', () => {
    if (window.GameState.inventory.gold < 10) return window.EventBus.emit('UI_LOG', 'The treatment center requires 10 gold.');
    window.GameState.inventory.gold -= 10; window.GameState.pStats.hp = window.GameState.pStats.maxHp;
    window.GameState.party.members.filter(m => m.recruited).forEach(member => {
        member.downed = false; member.hp = member.maxHp; member.injuries = [];
        const entity = window.GameCore.activeEntities.find(c => c.companionId === member.id);
        if (entity) { entity.hp = member.hp; entity.body.setLinvel({ x: 0, y: 0, z: 0 }, true); if (window.GameCore.playEntityAnimation) window.GameCore.playEntityAnimation(entity, 'idle'); }
    });
    window.EventBus.emit('UI_LOG', 'The treatment center restored the party.');
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
    window.EventBus.emit('UI_UPDATE_HUD');
});

window.EventBus.on('DELIVER_FETCH_QUEST', questIndex => {
    const quest = window.GameState.questBoard[questIndex];
    if (!quest || quest.type !== 'fetch' || !['food', 'wood', 'stone'].includes(quest.resource)) return;
    const matchingItems = window.GameState.inventory.backpack.filter(id => id === quest.resource).length;
    if (matchingItems < quest.amount) return window.EventBus.emit('UI_LOG', `Need ${quest.amount - matchingItems} more ${quest.resource} to complete this request.`);
    
    let remaining = quest.amount;
    window.GameState.inventory.backpack = window.GameState.inventory.backpack.filter(id => {
        if (id === quest.resource && remaining > 0) { remaining--; return false; } return true;
    });
    if (quest.resource === 'food') window.GameState.inventory.food = Math.max(0, window.GameState.inventory.food - quest.amount);
    
    const village = window.VillageManager?.villages.find(c => c.id === quest.issuer);
    if (village) {
        village.stats[quest.resource] = (village.stats[quest.resource] || 0) + quest.amount;
        if (quest.purpose === 'reclaiming occupied territory' && village.territory?.reclamation?.[quest.resource] !== undefined) {
            village.territory.reclamation[quest.resource] += quest.amount;
            const reclaim = village.territory.reclamation;
            const activeRaiders = window.GameCore.activeEntities.some(e => e.def.type === 'npc' && (e.def.faction === 'monster' || e.def.faction === 'forest') && Math.hypot(e.visual.position.x - village.x, e.visual.position.z - village.z) <= village.territory.radius);
            if (!activeRaiders && reclaim.wood >= reclaim.requiredWood && reclaim.stone >= reclaim.requiredStone) {
                village.territory.faction = 'kingdom'; village.territory.control = 50; village.territory.underRaid = false; village.territory.reclamation = null;
                village.stats.prosperity = Math.min(100, (village.stats.prosperity || 0) + 20);
                window.EventBus.emit('UI_LOG', `[RECLAIMED] ${village.name} returned to Kingdom control.`);
            }
        }
    }
    window.GameState.inventory.gold += quest.reward;
    window.GameCore.recordRenown({ renown: 5, faction: 'village', reason: `fulfilled ${village?.name || 'village'} request` });
    window.GameState.questBoard.splice(questIndex, 1);
    window.EventBus.emit('UI_LOG', `Delivered ${quest.amount} ${quest.resource}. Earned ${quest.reward} gold.`);
    const d = document.getElementById('companion-dialogue'); if (d) d.classList.add('hidden');
    window.EventBus.emit('UI_UPDATE_HUD'); window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('PICKUP_GROUND_LOOT', lootId => {
    const lootIndex = window.GameCore.groundLoot.findIndex(entry => entry.id === lootId);
    if (lootIndex < 0) return;
    const [loot] = window.GameCore.groundLoot.splice(lootIndex, 1);
    if (loot.itemId === 'food' && window.CareerManager) window.CareerManager.addXP('gatherer', 10);
    if (window.GameState.inventory.backpack.length >= 25) {
        window.EventBus.emit('UI_LOG', 'Backpack is full.');
        window.GameCore.groundLoot.push(loot); return;
    }
    window.GameCore.scene.remove(loot.visual); window.GameState.inventory.backpack.push(loot.itemId);
    window.EventBus.emit('UI_LOG', `Picked up ${window.ItemDatabase?.[loot.itemId]?.name || loot.itemId}.`);
    window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('DEPOSIT_BASE_ITEM', packIndex => {
    const itemId = window.GameState.inventory.backpack[packIndex]; if (!itemId) return;
    window.GameState.inventory.backpack.splice(packIndex, 1); window.GameState.base.storage.push(itemId);
    if(typeof openPlayerCamp === 'function') openPlayerCamp(); window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('WITHDRAW_BASE_ITEM', storageIndex => {
    if (window.GameState.inventory.backpack.length >= 25 || !window.GameState.base.storage[storageIndex]) return;
    const [itemId] = window.GameState.base.storage.splice(storageIndex, 1); window.GameState.inventory.backpack.push(itemId);
    if(typeof openPlayerCamp === 'function') openPlayerCamp(); window.EventBus.emit('RENDER_INVENTORY');
});

window.EventBus.on('ASSIGN_BASE_JOB', job => {
    const selectedMembers = window.GameState.party.members.filter(m => m.recruited && window.GameState.party.selectedMembers.includes(m.id));
    if (!selectedMembers.length) return window.EventBus.emit('UI_LOG', 'Select companions through their dialogue before assigning camp work.');
    selectedMembers.forEach(member => { member.job = job; });
    window.EventBus.emit('UI_LOG', `${selectedMembers.map(m => m.name).join(', ')} assigned to ${job} duty.`);
    if(typeof openPlayerCamp === 'function') openPlayerCamp();
});

window.EventBus.on('DEV_TOOLS_TOGGLE_ASSETS', () => {
    const panel = document.getElementById('asset-manager-panel');
    if(panel) { panel.classList.toggle('hidden'); panel.classList.toggle('flex'); if(!panel.classList.contains('hidden')) window.EventBus.emit('RENDER_ASSETS'); }
});

document.getElementById('btn-close-asset')?.addEventListener('click', () => { const p = document.getElementById('asset-manager-panel'); if(p) { p.classList.add('hidden'); p.classList.remove('flex'); } });
document.getElementById('btn-stats')?.addEventListener('click', () => document.getElementById('stats-panel')?.classList.toggle('hidden'));
document.getElementById('btn-inv')?.addEventListener('click', () => { const p = document.getElementById('inventory-panel'); if(p) { p.classList.toggle('hidden'); if(!p.classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); } });
document.getElementById('btn-intel')?.addEventListener('click', () => window.EventBus.emit('TOGGLE_INTEL_BAG'));
document.getElementById('btn-asset')?.addEventListener('click', () => window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS'));

window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') window.EventBus.emit('TOGGLE_INTEL_DEBUG');
    if (e.key === 'k' || e.key === 'K') {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        window.EventBus.emit('TOGGLE_INTEL_BAG');
    }
});

// ==========================================
// INITIALIZATION BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    // Create base UI containers if they don't exist
    if (!document.getElementById('squad-manager-panel')) {
        const sm = document.createElement('div'); sm.id = 'squad-manager-panel';
        sm.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-cyan-700 rounded-lg p-5 shadow-2xl z-40 hidden flex-col w-[450px] backdrop-blur-md';
        sm.innerHTML = `<button data-action="close" class="absolute top-2 right-2 text-gray-500 hover:text-white font-bold">&times;</button><div id="squad-manager-content"></div>`;
        document.body.appendChild(sm);
    }

    if (!document.getElementById('faction-map-panel')) {
        const mapModal = document.createElement('div'); mapModal.id = 'faction-map-panel';
        mapModal.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-indigo-700 rounded-lg p-5 shadow-2xl z-40 hidden flex-col w-[600px] h-[600px] backdrop-blur-md';
        mapModal.innerHTML = `
            <button data-action="close" class="absolute top-2 right-2 text-gray-500 hover:text-white font-bold">&times;</button>
            <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 class="text-indigo-400 font-bold tracking-widest text-sm uppercase">🗺️ Kingdom Cartography</h2>
                <div class="text-[10px] text-gray-400">Day <span id="map-day-counter">0</span></div>
            </div>
            <div id="map-canvas-container" class="relative flex-1 bg-gray-950 border border-gray-700 rounded overflow-hidden">
                <canvas id="faction-map-canvas" class="w-full h-full"></canvas>
                <div id="map-tooltip" class="absolute bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg border border-gray-600 hidden pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] z-50"></div>
            </div>
        `;
        document.body.appendChild(mapModal);
    }

    // Add HUD Buttons safely
    const hudControls = document.querySelector('#hud .flex.gap-2.pointer-events-auto');
    if (hudControls) {
        if (!document.getElementById('btn-map')) {
            const mapBtn = document.createElement('button'); mapBtn.id = 'btn-map';
            mapBtn.className = 'bg-indigo-900/60 hover:bg-indigo-700 text-indigo-200 hover:text-white px-3 py-1.5 rounded border border-indigo-800 transition-colors font-bold tracking-widest text-[10px] shadow-lg backdrop-blur-sm uppercase';
            mapBtn.innerText = 'MAP (M)';
            mapBtn.addEventListener('click', () => window.EventBus.emit('TOGGLE_MAP'));
            hudControls.appendChild(mapBtn);
        }
        if (!document.getElementById('btn-squad')) {
            const squadBtn = document.createElement('button'); squadBtn.id = 'btn-squad';
            squadBtn.className = 'bg-cyan-900/60 hover:bg-cyan-700 text-cyan-200 hover:text-white px-3 py-1.5 rounded border border-cyan-800 transition-colors font-bold tracking-widest text-[10px] shadow-lg backdrop-blur-sm uppercase';
            squadBtn.innerText = 'SQUAD (G)';
            squadBtn.addEventListener('click', () => window.EventBus.emit('TOGGLE_SQUAD_MANAGER'));
            hudControls.appendChild(squadBtn);
        }
    }

    // Instantiate Refactored UI Classes
    window.UI_IntelBag = new IntelBagUI();
    window.UI_SquadManager = new SquadManagerUI();
    window.UI_FactionMap = new FactionMapUI();
    window.UI_WorldOverlay = new WorldOverlayUI();
});
