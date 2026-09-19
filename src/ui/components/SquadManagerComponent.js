import { UIComponent } from '../core/UIComponent.js';

export class SquadManagerComponent extends UIComponent {
    constructor() {
        super('squad-manager-panel');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('TOGGLE_SQUAD_MANAGER', () => {
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
        
        eventBus.on('RENDER_SQUAD_MANAGER', () => this.render());
    }

    render() {
        if (!this.element) return;
        
        const content = document.getElementById('squad-manager-content');
        if (!content) return;
        
        const party = window.GameState.party.members.filter(m => m.recruited);
        
        let html = `
            <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 class="text-cyan-400 font-bold tracking-widest text-sm uppercase">Party Management</h2>
                <div class="text-[10px] text-gray-400">Total Members: ${party.length}</div>
            </div>
            
            <div class="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        `;
        
        if (party.length === 0) {
            html += `<div class="text-gray-500 text-center text-xs py-4">No companions recruited. Talk to adventurers in the world.</div>`;
        } else {
            party.forEach(member => {
                const statusColor = member.downed ? 'text-red-400' : 'text-green-400';
                const statusText = member.downed ? 'DOWNED' : 'ACTIVE';
                
                html += `
                    <div class="bg-gray-800 p-2 border border-gray-700 rounded flex items-center justify-between">
                        <div>
                            <div class="font-bold text-white text-xs">${member.name}</div>
                            <div class="text-[10px] text-gray-400">${member.role} | Lvl ${member.level || 1}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] ${statusColor} font-bold">${statusText}</div>
                            <div class="text-[10px] text-gray-500">HP: ${member.hp}/${member.maxHp}</div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
        content.innerHTML = html;
    }
}
