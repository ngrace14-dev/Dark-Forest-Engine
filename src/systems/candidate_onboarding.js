/**
 * File: src/systems/candidate_onboarding.js
 * Implements the 5-scene Candidate Onboarding sequence:
 * Scene 1: Identity & Flesh Record (Name, Appearance, Birthright)
 * Scene 2: Vocation & Runic Body Architecture
 * Scene 3: Origin & Five-Strand Extractor
 * Scene 4: Voice & Ledger Calibration
 * Scene 5: Turn 001 Handoff -> Role Selection Gate & Garrison Injection
 */
import CommanderEngine from '../core/commander_engine.js';
import CommanderUI from './commander_ui.js';

const rootScope = typeof window !== 'undefined' ? window : globalThis;

export const CandidateOnboarding = {
    state: {
        name: 'Corin of Ash-Ford',
        appearance: 'Lean, mud-spattered wool cloak over patched leather; calloused hands, weathered face, and completely unmarked skin beneath the collar.',
        birthright: 'FUEL_BORN',
        vocation: 'ADVENTURER',
        originText: 'Survived the Silt-Dike wagon wreck before the last Shift; carrying a stamped copper toll-token and an unpaid blood-debt to House Gallows.',
        extractedStrands: ['[STEEL] Stamped Copper Toll-Token logged', '[INK] House Gallows Debt Ledger indexed'],
        voice: 'dust_warden',
        completed: false
    },

    start(uiInstance = CommanderUI) {
        const ui = uiInstance || CommanderUI;
        rootScope.CandidateUIInstance = ui;

        if (typeof document !== 'undefined') {
            const modal = document.getElementById(ui.modalId || 'text-commander-viewport');
            if (modal) modal.classList.remove('hidden');
            const mobileTitle = document.getElementById('mobile-title-screen');
            if (mobileTitle) mobileTitle.classList.add('hidden');
        }

        ui.stopAutoTick?.();
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        if (container.dataset) container.dataset.initialized = 'false';

        console.log('[ONBOARDING] Initiating Scene 1: Identity & Birthright...');
        this.renderScene1(container);
    },

    renderScene1(container) {
        const b = this.state.birthright;
        container.innerHTML = `
            <div class="ledger-parchment-Sheet" style="max-width:660px; margin:12px auto; padding:16px; border:2px solid #78350f; background:#14110e; color:#e7e5e4; font-family:monospace;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:12px; padding-bottom:8px;">
                    <h2 style="color:#fbbf24; margin:0; font-size:15px;">[ STEP 1 OF 4 : IDENTITY & FLESH RECORD ]</h2>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:4px;">&gt; ENTER YOUR NAME / CALLSIGN:</label>
                    <input type="text" id="onboard-name" value="${this.state.name}" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:4px;">&gt; DESCRIBE YOUR APPEARANCE:</label>
                    <textarea id="onboard-appearance" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box; height:64px;">${this.state.appearance}</textarea>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:6px;">&gt; SELECT BIRTHRIGHT:</label>
                    <div id="birthright-options" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        <button type="button" onclick="window.selectBirthright('HOUSE_REMNANT')" style="background:#1c1917; border:1px solid ${b === 'HOUSE_REMNANT' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${b === 'HOUSE_REMNANT' ? '(*)' : '( )'} HOUSE REMNANT</button>
                        <button type="button" onclick="window.selectBirthright('FUEL_BORN')" style="background:#1c1917; border:1px solid ${b === 'FUEL_BORN' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${b === 'FUEL_BORN' ? '(*)' : '( )'} FUEL-BORN</button>
                        <button type="button" onclick="window.selectBirthright('CHAMPION_KIN')" style="background:#1c1917; border:1px solid ${b === 'CHAMPION_KIN' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${b === 'CHAMPION_KIN' ? '(*)' : '( )'} CHAMPION-KIN</button>
                        <button type="button" onclick="window.selectBirthright('ECHO_OF_THE_SEAL')" style="background:#1c1917; border:1px solid ${b === 'ECHO_OF_THE_SEAL' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${b === 'ECHO_OF_THE_SEAL' ? '(*)' : '( )'} ECHO OF THE SEAL</button>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="window.onboardingFinish(1)" style="flex:1; background:#78350f; color:#fbbf24; padding:10px; border:1px solid #fbbf24; cursor:pointer; font-weight:bold;">PROCEED TO VOCATION &rarr;</button>
                    <button type="button" onclick="window.onboardingSkipToRoles()" style="background:#1c1917; color:#a8a29e; padding:10px 12px; border:1px solid #44403c; cursor:pointer; font-size:11px;">Skip to Roles</button>
                </div>
            </div>
        `;
    },

    startScene2(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        const v = this.state.vocation;
        console.log('[ONBOARDING] Initiating Scene 2: Vocation & Mastery Matrix...');

        container.innerHTML = `
            <div class="ledger-parchment-Sheet" style="max-width:660px; margin:12px auto; padding:16px; border:2px solid #78350f; background:#14110e; color:#e7e5e4; font-family:monospace;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:12px; padding-bottom:8px;">
                    <h2 style="color:#fbbf24; margin:0; font-size:15px;">[ STEP 2 OF 4 : VOCATION & RUNIC ARCHITECTURE ]</h2>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:6px;">&gt; SELECT GROUND-STATE VOCATION:</label>
                    <div id="vocation-options" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                        <button type="button" onclick="window.selectVocation('ADVENTURER')" style="background:#1c1917; border:1px solid ${v === 'ADVENTURER' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${v === 'ADVENTURER' ? '(*)' : '( )'} ADVENTURER / SURVEYOR</button>
                        <button type="button" onclick="window.selectVocation('SCRIBE')" style="background:#1c1917; border:1px solid ${v === 'SCRIBE' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${v === 'SCRIBE' ? '(*)' : '( )'} SCRIBE / ARCHIVIST</button>
                        <button type="button" onclick="window.selectVocation('SCAVENGER')" style="background:#1c1917; border:1px solid ${v === 'SCAVENGER' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${v === 'SCAVENGER' ? '(*)' : '( )'} CONTEXT SCAVENGER</button>
                        <button type="button" onclick="window.selectVocation('WARDEN')" style="background:#1c1917; border:1px solid ${v === 'WARDEN' ? '#fbbf24' : '#78350f'}; color:#fff; padding:8px; cursor:pointer; text-align:left;">${v === 'WARDEN' ? '(*)' : '( )'} CHAIN-WARDEN / ARTISAN</button>
                    </div>
                </div>
                <div style="background:#0c0a09; border:1px solid #78350f; padding:10px; margin-bottom:14px;">
                    <h3 style="color:#fbbf24; margin:0 0 4px 0; font-size:13px;">RUNIC BODY ARCHITECTURE</h3>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:6px; font-size:11px;">
                        <div>[NECK: Empty]</div><div>[CHEST: Empty]</div><div>[SPINE: Empty]</div>
                        <div>[L. ARM: Empty]</div><div>[R. ARM: Empty]</div><div>[LEGS: Empty]</div>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="window.onboardingBack(1)" style="background:#1c1917; color:#d6d3d1; padding:10px 12px; border:1px solid #57534e; cursor:pointer;">&larr; Back</button>
                    <button type="button" onclick="window.onboardingFinish(2)" style="flex:1; background:#78350f; color:#fbbf24; padding:10px; border:1px solid #fbbf24; cursor:pointer; font-weight:bold;">PROCEED TO ORIGIN &rarr;</button>
                </div>
            </div>
        `;
    },

    startScene3(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        console.log('[ONBOARDING] Initiating Scene 3: Origin & Extraction...');

        container.innerHTML = `
            <div class="ledger-parchment-Sheet" style="max-width:660px; margin:12px auto; padding:16px; border:2px solid #78350f; background:#14110e; color:#e7e5e4; font-family:monospace;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:12px; padding-bottom:8px;">
                    <h2 style="color:#fbbf24; margin:0; font-size:15px;">[ STEP 3 OF 4 : ORIGIN & FIVE-STRAND EXTRACTOR ]</h2>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:4px;">&gt; WHERE WERE YOU BEFORE THIS SHIFT, AND WHAT DEBT OR ARTIFACT FOLLOWS YOU?</label>
                    <textarea id="onboard-origin" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box; height:76px;">${this.state.originText}</textarea>
                </div>
                <button type="button" onclick="window.runExtractor()" style="width:100%; background:#1e1b4b; color:#e0e7ff; padding:8px; border:1px solid #818cf8; cursor:pointer; font-weight:bold;">RUN FIVE-STRAND EXTRACTOR</button>
                <div id="extraction-result" style="margin-top:10px; padding:8px; background:#09090b; border:1px dashed #78350f; color:#fbbf24; font-size:11px;">
                    ${this.state.extractedStrands.join('<br>')}
                </div>
                <div style="display:flex; gap:8px; margin-top:14px;">
                    <button type="button" onclick="window.onboardingBack(2)" style="background:#1c1917; color:#d6d3d1; padding:10px 12px; border:1px solid #57534e; cursor:pointer;">&larr; Back</button>
                    <button type="button" onclick="window.onboardingFinish(3)" style="flex:1; background:#78350f; color:#fbbf24; padding:10px; border:1px solid #fbbf24; cursor:pointer; font-weight:bold;">PROCEED TO CALIBRATION &rarr;</button>
                </div>
            </div>
        `;
    },

    startScene4(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        console.log('[ONBOARDING] Initiating Scene 4: Voice Calibration...');

        container.innerHTML = `
            <div class="ledger-parchment-Sheet" style="max-width:660px; margin:12px auto; padding:16px; border:2px solid #78350f; background:#14110e; color:#e7e5e4; font-family:monospace;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:12px; padding-bottom:8px;">
                    <h2 style="color:#fbbf24; margin:0; font-size:15px;">[ STEP 4 OF 4 : VOICE & LEDGER CALIBRATION ]</h2>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:6px;">&gt; CHRONICLE VOICE:</label>
                    <select id="onboard-voice" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px;">
                        <option value="dust_warden" ${this.state.voice === 'dust_warden' ? 'selected' : ''}>Dust-Warden Elder</option>
                        <option value="terminus_archivist" ${this.state.voice === 'terminus_archivist' ? 'selected' : ''}>Terminus Archivist</option>
                    </select>
                </div>
                <div style="margin-bottom:14px; border:1px solid #78350f; padding:10px; font-size:11.5px;">
                    <div style="color:#fbbf24; font-weight:bold;">CANDIDATE DOSSIER: ${this.state.name}</div>
                    <div>Birthright: ${this.state.birthright} | Vocation: ${this.state.vocation}</div>
                    <div style="color:#a8a29e; margin-top:4px;">Tracking: 14-Day Shift, Story Heat, Five-Strand Contradictions.</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="window.onboardingBack(3)" style="background:#1c1917; color:#d6d3d1; padding:10px 12px; border:1px solid #57534e; cursor:pointer;">&larr; Back</button>
                    <button type="button" onclick="window.onboardingFinish(4)" style="flex:1; background:#78350f; color:#fbbf24; padding:10px; border:1px solid #fbbf24; cursor:pointer; font-weight:bold;">ENTER THE DARK FOREST &rarr;</button>
                </div>
            </div>
        `;
    },

    finalizeCandidateAndOpenRoleGate(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        this.state.completed = true;
        CommanderEngine.customCandidateProfile = { ...this.state };
        this.injectCandidateIntoRoster();
        if (typeof ui.openRoleSelection === 'function') {
            ui.openRoleSelection();
        } else if (typeof rootScope.openRoleGate === 'function') {
            rootScope.openRoleGate();
        }
    },

    injectCandidateIntoRoster() {
        const prof = CommanderEngine.customCandidateProfile;
        if (!prof || !CommanderEngine.AgentRosterManager) return;
        const arm = CommanderEngine.AgentRosterManager;
        const bKey = prof.birthright === 'FUEL_BORN' ? 'ASH_BOUND' : (CommanderEngine.BIRTHRIGHTS?.[prof.birthright] ? prof.birthright : 'HOUSE_REMNANT');
        const agt = arm.agents.get('agt_1');
        if (agt) {
            agt.name = prof.name || agt.name;
            agt.birthright = CommanderEngine.BIRTHRIGHTS?.[bKey] || agt.birthright;
            agt.appearance = prof.appearance;
            agt.originStrands = prof.extractedStrands;
            if (prof.vocation === 'SCRIBE') agt.skills.lore += 3;
            else if (prof.vocation === 'SCAVENGER') { agt.skills.stealth += 2; agt.skills.dodge += 2; }
            else if (prof.vocation === 'WARDEN') { agt.skills.meleeDef += 2; agt.skills.toughness += 2; }
            else { agt.skills.meleeAtt += 2; agt.skills.survival += 2; }
        }
    }
};

