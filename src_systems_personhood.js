/**
 * File: src_systems_personhood.js
 * Phase: NPC Personhood & Individual Conclusion logic
 * 
 * Expresses Bible §22 (Career Ambition) and §34 (NPC Autonomy).
 * Implements traits, identity archetypes, and belief filters.
 */

class PersonhoodSystem {
    constructor() {
        this.profiles = new Map(); // Map<node_id, ProfileObject>
        this.ARCHETYPES = {
            STEWARD: { bias: 'STABILITY', desc: 'Prioritizes institutional order and tradition.' },
            SURVIVOR: { bias: 'CAUTION', desc: 'Focuses on immediate safety and resource preservation.' },
            ZEALOT: { bias: 'FAITH', desc: 'Unwavering belief in House or Force directives.' },
            SKEPTIC: { bias: 'TRUTH', desc: 'Questions authority and official narratives.' },
            OPPORTUNIST: { bias: 'GREED', desc: 'Views information through the lens of personal gain.' },
            SCHOLAR: { bias: 'PATTERNS', desc: 'Prioritizes poem decoding and pattern recognition.' } // Bible §36
        };

                this.institutions = {
            'historical_office': { label: 'Historical Office', focus: 'STABILITY', siloedIntel: new Set() },
            'guardians_300': { label: 'The 300 Guardians', focus: 'CONTINUITY', siloedIntel: new Set() },
            'scholastic_order': { label: 'The Scholastic Order', focus: 'TRUTH', siloedIntel: new Set() }
        };

        this.wendigoCandidates = []; // Array of { profile, lastPosition }

        window.EventBus.on('ENGINE_READY', () => this.init());

    }

    /**
     * Substrate Population Engine: Births, Growth, and Sigmoid Logic.
     */
    processDemographics() {
        if (!window.VillageManager) return;
        
        const villages = window.VillageManager.villages;
        const globalPop = villages.reduce((sum, v) => sum + v.population.current, 0);
        const softCap = 250000;

        villages.forEach(v => {
            // 1. BIRTH MODEL: Prosperity-Linked Sigmoid
            const capacityRatio = globalPop / softCap;
            const prosperityMult = v.stats.prosperity / 100;
            const foodSecurity = Math.min(1.0, v.stats.food / Math.max(1, v.population.current * 10));
            
            // Base growth rate slows as we hit cap (Sigmoid Brake)
            const growthRate = 0.02 * (1.0 - capacityRatio) * prosperityMult * foodSecurity;
            
            if (growthRate > 0) {
                const births = Math.floor(v.population.current * growthRate);
                v.population.current += births;
                
                // Create new personhood profiles for newborns
                for (let i = 0; i < Math.min(births, 5); i++) { // Sample new profiles to save memory
                    const childId = `npc_${v.id}_gen${v.expansionLevel}_${Date.now()}_${i}`;
                    const profile = this.getProfile(childId);
                    profile.age = 0;
                    profile.lifeStage = 'CHILD';
                    profile.property.homeVillageId = v.id;
                }
            }

            // 2. MIGRATION MODEL: The Opportunity Gradient
            // Simple logic: NPCs move toward villages with higher prosperity/safety
            if (v.population.current > 100 && Math.random() < 0.05) {
                const attractors = villages.filter(other => other.id !== v.id && other.stats.prosperity > v.stats.prosperity + 20);
                if (attractors.length > 0) {
                    const target = attractors[Math.floor(Math.random() * attractors.length)];
                    const migratoryGroup = Math.floor(v.population.current * 0.02);
                    v.population.current -= migratoryGroup;
                    target.population.current += migratoryGroup;
                    window.EventBus.emit('UI_LOG_DEBUG', `[DEMOGRAPHICS] ${migratoryGroup} souls migrated from ${v.name} to ${target.name}.`);
                }
            }
        });
    }



        init() {
        // --- PLAYER INTEGRATION (Node 0) ---
        // Ensure the player has a profile in the Personhood System
        this.getProfile('player_node');
        
        window.EventBus.emit('UI_LOG', '[Personhood] Cognitive Filters Active');
    }


