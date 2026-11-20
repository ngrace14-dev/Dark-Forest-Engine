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
        name: 'Lord-Auditor Vane (Royal Archive Commission)',
        appearance: 'Royal Crucible Audit Mandate — Authorized to assume direct executive command of the assigned institution.',
        birthright: 'FUEL_BORN',
        vocation: 'ADVENTURER',
        originModifierId: 'MOD_CROWN_SURPLUS',
        originText: 'MODIFIER [CROWN_SURPLUS]: +10u Barrier Fuel, +12 Settlement Resources, +10% Crown Favor.',
        extractedStrands: [
            '[STEEL] +10u Barrier Fuel & +12 Resources pre-allocated to faction magazine',
            '[INK] +10% Crown Favor & Royal Audit Mandate sealed in the General Ledger'
        ],
        voice: 'dust_warden',
        completed: false
    },

    ORIGIN_MODIFIER_CATALOG: {
        MOD_CROWN_SURPLUS: {
            id: 'MOD_CROWN_SURPLUS',
            title: '📦 Crown Supply Surplus Charter',
            desc: '+10u Barrier Fuel/Resin, +12 Settlement Resources, +10% Crown Favor',
            strands: ['[STEEL] +10u Barrier Fuel/Resin & +12 Settlement Resources pre-allocated', '[INK] +10% Crown Favor registered under Royal Audit Seal'],
            fuelDelta: 10, resDelta: 12, favorDelta: 10, guardsDelta: 0, dossierDelta: 0, entropyDelta: 0, weightDelta: 150
        },
        MOD_FORTIFIED_CHAINS: {
            id: 'MOD_FORTIFIED_CHAINS',
            title: '⛓️ Fortified Anchor-Chains & Garrison Levy',
            desc: '+4 Village Guards, +1 Grimsby Runic Hauberk in Armory, +10% Prosperity',
            strands: ['[STONE] 50-Ton Bedrock Anchor Chains reinforced (+10% Prosperity)', '[STEEL] +4 Regenerated Village Guards & +1 Grimsby Plate Hauberk mustered'],
            fuelDelta: 4, resDelta: 6, favorDelta: 5, guardsDelta: 4, extraGear: 'grimsby_plate', prosperityDelta: 10, weightDelta: 200
        },
        MOD_SHADOW_DOSSIERS: {
            id: 'MOD_SHADOW_DOSSIERS',
            title: '🕵️ Shadow Blackmail & Cipher Cache',
            desc: '+2 Blackmail Dossiers, +1 Discovered Truth Vault Fact, +1.5 Squad Stealth',
            strands: ['[INK] +2 Blackmail Dossiers & +1 Discovered Fact Dossier pre-loaded into Truth Vault', '[MIND] +1.5 Squad Stealth & Covert Audit clearance unlocked'],
            fuelDelta: 4, resDelta: 8, favorDelta: 0, dossierDelta: 2, stealthBonus: 1.5, discoverExtraFact: true, weightDelta: 220
        },
        MOD_HIGH_ENTROPY_CRUCIBLE: {
            id: 'MOD_HIGH_ENTROPY_CRUCIBLE',
            title: '⚡ High-Entropy Frontier Crucible (Hardcore)',
            desc: '+20 Settlement Resources & +15u Dream Siphon, but +15% Volatility & +10% Entropy',
            strands: ['[VERSE] +15u Dream Siphon & +20 Resources allocated for frontier hazard', '[MIND] ⚠️ +15% Starting Volatility & +10% Blind-Spot Entropy'],
            fuelDelta: 6, resDelta: 20, dreamDelta: 15, volatilityDelta: 15, entropyDelta: 10, weightDelta: 300
        }
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
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">ROYAL AUDITOR &amp; FACTION LEADER COMMISSION</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">DOCTRINE: ${b.replace(/_/g, ' ')}</div>
                </div>

                <div style="font-size:10px; color:#fbbf24; margin-bottom:6px;">[ STEP 1 OF 4 : ROYAL AUDITOR MANDATE &amp; EXECUTIVE DOCTRINE ]</div>

                <div style="display:grid; grid-template-columns: 1.25fr 0.9fr 0.75fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:5px;">ARCHIVAL TELEMETRY &amp; LEADER IDENTITY</div>
                        ${this.renderFiveStrandLogHtml()}
                        <div style="margin-top:7px; padding:6px; background:#07090a; border:1px solid #575043; font-size:9.5px; color:#d8c8a8;">
                            <b style="color:#fbbf24;">EXECUTIVE AUTHORITY:</b> You play as the <b>Royal Auditor &amp; Lore-Specific Faction Leader</b> of the group you select on the Duty Roster (e.g. <i>High Marshal Vane</i> of House Terminus, <i>Director Jess Nedaf</i> of the Obsidian Citadel, <i>King Alaric's Royal Factor</i>, <i>Sluice-Boss Harl</i>, or <i>Korvan the Pale Sovereign</i>).
                            <input type="hidden" id="onboard-name" value="${this.state.name}">
                            <input type="hidden" id="onboard-appearance" value="${this.state.appearance}">
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:7px;">SYSTEMIC PRESSURE CALIBRATION</div>
                            <div style="font-size:8.5px; color:#8c8270;">RESONANCE GAIN // 14-DAY DRIFT</div>
                            <input type="range" min="1" max="100" value="64" style="width:100%; accent-color:#d9822b; margin-bottom:5px;">
                            <div style="font-size:8.5px; color:#8c8270;">SIGNAL DAMPING // WHITE VOID</div>
                            <input type="range" min="1" max="100" value="42" style="width:100%; accent-color:#d9822b; margin-bottom:6px;">
                        </div>
                        <div>
                            <div style="color:#d99b43; font-size:9px; margin-bottom:4px;">&gt; SELECT LEADER BIRTHRIGHT MODIFIER:</div>
                            <div id="birthright-options" style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                                <button type="button" onclick="window.selectBirthright('HOUSE_REMNANT')" style="${btnStyle('HOUSE_REMNANT')}">${b === 'HOUSE_REMNANT' ? '★' : '•'} HOUSE REMNANT (+20 Sig)</button>
                                <button type="button" onclick="window.selectBirthright('FUEL_BORN')" style="${btnStyle('FUEL_BORN')}">${b === 'FUEL_BORN' ? '★' : '•'} FUEL-BORN (Cold Immune)</button>
                                <button type="button" onclick="window.selectBirthright('CHAMPION_KIN')" style="${btnStyle('CHAMPION_KIN')}">${b === 'CHAMPION_KIN' ? '★' : '•'} CHAMPION-KIN (+15% Att)</button>
                                <button type="button" onclick="window.selectBirthright('ECHO_OF_THE_SEAL')" style="${btnStyle('ECHO_OF_THE_SEAL')}">${b === 'ECHO_OF_THE_SEAL' ? '★' : '•'} ECHO OF SEAL (+25% Scout)</button>
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
        const b = this.state.birthright;
        const vBtn = (id) => `background:#171a1b; border:1px solid ${v === id ? '#fbbf24' : '#4a453b'}; color:#e2d1b0; padding:6px; cursor:pointer; font-size:9.5px; text-align:left;`;
        console.log('[ONBOARDING] Initiating Scene 2: Vocation & Mastery Matrix...');

        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CANDIDATE: ${this.state.name.toUpperCase()}</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">BIRTHRIGHT: ${b.replace(/_/g, ' ')}</div>
                </div>

                <div style="font-size:10px; color:#fbbf24; margin-bottom:6px;">[ STEP 2 OF 4 : VOCATION & RUNIC ARCHITECTURE ]</div>

                <div style="display:grid; grid-template-columns: 1.2fr 1fr 0.75fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:6px;">GROUND-STATE VOCATION</div>
                        <div id="vocation-options" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                            <button type="button" onclick="window.selectVocation('ADVENTURER')" style="${vBtn('ADVENTURER')}">${v === 'ADVENTURER' ? '★' : '•'} ADVENTURER / SURVEYOR</button>
                            <button type="button" onclick="window.selectVocation('SCRIBE')" style="${vBtn('SCRIBE')}">${v === 'SCRIBE' ? '★' : '•'} SCRIBE / ARCHIVIST</button>
                            <button type="button" onclick="window.selectVocation('SCAVENGER')" style="${vBtn('SCAVENGER')}">${v === 'SCAVENGER' ? '★' : '•'} CONTEXT SCAVENGER</button>
                            <button type="button" onclick="window.selectVocation('WARDEN')" style="${vBtn('WARDEN')}">${v === 'WARDEN' ? '★' : '•'} CHAIN-WARDEN / ARTISAN</button>
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:6px;">RUNIC BODY ARCHITECTURE</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:10px; color:#d6cbb5;">
                            <div style="border:1px dashed #4a453b; padding:5px;">[NECK: Uncarved]</div>
                            <div style="border:1px dashed #4a453b; padding:5px;">[CHEST: Uncarved]</div>
                            <div style="border:1px dashed #4a453b; padding:5px;">[SPINE: Uncarved]</div>
                            <div style="border:1px dashed #4a453b; padding:5px;">[L. ARM: Uncarved]</div>
                            <div style="border:1px dashed #4a453b; padding:5px;">[R. ARM: Uncarved]</div>
                            <div style="border:1px dashed #4a453b; padding:5px;">[LEGS: Uncarved]</div>
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:9px; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
                        <div style="font-size:9px; color:#cbbba0;">VESSEL NODES</div>
                        ${this.renderVitruvianRuneSvg()}
                        <div style="width:100%; background:linear-gradient(90deg,#5c3412,#8c4f19,#5c3412); border:1px solid #d99b43; color:#fde68a; text-align:center; padding:4px; font-family:'Cinzel',serif; font-size:10.5px; font-weight:800;">
                            STORY HEAT +40%
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <button type="button" onclick="window.onboardingBack(1)" style="margin-top:12px; background:#151819; color:#a8997c; border:1px solid #4a4d4e; padding:9px 14px; cursor:pointer; font-family:'Cinzel',serif; font-size:10px;">&larr; BACK</button>
                    <button type="button" class="riveted-commit-plate" onclick="window.onboardingFinish(2)">
                        <span class="plate-rune">ᛝ</span>
                        <span>[PROCEED TO STEP 3: PROVENANCE EXTRACTOR]</span>
                    </button>
                </div>
            </div>
        `;
    },

    startScene3(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        const b = this.state.birthright;
        console.log('[ONBOARDING] Initiating Scene 3: Origin & Extraction...');

        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CANDIDATE: ${this.state.name.toUpperCase()}</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">BIRTHRIGHT: ${b.replace(/_/g, ' ')}</div>
                </div>

                <div style="font-size:10px; color:#fbbf24; margin-bottom:6px;">[ STEP 3 OF 4 : ORIGIN & FIVE-STRAND EXTRACTOR ]</div>

                <div style="display:grid; grid-template-columns: 1.25fr 1fr 0.75fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:5px;">FORENSIC PROVENANCE LOG</div>
                        ${this.renderFiveStrandLogHtml()}
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#d99b43; font-size:9.5px; margin-bottom:4px; font-weight:bold;">&gt; SELECT JURISDICTIONAL CAMPAIGN MODIFIER:</div>
                            <div style="display:grid; grid-template-columns:1fr; gap:5px;">
                                ${Object.values(this.ORIGIN_MODIFIER_CATALOG).map(mod => {
                                    const active = (this.state.originModifierId || 'MOD_CROWN_SURPLUS') === mod.id;
                                    return `
                                        <button type="button" onclick="window.selectOriginModifier('${mod.id}')" style="background:${active ? '#2b2114' : '#121617'}; border:1.5px solid ${active ? '#fbbf24' : '#4a453b'}; color:#e2d1b0; padding:6px 8px; cursor:pointer; text-align:left; font-size:9.5px;">
                                            <div style="font-weight:bold; color:${active ? '#fde68a' : '#cbbba0'};">${active ? '★' : '•'} ${mod.title}</div>
                                            <div style="font-size:8.5px; color:#a8997c; margin-top:2px;">${mod.desc}</div>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                            <input type="hidden" id="onboard-origin" value="${this.state.originText}">
                            <button type="button" onclick="window.runExtractor()" style="width:100%; margin-top:6px; background:#2b2318; color:#fde68a; padding:6px; border:1px solid #d99b43; cursor:pointer; font-family:'Cinzel',serif; font-size:10px; font-weight:bold;">APPLY &amp; VERIFY MODIFIER TELEMETRY</button>
                        </div>
                        <div id="extraction-result" style="margin-top:6px; padding:6px; background:#07090a; border:1px dashed #787163; color:#fbbf24; font-size:10px;">
                            ${this.state.extractedStrands.join('<br>')}
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:9px; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
                        <div style="font-size:9px; color:#cbbba0;">STRAND RESONANCE</div>
                        ${this.renderVitruvianRuneSvg()}
                        <div style="width:100%; background:linear-gradient(90deg,#5c3412,#8c4f19,#5c3412); border:1px solid #d99b43; color:#fde68a; text-align:center; padding:4px; font-family:'Cinzel',serif; font-size:10.5px; font-weight:800;">
                            STORY HEAT +40%
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <button type="button" onclick="window.onboardingBack(2)" style="margin-top:12px; background:#151819; color:#a8997c; border:1px solid #4a4d4e; padding:9px 14px; cursor:pointer; font-family:'Cinzel',serif; font-size:10px;">&larr; BACK</button>
                    <button type="button" class="riveted-commit-plate" onclick="window.onboardingFinish(3)">
                        <span class="plate-rune">ᛝ</span>
                        <span>[PROCEED TO STEP 4: CALIBRATION]</span>
                    </button>
                </div>
            </div>
        `;
    },

    startScene4(uiInstance = CommanderUI) {
        const ui = uiInstance || rootScope.CandidateUIInstance || CommanderUI;
        const container = typeof document !== 'undefined' ? document.getElementById(ui.containerId || 'commander-terminal-root') : null;
        if (!container) return;
        const b = this.state.birthright;
        console.log('[ONBOARDING] Initiating Scene 4: Voice Calibration...');

        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CANDIDATE: ${this.state.name.toUpperCase()}</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">BIRTHRIGHT: ${b.replace(/_/g, ' ')}</div>
                </div>

                <div style="font-size:10px; color:#fbbf24; margin-bottom:6px;">[ STEP 4 OF 4 : VOICE & LEDGER CALIBRATION ]</div>

                <div style="display:grid; grid-template-columns: 1.25fr 0.9fr 0.75fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px;">
                        <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:5px;">FORENSIC PROVENANCE LOG</div>
                        ${this.renderFiveStrandLogHtml()}
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.75); padding:9px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#cbbba0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; border-bottom:1px solid #383e40; padding-bottom:4px; margin-bottom:7px;">BRUTALIST CALIBRATION</div>
                            <label style="display:block; color:#d99b43; font-size:9px; margin-bottom:4px;">&gt; CHRONICLE VOICE:</label>
                            <select id="onboard-voice" style="width:100%; background:#07090a; border:1px solid #575043; color:#fff; padding:6px; font-size:10.5px; margin-bottom:8px;">
                                <option value="dust_warden" ${this.state.voice === 'dust_warden' ? 'selected' : ''}>Dust-Warden Elder</option>
                                <option value="terminus_archivist" ${this.state.voice === 'terminus_archivist' ? 'selected' : ''}>Terminus Archivist</option>
                            </select>
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#a8997c; border-top:1px solid #2b3032; padding-top:6px;">
                                <span>TOGGLE COLGER</span>
                                <span style="background:#2b3032; border:1px solid #787163; border-radius:10px; padding:1px 8px; color:#fbbf24;">ON ●</span>
                            </div>
                        </div>
                        <div style="border:1px solid #4a453b; background:#07090a; padding:7px; font-size:10px;">
                            <div style="color:#fbbf24; font-weight:bold;">CANDIDATE DOSSIER: ${this.state.name}</div>
                            <div>Birthright: ${this.state.birthright} | Vocation: ${this.state.vocation}</div>
                            <div style="color:#8c8270; font-size:9px; margin-top:3px;">14-Day Shift &amp; Five-Strand Contradictions Locked.</div>
                        </div>
                    </div>

                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:9px; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
                        <div style="font-size:9px; color:#cbbba0;">CALIBRATED VESSEL</div>
                        ${this.renderVitruvianRuneSvg()}
                        <div style="width:100%; background:linear-gradient(90deg,#5c3412,#8c4f19,#5c3412); border:1px solid #d99b43; color:#fde68a; text-align:center; padding:4px; font-family:'Cinzel',serif; font-size:10.5px; font-weight:800;">
                            STORY HEAT +40%
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <button type="button" onclick="window.onboardingBack(3)" style="margin-top:12px; background:#151819; color:#a8997c; border:1px solid #4a4d4e; padding:9px 14px; cursor:pointer; font-family:'Cinzel',serif; font-size:10px;">&larr; BACK</button>
                    <button type="button" class="riveted-commit-plate" onclick="window.onboardingFinish(4)">
                        <span class="plate-rune">ᛝ</span>
                        <span>[SEAL FLESH RECORD &amp; ENTER DARK FOREST]</span>
                    </button>
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
            // Preserve the lore-specific leader name seeded by the chosen faction role (e.g. High Marshal Vane, Director Jess Nedaf, Baron Kaelen Oakheart)
            agt.isFactionLeader = true;
            agt.royalAuditorTitle = 'Royal Auditor & Faction Leader';
            agt.birthright = CommanderEngine.BIRTHRIGHTS?.[bKey] || agt.birthright;
            agt.appearance = prof.appearance;
            agt.originStrands = prof.extractedStrands;
            if (prof.vocation === 'SCRIBE') agt.skills.lore += 3;
            else if (prof.vocation === 'SCAVENGER') { agt.skills.stealth += 2; agt.skills.dodge += 2; }
            else if (prof.vocation === 'WARDEN') { agt.skills.meleeDef += 2; agt.skills.toughness += 2; }
            else { agt.skills.meleeAtt += 2; agt.skills.survival += 2; }
        }

        // Apply selected Jurisdictional Campaign Modifier directly to starting faction state
        const mod = this.ORIGIN_MODIFIER_CATALOG[prof.originModifierId || 'MOD_CROWN_SURPLUS'] || this.ORIGIN_MODIFIER_CATALOG.MOD_CROWN_SURPLUS;
        const cm = CommanderEngine.CampaignManager;
        const fe = CommanderEngine.FacilityEngine;
        if (mod && cm && fe) {
            if (mod.resDelta) fe.settlementResources += mod.resDelta;
            if (mod.prosperityDelta) fe.settlementProsperity = Math.min(100, fe.settlementProsperity + mod.prosperityDelta);
            if (mod.guardsDelta) {
                fe.villageGuardsMaxThreshold += mod.guardsDelta;
                fe.villageGuardsCurrent = Math.min(fe.villageGuardsMaxThreshold, fe.villageGuardsCurrent + mod.guardsDelta);
            }
            if (mod.extraGear) arm.squadArmoryStock.push(mod.extraGear);
            if (mod.stealthBonus) {
                arm.agents.forEach(a => { if (a.alive) a.skills.stealth = Number((a.skills.stealth + mod.stealthBonus).toFixed(1)); });
            }
            if (mod.discoverExtraFact && CommanderEngine.RealityEditorVault) {
                CommanderEngine.RealityEditorVault.discoverFact({
                    title: 'Royal Auditor Pre-Clearance Cipher Dossier',
                    source: 'Royal Archive Commission Vault',
                    targetHouse: 'House Cull',
                    valueFuel: 14,
                    valueRes: 18
                });
            }
            if (cm.state?.house) {
                if (mod.fuelDelta) cm.state.house.barrierFuelUnits = Math.min(70, (cm.state.house.barrierFuelUnits || 28) + mod.fuelDelta);
                if (mod.favorDelta) cm.state.house.crownFavor = Math.min(100, (cm.state.house.crownFavor || 60) + mod.favorDelta);
                if (mod.dossierDelta) cm.state.house.blackmailDossiers = (cm.state.house.blackmailDossiers || 0) + mod.dossierDelta;
                if (mod.dreamDelta) cm.state.house.dreamSiphon = (cm.state.house.dreamSiphon || 30) + mod.dreamDelta;
            }
            if (cm.state?.syndicate && mod.fuelDelta) cm.state.syndicate.contrabandResin += mod.fuelDelta;
            if (cm.state?.order && mod.entropyDelta) cm.state.order.blindSpotEntropy = Math.min(100, (cm.state.order.blindSpotEntropy || 12) + mod.entropyDelta);
            if (cm.state?.sovereign && mod.weightDelta) cm.state.sovereign.significanceHarvested = (cm.state.sovereign.significanceHarvested || 0) + mod.weightDelta;
            if (mod.volatilityDelta && CommanderEngine.CrisisEngine) {
                CommanderEngine.CrisisEngine.volatilityIndex = Math.min(100, (CommanderEngine.CrisisEngine.volatilityIndex || 0) + mod.volatilityDelta);
            }
        }
    }
};

rootScope.selectOriginModifier = (modId) => {
    const mod = CandidateOnboarding.ORIGIN_MODIFIER_CATALOG[modId];
    if (!mod) return;
    CandidateOnboarding.state.originModifierId = mod.id;
    CandidateOnboarding.state.originText = `${mod.title}: ${mod.desc}`;
    CandidateOnboarding.state.extractedStrands = [...mod.strands];
    CandidateOnboarding.startScene3(rootScope.CandidateUIInstance || CommanderUI);
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



