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

    update(dt) {
        if (!this.isActive || !this.ctx) return;
        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const scale = 0.001; // 1 unit = 1000m (1km)

        // Villages
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                const relX = v.x * scale;
                const relZ = v.z * scale;
                const canvasX = centerX + relX;
                const canvasY = centerY + relZ;
                const distFromCenter = Math.hypot(relX, relZ);
                if (distFromCenter < 140) {
                    this.ctx.fillStyle = v.capital ? '#6366f1' : '#4ade80';
                    this.ctx.beginPath();
                    this.ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '8px monospace';
                    this.ctx.fillText(v.name.toUpperCase(), canvasX, canvasY - 6);
                }
            });
        }

        // Adventurers (High-Importance Entities)
        if (window.AdventurerManager?.records) {
            window.AdventurerManager.records.forEach(adv => {
                if (!adv.alive || !adv.position) return;
                
                const relX = adv.position.x * scale;
                const relZ = adv.position.z * scale;
                const canvasX = centerX + relX;
                const canvasY = centerY + relZ;
                const distFromCenter = Math.hypot(relX, relZ);

                if (distFromCenter < 140) {
                    const isTarget = window.GameState?.narrator?.targetId === adv.id;
                    this.ctx.fillStyle = isTarget ? '#f87171' : '#60a5fa'; // Red if Crow Target, else Blue
                    this.ctx.beginPath();
                    this.ctx.arc(canvasX, canvasY, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();

                    if (isTarget) {
                        this.ctx.strokeStyle = '#f87171';
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            });
        }

        // Player Marker (Center)
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Label
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PLAYER', centerX, centerY - 10);
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
