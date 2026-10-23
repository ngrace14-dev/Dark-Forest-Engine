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
        if (Math.random() < 0.01) {
            const resource = ['food', 'essence'][Math.floor(Math.random() * 2)];
            const oldPrice = this.prices.get(resource);
            this.prices.set(resource, oldPrice * (1 + (Math.random() * 0.2)));
            window.EventBus.emit('UI_LOG_DEBUG', `[MARKET] Volatility spike! ${resource} price rose.`);
        }
    }

    /**
     * 26.1 Caravan Guard Allocation
     * 26.5 Shipping Losses to Churn Rot
     */
    simulateTransportRisk(caravan) {
        // 26.7 Transport Sabotage Risk
        const risk = 0.05;
        if (Math.random() < risk) {
            caravan.status = 'DESTROYED';
            window.EventBus.emit('UI_LOG', `[WAR] A merchant caravan was lost to Churn Rot.`);
        }
    }
}

window.MarketManager = new MarketSystem();
export default window.MarketManager;
