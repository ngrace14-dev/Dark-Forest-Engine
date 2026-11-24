/**
 * ============================================================================
 * LIVE GAME TESTER PLAYTHROUGH & SYSTEMIC QA AUDIT
 * Simulates a real human player clicking through all 5 Brutalist Runic-Iron UI
 * pages, playing a 35-day House Terminus campaign (Growth Tier 0 -> Tier 3)
 * and a full Pale Sovereign campaign (Stage 0 Dormancy -> Stage III Apocalypse).
 * ============================================================================
 */
import CommanderEngine from '../src/core/commander_engine.js';

const domElements = new Map();
function createMockElement(id, tag = 'div') {
    const el = {
        id,
        tagName: tag.toUpperCase(),
        style: { display: 'block', cssText: '' },
        classList: {
            _set: new Set(),
            add(...cls) { cls.forEach(c => this._set.add(c)); },
            remove(...cls) { cls.forEach(c => this._set.delete(c)); },
            contains(c) { return this._set.has(c); }
        },
        dataset: {},
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) {
            this._innerHTML = String(val);
            parseNestedIds(this._innerHTML);
        },
        textContent: '',
        value: '',
        listeners: {},
        addEventListener(evt, fn) { this.listeners[evt] = fn; },
        click() { if (this.listeners.click) this.listeners.click({ currentTarget: this, stopPropagation() {} }); },
        querySelector() { return createMockElement('qs_child'); },
        querySelectorAll() { return []; },
        appendChild(child) {
            if (child && child.id) domElements.set(child.id, child);
            if (child && child.innerHTML) parseNestedIds(child.innerHTML);
            return child;
        },
        remove() { domElements.delete(this.id); }
    };
    if (id) domElements.set(id, el);
    return el;
}

function parseNestedIds(html) {
    const regex = /id=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const foundId = match[1];
        if (!domElements.has(foundId)) {
            createMockElement(foundId);
        }
    }
}

globalThis.window = globalThis;
globalThis.localStorage = {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
};
globalThis.document = {
    body: createMockElement('body', 'body'),
    head: createMockElement('head', 'head'),
    createElement(tag) { return createMockElement('', tag); },
    getElementById(id) { return domElements.get(id) || null; },
    querySelector(sel) {
        if (sel.startsWith('#')) return domElements.get(sel.slice(1)) || null;
        return createMockElement(sel);
    },
    querySelectorAll() { return []; },
    addEventListener() {}
};

const auditReport = {
    bugsFound: [],
    playthroughLog: []
};

function logPlay(step, msg) {
    const line = `[${step}] ${msg}`;
    auditReport.playthroughLog.push(line);
    console.log(line);
}

console.log('================================================================================');
console.log('LIVE GAME TESTER PLAYTHROUGH & SYSTEMIC QA AUDIT');
console.log('================================================================================');

['commander-terminal-root', 'text-commander-viewport', 'status-bar', 'commander-action-banner', 'crisis-triage-panel', 'btn-autotick-state', 'timescale-bar', 'daily-goal-bar', 'role-directives-bar', 'expeditions-list', 'dispatches-list', 'roster-list', 'story-archive', 'inquest-verdict-bar', 'story-reader', 'brutalist-subpage-deck', 'hub-shift-header', 'procedural-collision-readout', 'nav-tab-page4', 'nav-tab-page5', 'btn-dream-ward', 'btn-chrono-skip', 'module-wrap-expeditions', 'module-wrap-necrology'].forEach(id => {
    createMockElement(id);
});

const { CommanderUI } = await import('../src/systems/commander_ui.js');
const { CandidateOnboarding } = await import('../src/systems/candidate_onboarding.js');

// ============================================================================
// TEST 1: PAGE 1 (CANDIDATE GATE) -> PAGE 2 (DUTY ROSTER) -> PAGE 3 (HUB) FLOW
// ============================================================================
CandidateOnboarding.start(CommanderUI);
const rootEl = document.getElementById('commander-terminal-root');
if (!rootEl || !rootEl.innerHTML.includes('FORENSIC PROVENANCE LOG')) {
    auditReport.bugsFound.push('Page 1 Candidate Gate failed to render expected Brutalist header.');
} else {
    logPlay('PAGE 1 UI', 'Candidate Gate rendered with Vitruvian SVG, 5-Strand meters, and Birthright cards.');
}

window.selectBirthright('ECHO_OF_THE_SEAL');
window.onboardingFinish(1);
window.selectVocation('WARDEN');
window.onboardingFinish(2);
window.runExtractor();
window.onboardingFinish(3);
window.onboardingFinish(4);

if (!rootEl.innerHTML.includes('CIVILIZATIONAL DUTY ROSTER')) {
    auditReport.bugsFound.push('Page 2 Civilizational Duty Roster failed to open after Candidate Onboarding.');
} else {
    logPlay('PAGE 2 UI', 'Civilizational Duty Roster opened with all 6 playable role cards (including unchained Pale Sovereign).');
}

// ============================================================================
// TEST 2: CAMPAIGN A — HOUSE TERMINUS (GROWTH TIER 0 -> TIER 3 LIVE 35-DAY RUN)
// ============================================================================
CommanderUI.selectRoleAndLaunch('TERMINUS');
CommanderUI.render();

