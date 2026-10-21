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
                // --- CULTURAL EVOLUTION (Phase 12) ---
                culture: {
                    traits: new Map(), // traitName -> { weight, level, description }
                    dominantTrait: 'NEUTRAL',
                    traditions: [],
                    lastAdaptationDay: 0
                },
                // Action Ledger Requirement

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
        
        window.EventBus.emit('UI_LOG', "🌲 The Village Chain has repositioned.");
    },


    // --- SIMULATION SLICING (Kenshi Style) ---
    // Instead of simulating all 20 villages at once, we do 1 per logic tick
    simulationIndex: 0,

    simulateNextVillage: function() {
        if (this.villages.length === 0) return;
        
        const village = this.villages[this.simulationIndex];
        if (village) {
            // Re-imported logic from src_engine.js
            window.VillageManager.simulateVillage(village);
            
            // --- PHASE 2: VILLAGE INTEL EXCHANGE ---
            this.processVillageIntelExchange(village);
        }
        
        this.simulationIndex = (this.simulationIndex + 1) % this.villages.length;
    },

        processVillageIntelExchange: function(village) {
        if (!window.IntelPropagation) return;

        // 1. Internal Spread (Gossip)
        // Residents exchange intel with the village hub
        village.residents.forEach(r => {
            const rIntel = window.IntelManager.getIntelForNode(r.id || `res_${village.id}_${r.ox}_${r.oz}`);
            rIntel.forEach(intel => {
                window.IntelPropagation.sync(
                    { id: r.id || 'res', faction: village.territory.faction },
                    { id: `village_${village.id}`, memory_limit: 50, faction: village.territory.faction },
                    intel.intel_id,
                    window.IntelEnums.VECTORS.GOSSIP
                );
            });
        });

                // 2. Hub to Outbound (Caravans/Couriers)
        // When a caravan is launched, it "loads" current village intel
        village.caravans.forEach(caravan => {
            if (caravan.status === 'traveling' && !caravan.intelLoaded) {
                const hubIntel = window.IntelManager.getIntelForNode(`village_${village.id}`);
                hubIntel.forEach(intel => {
                    window.IntelManager.grantOwnership(intel.intel_id, caravan.id);
                });
                caravan.intelLoaded = true;
                
                // --- THE RARE PART: Institutional Intelligence ---
                // If the caravan belongs to a specific House, it carries Institutional Intel too
                const houseId = `house_${village.nobleHouse.toLowerCase().replace('house ', '')}`;
                const house = window.DynastyManager?.getHouse(houseId);
                if (house) {
                    house.archives.forEach(intelId => {
                        window.IntelManager.grantOwnership(intelId, caravan.id);
                    });
                }
            }
        });
    },


        /**
     * Records a crisis event in institutional memory and adjusts the memory profile.
     */
    recordCrisis: function(village, type, severity = 1.0) {
        const entry = {
            type: type,
            day: window.EngineParams?.worldDay || 0,
            severity: severity
        };
        
        village.crisisLog.push(entry);
        
        // Node 2: Cultural Memory Transformation
        this.updateVillageCulture(village, type, severity);

        // LEARNING RULES (§3)

        const mem = village.memoryProfile;
        switch(type) {
            case 'FUEL_SHORTAGE':
                mem.caution = Math.min(1.0, mem.caution + 0.1 * severity);
                mem.expansionConfidence = Math.max(0.0, mem.expansionConfidence - 0.15 * severity);
                window.EventBus.emit('UI_LOG_DEBUG', `[GOVERNANCE] ${village.name} has become more cautious due to fuel shortages.`);
                break;
            case 'BARRIER_FAILURE':
                mem.caution = Math.min(1.0, mem.caution + 0.2 * severity);
                mem.trustInCrown = Math.max(0.0, mem.trustInCrown - 0.1 * severity);
                window.EventBus.emit('UI_LOG', `[GOVERNANCE] ${village.name}'s trust in the Crown has fallen after a barrier failure.`);
                break;
            case 'CARAVAN_LOSS':
                mem.tradeConfidence = Math.max(0.0, mem.tradeConfidence - 0.1 * severity);
                break;
        }
    },

    /**
     * Records successful periods to improve institutional confidence.
     */
    recordSuccess: function(village, type) {
        const mem = village.memoryProfile;
        switch(type) {
            case 'PROSPERITY':
                mem.ambition = Math.min(1.0, mem.ambition + 0.05);
                mem.expansionConfidence = Math.min(1.0, mem.expansionConfidence + 0.05);
                if (mem.ambition > 0.8 && Math.random() < 0.1) {
                    window.EventBus.emit('UI_LOG_DEBUG', `[GOVERNANCE] ${village.name} is seeking expansion after sustained prosperity.`);
                }
                break;
            case 'TRADE':
                mem.tradeConfidence = Math.min(1.0, mem.tradeConfidence + 0.05);
                break;
        }
    },

        /**
         * Node 1 & 7: Cultural Adaptation
         * Culture is inherited memory made habitual.
         */
        updateVillageCulture: function(village, eventType, impact) {
            if (!village.culture) return;
        
            const traits = village.culture.traits;
        
            // --- CULTURAL MEMORY: EVENT PERSISTENCE (Node 2) ---
            // Villages remember events that align with their local trauma/success
            if (!village.memory) village.memory = [];
            if (impact > 0.6) {
                village.memory.push({ eventType, day: window.EngineParams?.worldDay || 0, impact });
                // Prune to last 10 major memories
                if (village.memory.length > 10) village.memory.shift();
            }

            // --- CULTURAL MEMORY: PREFERENTIAL REMEMBERING (Node 4) ---

            // Events aligned with ethos get 2x cultural impact
            let ethosMultiplier = 1.0;
            if (village.culture.dominantTrait === 'MILITARISTIC' && eventType === 'RAID_REPELLED') ethosMultiplier = 2.0;
            if (village.culture.dominantTrait === 'STOCKPILING' && eventType === 'FUEL_SHORTAGE') ethosMultiplier = 2.0;

            // Repeated events reinforce specific traits
            switch(eventType) {
                case 'BARRIER_FAILURE':
                    this.reinforceCultureTrait(village, 'SURVIVALIST', impact * 0.2 * ethosMultiplier);
                    this.reinforceCultureTrait(village, 'CAUTIOUS', impact * 0.1 * ethosMultiplier);
                    break;
                case 'FUEL_SHORTAGE':
                    this.reinforceCultureTrait(village, 'STOCKPILING', impact * 0.15 * ethosMultiplier);
                    break;
                case 'TRADE_SUCCESS':
                    this.reinforceCultureTrait(village, 'MERCANTILE', impact * 0.1 * ethosMultiplier);
                    this.reinforceCultureTrait(village, 'EXPANSIONIST', impact * 0.05 * ethosMultiplier);
                    break;
                case 'RAID_REPELLED':
                    this.reinforceCultureTrait(village, 'MILITARISTIC', impact * 0.15 * ethosMultiplier);
                    break;
            }

            // Re-evaluate dominant trait
            this.evaluateDominantCulture(village);
        },


    reinforceCultureTrait: function(village, traitName, delta) {
        if (!village.culture.traits.has(traitName)) {
            village.culture.traits.set(traitName, { weight: 0.0, level: 0 });
        }
        const trait = village.culture.traits.get(traitName);
        trait.weight = Math.min(1.0, trait.weight + delta);
        trait.level = Math.floor(trait.weight * 5); // 0-5 tier system
    },

        evaluateDominantCulture: function(village) {
        let maxWeight = 0;
        let dominant = 'NEUTRAL';
        
        village.culture.traits.forEach((trait, name) => {
            if (trait.weight > maxWeight && trait.weight > 0.4) {
                maxWeight = trait.weight;
                dominant = name;
            }
        });

        if (village.culture.dominantTrait !== dominant) {
            const oldDominant = village.culture.dominantTrait;
            village.culture.dominantTrait = dominant;
            window.EventBus.emit('UI_LOG', `[CULTURE] ${village.name} has developed a ${dominant} culture.`);
            
            // Manifest Change
            if (oldDominant !== 'NEUTRAL') {
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: `CULTURE SHIFT: ${dominant}`, pos: { x: village.x, y: 10, z: village.z }, color: '#fbbf24' });
            }

            // Record transition in Chronicle
            window.ChronicleManager?.recordEvent({
                actorId: `village_${village.id}`,
                type: 'CULTURAL_SHIFT',
                detail: `${village.name} is now defined by its ${dominant} way of life.`,
                significance: 80,
                historicalWeight: 40
            });
        }
    },

    /**
     * Manifestation Rule: The world demonstrates.
     * Converts internal simulation states (Doubt, Schism, Culture) into 3D world consequences.
     */
        manifestVillageStates: function(village) {
        const houseId = `house_${village.nobleHouse.toLowerCase().replace('house ', '')}`;
        const house = window.DynastyManager?.getHouse(houseId);
        if (!house) return;

        // 1. INSTITUTIONAL DOUBT (Physical Signs: Public Arguments & Conflicting Bark)
        const hasDoubt = Array.from(house.beliefs.values()).some(b => b.state === 'DOUBTED' || b.state === 'PRIVATE_DOUBT');
        if (hasDoubt && Math.random() < 0.05) {
            const bark = window.FolkloreEngine?.getRandomBark('REVISIONAL') || "The old ways are failing...";
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[DOUBT] "${bark}"`, 
                pos: { x: village.x + (Math.random()-0.5)*10, y: 5, z: village.z + (Math.random()-0.5)*10 }, 
                color: '#f87171' 
            });
        }

        // 2. SCHISM (Physical Signs: Split Banners / Rival Bark)
        if (house.activeSchism && Math.random() < 0.1) {
            const faction = Math.random() > 0.5 ? 'REFORMIST' : 'TRADITIONALIST';
            const color = faction === 'REFORMIST' ? '#3b82f6' : '#f59e0b';
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[SCHISM] ${faction} recruiters active.`, 
                pos: { x: village.x, y: 8, z: village.z }, 
                color: color 
            });
            
            // --- MANIFESTATION RULE: COMPETING NOTICES (Node 2) ---
            if (Math.random() < 0.01) {
                window.EventBus.emit('UI_LOG', `[SCHISM] ${village.name} has posted conflicting bounties from ${faction} leadership.`);
            }
        }

        // 3. IDENTITY DRIFT (Physical Signs: Changed Priorities)
        if (house.identityDrift > 0.4 && Math.random() < 0.02) {
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[DRIFT] New Doctrine: ${house.currentIdentity.mission}`, 
                pos: { x: village.x, y: 14, z: village.z }, 
                color: '#818cf8' 
            });
        }

        // 4. CULTURE (Visible Priorities)
        if (village.culture.dominantTrait !== 'NEUTRAL' && Math.random() < 0.02) {
            let message = "";
            let color = "#94a3b8";
            switch(village.culture.dominantTrait) {
                case 'MILITARISTIC': 
                    message = "Militia drills in progress."; 
                    color = "#ef4444"; 
                    break;
                case 'STOCKPILING': 
                    message = "Granary expansion ongoing."; 
                    color = "#10b981"; 
                    break;
                case 'SURVIVALIST': 
                    message = "Rationing enforced."; 
                    color = "#d97706"; 
                    break;
                case 'MERCANTILE': 
                    message = "Trade fair preparation."; 
                    color = "#fbbf24"; 
                    break;
                case 'CAUTIOUS':
                    message = "Barrier inspection in progress.";
                    color = "#a855f7";
                    break;
            }
            if (message) {
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                    text: `[CULTURE] ${message}`, 
                    pos: { x: village.x, y: 12, z: village.z }, 
                    color: color 
                });
            }
        }

        // 5. LEGACY (Physical Signs: Inherited Workshops & Lineage)
        const leaderProfile = window.PersonhoodManager?.getProfile(house.currentLeader);
        if (leaderProfile && leaderProfile.ancestry.parents.length > 0 && Math.random() < 0.01) {
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[LEGACY] House ${house.name} relic displayed.`, 
                pos: { x: village.x, y: 16, z: village.z }, 
                color: '#fbbf24' 
            });
        }
    },

    simulateVillage: function(village) {

        const cal = window.CalibrationFramework?.settings || {};
        const econCal = cal.economy || { consumption: 1.0, scarcity: 1.0, tradeEfficiency: 1.0 };
        const worldCal = cal.world || { growthRate: 1.0, spawnRate: 1.0 };

        village.currentTask = 'Simulating';
        village.taskReason = 'Economic cycle processing.';
        village.taskTimestamp = Date.now();
        village.stats = { ap: 0, food: 0, wood: 0, stone: 0, gold: 0, essence: 0, ...village.stats };
        village.barrierIntegrity ??= 100;
        village.population ??= { current: 8, capacity: 12 };
        village.squads ??= [];
        village.caravans ??= [];
        village.expeditions ??= [];
        village.residents ??= [];
        village.industry ??= this.settlementProfiles[village.id];
        village.provision ??= this.provisionProfiles[village.id];
        village.provisionStock ??= { [village.provision.itemId]: 0 };
        village.territory ??= { faction: 'kingdom', radius: village.capital ? 140 : 90, control: 100, underRaid: false };
        village.stats.ap = Math.min(200, (village.stats.ap || 0) + 10);

                // --- CROWN FUEL DISPATCH (STAGE 1: THE POLITICAL HEART) ---
                if (village.capital) {
                    this.processCrownGovernance(village);
                } else {
                    // Village Need Detection
                    if (village.stats.essence < 5 && !village.fuelRequested) {
                        village.fuelRequested = true;
                        window.EventBus.emit('UI_LOG', `[FUEL] ${village.name} is running low on essence. The barrier is flickering.`);
                
                        // --- PHASE 3: RECORD FUEL SHORTAGE ---
                        this.recordCrisis(village, 'FUEL_SHORTAGE', 0.5);
                    }

                    // --- PHASE 2: HUB MATERIAL COLLECTION ---
                    // If the village has accumulated monster materials, load them into an outbound caravan
                    const totalStock = (village.stats.refinementStock.beast_bones || 0) + 
                                       (village.stats.refinementStock.corrupted_resin || 0) + 
                                       (village.stats.refinementStock.flesh_pods || 0);
            
                    // --- PHASE 3: ADAPTIVE TRADING ---
                    // Cautious villages save materials for themselves or prioritize essence-only trade
                    const launchThreshold = village.memoryProfile.caution > 0.6 ? 100 : 50;

                    if (totalStock > launchThreshold && !village.caravans.some(c => c.targetVillageId === 0)) {
                        this.launchRefinementSupplyCaravan(village);
                    }
                }

                // --- PHASE 4: FEUDAL DEPENDENCY & LOYALTY ---
                this.processFeudalLoyalty(village);

        
                const production = Math.max(1, Math.floor((village.population.current / 1500) * worldCal.growthRate));
                village.stats[village.industry.produces] += production;
        
                // --- PHASE 1: SCALING MAINTENANCE ---
                // Base cost * (1 + expansionLevel)
                let baseEssenceCost = Math.max(1, Math.ceil(village.population.current / 5000));
        
                // --- PHASE 11: LORE-DRIVEN EFFICIENCY (House Terminus) ---
                if (village.nobleHouse === 'House Terminus') {
                    baseEssenceCost *= 0.5; // 50% reduction for ancient armor and geographic stability
                }

                // Node 2 & 10: Cultural Buffs (Validation Trace)
                if (village.culture?.dominantTrait === 'SURVIVALIST') {
                    baseEssenceCost *= 0.8; // Survivalists are efficient with resources
                }
                if (village.culture?.dominantTrait === 'STOCKPILING' && village.stats.essence < 5) {
                    // Stockpiling culture doubles the urgency of requests
                    village.fuelRequested = true;
                }

        
                const essenceCost = baseEssenceCost * (1 + (village.expansionLevel || 0));
        
                village.fuelNeed = essenceCost; // Store for feedback
                village.barrierIntegrity = Math.max(0, (village.barrierIntegrity ?? 100) - essenceCost);
        
                // --- DREAM PHASE 1: ROOTS INTEGRATION (Barrier Maintenance) ---
        // Bible §10, §21: If the village leader has a ROOTS dream, maintenance is more efficient.
        let maintenanceBonus = 0;
        if (window.DreamManager && village.nobleLeader) {
            const mod = window.DreamManager.getNPCDriveModifier(`village_leader_${village.id}`, 'fortification');
            if (mod > 1.0) {
                maintenanceBonus = Math.floor(mod * 2);
            }
        }

                                if ((village.stats.essence || 0) >= essenceCost) {
            village.stats.essence -= essenceCost;
            village.barrierIntegrity = Math.min(100, village.barrierIntegrity + 8 + maintenanceBonus);
        } else if (village.barrierIntegrity === 0) {
            // --- GOVERNANCE MEMORY: CRISIS RECORD ---
            this.recordCrisis(village, 'BARRIER_FAILURE', 1.0);

            this.postVillageNeed(village, 'essence', essenceCost, 'fueling the rune barrier');
                        if (Math.random() < 0.15 * (cal.monsters?.spawnFrequency || 1.0)) {
                window.EventBus.emit('UI_LOG', `[BARRIER] ${village.name}'s ward is failing. Hunters must enter the woods.`);
                
                // --- PHASE 1A: CHRONICLE ACTIVATION ---
                window.ChronicleManager?.recordEvent?.({
                    actorId: `village_${village.id}`,
                    type: 'barrier_failure',
                    detail: `${village.name}'s protective barrier flickered and failed.`,
                    significance: 60,
                    historicalWeight: 20,
                    location: { x: village.x, z: village.z }
                });
            }

        }

        village.provisionStock[village.provision.itemId] = (village.provisionStock[village.provision.itemId] || 0) + Math.max(1, Math.floor(production / 2));
        
        const consumptionBase = Math.ceil(village.population.current / 24);
        village.stats.food = Math.max(0, (village.stats.food || 0) - Math.ceil(consumptionBase * econCal.consumption));
        this.processVillageCaravans(village);

        // --- PHASE 3: DISTANT WAR RESOLUTION ---
        if (window.WarManager && window.WarManager.resolveDistantExpeditions) {
            window.WarManager.resolveDistantExpeditions(village);
        }

        const localRaiders = window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && Math.hypot(entity.visual.position.x - village.x, entity.visual.position.z - village.z) <= village.territory.radius);

        village.territory.underRaid = localRaiders.length > 0;

                // --- DIPLOMATIC IMPACT OF RAIDS (Shared Defense) ---
        if (village.territory.underRaid) {
            village.currentTask = 'Defending';
            village.taskTarget = 'City Walls';
            village.taskReason = 'Repelling forest incursions.';
            
            // --- PLAYER INTEGRATION: CULTURAL IMPACT (Node 6) ---
            const playerNear = window.GameCore.playerObj && 
                               Math.hypot(window.GameCore.playerObj.visual.position.x - village.x, 
                                          window.GameCore.playerObj.visual.position.z - village.z) < 100;
            
            if (playerNear) {
                // Repeated monster defense reinforces MILITARISTIC culture
                this.updateVillageCulture(village, 'RAID_REPELLED', 0.5);
                window.EventBus.emit('UI_LOG_DEBUG', `[CULTURE] Player's defense of ${village.name} is reshaping its ethos.`);
            }

            // Impact is scaled: Only a "Walking Calamity" (Renown > 500) has Monarch-level impact

            const playerImpactScale = (window.GameState.renown.score > 500) ? 5.0 : 1.0;

            // Nearby houses grow closer when defending against the forest
            this.villages.forEach(other => {
                if (other.id !== village.id && Math.hypot(other.x - village.x, other.z - village.z) < 20000) {
                    other.relations[village.id] = Math.min(100, (other.relations[village.id] || 0) + 1 * playerImpactScale);
                }
            });
            // Tensions increase if the Crown doesn't help
            village.tensions = Math.min(100, (village.tensions || 0) + 0.5);
        }

        village.territory.control = Math.max(0, Math.min(100, village.territory.control + (village.territory.underRaid ? -localRaiders.length * 2 : 1)));
        
        // --- PHYSICAL MANIFESTATIONS (Phase 6: Manifestations) ---
        this.manifestVillageStates(village);

        // --- PHASE 6: ECONOMIC CRISES ---
        this.processEconomicCrises(village);

        const importGoal = Math.ceil(village.population.current * 0.5);
        const suppliedImports = village.industry.imports.filter(resource => (village.stats[resource] || 0) >= importGoal);
        village.industry.imports.forEach(resource => {
            if ((village.stats[resource] || 0) < importGoal) this.postVillageNeed(village, resource, importGoal - (village.stats[resource] || 0), `supporting ${village.industry.industry}`);
        });
        const connectedTrade = village.caravans.some(caravan => caravan.status === 'traveling' || caravan.status === 'arrived') || this.villages.some(candidate => candidate.caravans && candidate.caravans.some(caravan => (caravan.status === 'traveling' || caravan.status === 'arrived') && caravan.targetVillageId === village.id));
        const foodSecurity = Math.min(25, Math.floor((village.stats.food / Math.max(1, village.population.current * 5)) * 25));
        const tradeDisruption = village.tradeDisruptionUntil > window.EngineParams.worldDay ? 30 : 0;
        village.stats.prosperity = Math.max(0, Math.min(100, 20 + foodSecurity + suppliedImports.length * 15 + (connectedTrade ? 25 : 0) - tradeDisruption));

                if (village.lastGrowthDay !== window.EngineParams.worldDay && village.population.current < village.population.capacity && village.stats.prosperity >= 70 && village.stats.food >= village.population.current * 8) {
            const growth = Math.min(village.population.capacity - village.population.current, Math.max(1, Math.floor((village.population.current * village.stats.prosperity / 10000) * worldCal.growthRate)));
            village.population.current += growth;
            village.lastGrowthDay = window.EngineParams.worldDay;
            
            // --- PHASE 1A: CHRONICLE ACTIVATION ---
            if (village.population.current > 10000 && !village.recordedMajorMilestone) {
                village.recordedMajorMilestone = true;
                window.ChronicleManager?.recordEvent?.({
                    actorId: `village_${village.id}`,
                    type: 'growth_milestone',
                    detail: `${village.name} has grown into a significant regional hub with ${village.population.current} souls.`,
                    significance: 100,
                    historicalWeight: 50,
                    location: { x: village.x, z: village.z }
                });
            }



            window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} gained ${growth} residents from prosperity.`);
        }

        if (village.stats.food < village.population.current * 3) {
            this.postVillageNeed(village, 'food', village.population.current * 5 - village.stats.food, 'feeding the settlement');
            return;
        }

                const expansionCost = { ap: 80, wood: 100, stone: 60, food: 30 };
        
        // --- PHASE 3: ADAPTIVE GROWTH ---
        // Villages only expand if expansionConfidence is high and caution is low
        const willingnessToExpand = (village.memoryProfile.expansionConfidence * 2.0) - village.memoryProfile.caution;

        if (village.population.current >= village.population.capacity && willingnessToExpand > 0.5 && this.canFundVillageAction(village, expansionCost, 'expansion')) {
            this.spendVillageResources(village, expansionCost);
            village.population.capacity += 6;
            village.expansionLevel = (village.expansionLevel || 0) + 1;
            village.layout.push({ id: `expansion-${village.expansionLevel}`, prefab: 'Watertight Gothic House', ox: 6 + village.expansionLevel * 3, oz: 0 });
            
            // --- RECORD SUCCESS ---
            this.recordSuccess(village, 'PROSPERITY');
            
            window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} expanded to house ${village.population.capacity} people.`);
            return;
        }

        const squadCost = { ap: 50, food: 20, wood: 10 };
        const freePopulation = village.population.current - village.squads.length * 3 - village.caravans.length;
        const maxSquads = Math.max(1, Math.min(20, Math.floor(village.population.current / 5000)));
        if (village.squads.length < maxSquads) {
            if (freePopulation < 3) {
                this.postVillageNeed(village, 'population', 3 - Math.max(0, freePopulation), 'raising a guard squad');
                return;
            }
            if (this.canFundVillageAction(village, squadCost, 'raising a guard squad')) {
                this.spendVillageResources(village, squadCost);
                const squadId = `${village.id}-squad-${village.squads.length + 1}`;
                village.squads.push({ id: squadId, type: 'guard', size: 3, casualties: 0, status: 'patrolling', patrolPhase: 0 });
                for (let index = 0; index < 3; index++) village.residents.push({ prefab: 'Guard', ox: 4 + index * 2, oz: 4, squadId });
                window.EventBus.emit('UI_LOG', `[DEFENSE] ${village.name} formed a new guard squad.`);
                return;
            }
        }












                // --- MILITARY MOBILIZATION & HOUSE LEVIES ---
        if (village.capital) {
            // Monarch grows to 10k, starts with 500
            village.royalArmySize = Math.min(10000, (village.royalArmySize || 500) + (village.stats.prosperity / 20));
        } else {
            // War Masters grow to 2500 per noble house
            village.nobleLevySize = Math.min(2500, (village.nobleLevySize || 50) + (village.stats.prosperity / 40));
            
            // Special Exception: House Terminus Mountain Guard
            if (village.nobleHouse === 'House Terminus') {
                // --- TERMINUS DEEP RESERVE CONSUMPTION ---
                // If village resources are empty, the 300 consume from Deep Reserves
                if (village.stats.food <= 0 && village.deepReserves.food > 0) {
                    const consumption = Math.ceil(village.terminusEliteGuard / 100);
                    village.deepReserves.food = Math.max(0, village.deepReserves.food - consumption);
                    if (Math.random() < 0.01) window.EventBus.emit('UI_LOG_DEBUG', `[TERMINUS] The 300 are drawing from deep mountain stores.`);
                }

                // Initialize if needed
                village.terminusEliteGuard ??= 300;
                village.terminusRecruits ??= []; // [{ xp: 0, count: 5 }]

                const deficit = 300 - village.terminusEliteGuard;
                if (deficit > 0 && village.nobleLevySize > 0) {
                    // Pull from noble levies to start training
                    const intake = Math.min(deficit, Math.ceil(village.nobleLevySize * 0.1));
                    village.nobleLevySize -= intake;
                    village.terminusRecruits.push({ xp: 0, count: intake });
                    if (Math.random() < 0.1) window.EventBus.emit('UI_LOG', `[TERMINUS] ${intake} new recruits have begun the grueling mountain training.`);
                }

                // Process Training XP
                for (let i = village.terminusRecruits.length - 1; i >= 0; i--) {
                    const batch = village.terminusRecruits[i];
                    batch.xp += 5 + (village.stats.prosperity / 20); // Prosperous villages train faster
            if (batch.xp >= 100) {
                village.terminusEliteGuard = Math.min(300, village.terminusEliteGuard + batch.count);
                village.terminusRecruits.splice(i, 1);
                
                                window.ChronicleManager.recordEvent({
                    actorId: `village_${village.id}`,
                    type: 'elite_training',
                    detail: `The Elite 300 of Terminus has been bolstered by ${batch.count} new guards.`,
                    significance: 50,
                    historicalWeight: 20,
                    witnesses: [`village_${village.id}`, 'House Terminus']
                });


                window.EventBus.emit('UI_LOG', `[TERMINUS] A batch of ${batch.count} elite guards have finished training and joined the 300.`);
            }
                }
            }
        }

                const caravanCost = { ap: 35, food: 15, gold: 20 };
        
        // --- DREAM PHASE 2: CROWN INTEGRATION (Leadership Initiative) ---
        // Bible §20: CROWN dreams reduce AP cost for caravans, allowing more frequent trade.
        let initiativeDiscount = 0;
        if (window.DreamManager && village.nobleLeader) {
            const authorityMod = window.DreamManager.getNPCDriveModifier(`village_leader_${village.id}`, 'authority');
            if (authorityMod > 1.2) initiativeDiscount = 10;
        }

        const finalCost = { ...caravanCost, ap: Math.max(10, caravanCost.ap - initiativeDiscount) };

        if (!village.caravans.some(caravan => caravan.status === 'traveling' || caravan.status === 'arrived') && freePopulation >= 1 && this.canFundVillageAction(village, finalCost, 'sending a merchant caravan')) {
            this.spendVillageResources(village, finalCost);

            const destination = this.villages.find(candidate => village.connections.includes(candidate.id) && candidate.industry && candidate.industry.imports.includes(village.industry.produces));
            const targetVillage = destination || this.villages.find(candidate => village.connections.includes(candidate.id));
            
            village.currentTask = 'Trading';
            village.taskTarget = targetVillage?.name || 'Unknown';
            village.taskReason = 'Dispatching wealth for prosperity.';

            // --- DIPLOMATIC IMPACT OF TRADE ---
            if (targetVillage) {
                village.relations[targetVillage.id] = Math.min(100, (village.relations[targetVillage.id] || 0) + 2);
                targetVillage.relations[village.id] = Math.min(100, (targetVillage.relations[village.id] || 0) + 2);
            }

            const caravan = { id: `${village.id}-caravan-${window.EngineParams.worldDay}-${village.caravans.length + 1}`, status: 'traveling', targetVillageId: targetVillage.id, cargo: village.industry.produces, amount: Math.max(1, Math.floor(village.population.current / 1000)), launchedOnDay: window.EngineParams.worldDay };
            village.caravans.push(caravan);
            const caravanEntity = window.GameCore.instantiatePrefab('Merchant Caravan', village.x + 3, window.WorldGenerator.getTerrainHeight(village.x + 3, village.z), village.z, 'persistent');
            if (caravanEntity) { caravanEntity.caravanId = caravan.id; caravanEntity.villageId = village.id; }
            window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} dispatched a merchant caravan.`);
        }
    },

        processEconomicCrises: function(village) {
                this.crises = village.crises || [];
        
        // --- MONOPOLY PHASE 2: BLESSED PAYLOAD (§19) ---
        // Bible §19: Blessed Houses hold monopolies that generate prosperity.
        const house = window.DynastyManager?.houses.get(`house_${village.nobleHouse.toLowerCase().replace('house ', '')}`);
        if (house && house.isBlessed) {
            village.stats.gold += 100; // Monopoly Gold Payload
            village.stats.prosperity = Math.min(100, village.stats.prosperity + 2);
            if (Math.random() < 0.01) {
                window.EventBus.emit('UI_LOG_DEBUG', `[ECONOMY] ${village.name} prospers under the ${house.name} monopoly.`);
            }
        }

        // --- MONOPOLY PHASE 2: AGITATOR RUMORS (§19) ---
        // Bible §19: Unblessed Houses act as economic agitators.
        if (house && !house.isBlessed) {
            if (Math.random() < 0.05) { // 5% chance per tick to generate an agitator rumor
                this.generateSmugglingRumor(village, house);
            }
        }

        // 1. Famine Check

        if (village.stats.food < village.population.current * 2) {
            if (!village.crises.includes('Famine')) {
                village.crises.push('Famine');
                window.EventBus.emit('UI_LOG', `[ECONOMY] ${village.name} is suffering from FAMINE.`);
                
                // --- PHASE 1A: CHRONICLE ACTIVATION ---
                window.ChronicleManager?.recordEvent?.({
                    actorId: `village_${village.id}`,
                    type: 'famine_start',
                    detail: `${village.name} has run out of food reserves.`,
                    significance: 80,
                    historicalWeight: 40,
                    location: { x: village.x, z: village.z }
                });
            }
            village.stats.prosperity = Math.max(0, village.stats.prosperity - 2);
            village.population.current = Math.max(10, village.population.current - Math.ceil(village.population.current * 0.01));
        } else {
            village.crises = village.crises.filter(c => c !== 'Famine');
        }


        // 2. Resource Monopoly Bonus/Malus
        // If a village produces a resource that everyone wants but no one else has
        const industry = village.industry.produces;
        const competitors = this.villages.filter(v => v.id !== village.id && v.industry.produces === industry).length;
        if (competitors === 0) {
            village.stats.gold += 50; // Monopoly premium
            village.hasMonopoly = true;
        } else {
            village.hasMonopoly = false;
        }
    },

    postVillageNeed: function(village, resource, amount, purpose) {
        const existing = window.GameState.questBoard.find(quest => quest.issuer === village.id && quest.resource === resource && quest.purpose === purpose);
        if (existing) return;
        window.GameState.questBoard.push({ type: 'fetch', issuer: village.id, resource, amount, purpose, reward: Math.max(20, amount * 2) });
        window.EventBus.emit('UI_LOG', `[REQUEST] ${village.name} needs ${amount} ${resource} for ${purpose}.`);
    },
    canFundVillageAction: function(village, cost, purpose) {
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
     * Dispatches a caravan from a village to the Capital to deliver raw materials.
     */
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
    },

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
    },

    /**
     * Audit Monopoly status across all Houses (Bible §19).
     * Calculates Institutional Scores and handles Blessed reassignments.
     * Runs once per 14-day Shift.
     */
    auditMonopolies: function() {
        if (!window.DynastyManager || !window.ChronicleManager) return;

        const houses = Array.from(window.DynastyManager.houses.values());
        const scores = new Map();

        // 1. Calculate Institutional Scores
        houses.forEach(h => {
            // A. Prestige (40%)
            const prestigeScore = (h.prestige / 1000) * 40;

            // B. Prosperity (30%)
            // Find villages associated with this house
            const houseVillages = this.villages.filter(v => v.nobleHouse === h.name);
            const avgProsperity = houseVillages.length > 0 ? 
                (houseVillages.reduce((sum, v) => sum + v.stats.prosperity, 0) / houseVillages.length) : 50;
            const prosperityScore = (avgProsperity / 100) * 30;

            // C. Trade Volume (20%)
            // Estimate based on active caravans and completed deliveries
            const tradeCount = houseVillages.reduce((sum, v) => sum + v.caravans.length, 0);
            const tradeScore = Math.min(20, tradeCount * 2);

            // D. Truth Density (10%)
            const truthScore = Math.min(10, h.archives.length * 2);

            const totalScore = prestigeScore + prosperityScore + tradeScore + truthScore;
            scores.set(h.id, totalScore);
            h._lastInstitutionalScore = totalScore; // For Crow's Eye display
        });

        // 2. Identify Reassignment Candidates
        const blessed = houses.filter(h => h.isBlessed).sort((a, b) => scores.get(a.id) - scores.get(b.id));
        const unblessed = houses.filter(h => !h.isBlessed).sort((a, b) => scores.get(b.id) - scores.get(a.id));

        if (blessed.length === 0 || unblessed.length === 0) return;

        const weakestBlessed = blessed[0];
        const strongestUnblessed = unblessed[0];

        const weakScore = scores.get(weakestBlessed.id);
        const strongScore = scores.get(strongestUnblessed.id);

        // 3. Reassign if Candidate > Blessed by 20%
        if (strongScore > weakScore * 1.20) {
            window.EventBus.emit('UI_LOG', `[POLITICS] The Crown is reviewing the Blessed Spots...`);
            
            // Reassignment (Limit: 1 per Shift)
            window.DynastyManager.setBlessedStatus(weakestBlessed.id, false);
            window.DynastyManager.setBlessedStatus(strongestUnblessed.id, true);

            window.ChronicleManager.recordEvent({
                actorId: 'The Capital',
                type: 'ROYAL_DECREE',
                detail: `By Decree of King Alaric, the Blessed Spot held by ${weakestBlessed.name} has been transferred to ${strongestUnblessed.name}.`,
                significance: 200,
                historicalWeight: 150
            });
        }
    }
};




