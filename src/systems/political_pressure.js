/**
 * GENESIS ENGINE - POLITICAL PRESSURE OBSERVATORY
 * Directorate: Political Stability
 * 
 * Tracks the accumulation of systemic stress across Noble Houses and the Crown.
 * Forecasts "Political Earthquakes" (Coups, Revolts, Reforms).
 */

class PoliticalPressureObservatory {
    constructor() {
        this.housePressure = new Map(); // HouseID -> { pressure, gradients, lastForecast }
        this.globalStability = 1.0;

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T12H', () => this.auditPressure());
        window.EventBus.on('SUCCESSION', (data) => this.recordReleaseEvent(data.actorId, 'SUCCESSION'));
        window.EventBus.on('MONOPOLY_UPDATED', (data) => this.recordReleaseEvent(data.houseId, 'MONOPOLY_SHIFT'));
    }

    init() {
        window.EventBus.emit('UI_LOG', '⚖️ [Politics] Pressure Observatory Active');
    }

    /**
     * Measures the accumulation of systemic stress.
     */
    auditPressure() {
        if (!window.DynastyManager) return;

        let globalStress = 0;
        window.DynastyManager.houses.forEach(house => {
            const pressureData = this.calculateHousePressure(house);
            this.housePressure.set(house.id, pressureData);
            globalStress += pressureData.total;

            if (pressureData.total > 0.8) {
                this.generateEarthquakeWarning(house, pressureData);
            }
        });

        this.globalStability = Math.max(0, 1.0 - (globalStress / (window.DynastyManager.houses.size || 1)));
    }

    calculateHousePressure(house) {
        if (!house) return { total: 0, components: {}, day: 0 };

        // 1. LEGITIMACY DEFICIT
        const legitimacyPressure = 1.0 - (house.legitimacy ?? 0.5);

        // 2. ECONOMIC STRESS
        const villages = window.VillageManager?.villages || [];
        const houseVillages = villages.filter(v => v.nobleHouse === house.name);
        
        let economicStress = 0.5; // Default if no villages
        if (houseVillages.length > 0) {
            const avgProsperity = houseVillages.reduce((sum, v) => sum + (v.stats?.prosperity ?? 50), 0) / houseVillages.length;
            economicStress = 1.0 - (avgProsperity / 100);
        }

        // 3. INFORMATION PRESSURE (Exposure Anxiety)
        const infoPressure = house.exposureAnxiety ?? 0;

        // 4. SUCCESSION TENSION
        let ageTension = 0.5;
        if (window.PersonhoodManager?.profiles && house.currentLeader) {
            const leaderProfile = window.PersonhoodManager.profiles.get(house.currentLeader);
            if (leaderProfile) {
                ageTension = Math.min(1.0, (leaderProfile.age ?? 50) / 300);
            }
        }

        let lastFidelity = 1.0;
        if (window.ContinuityObservatory?.houseFidelityLedger) {
            const fidelityHistory = window.ContinuityObservatory.houseFidelityLedger.get(house.id)?.snapshots || [];
            if (fidelityHistory.length > 0) {
                lastFidelity = fidelityHistory[fidelityHistory.length - 1].fidelity ?? 1.0;
            }
        }
        
        const successionTension = (ageTension * 0.6) + ((1.0 - lastFidelity) * 0.4);

        // 5. MONOPOLY PRESSURE
        const monopolyPressure = house.isBlessed ? 0.2 : 0.6;

        const total = (
            legitimacyPressure * 0.3 +
            economicStress * 0.2 +
            infoPressure * 0.2 +
            successionTension * 0.2 +
            monopolyPressure * 0.1
        );

        return {
            total,
            components: { legitimacyPressure, economicStress, infoPressure, successionTension, monopolyPressure },
            day: window.EngineParams?.worldDay || 0
        };
    }

    generateEarthquakeWarning(house, data) {
        let eventType = "REFORM_CRISIS";
        if (data.components.legitimacyPressure > 0.7 && data.total > 0.85) {
            eventType = "COUP_D_ETAT";
        } else if (data.components.economicStress > 0.7) {
            eventType = "POPULAR_REVOLT";
        }

        window.EventBus.emit('UI_LOG', `🚨 [FORECAST] House ${house.name} is approaching a ${eventType} (Pressure: ${data.total.toFixed(2)})`);
        
        // Potential Release Logic
        if (data.total > 0.95 && Math.random() < 0.1) {
            this.triggerPressureRelease(house, eventType);
        }
    }

    triggerPressureRelease(house, type) {
        if (!house) return;
        window.EventBus.emit('UI_LOG', `💥 [EARTHQUAKE] ${type} has occurred in ${house.name}!`);
        
        switch(type) {
            case 'COUP_D_ETAT':
                if (window.DynastyManager) {
                    window.DynastyManager.triggerSuccession(house);
                    house.legitimacy = 0.4; // Reset with "New Order"
                }
                break;
            case 'POPULAR_REVOLT':
                house.prestige = Math.max(0, (house.prestige || 0) - 50);
                if (window.VillageManager?.villages) {
                    const houseVillages = window.VillageManager.villages.filter(v => v.nobleHouse === house.name);
                    houseVillages.forEach(v => { 
                        if (v.stats) {
                            v.stats.gold = 0; 
                            v.stats.prosperity = 20; 
                        }
                    });
                }
                break;
        }

        this.recordReleaseEvent(house.id, type);
    }

    recordReleaseEvent(houseId, type) {
        window.EventBus.emit('POLITICAL_PRESSURE_RELEASE', { houseId, type, day: window.EngineParams?.worldDay || 0 });
    }

    generatePressureReport() {
        return {
            title: "POLITICAL PRESSURE OBSERVATORY REPORT",
            global_stability: this.globalStability,
            house_rankings: Array.from(this.housePressure.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([id, data]) => ({ id, pressure: data.total })),
            verdict: this._getVerdict()
        };
    }

    _getVerdict() {
        if (this.globalStability < 0.4) return "ANARCHY IMMINENT: Pressure gradients are peaking globally.";
        if (this.globalStability < 0.7) return "VOLATILE: Regional instability is triggering frequent release events.";
        return "STABLE: Institutional structures are successfully venting pressure.";
    }
}

window.PoliticalPressure = new PoliticalPressureObservatory();
export default window.PoliticalPressure;
