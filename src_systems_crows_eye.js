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
        this.velocity = { x: 0, z: 0 };
                this.isDragging = false;
        this.lastStats = null;
        this.trends = {};
                this.keys = {};
        this.isInspectionExpanded = false;
        this.currentFolder = 'WORLD';
                this.folders = {
                    'WORLD': ['MAP', 'WATCHLIST', 'ACTIONS', 'FORCES', 'FORCE_LAYER', 'CIV_PRESSURE'],
                    'INTEL': ['INTEL', 'TRUTH', 'CHRONICLE', 'ANTHOLOGY', 'LEGENDS', 'OFFICIAL_HISTORY'],
                    'POWER': ['HOUSES', 'HOUSE_HISTORY', 'INFLUENCE_MAP', 'CIV_TIMELINE', 'ECONOMY', 'LINEAGES', 'RELATIONSHIPS'],
                    'BEYOND': ['ORIGIN_DOSSIER', 'IMPACT_ANALYSIS', 'HARVEST', 'RUNES', 'MYSTERIES', 'MEANING', 'DREAMS', 'RECORDED_MEMORY', 'LOST_MEMORY'],
                    'BUREAU': ['PLAYBACK', 'CALIBRATION']
                };


        window.EventBus.on('ENGINE_READY', () => this.init());
    }


        init() {
        this.isActive = window.EngineConfig?.crowsEyeMode || false;
        this.followedEntityIds = new Set(); // Bible §28
        this.createOverlay();

        window.CrowsEye = this; // Global reference for inline event handlers

        window.addEventListener('keydown', (e) => {

            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Escape' && this.isActive) {
                window.EngineConfig.applyQualityPreset('crows_eye');
                window.EventBus.emit('ENV_UPDATE');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
                window.EventBus.emit('UI_LOG', `[CROWSEYE] Observation Layer Status → ENABLED`);
        window.EventBus.on('ENV_UPDATE', () => {
            const currentMode = window.EngineConfig?.crowsEyeMode || false;
            if (this.isActive !== currentMode) {
                this.isActive = currentMode;
                if (this.overlay) {
                    this.overlay.style.display = this.isActive ? 'block' : 'none';
                }
                window.EventBus.emit('UI_LOG', `[CROWSEYE] Observation Layer Status → ${this.isActive ? 'ACTIVE' : 'DORMANT'}`);
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
        this.overlay.style.padding = '20px';
                this.overlay.style.overflow = 'hidden';
        this.overlay.style.backdropFilter = 'blur(10px)';
        
        window.EventBus.on('MYSTERY_GENERATED', () => {
            if (this.currentView !== 'MYSTERY') this.updateTimer = 1.0;
        });

                this.overlay.addEventListener('click', (e) => {

                    if (e.target.dataset.action === 'toggle-inspect') {
                        this.isInspectionExpanded = !this.isInspectionExpanded;
                        this.updateTimer = 1.0;
                        return;
                    }
                                        if (e.target.dataset.action === 'flag-evidence') {
                        const intelId = e.target.dataset.intelId;
                        const mysteryId = e.target.dataset.mysteryId;
                        if (window.InvestigationManager) {
                            window.InvestigationManager.flagEvidence(intelId, mysteryId);
                            this.updateTimer = 1.0;
                        }
                        return;
                    }
                    if (e.target.tagName === 'SPAN' && e.target.dataset.id) {

                        this.selectedEntityId = e.target.dataset.id;
                        this.isInspectionExpanded = true;
                        this.updateTimer = 1.0; // Force immediate update

                
                // --- MAP CLOCK PIVOT: Center view on selected if it has coordinates ---
                const entities = this.gatherEntities();
                const selected = entities.find(ent => ent.id === this.selectedEntityId);
                if (selected) {
                    this.pan.x = selected.x;
                    this.pan.z = selected.z;
                }
            }
                        if (e.target.dataset.view) {
                this.currentView = e.target.dataset.view;
                this.updateTimer = 1.0;
            }
            if (e.target.dataset.folder) {
                this.currentFolder = e.target.dataset.folder;
                if (!this.folders[this.currentFolder].includes(this.currentView)) {
                    this.currentView = this.folders[this.currentFolder][0];
                }
                this.updateTimer = 1.0;
            }
            if (e.target.dataset.action === 'follow') {
                const id = e.target.dataset.id;
                if (this.followedEntityIds.has(id)) {
                    this.followedEntityIds.delete(id);
                } else {
                    this.followedEntityIds.add(id);
                }
                this.updateTimer = 1.0;
            }
        });

                // Dragging & Zooming Logic
        this.overlay.addEventListener('mousedown', (e) => {
            if (this.currentView === 'MAP' && e.shiftKey) {
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
                this.zoom = Math.max(0.005, Math.min(5.0, this.zoom * delta));
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

        getRegionName(x, z) {
        if (!window.EpochManagerInstance) return "Unknown Territory";
        const biome = window.EpochManagerInstance.getBiome(x, z);
        const name = window.EpochManagerInstance.config.biomes[biome]?.name || "The Void";
        
        // Add Compass Direction relative to center
        const angle = Math.atan2(z, x) * (180 / Math.PI);
        let dir = "North";
        if (angle > -45 && angle <= 45) dir = "East";
        else if (angle > 45 && angle <= 135) dir = "South";
        else if (angle > 135 || angle <= -135) dir = "West";
        
        return `${dir} ${name}`;
    }

        update(dt) {
        if (!this.isActive || !this.overlay) return;

        // --- PHASE: INVESTIGATION SCAN (§30) ---
        if (window.Heartbeat?.ticks.t1 && window.InvestigationManager?.scanForEmergentMysteries) {
            window.InvestigationManager.scanForEmergentMysteries();
        }

        // --- VELOCITY-BASED NAVIGATION ---

        if (this.currentView === 'MAP') {
            const accel = 100000 / this.zoom;
            const friction = 0.9;
            
            if (this.keys['w'] || this.keys['arrowup']) this.velocity.z -= accel * dt;
            if (this.keys['s'] || this.keys['arrowdown']) this.velocity.z += accel * dt;
            if (this.keys['a'] || this.keys['arrowleft']) this.velocity.x -= accel * dt;
            if (this.keys['d'] || this.keys['arrowright']) this.velocity.x += accel * dt;
            
            this.pan.x += this.velocity.x * dt;
            this.pan.z += this.velocity.z * dt;
            this.velocity.x *= friction;
            this.velocity.z *= friction;
            
            if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
                this.updateTimer = 1.0; // Keep refreshing while moving
            }
        }
        
        this.updateTimer += dt;
        if (this.updateTimer < 0.1) return; // Faster update for UI responsiveness
        this.updateTimer = 0;

        // Calculate Trends (Delta Analysis)
        this.updateTrends();

                const narrator = window.GameState?.narrator || {};
        const worldDay = window.EngineParams?.worldDay || 0;
        
        // --- PHASE 4: AGENT FOLDERS & TABS ---
        let navHtml = `<div style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px; border-bottom:1px solid #78350f; padding-bottom:10px;">`;
        
        // Tier 1: Folders
        navHtml += `<div style="display:flex; gap:15px; border-bottom:1px solid #451a03; padding-bottom:5px;">`;
        Object.keys(this.folders).forEach(f => {
            const active = this.currentFolder === f;
            navHtml += `<div data-folder="${f}" style="cursor:pointer; font-size:12px; font-weight:bold; letter-spacing:1px; color:${active ? '#fbbf24' : '#78350f'}; border-bottom:${active ? '2px solid #fbbf24' : 'none'}; padding-bottom:3px;">${f}</div>`;
        });
        navHtml += `</div>`;

        // Tier 2: Tabs (Filtered by Folder)
        navHtml += `<div style="display:flex; gap:10px; flex-wrap:wrap;">`;
        this.folders[this.currentFolder].forEach(v => {
            const activeStyle = this.currentView === v ? 'color: #fbbf24; border-bottom: 2px solid #fbbf24;' : 'color: #92400e;';
            navHtml += `<div data-view="${v}" style="cursor:pointer; padding:2px 5px; font-weight:bold; font-size:10px; ${activeStyle}">${v}</div>`;
        });
        navHtml += `</div>`;
        navHtml += `</div>`;


        let contentHtml = '';
        let inspectedHtml = '';
        
        const isCosmological = this.zoom < 0.05;
        const currentEffectiveView = (this.currentView === 'MAP' && isCosmological) ? 'COSMOLOGICAL' : this.currentView;

                switch (currentEffectiveView) {
            case 'COSMOLOGICAL':
                const cosmicData = this.renderCosmologicalView();
                contentHtml = cosmicData.gridHtml;
                inspectedHtml = cosmicData.inspectedHtml;
                break;
            case 'WATCHLIST':

                contentHtml = this.renderWatchlistView();
                break;
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
            case 'OFFICIAL_HISTORY':
                contentHtml = this.renderOfficialHistoryView();
                break;
            case 'HOUSES':
                contentHtml = this.renderHousesView();
                break;
            case 'HOUSE_HISTORY':
                contentHtml = this.renderHouseHistoryView();
                break;
            case 'LINEAGES':
                contentHtml = this.renderLineageView();
                break;
            case 'ANTHOLOGY':
                contentHtml = this.renderAnthologyView();
                break;
            case 'LEGENDS':
                contentHtml = this.renderLegendsView();
                break;
                        case 'INFLUENCE_MAP':
                            contentHtml = this.renderInfluenceView();
                            break;
                        case 'CIV_TIMELINE':
                            contentHtml = this.renderCivilizationTimelineView();
                            break;


                        case 'FORCE_LAYER':
                contentHtml = this.renderForceLayer();
                break;

            case 'CIV_PRESSURE':
                contentHtml = this.renderCivPressureView();
                break;
            case 'HARVEST':
                contentHtml = this.renderHarvestView();
                break;
            case 'RUNES':
                contentHtml = this.renderRunesView();
                break;
            case 'MYSTERIES':
                contentHtml = this.renderMysteriesView();
                break;
            case 'MEANING':
                contentHtml = this.renderMeaningView();
                break;
            case 'DREAMS':
                contentHtml = this.renderDreamsView();
                break;
            case 'RELATIONSHIPS':
                contentHtml = this.renderRelationshipsView();
                break;
            case 'RECORDED_MEMORY':
                contentHtml = this.renderRecordedMemoryView();
                break;
            case 'LOST_MEMORY':
                contentHtml = this.renderLostMemoryView();
                break;
            case 'ORIGIN_DOSSIER':
                contentHtml = this.renderOriginView();
                break;
            case 'PLAYBACK':
                contentHtml = this.renderPlaybackView();
                break;
            case 'CALIBRATION':
                contentHtml = this.renderCalibrationView();
                break;
        }

                                                                this.overlay.innerHTML = `
                <div style="width: 100%; height: 100vh; display: grid; grid-template-columns: 1fr ${this.isInspectionExpanded ? '400px' : '0px'}; grid-template-rows: auto 1fr auto; gap: 0; box-sizing: border-box; overflow: hidden; background: #040608;">
                    <!-- HEADER -->
                    <div style="grid-column: 1 / span 2; background: #000; border-bottom: 1px solid #451a03; padding: 5px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10; height: 40px; box-sizing: border-box;">
                        <div style="font-size: 16px; color: #f59e0b; font-weight: bold; letter-spacing: 2px;">CROW'S EYE - ${currentEffectiveView}</div>
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div style="color: #78350f; font-size: 11px;">DAY: ${worldDay} | TIME: ${window.EngineParams?.timeOfDay?.toFixed(1) || 0}h</div>
                            <div data-action="toggle-inspect" style="cursor: pointer; background: #1e1b4b; color: #fbbf24; padding: 4px 10px; font-size: 10px; border: 1px solid #451a03;">
                                ${this.isInspectionExpanded ? 'CLOSE INSPECT' : 'OPEN INSPECT'}
                            </div>
                        </div>
                    </div>

                    <!-- MAIN CONTENT AREA -->
                    <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0; padding: 5px 10px;">
                        ${navHtml}
                        <div id="ce-atlas-viewport" style="flex-grow: 1; overflow: hidden; background: rgba(0,0,0,0.3); border: 1px solid #451a03; min-height: 0; box-sizing: border-box; position: relative;">
                            ${contentHtml}
                        </div>
                    </div>

                    <!-- INSPECTION PANEL -->
                    <div style="background: rgba(15, 23, 42, 0.95); border-left: 1px solid #78350f; display: ${this.isInspectionExpanded ? 'flex' : 'none'}; flex-direction: column; height: 100%; min-height: 0; transition: width 0.3s ease; position: relative; z-index: 5;">
                        <div style="flex-grow: 1; overflow-y: auto; padding: 20px;">
                                    <div style="color: #fbbf24; font-size: 18px; border-bottom: 1px solid #78350f; padding-bottom: 10px; margin-bottom: 10px;">INSPECTION</div>
                                    ${inspectedHtml || this.renderDefaultInspection()}
                                </div>

                    </div>

                            // FOOTER
        html += `<div style="grid-column: 1 / span 2; background: #000; border-top: 1px solid #451a03; padding: 3px 20px; font-size: 9px; color: #451a03; display: flex; justify-content: space-between; z-index: 10; height: 25px; box-sizing: border-box; align-items: center;">
            <div>ACTIVE RUNTIME PATH: SIMULATION_STABLE</div>
            <div style="color: #fbbf24; opacity: 0.5;">DARK FOREST CONSTITUTION COMPLIANT</div>
            <div style="display:flex; gap:20px;">
                <div style="color:${window.Navigation?.referenceFrame === 'ABSOLUTE' ? '#fbbf24' : 'inherit'}; cursor:pointer;" 
                    onclick="window.Navigation.referenceFrame = window.Navigation.referenceFrame === 'RELATIVE' ? 'ABSOLUTE' : 'RELATIVE'; window.CrowsEye.updateTimer=1.0;">
                    REF: ${window.Navigation?.referenceFrame || 'RELATIVE'}
                </div>
                <div>COORD: [${Math.round(this.pan.x)}, ${Math.round(this.pan.z)}] | ZOOM: ${this.zoom.toFixed(3)}x</div>
            </div>
        </div>`;

        this.overlay.innerHTML = `
            <div style="width: 100%; height: 100vh; display: grid; grid-template-columns: 1fr ${this.isInspectionExpanded ? '400px' : '0px'}; grid-template-rows: auto 1fr auto; gap: 0; box-sizing: border-box; overflow: hidden; background: #040608;">
                <!-- HEADER -->
                <div style="grid-column: 1 / span 2; background: #000; border-bottom: 1px solid #451a03; padding: 5px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10; height: 40px; box-sizing: border-box;">
                    <div style="font-size: 16px; color: #f59e0b; font-weight: bold; letter-spacing: 2px;">CROW'S EYE - ${currentEffectiveView}</div>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <div style="color: #78350f; font-size: 11px;">DAY: ${worldDay} | TIME: ${window.EngineParams?.timeOfDay?.toFixed(1) || 0}h</div>
                        <div data-action="toggle-inspect" style="cursor: pointer; background: #1e1b4b; color: #fbbf24; padding: 4px 10px; font-size: 10px; border: 1px solid #451a03;">
                            ${this.isInspectionExpanded ? 'CLOSE INSPECT' : 'OPEN INSPECT'}
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENT AREA -->
                <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0; padding: 5px 10px;">
                    ${navHtml}
                    <div id="ce-atlas-viewport" style="flex-grow: 1; overflow: hidden; background: rgba(0,0,0,0.3); border: 1px solid #451a03; min-height: 0; box-sizing: border-box; position: relative;">
                        ${contentHtml}
                    </div>
                </div>

                <!-- INSPECTION PANEL -->
                <div style="background: rgba(15, 23, 42, 0.95); border-left: 1px solid #78350f; display: ${this.isInspectionExpanded ? 'flex' : 'none'}; flex-direction: column; height: 100%; min-height: 0; transition: width 0.3s ease; position: relative; z-index: 5;">
                    <div style="flex-grow: 1; overflow-y: auto; padding: 20px;">
                        <div style="color: #fbbf24; font-size: 18px; border-bottom: 1px solid #78350f; padding-bottom: 10px; margin-bottom: 10px;">INSPECTION</div>
                        ${inspectedHtml || this.renderDefaultInspection()}
                    </div>
                </div>

                ${html.split('<!-- FOOTER -->')[1] || html}
            </div>`;
    }




    renderWatchlistView() {
        if (this.followedEntityIds.size === 0) {
            return `<div style="text-align:center; padding:100px; color:#451a03;">
                <div style="font-size:48px; margin-bottom:20px;">∅</div>
                <div>Your Watchlist is empty.</div>
                <div style="font-size:11px; margin-top:10px;">Select entities on the map or in the action ledger to follow them (§28).</div>
            </div>`;
        }
        const allEntities = this.gatherEntities();
        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        this.followedEntityIds.forEach(id => {
            const ent = allEntities.find(e => e.id === id);
            const ref = ent?.ref;
            if (!ref) return;
            const significance = window.ChronicleManager?.npcHistoricalWeights.get(id) || 0;
            const region = this.getRegionName(ent.x, ent.z).split(' (')[0];
            const dist = Math.hypot(ent.x, ent.z) / 1000;

            html += `<div style="background:rgba(255,255,255,0.05); border:1px solid #78350f; padding:15px; border-left: 4px solid #fbbf24;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div style="font-weight:bold; color:#fbbf24; cursor:pointer;" data-id="${id}">${ref.name || 'Unknown'}</div>
                    <div style="color:#78350f; font-size:10px;">SIG: ${significance}</div>
                </div>
                <div style="font-size:11px; margin-bottom:8px;">
                    <div style="color:#94a3b8;">LOC: <span style="color:#fbbf24;">${region}</span> (${dist.toFixed(1)}km)</div>
                    <div style="color:#94a3b8;">TASK: <span style="color:#d97706;">${ref.currentTask || 'Idle'}</span></div>
                    <div style="color:#94a3b8;">GOAL: <span style="color:#92400e;">${ref.taskTarget || 'None'}</span></div>
                </div>
                <div style="border-top:1px solid #451a03; padding-top:10px; display:flex; gap:10px;">
                    <button style="background:transparent; border:1px solid #78350f; color:#78350f; padding:2px 8px; font-size:9px; cursor:pointer;"
                        onclick="window.CrowsEye.pan.x=${ent.x}; window.CrowsEye.pan.z=${ent.z}; window.CrowsEye.currentView='MAP'; window.CrowsEye.updateTimer=1.0;">CENTER MAP</button>
                    <button style="background:transparent; border:1px solid #ef4444; color:#ef4444; padding:2px 8px; font-size:9px; cursor:pointer;"
                        data-action="follow" data-id="${id}">UNFOLLOW</button>
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

                renderMapView() {
        const entities = this.gatherEntities();
        const px = window.GameCore?.playerObj?.visual?.position?.x || 0;
        const pz = window.GameCore?.playerObj?.visual?.position?.z || 0;
        
                // Visible Area Metrics (Task 4)
        const forestSide = window.WorldGenConfig?.darkForestSideMeters || 575843.2;
        const worldSpan = (forestSide * 2) / this.zoom;
        const miles = (worldSpan / 1609.34).toFixed(1);
        
        let displayX = this.pan.x;
        let displayZ = this.pan.z;

        if (window.Navigation?.referenceFrame === 'ABSOLUTE') {
            const absolute = window.Navigation.convertToStarFrame(this.pan.x, this.pan.z);
            displayX = absolute.x;
            displayZ = absolute.z;
        }

        const currentRegion = this.getRegionName(this.pan.x, this.pan.z);
        
        // Observatory Integration (Task 5)
        const registry = window.IntelManager?.registry ? Array.from(window.IntelManager.registry.values()) : [];
        const truthCount = registry.filter(i => i.truth_state === 'TRUE').length;
        const rumorCount = registry.filter(i => i.truth_state === 'FALSE' || i.truth_state === 'UNKNOWN').length;
        const folkloreCount = window.GameState?.anthology?.length || 0;

        let healthHtml = `
        <div style="display: flex; gap: 15px; margin-bottom: 5px; font-size: 10px; background: rgba(0,0,0,0.7); padding: 5px 15px; border: 1px solid #78350f; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <div style="color:#fbbf24; font-weight:bold; letter-spacing:1px; white-space: nowrap;">
                ATLAS: ${currentRegion.toUpperCase()} ${window.Navigation?.referenceFrame === 'ABSOLUTE' ? '[STARS SYNC]' : ''}
            </div>
            <div style="display: flex; gap: 15px; color: #94a3b8;">
                <div>COORD: [${Math.round(displayX)}, ${Math.round(displayZ)}]</div>
                <div>AREA: ${miles}mi</div>
                <div>POP: ${this.lastStats?.population || 0}</div>
                <div style="color:#10b981;">TRUTH: ${truthCount}</div>
                <div style="color:#f59e0b;">RUMOR: ${rumorCount}</div>
                <div style="color:#a855f7;">FOLK: ${folkloreCount}</div>
            </div>
            <div style="color: #78350f;">ZOOM: ${this.zoom.toFixed(2)}x</div>
        </div>`;


        const gridData = this.generateAsciiGrid(entities, px, pz);
        return { gridHtml: healthHtml + gridData.gridHtml, inspectedHtml: gridData.inspectedHtml };
    }


        gatherEntities() {
        const entities = [];
        const lod = this.zoom; // 0.1 (far) to 5.0 (close)
        
        // 1. DEEP SETTLEMENT SCALE (lod > 3.5)
        // Named NPCs, Roles, Building Layouts
        if (lod > 3.5) {
            if (window.GameCore?.activeEntities) {
                window.GameCore.activeEntities.forEach(en => {
                    const profile = window.PersonhoodManager?.getProfile(en.id);
                    let type = 'a'; // Default walker
                    if (profile) {
                        switch(profile.identity) {
                            case 'STEWARD': type = '👑'; break;
                            case 'MERCHANT': type = '🛒'; break;
                            case 'SKEPTIC': type = '📚'; break;
                            case 'SURVIVOR': type = '⚒️'; break;
                            default: type = '🙂'; break;
                        }
                    }
                    entities.push({ type, x: en.visual?.position.x || 0, z: en.visual?.position.z || 0, id: en.id, ref: en });
                });
            }
            // Village Layout Injection (Phase 4)
            window.VillageManager?.villages.forEach(v => {
                const distToPan = Math.hypot(v.x - this.pan.x, v.z - this.pan.z);
                if (distToPan < 500) { // Only if near viewport
                    v.layout.forEach(item => {
                        entities.push({ type: 'B', x: v.x + item.ox, z: v.z + item.oz, id: item.id, ref: { name: item.prefab } });
                    });
                }
            });
        }
        
        // 2. SETTLEMENT SCALE (lod > 1.5)
        // Buildings, Generic NPC Markers, Road Tiles
        if (lod > 1.5) {
            if (window.GameCore?.playerObj?.visual) {
                entities.push({ type: 'P', x: window.GameCore.playerObj.visual.position.x, z: window.GameCore.playerObj.visual.position.z, id: 'player', ref: window.GameCore.playerObj });
            }
            // Generic Monsters
            window.GameCore?.activeEntities?.forEach(en => {
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') {
                    entities.push({ type: 'M', x: en.visual?.position.x || 0, z: en.visual?.position.z || 0, id: en.id, ref: en });
                }
            });
        }
        
        // 3. REGIONAL SCALE (lod > 0.4)
        // Road Network, Trade Routes
        if (lod > 0.4) {
            if (window.RoadManager?.roadNodes) {
                 window.RoadManager.roadNodes.forEach((node, idx) => {
                     // Thinning: Only show 1 in 5 nodes at this scale
                     if (idx % 5 === 0) {
                         entities.push({ type: '#', x: node.x, z: node.z, id: `road_${idx}`, ref: { name: 'Road' } });
                     }
                 });
            }
        }
        
        // 4. WORLD SCALE (Always visible)
        // Villages, Capital, Major Institutions
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                const isCapital = v.id === 'aethelgard' || v.nobleHouse === 'House Sterling'; // Assumption: Aethelgard is capital
                entities.push({ type: isCapital ? 'C' : 'V', x: v.x, z: v.z, id: `village_${v.id}`, ref: v });
            });
        }

        return entities;
    }

    renderMeaningView() {
        if (!window.MeaningEngine) return "Meaning Engine Offline";
        
        const topEvents = window.MeaningEngine.getWhatMatters(5);
        let html = `<div style="display:flex; flex-direction:column; gap:30px;">`;

        html += `<div>
            <div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px; margin-bottom:15px;">WHAT MATTERS? (SIGNIFICANCE ANALYSIS)</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                ${topEvents.map(e => {
                    const parties = window.MeaningEngine.getInterestedParties(e.id);
                    return `
                        <div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:12px;">
                            <div style="color:#fbbf24; font-weight:bold; font-size:12px;">${e.type} (Sig: ${e.significance})</div>
                            <div style="font-size:10px; color:#94a3b8; margin:8px 0;">${e.detail}</div>
                            
                            <div style="border-top:1px solid #451a03; padding-top:8px;">
                                <div style="font-size:9px; color:#78350f; margin-bottom:5px;">WHO CARES & WHY?</div>
                                ${parties.map(p => `
                                    <div style="font-size:9px; color:#94a3b8;">
                                        • <span style="color:#d97706;">${p.name}</span>: ${p.reason}
                                    </div>
                                `).join('') || '<div style="font-size:9px; color:#451a03;">Universal indifference.</div>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;

        // 4, 5, 6 - Subjective State Analysis
        if (this.selectedEntityId) {
             const knownIntel = window.IntelManager?.getIntelForNode(this.selectedEntityId) || [];
             html += `<div>
                <div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px; margin-bottom:15px;">KNOWLEDGE & BELIEF: ${this.selectedEntityId}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${knownIntel.slice(0, 3).map(i => {
                        const state = window.MeaningEngine.getSubjectiveState(this.selectedEntityId, i.intel_id);
                        const lineage = window.MeaningEngine.getBeliefLineage(this.selectedEntityId, i.intel_id);
                        return `
                            <div style="border-left:2px solid #78350f; padding-left:15px;">
                                <div style="font-size:11px; color:#fbbf24;">${i.payload.title}</div>
                                <div style="font-size:10px; color:#94a3b8; margin-top:3px;">
                                    TIER: <span style="color:#d97706;">${state.tier}</span> |
                                    IDENTITY: <span style="color:#fbbf24;">${state.profile?.identity || 'UNKNOWN'}</span>
                                </div>
                                <div style="font-size:10px; color:#94a3b8; margin-top:2px;">
                                    BELIEF: <span style="color:${state.belief === 'CERTAINTY' ? '#10b981' : '#f59e0b'};">${state.belief}</span> | 
                                    CONVICTION: <span style="color:#fbbf24;">${Math.floor((state.conviction?.conviction || 0.5) * 100)}%</span> |
                                    ACCURACY: <span style="color:${state.isCorrect ? '#10b981' : '#ef4444'};">${state.isCorrect ? 'ACCURATE' : 'DISTORTED'}</span>
                                </div>
                                <div style="font-size:9px; color:#78350f; margin-top:5px;">WHY DO THEY BELIEVE IT?</div>
                                <div style="font-size:9px; color:#94a3b8;">Interpretation: <span style="color:#fbbf24;">${state.conclusion?.interpretation || 'LITERAL'}</span></div>
                                <div style="font-size:9px; color:#94a3b8;">Reason: ${state.reason}</div>
                            </div>
                        `;
                    }).join('') || '<div style="font-size:11px; color:#451a03;">Select an entity with knowledge to analyze beliefs.</div>'}
                </div>
             </div>`;
        }

        html += `</div>`;
        return html;
    }

        renderPlaybackView() {
            if (!window.ChronicleManager || !window.PlaybackManager) return "Chronicle Offline";
            const snapshots = Array.from(window.ChronicleManager.snapshots.keys()).sort((a, b) => a - b);
            const currentDay = window.EngineParams?.worldDay || 0;

            let html = `<div style="display:flex; flex-direction:column; gap:25px; height:100%;">`;
        
            // --- PHASE: TIME GHOST RENDERING (§27) ---
            html += `<div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:20px; border-left: 4px solid #fbbf24; flex-shrink:0;">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:15px; font-size:14px; letter-spacing:1px;">5D TEMPORAL CHANNELS (PAST & FUTURE)</div>
            
                <div style="font-size:10px; color:#78350f; margin-bottom:5px;">ARCHAEOLOGICAL PLAYBACK (PAST)</div>
                <input type="range" min="${snapshots[0] || 0}" max="${currentDay}" step="5" value="${window.PlaybackManager.currentPlaybackDay || currentDay}" 
                    style="width:100%; accent-color:#fbbf24; margin-bottom:15px;"
                    oninput="window.PlaybackManager.setPlaybackDay(parseInt(this.value)); window.CrowsEye.updateTimer=1.0;">
            
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#92400e; margin-bottom:20px;">
                    <span>BEGINNING (DAY ${snapshots[0] || 0})</span>
                    <span style="color:#fbbf24; font-size:14px; font-weight:bold;">TIME GHOST: DAY ${window.PlaybackManager.currentPlaybackDay || currentDay}</span>
                    <span>PRESENT</span>
                </div>

                <button style="width:100%; background:#451a03; color:#fbbf24; border:1px solid #78350f; padding:8px; cursor:pointer; font-size:10px;"
                    onclick="window.PlaybackManager.resetToPresent(); window.CrowsEye.updateTimer=1.0;">RESET TO PRESENT</button>
            </div>`;

            // --- THE LOOM OF PROPHECY UI (§24) ---
            const forecasts = window.PlaybackManager.futureForecasts || [];
            html += `<div style="flex-grow:1; overflow-y:auto; border:1px solid #451a03; background:rgba(0,0,0,0.2); padding:15px;">
                <div style="font-size:12px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:8px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                    <span>THE LOOM: PROBABILISTIC FORECAST (+5 DAYS)</span>
                    <span style="color:#78350f; font-size:9px;">INTERVENTION WEIGHT: 0.0</span>
                </div>
            
                ${forecasts.length > 0 ? `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${forecasts.map(f => `
                            <div style="background:rgba(168,85,247,0.05); border:1px solid #78350f; padding:12px; border-left: 3px solid #a855f7;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <div style="color:#a855f7; font-weight:bold; font-size:11px;">[PROBABLE] ${f.type.replace(/_/g, ' ')}</div>
                                    <div style="color:#fbbf24; font-size:10px;">Prob: ${Math.floor(f.probability * 100)}%</div>
                                </div>
                                <div style="font-size:11px; color:#94a3b8; margin-bottom:10px;">${f.detail}</div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:9px; color:#78350f;">PREDICTED DAY: ${f.day}</span>
                                    <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:4px 10px; font-size:9px; cursor:pointer;"
                                        onclick="window.CrowsEye.currentView='WATCHLIST'; window.CrowsEye.selectedEntityId='${f.actorId}'; window.CrowsEye.updateTimer=1.0;">INTERVENE</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `<div style="text-align:center; padding:50px; color:#451a03;">
                    <div style="font-size:32px; margin-bottom:15px;">🧶</div>
                    <div>The Loom is quiet.</div>
                    <div style="font-size:11px; margin-top:5px;">No high-probability tragedies detected in the near future.</div>
                </div>`}
            </div>`;

            // Historical Geography comparison follows...
            const snapshots_sorted = Array.from(window.ChronicleManager.snapshots.keys()).sort((a, b) => a - b);
            const currentPlaybackDay = window.PlaybackManager.currentPlaybackDay || snapshots_sorted[snapshots_sorted.length - 1];
            const snap = window.ChronicleManager.snapshots.get(currentPlaybackDay);

            if (snap) {
                const present = window.ChronicleManager.snapshots.get(snapshots_sorted[snapshots_sorted.length - 1]);
                const popDelta = snap.villages.reduce((s,v) => s + v.pop, 0) - present.villages.reduce((s,v) => s + v.pop, 0);
                const fidelityDelta = (snap.truth - present.truth) * 100;

                html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; flex-shrink:0; margin-top:20px;">
                    <div style="border:1px solid #78350f; padding:15px; background:rgba(0,0,0,0.3);">
                        <div style="color:#78350f; font-size:10px; margin-bottom:5px;">HISTORICAL POPULATION</div>
                        <div style="font-size:18px; color:${popDelta >= 0 ? '#10b981' : '#ef4444'};">${snap.villages.reduce((s,v) => s + v.pop, 0)} <span style="font-size:10px;">(${popDelta > 0 ? '+' : ''}${popDelta})</span></div>
                    </div>

                    <div style="border:1px solid #78350f; padding:15px; background:rgba(0,0,0,0.3);">
                        <div style="color:#78350f; font-size:10px; margin-bottom:5px;">GLOBAL FIDELITY DELTA</div>
                        <div style="font-size:18px; color:${fidelityDelta >= 0 ? '#10b981' : '#ef4444'};">${fidelityDelta > 0 ? '+' : ''}${fidelityDelta.toFixed(1)}%</div>
                    </div>
                </div>`;

                html += `<div style="flex-grow:1; overflow-y:auto; border:1px solid #451a03; background:rgba(0,0,0,0.2); padding:10px; margin-top:10px;">
                    <div style="font-size:12px; color:#fbbf24; border-bottom:1px solid #451a03; padding-bottom:5px; margin-bottom:10px; sticky; top:0; background:inherit;">HISTORICAL GEOGRAPHY & SETTLEMENT DRIFT</div>
                    <table style="width:100%; font-size:11px; text-align:left; border-collapse:collapse;">
                        <tr style="color:#78350f; border-bottom:1px solid #451a03;">
                            <th style="padding:5px;">SETTLEMENT</th>
                            <th>HOUSE</th>
                            <th>HISTORICAL POS</th>
                            <th>CURRENT POS</th>
                            <th>DRIFT</th>
                        </tr>
                        ${snap.villages.map(v => {
                            const presentV = present.villages.find(pv => pv.id === v.id);
                            const dx = presentV ? presentV.x - v.x : 0;
                            const dz = presentV ? presentV.z - v.z : 0;
                            const drift = Math.hypot(dx, dz);
                            const hasMoved = drift > 50;
                        
                            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                                <td style="color:#fbbf24; padding:8px 5px;">${v.name}</td>
                                <td style="color:#94a3b8;">${v.house}</td>
                                <td style="color:#78350f;">[${Math.round(v.x)}, ${Math.round(v.z)}]</td>
                                <td style="color:#94a3b8;">${presentV ? `[${Math.round(presentV.x)}, ${Math.round(presentV.z)}]` : 'LOST'}</td>
                                <td style="color:${hasMoved ? '#ef4444' : '#10b981'};">${hasMoved ? `${Math.round(drift)}m` : 'STABLE'}</td>
                            </tr>`;
                        }).join('')}
                    </table>
                </div>`;
            }

            html += `</div>`;
            return html;
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

    /**
     * Bureau Explanation Layer for Physical Legacy & Property.
     */
    renderPropertyDossier(village) {
                if (!village.propertyRegistry) return "";

                let html = `
                    <div style="margin-top:15px; border-top:1px solid #78350f; padding-top:10px;">
                        <div style="font-size:11px; color:#fbbf24; font-weight:bold; margin-bottom:5px;">PHYSICAL PROPERTY DOSSIER</div>
                        <div style="background:rgba(0,0,0,0.4); border:1px solid #78350f; padding:8px; font-size:10px; max-height:200px; overflow-y:auto;">
                `;

                village.propertyRegistry.forEach((prop, id) => {
                    const ownerName = prop.ownerId ? prop.ownerId.substring(0, 12) : "ABANDONED";
                    const color = prop.ownerId ? "#94a3b8" : "#ef4444";
            
                    html += `
                        <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding:5px 0;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:#fbbf24; font-weight:bold;">${prop.type}: ${id}</span>
                                <span style="color:#78350f;">G${prop.genCount}</span>
                            </div>
                            <div style="font-size:9px;">
                                <span style="color:${color};">OWNER: ${ownerName}</span>
                                <span style="color:#78350f; margin-left:10px;">HIST: ${prop.history.length} events</span>
                            </div>
                        </div>
                    `;
                });

                if (village.propertyRegistry.size === 0) {
                    html += `<div style="color:#451a03; text-align:center;">No registered property found in this settlement.</div>`;
                }

                html += `</div></div>`;
                return html;
    }

    /**
     * Bureau Explanation Layer for Tree vs Wendigo Conflict.
     */
    renderTreeConflictLayer(village) {
                if (!window.WorldTree || !window.ForceManager) return "";

                const treeStrength = window.ForceManager.getForceStrength('Tree');
                const wendigoStrength = window.ForceManager.getForceStrength('Wendigo');
                const continuity = window.WorldTree.continuityRating;

                return `
                    <div style="margin-top:15px; border-top:1px solid #78350f; padding-top:10px;">
                        <div style="font-size:11px; color:#10b981; font-weight:bold; margin-bottom:5px;">TREE VS WENDIGO ANALYSIS</div>
                        <div style="background:rgba(0,0,0,0.4); border:1px solid #065f46; padding:8px; font-size:10px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:#78350f;">GLOBAL CONTINUITY:</span>
                                <span style="color:#10b981;">${continuity}/1000</span>
                            </div>
                            <div style="height:4px; background:#1c1917; width:100%; margin-bottom:10px;">
                                <div style="height:100%; background:#10b981; width:${(continuity/1000)*100}%;"></div>
                            </div>
                    
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                <div style="border-left:2px solid #10b981; padding-left:5px;">
                                    <div style="color:#10b981; font-size:8px;">TREE (PRESERVATION)</div>
                                    <div style="color:#fbbf24; font-size:12px; font-weight:bold;">${treeStrength}</div>
                                </div>
                                <div style="border-left:2px solid #ef4444; padding-left:5px;">
                                    <div style="color:#ef4444; font-size:8px;">WENDIGO (CONSUMPTION)</div>
                                    <div style="color:#fbbf24; font-size:12px; font-weight:bold;">${wendigoStrength}</div>
                                </div>
                            </div>
                    
                            <div style="margin-top:8px; color:#94a3b8; font-size:9px; font-style:italic;">
                                Analysis: ${continuity > 700 ? "Roots are deepening. The Wendigo is starving." : 
                                          continuity < 300 ? "Continuity is fraying. The Hunger is rising." : 
                                          "The struggle for memory is balanced."}
                            </div>
                        </div>
                    </div>
                `;
    }

    /**
     * Manifestation Rule: Crow's Eye explains.
     * Generates a structural explanation of WHY a village is acting the way it is.
     */
    renderContinuityDiagnostic(village) {
        const houseId = `house_${village.nobleHouse.toLowerCase().replace('house ', '')}`;
        const house = window.DynastyManager?.getHouse(houseId);
        if (!house) return "";

        const doubtBeliefs = Array.from(house.beliefs.values()).filter(b => b.state === 'DOUBTED' || b.state === 'PRIVATE_DOUBT');
        
        let html = `
            <div style="margin-top:20px; border-top:1px solid #78350f; padding-top:15px;">
                <div style="font-size:12px; color:#fbbf24; font-weight:bold; margin-bottom:10px;">BUREAU EXPLANATORY LAYER</div>
                
                <div style="background:rgba(0,0,0,0.4); border:1px solid #451a03; padding:12px; font-size:11px;">
                    <div style="margin-bottom:8px;">
                        <span style="color:#78350f;">MANIFESTATION:</span> 
                        <span style="color:#fbbf24;">${village.name} behaving inconsistently.</span>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div style="border-left:2px solid #fbbf24; padding-left:10px;">
                            <div style="color:#fbbf24; font-weight:bold; font-size:10px;">Institutional Doubt</div>
                            <div style="color:#94a3b8;">${doubtBeliefs.length > 0 ? `Contradictions in ${doubtBeliefs.length} dogmas have triggered local unrest.` : 'Internal policy discord detected.'}</div>
                        </div>
                        
                        ${house.activeSchism ? `
                        <div style="border-left:2px solid #ef4444; padding-left:10px;">
                            <div style="color:#ef4444; font-weight:bold; font-size:10px;">Active Schism</div>
                            <div style="color:#94a3b8;">${house.activeSchism.type}: The institutional core is fractured.</div>
                        </div>
                        ` : ''}
                        
                                                <div style="border-left:2px solid #10b981; padding-left:10px;">
                            <div style="color:#10b981; font-weight:bold; font-size:10px;">Cultural Priority</div>
                            <div style="color:#94a3b8;">${village.culture.dominantTrait}: Resources are being redirected to align with this ethos.</div>
                        </div>

                        <!-- --- NEW: IDENTITY DRIFT EXPLANATION --- -->
                        <div style="border-left:2px solid #818cf8; padding-left:10px;">
                            <div style="color:#818cf8; font-weight:bold; font-size:10px;">Identity Drift</div>
                            <div style="color:#94a3b8;">${house.name} is evolving away from its founding mission (${house.foundingIdentity.mission}) toward ${house.currentIdentity.mission}.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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

                const ent = window.GameCore?.activeEntities.find(e => e.id === this.selectedEntityId) || 
                    window.VillageManager?.villages.find(v => `village_${v.id}` === this.selectedEntityId);
                    
        if (!ent) return '<div style="color: #451a03; text-align: center; margin-top: 50px;">Entity no longer in simulation.</div>';

        const name = ent.name || 'Unknown';
        const isVillage = this.selectedEntityId.startsWith('village_');
        const dreams = window.DreamManager?.lexicon || {};

        let html = `
            <div style="color:#fbbf24; font-size:14px; margin-bottom:5px; font-weight:bold;">${name.toUpperCase()}</div>
            <div style="color:#78350f; font-size:10px; margin-bottom:15px; font-family:monospace;">ID: ${this.selectedEntityId}</div>
        `;

                if (isVillage) {
            const v = ent;
            html += `
                <div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:10px; margin-bottom:15px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:11px;">
                        <div><span style="color:#78350f;">POP:</span> <span style="color:#94a3b8;">${v.population.current}</span></div>
                        <div><span style="color:#78350f;">BARRIER:</span> <span style="color:${v.barrierIntegrity < 25 ? '#ef4444' : '#10b981'}; font-weight:bold;">${v.barrierIntegrity}%</span></div>
                        <div><span style="color:#78350f;">ESSENCE:</span> <span style="color:#fbbf24;">${v.stats.essence}</span></div>
                        <div><span style="color:#78350f;">PROSPERITY:</span> <span style="color:#10b981;">${v.stats.prosperity}%</span></div>
                    </div>
                                        <div style="margin-top:10px; font-size:10px; border-top:1px solid #451a03; padding-top:5px;">
                        <span style="color:#78350f;">STATE:</span> <span style="color:#fbbf24;">${v.feudalState || 'DEPENDENT'}</span>
                    </div>
                </div>
                                ${this.renderContinuityDiagnostic(v)}
                ${this.renderTreeConflictLayer(v)}
                ${this.renderPropertyDossier(v)}
            `;
        } else {
            const profile = window.PersonhoodManager?.getProfile(this.selectedEntityId);
            if (profile) {
                html += `
                                        <div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:10px; margin-bottom:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span style="color:#fbbf24; font-size:11px; font-weight:bold;">${profile.identity}</span>
                            <span style="color:#10b981; font-size:10px;">CRED: ${profile.traits.credibility.toFixed(2)}</span>
                        </div>
                        <div style="font-size:10px; color:#94a3b8;">BIAS: ${profile.bias}</div>
                        
                                                <!-- TRUST PROFILE (Node 1) -->
                        <div style="margin-top:10px; border-top:1px solid #451a03; padding-top:8px;">
                            <div style="font-size:8px; color:#78350f; font-weight:bold; margin-bottom:5px;">PERSONAL AMBITION & TRUST</div>
                            <div style="margin-bottom:8px;">
                                <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                                    <span style="color:#fbbf24;">GOAL: ${profile.ambition.lifeGoal}</span>
                                    <span style="color:#d97706;">${Math.floor(profile.ambition.goalProgress * 100)}%</span>
                                </div>
                                <div style="height:3px; background:#1c1917; width:100%;">
                                    <div style="height:100%; background:#fbbf24; width:${profile.ambition.goalProgress * 100}%;"></div>
                                </div>
                                <div style="font-size:7px; color:#78350f; margin-top:2px;">STATUS: ${profile.ambition.satisfaction}</div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                                ${Array.from(profile.relationships.entries()).slice(0, 4).map(([id, rel]) => `

                                    <div style="background:rgba(255,255,255,0.05); padding:3px; font-size:8px; border-left:1px solid #fbbf24;">
                                        <span style="color:#94a3b8;">${id.substring(0,8)}</span>: 
                                        <span style="color:#fbbf24;">T:${rel.trust.toFixed(1)} R:${rel.respect.toFixed(1)}</span>
                                    </div>
                                `).join('') || '<div style="font-size:8px; color:#451a03;">No known links.</div>'}
                            </div>
                        </div>
                    </div>

                `;
            }
        }

        html += `
            <div style="border-top: 1px solid #451a03; padding-top:15px;">
                <div style="font-size:10px; color:#78350f; margin-bottom:10px; letter-spacing:1px;">INFLUENCE OPTIONS</div>
                <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
                    <div style="font-size:9px; color:#94a3b8; margin-bottom:5px;">SYMBOLIC DREAMS (7 DAY DURATION)</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        ${Object.entries(dreams).map(([symbol, data]) => `
                            <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:6px; font-size:9px; cursor:pointer; text-align:left;"
                                onclick="window.DreamManager.sendDream('${this.selectedEntityId}', '${symbol}'); window.CrowsEye.updateTimer=1.0;">
                                <div style="font-weight:bold;">${symbol}</div>
                                <div style="font-size:7px; color:#94a3b8;">+ ${data.ambition} Amb</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        return html;
    }

        flagEvidence(intelId, mysteryId) {
            if (window.InvestigationManager) {
                window.InvestigationManager.flagEvidence(intelId, mysteryId);
                window.EventBus.emit('UI_LOG', `[INVESTIGATION] Clue linked to: ${window.InvestigationManager.mysteries.get(mysteryId).title}`);
                this.updateTimer = 1.0;
            }
        }


        createTheory(title, mysteryId) {
        if (!window.InvestigationManager) return;
        const mystery = window.InvestigationManager.mysteries.get(mysteryId);
        if (!mystery) return;

        // Automatically link all evidence currently in the mystery to this theory
        const evidenceIds = Array.from(mystery.linkedEvidence);
        if (evidenceIds.length === 0) {
            window.EventBus.emit('UI_LOG', '[THEORY] Cannot propose theory without evidence.');
            return;
        }

        window.InvestigationManager.createTheory(title, evidenceIds, mysteryId);
        this.updateTimer = 1.0;
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
            
            html += `<div style="border:1px solid #78350f; padding:15px; background:rgba(0,0,0,0.4); border-top: 4px solid ${progressColor};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-weight:bold; color:#fbbf24; font-size:14px;">${m.title}</span>
                    <span style="color:${progressColor}; font-size:10px;">${stateLabel}</span>
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:15px; line-height:1.4;">${m.description}</div>
                
                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
                        <span style="color:#78350f;">DISCOVERY PROGRESS</span>
                        <span style="color:#fbbf24;">${m.discoveryProgress}%</span>
                    </div>
                    <div style="height:6px; background:#451a03; width:100%;">
                        <div style="height:100%; background:${progressColor}; width:${m.discoveryProgress}%"></div>
                    </div>
                </div>

                <!-- Evidence Chains (§30) -->
                <div style="font-size:11px; margin-bottom:15px;">
                    <div style="color:#fbbf24; margin-bottom:5px; border-bottom:1px solid #451a03;">SUPPORTING EVIDENCE</div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${Array.from(m.linkedEvidence).map(id => {
                            const intel = window.IntelManager.lookup(id);
                            const day = intel?.payload?.timestamp_day || '?';
                            return `<div style="color:#94a3b8; display:flex; justify-content:space-between;">
                                <span>• ${intel ? intel.payload.title : 'Unknown'}</span>
                                <span style="color:#78350f;">[Day ${day}]</span>
                            </div>`;
                        }).join('') || '<div style="color:#451a03;">No evidence linked.</div>'}
                    </div>
                </div>

                                <!-- Theories & Hypothetical Connections -->
                <div style="font-size:11px; margin-bottom:15px; border-top: 1px solid #451a03; padding-top:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <div style="color:#d97706;">PROPOSED THEORIES</div>
                        <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #78350f; padding:2px 5px; font-size:9px; cursor:pointer;"
                            onclick="const t = prompt('Name your theory:'); if(t) window.CrowsEye.createTheory(t, '${m.id}')">PROPOSE THEORY</button>
                    </div>
                    ${m.theories?.length > 0 ? m.theories.map(t => `
                        <div style="background:rgba(217,119,6,0.05); padding:5px; margin-bottom:4px; border-left: 2px solid #d97706;">
                            <div style="color:#fbbf24; font-weight:bold;">${t.title}</div>
                            <div style="color:#92400e; font-size:9px;">Strength: ${Math.floor(t.strength * 100)}% | Evidence: ${t.evidence.size}</div>
                        </div>
                    `).join('') : '<div style="color:#451a03;">No theories proposed.</div>'}
                </div>


                <!-- Contradiction Grouping (§14) -->
                ${m.contradictions.length > 0 ? `
                    <div style="font-size:11px; border-top:1px solid #ef4444; padding-top:10px;">
                        <div style="color:#ef4444; margin-bottom:5px;">ACTIVE CONTRADICTIONS</div>
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
        
        // --- PHASE: LEDGER FILTERS (§29) ---
        const unverified = registry.filter(i => i.truth_state === 'UNKNOWN');
        const verified = registry.filter(i => i.truth_state === 'TRUE' || i.truth_state === 'FALSE');
        
        let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        
        // Left Column: UNVERIFIED RUMORS
        html += `<div>
            <div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px; margin-bottom:10px;">UNVERIFIED RUMORS</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${unverified.map(i => {
                    const conflict = window.InvestigationManager?.findContradictionForIntel(i.intel_id);
                    return `
                        <div style="border-left: 3px solid #94a3b8; padding:8px; background:rgba(255,255,255,0.03);">
                            <div style="font-weight:bold; color:#94a3b8; font-size:11px;">${i.payload.title}</div>
                            <div style="font-size:10px; color:#64748b;">${i.payload.description.substring(0, 100)}...</div>
                            ${conflict ? `<div style="color:#ef4444; font-size:9px; margin-top:4px;">⚠️ ${conflict.type}</div>` : ''}
                        </div>
                    `;
                }).join('') || '<div style="color:#451a03;">No unverified reports.</div>'}
            </div>
        </div>`;

                // Right Column: VERIFIED TRUTH
                html += `<div>
                    <div style="font-size:14px; color:#10b981; border-bottom:1px solid #064e3b; padding-bottom:5px; margin-bottom:10px;">VERIFIED TRUTH & ARTIFACTS</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${verified.map(i => {
                            const activeMysteries = window.InvestigationManager?.getMysteries().filter(m => m.state !== 'RESOLVED') || [];
                            const isLinked = activeMysteries.some(m => m.linkedEvidence.has(i.intel_id));
                            return `
                                <div style="border-left: 3px solid ${i.truth_state === 'TRUE' ? '#10b981' : '#ef4444'}; padding:8px; background:rgba(16,185,129,0.03); opacity:${isLinked ? 0.7 : 1};">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div style="font-weight:bold; color:#10b981; font-size:11px;">${i.payload.title} [${i.truth_state}]</div>
                                        ${activeMysteries.length > 0 ? `
                                            <select style="font-size:9px; background:#000; color:#fbbf24; border:1px solid #451a03; max-width:120px;" 
                                                onchange="if(this.value) { window.CrowsEye.flagEvidence('${i.intel_id}', this.value); this.value=''; }">
                                                <option value="">${isLinked ? 'Link Again...' : 'Link to Mystery...'}</option>
                                                ${activeMysteries.map(m => `<option value="${m.id}">${m.title}</option>`).join('')}
                                            </select>
                                        ` : ''}
                                    </div>
                                    <div style="font-size:10px; color:#94a3b8; margin-top:5px;">${i.payload.description}</div>
                                    <div style="font-size:9px; color:#78350f; margin-top:5px;">SOURCE: ${i.provenance?.[0]?.node_id || 'System'} | DAY: ${i.payload.timestamp_day || '?'}</div>
                                </div>
                            `;
                        }).join('') || '<div style="color:#451a03;">No verified truths.</div>'}
                    </div>
                </div>`;



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

    renderNetworkView() {
        if (!window.PlaybackManager) return "Meaning Network Offline";
        const data = window.PlaybackManager.getNetworkNodes();
        
        let html = `<div style="display:flex; flex-direction:column; gap:20px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">5D PERSPECTIVE: CAUSAL MEANING NETWORK</div>`;
        
        data.nodes.filter(n => n.type === 'MYSTERY').forEach(m => {
            const mysteryLinks = data.links.filter(l => l.source === m.id);
            
            html += `<div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:15px; margin-bottom:15px;">
                <div style="font-weight:bold; color:#fbbf24; font-size:16px;">${m.label}</div>
                <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
                    ${mysteryLinks.map(l => {
                        const targetNode = data.nodes.find(n => n.id === l.target);
                        return `<div style="font-size:11px; color:#94a3b8; display:flex; gap:10px;">
                            <span style="color:#78350f;">⤷ [${l.type}]</span>
                            <span>${targetNode ? targetNode.label : 'Unknown Event'}</span>
                        </div>`;
                    }).join('') || '<div style="font-size:11px; color:#451a03;">No causal connections identified.</div>'}
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderOfficialHistoryView() {
        if (!window.HistoryOffice) return "Historical Office Offline";
        
        const worldEvents = window.ChronicleManager?.worldLedger.slice(-10).reverse() || [];
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">INSTITUTIONAL NARRATIVE: LAYERED MEMORY</div>`;

        worldEvents.forEach(e => {
            const layers = window.HistoryOffice.getNarrativeLayers(e.id);
            if (!layers) return;

            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:20px;">
                <div style="font-weight:bold; color:#fbbf24; font-size:14px; margin-bottom:15px; display:flex; justify-content:space-between;">
                    <span>EVENT: ${e.type} (Day ${e.timestamp.day})</span>
                    <span style="color:#78350f; font-size:10px;">SIGNIFICANCE: ${e.significance}</span>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <!-- Layer 1: Chronicle -->
                    <div style="border-left:2px solid #78350f; padding-left:10px;">
                        <div style="font-size:10px; color:#78350f; font-weight:bold; margin-bottom:5px;">[1] CHRONICLE (What Happened)</div>
                        <div style="font-size:11px; color:#94a3b8; line-height:1.4;">${e.detail}</div>
                    </div>

                    <!-- Layer 2: Truth -->
                    <div style="border-left:2px solid #10b981; padding-left:10px;">
                        <div style="font-size:10px; color:#10b981; font-weight:bold; margin-bottom:5px;">[2] TRUTH (What is Objective)</div>
                        <div style="font-size:11px; color:#94a3b8; line-height:1.4;">${layers.truth ? layers.truth.payload.description : 'Undiscovered Truth.'}</div>
                    </div>

                    <!-- Layer 3: Official History -->
                    <div style="border-left:2px solid #fbbf24; padding-left:10px;">
                        <div style="font-size:10px; color:#fbbf24; font-weight:bold; margin-bottom:5px;">[3] OFFICIAL (What is Taught)</div>
                        ${layers.official.map(o => `
                            <div style="margin-bottom:8px;">
                                <div style="font-size:9px; color:#d97706;">Published by: ${o.bias}</div>
                                <div style="font-size:11px; color:#94a3b8; font-style:italic;">"${o.detail}"</div>
                            </div>
                        `).join('') || '<div style="font-size:11px; color:#451a03;">No official record published.</div>'}
                    </div>

                                        <!-- Layer 4: Folklore -->
                    <div style="border-left:2px solid #a855f7; padding-left:10px;">
                        <div style="font-size:10px; color:#a855f7; font-weight:bold; margin-bottom:5px;">[4] FOLKLORE (What is Remembered)</div>
                        ${layers.folklore.map(p => `
                            <div style="margin-bottom:8px;">
                                                                <div style="font-size:11px; color:#fbbf24; font-weight:bold;">${p.title}</div>
                                <div style="font-size:9px; color:#d97706; uppercase; margin-bottom:3px;">PURPOSE: ${p.purpose || 'MEMORIAL'}</div>
                                <div style="font-size:11px; color:#94a3b8; line-height:1.4; font-style:italic;">"${p.text}"</div>

                                <div style="font-size:8px; color:#78350f; margin-top:2px;">Fidelity: ${Math.floor(p.fidelity * 100)}% | Dist: ${Math.floor(p.distortionLevel * 100)}%</div>
                            </div>
                        `).join('') || '<div style="font-size:11px; color:#451a03;">No folklore yet.</div>'}
                    </div>
                </div>
            </div>`;

        });

        html += `</div>`;
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

        renderHouseHistoryView() {
        if (!window.DynastyManager) return "Dynasty System Offline";
        
        const houses = Array.from(window.DynastyManager.houses.values());
        let selectedHouse = houses[0]; // Default
        
        // If an entity is selected, find their house
        if (this.selectedEntityId) {
            const ent = window.GameCore?.activeEntities.find(e => e.id === this.selectedEntityId);
            if (ent && ent.houseId) selectedHouse = window.DynastyManager.getHouse(ent.houseId);
        }

        let html = `<div style="display:grid; grid-template-columns: 300px 1fr; gap:30px; height:100%;">`;

        // 1. House Selector
        html += `<div style="border-right:1px solid #78350f; padding-right:20px; overflow-y:auto;">
            <div style="font-size:12px; color:#78350f; margin-bottom:15px; sticky; top:0; background:#040608; padding:5px 0;">SELECT INSTITUTION</div>
            ${houses.map(h => `
                <div style="padding:8px; border:1px solid ${h.id === selectedHouse.id ? '#fbbf24' : '#451a03'}; 
                    background:${h.id === selectedHouse.id ? 'rgba(251,191,36,0.1)' : 'transparent'}; 
                    color:${h.isBlessed ? '#fbbf24' : '#92400e'}; cursor:pointer; font-size:11px; margin-bottom:5px;"
                    onclick="window.CrowsEye.selectedEntityId='${h.currentLeader}'; window.CrowsEye.updateTimer=1.0;">
                    ${h.name} ${h.isBlessed ? '★' : ''}
                </div>
            `).join('')}
        </div>`;

        // 2. House Detail
        if (selectedHouse) {
            const resolvedMysteries = window.InvestigationManager?.getMysteries().filter(m => m.state === 'RESOLVED') || [];

            html += `<div style="overflow-y:auto; padding-right:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #78350f; padding-bottom:10px; margin-bottom:20px;">
                    <div>
                        <div style="font-size:24px; color:#fbbf24; font-weight:bold;">${selectedHouse.name.toUpperCase()}</div>
                        <div style="font-size:12px; color:#94a3b8;">Lineage of ${selectedHouse.founder}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px; color:#78350f;">INSTITUTIONAL PRESTIGE</div>
                        <div style="font-size:20px; color:#fbbf24;">${Math.floor(selectedHouse.prestige)}</div>
                    </div>
                </div>

                <!-- INSTITUTIONAL LEVERAGE PANEL (§14, §15) -->
                <div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:15px; margin-bottom:25px;">
                    <div style="font-size:12px; color:#fbbf24; margin-bottom:10px; border-bottom:1px solid #451a03; padding-bottom:5px;">WEAPONIZED TRUTH: INSTITUTIONAL LEVERAGE</div>
                    ${resolvedMysteries.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${resolvedMysteries.map(m => `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:8px; border:1px solid #451a03;">
                                    <div>
                                        <div style="font-size:11px; color:#fbbf24; font-weight:bold;">${m.title}</div>
                                        <div style="font-size:9px; color:#78350f;">Potential Leverage: Tier ${m.tier}</div>
                                    </div>
                                    <div style="display:flex; gap:5px;">
                                        <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:4px 8px; font-size:9px; cursor:pointer;"
                                            onclick="window.DynastyManager.applyLeverage('${selectedHouse.id}', '${m.id}', 'TAXATION'); window.CrowsEye.updateTimer=1.0;">LEVY TAX</button>
                                        <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:4px 8px; font-size:9px; cursor:pointer;"
                                            onclick="window.DynastyManager.applyLeverage('${selectedHouse.id}', '${m.id}', 'DIPLOMACY'); window.CrowsEye.updateTimer=1.0;">EXTORT</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div style="font-size:11px; color:#451a03; text-align:center;">No resolved mysteries available for leverage. Resolve historical truths to pressure this House.</div>'}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">

                    <!-- Beliefs -->
                    <div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px;">
                        <div style="color:#fbbf24; font-size:12px; border-bottom:1px solid #451a03; padding-bottom:5px; margin-bottom:10px;">INSTITUTIONAL BELIEFS</div>
                        ${Object.entries(selectedHouse.beliefs).map(([k, v]) => `
                            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:#78350f;">${k.toUpperCase()}:</span>
                                <span style="color:#94a3b8;">${v}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Lineage -->
                    <div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px;">
                        <div style="color:#fbbf24; font-size:12px; border-bottom:1px solid #451a03; padding-bottom:5px; margin-bottom:10px;">SUCCESSION LINEAGE</div>
                        <div style="font-size:11px; color:#94a3b8;">
                            ${selectedHouse.lineage.slice(-5).reverse().map(l => `<div>• ${l}</div>`).join('') || 'Founder Generation'}
                            <div style="color:#fbbf24; margin-top:5px;">Current: ${selectedHouse.currentLeader}</div>
                        </div>
                    </div>
                </div>

                <!-- House Chronicle -->
                <div style="margin-top:20px;">
                    <div style="color:#fbbf24; font-size:12px; border-bottom:1px solid #78350f; padding-bottom:5px; margin-bottom:10px;">HOUSE CHRONICLE</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${selectedHouse.chronicle.slice(-10).reverse().map(e => `
                            <div style="font-size:11px; background:rgba(255,255,255,0.02); padding:8px; border-left:2px solid #78350f;">
                                <span style="color:#78350f;">[Day ${e.day}]</span> 
                                <span style="color:#fbbf24;">${e.type}:</span> 
                                <span style="color:#94a3b8;">${e.detail}</span>
                            </div>
                        `).join('') || '<div style="font-size:11px; color:#451a03;">No significant events recorded in House memory.</div>'}
                    </div>
                </div>
            </div>`;
        }

        html += `</div>`;
        return html;
    }

        renderHousesView() {
        if (!window.VillageManager || !window.DynastyManager) return "No House Data";
        
        // Calculate House Metrics
        const villages = window.VillageManager.villages;
        const houses = Array.from(window.DynastyManager.houses.values());

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
                <th>HOUSE</th><th>LEADER</th><th>STATUS</th><th>INSTITUTIONAL SCORE</th><th>PROSPERITY</th>
            </tr>`;
        
        houses.sort((a, b) => (b._lastInstitutionalScore || 0) - (a._lastInstitutionalScore || 0));

        houses.forEach(h => {
            const hVillages = villages.filter(v => v.nobleHouse === h.name);
            const prosperity = hVillages.length > 0 ? (hVillages.reduce((s, v) => s + v.stats.prosperity, 0) / hVillages.length) : 0;
            const statusColor = h.isBlessed ? '#fbbf24' : '#92400e';
            const score = h._lastInstitutionalScore || 0;

            html += `<tr style="border-bottom: 1px solid rgba(120,53,15,0.3);">
                <td style="padding:10px 0; color:${statusColor}">${h.name} ${h.isBlessed ? '★' : ''}</td>
                <td>${h.currentLeader}</td>
                <td style="font-size:9px;">${h.isBlessed ? 'BLESSED' : 'CHALLENGER'}</td>
                <td style="font-weight:bold;">${score.toFixed(1)}</td>
                <td>${prosperity.toFixed(1)}%</td>
            </tr>`;
        });
        html += `</table>`;
        return html;
    }


        renderInfluenceView() {
        if (!window.DynastyManager || !window.PersonhoodManager) return "Influence Matrix Offline";
        
        const houses = Array.from(window.DynastyManager.houses.values());
        let html = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">`;

        houses.forEach(house => {
            // KEY INFLUENCER DETECTION (Node 2)
            const houseMembers = Array.from(window.PersonhoodManager.profiles.values())
                .filter(p => p.houseId === house.id || house.archives.includes(p.id))
                .sort((a, b) => {
                    const scoreA = a.traits.credibility + (a.apprentices?.length * 0.1);
                    const scoreB = b.traits.credibility + (b.apprentices?.length * 0.1);
                    return scoreB - scoreA;
                }).slice(0, 5);

            html += `<div style="background:rgba(0,0,0,0.4); border:1px solid #78350f; padding:15px; border-top: 4px solid ${house.isBlessed ? '#fbbf24' : '#78350f'};">
                <div style="font-weight:bold; color:#fbbf24; font-size:14px; margin-bottom:10px;">${house.name.toUpperCase()} INFLUENCERS</div>
                
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${houseMembers.map(m => `
                        <div style="background:rgba(255,255,255,0.03); padding:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;"
                             data-id="${m.id}">
                            <div>
                                <div style="color:#fbbf24; font-size:11px;">${m.id === house.currentLeader ? '👑 ' : ''}${m.id.substring(0, 15)}</div>
                                <div style="color:#78350f; font-size:9px;">${m.identity} | G${m.ancestry.parents.length + 1}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="color:#10b981; font-size:10px;">WEIGHT: ${m.traits.credibility.toFixed(2)}</div>
                                <div style="color:#94a3b8; font-size:8px;">Apprentices: ${m.apprentices.length}</div>
                            </div>
                        </div>
                    `).join('') || '<div style="color:#451a03; font-size:10px;">No high-influence members detected.</div>'}
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

        renderCivilizationTimelineView() {
        if (!window.ChronicleManager || !window.DynastyManager) return "History Matrix Offline";
        
        const events = window.ChronicleManager.worldLedger.slice().reverse();
        const impact = window.DynastyManager.playerImpact;

        let html = `<div style="display:flex; flex-direction:column; gap:20px; height:100%;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">CIVILIZATION CAUSAL TIMELINE (UNIFIED HISTORY)</div>`;

        html += `<div style="flex-grow:1; overflow-y:auto; padding-right:10px; display:flex; flex-direction:column; gap:12px;">`;
        
        events.forEach(e => {
            // Determine Color & Category
            let color = '#94a3b8';
            let icon = '•';
            if (e.type.includes('SCHISM')) { color = '#ef4444'; icon = '⚡'; }
            if (e.type.includes('REFORM') || e.type.includes('IDENTITY')) { color = '#10b981'; icon = '⚙️'; }
            if (e.type.includes('CULTURAL')) { color = '#3b82f6'; icon = '🏮'; }
            if (e.type.includes('SUCCESSION')) { color = '#fbbf24'; icon = '👑'; }

                        // Check if player Author this event
                        const isPlayerEvent = impact.causalChains.some(c => c.day === e.timestamp.day);

                        html += `
                            <div style="background:rgba(255,255,255,0.03); border:1px solid ${isPlayerEvent ? '#fbbf24' : '#451a03'}; padding:12px; border-left: 4px solid ${color};">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <div style="color:${color}; font-weight:bold; font-size:11px;">${icon} ${e.type.replace(/_/g, ' ')}</div>
                                    <div style="color:#78350f; font-size:9px;">Day ${e.timestamp.day} | Sig: ${e.significance}</div>
                                </div>
                                <div style="font-size:11px; color:#94a3b8;">${e.detail}</div>
                    
                                <!-- --- PLAYER LEGACY: FUTURE MEMORY (Node 7) --- -->
                                ${isPlayerEvent ? `
                                    <div style="margin-top:5px; font-size:9px; color:#fbbf24; font-weight:bold;">[PLAYER LEGACY IMPACT - Generation ${window.GameState.playerLegacy?.generation || 1}]</div>
                                ` : ''}
                            </div>
                        `;


        });

        html += `</div></div>`;
        return html;
    }

    renderForceLayer() {


        if (!window.ForceManager) return "Forces Offline";
        const forces = window.ForceManager.forces;
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">METAPHYSICAL PRESSURE: ACTIVE FORCES</div>`;

        Object.entries(forces).forEach(([name, f]) => {
            const strength = f.strength || 0;
            const percent = (strength / 1000) * 100;
            const drift = window.ForceManager.getDrift(name).toFixed(2);

            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px; border-left: 4px solid ${strength > 700 ? '#ef4444' : '#78350f'};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; color:#fbbf24; font-size:16px;">${name.toUpperCase()}</span>
                        <span style="color:#78350f; font-size:10px; margin-left:10px;">[Pressure: ${f.pressure}]</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#fbbf24; font-size:14px;">${strength}/1000</span>
                        <div style="font-size:9px; color:#94a3b8;">PROBABILITY DRIFT: x${drift}</div>
                    </div>
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-bottom:10px; line-height:1.4;">${f.description}</div>
                <div style="height:6px; background:#1c1917; width:100%;">
                    <div style="height:100%; background:#f59e0b; width:${percent}%;"></div>
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderDreamsView() {
        if (!window.DreamManager) return "Dream System Offline";
        const dreams = window.DreamManager.npcDreams;
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">DIVINE CATALYST: ACTIVE SYMBOLIC INFLUENCE</div>`;

        if (dreams.size === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">You have not yet influenced the ambitions of mortals. Use the Inspection panel to send dreams.</div>`;
        }

        dreams.forEach((state, npcId) => {
            const ent = window.GameCore?.activeEntities.find(e => e.id === npcId);
            const name = ent ? ent.name : npcId;
            const intensity = (state.intensity / 2) * 100;
            const corruption = state.corruption * 100;

            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px; border-left: 4px solid ${corruption > 50 ? '#ef4444' : '#78350f'};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; color:#fbbf24; font-size:16px;">${name.toUpperCase()}</span>
                        <span style="color:#78350f; font-size:10px; margin-left:10px;">[Active: ${state.activeSymbol}]</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#fbbf24; font-size:14px;">BOND: ${Math.floor(state.bond * 100)}%</span>
                        <div style="font-size:9px; color:#94a3b8;">INTERPRETATION: ${state.interpretation || 'LITERAL'}</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
                            <span style="color:#78350f;">DREAM INTENSITY</span>
                            <span style="color:#fbbf24;">${Math.floor(intensity)}%</span>
                        </div>
                        <div style="height:4px; background:#1c1917; width:100%;">
                            <div style="height:100%; background:#f59e0b; width:${intensity}%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
                            <span style="color:#78350f;">CORRUPTION RISK</span>
                            <span style="color:${corruption > 50 ? '#ef4444' : '#94a3b8'};">${Math.floor(corruption)}%</span>
                        </div>
                        <div style="height:4px; background:#1c1917; width:100%;">
                            <div style="height:100%; background:#ef4444; width:${corruption}%;"></div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:15px; border-top:1px solid #451a03; padding-top:10px;">
                    <div style="font-size:9px; color:#78350f; margin-bottom:5px;">INFLUENCE HISTORY</div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        ${state.history.slice(-5).map(h => `
                            <span style="font-size:9px; background:#1c1917; padding:2px 5px; color:#94a3b8;">Day ${h.day}: ${h.symbol}</span>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderRelationshipsView() {
        if (!window.PersonhoodManager) return "Social Matrix Offline";
        
        let targetId = this.selectedEntityId;
        if (!targetId && window.GameCore?.playerObj) targetId = 'player';
        
        const profile = window.PersonhoodManager.getProfile(targetId);
        const ent = window.GameCore?.activeEntities.find(e => e.id === targetId);
        const name = ent ? ent.name : targetId;

        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">SOCIAL MATRIX: RELATIONSHIPS OF ${name.toUpperCase()}</div>`;

        if (!profile || profile.relationships.size === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">This individual has no established social links. Select a different entity to observe.</div>`;
        }

        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        
        profile.relationships.forEach((link, id) => {
            const targetEnt = window.GameCore?.activeEntities.find(e => e.id === id);
            const targetName = targetEnt ? targetEnt.name : id;
            const weightPercent = link.weight * 100;
            
            let color = '#94a3b8';
            if (link.type === 'KINSHIP' || link.type === 'LOYALTY') color = '#fbbf24';
            if (link.type === 'RIVALRY' || link.type === 'DISTRUST') color = '#ef4444';
            if (link.type === 'FRIENDSHIP') color = '#10b981';

            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px; border-left: 3px solid ${color};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; color:#fbbf24; font-size:13px;">${targetName.toUpperCase()}</span>
                        <div style="font-size:10px; color:${color}; font-weight:bold;">${link.type}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#78350f; font-size:9px;">BOND SINCE DAY ${link.sinceDay}</span>
                    </div>
                </div>

                <div>
                    <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                        <span style="color:#78350f;">BOND INTENSITY</span>
                        <span style="color:#fbbf24;">${Math.floor(weightPercent)}%</span>
                    </div>
                    <div style="height:4px; background:#1c1917; width:100%;">
                        <div style="height:100%; background:${color}; width:${weightPercent}%;"></div>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderAnthologyView() {
        if (!window.FolkloreEngine) return "Anthology Offline";
        const poems = window.FolkloreEngine.getAnthology();
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">FOLKLORE ANTHOLOGY: CULTURAL MEMORY</div>`;

        if (poems.length === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">The world has not yet crystallized its history into poetry. Perform more legendary deeds.</div>`;
        }

        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        
        poems.forEach(p => {
            html += `<div style="background:rgba(251,191,36,0.02); border:1px solid #78350f; padding:20px; font-family: 'Times New Roman', serif;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #451a03; padding-bottom:10px;">
                    <div>
                        <div style="font-weight:bold; color:#fbbf24; font-size:18px; font-style:italic;">${p.title}</div>
                        <div style="font-size:10px; color:#78350f;">CLASS: ${p.class}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px; color:#78350f;">STORY STRENGTH</div>
                        <div style="font-size:14px; color:#fbbf24;">${Math.floor(p.storyStrength)}</div>
                    </div>
                </div>

                <div style="font-size:13px; color:#94a3b8; line-height:1.6; white-space:pre-wrap; font-style:italic;">"${p.text}"</div>

                <div style="margin-top:20px; border-top:1px solid #451a03; padding-top:10px; font-family: monospace;">
                    <div style="display:flex; justify-content:space-between; font-size:9px;">
                        <span style="color:#78350f;">HISTORICAL WEIGHT: ${Math.floor(p.historicalWeight)}</span>
                        <span style="color:#78350f;">DISTORTION: ${Math.floor(p.distortionLevel * 100)}%</span>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderRecordedMemoryView() {
        if (!window.MountainArchives) return "Archive Network Offline";
        const measurements = window.MountainArchives.getMeasurements();
        const theories = Array.from(window.MountainArchives.activeTheories.values());
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">RECORDED MEMORY: LONGITUDINAL OBSERVATIONS</div>`;

        // 1. Current Theories (Bible §8)
        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            ${theories.map(t => `
                <div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:15px;">
                    <div style="font-weight:bold; color:#fbbf24; font-size:14px; margin-bottom:10px;">${t.name.toUpperCase()}</div>
                    <div style="font-size:11px; color:#94a3b8; line-height:1.4;">${t.description}</div>
                    <div style="margin-top:10px; border-top:1px solid #451a03; padding-top:10px; font-size:10px; color:#78350f;">
                        CONCLUDED FLAW: ${t.flaw}
                    </div>
                </div>
            `).join('')}
        </div>`;

        // 2. Multi-Generation Measurements
        html += `<div>
            <div style="font-size:12px; color:#fbbf24; margin-bottom:15px; border-bottom:1px solid #451a03; padding-bottom:5px;">LONG-TERM TRENDS</div>
            <table style="width:100%; font-size:11px; text-align:left; border-collapse:collapse;">
                <tr style="color:#78350f; border-bottom:1px solid #451a03;">
                    <th style="padding:10px;">EPOCH</th>
                    <th>STAR CHART ROTATION</th>
                    <th>OBJECTIVE ROTATION</th>
                    <th>TIMESTAMP</th>
                </tr>
                ${measurements.map(m => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                        <td style="padding:10px; color:#fbbf24;">EPOCH ${m.epoch}</td>
                        <td style="color:#94a3b8;">${m.starChart.constellationDelta.toFixed(2)} rad</td>
                        <td style="color:#fbbf24;">${m.rotation.toFixed(2)} rad</td>
                        <td style="color:#78350f;">Day ${m.timestamp}</td>
                    </tr>
                `).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px; color:#451a03;">Awaiting sufficient epoch data for analysis.</td></tr>'}
            </table>
        </div>`;

        html += `</div>`;
        return html;
    }

        renderOriginView() {
        // ... existing logic ...
        return "Origin Dossier Placeholder";
    }

        renderImpactAnalysisView() {
            if (!window.DynastyManager) return "Dynasty System Offline";
            const impact = window.DynastyManager.playerFootprint;
            const currentGen = window.GameState.playerLegacy?.generation || 1;

            let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; height:100%; overflow:hidden;">`;

            // Left Column: Causal Footprint & Stats
            html += `<div style="display:flex; flex-direction:column; gap:20px; overflow-y:auto; padding-right:10px;">
                <div style="color:#fbbf24; font-size:14px; border-bottom:1px solid #78350f; padding-bottom:5px;">CAUSAL FOOTPRINT</div>
            
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
                    <div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:10px; text-align:center;">
                        <div style="color:#78350f; font-size:8px;">SCHISMS TRIGGERED</div>
                        <div style="font-size:18px; color:#fbbf24;">${impact.schismsTriggered}</div>
                    </div>
                    <div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:10px; text-align:center;">
                        <div style="color:#78350f; font-size:8px;">REFORMS CATALYZED</div>
                        <div style="font-size:18px; color:#fbbf24;">${impact.reformsCatalyzed}</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:5px;">
                    ${['political', 'cultural', 'knowledge', 'institutional', 'civilizational'].map(key => `
                        <div style="border:1px solid #451a03; padding:5px; background:rgba(0,0,0,0.3); text-align:center;">
                            <div style="font-size:6px; color:#78350f; text-transform:uppercase;">${key}</div>
                            <div style="font-size:10px; color:#fbbf24; font-weight:bold;">${impact[key]}</div>
                        </div>
                    `).join('')}
                </div>

                <div style="flex-grow:1; border:1px solid #451a03; background:rgba(0,0,0,0.2); padding:10px;">
                    <div style="font-size:10px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px; margin-bottom:10px;">HISTORICAL CAUSAL TRACES</div>
                    ${impact.causalChains.slice().reverse().map(c => `
                        <div style="border-left: 2px solid #3b82f6; padding-left:8px; margin-bottom:10px; font-size:9px;">
                            <div style="color:#3b82f6; font-weight:bold;">[ACTION] ${c.action}</div>
                            <div style="color:#94a3b8; margin:2px 0;"><span style="color:#fbbf24;">⤷</span> ${c.intermediate || 'Direct Impact'}</div>
                            <div style="color:#10b981;"><span style="color:#fbbf24;">⤷</span> ${c.consequence}</div>
                        </div>
                    `).join('') || '<div style="color:#451a03; text-align:center; padding:20px;">No ripples yet.</div>'}
                </div>
            </div>`;

            // Right Column: Discovery Journal (The Understanding Tracker)
            html += `<div style="display:flex; flex-direction:column; gap:20px; overflow-y:auto; padding-left:10px; border-left:1px solid #451a03;">
                <div style="color:#fbbf24; font-size:14px; border-bottom:1px solid #78350f; padding-bottom:5px;">DISCOVERY JOURNAL</div>
            
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:5px; margin-bottom:10px;">
                    ${Object.entries(impact.systemMastery).map(([key, val]) => `
                        <div style="text-align:center;">
                            <div style="font-size:6px; color:#78350f; text-transform:uppercase;">${key}</div>
                            <div style="height:2px; background:#1c1917; width:100%; margin-top:2px;">
                                <div style="height:100%; background:#fbbf24; width:${val*100}%;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="flex-grow:1; display:flex; flex-direction:column; gap:10px;">
                    ${Array.from(impact.discoveryJournal.entries()).slice().reverse().map(([key, obs]) => {
                        const isVerified = obs.status === 'VERIFIED';
                        return `
                            <div style="background:rgba(255,255,255,0.02); border:1px solid ${isVerified ? '#10b981' : '#78350f'}; padding:10px; border-left: 3px solid ${isVerified ? '#10b981' : '#78350f'};">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span style="color:${isVerified ? '#10b981' : '#78350f'}; font-size:8px; font-weight:bold;">${obs.type} OBSERVATION</span>
                                    <span style="color:#78350f; font-size:8px;">Day ${obs.observedDay}</span>
                                </div>
                                <div style="font-size:10px; color:#fbbf24; margin-bottom:5px;">"${obs.description}"</div>
                            
                                ${isVerified ? `
                                    <div style="border-top:1px solid #064e3b; padding-top:5px; font-size:9px;">
                                        <span style="color:#10b981; font-weight:bold;">VERIFIED CAUSE:</span>
                                        <span style="color:#94a3b8;">${obs.verifiedCause}</span>
                                    </div>
                                ` : `
                                    <button style="width:100%; background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:4px; font-size:8px; cursor:pointer;"
                                        onclick="const c = prompt('Verify Cause for: ${key}'); if(c) window.DynastyManager.verifyObservation('${key}', c, '${obs.type.toLowerCase()}')">IDENTIFY CAUSE</button>
                                `}
                            </div>
                        `;
                    }).join('') || '<div style="color:#451a03; text-align:center; padding:50px;">No patterns recorded. Observe the world to begin your journal.</div>'}
                </div>
            </div>`;

            html += `</div>`;
            return html;
        }

    renderLostMemoryView() {

        if (!window.DuneInvestigation) return "Dune System Offline";
        const records = window.DuneInvestigation.recoveredRecords;
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">LOST MEMORY: UNFILTERED DUNE ARTIFACTS</div>`;

        if (records.length === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">No ancient fragments have been recovered from the Endless Dunes. Journey into the sands to begin scanning.</div>`;
        }

        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        
        records.forEach(r => {
            const official = window.HistoryOffice?.officialLedger.find(o => o.id === r.targetHistoryId);
            
            html += `<div style="background:rg
