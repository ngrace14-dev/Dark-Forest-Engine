/**
 * File: src_systems_perception.js
 * System 50: Pattern Recognition & Threat Categorization
 * 
 * Implements visual/auditory acquisition and threat categorization.
 */

class PerceptionSystem {
    constructor() {
        this.acquisitionStates = new Map(); // Map<entity_id, PerceptionState>
        
        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        window.EventBus.emit('UI_LOG', '[Perception] Signal Processing & Threat Detection Active');
    }

    /**
     * 50.1 Visual Threat Acquisition
     * 50.3 Threat Level Categorization
     * 50.6 Behavioral Anomaly Detection
     */
    evaluateTarget(observerId, targetId) {
        const observer = window.PersonhoodManager?.getProfile(observerId);
        if (!observer) return 'UNKNOWN';

        const target = window.PersonhoodManager?.getProfile(targetId);
        
        // 50.6 Behavioral Anomaly: Detect if someone is acting "weird" (e.g., masking)
        if (target && window.CognitionManager?.activeDeceptions.has(targetId)) {
            if (Math.random() < 0.2) return 'ANOMALOUS_BEHAVIOR';
        }

        const distance = 10; // Placeholder distance check
        
        // 50.5 Optical Shape Matching: Identifying entity type
        const type = 'WENDIGO'; // Placeholder
        
        // 50.3 Threat Level Categorization
        if (type === 'WENDIGO') return 'EXTREME_THREAT';
        if (type === 'WOLF') return 'MODERATE_THREAT';
        
        return 'NEUTRAL';
    }

    /**
     * 50.2 Auditory Signal Processing
     */
    processSound(entityId, soundType, volume) {
        if (volume > 50) {
            window.EventBus.emit('UI_LOG_DEBUG', `[PERCEPTION] ${entityId} heard a loud ${soundType}.`);
        }
    }

    /**
     * 50.7 Ambush Prediction
     */
    checkAmbushRisk(entityId, terrainType) {
        if (terrainType === 'FOREST' && Math.random() < 0.1) {
            window.EventBus.emit('UI_LOG_DEBUG', `[PERCEPTION] ${entityId} senses an ambush nearby.`);
            return true;
        }
        return false;
    }

    /**
     * 50.4 False Positive Traps
     * 50.8 Intuitive Danger Sensing
     */
    checkDangerIntuition(entityId) {
        const profile = window.PersonhoodManager.getProfile(entityId);
        if (profile.traits.fear > 0.8 && Math.random() < 0.2) {
            // 50.4 False Positive: High fear leads to imagining threats
            window.EventBus.emit('UI_LOG_DEBUG', `[PERCEPTION] ${entityId} is seeing shadows... False positive threat.`);
            return true;
        }
        return false;
    }
}

window.Perception = new PerceptionSystem();
export default window.Perception;
