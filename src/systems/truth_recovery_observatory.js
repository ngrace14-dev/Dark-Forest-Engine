/**
 * File: src_systems_truth_recovery_observatory.js
 * Historical Recovery Directorate
 * 
 * Objective: 
 * Determine whether civilization can recover from Truth Extinction Events.
 * Tracks the lifecycle of critical knowledge through loss, archiving, and rediscovery.
 */

class TruthRecoveryObservatory {
    constructor() {
        this.lostTruths = new Set();      // intel_ids of significant truths with 0 owners
        this.archivedTruths = new Set();  // intel_ids of truths in the historical archive
        this.recoveredTruths = new Set(); // intel_ids of truths that were once lost but returned
        this.forgottenTruths = new Set(); // intel_ids of truths purged without archiving
        
        this.extinctionHistory = [];      // Array of { timestamp, intel_id, title }
        this.historyLimit = 100;

        this.metrics = {
            truthRecoveryRate: 0,
            archiveResilience: 0,
            historicalRediscoveryProbability: 0
        };

        window.EventBus.on('ENGINE_READY', () => this.init());
    }

    init() {
        // --- EVENT LISTENERS ---
        
        // Track when a truth is physically lost (0 owners)
        window.EventBus.on('INTEL_EXTINGUISHED', (intel_id) => this.onTruthExtinguished(intel_id));
        
        // Track when knowledge is gained (potential recovery)
        window.EventBus.on('INTEL_GAINED', (data) => this.onTruthGained(data.intelId));
        
        // Track when knowledge is archived during purge
        window.EventBus.on('INTEL_ARCHIVED', (intel_id) => this.onTruthArchived(intel_id));
        
        // Track when knowledge is forgotten during purge
        window.EventBus.on('INTEL_FORGOTTEN', (intel_id) => this.onTruthForgotten(intel_id));

        // Periodic report update
        window.EventBus.on('SHIFT_COMPLETE', () => this.generateRecoveryReport());
        
        window.EventBus.emit('UI_LOG', '[Directorate] Truth Recovery Observatory Online');
    }

    onTruthExtinguished(intel_id) {
        if (this.lostTruths.has(intel_id) || this.recoveredTruths.has(intel_id)) return;

        const intel = window.IntelManager?.lookup(intel_id);
        if (!intel) return;

        // Only track significant truths as "Lost"
        const totalSig = (intel.significance?.historical || 0) + (intel.significance?.survival || 0);
        if (totalSig > 50) {
            this.lostTruths.add(intel_id);
            this.extinctionHistory.push({
                timestamp: window.EngineParams?.worldDay || 0,
                intel_id,
                title: intel.payload.title,
                significance: totalSig
            });

            if (this.extinctionHistory.length > this.historyLimit) {
                this.extinctionHistory.shift();
            }

            window.EventBus.emit('UI_LOG_DEBUG', `[DIRECTORATE] Truth Extinguished: ${intel.payload.title} (Sig: ${totalSig})`);
        }
    }

    onTruthGained(intel_id) {
        // If it was in lostTruths, it is now recovered
        if (this.lostTruths.has(intel_id)) {
            this.lostTruths.delete(intel_id);
            this.recoveredTruths.add(intel_id);
            
            const intel = window.IntelManager?.lookup(intel_id);
            window.EventBus.emit('UI_LOG', `[RECOVERY] A lost truth has been rediscovered: ${intel?.payload.title || intel_id}`);
            window.EventBus.emit('TRUTH_RECOVERED', { intelId: intel_id, title: intel?.payload.title });
        }
        
        // If it was in forgottenTruths (somehow returned via latent discovery)
        if (this.forgottenTruths.has(intel_id)) {
            this.forgottenTruths.delete(intel_id);
            this.recoveredTruths.add(intel_id);
            
            const intel = window.IntelManager?.lookup(intel_id);
            window.EventBus.emit('UI_LOG', `[RECOVERY] A forgotten truth has returned to the world: ${intel?.payload.title || intel_id}`);
        }
    }

    onTruthArchived(intel_id) {
        const intel = window.IntelManager?.lookup(intel_id);
        if (!intel) return;

        const totalSig = (intel.significance?.historical || 0) + (intel.significance?.survival || 0);
        if (totalSig > 50) {
            this.archivedTruths.add(intel_id);
        }
    }

    onTruthForgotten(intel_id) {
        const intel = window.IntelManager?.lookup(intel_id);
        if (!intel) return;

        const totalSig = (intel.significance?.historical || 0) + (intel.significance?.survival || 0);
        if (totalSig > 50) {
            this.forgottenTruths.add(intel_id);
        }
    }

    calculateMetrics() {
        const totalLost = this.lostTruths.size + this.recoveredTruths.size;
        this.metrics.truthRecoveryRate = totalLost > 0 ? this.recoveredTruths.size / totalLost : 1.0;

        const totalSignificant = (window.IntelManager?.registry.size || 0) + this.archivedTruths.size;
        this.metrics.archiveResilience = totalSignificant > 0 ? this.archivedTruths.size / totalSignificant : 0;

        // Rediscovery Probability: Based on current active seekers vs lost count
        // Higher archive density and more seekers increase this
        const seekers = window.ModelLayer?.seekerPipeline?.activePackets?.length || 0;
        const rediscoveryMod = (this.metrics.archiveResilience * 0.5) + (seekers * 0.1);
        this.metrics.historicalRediscoveryProbability = Math.min(1.0, rediscoveryMod);
    }

    generateRecoveryReport() {
        this.calculateMetrics();

        const report = {
            lost: this.lostTruths.size,
            archived: this.archivedTruths.size,
            recovered: this.recoveredTruths.size,
            forgotten: this.forgottenTruths.size,
            rate: this.metrics.truthRecoveryRate,
            resilience: this.metrics.archiveResilience,
            probability: this.metrics.historicalRediscoveryProbability
        };

        console.log("%c --- TRUTH RECOVERY OBSERVATORY REPORT ---", "color: #10b981; font-weight: bold;");
        console.log(`Lost Truths:      ${report.lost}`);
        console.log(`Archived Truths:  ${report.archived}`);
        console.log(`Recovered Truths: ${report.recovered}`);
        console.log(`Forgotten Truths: ${report.forgotten}`);
        console.log(`Recovery Rate:    ${(report.rate * 100).toFixed(1)}%`);
        console.log(`Archive Resilience: ${(report.resilience * 100).toFixed(1)}%`);
        console.log(`Rediscovery Prob: ${(report.probability * 100).toFixed(1)}%`);
        console.log("%c -----------------------------------------", "color: #10b981;");

        window.EventBus.emit('OBSERVATORY_RECOVERY_REPORT', report);
        
        this.determineCivilizationSurvival(report);
    }

    determineCivilizationSurvival(report) {
        if (report.rate < 0.1 && report.lost > 5) {
            window.EventBus.emit('UI_LOG', "⚠️ [DIRECTORATE] CRITICAL: Civilization is losing the ability to rediscover its past. Amnesia is becoming permanent.");
        } else if (report.rate > 0.5) {
            window.EventBus.emit('UI_LOG', "✅ [DIRECTORATE] STABLE: High rediscovery rate. Civilization maintains continuity through physical and institutional memory.");
        }
    }
}

window.TruthRecoveryObservatory = new TruthRecoveryObservatory();
export default window.TruthRecoveryObservatory;
