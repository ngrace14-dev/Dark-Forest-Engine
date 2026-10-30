/**
 * File: src_systems_dynasty.js
 * Phase 8: House History & Institutional Memory
 * 
 * Implements Bible §19 (The Monopoly Bottleneck) and §36 (Civilizational Institutions).
 * Manages the 19 Noble Houses, their lineages, feuds, and claims to Blessed Spots.
 */

class DynastyManagerSystem {
    constructor() {
        this.houses = new Map(); // Map<house_id, HouseObject>
                this.feuds = []; // Array of { houseA, houseB, reason, intensity, startDate }
        this.monopolyLog = []; // Record of Blessed status changes
        
        window.EventBus.on('ENGINE_READY', () => this.init());

                window.EventBus.on('ENTITY_DIED', (data) => this.handleDeath(data));
                window.EventBus.on('LEGACY_HARVESTED', (data) => this.handleLegacyHarvest(data));
                window.EventBus.on('HISTORY_PUBLISHED', (narrative) => this.processNarrative(narrative));
        
                // --- THE RARE PART: Institutional Pipeline Listener ---
                window.EventBus.on('INTEL_GAINED', (data) => {
                    const entity = window.GameCore?.activeEntities?.find(e => e.id === data.nodeId);
                    if (entity && (entity.houseId || entity.institutionId)) {
                        this.submitReport(entity.houseId || entity.institutionId, data.nodeId, data.intelId);
                    }
                });

                                                                // --- PLAYER INTEGRATION: IMPACT TRACKING (Node 1) ---
                this.playerFootprint = {
                    political: 0,
                    cultural: 0,
                    knowledge: 0,
                    institutional: 0,
                    civilizational: 0,
                    
                    epithets: new Map(), // house/villageId -> Epithet (e.g. "The Fire-Bringer")
                    legacyMarkers: new Map(), // nodeId -> [markers]
                    
                    institutionsInfluenced: new Set(),
                    beliefsAltered: 0,
                    reformsCatalyzed: 0,
                    schismsTriggered: 0,
                    causalChains: [], // Array of { action, intermediate, consequence, day, significance }
                    
                    // --- DISCOVERY JOURNAL (Phase 15) ---
                    discoveryJournal: new Map(), // observationKey -> { type, observedDay, hypothesis, verifiedCause, status: 'UNSOLVED'|'VERIFIED' }
                    systemMastery: {
                        trust: 0.1,
                        culture: 0.1,
                        institutions: 0.1,
                        continuity: 0.1,
                        folklore: 0.1
                    },
                    
                    globalTitle: "The Wanderer"
                };
    }

    /**
     * Records a new observation in the Discovery Journal.
     * Manifestation Rule: Consequences first.
     */
    recordObservation(type, key, description) {
        if (this.playerFootprint.discoveryJournal.has(key)) return;
        
        this.playerFootprint.discoveryJournal.set(key, {
            type: type,
            description: description,
            observedDay: window.EngineParams?.worldDay || 0,
            hypothesis: null,
            verifiedCause: null,
            status: 'UNSOLVED'
        });
        
        window.EventBus.emit('UI_LOG', `🔍 [DISCOVERY] New pattern observed: ${description}`);
    }

    /**
     * Verifies a cause for an observation, increasing system mastery.
     */
    verifyObservation(key, cause, system) {
        const obs = this.playerFootprint.discoveryJournal.get(key);
        if (!obs || obs.status === 'VERIFIED') return;

        obs.verifiedCause = cause;
        obs.status = 'VERIFIED';
        
        if (this.playerFootprint.systemMastery[system] !== undefined) {
            this.playerFootprint.systemMastery[system] = Math.min(1.0, this.playerFootprint.systemMastery[system] + 0.15);
        }
        
        window.EventBus.emit('UI_LOG', `💡 [VERIFIED] You now understand the cause of: ${obs.description}`);
    }

    /**
     * Records a causal chain starting from a player action.
     * Bible §1: Action -> Legend -> History.
     */
    recordCausalLink(action, consequence, significance = 50, intermediate = null) {
        const day = window.EngineParams?.worldDay || 0;
        const chain = { action, intermediate, consequence, day, significance };
        this.playerFootprint.causalChains.push(chain);
        
        // Update Footprint Scores
        if (action.includes('Report') || action.includes('Intel')) this.playerFootprint.knowledge += 5;
        if (consequence.includes('Schism') || consequence.includes('Reform')) this.playerFootprint.institutional += 10;
        if (consequence.includes('Culture')) this.playerFootprint.cultural += 10;
        
        window.EventBus.emit('UI_LOG_DEBUG', `[FOOTPRINT] Causal chain recorded: ${action} -> ${consequence}`);
    }

    /**
     * Assigns a player epithet to a node based on behavior.
     */
    assignEpithet(nodeId, epithet) {
        this.playerFootprint.epithets.set(nodeId, epithet);
        window.EventBus.emit('UI_LOG', `[LEGACY] You are now remembered in ${nodeId} as "${epithet}".`);
    }



    init() {
        // Initialize the 19 Noble Houses (Bible §19)
        const houseNames = [
            'Terminus', 'Oakhaven', 'Ironspire', 'Silverrun', 'Blackwood',
            'Stonehelm', 'Goldleaf', 'Ravenwatch', 'Deepdell', 'Highcrag',
            'Windward', 'Stormfront', 'Mistmantle', 'Thornrose', 'Brightvale',
            'Duskmoor', 'Frostpeak', 'Shadowfell', 'Sunstride'
        ];

                houseNames.forEach((name, index) => {
            const id = `house_${name.toLowerCase()}`;
            
            // --- GCO DNA INTEGRATION ---
            const dna = window.GCO ? window.GCO.registerEntity(id, 'HOUSE', {
                foundingMyth: `The Rise of ${name}`,
                traditions: ['Ancestral Vigil', 'Steel Naming'],
                culture: [['NOBILITY', 0.9], ['LEGACY', 0.8]]
            }) : null;

            this.houses.set(id, {
                id: id,
                name: `House ${name}`,
                founder: `Founder ${name}`,
                currentLeader: `lord_${name.toLowerCase()}_0`,
                lineage: [],
                claims: [],
                monopolies: [], // "Blessed Spots"
                prestige: 100,
                isBlessed: index < 9, // First 9 are "Blessed" (Bible §19)
                
                dna, // Link to DNA model
                
                // --- PHASE 1A: INSTITUTIONAL STATS ---
                                legitimacy: (name === 'Terminus') ? 0.9 : 0.6, // 0.0 to 1.0 (Bible §19)
                                historicalContinuity: (name === 'Terminus') ? 18000 : 12000,
                                informationalScarcity: (name === 'Terminus') ? 50 : 20,
                                publicTrust: (name === 'Terminus') ? 0.8 : 0.5,
                                verseInfluence: 0.3,
                                archiveIntegrity: 0.9,
                                truthExposureRisk: 0.1,
                                continuityIndex: (name === 'Terminus') ? 0.8 : 0.4,
                                sovereignty: (name === 'Terminus') ? 0.5 : 0.0,
                
                                // --- ANCESTRAL PROVENANCE (Plan A) ---

                                ancestralProvenance: {
                                    steel: [], // Artifact IDs
                                    ink: []    // Record IDs
                                },

                
                                // --- PHASE 2B: INSTITUTIONAL ANXIETY ---
                                internalConflictLevel: 0.1,
                                narrativeGap: 0.0,          // Distance between Official History and Truth
                                exposureAnxiety: 0.1,       // Danger of truth becoming public
                                suppressionBurden: 0.0,     // Resource cost of hiding truth
                
                                archives: [],



                
                                // --- THE RARE PART: Institutional Memory & Action Pipeline ---
                reportBuffer: new Map(), // intelId -> { reports, aggregateCertainty, status }
                actionQueue: [],
                
                                // --- INSTITUTIONAL COGNITION PHASE 2: Persistent Beliefs ---
                                beliefs: new Map(), // beliefKey -> { confidence, doubtPressure, evidenceSources, originRecordId, lastUpdated, state, officialPosition, privateConcern }
                
                                // --- INSTITUTIONAL SCHISMS (Phase 3) ---
                                factions: new Map(), // factionId -> { type, influence, members, specificBeliefs }
                                internalConflictLevel: 0.0, // 0.0 to 1.0
                                activeSchism: null,
                
                                // --- INSTITUTIONAL EVOLUTION (Phase 4) ---
                                reformHistory: [], // Array of { winnerId, day, doctrineShift }
                                foundingIdentity: { 
                                    mission: 'PRESERVE_ORDER', 
                                    fear: 'INSTABILITY', 
                                    priorities: ['TRADITION', 'LOYALTY'] 
                                },
                                currentIdentity: { 
                                    mission: 'PRESERVE_ORDER', 
                                    fear: 'INSTABILITY', 
                                    priorities: ['TRADITION', 'LOYALTY'] 
                                },
                                identityDrift: 0.0,



                
                // --- PHASE: HOUSE HISTORY ADDITIONS ---
                culturalValues: {
                    crown: Math.random() > 0.5 ? 'LOYAL' : 'SKEPTICAL',
                    huntsman: 'FEARFUL',
                    orb: 'OBSERVANT',
                    shift: 'NECESSARY_EVIL'
                },

                secrets: new Set(), // Set of intel_id
                chronicle: [], // Array of event objects
                legacy: 0, // Total significance score
                                contribution: 0, // Contribution to civilization
                demandProfile: this.getInitialDemandProfile(name.toLowerCase()) // --- MISSION-DRIVEN DEMAND ---
            });

            // Register House as a Bloodline in LegacyManager
            if (window.LegacyManager) {
                window.LegacyManager.getOrCreateBloodline(id);
            }
        });

        // --- INSTITUTIONAL COGNITION PHASE 2: Persistent Beliefs ---
        this.houses.forEach(house => {
            this.seedCoreBeliefs(house);
        });

        window.EventBus.emit('UI_LOG', '[Dynasty] Institutional Memory Engaged');
    }