    /**
     * Generates or retrieves a unique personality for an entity.
     */
    getProfile(nodeId) {
        if (!this.profiles.has(nodeId)) {
                        const traits = {
                            loyalty: Math.random(),
                            fear: Math.random(),
                            ambition: Math.random(),
                            riskTolerance: Math.random(),
                            cynicism: Math.random(),
                            credibility: 0.3 // DEFAULT: Unknown (0.0 - 1.0)
                        };
            
                        const archetypeKeys = Object.keys(this.ARCHETYPES);
                        const identity = archetypeKeys[Math.floor(Math.random() * archetypeKeys.length)];

                                                // --- GENERATIONAL CIVILIZATION: BIOLOGICAL AGING (Node 1) ---
                        // INITIAL NPCS start with established skills/careers
                        const initialAge = 18 + Math.floor(Math.random() * 40); 
                        const lifeStage = this.getLifeStage(initialAge);

                        this.profiles.set(nodeId, {
                            id: nodeId,
                            traits,
                            identity,
                            age: initialAge,
                            lifeStage,
                            birthDay: window.EngineParams?.worldDay || 0,
                            mortalityRisk: 0.0,
                            bias: this.ARCHETYPES[identity].bias,
                            
                            // --- MASTERY & SKILLS (Safe Villager Rule) ---
                            skills: {
                                farming: { level: Math.random() * 50, xp: 0 },
                                construction: { level: Math.random() * 50, xp: 0 },
                                history: { level: Math.random() * 50, xp: 0 },
                                combat: { level: Math.random() * 50, xp: 0 },
                                lore: { level: Math.random() * 50, xp: 0 }
                            },
                            isAdventurer: false, // Danger-exposed status

                            // --- SOCIAL TRUST NETWORKS (Node 1) ---

                            relationships: new Map(), // nodeId -> { trust, respect, loyalty, suspicion, fear, sinceDay }
                            ancestry: { parents: [], children: [], houseFounderDescent: false }, // --- LINEAGE PIVOT ---

                            beliefState: new Map(), // intelId -> { conviction, interpretation, lastUpdate }
                            beliefHistory: [], // History of conclusions drawn
                            apprentices: [], // --- PHASE 4: APPRENTICESHIP ---
                            masterId: null,
                                                        property: {
                                archives: [], // Intel IDs
                                homeVillageId: null,
                                professionalNotes: []
                            },
                            // --- PERSONAL AMBITION (Phase 13) ---
                            ambition: {
                                lifeGoal: 'NONE', // legendary_hunter, found_dynasty, reform_institution, etc
                                goalProgress: 0.0,
                                goalDifficulty: 0.5,
                                goalImportance: 0.5,
                                satisfaction: 'UNFULFILLED', // UNFULFILLED, FULFILLED, OBSESSED, FAILED
                                fear: 'IRRELEVANCE'
                            }
                        });



            // --- LEGACY REGISTRATION ---
            if (window.LegacyManager) {
                window.LegacyManager.registerEntity(nodeId);
            }
        }
        return this.profiles.get(nodeId);
    }


        /**
     * Answers: Why did THIS person arrive at THIS belief?
     * Bible §14: Truth Economy.
     */
    calculateConclusion(nodeId, intelId) {
        const profile = this.getProfile(nodeId);
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return null;

        const conclusion = {
            intelId: intelId,
            nodeId: nodeId,
            state: 'UNPROCESSED',
            interpretation: 'LITERAL',
            certainty: intel.certainty,
            reason: 'Standard interpretation.'
        };

        // --- INSTITUTIONAL SILOING (Bible §8, §36) ---
        // If the NPC belongs to an institution that wants to keep this forbidden
        if (profile.institutionId && this.institutions[profile.institutionId]?.siloedIntel.has(intelId)) {
            conclusion.state = 'SUPPRESSED';
            conclusion.interpretation = 'FORBIDDEN';
            conclusion.reason = 'Institutional directives mandate the concealment of this information.';
            return conclusion;
        }

                // 1. TRUST FILTER (Bible §13)
        // Check for Liar status before any calculation
        if (profile.traits.isKnownFabricator) {
            conclusion.state = 'REJECTED';
            conclusion.interpretation = 'DISMISSED';
            conclusion.reason = 'Individual is a known fabricator.';
            return conclusion;
        }

        // If the source of the intel is a rival or untrusted, skepticism increases
        const provenance = intel.provenance[0];
        let trust = 0.5;
        if (provenance) {
            // --- PHASE 2: CREDIBILITY-BASED DEMAND GATING ---
            const sourceProfile = this.getProfile(provenance.node_id);
            if (sourceProfile && sourceProfile.traits.credibility < 0.15) {
                conclusion.state = 'REJECTED';
                conclusion.interpretation = 'DISMISSED';
                conclusion.reason = 'Source credibility is too low to be considered.';
                return conclusion;
            }

            trust = this.getPersonalTrust(nodeId, provenance.node_id, provenance.source_faction);
        }

        // 2. IDENTITY/ARCHETYPE FILTERS
        if (profile.identity === 'SKEPTIC' && intel.payload.tags.includes('OFFICIAL_HISTORY')) {
            conclusion.interpretation = 'SUSPICIOUS';
            conclusion.certainty *= 0.5;
            conclusion.reason = 'Skeptical archetype doubts official narratives by default.';
        }

        if (profile.identity === 'SURVIVOR' && intel.type === 'WARNING') {
            conclusion.interpretation = 'ALARMED';
            conclusion.certainty = Math.min(1.0, conclusion.certainty * 1.5);
            conclusion.reason = 'Survivor identity amplifies perceived threats.';
        }

        if (profile.identity === 'STEWARD' && intel.significance.political > 50) {
            conclusion.interpretation = 'REVERENT';
            conclusion.certainty = Math.min(1.0, conclusion.certainty * 1.2);
            conclusion.reason = 'Steward archetype values high-authority political information.';
        }

                // 3. TRAIT-BASED REVISION
        const stealthAmbition = window.DreamManager?.getNPCDriveModifier(nodeId, 'stealth') || 1.0;
        
        // VOID DREAM: Information Siloing (§8, §21)
        // High stealth ambition increases the chance to suppress information.
        if (stealthAmbition > 1.5 && Math.random() < 0.3) {
            conclusion.state = 'SUPPRESSED';
            conclusion.interpretation = 'FORBIDDEN';
            conclusion.reason = 'Visions of the VOID compel the preservation of secrets.';
            return conclusion;
        }

        if (profile.traits.cynicism > 0.8 && trust < 0.4) {

            conclusion.state = 'REJECTED';
            conclusion.interpretation = 'DISMISSED';
            conclusion.reason = 'High individual cynicism led to the total rejection of the source.';
        } else {
            conclusion.state = 'ACCEPTED';
            
            // CONVICTION PIVOT: Track initial conviction
            const beliefState = profile.beliefState.get(intelId) || { conviction: conclusion.certainty, interpretation: conclusion.interpretation, lastUpdate: Date.now() };
            profile.beliefState.set(intelId, beliefState);
        }

        return conclusion;
    }

        getPersonalTrust(nodeId, sourceId, faction) {
        const profile = this.getProfile(nodeId);
        
        // --- SOCIAL TRUST NETWORKS: SELECTIVE TRUST (Node 2) ---
        if (profile.relationships.has(sourceId)) {
            const rel = profile.relationships.get(sourceId);
            // Compound Trust score from multiple dimensions
            const socialWeight = (rel.trust * 1.5 + rel.respect * 1.0 + rel.loyalty * 2.0) - (rel.suspicion * 1.5 + rel.fear * 0.5);
            return Math.max(0.1, Math.min(1.0, 0.5 + (socialWeight * 0.1)));
        }

        // Fallback to Institutional Trust
        if (window.ReputationManager) {
            return window.ReputationManager.calculateTrust({ id: sourceId, faction }, { id: nodeId, faction: profile.bias });
        }

        return 0.5;
    }

    setRelationship(nodeId, targetId, type, values = {}) {
        const profile = this.getProfile(nodeId);
        profile.relationships.set(targetId, {
            trust: values.trust ?? 0.5,
            respect: values.respect ?? 0.5,
            loyalty: values.loyalty ?? 0.0,
            suspicion: values.suspicion ?? 0.0,
            fear: values.fear ?? 0.0,
            sinceDay: window.EngineParams?.worldDay || 0
        });
    }

    updateRelationship(nodeId, targetId, deltas) {
        const profile = this.getProfile(nodeId);
        const rel = profile.relationships.get(targetId) || { trust: 0.5, respect: 0.5, loyalty: 0.0, suspicion: 0.0, fear: 0.0 };
        
        if (deltas.trust) rel.trust = Math.max(0, Math.min(1.0, rel.trust + deltas.trust));
        if (deltas.respect) rel.respect = Math.max(0, Math.min(1.0, rel.respect + deltas.respect));
        if (deltas.loyalty) rel.loyalty = Math.max(0, Math.min(1.0, rel.loyalty + deltas.loyalty));
        if (deltas.suspicion) rel.suspicion = Math.max(0, Math.min(1.0, rel.suspicion + deltas.suspicion));
        if (deltas.fear) rel.fear = Math.max(0, Math.min(1.0, rel.fear + deltas.fear));
        
        profile.relationships.set(targetId, rel);
    }


        /**
         * Updates an NPC's global credibility score.
         * Bible Doctrine: Built on a lifetime, lost in a day (Loss is 3x faster than gain).
         */
        updateCredibility(nodeId, delta) {
            const profile = this.getProfile(nodeId);
            if (!profile) return;

            const oldCred = profile.traits.credibility;
            profile.traits.credibility = Math.max(0, Math.min(1.0, oldCred + delta));

            if (Math.abs(profile.traits.credibility - oldCred) > 0.01) {
                const direction = delta > 0 ? "risen" : "fallen";
                window.EventBus.emit('UI_LOG_DEBUG', `[CREDIBILITY] The word of ${nodeId} has ${direction}.`);
            
                // Assign Liar tag if they bottom out
                if (profile.traits.credibility < 0.1 && !profile.traits.isKnownFabricator) {
                    profile.traits.isKnownFabricator = true;
                    window.EventBus.emit('UI_LOG', `[SCANDAL] ${nodeId} is now widely regarded as a fabricator.`);
                }
            }
        }

    /**
     * Registers an NPC for rebirth as a Wendigo during the next Shift.
     * Bible §10, §18: Consumption and Cold.
     */
    markForWendigoRebirth(nodeId, lastPosition) {
        if (!this.profiles.has(nodeId)) return;
        const profile = this.profiles.get(nodeId);
        
        // Prevent duplicates
        if (this.wendigoCandidates.find(c => c.profile.id === nodeId)) return;

        this.wendigoCandidates.push({
            profile: JSON.parse(JSON.stringify(profile)), // Snapshotted profile
            lastPosition: lastPosition.clone()
        });

        window.EventBus.emit('UI_LOG', `[NARRATIVE] The soul of ${profile.id} lingers in the frost...`);
    }

        consumeCandidates() {
            const batch = [...this.wendigoCandidates];
            this.wendigoCandidates = [];
            return batch;
        }

        /**
         * Node 1: Ambition Generation
         * Triggers as NPCs transition from Adolescent to Adult.
         */
        generateAmbition(profile) {
            const goals = [
                'LEGENDARY_HUNTER',
                'FOUND_DYNASTY',
                'REFORM_INSTITUTION',
                'DISCOVER_LOST_TRUTH',
                'PROTECT_VILLAGE',
                'ACCUMULATE_WEALTH',
                'COMPILE_RUNIC_THEORY'
            ];
        
            // Influence goal by identity
            let selection = goals[Math.floor(Math.random() * goals.length)];
            if (profile.identity === 'STEWARD') selection = 'PROTECT_VILLAGE';
            if (profile.identity === 'SCHOLAR') selection = 'COMPILE_RUNIC_THEORY';
            if (profile.identity === 'OPPORTUNIST') selection = 'ACCUMULATE_WEALTH';

            profile.ambition.lifeGoal = selection;
            profile.ambition.goalImportance = 0.4 + (Math.random() * 0.6);
            profile.ambition.goalDifficulty = 0.5 + (Math.random() * 0.5);

            window.ChronicleManager?.recordEvent({
                actorId: profile.id,
                type: 'AMBITION_SET',
                detail: `${profile.id} has set a life goal: ${selection.replace(/_/g, ' ')}.`,
                significance: 20,
                historicalWeight: 5
            });
        }

        /**
         * Node 2 & 3: Ambition Progress & Satisfaction
         */
        updateAmbitionProgress(nodeId, delta) {
            const profile = this.getProfile(nodeId);
            if (!profile || profile.ambition.lifeGoal === 'NONE') return;

            profile.ambition.goalProgress = Math.min(1.0, profile.ambition.goalProgress + delta);

            // Update satisfaction state
            if (profile.ambition.goalProgress >= 1.0 && profile.ambition.satisfaction !== 'FULFILLED') {
                profile.ambition.satisfaction = 'FULFILLED';
                window.EventBus.emit('UI_LOG', `[AMBITION] ${profile.id} has fulfilled their life goal: ${profile.ambition.lifeGoal}!`);
                window.ChronicleManager?.recordEvent({
                    actorId: profile.id,
                    type: 'AMBITION_FULFILLED',
                    detail: `${profile.id} achieved their goal of ${profile.ambition.lifeGoal}.`,
                    significance: 100,
                    historicalWeight: 50
                });
            }

            // DREAM INTEGRATION (Node 6)
            if (window.DreamManager) {
                const dreamMod = window.DreamManager.getNPCDriveModifier(nodeId, 'ambition') || 1.0;
                if (dreamMod > 1.2) {
                    profile.ambition.goalImportance = Math.min(1.0, profile.ambition.goalImportance + 0.05);
                    if (profile.ambition.goalImportance > 0.9) profile.ambition.satisfaction = 'OBSESSED';
                }
            }
        }

        /**
         * Node 1: Aging Logic

         */
        getLifeStage(age) {
            if (age < 20) return 'CHILD';
            if (age < 50) return 'ADOLESCENT';
            if (age < 250) return 'ADULT';
            if (age < 300) return 'PRIME_ELDER';
            return 'VENERABLE';
        }

                /**
         * Safe Villager Rule Logic
         * Bible: NPCs in safe villages cannot exceed 50% skill cap.
         */
        updateSkill(nodeId, skillName, amount) {
            const profile = this.getProfile(nodeId);
            if (!profile || !profile.skills[skillName]) return;

            const skill = profile.skills[skillName];
            
            // Apply Skill Cap (50%) if not an Adventurer
            const cap = profile.isAdventurer ? 100 : 50;
            
            if (skill.level < cap) {
                skill.xp += amount;
                if (skill.xp >= (skill.level + 1) * 10) {
                    skill.level = Math.min(cap, skill.level + 1);
                    skill.xp = 0;
                    
                    if (skill.level === 50 && !profile.isAdventurer) {
                        window.EventBus.emit('UI_LOG_DEBUG', `[MASTERY] ${nodeId} has reached their safe potential in ${skillName}. Hardship required for further growth.`);
                    }
                }
            }
        }

        /**
         * Periodically advances ages of all profiles.
         * Bible: Time is the ultimate filter.
         */
        simulateAging() {
            const currentDay = window.EngineParams?.worldDay || 0;
            
            // --- POPULATION SUBSTRATE: MIGRATION & GROWTH (Phase 4) ---
            if (currentDay % 14 === 0 && currentDay !== this._lastGlobalUpdate) {
                this._lastGlobalUpdate = currentDay;
                this.processDemographics();
            }
        
            this.profiles.forEach(profile => {

                // One year passes every 14 days (One Shift cycle = One Season)
                // Scaling: 1 year per 14 game days
                if (currentDay % 14 === 0 && currentDay !== profile._lastAgeUpdate) {
                    profile.age += 1;
                    profile.lifeStage = this.getLifeStage(profile.age);
                    profile._lastAgeUpdate = currentDay;

                    // --- AMBITION GENERATION (Node 1) ---
                    if (profile.lifeStage === 'ADULT' && profile.ambition.lifeGoal === 'NONE') {
                        this.generateAmbition(profile);
                    }

                    // --- EXTENDED LONGEVITY (300 Year Baseline) ---

                    if (profile.age >= 310) {
                        profile.mortalityRisk = 1.0; // 100% chance at 310
                    } else if (profile.age > 300) {
                        // Drastic scaling from 300 to 310
                        const yearsOver = profile.age - 300;
                        profile.mortalityRisk = Math.pow(yearsOver / 10, 2); 
                    } else {
                        profile.mortalityRisk = 0.0001; // Negligible risk before 300
                    }

                    if (Math.random() < profile.mortalityRisk) {
                        this.triggerNaturalDeath(profile);
                    }
                }
            });
        }


        triggerNaturalDeath(profile) {
            window.EventBus.emit('UI_LOG', `[DEATH] ${profile.id} has passed away of natural causes at age ${profile.age}.`);
        
            // --- PLAYER INTEGRATION: LEGACY (Node 4 & 9) ---
            if (profile.id === 'player_node') {
                window.EventBus.emit('PLAYER_DEATH', { cause: 'NATURAL_CAUSES', age: profile.age });
                // Logic handled by specialized player succession hook
            }

            // Find successors (Node 3 & 4)

            const successorId = this.findSuccessor(profile);
        
            if (successorId) {
                this.transferLegacy(profile.id, successorId);
            } else {
                window.EventBus.emit('UI_LOG', `[LOSS] The unique knowledge of ${profile.id} was buried with them.`);
                window.ChronicleManager?.recordEvent({
                    actorId: profile.id,
                    type: 'KNOWLEDGE_LOSS',
                    detail: `A master of ${profile.identity} died without a successor.`,
                    significance: 50,
                    historicalWeight: 20
                });
            }

            // Remove from simulation (House handling logic triggers on ENTITY_DIED usually)
            window.EventBus.emit('ENTITY_DIED', { id: profile.id, cause: 'NATURAL_CAUSES', houseId: profile.houseId });
        }

        findSuccessor(profile) {
            // Priority 1: Apprentice
            if (profile.apprentices.length > 0) {
                return profile.apprentices[0];
            }
            // Priority 2: Eldest Child
            if (profile.ancestry.children.length > 0) {
                return profile.ancestry.children[0];
            }
            // Priority 3: House Leader (Property goes to the state)
            if (profile.houseId) {
                const house = window.DynastyManager?.getHouse(profile.houseId);
                return house?.currentLeader;
            }
            return null;
        }

