/**
 * Crow's Eye System - Phase 2 (Registration & State)
 */
class CrowsEyeSystem {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.updateTimer = 0;
        this.selectedEntityId = null;
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
        });
        
        document.body.appendChild(this.overlay);
    }

    update(dt) {
        if (!this.isActive || !this.overlay) return;
        
        this.updateTimer += dt;
        if (this.updateTimer < 1.0) return; // Update once per second
        this.updateTimer = 0;
        
        const chunkCount = window.ChunkManager?.activeChunks?.size || 0;
        const villageCount = window.VillageManager?.villages?.length || 0;
        const narrator = window.GameState?.narrator || {};
        
        let advCount = 0;
        let monsterCount = 0;
        
        const entities = [];
        
        // 1. Player
        let px = 0, pz = 0;
        if (window.GameCore?.playerObj?.visual) {
            px = window.GameCore.playerObj.visual.position.x;
            pz = window.GameCore.playerObj.visual.position.z;
            entities.push({ type: 'P', x: px, z: pz, id: 'player', ref: window.GameCore.playerObj });
        }
        
        // 2. Active Entities (Monsters/Nearby Adv)
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities.forEach(en => {
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') {
                    monsterCount++;
                    if (en.visual) entities.push({ type: 'M', x: en.visual.position.x, z: en.visual.position.z, id: en.id, ref: en });
                }
            });
        }
        
        // 3. All Adventurers (Including Background/Unloaded)
        if (window.AdventurerManager?.records) {
            window.AdventurerManager.records.forEach(rec => {
                advCount++;
                if (rec.position) {
                    // Check if they are the narrator's target
                    const isTarget = narrator.targetId === rec.id;
                    entities.push({ 
                        type: isTarget ? 'T' : 'A', 
                        x: rec.position.x, 
                        z: rec.position.z, 
                        id: rec.id, 
                        ref: rec 
                    });
                }
            });
        }
        
        // 4. Villages
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                entities.push({ type: 'V', x: v.x, z: v.z, id: `village_${v.id}`, ref: v });
            });
        }

        // Add Road Nodes to Entities list
        if (window.RoadManager?.pathNodes) {
             window.RoadManager.pathNodes.forEach((node, idx) => {
                 entities.push({ type: '#', x: node.x, z: node.z, id: `road_${idx}`, ref: { name: 'Road Node' } });
             });
        }
        
        const { gridHtml, inspectedHtml } = this.generateAsciiGrid(entities, px, pz);
        
        let timelineHtml = `\n--- SIMULATION TIMELINE ---\n`;
        const worldDay = window.EngineParams?.worldDay || 0;
        const year = Math.floor(worldDay / 120) + 1; // Assuming 120 days/year for example
        const dayOfYear = worldDay % 120;
        const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
        const season = seasons[Math.floor(dayOfYear / 30)] || 'Unknown';
        
        timelineHtml += `YEAR: ${year} | SEASON: ${season} | DAY: ${worldDay}\n\n`;
        
        const events = window.GameState?.worldEvents || [];
        if (events.length === 0) {
            timelineHtml += `No Recorded History\n`;
        } else {
            const recentEvents = events.slice(-5);
            timelineHtml += `[Year ${year} Day ${worldDay}]\n`;
            recentEvents.forEach(e => {
                timelineHtml += `- ${e.detail || e.type || 'Unknown Event'}\n`;
            });
        }

        let intelHtml = `\n--- INTEL FIDELITY ---\n`;
        if (window.IntelTracker?.stats) {
            const stats = window.IntelTracker.stats;
            const fidelity = (stats.globalFidelity * 100).toFixed(1);
            intelHtml += `GLOBAL TRUTH: ${fidelity}%\n`;
            intelHtml += `FACTS: ${stats.trueFacts} | RUMORS: ${stats.activeRumors}\n`;
            intelHtml += `CORRUPTION: ${stats.falseFacts + stats.distortedRecords} (Fakes: ${stats.fabrications})\n`;
        }
        
        this.overlay.innerHTML = `<div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 400px; gap: 40px;">
            <div>
                <div style="font-size: 24px; color: #f59e0b; margin-bottom: 20px; border-bottom: 1px solid #78350f; padding-bottom: 10px;">CROW'S EYE SIGHT</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; color: #d97706; font-size: 12px;">
                    <div>Watcher Target: ${narrator.targetName || 'None'}</div>
                    <div>Loaded Chunks: ${chunkCount}</div>
                    <div>Villages: ${villageCount}</div>
                    <div>Adventurers: ${advCount}</div>
                </div>
                ${gridHtml}
                ${timelineHtml}
                ${intelHtml}
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-left: 1px solid #78350f; min-height: 80vh;">
                ${inspectedHtml || '\n\nSelect an entity from the map to inspect its intent.'}
            </div>
        </div>`;
    }

    generateAsciiGrid(entities, px, pz) {
        // Automatically determine map dimensions based on the new Epoch Manager settings
        const forestSide = window.WorldGenConfig?.darkForestSideMeters || 575843.2;
        const mountainRadius = forestSide / 2;
        const mountainWidth = window.WorldGenConfig?.mountainRingWidthMeters || 160934.4;
        const totalRadius = (mountainRadius + mountainWidth);
        
        // Target a larger grid for full-screen mode
        const gridSize = 40; 
        const worldSpan = totalRadius * 2; 
        const cellSpan = worldSpan / gridSize;
        
        // Initialize empty grid tracking the top priority entity in each cell
        const cellEntities = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(' ')); // Default to empty space for circular mask
        
        const typePriority = { 'P': 6, 'T': 5, 'V': 4, 'A': 3, 'M': 2, '#': 1, 'R': 0.5, '.': 0.1, ' ': 0 };
        
        // Map absolute world coordinate to an absolute grid coordinate
        const mapToGrid = (x, z) => {
            const shiftedX = x + totalRadius;
            const shiftedZ = z + totalRadius;
            const gx = Math.floor(shiftedX / cellSpan);
            const gz = Math.floor(shiftedZ / cellSpan);
            return { gx, gz };
        };

        // Render Circular Map Mask and Mountain Wall
        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                // Calculate world center of this cell
                const wx = (gx * cellSpan) - totalRadius + (cellSpan / 2);
                const wz = (gz * cellSpan) - totalRadius + (cellSpan / 2);
                const dist = Math.sqrt(wx*wx + wz*wz); // Use true radial distance
                
                if (dist <= totalRadius) {
                    if (dist > mountainRadius) {
                        grid[gz][gx] = 'R';
                    } else {
                        grid[gz][gx] = '.';
                    }
                }
            }
        }

        // Plot entities
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
        
        let gridHtml = `REGIONS:\n[P] PLAYER   [T] CROW'S TARGET   [R] MOUNTAIN\n\n`;
        
        gridHtml += `<div style="line-height: 1.1; font-size: 14px; letter-spacing: 2px;">`;
        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                const en = cellEntities[gz][gx];
                const char = grid[gz][gx];
                const isSelected = en && this.selectedEntityId === en.id;
                
                const style = isSelected ? 'background-color: #fbbf24; color: #000; font-weight: bold;' : '';
                const color = char === 'R' ? '#4b5563' : char === 'V' ? '#10b981' : char === 'P' ? '#3b82f6' : char === 'T' ? '#f59e0b' : '#94a3b8';
                const dataId = en && en.id ? `data-id="${en.id}"` : '';
                
                gridHtml += `<span style="cursor:pointer; ${style} color: ${color};" ${dataId}>${char}</span>`;
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
                inspectedHtml += `\n--- INSPECTION ---\n`;
                inspectedHtml += `Name: ${ref.name || 'Unknown'}\n`;
                inspectedHtml += `Type: ${type === 'P' ? 'Player' : (type === 'A' || type === 'T') ? 'Adventurer' : type === 'V' ? 'Village' : type === 'M' ? 'Monster' : 'Road'}\n`;
                inspectedHtml += `Pos: [${Math.round(selectedEn.x)}, ${Math.round(selectedEn.z)}]\n`;
                
                if (type === 'V') {
                    inspectedHtml += `Task: ${ref.currentTask || 'Idle'}\n`;
                    inspectedHtml += `Goal: ${ref.taskTarget || 'None'}\n`;
                    inspectedHtml += `Why: ${ref.taskReason || 'N/A'}\n`;
                    
                    inspectedHtml += `Pop: ${ref.population?.current || 0}/${ref.population?.capacity || 0}\n`;
                    inspectedHtml += `Res: F:${ref.stats?.food||0} W:${ref.stats?.wood||0} S:${ref.stats?.stone||0}\n`;
                    inspectedHtml += `AP: ${ref.stats?.ap || 0}\n`;
                    
                    const conns = ref.connections || [];
                    inspectedHtml += `Roads: ${conns.length > 0 ? conns.join(', ') : 'Unknown'}\n`;
                    
                    const history = window.ChronicleManager?.getHistoryFor(ref.id).slice(-3).reverse() || [];
                    const historyText = history.length > 0 ? history.map(e => `[Day ${e.timestamp.day}] ${e.detail} (Sig: ${e.significance})`).join('\n') : 'No History Recorded';
                    inspectedHtml += `History:\n${historyText}\n`;
                    
                } else if (type === 'A' || type === 'T') {
                    const record = window.AdventurerManager?.records?.find(r => r.id === ref.adventurerRecordId || r.id === ref.id || r.id === selectedEn.id);
                    
                    inspectedHtml += `Task: ${record?.currentTask || 'Idle'}\n`;
                    inspectedHtml += `Goal: ${record?.taskTarget || 'None'}\n`;
                    inspectedHtml += `Why: ${record?.taskReason || 'N/A'}\n`;

                    let destName = 'Unknown';
                    if (record?.destination && window.VillageManager?.villages) {
                        const targetVillage = window.VillageManager.villages.find(v => v.x === record.destination.x && v.z === record.destination.z);
                        if (targetVillage) destName = targetVillage.name;
                    }
                    
                    inspectedHtml += `Dest: ${destName}\n`;
                    inspectedHtml += `Career: ${record?.quest?.type || 'Unknown'}\n`;
                    inspectedHtml += `Renown: ${record?.storyHeat || 0}\n`;
                    inspectedHtml += `Stamina: ${record?.hp || 0}\n`;
                    
                    const history = window.ChronicleManager?.getHistoryFor(record?.id).slice(-3).reverse() || [];
                    const historyText = history.length > 0 ? history.map(e => `[Day ${e.timestamp.day}] ${e.detail} (Sig: ${e.significance})`).join('\n') : 'No History Recorded';
                    inspectedHtml += `History:\n${historyText}\n`;
                    
                    if (type === 'T') inspectedHtml += `\nSTATUS: CURRENT CROW FOCUS\n`;
                    
                } else if (type === 'M') {
                    inspectedHtml += `Task: ${ref.currentTask || 'Prowling'}\n`;
                    inspectedHtml += `Goal: ${ref.taskTarget || 'Unknown'}\n`;
                    inspectedHtml += `Why: ${ref.taskReason || 'N/A'}\n`;
                    inspectedHtml += `Threat: ${ref.hp || 'Unknown'} HP\n`;
                    
                    let targetName = 'Unknown';
                    let distToTarget = 'Unknown';
                    
                    if (ref.targetVillageId) {
                        targetName = `Village ${ref.targetVillageId}`;
                        const targetV = window.VillageManager?.villages?.find(v => v.id === ref.targetVillageId);
                        if (targetV && ref.visual?.position) {
                            distToTarget = Math.round(Math.hypot(targetV.x - ref.visual.position.x, targetV.z - ref.visual.position.z)) + 'm';
                        }
                    } else if (ref.targetId === 'player' && window.GameCore?.playerObj?.visual) {
                        targetName = 'Player';
                        if (ref.visual?.position) {
                            distToTarget = Math.round(Math.hypot(window.GameCore.playerObj.visual.position.x - ref.visual.position.x, window.GameCore.playerObj.visual.position.z - ref.visual.position.z)) + 'm';
                        }
                    }
                    
                    inspectedHtml += `Target: ${targetName}\n`;
                    inspectedHtml += `Dist: ${distToTarget}\n`;
                }
            } else {
                inspectedHtml += `\n--- INSPECTION ---\nEntity lost or out of range.`;
            }
        }
        
        return { gridHtml, inspectedHtml };
    }


}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
