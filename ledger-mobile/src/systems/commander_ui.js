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
        if (typeof window !== 'undefined' && window.CandidateOnboarding?.state?.completed) {
            window.CandidateOnboarding.injectCandidateIntoRoster();
        }
        this.startAutoTick();
        const h = CommanderEngine.CampaignManager.state.house;
        this.render();
        if (roleKey === 'NOBLE_HOUSE') {
            this.showBanner(`Rolled [${h.houseId}] (${h.settlementName}) — Ruler: ${h.rulerName} | Monopoly: ${h.monopoly} (${h.monopolyBonus})`);
        } else {
            this.showBanner(`Initialized Royal Archive Lens: [${roleKey}] — Simulation clock active.`);
        }
    },

    pendingRoleId: 'NOBLE_HOUSE',

    renderSemicircleGaugeSvg(label = 'BARRIER FUEL', angleDeg = 35, alertColor = '#c97a36') {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        const nx = (50 + 28 * Math.cos(rad)).toFixed(1);
        const ny = (46 + 28 * Math.sin(rad)).toFixed(1);
        return `
            <div style="text-align:center;">
                <div style="font-size:8px; font-weight:bold; color:#2b1e12; margin-bottom:1px;">${label}</div>
                <svg viewBox="0 0 100 54" style="width:82px; height:42px; display:block; margin:0 auto;">
                    <path d="M 12 46 A 38 38 0 0 1 88 46" fill="none" stroke="#3f3224" stroke-width="6"/>
                    <path d="M 12 46 A 38 38 0 0 1 42 10" fill="none" stroke="${alertColor}" stroke-width="5"/>
                    <line x1="50" y1="46" x2="${nx}" y2="${ny}" stroke="#14110e" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="50" cy="46" r="4" fill="#14110e"/>
                </svg>
            </div>
        `;
    },

    renderRoleSelection() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.dataset.initialized = 'role_gate';
        const sel = this.pendingRoleId || 'NOBLE_HOUSE';
        const h = CommanderEngine.CampaignManager.state.house || {};
        const o = CommanderEngine.CampaignManager.state.order || {};
        const syn = CommanderEngine.CampaignManager.state.syndicate || {};

        const cardData = [
            ['MERCHANT_PATRON', 'THE CROWN', 'ᛒ', `<div><b>ADMINISTRATIVE</b><br>Fuel Monopoly &amp; Arbitrage.<br><b style="color:#14532d;">[STATUS: ACTIVE]</b></div>`, this.renderSemicircleGaugeSvg('FUEL MONOPOLY', 45, '#57753b')],
            ['NOBLE_HOUSE', 'NOBLE HOUSE', 'ᛉ', `<div><b>MILITARY:</b> 288<br><b>STATS:</b> 18/5-30<br><b>RESERVES:</b> ${h.barrierFuelUnits || 28}u<br><b style="color:#991b1b;">TITHE: ${h.crownDemand || 16}u</b></div>`, this.renderSemicircleGaugeSvg('BARRIER FUEL', -30, '#c97a36')],
            ['TERMINUS', 'HOUSE TERMINUS', 'ᛦ', `<div style="grid-column:1 / span 2;"><b>ANOMALOUS CONTAINMENT</b><br><span style="font-size:8px;">STABILITY // 300 GUARDIANS</span><div style="display:grid; grid-template-columns:repeat(12,1fr); gap:1px; height:9px; margin-top:3px;">${Array.from({ length: 12 }).map((_, i) => `<div style="background:${i < 9 ? '#576838' : '#9c8d74'}; border:1px solid #2b1e12;"></div>`).join('')}</div></div>`, ''],
            ['GUILD_LEADER', 'OBSIDIAN CITADEL', 'ᚷ', `<div><b>CONFIDENTIAL:</b> <span class="redaction-bar" style="width:42px;"></span><br><span class="redaction-bar" style="width:68px;"></span><br><b>ENTROPY:</b> ${o.blindSpotEntropy || 12}%</div>`, this.renderSemicircleGaugeSvg('CONTAINMENT', 25, '#8c5828')],
            ['SYNDICATE', 'SCARCITY SYNDICATE', 'ᚱ', `<div><b>TRADE:</b> 28% / 7%<br><b>RESIN:</b> ${syn.contrabandResin || 45}u<br><b>TOLL:</b> ${syn.gallowsTollCollected || 80}d</div>`, this.renderSemicircleGaugeSvg('TOLL / RESIN', 15, '#c97a36')]
        ];

        const cardsHtml = cardData.map(([roleId, title, rune, leftCol, rightCol]) => `
            <div class="burden-parchment-card" style="cursor:pointer;" onclick="window.selectArchiveRole('${roleId}')">
                <div>
                    <div class="burden-card-header"><span>${title}</span><span>${rune}</span></div>
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:5px; font-size:8.5px;">${leftCol}${rightCol}</div>
                </div>
                <button class="vantage-init-btn" style="margin-top:6px; padding:4px; font-size:8.5px;">INITIALIZE ${title}</button>
            </div>
        `).join('') + `
            <div class="burden-parchment-card" style="background:linear-gradient(160deg,#c8c2b6 0%,#9a9180 100%); border:2px solid #7f1d1d; cursor:pointer; overflow:hidden;" onclick="window.selectArchiveRole('PALE_SOVEREIGN')">
                <div>
                    <div class="burden-card-header" style="color:#450a0a; border-color:#7f1d1d;"><span>THE PALE SOVEREIGN</span><span>ᛇ</span></div>
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:5px; font-size:8.5px; color:#1c1610;">
                        <div>
                            <b>SLOW-BURN PREDATOR</b><br>
                            Brood in frost, consume Historical Weight &amp; mutate 5 Heralds.<br>
                            <b style="color:#7f1d1d;">[1,000-YEAR CYCLE]</b>
                        </div>
                        ${this.renderSemicircleGaugeSvg('HISTORICAL WEIGHT', -45, '#7f1d1d')}
                    </div>
                </div>
                <button class="vantage-init-btn" style="margin-top:6px; padding:4px; font-size:8.5px; background:linear-gradient(180deg,#450a0a,#1f0505); color:#fecaca; border-color:#991b1b;">INITIALIZE THE PALE SOVEREIGN</button>
            </div>
        `;

        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-rune-border-left">ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ</div>
                <div class="brutalist-rune-border-right">ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺ</div>

                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CIVILIZATIONAL DUTY ROSTER</div>
                    <div class="brutalist-crest-medallion"><span>ᛝ</span></div>
                    <div class="brutalist-crest-right">// LAYER 2 — SELECT YOUR VANTAGE ROLE</div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">${cardsHtml}</div>

                <button type="button" class="riveted-commit-plate" onclick="window.selectArchiveRole('${sel}')">
                    <span class="plate-rune">ᛝ</span>
                    <span>[CONFIRM ASSIGNMENT &amp; COMMENCE DUTY]</span>
                </button>
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
        window.triggerDreamIntervention = (crisisId = null, cost = 10) => {
            const res = CommanderEngine.triggerDreamIntervention(crisisId, cost);
            this.showBanner(res.message);
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
        window.viewTruthVault = () => this.renderTruthVaultReader();
        window.resolveFactVerb = (factId, verb) => {
            const res = CommanderEngine.RealityEditorVault.resolveFact(factId, verb);
            this.showBanner(res.message);
            this.render();
            this.renderTruthVaultReader();
        };
        window.resolveEmissaryPetition = (decision) => {
            const res = CommanderEngine.RealityEditorVault.resolveEmissaryPetition(decision);
            this.showBanner(res.message);
            this.render();
        };
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
        this.renderWarBoardReader();
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

        const visualDeck = document.getElementById('brutalist-subpage-deck');
        if (visualDeck) {
            const rowsHtml = board.slice(0, 6).map((h, idx) => `
                <div style="background:${idx === 0 ? 'linear-gradient(90deg,#8c4f19,#5c3412)' : 'linear-gradient(160deg,#d7ccb8,#b8a88e)'}; color:${idx === 0 ? '#fde68a' : '#1c1610'}; border:1.5px solid #4a3e2e; padding:4px 7px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center; font-size:9.5px; font-weight:bold;">
                    <span style="font-family:'Cinzel',serif;">${h.name.toUpperCase()}</span>
                    <span style="font-size:8.5px;">ᛉ POWER: ${h.power}% [POSTURE: ${h.status}]</span>
                </div>
            `).join('');

            const auditItems = board.filter(h => h.lastMutationReason).slice(0, 3);
            const auditHtml = (auditItems.length > 0 ? auditItems : [
                { name: 'SECTOR 4', status: 'RECON', lastMutationReason: 'PROXY RAID AMBUSH' },
                { name: 'CITADEL ARTERY', status: 'CRITICAL', lastMutationReason: 'FUEL CRATE DELAYED' },
                { name: 'BORDERLANDS', status: 'ACTIVE', lastMutationReason: 'TRADE EMBARGO REJECTED' }
            ]).map(a => `
                <div style="border-bottom:1px dashed #6b5a45; padding:2px 0; font-size:8px;">
                    <b>• ${a.lastMutationReason.toUpperCase()}</b> ⚠️ [${a.name.toUpperCase()} | ${a.status}]
                </div>
            `).join('');

            visualDeck.style.display = 'block';
            visualDeck.innerHTML = `
                <div class="brutalist-top-crest" style="margin-top:6px;">
                    <div class="brutalist-crest-title">THE WAR BOARD &amp; TELEMETRY READER</div>
                    <div class="brutalist-crest-medallion"><span>ᛝ</span></div>
                    <div class="brutalist-crest-right">// PAGE 5: SPATIAL PROBABILITY</div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1.15fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.8); padding:8px;">
                        <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; margin-bottom:6px;">[19-HOUSE TABLE]</div>
                        ${rowsHtml}
                    </div>
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.8); padding:8px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold;">TELEMETRY GRID // 20 CHAINED SETTLEMENTS</div>
                        <svg viewBox="0 0 260 120" style="width:100%; height:112px; display:block; margin:2px auto;">
                            <ellipse cx="130" cy="60" rx="102" ry="38" fill="none" stroke="#4a453b" stroke-width="1" stroke-dasharray="3,2"/>
                            <line x1="130" y1="60" x2="48" y2="28" stroke="#8c7a5b" stroke-width="1.5" stroke-dasharray="2,2"/>
                            <line x1="130" y1="60" x2="210" y2="30" stroke="#8c7a5b" stroke-width="1.5" stroke-dasharray="2,2"/>
                            <line x1="130" y1="60" x2="54" y2="94" stroke="#8c7a5b" stroke-width="1.5" stroke-dasharray="2,2"/>
                            <line x1="130" y1="60" x2="206" y2="92" stroke="#8c7a5b" stroke-width="1.5" stroke-dasharray="2,2"/>
                            <rect x="116" y="45" width="28" height="30" fill="#141819" stroke="#d99b43" stroke-width="1.5"/>
                            <text x="130" y="65" text-anchor="middle" fill="#fbbf24" font-size="14">ᛝ</text>
                            <circle cx="48" cy="28" r="5" fill="#991b1b"/><text x="48" y="18" text-anchor="middle" fill="#f87171" font-size="6.5">NEAR COLLAPSE</text>
                            <circle cx="210" cy="30" r="5" fill="#576838"/><text x="210" y="20" text-anchor="middle" fill="#a3e635" font-size="6.5">PROSPEROUS</text>
                            <circle cx="54" cy="94" r="5" fill="#b45309"/><text x="54" y="108" text-anchor="middle" fill="#fbbf24" font-size="6.5">NODE_07 // SKIPPED</text>
                            <circle cx="206" cy="92" r="5" fill="#991b1b"/><text x="206" y="106" text-anchor="middle" fill="#f87171" font-size="6.5">ALERT</text>
                        </svg>
                        <div class="burden-parchment-card" style="padding:5px 7px;">
                            <div style="font-family:'Cinzel',serif; font-weight:900; font-size:9.5px; border-bottom:1px solid #4a3e2e; margin-bottom:2px;">[CAUSAL AUDIT TRAIL]</div>
                            ${auditHtml}
                        </div>
                    </div>
                </div>
                <button type="button" class="riveted-commit-plate" onclick="document.getElementById('brutalist-subpage-deck').style.display='none';">
                    <span class="plate-rune">ᛝ</span>
                    <span>[CALCULATE PROBABILITY &amp; COMMENCE COMMAND]</span>
                </button>
            `;
        }
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

    renderTruthVaultReader() {
        const vault = CommanderEngine.RealityEditorVault;
        const facts = vault?.facts || [];
        const history = vault?.resolvedHistory || [];
        let text = "================================================================================\n";
        text += "📜 THE CROW'S EYE: REALITY EDITOR VAULT (BUILDER MANIFESTO §2 & §3)\n";
        text += "================================================================================\n";
        text += "Doctrine: Information is property. Knowledge is currency. Truth is leverage.\n";
        text += "Select an Editor Action below to PUBLISH, LEAK, SELL, ARCHIVE, SUPPRESS, or DESTROY.\n\n";

        if (facts.length === 0) {
            text += "  [VAULT EMPTY] Dispatch field expeditions, audit anomalies, or turn double agents\n  in the Inquest Chamber to acquire new Fact & Relic Dossiers.\n";
        } else {
            facts.forEach((f, idx) => {
                text += `  [${idx + 1}] FACT DOSSIER: ${f.title} (ID: ${f.id})\n`;
                text += `      • Provenance (Source): ${f.source}\n`;
                text += `      • Current Holder:      ${f.owner} | Implicated House: ${f.targetHouse}\n`;
                text += `      • Credibility Score:   ${f.credibility}% | Acquisition Cost: ${f.costPaid}\n`;
                text += `      • Market Value:        +${f.valueFuel}u Fuel/Resin, +${f.valueRes} Resources\n`;
                text += `      • Systemic Risk:       ${f.riskDesc}\n\n`;
            });
        }

        if (history.length > 0) {
            text += "--------------------------------------------------------------------------------\n";
            text += "RECENT REALITY EDITS:\n";
            history.slice(0, 4).forEach(h => {
                text += `  • [Day ${h.resolvedDay} — ${h.verb}] ${h.title}: ${h.effectSummary}\n`;
            });
        }

        this.setReaderContent(text, null, facts[0]?.id || null);

        const visualDeck = document.getElementById('brutalist-subpage-deck');
        if (visualDeck) {
            const targetId = facts[0]?.id || '';
            const dossierCards = (facts.length > 0 ? facts : [
                { id: 'f1', title: 'RELIC: FRAGMENT 09', credibility: 94 },
                { id: 'f2', title: 'TRUTH: THE SILENT REIGN', credibility: 82 },
                { id: 'f3', title: 'RELIC: OBSIDIAN KEY', credibility: 41 }
            ]).slice(0, 4).map(f => `
                <div style="border-bottom:1.5px solid #4a3e2e; padding:4px 0; margin-bottom:4px;">
                    <div style="display:flex; justify-content:space-between; font-family:'Cinzel',serif; font-weight:900; font-size:9.5px;">
                        <span>[${f.title.toUpperCase()}]</span><span>ᛉ</span>
                    </div>
                    <div style="margin:2px 0;"><span class="redaction-bar" style="width:70%;"></span> <span class="redaction-bar" style="width:20%;"></span></div>
                    <div style="font-size:8px; font-weight:bold;">CREDIBILITY: <span style="background:#5c3d1e; color:#fde68a; padding:1px 4px;">${f.credibility}% ${f.credibility >= 75 ? 'CERTAINTY' : 'DUBIOUS'}</span></div>
                </div>
            `).join('');

            const verbs = [['PUBLISH','ᛉ'],['LEAK','ᛇ'],['SELL','ᛒ'],['ARCHIVE','🏛️'],['SUPPRESS','🤫'],['DESTROY','ᛦ']];
            const verbsHtml = verbs.map(([v, ic]) => `
                <button class="execution-verb-btn ${v === 'DESTROY' ? 'destroy-verb' : ''}" onclick="window.resolveFactVerb('${targetId}','${v}')">
                    <span class="verb-icon">${ic}</span><span class="verb-label">${v}</span>
                </button>
            `).join('');

            visualDeck.style.display = 'block';
            visualDeck.innerHTML = `
                <div class="brutalist-top-crest" style="margin-top:6px;">
                    <div class="brutalist-crest-title">THE TRUTH &amp; RELIC VAULT</div>
                    <div class="brutalist-crest-medallion"><span>ᛝ</span></div>
                    <div class="brutalist-crest-right">// PAGE 4: DEEP ARCHIVE REALITY EDITOR</div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1.15fr 0.95fr; gap:10px;">
                    <div class="burden-parchment-card">
                        <div>
                            <div class="burden-card-header"><span>FACT DOSSIER LIST</span><span>ᛦ</span></div>
                            ${dossierCards}
                        </div>
                    </div>
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:8px; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; text-align:left;">RELIC TELEMETRY</div>
                        <svg viewBox="0 0 180 150" style="width:142px; height:118px; margin:0 auto;">
                            <circle cx="90" cy="75" r="50" fill="#171b1c" stroke="#94a3b8" stroke-width="2" stroke-dasharray="18,3,30,4"/>
                            <circle cx="90" cy="75" r="32" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="6,3"/>
                            <path d="M55,42 L92,75 L132,55 M92,75 L74,124 M65,82 L125,95" stroke="#e2e8f0" stroke-width="1.5" fill="none"/>
                            <text x="90" y="42" text-anchor="middle" fill="#cbd5e1" font-size="11">ᚠ ᚢ ᚦ ᚨ ᚱ</text>
                            <text x="90" y="114" text-anchor="middle" fill="#cbd5e1" font-size="11">ᚲ ᚷ ᚹ ᚺ ᚾ</text>
                        </svg>
                        <div style="display:flex; justify-content:space-between; font-size:8px; color:#8c8270;">
                            <span>STATUS: NOMINAL</span><span>6,000Y SEAL</span>
                        </div>
                    </div>
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:8px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; margin-bottom:5px;">EXECUTION DIRECTIVES</div>
                            ${verbsHtml}
                        </div>
                        <div class="burden-parchment-card" style="padding:5px 7px; margin-top:4px;">
                            <div style="font-family:'Cinzel',serif; font-weight:900; font-size:9px; border-bottom:1px solid #4a3e2e; margin-bottom:2px;">CONSEQUENCE PREVIEW</div>
                            <div style="background:#8c4f19; color:#fde68a; font-size:8px; padding:2px 4px; margin-bottom:2px; font-weight:bold;">▲ +12% BLIND-SPOT ENTROPY</div>
                            <div style="background:#5c3412; color:#fed7aa; font-size:8px; padding:2px 4px; font-weight:bold;">▼ -10% CROWN FAVOR</div>
                        </div>
                    </div>
                </div>
                <button type="button" class="riveted-commit-plate" onclick="window.resolveFactVerb('${targetId}','ARCHIVE')">
                    <span class="plate-rune">ᛝ</span>
                    <span>[EXECUTE DIRECTIVE &amp; COMMIT TO HISTORY]</span>
                </button>
            `;
        }
    },

    setReaderContent(text, inquestTargetId = null, factTargetId = null) {
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
            } else if (factTargetId) {
                verdictBar.style.display = 'flex';
                verdictBar.innerHTML = `
                    <span style="color:#fbbf24; font-size:10.5px; align-self:center; margin-right:4px;">EDITOR ACTION (${factTargetId}):</span>
                    <button class="cmd-btn" title="+12% Entropy, +18 Sig, -8 Target House Power" onclick="window.resolveFactVerb('${factTargetId}','PUBLISH')">📢 Publish</button>
                    <button class="cmd-btn" title="-10 Target House Power -> SKIRMISH, +1 Dossier" onclick="window.resolveFactVerb('${factTargetId}','LEAK')">🗡️ Leak</button>
                    <button class="cmd-btn" title="Trade for Barrier Fuel & Settlement Resources" onclick="window.resolveFactVerb('${factTargetId}','SELL')">💰 Sell</button>
                    <button class="cmd-btn" title="+0.5 Squad Lore, +6% Prosperity" onclick="window.resolveFactVerb('${factTargetId}','ARCHIVE')">🏛️ Archive</button>
                    <button class="cmd-btn" title="+12% Crown Favor, -8% Scrutiny" onclick="window.resolveFactVerb('${factTargetId}','SUPPRESS')">🤫 Suppress</button>
                    <button class="cmd-btn" title="-10% Entropy, -10% Volatility" onclick="window.resolveFactVerb('${factTargetId}','DESTROY')">🔥 Destroy</button>
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
            <div class="brutalist-runic-frame">
                <div class="brutalist-rune-border-left">ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ</div>
                <div class="brutalist-rune-border-right">ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺ</div>

                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">THE GENERAL LEDGER HUB</div>
                    <div class="brutalist-crest-medallion"><span>ᛝ</span></div>
                    <div class="brutalist-crest-right">
                        <span id="hub-shift-header">DAY 1 // SHIFT COUNTDOWN</span>
                        <svg viewBox="0 0 80 22" style="width:70px; height:18px;">
                            <polyline points="0,12 18,12 24,4 30,19 36,2 42,18 48,8 54,14 60,12 80,12" fill="none" stroke="#d9822b" stroke-width="1.5"/>
                        </svg>
                        <span>VOLATILITY ▲</span>
                        <button class="cmd-btn" style="background:#3f1212; border-color:#991b1b; color:#fecaca; font-size:9px; padding:2px 6px;" onclick="window.openRoleGate()">🚪 Role Roster</button>
                    </div>
                </div>

                <!-- 5-PAGE QUICK NAVIGATION BAR (GATED BY GROWTH TIER) -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid #2b3234;">
                    <div id="hub-page-nav-tabs" style="display:flex; gap:4px; flex-wrap:wrap;">
                        <button class="cmd-btn" onclick="if(window.CandidateOnboarding) window.CandidateOnboarding.start(window.CommanderUI);">PAGE 1: CANDIDATE GATE</button>
                        <button class="cmd-btn" onclick="window.openRoleGate()">PAGE 2: DUTY ROSTER</button>
                        <button class="cmd-btn" style="border-color:#d9822b; color:#fde68a;" onclick="const d=document.getElementById('brutalist-subpage-deck'); if(d) d.style.display='none';">PAGE 3: LEDGER HUB</button>
                        <button id="nav-tab-page4" class="cmd-btn" onclick="window.viewTruthVault()">PAGE 4: TRUTH &amp; RELIC VAULT</button>
                        <button id="nav-tab-page5" class="cmd-btn" onclick="window.viewWarBoard()">PAGE 5: WAR BOARD &amp; TELEMETRY</button>
                    </div>
                    <div class="ledger-btn-row" style="margin:0;">
                        <button id="btn-autotick-state" class="cmd-btn" onclick="window.toggleAutoTick()">CLOCK: TICKING</button>
                        <span id="timescale-bar" style="display:inline-flex; gap:3px;"></span>
                        <button id="btn-step-field" class="cmd-btn" onclick="window.stepExpeditionHour(2)">+2H FIELD</button>
                        <button class="cmd-btn" onclick="window.advanceDays(1)">+1 DAY</button>
                        <button id="btn-dream-ward" class="cmd-btn" onclick="window.triggerDreamIntervention()">🌙 DREAM WARD</button>
                        <button id="btn-chrono-skip" class="cmd-btn" onclick="window.chronoSkip(1)">+1D SKIP</button>
                        <button id="btn-export-save" class="cmd-btn" onclick="window.exportSave()">EXPORT SAVE</button>
                    </div>
                </div>

                <div id="status-bar" style="font-family:'Share Tech Mono',monospace; font-size:10px; color:#d8c8a8; background:#090c0d; border:1px solid #383e40; padding:4px 8px; margin-bottom:6px;">Initializing...</div>
                <div id="commander-action-banner" style="display:none; background:#1c1610; border-left:3px solid #fbbf24; color:#fde68a; padding:4px 8px; margin-bottom:6px; font-size:10px;"></div>
                <div id="daily-goal-bar" class="ledger-btn-row" style="margin-bottom:6px;"></div>

                <div id="brutalist-subpage-deck" style="display:none; margin-bottom:10px;"></div>

                <!-- PAGE 3 MAIN SPLIT: LEFT 3 IRON MODULES + RIGHT PARCHMENT TRIAGE SLATE -->
                <div style="display:grid; grid-template-columns: 1.25fr 0.95fr; gap:12px; align-items:stretch;">
                    <div id="role-directives-bar" style="display:flex; flex-direction:column;"></div>

                    <div class="burden-parchment-card">
                        <div>
                            <div class="burden-card-header"><span>TRIAGE SLATE</span><span>ᛟ</span></div>
                            <div id="crisis-triage-panel" style="display:block;"></div>
                            <div style="margin-top:6px; background:linear-gradient(180deg,#8c4f19 0%,#5c3412 100%); border:1.5px solid #3f2209; padding:7px; color:#fde68a;">
                                <div style="display:flex; justify-content:space-between; font-family:'Cinzel',serif; font-weight:900; font-size:11px; margin-bottom:3px;">
                                    <span>⚡ PROCEDURAL COLLISION</span><span>⚠️</span>
                                </div>
                                <div id="procedural-collision-readout" style="font-size:8.5px; color:#fed7aa; line-height:1.25;">
                                    Grammar of Chaos Kernel Active: Monitoring 130+ Pressure Vectors across Tier 1 Anchors, Tier 2 Catalysts, and Tier 3/4 Targets.
                                </div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:8.5px; border-top:1px solid #4a3e2e; padding-top:5px; margin-top:6px;">
                            <div><b>STATUS:</b> 18/5-300<br><b>ADMINISTRATIVE:</b> 100%<br><b>MILITARY:</b> ACTIVE</div>
                            <div style="text-align:right;"><b>TELEMETRY:</b> SYNCED<br><b>SHIFT CYCLE:</b> 14D</div>
                        </div>
                    </div>
                </div>
                <!-- LOWER TELEMETRY & SQUAD LOGS (GATED BY GROWTH TIER) -->
                <div class="ledger-lower-split" style="margin-top:8px;">
                    <div>
                        <div id="module-wrap-expeditions" class="hub-iron-module">
                            <div class="hub-module-header"><span>FIELD EXPEDITIONS &amp; CARAVAN LOGS</span><span style="font-size:9px; color:#d9822b;">MIST TRAILS</span></div>
                            <div id="expeditions-list" style="max-height:110px; overflow-y:auto; font-size:10px;">No squads currently out in the mist.</div>
                        </div>
                        <div class="hub-iron-module">
                            <div class="hub-module-header"><span>UI_LOG // COURIER DISPATCHES</span><span style="font-size:9px; color:#d9822b;">LIVE STREAM</span></div>
                            <div id="dispatches-list" style="max-height:115px; overflow-y:auto; font-size:10px;">Waiting...</div>
                        </div>
                        <div class="hub-iron-module">
                            <div class="hub-module-header"><span>DOSSIER &amp; ARCHIVE READER</span><span style="font-size:9px; color:#d9822b;">CASE FILE</span></div>
                            <div id="inquest-verdict-bar" style="display:none; gap:5px; margin-bottom:6px; flex-wrap:wrap;"></div>
                            <div id="story-reader" class="cmd-story-box" style="display:none; max-height:150px; overflow-y:auto;"></div>
                        </div>
                    </div>
                    <div>
                        <div class="hub-iron-module">
                            <div class="hub-module-header"><span>GARRISON &amp; SQUAD ARMORY</span><span style="font-size:9px; color:#d9822b;">⚔️ ⚙️ 🛡️</span></div>
                            <div id="roster-list" style="max-height:175px; overflow-y:auto; font-size:10px;">Loading agents...</div>
                        </div>
                        <div id="module-wrap-necrology" class="hub-iron-module">
                            <div class="hub-module-header"><span>CRUCIBLE RECORDS &amp; NECROLOGY</span><span style="font-size:9px; color:#d9822b;">DECEASED</span></div>
                            <div id="story-archive" style="max-height:95px; overflow-y:auto; font-size:10px;">Loading records...</div>
                        </div>
                    </div>
                </div>

                <button type="button" class="riveted-commit-plate" onclick="window.advanceDays(1)">
                    <span class="plate-rune">ᛝ</span>
                    <span>[CONFIRM HUB SELECTIONS &amp; UPDATE LEDGER]</span>
                </button>
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
        const dreamInfo = typeof st.dreamSiphon === 'number' ? ` | Dream Siphon: ${st.dreamSiphon}u${CommanderEngine.CrisisEngine?.pendingDreamIntervention ? ' [WARDED]' : ''}` : '';
        const feralCount = CommanderEngine.AgentRosterManager?.spawnedFeralWendigos?.length || 0;
        const feralInfo = feralCount > 0 ? ` | 🩸 Feral Wendigos: ${feralCount}` : '';
        if (sb) sb.innerText = `${m}${guardInfo}${dreamInfo}${feralInfo} | Volatility: ${gauge}`;
        const hubShiftEl = document.getElementById('hub-shift-header');
        if (hubShiftEl) hubShiftEl.innerText = `DAY ${d} // SHIFT COUNTDOWN (${shiftDays}D)`;

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
                            <div style="display:flex; justify-content:space-between; align-items:center; color:#5e110b; font-weight:bold;">
                                <span>🧭 ${e.type} → ${e.targetName} (${e.leadAgentName})</span>
                                <span>
                                    ${e.status} ${bar}
                                    <button class="cmd-btn" style="padding:1px 5px; font-size:9px; margin-left:6px;" onclick="window.recallExpedition('${e.id}')">🔄 Recall</button>
                                </span>
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

        // Render Page 3 Brutalist Iron Telemetry Modules Gated by Growth Progression (*A Dark Room* Style Unfolding)
        const growth = CommanderEngine.RoleStateMachine?.getGrowthProgression?.() || { tier: 0, isSovereign: false, label: 'GROWTH TIER 0', nextGateDesc: '' };
        const setDisp = (id, show, mode = 'inline-block') => { const el = document.getElementById(id); if (el) el.style.display = show ? mode : 'none'; };
        setDisp('nav-tab-page4', growth.tier >= 1);
        setDisp('nav-tab-page5', growth.tier >= 2);
        setDisp('btn-dream-ward', growth.tier >= 1);
        setDisp('btn-chrono-skip', growth.tier >= 1);
        setDisp('module-wrap-expeditions', growth.tier >= 1, 'block');
        setDisp('module-wrap-necrology', growth.tier >= 2, 'block');

        const dirBar = document.getElementById('role-directives-bar');
        if (dirBar && CommanderEngine.CrisisEngine) {
            const roleDirs = CommanderEngine.CrisisEngine.getDirectivesForRole(roleLabel);
            const baseGroup = [];
            const fieldGroup = [];
            const politicsGroup = [];

            roleDirs.forEach(([fn, label]) => {
                const btnHtml = `<button class="cmd-btn" onclick="${fn}">${label}</button>`;
                if (growth.isSovereign) {
                    if (fn.includes('HIBERNATE') || fn.includes('SUMMON_HUNTSMAN') || fn.includes('viewFacilities')) baseGroup.push(btnHtml);
                    else if (fn.includes('MACABRE_COMMUNION') || fn.includes('viewTruthVault')) fieldGroup.push(btnHtml);
                    else politicsGroup.push(btnHtml);
                } else if (fn.includes('viewFacilities') || fn.includes('UNGUARDED_CARAVAN') || fn.includes('SMUGGLE_RESIN') || (growth.tier >= 1 && (fn.includes('viewTruthVault') || fn.includes('viewTelemetry') || fn.includes('viewShadowLedger') || fn.includes('interrogateSuspect')))) {
                    baseGroup.push(btnHtml);
                } else if (fn.includes('sendExpedition') || fn.includes('HUNT_FERAL_WENDIGO') || fn.includes('REQUISITION_FUEL') || fn.includes('DEVELOP_AUTARKY') || fn.includes('AUDIT_ANOMALY') || fn.includes('SCRUB_MONUMENT')) {
                    fieldGroup.push(btnHtml);
                } else {
                    politicsGroup.push(btnHtml);
                }
            });

            const capPct = growth.isSovereign ? Math.min(100, Math.round((st.significanceHarvested || 0) / 25)) : (fe ? fe.settlementProsperity : 84);
            const resSupply = growth.isSovereign ? `${st.significanceHarvested || 0} WEIGHT` : (fe ? fe.settlementResources * 120 : 4912);
            const fuelSupply = growth.isSovereign ? `${st.heraldsMutated || 0}/5 HERALDS` : (st.barrierFuelUnits || st.contrabandResin || 28) * 140;

            const buildModule = (title, rightTag, supplyVal, statusText, buttons) => `
                <div class="hub-iron-module">
                    <div class="hub-module-header">
                        <span>${title}</span>
                        <span style="font-size:10px; color:#d9822b;">${rightTag}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:8px; align-items:center; margin-bottom:5px; font-size:8px; color:#8c8270;">
                        <div style="font-family:monospace; line-height:1.25;">${growth.label}</div>
                        <div>
                            <div style="display:flex; justify-content:space-between; color:#cbbba0; margin-bottom:2px;">
                                <span>SUPPLY // ${supplyVal}</span><span>STATUS: ${statusText}</span>
                            </div>
                            <div style="height:6px; background:#07090a; border:1px solid #4a453b;">
                                <div style="width:${Math.min(100, capPct)}%; height:100%; background:#d9822b;"></div>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">${buttons.join('')}</div>
                </div>
            `;

            let modulesHtml = buildModule(
                growth.isSovereign ? '[STAGE 0: FROST-LAIR DORMANCY]' : '[BASE & ARCHIVES]',
                `[ TIER ${growth.tier} // ${capPct}% ]`,
                resSupply,
                'ON ●',
                baseGroup
            );
            if (growth.tier >= 1 && fieldGroup.length > 0) {
                modulesHtml += buildModule(
                    growth.isSovereign ? '[STAGE I: THE MACABRE COMMUNION]' : '[FIELD & LOGISTICS]',
                    `[ SUPPLY // 4SYNCED ]`,
                    fuelSupply,
                    'ACTIVE ●',
                    fieldGroup
                );
            }
            if (growth.tier >= 2 && politicsGroup.length > 0) {
                modulesHtml += buildModule(
                    growth.isSovereign ? '[STAGE II–III: APOCALYPTIC HARVEST]' : '[POLITICS & TITHE]',
                    `[ RECORDS // SYNCED ]`,
                    growth.isSovereign ? `${st.yearsEndured || 0}/1000Y` : (st.crownFavor || 65) * 45,
                    'UNLEASHED ●',
                    politicsGroup
                );
            }
            if (growth.tier < 2) {
                modulesHtml += `
                    <div style="border:1px dashed #4a453b; background:rgba(9,13,14,0.65); padding:6px 9px; font-size:8.5px; color:#a8997c; border-radius:4px;">
                        <b style="color:#fbbf24;">${growth.label}</b> — ${growth.nextGateDesc}
                    </div>
                `;
            }
            dirBar.innerHTML = modulesHtml;
        }

        // Render Urgent Crisis Response Triage Overlay or Active Emissary Petition if active
        const crisisPanel = document.getElementById('crisis-triage-panel');
        if (crisisPanel) {
            const activeCrisis = CommanderEngine.CrisisEngine?.activeCrisis;
            const activePetition = CommanderEngine.RealityEditorVault?.activeEmissaryPetition;
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
                    <button class="cmd-btn" style="display:block; width:100%; text-align:left; padding:8px; margin-top:6px; background:#1e1b4b; border-color:#818cf8; color:#e0e7ff;" onclick="window.triggerDreamIntervention('${activeCrisis.id}', 10); window.resolveCrisis('DREAM_MITIGATE')">
                        🌙 Invoke Dream Intervention Ward (-10u Dream Siphon — Mitigates Catastrophic Flare & Stabilizes Squad Poise)
                    </button>
                `;
            } else if (activePetition) {
                crisisPanel.style.display = 'block';
                crisisPanel.innerHTML = `
                    <div style="color:#1a130c; font-family:'Cinzel',serif; font-weight:900; font-size:11.5px; margin-bottom:3px;">EMISSARY PETITION // ${activePetition.senderHouse.toUpperCase()}</div>
                    <div style="color:#2b1e12; font-size:9.5px; margin-bottom:6px;">${activePetition.prompt}</div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        <button class="cmd-btn" style="flex:1; padding:5px; background:#14332a; border-color:#10b981; color:#d1fae5;" onclick="window.resolveEmissaryPetition('ACCEPT')">${activePetition.acceptLabel}</button>
                        <button class="cmd-btn" style="flex:1; padding:5px; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.resolveEmissaryPetition('REJECT')">${activePetition.rejectLabel}</button>
                    </div>
                `;
            } else {
                crisisPanel.style.display = 'block';
                crisisPanel.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-family:'Cinzel',serif; font-weight:900; font-size:11.5px;">EMISSARY PETITION</span>
                        <span style="font-size:8.5px; color:#463523;">STATUS: STANDBY</span>
                    </div>
                    <div style="font-size:9px; color:#3f2e1e; line-height:1.25;">
                        Gatehouse envoys arrive every 3 days from competing Noble Houses on the War Board.
                    </div>
                `;
            }
        }

        const colReadout = document.getElementById('procedural-collision-readout');
        if (colReadout) {
            const latestCol = CommanderEngine.ProceduralCollisionEngine?.collisionHistory?.[0];
            const wq = CommanderEngine.RealityEditorVault?.worldQualities || {};
            const wqSummary = `[World Qualities: Mistrust=${wq.rivalMistrust || 0} | Schism=${wq.institutionalSchism || 0} | Authority=${wq.scholarlyAuthority || 0}]`;
            if (latestCol) {
                const nm = latestCol.narrativeManifest;
                colReadout.innerHTML = `<b>${latestCol.eventName}</b> (Day ${latestCol.day}): ${nm ? nm.proceduralDescription : `[${latestCol.anchor} + ${latestCol.catalyst} + ${latestCol.target}]`}<br><span style="color:#fde68a;">Rebound: +20% on ${latestCol.rebound?.pressureId} | ${wqSummary}</span>`;
            } else {
                colReadout.innerHTML = `Grammar of Chaos Kernel Active: Monitoring 130+ Pressure Vectors.<br><span style="color:#fde68a;">${wqSummary}</span>`;
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

