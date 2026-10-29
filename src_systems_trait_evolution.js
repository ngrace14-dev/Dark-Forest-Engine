






































































/**
 * GENESIS ENGINE - TRAIT EVOLUTION OBSERVATORY
 * Bureau: Trait Evolution
 * 
 * Tracks genetic and cultural drift of NPC traits across 1000-year simulations.
 * Measures behavioral convergence (stagnation) and divergence (innovation).
 */

class TraitEvolutionObservatory {
    constructor() {
        this.stats = {
            populationTraits: {
                ambition: { avg: 0.5, variance: 0, extinction: false },
                fear: { avg: 0.5, variance: 0, extinction: false },
                curiosity: { avg: 0.5, variance: 0, extinction: false },
                aggression: { avg: 0.5, variance: 0, extinction: false },
                loyalty: { avg: 0.5, variance: 0, extinction: false },
                adaptability: { avg: 0.5, variance: 0, extinction: false },
                discipline: { avg: 0.5, variance: 0, extinction: false },
                riskTolerance: { avg: 0.5, variance: 0, extinction: false }
            },
            diversityIndex: 1.0,      // 0.0 (Clones) to 1.0 (Unique)
            behavioralEntropy: 1.0,   // Randomness of actions
            evolutionVelocity: 0.0    // Rate of trait change per decade
        };

        this.history = []; // Snapshots over time
        this.lastSnapshot = null;

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T12H', () => this.pulse()); // Once per game day
    }

    init() {
        window.EventBus.emit('UI_LOG', '🧬 [Evolution] Trait Tracking Directorate Active');
    }

    pulse() {
        this.analyzePopulation();
        
        // Every 14 days (1 game year), record a snapshot
        if (window.EngineParams?.worldDay % 14 === 0) {
            this.recordSnapshot();
        }
    }

    analyzePopulation() {
        if (!window.PersonhoodManager || !window.PersonhoodManager.profiles) return;

        const profiles = Array.from(window.PersonhoodManager.profiles.values());
        const count = profiles.length;
        if (count === 0) return;

        const traitKeys = Object.keys(this.stats.populationTraits);
        const sums = {};
        const sqSums = {};
        traitKeys.forEach(k => { sums[k] = 0; sqSums[k] = 0; });

        profiles.forEach(p => {
            if (!p.traits) return;
            traitKeys.forEach(k => {
                const val = p.traits[k] ?? 0.5;
                sums[k] += val;
                sqSums[k] += val * val;
            });
        });

        // Update Averages and Variance
        let totalVariance = 0;
        traitKeys.forEach(k => {
            const avg = sums[k] / count;
            const variance = (sqSums[k] / count) - (avg * avg);
            this.stats.populationTraits[k].avg = avg;
            this.stats.populationTraits[k].variance = variance;
            this.stats.populationTraits[k].extinction = variance < 0.001; // Trait is effectively flat
            totalVariance += variance;
        });

        // 1. DIVERSITY INDEX: Mean Variance across all traits
        this.stats.diversityIndex = totalVariance / traitKeys.length;

        // 2. EVOLUTION VELOCITY
        if (this.lastSnapshot) {
            let totalDelta = 0;
            traitKeys.forEach(k => {
                totalDelta += Math.abs(this.stats.populationTraits[k].avg - this.lastSnapshot.populationTraits[k].avg);
            });
            this.stats.evolutionVelocity = totalDelta / traitKeys.length;
        }

        this.lastSnapshot = JSON.parse(JSON.stringify(this.stats));
    }

    recordSnapshot() {
        this.history.push({
            day: window.EngineParams?.worldDay || 0,
            stats: JSON.parse(JSON.stringify(this.stats))
        });

        // Detect Bottlenecks
        if (this.stats.diversityIndex < 0.05) {
            window.EventBus.emit('UI_LOG', '⚠️ [EVOLUTION] Genetic Bottleneck Detected. Trait diversity is critical.');
        }

        // Detect Stagnation
        if (this.stats.evolutionVelocity < 0.001 && window.EngineParams?.worldDay > 100) {
            window.EventBus.emit('UI_LOG_DEBUG', '[EVOLUTION] Evolutionary Stagnation: Population behavior has crystallized.');
        }
    }

    /**
     * Answers: Are populations converging?
     */
    getEvolutionStatus() {
        const convergence = this.stats.diversityIndex < 0.1;
        const drift = this.stats.evolutionVelocity > 0.05;

        return {
            status: convergence ? 'STAGNANT_CONVERGENCE' : (drift ? 'RAPID_ADAPTATION' : 'STABLE_DIVERSITY'),
            diversity: this.stats.diversityIndex,
            velocity: this.stats.evolutionVelocity,
            extinctTraits: Object.keys(this.stats.populationTraits).filter(k => this.stats.populationTraits[k].extinction)
        };
    }

    /**
     * Generates the 1000-Year Evolutionary Report
     */
    generateEvolutionReport() {
        return {
            title: "TRAIT EVOLUTION OBSERVATORY REPORT",
            simulation_age: window.EngineParams?.worldDay || 0,
            metrics: this.stats,
            history_depth: this.history.length,
            verdict: this._getEvolutionVerdict()
        };
    }

    _getEvolutionVerdict() {
        if (this.stats.diversityIndex < 0.05) return "CLONAL STAGNATION: The population is behaving as a single hive mind.";
        if (this.stats.diversityIndex > 0.4) return "HYPER-DIVERSITY: Trait noise is high; civilization may struggle to form cohesive institutions.";
        return "HEALTHY DRIFT: Diversity and velocity are within acceptable bounds for long-term survival.";
    }
}

window.TraitEvolution = new TraitEvolutionObservatory();
export default window.TraitEvolution;
