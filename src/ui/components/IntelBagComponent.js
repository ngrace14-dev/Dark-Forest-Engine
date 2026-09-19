import { UIComponent } from '../core/UIComponent.js';

export class IntelBagComponent extends UIComponent {
    constructor() {
        super('intel-bag-panel');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('TOGGLE_INTEL_BAG', () => {
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

        eventBus.on('RENDER_INTEL_BAG', () => this.render());
    }

    render() {
        if (!this.element || !window.IntelManager) return;
        
        // Assumes 'player_node' is the physical owner
        const playerIntel = window.IntelManager.getIntelForNode('player_node');
        
        let html = `
            <div class="flex justify-between items-center mb-4 border-b border-blue-700 pb-2">
                <h2 class="text-blue-400 font-bold tracking-widest text-sm uppercase">dY"o Personal Ledger</h2>
                <div class="text-[10px] text-gray-400">Total Records: ${playerIntel.length}</div>
            </div>
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
        `;

        if (playerIntel.length === 0) {
            html += `<div class="text-gray-500 text-center text-xs py-4">Your ledger is empty. Speak to the world.</div>`;
        } else {
            playerIntel.forEach(intel => {
                const isFact = intel.type === window.IntelEnums.TYPES.FACT;
                const borderClass = isFact ? 'border-green-700/50' : 'border-gray-700 hover:border-blue-500/50';
                const rarityColors = {
                    COMMON: 'text-gray-400', UNCOMMON: 'text-green-400', RARE: 'text-blue-400',
                    RESTRICTED: 'text-purple-400', SECRET: 'text-red-400', LEGENDARY: 'text-yellow-400'
                };
                const rColor = rarityColors[intel.rarity] || 'text-gray-400';
                const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);

                html += `
                    <div class="bg-gray-800/80 p-3 border ${borderClass} rounded flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <div class="font-bold text-white text-xs">${intel.payload.title}</div>
                            <div class="text-[9px] px-1 py-0.5 rounded bg-gray-900 border border-gray-700 ${rColor}">${intel.rarity}</div>
                        </div>
                        <div class="text-[10px] text-gray-400 leading-snug">${intel.payload.description}</div>
                        
                        <div class="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-700/50">
                            <div class="flex flex-col">
                                <span class="text-[8px] uppercase text-gray-500">Type</span>
                                <span class="text-[10px] ${isFact ? 'text-green-400' : 'text-yellow-400'} font-bold">${intel.type}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[8px] uppercase text-gray-500">Certainty</span>
                                <span class="text-[10px] text-white">${Math.floor(intel.certainty * 100)}%</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[8px] uppercase text-gray-500">Age / Gen</span>
                                <span class="text-[10px] text-white">${age}d / G${intel.spread_generation}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[8px] uppercase text-gray-500">Base Value</span>
                                <span class="text-[10px] text-amber-300 font-bold">${window.IntelEconomy.calculateValue(intel, {id: 'null_buyer'})}g</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>
            <button onclick="window.EventBus.emit('TOGGLE_INTEL_BAG')" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-blue-400 transition-colors w-full text-center">Close Ledger</button>
        `;

        this.element.innerHTML = html;
    }
}
