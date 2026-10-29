/**
 * File: src_systems_agriculture.js
 * System 27: Agricultural Production & Famine Dynamics
 */

class AgricultureSystem {
    constructor() {
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('SHIFT_START', () => this.applySoilSpores());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Agriculture] Soil & Granary Systems Online');
    }

    /**
     * 27.3 Soil Spore Contamination
     * 27.6 Bread Riot Triggers
     */
    applySoilSpores() {
        window.VillageManager?.villages.forEach(v => {
            // 27.1 Shift-Adapted Farming
            if (Math.random() < 0.05) {
                v.stats.food *= 0.8;
                window.EventBus.emit('UI_LOG', `[FAMINE] Spore contamination in ${v.name} has ruined a portion of the crops.`);
                
                if (v.stats.food < v.population.current) {
                    window.EventBus.emit('UI_LOG', `[UNREST] Bread riots are breaking out in ${v.name}!`);
                    window.EventBus.emit('FAMINE_DECLARED', { villageId: v.id, severity: 1.0 });
                }
            }
        });
    }

    /**
     * 27.4 Strategic Granary Reserves
     */
    manageReserves(villageId) {
        // Logic to move food into long-term storage
    }
}

window.Agriculture = new AgricultureSystem();
export default window.Agriculture;
