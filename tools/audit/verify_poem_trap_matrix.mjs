/**
 * File: tools/audit/verify_poem_trap_matrix.mjs
 * Phase 7 Audit: The Poem Trap Matrix, Hard Epistemic Ceiling Gates & 18,000-Year Semantic Decay Pipeline
 */

import CommanderEngine, { PoemTrapEngine } from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';

const failures = [];

console.log('================================================================================');
console.log('📜 DARK FOREST ENGINE — PHASE 7: THE POEM TRAP MATRIX & EPISTEMIC GATES AUDITOR');
console.log('================================================================================');

// 1. Verify all 5 Epistemic Classes exist
const expectedClasses = [
    'OBSERVATIONAL_TRUTH',
    'INSTITUTIONAL_REVISION',
    'THE_BAIT_LURE',
    'ORBS_HALF_TRUTH',
    'SUPPRESSED_ROOT'
];
for (const cls of expectedClasses) {
    if (!PoemTrapEngine.EPISTEMIC_CLASSES[cls]) failures.push(`Missing Epistemic Class: ${cls}`);
}
console.log(`[1/6] 5 Epistemic Classes Verified: ${expectedClasses.join(', ')}.`);

// 2. Verify Hard Bible Gates (Observational Horizon & Spatial/Illusion Fidelity)
const illegalSurfacePoem = {
    origin: 'SURFACE_VILLAGES',
    epistemicClass: 'OBSERVATIONAL_TRUTH',
    lines: [
        'In the seven-day White Void we stand,',
        'watching Epitaph across the Endless Dunes.'
    ]
};
const illegalGateAudit = PoemTrapEngine.validateHardBibleGates(illegalSurfacePoem, { blindSpotEntropy: 15 });
if (illegalGateAudit.passed || illegalGateAudit.violations.length < 2) {
    failures.push(`Expected Surface poem mentioning White Void, Epitaph, and Endless Dunes to fail Hard Bible Gates.`);
}

const epitaphPoem = PoemTrapEngine.CANONICAL_BIBLE_POEMS.EPITAPH_INTERNAL_SLATE;
const epitaphGateAudit = PoemTrapEngine.validateHardBibleGates(epitaphPoem, { blindSpotEntropy: 15 });
if (!epitaphGateAudit.passed) {
    failures.push(`Expected internal Epitaph slate to pass EPITAPH_7 Reference Frame Gate.`);
}
console.log(`[2/6] Hard Bible Gates Verified: Illegal Surface Leak Blocked (${illegalGateAudit.violations.length} violations); Internal Epitaph Slate Approved.`);

// 3. Verify Canonical Bible Addendum Poems & Two-Key Interlocking Rule
const canonicalKeys = [
    'EARLY_ASCENSION_TRAP',
    'TERMINUS_RAPID_AGING_RUMOR',
    'EPITAPH_INTERNAL_SLATE',
    'SIGNIFICANCE_BEACON_FLESH_LEDGER',
    'ORB_KILL_HUNTSMAN_TRAP',
    'HUNTSMAN_FALL_COUNTER_WARNING'
];
for (const key of canonicalKeys) {
    const p = PoemTrapEngine.CANONICAL_BIBLE_POEMS[key];
    if (!p || !p.pairedCounterPoemId || !PoemTrapEngine.CANONICAL_BIBLE_POEMS[p.pairedCounterPoemId]) {
        failures.push(`Canonical poem ${key} is missing its Two-Key Interlocking pairedCounterPoemId.`);
    }
    const audit = PoemTrapEngine.validateHardBibleGates(p, { blindSpotEntropy: 15 });
    if (!audit.passed) failures.push(`Canonical poem ${key} failed gate: ${audit.violations.join('; ')}`);
}
console.log(`[3/6] Canonical Bible Addendum Poems & Two-Key Interlocking Rule Verified.`);


