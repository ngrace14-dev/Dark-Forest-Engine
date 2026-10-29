/**
 * File: src_systems_folklore.js
 * Phase 6: Folklore Generation Engine
 * 
 * Implements Bible §17 (Folklore System) and §17 Addendum BJ (The Poem Trap).
 * Converts Chronicle events into symbolic stanzas that act as Evidence.
 */

class FolkloreEngineSystem {
        constructor() {
        this.anthology = [];
        this.mythicDriftStats = {
            totalDrift: 0,
            crystallizationCount: 0
        };
        // Rosetta Stone DNA from Bible §17
        this.dna = {
// ... existing dna entries ...

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
                "A monster lingers in the night. / Some say a man who isn’t right.",
                "When spirit fires fade to gray / Do not wander far away."
            ],
            'REVISIONAL': [
                "They say they fled to save the seed / but truth is buried beneath their greed.",
                "The 19 walked where only 10 stay / the rest were lost along the way."
            ],
            'EPITAPH': [
                "The Wanderer came with runes of old / a tale of fire and iron told.",
                "Through shifting woods and mountain cold / they sought the truth that none could hold.",
                "A hero's mark on skin was carved / while cities thrived and peasants starved.",
                "They spoke to stars and dreamed of light / until the Wendigo brought the night."
            ],
            'BARRIER_LESSON': [
                "When fires dim and spirits fade / Do not wander from the chain.",
                "The road forgets the names of old / When the rune-stones lose their hold."
            ]
        };



        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('LEGEND_CREATED', (legend) => this.generatePoem(legend));
    }

        init() {
        this.persistentAnthology = this.loadCrossRunFolklore();
        this.anthology = [...this.persistentAnthology];
                // --- STEP 10-4: INJECT TOMBSTONE FOLKLORE ---
                this.injectTombstoneFolklore();

                window.EventBus.emit('UI_LOG', '[Folklore] Poem DNA Engine Active');
    }

    injectTombstoneFolklore() {
                const history = JSON.parse(localStorage.getItem('dark-forest-sim-history') || '[]');
                if (history.length === 0) return;

                history.forEach((tomb, idx) => {
                    const verse = {
                        id: `tombstone_${idx}`,
                        title: `The Tale of the ${tomb.category} Age`,
                        text: `In the time of Epoch ${tomb.epoch}, when the ${tomb.choice} was chosen, the world was ${tomb.category.toLowerCase()}.`,
                        class: 'MYTHIC',
                        historicalWeight: 500,
                        distortionLevel: 0.8,
                        fidelity: 0.1
                    };
                    this.anthology.push(verse);
            
                    // Add legends as sub-verses
                    tomb.legends.forEach(l => {
                        this.anthology.push({
                            id: `legend_memory_${l.name}`,
                            title: `The Echo of ${l.name}`,
                            text: `It is whispered that ${l.name}, known as ${l.title}, walked the woods before the Great Shift.`,
                            class: 'MYTHIC',
                            historicalWeight: 300,
                            distortionLevel: 0.9,
                            fidelity: 0.05
                        });
                    });
                });
    }


        /**
     * Verse Strand: Contextual Folklore Generation
     * Bible §17: "Meaning over Details."
     * Converts a physical HistoricalRecord into a Verse object.
     */
        crystallizeVerse(record_id) {
        const record = window.MountainArchives?.records?.get(record_id);
        if (!record) return null;

        const intel = window.IntelManager?.lookup(record.intel_id);
        if (!intel) return null;

        // --- STEP 5-3: THERMODYNAMIC DECAY ---
        // Meaning over Details. Strip spatial and temporal precision.
        const driftLevel = Math.min(0.9, (intel.spread_generation || 0) * 0.1 + 0.3);
        
        // Determine the 'Meaning' class
        let verseClass = 'OBSERVATIONAL';
        if (intel.payload.tags.includes('BARRIER_FAILURE') || intel.payload.tags.includes('FUEL_SHORTAGE')) {
            verseClass = 'BARRIER_LESSON';
        } else if (intel.payload.tags.includes('MONSTER') || intel.payload.tags.includes('WENDIGO')) {
            verseClass = 'WARNING';
        } else if (intel.significance.historical > 100) {
            verseClass = 'MYTHIC';
        }

        const stanzas = this.dna[verseClass] || this.dna['OBSERVATIONAL'];
        const baseStanza = stanzas[Math.floor(Math.random() * stanzas.length)];

        // Apply Mythic Drift (Symbolic Substitution)
        const crystallizedText = this.applyMythicDrift(baseStanza, driftLevel);

        const verse = {
            id: 'verse_' + Math.random().toString(36).substr(2, 9),
            title: this.generateSymbolicTitle({ title: record.title }),
            text: crystallizedText,
            class: verseClass,
            origin_record_id: record_id,
            meaning_payload: {
                lesson: this.extractMoral(verseClass, intel),
                preserved_truth_id: record.intel_id // The "Poem Trap"
            },
            distortionLevel: driftLevel,
            fidelity: Math.max(0.05, 1.0 - driftLevel)
        };

        this.anthology.push(verse);
        this.mythicDriftStats.totalDrift += driftLevel;
        this.mythicDriftStats.crystallizationCount++;

        // --- THE POEM TRAP (Bible §17 Addendum BJ) ---
        // Register as a persistent, low-fidelity world rumor
        if (window.IntelManager) {
            window.IntelManager.register({
                type: 'RUMOR',
                payload: {
                    title: verse.title,
                    description: verse.text,
                    tags: ['FOLKLORE', verseClass, 'POEM_TRAP', 'CRYSTALLIZED']
                },
                significance: { historical: intel.significance.historical * 0.5, crow: 100 },
                rarity: 'RARE',
                certainty: verse.fidelity,
                isAnchored: true // Folklore survives the Shift
            });
        }

        window.EventBus.emit('UI_LOG', `[FOLKLORE] A truth has survived its facts. A new verse crystallized: ${verse.title}`);
        window.EventBus.emit('FOLKLORE_CREATED', verse);
        return verse;
    }

    applyMythicDrift(text, level) {
        let result = text;

        // 1. Symbolic Substitution: Numbers -> Archetypes
        if (level > 0.3) {
            result = result.replace(/\b14\b/g, "a fortnight");
            result = result.replace(/\b19\b/g, "a score of lords");
            result = result.replace(/\b10\b/g, "the chosen few");
            result = result.replace(/\d+/g, (match) => {
                const val = parseInt(match);
                if (val > 100) return "a multitude";
                if (val > 10) return "many";
                return "a handful";
            });
        }

        // 2. Spatial Compression: Coordinates -> Directions
        if (level > 0.5) {
            result = result.replace(/North/gi, "the frozen reaches");
            result = result.replace(/South/gi, "the sun-scorched dunes");
            result = result.replace(/East/gi, "the waking dawn");
            result = result.replace(/West/gi, "the dying light");
        }

        // 3. Entity Abstraction: Names -> Titles
        if (level > 0.7) {
            result = result.replace(/The Wanderer/g, "The Traveler Between Worlds");
            result = result.replace(/The Wendigo/g, "The Hunger That Walks");
            result = result.replace(/The Crown/g, "The Silver Thralldom");
        }

        return result;
    }

    extractMoral(vClass, intel) {
        const morals = {
            'BARRIER_LESSON': 'Stay near the roads when fuel is low.',
            'WARNING': 'Avoid the deep woods where shadows speak.',
            'MYTHIC': 'The past is a mirror of the future.',
            'OBSERVATIONAL': 'The forest remembers what man forgets.'
        };
        return morals[vClass] || 'Meaning is subjective.';
    }


        const stanzas = this.dna[pClass] || this.dna['OBSERVATIONAL'];
        const stanza = stanzas[Math.floor(Math.random() * stanzas.length)];
        // Take just the first line for a bark
        return stanza.split(' / ')[0];
    }

    /**
     * Cross-Run Persistence (§17, §BO)
     * Boilerplate: Retrieves previous run epitaphs from local storage.
     */
    loadCrossRunFolklore() {
        const stored = localStorage.getItem('dark-forest-persistent-folklore');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    saveCrossRunFolklore(poem) {
        const existing = this.loadCrossRunFolklore();
        existing.push(poem);
        // Limit to last 5 deaths to keep flavor text rare and impactful
        if (existing.length > 5) existing.shift();
        localStorage.setItem('dark-forest-persistent-folklore', JSON.stringify(existing));
    }


        /**
     * Historical Compression Logic
     * Bible §1: Chronicle -> Truth -> History -> Folklore -> Poem
     */
        generatePoem(legend, options = {}) {
        // --- FUNCTIONAL MEMORY: PURPOSE CLASSIFICATION (Node 1) ---
        let purpose = 'MEMORIALIZATION';
        if (legend.type === 'RAID_REPELLED' || legend.type === 'THREAT') purpose = 'WARNING';
        if (legend.type === 'SUCCESSION') purpose = 'LEGITIMIZATION';
        if (legend.type === 'AMBITION_FULFILLED') purpose = 'IDENTITY';
        if (legend.power > 700) purpose = 'MYTHIC_TRUTH';

        // --- CULTURAL FILTERS (Node 3) ---

        // Cultures preferentially remember events aligned with their ethos.
        const originEntity = window.GameCore?.activeEntities.find(e => e.id === legend.actorId);
        let cultureBias = 'NEUTRAL';
        if (originEntity && originEntity.villageId) {
             const village = window.VillageManager?.villages.find(v => v.id === originEntity.villageId);
             cultureBias = village?.culture.dominantTrait || 'NEUTRAL';
        }

        // Select Class based on Forces, Significance and Culture
        let poemClass = 'OBSERVATIONAL';
        if (legend.forces?.includes('Crown')) poemClass = 'INSTITUTIONAL';
        if (legend.power > 300) poemClass = 'MYTHIC';
        if (legend.forces?.includes('Wendigo') || legend.forces?.includes('Huntsman') || cultureBias === 'SURVIVALIST') poemClass = 'WARNING';
        
        // PIVOT: Identify if this is revisional history (Bible §17)
        if (legend.type === 'SUCCESSION' || legend.type === 'FEUD' || cultureBias === 'MILITARISTIC') poemClass = 'REVISIONAL';


        const stanzas = this.dna[poemClass];
        const baseStanza = stanzas[Math.floor(Math.random() * stanzas.length)];
        
        // 1. Distortion Engine (Bible §17 Addendum BJ)
        // High distortion compresses more events and romanticizes more.
        const distortionLevel = legend.power > 500 ? 0.8 : 0.3;
        const distortedText = this.applyDistortion(baseStanza, poemClass, distortionLevel);

        // 2. Narrative Synthesis
        const title = this.generateSymbolicTitle(legend);
        const verse = this.generateContextualVerse(legend);

                const poem = {
            id: 'poem_' + Math.random().toString(36).substr(2, 9),
            title: title,
            text: `${distortedText}\n${verse}`,
            class: poemClass,
            purpose: purpose, // Added Purpose
            originId: legend.id,
            historicalWeight: legend.power,
            distortionLevel: distortionLevel,
            storyStrength: (legend.power / 10) * (1.0 + distortionLevel),
            // Poem Trap: Evidence of memory, not truth (Addendum BJ)
            fidelity: 0.2 + (Math.random() * 0.5) 
        };


        this.anthology.push(poem);

                // Register as Evidence/Intel (Bible §17)
        if (window.IntelManager) {
            window.IntelManager.register({
                type: 'RUMOR',
                payload: {
                    title: poem.title,
                    description: poem.text,
                    tags: ['FOLKLORE', poemClass, purpose, 'POEM_TRAP']
                },
                significance: { historical: legend.power, crow: poem.storyStrength },
                rarity: legend.power > 500 ? 'LEGENDARY' : 'RARE',
                certainty: poem.fidelity
            });
        }


        window.GameState.anthology = this.anthology;
        window.EventBus.emit('UI_LOG', `[FOLKLORE] A new ${poemClass.toLowerCase()} poem has crystallized: ${poem.title}`);
        window.EventBus.emit('POEM_COMPOSED', poem);
    }

        applyDistortion(text, pClass, level) {
            let result = text;
        
            // --- MEMORY DECAY: ARCHEТYPAL SHIFT (Node 4) ---
            // Details fade, Archetypes remain. Names disappear.
            if (level > 0.4) {
                result = result.replace(/lord_\w+_\d+/g, "The Great Leader");
                result = result.replace(/res_\d+_\d+_\d+/g, "The Commoner");
                result = result.replace(/intel_\w+/g, "The Secret");
            }

            if (level > 0.7) {
                result = result.replace(/The Great Leader/g, "The One Who Led");
                result = result.replace(/The Commoner/g, "The Lost Soul");
                result = result.replace(/The Secret/g, "The Light");
            }

            // --- POEM TRAP: CIPHER DISTORTION (Bible §17, Addendum BJ) ---

        // 20 = Administrative Truth (1 Capital + 19 Villages)
        // 40 = Narrative Noise / Confusion
        if (level > 0.5) {
            if (result.includes('20')) {
                result = result.replace(/20/g, Math.random() > 0.5 ? "a score" : "forty");
            } else if (result.includes('score')) {
                result = result.replace(/score/g, "forty");
            }
        }

        // Rules for "The Poem Trap"

        if (pClass === 'INSTITUTIONAL' && level > 0.5) {
            // Omit internal house names and replace with "Hero" or "Founder"
            result = result.replace(/House \w+/g, "The Great Founders");
        }
        if (pClass === 'MYTHIC') {
            // Romanticize: Replace specific numbers with symbols
            result = result.replace(/\d+/g, "a score of");
        }
        return result;
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

        /**
     * Run Summary Epitaph
     * Bible §17: Synthesizes a player's entire run into a final folk lament.
     */
    generateRunEpitaph(playerData, history) {
        const deeds = history.filter(h => h.actorId === 'player').slice(-5);
        const topDeed = deeds.sort((a,b) => b.significance - a.significance)[0];
        
        const stanzas = this.dna['EPITAPH'];
        const base = stanzas[Math.floor(Math.random() * stanzas.length)];
        
        const finalPoem = {
            id: 'epitaph_' + Date.now(),
            title: `The Final Plight of ${playerData.renown?.title || 'the Unbloody'}`,
            text: `${base}\nIn the end, ${topDeed ? topDeed.detail : 'the silence of the woods'} was all that remained.`,
            class: 'EPITAPH',
            historicalWeight: (playerData.renown?.score || 0) * 10,
            storyStrength: 100,
            fidelity: 1.0 // Epitaphs are objective markers of a run's end
        };

                this.anthology.push(finalPoem);
        this.saveCrossRunFolklore(finalPoem); // Persist for next run (§17)
        window.GameState.anthology = this.anthology;

        window.EventBus.emit('UI_LOG', `📜 [FOLKLORE] A final lament has been written for your deeds.`);
        return finalPoem;
    }

}

window.FolkloreEngine = new FolkloreEngineSystem();
export default window.FolkloreEngine;
