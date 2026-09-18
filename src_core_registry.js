// src_core_registry.js
window.SystemRegistry = {
    systems: [],
    
    register: function(systemName, systemInstance) {
        console.log(`%c[Registry] Registering: ${systemName}`, "color: #60a5fa;");
        this.systems.push({ name: systemName, instance: systemInstance });
    },
    
    // Allows us to run an update on all registered systems
    updateAll: function(delta) {
        for (const system of this.systems) {
            if (system.instance.update) {
                system.instance.update(delta);
            }
        }
    }
};


