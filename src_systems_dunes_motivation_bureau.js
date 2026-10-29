/**
 * DARK FOREST ENGINE - DUNES MOTIVATION BUREAU
 * Explorer Motivation Observatory (EMO)
 * 
 * Determines why entities enter the Lost Regions and tracks their success.
 */

class DunesMotivationBureau {
    constructor() {
        this.motivationRegistry = new Map(); // ExpeditionID -> Motivation Details
        
        this.globalMetrics = {
            motivationFrequencies: {
                RUMOR: 0,
                SCARCITY: 0,
                DREAM: 0,
                EXILE: 0,
                CURIOSITY: 0,
                AMBITION: 0
            },
            successByMotivation: new Map(), // Motivation -> { successes, attempts }
            yieldByMotivation: new Map()    // Motivation -> totalYield
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        
        // Listen for expedition starts and results from DunesAnalytics
        window.EventBus.on('EXPEDITION_STARTED', (data) => this.recordMotivation(data));
        window.EventBus.on('EXPEDITION_RESOLVED', (data) => this.processResult(data));
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏜️ [EMO] Explorer Motivation Observatory Active');
        
        // Initialize maps for all motivations
        const motivations = ['RUMOR', 'SCARCITY', 'DREAM', 'EXILE', 'CURIOSITY', 'AMBITION'];
        motivations.forEach(m => {
            this.globalMetrics.successByMotivation.set(m, { successes: 0, attempts: 0 });
            this.globalMetrics.yieldByMotivation.set(m, 0);
        });
    }

    /**
     * Determines the motivation for an expedition based on actor state.
     */
    determineMotivation(actorId, profile) {
        if (actorId === 'player' || actorId === 'player_node') {
            // Player motivation is usually Curiosity or Ambition unless specific quest
            return profile?.currentQuest ? 'RUMOR' : 'CURIOSITY';
        }

        const traits = profile?.traits || {};
        const village = profile?.villageId && window.VillageManager?.villages ? 
            (Array.isArray(window.VillageManager.villages) ? 
                window.VillageManager.villages.find(v => v.id === profile.villageId) : 
                window.VillageManager.villages[profile.villageId]) : null;

        // 1. SCARCITY: If village resources are critical
        if (village && village.stats && village.stats.food < 10) return 'SCARCITY';

        // 2. EXILE: If reputation is extremely low
        if (profile?.reputation < -0.8) return 'EXILE';

        // 3. DREAM: If high mysticism/dream traits
        if (traits.mysticism > 0.7 || traits.dreamer > 0.7) return 'DREAM';

        // 4. RUMOR: If they hold "RUMOR" type intel
        if (window.IntelManager?.getIntelForNode(actorId).some(i => i.type === 'RUMOR')) return 'RUMOR';

        // 5. AMBITION vs CURIOSITY
        return traits.ambition > 0.6 ? 'AMBITION' : 'CURIOSITY';
    }

    /**
     * Records motivation at the start of an expedition.
     */
    recordMotivation(data) {
        const { expeditionId, actorId, profile } = data;
        const motivation = this.determineMotivation(actorId, profile);
        
        this.motivationRegistry.set(expeditionId, {
            actorId,
            motivation,
            day: window.EngineParams?.worldDay || 0
        });

        // Update Frequency
        this.globalMetrics.motivationFrequencies[motivation]++;
        
        // Update Attempts
        const stats = this.globalMetrics.successByMotivation.get(motivation);
        if (stats) stats.attempts++;

        window.EventBus.emit('UI_LOG_DEBUG', `[EMO] Expedition ${expeditionId} motivated by ${motivation}`);
    }

    /**
     * Processes the result of an expedition.
     */
    processResult(data) {
        const { expeditionId, outcome, yield: discoveryYield } = data;
        const entry = this.motivationRegistry.get(expeditionId);
        
        if (!entry) return;

        const motivation = entry.motivation;
        const stats = this.globalMetrics.successByMotivation.get(motivation);
        
        if (outcome === 'SUCCESS') {
            stats.successes++;
            const currentYield = this.globalMetrics.yieldByMotivation.get(motivation);
            this.globalMetrics.yieldByMotivation.set(motivation, currentYield + (discoveryYield || 0));
        }

        this.generateReport();
    }

    /**
     * Generates the Explorer Motivation Observatory report.
     */
    generateReport() {
        const report = {
            title: "Explorer Motivation Observatory",
            timestamp: window.EngineParams?.worldDay || 0,
            metrics: {
                frequencies: this.globalMetrics.motivationFrequencies,
                successRates: {},
                discoveryYields: Object.fromEntries(this.globalMetrics.yieldByMotivation)
            }
        };

        // Calculate Success Rates
        this.globalMetrics.successByMotivation.forEach((stats, motivation) => {
            report.metrics.successRates[motivation] = stats.attempts > 0 ? (stats.successes / stats.attempts) : 0;
        });

        window.EventBus.emit('EMO_REPORT_UPDATED', report);
        return report;
    }
}

window.EMO = new DunesMotivationBureau();
export default window.EMO;
