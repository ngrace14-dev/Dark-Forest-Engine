import { UIComponent } from '../core/UIComponent.js';

export class OracleBoardComponent extends UIComponent {
    constructor() {
        super('companion-dialogue'); // Reusing existing dialog element for now
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        // Define global state structure if not present
        if (!window.OracleBoardState) {
            window.OracleBoardState = { filter: 'ALL', tab: 'BOARD', selectedIntelId: null };
        }

        eventBus.on('RENDER_ORACLE_BOARD', (hubId) => {
            const hub = window.GameCore.activeEntities.find(e => e.id === hubId);
            if (hub) this.render(hub);
        });
    }

    render(hub) {
        if (!this.element) return;
        const state = window.OracleBoardState;
        
        // Get Intel for this specific Village Hub
        const hubIntel = window.IntelManager.getIntelForNode(hub.villageId || hub.id) || [];
        
        // Also include Player Intel for cross-referencing capabilities (Optional, but good for Disputes)
        const playerIntel = window.IntelManager.getIntelForNode('player_node') || [];

        // Filter Logic
        let displayIntel = hubIntel.filter(intel => {
            if (state.tab === 'BOARD') return intel.historical_status === 'NONE' && intel.persistence === 'ACTIVE';
            if (state.tab === 'ARCHIVE') return intel.historical_status !== 'NONE' || intel.persistence === 'ARCHIVED';
            if (state.tab === 'DISPUTES') return intel.dispute_state === 'ACTIVE_DISPUTE';
            return true;
        });

        if (state.filter !== 'ALL') {
            displayIntel = displayIntel.filter(intel => intel.payload.tags.includes(state.filter.toLowerCase()));
        }

        // Sort by Priority (Significance)
        displayIntel.sort((a, b) => window.IntelPropagation._calculatePriority(b) - window.IntelPropagation._calculatePriority(a));

        const tabs = ['BOARD', 'ARCHIVE', 'DISPUTES'].map(t => 
            `<button class="px-3 py-1 text-[10px] font-bold border-b-2 ${state.tab === t ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'} transition-colors" onclick="window.OracleBoardState.tab='${t}'; window.OracleBoardState.selectedIntelId=null; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">${t}</button>`
        ).join('');

        const filters = ['ALL', 'MONSTER', 'TRADE', 'POLITICAL', 'WAR'].map(f => 
            `<button class="px-2 py-0.5 text-[9px] rounded border ${state.filter === f ? 'bg-cyan-900 border-cyan-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'} transition-colors" onclick="window.OracleBoardState.filter='${f}'; window.OracleBoardState.selectedIntelId=null; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">${f}</button>`
        ).join('');

        // List Generation
        const listRows = displayIntel.map(intel => {
            const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);
            const certColor = intel.certainty > 0.8 ? 'text-green-400' : (intel.certainty > 0.4 ? 'text-yellow-400' : 'text-red-400');
            const isSelected = state.selectedIntelId === intel.intel_id;
            
            return `
                <div class="border ${isSelected ? 'border-cyan-500 bg-gray-800' : 'border-gray-700 bg-gray-900'} p-2 cursor-pointer hover:border-cyan-400 transition-colors mb-1" onclick="window.OracleBoardState.selectedIntelId='${intel.intel_id}'; window.EventBus.emit('RENDER_ORACLE_BOARD', '${hub.id}');">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-white font-bold text-[10px] truncate max-w-[150px]">${intel.payload.title}</span>
                        <span class="text-[8px] uppercase px-1 rounded bg-gray-800 border border-gray-600 ${certColor}">Cert: ${Math.floor(intel.certainty*100)}%</span>
                    </div>
                    <div class="flex justify-between items-center text-[8px] text-gray-500">
                        <span>${intel.payload.tags[0] ? '[' + intel.payload.tags[0].toUpperCase() + ']' : ''} ${intel.type}</span>
                        <span>Age: ${age}d | Src: ${intel.provenance[0]?.origin_type || 'Unknown'}</span>
                    </div>
                </div>
            `;
        }).join('') || `<div class="text-gray-500 text-[10px] text-center mt-4">No records found.</div>`;

        // Inspection Panel (Phase 6.4D / 6.4E)
        let inspectionHtml = `<div class="h-full flex items-center justify-center text-gray-600 text-[10px]">Select a record to inspect</div>`;
        
