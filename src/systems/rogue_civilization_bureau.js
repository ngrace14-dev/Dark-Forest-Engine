/**
 * DARK FOREST ENGINE - ROGUE CIVILIZATION BUREAU (RCB)
 * 
 * Objective: Identify settlements that transition from dependencies to independent power centers.
 * Determines if a shift is a localized 'Crisis' or an 'Emergent Civilization'.
 */

class RogueCivilizationBureau {
    constructor() {
        this.monitoredSettlements = new Map(); // villageId -> IntelligenceProfile
        this.historyLog = [];
        
        this.thresholds = {
            EMERGENCE_SCORE: 0.75, // Score required to be considered an Emergent Civilization
            CRISIS_ENTROPY: 0.6,   // World Entropy level that classifies emergence as a Crisis
            SOVEREIGNTY_LEVELS: ['DEPENDENT', 'SEMI_AUTONOMOUS', 'INDEPENDENT', 'SOVEREIGN']
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', () => this.assessAllSettlements());
    }

    init() {
        window.EventBus.emit('UI_LOG', '📉 [RCB] Rogue Civilization Bureau operational. Monitoring regional divergence.');
    }

    /**
     * Main assessment loop for the Bureau.
     */
    assessAllSettlements() {
        if (!window.VillageManager) return;

        window.VillageManager.villages.forEach(village => {
            if (village.capital) return; // The Capital is the baseline, not a rogue entity

            const profile = this.analyzeSettlement(village);
            this.monitoredSettlements.set(village.id, profile);

            // Determine Status: Crisis or Emergent Civilization?
            this.determineStatus(village, profile);
        });
    }

    /**
     * Analyzes a settlement across 5 key independence vectors.
     */
    analyzeSettlement(village) {
        const fuelScore = this.calculateFuelIndependence(village);
        const economyScore = this.calculateEconomicIndependence(village);
        const historyScore = this.calculateHistoricalDepth(village);
        const militaryScore = this.calculateMilitaryCapacity(village);
        const cultureScore = this.calculateCulturalDivergence(village);

        // Power Center Index (PCI) - Raw capability
        const pci = (militaryScore * 0.4) + (economyScore * 0.3) + (fuelScore * 0.3);
        
        // Civilizational Independence Score (CIS) - Degree of separation
        const cis = (fuelScore * 0.25) + (cultureScore * 0.25) + (historyScore * 0.2) + (this.getSovereigntyBonus(village) * 0.3);

        // Regional Sovereignty Rating (RSR)
        const rsr = this.calculateRSR(village, cis);

        return {
            villageId: village.id,
            name: village.name,
            vectors: {
                fuel: fuelScore,
                economy: economyScore,
                history: historyScore,
                military: militaryScore,
                culture: cultureScore
            },
            pci,
            cis,
            rsr,
            timestamp: Date.now()
        };
    }

    /**
     * 1. Independent Fuel Sources
     * Tracking: Essence reserves, refinement stock, and lack of Royal dependency.
     */
    calculateFuelIndependence(village) {
        const essence = village.stats.essence || 0;
        const refinement = village.stats.refinementStock ? 
            Object.values(village.stats.refinementStock).reduce((a, b) => a + b, 0) : 0;
        const dependency = village.fuelRequested ? 0 : 1; // 1 if they aren't asking for help
        
        // High score if they have essence, materials, and aren't begging the crown
        let score = (Math.min(essence, 50) / 50) * 0.5 + 
                    (Math.min(refinement, 200) / 200) * 0.3 + 
                    (dependency * 0.2);
        
        if (village.nobleHouse === 'House Terminus') score = Math.max(score, 0.8); // Terminus has deep reserves
        return score;
    }

    /**
     * 2. Independent Economies
     * Tracking: Gold, Prosperity, and Monopoly status.
     */
    calculateEconomicIndependence(village) {
        const gold = village.stats.gold || 0;
        const prosperity = village.stats.prosperity || 0;
        const hasMonopoly = village.hasMonopoly ? 1 : 0;
        
        return (Math.min(gold, 5000) / 5000) * 0.4 + 
               (prosperity / 100) * 0.4 + 
               (hasMonopoly * 0.2);
    }

    /**
     * 3. Independent Histories
     * Tracking: Significant events recorded in the Chronicle for this village.
     */
    calculateHistoricalDepth(village) {
        if (!window.ChronicleManager || !window.ChronicleManager.worldLedger) return 0.1;
        
        const villageEvents = window.ChronicleManager.worldLedger.filter(e => e.actorId === `village_${village.id}` || e.witnesses?.includes(`village_${village.id}`));
        const significantEvents = villageEvents.filter(e => e.significance > 50).length;
        
        return Math.min(1.0, significantEvents / 5); // 5 major events = full depth
    }

    /**
     * 4. Independent Military Capacity
     * Tracking: Squad count, elite guard status, and success in repelling raids.
     */
    calculateMilitaryCapacity(village) {
        const squads = (village.squads || []).length;
        const elite = (village.terminusEliteGuard > 0) ? 1 : 0;
        const control = (village.territory?.control || 0) / 100;
        
        return (Math.min(squads, 5) / 5) * 0.5 + 
               (elite * 0.3) + 
               (control * 0.2);
    }

    /**
     * 5. Independent Cultural Identity
     * Tracking: Divergence from 'NEUTRAL' and strength of dominant traits.
     */
    calculateCulturalDivergence(village) {
        if (!village.culture || village.culture.dominantTrait === 'NEUTRAL') return 0;
        
        const trait = village.culture.traits.get(village.culture.dominantTrait);
        const weight = trait ? trait.weight : 0;
        
        // Higher weight in a specific trait = higher divergence
        return weight;
    }

    getSovereigntyBonus(village) {
        switch(village.feudalState) {
            case 'SOVEREIGN': return 1.0;
            case 'INDEPENDENT': return 0.8;
            case 'PARTIALLY_SOVEREIGN': return 0.7;
            case 'SEMI_AUTONOMOUS': return 0.4;
            default: return 0;
        }
    }

    calculateRSR(village, cis) {
        if (cis > 0.9) return 'SOVEREIGN_REIGN';
        if (cis > 0.7) return 'AUTONOMOUS_POLITY';
        if (cis > 0.4) return 'CONTRASTING_LOYALTY';
        return 'CROWN_DEPENDENT';
    }

    /**
     * Determines if a settlement is a Crisis (threat to order) or an Emergent Civilization (new order).
     */
    determineStatus(village, profile) {
        const entropy = window.CivilizationState?.scalars.WORLD_ENTROPY || 0;
        const cohesion = window.CivilizationState?.scalars.COHESION_INDEX || 1;
        
        // Logic: 
        // Emergence + High Entropy = Crisis (Sovereignty born of chaos)
        // Emergence + Low Entropy = Emergent Civilization (Sovereignty born of strength)
        
        if (profile.cis > this.thresholds.EMERGENCE_SCORE) {
            const isCrisis = (entropy > this.thresholds.CRISIS_ENTROPY) || (cohesion < 0.3);
            const status = isCrisis ? 'CRISIS' : 'EMERGENT_CIVILIZATION';
            
            if (village._lastReportedStatus !== status) {
                village._lastReportedStatus = status;
                this.logEmergence(village, status, profile);
            }
        }
    }

    logEmergence(village, status, profile) {
        const color = status === 'CRISIS' ? '#f87171' : '#60a5fa';
        const icon = status === 'CRISIS' ? '⚠️' : '🏛️';
        
        window.EventBus.emit('UI_LOG', `${icon} [RCB] ${village.name} identified as ${status.replace('_', ' ')}.`);
        window.EventBus.emit('UI_LOG_DEBUG', `[RCB] PCI: ${profile.pci.toFixed(2)}, CIS: ${profile.cis.toFixed(2)}, RSR: ${profile.rsr}`);

        // Record in historical log
        this.historyLog.push({
            day: window.EngineParams?.worldDay || 0,
            villageId: village.id,
            status: status,
            profile: profile
        });

        // Trigger Anomaly Bureau if it's a high-threat Crisis
        if (status === 'CRISIS' && profile.pci > 0.8 && window.GAB) {
            window.GAB.reportAnomaly('ROGUE_POWER_CENTER', village.id, 3, 
                `${village.name} has achieved high power (PCI: ${profile.pci.toFixed(2)}) during high world entropy.`);
        }
        
        // Notify Chronicle
        window.ChronicleManager?.recordEvent({
            actorId: `village_${village.id}`,
            type: 'CIVILIZATIONAL_EMERGENCE',
            detail: `${village.name} has been classified as a ${status.toLowerCase().replace('_', ' ')} by the Bureau.`,
            significance: 150,
            historicalWeight: 100
        });
    }

    /**
     * Returns the current autonomous civilization framework data.
     */
    getFrameworkData() {
        return {
            settlements: Array.from(this.monitoredSettlements.values()),
            globalMetrics: {
                totalEmergent: Array.from(this.monitoredSettlements.values()).filter(p => p.cis > this.thresholds.EMERGENCE_SCORE).length,
                averageIndependence: Array.from(this.monitoredSettlements.values()).reduce((sum, p) => sum + p.cis, 0) / Math.max(1, this.monitoredSettlements.size)
            }
        };
    }
}

window.RCB = new RogueCivilizationBureau();
export default window.RCB;
