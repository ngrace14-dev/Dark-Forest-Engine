/**
 * File: src_systems_ascension.js
 * Phase 2: The Blessing & Ascension Loop
 * 
 * Implements the "Blessing Generator" and "Merging State-Machine".
 * Blessings act as "Cognitive Slots" in the mental bandwidth.
 */

export const BLESSING_TIERS = {
    MORTAL: { name: 'Mortal', weight: 1, color: '#9ca3af' },
    ANCIENT: { name: 'Ancient', weight: 5, color: '#60a5fa' },
    GODLIKE: { name: 'Godlike', weight: 15, color: '#a855f7' },
    OBSIDIAN: { name: 'Obsidian God', weight: 50, color: '#f87171' }
};

export const BLESSING_POOL = [
    { id: 'FIRST_FLAME', title: 'First Flame', tier: 'GODLIKE', desc: 'The spark that resisted the Great Static.', slots: 1 },
    { id: 'HIDDEN_HAND', title: 'Hidden Hand', tier: 'GODLIKE', desc: 'Touch the world without moving a finger.', slots: 1 },
    { id: 'SILENT_THOUGHT', title: 'Silent Thought', tier: 'ANCIENT', desc: 'Your presence does not ripple the void.', slots: 1 },
    { id: 'IRON_WILL', title: 'Iron Will', tier: 'MORTAL', desc: 'The core resists shattering with greater force.', slots: 1 },
    { id: 'EMBER_BEHIND_THRONE', title: 'Ember Behind The Throne', tier: 'OBSIDIAN', desc: 'The power of the True Monarch.', slots: 2, requirements: ['FIRST_FLAME', 'HIDDEN_HAND'] }
];

class AscensionSystem {
    constructor() {
        this.activeBlessings = [];
        this.maxSlots = 3;
        
        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('DUNE_FRAGMENT_RECOVERED', (fragment) => this.checkAscensionTrial(fragment));
        window.EventBus.on('EPOCH_ACHIEVEMENT_UNLOCKED', (achievement) => this.grantBlessingRoll(achievement));
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Ascension] The Merging Law is in effect.');
    }

    /**
     * Checks if the entity has the required "Epoch-Class Achievements" for a trial.
     */
    checkAscensionTrial(fragment) {
        if (fragment.tier !== 'EPOCH') return;
        
        window.EventBus.emit('UI_LOG', '🌟 [ASCENSION] An Epoch-Class discovery has triggered an Ascension Trial.');
        this.grantBlessingRoll({ type: 'DISCOVERY', tier: 'EPOCH' });
    }

    grantBlessingRoll(source) {
        // Filter pool by availability (not already owned, or upgradeable)
        const available = BLESSING_POOL.filter(b => {
            if (this.activeBlessings.find(owned => owned.id === b.id)) return false;
            if (b.requirements) {
                return b.requirements.every(req => this.activeBlessings.find(owned => owned.id === req));
            }
            return b.tier !== 'OBSIDIAN'; // Obsidian requires merging
        });

        if (available.length === 0) return;

        const blessing = available[Math.floor(Math.random() * available.length)];
        this.addBlessing(blessing);
    }

    addBlessing(blessing) {
        // check slots in KnowledgeInventory (Phase 2 integration)
        const inventory = window.ModelLayer?.getInventory('player');
        const usedSlots = this.activeBlessings.reduce((sum, b) => sum + (b.slots || 1), 0);
        
        if (inventory && (usedSlots + (blessing.slots || 1)) > (inventory.attentionQuota / 20)) {
            window.EventBus.emit('UI_LOG', `⚠️ [COGNITION] Insufficient mental slots to host ${blessing.title}.`);
            return;
        }

        this.activeBlessings.push(blessing);
        window.EventBus.emit('UI_LOG', `✨ [BLESSING] You have received: ${blessing.title}.`);
        
        this.processMerging();
        window.EventBus.emit('BLESSING_ADDED', blessing);
    }

    /**
     * Assimilation Logic: Merges blessings into higher tiers.
     */
    processMerging() {
        let merged = false;
        
        BLESSING_POOL.forEach(potential => {
            if (potential.tier === 'OBSIDIAN' && potential.requirements) {
                const hasAll = potential.requirements.every(req => this.activeBlessings.find(b => b.id === req));
                const alreadyHas = this.activeBlessings.find(b => b.id === potential.id);
                
                if (hasAll && !alreadyHas) {
                    // Remove requirements
                    this.activeBlessings = this.activeBlessings.filter(b => !potential.requirements.includes(b.id));
                    // Add merged blessing
                    this.activeBlessings.push(potential);
                    window.EventBus.emit('UI_LOG', `🔥 [EVOLUTION] Blessings have merged into: ${potential.title}!`);
                    merged = true;
                }
            }
        });

        if (merged) this.processMerging(); // Recursive merge check
    }

    getActiveBlessings() {
        return this.activeBlessings;
    }
}

window.AscensionManager = new AscensionSystem();
export default window.AscensionManager;
