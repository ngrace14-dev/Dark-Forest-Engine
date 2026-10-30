/**
 * DARK FOREST ENGINE - VILLAGE INSTITUTIONS (Tier 4)
 * 
 * Handles institutional memory, cultural evolution, and political agency.
 * Decoupled from VillageManager God Object.
 */

window.VillageInstitutions = {
    init: function() {
        console.log("%c🟢 Village Institutions System Initialized", "color: #60a5fa; font-weight: bold;");
        
        // Tier 6H: Institutional Review (Every 6 hours)
        window.EventBus.on('HEARTBEAT_T6H', () => {
            if (window.VillageManager?.villages) {
                window.VillageManager.villages.forEach(v => {
                    this.updateInstitutionalObjectives(v);
                    this.processFeudalLoyalty(v);
                    if (v.capital) this.processCrownGovernance(v);
                });
            }
        });

        // Tier 12H: Daily Manifestation of states
        window.EventBus.on('HEARTBEAT_T12H', () => {
            if (window.VillageManager?.villages) {
                window.VillageManager.villages.forEach(v => this.manifestVillageStates(v));
            }
        });
    },

    recordCrisis: function(village, type, severity = 1.0) {
        const entry = { type, day: window.EngineParams?.worldDay || 0, severity };
        village.crisisLog ??= [];
        village.crisisLog.push(entry);
        this.updateVillageCulture(village, type, severity);

        const mem = village.memoryProfile;
        if (!mem) return;

        switch(type) {
            case 'FUEL_SHORTAGE':
                mem.caution = Math.min(1.0, mem.caution + 0.1 * severity);
                mem.expansionConfidence = Math.max(0.0, mem.expansionConfidence - 0.15 * severity);
                break;
            case 'BARRIER_FAILURE':
                mem.caution = Math.min(1.0, mem.caution + 0.2 * severity);
                mem.trustInCrown = Math.max(0.0, mem.trustInCrown - 0.1 * severity);
                break;
        }
    },

    recordSuccess: function(village, type) {
        const mem = village.memoryProfile;
        if (!mem) return;

        switch(type) {
            case 'PROSPERITY':
                mem.ambition = Math.min(1.0, mem.ambition + 0.05);
                mem.expansionConfidence = Math.min(1.0, mem.expansionConfidence + 0.05);
                break;
            case 'TRADE':
                mem.tradeConfidence = Math.min(1.0, mem.tradeConfidence + 0.05);
                break;
        }
    },

    updateVillageCulture: function(village, eventType, impact) {
        if (!village.culture) return;
        
        let ethosMultiplier = 1.0;
        if (village.culture.dominantTrait === 'MILITARISTIC' && eventType === 'RAID_REPELLED') ethosMultiplier = 2.0;

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
                break;
        }
        this.evaluateDominantCulture(village);
    },

    reinforceCultureTrait: function(village, traitName, delta) {
        if (!village.culture.traits.has(traitName)) {
            village.culture.traits.set(traitName, { weight: 0.0, level: 0 });
        }
        const trait = village.culture.traits.get(traitName);
        trait.weight = Math.min(1.0, trait.weight + delta);
        trait.level = Math.floor(trait.weight * 5);
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
            village.culture.dominantTrait = dominant;
            window.EventBus.emit('UI_LOG', `[CULTURE] ${village.name} has developed a ${dominant} culture.`);
        }
    },

    processCrownGovernance: function(capital) {
        const stock = capital.stats.refinementStock;
        const totalMaterials = (stock.beast_bones || 0) + (stock.corrupted_resin || 0) + (stock.flesh_pods || 0);
        
        if (totalMaterials >= 10) {
            let processed = 0;
            if (stock.beast_bones >= 10) { stock.beast_bones -= 10; processed = 1; }
            else if (stock.corrupted_resin >= 10) { stock.corrupted_resin -= 10; processed = 1; }
            
            if (processed > 0) capital.stats.essence += processed;
        }

        if (totalMaterials < 100) {
            this.generateHuntContract(capital, Math.floor((100 - totalMaterials) / 2));
        }

        const candidates = window.VillageManager.villages.filter(v => v.id !== 0 && v.fuelRequested);
        if (candidates.length === 0 || capital.stats.essence < 10) return;

        candidates.sort((a, b) => {
            const scoreA = (100 - a.barrierIntegrity) * 2 + (a.relations[0] || 0);
            const scoreB = (100 - b.barrierIntegrity) * 2 + (b.relations[0] || 0);
            return scoreB - scoreA;
        });

        const target = candidates[0];
        if ((target.relations[0] || 0) < -20) return;

        const amount = 10;
        capital.stats.essence -= amount;
        target.fuelRequested = false;

        const caravan = { 
            id: `crown-fuel-${window.EngineParams.worldDay}-${Date.now()}`, 
            status: 'traveling', 
            targetVillageId: target.id, 
            cargo: 'essence', 
            amount: amount, 
            launchedOnDay: window.EngineParams.worldDay 
        };
        capital.caravans.push(caravan);
        window.EventBus.emit('UI_LOG', `[CROWN] Royal shipment of ${amount} essence dispatched to ${target.name}.`);
    },

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
            reward: 100 + urgencyBonus
        });
    },

    processFeudalLoyalty: function(village) {
        if (village.capital) return;
        const memory = village.memoryProfile;
        if (!memory) return;

        if (memory.trustInCrown < 0.3 && memory.ambition > 0.7) {
            if (village.feudalState !== 'INDEPENDENT') {
                village.feudalState = 'INDEPENDENT';
                window.EventBus.emit('UI_LOG', `[POLITICS] ${village.name} has declared economic independence.`);
            }
        }
    },

    updateInstitutionalObjectives: function(village) {
        if (village.activeObjectives?.length > 0) return;
        if (village.capital) {
            const rebels = window.VillageManager.villages.filter(v => v.feudalState === 'INDEPENDENT');
            if (rebels.length > 0) this.generateObjective(village, 'SUPPRESSION', rebels[0].id);
        }
    },

    generateObjective: function(village, type, target) {
        village.activeObjectives ??= [];
        village.activeObjectives.push({ id: `obj-${village.id}-${Date.now()}`, type, target, progress: 0, status: 'ACTIVE' });
    },

    manifestVillageStates: function(village) {
        if (village.culture?.dominantTrait !== 'NEUTRAL' && Math.random() < 0.05) {
            window.EventBus.emit('SPAWN_FLOATING_TEXT', { 
                text: `[${village.culture.dominantTrait}]`, 
                pos: { x: village.x, y: 12, z: village.z }, 
                color: '#fbbf24' 
            });
        }
    }
};

// Auto-init
window.VillageInstitutions.init();