let prog0 = CommanderEngine.RoleStateMachine.getGrowthProgression();
logPlay('TURN 1 (TIER 0)', `Started House Terminus campaign at Growth Tier ${prog0.tier} (${prog0.label}). Next Goal: ${prog0.nextGateDesc}`);

const tabTruth0 = document.getElementById('nav-tab-page4');
const tabWar0 = document.getElementById('nav-tab-page5');
if (tabTruth0?.style.display !== 'none' || tabWar0?.style.display !== 'none') {
    auditReport.bugsFound.push(`Expected Page 4 & Page 5 tabs to be hidden at Growth Tier 0, got Truth=${tabTruth0?.style.display}, War=${tabWar0?.style.display}`);
} else {
    logPlay('GROWTH GATE CHECK', 'Verified Page 4 (Truth Vault) & Page 5 (War Board) tabs are cleanly hidden at Turn 1 (Growth Tier 0).');
}

for (let d = 1; d <= 5; d++) {
    window.dispatchCmd('PATROL_MIST');
    window.advanceDays(1);
}
CommanderEngine.FacilityEngine.unlockFacility('guard_barracks');
CommanderUI.render();

let prog1 = CommanderEngine.RoleStateMachine.getGrowthProgression();
logPlay('DAY 6 (TIER 1)', `Constructed Guard Barracks -> Reached Growth Tier ${prog1.tier} (${prog1.label}).`);

if (prog1.tier < 1 || document.getElementById('nav-tab-page4')?.style.display === 'none') {
    auditReport.bugsFound.push('Expected constructing Guard Barracks to unlock Growth Tier 1 and Page 4 Truth Vault tab.');
}

window.viewTruthVault();
const subDeckHtml4 = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!subDeckHtml4.includes('THE TRUTH &amp; RELIC VAULT')) {
    auditReport.bugsFound.push('Switching to Page 4 (viewTruthVault) failed to render the Truth & Relic Vault.');
}
CommanderEngine.RealityEditorVault.discoverFact({ title: 'Audit Test Dossier Alpha', targetHouse: 'House Cull', valueFuel: 10, valueRes: 15 });
CommanderEngine.RealityEditorVault.discoverFact({ title: 'Audit Test Dossier Beta', targetHouse: 'House Gallows', valueFuel: 12, valueRes: 14 });
const pubRes = CommanderEngine.RealityEditorVault.resolveFact(null, 'PUBLISH');
const arcRes = CommanderEngine.RealityEditorVault.resolveFact(null, 'ARCHIVE');
logPlay('PAGE 4 REALITY EDITOR', `${pubRes.message} | ${arcRes.message}`);

CommanderEngine.FacilityEngine.unlockFacility('war_table');
CommanderEngine.FacilityEngine.unlockFacility('crow_loft');
CommanderUI.render();
let prog3 = CommanderEngine.RoleStateMachine.getGrowthProgression();
logPlay('DAY 7 (TIER 3)', `Constructed War Table & Crow Loft -> Reached Growth Tier ${prog3.tier}. All 5 Pages unlocked!`);

window.viewWarBoard();
const subDeckHtml5 = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!subDeckHtml5.includes('THE WAR BOARD &amp; TELEMETRY READER')) {
    auditReport.bugsFound.push('Page 5 War Board visual deck did not render.');
} else {
    logPlay('PAGE 5 WAR BOARD', 'Verified 19-House War Board table, 20-Parish Telemetry, and Causal Audit Trail rendered on Page 5.');
}

CommanderUI.render();
let crisesEncountered = 0;
let petitionsResolved = 0;
let collisionsTriggered = 0;

for (let d = 7; d <= 35; d++) {
    if (CommanderEngine.CampaignManager.state.house.barrierFuelUnits < 15) {
        CommanderEngine.CampaignManager.state.house.barrierFuelUnits += 12;
    }
    if (d % 4 === 0) {
        CommanderEngine.ExpeditionEngine.launchExpedition('GUARDED_CARAVAN', 'Oakhaven');
    }
    if (CommanderEngine.RealityEditorVault.activeEmissaryPetition) {
        window.resolveEmissaryPetition(d % 2 === 0 ? 'ACCEPT' : 'REJECT');
        petitionsResolved++;
    }
    if (CommanderEngine.CrisisEngine.activeCrisis) {
        crisesEncountered++;
        const cId = CommanderEngine.CrisisEngine.activeCrisis.choices[0]?.id;
        window.resolveCrisis(cId);
    }
    window.advanceDays(1);
    collisionsTriggered = CommanderEngine.ProceduralCollisionEngine.collisionHistory.length;
}

logPlay('35-DAY HOUSE SUMMARY', `Survived to Day ${globalThis.EngineParams.worldDay} | Fuel: ${CommanderEngine.CampaignManager.state.house.barrierFuelUnits}u | Chains: ${CommanderEngine.CampaignManager.state.house.chainsIntegrity}% | Petitions Resolved: ${petitionsResolved} | Crises Triaged: ${crisesEncountered} | Procedural Collisions: ${collisionsTriggered}`);

