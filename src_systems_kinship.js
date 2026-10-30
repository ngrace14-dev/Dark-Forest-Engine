/**
 * File: src_systems_kinship.js
 * Phase: The Relationship & Grief Layer
 * 
 * Pure simulation of attraction, dynastic inheritance, blood feuds, and grief cascades.
 * Operates entirely on data, requiring no physical rendering overhead.
 */

class KinshipSystem {
    constructor() {
        // householdId -> { headId, members: [], wealth: 0, legacySignificance: 0, bloodFeuds: [] }
        // Note: Shares state/logic with HouseholdManager if available
        this.clans = new Map(); 
        
        // npcId -> Map<targetId, { type: 'SPOUSE'|'CHILD'|'PARENT'|'FEUD'|'FRIEND'|'COURTING', value: number }>
        this.socialGraph = new Map();

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.on('ENTITY_DEATH', (data) => this.handleDeathCascade(data));
        window.EventBus.on('ENTITY_DIED', (data) => this.handleDeathCascade(data)); // Handle natural death too
        window.EventBus.on('HEARTBEAT_T30D', () => this.processGenerationalTick()); // Monthly evaluation
        
        window.EventBus.emit('UI_LOG', '[Kinship] Relationship & Grief Layer Engaged');
    }

    // ==========================================
    // 1. THE GENERATIONAL ENGINE (ROMANCE & FAMILY)
    // ==========================================

    processGenerationalTick() {
        const config = window.EngineConfig?.kinship;
        if (!config) return;

        // Iterate through all personhood profiles
        const profiles = window.PersonhoodManager?.profiles;
        if (!profiles) return;

        profiles.forEach(profile => {
            if (profile.isDead) return;

            const relations = this.socialGraph.get(profile.id) || new Map();

            // Evaluates current life stage priorities
            // Using config-driven ages and chances
            if (profile.age >= config.courtship.minAge && profile.age <= config.courtship.maxAge && !this.hasRelation(profile.id, 'SPOUSE')) {
                this.evaluateCourtship(profile, profiles, relations);
            } else if (this.hasRelation(profile.id, 'SPOUSE') && profile.age <= config.procreation.maxAge) {
                this.evaluateProcreation(profile, relations);
            }

            // Emotional Decay/Recovery
            if (profile.statusTags?.GRIEF) {
                profile.griefDuration = (profile.griefDuration || 0) - config.grief.recoveryRate;
                if (profile.griefDuration <= 0) {
                    delete profile.statusTags.GRIEF;
                    // Restore productivity (defensive check)
                    if (profile.career) {
                        profile.career.specializedEfficiency = profile._preGriefEfficiency || 1.0;
                    }
                    window.EventBus.emit('UI_LOG_DEBUG', `[KINSHIP] ${profile.id} has recovered from their grief.`);
                }
            }
        });
    }

    evaluateCourtship(profile, allProfiles, relations) {
        const config = window.EngineConfig.kinship.courtship;
        
        // Find existing courting targets
        let courtingId = null;
        for (let [targetId, data] of relations.entries()) {
            if (data.type === 'COURTING') {
                courtingId = targetId;
                data.value += Math.random() * config.progressionBase; // Courtship progression
                if (data.value > config.marriageThreshold) {
                    this.executeMarriage(profile.id, targetId);
                }
                return; // Currently only courting one person at a time
            }
        }

        // Attraction phase if not courting
        if (Math.random() < config.attractionChance) {
            // OPTIMIZATION: Filter by village first to avoid O(N^2) global scan
            const villageId = profile.property?.homeVillageId;
            const candidates = Array.from(allProfiles.values()).filter(p => 
                p.property?.homeVillageId === villageId &&
                p.id !== profile.id && 
                p.age >= config.minAge && 
                p.age <= config.maxAge &&
                !this.hasRelation(p.id, 'SPOUSE') &&
                !this.hasRelation(p.id, 'COURTING')
            );

            if (candidates.length > 0) {
                const partner = candidates[Math.floor(Math.random() * candidates.length)];
                this.addRelation(profile.id, partner.id, 'COURTING', 10);
                window.EventBus.emit('UI_LOG_DEBUG', `[KINSHIP] Attraction formed between ${profile.id} and ${partner.id} in village ${villageId}.`);
            }
        }
    }

    executeMarriage(npcA_id, npcB_id) {
        this.addRelation(npcA_id, npcB_id, 'SPOUSE', 100);
        
        // Merge into a single Household Alliance if HouseholdManager exists
        if (window.HouseholdManager) {
            const houseA = this.getHouseholdOf(npcA_id);
            const houseB = this.getHouseholdOf(npcB_id);

            if (houseA && houseB && houseA.id !== houseB.id) {
                // Transfer wealth and significance
                houseA.assets.wealth += houseB.assets.wealth;
                houseA.members.push(...houseB.members);
                
                // Update profile houseId for all members of the absorbed house
                houseB.members.forEach(memberId => {
                    const p = window.PersonhoodManager?.profiles.get(memberId);
                    if (p) p.houseId = houseA.id;
                });

                // Dissolve House B into House A
                window.HouseholdManager.households.delete(houseB.id);
                
                window.EventBus.emit('UI_LOG', `💍 [ALLIANCE] A marriage has unified two households. Combined wealth: ${houseA.assets.wealth}.`);
            }
        }
    }

