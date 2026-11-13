/**
 * File: src_systems_warden.js
 * Boilerplate for the Warden career and Barrier maintenance.
 */
window.WardenManager = {
    repairBarrier: function(village) {
        const engineerLevel = window.CareerManager.stats.rune_engineer.level;
        const wardenLevel = window.CareerManager.stats.warden.level;
        
        // Wardens use "Maintenance" to keep barriers alive without just monster essence
        const strength = (wardenLevel * 2) + (engineerLevel * 1);
        village.barrierIntegrity = Math.min(100, village.barrierIntegrity + strength);
        
        window.CareerManager.addXP('warden', 25);
        window.EventBus.emit('UI_LOG', `[WARDEN] You have reinforced the rune barrier at ${village.name}.`);
    }
};
