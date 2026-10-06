/**
 * Crow's Eye System - Phase 2 (Registration & State)
 */
class CrowsEyeSystem {
    constructor() {
        this.isActive = false;
        this.canvas = null;
        this.ctx = null;
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
        this.overlay.innerText = "CROW'S EYE ACTIVE\nLoaded Chunks: 0\nVillages: 0\nAdventurers: 0\nMonsters: 0";
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '20px';
        this.overlay.style.left = '20px';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.color = '#fbbf24';
        this.overlay.style.fontWeight = 'bold';
        this.overlay.style.fontFamily = 'monospace';
        this.overlay.style.fontSize = '14px';
        this.overlay.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.display = this.isActive ? 'block' : 'none';
        
        document.body.appendChild(this.overlay);
    }

    update(dt) {
        if (!this.isActive || !this.overlay) return;
        
        const chunkCount = window.ChunkManager?.activeChunks?.size || 0;
        const villageCount = window.VillageManager?.villages?.length || 0;
        
        let advCount = 0;
        let monsterCount = 0;
        
        if (window.GameCore?.activeEntities) {
            window.GameCore.activeEntities.forEach(en => {
                if (en.def?.faction === 'adventurer') advCount++;
                if (en.def?.faction === 'monster' || en.def?.faction === 'forest') monsterCount++;
            });
        }
        
        this.overlay.innerText = `CROW'S EYE ACTIVE\nLoaded Chunks: ${chunkCount}\nVillages: ${villageCount}\nAdventurers: ${advCount}\nMonsters: ${monsterCount}`;
    }

    render() {
        // Implementation deferred to Phase 3+
    }

    drawIndicator(relX, relZ, color, radius, isPulse = false, distLabel = null) {
        // Implementation deferred to Phase 3+
    }

    createCanvas() {
        // Implementation deferred to Phase 3+
    }
}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
