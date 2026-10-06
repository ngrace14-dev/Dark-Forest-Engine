/**
 * Crow's Eye System - Phase 2 (Registration & State)
 */
class CrowsEyeSystem {
    constructor() {
        this.isActive = false;
        this.overlay = null;
        this.updateTimer = 0;
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
        this.overlay.innerText = "CROW'S EYE ACTIVE\nLoaded Chunks: 0\nVillages: 0\nAdventurers: 0\nMonsters: 0\n\n....................\n....................";
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '20px';
        this.overlay.style.left = '20px';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.color = '#fbbf24';
        this.overlay.style.fontWeight = 'bold';
        this.overlay.style.fontFamily = 'monospace';
        this.overlay.style.fontSize = '12px'; // Reduced slightly for grid display
        this.overlay.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.display = this.isActive ? 'block' : 'none';
        this.overlay.style.whiteSpace = 'pre'; // Ensures ASCII grid renders correctly
        
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
        
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities.forEach(en => {
                if (en.def?.faction === 'adventurer') {
                    advCount++;
                    if (en.visual) entities.push({ type: 'A', x: en.visual.position.x, z: en.visual.position.z });
                }
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') {
                    monsterCount++;
                    if (en.visual) entities.push({ type: 'M', x: en.visual.position.x, z: en.visual.position.z });
                }
            });
        }
        
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                entities.push({ type: 'V', x: v.x, z: v.z });
            });
        }
        
        let px = 0, pz = 0;
        if (window.GameCore?.playerObj?.visual) {
            px = window.GameCore.playerObj.visual.position.x;
            pz = window.GameCore.playerObj.visual.position.z;
        }
        
        const grid = this.generateAsciiGrid(entities, px, pz);
        
        this.overlay.innerText = `CROW'S EYE ACTIVE\nLoaded Chunks: ${chunkCount}\nVillages: ${villageCount}\nAdventurers: ${advCount}\nMonsters: ${monsterCount}\n\n${grid}`;
    }

    generateAsciiGrid(entities, px, pz) {
        const gridSize = 20; // 20x20 grid
        const range = 5000; // Total world range mapped to grid (adjust as needed)
        const cellSpan = (range * 2) / gridSize;
        
        // Initialize empty grid
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill('.'));
        
        // Helper to map world pos to grid pos relative to player
        const mapToGrid = (x, z) => {
            const relX = x - px;
            const relZ = z - pz;
            const gx = Math.floor((relX + range) / cellSpan);
            const gz = Math.floor((relZ + range) / cellSpan);
            return { gx, gz };
        };

        // Plot entities
        entities.forEach(en => {
            const { gx, gz } = mapToGrid(en.x, en.z);
            if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
                // Priority: V > A > M
                if (grid[gz][gx] === '.' || grid[gz][gx] === 'M' || (grid[gz][gx] === 'A' && en.type === 'V')) {
                    grid[gz][gx] = en.type;
                }
            }
        });
        
        // Plot Player in center (or mapped position)
        const pGrid = mapToGrid(px, pz);
        if (pGrid.gx >= 0 && pGrid.gx < gridSize && pGrid.gz >= 0 && pGrid.gz < gridSize) {
            grid[pGrid.gz][pGrid.gx] = 'P';
        }
        
        return grid.map(row => row.join('')).join('\n');
    }


}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
