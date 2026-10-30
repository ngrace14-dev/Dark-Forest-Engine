/**
 * DARK FOREST ENGINE - VILLAGE ECONOMY (Tier 3)
 * 
 * Handles monthly yields, trade taxation, resource generation, and caravans.
 * Decoupled from VillageManager God Object.
 */

window.VillageEconomy = {
    init: function() {
        console.log("%c🟢 Village Economy System Initialized", "color: #fbbf24; font-weight: bold;");
        
        // Tier 30D: Monthly Economic Cycle
        window.EventBus.on('HEARTBEAT_T30D', () => {
            this.processMonthlyYields();
        });

        // Tier 5M: Simulation Slicing for Caravans (matching old VillageManager freq)
        window.EventBus.on('HEARTBEAT_T5M', () => {
            if (window.VillageManager?.villages) {
                window.VillageManager.villages.forEach(v => this.processVillageCaravans(v));
            }
        });
    },

    processMonthlyYields: function() {
        if (!window.VillageManager?.villages) return;

        window.VillageManager.villages.forEach(village => {
            if (village.isCollapsed) return;

            this.calculateResourceOutput(village);
            this.routeTradeTaxes(village);
            this.updateProsperity(village);
            this.processConsumption(village);
        });
    },

    processConsumption: function(village) {
        const cal = window.CalibrationFramework?.settings?.economy || { consumption: 1.0 };
        const consumptionBase = Math.ceil(village.population.current / 24);
        village.stats.food = Math.max(0, (village.stats.food || 0) - Math.ceil(consumptionBase * cal.consumption));
    },

    calculateResourceOutput: function(village) {
        const cal = window.CalibrationFramework?.settings?.economy || { productionScale: 1.0 };
        const baseOutput = village.population.current * (village.stats.prosperity / 100);
        
        // Industry Multiplier
        let outputMultiplier = 1.0;
        const houseId = `house_${village.nobleHouse.toLowerCase().replace('house ', '')}`;
        if (window.TotalWar) {
            outputMultiplier = window.TotalWar.getLaborEfficiency(houseId) || 1.0;
        }

        // Primary Industry Production
        const primaryResource = village.industry.produces;
        const yieldAmount = Math.max(1, Math.floor(baseOutput * 0.1 * outputMultiplier * cal.productionScale));
        
        village.stats[primaryResource] = (village.stats[primaryResource] || 0) + yieldAmount;

        // Secondary (Gold) Production via Taxation/Market activity
        const goldYield = Math.max(1, Math.floor(baseOutput * 0.05 * outputMultiplier));
        village.stats.gold = (village.stats.gold || 0) + goldYield;
        
        // Refinement Stock generation (Monster Material accumulation)
        if (village.stats.refinementStock) {
            const materialYield = Math.floor(village.population.current / 5000);
            if (materialYield > 0) {
                const materialType = village.industry.produces === 'wood' ? 'corrupted_resin' : 'beast_bones';
                village.stats.refinementStock[materialType] += materialYield;
            }
        }
    },

    routeTradeTaxes: function(village) {
        if (village.capital) return; // Capital receives, doesn't pay

        const kingdomTaxRate = 0.10; // 10% Kingdom Tax
        const monthlyGold = village.stats.gold || 0;
        const taxAmount = Math.floor(monthlyGold * kingdomTaxRate);

        if (taxAmount > 0) {
            village.stats.gold -= taxAmount;
            
            // Route to AdminBureau/Capital Treasury
            const capital = window.VillageManager.villages[0];
            if (capital) {
                capital.stats.gold = (capital.stats.gold || 0) + taxAmount;
            }
        }
    },

    updateProsperity: function(village) {
        // Prosperity logic: Influenced by food security and trade connectivity
        const foodSecurity = village.stats.food > village.population.current * 10 ? 10 : 0;
        const tradeDisruption = village.tradeDisruptionUntil > window.EngineParams.worldDay ? -20 : 0;
        
        village.stats.prosperity = Math.max(0, Math.min(100, village.stats.prosperity + foodSecurity + tradeDisruption));
    },

    processVillageCaravans: function(village) {
        if (!village.caravans) return;

        village.caravans.forEach(caravan => {
            // Mathematical travel simulation for distant caravans
            const agent = window.GameCore?.activeEntities?.find(en => en.caravanId === caravan.id);
            if (!agent) {
                const dest = window.VillageManager.villages.find(v => v.id === caravan.targetVillageId);
                if (dest && caravan.status === 'traveling') {
                    const dx = dest.x - (caravan.position?.x || village.x);
                    const dz = dest.z - (caravan.position?.z || village.z);
                    const dist = Math.hypot(dx, dz);
                    
                    if (dist < 20) {
                        caravan.status = 'arrived';
                    } else {
                        const speed = 40 * 60; 
                        const t = Math.min(1.0, speed / dist);
                        caravan.position = {
                            x: (caravan.position?.x || village.x) + dx * t,
                            z: (caravan.position?.z || village.z) + dz * t
                        };
                    }
                }
            }

            if (caravan.status !== 'arrived') return;
            const destination = window.VillageManager.villages.find(candidate => candidate.id === caravan.targetVillageId);
            if (!destination) return;

            const cargo = caravan.cargo || village.industry.produces;
            const amount = (caravan.amount || 1) * 10; 

            // Intel Delivery
            if (window.IntelPropagation) {
                const caravanIntel = window.IntelManager?.getIntelForNode(caravan.id) || [];
                window.IntelPropagation.bulkSyncToVillage(
                    { id: caravan.id, faction: village.territory.faction },
                    { id: `village_${destination.id}`, memory_limit: 50, faction: destination.territory.faction },
                    caravanIntel.map(i => i.intel_id)
                );
            }

            if ((village.stats[cargo] || 0) >= amount) {
                village.stats[cargo] -= amount;
                destination.stats[cargo] = (destination.stats[cargo] || 0) + amount;
                
                if (village.provision && (village.provisionStock?.[village.provision.itemId] || 0) > 0) {
                    const provisionAmount = Math.min(amount, village.provisionStock[village.provision.itemId]);
                    destination.provisionStock ??= {};
                    destination.provisionStock[village.provision.itemId] = (destination.provisionStock[village.provision.itemId] || 0) + provisionAmount;
                    village.provisionStock[village.provision.itemId] -= provisionAmount;
                }
                
                caravan.lastArrivalDay = window.EngineParams.worldDay;
                caravan.status = 'complete';
                window.EventBus.emit('UI_LOG', `[TRADE] ${village.name} delivered ${amount} ${cargo} to ${destination.name}.`);
            }
        });
    },

    canFundVillageAction: function(village, cost, purpose) {
        if (village.isCollapsed) return false;
        for (const [resource, amount] of Object.entries(cost)) {
            if ((village.stats[resource] || 0) < amount) {
                window.VillageManager?.postVillageNeed(village, resource, amount - (village.stats[resource] || 0), purpose);
                return false;
            }
        }
        return true;
    },

    spendVillageResources: function(village, cost) {
        Object.entries(cost).forEach(([resource, amount]) => { village.stats[resource] -= amount; });
    }
};

// Auto-init
window.VillageEconomy.init();
