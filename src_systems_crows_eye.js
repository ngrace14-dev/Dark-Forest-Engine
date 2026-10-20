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
        
                        const views = ['MAP', 'WATCHLIST', 'ACTIONS', 'ECONOMY', 'INTEL', 'TRUTH', 'CHRONICLE', 'OFFICIAL_HISTORY', 'HOUSES', 'HOUSE_HISTORY', 'LINEAGES', 'ANTHOLOGY', 'LEGENDS', 'FORCES', 'FORCE_LAYER', 'CIV_PRESSURE', 'HARVEST', 'RUNES', 'MYSTERIES', 'MEANING', 'DREAMS', 'RELATIONSHIPS', 'RECORDED_MEMORY', 'LOST_MEMORY', 'ORIGIN_DOSSIER', 'PLAYBACK', 'CALIBRATION'];
        let navHtml = `<div style="display:flex; gap:10px; margin-bottom:5px; border-bottom:1px solid #78350f; padding-bottom:3px; flex-shrink:0; flex-wrap:wrap; overflow:hidden;">`;
        views.forEach(v => {
            const activeStyle = this.currentView === v ? 'color: #fbbf24; border-bottom: 2px solid #fbbf24;' : 'color: #92400e;';
            navHtml += `<div data-view="${v}" style="cursor:pointer; padding:2px 5px; font-weight:bold; font-size:10px; ${activeStyle}">${v}</div>`;
        });
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
            case 'FORCES':
                contentHtml = this.renderForcesView();
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

        renderDefaultInspection() {
            if (!this.selectedEntityId) return '<div style="color: #451a03; text-align: center; margin-top: 50px;">Select an entity to view deep telemetry.</div>';
        
            const ent = window.GameCore?.activeEntities.find(e => e.id === this.selectedEntityId);
            if (!ent) return '<div style="color: #451a03; text-align: center; margin-top: 50px;">Entity no longer in simulation.</div>';

            const name = ent.name || 'Unknown';
            const dreams = window.DreamManager?.lexicon || {};

            let html = `
                <div style="color:#fbbf24; font-size:14px; margin-bottom:15px;">NPID: ${this.selectedEntityId}</div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:20px;">
                    As a 5D Observer, you can influence this mortal's ambition through symbolic dreams.
                </div>
                <div style="border-top: 1px solid #451a03; padding-top:15px;">
                    <div style="font-size:10px; color:#78350f; margin-bottom:10px;">SEND SYMBOLIC DREAM</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        ${Object.entries(dreams).map(([symbol, data]) => `
                            <button style="background:#1e1b4b; color:#fbbf24; border:1px solid #451a03; padding:8px; font-size:10px; cursor:pointer; text-align:left;"
                                onclick="window.DreamManager.sendDream('${this.selectedEntityId}', '${symbol}'); window.CrowsEye.updateTimer=1.0;">
                                <div style="font-weight:bold;">${symbol}</div>
                                <div style="font-size:8px; color:#94a3b8; margin-top:2px;">+ ${data.ambition}</div>
                            </button>
                        `).join('')}
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
                            <div style="font-size:11px; color:#94a3b8; line-height:1.4;">"${p.text.substring(0, 100)}..."</div>
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
            
            html += `<div style="background:rgba(0,0,0,0.5); border:1px solid #78350f; padding:20px; border-left: 4px solid ${r.tier === 'EPOCH' ? '#ef4444' : '#fbbf24'};">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #451a03; padding-bottom:10px;">
                    <div>
                        <div style="font-weight:bold; color:#fbbf24; font-size:14px;">${r.title}</div>
                        <div style="font-size:10px; color:#78350f;">FRAGMENT TIER: ${r.tier}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#78350f; font-size:9px;">RECOVERED DAY ${r.day}</span>
                    </div>
                </div>

                <div style="font-size:12px; color:#94a3b8; line-height:1.6; margin-bottom:15px;">"${r.detail}"</div>

                ${official ? `
                    <div style="margin-top:15px; border-top:1px solid #78350f; padding-top:10px; background:rgba(239,68,68,0.05); padding:10px; border:1px solid #ef4444;">
                        <div style="font-size:10px; color:#ef4444; font-weight:bold; margin-bottom:5px;">⚠️ HISTORICAL CONTRADICTION</div>
                        <div style="font-size:11px; color:#94a3b8;">This fragment directly challenges:</div>
                        <div style="font-size:11px; color:#fbbf24; font-style:italic; margin-top:3px;">"${official.title}"</div>
                    </div>
                ` : ''}
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderOriginView() {
        if (!window.OriginEngine) return "Origin Engine Offline";
        const dossier = window.OriginEngine.getDossier();
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">THE ORIGIN DOSSIER: ENDGAME MODELS</div>`;

        dossier.forEach(cat => {
            const currentModelDesc = window.OriginEngine.models[Object.keys(this.categories || {}).find(k => this.categories[k].title === cat.title)]?.[cat.model] || 'Standard historical interpretation.';
            const confidence = cat.confidence * 100;

            html += `<div style="background:rgba(255,255,255,0.02); border:1px solid #78350f; padding:20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <div>
                        <div style="font-weight:bold; color:#fbbf24; font-size:16px;">${cat.title.toUpperCase()}</div>
                        <div style="font-size:10px; color:#78350f;">ACTIVE MODEL: <span style="color:#fbbf24;">${cat.model}</span></div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#78350f; font-size:10px;">MODEL CONFIDENCE</span>
                        <div style="font-size:18px; color:#fbbf24;">${Math.floor(confidence)}%</div>
                    </div>
                </div>

                <div style="font-size:12px; color:#94a3b8; font-style:italic; margin-bottom:15px; background:rgba(0,0,0,0.2); padding:10px; border-left:2px solid #fbbf24;">
                    "${currentModelDesc}"
                </div>

                <div style="font-size:11px;">
                    <div style="color:#78350f; margin-bottom:5px;">SUPPORTING FRAGMENTS (${cat.evidence.length})</div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        ${cat.evidence.map(e => `
                            <div style="color:#94a3b8; border-left:1px solid #451a03; padding-left:10px;">
                                • ${e.title} <span style="color:#78350f; font-size:9px;">(Tier: ${e.tier})</span>
                            </div>
                        `).join('') || '<div style="color:#451a03;">Awaiting evidence from the Endless Dunes.</div>'}
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderLegendsView() {
        if (!window.ChronicleManager) return "Chronicle Offline";
        const legends = window.GameState?.legends || [];
        const weightMap = window.ChronicleManager.npcHistoricalWeights;
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">LEGEND ENGINE: HISTORICAL INDIVIDUALS</div>`;

        if (legends.length === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">No individuals have yet crossed the threshold of memory. Observe those of rising Significance.</div>`;
        }

        html += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap:20px;">`;
        
        legends.forEach(l => {
            const currentWeight = (weightMap ? weightMap.get(l.actorId) : 0) || l.power;
            const percentToDeification = Math.min(100, (currentWeight / 1000) * 100);

            html += `<div style="background:rgba(251,191,36,0.05); border:1px solid #78350f; padding:20px; border-top: 4px solid #fbbf24;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <div>
                        <div style="font-weight:bold; color:#fbbf24; font-size:18px;">${l.name.toUpperCase()}</div>
                        <div style="font-size:10px; color:#78350f;">ARCHETYPE: ${l.archetype || 'HERO'} | ID: ${l.id}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px; color:#78350f;">HISTORICAL WEIGHT</div>
                        <div style="font-size:16px; color:#fbbf24;">${Math.floor(currentWeight)}</div>
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                        <span style="color:#78350f;">STORY DENSITY (DEIFICATION)</span>
                        <span style="color:#fbbf24;">${Math.floor(percentToDeification)}%</span>
                    </div>
                    <div style="height:4px; background:#1c1917; width:100%;">
                        <div style="height:100%; background:#fbbf24; width:${percentToDeification}%;"></div>
                    </div>
                </div>

                <div style="font-size:12px; color:#94a3b8; line-height:1.4;">
                    Known to history as: <span style="color:#fbbf24; font-style:italic;">"${l.title}"</span>
                </div>

                <div style="margin-top:15px; border-top:1px solid #451a03; padding-top:10px;">
                    <button style="background:#451a03; color:#fbbf24; border:1px solid #78350f; padding:5px 10px; font-size:10px; cursor:pointer;"
                        onclick="window.CrowsEye.selectedEntityId='${l.actorId}'; window.CrowsEye.updateTimer=1.0;">INSPECT LEGACY</button>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderCivPressureView() {
        if (!window.InstabilityEngine) return "Pressure Engine Offline";
        const crises = window.InstabilityEngine.getCrises();
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">CIVILIZATION PRESSURE: INSTITUTIONAL INSTABILITY</div>`;

        if (crises.length === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">Civilization is currently stable. No active schisms or political coverups detected.</div>`;
        }

        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">`;
        
        crises.forEach(c => {
            const house = window.DynastyManager?.getHouse(c.houseId);
            const intensity = c.intensity * 100;
            
            html += `<div style="background:rgba(239,68,68,0.05); border:1px solid #78350f; padding:20px; border-left: 4px solid #ef4444;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <div style="font-weight:bold; color:#ef4444; font-size:16px;">${c.type}: ${house ? house.name : 'STATE'}</div>
                        <div style="font-size:10px; color:#78350f;">START DAY: ${c.startDay}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#78350f; font-size:10px;">INSTABILITY INTENSITY</span>
                        <div style="font-size:18px; color:#ef4444;">${Math.floor(intensity)}%</div>
                    </div>
                </div>

                <div style="font-size:12px; color:#94a3b8; line-height:1.4; margin-bottom:15px;">
                    ${c.detail || 'Systemic instability caused by internal belief contradictions.'}
                </div>

                <div style="height:4px; background:#1c1917; width:100%;">
                    <div style="height:100%; background:#ef4444; width:${intensity}%;"></div>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderRunesView() {
        if (!window.RuneSystem) return "Rune System Offline";
        
        let targetId = this.selectedEntityId;
        if (!targetId && window.GameCore?.playerObj) targetId = 'player';
        
        const state = window.RuneSystem.getCarvings(targetId);
        const slots = window.RuneSystem.BODY_SLOTS;
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">FLESH AS THE LEDGER: RUNIC CARVINGS</div>`;

        // 1. Harvest & Significance Summary
        const harvestPressure = (state.storyDensity * 100);
        html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; background:rgba(255,255,255,0.02); padding:20px; border:1px solid #451a03;">
            <div>
                <div style="font-size:10px; color:#78350f; margin-bottom:5px;">STORY DENSITY (HISTORICAL WEIGHT)</div>
                <div style="font-size:24px; color:#fbbf24;">${Math.floor(state.totalWeight)}</div>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:5px;">
                    <span style="color:#78350f;">HARVEST VISIBILITY (THE TRAP)</span>
                    <span style="color:#ef4444;">${Math.floor(harvestPressure)}%</span>
                </div>
                <div style="height:8px; background:#1c1917; width:100%;">
                    <div style="height:100%; background:#ef4444; width:${Math.min(100, harvestPressure)}%;"></div>
                </div>
                <div style="font-size:9px; color:#94a3b8; margin-top:5px;">Visibility to cosmological forces that consume greatness.</div>
            </div>
        </div>`;

        // 2. Body Map
        html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">`;
        Object.entries(slots).forEach(([key, config]) => {
            const carvings = state.slots[key] || [];
            
            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px; border-top: 2px solid #78350f;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-weight:bold; color:#fbbf24; font-size:12px;">${key}</span>
                    <span style="font-size:9px; color:#78350f;">SPACE: ${carvings.length}/${config.space}</span>
                </div>
                <div style="font-size:10px; color:#94a3b8; margin-bottom:10px;">${config.desc}</div>
                
                <div style="display:flex; flex-direction:column; gap:5px;">
                    ${carvings.map(r => `
                        <div style="font-size:11px; background:#1c1917; padding:5px; border-left:2px solid #fbbf24;">
                            <div style="color:#fbbf24; font-weight:bold;">ᚱ ${r.force}</div>
                            <div style="font-size:9px; color:#78350f;">Weight: +${r.weight}</div>
                        </div>
                    `).join('') || '<div style="font-size:9px; color:#451a03;">Unmarked skin.</div>'}
                </div>
            </div>`;
        });
        html += `</div>`;

        // 3. Carving Buttons (For Testing/Player)
        if (targetId === 'player') {
             html += `<div style="margin-top:20px; border-top:1px solid #78350f; padding-top:20px;">
                <div style="font-size:11px; color:#fbbf24; margin-bottom:10px;">INSCRIBE REALITY (BODY CARVING)</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    ${Object.keys(window.RuneSystem.RUNE_TYPES).map(f => `
                        <button style="background:#451a03; color:#fbbf24; border:1px solid #78350f; padding:5px 10px; font-size:9px; cursor:pointer;"
                            onclick="window.RuneSystem.carveRune('player', '${f}', 'BACK'); window.CrowsEye.updateTimer=1.0;">
                            CARVE ${f}
                        </button>
                    `).join('')}
                </div>
             </div>`;
        }

        html += `</div>`;
        return html;
    }

    renderHarvestView() {
        if (!window.HarvestEngine) return "Harvest Engine Offline";
        const candidates = window.HarvestEngine.getCandidates().slice(0, 10);
        
        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">SIGNIFICANCE MONITOR: WENDIGO HARVEST PRESSURE</div>`;

        if (candidates.length === 0) {
            return html + `<div style="font-size:11px; color:#451a03;">No candidates of sufficient significance detected. Greatness has not yet blossomed in this epoch.</div>`;
        }

        html += `<div style="display:flex; flex-direction:column; gap:15px;">`;
        
        candidates.forEach(([nodeId, data]) => {
            const ent = window.GameCore?.activeEntities.find(e => e.id === nodeId);
            const name = ent ? ent.name : nodeId;
            const pressurePercent = Math.min(100, (data.pressureScore / 1000) * 100);

            html += `<div style="background:rgba(0,0,0,0.3); border:1px solid #78350f; padding:20px; border-left: 4px solid ${data.pressureScore > 800 ? '#ef4444' : '#fbbf24'};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; color:#fbbf24; font-size:18px;">${name.toUpperCase()}</span>
                        <span style="color:#78350f; font-size:10px; margin-left:10px;">[Status: ${data.status}]</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#78350f; font-size:10px;">HARVEST PRESSURE SCORE</span>
                        <div style="font-size:24px; color:${data.pressureScore > 800 ? '#ef4444' : '#fbbf24'};">${Math.floor(data.pressureScore)}</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:15px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                            <span style="color:#78350f;">ORB RECOGNITION</span>
                            <span style="color:#fbbf24;">${Math.floor(data.orbAttention * 100)}%</span>
                        </div>
                        <div style="height:4px; background:#1c1917; width:100%;">
                            <div style="height:100%; background:#fbbf24; width:${data.orbAttention * 100}%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                            <span style="color:#78350f;">HUNTSMAN CULTIVATION</span>
                            <span style="color:#fbbf24;">${Math.floor(data.huntsmanCultivation * 100)}%</span>
                        </div>
                        <div style="height:4px; background:#1c1917; width:100%;">
                            <div style="height:100%; background:#d97706; width:${data.huntsmanCultivation * 100}%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:3px;">
                            <span style="color:#78350f;">WENDIGO INTEREST</span>
                            <span style="color:#ef4444;">${Math.floor(pressurePercent)}%</span>
                        </div>
                        <div style="height:4px; background:#1c1917; width:100%;">
                            <div style="height:100%; background:#ef4444; width:${pressurePercent}%;"></div>
                        </div>
                    </div>
                </div>

                <div style="font-size:10px; color:#94a3b8; line-height:1.4; background:rgba(0,0,0,0.2); padding:10px; border:1px solid #451a03;">
                    Greatness is a beacon to those who harvest significance. This entity is currently being monitored by the cosmological forces of the Forest.
                </div>
            </div>`;
        });

        html += `</div></div>`;
        return html;
    }

    renderLineageView() {
        if (!window.PersonhoodManager) return "Lineage Engine Offline";
        
        let targetId = this.selectedEntityId;
        if (!targetId && window.GameCore?.playerObj) targetId = 'player';
        
        const profile = window.PersonhoodManager.getProfile(targetId);
        const ent = window.GameCore?.activeEntities.find(e => e.id === targetId);
        const name = ent ? ent.name : targetId;

        let html = `<div style="display:flex; flex-direction:column; gap:25px;">`;
        html += `<div style="font-size:14px; color:#fbbf24; border-bottom:1px solid #78350f; padding-bottom:5px;">LINEAGE & INHERITANCE: BLOODLINE OF ${name.toUpperCase()}</div>`;

        if (!profile) return html + `<div style="font-size:11px; color:#451a03;">Select an entity to observe their generational flow.</div>`;

        // 1. Lineage Map
        html += `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; text-align:center;">
            <!-- Parents -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid #451a03; padding:15px;">
                <div style="font-size:10px; color:#78350f; margin-bottom:10px;">ASCENDANTS (PARENTS)</div>
                ${profile.ancestry.parents.map(p => `
                    <div style="color:#fbbf24; font-size:12px; margin-bottom:5px;">${p}</div>
                `).join('') || '<div style="color:
