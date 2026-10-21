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


    init() {
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
                        const initialAge = 18 + Math.floor(Math.random() * 40); // Initial NPCs start as adults
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
                            relationships: new Map(), // nodeId -> { type, weight, sinceDay }
                            ancestry: { parents: [], children: [], houseFounderDescent: false }, // --- LINEAGE PIVOT ---
                            beliefState: new Map(), // intelId -> { conviction, interpretation, lastUpdate }
                            beliefHistory: [], // History of conclusions drawn
                            apprentices: [], // --- PHASE 4: APPRENTICESHIP ---
                            masterId: null,
                            property: {
                                archives: [], // Intel IDs
                                homeVillageId: null,
                                professionalNotes: []
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
        
        // RELATIONSHIP PIVOT: Check for specific social bonds
        if (profile.relationships.has(sourceId)) {
            const link = profile.relationships.get(sourceId);
            const multipliers = {
                'KINSHIP': 1.8,    // Family is absolute (Bible)
                'LOYALTY': 1.5,
                'FRIENDSHIP': 1.4,
                'MENTORSHIP': 1.3,
                'OBLIGATION': 1.1,
                'ADMIRATION': 1.2,
                'DISTRUST': 0.3,
                'RIVALRY': 0.2     // Rivals reject truth from each other
            };
            return Math.min(1.0, (link.weight || 0.5) * (multipliers[link.type] || 1.0));
        }

        // Fallback to Institutional Trust (Phase 3 Integration)
        if (window.ReputationManager) {
            return window.ReputationManager.calculateTrust({ id: sourceId, faction }, { id: nodeId, faction: profile.bias });
        }

        return 0.5;
    }

    setRelationship(nodeId, targetId, type, weight = 0.5) {
        const profile = this.getProfile(nodeId);
        profile.relationships.set(targetId, {
            type: type,
            weight: weight,
            sinceDay: window.EngineParams?.worldDay || 0
        });
    }

        updateRelationship(nodeId, targetId, delta) {
            const profile = this.getProfile(nodeId);
            const current = profile.relationships.get(targetId) || { type: 'NEUTRAL', weight: 0.5 };
            current.weight = Math.max(0, Math.min(1.0, current.weight + delta));
            profile.relationships.set(targetId, current);
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
         * Node 1: Aging Logic
         */
        getLifeStage(age) {
            if (age < 13) return 'CHILD';
            if (age < 20) return 'ADOLESCENT';
            if (age < 50) return 'ADULT';
            if (age < 70) return 'PRIME_ELDER';
            return 'VENERABLE';
        }

        /**
         * Periodically advances ages of all profiles.
         * Bible: Time is the ultimate filter.
         */
        simulateAging() {
            const currentDay = window.EngineParams?.worldDay || 0;
        
            this.profiles.forEach(profile => {
                // One year passes every 14 days (One Shift cycle = One Season)
                // Scaling: 1 year per 14 game days
                if (currentDay % 14 === 0 && currentDay !== profile._lastAgeUpdate) {
                    profile.age += 1;
                    profile.lifeStage = this.getLifeStage(profile.age);
                    profile._lastAgeUpdate = currentDay;

                    // Node 2: Mortality Risk Scaling
                    if (profile.age > 60) {
                        const baseRisk = 0.01;
                        const ageOver = profile.age - 60;
                        profile.mortalityRisk = baseRisk + (ageOver * 0.005);
                    }

                    if (Math.random() < profile.mortalityRisk) {
                        this.triggerNaturalDeath(profile);
                    }
                }
            });
        }

        triggerNaturalDeath(profile) {
            window.EventBus.emit('UI_LOG', `[DEATH] ${profile.id} has passed away of natural causes at age ${profile.age}.`);
        
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
