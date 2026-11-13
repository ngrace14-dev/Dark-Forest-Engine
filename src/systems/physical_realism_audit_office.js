/**
 * DARK FOREST ENGINE - PHYSICAL REALISM AUDIT OFFICE (PRAO)
 * 
 * Objective: Investigate if abstracted travel creates unrealistic economic outcomes.
 * Analyzes the gap between "Ghost Caravans" and "Fully Simulated Traversal."
 */

class PhysicalRealismAuditOffice {
    constructor() {
        this.auditLog = [];
        this.simulationGaps = new Map(); // routeId -> gapProfile
        
        this.baselines = {
            AVERAGE_WALKING_SPEED: 1.2, // meters per second
            MONSTER_DENSITY_THRESHOLD: 0.15, // monsters per 100m
            CARAVAN_SURVIVABILITY_EXPECTED: 0.85, // 85% should make it
            MAX_TRAVEL_DAYS_WITHOUT_REST: 3
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T6H', () => this.performAudit());
    }

    init() {
        window.EventBus.emit('UI_LOG', '⚖️ [PRAO] Physical Realism Audit Office engaged. Investigating travel abstraction.');
    }

    /**
     * Main audit loop.
     */
    performAudit() {
        if (!window.VillageManager) return;

        const report = {
            day: window.EngineParams?.worldDay || 0,
            routes: [],
            globalRiskIndex: 0,
            summary: ""
        };

        window.VillageManager.villages.forEach(v => {
            v.caravans.forEach(caravan => {
                if (caravan.status === 'traveling') {
                    const routeAudit = this.auditRoute(v, caravan);
                    report.routes.push(routeAudit);
                }
            });
        });

        this.calculateGlobalRisk(report);
        this.auditLog.push(report);
        
        // Output result if significant gaps are found
        this.checkForSystemicShortcut(report);
    }

    /**
     * Analyzes a specific caravan's travel reality.
     */
    auditRoute(sourceVillage, caravan) {
        const destVillage = window.VillageManager.villages.find(v => v.id === caravan.targetVillageId);
        if (!destVillage) return null;

        const distance = Math.hypot(destVillage.x - sourceVillage.x, destVillage.z - sourceVillage.z);
        const travelTimeAbstract = (window.EngineParams?.worldDay - caravan.launchedOnDay) || 0.1;
        
        // 1. Travel Time Audit
        // Real time = distance / speed. 
        // 40m/s (abstract speed) vs 1.2m/s (simulated walking)
        const realTimeRequiredSeconds = distance / this.baselines.AVERAGE_WALKING_SPEED;
        const realTimeRequiredDays = realTimeRequiredSeconds / (60 * 60 * 24);
        
        // 2. Monster Encounter Probability (Travel Risk Index)
        const tri = this.calculateTravelRiskIndex(sourceVillage, destVillage, distance);
        
        // 3. Caravan Mortality (Simulated vs Abstract)
        const mortalityGap = this.calculateMortalityGap(caravan, tri);

        // 4. Route Realism Score (RRS)
        const rrs = this.calculateRRS(travelTimeAbstract, realTimeRequiredDays, tri, mortalityGap);

        return {
            caravanId: caravan.id,
            origin: sourceVillage.name,
            destination: destVillage.name,
            distance,
            rrs,
            tri,
            mortalityGap,
            shortcutDetected: rrs < 0.4
        };
    }

    /**
     * Route Realism Score (RRS)
     * High = Realistic, Low = "Ghost Travel" / Exploitable.
     */
    calculateRRS(abstractDays, simulatedDays, tri, mortalityGap) {
        // Penalty for being too fast compared to physics
        const timeRatio = Math.min(abstractDays / simulatedDays, 1.0);
        
        // Penalty for skipping high-risk monster zones
        const riskPenalty = (1.0 - tri) * 0.5;
        
        // Penalty for low mortality in high-risk zones
        const mortalityPenalty = (1.0 - mortalityGap) * 0.5;

        return (timeRatio * 0.4) + riskPenalty + mortalityPenalty;
    }

    /**
     * Travel Risk Index (TRI)
     * Estimates probability of lethal encounters based on world state.
     */
    calculateTravelRiskIndex(v1, v2, distance) {
        const entropy = window.CivilizationState?.scalars.WORLD_ENTROPY || 0.1;
        const forestPressure = window.AED?.forestAdaptationLevel || 1.0;
        
        // Risk increases with distance, entropy, and forest pressure
        let risk = (distance / 50000) * 0.2 + (entropy * 0.4) + (forestPressure * 0.1);
        
        // Mitigation: If on a "Warded Road"
        if (window.RoadManager) {
            risk *= 0.5; 
        }

        return Math.min(1.0, risk);
    }

    /**
     * Calculates the difference between expected simulated mortality and abstract survival.
     */
    calculateMortalityGap(caravan, tri) {
        // Abstract caravans currently have ~0% mortality in the core loop
        // Simulated mortality would be proportional to TRI and lack of escorts
        const escortPower = caravan.isRoyalShipment ? 0.8 : 0.2;
        const expectedMortality = Math.max(0, tri - escortPower);
        
        return expectedMortality; // The "Gap" is the mortality we are ignoring
    }

    calculateGlobalRisk(report) {
        if (report.routes.length === 0) return;
        report.globalRiskIndex = report.routes.reduce((sum, r) => sum + r.tri, 0) / report.routes.length;
    }

    /**
     * Determines if trade networks are surviving purely because of simulation shortcuts.
     */
    checkForSystemicShortcut(report) {
        if (report.routes.length === 0) return;
        const shortcuts = report.routes.filter(r => r.shortcutDetected);
        const shortcutRatio = shortcuts.length / report.routes.length;

        if (shortcutRatio > 0.5) {
            window.EventBus.emit('UI_LOG', `⚖️ [PRAO] SYSTEMIC SHORTCUT DETECTED: ${Math.floor(shortcutRatio * 100)}% of trade is physically impossible.`);
            window.EventBus.emit('UI_LOG_DEBUG', `[PRAO] Average RRS: ${ (report.routes.reduce((s, r) => s + r.rrs, 0) / report.routes.length).toFixed(2) }`);
            
            // --- SIMULATION SHORTCUT REPORT ---
            this.generateSimulationShortcutReport(report, shortcuts);
        }
    }

    generateSimulationShortcutReport(report, shortcuts) {
        if (shortcuts.length === 0) return;
        const royalShortcutRatio = shortcuts.filter(s => s.caravanId.includes('royal')).length / shortcuts.length;
        const summary = `
            REALISM AUDIT: Day ${report.day}
            - Systemic Gap: Trade networks are surviving high-risk zones without physical traversal.
            - Ghost Caravan Mortality: 0% (Abstract) vs Expected ${ (report.globalRiskIndex * 100).toFixed(1) }% (Physical).
            - Escort Logic: Inactive for ${ ((1 - royalShortcutRatio) * 100).toFixed(1) }% of trade.
            - VERDICT: Economic Realism is CRITICAL. The Economy is a "Ghost System."
        `;
        
        console.warn("%c ECONOMIC REALISM AUDIT ", "background: #7c2d12; color: #fdba74; font-weight: bold; padding: 5px;", summary);
        
        // Trigger Anomaly Bureau if the gap is too large
        if (report.globalRiskIndex > 0.7 && window.GAB) {
            window.GAB.reportAnomaly('GHOST_ECONOMY', 'GLOBAL', 3, "Trade networks are bypasssing critical forest pressure via abstraction.");
        }
    }

    getAuditData() {
        return {
            lastReport: this.auditLog[this.auditLog.length - 1],
            baselines: this.baselines
        };
    }
}

window.PRAO = new PhysicalRealismAuditOffice();
export default window.PRAO;
