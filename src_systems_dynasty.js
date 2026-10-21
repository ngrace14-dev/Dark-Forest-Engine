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
                legitimacy: 0.5, // --- CREDIBILITY PILLAR: Institutional legitimacy (0.0 - 1.0) ---
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

        // If the leader died, trigger succession
        if (house.currentLeader === entity.id) {
            this.triggerSuccession(house);
        }

        // If killed by a member of another house, start/intensify a feud
        if (entity.lastAttacker?.houseId && entity.lastAttacker.houseId !== entity.houseId) {
            this.recordFeudEvent(entity.houseId, entity.lastAttacker.houseId, 'BLOODSHED');
        }
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

        // Credibility Filter (Node 2)
        // Only reports from credible sources or highly certain intel are buffered
        const reportWeight = profile.traits.credibility * intel.certainty;
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

    getHouse(id) {
        return this.houses.get(id);
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
