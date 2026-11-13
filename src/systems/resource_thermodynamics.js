/**
 * GENESIS ENGINE - RESOURCE THERMODYNAMICS OBSERVATORY
 * Directorate: Resource Thermodynamics
 * 
 * Enforces entropy, conservation, and circulation across Wealth, Information, and Significance.
 * Prevents the "Singularity" and "Heat Death" states identified in the 1000-year audit.
 */

class ResourceThermodynamicsObservatory {
    constructor() {
        this.stats = {
            wealthTotal: 0,
            wealthVelocity: 0,
            wealthHeatmap: new Map(), // VillageID -> Gold
            infoTotal: 0,
            infoTruthRatio: 1.0,
            infoHeatmap: new Map(), // VillageID -> Intel Count
            significanceTotal: 0,
            significanceGini: 0,
            prosperityAverage: 50
        };

        this.history = [];
        this.lastTotalWealth = 0;
        this.thresholds = {
            inflationCritical: 1000000,
            truthExtinction: 0.05,
            significanceMonopoly: 0.85
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', () => this.pulse());
        window.EventBus.on('SHIFT_COMPLETE', () => this.enforceEntropy());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🔥 [Thermodynamics] Monitoring System Metabolism');
    }

    pulse() {
        this.calculateMetrics();
        this.applyProsperityRadiance();
        this.checkStability();
    }

    calculateMetrics() {
        if (!window.VillageManager) return;

        let totalWealth = 0;
        let totalProsperity = 0;
        const villages = window.VillageManager.villages;

        villages.forEach(v => {
            totalWealth += (v.stats.gold || 0);
            totalProsperity += (v.stats.prosperity || 50);
            this.stats.wealthHeatmap.set(v.id, v.stats.gold || 0);
            
            if (window.IntelManager) {
                const count = window.IntelManager.getIntelForNode(`village_${v.id}`).length;
                this.stats.infoHeatmap.set(v.id, count);
            }
        });

        this.stats.wealthTotal = totalWealth;
        this.stats.prosperityAverage = totalProsperity / (villages.length || 1);

        // Calculate Wealth Velocity (Flow rate)
        if (this.lastTotalWealth > 0) {
            this.stats.wealthVelocity = Math.abs(totalWealth - this.lastTotalWealth);
        }
        this.lastTotalWealth = totalWealth;

        // Information Metrics
        if (window.IntelManager) {
            const allIntel = Array.from(window.IntelManager.registry.values());
            this.stats.infoTotal = allIntel.length;
            const trueIntel = allIntel.filter(i => i.truth_state === 'TRUE').length;
            this.stats.infoTruthRatio = trueIntel / (allIntel.length || 1);
        }

        // Significance Metrics (Sync with Crow Observatory)
        if (window.CrowObservatory) {
            this.stats.significanceGini = window.CrowObservatory.metrics.giniCoefficient;
        }
    }

    /**
     * Prosperity Radiance (Thermodynamics Law of Diffusion)
     * Prosperous villages "leak" benefits to connected neighbors.
     */
    applyProsperityRadiance() {
        if (!window.VillageManager) return;

        const villages = window.VillageManager.villages;
        villages.forEach(v => {
            if (v.stats.prosperity > 80) {
                // Highly prosperous village radiates to neighbors
                v.connections.forEach(neighborId => {
                    const neighbor = villages.find(n => n.id === neighborId);
                    if (neighbor && neighbor.stats.prosperity < 60) {
                        const radiance = 1;
                        neighbor.stats.prosperity += radiance;
                        window.EventBus.emit('UI_LOG_DEBUG', `[RADIANCE] ${v.name}'s prosperity helped ${neighbor.name}.`);
                    }
                });
            }
        });
    }

    /**
     * Enforces the Laws of Thermodynamics (Entropy).
     * Applied during Epoch Shifts to ensure the new world is not born "bloated."
     */
    enforceEntropy() {
        window.EventBus.emit('UI_LOG', '📉 [Thermodynamics] Applying Global Entropy...');

        // 1. Wealth Decay (Maintenance Costs)
        if (window.VillageManager && window.VillageManager.villages) {
            window.VillageManager.villages.forEach(v => {
                if (!v.stats) return;
                const tax = Math.floor((v.stats.gold || 0) * 0.1); // 10% maintenance tax
                v.stats.gold = (v.stats.gold || 0) - tax;
                if (tax > 0) window.EventBus.emit('UI_LOG_DEBUG', `[ENTROPY] ${v.name} paid ${tax} gold in maintenance.`);
            });
        }

        // 2. Truth Half-Life (Forgetting)
        if (window.IntelManager && window.IntelManager.registry) {
            window.IntelManager.registry.forEach((intel, id) => {
                // Verified truths degrade back to rumors if not "refreshed"
                if (intel.type === 'FACT' && !intel.isAnchored) {
                    const day = window.EngineParams?.worldDay || 0;
                    const timestamp = intel.payload?.timestamp_day || day;
                    const age = day - timestamp;
                    if (age > 50) { // 50-day half-life for un-anchored facts
                        intel.type = 'RUMOR';
                        intel.certainty = (intel.certainty || 1.0) * 0.5;
                        window.EventBus.emit('UI_LOG_DEBUG', `[ENTROPY] Fact "${intel.payload?.title}" has faded into rumor.`);
                    }
                }
            });
        }

        // 3. Significance Evaporation
        if (window.LegacyManager && window.LegacyManager.activeLegacies) {
            window.LegacyManager.activeLegacies.forEach(legacy => {
                // Significance decays 5% per shift unless renewed
                const decay = Math.floor((legacy.storyDensity || 0) * 0.05);
                legacy.storyDensity = Math.max(0, (legacy.storyDensity || 0) - decay);
            });
        }
    }

    checkStability() {
        const index = this.getThermodynamicHealthIndex();
        if (index < 40) {
            window.EventBus.emit('UI_LOG', `⚠️ [CRITICAL] Thermodynamic Health Low: ${index.toFixed(1)}. Heat Death Imminent.`);
        }
    }

    getThermodynamicHealthIndex() {
        // Higher is healthier. Perfect = 100.
        let score = 100;

        // Penalty for Significance Monopoly
        if (this.stats.significanceGini > this.thresholds.significanceMonopoly) {
            score -= (this.stats.significanceGini - this.thresholds.significanceMonopoly) * 200;
        }

        // Penalty for Truth Extinction
        if (this.stats.infoTruthRatio < this.thresholds.truthExtinction) {
            score -= 50;
        }

        // Penalty for Prosperity Collapse
        if (this.stats.prosperityAverage < 20) {
            score -= 40;
        }

        return Math.max(0, score);
    }

    /**
     * RESOURCE THERMODYNAMICS OBSERVATORY OUTPUT
     * Provides the raw diagnostic state for audit bureau review.
     */
    generateDiagnosticReport() {
        return {
            timestamp: window.EngineParams?.worldDay || 0,
            healthIndex: this.getThermodynamicHealthIndex(),
            thermodynamics: {
                wealth: {
                    total: this.stats.wealthTotal,
                    velocity: this.stats.wealthVelocity,
                    concentration: "Refer to Village Heatmap"
                },
                information: {
                    total: this.stats.infoTotal,
                    truthRatio: this.stats.infoTruthRatio,
                    extinctionRisk: this.stats.infoTruthRatio < this.thresholds.truthExtinction ? 'HIGH' : 'LOW'
                },
                significance: {
                    gini: this.stats.significanceGini,
                    monopolyRisk: this.stats.significanceGini > this.thresholds.significanceMonopoly ? 'CRITICAL' : 'STABLE'
                }
            },
            heatmaps: {
                wealth: Object.fromEntries(this.stats.wealthHeatmap),
                information: Object.fromEntries(this.stats.infoHeatmap)
            }
        };
    }
}

window.Thermodynamics = new ResourceThermodynamicsObservatory();
export default window.Thermodynamics;
