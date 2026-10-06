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
        this.overlay.innerHTML = "CROW'S EYE ACTIVE<br>Waiting for telemetry...";
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '20px';
        this.overlay.style.left = '20px';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.color = '#fbbf24';
        this.overlay.style.fontWeight = 'bold';
        this.overlay.style.fontFamily = 'monospace';
        this.overlay.style.fontSize = '12px';
        this.overlay.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.style.display = this.isActive ? 'block' : 'none';
        this.overlay.style.whiteSpace = 'pre';
        this.overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
        this.overlay.style.padding = '10px';
        this.overlay.style.borderRadius = '5px';
        
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
        
        this.overlay.innerHTML = `CROW'S EYE ACTIVE\nWatcher Target: ${narrator.targetName || 'None'}\nLoaded Chunks: ${chunkCount}\nVillages: ${villageCount}\nAdventurers: ${advCount}\nMonsters: ${monsterCount}\n\n${gridHtml}${inspectedHtml}${timelineHtml}${intelHtml}`;
    }

    generateAsciiGrid(entities, px, pz) {
        // Automatically determine map dimensions based on the new Epoch Manager settings
        const forestSide = window.WorldGenConfig?.darkForestSideMeters || 575843.2;
        const mountainRadius = forestSide / 2;
        const mountainWidth = window.WorldGenConfig?.mountainRingWidthMeters || 160934.4;
        
        // Target an approximate 20x20 grid, but adjust cell span to map the full known simulated world
        const gridSize = 20; 
        const worldSpan = (mountainRadius + mountainWidth) * 2; 
        const cellSpan = worldSpan / gridSize;
        const totalRadius = (mountainRadius + mountainWidth);
        
        // Initialize empty grid tracking the top priority entity in each cell
        const cellEntities = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill('.'));
        
        const typePriority = { 'P': 6, 'T': 5, 'V': 4, 'A': 3, 'M': 2, '#': 1, 'R': 0.5, '.': 0 };
        
        // Map absolute world coordinate to an absolute grid coordinate
        const mapToGrid = (x, z) => {
            const shiftedX = x + totalRadius;
            const shiftedZ = z + totalRadius;
            const gx = Math.floor(shiftedX / cellSpan);
            const gz = Math.floor(shiftedZ / cellSpan);
            return { gx, gz };
        };

        // Render Mountain Wall Perimeter
        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                // Calculate world center of this cell
                const wx = (gx * cellSpan) - totalRadius + (cellSpan / 2);
                const wz = (gz * cellSpan) - totalRadius + (cellSpan / 2);
                const dist = Math.max(Math.abs(wx), Math.abs(wz));
                
                if (dist > mountainRadius && dist <= totalRadius) {
                    grid[gz][gx] = 'R';
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
        
        for (let gz = 0; gz < gridSize; gz++) {
            for (let gx = 0; gx < gridSize; gx++) {
                const en = cellEntities[gz][gx];
                const char = grid[gz][gx];
                const isSelected = en && this.selectedEntityId === en.id;
                
                const style = isSelected ? 'background-color: #fbbf24; color: #000;' : '';
                const dataId = en && en.id ? `data-id="${en.id}"` : '';
                
                gridHtml += `<span style="cursor:pointer;${style}" ${dataId}>${char}</span>`;
            }
            gridHtml += '\n';
        }

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
                    // ... existing village logic ...
                } else if (type === 'A' || type === 'T') {
                    const record = window.AdventurerManager?.records?.find(r => r.id === ref.adventurerRecordId || r.id === ref.id || r.id === selectedEn.id);
                    
                    let destName = 'Unknown';
                    if (record?.destination && window.VillageManager?.villages) {
                        const targetVillage = window.VillageManager.villages.find(v => v.x === record.destination.x && v.z === record.destination.z);
                        if (targetVillage) destName = targetVillage.name;
                    }
                    
                    inspectedHtml += `Dest: ${destName}\n`;
                    inspectedHtml += `Career: ${record?.quest?.type || 'Unknown'}\n`;
                    inspectedHtml += `Renown: ${record?.storyHeat || 0}\n`;
                    inspectedHtml += `Stamina: ${record?.hp || 0}\n`;
                    inspectedHtml += `Goal: ${record?.quest?.progress !== undefined ? record.quest.progress + '/' + record.quest.goal : 'Unknown'}\n`;
                    inspectedHtml += `Home: ${record?.homeVillageId || 'Unknown'}\n`;
                    
                    const feat = record?.feats?.slice(-1)[0];
                    inspectedHtml += `History: ${feat ? feat.label : 'None Recorded'}\n`;
                    
                    if (type === 'T') inspectedHtml += `STATUS: CURRENT CROW FOCUS\n`;
                    
                } else if (type === 'M') {
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
