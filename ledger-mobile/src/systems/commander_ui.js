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

        const runeIcons = {
            NOBLE_HOUSE: 'ᛉ',
            TERMINUS: 'ᛦ',
            GUILD_LEADER: 'ᚷ',
            MERCHANT_PATRON: 'ᛒ',
            SYNDICATE: 'ᚱ',
            PALE_SOVEREIGN: 'ᛇ'
        };

        const roles = Object.values(CommanderEngine.ROLE_CATALOG || {});
        const cardsHtml = roles.map(r => {
            const isSovereign = r.roleId === 'PALE_SOVEREIGN';
            const rune = runeIcons[r.roleId] || 'ᛟ';
            const shortTitle = r.title.replace(/^\d+\.\s*/, '');
            return `
            <div class="vantage-role-card ${isSovereign ? 'sovereign-special' : ''}">
                <div>
                    <div class="vantage-rune-watermark">${rune}</div>
                    <div class="vantage-card-title">${r.title}</div>
                    <div class="vantage-card-sub">${r.subtitle}</div>
                    <div class="vantage-card-desc">${r.desc}</div>
                </div>
                <div style="margin-top:8px;">
                    <button class="vantage-init-btn" onclick="window.selectArchiveRole('${r.roleId}')">
                        Initialize ${r.roleId === 'NOBLE_HOUSE' ? 'Noble House Scion' : shortTitle}
                    </button>
                </div>
            </div>
        `}).join('');

        container.innerHTML = `
            <div class="scroll-column active-scroll" style="max-width:720px; margin:0 auto;">
                <div class="scroll-roller"></div>
                <div class="parchment-sheet">
                    <div class="rune-margin left">ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚ</div>
                    <div class="rune-margin right">ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺᚹᚷᚲᚱᚨ</div>
                    <div class="role-scroll-header">
                        <h2 class="role-scroll-title">THE ROYAL ARCHIVE & GENERAL LEDGER</h2>
                        <div class="role-scroll-subtitle">— SELECT YOUR VANTAGE ROLE —</div>
                    </div>
                    <div class="vantage-role-grid">${cardsHtml}</div>
                </div>
                <div class="scroll-roller"></div>
            </div>
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

        const nodesSvg = Array.from({ length: 20 }, (_, i) => {
            const angle = (i * 18 - 90) * (Math.PI / 180);
            const cx = (120 + 92 * Math.cos(angle)).toFixed(1);
            const cy = (120 + 92 * Math.sin(angle)).toFixed(1);
            const isActive = i % 2 === 0 || i < 7;
            return `<circle cx="${cx}" cy="${cy}" r="${isActive ? 3.6 : 2.5}" fill="${isActive ? '#22d3ee' : '#334155'}" stroke="#083344" stroke-width="1" />`;
        }).join('');

        container.innerHTML = `
            <div class="scroll-column active-scroll" style="max-width:760px; margin:0 auto;">
                <div class="scroll-roller"></div>
                <div class="parchment-sheet">
                    <div class="ledger-top-slate">
                        <div class="ledger-slate-header">
                            <div class="ledger-slate-title">DARK FOREST ENGINE // <span>THE GENERAL LEDGER</span></div>
                            <button class="cmd-btn" style="background:#3f1212; border-color:#991b1b; color:#fecaca; font-size:10px; padding:3px 8px;" onclick="window.openRoleGate()">🚪 Role Scroll</button>
                        </div>
                        <div id="status-bar" style="font-family:'Share Tech Mono',monospace; font-size: 11px; color: #f3ead8; line-height:1.45;">Initializing...</div>
                        <div id="commander-action-banner" style="display:none; background:#271f16; border-left:3px solid #22d3ee; color:#a5f3fc; padding:5px 9px; margin-top:6px; font-family:'Share Tech Mono',monospace; font-size:10.5px;"></div>
                        <div id="crisis-triage-panel" style="display:none; background:#2a0a0a; border:2px solid #ef4444; padding:10px; margin-top:8px;"></div>
                    </div>

                    <div class="iron-section-bar">SESSION & CLOCK</div>
                    <div class="ledger-btn-row">
                        <button id="btn-autotick-state" class="cmd-btn" onclick="window.toggleAutoTick()">CLOCK: TICKING</button>
                        <span id="timescale-bar" style="display:inline-flex; gap:4px; flex-wrap:wrap;">
                            <button class="cmd-btn" onclick="window.setTimeScale(1)">1x</button>
                            <button class="cmd-btn" onclick="window.setTimeScale(2)">2x</button>
                            <button class="cmd-btn" onclick="window.setTimeScale(4)">4x</button>
                            <button class="cmd-btn" onclick="window.setTimeScale(8)">8x</button>
                        </span>
                        <button class="cmd-btn" onclick="window.stepExpeditionHour(2)">+2H FIELD</button>
                        <button class="cmd-btn" onclick="window.advanceDays(1)">+1 DAY</button>
                        <button class="cmd-btn" title="Instant 1-day skip (No Crisis Intervention)" onclick="window.chronoSkip(1)">+1D SKIP</button>
                        <button class="cmd-btn" onclick="window.exportSave()">EXPORT SAVE</button>
                    </div>

                    <div class="iron-section-bar">NEXT DAY GOAL</div>
                    <div id="daily-goal-bar" class="ledger-btn-row"></div>

                    <div class="iron-section-bar">ROLE DIRECTIVES</div>
                    <div id="role-directives-bar" class="ledger-btn-row"></div>
                    <div class="ledger-lower-split">
                        <div>
                            <div class="parchment-note-box">
                                <div class="parchment-note-title">
                                    <span>COURIER DISPATCHES</span>
                                    <span style="font-size:9px; color:#574532;">LIVE LOG</span>
                                </div>
                                <div id="dispatches-list" style="max-height: 155px; overflow-y: auto;">Waiting...</div>
                            </div>

                            <div class="parchment-note-box">
                                <div class="parchment-note-title">
                                    <span>ACTIVE FIELD EXPEDITIONS</span>
                                    <span style="font-size:9px; color:#574532;">MIST TRAILS</span>
                                </div>
                                <div id="expeditions-list" style="max-height: 145px; overflow-y: auto;">No squads currently out in the mist.</div>
                            </div>

                            <div class="parchment-note-box">
                                <div class="parchment-note-title">
                                    <span>GARRISON ROSTER</span>
                                    <span style="font-size:9px; color:#574532;">⚔️ ⚙️ 🛡️</span>
                                </div>
                                <div id="roster-list" style="max-height: 230px; overflow-y: auto;">Loading agents...</div>
                            </div>
                        </div>

                        <div>
                            <div class="astrolabe-widget">
                                <div class="parchment-note-title" style="width:100%; justify-content:space-between;">
                                    <span>CRUCIBLE STORY ARCHIVE</span>
                                    <span>MOUNTAIN RING</span>
                                </div>
                                <svg class="astrolabe-svg" viewBox="0 0 240 240" onclick="window.viewTelemetry()" style="cursor:pointer;" title="Click Mountain Ring Astrolabe to inspect the 20 Chained Settlements Census">
                                    <defs>
                                        <radialGradient id="attractorGlow" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.55"/>
                                            <stop offset="65%" stop-color="#0d9488" stop-opacity="0.18"/>
                                            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
                                        </radialGradient>
                                    </defs>
                                    <circle cx="120" cy="120" r="108" fill="url(#attractorGlow)" stroke="#3b2f22" stroke-width="3"/>
                                    <circle cx="120" cy="120" r="99" fill="none" stroke="#5a4632" stroke-width="1.5" stroke-dasharray="4 3"/>
                                    <g class="astrolabe-ring-slow">
                                        <circle cx="120" cy="120" r="92" fill="none" stroke="#6b533b" stroke-width="6" opacity="0.65"/>
                                        ${nodesSvg}
                                    </g>
                                    <g class="astrolabe-ring-reverse">
                                        <circle cx="120" cy="120" r="72" fill="none" stroke="#856544" stroke-width="4"/>
                                        <circle cx="120" cy="120" r="64" fill="none" stroke="#22d3ee" stroke-width="1" stroke-dasharray="8 6" opacity="0.7"/>
                                        <line x1="120" y1="22" x2="120" y2="218" stroke="#22d3ee" stroke-width="0.7" opacity="0.45"/>
                                        <line x1="22" y1="120" x2="218" y2="120" stroke="#22d3ee" stroke-width="0.7" opacity="0.45"/>
                                    </g>
                                    <g class="astrolabe-core-pulse">
                                        <polygon points="120,72 162,142 78,142" fill="none" stroke="#22d3ee" stroke-width="1.6"/>
                                        <polygon points="120,168 162,98 78,98" fill="none" stroke="#22d3ee" stroke-width="1.6"/>
                                        <polygon points="120,84 156,120 120,156 84,120" fill="rgba(34,211,238,0.15)" stroke="#a5f3fc" stroke-width="1.4"/>
                                        <circle cx="120" cy="120" r="6" fill="#a5f3fc"/>
                                    </g>
                                </svg>
                                <div style="font-family:'Share Tech Mono',monospace; font-size:9.5px; color:#3b2d1f; text-align:center; margin-top:2px;">
                                    Tap Astrolabe for 20-Settlement Bedrock Census
                                </div>
                            </div>

                            <div class="parchment-note-box">
                                <div class="parchment-note-title">
                                    <span>CRUCIBLE RECORDS & READER</span>
                                </div>
                                <div id="story-archive" style="font-size:11px; color:#2b1f14;">Loading records...</div>
                                <div id="inquest-verdict-bar" style="display:none; gap:5px; margin-top:6px; flex-wrap:wrap;"></div>
                                <div id="story-reader" class="cmd-story-box" style="display:none; margin-top:8px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="scroll-roller"></div>
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
                expDiv.innerHTML = `<div style="color:#463523; font-size:11px;">No squads or caravans currently out in the mist. Dispatch a caravan or squad above to track their live field log.</div>`;
            } else {
                expDiv.innerHTML = exps.map(e => {
                    const pct = Math.min(10, Math.round((e.hoursElapsed / e.totalHours) * 10));
                    const bar = `[${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${e.hoursElapsed}h/${e.totalHours}h`;
                    return `
                        <div class="cmd-dispatch" style="border-color:#78350f;">
                            <div style="display:flex; justify-content:space-between; color:#5e110b; font-weight:bold;">
                                <span>🧭 ${e.type} → ${e.targetName} (${e.leadAgentName})</span>
                                <span>${e.status} ${bar}</span>
                            </div>
                            <div style="margin-top:4px; color:#2b1e12; font-size:10px;">
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
            tickBtn.innerText = this.autoTickEnabled ? `CLOCK: TICKING (${ts}x / ${effHrs}h)` : `CLOCK: PAUSED (${ts}x)`;
            tickBtn.style.borderColor = this.autoTickEnabled ? '#0e7490' : '#78350f';
        }

        const tsBar = document.getElementById('timescale-bar');
        if (tsBar) {
            tsBar.innerHTML = [1, 2, 4, 8].map(s => {
                const active = s === ts ? 'background:#451a03; color:#fde68a; border-color:#d97706;' : '';
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
                const activeStyle = t.id === curGoal ? 'background:#451a03; color:#fde68a; border-color:#d97706;' : '';
                return `<button class="cmd-btn" style="${activeStyle}" title="${t.desc} (${t.supplyGain})" onclick="window.setNextDayGoal('${t.id}')">${t.label} [${t.supplyGain}]</button>`;
            }).join('');

            if (ce.pendingDailyReconciliation && ce.lastDayReport) {
                const rep = ce.lastDayReport;
                goalBar.innerHTML = `
                    <div style="background:#1c1610; border:2px solid #d97706; padding:10px; margin-bottom:8px; width:100%; text-align:left;">
                        <div style="color:#fbbf24; font-weight:bold; font-size:12px; margin-bottom:4px;">⏸️ END OF DAY ${rep.day} RECONCILIATION — SIMULATION PAUSED</div>
                        <div style="font-size:11px; color:#e5dccb; margin-bottom:4px;"><b>Executed Target:</b> ${rep.executedGoal}</div>
                        <div style="font-size:11px; color:#4ade80; margin-bottom:2px;"><b>📈 Supplies & Training Gained (+):</b> ${rep.gains}</div>
                        <div style="font-size:11px; color:#f87171; margin-bottom:8px;"><b>📉 Supplies & Upkeep Expended (-):</b> ${rep.losses}</div>
                        <div style="color:#fde68a; font-size:11px; font-weight:bold; margin-bottom:4px;">SELECT TOMORROW'S TARGET TO RESUME SIMULATION:</div>
                        <div class="ledger-btn-row">${targetsHtml}</div>
                    </div>
                `;
            } else {
                goalBar.innerHTML = targetsHtml;
            }
        }

        // Render Role-Scoped Directives Only
        const dirBar = document.getElementById('role-directives-bar');
        if (dirBar && CommanderEngine.CrisisEngine) {
            const roleDirs = CommanderEngine.CrisisEngine.getDirectivesForRole(roleLabel);
            const dirsHtml = roleDirs.map(([fn, label]) => `<button class="cmd-btn" onclick="${fn}">${label}</button>`).join('');
            dirBar.innerHTML = dirsHtml;
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
                    <b style="color:#5e110b;">${x.type} — DAY ${x.day} | ${x.sender}</b>
                    <div style="color:#3f2e1e; font-weight:bold;">${x.title}</div>
                    <div style="color:#23180e;">"${x.body}"</div>
                </div>
            `).join('') || '<div style="color:#574532;">No dispatches yet.</div>';
        }

        const rosterDiv = document.getElementById('roster-list');
        if (rosterDiv) {
            const armoryStock = CommanderEngine.AgentRosterManager.squadArmoryStock || [];
            const catalog = CommanderEngine.SQUAD_ARMORY_CATALOG || {};
            const armoryHtml = `
                <div style="background:rgba(42,31,20,0.14); border:1px solid #5c4934; padding:6px; margin-bottom:6px; font-size:10.5px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px; flex-wrap:wrap;">
                        <b style="color:#3b2410;">🎒 ARMORY (${armoryStock.length} Items)</b>
                        <button class="cmd-btn" style="padding:3px 6px; font-size:9.5px;" onclick="window.giveGearToSquad()">⚙️ Auto-Sort Gear</button>
                    </div>
                    <div style="color:#463523; font-size:10px;">
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
                <div style="padding: 6px 0; border-bottom: 1px dashed #7c664d;">
                    <b style="color:#5e110b;">${a.name}</b> <span style="font-size:10px; color:#0e7490; font-weight:bold;">${a.cultivation?.isCultivatedGuardian ? '★ 300 GUARDIAN' : ''}</span>
                    <span style="color:#463523; font-weight:bold;">(${a.career?.rank || 'Novice'} ${a.career?.id})</span>
                    <div style="font-size:10px; color:#1f160e; font-family:'Share Tech Mono',monospace;">HP: ${a.vitals.hp}/${a.vitals.maxHp} | Poise: ${Math.round(a.vitals.poise)} | Att: ${Number(a.skills.meleeAtt).toFixed(1)} | Def: ${Number(a.skills.meleeDef).toFixed(1)}</div>
                    <div style="font-size:10px; color:#3f2e1e;">🗡️ Gear: [${gearSummary}] | Birthright: [${a.birthright?.title || 'None'}]</div>
                    <div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:3px;">
                        <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.viewAgentStatSheet('${a.id}')">📋 Sheet</button>
                        <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.equipAgentGear('${a.id}','${nextGearId}')">🗡️ Equip</button>
                        <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.AgentRosterManager.setTraining('${a.id}','logistics'); window.CommanderUI.showBanner('${a.name} assigned to Logistics drill.'); window.refreshUI();">Logistics</button>
                        <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.AgentRosterManager.setTraining('${a.id}','martial'); window.CommanderUI.showBanner('${a.name} assigned to Martial drill.'); window.refreshUI();">Martial</button>
                        <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.interrogateSuspect('${a.id}')">Inquest</button>
                    </div>
                </div>
            `}).join('') || '<div style="color:#991b1b;">All garrison agents deceased.</div>');
        }

        const necDiv = document.getElementById('story-archive');
        if (necDiv) {
            const bios = CommanderEngine.CrucibleNarrativeEngine.getAllBiographies() || [];
            if (bios.length === 0) {
                necDiv.innerHTML = `<div style="color:#463523; margin-bottom:6px;">No deaths recorded yet.</div><button class="cmd-btn" onclick="window.sampleDeath()">Create Sample Veteran Case File</button>`;
            } else {
                necDiv.innerHTML = bios.map(b => `
                    <div style="padding: 4px 0; border-bottom: 1px dashed #7c664d;">
                        <b style="color:#5e110b;">${b.name}</b> <span style="color:#463523;">(Age ${b.ageYears}, Day ${b.deathDay} AF — ${b.cause})</span>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.viewStory('${b.id}')">View Case File</button>
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