    evaluateProcreation(profile, relations) {
        const config = window.EngineConfig.kinship.procreation;
        if (Math.random() < config.birthChance) {
            const spouseId = Array.from(relations.entries()).find(([id, data]) => data.type === 'SPOUSE')?.[0];
            if (!spouseId) return;

            const childId = `npc_child_${profile.id}_${Date.now()}`;
            const childProfile = window.PersonhoodManager.getProfile(childId);
            const spouseProfile = window.PersonhoodManager.profiles.get(spouseId);
            
            childProfile.age = 0;
            childProfile.lifeStage = 'YOUTH';
            childProfile.property.homeVillageId = profile.property?.homeVillageId;
            
            // --- TRAIT INHERITANCE (Gaussian Mix) ---
            if (spouseProfile && window.PersonhoodManager._gaussianRandom) {
                Object.keys(childProfile.traits).forEach(trait => {
                    if (trait === 'credibility') return;
                    const parentAvg = (profile.traits[trait] + spouseProfile.traits[trait]) / 2;
                    const noise = window.PersonhoodManager._gaussianRandom(0, 0.05);
                    childProfile.traits[trait] = Math.max(0, Math.min(1, parentAvg + noise));
                });
            }

            // Add relations (this will also update ancestry)
            this.addRelation(profile.id, childId, 'CHILD', 100);
            this.addRelation(spouseId, childId, 'CHILD', 100);
            
            // Add to household
            const house = this.getHouseholdOf(profile.id);
            if (house) {
                if (!house.members.includes(childId)) house.members.push(childId);
                childProfile.houseId = house.id;
            }

            window.EventBus.emit('UI_LOG', `👶 [KINSHIP] ${profile.id} and ${spouseId} have welcomed a new child: ${childId}.`);
        }
    }

    /**
     * Debugging & Validation Hook
     */
    validateState() {
        console.group('[Kinship Validation]');
        console.log('Households Tracked:', this.getHouseholdCount());
        console.log('Social Graph Size:', this.socialGraph.size);
        
        let courtingCount = 0;
        let marriedCount = 0;
        this.socialGraph.forEach(relations => {
            relations.forEach(data => {
                if (data.type === 'COURTING') courtingCount++;
                if (data.type === 'SPOUSE') marriedCount++;
            });
        });
        
        console.log('Active Courtships (unidirectional units):', courtingCount);
        console.log('Active Spouses (unidirectional units):', marriedCount);
        
        const orphanedRelations = [];
        this.socialGraph.forEach((rels, id) => {
            if (!window.PersonhoodManager.profiles.has(id)) orphanedRelations.push(id);
        });
        
        if (orphanedRelations.length > 0) {
            console.warn('Found relations for dead/missing NPCs:', orphanedRelations);
        } else {
            console.log('All social graph nodes verified against Personhood.');
        }
        console.groupEnd();
    }

    getHouseholdCount() {
        return window.HouseholdManager?.households?.size || 0;
    }

    // ==========================================
    // 2. THE GRIEF & INHERITANCE CASCADE
    // ==========================================

    handleDeathCascade(data) {
        const victimId = data.victimId || data.id || data.victim?.id;
        const killerId = data.killerId || data.lastAttacker?.id || (data.victim?.lastAttacker?.id);
        
        if (!victimId) return;

        const profile = window.PersonhoodManager?.profiles.get(victimId);
        const relations = this.socialGraph.get(victimId);
        const config = window.EngineConfig.kinship;

        if (!profile) return;
        
        const household = this.getHouseholdOf(victimId);

        // 1. Inheritance Execution
        if (household && (household.headId === victimId || !household.headId)) {
            this.executeInheritance(household, victimId);
        }

        // 2. The Grief Cascade (Productivity Drop)
        if (relations) {
            relations.forEach((relData, targetId) => {
                if (['SPOUSE', 'CHILD', 'PARENT'].includes(relData.type)) {
                    const survivor = window.PersonhoodManager?.profiles.get(targetId);
                    if (survivor) {
                        survivor.statusTags = survivor.statusTags || {};
                        survivor.statusTags.GRIEF = true;
                        survivor.griefDuration = config.grief.durationMonths;

                        // Direct economic shift: Survivor's productivity bottoms out
                        if (survivor.career) {
                            survivor._preGriefEfficiency = survivor.career.specializedEfficiency || 1.0;
                            survivor.career.specializedEfficiency *= config.grief.productivityModifier;
                        }
                        
                        // Village-level impact
                        if (survivor.property?.homeVillageId) {
                            const village = window.VillageManager?.villages?.find(v => v.id === survivor.property.homeVillageId);
                            if (village) {
                                village.stats.prosperity = Math.max(0, village.stats.prosperity - 1); // Small immediate dip per grieving member
                            }
                        }

                        window.EventBus.emit('UI_LOG_DEBUG', `[GRIEF] ${survivor.id} is paralyzed by grief. Productivity plummets.`);
                    }
                }
        });
        }


        // 3. Village Economy Shift
        if (profile.property?.homeVillageId) {
            window.EventBus.emit('VILLAGE_ECONOMY_UPDATE', { 
                villageId: profile.property.homeVillageId, 
                reason: 'GRIEF_CASCADE' 
            });
        }

        // 4. Blood Feud Generation
        if (killerId && killerId !== 'environment' && household) {
            const killerProfile = window.PersonhoodManager?.profiles.get(killerId);
            const killerHousehold = this.getHouseholdOf(killerId);
            
            if (killerHousehold && window.FeudManager) {
                window.FeudManager.escalateToBloodFeud(household.id, killerHousehold.id, victimId, killerId);
            }
        }

        // Cleanup victim's outbound social graph to save memory
        this.socialGraph.delete(victimId);
    }

