import { UIComponent } from '../core/UIComponent.js';

export class CaravanDialogueComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render(caravanEntity) {
        if (!this.element) return;
        
        const village = window.VillageManager.villages.find(candidate => candidate.id === caravanEntity.villageId);
        const caravan = village?.caravans.find(candidate => candidate.id === caravanEntity.caravanId);
        const destination = caravan && window.VillageManager.villages.find(candidate => candidate.id === caravan.targetVillageId);
        
        if (!caravan || !destination) return;
        
        const isEscorting = window.GameState.party.escortCaravanId === caravan.id;
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-amber-700 pb-3">
                <div class="text-amber-300 font-bold tracking-widest">MERCHANT CARAVAN</div>
                <div class="text-xs text-gray-500 mt-1">${village.name} to ${destination.name}</div>
            </div>
            <p class="mb-4 text-gray-300">Cargo: ${caravan.amount} ${caravan.cargo}</p>
            <button id="btn-escort-caravan" class="w-full border border-amber-700 px-3 py-2 text-xs text-amber-200 hover:border-amber-300">${isEscorting ? 'Abandon Escort' : 'Escort Caravan'}</button>
            <button id="btn-close-caravan" class="mt-3 border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelector('#btn-escort-caravan').addEventListener('click', () => window.EventBus.emit(isEscorting ? 'ABANDON_CARAVAN_ESCORT' : 'ESCORT_CARAVAN', caravan.id));
        this.element.querySelector('#btn-close-caravan').addEventListener('click', window.closeCompanionDialogue);
    }
}