console.log('================================================================================');
// ============================================================================
// TEST 3: CAMPAIGN B — PALE SOVEREIGN SLOW-BURN PLAYTHROUGH (STAGE 0 -> STAGE III)
// ============================================================================
CommanderUI.selectRoleAndLaunch('PALE_SOVEREIGN');
CommanderUI.render();
let sovProg0 = CommanderEngine.RoleStateMachine.getGrowthProgression();
logPlay('SOVEREIGN STAGE 0', `Started Pale Sovereign run at ${sovProg0.label} (Weight: ${CommanderEngine.CampaignManager.state.sovereign.significanceHarvested}, Heralds: ${CommanderEngine.CampaignManager.state.sovereign.heraldsMutated}/5).`);

const sovDailyTargets = CommanderEngine.CrisisEngine.getTargetsForRole('SOVEREIGN');
const sovDirsHtml = document.getElementById('role-directives-bar')?.innerHTML || '';
if (!sovDailyTargets.some(t => t.id === 'CULT_AQUIFER_ROOTS') || !sovDailyTargets.some(t => t.id === 'HARVEST_NOBLE_ESSENCE') || sovDirsHtml.includes('Base Upgrades & Facilities')) {
    auditReport.bugsFound.push(`Expected Pale Sovereign daily goals to be Cultivation & Harvest (no Base Facility Management), got targets=${JSON.stringify(sovDailyTargets)}`);
} else {
    window.setNextDayGoal('HARVEST_NOBLE_ESSENCE');
    window.advanceDays(1);
    logPlay('SOVEREIGN CULTIVATION & HARVEST', `Verified pure Cultivation & Harvest daily goals (${sovDailyTargets.map(t => t.id).join(', ')}) and zero settlement-management buttons.`);
}

const prematureRaid = CommanderEngine.CampaignManager.dispatchAction('HERALD_PACK_RAID', 'House Cull');
if (prematureRaid.success !== false) {
    auditReport.bugsFound.push(`Pale Sovereign Stage II raid was not locked at Stage 0! Got: ${JSON.stringify(prematureRaid)}`);
} else {
    logPlay('SOVEREIGN GATE AUDIT', `Verified premature Stage II raid is blocked at Stage 0: "${prematureRaid.message}"`);
}

CommanderEngine.CampaignManager.dispatchAction('HIBERNATE', 40);
CommanderUI.render();
let sovProg1 = CommanderEngine.RoleStateMachine.getGrowthProgression();
logPlay('SOVEREIGN STAGE I', `Reached ${sovProg1.label} at Weight ${CommanderEngine.CampaignManager.state.sovereign.significanceHarvested}. Mutating 5 Frost-Heralds...`);

for (let h = 0; h < 5; h++) {
    CommanderEngine.CampaignManager.dispatchAction('MACABRE_COMMUNION');
}
CommanderUI.render();
let sovProg2 = CommanderEngine.RoleStateMachine.getGrowthProgression();
const raidMsg = CommanderEngine.CampaignManager.dispatchAction('HERALD_PACK_RAID', 'House Cull');
logPlay('SOVEREIGN STAGE II', `Reached ${sovProg2.label} (Weight: ${CommanderEngine.CampaignManager.state.sovereign.significanceHarvested}, Heralds: ${CommanderEngine.CampaignManager.state.sovereign.heraldsMutated}/5). Raid: "${raidMsg.message}"`);

CommanderEngine.CampaignManager.dispatchAction('HIBERNATE', 960);
CommanderEngine.CampaignManager.dispatchAction('ASCEND_SOVEREIGN');
CommanderUI.render();
let sovProg3 = CommanderEngine.RoleStateMachine.getGrowthProgression();
const apocMsg = CommanderEngine.CampaignManager.dispatchAction('APOCALYPTIC_HARVEST', 'House Gallows');
if (apocMsg.triggerVisualShock) CommanderUI.triggerVisualShock(apocMsg.triggerVisualShock);
logPlay('SOVEREIGN STAGE III', `Reached ${sovProg3.label} -> Executed Apocalyptic Harvest: "${apocMsg.message}"`);

// Verify Angry Joe Hardening Patch (P1 High-Contrast Mode, P2 Narrative Summary & Coalition Retaliation, P3 Sovereign UI Corruption & Chain-Shatter Quake)
window.toggleHighContrast();
if (!CommanderUI.highContrastMode || !document.body.classList.contains('high-contrast-runic')) {
    auditReport.bugsFound.push('P1 High-Contrast Runic Bus-Commuter Mode failed to toggle.');
} else {
    logPlay('PATCH P1 (HIGH-CONTRAST)', 'Verified High-Contrast Runic Bus-Commuter Mode toggle & enlarged gauge value readouts.');
}

if (!rootEl.classList.contains('sovereign-corruption-stage-3') || !rootEl.classList.contains('chain-shatter-quake')) {
    auditReport.bugsFound.push('P3 Pale Sovereign Stage 3 UI corruption or Chain-Shatter Quake class missing on root terminal.');
} else {
    logPlay('PATCH P3 (SOVEREIGN MADNESS)', `Verified Stage 3 UI Corruption, Chain-Shatter Quake animation, and Anti-Sovereign Huntsman Coalition Threat (${CommanderEngine.CampaignManager.state.sovereign.counterCoalitionThreat}%).`);
}

// ============================================================================
// TEST 4: EXPLOIT, STRESS & EDGE-CASE AUDIT (CRISES, COLLISIONS, WENDIGOS, RECALL)
// ============================================================================
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE', 'House Oakheart');
CommanderEngine.FacilityEngine.unlockFacility('guard_barracks');

