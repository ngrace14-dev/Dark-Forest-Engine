/**
 * Crow's Eye System - Phase 2 (Registration & State)
 */
class CrowsEyeSystem {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.updateTimer = 0;
        this.selectedEntityId = null;
        this.currentView = 'MAP'; // Default view
        this.zoom = 1.0;
        this.pan = { x: 0, z: 0 };
        this.isDragging = false;
        this.lastStats = null;
        this.trends = {};
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        this.isActive = window.EngineConfig?.crowsEyeMode || false;
        this.createOverlay();

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                window.EngineConfig.applyQualityPreset('crows_eye');
                window.EventBus.emit('ENV_UPDATE');
            }
        });
        
        window.EventBus.on('ENV_UPDATE', () => {
            const currentMode = window.EngineConfig?.crowsEyeMode || false;
            if (this.isActive !== currentMode) {
                this.isActive = currentMode;
                if (this.overlay) {
                    this.overlay.style.display = this.isActive ? 'block' : 'none';
                }
                if (this.isActive) {
                    window.EventBus.emit('UI_LOG', "[CrowEye] Enabled");
                    console.log("[CrowEye] Enabled");
                } else {
                    window.EventBus.emit('UI_LOG', "[CrowEye] Disabled");
                    console.log("[CrowEye] Disabled");
                }
            }
        });
    }

    createOverlay() {
        if (this.overlay) return;
        this.overlay = document.createElement('div');
        this.overlay.id = 'crows-eye-status';
        this.overlay.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100%;'>CROW'S EYE ACTIVE<br>Waiting for telemetry...</div>";
        this.overlay.style.position = 'fixed';
        this.overlay.style.inset = '0';
        this.overlay.style.zIndex = '100'; // Lowered from 10000 to allow UI panels in front
        this.overlay.style.color = '#fbbf24';
        this.overlay.style.fontWeight = 'bold';
        this.overlay.style.fontFamily = 'monospace';
        this.overlay.style.fontSize = '14px';
        this.overlay.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.style.display = this.isActive ? 'block' : 'none';
        this.overlay.style.whiteSpace = 'pre';
        this.overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
        this.overlay.style.padding = '40px';
        this.overlay.style.overflowY = 'auto';
        this.overlay.style.backdropFilter = 'blur(10px)';
        
        this.overlay.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN' && e.target.dataset.id) {
                this.selectedEntityId = e.target.dataset.id;
                this.updateTimer = 1.0; // Force immediate update
            }
            if (e.target.dataset.view) {
                this.currentView = e.target.dataset.view;
                this.updateTimer = 1.0;
            }
        });

        // Dragging & Zooming Logic
        this.overlay.addEventListener('mousedown', (e) => {
            if (this.currentView === 'MAP') {
                this.isDragging = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.isActive) {
                const dx = (e.clientX - this.lastMouse.x) * (2.0 / this.zoom);
                const dy = (e.clientY - this.lastMouse.y) * (2.0 / this.zoom);
                this.pan.x -= dx * 100; // Scaled for world units
                this.pan.z -= dy * 100;
                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.updateTimer = 1.0;
            }
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.overlay.addEventListener('wheel', (e) => {
            if (this.currentView === 'MAP') {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom = Math.max(0.1, Math.min(5.0, this.zoom * delta));
                this.updateTimer = 1.0;
            }
        }, { passive: false });
        
        document.body.appendChild(this.overlay);
    }

    renderCalibrationView() {
        if (!window.CalibrationFramework) return "No Calibration Data";
        const settings = window.CalibrationFramework.settings;
        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">`;
        
        const renderSlider = (path, min, max, step) => {
            const parts = path.split('.');
            let val = settings;
            parts.forEach(p => val = val[p]);
            return `
                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span style="color:#fbbf24; font-size:12px;">${path.toUpperCase()}</span>
                        <span style="color:#f59e0b;">${val.toFixed(2)}</span>
                    </div>
                    <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" 
                        style="width:100%; accent-color:#fbbf24;" 
                        oninput="window.CalibrationFramework.settings.${parts[0]}.${parts[1]} = parseFloat(this.value); window.CalibrationFramework.save();">
                </div>
            `;
        };

        html += `<div>
            <div style="font-weight:bold; color:#fbbf24; border-bottom:1px solid #78350f; margin-bottom:15px; padding-bottom:5px;">WORLD KINETICS</div>
            ${renderSlider('world.growthRate', 0, 5, 0.1)}
            ${renderSlider('world.spawnRate', 0, 5, 0.1)}
            ${renderSlider('world.travelRate', 0, 5, 0.1)}
            ${renderSlider('chronicle.expansionPressure', 0, 5, 0.1)}
            <div style="font-weight:bold; color:#fbbf24; border-bottom:1px solid #78350f; margin-top:20px; margin-bottom:15px; padding-bottom:5px;">ECONOMY & CONSUMPTION</div>
            ${renderSlider('economy.consumption', 0, 5, 0.1)}
            ${renderSlider('economy.scarcity', 0, 5, 0.1)}
            ${renderSlider('economy.tradeEfficiency', 0, 5, 0.1)}
        </div>`;

        html += `<div>
            <div style="font-weight:bold; color:#fbbf24; border-bottom:1px solid #78350f; margin-bottom:15px; padding-bottom:5px;">TRUTH & RUMORS</div>
            ${renderSlider('rumors.spreadRate', 0, 5, 0.1)}
            ${renderSlider('rumors.verificationRate', 0, 5, 0.1)}
            ${renderSlider('intel.distortionRate', 0, 1, 0.01)}
            ${renderSlider('chronicle.decayRate', 0, 1, 0.01)}
            <div style="font-weight:bold; color:#fbbf24; border-bottom:1px solid #78350f; margin-top:20px; margin-bottom:15px; padding-bottom:5px;">FORCES & MONSTERS</div>
            ${renderSlider('forces.influence', 0, 5, 0.1)}
            ${renderSlider('monsters.spawnFrequency', 0, 5, 0.1)}
            ${renderSlider('monsters.strengthScale', 0, 5, 0.1)}
        </div>`;

        html += `</div>`;

        // Presets
        html += `<div style="grid-column: span 2; margin-top:20px; border-top: 1px solid #78350f; padding-top:20px;">
            <div style="font-weight:bold; color:#fbbf24; margin-bottom:10px;">EXPERIMENT PRESETS</div>
            <div style="display:flex; gap:10px;">
                ${['AGE_OF_TRUTH', 'GOLDEN_AGE', 'DARK_AGE', 'COLLAPSE'].map(p => `
                    <button style="background:#451a03; color:#fbbf24; border:1px solid #78350f; padding:5px 15px; cursor:pointer;"
                        onclick="window.CalibrationFramework.applyPreset('${p}'); window.CrowsEye.updateTimer=1.0;">${p.replace(/_/g, ' ')}</button>
                `).join('')}
            </div>
        </div>`;

        return html;
    }
        if (!this.isActive || !this.overlay) return;
        
        this.updateTimer += dt;
        if (this.updateTimer < 0.1) return; // Faster update for UI responsiveness
        this.updateTimer = 0;

        // Calculate Trends (Delta Analysis)
        this.updateTrends();

        const narrator = window.GameState?.narrator || {};
        const worldDay = window.EngineParams?.worldDay || 0;
        
        const views = ['MAP', 'ACTIONS', 'ECONOMY', 'INTEL', 'TRUTH', 'CHRONICLE', 'HOUSES', 'LEGENDS', 'FORCES', 'MYSTERIES', 'CALIBRATION'];
        let navHtml = `<div style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #78350f; padding-bottom:10px;">`;
        views.forEach(v => {
            const activeStyle = this.currentView === v ? 'color: #fbbf24; border-bottom: 2px solid #fbbf24;' : 'color: #92400e;';
            navHtml += `<div data-view="${v}" style="cursor:pointer; padding:5px 10px; font-weight:bold; ${activeStyle}">${v}</div>`;
        });
        navHtml += `</div>`;

        let contentHtml = '';
        let inspectedHtml = '';

        switch (this.currentView) {
            case 'MAP':
                const mapData = this.renderMapView();
                contentHtml = mapData.gridHtml;
                inspectedHtml = mapData.inspectedHtml;
                break;
            case 'ACTIONS':
                contentHtml = this.renderActionsView();
                break;
            case 'ECONOMY':
                contentHtml = this.renderEconomyView();
                break;
            case 'INTEL':
                contentHtml = this.renderIntelView();
                break;
            case 'TRUTH':
                contentHtml = this.renderTruthView();
                break;
            case 'CHRONICLE':
                contentHtml = this.renderChronicleView();
                break;
            case 'HOUSES':
                contentHtml = this.renderHousesView();
                break;
            case 'LEGENDS':
                contentHtml = this.renderLegendsView();
                break;
            case 'FORCES':
                contentHtml = this.renderForcesView();
                break;
            case 'MYSTERIES':
                contentHtml = this.renderMysteriesView();
                break;
            case 'CALIBRATION':
                contentHtml = this.renderCalibrationView();
                break;
        }

        this.overlay.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr 400px; gap: 40px; height: 90vh;">
            <div style="display: flex; flex-direction: column;">
                <div style="font-size: 24px; color: #f59e0b; margin-bottom: 10px;">CROW'S EYE - ${this.currentView}</div>
                ${navHtml}
                <div style="flex-grow: 1; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 20px; border: 1px solid #451a03;">
                    ${contentHtml}
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-left: 1px solid #78350f; overflow-y: auto;">
                <div style="color: #fbbf24; font-size: 18px; border-bottom: 1px solid #78350f; padding-bottom: 10px; margin-bottom: 10px;">INSPECTION</div>
                ${inspectedHtml || 'Select an entity to view deep telemetry.'}
            </div>
        </div>`;
    }

    renderMapView() {
        const entities = this.gatherEntities();
        const px = window.GameCore?.playerObj?.visual?.position?.x || 0;
        const pz = window.GameCore?.playerObj?.visual?.position?.z || 0;
        
        // World Health Dashboard
        let healthHtml = `<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px; font-size:10px; background:rgba(0,0,0,0.5); padding:10px; border:1px solid #78350f;">
            <div>POPULATION: ${this.lastStats?.population > 10000 ? 'STABLE' : 'CRITICAL'}</div>
            <div>ECONOMY: ${this.lastStats?.prosperity > 50 ? 'THRIVING' : 'STAGNANT'}</div>
            <div>TRUTH: ${window.IntelTracker?.stats.globalFidelity > 0.7 ? 'PURE' : 'DISTORTED'}</div>
            <div>SECURITY: ${window.ForceManager?.forces['Forest'].strength < 600 ? 'SECURE' : 'THREATENED'}</div>
        </div>`;

        const gridData = this.generateAsciiGrid(entities, px, pz);
        return { gridHtml: healthHtml + gridData.gridHtml, inspectedHtml: gridData.inspectedHtml };
    }

    gatherEntities() {
        const narrator = window.GameState?.narrator || {};
        const entities = [];
        
        if (window.GameCore?.playerObj?.visual) {
            entities.push({ type: 'P', x: window.GameCore.playerObj.visual.position.x, z: window.GameCore.playerObj.visual.position.z, id: 'player', ref: window.GameCore.playerObj });
        }
        
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities.forEach(en => {
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') {
                    if (en.visual) entities.push({ type: 'M', x: en.visual.position.x, z: en.visual.position.z, id: en.id, ref: en });
                }
            });
        }
        
        if (window.AdventurerManager?.records) {
            window.AdventurerManager.records.forEach(rec => {
                if (rec.position) {
                    const isTarget = narrator.targetId === rec.id;
                    entities.push({ type: isTarget ? 'T' : 'A', x: rec.position.x, z: rec.position.z, id: rec.id, ref: rec });
                }
            });
        }
        
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                entities.push({ type: 'V', x: v.x, z: v.z, id: `village_${v.id}`, ref: v });
            });
        }

        if (window.RoadManager?.pathNodes) {
             window.RoadManager.pathNodes.forEach((node, idx) => {
                 entities.push({ type: '#', x: node.x, z: node.z, id: `road_${idx}`, ref: { name: 'Road Node' } });
             });
        }
        return entities;
    }

    renderActionsView() {
        const entities = this.gatherEntities().filter(e => e.ref && (e.ref.currentTask || e.type === 'V' || e.type === 'A' || e.type === 'T'));
        let html = `<table style="width:100%; text-align:left; border-collapse:collapse;">
            <tr style="color:#fbbf24; border-bottom: 1px solid #78350f;">
                <th>ENTITY</th><th>TASK</th><th>GOAL</th><th>REASON</th><th>POS</th>
            </tr>`;
        
        entities.forEach(e => {
            const ref = e.ref;
            const task = ref.currentTask || (e.type === 'V' ? 'Establishing' : 'Idle');
            const goal = ref.taskTarget || 'None';
            const reason = ref.taskReason || 'Unknown';
            html += `<tr style="border-bottom: 1px solid rgba(120,53,15,0.3);">
                <td style="color:#f59e0b; cursor:pointer;" data-id="${e.id}">${ref.name || 'Unnamed'}</td>
                <td>${task}</td>
                <td>${goal}</td>
                <td>${reason}</td>
                <td style="font-size:10px;">${Math.round(e.x)},${Math.round(e.z)}</td>
            </tr>`;
        });
        html += `</table>`;
        return html;
    }

    updateTrends() {
        if (!window.VillageManager) return;
        
        const currentStats = {
            population: window.VillageManager.villages.reduce((sum, v) => sum + v.population.current, 0),
            food: window.VillageManager.villages.reduce((sum, v) => sum + v.stats.food, 0),
            gold: window.VillageManager.villages.reduce((sum, v) => sum + v.stats.gold, 0),
            prosperity: window.VillageManager.villages.reduce((sum, v) => sum + v.stats.prosperity, 0) / (window.VillageManager.villages.length || 1),
            truth: window.IntelTracker?.stats.trueFacts || 0,
            distortion: (window.IntelTracker?.stats.falseFacts || 0) + (window.IntelTracker?.stats.distortedRecords || 0)
        };

        if (this.lastStats) {
            for (let key in currentStats) {
                const delta = currentStats[key] - this.lastStats[key];
                this.trends[key] = delta;
            }
        }
        this.lastStats = currentStats;
    }

    renderTrend(key, unit = "") {
        const delta = this.trends[key] || 0;
        const color = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#94a3b8';
        const sign = delta > 0 ? '+' : '';
        return `<span style="color:${color}; font-size:10px; margin-left:10px;">${sign}${delta.toFixed(1)}${unit}</span>`;
    }

    renderEconomyView() {
        if (!window.VillageManager) return "No Economy Data";
        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:20px; background:rgba(0,0,0,0.4); padding:15px; border:1px solid #78350f;">
            <div>POPULATION: ${this.lastStats?.population} ${this.renderTrend('population')}</div>
            <div>FOOD: ${this.lastStats?.food.toFixed(0)} ${this.renderTrend('food')}</div>
            <div>PROSPERITY: ${this.lastStats?.prosperity.toFixed(1)}% ${this.renderTrend('prosperity')}</div>
            <div>GOLD: ${this.lastStats?.gold.toFixed(0)} ${this.renderTrend('gold')}</div>
        </div>`;
        html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">`;
        window.VillageManager.villages.forEach(v => {
            const crisis = v.crises?.length > 0 ? `<span style="color:#ef4444;"> [CRISIS: ${v.crises.join(',')}]</span>` : '';
            const monopoly = v.hasMonopoly ? `<span style="color:#fbbf24;"> [MONOPOLY]</span>` : '';
            html += `<div style="border:1px solid #78350f; padding:15px; background:rgba(0,0,0,0.2);">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:5px;">${v.name}${monopoly}${crisis}</div>
                <div style="font-size:12px; margin-bottom:10px;">Industry: ${v.industry.industry} (${v.industry.produces})</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:11px;">
                    <div>FOOD: ${Math.floor(v.stats.food)}</div>
                    <div>GOLD: ${Math.floor(v.stats.gold)}</div>
                    <div>WOOD: ${Math.floor(v.stats.wood)}</div>
                    <div>STONE: ${Math.floor(v.stats.stone)}</div>
                    <div>POP: ${v.population.current}/${v.population.capacity}</div>
                    <div>PROSPERITY: ${v.stats.prosperity}%</div>
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    renderMysteriesView() {
        if (!window.InvestigationManager) return "Investigation System Offline";
        const mysteries = window.InvestigationManager.getMysteries();
        
        let html = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap:20px;">`;
        mysteries.forEach(m => {
            const progressColor = m.discoveryProgress >= 100 ? '#10b981' : m.discoveryProgress > 0 ? '#f59e0b' : '#92400e';
            const stateLabel = m.state === 'RESOLVED' ? '[RESOLVED]' : m.state === 'INVESTIGATING' ? '[IN PROGRESS]' : '[UNSOLVED]';
            
            html += `<div style="border:1px solid #78350f; padding:15px; background:rgba(0,0,0,0.4);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-weight:bold; color:#fbbf24;">${m.title}</span>
                    <span style="color:${progressColor}; font-size:10px;">${stateLabel}</span>
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:15px; line-height:1.4;">${m.description}</div>
                
                <div style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
                        <span style="color:#78350f;">INVESTIGATION PROGRESS</span>
                        <span style="color:#fbbf24;">${m.discoveryProgress}%</span>
                    </div>
                    <div style="height:6px; background:#451a03; width:100%;">
                        <div style="height:100%; background:${progressColor}; width:${m.discoveryProgress}%"></div>
                    </div>
                </div>

                <div style="font-size:11px; border-top:1px solid #451a03; padding-top:10px;">
                    <div style="color:#fbbf24; margin-bottom:5px;">EVIDENCE (${m.linkedEvidence.size})</div>
                    ${Array.from(m.linkedEvidence).map(id => {
                        const intel = window.IntelManager.lookup(id);
                        return `<div style="color:#94a3b8; margin-bottom:2px;">• ${intel ? intel.payload.title : 'Unknown Record'}</div>`;
                    }).join('') || '<div style="color:#451a03;">No evidence linked yet.</div>'}
                </div>

                ${m.contradictions.length > 0 ? `
                    <div style="font-size:11px; border-top:1px solid #78350f; padding-top:10px; margin-top:10px;">
                        <div style="color:#ef4444; margin-bottom:5px;">CONTRADICTIONS (${m.contradictions.length})</div>
                        ${m.contradictions.map(c => `<div style="color:#f87171;">⚠️ ${c.reason}</div>`).join('')}
                    </div>
                ` : ''}
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    renderIntelView() {
        if (!window.IntelManager) return "No Intel Data";
        const registry = Array.from(window.IntelManager.registry.values());
        let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
        registry.forEach(i => {
            const color = i.type === 'FACT' ? '#10b981' : i.type === 'WARNING' ? '#f59e0b' : '#94a3b8';
            html += `<div style="border-left: 4px solid ${color}; padding:10px; background:rgba(255,255,255,0.05);">
                <div style="font-weight:bold; color:${color}">${i.payload.title} [${i.type}]</div>
                <div style="font-size:12px;">${i.payload.description}</div>
                <div style="font-size:10px; color:#78350f; margin-top:5px;">
                    Certainty: ${(i.certainty * 100).toFixed(0)}% | Rarity: ${i.rarity} | Gen: ${i.spread_generation}
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    renderTruthView() {
        if (!window.IntelManager) return "No Truth Data";
        const registry = Array.from(window.IntelManager.registry.values());
        const stats = {
            true: registry.filter(i => i.truth_state === 'TRUE').length,
            false: registry.filter(i => i.truth_state === 'FALSE').length,
            unknown: registry.filter(i => i.truth_state === 'UNKNOWN').length
        };
        const fidelity = (stats.true / (registry.length || 1)) * 100;

        let html = `<div style="margin-bottom:20px;">
            <div style="font-size:18px; color:#fbbf24;">GLOBAL FIDELITY: ${fidelity.toFixed(1)}% ${this.renderTrend('truth')}</div>
            <div style="height:10px; background:#451a03; width:100%; margin-top:5px;">
                <div style="height:100%; background:#10b981; width:${fidelity}%"></div>
            </div>
            <div style="display:flex; gap:20px; margin-top:10px; font-size:12px;">
                <div style="color:#10b981;">VERIFIED REALITY: ${stats.true} ${this.renderTrend('truth')}</div>
                <div style="color:#ef4444;">FABRICATIONS/DISTORTIONS: ${stats.false} ${this.renderTrend('distortion')}</div>
                <div style="color:#94a3b8;">UNVERIFIED RUMORS: ${stats.unknown}</div>
            </div>
        </div>`;

        html += `<div style="font-weight:bold; color:#fbbf24; margin-bottom:10px;">MOST DISTORTED EVENTS</div>`;
        const distorted = registry.filter(i => i.truth_state === 'FALSE').sort((a, b) => b.spread_generation - a.spread_generation);
        distorted.forEach(i => {
            html += `<div style="padding:10px; border:1px solid #ef4444; margin-bottom:5px; font-size:12px;">
                ${i.payload.title} - Spread over ${i.spread_generation} generations.
            </div>`;
        });
        return html;
    }

    renderChronicleView() {
        if (!window.ChronicleManager) return "No Chronicle Data";
        const events = window.ChronicleManager.worldLedger.slice().reverse();
        const snapshots = Array.from(window.ChronicleManager.snapshots.keys()).sort((a, b) => a - b);
        
        let html = `<div style="margin-bottom:20px; background:rgba(0,0,0,0.4); padding:15px; border:1px solid #78350f;">
            <div style="font-weight:bold; color:#fbbf24; margin-bottom:10px;">HISTORICAL PLAYBACK</div>
            <input type="range" min="${snapshots[0] || 0}" max="${snapshots[snapshots.length-1] || 0}" step="10" 
                style="width:100%; accent-color:#fbbf24;" id="history-slider">
            <div id="history-preview" style="margin-top:10px; font-size:12px; color:#92400e;">Drag to rewind time.</div>
        </div>`;

        html += `<div style="display:flex; flex-direction:column; gap:5px;">`;
        events.forEach(e => {
            html += `<div style="font-size:12px; padding:5px; border-bottom:1px solid rgba(120,53,15,0.2);">
                <span style="color:#78350f;">[Day ${e.timestamp.day}]</span> 
                <span style="color:#fbbf24;">${e.type}</span>: ${e.detail} 
                <span style="color:#d97706; font-size:10px;">(Sig: ${e.significance})</span>
            </div>`;
        });
        html += `</div>`;
        
        // Add listener for history slider in createOverlay or similar
        setTimeout(() => {
            const slider = document.getElementById('history-slider');
            const preview = document.getElementById('history-preview');
            if (slider) {
                slider.oninput = (e) => {
                    const day = parseInt(e.target.value);
                    const snap = window.ChronicleManager.snapshots.get(day);
                    if (snap) {
                        preview.innerHTML = `DAY ${day}: Population: ${snap.villages.reduce((s, v) => s + v.pop, 0)} | Truth: ${(snap.truth * 100).toFixed(1)}%`;
                    }
                };
            }
        }, 100);

        return html;
    }

    renderHousesView() {
        if (!window.VillageManager) return "No House Data";
        
        // Calculate House Metrics
        const villages = window.VillageManager.villages;
        const mostProsperous = [...villages].sort((a, b) => b.stats.prosperity - a.stats.prosperity)[0];
        const monopolyKing = [...villages].sort((a, b) => (b.hasMonopoly ? 1 : 0) - (a.hasMonopoly ? 1 : 0))[0];
        const mostThreatened = [...villages].sort((a, b) => a.barrierIntegrity - b.barrierIntegrity)[0];

        let html = `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:20px; font-size:10px; background:rgba(0,0,0,0.5); padding:10px; border:1px solid #78350f;">
            <div style="color:#fbbf24;">MOST POWERFUL: ${mostProsperous?.nobleHouse}</div>
            <div style="color:#f59e0b;">MONOPOLY LEAD: ${monopolyKing?.nobleHouse}</div>
            <div style="color:#ef4444;">NEAR COLLAPSE: ${mostThreatened?.nobleHouse}</div>
        </div>`;

        html += `<table style="width:100%; text-align:left; border-collapse:collapse;">
            <tr style="color:#fbbf24; border-bottom: 1px solid #78350f;">
                <th>HOUSE</th><th>LEADER</th><th>MONOPOLY</th><th>PROSPERITY</th><th>WARD</th>
            </tr>`;
        villages.forEach(v => {
            const wardColor = v.barrierIntegrity < 30 ? '#ef4444' : v.barrierIntegrity < 70 ? '#f59e0b' : '#10b981';
            html += `<tr style="border-bottom: 1px solid rgba(120,53,15,0.3);">
                <td style="padding:10px 0;">${v.nobleHouse}</td>
                <td>${v.nobleLeader}</td>
                <td style="color:${v.hasMonopoly ? '#fbbf24' : '#92400e'}">${v.hasMonopoly ? v.industry.produces : 'None'}</td>
                <td>${v.stats.prosperity.toFixed(1)}%</td>
                <td style="color:${wardColor}">${v.barrierIntegrity}%</td>
            </tr>`;
        });
        html += `</table>`;
        return html;
    }

    renderLegendsView() {
        const legends = window.GameState?.legends || [];
        if (legends.length === 0) return "No legends have been recorded yet.";
        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        legends.forEach(l => {
            html += `<div style="border:1px solid #fbbf24; padding:15px; background:rgba(251,191,36,0.05);">
                <div style="font-size:18px; color:#fbbf24; font-weight:bold; margin-bottom:10px;">${l.title}</div>
                <div style="font-style:italic; font-size:13px; line-height:1.4;">"${l.narrative}"</div>
                <div style="margin-top:10px; font-size:11px; color:#78350f;">Historical Power: ${Math.floor(l.power)}</div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    renderForcesView() {
        if (!window.ForceManager) return "No Force Data";
        
        // Story Density Metrics
        const day = window.EngineParams?.worldDay || 1;
        const totalEvents = window.ChronicleManager?.worldLedger.length || 0;
        const eventsPerDay = (totalEvents / day).toFixed(2);
        const legendsCount = window.GameState?.legends?.length || 0;
        const poemsCount = window.GameState?.anthology?.length || 0;
        
        let densityHtml = `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-bottom:20px; font-size:10px; background:rgba(0,0,0,0.5); padding:15px; border:1px solid #d97706;">
            <div>EVENTS/DAY: ${eventsPerDay}</div>
            <div>LEGENDS/TOTAL: ${legendsCount}</div>
            <div>FOLKLORE ITEMS: ${poemsCount}</div>
        </div>`;

        let html = densityHtml + `<div style="display:flex; flex-direction:column; gap:20px;">`;
        Object.entries(window.ForceManager.forces).forEach(([name, data]) => {
            const percent = (data.strength / 1000) * 100;
            
            // Influence mapping
            let influenceHtml = '';
            if (name === 'Truth') {
                const tracker = window.IntelTracker?.stats;
                if (tracker) {
                    influenceHtml = `<div style="font-size:10px; color:#10b981; margin-top:5px;">
                        + ${tracker.trueFacts} Verified Facts<br>
                        - ${tracker.falseFacts + tracker.distortedRecords} Distortions
                    </div>`;
                }
            } else if (name === 'Houses') {
                const monopolies = window.VillageManager?.villages.filter(v => v.hasMonopoly).length || 0;
                influenceHtml = `<div style="font-size:10px; color:#fbbf24; margin-top:5px;">
                    + ${monopolies} Resource Monopolies<br>
                    Avg Prosperity: ${this.lastStats?.prosperity.toFixed(1)}%
                </div>`;
            } else if (name === 'Crow') {
                const legends = window.GameState?.legends?.length || 0;
                influenceHtml = `<div style="font-size:10px; color:#d97706; margin-top:5px;">
                    + ${legends} Recorded Legends<br>
                    + ${window.GameState?.anthology?.length || 0} Folktales Written
                </div>`;
            }

            html += `<div>
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="font-weight:bold; color:#fbbf24;">${name}</span>
                    <span style="color:#78350f;">${data.strength} / 1000</span>
                </div>
                <div style="font-size:11px; margin-bottom:5px;">${data.description}</div>
                <div style="height:8px; background:#451a03; width:100%;">
                    <div style="height:100%; background:#f59e0b; width:${percent}%"></div>
                </div>
                <div style="font-size:10px; margin-top:5px; color:#92400e;">Current ${data.metric}: ${data.value}</div>
                ${influenceHtml}
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    generateAsciiGrid(entities, px, pz) {
        const forestSide = window.WorldGenConfig?.darkForestSideMeters || 575843.2;
        const mountainRadius = forestSide / 2;
        const mountainWidth = window.WorldGenConfig?.mountainRingWidthMeters || 160934.4;
        const totalRadius = (mountainRadius + mountainWidth);
        
        const gridSize = 40; 
        const worldSpan = (totalRadius * 2) / this.zoom; 
        const cellSpan = worldSpan / gridSize;
        
        const cellEntities = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(' ')); 
        
        const typePriority = { 'P': 6, 'T': 5, 'V': 4, 'A': 3, 'M': 2, '#': 1, 'R': 0.5, '.': 0.1, ' ': 0 };
        
        const mapToGrid = (x, z) => {
            const relativeX = x - this.pan.x + (worldSpan / 2);
            const relativeZ = z - this.pan.z + (worldSpan / 2);
            const gx = Math.floor(relativeX / cellSpan);
            const gz = Math.floor(relativeZ / cellSpan);
            return { gx, gz };
        };

        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                const wx = (gx * cellSpan) - (worldSpan / 2) + this.pan.x;
                const wz = (gz * cellSpan) - (worldSpan / 2) + this.pan.z;
                const dist = Math.sqrt(wx*wx + wz*wz); 
                
                if (dist <= totalRadius) {
                    if (dist > mountainRadius) grid[gz][gx] = 'R';
                    else grid[gz][gx] = '.';
                }
            }
        }

        entities.forEach(en => {
            const { gx, gz } = mapToGrid(en.x, en.z);
            if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
                const currentType = grid[gz][gx];
                if (typePriority[en.type] > typePriority[currentType]) {
                    grid[gz][gx] = en.type;
                    cellEntities[gz][gx] = en;
                }
            }
        });
        
        let gridHtml = `<div style="display:flex; justify-content:space-between; font-size:12px; color:#78350f; margin-bottom:10px;">
            <div>Zoom: ${this.zoom.toFixed(1)}x</div>
            <div>Pan: ${Math.round(this.pan.x)}, ${Math.round(this.pan.z)}</div>
        </div>`;
        
        gridHtml += `<div style="line-height: 1.1; font-size: 16px; letter-spacing: 2px; font-family: monospace; cursor: move; user-select: none;">`;
        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                const en = cellEntities[gz][gx];
                const char = grid[gz][gx];
                const isSelected = en && this.selectedEntityId === en.id;
                
                const style = isSelected ? 'background-color: #fbbf24; color: #000; font-weight: bold;' : '';
                const color = char === 'R' ? '#4b5563' : char === 'V' ? '#10b981' : char === 'P' ? '#3b82f6' : char === 'T' ? '#f59e0b' : '#94a3b8';
                const dataId = en && en.id ? `data-id="${en.id}"` : '';
                
                gridHtml += `<span style="${style} color: ${color};" ${dataId}>${char}</span>`;
            }
            gridHtml += '\n';
        }
        gridHtml += `</div>`;

        let inspectedHtml = '';
        if (this.selectedEntityId) {
            const selectedEn = entities.find(e => e.id === this.selectedEntityId);
            if (selectedEn && selectedEn.ref) {
                const ref = selectedEn.ref;
                const type = selectedEn.type;
                
                // --- PROGRESSIVE DISCLOSURE PANEL ---
                let intelButtons = '';
                if (window.IntelManager && window.InvestigationManager) {
                     const intel = window.IntelManager.getIntelForNode(this.selectedEntityId);
                     const mysteries = window.InvestigationManager.getMysteries().filter(m => m.state !== 'RESOLVED');
                     
                     if (intel.length > 0 && mysteries.length > 0) {
                         intelButtons = `<div style="border-top:1px solid #78350f; padding-top:10px; margin-top:10px;">
                             <span style="color:#fbbf24; font-size:11px;">LINK EVIDENCE TO MYSTERY</span>
                             <div style="display:flex; flex-direction:column; gap:5px; margin-top:5px;">
                                 ${intel.map(i => `
                                     <div style="font-size:10px; color:#94a3b8; background:rgba(255,255,255,0.05); padding:5px; border:1px solid #451a03;">
                                         <div style="margin-bottom:3px;">${i.payload.title}</div>
                                         <div style="display:flex; flex-wrap:wrap; gap:5px;">
                                             ${mysteries.map(m => `
                                                 <button style="background:#451a03; color:#fbbf24; border:1px solid #78350f; padding:2px 5px; cursor:pointer;" 
                                                     onclick="window.InvestigationManager.flagEvidence('${i.intel_id}', '${m.id}'); window.CrowsEye.updateTimer=1.0;">
                                                     + ${m.title.split(' ')[1] || m.title}
                                                 </button>
                                             `).join('')}
                                         </div>
                                     </div>
                                 `).join('')}
                             </div>
                         </div>`;
                     }
                }

                inspectedHtml += `<div style="display:flex; flex-direction:column; gap:15px; font-size:13px;">
                    <div><span style="color:#78350f;">NAME:</span> <span style="color:#fbbf24; font-size:16px;">${ref.name || 'Unknown'}</span></div>
                    <div><span style="color:#78350f;">TYPE:</span> ${type === 'P' ? 'Player' : (type === 'A' || type === 'T') ? 'Adventurer' : type === 'V' ? 'Village' : 'Other'}</div>
                    <div><span style="color:#78350f;">LOC:</span> [${Math.round(selectedEn.x)}, ${Math.round(selectedEn.z)}]</div>
                    <div style="border-top:1px solid #451a03; padding-top:10px;">
                        <span style="color:#fbbf24;">INTENT</span><br>
                        Task: ${ref.currentTask || 'Idle'}<br>
                        Goal: ${ref.taskTarget || 'None'}<br>
                        Reason: ${ref.taskReason || 'N/A'}
                    </div>`;

                if (type === 'V') {
                    inspectedHtml += `<div style="border-top:1px solid #451a03; padding-top:10px;">
                        <span style="color:#fbbf24;">CIVILIZATION</span><br>
                        Noble House: ${ref.nobleHouse}<br>
                        Population: ${ref.population.current}<br>
                        Prosperity: ${ref.stats.prosperity}%<br>
                        Trade Disruption: ${ref.tradeDisruptionUntil > window.EngineParams.worldDay ? 'ACTIVE' : 'NONE'}
                    </div>`;
                }

                if (window.IntelManager) {
                    const knownIntel = window.IntelManager.getIntelForNode(this.selectedEntityId);
                    if (knownIntel.length > 0) {
                        inspectedHtml += `<div style="border-top:1px solid #451a03; padding-top:10px;">
                            <span style="color:#fbbf24;">KNOWN INTEL (${knownIntel.length})</span><br>
                            ${knownIntel.slice(0, 3).map(i => `- ${i.payload.title}`).join('<br>')}
                        </div>`;
                    }
                }

                const history = window.ChronicleManager?.getHistoryFor(this.selectedEntityId).slice(-5).reverse() || [];
                if (history.length > 0) {
                    inspectedHtml += `<div style="border-top:1px solid #451a03; padding-top:10px;">
                        <span style="color:#fbbf24;">RECENT HISTORY</span><br>
                        ${history.map(e => `<span style="color:#78350f;">[Day ${e.timestamp.day}]</span> ${e.detail}`).join('<br>')}
                    </div>`;
                }
                
                inspectedHtml += intelButtons;
                inspectedHtml += `</div>`;
            }
        }
        
        return { gridHtml, inspectedHtml };
    }


}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