        /**
     * Seeds initial persistent beliefs for an institution.
     * Bible §36: Institutions are defined by what they protect.
     */
        seedCoreBeliefs(house) {
        const day = window.EngineParams?.worldDay || 0;
        
        // 1. UNIVERSAL DOGMA (Bible §1)
        house.beliefs.set('FOREST_HOSTILITY', {
            confidence: 1.0,
            doubtPressure: 0.0,
            evidenceSources: ['INIT_TRADITION'],
            state: 'DOGMA',
            officialPosition: "The Forest is an apex predator; civilization is the prey.",
            privateConcern: "The predator is learning our schedules.",
            description: "The fundamental hostility of the woods."
        });

        house.beliefs.set('GEOGRAPHY_STABILITY', {
            confidence: 0.9,
            doubtPressure: 0.0,
            evidenceSources: ['INIT_ARCHIVE'],
            state: 'ESTABLISHED',
            officialPosition: "The Mountain Ring is eternal and unchanging.",
            privateConcern: "Wait, the star-charts from 100 years ago don't match.",
            description: "The stability of the world's borders."
        });

        // 2. MISSION-DRIVEN BELIEFS (Bible §36)
        if (house.id === 'house_terminus') {
            house.beliefs.set('OBSERVATIONAL_SUPREMACY', {
                confidence: 1.0,
                doubtPressure: 0.0,
                evidenceSources: ['ANCIENT_LENS'],
                state: 'DOGMA',
                officialPosition: "We are the Eye. What we do not see does not exist.",
                privateConcern: "There are shadows in the Churn that the lenses cannot resolve.",
                description: "The infallibility of Terminus observations."
            });
        }

        if (house.id === 'house_aethel') {
            house.beliefs.set('CROWN_SOVEREIGNTY', {
                confidence: 0.9,
                doubtPressure: 0.0,
                evidenceSources: ['FOUNDING_DECREE'],
                state: 'DOGMA',
                officialPosition: "The Aethel line is the only bridge to the Seed.",
                privateConcern: "The Seed has been silent for three generations.",
                description: "The divine right of the Crown."
            });
        }

        // 3. CULTURAL DRIFT SEEDS
        if (house.culturalValues.crown === 'SKEPTICAL') {
            const belief = house.beliefs.get('CROWN_SOVEREIGNTY');
            if (belief) {
                belief.state = 'PRIVATE_DOUBT';
                belief.confidence = 0.5;
                belief.doubtPressure = 0.3;
            }
        }
    }



        /**
     * Node 2 -> 3: Credibility -> Institution
     * Updates institutional beliefs based on new reports.
     */
        updateInstitutionalBeliefs(houseId, intelId) {
        const house = this.houses.get(houseId);
        const intel = window.IntelManager?.lookup(intelId);
        if (!house || !intel) return;

        const day = window.EngineParams?.worldDay || 0;

        house.beliefs.forEach((belief, key) => {
            const relationship = this.getIntelBeliefRelationship(intel, key);
            
            if (relationship === 'REINFORCE') {
                const gain = intel.certainty * (belief.state === 'DOGMA' ? 0.02 : 0.08);
                belief.confidence = Math.min(1.0, belief.confidence + gain);
                belief.doubtPressure = Math.max(0.0, belief.doubtPressure - (gain * 1.5));
                belief.lastUpdated = day;
                belief.evidenceSources.push(intelId);
            } 
            else if (relationship === 'CONTRADICT') {
                // DOUBT ACCUMULATION (Node 3.1)
                // Dogma is harder to doubt than standard beliefs
                const resistance = belief.state === 'DOGMA' ? 4.0 : 1.0;
                const doubtIncrease = (intel.certainty * 0.2) / (resistance * (1.0 + house.legitimacy));
                
                belief.doubtPressure = Math.min(1.0, belief.doubtPressure + doubtIncrease);
                belief.confidence = Math.max(0.0, belief.confidence - (doubtIncrease * 0.5));
                belief.lastUpdated = day;
                belief.evidenceSources.push(intelId);

                // --- INSTITUTIONAL STATE TRANSITIONS ---
                
                // 1. Established -> Private Doubt
                        if (belief.state === 'ESTABLISHED' && belief.doubtPressure > 0.3) {
                            belief.state = 'PRIVATE_DOUBT';
                            window.EventBus.emit('UI_LOG_DEBUG', `[BELIEF] ${house.name} now harbors private doubts about ${key}.`);
                    
                            // --- GCAB TELEMETRY ---
                            window.EventBus.emit('CIV_CRISIS_DETECTED', {
                                type: 'INSTITUTIONAL_DOUBT',
                                entityId: house.id,
                                rootCause: 'INFORMATIONAL_CONTRADICTION',
                                severity: belief.doubtPressure
                            });
                        }

                // 2. Private Doubt -> Doubted (Exposure/Publicity usually forces this)
                if (belief.state === 'PRIVATE_DOUBT' && belief.doubtPressure > 0.6) {
                    belief.state = 'DOUBTED';
                    belief.officialPosition = `The validity of ${key} is under internal review.`;
                    window.EventBus.emit('UI_LOG', `[BELIEF] ${house.name} has officially begun to doubt: ${key}.`);
                    house.internalConflictLevel += 0.1;
                }

                // 3. Dogma -> Private Doubt (Extreme evidence required)
                if (belief.state === 'DOGMA' && belief.doubtPressure > 0.5) {
                    belief.state = 'PRIVATE_DOUBT';
                    house.exposureAnxiety += 0.2; // Crisis point for Dogma
                    window.EventBus.emit('UI_LOG', `[CRISIS] Foundations are shaking in ${house.name}. Dogma of ${key} is being questioned.`);
                }

                // 4. Shattered (Point of no return)
                if (belief.confidence < 0.1 && belief.doubtPressure > 0.8) {
                    belief.state = 'SHATTERED';
                    belief.officialPosition = `The old truth of ${key} has been discarded.`;
                    window.EventBus.emit('UI_LOG', `[BELIEF SHATTERED] ${house.name} has abandoned the belief: ${key}.`);
                    this.triggerBeliefShatterAction(house, key);
                }
            }
        });
    }