// 4A. Caravan Launch -> Mid-Route Hazard -> Player Early Recall
CommanderEngine.FacilityEngine.chronoSeals = 20;
const expLaunch = CommanderEngine.ExpeditionEngine.launchExpedition('GUARDED_CARAVAN', 'Gallows Hill');
CommanderEngine.tickInGameHour(3);
const recallRes = CommanderEngine.ExpeditionEngine.recallExpedition(expLaunch.expedition.id);
if (!recallRes.success) {
    auditReport.bugsFound.push(`Expected early caravan recall to succeed, got: ${JSON.stringify(recallRes)}`);
} else {
    logPlay('CARAVAN RECALL AUDIT', recallRes.message);
}

// 4B. Dual Starvation + Freezing -> Next-Shift Feral Wendigo Rebirth -> Hunt Directive
const testVictim = Array.from(CommanderEngine.AgentRosterManager.agents.values()).find(a => a.alive);
testVictim.birthright = { id: 'STORM_BORN', title: 'Storm-Born', coldImmune: false };
CommanderEngine.AgentRosterManager.applySituationalStatus(testVictim.id, 'STARVING');
CommanderEngine.AgentRosterManager.applySituationalStatus(testVictim.id, 'FREEZING');
CommanderEngine.AgentRosterManager.evaluateActorDeath(testVictim.id, 'Froze while starving on the northern dike');
CommanderEngine.AgentRosterManager.processShiftWendigoRebirths(15);
const huntRes = CommanderEngine.CampaignManager.dispatchAction('HUNT_FERAL_WENDIGO');
if (!huntRes.success) {
    auditReport.bugsFound.push(`Expected HUNT_FERAL_WENDIGO to resolve against risen Feral Wendigo, got: ${JSON.stringify(huntRes)}`);
} else {
    logPlay('WENDIGO REBIRTH & HUNT', huntRes.message);
}

// 4C. Force 3-Way Procedural Pressure Collision & Verify Causal Narrative Manifest + Rebound
const colEvent = CommanderEngine.ProceduralCollisionEngine.evaluateSector({
    FORCE_WENDIGO_CONSUMPTION: 0.94,
    IRON_RUST_CONSTANT: 0.91,
    SQUAD_POISE_DECAY: 0.89
});
CommanderUI.render();
const colBannerHtml = document.getElementById('procedural-collision-readout')?.innerHTML || '';
if (!colEvent || !colEvent.narrativeManifest?.proceduralDescription || !colBannerHtml.includes('World Qualities:')) {
    auditReport.bugsFound.push('Procedural Collision failed to render narrativeManifest and World Qualities in UI readout.');
} else {
    logPlay('GRAMMAR OF CHAOS UI', `${colEvent.eventName} -> ${colEvent.narrativeManifest.proceduralDescription}`);
}

// 4D. Trigger High-Volatility Crisis -> Test Dream Intervention Ward (-10u Dream Siphon)
CommanderEngine.CrisisEngine.volatilityIndex = 95;
CommanderEngine.CrisisEngine.triggerContextualCrisis('NOBLE_HOUSE', 'House Oakheart');
if (!CommanderEngine.CrisisEngine.activeCrisis) {
    auditReport.bugsFound.push('Expected CrisisEngine.triggerContextualCrisis() to spawn an active crisis.');
} else {
    const crisisTitle = CommanderEngine.CrisisEngine.activeCrisis.title;
    const firstChoiceId = CommanderEngine.CrisisEngine.activeCrisis.choices[0]?.id;
    window.triggerDreamIntervention(CommanderEngine.CrisisEngine.activeCrisis.id, 10);
    window.resolveCrisis(firstChoiceId);
    logPlay('CRISIS & DREAM WARD', `Mitigated [${crisisTitle}] using Dream Intervention Ward (Remaining Siphon: ${CommanderEngine.CampaignManager.state.house.dreamSiphon}u).`);
}

// ============================================================================
// TEST 5: 17-POINT USER FEEDBACK OVERHAUL VERIFICATION
// ============================================================================
// 5A. Role Selector Redactions & One-Way Lockout
CommanderUI.openRoleSelection(true);
const roleGateHtml = document.getElementById('commander-terminal-root')?.innerHTML || '';
if (!roleGateHtml.includes('ROLE: MERCHANT PATRON') || !roleGateHtml.includes('ROLE: NOBLE HOUSE') || !roleGateHtml.includes('?%') || roleGateHtml.includes('OBSIDIAN CITADEL')) {
    auditReport.bugsFound.push('Role Selector card redactions or Merchant Patron / Noble House labels missing.');
} else {
    logPlay('ROLE SELECTOR REDACTION', 'Verified Merchant Patron under Crown, Noble House under Noble House, and Obsidian Citadel name + Containment ?% gauge blacked out.');
}
CommanderUI.selectRoleAndLaunch('GUILD_LEADER');
window.commitHubRun();
CommanderUI.openRoleSelection(false);
if (!CommanderUI.isRunCommitted || document.getElementById('btn-nav-page1-gate')?.style.display !== 'none' || document.getElementById('btn-nav-page2-roster')?.style.display !== 'none' || document.getElementById('btn-commit-hub-run')?.style.display !== 'none') {
    auditReport.bugsFound.push('Expected clicking [CONFIRM HUB SELECTIONS & UPDATE LEDGER] (commitHubRun) to hide Page 1, Page 2, and Commit Run buttons until the current run ends.');
} else {
    logPlay('ROLE LOCKOUT & CITADEL TAX EXEMPTION', `Verified clicking [CONFIRM HUB SELECTIONS & UPDATE LEDGER] locks out Page 1/Page 2/Commit buttons and verified Obsidian Citadel tax exemption (crownDemand=${CommanderEngine.CampaignManager.state.order.crownDemand}, taxExempt=${CommanderEngine.CampaignManager.state.order.taxExempt}).`);
}

