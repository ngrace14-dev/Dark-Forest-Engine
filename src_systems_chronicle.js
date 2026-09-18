/**
 * File: src_systems_chronicle.js
 * Boilerplate for the Archivist and Chronicler careers.
 */
window.ChronicleManager = {
    recordHistory: function(event) {
        // Archivists gain XP for witnessing major world events (Epoch shifts, Wars, Boss Kills)
        window.CareerManager.addXP('archivist', 10);
        
        // Chroniclers can publish these events to change global reputation
        if (window.CareerManager.stats.chronicler.level > 5) {
             // Logic to "Speak to the Crow" and alter story heat
        }
    }
};
