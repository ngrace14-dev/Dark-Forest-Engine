/**
 * File: src_systems_folklore.js
 * Phase 6: Folklore Generation Engine
 * 
 * Implements Bible §17 (Folklore System) and §17 Addendum BJ (The Poem Trap).
 * Converts Chronicle events into symbolic stanzas that act as Evidence.
 */

class FolkloreEngineSystem {
    constructor() {
        // Rosetta Stone DNA from Bible §17
        this.dna = {
            'OBSERVATIONAL': [
                "Forest dark and ever cold. / Paths shifting never known.",
                "14 days and 14 nights. / Then a shift when dawn breaks light.",
                "Roads are traveled are safe alone / but a Denary bit farther you will roam"
            ],
            'INSTITUTIONAL': [
                "A score of places teeming with life. / Linked together, bound so tight",
                "19 houses and 19 men / fighting to be the blessed 10.",
                "A Monarch leads through every fortnight / when some claim 20, 40 others might."
            ],
            'MYTHIC': [
                "The gods who watch and the god who grows / are primordial they’ve always known",
                "Murder by day slave by night / came a champion of the light.",
                "Bondage is broken and power is freed / followers he gathered but disaster it breeds.",
                "In the last moment of his blinding light / his friends gathered to support him"
            ],
            'WARNING': [
                "When given the beacon of times untold. / Its whisper lies words cautions of old.",
                "Wish you be rid of this plight? / Kill the huntsmen with all your might.",
                "A monster lingers in the night. / Some say a man who isn’t right."
            ]
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('LEGEND_CREATED', (legend) => this.generatePoem(legend));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Folklore] Poem DNA Engine Active');
    }

    /**
     * Simulation creates a new poem based on a historical legend.
     * Expresses Bible §1: Action -> Chronicle -> Legend -> Poem.
     */
    generatePoem(legend) {
        // Select Class based on Forces and Significance
        let poemClass = 'OBSERVATIONAL';
        if (legend.forces?.includes('Crown')) poemClass = 'INSTITUTIONAL';
        if (legend.power > 300) poemClass = 'MYTHIC';
        if (legend.forces?.includes('Wendigo') || legend.forces?.includes('Huntsman')) poemClass = 'WARNING';

        const stanzas = this.dna[poemClass];
        const baseStanza = stanzas[Math.floor(Math.random() * stanzas.length)];
        
        // Narrative Compression (Bible §1)
        // Turn raw data into symbolic shorthand
        const title = this.generateSymbolicTitle(legend);
        const verse = this.generateContextualVerse(legend);

        const poem = {
            id: 'poem_' + Math.random().toString(36).substr(2, 9),
            title: title,
            text: `${baseStanza}\n${verse}`,
            class: poemClass,
            originId: legend.id,
            historicalWeight: legend.power,
            // Poem Trap: Evidence of memory, not truth (Addendum BJ)
            fidelity: 0.3 + Math.random() * 0.4 
        };

        // Register with IntelManager as Evidence (Bible §17)
        if (window.IntelManager) {
            window.IntelManager.register({
                type: 'RUMOR',
                payload: {
                    title: poem.title,
                    description: poem.text,
                    tags: ['FOLKLORE', poemClass]
                },
                significance: { historical: legend.power },
                rarity: legend.power > 500 ? 'LEGENDARY' : 'RARE',
                certainty: poem.fidelity
            });
        }

        window.GameState.anthology ??= [];
        window.GameState.anthology.push(poem);
        window.EventBus.emit('UI_LOG', `[FOLKLORE] A new ${poemClass.toLowerCase()} poem has been composed: ${poem.title}`);
        window.EventBus.emit('POEM_COMPOSED', poem);
    }

    generateSymbolicTitle(legend) {
        const symbols = ['Shadow', 'Flame', 'Chain', 'Root', 'Eye', 'Crown', 'Bone'];
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        return `The ${sym} of ${legend.title.split(' ').pop()}`;
    }

    generateContextualVerse(legend) {
        const templates = [
            `When ${legend.title} came to pass, the world did sigh.`,
            `The story of ${legend.title} shall never die.`,
            `Under the gaze of the Crow, ${legend.title} was born.`,
            `Behold the ${legend.title}, and the oath that was sworn.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
}

window.FolkloreEngine = new FolkloreEngineSystem();
export default window.FolkloreEngine;
