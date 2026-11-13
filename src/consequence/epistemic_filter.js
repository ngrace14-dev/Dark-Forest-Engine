/**
 * DARK FOREST ENGINE - EPISTEMIC FILTER (FRAMEWORK 2)
 * 
 * Role: Intercepts Information before it becomes Belief.
 * Processes KnowledgePackets (Law #3).
 */

window.EpistemicFilter = {
    init: function() {
        console.log("%c🟢 Framework 2: Epistemic Filter Initialized", "color: #fbbf24; font-weight: bold;");
        this.activeModifiers = {};
        
        window.EventBus.on('ACTIVE_SYSTEMS_UPDATED', (systems) => this.updateModifiers(systems));
    },

    updateModifiers: function(systems) {
        this.activeModifiers = {};
        systems.forEach(sys => {
            if (sys.vectors && sys.vectors.scalar_to_framework) {
                for (const [mod, val] of Object.entries(sys.vectors.scalar_to_framework)) {
                    this.activeModifiers[mod] = (this.activeModifiers[mod] || 0) + val;
                }
            }
        });
    },

    /**
     * Filters a KnowledgePacket through the current civilization scalars.
     * Enforces Law #3.
     */
    filterPacket: function(packet) {
        const scalars = window.CivilizationState.scalars;
        let filtered = { ...packet };

        // 1. GLOBAL TRUTH DECAY
        // High TRUTH_DECAY can strip details or randomize facts
        if (Math.random() < scalars.TRUTH_DECAY) {
            filtered.accuracy = Math.max(0, (packet.accuracy || 1.0) - scalars.TRUTH_DECAY);
            if (filtered.accuracy < 0.2) filtered.subject = "Rumor";
        }

        // 2. SIGNIFICANCE FOCUSING
        // Low SIGNIFICANCE_DENSITY makes unimportant packets disappear
        if (packet.significance < (1.0 - scalars.SIGNIFICANCE_DENSITY) * 0.2) {
            return null; // Packet is "lost in the noise"
        }

        // 3. SYSTEM-SPECIFIC MODIFIERS
        if (this.activeModifiers.packet_corruption_chance && Math.random() < this.activeModifiers.packet_corruption_chance) {
            filtered.content = "..." + filtered.content.substring(5); // Corrupt content
        }

        return filtered;
    }
};

// Auto-initialize Framework 2
window.EpistemicFilter.init();
