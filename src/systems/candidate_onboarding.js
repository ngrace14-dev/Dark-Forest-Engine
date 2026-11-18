/**
 * File: src/systems/candidate_onboarding.js
 * Implements the 5-scene onboarding sequence: 
 * Identity, Vocation, Five-Strand Extractor, Voice Calibration, Turn 001 Handoff.
 */
import CommanderEngine from '../core/commander_engine.js';
import CommanderUI from './commander_ui.js';

export const CandidateOnboarding = {
    start: function(uiInstance) {
        window.CandidateUIInstance = uiInstance;
        console.log("[ONBOARDING] Initiating Scene 1: Identity & Birthright...");
        const container = document.getElementById(uiInstance.containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 1 OF 4 : IDENTITY & FLESH RECORD ]</h2>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:5px;">&gt; ENTER YOUR NAME / CALLSIGN:</label>
                    <input type="text" id="onboard-name" value="Corin of Ash-Ford" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box;">
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:5px;">&gt; DESCRIBE YOUR APPEARANCE:</label>
                    <textarea id="onboard-appearance" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box; height:80px;">Lean, mud-spattered wool cloak over patched leather; calloused hands, weathered face, and completely unmarked skin beneath the collar.</textarea>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:10px;">&gt; SELECT BIRTHRIGHT:</label>
                    <div id="birthright-options" style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="window.selectBirthright('HOUSE_REMNANT')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) HOUSE REMNANT</button>
                        <button onclick="window.selectBirthright('FUEL_BORN')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">(*) FUEL-BORN</button>
                        <button onclick="window.selectBirthright('BORDER_STRAY')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) BORDER-STRAY</button>
                        <button onclick="window.selectBirthright('ECHO_OF_THE_SEAL')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) ECHO OF THE SEAL</button>
                    </div>
                </div>

                <button onclick="window.onboardingFinish(1)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">PROCEED TO VOCATION</button>
            </div>
        `;
    }
};
    startScene2: function(uiInstance, state) {
        console.log("[ONBOARDING] Initiating Scene 2: Vocation & Mastery Matrix...");
        const container = document.getElementById(uiInstance.containerId);
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 2 OF 4 : VOCATION & MASTERY ]</h2>
                </div>
                
    startScene2: function(uiInstance) {
        console.log("[ONBOARDING] Initiating Scene 2: Vocation & Mastery Matrix...");
        const container = document.getElementById(uiInstance.containerId);
        if (!container) return;
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 2 OF 4 : VOCATION & MASTERY ]</h2>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:10px;">&gt; SELECT YOUR GROUND-STATE VOCATION:</label>
                    <div id="vocation-options" style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="window.selectVocation('ADVENTURER')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">(*) ADVENTURER / SURVEYOR</button>
                        <button onclick="window.selectVocation('SCRIBE')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) SCRIBE / ARCHIVIST</button>
                        <button onclick="window.selectVocation('SCAVENGER')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) CONTEXT SCAVENGER</button>
                        <button onclick="window.selectVocation('ARTISAN')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) ARTISAN / LABORER</button>
                    </div>
                </div>

                <div style="background:#111; border:1px solid #78350f; padding:15px; margin-bottom:20px;">
                    <h3 style="color:#fbbf24; margin-top:0;">RUNIC BODY ARCHITECTURE</h3>
                    <p style="font-size:12px;">6 Empty Body Rune Sites waiting for future flesh-carving.</p>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; font-size:11px;">
                        <div>[NECK: Empty]</div><div>[CHEST: Empty]</div>
                        <div>[L. ARM: Empty]</div><div>[R. ARM: Empty]</div>
                        <div>[L. LEG: Empty]</div><div>[R. LEG: Empty]</div>
                    </div>
                </div>

                <button onclick="window.onboardingFinish(2)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">PROCEED TO ORIGIN</button>
            </div>
        `;
    },

                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:10px;">&gt; SELECT YOUR GROUND-STATE VOCATION:</label>
                    <div id="vocation-options" style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="window.selectVocation('ADVENTURER')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">(*) ADVENTURER / SURVEYOR</button>
                        <button onclick="window.selectVocation('SCRIBE')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) SCRIBE / ARCHIVIST</button>
                        <button onclick="window.selectVocation('SCAVENGER')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) CONTEXT SCAVENGER</button>
                        <button onclick="window.selectVocation('ARTISAN')" style="background:#111; border:1px solid #78350f; color:#fff; padding:8px; cursor:pointer;">( ) ARTISAN / LABORER</button>
    startScene3: function(uiInstance) {
        console.log("[ONBOARDING] Initiating Scene 3: Origin & Extraction...");
        const container = document.getElementById(uiInstance.containerId);
        if (!container) return;
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 3 OF 4 : ORIGIN & FIVE-STRAND EXTRACTOR ]</h2>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:5px;">&gt; WHERE WERE YOU BEFORE THIS SHIFT, AND WHAT DEBT OR RUMOR FOLLOWS YOU?</label>
                    <textarea id="onboard-origin" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box; height:100px;"></textarea>
                </div>

                <button onclick="window.runExtractor()" style="width:100%; background:#111; border:1px solid #78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">RUN FIVE-STRAND EXTRACTOR</button>
                <div id="extraction-result" style="margin-top:15px; color:#fbbf24; font-size:12px;"></div>
                
                <button onclick="window.onboardingFinish(3)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold; margin-top:20px;">PROCEED TO CALIBRATION</button>
            </div>
        `;
    },

                    </div>
                </div>

                <div style="background:#111; border:1px solid #78350f; padding:15px; margin-bottom:20px;">
                    <h3 style="color:#fbbf24; margin-top:0;">RUNIC BODY ARCHITECTURE</h3>
                    <p style="font-size:12px;">6 Empty Body Rune Sites waiting for future flesh-carving.</p>
    startScene4: function(uiInstance) {
        console.log("[ONBOARDING] Initiating Scene 4: Voice Calibration...");
        const container = document.getElementById(uiInstance.containerId);
        if (!container) return;
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 4 OF 4 : VOICE & LEDGER CALIBRATION ]</h2>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:10px;">&gt; CHRONICLE VOICE:</label>
                    <select id="onboard-voice" style="width:100%; background:#000; color:#fff; padding:8px;">
                        <option value="dust_warden">Dust-Warden Elder</option>
                        <option value="terminus_archivist">Terminus Archivist</option>
                    </select>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h3 style="color:#fbbf24; font-size:14px;">OBSERVER'S LEDGER</h3>
                    <div style="border:1px solid #78350f; padding:10px; font-size:12px;">
                        Tracking: 14-Day Shift, Story Heat, Five-Strand Contradictions.
                    </div>
                </div>

                <button onclick="window.onboardingFinish(4)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">ENTER THE DARK FOREST</button>
            </div>
        `;
    },

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; font-size:11px;">
                        <div>[NECK: Empty]</div><div>[CHEST: Empty]</div>
                        <div>[L. ARM: Empty]</div><div>[R. ARM: Empty]</div>
                        <div>[L. LEG: Empty]</div><div>[R. LEG: Empty]</div>
                    </div>
                </div>
    startScene3: function(uiInstance, state) {
        console.log("[ONBOARDING] Initiating Scene 3: Origin & Extraction...");
        const container = document.getElementById(uiInstance.containerId);
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 3 OF 4 : ORIGIN & FIVE-STRAND EXTRACTOR ]</h2>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:5px;">&gt; WHERE WERE YOU BEFORE THIS SHIFT, AND WHAT DEBT OR RUMOR FOLLOWS YOU?</label>
                    <textarea id="onboard-origin" style="width:100%; background:#09090b; border:1px solid #78350f; color:#fff; padding:8px; box-sizing:border-box; height:100px;"></textarea>
                </div>

                <button onclick="window.runExtractor()" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">RUN FIVE-STRAND EXTRACTOR</button>
                <div id="extraction-result" style="margin-top:15px; color:#fbbf24; font-size:12px;"></div>
                
                <button onclick="window.onboardingFinish(3)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold; margin-top:20px;">PROCEED TO CALIBRATION</button>
            </div>
        `;
    },


                <button onclick="window.onboardingFinish(2)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">PROCEED TO ORIGIN</button>
            </div>
        `;
    },
    startScene4: function(uiInstance, state) {
        console.log("[ONBOARDING] Initiating Scene 4: Voice Calibration...");
        const container = document.getElementById(uiInstance.containerId);
        container.innerHTML = `
            <div style="padding:20px; color:#e7e5e4; font-family:monospace; max-width:600px; margin:0 auto;">
                <div style="border-bottom:1px solid #78350f; margin-bottom:20px; padding-bottom:10px;">
                    <h2 style="color:#fbbf24; margin:0;">[ STEP 4 OF 4 : VOICE & LEDGER CALIBRATION ]</h2>
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; color:#fbbf24; font-size:12px; margin-bottom:10px;">&gt; CHRONICLE VOICE:</label>
                    <select id="onboard-voice" style="width:100%; background:#000; color:#fff; padding:8px;">
                        <option value="dust_warden">Dust-Warden Elder</option>
                        <option value="terminus_archivist">Terminus Archivist</option>
                    </select>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h3 style="color:#fbbf24; font-size:14px;">OBSERVER'S LEDGER</h3>
                    <div style="border:1px solid #78350f; padding:10px; font-size:12px;">
                        Tracking: 14-Day Shift, Story Heat, Five-Strand Contradictions.
                    </div>
                </div>

                <button onclick="window.onboardingFinish(4)" style="width:100%; background:#78350f; color:#fbbf24; padding:10px; border:none; cursor:pointer; font-weight:bold;">ENTER THE DARK FOREST</button>
            </div>
        `;
    },



window.selectVocation = (id) => {
    console.log("[ONBOARDING] Selected Vocation:", id);
    document.querySelectorAll('#vocation-options button').forEach(btn => {
        btn.style.borderColor = '#78350f';
    });
    event.target.style.borderColor = '#fbbf24';
};

window.runExtractor = () => {
    const text = document.getElementById('onboard-origin').value;
    console.log("[ONBOARDING] Running Extractor on:", text);
    document.getElementById('extraction-result').innerText = "Parsing strands... [STEEL] Copper Token logged.";
};

window.onboardingFinish = (step) => {
    console.log("[ONBOARDING] Proceeding to step:", step + 1);
    const ui = window.CandidateUIInstance;
    if (step === 1) CandidateOnboarding.startScene2(ui);
    else if (step === 2) CandidateOnboarding.startScene3(ui);
    else if (step === 3) CandidateOnboarding.startScene4(ui);
    else if (step === 4) {
        console.log("[ONBOARDING] Finalizing and Handoff to Turn 001...");
        // 1. Finalize Candidate Profile
        // 2. Inject into Garrison Squad
        // 3. Trigger standard Role Selection Scroll (Turn 001 Handoff)
        window.openRoleGate();
    }
};

window.CandidateUIInstance = null;