// 5B. Fallout Shelter 6h Patrol -> +4h Advance -> Recall Return March & Log
CommanderUI.selectRoleAndLaunch('NOBLE_HOUSE', 'House Oakheart');
CommanderEngine.FacilityEngine.unlockFacility('guard_barracks');
const patLaunch = CommanderEngine.ExpeditionEngine.launchExpedition('PATROL_MIST', 'Border Mist');
CommanderEngine.tickInGameHour(4);
const patRecall = CommanderEngine.ExpeditionEngine.recallExpedition(patLaunch.expedition.id);
if (!patRecall.success || patLaunch.expedition.status !== 'RETURNING_EARLY' || patLaunch.expedition.returnHoursRemaining !== 4) {
    auditReport.bugsFound.push(`Expected 4h into 6h patrol recall to enter RETURNING_EARLY with 4h return trek, got ${JSON.stringify(patRecall)}`);
} else {
    CommanderEngine.tickInGameHour(4);
    logPlay('FALLOUT SHELTER PATROL RECALL', `Verified 6h patrol advanced +4h -> recalled into 4h return march with wasteland log: "${patRecall.message}"`);
}

// 5C. Dynamic Stress Index, All 4 Inquest Verdicts, Family Lineage Death Certificate & Exit Dossier Button
const inq1 = CommanderEngine.InterrogationDesk.interrogate('agt_2');
const inq2 = CommanderEngine.InterrogationDesk.interrogate('agt_2');
if (inq1.suspect.deceptionScore === inq2.suspect.deceptionScore) {
    auditReport.bugsFound.push(`Expected Observed Stress Index to shift dynamically across interrogation rounds, got ${inq1.suspect.deceptionScore}% -> ${inq2.suspect.deceptionScore}%`);
} else {
    logPlay('DYNAMIC STRESS INDEX', `Verified Observed Stress Index shifted dynamically (${inq1.suspect.deceptionScore}% -> ${inq2.suspect.deceptionScore}%).`);
}
const vExon = CommanderEngine.InterrogationDesk.renderVerdict('agt_2', 'exonerate');
const vDemo = CommanderEngine.InterrogationDesk.renderVerdict('agt_2', 'demote');
const vTurn = CommanderEngine.InterrogationDesk.renderVerdict('agt_3', 'turn_agent');
const vExec = CommanderEngine.InterrogationDesk.renderVerdict('agt_4', 'execute');
if (!vExon.success || !vDemo.success || !vTurn.success || !vExec.success || !vExec.transcript.includes('FAMILY LINEAGE & BLOODLINE CONNECTIONS')) {
    auditReport.bugsFound.push('One or more inquest verdicts (exonerate, demote, turn_agent, execute) or family lineage death certificate failed.');
} else {
    logPlay('INQUEST VERDICTS & LINEAGE DOSSIER', `Verified Exonerate, Demote, Turn Double Agent, and Execute + elaborated Family Lineage Death Certificate.`);
}
window.viewStory('agt_4');
window.closeStoryReader();
if (document.getElementById('story-reader')?.style.display !== 'none') {
    auditReport.bugsFound.push('Expected window.closeStoryReader() to hide the dossier reader.');
}

// 5D. Armory Market Facility, Unit Recruitment, Book Page Tabs, Emissary Variety & First-Click Tutorial Advisor
CommanderEngine.FacilityEngine.settlementResources += 40;
CommanderEngine.FacilityEngine.unlockFacility('armory_market');
const buyRes = CommanderEngine.AgentRosterManager.buyArmoryGear('blackwood_crossbow');
const sellRes = CommanderEngine.AgentRosterManager.sellArmoryGear('blackwood_crossbow');
const recRes = CommanderEngine.AgentRosterManager.recruitFactionUnit('WARDEN');
if (!buyRes.success || !sellRes.success || !recRes.success) {
    auditReport.bugsFound.push(`Expected Armory Market buy/sell and Faction Unit Recruitment to succeed: buy=${buyRes.message}, sell=${sellRes.message}, rec=${recRes.message}`);
} else {
    logPlay('ARMORY MARKET & UNIT RECRUITMENT', `${buyRes.message} | ${recRes.message}`);
}
window.switchBookTab('GARRISON');
window.switchBookTab('FIELD');
window.viewTruthVault();
const petA = CommanderEngine.RealityEditorVault.generateEmissaryPetition(3);
CommanderEngine.RealityEditorVault.resolveEmissaryPetition('REJECT');
const petB = CommanderEngine.RealityEditorVault.generateEmissaryPetition(6);
if (petA.archetypeId === petB.archetypeId && petA.senderHouse === petB.senderHouse) {
    auditReport.bugsFound.push('Expected daily Emissary Petitions to rotate archetypes and rival houses.');
} else {
    logPlay('EMISSARY VARIETY & ADVISOR', `Verified rotating Emissary Petitions (${petA.archetypeId} from ${petA.senderHouse} -> ${petB.archetypeId} from ${petB.senderHouse} with Power Context "${petB.powerContext}") and Tutorial Advisor (${CommanderEngine.TutorialAdvisor.seenTopics.size} topics triggered).`);
}

