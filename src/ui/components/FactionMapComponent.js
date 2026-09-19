import { UIComponent } from '../core/UIComponent.js';

export class FactionMapComponent extends UIComponent {
    constructor() {
        super('faction-map-panel');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('TOGGLE_MAP', () => {
            if (!this.element) return;
            if (this.element.classList.contains('hidden')) {
                this.element.classList.remove('hidden');
                this.element.classList.add('flex');
                this.render();
            } else {
                this.element.classList.add('hidden');
                this.element.classList.remove('flex');
            }
        });
        
        eventBus.on('RENDER_MAP', () => this.render());
    }

    render() {
        if (!this.element || !window.VillageManager) return;
        
        const canvas = document.getElementById('faction-map-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const mapScale = 0.05;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw roads first
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#374151'; // Gray-700
        window.RoadManager?.paths?.forEach(path => {
            const points = path.curve.getPoints(50);
            ctx.beginPath();
            points.forEach((pt, i) => {
                const px = centerX + (pt.x * mapScale);
                const py = centerY + (pt.z * mapScale);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        });
        
        // Draw Villages
        window.VillageManager.villages.forEach(village => {
            const px = centerX + (village.x * mapScale);
            const py = centerY + (village.z * mapScale);
            
            // Faction color
            const colors = {
                'kingdom': '#3b82f6', // Blue-500
                'forest': '#10b981', // Emerald-500
                'monster': '#ef4444' // Red-500
            };
            const factionColor = colors[village.territory.faction] || '#9ca3af'; // Gray-400
            
            // Influence Radius
            ctx.beginPath();
            ctx.arc(px, py, village.territory.radius * mapScale, 0, Math.PI * 2);
            ctx.fillStyle = factionColor + '40'; // 25% opacity
            ctx.fill();
            
            // Village Dot
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = factionColor;
            ctx.fill();
            ctx.strokeStyle = '#111827'; // Gray-900
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Village Name
            ctx.fillStyle = '#f3f4f6'; // Gray-100
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(village.name, px, py - 8);
        });
        
        // Draw Player Position
        if (window.GameCore?.playerObj?.visual) {
            const pos = window.GameCore.playerObj.visual.position;
            const px = centerX + (pos.x * mapScale);
            const py = centerY + (pos.z * mapScale);
            
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24'; // Amber-400
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}