// 4. Verify Prosodic Constraints: Vocabulary Sanitization, Midpoint Caesura (᛬), and Elder Futhark Epigraphy
const clinicalPoem = PoemTrapEngine.generateFourSlotPoem({
    origin: 'SURFACE_VILLAGES',
    line1Anchor: 'Fourteen nights the destination stands,',
    line2Tension: 'while cultivation feeds the anomaly.',
    line3PivotTrap: 'Follow the protocol of the denary road,',
    line4HookConsequence: 'and keep the telemetry of the stone.'
});
const joinedSanitized = clinicalPoem.lines.join(' ').toLowerCase();
if (/destination|cultivation|anomaly|protocol|denary|telemetry/.test(joinedSanitized)) {
    failures.push(`Expected clinical Latinate jargon to be stripped, got "${joinedSanitized}"`);
}
if (!clinicalPoem.caesuraLines.every(l => l.includes(' ᛬ ')) || !clinicalPoem.futharkLines.every(l => l.includes('᛬'))) {
    failures.push(`Expected midpoint double-dot caesura (᛬) on every line.`);
}
console.log(`[4/6] Prosodic & Runic Epigraphy Rules Verified: "${clinicalPoem.caesuraLines[0]}" -> "${clinicalPoem.futharkLines[0]}"`);

// 5. Verify 18,000-Year Semantic Decay Mutation Pipeline
const sourceLines = [
    'Fourteen nights the champion walked with 20 lights,',
    'carrying runic fuel crates across the 95% reference frame.',
    'Cut the flesh before the betrayal,',
    'three hundred wardens keep the score.'
];
const stoneDecay = PoemTrapEngine.applySemanticDecayPipeline(sourceLines, 'IRON_CHANTRY_STONE');
const boneDecay = PoemTrapEngine.applySemanticDecayPipeline(sourceLines, 'FLAYED_QUILL_BONE_TALLY');
const nurseryDecay = PoemTrapEngine.applySemanticDecayPipeline(sourceLines, 'VILLAGE_NURSERY_RHYME');

if (!stoneDecay.lines[0].includes('the pale beast') || !stoneDecay.lines[1].includes("the Crown's Hearth-Bread") || !stoneDecay.lines[1].includes('The Unmoving Stone')) {
    failures.push(`Expected Rule 1 & Rule 2 in Iron Chantry Stone decay.`);
}
if (stoneDecay.lines[2].includes('flesh') || stoneDecay.lines[2].includes('betrayal')) {
    failures.push(`Expected Iron Chantry Stone to censor line mentioning flesh/betrayal.`);
}
if (!boneDecay.lines[1].includes('[REDACTED / WORN SMOOTH]') || !nurseryDecay.preservesNumbers100Percent) {
    failures.push(`Expected Bone Tally redaction and Nursery Rhyme 100% numeric preservation.`);
}
console.log(`[5/6] 18,000-Year Semantic Decay Pipeline Verified.`);

// 6. Verify 19-House Tombstone Records Generation & Gate Compliance
const tombstones = PoemTrapEngine.generate19HouseTombstoneRecords();
if (tombstones.size < 19) failures.push(`Expected Tombstone Records for 19 settlements, got ${tombstones.size}`);
for (const [houseName, rec] of tombstones.entries()) {
    if (!rec.poem.gateAudit.passed) failures.push(`Tombstone Record for ${houseName} failed Hard Bible Gates.`);
}
if (!MobileCommanderEngine.PoemTrapEngine || MobileCommanderEngine.PoemTrapEngine.tombstoneRecords.size < 19) {
    failures.push('Mobile General Ledger mirror is missing PoemTrapEngine parity.');
}
console.log(`[6/6] 19-House Tombstone Records Verified: All ${tombstones.size} House Tombstone Records generated and passed Hard Bible Gates.`);

if (failures.length > 0) {
    console.error('\n❌ PHASE 7 POEM TRAP MATRIX AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 7 THE POEM TRAP MATRIX, HARD BIBLE GATES & SEMANTIC DECAY AUDIT PASSED.');