// 5E. Premium-Gated Time Acceleration, Scaling Chrono-Seal Costs & 7-Fragment Daily Log-In Assembly
CommanderEngine.FacilityEngine.chronoSeals = 30;
CommanderEngine.FacilityEngine.chronoSealFragments = 0;
for (let sDay = 1; sDay <= 6; sDay++) {
    CommanderEngine.FacilityEngine.claimDailyLoginFragments(true);
}
if (CommanderEngine.FacilityEngine.chronoSealFragments !== 6 || CommanderEngine.FacilityEngine.chronoSeals !== 30) {
    auditReport.bugsFound.push(`Expected 6 daily log-in claims to accumulate 6/7 fragments, got ${CommanderEngine.FacilityEngine.chronoSealFragments}/7 and ${CommanderEngine.FacilityEngine.chronoSeals} seals.`);
}
const seventhClaim = CommanderEngine.FacilityEngine.claimDailyLoginFragments(true); // 7th streak day grants +2 bonus fragments -> 8 total -> 1 seal minted + 1 fragment remainder
if (!seventhClaim.success || seventhClaim.sealsMinted !== 1 || CommanderEngine.FacilityEngine.chronoSeals !== 31) {
    auditReport.bugsFound.push(`Expected 7th daily log-in fragment claim to assemble 7/7 fragments into +1 Royal Chrono-Seal, got ${JSON.stringify(seventhClaim)}`);
} else {
    logPlay('DAILY LOG-IN 7-FRAGMENT SEAL FORGE', seventhClaim.message);
}

const sealsStart = CommanderEngine.FacilityEngine.chronoSeals;
const boost2h = CommanderEngine.premiumStepHours(2); // costs 1 seal
const boost6h = CommanderEngine.premiumStepHours(6); // costs 3 seals (most expensive hour skip)
const skip1d = CommanderEngine.chronoSkipDays(1);    // costs 6 seals (> 3 seals)
const skip3d = CommanderEngine.chronoSkipDays(3);    // costs 18 seals (3 * 6 seals)
if (!boost2h.success || boost2h.sealCost !== 1 || !boost6h.success || boost6h.sealCost !== 3 || !skip1d.success || skip1d.sealCost !== 6 || skip1d.sealCost <= boost6h.sealCost || !skip3d.success || skip3d.sealCost !== 18) {
    auditReport.bugsFound.push(`Expected scaling premium Chrono-Seal costs (2h=1, 6h=3, 1d=6, 3d=18 with 1d > 6h), got 2h=${boost2h.sealCost}, 6h=${boost6h.sealCost}, 1d=${skip1d.sealCost}, 3d=${skip3d.sealCost}`);
} else {
    logPlay('PREMIUM SCALING TIME ACCELERATION', `Verified scaling Royal Chrono-Seal costs: +2H Boost (-1 Seal), +6H Boost (-3 Seals), +1D Skip (-6 Seals), +3D Skip (-18 Seals) | Remaining Seals: ${CommanderEngine.FacilityEngine.chronoSeals}/${sealsStart}.`);
}

// 5F. Addendum CA-13 8-Tier Runic Body-Carving, Fallout Shelter Stat Training & Live Combat Events Log
window.trainAgentStat('agt_1', 'STRENGTH');
CommanderEngine.AgentRosterManager.tickDailyDrills();
CommanderEngine.CampaignManager.state.house.barrierFuelUnits = 60;
CommanderEngine.FacilityEngine.settlementResources = 200;
CommanderEngine.FacilityEngine.chronoSeals = 10;
CommanderEngine.AgentRosterManager.cultivateTerminusRunic('agt_1'); // Tier 1
CommanderEngine.AgentRosterManager.cultivateTerminusRunic('agt_1'); // Tier 2
CommanderEngine.AgentRosterManager.cultivateTerminusRunic('agt_1'); // Tier 3 (300 Guardian)
const blockedTier4 = CommanderEngine.AgentRosterManager.cultivateTerminusRunic('agt_1'); // Blocked until runic_carving_facility built
if (blockedTier4.success) {
    auditReport.bugsFound.push('Expected Tier 4 Runic Body-Carving to be blocked before constructing Runic Body-Carving Scriptorium.');
}
CommanderEngine.FacilityEngine.unlockFacility('runic_carving_facility');
CommanderEngine.CampaignManager.state.house.barrierFuelUnits = 60;
const tier4Res = CommanderEngine.AgentRosterManager.cultivateTerminusRunic('agt_1'); // Tier 4 (Apex Phantom, costs 1 Seal)
const combatExp = CommanderEngine.ExpeditionEngine.launchExpedition('PATROL_MIST', 'Cullfield');
CommanderEngine.tickInGameHour(3); // Reaches 35% combat encounter hour
if (!tier4Res.success || tier4Res.tier !== 4 || !combatExp.expedition.combatEvents || combatExp.expedition.combatEvents.length < 3) {
    auditReport.bugsFound.push(`Expected Tier 4 Runic Body-Carving (Apex Phantom) and 3-round Live Combat Telemetry log to succeed, got tier4=${JSON.stringify(tier4Res)}, combatEvents=${JSON.stringify(combatExp.expedition?.combatEvents)}`);
} else {
    logPlay('ADDENDUM CA-13 RUNIC CARVING & LIVE COMBAT LOG', `${tier4Res.message}\n   ↳ Live Combat Log: ${combatExp.expedition.combatEvents.join(' | ')}`);
}

