/**
 * DARK FOREST ENGINE - ADVERSARIAL EVOLUTION DIRECTORATE
 * Observability Framework for Non-Civilizational Intelligence
 * 
 * Tracks the adaptive capacity and strategic evolution of the Forest and its avatars.
 */

class AdversarialLearningSystem {
    constructor() {
        this.metrics = {
            adversarialLearningIndex: 0.1, // Scale 0-1 (Capacity to counter civilizational memory)
            forestPressureIndex: 0.3,      // Scale 0-1 (Active resistance to stability)
            harvestEfficiencyScore: 0.5,    // Scale 0-1 (Yield vs. Effort)
            predatorInnovationScore: 0.2    // Scale 0-1 (Novelty of hunting patterns)
        };

        this.adversaries = {
            'Forest': {
                learningRate: 0.05,
                adaptationTriggers: ['Stability_Plateau', 'Territory_Recapture'],
                feedbackLoop: 'Chunk_Corruption_Rate',
                inputs: ['Civilizational_Expansion', 'Barrier_Integrity'],
                counterplayPotential: 'Controlled_Burn_Logistics',
                lastAdaptationDay: 0
            },
            'Wendigo': {
                learningRate: 0.15,
                adaptationTriggers: ['High_Significance_Target', 'Combat_Failure'],
                feedbackLoop: 'Harvest_Yield',
                inputs: ['Significance_Density', 'Historical_Weight'],
                counterplayPotential: 'Legend_Dilution_Protocol',
                lastAdaptationDay: 0
            },
            'Huntsman': {
                learningRate: 0.02,
                adaptationTriggers: ['Candidate_Mastery', 'Intervention_Efficiency'],
                feedbackLoop: 'Cultivation_Progress',
                inputs: ['Player_Combat_Mastery', 'Hero_Archetype_Emergence'],
                counterplayPotential: 'Mediocrity_Vow',
                lastAdaptationDay: 0
            },
            'Orb': {
                learningRate: 0.25,
                adaptationTriggers: ['Discovery_Tier_Shift', 'Information_Containment'],
                feedbackLoop: 'Observation_Fidelity',
                inputs: ['Intel_Fidelity', 'Forbidden_Fact_Access'],
                counterplayPotential: 'Epistemic_Obfuscation',
                lastAdaptationDay: 0
            },
            'Pale Sovereign': {
                learningRate: 0.01,
                adaptationTriggers: ['Cultivation_Completion', 'Mantle_Sacrifice'],
                feedbackLoop: 'Civilizational_Entropy',
                inputs: ['Grand_Harvest_Readiness', 'Continuity_Collapse'],
                counterplayPotential: 'The_Trinity_of_Choice',
                lastAdaptationDay: 0
            }
        };

        this.tracking = {
            predatorLearning: [],
            huntingPatternEvolution: [],
            harvestSuccessRate: [],
            candidateSelectionDrift: 0, // Measure of how far targets deviate from low-significance NPCs
            forceAdaptation: [],
            strategicEvolution: []
        };
        this.init();
    }

    init() {
        window.EventBus.on('ENGINE_READY', () => {
            window.EventBus.emit('UI_LOG', '👁️ [AED] Adversarial Evolution Directorate Online.');
            
            // Start heartbeat for validation
            window.EventBus.on('HEARTBEAT_T3', () => this.validateState());
        });

        // Listen for events that drive adversarial learning
        window.EventBus.on('PLAYER_DEATH', (data) => this.processHarvest(data, 'Wendigo'));
        window.EventBus.on('HUNTSMAN_INTERVENTION', () => this.processAdaptation('Huntsman'));
        window.EventBus.on('VILLAGE_RECAPTURED', () => this.processAdaptation('Forest'));
        window.EventBus.on('DISCOVERY_TIER_INCREASED', () => this.processAdaptation('Orb'));
        window.EventBus.on('HARVEST_CYCLE_BEGINS', () => this.processAdaptation('Pale Sovereign'));
    }

