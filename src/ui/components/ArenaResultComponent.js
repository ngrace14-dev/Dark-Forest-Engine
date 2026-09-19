import { UIComponent } from '../core/UIComponent.js';

export class ArenaResultComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        eventBus.on('OPEN_ARENA_RESULT', (data) => this.render(data));
    }

    render({ result, reward = 0 }) {
        if (!this.element) return;
        
        const gladiator = window.GameState.gladiator;
        const victory = result === 'victory';
        const injuries = gladiator.injuries.length ? gladiator.injuries[gladiator.injuries.length - 1] : 'No new injuries';
        
        this.element.innerHTML = `
            <div class="mb-4 border-b ${victory ? 'border-amber-700' : 'border-red-700'} pb-3">
                <div class="${victory ? 'text-amber-300' : 'text-red-300'} font-bold tracking-widest">${victory ? 'ARENA VICTORY' : 'ARENA DEFEAT'}</div>
                <div class="text-xs text-gray-500 mt-1">${gladiator.name}</div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div><div class="text-gray-500">REWARD</div><div class="text-amber-300 text-lg font-bold">${reward} GOLD</div></div>
                <div><div class="text-gray-500">FAME</div><div class="text-white text-lg font-bold">${gladiator.fame}</div></div>
                <div><div class="text-gray-500">RECORD</div><div class="text-white">${gladiator.wins}W - ${gladiator.losses}L</div></div>
                <div><div class="text-gray-500">INJURY</div><div class="text-red-300">${injuries}</div></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button id="btn-result-profile" class="border border-orange-700 px-3 py-2 text-xs text-orange-200 hover:border-orange-300">Gladiator Profile</button>
                <button id="btn-result-exit" class="border border-gray-600 px-3 py-2 text-xs hover:border-gray-300">Return to World</button>
            </div>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelector('#btn-result-profile').addEventListener('click', () => window.EventBus.emit('OPEN_GLADIATOR_PROFILE'));
        this.element.querySelector('#btn-result-exit').addEventListener('click', () => { 
            this.element.classList.add('hidden'); 
            window.EventBus.emit('EXIT_ARENA_TEST'); 
        });
    }
}
