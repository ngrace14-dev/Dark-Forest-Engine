import { UIComponent } from '../core/UIComponent.js';

export class PlayerCampComponent extends UIComponent {
    constructor() {
        super('companion-dialogue'); // Reuses dialog
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
    }

    render() {
        if (!this.element) return;
        
        const base = window.GameState.base;
        const stored = base.storage.length ? base.storage.map((itemId, index) => `<button class="withdraw-base-item border border-amber-700 bg-gray-900 p-2 text-left hover:border-amber-300" data-index="${index}">Withdraw ${window.ItemDatabase[itemId]?.name || itemId}</button>`).join('') : '<div class="text-gray-500">Storage is empty.</div>';
        const carried = window.GameState.inventory.backpack.map((itemId, index) => `<button class="deposit-base-item border border-gray-700 bg-gray-900 p-2 text-left hover:border-amber-300" data-index="${index}">Store ${window.ItemDatabase[itemId]?.name || itemId}</button>`).join('') || '<div class="text-gray-500">Nothing to store.</div>';
        const selectedNames = window.GameState.party.members.filter(member => member.recruited && window.GameState.party.selectedMembers.includes(member.id)).map(member => member.name).join(', ') || 'No companions selected';
        
        this.element.innerHTML = `
            <div class="mb-4 border-b border-amber-700 pb-3">
                <div class="text-amber-300 font-bold tracking-widest">${base.name.toUpperCase()}</div>
                <div class="text-xs text-gray-500 mt-1">Storage | Structures ${base.structures.length} | Farms ${base.farms.length} | Research ${base.researchPoints || 0}${base.wardRadius ? ` | Ward ${base.wardRadius}m` : ''}</div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <div class="text-xs text-amber-200 mb-2">CAMP STORAGE</div>
                    <div class="grid gap-2">${stored}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-300 mb-2">YOUR PACK</div>
                    <div class="grid gap-2">${carried}</div>
                </div>
            </div>
            <div class="mt-4 border-t border-gray-700 pt-3">
                <div class="text-xs text-amber-200 mb-2">CONSTRUCTION</div>
                <div class="grid grid-cols-2 gap-2">
                    <button class="build-base-item border border-amber-700 px-2 py-2 text-xs hover:border-amber-300" data-prefab="Camp Storage Cache">Storage: 5 Wood, 2 Stone</button>
                    <button class="build-base-item border border-amber-700 px-2 py-2 text-xs hover:border-amber-300" data-prefab="Camp Farm Plot">Farm: 4 Wood, 1 Stone</button>
                    <button class="build-base-item col-span-2 border border-cyan-700 px-2 py-2 text-xs hover:border-cyan-300" data-prefab="Rune Tower">Rune Tower: 12 Wood, 10 Stone, 5 Research</button>
                </div>
            </div>
            <div class="mt-4 border-t border-gray-700 pt-3">
                <div class="text-xs text-cyan-200 mb-1">SELECTED WORKERS</div>
                <div class="text-[10px] text-gray-500 mb-2">${selectedNames}</div>
                <div class="grid grid-cols-2 gap-2">
                    <button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="farm">Farm</button>
                    <button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="research">Research</button>
                    <button class="assign-base-job border border-cyan-800 px-2 py-2 text-xs hover:border-cyan-300" data-job="guard">Guard</button>
                    <button class="assign-base-job border border-gray-600 px-2 py-2 text-xs hover:border-gray-300" data-job="idle">Idle</button>
                </div>
            </div>
            <button id="btn-close-base" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-amber-400">Leave</button>
        `;
        this.element.classList.remove('hidden');
        
        this.element.querySelectorAll('.withdraw-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('WITHDRAW_BASE_ITEM', Number(button.dataset.index))));
        this.element.querySelectorAll('.deposit-base-item').forEach(button => button.addEventListener('click', () => window.EventBus.emit('DEPOSIT_BASE_ITEM', Number(button.dataset.index))));
        this.element.querySelectorAll('.build-base-item').forEach(button => button.addEventListener('click', () => { window.EventBus.emit('BUILD_BASE_STRUCTURE', button.dataset.prefab); this.render(); }));
        this.element.querySelectorAll('.assign-base-job').forEach(button => button.addEventListener('click', () => window.EventBus.emit('ASSIGN_BASE_JOB', button.dataset.job)));
        this.element.querySelector('#btn-close-base').addEventListener('click', window.closeCompanionDialogue);
    }
}