        /**
         * Node 3, 8, 9, 10: Succession Implementation
         */
        transferLegacy(sourceId, successorId) {
            const source = this.profiles.get(sourceId);
            const successor = this.profiles.get(successorId);
            if (!source || !successor) return;

            window.EventBus.emit('UI_LOG', `[SUCCESSION] ${successorId} has inherited the legacy of ${sourceId}.`);

            // 1. Property Succession (Node 9)
            if (window.IntelManager) {
                const inheritedIntel = window.IntelManager.getIntelForNode(sourceId);
                inheritedIntel.forEach(intel => {
                    window.IntelManager.grantOwnership(intel.intel_id, successorId);
                    successor.property.archives.push(intel.intel_id);
                });
            }

            // 2. Credibility Succession (Node 8)
            // Inheritance of prestige: successor gets 40% of master's credibility as "Starting Reputation"
            const credibilityBoost = source.traits.credibility * 0.4;
            successor.traits.credibility = Math.min(1.0, successor.traits.credibility + credibilityBoost);

            // 3. Skill/Knowledge Transfer (Node 4)
            // Apprentices inherit the identity/bias of their masters
            if (source.apprentices.includes(successorId)) {
                successor.identity = source.identity;
                successor.bias = source.bias;
            
                // --- APPRENTICESHIP TRUST (Node 3) ---
                // Masters grant high initial trust and respect to their apprentices
                this.setRelationship(sourceId, successorId, 'MENTORSHIP', { trust: 0.9, respect: 0.8, loyalty: 1.0 });
                this.setRelationship(successorId, sourceId, 'MENTORSHIP', { trust: 0.9, respect: 1.0, loyalty: 1.0 });
            }

            // --- CULTURAL INHERITANCE (Node 3) ---

            // Successors inherit the behavioral traits and ambitions influenced by local culture
            const village = window.VillageManager?.villages.find(v => v.id === source.property.homeVillageId);
            if (village && village.culture.dominantTrait !== 'NEUTRAL') {
                const culture = village.culture.dominantTrait;
                if (culture === 'MILITARISTIC') successor.traits.ambition += 0.2;
                if (culture === 'CAUTIOUS') successor.traits.riskTolerance -= 0.2;
                if (culture === 'SCHOLARLY') successor.identity = 'SCHOLAR';
            
                // Normalize
                successor.traits.ambition = Math.max(0, Math.min(1, successor.traits.ambition));
                successor.traits.riskTolerance = Math.max(0, Math.min(1, successor.traits.riskTolerance));
            }

            // 4. Belief Succession with Drift (Node 10)
            source.beliefState.forEach((state, intelId) => {
                const drift = (Math.random() * 0.4 - 0.2); // +/- 20% drift for the next generation
                successor.beliefState.set(intelId, {
                    conviction: Math.max(0, Math.min(1.0, state.conviction + drift)),
                    interpretation: state.interpretation,
                    lastUpdate: Date.now()
                });
            });

            // --- INHERITED TRUST (Node 5) ---
            // Successors inherit 50% of the source's social trust and respect from their networks
            source.relationships.forEach((rel, nodeId) => {
                const inheritedRel = {
                    trust: rel.trust * 0.5,
                    respect: rel.respect * 0.5,
                    loyalty: 0.0,
                    suspicion: rel.suspicion * 0.5,
                    fear: rel.fear * 0.5
                };
                this.updateRelationship(nodeId, successorId, inheritedRel);
            });

            // --- DYNASTIC AMBITION (Node 4) ---
            // If the successor was an apprentice, they inherit the master's unfulfilled goal
            if (source.apprentices.includes(successorId) && source.ambition.satisfaction !== 'FULFILLED') {
                successor.ambition.lifeGoal = source.ambition.lifeGoal;
                successor.ambition.goalProgress = source.ambition.goalProgress * 0.5; // Some progress is lost
                successor.ambition.goalImportance = source.ambition.goalImportance;
            
                window.EventBus.emit('UI_LOG', `[LEGACY] ${successorId} has inherited the quest: ${successor.ambition.lifeGoal}.`);
                window.ChronicleManager?.recordEvent({
                    actorId: successorId,
                    type: 'AMBITION_INHERITED',
                    detail: `${successorId} takes up the mantle of ${sourceId}'s goal: ${successor.ambition.lifeGoal}.`,
                    significance: 60,
                    historicalWeight: 30
                });
            }

            window.ChronicleManager?.recordEvent({


                actorId: successorId,
                type: 'SUCCESSION',
                detail: `${successorId} succeeded ${sourceId}, inheriting ${inheritedIntel?.length || 0} archives.`,
                significance: 80,
                historicalWeight: 40
            });
        }

        /**
         * Social Knowledge Sync (Nightly Social Sync)

     * During the simulation, nearby NPCs exchange folklore and traditions.
     */
    syncNearbyKnowledge(nodeA, nodeB) {
        if (!window.IntelManager || !window.IntelPropagation) return;

        // Fetch owned intel for both
        const intelA = window.IntelManager.getIntelForNode(nodeA.id);
        const intelB = window.IntelManager.getIntelForNode(nodeB.id);

        // Filter for folklore/traditions
        const folkA = intelA.filter(i => i.payload.tags.includes('FOLKLORE'));
        const folkB = intelB.filter(i => i.payload.tags.includes('FOLKLORE'));

        // Exchange one random piece of folklore
        if (folkA.length > 0) {
            const pick = folkA[Math.floor(Math.random() * folkA.length)];
            window.IntelPropagation.sync(nodeA, nodeB, pick.intel_id, window.IntelEnums.VECTORS.GOSSIP);
        }
        if (folkB.length > 0) {
            const pick = folkB[Math.floor(Math.random() * folkB.length)];
            window.IntelPropagation.sync(nodeB, nodeA, pick.intel_id, window.IntelEnums.VECTORS.GOSSIP);
        }
    }
}


window.PersonhoodManager = new PersonhoodSystem();
export default window.PersonhoodManager;
