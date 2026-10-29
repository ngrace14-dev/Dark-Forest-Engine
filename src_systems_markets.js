/**
 * File: src_systems_markets.js
 * System 25: Market Supply, Demand & Price Volatility
 * System 26: Caravan Logistics & Transport Risks
 */

class MarketSystem {
    constructor() {
        this.prices = new Map(); // Map<resource_id, price>
        this.hoards = new Map(); // Map<faction_id, Map<resource_id, count>>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_TICK', () => this.updateVolatility());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Markets] Supply & Demand Engines Active');
        this.prices.set('food', 10);
        this.prices.set('gold', 1);
        this.prices.set('essence', 50);
    }

    /**
     * 25.1 Localized Scarcity Spikes
     * 25.3 Currency Devaluation & Inflation
     */
    updateVolatility() {
        this.updateEssencePrice();
        if (Math.random() < 0.01) {
            const resource = ['food', 'essence'][Math.floor(Math.random() * 2)];
            const oldPrice = this.prices.get(resource);
            this.prices.set(resource, oldPrice * (1 + (Math.random() * 0.2)));
            window.EventBus.emit('UI_LOG_DEBUG', `[MARKET] Volatility spike! ${resource} price rose.`);
        }
    }

    /**
     * Phase 4: Resource Bias & Rumor Rarity
     * Market quality scales with proximity to the settlement Anchor.
     */
    getMarketQuality(villageId, playerPos) {
        if (!window.UrbanPlanning) return 1.0;
        
        const quarter = window.UrbanPlanning.getQuarterForLocation(villageId, playerPos.x, playerPos.z);
        return quarter.resourceBias;
    }

    getRumorRarityForQuarter(villageId, playerPos) {
        if (!window.UrbanPlanning) return 'COMMON';
        
        const quarter = window.UrbanPlanning.getQuarterForLocation(villageId, playerPos.x, playerPos.z);
        return quarter.rumorRarity;
    }
    /**
     * Scales essence price based on Global Barrier Stress.
     * Bible Doctrine: Scarcity drives value.
     */
    updateEssencePrice() {
        if (!window.VillageManager?.villages) return;
        
        const villages = window.VillageManager.villages;
        const avgIntegrity = villages.reduce((sum, v) => sum + (v.barrierIntegrity || 100), 0) / villages.length;
        
        // Stress 0.0 (Perfect) to 1.0 (Total Collapse)
        const stress = 1.0 - (avgIntegrity / 100);
        
        // Base price 50. At 0 integrity (max stress), price reaches 250.
        const newPrice = 50 + (stress * 200);
        this.prices.set('essence', Math.floor(newPrice));
    }

    simulateTransportRisk(caravan) {
        // 26.7 Transport Sabotage Risk
        const risk = 0.05;
        if (Math.random() < risk) {
            caravan.status = 'DESTROYED';
            window.EventBus.emit('UI_LOG', `[WAR] A merchant caravan was lost to Churn Rot.`);
            window.EventBus.emit('CARAVAN_LOST', { caravanId: caravan.id, triggerIntelId: caravan.lastMarketIntelId });
        }
    }
}

window.MarketManager = new MarketSystem();
export default window.MarketManager;
