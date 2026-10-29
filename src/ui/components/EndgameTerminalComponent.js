import { UIComponent } from '../core/UIComponent.js';

export class EndgameTerminalComponent extends UIComponent {
    constructor() {
        super('endgame-terminal-overlay');
    }

    onRegister(eventBus) {
        this.eventBus = eventBus;
        
        eventBus.on('ENDGAME_CHOICE_READY', (data) => {
            this.show(data.path);
        });
    }

    show(path) {
        if (!this.element) return;
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        this.render(path);
    }

    render(path) {
        if (!this.element) return;

        const choices = window.AttractorSystem?.choices || {};
        
        this.element.innerHTML = `
            <div class="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center p-10 font-mono text-gray-400 overflow-hidden">
                <!-- Glitch Background Effect -->
                <div class="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] animate-pulse"></div>
                
                <!-- Terminal Header -->
                <div class="relative z-10 text-center mb-16 space-y-4">
                    <h1 class="text-6xl font-black text-red-900 tracking-[0.5em] uppercase animate-pulse">Zero Horizon</h1>
                    <div class="h-px w-full bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
                    <p class="text-sm tracking-widest text-red-700 italic">BREACH DETECTED: ${path} PROTOCOL ACTIVE</p>
                </div>

                <!-- Choice Container -->
                <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
                    ${this.renderChoiceCard('THRONE', choices.THRONE)}
                    ${this.renderChoiceCard('CUSTODIAN', choices.CUSTODIAN)}
                    ${this.renderChoiceCard('RENUNCIATION', choices.RENUNCIATION)}
                </div>

                <!-- Footer Status -->
                <div class="absolute bottom-10 left-10 right-10 flex justify-between items-end text-[10px] text-gray-700 tracking-tighter uppercase">
                    <div class="space-y-1">
                        <div>Authority: Great Attractor</div>
                        <div>Layer: 5D Oversight</div>
                        <div>Status: Finality Achieved</div>
                    </div>
                    <div class="text-right">
                        <div>Significance Tally: ${window.ChronicleManager?.worldLedger.length || 0} Records</div>
                        <div>Epoch Cycle: ${window.EngineParams?.worldEpoch || 0}</div>
                        <div>Sim State: Frozen</div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderChoiceCard(key, choice) {
        if (!choice) return '';
        
        const colors = {
            THRONE: 'border-amber-900/50 hover:border-amber-500 text-amber-500/70',
            CUSTODIAN: 'border-blue-900/50 hover:border-blue-500 text-blue-500/70',
            RENUNCIATION: 'border-gray-900/50 hover:border-white text-gray-500 hover:text-white'
        };

        const hoverGlow = {
            THRONE: 'hover:shadow-[0_0_50px_rgba(245,158,11,0.1)]',
            CUSTODIAN: 'hover:shadow-[0_0_50px_rgba(59,130,246,0.1)]',
            RENUNCIATION: 'hover:shadow-[0_0_50px_rgba(255,255,255,0.05)]'
        };

        return `
            <button data-choice="${key}" class="group relative flex flex-col text-left p-8 bg-black/40 border ${colors[key]} transition-all duration-700 ${hoverGlow[key]} h-full backdrop-blur-sm">
                <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-current"></div>
                <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-current"></div>
                <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current"></div>
                <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current"></div>

                <div class="mb-6 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span class="text-xs tracking-[0.3em] font-bold text-gray-600">OPTION_${key}</span>
                    <h2 class="text-2xl font-black mt-2 tracking-widest">${choice.title}</h2>
                </div>

                <div class="flex-grow">
                    <p class="text-xs leading-relaxed text-gray-500 group-hover:text-gray-300 transition-colors">${choice.desc}</p>
                </div>

                <div class="mt-8 pt-6 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                    <span class="text-[10px] tracking-widest font-bold">INITIATE FINALITY sequence_</span>
                </div>
            </button>
        `;
    }

    bindEvents() {
        const buttons = this.element.querySelectorAll('[data-choice]');
        buttons.forEach(btn => {
            btn.onclick = (e) => {
                const choice = e.currentTarget.getAttribute('data-choice');
                this.confirmChoice(choice);
            };
        });
    }

    confirmChoice(choiceKey) {
        const choices = window.AttractorSystem?.choices || {};
        const choice = choices[choiceKey];
        if (!choice) return;

        if (confirm(`FINAL WARNING: Choosing "${choice.title}" will permanently resolve this simulation. Proceed?`)) {
            window.AttractorSystem.executeChoice(choiceKey);
        }
    }
}
