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

    renderVitruvianRuneSvg() {
        return `
            <svg viewBox="0 0 120 190" style="width:100px; height:152px; display:block; margin:0 auto;">
                <path d="M60,12 C67,12 71,18 71,24 C71,30 67,35 60,35 C53,35 49,30 49,24 C49,18 53,12 60,12 Z
                         M48,38 L72,38 L86,52 L98,94 L90,97 L80,62 L75,62 L76,105 L82,175 L71,175 L63,115 L57,115 L49,175 L38,175 L44,105 L45,62 L40,62 L30,97 L22,94 L34,52 Z"
                      fill="rgba(217, 155, 67, 0.08)" stroke="#c8b798" stroke-width="1.3"/>
                <line x1="60" y1="22" x2="60" y2="112" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>
                <line x1="40" y1="54" x2="80" y2="54" stroke="#f59e0b" stroke-width="0.9"/>
                <line x1="48" y1="105" x2="72" y2="105" stroke="#f59e0b" stroke-width="0.9"/>
                <circle cx="60" cy="22" r="2.8" fill="#fbbf24"/>
                <circle cx="60" cy="39" r="2.4" fill="#fbbf24"/>
                <circle cx="60" cy="54" r="3.2" fill="#f59e0b"/>
                <circle cx="68" cy="60" r="2.5" fill="#fbbf24"/>
                <circle cx="60" cy="74" r="2.5" fill="#fbbf24"/>
                <circle cx="60" cy="92" r="2.5" fill="#fbbf24"/>
                <circle cx="42" cy="54" r="2.4" fill="#fbbf24"/>
                <circle cx="78" cy="54" r="2.4" fill="#fbbf24"/>
                <circle cx="32" cy="76" r="2.2" fill="#fbbf24"/>
                <circle cx="88" cy="76" r="2.2" fill="#fbbf24"/>
                <circle cx="48" cy="128" r="2.4" fill="#fbbf24"/>
                <circle cx="72" cy="128" r="2.4" fill="#fbbf24"/>
                <circle cx="44" cy="155" r="2.4" fill="#fbbf24"/>
                <circle cx="76" cy="155" r="2.4" fill="#fbbf24"/>
            </svg>
        `;
    },

    renderFiveStrandLogHtml() {
        const rows = [
            ['[MIND: 0.0%]', 'STATUS: [MIND: 0.0%]', 8],
            ['[VERSE: 18,000Y]', 'STATUS: 18,000Y', 88],
            ['[INK: COPY]', 'STATUS: [INK: COPY]', 64],
            ['[STONE: ANCHORED]', 'STATUS: ANCHORED', 92],
            ['[STEEL: VERIFIED]', 'STATUS: VERIFIED', 78]
        ];
        return rows.map(([tag, st, pct]) => `
            <div style="display:grid; grid-template-columns: 140px 1fr; gap:8px; align-items:center; padding:4px 0; border-bottom:1px solid rgba(120,113,99,0.22);">
                <div>
                    <div style="color:#e2d1b0; font-size:11.5px; font-weight:bold;">${tag} <span style="color:#d9822b; font-size:10px;">|•|</span></div>
                    <div style="color:#6c665a; font-size:7px;">01001101 01000101 01001101</div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:8px; color:#9c9280; margin-bottom:2px;">
                        <span>STATUS:</span><span>${st}</span>
                    </div>
                    <div style="height:7px; background:#090c0d; border:1px solid #4a453b; padding:1px;">
                        <div style="width:${pct}%; height:100%; background:repeating-linear-gradient(90deg, #d9822b 0px, #d9822b 3px, transparent 3px, transparent 5px);"></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderScene1(container) {
        const b = this.state.birthright;
        const btnStyle = (id) => `background:#171a1b; border:1px solid ${b === id ? '#fbbf24' : '#4a453b'}; color:#e2d1b0; padding:5px; cursor:pointer; font-size:9px; text-align:left;`;
        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-rune-border-left">ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ</div>
                <div class="brutalist-rune-border-right">ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺ</div>

                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CANDIDATE: ${this.state.name.toUpperCase()}</div>
                    <div class="brutalist-crest-medallion"><span>ᛝ</span></div>
                    <div class="brutalist-crest-right">BIRTHRIGHT: ${b.replace(/_/g, ' ')}</div>
                </div>

                <div style="font-size:10px; color:#fbbf24; margin-bottom:6px;">[ STEP 1 OF 4 : IDENTITY & FLESH RECORD ]</div>

                <div style="display:grid; grid-template-columns: 1.25fr 0.9fr 0.75fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:5px;">FORENSIC PROVENANCE LOG</div>
                        ${this.renderFiveStrandLogHtml()}
                        <div style="margin-top:7px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                            <div>
                                <label style="display:block; color:#d99b43; font-size:9px;">&gt; CALLSIGN:</label>
                                <input type="text" id="onboard-name" value="${this.state.name}" style="width:100%; background:#07090a; border:1px solid #575043; color:#e7e5e4; padding:4px; font-size:10.5px;">
                            </div>
                            <div>
                                <label style="display:block; color:#d99b43; font-size:9px;">&gt; FLESH RECORD:</label>
                                <input type="text" id="onboard-appearance" value="${this.state.appearance}" style="width:100%; background:#07090a; border:1px solid #575043; color:#e7e5e4; padding:4px; font-size:10.5px;">
                            </div>
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:7px;">BRUTALIST CALIBRATION</div>
                            <div style="font-size:8.5px; color:#8c8270;">RESONANCE GAIN // 14-DAY DRIFT</div>
                            <input type="range" min="1" max="100" value="64" style="width:100%; accent-color:#d9822b; margin-bottom:5px;">
                            <div style="font-size:8.5px; color:#8c8270;">SIGNAL DAMPING // WHITE VOID</div>
                            <input type="range" min="1" max="100" value="42" style="width:100%; accent-color:#d9822b; margin-bottom:6px;">
                        </div>
                        <div>
                            <div style="color:#d99b43; font-size:9px; margin-bottom:4px;">&gt; SELECT BIRTHRIGHT:</div>
                            <div id="birthright-options" style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                                <button type="button" onclick="window.selectBirthright('HOUSE_REMNANT')" style="${btnStyle('HOUSE_REMNANT')}">${b === 'HOUSE_REMNANT' ? '★' : '•'} HOUSE REMNANT</button>
                                <button type="button" onclick="window.selectBirthright('FUEL_BORN')" style="${btnStyle('FUEL_BORN')}">${b === 'FUEL_BORN' ? '★' : '•'} FUEL-BORN</button>
                                <button type="button" onclick="window.selectBirthright('CHAMPION_KIN')" style="${btnStyle('CHAMPION_KIN')}">${b === 'CHAMPION_KIN' ? '★' : '•'} CHAMPION-KIN</button>
                                <button type="button" onclick="window.selectBirthright('ECHO_OF_THE_SEAL')" style="${btnStyle('ECHO_OF_THE_SEAL')}">${b === 'ECHO_OF_THE_SEAL' ? '★' : '•'} ECHO OF SEAL</button>
                            </div>
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:9px; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
                        <div style="font-size:9px; color:#cbbba0;">UNMARKED VESSEL</div>
                        ${this.renderVitruvianRuneSvg()}
                        <div style="width:100%; background:linear-gradient(90deg,#5c3412,#8c4f19,#5c3412); border:1px solid #d99b43; color:#fde68a; text-align:center; padding:4px; font-family:'Cinzel',serif; font-size:10.5px; font-weight:800;">
                            STORY HEAT +40%
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <button type="button" class="riveted-commit-plate" onclick="window.onboardingFinish(1)">
                        <span class="plate-rune">ᛝ</span>
                        <span>[PROCEED TO STEP 2: VOCATION]</span>
                    </button>
                    <button type="button" onclick="window.onboardingSkipToRoles()" style="margin-top:12px; background:#151819; color:#a8997c; border:1px solid #4a4d4e; padding:9px 11px; cursor:pointer; font-family:'Cinzel',serif; font-size:9.5px;">[SEAL FLESH RECORD &amp; ENTER DARK FOREST]</button>
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



