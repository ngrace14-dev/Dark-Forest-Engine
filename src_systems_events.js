/**
 * File: src_systems_events.js
 * Phase 9: World Events & Civilizational Crises
 * 
 * Implements Bible §10 (Barrier Theory) and §19 (Monopoly Bottleneck).
 * Orchestrates macro-events that shake the simulation across all layers.
 */

class WorldEventDirectorSystem {
    constructor() {
        this.activeCrises = [];
        this.cooldowns = new Map();
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.evaluateWorldState());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[WorldEvents] Simulation Director Active');
    }

    /**
     * Monitors global metrics to trigger macro-events.
     */
    evaluateWorldState() {
        if (!window.VillageManager || !window.DynastyManager) return;

        const day = window.EngineParams?.worldDay || 0;

        // 1. CAPITAL FUEL CHOKEPOINT (Bible §10)
        // If Capital prosperity is low, they prioritize themselves and withhold fuel.
        const capital = window.VillageManager.villages[0];
        if (capital && capital.stats.prosperity < 40 && !this.isOnCooldown('FUEL_SHORTAGE')) {
            this.triggerCrisis('FUEL_SHORTAGE', { intensity: 0.8 });
        }

        // 2. HOUSE COLLAPSE / BOTTLE NECK (Bible §19)
        // If an Unblessed house gains more prestige than a Blessed house, trigger a shift.
        const houses = Array.from(window.DynastyManager.houses.values());
        const blessed = houses.filter(h => h.isBlessed).sort((a,b) => a.prestige - b.prestige);
        const unblessed = houses.filter(h => !h.isBlessed).sort((a,b) => b.prestige - a.prestige);

        if (unblessed[0] && blessed[0] && unblessed[0].prestige > (blessed[0].prestige + 50)) {
            this.triggerCrisis('MONOPOLY_SHIFT', { gainer: unblessed[0].id, loser: blessed[0].id });
        }

        // 3. BARRIER DISCONNECTION (Bible §10)
        // If multiple villages have low barrier integrity.
        const failingBarriers = window.VillageManager.villages.filter(v => v.barrierIntegrity < 10).length;
        if (failingBarriers >= 3) {
            this.triggerCrisis('VOID_BLEED');
        }
    }

    triggerCrisis(type, data = {}) {
        if (this.activeCrises.some(c => c.type === type)) return;

        const crisis = {
            id: 'crisis_' + Math.random().toString(36).substr(2, 5),
            type: type,
            data: data,
            startDay: window.EngineParams?.worldDay || 0
        };

        this.activeCrises.push(crisis);
        this.applyCrisisEffects(crisis);
        this.setCooldown(type, 14); // Crisis of same type cannot trigger for 1 fortnight

        // RECORD TO CHRONICLE (Bible §15)
        window.ChronicleManager?.recordEvent({
            actorId: 'WORLD',
            type: 'MACRO_CRISIS',
            detail: this.getCrisisDetail(crisis),
            significance: 250,
            historicalWeight: 200
        });

        window.EventBus.emit('WORLD_CRISIS_STARTED', crisis);
    }

    applyCrisisEffects(crisis) {
        switch(crisis.type) {
            case 'FUEL_SHORTAGE':
                window.EventBus.emit('UI_LOG', '⚠️ [CRISIS] THE CAPITAL HAS WITHHELD BARRIER FUEL. THE CHAIN WEAKENS.');
                window.VillageManager.villages.forEach(v => {
                    if (!v.capital) v.barrierIntegrity = Math.floor(v.barrierIntegrity * 0.4);
                });
                break;

            case 'MONOPOLY_SHIFT':
                const gainer = window.DynastyManager.getHouse(crisis.data.gainer);
                const loser = window.DynastyManager.getHouse(crisis.data.loser);
                window.EventBus.emit('UI_LOG', `⚖️ [ECONOMY] House ${gainer.name} has seized a Blessed Spot from House ${loser.name}.`);
                gainer.isBlessed = true;
                loser.isBlessed = false;
                // Force an update in village industry mapping
                break;

            case 'VOID_BLEED':
                window.EventBus.emit('UI_LOG', '🌀 [REALITY] The White Void is bleeding through the failing barriers!');
                if (window.EngineParams) window.EngineParams.fogDensity *= 2.0;
                break;
        }
    }

    getCrisisDetail(crisis) {
        const details = {
            'FUEL_SHORTAGE': "The Capital prioritizing local stability, causing a global barrier fuel famine.",
            'MONOPOLY_SHIFT': "A significant shift in civilizational wealth as monopolies change hands.",
            'VOID_BLEED': "A localized reality reconfiguration caused by mass barrier failure."
        };
        return details[crisis.type] || "A systemic disruption of world order.";
    }

    setCooldown(type, days) {
        this.cooldowns.set(type, (window.EngineParams?.worldDay || 0) + days);
    }

    isOnCooldown(type) {
        const cooldown = this.cooldowns.get(type) || 0;
        return (window.EngineParams?.worldDay || 0) < cooldown;
    }
}

window.WorldEventDirector = new WorldEventDirectorSystem();
export default window.WorldEventDirector;