rootScope.selectBirthright = (id) => {
    CandidateOnboarding.state.birthright = id;
    const ui = rootScope.CandidateUIInstance || CommanderUI;
    const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
    const nameEl = typeof document !== 'undefined' ? document.getElementById('onboard-name') : null;
    const appEl = typeof document !== 'undefined' ? document.getElementById('onboard-appearance') : null;
    if (nameEl && nameEl.value.trim()) CandidateOnboarding.state.name = nameEl.value.trim();
    if (appEl && appEl.value.trim()) CandidateOnboarding.state.appearance = appEl.value.trim();
    if (container) CandidateOnboarding.renderScene1(container);
};

rootScope.selectVocation = (id) => {
    CandidateOnboarding.state.vocation = id;
    CandidateOnboarding.startScene2(rootScope.CandidateUIInstance || CommanderUI);
};

rootScope.runExtractor = () => {
    const originEl = typeof document !== 'undefined' ? document.getElementById('onboard-origin') : null;
    const text = originEl ? originEl.value.trim() : CandidateOnboarding.state.originText;
    CandidateOnboarding.state.originText = text;
    const strands = [
        `[MIND] Survivor testimony recorded by ${CandidateOnboarding.state.name}`,
        `[STEEL] Physical token & gear wear verified (${CandidateOnboarding.state.vocation})`,
        `[INK] Cross-referenced against Royal Archive Shift Rolls`
    ];
    if (text.toLowerCase().includes('debt') || text.toLowerCase().includes('house')) {
        strands.push(`[VERSE] Blood-debt rumor indexed in border balladry`);
    }
    CandidateOnboarding.state.extractedStrands = strands;
    const resDiv = typeof document !== 'undefined' ? document.getElementById('extraction-result') : null;
    if (resDiv) resDiv.innerHTML = strands.join('<br>');
};

