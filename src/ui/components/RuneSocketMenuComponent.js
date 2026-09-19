import { UIComponent } from '../core/UIComponent.js';

export class RuneSocketMenuComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        eventBus.on('OPEN_RUNE_SOCKET', (packIndex) => this.render(packIndex));
    }

    render(packIndex) {
        const runeId = window.GameState.inventory.backpack[packIndex];
        const rune = window.ItemDatabase[runeId];
        if (!rune || rune.type !== 'rune') return;
        
        const slots = Object.entries(window.GameState.inventory.equipment).filter(([, itemId]) => itemId).map(([slot, itemId]) => {
            const gear = window.ItemDatabase[itemId];
            const existingRune = window.GameState.inventory.runes[slot];
            return `<button class="rune-socket-target border border-cyan-700 bg-gray-900 p-2 text-left hover:border-cyan-300" data-pack-index="${packIndex}" data-slot="${slot}">${gear?.icon || '❓'} ${slot.toUpperCase()}${existingRune ? ` <span class="text-gray-500">(${window.ItemDatabase[existingRune]?.name})</span>` : ''}</button>`;
        }).join('') || '<div class="text-gray-500">Equip gear before socketing a rune.</div>';
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-cyan-700 pb-3">
                <div class="text-cyan-300 font-bold tracking-widest">SOCKET ${rune.name.toUpperCase()}</div>
                <div class="text-xs text-gray-500 mt-1">Choose equipped gear</div>
            </div>
            <div class="grid gap-2 mb-4">${slots}</div>
            <button id="btn-close-runes" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Cancel</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelectorAll('.rune-socket-target').forEach(button => button.addEventListener('click', () => window.EventBus.emit('SOCKET_RUNE', { packIndex: Number(button.dataset.packIndex), slot: button.dataset.slot })));
        this.element.querySelector('#btn-close-runes').addEventListener('click', window.closeCompanionDialogue);
    }
}
