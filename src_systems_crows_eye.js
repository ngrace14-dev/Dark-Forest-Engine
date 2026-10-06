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
        
        let advCount = 0;
        let monsterCount = 0;
        
        const entities = [];
        
        let px = 0, pz = 0;
        if (window.GameCore?.playerObj?.visual) {
            px = window.GameCore.playerObj.visual.position.x;
            pz = window.GameCore.playerObj.visual.position.z;
            entities.push({ type: 'P', x: px, z: pz, id: 'player', ref: window.GameCore.playerObj });
        }
        
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities.forEach(en => {
                if (en.def?.faction === 'adventurer') {
                    advCount++;
                    if (en.visual) entities.push({ type: 'A', x: en.visual.position.x, z: en.visual.position.z, id: en.id, ref: en });
                }
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') {
                    monsterCount++;
                    if (en.visual) entities.push({ type: 'M', x: en.visual.position.x, z: en.visual.position.z, id: en.id, ref: en });
                }
            });
        }
        
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
        
        this.overlay.innerHTML = `CROW'S EYE ACTIVE\nLoaded Chunks: ${chunkCount}\nVillages: ${villageCount}\nAdventurers: ${advCount}\nMonsters: ${monsterCount}\n\n${gridHtml}${inspectedHtml}`;
    }

    generateAsciiGrid(entities, px, pz) {
        // Automatically determine map dimensions based on the new Epoch Manager settings
        const mountainRadius = window.WorldGenConfig?.darkForestSideMeters ? window.WorldGenConfig.darkForestSideMeters / 2 : 287921.6;
        
        // Target an approximate 20x20 grid, but adjust cell span to map the full known simulated world
        const gridSize = 20; 
        const worldSpan = mountainRadius * 2; 
        const cellSpan = worldSpan / gridSize;
        
        // Initialize empty grid tracking the top priority entity in each cell
        const cellEntities = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill('.'));
        
        const typePriority = { 'P': 5, 'V': 4, 'A': 3, 'M': 2, '#': 1, '.': 0 };
        
        // Map absolute world coordinate to an absolute grid coordinate
        const mapToGrid = (x, z) => {
            // Shift coordinates so that -mountainRadius becomes 0 (bottom-left of grid)
            const shiftedX = x + mountainRadius;
            const shiftedZ = z + mountainRadius;
            const gx = Math.floor(shiftedX / cellSpan);
            const gz = Math.floor(shiftedZ / cellSpan);
            return { gx, gz };
        };

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
        
        let gridHtml = `REGIONS:\n[0,0] CAPITAL   [R] MOUNTAIN WALL\n\n`;
        
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
                inspectedHtml += `Type: ${type === 'P' ? 'Player' : type === 'V' ? 'Village' : type === 'A' ? 'Adventurer' : type === 'M' ? 'Monster' : 'Road'}\n`;
                inspectedHtml += `Pos: [${Math.round(selectedEn.x)}, ${Math.round(selectedEn.z)}]\n`;
                
                if (type === 'V') {
                    inspectedHtml += `Pop: ${ref.population?.current || 0}/${ref.population?.capacity || 0}\n`;
                    inspectedHtml += `Res: F:${ref.stats?.food||0} W:${ref.stats?.wood||0} S:${ref.stats?.stone||0}\n`;
                    inspectedHtml += `AP: ${ref.stats?.ap || 0}\n`;
                } else if (type === 'A') {
                    const record = window.AdventurerManager?.records?.find(r => r.id === ref.adventurerRecordId || r.id === ref.id);
                    inspectedHtml += `Career: ${record?.quest?.type || 'Wanderer'}\n`;
                    inspectedHtml += `Renown: ${record?.storyHeat || 0}\n`;
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
