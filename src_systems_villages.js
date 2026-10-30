import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import alea from 'alea'; // REPAIR: Explicit dependency import


window.VillageManager = {
    villages: [], kingdomPopulation: 250000, capitalPopulationShare: 0.25, names: ["Oakhaven", "Gallows Hill", "Mire's Edge", "Blackwood", "Hollow Creek", "Ashen Hold", "Dire Rest", "Crow's Perch", "Widow's Peak", "Thornbury", "Gloomhaven", "Duskendale", "Grimsby", "Shadowfen", "Blighted Watch", "Bleakmire", "Wraith's End", "Cullfield", "Terminus"],
    settlementProfiles: [
        { house: 'The Royal Family', leader: 'King Alaric', title: 'Monarch', tier: 'monarch', industry: 'Royal Mint', produces: 'gold', imports: ['food', 'wood', 'stone'] },
        { house: 'House Oakheart', leader: 'Baron Oakheart', title: 'War Master', tier: 'war_master', industry: 'Timberwrights', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Gallows', leader: 'Baroness Gallows', title: 'War Master', tier: 'war_master', industry: 'Ropeworks', produces: 'wood', imports: ['food', 'gold'] },
        { house: 'House Mire', leader: 'Elder Mire', title: 'War Master', tier: 'war_master', industry: 'Herbalists', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Blackwood', leader: 'Duke Blackwood', title: 'War Master', tier: 'war_master', industry: 'Ironworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Hollow', leader: 'Baron Hollow', title: 'War Master', tier: 'war_master', industry: 'Tanners', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Ashen', leader: 'Duke Ashen', title: 'War Master', tier: 'war_master', industry: 'Stoneworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Dire', leader: 'Baron Dire', title: 'War Master', tier: 'war_master', industry: 'Milling', produces: 'food', imports: ['wood', 'stone'] },
        { house: 'House Crow', leader: 'Master Crow', title: 'War Master', tier: 'war_master', industry: 'Courier Guild', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Widow', leader: 'Duchess Widow', title: 'War Master', tier: 'war_master', industry: 'Redwood Monopoly', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Thorn', leader: 'Baron Thorn', title: 'War Master', tier: 'war_master', industry: 'Apiaries', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Gloom', leader: 'Baron Gloom', title: 'War Master', tier: 'war_master', industry: 'Glassworks', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Dusken', leader: 'Baron Dusken', title: 'War Master', tier: 'war_master', industry: 'Textiles', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Grim', leader: 'Baron Grim', title: 'War Master', tier: 'war_master', industry: 'Foundry', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Shadowfen', leader: 'Duke Shadowfen', title: 'War Master', tier: 'war_master', industry: 'Alchemy Monopoly', produces: 'gold', imports: ['food', 'wood', 'stone'] },
        { house: 'House Blightwatch', leader: 'Ranger General', title: 'War Master', tier: 'war_master', industry: 'Rangers', produces: 'wood', imports: ['food', 'stone'] },
        { house: 'House Bleak', leader: 'Baron Bleak', title: 'War Master', tier: 'war_master', industry: 'Quarries', produces: 'stone', imports: ['food', 'wood'] },
        { house: 'House Wraith', leader: 'Baron Wraith', title: 'War Master', tier: 'war_master', industry: 'Fisheries', produces: 'food', imports: ['wood', 'gold'] },
        { house: 'House Cull', leader: 'Baron Cull', title: 'War Master', tier: 'war_master', industry: 'Leatherworks', produces: 'gold', imports: ['food', 'wood'] },
        { house: 'House Terminus', leader: 'High Marshal Vane', title: 'War Master', tier: 'war_master', industry: 'Mountain Arsenal', produces: 'stone', imports: ['food', 'wood', 'gold'], mountainGatekeeper: true, martial: true, endgameGateway: true, basePower: 75, leaderPower: 90 }
    ],
    provisionProfiles: [
        { itemId: 'royal_spiced_wine', name: 'Royal Spiced Wine', heal: 30, buff: 'toughness', amount: 1, duration: 90 },
        { itemId: 'oakhaven_cider', name: 'Oakhaven Cider', heal: 32, buff: 'athletics', amount: 1, duration: 90 },
        { itemId: 'gallows_stew', name: 'Gallows Hunter Stew', heal: 34, buff: 'strength', amount: 1, duration: 100 },
        { itemId: 'mire_tea', name: 'Mire Herbal Tea', heal: 36, buff: 'meleeDef', amount: 1, duration: 100 },
        { itemId: 'blackwood_ale', name: 'Blackwood Iron Ale', heal: 38, buff: 'toughness', amount: 2, duration: 110 },
        { itemId: 'hollow_broth', name: 'Hollow Creek Broth', heal: 40, buff: 'dodge', amount: 2, duration: 110 },
        { itemId: 'ashen_roast', name: 'Ashen Hold Stone Roast', heal: 42, buff: 'strength', amount: 2, duration: 120 },
        { itemId: 'dire_malt', name: 'Dire Rest Malt', heal: 44, buff: 'athletics', amount: 2, duration: 120 },
        { itemId: 'crow_coffee', name: 'Crow Perch Black Coffee', heal: 46, buff: 'dodge', amount: 2, duration: 130 },
        { itemId: 'widow_mead', name: 'Widow Peak Redwood Mead', heal: 48, buff: 'meleeAtt', amount: 2, duration: 130 },
        { itemId: 'thousand_honey', name: 'Thornbury Honey Cakes', heal: 50, buff: 'toughness', amount: 3, duration: 140 },
        { itemId: 'gloom_tonic', name: 'Gloomhaven Glass Tonic', heal: 52, buff: 'meleeDef', amount: 3, duration: 140 },
        { itemId: 'dusken_wine', name: 'Duskendale Velvet Wine', heal: 54, buff: 'dodge', amount: 3, duration: 150 },
        { itemId: 'grimsby_stout', name: 'Grimsby Foundry Stout', heal: 56, buff: 'strength', amount: 3, duration: 150 },
        { itemId: 'shadowfen_elixir', name: 'Shadowfen Alchemical Elixir', heal: 60, buff: 'meleeAtt', amount: 4, duration: 160 },
        { itemId: 'blightwatch_ration', name: 'Blightwatch Ranger Ration', heal: 64, buff: 'athletics', amount: 4, duration: 160 },
        { itemId: 'bleakmire_mushroom_wine', name: 'Bleakmire Mushroom Wine', heal: 68, buff: 'meleeDef', amount: 4, duration: 170 },
        { itemId: 'wraith_fish_stew', name: 'Wraith End Fish Stew', heal: 72, buff: 'toughness', amount: 5, duration: 170 },
        { itemId: 'cullfield_hunter_brew', name: 'Cullfield Hunter Brew', heal: 76, buff: 'dodge', amount: 5, duration: 180 },
        { itemId: 'terminus_war_brew', name: 'Terminus War Brew', heal: 90, buff: 'strength', amount: 7, duration: 240 }
    ],
        generateWeb: function() {
        this.villages = []; 
        const capitalPopulation = Math.floor(this.kingdomPopulation * this.capitalPopulationShare);
        const settlementPopulation = Math.floor((this.kingdomPopulation - capitalPopulation) / 19);
        let remainingPopulation = this.kingdomPopulation - capitalPopulation;
        
        for (let i = 0; i < 20; i++) {
            let connections = []; 
            if (i > 0) connections.push(i - 1); 
            if (i < 19) connections.push(i + 1); 
            
            const population = i === 0 ? capitalPopulation : (i === 19 ? remainingPopulation : settlementPopulation);
            if (i > 0) remainingPopulation -= population;
            const profile = this.settlementProfiles[i];
            const provision = this.provisionProfiles[i];
            
            this.villages.push({ 
                id: i, 
                name: i === 0 ? 'The Capital' : this.names[i - 1], 
                x: 0, z: 0, // Placeholder, set by shiftLocations
                connections: connections, 
                capital: i === 0, 
                nobleHouse: profile.house, 
                nobleLeader: profile.leader,
                nobleTitle: profile.title, 
                industry: profile, 
                provision, 
                provisionStock: { [provision.itemId]: Math.max(10, Math.floor(population / 100)) }, 
                territory: { faction: 'kingdom', radius: i === 0 ? 140 : 90, barrierRadius: i === 0 ? 140 : 90, control: 100, underRaid: false }, 
                barrierIntegrity: 100, 
                expeditions: [], 
                stats: { 
                    ap: 50 + Math.floor(Math.random() * 50), 
                    food: population * 20, 
                    wood: population * 8, 
                    stone: population * 5, 
                    gold: population * 4, 
                    essence: 0, 
                    prosperity: 55,
                    refinementStock: {
                        beast_bones: i === 0 ? 500 : 0,
                        corrupted_resin: 0,
                        flesh_pods: 0
                    }
                }, 
                population: { current: population, capacity: Math.ceil(population * 1.2) }, 
                expansionLevel: 0, squads: [], caravans: [], assignedModel: null, layout: [], residents: [],
                // --- PHASE 4: QUARTER ENGINE ---
                quarters: new Map(), // QuarterID -> { inhabitants: [], density: 0 }
                // --- PHYSICAL LEGACY: PROPERTY REGISTRY (Phase 14) ---
                propertyRegistry: new Map(), // id -> { type, ownerId, occupantId, houseId, genCount, history: [], anchoredKnowledge: [] }
                
                // --- PHASE 3: ARCHIVE PHYSICALITY ---
                archiveAccessControl: new Map(), // node_id -> access_level (0:Public, 1:Citizen, 2:Noble, 3:Elite)

                relations: {}, 
                diplomaticState: {}, 
                tensions: 0,
                crisisLog: [], // --- GOVERNANCE MEMORY ---
                memoryProfile: { // --- PHASE 3: MEMORY PROFILE ---
                    caution: 0.2,
                    ambition: 0.5,
                    trustInCrown: 0.8,
                    tradeConfidence: 0.5,
                    expansionConfidence: 0.5
                },
                fuelNeed: 0, // Projected demand
                feudalState: i === 19 ? 'PARTIALLY_SOVEREIGN' : 'DEPENDENT', // --- PHASE 11: FEUDAL DEPENDENCY ---
                deepReserves: i === 19 ? { food: 500, essence: 100 } : null, // --- TERMINUS DEEP RESERVES ---
                activeObjectives: [], // --- PHASE 5: INSTITUTIONAL AGENCY ---
                                // --- PHASE 12: CULTURAL EVOLUTION & CONTINUITY ---
                culture: {
                    traits: new Map(), 
                    dominantTrait: 'NEUTRAL',
                    traditions: [],
                    lastAdaptationDay: 0
                },
                
                // --- GENESIS CONTINUITY OFFICE (GCO) DNA ---
                dna: window.GCO ? window.GCO.registerEntity(`village_${i}`, 'VILLAGE', {
                    industry: profile.industry,
                    traditions: ['Founding Rite', 'Harvest Feast'],
                    culture: [['COLLECTIVISM', 0.5], ['SURVIVALISM', 0.8]]
                }) : null,
                
                currentTask: 'Establishing', taskTarget: 'Local Region', taskReason: 'Settlement routine.', taskTimestamp: Date.now()
            });
        }

        
        // Initialize mutual relations
        this.villages.forEach(v1 => {
            this.villages.forEach(v2 => {
                if (v1.id !== v2.id) {
                    v1.relations[v2.id] = 0;
                    v1.diplomaticState[v2.id] = 'neutral';
                }
            });
        });
        
        // Use the new repositioning logic to place them
        this.shiftLocations();
    },
    
            // --- PHASE 1.5: VILLAGE CHAIN REPOSITIONING ---
    shiftLocations: function() {
        if (this.villages.length < 2) return;
        
        // NULL SAFETY: Verify authorities before proceeding with deterministic logic
        if (!window.EpochManagerInstance || !window.WorldGenConfig) {
            console.warn("[VillageManager] Critical Authority Missing: EpochManager or WorldGenConfig. Aborting deterministic shift.");
            return;
        }

        // 1. Capital (Index 0) is always locked at 0,0
        const capital = this.villages[0];
        capital.x = 0;
        capital.z = 0;
        
        // 2. Terminus (Index 19) is pushed to the edge of the mountain ring
        // Deterministic Authority Integration: Removed Math.random() fallback
        const prng = window.EpochManagerInstance.prng;
        const forestSide = window.WorldGenConfig.darkForestSideMeters || 575843.2;
        const mountainRadius = (forestSide / 2) - 5000;
        const terminusAngle = prng() * Math.PI * 2;
        
        const terminus = this.villages[this.villages.length - 1];
        terminus.x = Math.cos(terminusAngle) * mountainRadius;
        terminus.z = Math.sin(terminusAngle) * mountainRadius;

        // --- HOUSE WRAITH: GREAT LAKE ANCHORING ---
        // House Wraith (Index 17) always anchors to the Great Lake
        const wraithVillage = this.villages.find(v => v.nobleHouse === 'House Wraith');
        if (wraithVillage) {
            const lakeRadius = (window.WorldGenConfig.greatLakeDiameterMeters || 402335.0) / 2;
            const seed = window.EpochManagerInstance.currentSeed;
            
            // REPAIR: alea is now available in module scope
            const lakeCenterOff = new alea(seed + '_lake')();
            const lakeAngle = lakeCenterOff * Math.PI * 2;
            const halfForestSide = (window.WorldGenConfig.darkForestSideMeters || 1137800.0) / 2;
            const lakeDistFromCenter = (halfForestSide - lakeRadius) * 0.6;
            const lakeCenterX = Math.cos(lakeAngle) * lakeDistFromCenter;
            const lakeCenterZ = Math.sin(lakeAngle) * lakeDistFromCenter;

            // Place Wraith Village on the shore (just outside the radius)
            const shoreAngle = lakeAngle + Math.PI; 
            wraithVillage.x = lakeCenterX + Math.cos(shoreAngle) * (lakeRadius + 500);
            wraithVillage.z = lakeCenterZ + Math.sin(shoreAngle) * (lakeRadius + 500);
            wraithVillage.isLakeAnchored = true;
        }
        
        // 3. Space out the remaining villages

        const middleNodes = this.villages.filter(v => !v.capital && v.nobleHouse !== 'House Terminus' && !v.isLakeAnchored);
        const totalMiddleNodes = middleNodes.length;

        
                for (let i = 0; i < totalMiddleNodes; i++) {
            const village = middleNodes[i];
            const t = (i + 1) / (totalMiddleNodes + 1);

            
            const baseX = terminus.x * t;
            const baseZ = terminus.z * t;
            
            // Add procedural perpendicular offset (The "Jagged Chain")
            const maxDeviation = mountainRadius * 0.2;
            const deviationDirX = -Math.sin(terminusAngle);
            const deviationDirZ = Math.cos(terminusAngle);
            const deviationAmount = (prng() * 2 - 1) * maxDeviation;
            
            village.x = baseX + (deviationDirX * deviationAmount);
            village.z = baseZ + (deviationDirZ * deviationAmount);
        }

                        // 4. Anchor Analysis: Sync with Force Manager
        if (window.ForceManager) {
            window.ForceManager.update(0);
        }

        // --- PHASE 4: REGISTER ANCHORS ---
        if (window.UrbanPlanning) {
            this.villages.forEach(v => {
                window.UrbanPlanning.registerAnchor(v.id, v.x, v.z);
            });
        }
        
        // 5. Regenerate the road network to match the new coordinates


                if (window.RoadManager && window.RoadManager.generateRoads) {
            window.RoadManager.generateRoads(this.villages);
        }

        // --- PHASE 10: WENDIGO REBIRTH (Bible §10, §18) ---
        if (window.PersonhoodManager) {
            const candidates = window.PersonhoodManager.consumeCandidates();
            candidates.forEach(can => {
                const spawnPos = can.lastPosition;
                // Move spawn position slightly into the woods
                spawnPos.x += (Math.random() - 0.5) * 50;
                spawnPos.z += (Math.random() - 0.5) * 50;

                const wendigo = window.GameCore.instantiatePrefab('Wendigo', spawnPos.x, window.WorldGenerator.getTerrainHeight(spawnPos.x, spawnPos.z), spawnPos.z, 'persistent');
                if (wendigo) {
                    wendigo.isSentient = true;
                    wendigo.formerName = can.profile.id;
                    wendigo.name = `Minor Wendigo (${can.profile.id})`;
                    wendigo.relationships = can.profile.relationships; // It remembers
                    wendigo.hungerLevel = 50;
                    wendigo.isMinor = true;
                    wendigo.hp = (wendigo.hp || 450) * 0.5; // Minor wendigos are weaker
                    wendigo.attackDamage = (wendigo.attackDamage || 45) * 0.5;
                    
                    window.EventBus.emit('UI_LOG', `[VOID] The cold hunger has claimed ${can.profile.id}. A shadow stirs where they fell.`);
                }
            });
        }
        
                window.EventBus.on('NPC_BORN', (data) => this.handleBirthEvent(data));
                window.EventBus.on('VILLAGE_COLLAPSED', (data) => {
                    if (window.ChronicleManager) {
                        window.ChronicleManager.recordEvent({
                            actorId: `village_${data.villageId}`,
                            type: 'VILLAGE_COLLAPSED',
                            detail: `The settlement has succumbed to entropy and the forest.`,
                            significance: 100
                        });
                    }
                });
        
                window.EventBus.emit('UI_LOG', "🌲 The Village Chain has repositioned.");

    },

        handleBirthEvent: function(data) {
        const village = this.villages.find(v => v.id === data.villageId);
        if (!village) return;

        const childId = `npc_child_${data.parentA}_${Date.now()}`;
        
        // 1. Register in Personhood (handled via getProfile side-effect)
        const profile = window.PersonhoodManager.getProfile(childId);
        const parentA = window.PersonhoodManager.profiles.get(data.parentA);
        const parentB = window.PersonhoodManager.profiles.get(data.parentB);

        // 2. Initialize Child State
        profile.age = 0;
        profile.lifeStage = 'CHILD';
        profile.role = 'INFANT';
        profile.property.homeVillageId = village.id;
        
                // 3. Link Lineage & Inheritance
        profile.ancestry.parents = [data.parentA, data.parentB];
        if (parentA && parentB) {
            // Update Parents' Children Registry (Genetic Drift Traceability)
            if (!parentA.ancestry.children.includes(childId)) parentA.ancestry.children.push(childId);
            if (!parentB.ancestry.children.includes(childId)) parentB.ancestry.children.push(childId);

            // House Inheritance

            profile.houseId = parentA.houseId;
            
            // Significance Inheritance (Bible §22)
            // Children start with a fraction of parents' significance
            profile.significance = ( (parentA.significance || 0) + (parentB.significance || 0) ) * 0.1;
            
            // --- LEGACY HOUSE ANCHORING (PHASE 2) ---
            if (parentA.houseId) {
                const house = window.DynastyManager?.getHouse(parentA.houseId);
                if (house) {
                    // Register child in House members
                    if (!house.members.includes(childId)) house.members.push(childId);
                }
            }

            
                        // --- TRAIT RECOMBINATION (PHASE 2) ---
            if (window.TraitSystem) {
                profile.traits = window.TraitSystem.calculateInheritedTraits(parentA, parentB);
            } else {
                Object.keys(profile.traits).forEach(trait => {
                    if (trait === 'credibility') return;
                    const parentAvg = (parentA.traits[trait] + parentB.traits[trait]) / 2;
                    const mutation = (Math.random() - 0.5) * 0.1; // +/- 5% mutation
                    profile.traits[trait] = Math.max(0, Math.min(1, parentAvg + mutation));
                });
            }

            
            // --- KINSHIP SYNC ---
            if (window.KinshipManager) {
                window.KinshipManager.addRelation(data.parentA, childId, 'CHILD', 100);
                window.KinshipManager.addRelation(data.parentB, childId, 'CHILD', 100);
                
                // Household sync
                const house = window.KinshipManager.getHouseholdOf(data.parentA);
                if (house) {
                    if (!house.members.includes(childId)) house.members.push(childId);
                }
            }
            
                        // --- INTEL LEGACY (PHASE 2) ---
            if (window.IntelManager) {
                // Family Secrets: Children inherit ownership of some "Family Secrets"
                const parentAIntel = window.IntelManager.getIntelForNode(data.parentA);
                const parentBIntel = window.IntelManager.getIntelForNode(data.parentB);
                
                const combinedIntel = [...parentAIntel, ...parentBIntel];
                
                combinedIntel.forEach(intel => {
                    // Logic: Inherit if it's a FAMILY_SECRET or if parents are SCHOLARS (Bible §36)
                    const isScholar = parentA.identity === 'SCHOLAR' || parentB.identity === 'SCHOLAR';
                    const isFamilySecret = intel.payload.tags?.includes('FAMILY_SECRET');
                    
                    if (isFamilySecret || (isScholar && Math.random() < 0.2)) {
                        window.IntelManager.grantOwnership(intel.intel_id, childId);
                    }
                });
            }

        }
        
        // 4. Update Village Population
        village.population.current++;
        village.residents.push({ id: childId, prefab: 'Commoner', ox: 0, oz: 0 }); 

        // --- CHRONICLE INTEGRATION (PHASE 1) ---
        if (window.ChronicleManager) {
            window.ChronicleManager.recordEvent({
                actorId: childId,
                type: 'NPC_BORN',
                detail: `A new generation rises. ${childId} was born to ${data.parentA} and ${data.parentB} in ${village.name}.`,
                significance: 40,
                historicalWeight: 10,
                location: { x: village.x, z: village.z }
            });
        }

        window.EventBus.emit('UI_LOG', `👶 [VILLAGE] A new life has begun in ${village.name}: ${childId}.`);

    },




        // --- SIMULATION SLICING (Kenshi Style) ---
    // Instead of simulating all 20 villages at once, we do 1 per logic tick
    simulationIndex: 0,

    simulateNextVillage: function() {
        if (this.villages.length === 0) return;
        
        const village = this.villages[this.simulationIndex];
        if (village) {
            window.VillageManager.simulateVillage(village);
            
            // --- PHASE 2: VILLAGE INTEL EXCHANGE ---
            this.processVillageIntelExchange(village);
        }
        
        this.simulationIndex = (this.simulationIndex + 1) % this.villages.length;
    },

        initScheduler: function() {
        // Spatial & Proximity logic remains in VillageManager
    },

    /**
     * Initializes property ownership for a new layout item.
     * Manifestation Rule: Property survives individuals.
     */
    registerProperty: function(village, buildingId, type, ownerId = null) {
        const property = {
            id: buildingId,
            type: type, // HOME, WORKSHOP, ARCHIVE, etc.
            ownerId: ownerId,
            occupantId: ownerId,
            houseId: ownerId ? (window.PersonhoodManager?.getProfile(ownerId)?.houseId || null) : null,
            genCount: 1,
            history: ownerId ? [{ day: window.EngineParams?.worldDay || 0, event: 'ESTABLISHED', actor: ownerId }] : [],
            anchoredKnowledge: []
        };
        village.propertyRegistry.set(buildingId, property);
        return property;
    },

    /**
     * Handles inheritance of physical property.
     * Logic: Family -> Apprentice -> Institution -> Abandonment.
     */
    transferProperty: function(village, propertyId, newOwnerId, reason = 'INHERITANCE') {
        const prop = village.propertyRegistry.get(propertyId);
        if (!prop) return;

        const oldOwner = prop.ownerId;
        prop.ownerId = newOwnerId;
        prop.occupantId = newOwnerId;
        prop.genCount++;
        
        prop.history.push({
            day: window.EngineParams?.worldDay || 0,
            event: reason,
            prevOwner: oldOwner,
            newOwner: newOwnerId
        });

        // Continuity Bonus
        if (window.WorldTree) {
            const root = window.WorldTree.rootNodes.get(`village_${village.id}`);
            if (root) root.health = Math.min(1.0, root.health + 0.05);
        }

        window.EventBus.emit('UI_LOG', `[LEGACY] ${prop.type} ${prop.id} inherited by ${newOwnerId}.`);
    },

        /**
     * Physical Archive Access Check.
     * Bible §Power: Information is gated by social standing.
     */
    canAccessArchive: function(village, requesterId, archiveId) {
        const archive = window.MountainArchives.archiveContainers.get(archiveId);
        if (!archive) return false;

        const profile = window.PersonhoodManager?.getProfile(requesterId);
        const playerRep = window.GameState?.reputation?.village || 0;
        
        let requesterLevel = 0;
        if (requesterId === 'player') {
            if (playerRep > 80) requesterLevel = 3;
            else if (playerRep > 40) requesterLevel = 2;
            else if (playerRep > 10) requesterLevel = 1;
        } else if (profile) {
            if (profile.role === 'historian' || profile.role === 'scribe') requesterLevel = 2;
            if (profile.houseId && profile.houseId.includes(village.nobleHouse.toLowerCase())) requesterLevel = 2;
        }

        return requesterLevel >= archive.access_level;
    },


            /**
     * Simulation of a single village tick.
     */
        simulateVillage: function(village) {
        const cal = window.CalibrationFramework?.settings || {};
        
        // 1. BARRIER DECAY (Spatial State)
        let baseEssenceCost = Math.max(1, Math.ceil(village.population.current / 5000));
        if (village.nobleHouse === 'House Terminus') baseEssenceCost *= 0.5;
        if (village.culture?.dominantTrait === 'SURVIVALIST') baseEssenceCost *= 0.8;
        
        const essenceCost = baseEssenceCost * (1 + (village.expansionLevel || 0));
        village.barrierIntegrity = Math.max(0, (village.barrierIntegrity ?? 100) - essenceCost);

        if ((village.stats.essence || 0) >= essenceCost) {
            village.stats.essence -= essenceCost;
            village.barrierIntegrity = Math.min(100, village.barrierIntegrity + 8);
        } else if (village.barrierIntegrity === 0) {
            window.EventBus.emit('BARRIER_FAILURE', { villageId: village.id });
        }

        // 2. RAID DETECTION (Proximity logic)
        const localRaiders = window.GameCore?.activeEntities?.filter(entity => 
            entity.def?.type === 'npc' && 
            (entity.def.faction === 'monster' || entity.def.faction === 'forest') && 
            Math.hypot(entity.visual.position.x - village.x, entity.visual.position.z - village.z) <= village.territory.radius
        ) || [];

        village.territory.underRaid = localRaiders.length > 0;
        village.territory.control = Math.max(0, Math.min(100, village.territory.control + (village.territory.underRaid ? -localRaiders.length * 2 : 1)));
    },

    postVillageNeed: function(village, resource, amount, purpose) {
        const existing = window.GameState.questBoard.find(quest => quest.issuer === village.id && quest.resource === resource && quest.purpose === purpose);
        if (existing) return;
        window.GameState.questBoard.push({ type: 'fetch', issuer: village.id, resource, amount, purpose, reward: Math.max(20, amount * 2) });
        window.EventBus.emit('UI_LOG', `[REQUEST] ${village.name} needs ${amount} ${resource} for ${purpose}.`);
    },
        canFundVillageAction: function(village, cost, purpose) {
        if (village.isCollapsed) return false;
        for (const [resource, amount] of Object.entries(cost)) {

            if ((village.stats[resource] || 0) < amount) {
                this.postVillageNeed(village, resource, amount - (village.stats[resource] || 0), purpose);
                return false;
            }
        }
        return true;
    },
        spendVillageResources: function(village, cost) {
        Object.entries(cost).forEach(([resource, amount]) => { village.stats[resource] -= amount; });
    },

    /**
     * Generates a smuggling rumor for Unblessed Houses (Bible §19).
     * Creates investigation content for the player.
     */
    generateSmugglingRumor: function(village, house) {
        if (!window.IntelManager) return;

        const payload = {
            title: `Smuggling in ${village.name}`,
            description: `Rumors suggest ${house.name} is bypassing Royal trade routes to reclaim its lost prosperity.`,
            tags: ['ECONOMY', 'SMUGGLING', 'UNBLESSED_AGITATION'],
            target_coord: { x: village.x, z: village.z }
        };

        const intelId = window.IntelManager.register({
            type: 'RUMOR',
            payload: payload,
            significance: { economic: 2, political: 1 },
            rarity: 'UNCOMMON',
            certainty: 0.3
        });

        // Grant ownership to the local village hub (it starts here)
        window.IntelManager.grantOwnership(intelId, `village_${village.id}`);
        window.EventBus.emit('UI_LOG_DEBUG', `[POLITICS] An unblessed rumor has surfaced in ${village.name}.`);
    },

        processCrownGovernance: function(capital) {
        
        // --- PHASE 1: CAPITAL REFINEMENT LOOP ---
        const stock = capital.stats.refinementStock;
        const totalMaterials = (stock.beast_bones || 0) + (stock.corrupted_resin || 0) + (stock.flesh_pods || 0);
        const conversionRate = 10;
        
        if (totalMaterials >= conversionRate) {
            // Processing: Priority to Bones, then Resin, then Pods
            let processed = 0;
            if (stock.beast_bones >= conversionRate) { stock.beast_bones -= conversionRate; processed = 1; }
            else if (stock.corrupted_resin >= conversionRate) { stock.corrupted_resin -= conversionRate; processed = 1; }
            else if (stock.flesh_pods >= conversionRate) { stock.flesh_pods -= conversionRate; processed = 1; }
            
            if (processed > 0) {
                capital.stats.essence += processed;
                if (Math.random() < 0.1) {
                    window.EventBus.emit('UI_LOG_DEBUG', `[ESSENCE] Capital refined ${processed} essence from materials.`);
                }
            }
        } else {
            if (Math.random() < 0.05) {
                window.EventBus.emit('UI_LOG', `[FUEL WARNING] Capital refinement stock is critical! Hunt contracts required.`);
            }
        }

        // --- PHASE 1: HUNT DEMAND TRIGGER ---
        if (totalMaterials < 100) {
            const shortageValue = Math.floor((100 - totalMaterials) / 2);
            this.generateHuntContract(capital, shortageValue);
        }

        const candidates = this.villages.filter(v => v.id !== 0 && v.fuelRequested);
        if (candidates.length === 0 || capital.stats.essence < 10) return;

        // 1. Political Priority Scoring (PPS)
        candidates.forEach(v => {
            let score = (100 - v.barrierIntegrity) * 2; // Desperation base
            score += (v.relations[0] || 0); // Loyalty influence
            if (v.industry?.mountainGatekeeper || v.industry?.martial) score += 50; // Strategic value
            score += (v.population.current / 500); // Prestige
            
            const dist = Math.hypot(v.x - capital.x, v.z - capital.z);
            score -= (dist / 5000); // Logistics penalty
            
            v._lastPPS = score;
        });

        // 2. Selection & Sanctioning
        candidates.sort((a, b) => b._lastPPS - a._lastPPS);
        const target = candidates[0];

                // CHECK FOR SANCTIONS (Relations < -20)
        if ((target.relations[0] || 0) < -20) {
            if (target.barrierIntegrity < 25 && !target._wasSanctioned) {
                window.EventBus.emit('UI_LOG', `[POLITICS] The Crown has denied fuel to ${target.name}. Let the woods teach them loyalty.`);
                
                // --- PHASE 1A: CHRONICLE ACTIVATION ---
                window.ChronicleManager?.recordEvent?.({
                    actorId: 'The Capital',
                    type: 'house_sanctioned',
                    detail: `King Alaric sanctioned House ${target.nobleHouse.replace('House ', '')}, withholding Runic Fuel as their barriers fail.`,
                    significance: 120,
                    historicalWeight: 60,
                    location: { x: 0, z: 0 }
                });
                target._wasSanctioned = true;
            }
            return; // Skip dispatch to sanctioned target
        }


        // 3. Dispatch Fuel
        // Ensure no active fuel caravan to this target
        const activeDispatch = capital.caravans.some(c => c.targetVillageId === target.id && c.cargo === 'essence');
        if (activeDispatch) return;

        const amount = 10;
        capital.stats.essence -= amount;
        target.fuelRequested = false;

        const caravan = { 
            id: `crown-fuel-${window.EngineParams.worldDay}-${Date.now()}`, 
            status: 'traveling', 
            targetVillageId: target.id, 
            cargo: 'essence', 
            amount: amount, 
            launchedOnDay: window.EngineParams.worldDay,
            isRoyalShipment: true 
        };
        capital.caravans.push(caravan);

        const caravanEntity = window.GameCore.instantiatePrefab('Merchant Caravan', capital.x + 3, window.WorldGenerator.getTerrainHeight(capital.x + 3, capital.z), capital.z, 'persistent');
        if (caravanEntity) { caravanEntity.caravanId = caravan.id; caravanEntity.villageId = capital.id; }

                // 4. Handle Favor Events
        if ((target.relations[0] || 0) > 50) {
            window.EventBus.emit('UI_LOG', `[CROWN] Royal favor shown to ${target.name}. Essence dispatched by decree.`);
            
            // --- PHASE 1A: CHRONICLE ACTIVATION ---
            window.ChronicleManager?.recordEvent?.({
                actorId: 'The Capital',
                type: 'house_favored',
                detail: `The Crown prioritized a fuel shipment to the loyal House ${target.nobleHouse.replace('House ', '')}.`,
                significance: 80,
                historicalWeight: 30,
                location: { x: 0, z: 0 }
            });
        } else {
            window.EventBus.emit('UI_LOG', `[CROWN] Royal shipment of ${amount} essence dispatched to ${target.name}.`);
        }

    },

    /**
     * Generates a hunt contract when refinement stock is low.
     * Bible Doctrine: Essence exists because dangerous work is performed.
     */
        generateHuntContract: function(capital, urgencyBonus) {
        if (!window.GameState) return;

        const existing = window.GameState.questBoard.find(q => q.type === 'hunt' && q.issuer === 'CAPITAL');
        if (existing) return;

        window.GameState.questBoard.push({
            type: 'hunt',
            issuer: 'CAPITAL',
            resource: 'beast_bones',
            amount: 20,
            purpose: 'fueling civilization',
            reward: 100 + urgencyBonus,
            isPriority: urgencyBonus > 25
        });
        
        window.EventBus.emit('UI_LOG_DEBUG', `[ECONOMY] Capital issued high-priority hunt contract.`);
    },

        /**
     * Phase 4: Social Gravity & Quarter Housing
     * Bible §Urban: NPCs choose housing based on SocialCapital.
     */
    assignNPCToQuarter: function(npc, villageId) {
        if (!window.UrbanPlanning) return;

        const village = this.villages.find(v => v.id === villageId);
        if (!village) return;

        // Score potential quarters based on NPC social capital
        const quarters = ['NOBLE', 'ARTISAN', 'SLUMS'];
        let chosenQuarter = 'SLUMS';

        for (const qId of quarters) {
            const qDef = window.UrbanPlanning.QuarterType[qId];
            if (npc.socialCapital >= qDef.capitalFloor) {
                chosenQuarter = qId;
                break; // Highest first
            }
        }

        // Register inhabitant
        if (!village.quarters.has(chosenQuarter)) {
            village.quarters.set(chosenQuarter, { inhabitants: [], density: 0 });
        }
        
        const qData = village.quarters.get(chosenQuarter);
        qData.inhabitants.push(npc.id);
        qData.density = qData.inhabitants.length / 20; // Arbitrary density logic
        
        window.EventBus.emit('UI_LOG_DEBUG', `[SOCIAL GRAVITY] ${npc.name} moved to the ${chosenQuarter} quarter.`);
    },

    launchRefinementSupplyCaravan: function(village) {
        const stock = village.stats.refinementStock;
        const cargo = stock.beast_bones > 0 ? 'beast_bones' : (stock.corrupted_resin > 0 ? 'corrupted_resin' : 'flesh_pods');
        const amount = Math.min(stock[cargo], 50);

        const caravan = { 
            id: `supply-${village.id}-${window.EngineParams.worldDay}-${Date.now()}`, 
            status: 'traveling', 
            targetVillageId: 0, 
            cargo: cargo, 
            amount: amount, 
            launchedOnDay: window.EngineParams.worldDay 
        };
        
        village.caravans.push(caravan);
        village.stats[cargo] -= amount; // Handled as specific stat in this context

        const caravanEntity = window.GameCore.instantiatePrefab('Merchant Caravan', village.x + 3, window.WorldGenerator.getTerrainHeight(village.x + 3, village.z), village.z, 'persistent');
        if (caravanEntity) { caravanEntity.caravanId = caravan.id; caravanEntity.villageId = village.id; }
        
        window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} dispatched a supply caravan with ${amount} ${cargo} for the Capital.`);
    },

        /**
         * Logic for local authority and dependency on the Crown.
         * Bible Doctrine: Information determines who controls physical goods.
         */
        processFeudalLoyalty: function(village) {
            if (village.capital) return;
        
            // --- HIDDEN VILLAGE EXCEPTION ---
            if (village.name === 'Epitaph') {
                village.feudalState = 'SOVEREIGN';
                village.stats.essence = 999; // Lore: Runic Sovereignty
                village.fuelRequested = false;
                return;
            }

            const crownRelations = village.relations[0] || 0;
            const memory = village.memoryProfile;

            // 1. Dependency Calculation
            // A village is "Independent" if its memoryProfile.trustInCrown is low but ambition is high.
            if (memory.trustInCrown < 0.3 && memory.ambition > 0.7) {
                if (village.feudalState !== 'INDEPENDENT') {
                    village.feudalState = 'INDEPENDENT';
                    window.EventBus.emit('UI_LOG', `[POLITICS] ${village.name} has declared economic independence from the Capital.`);
                
                    // AED Integration: Rebellion increases Forest Pressure
                    if (window.AED) {
                        window.AED.processAdaptation('Forest');
                    }
                }
            } else if (crownRelations < -20) {
                village.feudalState = 'SEMI_AUTONOMOUS';
            } else {
                // Keep specialized states if they were set (e.g. Terminus)
                if (village.feudalState !== 'PARTIALLY_SOVEREIGN') {
                    village.feudalState = 'DEPENDENT';
                }
            }


                // 2. Strategic Reserves
        // Independent/Cautious villages try to keep a local reserve of 20 Essence
        if (village.feudalState !== 'DEPENDENT' && village.stats.essence > 20) {
            // They stop requesting fuel even if technically "low" by standard rules
            village.fuelRequested = false; 
        }

        // --- PHASE 5: OBJECTIVE GENERATION ---
        this.updateInstitutionalObjectives(village);
    },

    /**
     * Institutions generate active objectives based on identity and state.
     */
    updateInstitutionalObjectives: function(village) {
        if (village.activeObjectives.length > 0) return; // limit to one major goal for MVP

        const memory = village.memoryProfile;
        const stats = village.stats;

        // --- LOGIC: IDENTITY -> THREAT -> OBJECTIVE ---

        // 1. CROWN (House Aethel)
        if (village.capital) {
            // If any village is INDEPENDENT, Crown seeks to SUPPRESS
            const rebels = this.villages.filter(v => v.feudalState === 'INDEPENDENT');
            if (rebels.length > 0) {
                this.generateObjective(village, 'SUPPRESSION', rebels[0].id);
            }
        }
        
        // 2. TERMINUS (World's End)
        else if (village.nobleHouse === 'House Terminus') {
            // Always seeks MEASUREMENT (Longitudinal Data)
            if (Math.random() < 0.1) {
                this.generateObjective(village, 'INVESTIGATION', 'mountain_rotation');
            }
        }

        // 3. ROGUE SETTLEMENTS
        else if (village.feudalState === 'INDEPENDENT' && stats.essence < 10) {
            // Independent villages without fuel seek REFINEMENT alternatives
            this.generateObjective(village, 'RECONSTRUCTION', 'domestic_radiance');
        }
        
        // 4. GENERAL NOBLE HOUSES
        else if (memory.ambition > 0.8) {
            // Ambitious houses seek ACQUISITION (Monopoly Assets)
            this.generateObjective(village, 'ACQUISITION', 'blessed_spot');
        }
    },

    generateObjective: function(village, type, target) {
        const objective = {
            id: `obj-${village.id}-${Date.now()}`,
            type: type, // ACQUISITION, SUPPRESSION, RECONSTRUCTION, etc
            target: target,
            progress: 0,
            status: 'ACTIVE'
        };

        village.activeObjectives.push(objective);
        
        // --- ACTION: CREATE BOUNTY ---
        this.generateBountyFromObjective(village, objective);
        
        window.EventBus.emit('UI_LOG_DEBUG', `[GOVERNANCE] ${village.name} initiated ${type} objective.`);
    },

    generateBountyFromObjective: function(village, objective) {
        if (!window.GameState) return;

        let category = 'discovery';
        let title = "";
        let reward = 200;

        switch(objective.type) {
            case 'SUPPRESSION':
                title = `Sanction Enforcement: ${objective.target}`;
                category = 'political';
                reward = 500;
                break;
            case 'INVESTIGATION':
                title = `Longitudinal Survey: ${objective.target}`;
                category = 'discovery';
                reward = 350;
                break;
            case 'RECONSTRUCTION':
                title = `Syntax Recovery: ${objective.target}`;
                category = 'research';
                reward = 600;
                break;
            case 'ACQUISITION':
                title = `Asset Extraction: ${objective.target}`;
                category = 'mercantile';
                reward = 400;
                break;
        }

        window.GameState.questBoard.push({
            id: `bounty-${objective.id}`,
            type: category,
            issuer: village.nobleHouse,
            title: title,
            objectiveId: objective.id,
            reward: reward,
            status: 'OPEN'
        });
    },

    processVillageCaravans: function(village) {

        village.caravans.forEach(caravan => {
            // --- PHASE 2: GHOST CARAVAN TRAVEL ---
            // If the caravan is far away from the player, move it mathematically
            const agent = window.GameCore.activeEntities.find(en => en.caravanId === caravan.id);
            if (!agent) {
                // If it doesn't exist in 3D, simulate it!
                const dest = this.villages.find(v => v.id === caravan.targetVillageId);
                if (dest && caravan.status === 'traveling') {
                    // Update its abstract position
                    const dx = dest.x - (caravan.position?.x || village.x);
                    const dz = dest.z - (caravan.position?.z || village.z);
                    const dist = Math.hypot(dx, dz);
                    
                    if (dist < 20) {
                        caravan.status = 'arrived';
                    } else {
                        // Caravans move at ~4m/s, abstract speed = 40m/s
                        const speed = 40 * 60; // Distance moved per simulation tick
                        const t = Math.min(1.0, speed / dist);
                        caravan.position = {
                            x: (caravan.position?.x || village.x) + dx * t,
                            z: (caravan.position?.z || village.z) + dz * t
                        };
                    }
                }
            }

            if (caravan.status !== 'arrived') return;
            const destination = this.villages.find(candidate => candidate.id === caravan.targetVillageId);
            if (!destination) return;
            destination.stats = { ap: 0, food: 0, wood: 0, stone: 0, gold: 0, prosperity: 0, ...destination.stats };
            
            // --- PHASE 2: PAYLOAD BUFF ---
            // Because distance is 1:1 scale, increase cargo per trip
            const cargo = caravan.cargo || village.industry.produces;
            const amount = (caravan.amount || 1) * 10; 
            
            // --- PHASE 2: CARAVAN INTEL DELIVERY ---
            if (window.IntelPropagation) {
                const caravanIntel = window.IntelManager.getIntelForNode(caravan.id);
                window.IntelPropagation.bulkSyncToVillage(
                    { id: caravan.id, faction: village.territory.faction },
                    { id: `village_${destination.id}`, memory_limit: 50, faction: destination.territory.faction },
                    caravanIntel.map(i => i.intel_id)
                );
            }

            if ((village.stats[cargo] || 0) < amount) return;
            village.stats[cargo] -= amount;
            destination.stats[cargo] += amount;
            
            if (village.provision && (village.provisionStock?.[village.provision.itemId] || 0) > 0) {
                const provisionAmount = Math.min(amount, village.provisionStock[village.provision.itemId]);
                destination.provisionStock ??= {};
                destination.provisionStock[village.provision.itemId] = (destination.provisionStock[village.provision.itemId] || 0) + provisionAmount;
                village.provisionStock[village.provision.itemId] -= provisionAmount;
            }
            caravan.lastArrivalDay = window.EngineParams.worldDay;
            caravan.status = 'complete';
            window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} delivered ${amount} ${cargo} to ${destination.name}.`);
        });
    },
        launchHostileExpedition: function(village) {
        const isTerminus = village.industry?.mountainGatekeeper;
        const expedition = { id: `${village.id}-raid-${window.EngineParams.worldDay}-${village.expeditions.length + 1}`, type: isTerminus ? 'mountainIncursion' : 'forestRaid', status: 'raiding', targetVillageId: village.id, strength: isTerminus ? 4 : 2, launchedOnDay: window.EngineParams.worldDay };
        village.expeditions.push(expedition);
        for (let index = 0; index < expedition.strength; index++) {
            const angle = Math.random() * Math.PI * 2; const distance = village.territory.radius + 18 + Math.random() * 10;
            const x = village.x + Math.cos(angle) * distance; const z = village.z + Math.sin(angle) * distance;
            const raider = window.GameCore.instantiatePrefab(isTerminus && index === 0 ? 'Wendigo' : 'Flesh Horror', x, window.WorldGenerator.getTerrainHeight(x, z), z, 'persistent');
            if (raider) { raider.expeditionId = expedition.id; raider.targetVillageId = village.id; }
        }
                window.EventBus.emit('UI_LOG', isTerminus ? '[MOUNTAIN INCURSION] Terminus calls its martial houses to the gate.' : `[RAID] A forest expedition advances on ${village.name}.`);
    }
};

window.EventBus.on('ENGINE_READY', () => {
    if (window.VillageManager.initScheduler) {
        window.VillageManager.initScheduler();
    }
});





