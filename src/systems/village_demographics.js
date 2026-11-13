/**
 * DARK FOREST ENGINE - VILLAGE DEMOGRAPHICS (Tier 2/3)
 * 
 * Handles population growth, mortality, and generational tracking.
 * Decoupled from VillageManager God Object.
 */

window.VillageDemographics = {
    init: function() {
        console.log("%c🟢 Village Demographics System Initialized", "color: #34d399; font-weight: bold;");
        
        // Tier 12H: Daily Demographic Cycle
        window.EventBus.on('HEARTBEAT_T12H', () => {
            this.processDailyDemographics();
        });
    },

    processDailyDemographics: function() {
        if (!window.VillageManager?.villages) return;

        window.VillageManager.villages.forEach(village => {
            if (village.isCollapsed) return;

            this.updatePopulationGrowth(village);
            this.processMortality(village);
            this.updateAgeProgression(village);
        });
    },

    updatePopulationGrowth: function(village) {
        // Growth logic: Requires prosperity and food security
        if (village.lastGrowthDay !== window.EngineParams.worldDay && 
            village.population.current < village.population.capacity && 
            village.stats.prosperity >= 70 && 
            village.stats.food >= village.population.current * 8) {
            
            const cal = window.CalibrationFramework?.settings?.world || { growthRate: 1.0 };
            const growth = Math.min(
                village.population.capacity - village.population.current, 
                Math.max(1, Math.floor((village.population.current * village.stats.prosperity / 10000) * cal.growthRate))
            );
            
            village.population.current += growth;
            village.lastGrowthDay = window.EngineParams.worldDay;

            // Log major milestones
            if (village.population.current > 10000 && !village.recordedMajorMilestone) {
                village.recordedMajorMilestone = true;
                window.EventBus.emit('UI_LOG', `[GROWTH] ${village.name} has crossed a major population milestone: ${village.population.current}.`);
            }
        }
    },

    processMortality: function(village) {
        const consumptionBase = Math.ceil(village.population.current / 24);
        const foodReserves = village.stats.food || 0;
        
        // Starvation Logic
        if (foodReserves < village.population.current * 2) {
            const deficit = (village.population.current * 2) - foodReserves;
            const mortalityRate = 0.02 + (deficit / (village.population.current * 10)); // Scaled mortality
            const deaths = Math.ceil(village.population.current * mortalityRate);
            
            village.population.current = Math.max(10, village.population.current - deaths);
            
            window.EventBus.emit('VILLAGE_STARVING', { 
                villageId: village.id, 
                deaths: deaths, 
                remaining: village.population.current 
            });

            if (Math.random() < 0.1) {
                window.EventBus.emit('UI_LOG', `💀 [STARVATION] ${village.name} is losing citizens to hunger. Deaths: ${deaths}.`);
            }
        }
    },

    updateAgeProgression: function(village) {
        // Generational tracking for residents
        if (!village.residents) return;

        // Abstractly age residents (Phase 3 logic)
        // High-fidelity residents (named NPCs) are handled by PersonhoodManager, 
        // this loop handles the statistical bulk.
        village.residents.forEach(res => {
            if (res.id && window.PersonhoodManager) {
                const profile = window.PersonhoodManager.getProfile(res.id);
                if (profile && !profile.isPlayer) {
                    // Daily aging logic handled here or in Personhood
                }
            }
        });
    }
};

// Auto-init
window.VillageDemographics.init();
