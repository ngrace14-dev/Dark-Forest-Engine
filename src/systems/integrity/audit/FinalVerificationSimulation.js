// File: src/systems/integrity/audit/FinalVerificationSimulation.js
import { FinalBureauVerification } from './FinalBureauVerification.js';

export function runFinalVerification() {
    const bureau = new FinalBureauVerification();
    const report = bureau.runFullAudit();

    console.log("\n--- GENESIS ENGINE FINAL VERIFICATION REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}