        if (state.selectedIntelId) {
            const intel = window.IntelManager.lookup(state.selectedIntelId);
            if (intel) {
                const age = (window.EngineParams?.worldDay || 0) - (intel.provenance[0]?.timestamp || 0);
                const value = window.IntelEconomy.calculateValue(intel, {id: 'null'}); // Base value
                
                // Provenance Chain UI
                const lineagePath = intel.provenance.map((p, i) => `
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-gray-600 text-[8px] w-4 text-right">${i===0 ? 'Orig' : 'L'+i}</span>
                        <span class="text-cyan-600 text-[10px] font-bold">↳</span>
                        <span class="text-[9px] text-gray-300"><span class="text-cyan-200">${p.origin_type}</span> on Day ${p.timestamp}</span>
                    </div>
                `).join('');

                inspectionHtml = `
                    <div class="flex flex-col h-full">
                        <div class="border-b border-gray-700 pb-2 mb-2">
                            <div class="flex justify-between items-start mb-1">
                                <h3 class="text-cyan-300 font-bold text-xs uppercase tracking-wider">${intel.payload.title}</h3>
                                <span class="text-[8px] px-1 rounded border border-gray-600 text-gray-400">${intel.rarity}</span>
                            </div>
                            <p class="text-[10px] text-gray-300 leading-snug">${intel.payload.description}</p>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-2 text-[9px] mb-3">
                            <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                                <span class="text-gray-500 block mb-0.5">Status</span>
                                <span class="text-white">${intel.type} | Gen ${intel.spread_generation}</span>
                            </div>
                            <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                                <span class="text-gray-500 block mb-0.5">Metrics</span>
                                <span class="text-white">Age ${age}d | Val ${value}g</span>
                            </div>
                            <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                                <span class="text-gray-500 block mb-0.5">Certainty</span>
                                <span class="${intel.certainty >= 1.0 ? 'text-green-400' : 'text-yellow-400'}">${Math.floor(intel.certainty*100)}%</span>
                            </div>
                            <div class="bg-gray-900 p-1.5 border border-gray-800 rounded">
                                <span class="text-gray-500 block mb-0.5">Dispute</span>
                                <span class="${intel.dispute_state !== 'NONE' ? 'text-red-400 font-bold' : 'text-gray-400'}">${intel.dispute_state}</span>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto custom-scrollbar bg-gray-950 border border-gray-800 p-2 rounded mb-3">
                            <div class="text-[9px] text-gray-500 uppercase font-bold mb-2 tracking-widest border-b border-gray-800 pb-1">Provenance Chain</div>
                            ${lineagePath}
                        </div>

                        <div class="mt-auto">
                            ${intel.certainty < 1.0 ? `<button class="w-full bg-purple-900/50 border border-purple-700 hover:bg-purple-800 hover:text-white text-purple-200 px-2 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors shadow-[0_0_10px_rgba(168,85,247,0.15)]" onclick="window.EventBus.emit('START_INVESTIGATION', '${intel.intel_id}')">Focus (Active Tracking)</button>` : `<div class="w-full bg-gray-800 border border-gray-700 text-gray-500 px-2 py-1.5 text-[10px] uppercase font-bold tracking-widest text-center cursor-not-allowed">Verified</div>`}
                        </div>
                    </div>
                `;
            }
        }

        this.element.innerHTML = `
            <div class="mb-3 border-b border-cyan-700 pb-2">
                <div class="text-cyan-400 font-bold tracking-widest uppercase text-sm">Oracle Board</div>
                <div class="text-[10px] text-gray-500 mt-0.5">Public Intelligence Terminal</div>
            </div>
            
            <div class="flex gap-2 mb-3 border-b border-gray-800 pb-2">
                ${tabs}
            </div>

            <div class="flex gap-1 mb-2">
                ${filters}
            </div>

            <div class="flex gap-3 h-[350px]">
                <div class="w-1/2 overflow-y-auto custom-scrollbar pr-1">
                    ${listRows}
                </div>
                <div class="w-1/2 bg-gray-900 border border-gray-700 p-3 rounded">
                    ${inspectionHtml}
                </div>
            </div>
            
            <button id="btn-close-oracle" class="mt-4 border border-gray-600 px-3 py-2 text-xs hover:border-cyan-400 w-full transition-colors text-gray-300">Leave Terminal</button>
        `;

        // Make dialogue wider for Oracle Board
        this.element.style.width = '600px';
        this.element.classList.remove('hidden');
        
        this.element.querySelector('#btn-close-oracle').addEventListener('click', () => {
            this.element.style.width = ''; // Reset width
            this.element.classList.add('hidden');
        });
    }
}