    /**
     * Process a successful or failed harvest to update predator learning.
     */
    processHarvest(data, predatorType) {
        const predator = this.adversaries[predatorType];
        if (!predator) return;

        // Increase innovation score on successful kills of high-significance targets
        const targetSignificance = data?.significance || 0.1;
        this.metrics.predatorInnovationScore = Math.min(1.0, this.metrics.predatorInnovationScore + (targetSignificance * 0.1));
        
        // Harvest Efficiency = Significance / Difficulty
        const difficulty = data?.difficulty || 1.0;
        const efficiency = targetSignificance / difficulty;
        this.metrics.harvestEfficiencyScore = (this.metrics.harvestEfficiencyScore * 0.9) + (efficiency * 0.1);

        // Track Candidate Selection Drift: Are we hunting more significant targets than average?
        const avgSignificance = 100; // Baseline
        this.tracking.candidateSelectionDrift = (targetSignificance - avgSignificance) / avgSignificance;

        this.updateGlobalLearning();
    }

    /**
     * Process general adaptation triggers.
     */
    processAdaptation(adversaryName) {
        const adv = this.adversaries[adversaryName];
        if (!adv) return;

        const currentDay = window.EngineParams?.worldDay || 0;
        adv.lastAdaptationDay = currentDay;

        // Adaptation increases the global learning index
        this.metrics.adversarialLearningIndex = Math.min(1.0, this.metrics.adversarialLearningIndex + adv.learningRate);
        
        // Forest Pressure scales with civilizational resistance
        if (adversaryName === 'Forest' || adversaryName === 'Wendigo') {
            this.metrics.forestPressureIndex = Math.min(1.0, this.metrics.forestPressureIndex + 0.05);
        }

        window.EventBus.emit('UI_LOG_DEBUG', `[AED] Adversary Adapted: ${adversaryName} at Day ${currentDay}`);
        this.updateGlobalLearning();
    }

    updateGlobalLearning() {
        // Balancing logic: Adversarial learning scales against Civilizational learning
        const civLearning = window.GCAB?.learningMetrics?.learningIndex || 0.5;
        
        // If civilization learns too fast, adversaries innovate harder
        if (civLearning > this.metrics.adversarialLearningIndex) {
            this.metrics.predatorInnovationScore = Math.min(1.0, this.metrics.predatorInnovationScore + 0.01);
        }

        this.syncWithForceManager();
    }

    /**
     * Diagnostic Validation - Log internal metrics if debug mode is active
     */
    validateState() {
        if (window.EngineConfig?.showSystemReasoning) {
            console.log('[AED_VALIDATION] Metrics:', this.metrics);
            console.log('[AED_VALIDATION] Adversaries:', this.adversaries);
        }
    }

    syncWithForceManager() {
        if (!window.ForceManager) return;

        // Inject AED metrics into ForceManager for global impact
        // Forest strength is boosted by Pressure Index
        if (window.ForceManager.forces['Forest']) {
            window.ForceManager.forces['Forest'].strength += Math.floor(this.metrics.forestPressureIndex * 100);
        }

        // Wendigo strength is boosted by Innovation and Harvest Efficiency
        if (window.ForceManager.forces['Wendigo']) {
            window.ForceManager.forces['Wendigo'].strength += Math.floor(this.metrics.predatorInnovationScore * 50);
        }
    }

    /**
     * Comprehensive Observability Report
     */
    generateObservabilityReport() {
        return {
            timestamp: Date.now(),
            globalMetrics: { ...this.metrics },
            adversaryStates: Object.keys(this.adversaries).map(name => ({
                name,
                ...this.adversaries[name],
                currentInfluence: window.ForceManager?.getForceStrength(name) || 0
            })),
            civilizationalParity: this.metrics.adversarialLearningIndex / (window.GCAB?.learningMetrics?.learningIndex || 1)
        };
    }
}

window.AED = new AdversarialLearningSystem();
export default window.AED;
