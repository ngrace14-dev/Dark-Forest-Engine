import * as THREE from 'three';
import alea from 'alea'; // REPAIR: Explicit dependency import


window.VillageManager = {
    villages: [], kingdomPopulation: 250000, capitalPopulationShare: 0.25, 
    names: ["Oakhaven", "Gallows Hill", "Mire's Edge", "Blackwood", "Hollow Creek", "Ashen Hold", "Epitaph", "Crow's Perch", "Widow's Web", "Thornbury", "Gloomhaven", "Duskendale", "Grimsby", "Shadowfen", "Blighted Watch", "Bleakmire", "Wraith's End", "Cullfield", "Terminus"],
    
    // --- THE FIRST 20: FOREST & MOUNTAIN RING SETTLEMENTS (Bible §6, Codex §IV) ---
    settlementProfiles: [
        { house: 'House Aethel', leader: 'King Alaric', title: 'Monarch', tier: 'monarch', industry: 'Royal Crucible', produces: 'barrier_fuel', imports: ['food', 'tether_chains', 'pre_fuel_matrix'], capitalSeat: true },
        { house: 'House Oakheart', leader: 'Baron Kaelen Oakheart', title: 'War Master', tier: 'war_master', industry: '14-Day Shift Ironwood Harvesting', produces: 'ironwood', imports: ['food', 'stone'] },
        { house: 'House Gallows', leader: 'Baroness Isolde Gallows', title: 'War Master', tier: 'war_master', industry: 'Ironbark Runic Dust & Tethers', produces: 'runic_dust', imports: ['food', 'ironwood'] },
        { house: 'House Mire', leader: 'Elder Ystrid Mire', title: 'War Master', tier: 'war_master', industry: 'Toxic Reagents & Fungal Binders', produces: 'toxic_fungi', imports: ['food', 'tethers'] },
        { house: 'House Blackwood', leader: 'Duke Vane Blackwood', title: 'War Master', tier: 'war_master', industry: 'Deep Crust Slag-Weevil Fluid', produces: 'weevil_fluid', imports: ['food', 'ironwood'] },
        { house: 'House Hollow', leader: 'Baron Jonathan Hollow', title: 'War Master', tier: 'war_master', industry: 'Swamp-Gator Iron-Leather Seals', produces: 'gator_leather', imports: ['food', 'cold_resin'] },
        { house: 'House Ashen', leader: 'Duke Kenneth Ashen', title: 'War Master', tier: 'war_master', industry: 'Basalt Monolith Quarrying', produces: 'basalt_tablets', imports: ['food', 'ore'] },
        { house: 'House Epitaph', leader: 'Keeper Maelen', title: 'Chronicler', tier: 'chronicler', industry: '18k Objective Timeline Archives', produces: 'pre_fracture_records', imports: ['food', 'abyssal_oil'], hiddenGapKeeper: true, objectiveTimelineAnchor: true },
        { house: 'House Crow', leader: 'Master Corvus Crow', title: 'Whisper Master', tier: 'war_master', industry: 'Whisper Guild Intelligence', produces: 'intel', imports: ['food', 'tethers'] },
        { house: 'House Widow', leader: 'Duchess Genevieve Widow', title: 'War Master', tier: 'war_master', industry: 'Siphon-Vine Cold Resins', produces: 'cold_resin', imports: ['food', 'stone'] },
        { house: 'House Thorn', leader: 'Marquis Silas Thorn', title: 'War Master', tier: 'war_master', industry: 'Pacifying Wax & Smoke', produces: 'pacifying_wax', imports: ['food', 'toxic_fungi'] },
        { house: 'House Gloom', leader: 'Baron Julian Gloom', title: 'War Master', tier: 'war_master', industry: 'Gloom-Glass Alembics & Lenses', produces: 'gloom_glass', imports: ['food', 'sand'] },
        { house: 'House Dusken', leader: 'Baron Lysander Dusken', title: 'War Master', tier: 'war_master', industry: 'Kinetic Silk Weaving', produces: 'kinetic_silk', imports: ['monster_meat', 'barrier_fuel'] },
        { house: 'House Grim', leader: 'Baron Robert Grim', title: 'War Master', tier: 'war_master', industry: 'Grimsby Blast Foundries & 50-Ton Chains', produces: 'tether_chains', imports: ['ore', 'food'] },
        { house: 'House Shadowfen', leader: 'Duke Douglas Shadowfen', title: 'War Master', tier: 'war_master', industry: 'Pre-Fuel Matrix Synthesis', produces: 'pre_fuel_matrix', imports: ['toxic_fungi', 'cold_resin', 'weevil_fluid', 'pale_caps'] },
        { house: 'House Blightwatch', leader: 'Ranger General Cynthia Blightwatch', title: 'War Master', tier: 'war_master', industry: 'Ghost-Pine Conduit Rods', produces: 'conduit_rods', imports: ['food', 'cold_resin'] },
        { house: 'House Bleak', leader: 'Baron Nathan Bleak', title: 'War Master', tier: 'war_master', industry: 'Pale Cap Mushrooms & Titan Bones', produces: 'pale_caps', imports: ['food', 'tethers'] },
        { house: 'House Wraith', leader: 'Countess Morwenna Wraith', title: 'War Master', tier: 'war_master', industry: 'Abyssal Salvage & Deep Oil', produces: 'abyssal_oil', imports: ['tether_chains', 'ironwood'] },
        { house: 'House Cull', leader: 'Baron Walter Cull', title: 'War Master', tier: 'war_master', industry: 'Slaughter-Chutes & Adrenal Catalysts', produces: 'cardiac_catalysts', imports: ['food', 'kinetic_silk'] },
        { house: 'House Terminus', leader: 'High Marshal Vane', title: 'War Master', tier: 'war_master', industry: 'World\'s End Gate & Event Horizon Guard', produces: 'containment_defense', imports: ['food', 'tether_chains', 'pre_fuel_matrix'], mountainGatekeeper: true, martial: true, endgameGateway: true, basePower: 75, leaderPower: 90 }
    ],
    // --- THE HIDDEN 20: ENDLESS DUNES SETTLEMENTS (Bible §11, Laniakea Streamlines) ---
    duneSettlementProfiles: [
        { name: "Silt-Reach", river: "Stygian Artery", house: "House of Silt", leader: "Dredge-Master Vael", title: "Flotilla Master", industry: "Silt Dredging & Pre-Fracture Fossils", produces: "dredged_fossils", driftSpeed: 0.12 },
        { name: "Siphon-Wells", river: "Deep Mineral Aquifer", house: "Aquifer Guild", leader: "Well-Watcher Sura", title: "Aquifer Warden", industry: "Subterranean Wellhead & Cleaned Water Logistics", produces: "cleaned_water", driftSpeed: 0.08, isWaterChokepoint: true },
        { name: "Stygian Basin", river: "Stygian Artery", house: "Basin Compact", leader: "Navigator Kaelen", title: "Grand Pilot", industry: "Confluence Flotilla Assembly", produces: "rafted_timbers", driftSpeed: 0.15 },
        { name: "Dust-Haven", river: "Silt Veil", house: "Oasis Remnant", leader: "Matron Morwen", title: "Elder Keeper", industry: "Deep Sand Agriculture", produces: "sand_lichen", driftSpeed: 0.10 },
        { name: "The Glass Flotilla", river: "Vitreous Flow", house: "Vitreous Order", leader: "Master Cael", title: "Glass-Wright", industry: "Silica Condensers & Solar Distillation", produces: "cleaned_water", driftSpeed: 0.14, isCondenserHub: true },
        { name: "Salt-Marrow", river: "Brine Sub-Conduit", house: "Salt Syndicate", leader: "Brine-Lord Harl", title: "Warden of the Marrow", industry: "Brine Desalination & Mineral Salt", produces: "runic_salt", driftSpeed: 0.09, isDesalinationWorks: true },
        { name: "Filament Watch", river: "Northern Tributary", house: "Watchers of the Filament", leader: "Scout-Commander Thorne", title: "Watch Marshal", industry: "Streamline Surveying", produces: "star_charts", driftSpeed: 0.11 },
        { name: "Causal Drift", river: "Deep Aquifer Conduit", house: "Archival Remnant", leader: "Chronicler Elyse", title: "Keeper of the Drift", industry: "Pre-Fracture Vellum Preservation", produces: "pre_fracture_vellum", driftSpeed: 0.07 },
        { name: "Zephyr Bastion", river: "Windward Channel", house: "Zephyr Legion", leader: "Bastion-General Dane", title: "Wind Warden", industry: "Sand-Tide Fortification", produces: "chitin_shields", driftSpeed: 0.13 },
        { name: "Mirage End", river: "Outer Mirage Flow", house: "Mirage Seekers", leader: "Blind Navigator Oryn", title: "Mirage Weaver", industry: "Optical Sensory Distillation", produces: "sensory_void_shards", driftSpeed: 0.16 },
        { name: "Dune-Grave", river: "Titan Sump", house: "Bone Dredgers", leader: "Excavator Justin", title: "Deep Dredger", industry: "Subterranean Titan Bone Mining", produces: "titan_marrow", driftSpeed: 0.09 },
        { name: "Deep Aquifer", river: "Deep Aquifer Conduit", house: "Vault Custodians", leader: "Director Nathan", title: "Vault Keeper", industry: "Subterranean Vault Hydroponics", produces: "cave_algae", driftSpeed: 0.06 },
        { name: "Silt-Hollow", river: "Silt Veil", house: "Hollow Reeds", leader: "Elder Brenda", title: "Flotilla Scribe", industry: "Silt-Reed Weaving", produces: "reed_fiber", driftSpeed: 0.12 },
        { name: "The Churned Spire", river: "Southern Hydraulic Spine", house: "Spire Order", leader: "High Mason Kael", title: "Spire Master", industry: "Submerged Monolith Maintenance", produces: "monolith_rubbings", driftSpeed: 0.11 },
        { name: "Obsidian Outpost", river: "Stygian Artery", house: "Obsidian Site-9", leader: "Sub-Director Eric", title: "Acting Supervisor", industry: "Containment Reconnaissance", produces: "form_12b_ledgers", driftSpeed: 0.10 },
        { name: "Sand-Weave", river: "Spider-Aquifer", house: "Silk Drifters", leader: "Weaver Maya", title: "Master Weaver", industry: "Subterranean Sand-Silk Harvest", produces: "sand_silk", driftSpeed: 0.14 },
        { name: "The Sunken Vault", river: "Deep Mineral Aquifer", house: "Vault Preservers", leader: "Curator Devon", title: "Archivist-At-Large", industry: "Ancient Syntax Recovery", produces: "syntax_scrolls", driftSpeed: 0.07 },
        { name: "Caravan's Rest", river: "Central Drift Artery", house: "Nomad Coalition", leader: "Caravan-Master Jesse", title: "Great Wayfarer", industry: "Confluence Ration Curing", produces: "preserved_jerky", driftSpeed: 0.13 },
        { name: "Echo Basin", river: "Acoustic Caverns", house: "Resonance Guild", leader: "Harmonic Elder Clara", title: "Tuning Mistress", industry: "Subterranean Acoustic Surveying", produces: "harmonic_bells", driftSpeed: 0.09 },
        { name: "Vortex Point", river: "Horizon Inflow Sump", house: "Threshold Watch", leader: "Warden Travis", title: "Gate Pilot", industry: "Event Horizon Navigation", produces: "horizon_markers", driftSpeed: 0.18 }
    ],

    provisionProfiles: [
        { itemId: 'royal_spiced_wine', name: 'Royal Spiced Wine', heal: 30, buff: 'toughness', amount: 1, duration: 90 },
        { itemId: 'oakhaven_cider', name: 'Oakhaven Cider', heal: 32, buff: 'athletics', amount: 1, duration: 90 },
        { itemId: 'gallows_stew', name: 'Gallows Hunter Stew', heal: 34, buff: 'strength', amount: 1, duration: 100 },
        { itemId: 'mire_tea', name: 'Mire Herbal Tea', heal: 36, buff: 'meleeDef', amount: 1, duration: 100 },
        { itemId: 'blackwood_ale', name: 'Blackwood Iron Ale', heal: 38, buff: 'toughness', amount: 2, duration: 110 },
        { itemId: 'hollow_broth', name: 'Hollow Creek Broth', heal: 40, buff: 'dodge', amount: 2, duration: 110 },
        { itemId: 'ashen_roast', name: 'Ashen Hold Stone Roast', heal: 42, buff: 'strength', amount: 2, duration: 120 },
        { itemId: 'epitaph_quiet_draught', name: 'Epitaph Quiet Draught', heal: 44, buff: 'athletics', amount: 2, duration: 120 },
        { itemId: 'crow_coffee', name: 'Crow Perch Black Coffee', heal: 46, buff: 'dodge', amount: 2, duration: 130 },
        { itemId: 'widow_resin_wine', name: 'Widow Cold-Resin Wine', heal: 48, buff: 'meleeAtt', amount: 2, duration: 130 },
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
                region: (i === 19 || i === 7) ? 'mountain' : 'forest',
                isDuneSettlement: false,
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
                    essence: i === 0 ? 500 : 50, 
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

        // --- THE HIDDEN 20: ENDLESS DUNES RIVER-DRIFT SETTLEMENTS (Bible §11) ---
        const dunePopulationTotal = 120000;
        const duneSettlementPop = Math.floor(dunePopulationTotal / 20);

        for (let j = 0; j < 20; j++) {
            const id = 20 + j;
            const profile = this.duneSettlementProfiles[j];
            const pop = duneSettlementPop;

            this.villages.push({ 
                id: id, 
                name: profile.name, 
                x: 0, z: 0, // Set by shiftLocations along Laniakea streamlines
                connections: [], 
                capital: false, 
                region: 'dunes',
                isDuneSettlement: true,
                subterraneanRiver: profile.river,
                driftSpeed: profile.driftSpeed,
                streamlineVector: { x: 0, z: 0 },
                confluencePartners: [],
                nobleHouse: profile.house, 
                nobleLeader: profile.leader,
                nobleTitle: profile.title, 
                industry: profile, 
                provision: { itemId: 'dune_silt_ration', name: 'Dune Silt Ration', heal: 25, buff: 'toughness', amount: 1, duration: 60 },
                provisionStock: { 'dune_silt_ration': Math.max(10, Math.floor(pop / 100)) },
                territory: { faction: 'dune_tribes', radius: 100, barrierRadius: 100, control: 100, underRaid: false }, 
                mooringIntegrity: 100, // River tether strength against sand-ocean drift
                isMooringSevered: false,
                isLostInChurn: false,
                barrierIntegrity: 100,
                expeditions: [], 
                stats: { 
                    ap: 50, 
                    food: pop * 15, 
                    wood: pop * 2, 
                    stone: pop * 4, 
                    gold: pop * 2, 
                    water: pop * 10,
                    rawBrine: pop * 8,
                    cleanedWater: id === 21 ? 500 : 50, // Siphon-Wells holds central reservoir
                    dredgedRelics: 50,
                    essence: 0, 
                    prosperity: 50,
                    refinementStock: {
                        beast_bones: 0,
                        corrupted_resin: 0,
                        flesh_pods: 0
                    }
                }, 
                population: { current: pop, capacity: Math.ceil(pop * 1.2) }, 
                expansionLevel: 0, squads: [], caravans: [], assignedModel: null, layout: [], residents: [],
                quarters: new Map(),
                propertyRegistry: new Map(),
                archiveAccessControl: new Map(),
                relations: {}, 
                diplomaticState: {}, 
                tensions: 0,
                crisisLog: [],
                memoryProfile: {
                    caution: 0.5,
                    ambition: 0.3,
                    trustInCrown: 0.1,
                    tradeConfidence: 0.7,
                    expansionConfidence: 0.3
                },
                fuelNeed: 0, // Fuel-independent (moored to subterranean aquifer)
                waterNeed: Math.max(5, Math.ceil(pop / 3000) * 7), // Parody of fuelNeed
                waterQuotaFulfilled: true,
                feudalState: 'SOVEREIGN_FLOTILLA',
                deepReserves: null,
                activeObjectives: [],
                culture: {
                    traits: new Map(), 
                    dominantTrait: 'SURVIVALIST',
                    traditions: ['Silt Dredging', 'River Confluence Bazaar'],
                    lastAdaptationDay: 0
                },
                dna: window.GCO ? window.GCO.registerEntity(`village_${id}`, 'VILLAGE', {
                    industry: profile.industry,
                    traditions: ['Silt Dredging', 'River Confluence Bazaar'],
                    culture: [['SURVIVALISM', 0.9], ['NOMADISM', 0.7]]
                }) : null,
                currentTask: 'Drifting with Subterranean River', taskTarget: profile.river, taskReason: 'Hydraulic streamline drift toward Event Horizon.', taskTimestamp: Date.now()
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
        
        const terminus = this.villages.find(v => v.nobleHouse === 'House Terminus') || this.villages[19];
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
        
        // 3. Space out the remaining forest/mountain villages
        const middleNodes = this.villages.filter(v => !v.capital && v.nobleHouse !== 'House Terminus' && !v.isLakeAnchored && v.region !== 'dunes');
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

        // 3B. Endless Dunes: Position the 20 Dune Settlements along Laniakea hydraulic streamlines
        const duneNodes = this.villages.filter(v => v.region === 'dunes');
        const duneMinRadius = 350000; // 350 km (outside 280km mountain Event Horizon)
        const duneMaxRadius = 650000; // 650 km
        
        duneNodes.forEach((dv, idx) => {
            // Only set initial position if not already placed
            if (!dv.x && !dv.z) {
                const angle = (idx / duneNodes.length) * Math.PI * 2 + (prng ? (prng() - 0.5) * 0.2 : 0);
                const radius = duneMinRadius + ((idx * 15485863) % (duneMaxRadius - duneMinRadius));
                dv.x = Math.cos(angle) * radius;
                dv.z = Math.sin(angle) * radius;
            }
            
            // Update inward streamline flow vector pointing toward Forest Attractor (0, 0)
            const currentDist = Math.hypot(dv.x, dv.z) || 1;
            const speed = (dv.driftSpeed || 0.1) * 100; // Inward drift velocity
            dv.streamlineVector = {
                x: -(dv.x / currentDist) * speed,
                z: -(dv.z / currentDist) * speed
            };
        });

        // 4. Anchor Analysis: Sync with Force Manager
        if (window.ForceManager) {
            window.ForceManager.update(0);
        }

        // --- PHASE 4: REGISTER ANCHORS (Only Forest/Mountain settlements have basalt anchors) ---
        if (window.UrbanPlanning) {
            this.villages.filter(v => v.region !== 'dunes').forEach(v => {
                window.UrbanPlanning.registerAnchor(v.id, v.x, v.z);
            });
        }
        
        // 5. Regenerate the road network to match the chained Forest coordinates
        if (window.RoadManager && window.RoadManager.generateRoads) {
            const chained = this.villages.filter(v => v.region !== 'dunes');
            window.RoadManager.generateRoads(chained);
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
        
        // 1. BARRIER DECAY (Spatial State - Forest/Mountain settlements only)
        if (village.region === 'dunes') {
            village.barrierIntegrity = 100;
            return;
        }
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

        
};

window.EventBus.on('ENGINE_READY', () => {
    if (window.VillageManager.initScheduler) {
        window.VillageManager.initScheduler();
    }
});