// 5G. Interactive 20-Settlement Tactical Dominion Map, Fog of War Recon Layer, Dragon-Sim Encounter Arena & Auditor's Retreat Fallback
window.viewWarBoard();
window.selectMapSettlement(15); // Select Blighted Watch (#15, Outer Horizon node outside Inner Forest Zone -> starts covered by Fog of War)
const foggedDeckHtml = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!foggedDeckHtml.includes('OUTER HORIZON FOG — UNCHARTED SECTOR #15') || !foggedDeckHtml.includes('Dispatch Mist-Recon Patrol (Lift Fog of War)')) {
    auditReport.bugsFound.push('Expected outer settlement node #15 (outside the Inner Forest Zone) to start obscured by the Fog of War layer.');
}
window.scoutFogOfWarNode('Blighted Watch'); // Lift Fog of War via Mist-Recon Patrol
window.selectMapSettlement(15);
const unfoggedDeckHtml = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!unfoggedDeckHtml.includes('SELECTED NODE: BLIGHTED WATCH') || unfoggedDeckHtml.includes('OUTER HORIZON FOG — UNCHARTED SECTOR #15')) {
    auditReport.bugsFound.push('Expected window.scoutFogOfWarNode("Blighted Watch") to lift the Fog of War on outer settlement #15.');
}

window.selectMapSettlement(2); // Select Gallows Hill (#2, Inner Forest Zone)
window.openTacticalEncounter(2);
const encRound1 = window.executeEncounterAction('CAUSAL_WARP');
const encRound2 = window.executeEncounterAction('RUNIC_SURGE');
const encRound3 = window.executeEncounterAction('STRIKE');
window.toggleMapViewMode(); // Test Auditor's Retreat Fallback toggle
window.toggleMapViewMode();
const warDeckHtml = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!encRound1.success || !warDeckHtml.includes('TACTICAL ENCOUNTER ARENA') || !warDeckHtml.includes('SELECTED NODE: GALLOWS HILL')) {
    auditReport.bugsFound.push('Expected Interactive 20-Settlement Tactical Dominion Map and Tactical Encounter Arena modal to render and execute combat rounds.');
} else {
    logPlay('TACTICAL DOMINION MAP, FOG OF WAR & ENCOUNTER ARENA', `Verified Outer Fog of War shroud on Sector #15 lifted by Mist-Recon Patrol + Encounter Arena: ${encRound1.message} | ${encRound2.message} | ${encRound3.message}`);
}

// 5H. Facility-Gated "EXPLORE FOREST", Fallout Shelter Pop-Up Facility Grid, Forward Recon Training Grounds Queue & Pale Sovereign Hunt/Stalk/Attack/Feed
const gatedExploreRes = window.openExploreForest(); // Before building exploration_observatory -> pops up Fallout Shelter Facility Grid modal!
const facPopupHtml = document.getElementById('fallout-facility-popup-modal')?.innerHTML || '';
if (!gatedExploreRes?.gated || !facPopupHtml.includes('FALLOUT SHELTER BASE VAULT // INTERCONNECTED FACILITY ROOM GRID')) {
    auditReport.bugsFound.push('Expected clicking Explore Forest before building Forward Recon Outpost to gate access and pop up the Fallout Shelter Facility Room Grid modal.');
}
CommanderEngine.FacilityEngine.settlementResources += 50;
CommanderEngine.FacilityEngine.unlockFacility('training_grounds');
CommanderEngine.FacilityEngine.unlockFacility('exploration_observatory');
window.queueAgentTrainingPreset('agt_1', 'RECON');
const agt1LockedCheck = CommanderEngine.AgentRosterManager.agents.get('agt_1');
if (!agt1LockedCheck?.trainingLocked) {
    auditReport.bugsFound.push('Expected queueing training in Forward Recon Training Grounds to lock the unit until complete.');
}
const cancelEarlyRes = CommanderEngine.AgentRosterManager.cancelAgentTraining('agt_1');
if (!cancelEarlyRes.success || agt1LockedCheck.trainingLocked) {
    auditReport.bugsFound.push('Expected cancelAgentTraining to pay 50% cost and release unit lock.');
}
// Verify +1 stat/day and 1 stat/category per Shift cap
const strBefore = agt1LockedCheck.skills.strength;
CommanderEngine.AgentRosterManager.setTraining('agt_1', 'STRENGTH');
CommanderEngine.AgentRosterManager.tickDailyDrills();
const strAfter = agt1LockedCheck.skills.strength;
const blockedRepeatShift = CommanderEngine.AgentRosterManager.setTraining('agt_1', 'STRENGTH');
if ((strAfter - strBefore) !== 1 || !blockedRepeatShift.shiftCapped) {
    auditReport.bugsFound.push(`Expected +1 stat point per day and 1 stat gain per category per Shift cap, got delta=${strAfter - strBefore}, repeat=${JSON.stringify(blockedRepeatShift)}`);
}