    executeInheritance(household, deceasedId) {
        const config = window.EngineConfig.kinship.economy;
        // Corrected: eligibleHeirs are those who have the deceased as a PARENT
        const eligibleHeirs = household.members.filter(id => id !== deceasedId && this.hasRelation(id, 'PARENT', deceasedId));
        
        if (eligibleHeirs.length > 0) {
            // Primogeniture: First child takes over
            household.headId = eligibleHeirs[0];
            window.EventBus.emit('UI_LOG', `👑 [INHERITANCE] The household wealth and legacy has passed to a new generation.`);
        } else {
            // Succession Failure: The house decays and wealth scatters
            window.EventBus.emit('UI_LOG', `🍂 [SUCCESSION FAILURE] A household line has ended. Wealth dissipates into the village.`);
            
            const villageId = household.villageId;
            const village = window.VillageManager?.villages?.find(v => v.id === villageId);
            if (village) {
                village.stats.prosperity += (household.assets?.wealth || 0) * (1.0 - config.successionLossEntropy);
            }
            
            if (window.HouseholdManager) {
                window.HouseholdManager.households.delete(household.id);
            }
        }
    }

    // ==========================================
    // UTILITIES & LEGACY CLAN HOOKS
    // ==========================================

    addRelation(npcA, npcB, type, value) {
        if (!this.socialGraph.has(npcA)) this.socialGraph.set(npcA, new Map());
        if (!this.socialGraph.has(npcB)) this.socialGraph.set(npcB, new Map());
        
        // Handle Asymmetrical Relationships
        let typeAtoB = type;
        let typeBtoA = type;

        if (type === 'CHILD') typeBtoA = 'PARENT';
        if (type === 'PARENT') typeBtoA = 'CHILD';

        this.socialGraph.get(npcA).set(npcB, { type: typeAtoB, value });
        this.socialGraph.get(npcB).set(npcA, { type: typeBtoA, value }); // Bidirectional & Corrected

        // Sync with Personhood ancestry
        const profileA = window.PersonhoodManager?.profiles.get(npcA);
        const profileB = window.PersonhoodManager?.profiles.get(npcB);

        if (profileA && profileB) {
            if (type === 'CHILD') {
                if (!profileA.ancestry.children.includes(npcB)) profileA.ancestry.children.push(npcB);
                if (!profileB.ancestry.parents.includes(npcA)) profileB.ancestry.parents.push(npcA);
            } else if (type === 'PARENT') {
                if (!profileA.ancestry.parents.includes(npcB)) profileA.ancestry.parents.push(npcB);
                if (!profileB.ancestry.children.includes(npcA)) profileB.ancestry.children.push(npcA);
            }
        }
    }

    hasRelation(npcId, type, specificTargetId = null) {
        const relations = this.socialGraph.get(npcId);
        if (!relations) return false;
        
        if (specificTargetId) {
            return relations.has(specificTargetId) && relations.get(specificTargetId).type === type;
        }
        
        for (let [targetId, data] of relations.entries()) {
            if (data.type === type) return true;
        }
        return false;
    }

    getHouseholdOf(npcId) {
        if (!window.HouseholdManager) return null;
        for (let [id, house] of window.HouseholdManager.households.entries()) {
            if (house.members.includes(npcId)) return house;
        }
        return null;
    }

    /**
     * Legacy Kinship Bonus (System 57.1)
     */
    getKinshipBonus(entityA, entityB) {
        const rels = this.socialGraph.get(entityA);
        if (!rels) return 1.0;
        
        const rel = rels.get(entityB);
        if (!rel) return 1.0;

        if (['SPOUSE', 'CHILD', 'PARENT'].includes(rel.type)) return 2.0;
        if (rel.type === 'FRIEND') return 1.2;
        
        return 1.0;
    }
}

window.KinshipManager = new KinshipSystem();
export default window.KinshipManager;
