import { UIComponent } from '../core/UIComponent.js';

const runeRecipes = {
    ember_rune: { gold: 10, wood: 1, stone: 1 },
    ward_rune: { gold: 15, wood: 1, stone: 2 },
    swift_rune: { gold: 20, wood: 2, stone: 1 }
};

export class ArmorerForgeComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render() {
        if (!this.element) return;
        
        const pack = window.GameState.inventory.backpack;
        const gold = window.GameState.inventory.gold;

        const runeRows = Object.entries(runeRecipes).map(([runeId, cost]) => {
            const rune = window.ItemDatabase[runeId];
            const canAfford = gold >= cost.gold && pack.filter(id => id === 'wood').length >= cost.wood && pack.filter(id => id === 'stone').length >= cost.stone;
            return `<button class="craft-rune border border-orange-700 bg-gray-900 p-2 text-left hover:border-orange-300 disabled:opacity-50" data-rune="${runeId}" ${!canAfford ? 'disabled' : ''}>
                ${rune.icon} Craft ${rune.name}
                <span class="float-right text-amber-300 text-[9px]">${cost.gold}g, ${cost.wood}w, ${cost.stone}s</span>
            </button>`;
        }).join('');

        this.element.innerHTML = `
            <div class="mb-4 border-b border-orange-700 pb-3">
                <div class="text-orange-300 font-bold tracking-widest">RUNEFORGE</div>
                <div class="text-xs text-gray-500 mt-1">Gold: ${gold}</div>
            </div>
            <div class="grid gap-2 mb-4">${runeRows}</div>
            <button id="btn-close-forge" class="border border-gray-600 px-3 py-2 text-xs hover:border-orange-400">Leave</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelectorAll('.craft-rune').forEach(button => button.addEventListener('click', () => window.EventBus.emit('CRAFT_RUNE', button.dataset.rune)));
        this.element.querySelector('#btn-close-forge').addEventListener('click', window.closeCompanionDialogue);
    }
}
