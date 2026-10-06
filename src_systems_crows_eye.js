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
        const radius = 140;
        const scale = 0.001; // 1 unit = 1000m (1km)

        // Draw compass ring
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Villages
        if (window.VillageManager?.villages) {
            window.VillageManager.villages.forEach(v => {
                const relX = v.x * scale;
                const relZ = v.z * scale;
                const distFromCenter = Math.hypot(relX, relZ);

                if (distFromCenter < radius) {
                    const canvasX = centerX + relX;
                    const canvasY = centerY + relZ;
                    this.ctx.fillStyle = v.capital ? '#6366f1' : '#4ade80';
                    this.ctx.beginPath();
                    this.ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    const actualDistKm = (Math.hypot(v.x, v.z) / 1000).toFixed(1);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '8px monospace';
                    this.ctx.fillText(`${v.name.toUpperCase()} (${actualDistKm}km)`, canvasX, canvasY - 6);
                } else {
                    // Render off-canvas indicator
                    const actualDistKm = (Math.hypot(v.x, v.z) / 1000).toFixed(1);
                    this.drawIndicator(relX, relZ, v.capital ? '#6366f1' : '#4ade80', radius, false, actualDistKm);
                }
            });
        }

        // Adventurers (High-Importance Entities)
        if (window.AdventurerManager?.records) {
            window.AdventurerManager.records.forEach(adv => {
                if (!adv.alive || !adv.position) return;
                
                const relX = adv.position.x * scale;
                const relZ = adv.position.z * scale;
                const distFromCenter = Math.hypot(relX, relZ);
                const isTarget = window.GameState?.narrator?.targetId === adv.id;
                const color = isTarget ? '#f87171' : '#60a5fa';

                if (distFromCenter < radius) {
                    const canvasX = centerX + relX;
                    const canvasY = centerY + relZ;
                    this.ctx.fillStyle = color;
                    this.ctx.beginPath();
                    this.ctx.arc(canvasX, canvasY, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();

                    if (isTarget) {
                        this.ctx.strokeStyle = color;
                        this.ctx.lineWidth = 1;
                        this.ctx.beginPath();
                        this.ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                } else if (isTarget) {
                    // Only draw off-canvas indicators for the target adventurer
                    const actualDistKm = (Math.hypot(adv.position.x, adv.position.z) / 1000).toFixed(1);
                    this.drawIndicator(relX, relZ, color, radius, true, actualDistKm);
                }
            });
        }

        // Player Marker (Center)
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CROW\'S EYE', centerX, 25);

        this.ctx.fillStyle = '#fbbf24';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('PLAYER', centerX, centerY - 10);
    }

    drawIndicator(relX, relZ, color, radius, isPulse = false, distLabel = null) {
        const angle = Math.atan2(relZ, relX);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const edgeX = centerX + Math.cos(angle) * (radius - 5);
        const edgeY = centerY + Math.sin(angle) * (radius - 5);

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        
        // Triangle pointing towards entity
        this.ctx.save();
        this.ctx.translate(edgeX, edgeY);
        
        if (distLabel) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '7px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${distLabel}km`, 0, 12);
        }

        this.ctx.rotate(angle);
        this.ctx.fillStyle = color;
        this.ctx.moveTo(5, 0);
        this.ctx.lineTo(-3, -3);
        this.ctx.lineTo(-3, 3);
        this.ctx.closePath();
        this.ctx.fill();
        
        if (isPulse) {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1;
            const s = 1 + Math.sin(Date.now() * 0.01) * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    createCanvas() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'crows-eye-overlay';
        this.canvas.width = 300;
        this.canvas.height = 300;
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '24px';
        this.canvas.style.right = '24px';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.backgroundColor = 'rgba(2, 6, 23, 0.75)';
        this.canvas.style.border = '2px solid rgba(251, 191, 36, 0.4)';
        this.canvas.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(251, 191, 36, 0.1)';
        this.canvas.style.borderRadius = '50%';
        this.canvas.style.display = this.isActive ? 'block' : 'none';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.backdropFilter = 'blur(4px)';
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }
}

window.CrowsEye = new CrowsEyeSystem();
export default window.CrowsEye;
