/**
 * File: tools/audit/verify_void_touched_agents.mjs
 * Phase 5 Audit: Void-Touched Agents (VoidTaint Registry, Weibull Fractal Bloom, HOST_ONLY Fractal Decay UI & Shatter Event)
 *
 * Verifies:
 * 1. VoidTaint (0.0 - 1.0) is tracked on all operatives in AgentRosterManager.
 * 2. Fractal Bloom uses a Weibull distribution stat-roller to grant massive, unstable power spikes to VoidTouched agents.
 * 3. Fractal Decay UI progressively corrupts ASCII/Data and fractures agent names at high Taint, strictly filtered through HostVisibilityController.isHost.
 * 4. Shatter Event triggers at 1.0 Taint — removing the agent from the active roster, spawning a persistent VOID_FRACTURE anomaly, and forcing a narrative log entry.
 */

import CommanderEngine, {
    VoidTouchedRegistry,
    HostVisibilityController
} from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const { AgentRosterManager, LogDispatchManager } = CommanderEngine;

const failures = [];

console.log('================================================================================');
console.log('◈ DARK FOREST ENGINE — PHASE 5: VOID-TOUCHED AGENTS (FRACTAL BLOOM & DECAY) AUDIT');
console.log('================================================================================');

CommanderEngine.boot('HOUSE');
VoidTouchedRegistry.resetForNewRun();
HostVisibilityController.setHostMode(true);

const testAgent = AgentRosterManager.createAgent('agt_void_test', 'Warden Kaelen', 'WARDEN');
const baseMelee = testAgent.skills.meleeAtt;

// 1. Verify Initial VoidTaint (0.0)
if (testAgent.voidTaint !== 0.0 || testAgent.isVoidTouched !== false) {
    failures.push(`Expected initial voidTaint=0.0 and isVoidTouched=false, got taint=${testAgent.voidTaint}`);
}
console.log(`[1/4] VoidTaint Registry Verified: Operative "${testAgent.name}" initialized at voidTaint=${testAgent.voidTaint.toFixed(2)}.`);

// 2. Verify Fractal Bloom (Weibull Stat-Roller Power Spikes)
const bloom1 = VoidTouchedRegistry.inflictVoidTaint('agt_void_test', 0.35, { uniformRoll: 0.82, targetStat: 'meleeAtt' });
const bloom2 = VoidTouchedRegistry.inflictVoidTaint('agt_void_test', 0.50, { uniformRoll: 0.91, targetStat: 'meleeAtt' });

if (!bloom1.success || !bloom2.success || testAgent.voidTaint !== 0.85 || testAgent.skills.meleeAtt <= baseMelee + 10) {
    failures.push(`Expected Weibull Fractal Bloom power spikes to massively boost meleeAtt, got base=${baseMelee} -> current=${testAgent.skills.meleeAtt}, taint=${testAgent.voidTaint}`);
}
console.log(`[2/4] Weibull Fractal Bloom Verified: VoidTaint=${testAgent.voidTaint} | MeleeAtt spiked from ${baseMelee} -> ${testAgent.skills.meleeAtt} (+${bloom1.weibullSpike.bonus} & +${bloom2.weibullSpike.bonus} Weibull spikes).`);

// 3. Verify Fractal Decay UI & HOST_ONLY Sync Filter
HostVisibilityController.setHostMode(true);
const hostUIModel = VoidTouchedRegistry.getFractalDecayUIModel('agt_void_test', true);
const hostSheet = AgentRosterManager.formatAgentStatSheet('agt_void_test', true);

HostVisibilityController.setHostMode(false);
const clientUIModel = VoidTouchedRegistry.getFractalDecayUIModel('agt_void_test', false);
const clientSheet = AgentRosterManager.formatAgentStatSheet('agt_void_test', false);
HostVisibilityController.setHostMode(true);

if (!hostUIModel.corrupted || hostUIModel.displayName === 'Warden Kaelen' || !hostSheet.includes('DATA CORRUPTION CRITICAL')) {
    failures.push(`Expected Host UI at 0.85 Taint to display fractured name and ASCII data corruption, got ${JSON.stringify(hostUIModel)}`);
}
if (clientUIModel.corrupted || clientUIModel.displayName !== 'Warden Kaelen' || clientSheet.includes('DATA CORRUPTION CRITICAL')) {
    failures.push(`HOST_ONLY breach: Client UI saw Void-Touched name fracturing or corruption: ${JSON.stringify(clientUIModel)}`);
}
console.log(`[3/4] Fractal Decay UI & HOST_ONLY Sync Verified:\n  - Host Display Name: "${hostUIModel.displayName}" | Model: ${hostUIModel.asciiModel}\n  - Client Display Name: "${clientUIModel.displayName}" | Model: ${clientUIModel.asciiModel}`);

// 4. Verify Shatter Event at 1.0 Taint
const shatterRes = VoidTouchedRegistry.inflictVoidTaint('agt_void_test', 0.20, { worldX: 2310, worldY: 2190 });
const hasAgentAfterShatter = AgentRosterManager.agents.has('agt_void_test');
const latestDispatch = LogDispatchManager.dispatches[0];

if (!shatterRes.shattered || hasAgentAfterShatter || shatterRes.anomaly?.type !== 'VOID_FRACTURE' || !latestDispatch?.body?.includes('VOID_FRACTURE')) {
    failures.push(`Expected 1.0 Taint to trigger ShatterEvent, remove agent, spawn VOID_FRACTURE, and log narrative entry, got ${JSON.stringify(shatterRes)}`);
}
console.log(`[4/4] Shatter Event (1.0 Taint) Verified: Agent removed from roster=${!hasAgentAfterShatter} | Spawned Anomaly="${shatterRes.anomaly.id}" (${shatterRes.anomaly.type}) at (${shatterRes.anomaly.worldX}, ${shatterRes.anomaly.worldY}).`);

if (!MobileCommanderEngine.VoidTouchedRegistry) {
    failures.push('Mobile General Ledger mirror is missing VoidTouchedRegistry.');
}

VoidTouchedRegistry.resetForNewRun();

if (failures.length > 0) {
    console.error('\n❌ PHASE 5 VOID-TOUCHED AGENTS AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 5 VOID-TOUCHED AGENTS (FRACTAL BLOOM & DECAY) AUDIT PASSED.');
