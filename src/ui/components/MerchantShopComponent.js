import { UIComponent } from '../core/UIComponent.js';

export class MerchantShopComponent extends UIComponent {
    constructor() {
        super('companion-dialogue'); // Reuses dialog
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render(chest) {
        if (!this.element) return;
        
        const stock = chest.merchantInventory || [];
        const rows = stock.map((entry, index) => {
            const item = window.ItemDatabase[entry.itemId];
            const price = window.GameCore.getMerchantPrice(entry.price, 'kingdom');
            return `<button class="merchant-buy-item border border-amber-700 bg-gray-900 p-2 text-left hover:border-amber-300 disabled:opacity-40" data-chest="${chest.id}" data-index="${index}" ${entry.quantity <= 0 ? 'disabled' : ''}>${item ? item.icon : '❓'} ${item?.name || entry.itemId} <span class="float-right text-amber-300">${price}g | ${entry.quantity}</span></button>`;
        }).join('') || '<div class="text-gray-500">Sold out.</div>';
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-amber-700 pb-3">
                <div class="text-amber-300 font-bold tracking-widest">PLAGUE DOCTOR MERCHANT</div>
                <div class="text-xs text-gray-500 mt-1">Gold: ${window.GameState.inventory.gold}</div>
            </div>
            <div class="grid gap-2 mb-4">${rows}</div>
            <button id="btn-close-merchant" class="border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelectorAll('.merchant-buy-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('BUY_MERCHANT_ITEM', { chestId: button.dataset.chest, index: Number(button.dataset.index) })));
        this.element.querySelector('#btn-close-merchant').addEventListener('click', window.closeCompanionDialogue);
    }
}
