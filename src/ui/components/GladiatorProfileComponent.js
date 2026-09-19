import { UIComponent } from '../core/UIComponent.js';

export class GladiatorProfileComponent extends UIComponent {
    constructor() {
        super('companion-dialogue'); // Reuses dialog
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        eventBus.on('OPEN_GLADIATOR_PROFILE', () => this.render());
    }

    render() {
        if (!this.element) return;
        
        const gladiator = window.GameState.gladiator;
        const weapon = window.GameState.inventory.equipment.weapon || 'unarmed';
        const injuries = gladiator.injuries.length ? gladiator.injuries.map(injury => `<li>${injury}</li>`).join('') : '<li>No recorded injuries</li>';
        const injuryCost = (window.GameState.combatRecord?.injuries?.length || 0) * 10;
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-orange-700 pb-3">
                <div class="text-orange-300 font-bold tracking-widest">GLADIATOR PROFILE</div>
                <div class="text-xs text-gray-500 mt-1">${gladiator.name} | ${gladiator.matchState.toUpperCase()}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div><div class="text-gray-500">FAME</div><div class="text-white text-lg font-bold">${gladiator.fame}</div></div>
                <div><div class="text-gray-500">GOLD</div><div class="text-amber-300 text-lg font-bold">${gladiator.gold}</div></div>
                <div><div class="text-gray-500">RENOWN</div><div class="text-amber-200">${window.GameState.renown.title} ${window.GameState.renown.score}</div></div>
                <div><div class="text-gray-500">INFAMY</div><div class="text-red-300">${window.GameState.renown.infamy}</div></div>
                <div><div class="text-gray-500">RECORD</div><div class="text-white">${gladiator.wins}W - ${gladiator.losses}L</div></div>
                <div><div class="text-gray-500">WEAPON</div><div class="text-white">${window.ItemDatabase[weapon]?.name || weapon}</div></div>
            </div>
            <div class="border-t border-gray-800 pt-3 mb-4">
                <div class="text-xs text-orange-200 mb-1">CURRENT OBJECTIVE</div>
                <div class="text-gray-300">${gladiator.objective}</div>
            </div>
            <div class="border-t border-gray-800 pt-3 mb-4">
                <div class="text-xs text-red-300 mb-1">INJURIES</div>
                <ul class="text-xs text-gray-400 list-disc list-inside">${injuries}</ul>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <button id="btn-start-gladiator-match" class="border border-orange-700 px-3 py-2 text-xs text-orange-200 hover:border-orange-300">Start Match</button>
                <button id="btn-treat-gladiator" class="border border-green-700 px-3 py-2 text-xs text-green-200 hover:border-green-300">Treat ${injuryCost}g</button>
                <button id="btn-close-gladiator-profile" class="border border-gray-600 px-3 py-2 text-xs hover:border-gray-300">Close</button>
            </div>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelector('#btn-start-gladiator-match').addEventListener('click', () => { 
            this.element.classList.add('hidden'); 
            window.EventBus.emit('START_ARENA_MATCH'); 
        });
        this.element.querySelector('#btn-treat-gladiator').addEventListener('click', () => { 
            window.GameCore.treatCombatInjuries(); 
            this.render(); 
        });
        this.element.querySelector('#btn-close-gladiator-profile').addEventListener('click', window.closeCompanionDialogue);
    }
}
