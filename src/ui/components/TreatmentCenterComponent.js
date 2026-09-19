import { UIComponent } from '../core/UIComponent.js';

export class TreatmentCenterComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render() {
        if (!this.element) return;
        
        const injuryCount = window.GameState.combatRecord?.injuries?.length || 0;
        const injuryCost = injuryCount * 10;
        this.element.innerHTML = `
            <div class="mb-4 border-b border-green-700 pb-3">
                <div class="text-green-300 font-bold tracking-widest">PLAGUE TREATMENT</div>
                <div class="text-xs text-gray-500 mt-1">Restore the party and tend injuries.</div>
            </div>
            <button id="btn-treatment" class="w-full border border-green-700 bg-gray-900 p-3 text-left hover:border-green-300">Treat Party <span class="float-right text-amber-300">10g</span></button>
            <button id="btn-combat-treatment" class="mt-2 w-full border border-orange-700 bg-gray-900 p-3 text-left hover:border-orange-300">Treat Combat Injuries <span class="float-right text-amber-300">${injuryCost}g</span></button>
            <button id="btn-close-treatment" class="mt-3 border border-gray-600 px-3 py-2 text-xs hover:border-green-400">Leave</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelector('#btn-treatment').addEventListener('click', () => window.EventBus.emit('TREAT_PARTY'));
        this.element.querySelector('#btn-combat-treatment').addEventListener('click', () => { 
            window.GameCore.treatCombatInjuries(); 
            this.render(); 
        });
        this.element.querySelector('#btn-close-treatment').addEventListener('click', window.closeCompanionDialogue);
    }
}
