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
                
                                // --- PHASE 1A: INSTITUTIONAL STATS ---
                                legitimacy: (name === 'Terminus') ? 0.9 : 0.6,
                                historicalContinuity: (name === 'Terminus') ? 18000 : 12000,
                                informationalScarcity: (name === 'Terminus') ? 50 : 20,
                                publicTrust: (name === 'Terminus') ? 0.8 : 0.5,
                                verseInfluence: 0.3,
                                archiveIntegrity: 0.9,
                                truthExposureRisk: 0.1,
                                continuityIndex: (name === 'Terminus') ? 0.8 : 0.4,
                                sovereignty: (name === 'Terminus') ? 0.5 : 0.0,
                
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
        
        // Example: The Tree is Continuity (Node 3)
        house.beliefs.set('TREE_CONTINUITY', {
            confidence: 0.8,
            doubtPressure: 0.0,
            evidenceSources: ['TRADITION'],
            originRecordId: 'INIT',
            lastUpdated: day,
            state: 'ESTABLISHED',
            officialPosition: "The World Tree preserves our legacy.",
            privateConcern: "The Roots must be protected.",
            description: "The World Tree is the physical manifestation of our survival."
        });

        // Example: The Mountain Ring is Fixed

        house.beliefs.set('GEOGRAPHY_STABILITY', {
            confidence: 0.9,
            doubtPressure: 0.0,
            evidenceSources: ['TRADITION', 'ARCHIVE'],
            originRecordId: 'INIT',
            lastUpdated: day,
            state: 'DOGMA', // DOGMA, ESTABLISHED, PRIVATE_DOUBT, DOUBTED, SHATTERED
            officialPosition: "The Mountain Ring is eternal.",
            privateConcern: "No immediate concerns.",
            description: "The Mountain Ring is the eternal, unchanging wall of our world."
        });

        // Example: Crown Sovereignty
        const isSkeptical = house.culturalValues.crown === 'SKEPTICAL';
        house.beliefs.set('CROWN_LEGITIMACY', {
            confidence: isSkeptical ? 0.4 : 0.8,
            doubtPressure: isSkeptical ? 0.3 : 0.0,
            evidenceSources: ['ROYAL_DECREE'],
            originRecordId: 'INIT',
            lastUpdated: day,
            state: isSkeptical ? 'DOUBTED' : 'ESTABLISHED',
            officialPosition: "The Aethel line is the rightful ruler.",
            privateConcern: isSkeptical ? "The lineage is fraying." : "Stability is paramount.",
            description: "The Aethel line is the rightful ruler of the Redwood."
        });

        // House-specific Beliefs
        if (house.name.includes('Terminus')) {
            house.beliefs.set('THE_300_INVINCIBLE', {
                confidence: 1.0,
                doubtPressure: 0.0,
                evidenceSources: ['MILITARY_HISTORY'],
                originRecordId: 'INIT',
                lastUpdated: day,
                state: 'DOGMA',
                officialPosition: "The Elite 300 cannot fall.",
                privateConcern: "The Pass is our lifeblood.",
                description: "The Elite 300 cannot fall as long as the pass remains manned."
            });
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

        // BELIEF REINFORCEMENT (Node 3)
        // Check if this intel affects any existing beliefs
        house.beliefs.forEach((belief, key) => {
            const relationship = this.getIntelBeliefRelationship(intel, key);
            
            if (relationship === 'REINFORCE') {
                belief.confidence = Math.min(1.0, belief.confidence + (intel.certainty * 0.05));
                belief.doubtPressure = Math.max(0.0, belief.doubtPressure - (intel.certainty * 0.03));
                belief.lastUpdated = day;
                belief.evidenceSources.push(intelId);
            } else if (relationship === 'CONTRADICT') {
                // DOUBT ACCUMULATION (Node 3.1)
                const doubtIncrease = (intel.certainty * 0.15) / (1.0 + house.legitimacy);
                belief.doubtPressure = Math.min(1.0, belief.doubtPressure + doubtIncrease);
                
                // FALLIBILITY AUDIT: Institutions are slow to change their official minds
                const confidenceErosion = (intel.certainty * 0.05) / (1.0 + house.legitimacy);
                belief.confidence -= confidenceErosion;
                belief.lastUpdated = day;
                belief.evidenceSources.push(intelId);

                // PRIVATE DOUBT STATE (Node 3.2)
                if (belief.doubtPressure > 0.3 && belief.state === 'ESTABLISHED') {
                    belief.state = 'PRIVATE_DOUBT';
                    belief.privateConcern = `Reports of ${intel.payload.title} contradict established dogma.`;
                    window.EventBus.emit('UI_LOG_DEBUG', `[BELIEF] ${house.name} harbors private doubt regarding ${key}.`);
                }
                
                if (belief.doubtPressure > 0.6 && belief.state !== 'DOUBTED') {
                    belief.state = 'DOUBTED';
                    belief.officialPosition = `The status of ${key} is under review.`;
                    window.EventBus.emit('UI_LOG', `[BELIEF] ${house.name} has begun to officially doubt: ${belief.description}`);
                }
                
                if (belief.confidence < 0.1 && belief.state !== 'SHATTERED') {
                    belief.state = 'SHATTERED';
                    belief.officialPosition = "Previous dogmas have been proven false.";
                    window.EventBus.emit('UI_LOG', `[BELIEF] A core belief of ${house.name} has been SHATTERED: ${belief.description}`);
                    this.triggerBeliefShatterAction(house, key);
                }
            }
        });
    }


    getIntelBeliefRelationship(intel, beliefKey) {
        // Logic to determine if intel confirms or challenges a belief
        if (beliefKey === 'GEOGRAPHY_STABILITY' && intel.payload.tags.includes('POST-SHIFT')) return 'CONTRADICT';
        if (beliefKey === 'CROWN_LEGITIMACY' && intel.payload.tags.includes('SCANDAL') && intel.payload.tags.includes('CROWN')) return 'CONTRADICT';
        if (beliefKey === 'THE_300_INVINCIBLE' && intel.payload.tags.includes('THREAT') && intel.significance.historical > 80) return 'CONTRADICT';
        
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
        const oldLeader = house.currentLeader;
        // Simple succession: find highest level member of house or generate new heir
        const newLeaderId = `lord_${house.id.split('_')[1]}_${house.lineage.length + 1}`;
        
        // --- LEGACY TRANSFER PIVOT (Bible §36) ---
        if (oldLeader) {
            this.transferGenerationalLegacy(oldLeader, newLeaderId);
        }

        house.lineage.push(oldLeader);
        house.currentLeader = newLeaderId;

        const event = {
            actorId: house.id,
            type: 'SUCCESSION',
            detail: `${house.name}: Succession from ${oldLeader} to ${newLeaderId}.`,
            significance: 120,
            historicalWeight: 80
        };

        window.ChronicleManager?.recordEvent(event);
        window.EventBus.emit('UI_LOG', `[DYNASTY] ${house.name} has a new leader: ${newLeaderId}`);
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

    recordFeudEvent(houseA, houseB, reason) {
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

        // Feuds influence NPC cognition (Phase 5)
        // This is handled by ReputationManager.isRival() which we will hook into
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
                this.recordFeudEvent(houseId, rivalHouse, 'POLITICAL_SCANDAL');
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

        /**
     * Node 1-4: Faction Victory & Reform (Phase 4)
     */
    resolveSchism(house, winnerId) {
        const schism = house.activeSchism;
        const winner = house.factions.get(winnerId);
        if (!schism || !winner) return;

        window.EventBus.emit('UI_LOG', `[SCHISM RESOLVED] The fracture within ${house.name} has ended. The ${winnerId.toUpperCase()} faction is victorious.`);
        
                // --- PLAYER IMPACT: CATALYZE REFORM (Node 1) ---
        if (winnerId === 'reformist' || winnerId === 'radical') {
            this.playerFootprint.reformsCatalyzed++;
            this.playerFootprint.institutional += 20;
            
            // Link to causal chain if player influenced this house recently
            const lastPlayerAction = this.playerFootprint.causalChains.find(c => c.consequence.includes(house.id));
            this.recordCausalLink(
                lastPlayerAction ? lastPlayerAction.action : "General Influence",
                `Victory of ${winnerId} in ${house.name}`,
                150,
                "Schism Resolution"
            );
        }

        let detail = "";


        switch(winnerId) {
            case 'reformist':
                detail = this.applyReformVictory(house);
                break;
            case 'traditionalist':
                detail = this.applyTraditionalistVictory(house);
                break;
            case 'radical':
                detail = this.applyRadicalVictory(house);
                break;
        }

                // PURGE: Losing factions lose influence
        house.factions.forEach((f, id) => {
            if (id !== winnerId) f.influence *= 0.1;
        });
        winner.influence = 0.9;
        house.internalConflictLevel = 0.1;
        house.activeSchism = null;

        // IDENTITY PRESSURE (Node 2)
        this.applyIdentityShift(house, winnerId);

        // INSTITUTIONAL MEMORY (Node 5/8)

        this.recordHouseEvent(house.id, {
            type: `SCHISM_END_${winnerId.toUpperCase()}`,
            detail: `The ${winnerId} victory has reshaped ${house.name}. ${detail}`,
            significance: 150,
            historicalWeight: 100
        });
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
                startDay: window.EngineParams?.worldDay || 0
            };

            window.EventBus.emit('UI_LOG', `[CRISIS] ${house.name.toUpperCase()} HAS ENTERED A STATE OF SCHISM! Internal conflict is paralyzing policy.`);
            window.EventBus.emit('UI_LOG', `[ACTION] Traditionalists and Reformists are issuing competing decrees.`);
        
            // Update Player Footprint if they caused this
            this.playerFootprint.schismsTriggered++;
            this.playerFootprint.institutional += 15;
            this.playerFootprint.institutionsInfluenced.add(house.id);
        
            // Manifest physical schism signs
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: `🚨 INSTITUTIONAL SCHISM: ${house.name}`, pos: { x: 0, y: 30, z: 0 }, color: '#ef4444' });

        // Record in House Memory (Node 8)
        this.recordHouseEvent(house.id, {
            type: 'SCHISM_START',
            detail: `A deep doctrinal divide has fractured the leadership of ${house.name}.`,
            significance: 100,
            historicalWeight: 50
        });
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

            // 1. Calculate Narrative Gap
            // Measures the volume of contradictions held in archives
            const contradictions = Array.from(house.beliefs.values()).filter(b => b.state === 'DOUBTED' || b.state === 'SHATTERED').length;
            house.narrativeGap = Math.min(1.0, contradictions * 0.15);

            // 2. Calculate Exposure Anxiety (Phase 2B)
            // Spikes if narrative gap is wide and public trust is high (danger of fall)
            const baseAnxiety = (house.narrativeGap * 0.7) + (house.truthExposureRisk * 0.3);
            house.exposureAnxiety = (house.exposureAnxiety * 0.8) + (baseAnxiety * 0.2); // Smooth drift

            // 3. Institutional Action Triggered by Anxiety
            if (house.exposureAnxiety > 0.6) {
                this.handleAnxiousDecision(house);
            }

            // 4. Calculate Internal Friction
            const frictionBase = (house.exposureAnxiety * 0.6) + ((1.0 - house.legitimacy) * 0.4);
            house.internalConflictLevel = Math.max(0.1, Math.min(1.0, frictionBase));

            // 5. Legitimacy Adjustment
            const targetLegitimacy = (house.verseInfluence * 0.5) + (house.publicTrust * 0.5);
            house.legitimacy = (house.legitimacy * 0.9) + (targetLegitimacy * 0.1);

            if (house.internalConflictLevel > 0.8 && !house.activeSchism) {
                this.triggerInstitutionalCrisis(house);
            }
        }

        /**
         * Decision logic for anxious institutions.
         */
        handleAnxiousDecision(house) {
            // High anxiety drives suppression and aggressive sponsorship
            if (house.exposureAnxiety > 0.8) {
                window.EventBus.emit('UI_LOG_DEBUG', `[ANXIETY] ${house.name} is in a state of informational panic. Suppression edicts issued.`);
                house.suppressionBurden += 10.0;
                // logic to block gossip syncs or increase bribe weight
            } else {
                window.EventBus.emit('UI_LOG_DEBUG', `[ANXIETY] ${house.name} is sponsoring new Verse to stabilize its narrative.`);
                house.verseInfluence = Math.min(1.0, house.verseInfluence + 0.05);
            }
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
