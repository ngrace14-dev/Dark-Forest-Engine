import { UIComponent } from '../core/UIComponent.js';

export class IntelBrokerComponent extends UIComponent {
    constructor() {
        super('companion-dialogue'); // Reusing existing dialog
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('BUY_INTEL', ({ brokerId, intelId, price }) => {
            if (window.GameState.inventory.gold < price) {
                window.EventBus.emit('UI_LOG', 'Not enough gold to purchase this secret.');
                return;
            }
            const broker = window.GameCore.activeEntities.find(e => e.id === brokerId);
            if (!broker) return;

            window.GameState.inventory.gold -= price;
            // Execute sync (Perfect fidelity for direct purchases)
            window.IntelPropagation.sync(broker, { id: 'player_node', memory_limit: 100, faction: 'Player', type: 'PLAYER' }, intelId, 1.0);
            
            // Career XP
            window.CareerManager?.addXP('broker', 10);

            window.EventBus.emit('UI_LOG', `[BROKER] Purchased intelligence for ${price} gold.`);
            window.EventBus.emit('UI_UPDATE_HUD');
            window.EventBus.emit('RENDER_INTEL_BAG'); // Refresh ledger if open
            this.render(broker); // Refresh UI
        });

        eventBus.on('SELL_INTEL', ({ brokerId, intelId, price }) => {
            const broker = window.GameCore.activeEntities.find(e => e.id === brokerId);
            if (!broker) return;

            window.GameState.inventory.gold += price;
            // Execute sync
            window.IntelPropagation.sync({ id: 'player_node', faction: 'Player', type: 'PLAYER' }, broker, intelId, 1.0);
            
            // Career XP
            window.CareerManager?.addXP('broker', Math.min(50, price));

            window.EventBus.emit('UI_LOG', `[BROKER] Sold intelligence for ${price} gold.`);
            window.EventBus.emit('UI_UPDATE_HUD');
            this.render(broker); // Refresh UI
        });
        
        // Using global openIntelBroker for now as it's directly called from UI update loop
        window.openIntelBroker = this.render.bind(this);
    }

    render(broker) {
        if (!this.element) return;
        
        const brokerIntel = window.IntelManager.getIntelForNode(broker.id) || [];
        const playerIntel = window.IntelManager.getIntelForNode('player_node') || [];
        
        // Auto-generate some mock intel for testing if the broker is empty
        if (brokerIntel.length === 0 && Math.random() > 0.5) {
            const mockId = window.IntelManager.register({
                type: window.IntelEnums.TYPES.RUMOR,
                payload: { title: "Whispers of the Deep Woods", description: "A hunter saw strange lights to the North.", tags: ['rumor', 'forest'] },
                certainty: 0.3,
                truth_state: window.IntelEnums.TRUTH_STATE.TRUE,
                significance: { survival: 10, economic: 5 },
                rarity: window.IntelEnums.RARITY.COMMON,
                provenance: [{ node_id: 'unknown', timestamp: window.EngineParams?.worldDay || 0, origin_type: 'HUNTER' }]
            });
            window.IntelManager.grantOwnership(mockId, broker.id);
            brokerIntel.push(window.IntelManager.lookup(mockId));
        }
        
        const brokerRows = brokerIntel.map(intel => {
            const price = window.IntelEconomy.calculateValue(intel, { id: 'player_node' });
            if (price <= 0) return ''; // Player already knows it
            return `<button class="border border-purple-700 bg-gray-900 p-2 text-left hover:border-purple-300 w-full mb-1 flex flex-col gap-1 transition-colors" onclick="window.EventBus.emit('BUY_INTEL', { brokerId: '${broker.id}', intelId: '${intel.intel_id}', price: ${price} })">
                <div class="flex justify-between items-center"><span class="font-bold text-white text-[10px]">${intel.payload.title}</span><span class="text-amber-300 text-[10px] font-bold">${price}g</span></div>
                <div class="flex justify-between items-center text-[8px] text-gray-500"><span>${intel.type} | Cert: ${Math.floor(intel.certainty*100)}%</span><span>Gen ${intel.spread_generation}</span></div>
            </button>`;
        }).join('') || '<div class="text-gray-500 text-[10px] py-2">No new secrets to share.</div>';

        const playerRows = playerIntel.map(intel => {
            const price = window.IntelEconomy.calculateValue(intel, broker);
            if (price <= 0) return ''; // Broker already knows it
            return `<button class="border border-gray-700 bg-gray-900 p-2 text-left hover:border-blue-300 w-full mb-1 flex flex-col gap-1 transition-colors" onclick="window.EventBus.emit('SELL_INTEL', { brokerId: '${broker.id}', intelId: '${intel.intel_id}', price: ${price} })">
                <div class="flex justify-between items-center"><span class="font-bold text-white text-[10px]">${intel.payload.title}</span><span class="text-amber-300 text-[10px] font-bold">${price}g</span></div>
                <div class="flex justify-between items-center text-[8px] text-gray-500"><span>${intel.type} | Cert: ${Math.floor(intel.certainty*100)}%</span><span>Gen ${intel.spread_generation}</span></div>
            </button>`;
        }).join('') || '<div class="text-gray-500 text-[10px] py-2">You possess no secrets of value to me.</div>';

        this.element.innerHTML = `
            <div class="mb-4 border-b border-purple-700 pb-3">
                <div class="text-purple-400 font-bold tracking-widest uppercase">Information Broker</div>
                <div class="text-[10px] text-gray-500 mt-1">Gold: <span class="text-amber-300">${window.GameState.inventory.gold}</span></div>
            </div>
            <div class="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-4">
                <div>
                    <div class="text-[10px] text-purple-400 font-bold mb-2 uppercase border-b border-purple-900/50 pb-1">Buy Secrets</div>
                    ${brokerRows}
                </div>
                <div>
                    <div class="text-[10px] text-blue-400 font-bold mb-2 uppercase border-b border-blue-900/50 pb-1">Sell Secrets</div>
                    ${playerRows}
                </div>
            </div>
            <button id="btn-close-broker" class="border border-gray-600 px-3 py-2 text-xs hover:border-purple-400 w-full transition-colors">Step Away</button>
        `;
        this.element.classList.remove('hidden');
        
        // This is a bit dirty, ideally we have a proper close event
        this.element.querySelector('#btn-close-broker').addEventListener('click', () => {
            this.element.classList.add('hidden');
        });
    }
}
