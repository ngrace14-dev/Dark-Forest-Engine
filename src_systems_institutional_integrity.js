/**
 * DARK FOREST ENGINE - INSTITUTIONAL INTEGRITY BUREAU
 * Institutional Integrity Audit Framework (IIAF)
 * 
 * Detects "Ghost Institutions": Organizations that persist as legal entities 
 * after their physical and social foundations have eroded.
 */

class InstitutionalIntegrityBureau {
    constructor() {
        this.integrityRegistry = new Map(); // EntityID -> Integrity Metrics
        this.ghostAlerts = []; // Array of { id, type, day, severity }
        
        this.auditLog = [];

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T24H', () => this.performAudit());
    }

    init() {
        window.EventBus.emit('UI_LOG', '🏛️ [IIB] Institutional Integrity Bureau Active');
    }

    /**
     * Periodic audit of all major institutions (Houses, Guilds, Orders).
     */
    performAudit() {
        if (!window.DynastyManager) return;

        window.DynastyManager.houses.forEach(house => {
            const audit = this.auditEntity(house);
            this.integrityRegistry.set(house.id, audit);

            // Detection: Ghost Institution
            if (audit.ghostingScore > 0.7) {
                this.reportGhosting(house.id, audit);
            }
        });

        window.EventBus.emit('INSTITUTIONAL_AUDIT_COMPLETE', Array.from(this.integrityRegistry.values()));
    }

    /**
     * Measures the relationship between institutional structure and social reality.
     */
    auditEntity(house) {
        const day = window.EngineParams?.worldDay || 0;
        
        // 1. Membership Tracking
        const members = window.PersonhoodManager?.profiles ? 
            Array.from(window.PersonhoodManager.profiles.values()).filter(p => p.houseId === house.id) : [];
        const memberCount = members.length;

        // 2. Leadership State
        const hasLeader = !!house.currentLeader;
        const leaderProfile = hasLeader ? window.PersonhoodManager?.getProfile(house.currentLeader) : null;
        
        // 3. Active Operations (Expenditures, Objectives, Projects)
        const operationCount = house.actionQueue?.length || 0;
        const archiveActivity = house.archives?.length || 0;

        // 4. Economic Activity (Prestige flow and Monopolies)
        const economicWeight = (house.prestige / 1000) + (house.isBlessed ? 1.0 : 0);

        // --- MEASUREMENTS ---

        // VITALITY: (Active Members * 0.4) + (Operations * 0.3) + (Prestige Flow * 0.3)
        const vitality = Math.min(1.0, (memberCount / 10) * 0.4 + (operationCount * 0.2) + (economicWeight * 0.4));

        // GHOSTING: Mismatch between Prestige (Size) and Vitality (Life)
        // A high prestige house with no members is a "Ghost".
        const prestigeNormalization = Math.min(1.0, house.prestige / 500);
        const ghostingScore = Math.max(0, prestigeNormalization - vitality);

        // LEGITIMACY PERSISTENCE: How much legitimacy remains compared to actual vitality
        const legitimacyPersistence = house.legitimacy / Math.max(0.01, vitality);

        return {
            id: house.id,
            day,
            metrics: {
                memberCount,
                operationCount,
                vitality,
                ghostingScore,
                legitimacyPersistence
            },
            status: this._determineStatus(vitality, ghostingScore)
        };
    }

    _determineStatus(vitality, ghosting) {
        if (ghosting > 0.8) return 'GHOST_ENTITY';
        if (ghosting > 0.5) return 'HOLLOW_SHELL';
        if (vitality < 0.2) return 'MORIBUND';
        if (vitality > 0.8) return 'VIBRANT';
        return 'STABLE';
    }

    reportGhosting(id, audit) {
        const alert = {
            id,
            type: 'INSTITUTIONAL_GHOSTING',
            day: audit.day,
            severity: audit.metrics.ghostingScore,
            detail: `House ${id} maintains high prestige (${audit.metrics.legitimacyPersistence.toFixed(2)} LP) despite zero population support.`
        };

        this.ghostAlerts.push(alert);
        window.EventBus.emit('UI_LOG', `⚠️ [IIB] GHOST INSTITUTION DETECTED: ${id}`);
        window.EventBus.emit('INSTITUTIONAL_GHOST_ALERT', alert);

        // If a ghost house holds a monopoly, trigger a "Hollow Monopoly" event
        const house = window.DynastyManager?.houses.get(id);
        if (house && house.isBlessed) {
            window.EventBus.emit('UI_LOG', `[IIB] HOLLOW MONOPOLY: ${id} is hoarding resources with no subjects to serve.`);
            house.legitimacy = Math.max(0, house.legitimacy - 0.1); // Reality catches up
        }
    }

    /**
     * Generates a Long-Term Institutional Integrity Report.
     */
    generateAuditFramework() {
        return {
            title: "Institutional Integrity Audit Framework",
            timestamp: window.EngineParams?.worldDay || 0,
            summary: {
                ghostCount: this.ghostAlerts.length,
                averageVitality: Array.from(this.integrityRegistry.values()).reduce((a, b) => a + b.metrics.vitality, 0) / Math.max(1, this.integrityRegistry.size)
            },
            auditRecords: Array.from(this.integrityRegistry.values())
        };
    }
}

window.IIB = new InstitutionalIntegrityBureau();
export default window.IIB;