rootScope.onboardingBack = (targetStep) => {
    const ui = rootScope.CandidateUIInstance || CommanderUI;
    const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
    if (targetStep === 1 && container) CandidateOnboarding.renderScene1(container);
    else if (targetStep === 2) CandidateOnboarding.startScene2(ui);
    else if (targetStep === 3) CandidateOnboarding.startScene3(ui);
};

rootScope.onboardingSkipToRoles = () => {
    CandidateOnboarding.finalizeCandidateAndOpenRoleGate(rootScope.CandidateUIInstance || CommanderUI);
};

rootScope.onboardingFinish = (step) => {
    const ui = rootScope.CandidateUIInstance || CommanderUI;
    if (step === 1) {
        const nameEl = typeof document !== 'undefined' ? document.getElementById('onboard-name') : null;
        const appEl = typeof document !== 'undefined' ? document.getElementById('onboard-appearance') : null;
        if (nameEl && nameEl.value.trim()) CandidateOnboarding.state.name = nameEl.value.trim();
        if (appEl && appEl.value.trim()) CandidateOnboarding.state.appearance = appEl.value.trim();
        CandidateOnboarding.startScene2(ui);
    } else if (step === 2) {
        CandidateOnboarding.startScene3(ui);
    } else if (step === 3) {
        const originEl = typeof document !== 'undefined' ? document.getElementById('onboard-origin') : null;
        if (originEl && originEl.value.trim()) CandidateOnboarding.state.originText = originEl.value.trim();
        CandidateOnboarding.startScene4(ui);
    } else if (step === 4) {
        const voiceEl = typeof document !== 'undefined' ? document.getElementById('onboard-voice') : null;
        if (voiceEl) CandidateOnboarding.state.voice = voiceEl.value;
        CandidateOnboarding.finalizeCandidateAndOpenRoleGate(ui);
    }
};

rootScope.CandidateOnboarding = CandidateOnboarding;
export default CandidateOnboarding;



