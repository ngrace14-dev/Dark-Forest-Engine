/**
 * File: src/systems/commander_ui.js
 * Native DOM View Controller for the Commander Terminal (Prologue Soft-Launch & In-Game Overlay).
 *
 * Zero Three.js / WebGL dependencies. Connects directly to `src/core/commander_engine.js`
 * so the Soft-Launch Prologue boots instantaneously on the Title Card and remains
 * foldable into the 3D Sandbox as an unlockable Commander System.
 */

import CommanderEngine from '../core/commander_engine.js';

export const CommanderUI = {
    containerId: 'commander-terminal-root',
    modalId: 'text-commander-viewport',
    activeBannerMsg: null,
    roleSelected: false,

    init(customContainerId = null) {
        if (customContainerId) this.containerId = customContainerId;
        CommanderEngine.boot('HOUSE');
        this.bindGlobalShortcuts();
        this.render();
        return this;
    },

    open(showRoleGate = true) {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.remove('hidden');
        if (showRoleGate && !this.roleSelected) {
            this.renderRoleSelection();
        } else {
            this.render();
        }
    },

    openRoleSelection() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.remove('hidden');
        this.roleSelected = false;
        this.renderRoleSelection();
    },

    selectRoleAndLaunch(roleKey, customHouseId = null) {
        this.roleSelected = true;
        const container = document.getElementById(this.containerId);
        if (container) container.dataset.initialized = 'false';
        CommanderEngine.CampaignManager.selectRole(roleKey, customHouseId);
        const h = CommanderEngine.CampaignManager.state.house;
        this.render();
        if (roleKey === 'NOBLE_HOUSE') {
            this.showBanner(`Rolled [${h.houseId}] (${h.settlementName}) — Ruler: ${h.rulerName} | Monopoly: ${h.monopoly} (${h.monopolyBonus})`);
        } else {
            this.showBanner(`Initialized Royal Archive Lens: [${roleKey}]`);
        }
    },

    renderRoleSelection() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.dataset.initialized = 'role_gate';

        const roles = Object.values(CommanderEngine.ROLE_CATALOG || {});
        const cardsHtml = roles.map(r => `
            <div class="cmd-card" style="display:flex; flex-direction:column; justify-content:space-between; border-color:#92400e;">
                <div>
                    <div style="color:#fbbf24; font-size:14px; font-weight:bold; margin-bottom:4px;">${r.title}</div>
                    <div style="color:#f59e0b; font-size:11px; margin-bottom:6px;">${r.subtitle}</div>
                    <div style="color:#94a3b8; font-size:11px; line-height:1.4;">${r.desc}</div>
                </div>
                <div style="margin-top:10px;">
                    <button class="cmd-btn" style="width:100%; padding:8px; font-size:12px; background:#451a03; color:#fde68a; border-color:#f59e0b;" onclick="window.selectArchiveRole('${r.roleId}')">
                        📜 Initialize ${r.roleId === 'NOBLE_HOUSE' ? 'Random Noble House (1 of 18)' : r.title.replace(/^\d+\.\s*/, '')}
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <style>
                .cmd-card { background: rgba(15, 23, 42, 0.95); border: 1px solid #78350f; padding: 14px; margin-bottom: 12px; font-family: monospace; color: #cbd5e1; }
                .cmd-title { color: #fbbf24; margin: 0 0 6px 0; font-size: 18px; font-weight: bold; letter-spacing: 0.08em; }
                .cmd-btn { background: #1e1b18; color: #fbbf24; border: 1px solid #78350f; font-family: monospace; font-size: 11px; font-weight: bold; padding: 5px 9px; cursor: pointer; margin: 2px; transition: all 0.15s; }
                .cmd-btn:hover { background: #78350f; border-color: #fbbf24; color: #fff; }
                .cmd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                @media (max-width: 900px) { .cmd-grid-2 { grid-template-columns: 1fr; } }
            </style>
            <div class="cmd-card" style="border-color:#d97706;">
                <div class="cmd-title">🏛️ THE ROYAL ARCHIVE & GENERAL LEDGER — SELECT YOUR VANTAGE ROLE</div>
                <div style="color:#f59e0b; font-size:12px;">Choose your career lens to unseal the General Ledger. All Noble House runs must manage Crown Favor and weekly Barrier Fuel quotas alongside their unique economic monopoly.</div>
            </div>
            <div class="cmd-grid-2">${cardsHtml}</div>
        `;
    },

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.add('hidden');
    },

    toggle() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            this.open();
        } else {
            this.close();
        }
    },

    bindGlobalShortcuts() {
        if (this._shortcutsBound || typeof window === 'undefined') return;
        this._shortcutsBound = true;

        // Global window helpers for inline handlers & legacy compatibility
        window.CommanderUI = this;
        window.selectArchiveRole = (roleKey, houseId = null) => this.selectRoleAndLaunch(roleKey, houseId);
        window.openRoleGate = () => this.openRoleSelection();
        window.setCampaign = (m) => {
            CommanderEngine.CampaignManager.selectCampaign(m);
            this.showBanner(`Switched Campaign Mode to [${m}].`);
            this.render();
        };
        window.advanceDays = (n) => {
            CommanderEngine.advanceDays(n);
            this.showBanner(`Advanced timeline by +${n} day(s).`);
            this.render();
        };
        window.dispatchCmd = (a, arg = null) => {
            const res = CommanderEngine.CampaignManager.dispatchAction(a, arg);
            this.showBanner(res?.message || 'Directive executed.');
            this.render();
        };
        window.viewTelemetry = () => this.renderTelemetryReader();
        window.viewWarBoard = () => this.renderWarBoardReader();
        window.viewShadowLedger = () => this.renderShadowLedgerReader();
        window.interrogateSuspect = (targetId = 'agt_2') => this.renderInquestReader(targetId);
        window.renderVerdict = (targetId, vType) => {
            const res = CommanderEngine.InterrogationDesk.renderVerdict(targetId, vType);
            this.showBanner(res?.message || 'Verdict rendered.');
            this.render();
        };
        window.viewStory = (id) => this.renderStoryReader(id);
        window.sampleDeath = () => {
            CommanderEngine.CrucibleNarrativeEngine.processActorDeath({
                id: 'vet_cornelius',
                name: 'Master Cornelius Vane',
                cause: 'White Void exposure during 14-day Shift'
            });
            this.render();
            this.renderStoryReader('vet_cornelius');
        };
        window.exportSave = () => this.exportLegacySaveFile();
        window.refreshUI = () => this.render();
    },

    showBanner(msg) {
        this.activeBannerMsg = msg;
        const banner = document.getElementById('commander-action-banner');
        if (banner) {
            banner.style.display = 'block';
            banner.innerText = `⚡ ${msg}`;
        }
    },

    exportLegacySaveFile() {
        const legacy = CommanderEngine.CampaignManager.exportLegacySave();
        if (!legacy) return;
        const blob = new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'world_seed_legacy.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showBanner(`Legacy Save Exported! Candidate: ${legacy.candidate?.name || 'Wanderer'} (${legacy.settlements.length} Settlements, ${legacy.ancestors.length} Ancestors). Ready for July 3D Main Game Import.`);
    },

    renderTelemetryReader() {
        const revealed = CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false;
        const list = CommanderEngine.CampaignManager.getBedrockTelemetry({ allowTwentyFirst: revealed }) || [];
        let text = "================================================================================\n";
        text += `🏛️ THE ${list.length} BEDROCK CHAINED SETTLEMENTS (ROYAL CENSUS ROLL)\n`;
        text += "================================================================================\n\n";
        list.forEach((v, i) => {
            const tag = v.hiddenGapKeeper ? ' [⚠️ UNINDEXED 21st PARISH]' : '';
            text += `${String(i + 1).padStart(2, ' ')}. ${v.name.padEnd(22, ' ')} | House: ${v.house.padEnd(24, ' ')} | Fuel: ${String(v.barrierFuel).padStart(3, ' ')}u | Chains: ${v.chainsIntegrity}%${tag}\n`;
        });
        if (revealed) {
            text += "\n[⚠️ ARCHIVE ANOMALY: Scraped vellum layers have exposed an unindexed 21st settlement record!]\n";
        }
        this.setReaderContent(text);
    },

    renderShadowLedgerReader() {
        const text = CommanderEngine.ShadowInfluenceEngine?.formatGeneralLedgerAudit?.() || "General Ledger Audit unavailable.";
        this.setReaderContent(text);
    },

    renderWarBoardReader() {
        const board = CommanderEngine.CampaignManager.getWarBoard() || [];
        let text = "================================================================================\n";
        text += "🏰 THE 19 NOBLE HOUSES & FEUDAL WAR BOARD\n";
        text += "================================================================================\n\n";
        text += "👑 THE 9 BLESSED HOUSES (MAJOR MONOPOLIES):\n";
        board.filter(h => h.blessed).forEach((h, i) => {
            text += `  ${i + 1}. ${h.name.padEnd(16, ' ')} | Monopoly: ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | Power: ${h.power}\n`;
        });
        text += "\n⚔️ THE 10 CHALLENGER HOUSES:\n";
        board.filter(h => !h.blessed).forEach((h, i) => {
            text += `  ${i + 10}. ${h.name.padEnd(16, ' ')} | Output:   ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | Power: ${h.power}\n`;
        });
        this.setReaderContent(text);
    },

    renderInquestReader(targetId = 'agt_2') {
        const inq = CommanderEngine.InterrogationDesk.interrogate(targetId);
        this.setReaderContent(inq?.text || "No active inquest.", targetId);
    },

    renderStoryReader(id) {
        const d = CommanderEngine.CrucibleNarrativeEngine.formatDossier(id);
        const p = CommanderEngine.CrucibleNarrativeEngine.expandStory(id);
        this.setReaderContent(`${d}\n\n${p}`);
    },

    setReaderContent(text, inquestTargetId = null) {
        const reader = document.getElementById('story-reader');
        if (!reader) return;
        reader.style.display = 'block';
        reader.innerText = text;

        const verdictBar = document.getElementById('inquest-verdict-bar');
        if (verdictBar) {
            if (inquestTargetId) {
                verdictBar.style.display = 'flex';
                verdictBar.innerHTML = `
                    <span style="color:#f59e0b; font-size:11px; align-self:center; margin-right:6px;">VERDICT (${inquestTargetId}):</span>
                    <button class="cmd-btn" onclick="window.renderVerdict('${inquestTargetId}','exonerate')">Exonerate</button>
                    <button class="cmd-btn" onclick="window.renderVerdict('${inquestTargetId}','demote')">Demote</button>
                    <button class="cmd-btn" style="border-color:#dc2626; color:#fca5a5;" onclick="window.renderVerdict('${inquestTargetId}','execute')">Execute</button>
                    <button class="cmd-btn" onclick="window.renderVerdict('${inquestTargetId}','turn_agent')">Turn Double Agent</button>
                `;
            } else {
                verdictBar.style.display = 'none';
            }
        }
    },

    ensureLayout(container) {
        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';

        const campaigns = ['HOUSE', 'ORDER', 'SYNDICATE', 'DUNE', 'PATRON', 'SOVEREIGN']
            .map(m => `<button class="cmd-btn" onclick="window.setCampaign('${m}')">${m}</button>`).join('');

        const directives = [
            [`window.viewTelemetry()`, '🏛️ 20 Bedrock Settlements'],
            [`window.viewWarBoard()`, '🏰 19-House War Board'],
            [`window.viewShadowLedger()`, '🕵️ General Ledger Audit'],
            [`window.interrogateSuspect()`, '⚖️ Inquest / Interrogate'],
            [`window.dispatchCmd('PATROL')`, 'Patrol Mist'],
            [`window.dispatchCmd('REQUISITION_FUEL')`, 'Requisition Fuel'],
            [`window.dispatchCmd('CROWN_FILL_FULL')`, 'Crown: Fill Full'],
            [`window.dispatchCmd('CROWN_DENY')`, 'Crown: Deny'],
            [`window.dispatchCmd('DISPATCH_CARAVAN','Oakhaven')`, 'Dispatch Caravan'],
            [`window.dispatchCmd('PROXY_RAID')`, 'Proxy Raid'],
            [`window.dispatchCmd('AUDIT_ANOMALY')`, 'Audit Anomaly (12-B)'],
            [`window.dispatchCmd('SCRUB_MONUMENT')`, 'Scrub Monolith'],
            [`window.dispatchCmd('SMUGGLE_RESIN')`, 'Smuggle Resin'],
            [`window.dispatchCmd('EXTORT_HOUSE')`, 'Extort House'],
            [`window.dispatchCmd('TRANSMIT_DREAM')`, 'Whisper Dream'],
            [`window.dispatchCmd('SUMMON_HUNTSMAN')`, 'Summon Huntsman'],
            [`window.dispatchCmd('MACABRE_COMMUNION')`, 'Macabre Communion']
        ].map(([fn, label]) => `<button class="cmd-btn" onclick="${fn}">${label}</button>`).join('');

        container.innerHTML = `
            <style>
                .cmd-card { background: rgba(15, 23, 42, 0.95); border: 1px solid #78350f; padding: 12px; margin-bottom: 12px; font-family: monospace; color: #cbd5e1; }
                .cmd-title { color: #fbbf24; margin: 0 0 8px 0; font-size: 16px; font-weight: bold; letter-spacing: 0.08em; }
                .cmd-subtitle { color: #fbbf24; margin: 0 0 8px 0; font-size: 13px; font-weight: bold; }
                .cmd-btn { background: #1e1b18; color: #fbbf24; border: 1px solid #78350f; font-family: monospace; font-size: 11px; font-weight: bold; padding: 5px 9px; cursor: pointer; margin: 2px; transition: all 0.15s; }
                .cmd-btn:hover { background: #451a03; border-color: #fbbf24; color: #fff; }
                .cmd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .cmd-dispatch { background: #040608; border: 1px solid #451a03; padding: 8px; margin-bottom: 6px; font-size: 11px; }
                .cmd-story-box { background: #0b0f17; border: 1px solid #d97706; padding: 10px; white-space: pre-wrap; font-size: 11px; color: #fef3c7; max-height: 360px; overflow-y: auto; font-family: monospace; }
                @media (max-width: 900px) { .cmd-grid-2 { grid-template-columns: 1fr; } }
            </style>
            <div class="cmd-card">
                <div class="cmd-title">🌌 DARK FOREST ENGINE | THE GENERAL LEDGER (PROLOGUE & MACRO-COMMAND)</div>
                <div id="status-bar" style="font-size: 12px; color: #f59e0b; margin-bottom: 8px; font-weight: bold;">Initializing...</div>
                <div id="commander-action-banner" style="display:none; background:#1c1917; border-left:3px solid #f59e0b; color:#fde68a; padding:6px 10px; margin-bottom:8px; font-size:11px;"></div>
                <div style="margin-bottom: 6px;">
                    <b style="color:#d97706;">ARCHIVE ROLE:</b>
                    <button class="cmd-btn" style="border-color:#f59e0b; color:#fde68a;" onclick="window.openRoleGate()">🔄 Switch Role Menu</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('NOBLE_HOUSE')">🎲 Re-Roll Noble House (1 of 18)</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('TERMINUS')">🛡️ Terminus</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('GUILD')">⚔️ Guild</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('MERCHANT')">⚖️ Merchant</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('SYNDICATE')">🗡️ Syndicate</button>
                    <button class="cmd-btn" onclick="window.selectArchiveRole('SOVEREIGN')">👑 Sovereign</button>
                    <b style="margin-left: 12px; color:#d97706;">TIME:</b>
                    <button class="cmd-btn" onclick="window.advanceDays(1)">+1 Day</button>
                    <button class="cmd-btn" onclick="window.advanceDays(7)">+7 Days</button>
                    <button class="cmd-btn" style="background:#78350f; color:#fff;" onclick="window.exportSave()">💾 Export Legacy Save (July 3D)</button>
                </div>
                <div><b style="color:#d97706;">DIRECTIVES:</b> ${directives}</div>
            </div>
            <div class="cmd-grid-2">
                <div>
                    <div class="cmd-card"><div class="cmd-subtitle">📬 COURIER DISPATCHES</div><div id="dispatches-list" style="max-height: 260px; overflow-y: auto;">Waiting...</div></div>
                    <div class="cmd-card"><div class="cmd-subtitle">👥 GARRISON ROSTER</div><div id="roster-list">Loading agents...</div></div>
                </div>
                <div>
                    <div class="cmd-card">
                        <div class="cmd-subtitle">📜 CRUCIBLE STORY ARCHIVE & NECROLOGY</div>
                        <div id="story-archive">Loading records...</div>
                        <div id="inquest-verdict-bar" style="display:none; gap:6px; margin-top:8px; flex-wrap:wrap;"></div>
                        <div id="story-reader" class="cmd-story-box" style="display:none; margin-top:8px;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    render() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById(this.containerId);
        if (container) this.ensureLayout(container);

        const s = CommanderEngine.CampaignManager.getCampaignStatus();
        const d = s.day;
        const shiftDays = 14 - (d % 14);
        const st = s.state;
        const roleLabel = CommanderEngine.CampaignManager.activeRole || s.mode;
        let m = `Day: ${d} (Perceived: Year ${Math.floor(d / 365) + 12000} AF) | Shift in: ${shiftDays}d | Role: [${roleLabel}]`;
        if (s.mode === 'HOUSE') {
            m += ` | ${st.houseId || 'House Terminus'} (${st.settlementName || "World's End Gate"}) | Monopoly: [${st.monopoly || 'Horizon Defense'}] | Fuel: ${st.barrierFuelUnits}u | Chains: ${st.chainsIntegrity}% | Crown Favor: ${st.crownFavor}% | Scrutiny: ${st.crownScrutiny || 10}%`;
        }
        if (s.mode === 'ORDER') m += ` | Anomalies: ${st.containedAnomalies} | Blind-Spot Entropy: ${st.blindSpotEntropy}%`;
        if (s.mode === 'SYNDICATE') m += ` | Salt: ${st.mineralSaltStock}u | Contraband Resin: ${st.contrabandResin}u | Toll: ${st.gallowsTollCollected}d`;
        if (s.mode === 'DUNE') m += ` | Water: ${st.cleanedWaterStock}u | Drift: ${st.driftDistanceKm?.toFixed(1)}km | Tethers: ${st.mooringTetherIntegrity}%`;
        if (s.mode === 'PATRON') m += ` | Candidate Sig: ${st.candidateSignificance} | Dreams: ${st.symbolicDreamsSent} | Verified Truths: ${st.verifiedTruths}`;
        if (s.mode === 'SOVEREIGN') m += ` | Endured: ${st.yearsEndured}y | Heralds: ${st.heraldsMutated}/5 | ${st.title}`;

        const sb = document.getElementById('status-bar');
        if (sb) sb.innerText = m;

        const dispDiv = document.getElementById('dispatches-list');
        if (dispDiv) {
            const disps = CommanderEngine.LogDispatchManager.dispatches || [];
            dispDiv.innerHTML = disps.slice(0, 8).map(x => `
                <div class="cmd-dispatch">
                    <b style="color:#fbbf24;">${x.type} — Day ${x.day} | ${x.sender}</b>
                    <div style="color:#f59e0b;">${x.title}</div>
                    <div style="color:#cbd5e1;">"${x.body}"</div>
                </div>
            `).join('') || '<div style="color:#78350f;">No dispatches yet.</div>';
        }

        const rosterDiv = document.getElementById('roster-list');
        if (rosterDiv) {
            const agents = Array.from(CommanderEngine.AgentRosterManager.agents.values()).filter(a => a.alive);
            rosterDiv.innerHTML = agents.map(a => `
                <div style="padding: 6px 0; border-bottom: 1px solid #1e293b;">
                    <b style="color:#fbbf24;">${a.name}</b> <span style="font-size:10px; color:#f59e0b;">${a.cultivation?.isCultivatedGuardian ? '★ 300 GUARDIAN' : ''}</span>
                    <span style="color:#d97706;">(${a.career?.rank || 'Novice'} ${a.career?.id})</span>
                    <div style="font-size:10px; color:#94a3b8;">Birthright: [${a.birthright?.title || 'None'}] | Shift Birthday: Day ${a.firstShiftSurvivedDay} AF (${a.shiftsSurvived || 0} Shifts) | Stance: [${a.operatingStance?.mode || 'IDLE'}${a.operatingStance?.discipline ? ':' + a.operatingStance.discipline : ''}]</div>
                    <div style="margin-top:4px;">
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.AgentRosterManager.setTraining('${a.id}','logistics'); window.CommanderUI.showBanner('${a.name} assigned to Logistics drill.'); window.refreshUI();">Train Logistics</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.AgentRosterManager.setTraining('${a.id}','martial'); window.CommanderUI.showBanner('${a.name} assigned to Martial drill.'); window.refreshUI();">Train Martial</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.dispatchCmd('CULTIVATE_RUNIC','${a.id}')">Cultivate Runic</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.interrogateSuspect('${a.id}')">Inquest</button>
                    </div>
                </div>
            `).join('') || '<div style="color:#ef4444;">All garrison agents deceased. Switch campaign to re-seed.</div>';
        }

        const necDiv = document.getElementById('story-archive');
        if (necDiv) {
            const bios = CommanderEngine.CrucibleNarrativeEngine.getAllBiographies() || [];
            if (bios.length === 0) {
                necDiv.innerHTML = `<div style="color:#94a3b8; margin-bottom:6px;">No deaths recorded yet.</div><button class="cmd-btn" onclick="window.sampleDeath()">Create Sample Veteran Case File</button>`;
            } else {
                necDiv.innerHTML = bios.map(b => `
                    <div style="padding: 4px 0; border-bottom: 1px solid #1e293b;">
                        <b style="color:#fbbf24;">${b.name}</b> <span style="color:#94a3b8;">(Age ${b.ageYears}, Day ${b.deathDay} AF — ${b.cause})</span>
                        <button class="cmd-btn" onclick="window.viewStory('${b.id}')">View Case File & Story</button>
                    </div>
                `).join('') + `<div style="margin-top:6px;"><button class="cmd-btn" onclick="window.sampleDeath()">+ Add Sample Veteran Case File</button></div>`;
            }
        }
    }
};

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => CommanderUI.init());
    } else {
        CommanderUI.init();
    }
}

export default CommanderUI;

