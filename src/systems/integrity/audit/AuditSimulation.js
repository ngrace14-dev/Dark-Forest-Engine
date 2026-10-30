// File: src/systems/integrity/audit/AuditSimulation.js
import { WorldRuleIntegrityAudit } from './WorldRuleIntegrityAudit.js';

export function runComplianceAudit() {
    console.log("--- Initializing Reality Compliance Audit ---");
    
    const auditor = new WorldRuleIntegrityAudit();
    const report = auditor.runAudit();

    console.log("\n--- WORLD RULE INTEGRITY AUDIT REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}
