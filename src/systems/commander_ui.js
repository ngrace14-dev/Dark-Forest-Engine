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
        this.stopAutoTick();
        this.renderRoleSelection();
    },

    startAutoTick() {
        this.stopAutoTick();
        this.autoTickEnabled = true;
        if (typeof window !== 'undefined' && !window.isHeadless) {
            const hourIntervalMs = CommanderEngine.getEffectiveHourDurationMs();
            this._autoTickTimer = setInterval(() => {
                if (!this.roleSelected || CommanderEngine.CrisisEngine.activeCrisis || CommanderEngine.CrisisEngine.pendingDailyReconciliation) return;
                CommanderEngine.tickInGameHour(1);
                if (CommanderEngine.CrisisEngine.activeCrisis || CommanderEngine.CrisisEngine.pendingDailyReconciliation) {
                    this.stopAutoTick();
                }
                this.render();
            }, hourIntervalMs);
        }
    },

    stopAutoTick() {
        this.autoTickEnabled = false;
        if (this._autoTickTimer) {
            clearInterval(this._autoTickTimer);
            this._autoTickTimer = null;
        }
    },

    toggleAutoTick() {
        if (this.autoTickEnabled) {
            this.stopAutoTick();
            this.showBanner("Simulation clock paused.");
        } else {
            this.startAutoTick();
            const hrs = Number((12 / CommanderEngine.timeScale).toFixed(2));
            this.showBanner(`Simulation clock active at ${CommanderEngine.timeScale}x (${hrs} real-world hrs / in-game day).`);
        }
        this.render();
    },

    changeTimeScale(scale) {
        const applied = CommanderEngine.setTimeScale(scale);
        if (this.autoTickEnabled) this.startAutoTick();
        const hrs = Number((12 / applied).toFixed(2));
        this.showBanner(`Time scale set to ${applied}x (1 In-Game Day = ${hrs} Real-World Hours).`);
        this.render();
    },

    selectRoleAndLaunch(roleKey, customHouseId = null) {
        this.roleSelected = true;
        const container = document.getElementById(this.containerId);
        if (container) container.dataset.initialized = 'false';
        CommanderEngine.CrisisEngine.sessionStartedAtMs = Date.now();
        CommanderEngine.CrisisEngine.volatilityIndex = 0;
        CommanderEngine.CrisisEngine.activeCrisis = null;
        CommanderEngine.CrisisEngine.pendingDailyReconciliation = false;
        CommanderEngine.FacilityEngine?.resetForNewRun?.();
        if (CommanderEngine.ExpeditionEngine) CommanderEngine.ExpeditionEngine.activeExpeditions = [];
        CommanderEngine.CampaignManager.selectRole(roleKey, customHouseId);
        this.startAutoTick();
        const h = CommanderEngine.CampaignManager.state.house;
        this.render();
        if (roleKey === 'NOBLE_HOUSE') {
            this.showBanner(`Rolled [${h.houseId}] (${h.settlementName}) — Ruler: ${h.rulerName} | Monopoly: ${h.monopoly} (${h.monopolyBonus})`);
        } else {
            this.showBanner(`Initialized Royal Archive Lens: [${roleKey}] — Simulation clock active.`);
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
        window.toggleAutoTick = () => this.toggleAutoTick();
        window.setTimeScale = (scale) => this.changeTimeScale(scale);
        window.setNextDayGoal = (goalId) => {
            const res = CommanderEngine.CrisisEngine.setNextDayGoal(goalId);
            if (res.success) {
                this.startAutoTick();
                this.showBanner(`Tomorrow's Objective Locked: ${res.goal.label} (${res.goal.supplyGain || res.goal.desc})`);
                this.render();
            }
        };
        window.resolveCrisis = (choiceId) => {
            const res = CommanderEngine.CrisisEngine.resolveActiveCrisis(choiceId);
            this.startAutoTick();
            this.showBanner(res.message || 'Crisis directive executed.');
            this.render();
        };
        window.viewAgentStatSheet = (agentId) => {
            const sheet = CommanderEngine.AgentRosterManager.formatAgentStatSheet(agentId);
            this.setReaderContent(sheet);
        };
        window.equipAgentGear = (agentId, itemId) => {
            const res = CommanderEngine.AgentRosterManager.assignGearToAgent(agentId, itemId);
            this.showBanner(res.message);
            this.render();
            this.setReaderContent(CommanderEngine.AgentRosterManager.formatAgentStatSheet(agentId));
        };
        window.giveGearToSquad = (itemId = null) => {
            const res = CommanderEngine.AgentRosterManager.giveGearToSquadAutoSort(itemId);
            this.showBanner(res.message);
            this.render();
            if (res.agent) this.setReaderContent(CommanderEngine.AgentRosterManager.formatAgentStatSheet(res.agent.id));
        };
        window.advanceDays = (n) => {
            CommanderEngine.advanceDays(n);
            if (CommanderEngine.CrisisEngine.activeCrisis || CommanderEngine.CrisisEngine.pendingDailyReconciliation) {
                this.stopAutoTick();
            }
            this.showBanner(`Day closed. Simulation paused — review Daily Supplies Report & select tomorrow's target.`);
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
        window.viewFacilities = () => this.renderFacilitiesReader();
        window.unlockFacility = (facId) => {
            const res = CommanderEngine.FacilityEngine.unlockFacility(facId);
            this.showBanner(res.message);
            this.render();
            this.renderFacilitiesReader();
        };
        window.sendExpedition = (type, dest = 'Oakhaven') => {
            const res = CommanderEngine.ExpeditionEngine.launchExpedition(type, dest);
            this.showBanner(res.message);
            this.render();
        };
        window.stepExpeditionHour = (hrs = 2) => {
            CommanderEngine.tickInGameHour(hrs);
            this.showBanner(`Advanced field clock by +${hrs}h.`);
            this.render();
        };
        window.chronoSkip = (days = 1) => {
            const res = CommanderEngine.chronoSkipDays(days);
            this.showBanner(res.message);
            this.setReaderContent(res.message);
            this.render();
        };
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

    renderFacilitiesReader() {
        const fe = CommanderEngine.FacilityEngine;
        if (!fe) return;
        let text = "================================================================================\n";
        text += "🏗️ BASE INFRASTRUCTURE, FACILITY UNLOCKS & VILLAGE GUARD GENERATION\n";
        text += "================================================================================\n";
        text += `Settlement Prosperity: ${fe.settlementProsperity}% (Threshold >= 55% to auto-generate guards)\n`;
        text += `Settlement Resources:  ${fe.settlementResources}u | Regenerated Village Guards: ${fe.villageGuardsCurrent}/${fe.villageGuardsMaxThreshold}\n`;
        text += `Royal Chrono-Seals:    ${fe.chronoSeals} (Used for instant full-day skip; ⚠️ skips crisis intervention!)\n\n`;

        Object.values(fe.facilities).forEach((f, idx) => {
            const st = f.unlocked ? `[UNLOCKED — Level ${f.level}]` : `[LOCKED — Build Cost: ${f.cost} Resources]`;
            text += `${idx + 1}. ${f.name} ${st}\n   ↳ ${f.unlocksDesc}\n\n`;
        });
        this.setReaderContent(text);

        const verdictBar = document.getElementById('inquest-verdict-bar');
        if (verdictBar) {
            verdictBar.style.display = 'flex';
            verdictBar.innerHTML = Object.values(fe.facilities)
                .filter(f => f.id !== 'scriptorium')
                .map(f => `<button class="cmd-btn" onclick="window.unlockFacility('${f.id}')">${f.unlocked ? `⬆️ Upgrade ${f.name.split(' ')[1]} (${f.cost}r)` : `🔨 Build ${f.name} (${f.cost}r)`}</button>`)
                .join('');
        }
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

        container.innerHTML = `
            <style>
                .cmd-card { background: rgba(15, 23, 42, 0.95); border: 1px solid #78350f; padding: 12px; margin-bottom: 12px; font-family: monospace; color: #cbd5e1; }
                .cmd-title { color: #fbbf24; margin: 0 0 8px 0; font-size: 16px; font-weight: bold; letter-spacing: 0.08em; }
                .cmd-subtitle { color: #fbbf24; margin: 0 0 8px 0; font-size: 13px; font-weight: bold; }
                .cmd-btn { background: #1e1b18; color: #fbbf24; border: 1px solid #78350f; font-family: monospace; font-size: 11px; font-weight: bold; padding: 6px 10px; cursor: pointer; margin: 2px; transition: all 0.15s; touch-action: manipulation; }
                .cmd-btn:hover { background: #451a03; border-color: #fbbf24; color: #fff; }
                .cmd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .cmd-dispatch { background: #040608; border: 1px solid #451a03; padding: 8px; margin-bottom: 6px; font-size: 11px; }
                .cmd-story-box { background: #0b0f17; border: 1px solid #d97706; padding: 10px; white-space: pre-wrap; overflow-x: auto; font-size: 11px; color: #fef3c7; max-height: 360px; overflow-y: auto; font-family: monospace; }
                @media (max-width: 900px) {
                    .cmd-grid-2 { grid-template-columns: 1fr; }
                    .cmd-btn { padding: 8px 11px; font-size: 12px; }
                    .cmd-title { font-size: 14px; }
                }
            </style>
            <div class="cmd-card">
                <div class="cmd-title">🌌 DARK FOREST ENGINE | THE GENERAL LEDGER (PROLOGUE & MACRO-COMMAND)</div>
                <div id="status-bar" style="font-size: 12px; color: #f59e0b; margin-bottom: 8px; font-weight: bold;">Initializing...</div>
                <div id="commander-action-banner" style="display:none; background:#1c1917; border-left:3px solid #f59e0b; color:#fde68a; padding:6px 10px; margin-bottom:8px; font-size:11px;"></div>
                <div id="crisis-triage-panel" style="display:none; background:#2a0a0a; border:2px solid #ef4444; padding:12px; margin-bottom:10px;"></div>
                <div style="margin-bottom: 6px;">
                    <b style="color:#d97706;">CLOCK (12h Real/Day @ 1x):</b>
                    <button id="btn-autotick-state" class="cmd-btn" style="border-color:#10b981; color:#6ee7b7;" onclick="window.toggleAutoTick()">⏯️ Clock: ACTIVE</button>
                    <span id="timescale-bar">
                        <button class="cmd-btn" onclick="window.setTimeScale(1)">1x (12h)</button>
                        <button class="cmd-btn" onclick="window.setTimeScale(2)">2x (6h)</button>
                        <button class="cmd-btn" onclick="window.setTimeScale(4)">4x (3h)</button>
                        <button class="cmd-btn" onclick="window.setTimeScale(8)">8x (1.5h)</button>
                    </span>
                    <button class="cmd-btn" onclick="window.stepExpeditionHour(2)">+2h Field Clock</button>
                    <button class="cmd-btn" onclick="window.advanceDays(1)">+1 Day (Close Day)</button>
                    <button class="cmd-btn" style="background:#3b0764; border-color:#a855f7; color:#e9d5ff;" title="Warning: Simulates full day instantly. You will NOT be allowed to intervene if a Crisis occurs!" onclick="window.chronoSkip(1)">⏭️ Chrono-Skip 1d (⚠️ No Crisis Intervention)</button>
                    <button class="cmd-btn" style="background:#78350f; color:#fff;" onclick="window.exportSave()">💾 Export Legacy Save (July 3D)</button>
                    <button class="cmd-btn" style="border-color:#7f1d1d; color:#fca5a5; float:right;" onclick="window.openRoleGate()">🚪 End Run (Role Menu)</button>
                </div>
                <div id="daily-goal-bar" style="margin-bottom: 6px;"></div>
                <div id="role-directives-bar"></div>
            </div>
            <div class="cmd-grid-2">
                <div>
                    <div class="cmd-card"><div class="cmd-subtitle">🧭 ACTIVE FIELD EXPEDITIONS & CARAVANS (LIVE LOG)</div><div id="expeditions-list" style="max-height: 200px; overflow-y: auto;">No squads currently out in the mist.</div></div>
                    <div class="cmd-card"><div class="cmd-subtitle">📬 COURIER DISPATCHES</div><div id="dispatches-list" style="max-height: 220px; overflow-y: auto;">Waiting...</div></div>
                    <div class="cmd-card"><div class="cmd-subtitle">👥 GARRISON ROSTER & ARMORY</div><div id="roster-list">Loading agents...</div></div>
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
        const vol = Math.round(CommanderEngine.CrisisEngine?.volatilityIndex || 0);
        const bars = Math.min(10, Math.floor(vol / 10));
        const gauge = `[${'|'.repeat(bars)}${'-'.repeat(10 - bars)}] ${vol}%`;
        const fe = CommanderEngine.FacilityEngine;
        const guardInfo = fe ? ` | Village Guards: ${fe.villageGuardsCurrent}/${fe.villageGuardsMaxThreshold} (Prosperity: ${fe.settlementProsperity}% | Res: ${fe.settlementResources}u)` : '';
        if (sb) sb.innerText = `${m}${guardInfo} | Volatility: ${gauge}`;

        // Render Fallout Shelter–Style Active Field Expeditions Log
        const expDiv = document.getElementById('expeditions-list');
        if (expDiv && CommanderEngine.ExpeditionEngine) {
            const exps = CommanderEngine.ExpeditionEngine.activeExpeditions || [];
            if (exps.length === 0) {
                expDiv.innerHTML = `<div style="color:#64748b; font-size:11px;">No squads or caravans currently out in the mist. Dispatch a caravan or squad above to track their live field log.</div>`;
            } else {
                expDiv.innerHTML = exps.map(e => {
                    const pct = Math.min(10, Math.round((e.hoursElapsed / e.totalHours) * 10));
                    const bar = `[${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${e.hoursElapsed}h/${e.totalHours}h`;
                    return `
                        <div class="cmd-dispatch" style="border-color:#d97706;">
                            <div style="display:flex; justify-content:space-between; color:#fbbf24; font-weight:bold;">
                                <span>🧭 ${e.type} → ${e.targetName} (${e.leadAgentName})</span>
                                <span>${e.status} ${bar}</span>
                            </div>
                            <div style="margin-top:4px; color:#cbd5e1; font-size:10px;">
                                ${e.logs.map(l => `<div>• ${l}</div>`).join('')}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        const tickBtn = document.getElementById('btn-autotick-state');
        const ts = CommanderEngine.timeScale || 1;
        const effHrs = Number((12 / ts).toFixed(2));
        if (tickBtn) {
            tickBtn.innerText = this.autoTickEnabled ? `⏸️ Clock: ${ts}x (${effHrs}h/d)` : `▶️ Clock: PAUSED (${ts}x)`;
            tickBtn.style.borderColor = this.autoTickEnabled ? '#10b981' : '#f59e0b';
        }

        const tsBar = document.getElementById('timescale-bar');
        if (tsBar) {
            tsBar.innerHTML = [1, 2, 4, 8].map(s => {
                const active = s === ts ? 'background:#78350f; color:#fff; border-color:#fbbf24;' : '';
                return `<button class="cmd-btn" style="${active}" onclick="window.setTimeScale(${s})">${s}x (${Number((12 / s).toFixed(1))}h)</button>`;
            }).join('');
        }

        // Render End-of-Day Supplies Gain/Loss Report & Role-Specific Next-Day Target Modal
        const goalBar = document.getElementById('daily-goal-bar');
        if (goalBar && CommanderEngine.CrisisEngine) {
            const ce = CommanderEngine.CrisisEngine;
            const roleTargets = ce.getTargetsForRole(roleLabel);
            const curGoal = ce.nextDayGoal;
            const targetsHtml = roleTargets.map(t => {
                const activeStyle = t.id === curGoal ? 'background:#78350f; color:#fff; border-color:#fbbf24;' : '';
                return `<button class="cmd-btn" style="${activeStyle}" title="${t.desc} (${t.supplyGain})" onclick="window.setNextDayGoal('${t.id}')">${t.label} [${t.supplyGain}]</button>`;
            }).join('');

            if (ce.pendingDailyReconciliation && ce.lastDayReport) {
                const rep = ce.lastDayReport;
                goalBar.innerHTML = `
                    <div style="background:#0f172a; border:2px solid #f59e0b; padding:10px; margin-bottom:8px;">
                        <div style="color:#fbbf24; font-weight:bold; font-size:13px; margin-bottom:4px;">⏸️ END OF DAY ${rep.day} RECONCILIATION — SIMULATION PAUSED</div>
                        <div style="font-size:11px; color:#cbd5e1; margin-bottom:4px;"><b>Executed Target:</b> ${rep.executedGoal}</div>
                        <div style="font-size:11px; color:#4ade80; margin-bottom:2px;"><b>📈 Supplies & Training Gained (+):</b> ${rep.gains}</div>
                        <div style="font-size:11px; color:#f87171; margin-bottom:8px;"><b>📉 Supplies & Upkeep Expended (-):</b> ${rep.losses}</div>
                        <div style="color:#fde68a; font-size:11px; font-weight:bold; margin-bottom:4px;">SELECT TOMORROW'S TARGET TO RESUME SIMULATION:</div>
                        <div>${targetsHtml}</div>
                    </div>
                `;
            } else {
                goalBar.innerHTML = `<b style="color:#d97706;">TOMORROW'S TARGET [${roleLabel}]:</b> ${targetsHtml}`;
            }
        }

        // Render Role-Scoped Directives Only
        const dirBar = document.getElementById('role-directives-bar');
        if (dirBar && CommanderEngine.CrisisEngine) {
            const roleDirs = CommanderEngine.CrisisEngine.getDirectivesForRole(roleLabel);
            const dirsHtml = roleDirs.map(([fn, label]) => `<button class="cmd-btn" onclick="${fn}">${label}</button>`).join('');
            dirBar.innerHTML = `<b style="color:#d97706;">ROLE DIRECTIVES [${roleLabel}]:</b> ${dirsHtml}`;
        }

        // Render Urgent Crisis Response Triage Overlay if active
        const crisisPanel = document.getElementById('crisis-triage-panel');
        if (crisisPanel) {
            const activeCrisis = CommanderEngine.CrisisEngine?.activeCrisis;
            if (activeCrisis) {
                crisisPanel.style.display = 'block';
                const choicesHtml = activeCrisis.choices.map(c => `
                    <button class="cmd-btn" style="display:block; width:100%; text-align:left; padding:8px; margin-top:6px; background:#450a0a; border-color:#ef4444; color:#fecaca;" onclick="window.resolveCrisis('${c.id}')">
                        ${c.label}
                    </button>
                `).join('');
                crisisPanel.innerHTML = `
                    <div style="color:#f87171; font-weight:bold; font-size:13px; margin-bottom:4px;">🚨 URGENT CRISIS RESPONSE EVENT: ${activeCrisis.title}</div>
                    <div style="color:#fca5a5; font-size:11px; margin-bottom:8px;">${activeCrisis.description}</div>
                    <div style="color:#fbbf24; font-size:11px; font-weight:bold;">SELECT SQUAD TRIAGE DIRECTIVE:</div>
                    ${choicesHtml}
                `;
            } else {
                crisisPanel.style.display = 'none';
            }
        }

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
            const armoryStock = CommanderEngine.AgentRosterManager.squadArmoryStock || [];
            const catalog = CommanderEngine.SQUAD_ARMORY_CATALOG || {};
            const armoryHtml = `
                <div style="background:#0b0f17; border:1px solid #78350f; padding:8px; margin-bottom:8px; font-size:11px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <b style="color:#fbbf24;">🎒 SQUAD ARMORY STOCKPILE (${armoryStock.length} Items)</b>
                        <button class="cmd-btn" style="background:#451a03; border-color:#f59e0b;" onclick="window.giveGearToSquad()">⚙️ Give Gear to Squad (Auto-Sort)</button>
                    </div>
                    <div style="color:#94a3b8; font-size:10px;">
                        ${armoryStock.map(id => `[${catalog[id]?.name || id}]`).join(' ') || 'All armory gear currently equipped on squad members.'}
                    </div>
                </div>
            `;

            const agents = Array.from(CommanderEngine.AgentRosterManager.agents.values()).filter(a => a.alive);
            const nextGearId = armoryStock[0] || 'ironwood_spear';
            rosterDiv.innerHTML = armoryHtml + (agents.map(a => {
                const eq = a.equipment || {};
                const gearSummary = [eq.weapon?.name, eq.armor?.name, eq.trinket?.name].filter(Boolean).join(', ') || 'Standard Issue';
                return `
                <div style="padding: 6px 0; border-bottom: 1px solid #1e293b;">
                    <b style="color:#fbbf24;">${a.name}</b> <span style="font-size:10px; color:#f59e0b;">${a.cultivation?.isCultivatedGuardian ? '★ 300 GUARDIAN' : ''}</span>
                    <span style="color:#d97706;">(${a.career?.rank || 'Novice'} ${a.career?.id})</span>
                    <div style="font-size:10px; color:#cbd5e1;">HP: ${a.vitals.hp}/${a.vitals.maxHp} | Poise: ${Math.round(a.vitals.poise)} | Att: ${Number(a.skills.meleeAtt).toFixed(1)} | Def: ${Number(a.skills.meleeDef).toFixed(1)} | Tough: ${Number(a.skills.toughness).toFixed(1)} | Stealth: ${Number(a.skills.stealth).toFixed(1)}</div>
                    <div style="font-size:10px; color:#fde68a;">🗡️ Gear: [${gearSummary}]</div>
                    <div style="font-size:10px; color:#94a3b8;">Birthright: [${a.birthright?.title || 'None'}] | Shift Birthday: Day ${a.firstShiftSurvivedDay} AF (${a.shiftsSurvived || 0} Shifts)</div>
                    <div style="margin-top:4px;">
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px; border-color:#f59e0b; color:#fde68a;" onclick="window.viewAgentStatSheet('${a.id}')">📋 Stat Sheet</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.equipAgentGear('${a.id}','${nextGearId}')">🗡️ Equip Gear</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.AgentRosterManager.setTraining('${a.id}','logistics'); window.CommanderUI.showBanner('${a.name} assigned to Logistics drill.'); window.refreshUI();">Train Logistics</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.AgentRosterManager.setTraining('${a.id}','martial'); window.CommanderUI.showBanner('${a.name} assigned to Martial drill.'); window.refreshUI();">Train Martial</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:10px;" onclick="window.interrogateSuspect('${a.id}')">Inquest</button>
                    </div>
                </div>
            `}).join('') || '<div style="color:#ef4444;">All garrison agents deceased.</div>');
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

