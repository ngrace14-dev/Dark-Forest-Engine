import { UIComponent } from '../core/UIComponent.js';

export class IntelDebugComponent extends UIComponent {
    constructor() {
        super('intel-debug-panel');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;

        eventBus.on('TOGGLE_INTEL_DEBUG', () => {
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

        eventBus.on('RENDER_INTEL_DEBUG', () => this.render());
    }

    render() {
        if (!this.element || !window.IntelManager) return;
        const allIntel = Array.from(window.IntelManager.registry.values());
        
        let html = `
            <div class="flex justify-between items-center mb-4 border-b border-purple-700 pb-2">
                <h2 class="text-purple-400 font-bold tracking-widest text-sm uppercase">Global Ledger Debug</h2>
                <div class="text-[10px] text-gray-400">Active Records: ${allIntel.length}</div>
            </div>
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
        `;

        allIntel.forEach(intel => {
            const owners = Array.from(window.IntelManager.ownershipRegistry.get(intel.intel_id) || []);
            html += `
                <div class="bg-gray-900 p-2 border border-purple-900/50 rounded flex flex-col gap-1 text-[10px]">
                    <div class="flex justify-between">
                        <span class="font-bold text-purple-300">${intel.payload.title} [${intel.intel_id.substring(0, 12)}]</span>
                        <span class="text-gray-500">Plausibility: ${intel.plausibility_score.toFixed(2)}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-gray-400">
                        <div><span class="text-gray-600">Parent:</span> ${intel.parent_intel_id ? intel.parent_intel_id.substring(0, 12) : 'NONE'}</div>
                        <div><span class="text-gray-600">Owners:</span> ${owners.length} (${owners.join(', ')})</div>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-1">
                        ${intel.provenance.map((p, i) => `<span class="bg-purple-900/30 border border-purple-800/50 px-1 rounded">V${i}: ${p.node_id}</span>`).join('')}
                    </div>
                </div>
            `;
        });

        html += `</div>
            <button onclick="window.EventBus.emit('TOGGLE_INTEL_DEBUG')" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-purple-400 transition-colors w-full text-center">Close Debug</button>
        `;

        this.element.innerHTML = html;
    }
}
