imporhe void encursion should just t * as THREE from 'three';

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
        this.villages = []; let currentRadius = 0; let currentAngle = Math.random() * Math.PI * 2;
        const capitalPopulation = Math.floor(this.kingdomPopulation * this.capitalPopulationShare);
        const settlementPopulation = Math.floor((this.kingdomPopulation - capitalPopulation) / 19);
        let remainingPopulation = this.kingdomPopulation - capitalPopulation;
        for (let i = 0; i < 20; i++) {
            let x = 0, z = 0;
            if (i > 0) {
                const distanceStep = 10000 + (Math.random() * 10000); currentRadius += distanceStep; currentAngle += (Math.random() - 0.5) * (Math.PI / 1.5); 
                x = Math.cos(currentAngle) * currentRadius; z = Math.sin(currentAngle) * currentRadius;
            }
            let connections = []; if (i > 0) connections.push(i - 1); if (i < 19) connections.push(i + 1); 
            const population = i === 0 ? capitalPopulation : (i === 19 ? remainingPopulation : settlementPopulation);
            if (i > 0) remainingPopulation -= population;
            const profile = this.settlementProfiles[i];
            const provision = this.provisionProfiles[i];
            this.villages.push({ 
                id: i, name: i === 0 ? 'The Capital' : this.names[i - 1], x: Math.round(x), z: Math.round(z), 
                connections: connections, capital: i === 0, nobleHouse: profile.house, nobleLeader: profile.leader,
                nobleTitle: profile.title, industry: profile, provision, 
                provisionStock: { [provision.itemId]: Math.max(10, Math.floor(population / 100)) }, 
                territory: { faction: 'kingdom', radius: i === 0 ? 140 : 90, barrierRadius: i === 0 ? 140 : 90, control: 100, underRaid: false }, 
                barrierIntegrity: 100, expeditions: [], 
                stats: { ap: 50 + Math.floor(Math.random() * 50), food: population * 20, wood: population * 8, stone: population * 5, gold: population * 4, essence: 0, prosperity: 55 }, 
                population: { current: population, capacity: Math.ceil(population * 1.2) }, 
                expansionLevel: 0, squads: [], caravans: [], assignedModel: null, layout: [], residents: [],
                // --- EMERGENT DIPLOMACY ---
                relations: {}, // targetVillageId -> opinion score (-100 to 100)
                diplomaticState: {}, // targetVillageId -> 'allied' | 'neutral' | 'hostile'
                tensions: 0 // Overall house unrest (leads to Civil War)
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
        window.RoadManager.generateRoads(this.villages);
        window.EventBus.emit('UI_LOG', "🌲 20 Settlements generated. Road Network integrated.");
        if(window.EngineState.currentAssetTab === 'villages' || window.EngineState.currentAssetTab === 'world') window.EventBus.emit('RENDER_ASSETS');
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
        }
        
        this.simulationIndex = (this.simulationIndex + 1) % this.villages.length;
    },

    simulateVillage: function(village) {
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
        const production = Math.max(1, Math.floor(village.population.current / 1500));
        village.stats[village.industry.produces] += production;
        const essenceCost = Math.max(1, Math.ceil(village.population.current / 5000));
        village.barrierIntegrity = Math.max(0, (village.barrierIntegrity ?? 100) - essenceCost);
        if ((village.stats.essence || 0) >= essenceCost) {
            village.stats.essence -= essenceCost;
            village.barrierIntegrity = Math.min(100, village.barrierIntegrity + 8);
        } else if (village.barrierIntegrity === 0) {
            this.postVillageNeed(village, 'essence', essenceCost, 'fueling the rune barrier');
            if (Math.random() < 0.15) window.EventBus.emit('UI_LOG', `[BARRIER] ${village.name}'s ward is failing. Hunters must enter the woods.`);
        }
        village.provisionStock[village.provision.itemId] = (village.provisionStock[village.provision.itemId] || 0) + Math.max(1, Math.floor(production / 2));
        village.stats.food = Math.max(0, (village.stats.food || 0) - Math.ceil(village.population.current / 24));
        this.processVillageCaravans(village);

        const localRaiders = window.GameCore.activeEntities.filter(entity => entity.def.type === 'npc' && (entity.def.faction === 'monster' || entity.def.faction === 'forest') && Math.hypot(entity.visual.position.x - village.x, entity.visual.position.z - village.z) <= village.territory.radius);
        village.territory.underRaid = localRaiders.length > 0;

        // --- DIPLOMATIC IMPACT OF RAIDS (Shared Defense) ---
        if (village.territory.underRaid) {
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
        if (village.territory.underRaid) window.EventBus.emit('UI_LOG', `[RAID] ${village.name} is under attack by ${localRaiders.length} hostile creature${localRaiders.length === 1 ? '' : 's'}.`);
        const activeExpedition = village.expeditions.some(expedition => expedition.status === 'raiding');
        if (!village.territory.underRaid && !activeExpedition && Math.random() < (village.industry?.mountainGatekeeper ? 0.03 : 0.01)) this.launchHostileExpedition(village);
        if (village.territory.control === 0 && village.territory.faction === 'kingdom') {
            village.territory.faction = 'forest';
            village.territory.reclamation = { wood: 0, stone: 0, requiredWood: 50, requiredStone: 30 };
            village.stats.prosperity = Math.max(0, village.stats.prosperity - 25);
            this.postVillageNeed(village, 'wood', 50, 'reclaiming occupied territory');
            this.postVillageNeed(village, 'stone', 30, 'reclaiming occupied territory');
            window.EventBus.emit('UI_LOG', `[OCCUPIED] ${village.name} has fallen under forest control.`);
        }

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
            const growth = Math.min(village.population.capacity - village.population.current, Math.max(1, Math.floor(village.population.current * village.stats.prosperity / 10000)));
            village.population.current += growth;
            village.lastGrowthDay = window.EngineParams.worldDay;
            window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} gained ${growth} residents from prosperity.`);
        }

        if (village.stats.food < village.population.current * 3) {
            this.postVillageNeed(village, 'food', village.population.current * 5 - village.stats.food, 'feeding the settlement');
            return;
        }

        const expansionCost = { ap: 80, wood: 100, stone: 60, food: 30 };
        if (village.population.current >= village.population.capacity && this.canFundVillageAction(village, expansionCost, 'expansion')) {
            this.spendVillageResources(village, expansionCost);
            village.population.capacity += 6;
            village.expansionLevel = (village.expansionLevel || 0) + 1;
            village.layout.push({ id: `expansion-${village.expansionLevel}`, prefab: 'Watertight Gothic House', ox: 6 + village.expansionLevel * 3, oz: 0 });
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
                        window.EventBus.emit('UI_LOG', `[TERMINUS] A batch of ${batch.count} elite guards have finished training and joined the 300.`);
                    }
                }
            }
        }

        const caravanCost = { ap: 35, food: 15, gold: 20 };
        if (!village.caravans.some(caravan => caravan.status === 'traveling' || caravan.status === 'arrived') && freePopulation >= 1 && this.canFundVillageAction(village, caravanCost, 'sending a merchant caravan')) {
            this.spendVillageResources(village, caravanCost);
            const destination = this.villages.find(candidate => village.connections.includes(candidate.id) && candidate.industry && candidate.industry.imports.includes(village.industry.produces));
            const targetVillage = destination || this.villages.find(candidate => village.connections.includes(candidate.id));
            
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
    processVillageCaravans: function(village) {
        village.caravans.forEach(caravan => {
            if (caravan.status !== 'arrived') return;
            const destination = this.villages.find(candidate => candidate.id === caravan.targetVillageId);
            if (!destination) return;
            destination.stats = { ap: 0, food: 0, wood: 0, stone: 0, gold: 0, prosperity: 0, ...destination.stats };
            const cargo = caravan.cargo || village.industry.produces;
            const amount = caravan.amount || Math.max(1, Math.floor(village.population.current / 1000));
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
