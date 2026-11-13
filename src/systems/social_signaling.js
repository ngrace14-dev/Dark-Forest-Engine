/**
 * File: src_systems_social_signaling.js
 * System 58: Non-Verbal & Micro-Expression Signaling
 * 
 * Implements subtle behavioral cues, dominance gestures, and deception tells.
 */

class SocialSignalingSystem {
    constructor() {
        this.activeSignals = new Map(); // Map<entity_id, SignalObject>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Signaling] Non-Verbal Communication Channels Active');
    }

    /**
     * 58.1 Subconscious Posture Reading
     * 58.3 Dominance & Deference Gestures
     */
    getPosturalSignal(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        if (!profile) return 'NEUTRAL';

        const stats = window.PrestigeManager?.honorLedger.get(entityId) || { face: 50 };
        
        if (stats.face > 80) return 'DOMINANT';
        if (stats.face < 20) return 'DEFERENTIAL';
        if (profile.traits.fear > 0.7) return 'GUARDED';
        
        return 'NEUTRAL';
    }

    /**
     * 58.2 Micro-Expression Deception Tells
     * 58.5 Unconscious Fear Tells
     */
    detectTells(observerId, targetId) {
        const observer = window.PersonhoodManager.getProfile(observerId);
        const target = window.PersonhoodManager.getProfile(targetId);
        if (!observer || !target) return null;

        // Observer's skill vs Target's masking (47.2)
        const skill = observer.skills.lore.level / 100; // Using Lore as insight proxy
        const stress = target.traits.fear;
        
        const detectionChance = skill * stress;
        
        if (Math.random() < detectionChance) {
            if (target.traits.isKnownFabricator) return 'DECEPTION_DETECTED';
            if (stress > 0.8) return 'EXTREME_STRESS';
        }

        return 'NONE';
    }

    /**
     * 58.8 Pheromonal Stress Detection
     * Primitive detection for non-human or highly attuned entities.
     */
    detectPheromones(entityId, radius = 5) {
        // Logic to find stressed entities nearby
        // Returns a 'scent' of fear or aggression
    }
}

window.SocialSignaling = new SocialSignalingSystem();
export default window.SocialSignaling;
