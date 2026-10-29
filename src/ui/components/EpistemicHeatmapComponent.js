import { UIComponent } from '../core/UIComponent.js';

export class EpistemicHeatmapComponent extends UIComponent {
    constructor() {
        super('epistemic-heatmap-panel');
        this.overlayVisible = false;
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('TOGGLE_EPISTEMIC_HEATMAP', () => {
            this.overlayVisible = !this.overlayVisible;
            if (this.overlayVisible) {
                this.element?.classList.remove('hidden');
                this.element?.classList.add('flex');
                this.render();
            } else {
                this.element?.classList.add('hidden');
                this.element?.classList.remove('flex');
            }
        });

        eventBus.on('HEARTBEAT_T1', () => {
            if (this.overlayVisible) this.render();
        });
    }

    render() {
        if (!this.element || !window.VillageManager || !window.WorldObservatory) return;
        
        const canvas = document.getElementById('epistemic-heatmap-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const mapScale = 0.05;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const observatoryStatus = window.WorldObservatory.getStatus();
        const globalInfo = observatoryStatus.information;

        // Draw Regions with Epistemic Fog
        window.VillageManager.villages.forEach(village => {
            const px = centerX + (village.x * mapScale);
            const py = centerY + (village.z * mapScale);
            
            // Calculate regional Tf (Truth Fidelity) 
            const regionalTf = village.stats?.truthFidelity ?? globalInfo.truthFidelity;
            const regionalRir = village.stats?.rumorInfectionRate ?? globalInfo.infectionRate;

            // Determine Color Gradient
            let r = 59, g = 130, b = 246; // Base Blue (#3b82f6)
            
            if (regionalTf < 0.5) {
                const factor = 1.0 - (regionalTf * 2);
                r = 59 + (100 * factor); 
                b = 246; 
                g = 130 * (1.0 - factor);
            }

            const alpha = 0.4 + (regionalRir * 0.05); 

            const gradient = ctx.createRadialGradient(px, py, 0, px, py, village.territory.radius * mapScale * 2);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.beginPath();
            ctx.arc(px, py, village.territory.radius * mapScale * 2, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });

        this.renderTelemetryHUD(globalInfo);
    }

    renderTelemetryHUD(info) {
        const hud = document.getElementById('observatory-telemetry-hud');
        if (!hud) return;

        hud.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">TRUTH FIDELITY (Tf)</span>
                    <span class="${info.truthFidelity < 0.3 ? 'text-red-400 animate-pulse' : 'text-blue-400'}">${(info.truthFidelity * 100).toFixed(1)}%</span>
                </div>
                <div class="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500" style="width: ${info.truthFidelity * 100}%"></div>
                </div>

                <div class="flex justify-between pt-2">
                    <span class="text-gray-400">RUMOR INFECTION (Rir)</span>
                    <span class="text-purple-400">${info.infectionRate.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">MYTHIC DRIFT (Dm)</span>
                    <span class="text-amber-400">${info.mythicDrift.toFixed(3)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">HISTORICAL SURVIVAL (Hsr)</span>
                    <span class="${info.historicalSurvivalRate < 0.15 ? 'text-red-500 font-bold' : 'text-emerald-400'}">${(info.historicalSurvivalRate * 100).toFixed(1)}%</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">INFO SCARCITY (Is)</span>
                    <span class="text-gray-300">${info.scarcityIndex.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">OWNERSHIP GINI (Iown)</span>
                    <span class="text-gray-300">${info.ownershipGini.toFixed(2)}</span>
                </div>
            </div>
            <div class="mt-4 pt-2 border-t border-gray-700 text-[10px] text-gray-500 italic">
                CROW'S EYE EPISTEMIC OVERLAY v1.0
            </div>
        `;
    }
}
