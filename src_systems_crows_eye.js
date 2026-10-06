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
        this.createCanvas();
        
        window.EventBus.on('ENV_UPDATE', () => {
            const currentMode = window.EngineConfig?.crowsEyeMode || false;
            if (this.isActive !== currentMode) {
                this.isActive = currentMode;
                if (this.canvas) this.canvas.style.display = this.isActive ? 'block' : 'none';
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

    createCanvas() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'crows-eye-overlay';
        this.canvas.width = 300;
        this.canvas.height = 300;
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '20px';
        this.canvas.style.right = '20px';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.canvas.style.border = '2px solid #334155';
        this.canvas.style.borderRadius = '50%';
        this.canvas.style.display = this.isActive ? 'block' : 'none';
        this.canvas.style.pointerEvents = 'none';
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }
}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