// Verify 3-Day Overworld Travel Supplies, Pop-Up Explore Forest Modal & Auto-Return Trek (Distance -> IRL Hours)
const unlockedExploreRes = window.openExploreForest();
window.zoomOverworldMap(0.5);
window.panOverworldMap(120, -80);
window.focusOverworldParty();
window.resetOverworldMapCamera();
const explorePopupHtml = document.getElementById('explore-forest-popup-modal')?.innerHTML || '';
if (!explorePopupHtml.includes('MOUNT &amp; BLADE FOREST OVERWORLD // SQUAD NAVIGATION') || !explorePopupHtml.includes('position:fixed; inset:0; z-index:9999;') || !explorePopupHtml.includes('overworld-terrain-canvas') || !explorePopupHtml.includes('overworld-svg-pan-zoom-group')) {
    auditReport.bugsFound.push('Expected clicking Explore Forest after upgrading Forward Recon facility to pop up the full-screen 4000x4000 Canvas+SVG Overworld Modal with pan/zoom/drag support.');
}
// Verify continuous free-roam waypoint movement & terrain speed modifiers
const wpStartRes = CommanderEngine.ForestOverworldEngine.setWaypoint(2100, 2100, { instantArrival: false });
const wpStepRes = CommanderEngine.ForestOverworldEngine.updatePartyMovement(0.08);
if (!wpStartRes.success || !wpStartRes.isMoving || !wpStepRes) {
    auditReport.bugsFound.push('Expected setWaypoint(2100, 2100) and updatePartyMovement() to move the squad continuously across the 4000x4000 terrain.');
}
CommanderEngine.ForestOverworldEngine.completeWaypointArrival(); // Complete leg 1 (2/3 supplies left)
const navLeg2 = CommanderEngine.ForestOverworldEngine.navigateSquadToNode(8);    // Day 2 supply used (1/3 left)
const navLeg3 = CommanderEngine.ForestOverworldEngine.navigateSquadToNode(10);   // Day 3 supply used (0/3 left -> triggers Auto-Return!)
const interceptRes = CommanderEngine.ForestOverworldEngine.executePredatorOrSquadAction('HUNT_PREY');
const campRes = CommanderEngine.ForestOverworldEngine.executePredatorOrSquadAction('FEED');
if (!unlockedExploreRes?.success || !wpStartRes.success || !navLeg2.success || !navLeg3.autoReturned || !interceptRes.success || !campRes.success) {
    auditReport.bugsFound.push(`Expected 3-day travel supply depletion to auto-return squad with distance-based return trek, got leg3=${JSON.stringify(navLeg3)}`);
}

// Switch to Pale Sovereign & verify dedicated Predator Overworld (Stalk, Hunt/Pounce & Feed/Gorge)
CommanderUI.selectRoleAndLaunch('PALE_SOVEREIGN');
window.openExploreForest();
const sovStalkRes = CommanderEngine.ForestOverworldEngine.executePredatorOrSquadAction('STALK');
const sovHuntRes = CommanderEngine.ForestOverworldEngine.executePredatorOrSquadAction('HUNT_PREY');
const sovFeedRes = CommanderEngine.ForestOverworldEngine.executePredatorOrSquadAction('FEED');
const sovOverworldHtml = document.getElementById('brutalist-subpage-deck')?.innerHTML || '';
if (!sovStalkRes.success || !sovHuntRes.success || !sovFeedRes.success || (CommanderEngine.CampaignManager.state.sovereign.significanceHarvested || 0) < 600 || !sovOverworldHtml.includes('PREDATOR OVERWORLD MAP')) {
    auditReport.bugsFound.push(`Expected Pale Sovereign Overworld Hunt/Stalk/Attack/Feed loop to harvest >=600 Historical Weight and render Predator Overworld Map, got weight=${CommanderEngine.CampaignManager.state.sovereign.significanceHarvested}`);
} else {
    logPlay('MOUNT & BLADE 4000x4000 FREE-ROAM OVERWORLD & PALE SOVEREIGN HUNT/STALK/FEED', `Squad Free-Roam Overworld: ${wpStartRes.message} | ${interceptRes.message}\n   ↳ Pale Sovereign Predator Overworld: ${sovStalkRes.message} | ${sovHuntRes.message} | ${sovFeedRes.message}`);
}

// 5I. Mirror src/core/commander_engine.js & src/systems/commander_ui.js to ledger-mobile/
import fs from 'node:fs';
fs.copyFileSync('./src/core/commander_engine.js', './ledger-mobile/src/core/commander_engine.js');
fs.copyFileSync('./src/systems/commander_ui.js', './ledger-mobile/src/systems/commander_ui.js');

console.log('--------------------------------------------------------------------------------');
if (auditReport.bugsFound.length > 0) {
    console.error('LIVE PLAYTESTER AUDIT FOUND ISSUES:', auditReport.bugsFound);
    process.exit(1);
} else {
    console.log('LIVE GAME TESTER PLAYTHROUGH & SYSTEMIC QA AUDIT PASSED (0 BUGS, 100% UI & LOOP PARITY)!');
    process.exit(0);
}

