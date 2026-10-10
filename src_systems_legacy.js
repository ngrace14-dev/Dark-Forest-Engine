/**
 * File: src_systems_legacy.js
 * Phase 9: Generational Legacy & The Significance Trap
 * 
 * Implements Bible §BN (Significance Trap) and §36 (Civilizational Institutions).
 * Manages the transfer of "Story Density" and "Bloodline Perks" across generations.
 */

class LegacyManagerSystem {
    constructor() {
        this.bloodlines = new Map(); // Map<bloodline_id, BloodlineObject>
        this.activeLegacies = new Map(); // Map<entity_id, LegacyProfile>
        
        // Significance Thresholds (Bible §BN)
        this.THRESHOLDS = {
            KNOWN: 100,      // Local recognition
            RENOWNED: 500,   // Regional impact
            LEGENDARY: 1500, // Historical anchor
            MYTHIC: 5000     // "True Origin" level (The Significance Trap)
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('ENTITY_DIED', (data) => this.harvestLegacy(data));
    }

    init() {
        // Hydrate player legacy if it exists in GameState
        if (window.GameState.playerLegacy) {
            this.activeLegacies.set('player', window.GameState.playerLegacy);
        }
        window.EventBus.emit('UI_LOG', '[Legacy] Generational Memory Engaged');
    }

    /**
     * Registers an entity into the legacy system.
     * Bible §1: Action -> Legend -> History.
     */
    registerEntity(entityId, bloodlineId = null) {
        if (this.activeLegacies.has(entityId)) return this.activeLegacies.get(entityId);

        const bloodline = bloodlineId ? this.getOrCreateBloodline(bloodlineId) : null;
        
        const profile = {
            id: entityId,
            bloodlineId: bloodlineId,
            storyDensity: 0,
            inheritedTraits: bloodline ? { ...bloodline.perks } : {},
            generation: bloodline ? bloodline.generationCount + 1 : 1,
            karmicDebt: 0, // Negative reputation passed down
            significanceLevel: 'UNKNOWN'
        };

        this.activeLegacies.set(entityId, profile);
        return profile;
    }

    getOrCreateBloodline(id) {
        if (!this.bloodlines.has(id)) {
            this.bloodlines.set(id, {
                id: id,
                generationCount: 0,
                totalSignificance: 0,
                perks: {}, // Permanent modifiers
                heirlooms: [],
                feuds: new Set(),
                isNoble: id.startsWith('house_')
            });
        }
        return this.bloodlines.get(id);
    }

    /**
     * Increases the "Story Density" of an entity.
     * Bible §BN: Flesh as the Ledger.
     */
    addSignificance(entityId, amount) {
        const legacy = this.activeLegacies.get(entityId);
        if (!legacy) return;

        legacy.storyDensity += amount;
        
        // Update Thresholds
        if (legacy.storyDensity >= this.THRESHOLDS.MYTHIC) legacy.significanceLevel = 'MYTHIC';
        else if (legacy.storyDensity >= this.THRESHOLDS.LEGENDARY) legacy.significanceLevel = 'LEGENDARY';
        else if (legacy.storyDensity >= this.THRESHOLDS.RENOWNED) legacy.significanceLevel = 'RENOWNED';
        else if (legacy.storyDensity >= this.THRESHOLDS.KNOWN) legacy.significanceLevel = 'KNOWN';

        // THE HARVEST BEACON (Bible §BN)
        // High significance attracts the Wendigo / The Crow
        if (legacy.storyDensity > this.THRESHOLDS.LEGENDARY) {
            this.triggerHarvestWarning(entityId);
        }
    }

    /**
     * Called when an entity dies. Transfers significance to the bloodline.
     * Bible §36: "Individuals die; institutions persist."
     */
    harvestLegacy(entity) {
        const legacy = this.activeLegacies.get(entity.id);
        if (!legacy || !legacy.bloodlineId) return;

        const bloodline = this.bloodlines.get(legacy.bloodlineId);
        if (!bloodline) return;

        bloodline.generationCount++;
        bloodline.totalSignificance += legacy.storyDensity;

        // Evolve Bloodline Perks based on the previous generation's deeds
        this.evolveBloodline(bloodline, legacy);

        window.EventBus.emit('LEGACY_HARVESTED', { 
            bloodlineId: bloodline.id, 
            significance: legacy.storyDensity,
            generation: legacy.generation
        });
    }

    evolveBloodline(bloodline, lastLegacy) {
        // Example: If the ancestor had high 'strength' XP, the bloodline gets a baseline bonus
        if (lastLegacy.storyDensity > 1000) {
            bloodline.perks.resilience = (bloodline.perks.resilience || 0) + 0.05;
        }

        // Handle Feud Persistence
        if (lastLegacy.karmicDebt > 50) {
            bloodline.feuds.add('Debt to the Forest');
        }
    }

    triggerHarvestWarning(entityId) {
        const entityName = entityId === 'player' ? 'The Wanderer' : entityId;
        if (Math.random() < 0.05) {
            window.EventBus.emit('UI_LOG', `[THE CROW] ${entityName} shines too brightly. The shadows are hungry.`);
        }
    }

    /**
     * Returns the modifiers an entity inherits from their bloodline.
     */
    getInheritedModifiers(entityId) {
        const legacy = this.activeLegacies.get(entityId);
        if (!legacy || !legacy.bloodlineId) return {};
        
        const bloodline = this.bloodlines.get(legacy.bloodlineId);
        return bloodline ? bloodline.perks : {};
    }
}

window.LegacyManager = new LegacyManagerSystem();
export default window.LegacyManager;
