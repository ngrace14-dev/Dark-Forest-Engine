import { ConsequenceEvents } from './src_consequence_types/events.js';
import { FactionIntent } from './src_consequence_types/enums.js';

/**
 * StrategicProcessor: The Decision Engine
 * Analyzes Belief (Inventory) to generate Intent.
 * Enforces Law #2 (Ghost Rule): Cannot read LatentRegistry.
 */
class StrategicProcessor {
    constructor() {
        this.shockThreshold = 75;
        this.intentCooldown = 3; // Shifts (Cooldown to prevent thrashing)
    }

    /**
     * Strategic Audit: Called per Epoch Day.
     */
    evaluateFaction(inventory, currentDay) {
        // 1. Stability Check (Weight-based model)
        this._updateStability(inventory);

        // 2. Cognitive Collapse Check (Derived from belief failures)
        this._updateShockLevel(inventory);

        // 3. Determine Intent with Hysteresis
        if (inventory.intentLockUntil && currentDay < inventory.intentLockUntil) return;

        const oldIntent = inventory.currentIntent;
        const newIntent = this._determineIntent(inventory);

        if (oldIntent !== newIntent) {
            inventory.currentIntent = newIntent;
            inventory.intentLockUntil = currentDay + (this.intentCooldown * 14); // Lock for 3 shifts
            
            window.EventBus.emit(ConsequenceEvents.INTENT_CHANGED, { 
                factionId: inventory.factionId, 
                newIntent 
            });
        }
    }

    /**
     * Derives stability from resource and safety facts.
     */
    _updateStability(inventory) {
        const facts = Array.from(inventory.records.values());
        
        // 1. Food Score (0.4)
        const foodFact = inventory.records.get('resource_food');
        const foodValue = (typeof foodFact?.value === 'object') ? (foodFact.value.amount || 0) : (foodFact?.value || 0);
        const foodScore = foodFact ? (foodValue / 100) : 0.5;

        // 2. Fuel Score (0.3)
        const fuelFact = inventory.records.get('resource_fuel');
        const fuelValue = (typeof fuelFact?.value === 'object') ? (fuelFact.value.amount || 0) : (fuelFact?.value || 0);
        const fuelScore = fuelFact ? (fuelValue / 100) : 0.5;

        // 3. Safety Score (0.2)
        const threats = facts.filter(f => f.value?.type === 'THREAT' && f.confidence > 0.5);
        const safetyScore = Math.max(0, 1.0 - (threats.length * 0.2));

        // 4. Confidence Score (0.1)
        const avgConfidence = facts.reduce((acc, f) => acc + f.confidence, 0) / (facts.length || 1);

        inventory.stabilityScore = (
            (foodScore * 0.4) + 
            (fuelScore * 0.3) + 
            (safetyScore * 0.2) + 
            (avgConfidence * 0.1)
        ) * 100;
    }

    /**
     * Derived Shock (Ghost Rule compliant).
     * Measures shock based on failures within the Seeker Pipeline.
     */
    _updateShockLevel(inventory) {
        const recentFailures = inventory.contracts.filter(c => c.status === 'FAILED').length;
        const highDissonance = Array.from(inventory.records.values()).filter(f => f.state === 'FOSSILIZED').length;
        
        // Shock = (Failures * 10) + (Dissonance * 15) + (ContinuityDebt / 5)
        const newShock = (recentFailures * 10) + (highDissonance * 15) + (inventory.continuityDebt / 5);
        
        const oldShock = inventory.shockLevel;
        inventory.shockLevel = Math.min(100, Math.max(0, newShock));

        if (inventory.shockLevel > this.shockThreshold && oldShock <= this.shockThreshold) {
            window.EventBus.emit(ConsequenceEvents.SYSTEMIC_SHOCK, { 
                factionId: inventory.factionId, 
                level: inventory.shockLevel 
            });
        }
    }

    /**
     * Decision Logic.
     */
    _determineIntent(inventory) {
        if (inventory.shockLevel > this.shockThreshold) return FactionIntent.STABILIZE;
        if (inventory.stabilityScore < 50) return FactionIntent.STABILIZE;
        
        // If Debt is high, force Legitimacy unless in a Golden Age
        const isGoldenAge = inventory.consecutiveStableShifts > 10;
        if (inventory.continuityDebt > 50 && !isGoldenAge) return FactionIntent.LEGITIMIZE;
        
        if (isGoldenAge) return FactionIntent.SEEK;
        
        return FactionIntent.GROW;
    }
}

export const Strategist = new StrategicProcessor();
