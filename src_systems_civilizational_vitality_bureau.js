/**
 * DARK FOREST ENGINE - CIVILIZATIONAL VITALITY BUREAU
 * Zombie Simulation Detection Framework
 * 
 * "A world that does not change is a world that has already ended."
 */

class CivilizationalVitalityBureau {
    constructor() {
        this.metrics = {
            discoveryRate: 0,
            culturalMutation: 0,
            politicalTurnover: 0,
            mysteryGeneration: 0,
            legendGeneration: 0
        };

        this.history = [];
        this.windowSize = 100; // World Ticks to track

        this.thresholds = {
            ZOMBIE_VITALITY: 0.1,
            STAGNATION_LOOP_CORRELATION: 0.95,
            STATIC_WORLD_DELTA: 0.01,
            FROZEN_HISTORY_DAYS: 14 // Bible §5: Reality Shift every 14 days
        };

        this.vitalityScore = 1.0;
        this.simulationState = 'VIBRANT'; // VIBRANT, STAGNATING, ZOMBIE, DEAD
        this.lastEventDay = window.EngineParams?.worldDay || 0;

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.performAudit()); // Audit every real-second for responsiveness in dev
        
        // Listen for vitality-defining events
        window.EventBus.on('LEGEND_CREATED', () => this.metrics.legendGeneration++);
        window.EventBus.on('MYSTERY_GENERATED', () => this.metrics.mysteryGeneration++);
        window.EventBus.on('CHRONICLE_EVENT_RECORDED', (event) => {
            this.lastEventDay = event.timestamp.day;
        });
        window.EventBus.on('POLITICAL_AUDIT_COMPLETE', (data) => {
            this.metrics.politicalTurnover += Math.abs(data.politicalFragmentation - (this.lastFrag || 0));
            this.lastFrag = data.politicalFragmentation;
        });
    }

    init() {
        window.EventBus.emit('UI_LOG', '🧟 [CVB] Zombie Simulation Detection Framework Active');
        console.log("%c🧟 CVB: Civilizational Vitality Bureau Initialized", "color: #ef4444; font-weight: bold;");
    }

    /**
     * Periodic audit of simulation health.
     */
    performAudit() {
        const currentInnovation = window.Innovation?.techLevel ? 
            Array.from(window.Innovation.techLevel.values()).reduce((a, b) => a + b, 0) : 0;
        
        const innovationDelta = currentInnovation - (this.lastInnovationSum || 0);
        this.lastInnovationSum = currentInnovation;
        this.metrics.discoveryRate = innovationDelta;

        const currentFolklore = window.FolkloreEngine?.anthology?.length || 0;
        const folkloreDelta = currentFolklore - (this.lastFolkloreCount || 0);
        this.lastFolkloreCount = currentFolklore;
        this.metrics.culturalMutation = folkloreDelta;

        // Record History
        this.history.push({ ...this.metrics });
        if (this.history.length > this.windowSize) this.history.shift();

        // Calculate Vitality
        this.calculateVitality();

        // Reset counters for next interval
        this.metrics.legendGeneration = 0;
        this.metrics.mysteryGeneration = 0;
        this.metrics.politicalTurnover = 0;

        this.detectAnomalies();
    }

    calculateVitality() {
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        
        // Use total activity in the window rather than raw average per second
        const dRate = sum(this.history.map(h => h.discoveryRate));
        const cMut = sum(this.history.map(h => h.culturalMutation));
        const pTurn = sum(this.history.map(h => h.politicalTurnover));
        const mGen = sum(this.history.map(h => h.mysteryGeneration));
        const lGen = sum(this.history.map(h => h.legendGeneration));

        // Civilizational Pulse (normalized aggregate)
        // Adjust weights based on expected frequency
        const pulse = Math.min(1.0, (dRate * 0.5) + (cMut * 0.5) + (pTurn * 2.0) + (mGen * 1.0) + (lGen * 1.0));
        
        this.vitalityScore = pulse;

        window.EventBus.emit('CVB_PULSE_UPDATED', {
            pulse,
            narrativeActivity: cMut + lGen,
            discoveryActivity: dRate + mGen,
            vitalityScore: this.vitalityScore
        });
    }

    detectAnomalies() {
        if (this.history.length < 10) return;

        const recent = this.history.slice(-10);
        const totalActivity = recent.reduce((sum, h) => 
            sum + h.discoveryRate + h.culturalMutation + h.politicalTurnover + h.mysteryGeneration + h.legendGeneration, 0);

        const currentDay = window.EngineParams?.worldDay || 0;
        const daysSinceEvent = currentDay - (this.lastEventDay || 0);

        // 1. STATIC WORLD DETECTION
        if (totalActivity < this.thresholds.STATIC_WORLD_DELTA) {
            this.simulationState = 'STATIC';
            this.reportAnomaly('STATIC_WORLD', 'Zero civilizational delta detected across all sectors.');
        } 
        // 2. FROZEN HISTORY DETECTION
        else if (daysSinceEvent > this.thresholds.FROZEN_HISTORY_DAYS) {
            this.simulationState = 'DEAD';
            this.reportAnomaly('FROZEN_HISTORY', `No significant events recorded for ${daysSinceEvent} days.`);
        }
        // 3. ZOMBIE STATE DETECTION (Stable but Dead)
        else if (this.vitalityScore < this.thresholds.ZOMBIE_VITALITY) {
            this.simulationState = 'ZOMBIE';
            this.reportAnomaly('ZOMBIE_STATE', 'Civilization is functioning but no new meaning is being generated.');
        }
        // 4. STAGNATION LOOP (High Activity, low net change)
        else if (this.detectStagnationLoop()) {
            this.simulationState = 'STAGNATING';
            this.reportAnomaly('STAGNATION_LOOP', 'High activity detected with high periodicity. Simulation may be caught in a feedback loop.');
        } else {
            this.simulationState = 'VIBRANT';
        }
    }

    detectStagnationLoop() {
        // Simple periodicity check: if the metrics repeat too closely
        if (this.history.length < 20) return false;
        
        // Compare recent window with previous window
        const w1 = this.history.slice(-10);
        const w2 = this.history.slice(-20, -10);

        let correlation = 0;
        for (let i = 0; i < 10; i++) {
            if (JSON.stringify(w1[i]) === JSON.stringify(w2[i])) correlation++;
        }

        return (correlation / 10) > this.thresholds.STAGNATION_LOOP_CORRELATION;
    }

    reportAnomaly(type, message) {
        window.EventBus.emit('UI_LOG', `⚠️ [CVB] ANOMALY DETECTED: ${type}`);
        window.EventBus.emit('UI_LOG_DEBUG', `[CVB] ${message}`);
        
        if (type === 'ZOMBIE_STATE' || type === 'STATIC_WORLD') {
            console.error(`%c[CVB] CIVILIZATIONAL COLLAPSE: ${type} - ${message}`, "background: #000; color: #f00; font-size: 1.2em;");
            // Potential trigger for Simulation Reset or Injecting Chaos
            window.EventBus.emit('SIMULATION_ZOMBIFIED', { type, score: this.vitalityScore });
        }
    }

    getStatus() {
        return {
            state: this.simulationState,
            score: this.vitalityScore,
            metrics: this.metrics,
            historyDepth: this.history.length
        };
    }
}

window.CivilizationalVitalityBureau = new CivilizationalVitalityBureau();
export default window.CivilizationalVitalityBureau;
