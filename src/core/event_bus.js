/**
 * File: src_core_event_bus.js
 * Purpose: Centralized Event Bus singleton to ensure safe initialization order.
 */

window.EventBus = {
    events: {},
    on: function(event, callback) { 
        if(!this.events[event]) this.events[event] = []; 
        this.events[event].push(callback); 
    },
    emit: function(event, data) { 
        if(this.events[event]) {
            this.events[event].forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for ${event}:`, e);
                }
            });
        }
    }
};

export default window.EventBus;
