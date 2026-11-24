/**
 * File: tools/audit/verify_runic_tally_system.mjs
 * Phase 6 Audit: The Chancery & Runic Tally Engine (Elder Futhark Orthography & Rúnakefli Split-Tallies)
 */

import CommanderEngine, { RunicTallySystem, RealityEditorVault } from '../../src/core/commander_engine.js';
import MobileCommanderEngine from '../../ledger-mobile/src/core/commander_engine.js';
import TruthRecoveryObservatory from '../../src/systems/truth_recovery_observatory.js';

const failures = [];

console.log('================================================================================');
console.log('🪵 DARK FOREST ENGINE — PHASE 6: ELDER FUTHARK CHANCERY & RÚNAKEFLI TALLY AUDIT');
console.log('================================================================================');

// 1. Verify 24-Rune Alphabet across 3 Ættir
const alphabetCount = Object.keys(RunicTallySystem.ELDER_FUTHARK_ALPHABET).length;
if (alphabetCount !== 24) {
    failures.push(`Expected 24 Elder Futhark runes across 3 aettir, got ${alphabetCount}`);
}
console.log(`[1/6] 24-Rune Elder Futhark Alphabet Verified: ${alphabetCount} runes across 3 Ættir.`);

// 2. Verify Core Phonetic & Orthographic Rules (knight, stone, hammer, Black River, land)
const knightRunes = RunicTallySystem.transliterateToElderFuthark('knight');
const stoneRunes = RunicTallySystem.transliterateToElderFuthark('stone');
const hammerRunes = RunicTallySystem.transliterateToElderFuthark('hammer');
const blackRiverRunes = RunicTallySystem.transliterateToElderFuthark('Black River');
const landArchaicRunes = RunicTallySystem.transliterateToElderFuthark('land', { archaicNasalOmission: true });
const thornSingRunes = RunicTallySystem.transliterateToElderFuthark('thorn sing');

if (knightRunes !== 'ᚾᚨᛁᛏ') failures.push(`Expected "knight" -> "ᚾᚨᛁᛏ", got "${knightRunes}"`);
if (stoneRunes !== 'ᛊᛏᛟᚾ') failures.push(`Expected "stone" -> "ᛊᛏᛟᚾ", got "${stoneRunes}"`);
if (hammerRunes !== 'ᚺᚨᛗᛖᚱ') failures.push(`Expected "hammer" -> "ᚺᚨᛗᛖᚱ" (no double ᛗ), got "${hammerRunes}"`);
if (blackRiverRunes !== 'ᛒᛚᚨᚲ᛬ᚱᛁᚢᛖᚱ') failures.push(`Expected "Black River" -> "ᛒᛚᚨᚲ᛬ᚱᛁᚢᛖᚱ", got "${blackRiverRunes}"`);
if (landArchaicRunes !== 'ᛚᚨᛞ') failures.push(`Expected archaic nasal omission "land" -> "ᛚᚨᛞ", got "${landArchaicRunes}"`);
if (!thornSingRunes.includes('ᚦ') || !thornSingRunes.includes('ᛜ')) {
    failures.push(`Expected digraphs TH -> ᚦ and NG -> ᛜ in "thorn sing", got "${thornSingRunes}"`);
}
console.log(`[2/6] Phonetic & Orthographic Laws Verified:\n  - knight -> ${knightRunes}\n  - stone -> ${stoneRunes}\n  - hammer -> ${hammerRunes}\n  - Black River -> ${blackRiverRunes}\n  - land (archaic nasal omission) -> ${landArchaicRunes}\n  - thorn sing (digraphs) -> ${thornSingRunes}`);

// 3. Verify Rúnakefli Wooden Tally Stick Creation & Edge-Notch Encoding
const oakheartTally = RunicTallySystem.createRunicTallyStick({
    day: 14,
    owner: 'House Oakheart',
    recipient: 'House Aethel',
    verb: 'PAID',
    commodity: 'Ironwood',
    quantity: 27,
    witnesses: ['Vane', 'Mallow']
});

if (oakheartTally.edgeNotches.quantity !== 27 || oakheartTally.edgeNotches.notchGlyphs !== '᛭᛭×||' || oakheartTally.ownerSeal.sigil !== 'ᛟ᛭ᚲ') {
    failures.push(`Unexpected Rúnakefli edge notches or bind-rune seal: ${JSON.stringify(oakheartTally)}`);
}
console.log(`[3/6] Rúnakefli Wooden Tally & Edge-Notches Verified:\n  - Inscription: ${oakheartTally.fullInscription}\n  - Edge Notches (27u): [${oakheartTally.edgeNotches.notchGlyphs}] (2×10 + 1×5 + 2×1) | Bind-Rune Seal: [${oakheartTally.ownerSeal.sigil}]`);

// 4. Verify Split-Tally Anti-Fraud Checksum via TruthRecoveryObservatory
const validVerify = TruthRecoveryObservatory.verifySplitTally(oakheartTally.stockShard, oakheartTally.foilShard);
const forgedFoil = {
    ...oakheartTally.foilShard,
    edgeNotches: RunicTallySystem.encodeEdgeNotches(47)
};
const forgedVerify = TruthRecoveryObservatory.verifySplitTally(oakheartTally.stockShard, forgedFoil);

if (!validVerify.verified || forgedVerify.verified) {
    failures.push(`Split-tally anti-fraud verification failed: valid=${JSON.stringify(validVerify)}, forged=${JSON.stringify(forgedVerify)}`);
}
console.log(`[4/6] Split-Tally Anti-Fraud Checksum Verified:\n  - Genuine Halves: verified=${validVerify.verified} (${validVerify.reason})\n  - Tampered Foil Shard (47u vs 27u): verified=${forgedVerify.verified} (${forgedVerify.reason})`);

// 5. Verify Emissary Petition Integration & UI Slat Rendering
RealityEditorVault.activeEmissaryPetition = null;
const petition = RealityEditorVault.generateEmissaryPetition(3);
const slatHtml = RunicTallySystem.renderTallySlatHtml(petition.runicTally);
if (!petition.runicTally || !petition.bindRuneSeal || !slatHtml.includes('RÚNAKEFLI SPLIT-TALLY')) {
    failures.push(`Expected Emissary Petition to attach a Rúnakefli tally stick and bind-rune seal, got ${JSON.stringify(petition)}`);
}
console.log(`[5/6] Emissary Petition Rúnakefli Attachment Verified: Envoy from ${petition.senderHouse} [${petition.bindRuneSeal}] carries tally ${petition.runicTally.id}.`);

// 6. Verify Mobile Mirror Parity
if (!MobileCommanderEngine.RunicTallySystem || MobileCommanderEngine.RunicTallySystem.transliterateToElderFuthark('hammer') !== 'ᚺᚨᛗᛖᚱ') {
    failures.push('Mobile General Ledger mirror is missing RunicTallySystem parity.');
}
console.log(`[6/6] Mobile General Ledger Mirror Parity Verified.`);

if (failures.length > 0) {
    console.error('\n❌ PHASE 6 RUNIC TALLY AUDIT FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('\n✅ PHASE 6 ELDER FUTHARK CHANCERY & RÚNAKEFLI SPLIT-TALLY AUDIT PASSED.');