        checkExposure(house, intelId) {
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return;

        house.beliefs.forEach((belief, key) => {
            // If the world now knows a truth that the House is privately doubting/suppressing
            if (belief.state === 'PRIVATE_DOUBT' || belief.state === 'DOUBTED') {
                if (this.getIntelBeliefRelationship(intel, key) === 'CONTRADICT') {
                    // EXPOSURE DETECTED
                    const exposureSeverity = intel.certainty * (1.0 - house.publicTrust);
                    house.exposureAnxiety = Math.min(1.0, house.exposureAnxiety + exposureSeverity);
                    
                    if (exposureSeverity > 0.3) {
                        window.EventBus.emit('UI_LOG', `[SCANDAL] Public history has exposed ${house.name}'s contradictions regarding ${key}!`);
                        house.legitimacy = Math.max(0, house.legitimacy - 0.05);
                        house.publicTrust = Math.max(0, house.publicTrust - 0.1);
                    }
                }
            }
        });
    }

    getIntelBeliefRelationship(intel, beliefKey) {
        const tags = intel.payload.tags || [];
        
        // Dynamic Mapping
        if (beliefKey === 'GEOGRAPHY_STABILITY') {
            if (tags.includes('POST-SHIFT') || tags.includes('GEOGRAPHY_ANOMALY')) return 'CONTRADICT';
            if (tags.includes('SURVEY') && !tags.includes('ANOMALY')) return 'REINFORCE';
        }
        
        if (beliefKey === 'FOREST_HOSTILITY') {
            if (tags.includes('ECOLOGY') && tags.includes('SYMBIOSIS')) return 'CONTRADICT';
            if (tags.includes('MONSTER_ATTACK') || tags.includes('WENDIGO')) return 'REINFORCE';
        }

        if (beliefKey === 'CROWN_SOVEREIGNTY') {
            if (tags.includes('SCANDAL') || tags.includes('BETRAYAL')) return 'CONTRADICT';
            if (tags.includes('ROYAL_DECREE') || tags.includes('SUCCESSION_SMOOTH')) return 'REINFORCE';
        }

        if (beliefKey === 'OBSERVATIONAL_SUPREMACY') {
            if (tags.includes('LOST_MEMORY') || tags.includes('UNRESOLVED_MYSTERY')) return 'CONTRADICT';
        }
        
        return 'NEUTRAL';
    }


    triggerBeliefShatterAction(house, beliefKey) {
        // Knowledge does not create action. Belief creates action.
        if (beliefKey === 'GEOGRAPHY_STABILITY') {
            window.EventBus.emit('UI_LOG', `[ACTION] ${house.name} funds emergency expeditions to map the "new" world.`);
            // Create discovery objectives
        }
    }


