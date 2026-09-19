import { UIComponent } from '../core/UIComponent.js';

export class CompanionInventoryComponent extends UIComponent {
    constructor() {
        super('companion-dialogue');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render(member) {
        if (!this.element) return;
        
        const inventory = member.inventory || [];
        const items = inventory.length ? inventory.map((itemId, index) => {
            const item = window.ItemDatabase[itemId];
            return `<button class="companion-take-item border border-gray-700 bg-gray-900 p-2 text-left hover:border-cyan-500" data-member="${member.id}" data-index="${index}">${item ? `${item.icon} ${item.name}` : itemId}</button>`;
        }).join('') : '<div class="text-gray-500">No items carried.</div>';
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-gray-700 pb-3">
                <div class="text-cyan-300 font-bold tracking-widest">${member.name}'S PACK</div>
                <div class="text-xs text-gray-500 mt-1">Role: ${member.role}</div>
            </div>
            <div class="grid gap-2 mb-4">${items}</div>
            <button id="btn-close-companion" class="border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400">Back</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelectorAll('.companion-take-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('TAKE_COMPANION_ITEM', { memberId: button.dataset.member, index: Number(button.dataset.index) })));
        this.element.querySelector('#btn-close-companion').addEventListener('click', window.closeCompanionDialogue);
    }
}