    handleLegacyHarvest(data) {
        const house = this.houses.get(data.bloodlineId);
        if (house) {
            house.legacy += data.significance;
            house.prestige += Math.floor(data.significance / 100);
            window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} legacy strengthened by Generation ${data.generation}.`);
        }
    }


    /**
     * Records an event specifically into a House's institutional memory.
     * Bible §36: "Institutions persist to carry knowledge forward."
     */
        recordHouseEvent(houseId, event) {
        const house = this.houses.get(houseId);
        if (!house) return;

        house.chronicle.push({
            id: event.id || `he_${Math.random().toString(36).substr(2, 5)}`,
            type: event.type,
            detail: event.detail,
            day: window.EngineParams?.worldDay || 0,
            significance: event.significance || 10
        });

        house.legacy += event.historicalWeight || 1;
        house.prestige += Math.floor((event.significance || 10) / 10);
        
        // --- HCB LINK: Event Captured by House ---
        if (event.id) {
            window.EventBus.emit('HOUSE_EVENT_CAPTURED', { houseId, eventId: event.id });
        }
    }


        /**
     * Add a secret that only this house knows.
     * Bible: "House Secrets Category"
     */
    addHouseSecret(houseId, intelId) {
        const house = this.houses.get(houseId);
        if (house) {
            house.secrets.add(intelId);
            window.IntelManager?.shareToInstitution(intelId, houseId);
        }
    }

    /**
     * Weaponize Truth (Bible §14, §15)
     * Uses verified evidence to apply institutional pressure.
     */
    applyLeverage(houseId, mysteryId, type = 'DIPLOMACY') {
        const house = this.houses.get(houseId);
        const mystery = window.InvestigationManager?.mysteries.get(mysteryId);
        
        if (!house || !mystery || mystery.state !== 'RESOLVED') return false;

        const weight = (mystery.tier * 20);
        let effect = "";

        switch(type) {
            case 'TAXATION':
                house.prestige = Math.max(0, house.prestige - weight);
                effect = `Taxes lowered in ${house.name} territories.`;
                break;
            case 'DIPLOMACY':
                house.contribution += weight;
                effect = `${house.name} forced into an alliance.`;
                break;
            case 'REPAIR':
                // Logic to trigger barrier repair in associated villages
                effect = `${house.name} funds immediate barrier reinforcement.`;
                break;
        }

        window.EventBus.emit('UI_LOG', `[LEDGER] Mystery State → LEVERAGED: ${mystery.title} against ${house.name}`);
        window.EventBus.emit('UI_LOG', `[SIMULATION] NPC Response → ${effect}`);
        return true;
    }


        /**
     * Handles the death of a notable NPC.
     * Bible §36: "Individuals die; institutions persist."
     */
        handleDeath(entity) {
        if (!entity) return;

        // --- PHASE 1: CHRONOS REFRACTION PREP ---
        window.ChronicleManager?.snapshotEssence(entity);

        if (!entity.houseId) return;


        const house = this.houses.get(entity.houseId);
        if (!house) return;

        // --- PHYSICAL LEGACY: PROPERTY INHERITANCE ---
        this.processPropertyInheritance(entity);

        // If the leader died, trigger succession
        if (house.currentLeader === entity.id) {
            this.triggerSuccession(house);
        }

        // If killed by a member of another house, start/intensify a feud
        if (entity.lastAttacker?.houseId && entity.lastAttacker.houseId !== entity.houseId) {
            this.recordFeudEvent(entity.houseId, entity.lastAttacker.houseId, 'BLOODSHED');
        }
    }

    /**
     * Determines who inherits the physical anchors of the deceased.
     * Hierarchy: Child -> Apprentice -> Institutional Repo -> Abandonment.
     */
    processPropertyInheritance(entity) {
        if (!window.VillageManager || !window.PersonhoodManager) return;

        const profile = window.PersonhoodManager.getProfile(entity.id);
        if (!profile) return;

        const village = window.VillageManager.villages.find(v => v.id === entity.villageId);
        if (!village) return;

        // Find all properties owned by this entity
        village.propertyRegistry.forEach((prop, id) => {
            if (prop.ownerId === entity.id) {
                let heirId = null;

                // 1. Family Inheritance
                if (profile.ancestry.children.length > 0) {
                    heirId = profile.ancestry.children[0];
                } 
                // 2. Apprentice Inheritance (Workshops/Archives)
                else if ((prop.type === 'WORKSHOP' || prop.type === 'ARCHIVE') && profile.apprentices.length > 0) {
                    heirId = profile.apprentices[0];
                }
                // 3. Institutional Inheritance
                else {
                    heirId = this.houses.get(entity.houseId)?.currentLeader || null;
                }

                if (heirId) {
                    window.VillageManager.transferProperty(village, id, heirId, 'INHERITANCE');
                } else {
                    prop.ownerId = null; // ABANDONED
                    prop.history.push({ day: window.EngineParams?.worldDay || 0, event: 'ABANDONED' });
                    window.EventBus.emit('UI_LOG', `[LEGACY] ${prop.type} ${id} has been abandoned.`);
                }
            }
        });
    }

            triggerSuccession(house) {
        const oldLeaderId = house.currentLeader;
        
        // --- SUCCESSION STATE-MACHINE (Plan A) ---
        // Choose heir based on Significance, Kinship, and Ambition
        let potentialHeirs = [];
        
        // 1. Check family members (Kinship)
        if (window.PersonhoodManager) {
            const oldLeader = window.PersonhoodManager.getProfile(oldLeaderId);
            if (oldLeader && oldLeader.ancestry?.children?.length > 0) {
                potentialHeirs = oldLeader.ancestry.children.map(id => {
                    const profile = window.PersonhoodManager.getProfile(id);
                    return {
                        id,
                        score: (profile ? (profile.traits.ambition * 50) + (profile.traits.credibility * 30) : 0) + 100 // Kinship bonus
                    };
                });
            }
        }

        // 2. Check House members (Significance)
        // (Assuming we can find entities by houseId)
        const houseEntities = (window.GameCore?.activeEntities || []).filter(e => e.houseId === house.id && e.id !== oldLeaderId);
        houseEntities.forEach(e => {
            if (!potentialHeirs.find(h => h.id === e.id)) {
                const profile = window.PersonhoodManager?.getProfile(e.id);
                potentialHeirs.push({
                    id: e.id,
                    score: (profile ? (profile.traits.ambition * 60) + (profile.traits.credibility * 20) : 0) + (e.level || 0)
                });
            }
        });

                // 3. Selection
        let newLeaderId;
        let triggerIntelId = null;
        if (potentialHeirs.length > 0) {
            potentialHeirs.sort((a, b) => b.score - a.score);
            newLeaderId = potentialHeirs[0].id;
            
            // Check if the top heir was selected based on a fabrication
            const profile = window.PersonhoodManager?.profiles.get(newLeaderId);
            if (profile && profile.traits.isKnownFabricator) {
                // This heir's legitimacy is built on lies
                triggerIntelId = 'FABRICATION_FALLBACK'; // Placeholder or actual fabrication ID
            }
        } else {
            // Generate new heir if none found
            newLeaderId = `lord_${house.id.split('_')[1]}_${house.lineage.length + 1}`;
        }
        
        // --- LEGACY TRANSFER PIVOT (Bible §36) ---
        if (oldLeaderId) {
            this.transferGenerationalLegacy(oldLeaderId, newLeaderId);
            this.applyAncestralProvenance(house, newLeaderId);
            house.lineage.push(oldLeaderId);
        }

        house.currentLeader = newLeaderId;

        const event = {
            actorId: house.id,
            type: 'SUCCESSION',
            detail: `${house.name}: Succession from ${oldLeaderId || 'None'} to ${newLeaderId}.`,
            significance: 120,
            historicalWeight: 80,
            triggerIntelId // Tag for Misinfo Bureau
        };

                window.ChronicleManager?.recordEvent(event);
        window.EventBus.emit('SUCCESSION', event);
        window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} has a new leader: ${newLeaderId}`);

    }


    /**
     * Applies bonuses from House artifacts and records to the new leader.
     * Plan A: "Ancestral Provenance"
     */
    applyAncestralProvenance(house, leaderId) {
        const profile = window.PersonhoodManager?.getProfile(leaderId);
        if (!profile) return;

        // Artifacts (Steel) grant Ambition and Combat bonuses
        const steelCount = house.ancestralProvenance.steel.length;
        if (steelCount > 0) {
            profile.traits.ambition = Math.min(1.0, profile.traits.ambition + (steelCount * 0.05));
            window.EventBus.emit('UI_LOG_DEBUG', `[PROVENANCE] ${leaderId} inherits ${steelCount} ancestral blades.`);
        }

        // Records (Ink) grant Credibility and Knowledge bonuses
        const inkCount = house.ancestralProvenance.ink.length;
        if (inkCount > 0) {
            profile.traits.credibility = Math.min(1.0, profile.traits.credibility + (inkCount * 0.05));
            window.EventBus.emit('UI_LOG_DEBUG', `[PROVENANCE] ${leaderId} inherits ${inkCount} archival scrolls.`);
        }
    }


    /**
     * Transfers power, reputation, and beliefs from one generation to the next.
     * Bible §1: Action -> Legend -> History.
     */
    transferGenerationalLegacy(parentID, childId) {
        if (!window.PersonhoodManager) return;

        const parent = window.PersonhoodManager.getProfile(parentID);
        const child = window.PersonhoodManager.getProfile(childId);

        // 1. ANCESTRY LINK
        child.ancestry.parents.push(parentID);
        parent.ancestry.children.push(childId);

                // 2. BELIEF INHERITANCE WITH DRIFT (Bible §17)
        Object.keys(parent.traits).forEach(t => {
            const drift = (Math.random() * 0.2 - 0.1); // +/- 10% drift
            child.traits[t] = Math.max(0, Math.min(1.0, parent.traits[t] + drift));
        });

        // 2.5 LEGACY INHERITANCE (Bible §BN)
        if (window.LegacyManager) {
            const parentLegacy = window.LegacyManager.activeLegacies.get(parentID);
            if (parentLegacy) {
                const childLegacy = window.LegacyManager.registerEntity(childId, parentLegacy.bloodlineId);
                // Inherit a portion of the parent's story density as "Starting Renown"
                childLegacy.storyDensity = parentLegacy.storyDensity * 0.1;
            }
        }

        // 3. REPUTATION & FEUD INHERITANCE

        parent.relationships.forEach((rel, targetId) => {
            if (rel.type === 'RIVALRY' || rel.type === 'DISTRUST') {
                // Feuds pass down but slightly diluted
                window.PersonhoodManager.setRelationship(childId, targetId, rel.type, rel.weight * 0.7);
            } else if (rel.type === 'LOYALTY' || rel.type === 'FRIENDSHIP') {
                // Alliances pass down
                window.PersonhoodManager.setRelationship(childId, targetId, rel.type, rel.weight * 0.6);
            }
        });

        // 4. SECRET INHERITANCE
        if (window.IntelManager) {
            const inheritedIntel = window.IntelManager.getIntelForNode(parentID);
            inheritedIntel.forEach(intel => {
                window.IntelManager.grantOwnership(intel.intel_id, childId);
            });
        }
    }

        recordFeudEvent(houseA, houseB, reason, triggerIntelId = null) {
        let feud = this.feuds.find(f => 
            (f.houseA === houseA && f.houseB === houseB) || 
            (f.houseA === houseB && f.houseB === houseA)
        );

        if (!feud) {
            feud = { houseA, houseB, reason, intensity: 1, startDate: window.EngineParams?.worldDay || 0 };
            this.feuds.push(feud);
            window.EventBus.emit('UI_LOG', `[FEUD] A blood-feud has begun between ${houseA} and ${houseB}!`);
        } else {
            feud.intensity += 1;
            feud.reason = reason;
        }

        window.EventBus.emit('FEUD_INTENSIFIED', { houseA, houseB, intensity: feud.intensity, triggerIntelId });
    }

        /**
         * THE RARE PART (Node 3: Institution)
         * Receives a report from an individual member.
         */
        submitReport(houseId, reporterId, intelId) {
            const house = this.houses.get(houseId);
            const profile = window.PersonhoodManager?.getProfile(reporterId);
            const intel = window.IntelManager?.lookup(intelId);
        
            if (!house || !profile || !intel) return;

            // --- SOCIAL TRUST NETWORKS: REPUTATION WEIGHT (Node 2 & 6) ---
            // A report from a highly trusted/respected member is institutionalized faster
            let reputationBonus = 1.0;
            if (reporterId === 'player_node' || reporterId === 'player') {
                 reputationBonus = 0.5 + (profile.traits.credibility * 1.5);
            } else {
                 // NPC reports also gain bonuses from their standing
                 reputationBonus = 0.8 + (profile.traits.credibility * 0.5);
            }

            // --- REPORT IMPACT PREDICTION (Node 3) ---
            const weightLabel = reportWeight > 0.8 ? 'MAJOR' : reportWeight > 0.5 ? 'HIGH' : reportWeight > 0.3 ? 'MODERATE' : 'LOW';
            intel.significance.institutionalWeight = weightLabel;

            // Credibility Filter (Node 2)

            const reportWeight = profile.traits.credibility * intel.certainty * reputationBonus;

        if (reportWeight < 0.3) {
            window.EventBus.emit('UI_LOG_DEBUG', `[DYNASTY] ${house.name} dismissed weak report from ${reporterId}.`);
            return;
        }

        if (!house.reportBuffer.has(intelId)) {
            house.reportBuffer.set(intelId, {
                reports: [],
                aggregateCertainty: 0,
                status: 'UNVERIFIED'
            });
        }

        const buffer = house.reportBuffer.get(intelId);
        buffer.reports.push({ reporterId, credibility: profile.traits.credibility, timestamp: Date.now() });
        buffer.aggregateCertainty = Math.min(1.0, buffer.aggregateCertainty + (reportWeight * 0.4));

        window.EventBus.emit('UI_LOG_DEBUG', `[DYNASTY] ${house.name} received report on ${intel.payload.title}. Certainty: ${buffer.aggregateCertainty.toFixed(2)}`);

                // If certainty passes the Institutional Threshold, it becomes Institutional Knowledge
                if (buffer.aggregateCertainty > 0.7 && buffer.status === 'UNVERIFIED') {
                    this.institutionalizeIntel(houseId, intelId);
                    this.updateInstitutionalBeliefs(houseId, intelId);
                }
    }


    /**
     * Node 1: TRUTH, RUMOR, FABRICATION, MYTH, HISTORY
     */
        categorizeNarrative(intelId) {
        const intel = window.IntelManager?.lookup(intelId);
        if (!intel) return 'UNKNOWN';

        const tags = intel.payload?.tags || [];
        const isMyth = tags.includes('FOLKLORE') || tags.includes('POEM_TRAP');
        const isFabrication = intel.truth_state === 'FALSE' && (intel.certainty > 0.8 || tags.includes('FABRICATION'));
        const isHistory = intel.historical_status === 'HISTORICAL' || tags.includes('CHRONICLE');
        
        if (isMyth) return 'MYTH';
        if (isFabrication) return 'FABRICATION';
        if (isHistory && intel.truth_state === 'TRUE') return 'HISTORY';
        if (intel.type === 'FACT' && intel.truth_state === 'TRUE') return 'TRUTH';
        return 'RUMOR';
    }


                /**
     * Node 3 -> 4: Institution -> Action
     * Once the institution "believes" the info, it commits to a world-state change.
     */
    institutionalizeIntel(houseId, intelId) {
                const house = this.houses.get(houseId);
                const intel = window.IntelManager.lookup(intelId);
                if (!house || !intel) return;

                const buffer = house.reportBuffer.get(intelId);
                buffer.status = 'OFFICIAL';
        
                // Add to permanent archives
                house.archives.push(intelId);
                window.IntelManager.shareToInstitution(intelId, houseId);

                window.EventBus.emit('UI_LOG', `[INSTITUTION] ${house.name} has officially recognized: ${intel.payload.title}`);
        
                // --- HCB LINK: Institutional Capture ---
                window.EventBus.emit('INTEL_INSTITUTIONALIZED', { houseId, intelId, category: this.categorizeNarrative(intelId) });

                // TRIGGER ACTION (Node 4)
                this.determineInstitutionalAction(houseId, intel);
    }


            /**
     * Node 4 & 6: Internal Conflict & Objective Competition
     */
    determineInstitutionalAction(houseId, intel) {
        const house = this.houses.get(houseId);
        if (!house || !window.VillageManager) return;
        
        // CONFLICT MULTIPLIER (Node 4)
        // High conflict reduces unified action certainty and creates hesitation
        const conflictMod = 1.0 - (house.internalConflictLevel * 0.7);

        // Competing Objectives (Node 6)
        if (house.factions.size > 0 && house.internalConflictLevel > 0.4) {
            this.generateFactionalObjectives(house, intel);
            
            // Unified action is suppressed by conflict
            if (Math.random() > conflictMod) {
                window.EventBus.emit('UI_LOG_DEBUG', `[ACTION] ${house.name}'s official response is blocked by factional gridlock.`);
                return;
            }
        }

        // --- BEHAVIORAL EFFECTS: HESITATION & DOUBT (Node 4) ---

            // Bible §36: Knowledge does not create action. Belief creates action.
            const totalDoubt = Array.from(house.beliefs.values()).reduce((sum, b) => sum + b.doubtPressure, 0) / house.beliefs.size;
        
            // High doubt causes hesitation: 50% chance to skip action if doubt > 0.5
            if (totalDoubt > 0.5 && Math.random() < 0.5) {
                window.EventBus.emit('UI_LOG_DEBUG', `[ACTION] ${house.name} hesitates due to internal discord.`);
                return;
            }

            const houseVillages = window.VillageManager.villages.filter(v => v.nobleHouse === house.name);

            // Logic: What does the House DO with this information?
            // 1. If it's a WARNING about a monster -> Fortify/Mobilize
            if (intel.type === 'WARNING' || intel.payload.tags.includes('THREAT')) {
                // Action Certainty check
                const certaintyModifier = 1.0 - (totalDoubt * 0.5);
                if (Math.random() > certaintyModifier) {
                     window.EventBus.emit('UI_LOG', `[ACTION] ${house.name} issuing mobilization, but response is disorganized.`);
                } else {
                     window.EventBus.emit('UI_LOG', `[ACTION] ${house.name} issues Mobilization Decree!`);
                }
            
                houseVillages.forEach(v => {
                    // Institutional Action: Fortify the village
                    const fortificationStrength = 20 * certaintyModifier;
                    v.barrierIntegrity = Math.min(100, v.barrierIntegrity + fortificationStrength);
                    v.memoryProfile.caution = Math.min(1.0, v.memoryProfile.caution + (0.2 * certaintyModifier));
                
                    // Create a Defense Bounty
                    if (window.VillageManager.generateObjective) {
                        window.VillageManager.generateObjective(v, 'SUPPRESSION', intel.payload.title);
                    }
                });
            }


                // 2. If it's a SCANDAL about a rival house -> Feud/Leverage
        if (intel.payload.tags.includes('SCANDAL')) {
            const rivalHouse = intel.provenance[0]?.source_faction;
            if (rivalHouse && rivalHouse !== houseId) {
                window.EventBus.emit('UI_LOG', `[ACTION] ${house.name} uses secret intel to leverage ${rivalHouse}!`);
                this.recordFeudEvent(houseId, rivalHouse, 'POLITICAL_SCANDAL', intel.intel_id);
                this.applyLeverage(rivalHouse, intel.intel_id, 'TAXATION');
            }
        }

        // 3. If it's ECONOMIC/Blessed Spot -> Monopoly Claim
        if (intel.significance.economic > 70) {
            window.EventBus.emit('UI_LOG', `[ACTION] ${house.name} petitioning for Royal Monopoly on local resources.`);
            this.setBlessedStatus(houseId, true);
        }
    }


        /**
     * Node 6: Competing Objectives
     * Factions issue their own decrees when the central authority is weak.
     */
    generateFactionalObjectives(house, intel) {
        const reformist = house.factions.get('reformist');
        const traditionalist = house.factions.get('traditionalist');
        
        // Traditionalists: Defend Doctrine / Suppress News
        if (traditionalist && traditionalist.influence > 0.3) {
            window.EventBus.emit('UI_LOG_DEBUG', `[FACTION] ${house.name} Traditionalists are attempting to suppress reports of ${intel.payload.title}.`);
            // Internal policy resistance: potentially revoke ownership of intel from low-prestige members
        }

        // Reformists: Launch Investigation
        if (reformist && reformist.influence > 0.3) {
            const villages = window.VillageManager.villages.filter(v => v.nobleHouse === house.name);
            if (villages.length > 0) {
                const targetVillage = villages[0];
                window.EventBus.emit('UI_LOG', `[FACTION] ${house.name} Reformists fund independent survey of ${intel.payload.title}.`);
                
                // Create a competing objective/bounty
                if (window.VillageManager.generateObjective) {
                    window.VillageManager.generateObjective(targetVillage, 'INVESTIGATION', intel.intel_id);
                }
            }
        }
    }

        /**
     * Node 3: Faction Strength & Influence
     */
    updateFactionInfluence(house, intel) {
        const reformist = house.factions.get('reformist');
        const traditionalist = house.factions.get('traditionalist');
        const radical = house.factions.get('radical');
        
        if (!reformist || !traditionalist || !radical) return;

        // Contradictory intel empowers Reformists/Radicals
        const contradictions = Array.from(house.beliefs.keys()).filter(k => this.getIntelBeliefRelationship(intel, k) === 'CONTRADICT');
        
        if (contradictions.length > 0) {
            const shift = 0.05 * intel.certainty;
            reformist.influence = Math.min(0.9, reformist.influence + shift);
            radical.influence = Math.min(0.5, radical.influence + (shift * 0.5));
            traditionalist.influence = Math.max(0.1, traditionalist.influence - (shift * 1.5));
            
            house.internalConflictLevel = Math.min(1.0, house.internalConflictLevel + 0.1);
        } else {
            // Reinforcing intel empowers Traditionalists
            const reinforcements = Array.from(house.beliefs.keys()).filter(k => this.getIntelBeliefRelationship(intel, k) === 'REINFORCE');
            if (reinforcements.length > 0) {
                const shift = 0.03 * intel.certainty;
                traditionalist.influence = Math.min(1.0, traditionalist.influence + shift);
                reformist.influence = Math.max(0.0, reformist.influence - (shift * 0.5));
                radical.influence = Math.max(0.0, radical.influence - (shift * 0.8));
                house.internalConflictLevel = Math.max(0.0, house.internalConflictLevel - 0.05);
            }
        }

        // SCHISM RESOLUTION CHECK (Phase 4)
                if (house.activeSchism) {
            if (reformist.influence > 0.6) this.resolveSchism(house, 'reformist');
            else if (traditionalist.influence > 0.7 && house.internalConflictLevel < 0.3) this.resolveSchism(house, 'traditionalist');
            else if (radical.influence > 0.4 && house.internalConflictLevel > 0.9) this.resolveSchism(house, 'radical');
        }

        // --- MANIFESTATION TRIGGER: HERALDS OF THE SEED ---
        this.updateInstitutionalHeralds(house, intel);

        // Extreme conflict triggers Belief Civil War
        if (house.internalConflictLevel > 0.8 && !house.activeSchism) {
            this.triggerInstitutionalCrisis(house);
        }
    }

        resolveSchism(house, winnerId) {
            const schism = house.activeSchism;
            const winner = house.factions.get(winnerId);
            if (!schism || !winner) return;

            window.EventBus.emit('UI_LOG', `[SCHISM RESOLVED] The fracture within ${house.name} has ended. The ${winnerId.toUpperCase()} faction is victorious.`);
        
            // --- STEP 6-4: RE-ANCHORING ---
            let doctrineShift = "";
            switch(winnerId) {
                case 'reformist':
                    doctrineShift = this.applyReformVictory(house);
                    break;
                case 'traditionalist':
                    doctrineShift = this.applyTraditionalistVictory(house);
                    break;
                case 'radical':
                    doctrineShift = this.applyRadicalVictory(house);
                    break;
            }

            // 1. Update Identity & Reset Discord
            this.applyIdentityShift(house, winnerId);
            house.internalConflictLevel = 0.1;
            house.exposureAnxiety = 0.2;
            house.activeSchism = null;

            // 2. Player Impact
            if (winnerId !== 'traditionalist') {
                this.playerFootprint.reformsCatalyzed++;
                this.playerFootprint.institutional += 25;
                this.recordCausalLink("Institutional Influence", `Resolved Schism in ${house.name} (${winnerId} victory)`, 150);
            }

            // 3. Clear Losers (Institutional Purge)
            house.factions.clear();

            // 4. Record to Institutional Memory
            this.recordHouseEvent(house.id, {
                type: 'SCHISM_RESOLUTION',
                detail: `Winner: ${winnerId.toUpperCase()}. Effect: ${doctrineShift}`,
                significance: 150,
                historicalWeight: 100
            });

            window.EventBus.emit('HOUSE_STATE_CHANGED', { houseId: house.id, event: 'SCHISM_RESOLVED', winner: winnerId });
        }


    applyReformVictory(house) {
        // Update beliefs based on accumulated contradictions
        let updatedCount = 0;
        house.beliefs.forEach((belief, key) => {
            if (belief.state === 'DOUBTED' || belief.state === 'PRIVATE_DOUBT') {
                belief.state = 'ESTABLISHED';
                belief.confidence = 0.5; // New doctrine starts with cautious confidence
                belief.doubtPressure = 0.1;
                belief.officialPosition = `Doctrine updated to reflect observed evidence for ${key}.`;
                updatedCount++;
            }
        });
        return `${updatedCount} dogmas have been reformed.`;
    }

    applyTraditionalistVictory(house) {
        house.beliefs.forEach((belief) => {
            belief.state = 'DOGMA';
            belief.confidence = Math.min(1.0, belief.confidence + 0.3);
            belief.doubtPressure = 0.0;
            belief.officialPosition = belief.description; // Revert to original
        });
        return "Traditional dogma has been forcefully re-established.";
    }

    applyRadicalVictory(house) {
        house.beliefs.forEach((belief, key) => {
            belief.state = 'SHATTERED';
            belief.confidence = 0.1;
            belief.officialPosition = "ALL OLD DOGMA IS VOID.";
        });
        // Create major institutional chaos objective
        return "The institutional foundation has been dismantled.";
    }

        /**
     * Node 2: Identity Pressure
     * Shifts the core "who we are" of the House based on which ideology won the Schism.
     */
    applyIdentityShift(house, winnerId) {
        const day = window.EngineParams?.worldDay || 0;
        
        const shift = {
            winnerId,
            day,
            previousMission: house.currentIdentity.mission
        };

        // Update Identity based on ideology
        if (winnerId === 'reformist') {
            house.currentIdentity.mission = 'ADAPT_AND_SURVIVE';
            house.currentIdentity.priorities.push('EVIDENCE');
            house.currentIdentity.fear = 'OBSOLESCENCE';
        } else if (winnerId === 'radical') {
            house.currentIdentity.mission = 'OVERTURN_THE_OLD';
            house.currentIdentity.priorities = ['TRUTH', 'DESTRUCTION'];
            house.currentIdentity.fear = 'COMPROMISE';
        } else if (winnerId === 'traditionalist') {
            // Traditionalist victories reduce drift and reinforce founding mission
            house.currentIdentity.mission = house.foundingIdentity.mission;
            house.identityDrift = Math.max(0, house.identityDrift - 0.1);
        }

        // Increment Identity Drift (Node 4)
        if (winnerId !== 'traditionalist') {
            house.identityDrift += 0.15;
        }

        house.reformHistory.push(shift);
        
        window.EventBus.emit('UI_LOG', `[EVOLUTION] ${house.name}'s institutional identity has drifted. New Mission: ${house.currentIdentity.mission}.`);
    }

    /**
     * Node 5: Belief Civil War
     */

            triggerInstitutionalCrisis(house) {
        house.activeSchism = {
            id: `schism_${Date.now()}`,
            type: 'DOCTRINAL_CIVIL_WAR',
            startDay: window.EngineParams?.worldDay || 0,
            duration: 0
        };

        // Initialize Factions (Traditionalist, Reformist, Radical)
        this.initializeSchismFactions(house);

        window.EventBus.emit('UI_LOG', `[CRISIS] ${house.name.toUpperCase()} HAS ENTERED A STATE OF SCHISM! Internal conflict is paralyzing policy.`);
        
        // Immediate Recruitment
        this.recruitMembersToFactions(house);

        // Update Player Footprint
        this.playerFootprint.schismsTriggered++;
        this.playerFootprint.institutional += 15;
        this.playerFootprint.institutionsInfluenced.add(house.id);
    
        window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: `🚨 INSTITUTIONAL SCHISM: ${house.name}`, pos: { x: 0, y: 30, z: 0 }, color: '#ef4444' });

        this.recordHouseEvent(house.id, {
            type: 'SCHISM_START',
            detail: `A deep doctrinal divide has fractured the leadership of ${house.name}.`,
            significance: 100,
            historicalWeight: 50
        });
    }

    initializeSchismFactions(house) {
        house.factions.set('traditionalist', { 
            id: 'traditionalist', 
            name: 'The Old Guard', 
            influence: 0.5, 
            members: new Set(),
            doctrine: 'Preserve Founding Dogma' 
        });
        house.factions.set('reformist', { 
            id: 'reformist', 
            name: 'The New Dawn', 
            influence: 0.2, 
            members: new Set(),
            doctrine: 'Adapt to Observed Reality' 
        });
        house.factions.set('radical', { 
            id: 'radical', 
            name: 'The Shattered Crown', 
            influence: 0.05, 
            members: new Set(),
            doctrine: 'Dismantle the Institution' 
        });
    }

    recruitMembersToFactions(house) {
        if (!window.PersonhoodManager) return;
        
        // Find all NPCs belonging to this house
        const houseMembers = Array.from(window.PersonhoodManager.profiles.values())
            .filter(p => p.houseId === house.id);

        houseMembers.forEach(profile => {
            const side = this.evaluateFactionChoice(profile);
            const faction = house.factions.get(side);
            if (faction) {
                faction.members.add(profile.id);
            }
        });

        this.updateFactionPower(house);
    }

    evaluateFactionChoice(profile) {
        const t = profile.traits;
        // Traditionalist if: Loyalty is high or Ambition is low
        if (t.loyalty > 0.7 || t.ambition < 0.3) return 'traditionalist';
        // Radical if: Ambition is high and Loyalty is low
        if (t.ambition > 0.8 && t.loyalty < 0.4) return 'radical';
        // Reformist if: Intellectual/Skeptical traits predominate (using Archetype as proxy)
        if (profile.identity === 'SKEPTIC' || profile.identity === 'SCHOLAR') return 'reformist';
        
        return 'traditionalist'; // Default to tradition
    }

    updateFactionPower(house) {
        if (!house.activeSchism) return;

        let totalWeight = 0;
        house.factions.forEach(faction => {
            let factionWeight = 0;
            faction.members.forEach(memberId => {
                const profile = window.PersonhoodManager?.getProfile(memberId);
                // Weight = Significance + Seniority
                const weight = (profile?.traits?.credibility || 0.5) * 50 + (profile?.age || 20) / 10;
                factionWeight += weight;
            });
            faction.rawWeight = factionWeight;
            totalWeight += factionWeight;
        });

        // Normalize influence
        house.factions.forEach(faction => {
            faction.influence = totalWeight > 0 ? (faction.rawWeight / totalWeight) : 0;
        });

        // Resolution Check
        const reformist = house.factions.get('reformist');
        const traditionalist = house.factions.get('traditionalist');
        const radical = house.factions.get('radical');

        if (reformist.influence > 0.6) this.resolveSchism(house, 'reformist');
        else if (traditionalist.influence > 0.7 && house.internalConflictLevel < 0.3) this.resolveSchism(house, 'traditionalist');
        else if (radical.influence > 0.5) this.resolveSchism(house, 'radical');
    }


    /**
     * Manifestation Rule: Heralds of the Seed.
     * Naturally emerging NPCs who prioritize preservation.
     */
    updateInstitutionalHeralds(house, intel) {
        if (house.archives.length > 10 && Math.random() < 0.05) {
            // Find a village member and promote them to Archivist/Herald
            const villages = window.VillageManager?.villages.filter(v => v.nobleHouse === house.name);
            if (villages && villages.length > 0) {
                const village = villages[0];
                window.EventBus.emit('UI_LOG', `[CONTINUITY] ${village.name} has appointed a new Master Archivist.`);
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: "📜 New Herald of the Seed Appointed", pos: { x: village.x, y: 10, z: village.z }, color: '#3b82f6' });
            }
        }
    }



                        processNarrative(narrative) {
                            // Record official history into house archives
                            const house = this.houses.get(narrative.bias);
                            if (house) {
                                house.archives.push(narrative.id);
                            }

                            // --- STEP 6-1: TRUTH EXPOSURE CHECK ---
                            // Every house checks if this public history exposes their private doubts
                            this.houses.forEach(h => {
                                this.checkExposure(h, narrative.truthId);
                            });

                            // --- THE FOUNDERS' BETRAYAL CHECK (Plan A) ---
// ... existing betrayal check ...

                // If a Tier 9 Truth (The Betrayal) is published, all Noble Houses lose 50% Legitimacy
                const truth = window.IntelManager?.lookup(narrative.truthId);
                if (truth && (truth.tier >= 9 || truth.payload?.tags?.includes('BETRAYAL'))) {
                    this.triggerBetrayalCollapse();
                }
            }


            /**
             * Massive legitimacy loss across all institutions.
             * Bible §14: The Truth is a weapon that destroys legitimacy.
             */
            triggerBetrayalCollapse() {
                window.EventBus.emit('UI_LOG', '⚠️ [CRISIS] THE FOUNDERS\' BETRAYAL HAS BEEN EXPOSED!');
                window.EventBus.emit('UI_LOG', 'The legitimacy of the Noble Houses is crumbling.');

                this.houses.forEach(house => {
                    house.legitimacy *= 0.5;
                    house.publicTrust *= 0.3;
                    house.internalConflictLevel = Math.min(1.0, house.internalConflictLevel + 0.4);
            
                    if (house.legitimacy < 0.3) {
                        this.triggerInstitutionalCrisis(house);
                    }
                });
            }


    /**

     * Defines what each house actively seeks in the information market.
     */
        /**
     * Institutional Fear Matrix.
     * Bible §36: Every institution is defined by what it fears.
     */
    getInitialHouseFears(houseKey) {
        // Default for Noble Houses
        const fears = {
            primary: 'REPLACEMENT',
            secondary: 'RESOURCE_LOSS',
            acceptableLoss: 'TRUTH',
            unacceptableLoss: 'CONTINUITY'
        };

        if (houseKey === 'aethel' || houseKey === 'capital') {
            fears.primary = 'LEGITIMACY_COLLAPSE';
            fears.secondary = 'POLITICAL_DISSENT';
            fears.acceptableLoss = 'HISTORICAL_ACCURACY';
            fears.unacceptableLoss = 'FUEL_AUTHORITY';
        } else if (houseKey === 'terminus') {
            fears.primary = 'PATTERN_FAILURE';
            fears.secondary = 'ISOLATION';
            fears.acceptableLoss = 'POLITICAL_INFLUENCE';
            fears.unacceptableLoss = 'OBSERVATIONAL_INTEGRITY';
        } else if (houseKey === 'epitaph') {
            fears.primary = 'SIGNIFICANCE_ESCALATION';
            fears.secondary = 'EXPOSURE';
            fears.acceptableLoss = 'POLITICAL_CONTROL';
            fears.unacceptableLoss = 'SECOND_FRACTURE';
        }

        return fears;
    }

    getInitialDemandProfile(houseKey) {

        const profiles = {
            'aethel': { 'MONOPOLY': 5.0, 'SOVEREIGNTY': 10.0, 'SUCCESSION': 3.0 },
            'terminus': { 'LONGITUDINAL': 8.0, 'GEOGRAPHY': 4.0, 'STAR_CHART': 6.0 },
            'shadowfen': { 'REFINEMENT': 7.0, 'REAGENT': 5.0, 'SYNTHESIS': 6.0 },
            'gloom': { 'REFRACTION': 6.0, 'GLASS': 4.0 },
            'oakheart': { 'IRONWOOD': 5.0, 'GATHERING': 3.0 },
            'crow': { 'SCANDAL': 6.0, 'SECRET': 5.0, 'LEVERAGE': 7.0 }
        };

        return profiles[houseKey] || { 'COMMON': 1.0, 'RUMOR': 1.1 };
    }

        /**
         * Updates the global state of a House based on simulation feedback.
         * Bible §Continuity: Institutions are dams against entropy.
         */
        updateInstitutionalState(houseId) {
            const house = this.houses.get(houseId);
            if (!house) return;

            const day = window.EngineParams?.worldDay || 0;

            // --- DIVERGENCE TRACKING (Ideology Shift) ---
            if (house.beliefs.size > 0 && Math.random() < 0.05) {
                // Randomly mutate a belief's privateConcern slightly to simulate drift
                const keys = Array.from(house.beliefs.keys());
                const randomBelief = house.beliefs.get(keys[Math.floor(Math.random() * keys.length)]);
                if (randomBelief && randomBelief.state !== 'DOGMA') {
                    randomBelief.confidence = Math.max(0, Math.min(1.0, randomBelief.confidence + (Math.random() * 0.1 - 0.05)));
                }
            }

            // 1. Calculate Narrative Gap

            // Measures the volume of contradictions held in archives
            const totalBeliefs = house.beliefs.size || 1;
            const contradictions = Array.from(house.beliefs.values()).filter(b => b.state === 'DOUBTED' || b.state === 'SHATTERED').length;
            house.narrativeGap = contradictions / totalBeliefs;

            // 2. Calculate Public Doubt (Regional Truth Fidelity)
            // Sampling villages under this house's control
            let avgRegionalFidelity = 1.0;
            const villages = window.VillageManager?.villages.filter(v => v.nobleHouse === house.name) || [];
            if (villages.length > 0) {
                const sumFidelity = villages.reduce((acc, v) => acc + (v.stats?.truthFidelity || 1.0), 0);
                avgRegionalFidelity = sumFidelity / villages.length;
            }
            const publicDoubt = 1.0 - avgRegionalFidelity;

            // 3. Calculate Exposure Anxiety (Phase 2B)
            // Formula: Ae = (Narrative Gap * 0.6) + (Public Doubt * 0.4)
            const targetAnxiety = (house.narrativeGap * 0.6) + (publicDoubt * 0.4);
            house.exposureAnxiety = (house.exposureAnxiety * 0.7) + (targetAnxiety * 0.3); // Smooth transition

            // 4. Institutional Response
            if (house.exposureAnxiety > 0.6) {
                this.handleAnxiousDecision(house);
            }

            // 5. Internal Friction (Internal Conflict Level)
            const frictionBase = (house.exposureAnxiety * 0.6) + ((1.0 - house.legitimacy) * 0.4);
            house.internalConflictLevel = (house.internalConflictLevel * 0.8) + (frictionBase * 0.2);

            // 6. Legitimacy & Trust Decay
            if (house.exposureAnxiety > 0.8) {
                house.legitimacy = Math.max(0.1, house.legitimacy - 0.01);
                house.publicTrust = Math.max(0.1, house.publicTrust - 0.02);
            }

            // 7. Crisis Trigger
            if (house.internalConflictLevel > 0.8 && !house.activeSchism) {
                this.triggerInstitutionalCrisis(house);
            }
        }

        handleAnxiousDecision(house) {
            // Decision Matrix: Suppression vs. Sponsorship
            
            // SUPPRESSION: If legitimacy is low, use force to purge knowledge
            if (house.legitimacy < 0.4 || house.exposureAnxiety > 0.8) {
                this.executeInstitutionalSuppression(house);
            } 
            // SPONSORSHIP: If legitimacy is high, use propaganda/verse
            else {
                this.executeInstitutionalSponsorship(house);
            }
        }

        executeInstitutionalSuppression(house) {
            window.EventBus.emit('UI_LOG', `[ANXIETY] ${house.name} has issued an Edict of Silence. Contradictory reports are being suppressed.`);
        
            // --- GCAB TELEMETRY ---
            window.EventBus.emit('CIV_RESPONSE_EXECUTED', {
                responseType: 'SUPPRESSION',
                entityId: house.id,
                actorId: house.id,
                cost: house.prestige
            });
            
            // Physical Suppression: Revoke ownership of "Doubted" intel from NPCs in its territory
            const doubtedIntelIds = [];
            house.beliefs.forEach((belief) => {
                if (belief.state === 'DOUBTED' || belief.state === 'PRIVATE_DOUBT') {
                    doubtedIntelIds.push(...belief.evidenceSources);
                }
            });

            if (doubtedIntelIds.length > 0 && window.VillageManager) {
                const villages = window.VillageManager.villages.filter(v => v.nobleHouse === house.name);
                villages.forEach(v => {
                    // This is "Informational Warfare" - cleaning the registry of the village hub
                    doubtedIntelIds.forEach(id => {
                        window.IntelManager?.revokeOwnership(id, v.id);
                        // Also penalty to village caution
                        v.memoryProfile.caution = Math.max(0.1, v.memoryProfile.caution - 0.05);
                    });
                });
            }

            house.suppressionBurden = Math.min(1.0, house.suppressionBurden + 0.1);
            house.prestige = Math.max(0, house.prestige - 5);
        }

        executeInstitutionalSponsorship(house) {
            window.EventBus.emit('UI_LOG_DEBUG', `[ANXIETY] ${house.name} is sponsoring new Verse to stabilize its narrative.`);
            
            // Commission stabilizing folklore
            if (window.FolkloreEngine) {
                const stableVerse = {
                    id: house.id, // For context
                    title: `The Glory of ${house.name}`,
                    type: 'LEGITIMIZATION',
                    power: house.prestige
                };
                window.FolkloreEngine.generatePoem(stableVerse);
                house.verseInfluence = Math.min(1.0, house.verseInfluence + 0.05);
            }
            
            house.prestige = Math.max(0, house.prestige - 2);
        }




        getFeuds() {
        return this.feuds;
    }

    /**
     * Updates the Blessed status of a House (Bible §19).
     */
    setBlessedStatus(houseId, isBlessed) {
        const house = this.houses.get(houseId);
        if (!house || house.isBlessed === isBlessed) return;

        house.isBlessed = isBlessed;
        
        const eventType = isBlessed ? 'MONOPOLY_ASCENSION' : 'MONOPOLY_REVOCATION';
        const detail = isBlessed ? 
            `${house.name} has been granted a Blessed Spot by Royal Decree.` : 
            `${house.name} has lost its Blessed status. The monopoly is revoked.`;

        const event = {
            actorId: houseId,
            type: eventType,
            detail: detail,
            significance: 150,
            historicalWeight: 100
        };

        window.ChronicleManager?.recordEvent(event);
        this.recordHouseEvent(houseId, event);
        
        window.EventBus.emit('UI_LOG', `[ROYAL DECREE] ${detail}`);
        window.EventBus.emit('MONOPOLY_UPDATED', { houseId, isBlessed });
    }
}


window.DynastyManager = new DynastyManagerSystem();
export default window.DynastyManager;
