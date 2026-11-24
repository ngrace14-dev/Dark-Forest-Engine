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
    isRunCommitted: false,
    mapZoom: 2.2,
    mapPanX: 0,
    mapPanY: 0,
    _mapCameraInitialized: false,
    _isMapDragging: false,
    _mapDragMoved: false,
    _mapDragStartX: 0,
    _mapDragStartY: 0,
    _mapStartPanX: 0,
    _mapStartPanY: 0,
    _overworldRafId: null,

    applyOverworldMapTransform() {
        if (typeof document === 'undefined') return;
        const g = document.getElementById('overworld-svg-pan-zoom-group');
        const badge = document.getElementById('overworld-zoom-badge');
        const z = Number((this.mapZoom || 2.2).toFixed(2));
        const px = Number((this.mapPanX || 0).toFixed(1));
        const py = Number((this.mapPanY || 0).toFixed(1));
        if (g) {
            g.setAttribute('transform', `translate(2000, 2000) scale(${z}) translate(${-2000 + px}, ${-2000 + py})`);
        }
        if (badge) {
            badge.textContent = `${Math.round(z * 100)}%`;
        }
        this.drawOverworldTerrainCanvas();
    },

    drawOverworldTerrainCanvas() {
        if (typeof document === 'undefined') return;
        const canvas = document.getElementById('overworld-terrain-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ovw = CommanderEngine.ForestOverworldEngine;
        if (!ovw) return;
        const cw = canvas.width || 800;
        const ch = canvas.height || 800;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#030508';
        ctx.fillRect(0, 0, cw, ch);

        const z = Number(this.mapZoom || 2.2);
        const panX = Number(this.mapPanX || 0);
        const panY = Number(this.mapPanY || 0);
        const scale = cw / 4000;

        ctx.save();
        ctx.translate(cw * 0.5, ch * 0.5);
        ctx.scale(z, z);
        ctx.translate(-cw * 0.5 + panX * scale, -ch * 0.5 + panY * scale);

        const step = ovw.exploredCellSize || 100;
        const cellPx = step * scale;
        const partyX = ovw.partyX || 2260;
        const partyY = ovw.partyY || 2180;
        const sightR = ovw.sightRadius || 340;

        for (let gx = 0; gx < 40; gx++) {
            for (let gy = 0; gy < 40; gy++) {
                const wx = gx * step + step * 0.5;
                const wy = gy * step + step * 0.5;
                const distToParty = Math.hypot(wx - partyX, wy - partyY);
                const inLiveSight = distToParty <= sightR;
                const isExplored = inLiveSight || ovw.isCellExplored?.(gx, gy);

                const rx = gx * cellPx;
                const ry = gy * cellPx;
                if (!isExplored) {
                    ctx.fillStyle = '#04070b';
                    ctx.fillRect(rx, ry, cellPx + 0.6, cellPx + 0.6);
                    continue;
                }
                const biome = ovw.getBiomeAt ? ovw.getBiomeAt(wx, wy) : { color: '#112919', id: 'DENSE_FOREST' };
                ctx.fillStyle = biome.color || '#112919';
                ctx.fillRect(rx, ry, cellPx + 0.6, cellPx + 0.6);

                if (biome.id === 'DENSE_FOREST') {
                    ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
                    ctx.fillRect(rx + cellPx * 0.25, ry + cellPx * 0.25, cellPx * 0.5, cellPx * 0.5);
                } else if (biome.id === 'RIVER') {
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
                    ctx.fillRect(rx + cellPx * 0.15, ry + cellPx * 0.15, cellPx * 0.7, cellPx * 0.7);
                }

                if (!inLiveSight) {
                    ctx.fillStyle = 'rgba(2, 6, 14, 0.56)';
                    ctx.fillRect(rx, ry, cellPx + 0.6, cellPx + 0.6);
                }
            }
        }

        ctx.strokeStyle = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN'
            ? 'rgba(239, 68, 68, 0.55)'
            : 'rgba(74, 222, 128, 0.55)';
        ctx.lineWidth = 2.5 / z;
        ctx.beginPath();
        ctx.arc(partyX * scale, partyY * scale, sightR * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    },

    startOverworldMovementLoop() {
        if (this._overworldRafId || typeof window === 'undefined') return;
        const stepLoop = () => {
            const ovw = CommanderEngine.ForestOverworldEngine;
            if (!ovw || !ovw.isMoving) {
                this._overworldRafId = null;
                this.renderExploreForestModal(false);
                this.renderWarBoardReader();
                this.render();
                return;
            }
            const res = ovw.updatePartyMovement(0.05);
            this.mapPanX = Number((2000 - (ovw.partyX || 2000)).toFixed(1));
            this.mapPanY = Number((2000 - (ovw.partyY || 2000)).toFixed(1));
            this.renderExploreForestModal(false);
            if (res && res.moving) {
                const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 45));
                this._overworldRafId = raf(stepLoop);
            } else {
                this._overworldRafId = null;
                if (res?.message) this.showBanner(res.message);
                this.renderExploreForestModal(false);
                this.renderWarBoardReader();
                this.render();
            }
        };
        const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 45));
        this._overworldRafId = raf(stepLoop);
    },

    zoomOverworldMap(deltaScale = 0.25) {
        this.mapZoom = Math.max(0.55, Math.min(4.5, Number(((this.mapZoom || 2.2) + deltaScale).toFixed(2))));
        this.renderExploreForestModal(false);
    },

    panOverworldMap(dx = 0, dy = 0) {
        this.mapPanX = Math.max(-1950, Math.min(1950, (this.mapPanX || 0) + dx));
        this.mapPanY = Math.max(-1950, Math.min(1950, (this.mapPanY || 0) + dy));
        this.applyOverworldMapTransform();
    },

    resetOverworldMapCamera() {
        this.mapZoom = 1.0;
        this.mapPanX = 0;
        this.mapPanY = 0;
        this.renderExploreForestModal(false);
    },

    focusOverworldParty() {
        const ovw = CommanderEngine.ForestOverworldEngine;
        const px = ovw?.partyX ?? 2260;
        const py = ovw?.partyY ?? 2180;
        this.mapZoom = Math.max(2.2, this.mapZoom || 2.2);
        this.mapPanX = Number((2000 - px).toFixed(1));
        this.mapPanY = Number((2000 - py).toFixed(1));
        this._mapCameraInitialized = true;
        this.renderExploreForestModal(false);
    },

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

    openRoleSelection(forceUnlock = false) {
        if (this.isRunCommitted && !forceUnlock) {
            this.showBanner("Campaign run is already committed under Royal Archive Seal. Complete or end your current run first.");
            return;
        }
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
        const currentScale = CommanderEngine.timeScale || 1;
        const targetScale = Math.max(1, Math.min(CommanderEngine.maxTimeScale || 8, Number(scale) || 1));
        if (targetScale > currentScale) {
            const res = CommanderEngine.setTimeScale(targetScale, true);
            if (typeof res === 'object' && res.success === false) {
                this.showBanner(res.message);
                this.render();
                return;
            }
        } else {
            CommanderEngine.setTimeScale(targetScale, false);
        }
        const applied = CommanderEngine.timeScale;
        if (this.autoTickEnabled) this.startAutoTick();
        const hrs = Number((12 / applied).toFixed(2));
        const costMap = { 1: 0, 2: 1, 4: 2, 8: 4 };
        const paidNote = targetScale > currentScale && costMap[applied] ? ` (-${costMap[applied]} Chrono-Seal[s], ${CommanderEngine.FacilityEngine.chronoSeals} left)` : '';
        this.showBanner(`Time scale set to ${applied}x (1 In-Game Day = ${hrs} Real-World Hours)${paidNote}.`);
        this.render();
    },

    selectRoleAndLaunch(roleKey, customHouseId = null) {
        this.roleSelected = true;
        this.isRunCommitted = false;
        const container = document.getElementById(this.containerId);
        if (container) container.dataset.initialized = 'false';
        CommanderEngine.CrisisEngine.sessionStartedAtMs = Date.now();
        CommanderEngine.CrisisEngine.volatilityIndex = 0;
        CommanderEngine.CrisisEngine.activeCrisis = null;
        CommanderEngine.CrisisEngine.pendingDailyReconciliation = false;
        CommanderEngine.FacilityEngine?.resetForNewRun?.();
        if (CommanderEngine.ExpeditionEngine) CommanderEngine.ExpeditionEngine.activeExpeditions = [];
        CommanderEngine.CampaignManager.selectRole(roleKey, customHouseId);
        CommanderEngine.TutorialAdvisor?.resetForNewRun?.();
        this.activeBookTab = 'COMMAND';
        if (typeof window !== 'undefined' && window.CandidateOnboarding?.state?.completed) {
            window.CandidateOnboarding.injectCandidateIntoRoster();
            // P2 Accelerated Onboarding Cache: Respect the player's time if they completed the 4-Scene Candidate Gate
            if (CommanderEngine.FacilityEngine) {
                CommanderEngine.FacilityEngine.settlementResources += 15;
            }
            if (CommanderEngine.CampaignManager?.state?.house) {
                CommanderEngine.CampaignManager.state.house.barrierFuelUnits = Math.min(60, (CommanderEngine.CampaignManager.state.house.barrierFuelUnits || 28) + 6);
            }
        }
        this.startAutoTick();
        const h = CommanderEngine.CampaignManager.state.house;
        this.render();
        const starterCacheNote = (typeof window !== 'undefined' && window.CandidateOnboarding?.state?.completed)
            ? ' | 🎁 [RUNIC SCRIBE STARTER CACHE: +15 Resources, +6u Fuel]'
            : '';
        const leadAgt = CommanderEngine.AgentRosterManager?.agents?.get?.('agt_1');
        const leaderName = leadAgt?.name || h?.rulerName || 'Royal Auditor';
        const modTitle = (typeof window !== 'undefined' && window.CandidateOnboarding?.state?.originModifierId)
            ? ` | ⚙️ Modifier: [${window.CandidateOnboarding.state.originModifierId}]`
            : '';
        if (roleKey === 'NOBLE_HOUSE') {
            this.showBanner(`Royal Auditor & Faction Leader: [${leaderName}] of [${h.houseId}] (${h.settlementName}) | Monopoly: ${h.monopoly} (${h.monopolyBonus})${starterCacheNote}${modTitle}`);
        } else {
            this.showBanner(`Royal Auditor & Faction Leader: [${leaderName}] — Initialized [${roleKey}] Command Terminal.${starterCacheNote}${modTitle}`);
        }
    },

    pendingRoleId: 'NOBLE_HOUSE',
    highContrastMode: false,
    visualShockState: null,
    activeBookTab: 'COMMAND',
    mapViewMode: 'TACTICAL_MAP',
    selectedMapSettlementId: 1,
    activeEncounterState: null,

    toggleMapViewMode() {
        this.mapViewMode = this.mapViewMode === 'TACTICAL_MAP' ? 'CLASSIC_LEDGER' : 'TACTICAL_MAP';
        this.showBanner(`Auditor's View Switched: ${this.mapViewMode === 'TACTICAL_MAP' ? '🗺️ TACTICAL DOMINION MAP (Interactive 20-Settlement Canvas)' : '📜 CLASSIC ARCHIVE LEDGER (Auditor\'s Retreat Fallback)'}`);
        this.renderWarBoardReader();
        this.render();
    },

    selectMapSettlement(settlementId) {
        this.selectedMapSettlementId = Number(settlementId) || 0;
        const settlements = CommanderEngine.CampaignManager.getBedrockTelemetry({
            allowTwentyFirst: CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false
        }) || [];
        const node = settlements.find(s => Number(s.id) === this.selectedMapSettlementId) || settlements[0];
        if (node) {
            this.showBanner(`🎯 Selected Parish Node #${node.id}: [${node.name}] (${node.house} | Fuel: ${node.barrierFuel}u | Chains: ${node.chainsIntegrity}%)`);
        }
        this.renderWarBoardReader();
    },

    openTacticalEncounterModal(settlementId = null) {
        const targetId = settlementId !== null ? Number(settlementId) : this.selectedMapSettlementId;
        const settlements = CommanderEngine.CampaignManager.getBedrockTelemetry({
            allowTwentyFirst: CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false
        }) || [];
        const node = settlements.find(s => Number(s.id) === targetId) || settlements[1] || { id: 1, name: 'Oakhaven', house: 'House Oakheart', barrierFuel: 50, chainsIntegrity: 100 };
        const warBoard = CommanderEngine.CampaignManager.getWarBoard() || [];
        const houseEntry = warBoard.find(w => w.name === node.house) || { name: node.house, power: 65, status: 'PEACE', monopoly: 'Ironwood' };
        const leadAgt = CommanderEngine.AgentRosterManager?.agents?.get?.('agt_1') || Array.from(CommanderEngine.AgentRosterManager?.agents?.values?.() || []).find(a => a.alive);
        const isSov = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN';
        const enemyTitle = isSov ? `${node.name} Chain-Garrison & 300 Watch` : `${node.house} Border Wardens (${node.name})`;
        const enemyMaxHp = Math.max(80, Math.round((houseEntry.power || 60) * 2.2));

        this.activeEncounterState = {
            settlementId: node.id,
            settlementName: node.name,
            houseName: node.house,
            housePower: houseEntry.power || 65,
            houseStatus: houseEntry.status || 'PEACE',
            monopoly: houseEntry.monopoly || 'Runic Reserves',
            playerName: leadAgt?.name || (isSov ? 'Korvan the Pale Sovereign' : 'Royal Auditor Vanguard'),
            playerHp: leadAgt?.vitals?.hp || 120,
            playerMaxHp: leadAgt?.vitals?.maxHp || 120,
            playerStamina: leadAgt?.vitals?.stamina || 100,
            playerPoise: Math.round(leadAgt?.vitals?.poise || 80),
            cultTier: leadAgt?.cultivation?.stage || 0,
            warpUnlocked: Boolean(leadAgt?.cultivation?.causalCombatWarp),
            enemyName: enemyTitle,
            enemyHp: enemyMaxHp,
            enemyMaxHp,
            round: 1,
            resolved: false,
            combatLogs: [
                `[ROUND 1 — TACTICAL ENGAGEMENT AT ${node.name.toUpperCase()}] ${leadAgt?.name || 'Vanguard'} approached the 50-ton anchor perimeter of ${node.name} (${node.house} | Power: ${houseEntry.power}/100). Select a tactical combat action below.`
            ]
        };
        this.renderWarBoardReader();
    },

    executeTacticalEncounterAction(actionType = 'STRIKE') {
        const enc = this.activeEncounterState;
        if (!enc || enc.resolved) return { success: false, message: 'No active tactical encounter.' };
        const act = String(actionType || 'STRIKE').toUpperCase();
        const leadAgt = CommanderEngine.AgentRosterManager?.agents?.get?.('agt_1') || Array.from(CommanderEngine.AgentRosterManager?.agents?.values?.() || []).find(a => a.alive);
        const sq = CommanderEngine.RoleStateMachine.computeSquadCapabilityMetrics();
        const isSov = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN';

        if (act === 'RETREAT') {
            enc.resolved = true;
            const msg = `🛡️ [TACTICAL WITHDRAWAL] ${enc.playerName} broke off the engagement at ${enc.settlementName} and withdrew into the mist with intact forces.`;
            enc.combatLogs.push(msg);
            this.showBanner(msg);
            this.renderWarBoardReader();
            return { success: true, action: act, message: msg };
        }

        let dmgDealt = Math.round(24 + sq.avgMartial * 4 + (enc.cultTier * 6));
        let dmgTaken = Math.max(6, Math.round((enc.housePower * 0.25) - sq.avgSurvival * 1.5));
        let actionLog = '';

        if (act === 'RUNIC_SURGE') {
            dmgDealt = Math.round(dmgDealt * 1.65);
            enc.playerStamina = Math.max(0, enc.playerStamina - 25);
            actionLog = `🔥 [FOUNDATION FIRE / RUNIC SURGE] ${enc.playerName} ignited Tier ${enc.cultTier} body-runes (or Frost-Herald fury), dealing ${dmgDealt} heavy runic damage to ${enc.enemyName}!`;
        } else if (act === 'CAUSAL_WARP') {
            dmgDealt = Math.round(dmgDealt * 1.45);
            dmgTaken = 0;
            enc.playerStamina = Math.max(0, enc.playerStamina - 20);
            actionLog = `⚡ [CAUSAL COMBAT WARP] ${enc.playerName} refracted through the blind-spot, completely evading ${enc.enemyName}'s counter-volley (0 damage taken) and striking for ${dmgDealt} vitals damage!`;
        } else {
            actionLog = `⚔️ [VANGUARD ASSAULT] ${enc.playerName} clashed with ${enc.enemyName} for ${dmgDealt} damage (Counter-fire inflicted -${dmgTaken} HP).`;
        }

        enc.enemyHp = Math.max(0, enc.enemyHp - dmgDealt);
        enc.playerHp = Math.max(15, enc.playerHp - dmgTaken);
        if (leadAgt?.vitals) {
            leadAgt.vitals.hp = enc.playerHp;
            if (leadAgt.cultivation) leadAgt.cultivation.currentMasteryPool = Math.min(100, (leadAgt.cultivation.currentMasteryPool || 25) + 8);
        }
        enc.round++;
        enc.combatLogs.push(actionLog);

        if (enc.enemyHp <= 0) {
            enc.resolved = true;
            const fuelLoot = isSov ? 0 : 10;
            const resLoot = 16;
            const weightLoot = isSov ? 450 : 0;
            if (isSov) {
                CommanderEngine.CampaignManager.state.sovereign.significanceHarvested = (CommanderEngine.CampaignManager.state.sovereign.significanceHarvested || 0) + weightLoot;
            } else {
                const h = CommanderEngine.CampaignManager.state.house;
                h.barrierFuelUnits = Math.min(70, (h.barrierFuelUnits || 20) + fuelLoot);
                CommanderEngine.FacilityEngine.settlementResources += resLoot;
            }
            CommanderEngine.CampaignManager.mutateWarBoard(enc.houseName, -8, 'DEFENSIVE', `Defeated in tactical encounter at ${enc.settlementName}`);
            const winMsg = isSov
                ? `💀🏆 [DOMINION VICTORY AT ${enc.settlementName.toUpperCase()}] Devoured ${enc.enemyName}! Harvested +${weightLoot} Historical Weight (${enc.houseName} -8 Power -> DEFENSIVE).`
                : `🏆 [TACTICAL VICTORY AT ${enc.settlementName.toUpperCase()}] Overran ${enc.enemyName}! Plundered +${fuelLoot}u Barrier Fuel & +${resLoot} Resources (${enc.houseName} -8 Power -> DEFENSIVE).`;
            enc.combatLogs.push(winMsg);
            this.showBanner(winMsg);
        }
        this.renderWarBoardReader();
        return { success: true, encounter: enc, message: actionLog };
    },

    switchBookTab(tabId = 'COMMAND', triggerTutorial = true) {
        this.activeBookTab = String(tabId || 'COMMAND').toUpperCase();
        const topicMap = {
            COMMAND: 'BOOK_TAB_COMMAND',
            GARRISON: 'BOOK_TAB_GARRISON',
            FIELD: 'BOOK_TAB_FIELD',
            TRUTH: 'BOOK_TAB_TRUTH',
            WARBOARD: 'BOOK_TAB_WARBOARD'
        };
        if (triggerTutorial && CommanderEngine.TutorialAdvisor && topicMap[this.activeBookTab]) {
            CommanderEngine.TutorialAdvisor.checkAndTrigger(topicMap[this.activeBookTab]);
        }
        const deck = typeof document !== 'undefined' ? document.getElementById('brutalist-subpage-deck') : null;
        if (this.activeBookTab === 'TRUTH') {
            this.renderTruthVaultReader(false);
        } else if (this.activeBookTab === 'WARBOARD') {
            this.renderWarBoardReader(false);
        } else if (deck) {
            deck.style.display = 'none';
        }
        this.render();
    },

    commitHubRun() {
        this.isRunCommitted = true;
        if (typeof document !== 'undefined') {
            ['btn-nav-page1-gate', 'btn-nav-page2-roster', 'btn-top-role-roster', 'btn-commit-hub-run', 'btn-nav-role-scroll'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
        this.startAutoTick();
        const roleLabel = CommanderEngine.CampaignManager.activeRole || CommanderEngine.CampaignManager.campaignMode;
        this.showBanner(`🔒 Campaign Run Committed as [${roleLabel}]! Candidate Gate & Role Roster are now locked until your current run ends.`);
        this.render();
    },

    closeReader() {
        const reader = typeof document !== 'undefined' ? document.getElementById('story-reader') : null;
        const verdictBar = typeof document !== 'undefined' ? document.getElementById('inquest-verdict-bar') : null;
        const closeBtn = typeof document !== 'undefined' ? document.getElementById('btn-close-story-reader') : null;
        if (reader) reader.style.display = 'none';
        if (verdictBar) verdictBar.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
    },

    toggleHighContrast() {
        this.highContrastMode = !this.highContrastMode;
        if (typeof document !== 'undefined' && document.body) {
            if (this.highContrastMode) document.body.classList.add('high-contrast-runic');
            else document.body.classList.remove('high-contrast-runic');
        }
        this.showBanner(`High-Contrast Runic Bus-Commuter Mode: ${this.highContrastMode ? 'ENABLED (Enhanced Legibility & Gauge Needles)' : 'STANDARD'}`);
        this.render();
    },

    triggerVisualShock(shockType = 'CHAIN_SHATTER') {
        this.visualShockState = shockType;
        const container = typeof document !== 'undefined' ? document.getElementById(this.containerId) : null;
        if (container && container.classList) {
            container.classList.add(shockType === 'CHAIN_SHATTER' ? 'chain-shatter-quake' : 'predator-raid-pulse');
        }
    },

    renderSemicircleGaugeSvg(label = 'BARRIER FUEL', angleDeg = 35, alertColor = '#c97a36', isCritical = false, valueText = '', isBlackedOut = false) {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        const nx = (50 + 28 * Math.cos(rad)).toFixed(1);
        const ny = (46 + 28 * Math.sin(rad)).toFixed(1);
        const critClass = isCritical && !isBlackedOut ? 'gauge-critical-pulse' : '';
        const strokeColor = isBlackedOut ? '#090705' : (isCritical ? '#ef4444' : alertColor);
        const bgTrackColor = isBlackedOut ? '#090705' : '#2b2118';
        return `
            <div class="${critClass}" style="text-align:center; padding:2px; border-radius:4px; ${isBlackedOut ? 'background:#0d0a07; border:1px solid #1c1610;' : ''}">
                <div style="font-size:9.5px; font-weight:900; color:${isBlackedOut ? '#090705' : '#1a120b'}; margin-bottom:1px; letter-spacing:0.03em;">${isBlackedOut ? '<span class="redaction-bar" style="width:68px; height:8px; background:#090705;"></span>' : label}</div>
                <svg viewBox="0 0 100 58" style="width:92px; height:48px; display:block; margin:0 auto;">
                    <path d="M 12 46 A 38 38 0 0 1 88 46" fill="${isBlackedOut ? '#090705' : 'none'}" stroke="${bgTrackColor}" stroke-width="7.5"/>
                    <path d="M 12 46 A 38 38 0 0 1 42 10" fill="none" stroke="${strokeColor}" stroke-width="6.5"/>
                    ${isBlackedOut ? '' : `<line x1="50" y1="46" x2="${nx}" y2="${ny}" stroke="#090705" stroke-width="3.5" stroke-linecap="round"/>`}
                    <circle cx="50" cy="46" r="4.8" fill="${isBlackedOut ? '#090705' : (isCritical ? '#dc2626' : '#090705')}"/>
                    ${valueText ? `<text x="50" y="56" text-anchor="middle" fill="${isBlackedOut ? '#f59e0b' : '#1a120b'}" font-size="10.5" font-weight="bold">${valueText}</text>` : ''}
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

        const fuelVal = h.barrierFuelUnits ?? 28;
        const entropyVal = o.blindSpotEntropy ?? 12;
        const resinVal = syn.contrabandResin ?? 45;
        const sovWeight = CommanderEngine.CampaignManager.state.sovereign?.significanceHarvested ?? 0;

        const cardData = [
            ['MERCHANT_PATRON', 'THE CROWN', 'I', `<div><b>ROLE: MERCHANT PATRON</b><br>Fuel Monopoly &amp; Arbitrage.<br><b style="color:#14532d;">[STATUS: ACTIVE]</b></div>`, this.renderSemicircleGaugeSvg('FUEL MONOPOLY', 45, '#57753b', false, '100%')],
            ['NOBLE_HOUSE', 'NOBLE HOUSE', 'II', `<div><b>ROLE: NOBLE HOUSE</b><br><b>MILITARY:</b> 288 | <b>RESERVES:</b> ${fuelVal}u<br><b style="color:#991b1b;">TITHE: ${h.crownDemand || 16}u</b></div>`, this.renderSemicircleGaugeSvg('BARRIER FUEL', -30, '#c97a36', fuelVal < 15, `${fuelVal}u`)],
            ['TERMINUS', 'HOUSE TERMINUS', 'III', `<div style="grid-column:1 / span 2;"><b>ANOMALOUS CONTAINMENT</b><br><span style="font-size:8px;">STABILITY // 300 GUARDIANS</span><div style="display:grid; grid-template-columns:repeat(12,1fr); gap:1px; height:9px; margin-top:3px;">${Array.from({ length: 12 }).map((_, i) => `<div style="background:${i < 9 ? '#576838' : '#9c8d74'}; border:1px solid #2b1e12;"></div>`).join('')}</div></div>`, ''],
            ['GUILD_LEADER', '<span class="redaction-bar" style="width:118px; height:12px; background:#090705; display:inline-block;" title="REDACTED SHADOW DIRECTORATE"></span>', 'IV', `<div><b>GROUP:</b> <span class="redaction-bar" style="width:65px; height:9px; background:#090705;"></span><br><b>CONFIDENTIAL:</b> <span class="redaction-bar" style="width:52px; height:9px; background:#090705;"></span><br><b>CONTAINMENT:</b> ?%</div>`, this.renderSemicircleGaugeSvg('CONTAINMENT', 0, '#090705', false, '?%', true)],
            ['SYNDICATE', 'SCARCITY SYNDICATE', 'V', `<div><b>TRADE:</b> 28% / 7%<br><b>RESIN:</b> ${resinVal}u<br><b>TOLL:</b> ${syn.gallowsTollCollected || 80}d</div>`, this.renderSemicircleGaugeSvg('TOLL / RESIN', 15, '#c97a36', resinVal < 15, `${resinVal}u`)]
        ];

        const cardsHtml = cardData.map(([roleId, title, badge, leftCol, rightCol]) => {
            const btnLabel = roleId === 'GUILD_LEADER' ? 'INITIALIZE [REDACTED]' : (roleId === 'MERCHANT_PATRON' ? 'INITIALIZE MERCHANT PATRON' : `INITIALIZE ${title}`);
            return `
            <div class="burden-parchment-card" style="cursor:pointer;" onclick="window.selectArchiveRole('${roleId}')">
                <div>
                    <div class="burden-card-header"><span>${title}</span><span>[${badge}]</span></div>
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:5px; font-size:8.5px;">${leftCol}${rightCol}</div>
                </div>
                <button class="vantage-init-btn" style="margin-top:6px; padding:4px; font-size:8.5px;">${btnLabel}</button>
            </div>
        `}).join('') + `
            <div class="burden-parchment-card" style="background:linear-gradient(160deg,#c8c2b6 0%,#9a9180 100%); border:2px solid #7f1d1d; cursor:pointer; overflow:hidden;" onclick="window.selectArchiveRole('PALE_SOVEREIGN')">
                <div>
                    <div class="burden-card-header" style="color:#450a0a; border-color:#7f1d1d;"><span>THE PALE SOVEREIGN</span><span>[VI]</span></div>
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:5px; font-size:8.5px; color:#1c1610;">
                        <div>
                            <b>SLOW-BURN PREDATOR</b><br>
                            Brood in frost, consume Historical Weight &amp; mutate 5 Heralds.<br>
                            <b style="color:#7f1d1d;">[1,000-YEAR CYCLE]</b>
                        </div>
                        ${this.renderSemicircleGaugeSvg('HISTORICAL WEIGHT', -45, '#7f1d1d', true, `${sovWeight}W`)}
                    </div>
                </div>
                <button class="vantage-init-btn" style="margin-top:6px; padding:4px; font-size:8.5px; background:linear-gradient(180deg,#450a0a,#1f0505); color:#fecaca; border-color:#991b1b;">INITIALIZE THE PALE SOVEREIGN</button>
            </div>
        `;

        container.innerHTML = `
            <div class="brutalist-runic-frame">
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">CIVILIZATIONAL DUTY ROSTER</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">// LAYER 2 — SELECT YOUR VANTAGE ROLE</div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">${cardsHtml}</div>

                <button type="button" class="riveted-commit-plate" onclick="window.selectArchiveRole('${sel}')">
                    <span class="plate-rune">◆</span>
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
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('TIME_DREAM_SKIP');
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
        window.recruitFactionUnit = (archetype = 'WARDEN') => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('RECRUIT_UNIT_BTN');
            const res = CommanderEngine.AgentRosterManager.recruitFactionUnit(archetype);
            this.showBanner(res.message);
            this.render();
        };
        window.buyArmoryGear = (itemId) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('ARMORY_MARKET_BTN');
            const res = CommanderEngine.AgentRosterManager.buyArmoryGear(itemId);
            this.showBanner(res.message);
            this.render();
        };
        window.sellArmoryGear = (itemId = null) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('ARMORY_MARKET_BTN');
            const res = CommanderEngine.AgentRosterManager.sellArmoryGear(itemId);
            this.showBanner(res.message);
            this.render();
        };
        window.advanceDays = (n) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('TIME_ADVANCE_DAY');
            CommanderEngine.advanceDays(n);
            if (CommanderEngine.RealityEditorVault?.activeEmissaryPetition?.isFirstEmissary) {
                CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('EMISSARY_FIRST_ARRIVAL');
            }
            if (CommanderEngine.CrisisEngine.activeCrisis || CommanderEngine.CrisisEngine.pendingDailyReconciliation) {
                this.stopAutoTick();
            }
            this.showBanner(`Day closed. Simulation paused — review Daily Supplies Report & select tomorrow's target.`);
            this.render();
        };
        window.dispatchCmd = (a, arg = null) => {
            const res = CommanderEngine.CampaignManager.dispatchAction(a, arg);
            if (res?.triggerVisualShock) {
                this.triggerVisualShock(res.triggerVisualShock);
            }
            this.showBanner(res?.message || 'Directive executed.');
            this.render();
        };
        window.toggleHighContrast = () => this.toggleHighContrast();
        window.recallExpedition = (expId = null) => {
            const res = CommanderEngine.ExpeditionEngine.recallExpedition(expId);
            this.showBanner(res.message);
            this.render();
        };
        window.switchBookTab = (tabId) => this.switchBookTab(tabId, true);
        window.commitHubRun = () => this.commitHubRun();
        window.closeStoryReader = () => this.closeReader();
        window.showTutorialTip = (topicId) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.(topicId, true);
            this.render();
        };
        window.dismissTutorialTip = () => {
            CommanderEngine.TutorialAdvisor?.dismiss?.();
            this.render();
        };
        window.viewTelemetry = () => {
            this.activeBookTab = 'WARBOARD';
            this.renderTelemetryReader();
            this.render();
        };
        window.viewWarBoard = () => {
            this.activeBookTab = 'WARBOARD';
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('BOOK_TAB_WARBOARD');
            this.renderWarBoardReader();
            this.render();
        };
        window.viewShadowLedger = () => {
            this.activeBookTab = 'FIELD';
            this.renderShadowLedgerReader();
            this.render();
        };
        window.viewFacilities = () => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('FACILITIES_BTN');
            this.renderFacilitiesReader();
        };
        window.viewTruthVault = () => {
            this.activeBookTab = 'TRUTH';
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('BOOK_TAB_TRUTH');
            this.renderTruthVaultReader();
            this.render();
        };
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
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('EXPEDITION_BTN');
            const res = CommanderEngine.ExpeditionEngine.launchExpedition(type, dest);
            this.showBanner(res.message);
            this.render();
        };
        window.stepExpeditionHour = (hrs = 2) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('TIME_DREAM_SKIP');
            const res = CommanderEngine.premiumStepHours(hrs);
            this.showBanner(res.message);
            this.render();
        };
        window.chronoSkip = (days = 1) => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('TIME_DREAM_SKIP');
            const res = CommanderEngine.chronoSkipDays(days);
            this.showBanner(res.message);
            this.setReaderContent(res.message);
            this.render();
        };
        window.claimDailyLogin = (force = false) => {
            const res = CommanderEngine.FacilityEngine.claimDailyLoginFragments(force);
            this.showBanner(res.message);
            this.render();
        };
        window.mintChronoSeal = (cost = 10) => {
            const res = CommanderEngine.FacilityEngine.mintChronoSealFromResources(cost);
            this.showBanner(res.message);
            this.render();
        };
        window.carveAgentRunes = (agentId) => {
            const res = CommanderEngine.AgentRosterManager.cultivateTerminusRunic(agentId);
            this.showBanner(res.message);
            if (res.success) {
                this.setReaderContent(CommanderEngine.AgentRosterManager.formatAgentStatSheet(agentId));
            }
            this.render();
        };
        window.trainAgentStat = (agentId, statKey) => {
            const res = CommanderEngine.AgentRosterManager.setTraining(agentId, statKey);
            this.showBanner(res.message);
            this.render();
        };
        window.cancelAgentTraining = (agentId) => {
            const res = CommanderEngine.AgentRosterManager.cancelAgentTraining(agentId);
            this.showBanner(res.message);
            this.render();
        };
        window.toggleMapViewMode = () => this.toggleMapViewMode();
        window.selectMapSettlement = (id) => {
            if (this._mapDragMoved) return;
            this.selectMapSettlement(id);
            this.renderExploreForestModal(false);
        };
        window.zoomOverworldMap = (delta = 0.25) => this.zoomOverworldMap(delta);
        window.panOverworldMap = (dx = 0, dy = 0) => this.panOverworldMap(dx, dy);
        window.resetOverworldMapCamera = () => this.resetOverworldMapCamera();
        window.focusOverworldParty = () => this.focusOverworldParty();
        window.handleOverworldWheel = (ev) => {
            if (ev?.preventDefault) ev.preventDefault();
            const delta = (ev?.deltaY || 0) < 0 ? 0.22 : -0.22;
            this.zoomOverworldMap(delta);
        };
        window.handleOverworldPointerDown = (ev) => {
            const pt = ev?.touches?.[0] || ev;
            if (!pt) return;
            this._isMapDragging = true;
            this._mapDragMoved = false;
            this._mapDragStartX = pt.clientX || 0;
            this._mapDragStartY = pt.clientY || 0;
            this._mapStartPanX = this.mapPanX || 0;
            this._mapStartPanY = this.mapPanY || 0;
        };
        window.handleOverworldPointerMove = (ev) => {
            if (!this._isMapDragging) return;
            const pt = ev?.touches?.[0] || ev;
            if (!pt) return;
            const dxPx = (pt.clientX || 0) - this._mapDragStartX;
            const dyPx = (pt.clientY || 0) - this._mapDragStartY;
            if (Math.hypot(dxPx, dyPx) > 4) {
                this._mapDragMoved = true;
            }
            const svg = typeof document !== 'undefined' ? document.getElementById('overworld-fullscreen-svg') : null;
            const rect = svg?.getBoundingClientRect?.() || { width: 800, height: 800 };
            const scaleFactorX = 4000 / Math.max(120, rect.width || 800) / (this.mapZoom || 2.2);
            const scaleFactorY = 4000 / Math.max(120, rect.height || 800) / (this.mapZoom || 2.2);
            this.mapPanX = Math.max(-1950, Math.min(1950, Number((this._mapStartPanX + dxPx * scaleFactorX).toFixed(1))));
            this.mapPanY = Math.max(-1950, Math.min(1950, Number((this._mapStartPanY + dyPx * scaleFactorY).toFixed(1))));
            this.applyOverworldMapTransform();
        };
        window.handleOverworldPointerUp = () => {
            this._isMapDragging = false;
            setTimeout(() => { this._mapDragMoved = false; }, 60);
        };
        window.handleOverworldMapClick = (ev) => {
            if (this._mapDragMoved) return;
            const svg = typeof document !== 'undefined' ? document.getElementById('overworld-fullscreen-svg') : null;
            const rect = svg?.getBoundingClientRect?.() || { left: 0, top: 0, width: 800, height: 800 };
            const clientX = ev?.clientX ?? (rect.left + rect.width * 0.5);
            const clientY = ev?.clientY ?? (rect.top + rect.height * 0.5);
            // Preserve aspect ratio xMidYMid meet mapping into 4000x4000 viewBox
            const side = Math.min(Math.max(120, rect.width || 800), Math.max(120, rect.height || 800));
            const offsetX = ((rect.width || 800) - side) * 0.5;
            const offsetY = ((rect.height || 800) - side) * 0.5;
            const svgX = ((clientX - rect.left - offsetX) / side) * 4000;
            const svgY = ((clientY - rect.top - offsetY) / side) * 4000;
            const z = this.mapZoom || 2.2;
            const worldX = Math.round(((svgX - 2000) / z) + 2000 - (this.mapPanX || 0));
            const worldY = Math.round(((svgY - 2000) / z) + 2000 - (this.mapPanY || 0));
            window.setWaypoint(worldX, worldY, { instantArrival: false });
        };
        window.setWaypoint = (worldX, worldY, opts = {}) => {
            const ovw = CommanderEngine.ForestOverworldEngine;
            if (!ovw) return;
            const isHeadlessEnv = typeof window === 'undefined' || Boolean(window.isHeadless) || !document?.getElementById('overworld-terrain-canvas');
            const res = ovw.setWaypoint(worldX, worldY, {
                ...opts,
                instantArrival: opts.instantArrival !== undefined ? opts.instantArrival : isHeadlessEnv
            });
            if (res?.message) this.showBanner(res.message);
            if (ovw.isMoving && !isHeadlessEnv) {
                this.startOverworldMovementLoop();
            } else {
                this.renderExploreForestModal(false);
                this.renderWarBoardReader();
                this.render();
            }
            return res;
        };
        window.openTacticalEncounter = (id = null) => {
            this.openTacticalEncounterModal(id);
            this.renderExploreForestModal(false);
        };
        window.executeEncounterAction = (act) => {
            const res = this.executeTacticalEncounterAction(act);
            this.renderExploreForestModal(false);
            return res;
        };
        window.closeTacticalEncounter = () => {
            this.activeEncounterState = null;
            this.renderWarBoardReader();
            this.renderExploreForestModal(false);
        };
        window.scoutFogOfWarNode = (targetName) => {
            CommanderEngine.CampaignManager.revealFogOfWarNode?.(targetName);
            const res = CommanderEngine.ExpeditionEngine.launchExpedition('PATROL_MIST', targetName);
            this.showBanner(`🌫️🧭 [FOG OF WAR RECON] Dispatched Mist-Recon Squad to lift the Outer Horizon Fog around [${targetName}]! ${res.message}`);
            this.renderWarBoardReader();
            this.renderExploreForestModal(false);
            this.render();
        };
        window.openExploreForest = () => {
            const isSov = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN';
            const fe = CommanderEngine.FacilityEngine;
            const exploreUnlocked = isSov || Boolean(fe?.facilities?.exploration_observatory?.unlocked || fe?.facilities?.training_grounds?.unlocked);
            if (!exploreUnlocked) {
                this.showBanner('🔒 [FACILITY REQUIRED] Construct or upgrade the [🌲🧭 Forward Recon Outpost] or [🏋️ Forward Recon Training Grounds] in the Fallout Shelter Facility Grid to unlock the Explore Forest Overworld Pop-Up Map!');
                this.renderFacilitiesReader('exploration_observatory');
                this.render();
                return { success: false, gated: true };
            }
            this.closeFacilityModal();
            this.activeBookTab = 'WARBOARD';
            this.mapViewMode = 'TACTICAL_MAP';
            this.showBanner(isSov
                ? '🐺🌲 [PREDATOR OVERWORLD POP-UP MAP] Stalking the Dark Forest as The Pale Sovereign! Tap any node or caravan to STALK, HUNT, ATTACK & FEED!'
                : '🌲🧭 [EXPLORE FOREST OVERWORLD POP-UP] Mount & Blade Squad Overview Map active! Tap any parish node to navigate your trained squad across the forest!');
            this.renderWarBoardReader();
            this.renderExploreForestModal();
            this.render();
            return { success: true };
        };
        window.closeExploreForestModal = () => {
            const modal = document.getElementById('explore-forest-popup-modal');
            if (modal) modal.style.display = 'none';
        };
        window.queueAgentTrainingPreset = (agentId, preset = 'RECON') => {
            const presets = {
                RECON: ['STEALTH', 'SURVIVAL', 'DODGE'],
                VANGUARD: ['MELEE_ATT', 'TOUGHNESS', 'MELEE_DEF'],
                ARCHIVIST: ['LORE', 'SURVIVAL', 'ATHLETICS']
            };
            const list = presets[String(preset || 'RECON').toUpperCase()] || presets.RECON;
            const res = CommanderEngine.AgentRosterManager.queueAgentTraining(agentId, list);
            this.showBanner(res.message);
            this.render();
        };
        window.closeFacilityModal = () => {
            const modal = document.getElementById('fallout-facility-popup-modal');
            if (modal) modal.style.display = 'none';
        };
        window.openFacilitySection = (facId) => {
            const f = CommanderEngine.FacilityEngine?.facilities?.[facId];
            if (!f) return;
            this.closeFacilityModal();
            if (facId === 'exploration_observatory' || facId === 'training_grounds') {
                window.openExploreForest();
            } else if (facId === 'guard_barracks' || facId === 'armory_market' || facId === 'runic_carving_facility') {
                this.switchBookTab('GARRISON');
            } else if (facId === 'war_table') {
                window.viewWarBoard();
            } else if (facId === 'inquest_chamber') {
                window.viewShadowLedger();
            } else {
                this.switchBookTab('COMMAND');
            }
        };
        window.navigateOverworldSquad = (nodeId) => {
            this.selectedMapSettlementId = Number(nodeId) || 0;
            const res = CommanderEngine.ForestOverworldEngine?.navigateSquadToNode?.(nodeId);
            if (res?.message) this.showBanner(res.message);
            this.renderWarBoardReader();
            this.renderExploreForestModal(false);
            this.render();
        };
        window.executeOverworldAction = (act, targetId = null) => {
            const res = CommanderEngine.ForestOverworldEngine?.executePredatorOrSquadAction?.(act, targetId);
            if (res?.message) this.showBanner(res.message);
            this.renderWarBoardReader();
            this.renderExploreForestModal(false);
            this.render();
        };
        window.setOverworldStance = (stance) => {
            const res = CommanderEngine.ForestOverworldEngine?.setStance?.(stance);
            if (res?.message) this.showBanner(res.message);
            this.renderWarBoardReader();
            this.renderExploreForestModal(false);
            this.render();
        };
        window.interrogateSuspect = (targetId = 'agt_2') => {
            CommanderEngine.TutorialAdvisor?.checkAndTrigger?.('INQUEST_BTN');
            this.renderInquestReader(targetId);
        };
        window.renderVerdict = (targetId, vType) => {
            const res = CommanderEngine.InterrogationDesk.renderVerdict(targetId, vType);
            this.showBanner(res?.message || 'Verdict rendered.');
            if (res?.transcript) {
                this.setReaderContent(res.transcript, null, null);
            }
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
        window.selectArchiveSectionDropdown = (val) => {
            const v = String(val || 'COMMAND').toUpperCase();
            if (v === 'FACILITIES') {
                window.viewFacilities();
            } else if (v === 'EXPLORE_FOREST') {
                window.openExploreForest();
            } else if (v === 'TRUTH') {
                window.viewTruthVault();
            } else if (v === 'WARBOARD') {
                window.viewWarBoard();
            } else if (v === 'TRAINING_GROUNDS') {
                this.switchBookTab('GARRISON');
            } else {
                this.switchBookTab(v);
            }
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

    closeFacilityModal() {
        const modal = typeof document !== 'undefined' ? document.getElementById('fallout-facility-popup-modal') : null;
        if (modal) modal.style.display = 'none';
    },

    renderFacilitiesReader(highlightFacId = null) {
        const fe = CommanderEngine.FacilityEngine;
        if (!fe) return;
        let text = "================================================================================\n";
        text += "🏗️ FALLOUT SHELTER FACILITY GRID, PIPELINE & VILLAGE GUARD GENERATION\n";
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
        this.renderFalloutFacilityModal(highlightFacId);
    },

    renderFalloutFacilityModal(highlightFacId = null) {
        const fe = CommanderEngine.FacilityEngine;
        const modal = typeof document !== 'undefined' ? document.getElementById('fallout-facility-popup-modal') : null;
        if (!fe || !modal) return;
        const pipelineChain = [
            ['guard_barracks', '1. BARRACKS (Muster Troops)'],
            ['training_grounds', '2. TRAINING GROUNDS (9-Stat Queues)'],
            ['armory_market', '3. ARMORY MARKET (Equip Gear)'],
            ['runic_carving_facility', '4. RUNIC SCRIPTORIUM (Tiers I–VIII)'],
            ['exploration_observatory', '5. RECON OUTPOST (Explore Forest Map)'],
            ['war_table', '6. WAR TABLE (19-House Dominion)']
        ];
        const pipelineHtml = pipelineChain.map(([id, label]) => {
            const fac = fe.facilities[id];
            const on = fac?.unlocked;
            return `<span style="padding:2px 6px; border-radius:3px; font-size:8.5px; font-weight:bold; background:${on ? '#14532d' : '#1e293b'}; border:1px solid ${on ? '#4ade80' : '#475569'}; color:${on ? '#dcfce7' : '#94a3b8'};">${on ? '✅' : '🔒'} ${label}</span>`;
        }).join('<span style="color:#f59e0b; font-weight:bold; font-size:10px;"> ➔ </span>');

        const cardsHtml = Object.values(fe.facilities).map(f => {
            const isHi = highlightFacId === f.id;
            const upgCost = f.unlocked ? Math.max(6, Math.round((f.cost || 6) * (1 + f.level * 0.5))) : f.cost;
            const borderCol = isHi ? '#38bdf8' : (f.unlocked ? '#22c55e' : '#64748b');
            const bgGrad = f.unlocked
                ? 'linear-gradient(180deg, rgba(20,83,45,0.35) 0%, rgba(9,13,14,0.95) 100%)'
                : 'linear-gradient(180deg, rgba(30,41,59,0.5) 0%, rgba(9,13,14,0.95) 100%)';
            return `
                <div style="border:2px solid ${borderCol}; background:${bgGrad}; padding:8px; border-radius:5px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:${isHi ? '0 0 14px rgba(56,189,248,0.5)' : 'none'};">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:3px; margin-bottom:4px;">
                            <span style="font-family:'Cinzel',serif; font-weight:900; font-size:10px; color:${f.unlocked ? '#86efac' : '#cbd5e1'};">${f.name}</span>
                            <span style="font-size:8.5px; font-weight:bold; padding:1px 5px; border-radius:3px; background:${f.unlocked ? '#166534' : '#334155'}; color:#fff;">${f.unlocked ? `LV.${f.level}` : 'LOCKED'}</span>
                        </div>
                        <div style="font-size:8.5px; color:#cbd5e1; line-height:1.3; margin-bottom:6px;">${f.unlocksDesc}</div>
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${f.id !== 'scriptorium'
                            ? `<button class="cmd-btn" style="flex:1; padding:4px 6px; font-size:9px; background:${f.unlocked ? '#1e3a8a' : '#3b2410'}; border-color:${f.unlocked ? '#60a5fa' : '#f59e0b'}; color:#fff; font-weight:bold;" onclick="window.unlockFacility('${f.id}')">${f.unlocked ? `⬆️ Upgrade Lv.${f.level + 1} (${upgCost}r)` : `🔨 Build Room (${upgCost}r)`}</button>`
                            : `<span style="font-size:8.5px; color:#86efac; font-weight:bold;">🏛️ Core Command Room Active</span>`
                        }
                        ${f.unlocked
                            ? `<button class="cmd-btn" style="padding:4px 7px; font-size:9px; background:#14532d; border-color:#4ade80; color:#dcfce7; font-weight:bold;" onclick="window.openFacilitySection('${f.id}')">🚪 Enter Section</button>`
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');

        modal.style.display = 'block';
        modal.innerHTML = `
            <div style="border:2px solid #f59e0b; background:linear-gradient(180deg,#111827 0%,#07090e 100%); padding:12px; border-radius:6px; box-shadow:0 16px 40px rgba(0,0,0,0.95); margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #78350f; padding-bottom:6px; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div>
                        <div style="font-family:'Cinzel',serif; font-weight:900; font-size:13px; color:#fde68a;">🏗️ FALLOUT SHELTER BASE VAULT // INTERCONNECTED FACILITY ROOM GRID</div>
                        <div style="font-size:9.5px; color:#94a3b8;">Resources: <b style="color:#4ade80;">${fe.settlementResources}u</b> | Prosperity: <b style="color:#38bdf8;">${fe.settlementProsperity}%</b> | Village Guards: <b style="color:#fde68a;">${fe.villageGuardsCurrent}/${fe.villageGuardsMaxThreshold}</b> | Chrono-Seals: <b style="color:#c084fc;">${fe.chronoSeals}💎</b></div>
                    </div>
                    <button class="cmd-btn" style="background:#3f1212; border-color:#ef4444; color:#fecaca; padding:4px 10px; font-size:10px; font-weight:bold;" onclick="window.closeFacilityModal()">✖ Close Facility Vault</button>
                </div>
                <div style="background:rgba(15,23,42,0.9); border:1px solid #334155; padding:6px 8px; border-radius:4px; margin-bottom:8px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                    <span style="font-size:9px; font-weight:bold; color:#fbbf24; margin-right:4px;">🔗 FACILITY PIPELINE:</span>
                    ${pipelineHtml}
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(235px, 1fr)); gap:8px;">
                    ${cardsHtml}
                </div>
            </div>
        `;
    },

    buildEncounterArenaHtml(isSov = false) {
        const enc = this.activeEncounterState;
        if (!enc) return '';
        const pPct = Math.max(5, Math.min(100, Math.round((enc.playerHp / enc.playerMaxHp) * 100)));
        const ePct = Math.max(0, Math.min(100, Math.round((enc.enemyHp / enc.enemyMaxHp) * 100)));
        return `
            <div style="margin-top:8px; border:2px solid #dc2626; background:linear-gradient(180deg,#140c0a 0%,#090605 100%); padding:10px; color:#f8fafc; border-radius:6px; box-shadow:0 12px 28px rgba(0,0,0,0.95);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #7f1d1d; padding-bottom:5px; margin-bottom:8px;">
                    <span style="font-family:'Cinzel',serif; font-weight:900; font-size:12px; color:#fca5a5;">⚔️ TACTICAL ENCOUNTER ARENA // ${enc.settlementName.toUpperCase()} (${enc.houseName} — Round ${enc.round})</span>
                    <button class="cmd-btn" style="background:#3f1212; border-color:#ef4444; color:#fecaca; padding:2px 8px; font-size:9px;" onclick="window.closeTacticalEncounter()">✖ Close Arena</button>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px; font-size:9.5px;">
                    <div style="background:#1e293b; border:1px solid #38bdf8; padding:6px;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#bae6fd;">
                            <span>${isSov ? '🐺' : '🛡️'} ${enc.playerName} (Tier ${enc.cultTier}/8)</span>
                            <span>HP: ${enc.playerHp}/${enc.playerMaxHp} | Stam: ${enc.playerStamina}</span>
                        </div>
                        <div style="height:7px; background:#090d0e; border:1px solid #334155; margin-top:4px;">
                            <div style="width:${pPct}%; height:100%; background:#22c55e;"></div>
                        </div>
                    </div>
                    <div style="background:#2a1212; border:1px solid #ef4444; padding:6px;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#fecaca;">
                            <span>🏰 ${enc.enemyName} (Power ${enc.housePower})</span>
                            <span>HP: ${enc.enemyHp}/${enc.enemyMaxHp} | [${enc.houseStatus}]</span>
                        </div>
                        <div style="height:7px; background:#090d0e; border:1px solid #450a0a; margin-top:4px;">
                            <div style="width:${ePct}%; height:100%; background:#ef4444;"></div>
                        </div>
                    </div>
                </div>
                <div style="background:#07090a; border:1px solid #334155; padding:6px 8px; max-height:95px; overflow-y:auto; font-family:'Share Tech Mono',monospace; font-size:9.5px; color:#e2e8f0; margin-bottom:8px;">
                    ${enc.combatLogs.map(l => `<div style="margin-bottom:3px;">• ${l}</div>`).join('')}
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${enc.resolved
                        ? `<button class="cmd-btn" style="flex:1; background:#14532d; border-color:#22c55e; color:#dcfce7; padding:6px;" onclick="window.closeTacticalEncounter()">✅ Conclude Engagement &amp; Return to Dominion Map</button>`
                        : `
                            <button class="cmd-btn" style="flex:1; padding:5px; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.executeEncounterAction('STRIKE')">${isSov ? '🩸 Predator Rend (Strike)' : '⚔️ Vanguard Assault (Strike)'}</button>
                            <button class="cmd-btn" style="flex:1; padding:5px; background:#451a03; border-color:#f59e0b; color:#fde68a;" onclick="window.executeEncounterAction('RUNIC_SURGE')">${isSov ? '❄️ Frost-Herald Swarm (-25 Stam)' : '🔥 Foundation Fire Surge (-25 Stam)'}</button>
                            <button class="cmd-btn" style="flex:1; padding:5px; background:#2e1065; border-color:#a855f7; color:#f3e8ff;" onclick="window.executeEncounterAction('CAUSAL_WARP')">⚡ Causal Combat Warp (-20 Stam, 0 Dmg)</button>
                            <button class="cmd-btn" style="padding:5px 10px;" onclick="window.executeEncounterAction('RETREAT')">🛡️ Withdraw</button>
                        `
                    }
                </div>
            </div>
        `;
    },

    renderWarBoardReader() {
        const board = CommanderEngine.CampaignManager.getWarBoard() || [];
        const settlementsForLog = CommanderEngine.CampaignManager.getBedrockTelemetry({
            allowTwentyFirst: CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false
        }) || [];
        const clearedCount = settlementsForLog.filter(s => CommanderEngine.CampaignManager.isSettlementInForestZone?.(s)).length;
        const foggedCount = Math.max(0, settlementsForLog.length - clearedCount);
        let text = "================================================================================\n";
        text += "🏰 THE 19 NOBLE HOUSES & FEUDAL WAR BOARD\n";
        text += "   Power Rating (0-100) = Composite Index of Garrison Strength, Barrier Fuel & Monopoly Leverage\n";
        text += `   🌲 Inner Forest Zone Cleared: ${clearedCount} Parishes | 🌫️ Outer Horizon Fog of War: ${foggedCount} Unscouted Sectors\n`;
        text += "================================================================================\n\n";
        text += "👑 THE 9 BLESSED HOUSES (MAJOR MONOPOLIES):\n";
        board.filter(h => h.blessed).forEach((h, i) => {
            const pCtx = CommanderEngine.RealityEditorVault?.getHousePowerContext?.(h.name, h.power) || `Power: ${h.power}/100`;
            text += `  ${i + 1}. ${h.name.padEnd(16, ' ')} | Monopoly: ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | ${pCtx}\n`;
        });
        text += "\n⚔️ THE 10 CHALLENGER HOUSES:\n";
        board.filter(h => !h.blessed).forEach((h, i) => {
            const pCtx = CommanderEngine.RealityEditorVault?.getHousePowerContext?.(h.name, h.power) || `Power: ${h.power}/100`;
            text += `  ${i + 10}. ${h.name.padEnd(16, ' ')} | Output:   ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | ${pCtx}\n`;
        });
        this.setReaderContent(text);

        const visualDeck = document.getElementById('brutalist-subpage-deck');
        if (visualDeck) {
            const rowsHtml = board.slice(0, 6).map((h, idx) => `
                <div style="background:${idx === 0 ? 'linear-gradient(90deg,#8c4f19,#5c3412)' : 'linear-gradient(160deg,#d7ccb8,#b8a88e)'}; color:${idx === 0 ? '#fde68a' : '#1c1610'}; border:1.5px solid #4a3e2e; padding:4px 7px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center; font-size:9.5px; font-weight:bold;">
                    <span style="font-family:'Cinzel',serif;">${h.name.toUpperCase()}</span>
                    <span style="font-size:8.5px;" title="Composite of Garrison Strength, Barrier Fuel & Monopoly Leverage">POWER: ${h.power}/100 (RANK #${idx + 1}/19) [POSTURE: ${h.status}]</span>
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

            const settlements = CommanderEngine.CampaignManager.getBedrockTelemetry({
                allowTwentyFirst: CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false
            }) || [];
            const ovw = CommanderEngine.ForestOverworldEngine || { partyNodeId: 1, partyX: 198, partyY: 82, stance: 'MARCH', movementTrail: [], movingTargetEntities: [], overworldLogs: [] };
            const selNode = settlements.find(s => Number(s.id) === Number(this.selectedMapSettlementId)) || settlements[1] || { id: 1, name: 'Oakhaven', house: 'House Oakheart', barrierFuel: 50, chainsIntegrity: 100 };
            const selHouse = board.find(w => w.name === selNode.house) || { name: selNode.house, power: 65, status: 'PEACE', monopoly: 'Ironwood' };
            const isSov = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN';
            const selNodeCleared = CommanderEngine.CampaignManager.isSettlementInForestZone?.(selNode) ?? (Number(selNode.id) <= 10);

            const svgNodes = settlements.map((s, i) => {
                const coords = ovw.getSettlementCoords ? ovw.getSettlementCoords(s, i, settlements.length || 20) : { x: 2000, y: 2000 };
                const cx = coords.x;
                const cy = coords.y;
                if (i === 0) {
                    return `<g style="cursor:pointer;" onclick="window.navigateOverworldSquad(0)"><rect x="${cx - 45}" y="${cy - 45}" width="90" height="90" fill="#1e1b4b" stroke="#fbbf24" stroke-width="10"/><text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="#fde68a" font-size="52">👑</text></g>`;
                }
                const isForestInner = Number(s.id) >= 1 && Number(s.id) <= 10 && Number(s.id) !== 7;
                const isRevealed = (CommanderEngine.CampaignManager.isSettlementInForestZone?.(s) ?? isForestInner)
                    || (ovw.isCoordInLiveSight && ovw.isCoordInLiveSight(cx, cy));
                const hEntry = board.find(w => w.name === s.house);
                const isSelected = Number(s.id) === Number(selNode.id);
                const isPartyHere = Number(s.id) === Number(ovw.partyNodeId);
                const isHostile = hEntry?.status === 'WAR_PREP' || hEntry?.status === 'SKIRMISH' || s.chainsIntegrity < 50;
                const fillCol = !isRevealed ? '#334155' : (isPartyHere ? '#a855f7' : (isSelected ? '#38bdf8' : (isHostile ? '#dc2626' : (hEntry?.status === 'ALLIED' ? '#10b981' : '#d97706'))));
                const labelTxt = isRevealed ? s.name.slice(0, 10) : '🌫️ [FOGGED]';
                return `
                    <g style="cursor:pointer;" opacity="${isRevealed ? '1' : '0.45'}" onclick="window.navigateOverworldSquad(${s.id})">
                        <circle cx="${cx}" cy="${cy}" r="${isSelected || isPartyHere ? '46' : '32'}" fill="${fillCol}" stroke="#090d0e" stroke-width="8"/>
                        <text x="${cx}" y="${cy - 54}" text-anchor="middle" fill="${isSelected ? '#7dd3fc' : (isRevealed ? '#e2d1b0' : '#94a3b8')}" font-size="44" font-weight="bold">${labelTxt}</text>
                    </g>
                `;
            }).join('');

            const preyNodesSvg = (ovw.movingTargetEntities || []).filter(p => p.alive && ((ovw.isCoordInLiveSight && ovw.isCoordInLiveSight(p.x, p.y)) || p.stalkedLevel > 0)).map(p => `
                <g style="cursor:pointer;" onclick="window.executeOverworldAction('HUNT_PREY','${p.id}')">
                    <circle cx="${p.x}" cy="${p.y}" r="34" fill="${isSov ? '#991b1b' : '#b45309'}" stroke="#fde68a" stroke-width="6" stroke-dasharray="10,6"/>
                    <text x="${p.x}" y="${Number(p.y) + 14}" text-anchor="middle" font-size="40">${p.type === 'APEX_BEAST' ? '🦌' : '📦'}</text>
                </g>
            `).join('');

            const trailPoints = (ovw.movementTrail || []).map(pt => `${pt.x},${pt.y}`).join(' ');
            const trailSvg = (ovw.movementTrail && ovw.movementTrail.length > 1)
                ? `<polyline points="${trailPoints}" fill="none" stroke="${isSov ? '#ef4444' : '#38bdf8'}" stroke-width="12" stroke-dasharray="22,14" opacity="0.85"/>`
                : '';

            const px = ovw.partyX || 2260;
            const py = ovw.partyY || 2180;
            const partyTokenSvg = `
                <g pointer-events="none">
                    <circle cx="${px}" cy="${py}" r="${ovw.sightRadius || 340}" fill="none" stroke="${isSov ? 'rgba(239,68,68,0.45)' : 'rgba(56,189,248,0.45)'}" stroke-width="8" stroke-dasharray="20,12"/>
                    <circle cx="${px}" cy="${py}" r="58" fill="${isSov ? 'rgba(220,38,38,0.28)' : 'rgba(56,189,248,0.25)'}" stroke="${isSov ? '#ef4444' : '#38bdf8'}" stroke-width="10"/>
                    <text x="${px}" y="${Number(py) + 18}" text-anchor="middle" font-size="56">${isSov ? '🐺' : '🛡️'}</text>
                    <text x="${px}" y="${Number(py) + 92}" text-anchor="middle" fill="${isSov ? '#fca5a5' : '#bae6fd'}" font-size="38" font-weight="900">${isSov ? `SOVEREIGN [${ovw.stance}]` : `SQUAD [${ovw.stance}]`}</text>
                </g>
            `;

            const encounterOverlayHtml = this.buildEncounterArenaHtml(isSov);

            visualDeck.style.display = 'block';
            visualDeck.innerHTML = `
                <div class="brutalist-top-crest" style="margin-top:6px;">
                    <div class="brutalist-crest-title">THE WAR BOARD &amp; TELEMETRY READER</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">
                        <span>// PAGE 5: SPATIAL PROBABILITY</span>
                        <button class="cmd-btn" style="padding:2px 7px; font-size:8.5px; border-color:#38bdf8; color:#bae6fd;" onclick="window.toggleMapViewMode()">
                            ${this.mapViewMode === 'TACTICAL_MAP' ? '📜 Auditor\'s Retreat: Classic Ledger' : '🗺️ Tactical Dominion Map'}
                        </button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1.25fr; gap:10px;">
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.8); padding:8px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:11px; font-weight:bold; margin-bottom:6px;">[19-HOUSE TABLE]</div>
                            ${rowsHtml}
                        </div>
                        <div class="burden-parchment-card" style="padding:6px 8px; margin-top:6px;">
                            <div style="font-family:'Cinzel',serif; font-weight:900; font-size:10px; border-bottom:1px solid #4a3e2e; margin-bottom:4px; color:#5e110b;">
                                🎯 SELECTED NODE: ${selNodeCleared ? `${selNode.name.toUpperCase()} (${selNode.house})` : `🌫️ OUTER HORIZON FOG — UNCHARTED SECTOR #${selNode.id}`}
                            </div>
                            <div style="font-size:8.5px; color:#1c1610; margin-bottom:5px;">
                                ${selNodeCleared
                                    ? `<b>Region:</b> ${Number(selNode.id) <= 10 ? 'Inner Dark Forest Zone (Cleared)' : 'Outer Mountain/Horizon Ring (Scouted)'} | <b>Power:</b> ${selHouse.power}/100 [${selHouse.status}] | <b>Fuel:</b> ${selNode.barrierFuel}u | <b>Chains:</b> ${selNode.chainsIntegrity}%`
                                    : `<b>Status:</b> Obscured by Outer Event-Horizon Fog of War (Outside the Inner Forest Zone). Dispatch a Mist-Recon Patrol to lift the fog and reveal telemetry!`
                                }
                            </div>
                            <div style="display:flex; gap:4px; flex-wrap:wrap;">
                                <button class="cmd-btn" style="padding:3px 7px; font-size:8.5px; background:#14532d; border-color:#22c55e; color:#dcfce7;" onclick="window.navigateOverworldSquad(${selNode.id})">🧭 March Squad Here</button>
                                ${!selNodeCleared
                                    ? `<button class="cmd-btn" style="padding:3px 8px; font-size:9px; background:#0f172a; border-color:#38bdf8; color:#bae6fd;" onclick="window.scoutFogOfWarNode('${selNode.name}')">🌫️🧭 Dispatch Mist-Recon Patrol (Lift Fog of War)</button>`
                                    : `
                                        <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.openTacticalEncounter(${selNode.id})">${isSov ? '🐺 Attack &amp; Devour Parish' : '⚔️ Tactical Encounter'}</button>
                                        ${isSov
                                            ? `
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#2e1065; border-color:#a855f7; color:#f3e8ff;" onclick="window.executeOverworldAction('STALK')">🐾 Stalk Prey</button>
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#450a0a; border-color:#dc2626; color:#fecaca;" onclick="window.executeOverworldAction('HUNT_PREY')">🩸 Hunt &amp; Pounce</button>
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#3b0764; border-color:#e879f9; color:#fae8ff;" onclick="window.executeOverworldAction('FEED')">🥩 Feed &amp; Gorge</button>
                                            `
                                            : `
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px;" onclick="window.executeOverworldAction('STALK')">🏹 Recon Stalk</button>
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px;" onclick="window.executeOverworldAction('HUNT_PREY')">⚔️ Intercept Convoy</button>
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px;" onclick="window.executeOverworldAction('FEED')">⛺ Camp &amp; Forage</button>
                                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px;" onclick="window.sendExpedition('GUARDED_CARAVAN','${selNode.name}')">🛡️ Caravan</button>
                                            `
                                        }
                                    `
                                }
                            </div>
                        </div>
                    </div>
                    <div style="border:1px solid #383e40; background:rgba(9,13,14,0.85); padding:8px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                            <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:10.5px; font-weight:bold;">
                                ${isSov ? '🐺 PREDATOR OVERWORLD MAP // STALK, HUNT, ATTACK &amp; FEED' : '🧭 MOUNT &amp; BLADE FOREST OVERWORLD // SQUAD NAVIGATION'}
                            </div>
                            <div style="display:flex; gap:3px;">
                                <button class="cmd-btn" style="padding:1px 5px; font-size:8px; ${ovw.stance === 'MARCH' ? 'border-color:#22c55e; color:#86efac;' : ''}" onclick="window.setOverworldStance('MARCH')">${isSov ? '🐺 Prowl' : '🛡️ March'}</button>
                                <button class="cmd-btn" style="padding:1px 5px; font-size:8px; ${ovw.stance === 'STALK' ? 'border-color:#a855f7; color:#e9d5ff;' : ''}" onclick="window.setOverworldStance('STALK')">🐾 Stalk</button>
                                <button class="cmd-btn" style="padding:1px 5px; font-size:8px; ${ovw.stance === 'HUNT' ? 'border-color:#ef4444; color:#fecaca;' : ''}" onclick="window.setOverworldStance('HUNT')">${isSov ? '🩸 Hunt' : '⚔️ Raid'}</button>
                            </div>
                        </div>
                        <svg viewBox="0 0 4000 4000" style="width:100%; height:136px; display:block; margin:2px auto; background:radial-gradient(circle at 50% 50%, rgba(20,83,45,0.34) 0%, rgba(15,23,42,0.92) 56%, rgba(5,7,9,0.98) 100%); border:1px solid #2b3234;">
                            ${trailSvg}
                            ${svgNodes}
                            ${preyNodesSvg}
                            ${partyTokenSvg}
                        </svg>
                        <div class="burden-parchment-card" style="padding:5px 7px;">
                            <div style="font-family:'Cinzel',serif; font-weight:900; font-size:9px; border-bottom:1px solid #4a3e2e; margin-bottom:2px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                                <span>[${isSov ? 'PREDATOR HUNT &amp; FEEDING TELEMETRY' : 'OVERWORLD SQUAD NAVIGATION LOG'}]</span>
                                <span style="color:#5e110b;">⛺ SUPPLIES: ${ovw.suppliesDaysRemaining ?? 3}/${ovw.maxSuppliesDays ?? 3} DAYS | DIST FROM CAMP: ${ovw.distanceFromCampHours ?? 0}H (${Number(((ovw.distanceFromCampHours ?? 0) * (0.5 / (CommanderEngine.timeScale || 1))).toFixed(2))}H IRL)</span>
                            </div>
                            <div style="font-size:8px; color:#1c1610; max-height:38px; overflow-y:auto;">
                                ${(ovw.overworldLogs || []).slice(0, 2).map(l => `<div style="margin-bottom:2px;">• ${l}</div>`).join('') || auditHtml}
                            </div>
                        </div>
                    </div>
                </div>
                ${encounterOverlayHtml}
            `;
        }
    },

    renderExploreForestModal(forceOpen = true) {
        const modal = typeof document !== 'undefined' ? document.getElementById('explore-forest-popup-modal') : null;
        if (!modal) return;
        if (!forceOpen && modal.style.display === 'none') return;

        const board = CommanderEngine.CampaignManager.getWarBoard() || [];
        const settlements = CommanderEngine.CampaignManager.getBedrockTelemetry({
            allowTwentyFirst: CommanderEngine.ShadowInfluenceEngine?.isEpitaphRevealed?.() || false
        }) || [];
        const ovw = CommanderEngine.ForestOverworldEngine || { partyNodeId: 1, partyX: 2260, partyY: 2180, stance: 'MARCH', movementTrail: [], movingTargetEntities: [], overworldLogs: [] };
        if (forceOpen && !this._mapCameraInitialized) {
            this.mapZoom = 2.2;
            this.mapPanX = Number((2000 - (ovw.partyX || 2260)).toFixed(1));
            this.mapPanY = Number((2000 - (ovw.partyY || 2180)).toFixed(1));
            this._mapCameraInitialized = true;
        }
        const z = Number(this.mapZoom || 2.2);
        const selNode = settlements.find(s => Number(s.id) === Number(this.selectedMapSettlementId)) || settlements[1] || { id: 1, name: 'Oakhaven', house: 'House Oakheart', barrierFuel: 50, chainsIntegrity: 100 };
        const selHouse = board.find(w => w.name === selNode.house) || { name: selNode.house, power: 65, status: 'PEACE', monopoly: 'Ironwood' };
        const isSov = CommanderEngine.CampaignManager.campaignMode === 'SOVEREIGN';
        const selNodeCleared = CommanderEngine.CampaignManager.isSettlementInForestZone?.(selNode) ?? (Number(selNode.id) <= 10);
        const selCoords = ovw.getSettlementCoords ? ovw.getSettlementCoords(selNode, 1, settlements.length || 20) : { x: 2260, y: 2180 };

        const svgNodes = settlements.map((s, i) => {
            const coords = ovw.getSettlementCoords ? ovw.getSettlementCoords(s, i, settlements.length || 20) : { x: 2000, y: 2000 };
            const cx = coords.x;
            const cy = coords.y;
            const isSelected = Number(s.id) === Number(selNode.id);
            const isPartyHere = Number(s.id) === Number(ovw.partyNodeId) && Math.hypot((ovw.partyX || 2000) - cx, (ovw.partyY || 2000) - cy) < 90;
            const isForestInner = Number(s.id) >= 1 && Number(s.id) <= 10 && Number(s.id) !== 7;
            const isRevealed = (CommanderEngine.CampaignManager.isSettlementInForestZone?.(s) ?? isForestInner)
                || (ovw.isCoordInLiveSight && ovw.isCoordInLiveSight(cx, cy));
            const hEntry = board.find(w => w.name === s.house);
            const isHostile = hEntry?.status === 'WAR_PREP' || hEntry?.status === 'SKIRMISH' || s.chainsIntegrity < 50;
            const fillCol = !isRevealed ? '#334155' : (isPartyHere ? '#a855f7' : (isSelected ? '#38bdf8' : (isHostile ? '#dc2626' : (hEntry?.status === 'ALLIED' ? '#10b981' : '#d97706'))));
            const showLabel = i === 0 || isSelected || isPartyHere || z >= 1.35 || (isRevealed && isForestInner && z >= 1.0);
            const fontSize = Math.round(Math.max(22, Math.min(54, 42 / Math.sqrt(z))));
            const nodeR = Math.round(Math.max(18, Math.min(38, (isSelected || isPartyHere ? 34 : 26) / Math.sqrt(z))));
            const labelTxt = isRevealed ? s.name : '🌫️ Uncharted';
            if (i === 0) {
                return `
                    <g style="cursor:pointer;" onclick="event.stopPropagation(); window.selectMapSettlement(0); window.setWaypoint(${cx}, ${cy}, { nodeId: 0, label: 'The Capital', instantArrival: false });">
                        <rect x="${cx - 34}" y="${cy - 34}" width="68" height="68" rx="8" fill="#1e1b4b" stroke="#fbbf24" stroke-width="6"/>
                        <text x="${cx}" y="${cy + 13}" text-anchor="middle" fill="#fde68a" font-size="38">👑</text>
                        <text x="${cx}" y="${cy - 46}" text-anchor="middle" fill="#fde68a" font-size="${fontSize}" font-weight="900">THE CAPITAL</text>
                    </g>
                `;
            }
            return `
                <g style="cursor:pointer;" opacity="${isRevealed ? '1' : '0.48'}" onclick="event.stopPropagation(); window.selectMapSettlement(${s.id}); window.setWaypoint(${cx}, ${cy}, { nodeId: ${s.id}, label: '${s.name.replace(/'/g, "\\'")}', instantArrival: false });">
                    <circle cx="${cx}" cy="${cy}" r="${nodeR}" fill="${fillCol}" stroke="${isSelected ? '#ffffff' : '#090d0e'}" stroke-width="5"/>
                    ${showLabel ? `<text x="${cx}" y="${cy - nodeR - 12}" text-anchor="middle" fill="${isSelected ? '#7dd3fc' : (isRevealed ? '#fef3c7' : '#94a3b8')}" font-size="${fontSize}" font-weight="900">${labelTxt}</text>` : ''}
                </g>
            `;
        }).join('');

        const preyNodesSvg = (ovw.movingTargetEntities || []).filter(p => p.alive && ((ovw.isCoordInLiveSight && ovw.isCoordInLiveSight(p.x, p.y)) || p.stalkedLevel > 0)).map(p => `
            <g style="cursor:pointer;" onclick="event.stopPropagation(); window.setWaypoint(${p.x}, ${p.y}, { label: '${p.name.replace(/'/g, "\\'")}', instantArrival: false }); window.executeOverworldAction('HUNT_PREY','${p.id}');">
                <circle cx="${p.x}" cy="${p.y}" r="24" fill="${isSov ? '#991b1b' : '#b45309'}" stroke="#fde68a" stroke-width="4" stroke-dasharray="8,5"/>
                <text x="${p.x}" y="${Number(p.y) + 10}" text-anchor="middle" font-size="30">${p.type === 'APEX_BEAST' ? '🦌' : '📦'}</text>
                <text x="${p.x}" y="${Number(p.y) + 46}" text-anchor="middle" fill="#fde68a" font-size="24" font-weight="bold">${isSov ? '🩸PREY' : '⚔️CONVOY'}</text>
            </g>
        `).join('');

        const trailPoints = (ovw.movementTrail || []).map(pt => `${pt.x},${pt.y}`).join(' ');
        const trailSvg = (ovw.movementTrail && ovw.movementTrail.length > 1)
            ? `<polyline points="${trailPoints}" fill="none" stroke="${isSov ? '#ef4444' : '#38bdf8'}" stroke-width="7" stroke-dasharray="16,10" opacity="0.85"/>`
            : '';

        const px = ovw.partyX || 2260;
        const py = ovw.partyY || 2180;
        const curBiome = ovw.getBiomeAt ? ovw.getBiomeAt(px, py) : { label: 'Dense Ironbark Forest', speedMult: 0.78 };
        const waypointSvg = (ovw.targetX !== null && ovw.targetY !== null)
            ? `
                <g pointer-events="none">
                    <line x1="${px}" y1="${py}" x2="${ovw.targetX}" y2="${ovw.targetY}" stroke="#fde68a" stroke-width="6" stroke-dasharray="14,10"/>
                    <circle cx="${ovw.targetX}" cy="${ovw.targetY}" r="26" fill="none" stroke="#fde68a" stroke-width="5"/>
                    <text x="${ovw.targetX}" y="${ovw.targetY - 34}" text-anchor="middle" fill="#fde68a" font-size="28" font-weight="900">🚩 ${ovw.targetLabel || 'WAYPOINT'}</text>
                </g>
            `
            : '';
        const partyTokenSvg = `
            <g pointer-events="none">
                <circle cx="${px}" cy="${py}" r="${ovw.sightRadius || 340}" fill="none" stroke="${isSov ? 'rgba(239,68,68,0.45)' : 'rgba(56,189,248,0.45)'}" stroke-width="5" stroke-dasharray="18,12"/>
                <circle cx="${px}" cy="${py}" r="42" fill="${isSov ? 'rgba(220,38,38,0.32)' : 'rgba(56,189,248,0.30)'}" stroke="${isSov ? '#ef4444' : '#38bdf8'}" stroke-width="6"/>
                <text x="${px}" y="${Number(py) + 14}" text-anchor="middle" font-size="42">${isSov ? '🐺' : '🛡️'}</text>
                <text x="${px}" y="${Number(py) + 68}" text-anchor="middle" fill="${isSov ? '#fca5a5' : '#bae6fd'}" font-size="28" font-weight="900">${isSov ? `SOVEREIGN [${ovw.stance}]` : `SQUAD [${ovw.stance}]`}</text>
            </g>
        `;

        const encounterOverlayHtml = this.buildEncounterArenaHtml(isSov);

        modal.style.display = 'block';
        modal.innerHTML = `
            <div style="position:fixed; inset:0; z-index:9999; background:rgba(3,5,8,0.98); display:flex; flex-direction:column; justify-content:space-between; padding:10px 14px; box-sizing:border-box; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${isSov ? '#7f1d1d' : '#14532d'}; padding-bottom:6px; flex-wrap:wrap; gap:6px;">
                    <div>
                        <div style="color:#e2d1b0; font-family:'Cinzel',serif; font-size:14px; font-weight:900; letter-spacing:0.04em;">
                            ${isSov ? '🐺 PREDATOR OVERWORLD MAP // 4000x4000 FREE-ROAM TERRAIN (FULLSCREEN)' : '🧭 MOUNT &amp; BLADE FOREST OVERWORLD // SQUAD NAVIGATION (4000x4000 FREE-ROAM)'}
                        </div>
                        <div style="font-size:10px; color:#86efac; font-family:'Share Tech Mono',monospace;">
                            ⛺ SUPPLIES: <b>${ovw.suppliesDaysRemaining ?? 3}/${ovw.maxSuppliesDays ?? 3} DAYS</b> | 📍 POS: (${ovw.partyX}, ${ovw.partyY}) [${curBiome.label} • ${Math.round((curBiome.speedMult || 1) * 100)}% SPD] | 🏃 DIST FROM CAMP: <b>${ovw.distanceFromCampHours ?? 0}H (${Number(((ovw.distanceFromCampHours ?? 0) * (0.5 / (CommanderEngine.timeScale || 1))).toFixed(2))}H IRL)</b>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <button class="cmd-btn" style="padding:5px 10px; font-size:10px; ${ovw.stance === 'MARCH' ? 'background:#14532d; border-color:#4ade80; color:#dcfce7; font-weight:bold;' : ''}" onclick="window.setOverworldStance('MARCH')">${isSov ? '🐺 PROWL' : '🛡️ MARCH'}</button>
                        <button class="cmd-btn" style="padding:5px 10px; font-size:10px; ${ovw.stance === 'STALK' ? 'background:#2e1065; border-color:#a855f7; color:#e9d5ff; font-weight:bold;' : ''}" onclick="window.setOverworldStance('STALK')">🐾 STALK</button>
                        <button class="cmd-btn" style="padding:5px 10px; font-size:10px; ${ovw.stance === 'HUNT' ? 'background:#450a0a; border-color:#ef4444; color:#fecaca; font-weight:bold;' : ''}" onclick="window.setOverworldStance('HUNT')">${isSov ? '🩸 HUNT' : '⚔️ RAID'}</button>
                        <button class="cmd-btn" style="background:#3f1212; border-color:#ef4444; color:#fecaca; padding:5px 12px; font-size:10.5px; font-weight:900;" onclick="window.closeExploreForestModal()">✖ Return to Command Hub</button>
                    </div>
                </div>
                <div id="overworld-map-pan-zoom-viewport"
                     onclick="window.handleOverworldMapClick(event)"
                     onwheel="window.handleOverworldWheel(event)"
                     onmousedown="window.handleOverworldPointerDown(event)"
                     onmousemove="window.handleOverworldPointerMove(event)"
                     onmouseup="window.handleOverworldPointerUp(event)"
                     onmouseleave="window.handleOverworldPointerUp(event)"
                     ontouchstart="window.handleOverworldPointerDown(event)"
                     ontouchmove="window.handleOverworldPointerMove(event)"
                     ontouchend="window.handleOverworldPointerUp(event)"
                     style="flex:1; position:relative; display:flex; align-items:center; justify-content:center; min-height:240px; margin:6px 0; border:2px solid ${isSov ? '#7f1d1d' : '#14532d'}; border-radius:6px; overflow:hidden; cursor:grab; touch-action:none; user-select:none; background:#030508;">
                    <div style="position:absolute; top:8px; right:8px; z-index:20; display:flex; gap:4px; align-items:center; background:rgba(9,13,16,0.9); border:1px solid #475569; border-radius:4px; padding:4px 6px;" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
                        <span style="font-size:9px; color:#94a3b8; font-family:'Share Tech Mono',monospace;">🔍 ZOOM: <b id="overworld-zoom-badge" style="color:#fde68a;">${Math.round(z * 100)}%</b></span>
                        <button class="cmd-btn" style="padding:2px 7px; font-size:10px; font-weight:900;" onclick="window.zoomOverworldMap(0.35)" title="Zoom In">➕</button>
                        <button class="cmd-btn" style="padding:2px 7px; font-size:10px; font-weight:900;" onclick="window.zoomOverworldMap(-0.35)" title="Zoom Out">➖</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.panOverworldMap(0, 180)" title="Pan North">⬆</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.panOverworldMap(0, -180)" title="Pan South">⬇</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.panOverworldMap(220, 0)" title="Pan West">⬅</button>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.panOverworldMap(-220, 0)" title="Pan East">➡</button>
                        <button class="cmd-btn" style="padding:2px 7px; font-size:9px; background:#1e293b; border-color:#38bdf8; color:#bae6fd;" onclick="window.focusOverworldParty()" title="Center on Squad / Sovereign">🎯 Center Squad</button>
                        <button class="cmd-btn" style="padding:2px 7px; font-size:9px;" onclick="window.resetOverworldMapCamera()" title="Full 4000x4000 World Overview">🔄 World Overview</button>
                    </div>
                    <div style="position:absolute; bottom:6px; left:8px; z-index:15; pointer-events:none; font-size:8.5px; color:#94a3b8; background:rgba(5,7,9,0.82); padding:3px 7px; border-radius:3px;">
                        👆 Click Anywhere on Terrain to March Squad (Time Advances While Moving) | ✋ Drag to Pan | 🖱️ Scroll / ➕➖ to Zoom
                    </div>
                    <canvas id="overworld-terrain-canvas" width="800" height="800" style="position:absolute; inset:0; width:100%; height:100%; display:block; pointer-events:none;"></canvas>
                    <svg id="overworld-fullscreen-svg" viewBox="0 0 4000 4000" preserveAspectRatio="xMidYMid meet" style="position:relative; z-index:10; width:100%; height:100%; max-height:66vh; display:block;">
                        <g id="overworld-svg-pan-zoom-group" transform="translate(2000, 2000) scale(${Number(z.toFixed(2))}) translate(${-2000 + Number((this.mapPanX || 0).toFixed(1))}, ${-2000 + Number((this.mapPanY || 0).toFixed(1))})">
                            ${trailSvg}
                            ${waypointSvg}
                            ${svgNodes}
                            ${preyNodesSvg}
                            ${partyTokenSvg}
                        </g>
                    </svg>
                </div>
                ${encounterOverlayHtml}
                <div style="background:rgba(15,23,42,0.92); border:1.5px solid #334155; border-radius:6px; padding:7px 10px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="font-size:10.5px; color:#cbd5e1;">
                        🎯 <b>SELECTED NODE:</b> <span style="color:#fde68a; font-weight:900;">${selNodeCleared ? `${selNode.name.toUpperCase()} (${selNode.house} | Power: ${selHouse.power}/100 [${selHouse.status}] | Fuel: ${selNode.barrierFuel}u | Chains: ${selNode.chainsIntegrity}%)` : `🌫️ OUTER HORIZON FOG — UNCHARTED SECTOR #${selNode.id}`}</span>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#14532d; border-color:#22c55e; color:#dcfce7; font-weight:900;" onclick="window.setWaypoint(${selCoords.x}, ${selCoords.y}, { nodeId: ${selNode.id}, label: '${selNode.name.replace(/'/g, "\\'")}', instantArrival: false })">🧭 March Squad to ${selNode.name} (-1d Supply)</button>
                        ${!selNodeCleared
                            ? `<button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#0f172a; border-color:#38bdf8; color:#bae6fd; font-weight:bold;" onclick="window.scoutFogOfWarNode('${selNode.name}')">🌫️🧭 Lift Fog of War (Mist-Recon)</button>`
                            : ''
                        }
                        ${isSov
                            ? `
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#2e1065; border-color:#a855f7; color:#f3e8ff; font-weight:bold;" onclick="window.executeOverworldAction('STALK')">🐾 Stalk Prey</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#450a0a; border-color:#dc2626; color:#fecaca; font-weight:bold;" onclick="window.executeOverworldAction('HUNT_PREY')">🩸 Hunt &amp; Pounce</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#3b0764; border-color:#e879f9; color:#fae8ff; font-weight:bold;" onclick="window.executeOverworldAction('FEED')">🥩 Feed &amp; Gorge</button>
                            `
                            : `
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px;" onclick="window.executeOverworldAction('STALK')">🏹 Recon Stalk</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px;" onclick="window.executeOverworldAction('HUNT_PREY')">⚔️ Intercept Convoy</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px;" onclick="window.executeOverworldAction('FEED')">⛺ Camp &amp; Forage</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px;" onclick="window.sendExpedition('GUARDED_CARAVAN','${selNode.name}'); window.CommanderUI.renderExploreForestModal(false);">🛡️ Send Caravan</button>
                                <button class="cmd-btn" style="padding:5px 10px; font-size:10px;" onclick="window.sendExpedition('PROXY_RAID','${selNode.name}'); window.CommanderUI.renderExploreForestModal(false);">🗡️ Proxy Raid</button>
                            `
                        }
                        <button class="cmd-btn" style="padding:5px 10px; font-size:10px; background:#3f1212; border-color:#ef4444; color:#fecaca; font-weight:bold;" onclick="window.openTacticalEncounter(${selNode.id})">${isSov ? '🐺 Attack &amp; Devour Parish' : '⚔️ Tactical Encounter'}</button>
                    </div>
                </div>
                <div class="burden-parchment-card" style="padding:6px 10px;">
                    <div style="font-family:'Cinzel',serif; font-weight:900; font-size:10px; border-bottom:1px solid #4a3e2e; margin-bottom:3px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
                        <span>[${isSov ? 'PREDATOR HUNT &amp; FEEDING TELEMETRY' : 'OVERWORLD SQUAD NAVIGATION LOG'}]</span>
                        <span style="color:#5e110b;">POS: (${ovw.partyX}, ${ovw.partyY}) | ⛺ SUPPLIES: ${ovw.suppliesDaysRemaining ?? 3}/${ovw.maxSuppliesDays ?? 3} DAYS | DIST: ${ovw.distanceFromCampHours ?? 0}H (${Number(((ovw.distanceFromCampHours ?? 0) * (0.5 / (CommanderEngine.timeScale || 1))).toFixed(2))}H IRL)</span>
                    </div>
                    <div style="font-size:9.5px; color:#1c1610; max-height:52px; overflow-y:auto;">
                        ${(ovw.overworldLogs || []).slice(0, 3).map(l => `<div style="margin-bottom:2px;">• ${l}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
        this.drawOverworldTerrainCanvas();
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
        if (vault && (!vault.facts || vault.facts.length === 0)) {
            vault.discoverFact({
                title: "Recovered Boundary Toll & Resin Manifest",
                source: "Archive Field Recon Courier",
                targetHouse: "House Cull",
                valueFuel: 10,
                valueRes: 14,
                costPaid: "Archive Seal Inspection",
                riskDesc: "Exposes tariff diversion along the eastern sluice (+10% Entropy if published)."
            });
        }
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
        const closeBtn = document.getElementById('btn-close-story-reader');
        if (closeBtn) closeBtn.style.display = 'inline-block';

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
                    <button class="cmd-btn" style="margin-left:auto; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.closeStoryReader()">✖ Exit Dossier</button>
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
                    <button class="cmd-btn" style="margin-left:auto; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.closeStoryReader()">✖ Close</button>
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
                <div class="brutalist-top-crest">
                    <div class="brutalist-crest-title">THE GENERAL LEDGER HUB</div>
                    <div class="brutalist-crest-medallion"><span>◆</span></div>
                    <div class="brutalist-crest-right">
                        <span id="hub-shift-header">DAY 1 // SHIFT COUNTDOWN</span>
                        <svg viewBox="0 0 80 22" style="width:70px; height:18px;">
                            <polyline points="0,12 18,12 24,4 30,19 36,2 42,18 48,8 54,14 60,12 80,12" fill="none" stroke="#d9822b" stroke-width="1.5"/>
                        </svg>
                        <span>VOLATILITY ▲</span>
                        <button id="btn-top-role-roster" class="cmd-btn" style="background:#3f1212; border-color:#991b1b; color:#fecaca; font-size:9px; padding:2px 6px;" onclick="window.openRoleGate()">🚪 Role Roster</button>
                        <button class="cmd-btn" style="background:#1e293b; border-color:#38bdf8; color:#e0f2fe; font-size:9px; padding:2px 6px;" onclick="window.showTutorialTip('BOOK_TAB_COMMAND')">🎓 Advisor Help</button>
                    </div>
                </div>

                <!-- ROYAL LEDGER COMPACT SECTION SELECTOR DROPDOWN & SIMULATION CLOCK BAR -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px; padding-bottom:5px; border-bottom:2px solid #4a3e2e;">
                    <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                        <button id="btn-nav-page1-gate" class="cmd-btn" onclick="if(!window.CommanderUI?.isRunCommitted && window.CandidateOnboarding) window.CandidateOnboarding.start(window.CommanderUI);">PAGE 1: CANDIDATE GATE</button>
                        <button id="btn-nav-page2-roster" class="cmd-btn" onclick="window.openRoleGate()">PAGE 2: DUTY ROSTER</button>
                        <label for="archive-section-dropdown" style="font-family:'Cinzel',serif; font-size:9.5px; font-weight:900; color:#fde68a; letter-spacing:0.04em;">📂 ARCHIVE SECTION:</label>
                        <select id="archive-section-dropdown" onchange="window.selectArchiveSectionDropdown(this.value)" style="background:#141a1d; color:#fde68a; border:1.5px solid #d9822b; border-radius:4px; padding:4px 8px; font-family:'Cinzel',serif; font-size:10px; font-weight:bold; cursor:pointer;">
                            <option value="COMMAND">📖 Section I: Command &amp; Daily Triage</option>
                            <option value="FACILITIES">🏗️ Base Vault: Fallout Shelter Facility Grid</option>
                            <option value="GARRISON">🛡️ Section II: Garrison Barracks, Training Grounds &amp; Armory</option>
                            <option value="EXPLORE_FOREST">🌲🧭 Forward Recon Outpost: Explore Forest Overworld Map</option>
                            <option value="FIELD">🧭 Section III: Field Expeditions &amp; Necrology</option>
                            <option value="TRUTH">📜 Section IV: Truth &amp; Relic Vault (Reality Editor)</option>
                            <option value="WARBOARD">🏰 Section V: 19-House War Board &amp; Telemetry</option>
                        </select>
                        <button class="cmd-btn" style="background:#3b2410; border-color:#f59e0b; color:#fde68a; font-weight:bold; padding:4px 8px; font-size:9.5px;" onclick="window.viewFacilities()">🏗️ Facility Grid</button>
                        <button id="btn-nav-explore-forest" class="cmd-btn" style="background:linear-gradient(180deg,#14532d,#052e16); border-color:#4ade80; color:#dcfce7; font-weight:900; padding:4px 8px; font-size:9.5px;" onclick="window.openExploreForest()">🌲🧭 EXPLORE FOREST</button>
                        <!-- Hidden compatibility tab hooks for progressive growth gate & automated telemetry checks -->
                        <div id="hub-page-nav-tabs" style="display:none;">
                            <button id="book-tab-command" class="cmd-btn" onclick="window.switchBookTab('COMMAND')">TAB I</button>
                            <button id="book-tab-garrison" class="cmd-btn" onclick="window.switchBookTab('GARRISON')">TAB II</button>
                            <button id="book-tab-field" class="cmd-btn" onclick="window.switchBookTab('FIELD')">TAB III</button>
                            <button id="nav-tab-page4" class="cmd-btn" onclick="window.viewTruthVault()">TAB IV</button>
                            <button id="nav-tab-page5" class="cmd-btn" onclick="window.viewWarBoard()">TAB V</button>
                        </div>
                    </div>
                    <div class="ledger-btn-row" style="margin:0;">
                        <button id="btn-autotick-state" class="cmd-btn" onclick="window.toggleAutoTick()">DAY TIMER: TICKING</button>
                        <span id="timescale-bar" style="display:inline-flex; gap:3px;"></span>
                        <details style="display:inline-block; position:relative;">
                            <summary class="cmd-btn" style="list-style:none; cursor:pointer; border-color:#38bdf8; color:#bae6fd;">⚙️ Chrono-Skip &amp; Tools ▾</summary>
                            <div style="position:absolute; right:0; top:26px; z-index:90; background:#0b0f12; border:1.5px solid #38bdf8; border-radius:5px; padding:7px; min-width:250px; display:flex; flex-direction:column; gap:4px; box-shadow:0 12px 28px rgba(0,0,0,0.95);">
                                <button id="btn-step-field" class="cmd-btn" onclick="window.stepExpeditionHour(2)">⏩ +2H BOOST (1 Seal)</button>
                                <button id="btn-step-6h" class="cmd-btn" onclick="window.stepExpeditionHour(6)">⏩ +6H BOOST (3 Seals)</button>
                                <button id="btn-dream-ward" class="cmd-btn" onclick="window.triggerDreamIntervention()">🌙 DREAM WARD (-10u)</button>
                                <button id="btn-chrono-skip" class="cmd-btn" onclick="window.chronoSkip(1)">⏭️ +1D SKIP (6 Seals)</button>
                                <button id="btn-chrono-skip-3d" class="cmd-btn" onclick="window.chronoSkip(3)">⏭️ +3D SKIP (18 Seals)</button>
                                <button id="btn-daily-login-shard" class="cmd-btn" style="border-color:#38bdf8; color:#bae6fd;" onclick="window.claimDailyLogin()">📅 DAILY LOG-IN (0/7💎)</button>
                                <button id="btn-mint-chrono-seal" class="cmd-btn" style="border-color:#f59e0b; color:#fde68a;" onclick="window.mintChronoSeal(10)">💎 MINT SEAL (10r)</button>
                                <button class="cmd-btn" onclick="window.toggleHighContrast()">👁️ HIGH-CONTRAST</button>
                                <button id="btn-export-save" class="cmd-btn" onclick="window.exportSave()">💾 EXPORT SAVE</button>
                            </div>
                        </details>
                    </div>
                </div>

                <!-- TUTORIAL ADVISOR POPUP OVERLAY -->
                <div id="tutorial-advisor-modal" style="display:none; background:linear-gradient(180deg,#1e1b4b 0%,#0f172a 100%); border:2px solid #38bdf8; border-radius:6px; padding:10px 12px; margin-bottom:8px; color:#e0f2fe; box-shadow:0 8px 24px rgba(0,0,0,0.9);"></div>

                <div id="status-bar" style="font-family:'Share Tech Mono',monospace; font-size:10px; color:#d8c8a8; background:#090c0d; border:1px solid #383e40; padding:4px 8px; margin-bottom:6px;">Initializing...</div>
                <div id="commander-action-banner" style="display:none; background:#1c1610; border-left:3px solid #fbbf24; color:#fde68a; padding:4px 8px; margin-bottom:6px; font-size:10px;"></div>
                <div id="daily-goal-bar" class="ledger-btn-row" style="margin-bottom:6px;"></div>

                <!-- FALLOUT SHELTER STYLE POP-UP FACILITY UPGRADE ROOM GRID MODAL -->
                <div id="fallout-facility-popup-modal" style="display:none;"></div>

                <!-- INTERACTIVE EXPLORE FOREST OVERWORLD POP-UP MODAL -->
                <div id="explore-forest-popup-modal" style="display:none;"></div>

                <!-- ALWAYS-PROMINENT SQUAD EVENT LOGS & FACTION PULSE LOGS DUAL LIVE MONITOR -->
                <div id="always-prominent-live-pulse-deck" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div class="hub-iron-module" style="margin:0; border-color:#22c55e;">
                        <div class="hub-module-header" style="background:linear-gradient(90deg,rgba(20,83,45,0.45),rgba(9,13,14,0.9));">
                            <span>🧭 SQUAD EVENT LOGS &amp; OVERWORLD RECON STREAM</span>
                            <span style="font-size:8.5px; color:#4ade80;">● LIVE SQUAD TELEMETRY</span>
                        </div>
                        <div id="expeditions-list" style="max-height:115px; overflow-y:auto; font-size:9.5px;">No squads currently out in the mist.</div>
                    </div>
                    <div class="hub-iron-module" style="margin:0; border-color:#d9822b;">
                        <div class="hub-module-header" style="background:linear-gradient(90deg,rgba(140,79,25,0.45),rgba(9,13,14,0.9));">
                            <span>⚡ FACTION PULSE LOGS &amp; COURIER DISPATCHES</span>
                            <span style="font-size:8.5px; color:#fbbf24;">● LIVE FACTION PULSE</span>
                        </div>
                        <div id="dispatches-list" style="max-height:115px; overflow-y:auto; font-size:9.5px;">Waiting...</div>
                    </div>
                </div>

                <!-- PROMINENT QUICK-JUMP LAUNCHER BAR FOR NEW SYSTEMS (EXPLORE FOREST OVERWORLD, RUNIC BODY-CARVING & SEAL FORGE) -->
                <div id="quick-access-feature-bar" style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; background:linear-gradient(90deg, rgba(20,83,45,0.75) 0%, rgba(15,23,42,0.9) 50%, rgba(46,16,101,0.65) 100%); border:1.5px solid #22c55e; border-radius:4px; padding:5px 8px; margin-bottom:7px;">
                    <span style="font-family:'Cinzel',serif; font-size:9.5px; font-weight:900; color:#86efac; letter-spacing:0.05em;">🔗 FACILITY SECTIONS:</span>
                    <button class="cmd-btn" style="background:#3b2410; border-color:#f59e0b; color:#fde68a; font-weight:bold; padding:3px 8px; font-size:9.5px;" onclick="window.viewFacilities()">🏗️ Fallout Shelter Facility Grid</button>
                    <button class="cmd-btn" style="background:#2e1065; border-color:#c084fc; color:#f3e8ff; font-weight:bold; padding:3px 8px; font-size:9.5px;" onclick="window.switchBookTab('GARRISON')">🛡️🏋️ Barracks &amp; Forward Recon Training Grounds</button>
                    <button id="btn-dedicated-explore-forest" class="cmd-btn" style="background:linear-gradient(180deg,#14532d,#052e16); border-color:#4ade80; color:#dcfce7; font-weight:900; padding:4px 10px; font-size:10px; box-shadow:0 0 12px rgba(34,197,94,0.35);" onclick="window.openExploreForest()">🌲🧭 EXPLORE FOREST (Forward Recon Overworld Map)</button>
                </div>

                <!-- BOOK PAGE IV & V: TRUTH VAULT / WAR BOARD VISUAL DECK -->
                <div id="brutalist-subpage-deck" style="display:none; margin-bottom:10px;"></div>

                <!-- SHARED DOSSIER, FACILITIES & ARCHIVE READER (WITH MOBILE EXIT BUTTON) -->
                <div id="shared-dossier-reader-panel" class="hub-iron-module" style="margin-bottom:8px;">
                    <div class="hub-module-header">
                        <span>📜 DOSSIER, FACILITY &amp; ARCHIVE READER</span>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <span style="font-size:9px; color:#d9822b;">CASE FILE</span>
                            <button id="btn-close-story-reader" class="cmd-btn" style="display:none; padding:1px 7px; font-size:9.5px; background:#3f1212; border-color:#ef4444; color:#fecaca;" onclick="window.closeStoryReader()">✖ EXIT DOSSIER / CLOSE</button>
                        </div>
                    </div>
                    <div id="inquest-verdict-bar" style="display:none; gap:5px; margin-bottom:6px; flex-wrap:wrap;"></div>
                    <div id="story-reader" class="cmd-story-box" style="display:none; max-height:175px; overflow-y:auto;"></div>
                </div>

                <!-- BOOK PAGE I: COMMAND DIRECTIVES & TRIAGE SLATE -->
                <div id="book-page-command" style="display:grid; grid-template-columns: 1.25fr 0.95fr; gap:12px; align-items:stretch;">
                    <div id="role-directives-bar" style="display:flex; flex-direction:column;"></div>

                    <div class="burden-parchment-card">
                        <div>
                            <div class="burden-card-header"><span>TRIAGE SLATE &amp; EMISSARY GATE</span><span>◆</span></div>
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

                <!-- BOOK PAGE II: GARRISON ROSTER, FACTION UNIT RECRUITMENT & ARMORY EXCHANGE MARKET -->
                <div id="book-page-garrison" style="display:none; margin-top:8px;">
                    <div class="hub-iron-module">
                        <div class="hub-module-header"><span>GARRISON ROSTER, UNIT RECRUITMENT &amp; ARMORY MARKET</span><span style="font-size:9px; color:#d9822b;">⚔️ ⚙️ 🛡️</span></div>
                        <div id="roster-list" style="max-height:290px; overflow-y:auto; font-size:10px;">Loading agents...</div>
                    </div>
                </div>

                <!-- BOOK PAGE III: NECROLOGY & ARCHIVED EXPEDITION DOSSIERS -->
                <div id="book-page-field" style="display:none; margin-top:8px;">
                    <div id="module-wrap-expeditions" style="display:none;"></div>
                    <div id="module-wrap-necrology" class="hub-iron-module">
                        <div class="hub-module-header"><span>CRUCIBLE RECORDS, DEATH CERTIFICATES &amp; FAMILY LINEAGE</span><span style="font-size:9px; color:#d9822b;">DECEASED</span></div>
                        <div id="story-archive" style="max-height:240px; overflow-y:auto; font-size:10px;">Loading records...</div>
                    </div>
                </div>

                <button id="btn-commit-hub-run" type="button" class="riveted-commit-plate" onclick="window.commitHubRun()">
                    <span class="plate-rune">◆</span>
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
        const leadAgt = CommanderEngine.AgentRosterManager?.agents?.get?.('agt_1');
        const leaderName = leadAgt?.name || st.rulerName || 'High Marshal Vane';
        let m = `Day: ${d} (Perceived: Year ${Math.floor(d / 365) + 12000} AF) | Shift in: ${shiftDays}d | Auditor-Leader: [${leaderName}] (${roleLabel})`;
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

        // Render Fallout Shelter–Style Active Field Expeditions & Live Combat Events Log
        const expDiv = document.getElementById('expeditions-list');
        if (expDiv && CommanderEngine.ExpeditionEngine) {
            const exps = CommanderEngine.ExpeditionEngine.activeExpeditions || [];
            if (exps.length === 0) {
                expDiv.innerHTML = `<div style="color:#463523; font-size:11px;">No squads or caravans currently out in the mist. Dispatch a caravan or squad above to track their live field &amp; combat event log.</div>`;
            } else {
                expDiv.innerHTML = exps.map(e => {
                    const pct = Math.min(10, Math.round((e.hoursElapsed / e.totalHours) * 10));
                    const bar = `[${'█'.repeat(pct)}${'░'.repeat(10 - pct)}] ${e.hoursElapsed}h/${e.totalHours}h`;
                    const combatEventsHtml = (e.combatEvents && e.combatEvents.length > 0)
                        ? `
                            <div style="margin-top:5px; padding:5px 7px; background:#1c0d0a; border:1px solid #dc2626; color:#fecaca; font-family:'Share Tech Mono',monospace; font-size:9.5px;">
                                <div style="color:#f87171; font-weight:bold; margin-bottom:2px;">⚔️ LIVE TACTICAL COMBAT TELEMETRY (Def ${e.squadDefense || 12} vs Hazard ${e.hazardRating || 12} | Cargo: ${e.cargoIntegrity ?? 100}%):</div>
                                ${e.combatEvents.map(ce => `<div style="margin-bottom:2px;">• ${ce}</div>`).join('')}
                            </div>
                        `
                        : '';
                    return `
                        <div class="cmd-dispatch" style="border-color:#78350f;">
                            <div style="display:flex; justify-content:space-between; align-items:center; color:#5e110b; font-weight:bold;">
                                <span>🧭 ${e.type} → ${e.targetName} (${e.leadAgentName})</span>
                                <span>
                                    ${e.status} ${bar}
                                    <button class="cmd-btn" style="padding:1px 5px; font-size:9px; margin-left:6px;" onclick="window.recallExpedition('${e.id}')">🔄 Recall</button>
                                </span>
                            </div>
                            ${combatEventsHtml}
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
        const curHr = String(CommanderEngine.currentHour || 6).padStart(2, '0');
        const sealsLeft = fe?.chronoSeals ?? 0;
        const shardsLeft = fe?.chronoSealFragments ?? 0;
        if (tickBtn) {
            tickBtn.innerText = this.autoTickEnabled
                ? `⏱️ DAY TIMER: ${curHr}:00 / 24:00 (${ts}x | 💎 ${sealsLeft} Seals | 🧩 ${shardsLeft}/7 Shards)`
                : `⏸️ DAY TIMER PAUSED: ${curHr}:00 (${ts}x | 💎 ${sealsLeft} Seals | 🧩 ${shardsLeft}/7 Shards)`;
            tickBtn.style.borderColor = this.autoTickEnabled ? '#0e7490' : '#78350f';
        }
        const dailyLoginBtn = document.getElementById('btn-daily-login-shard');
        if (dailyLoginBtn) {
            const alreadyClaimed = fe?.lastDailyLoginClaimDay === d;
            dailyLoginBtn.innerText = alreadyClaimed
                ? `📅 LOG-IN CLAIMED (${shardsLeft}/7🧩)`
                : `📅 CLAIM DAILY SHARD (${shardsLeft}/7🧩)`;
        }

        const tsBar = document.getElementById('timescale-bar');
        if (tsBar) {
            const costMap = { 1: 0, 2: 1, 4: 2, 8: 4 };
            tsBar.innerHTML = [1, 2, 4, 8].map(s => {
                const active = s === ts ? 'background:#451a03; color:#fde68a; border-color:#d97706;' : '';
                const costTag = s > 1 ? ` [${costMap[s]}💎]` : ' [Free]';
                return `<button class="cmd-btn" style="${active}" title="Accelerate Real-Time Day Timer to ${s}x (${Number((12 / s).toFixed(1))}h/day)${costTag}" onclick="window.setTimeScale(${s})">${s}x${costTag}</button>`;
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
                const isSovReport = (rep.role === 'SOVEREIGN' || rep.role === 'PALE_SOVEREIGN');
                goalBar.innerHTML = `
                    <div style="background:#1c1610; border:2px solid ${isSovReport ? '#991b1b' : '#d97706'}; padding:10px; margin-bottom:8px; width:100%; text-align:left;">
                        <div style="color:${isSovReport ? '#fca5a5' : '#fbbf24'}; font-weight:bold; font-size:12px; margin-bottom:4px;">${isSovReport ? `🩸 CYCLE ${rep.day} CULTIVATION & HARVEST COMMUNION — TORPOR PAUSED` : `⏸️ END OF DAY ${rep.day} RECONCILIATION — SIMULATION PAUSED`}</div>
                        <div style="font-size:11px; color:#e5dccb; margin-bottom:4px;"><b>${isSovReport ? 'Executed Rite:' : 'Executed Target:'}</b> ${rep.executedGoal}</div>
                        <div style="font-size:11px; color:#4ade80; margin-bottom:2px;"><b>${isSovReport ? '📈 Essence & Historical Weight Harvested (+):' : '📈 Supplies & Training Gained (+):'}</b> ${rep.gains}</div>
                        <div style="font-size:11px; color:#f87171; margin-bottom:8px;"><b>${isSovReport ? '❄️ Void Entropy & Frost Torpor:' : '📉 Supplies & Upkeep Expended (-):'}</b> ${rep.losses}</div>
                        <div style="color:#fde68a; font-size:11px; font-weight:bold; margin-bottom:4px;">${isSovReport ? 'SELECT NEXT CULTIVATION OR HARVEST RITE:' : "SELECT TOMORROW'S TARGET TO RESUME SIMULATION:"}</div>
                        <div class="ledger-btn-row">${targetsHtml}</div>
                    </div>
                `;
            } else {
                goalBar.innerHTML = targetsHtml;
            }
        }

        // Render Page 3 Brutalist Iron Telemetry Modules Gated by Growth Progression (*A Dark Room* Style Unfolding)
        const growth = CommanderEngine.RoleStateMachine?.getGrowthProgression?.() || { tier: 0, isSovereign: false, label: 'GROWTH TIER 0', nextGateDesc: '' };
        if (container) {
            container.dataset.sovereignStage = growth.isSovereign ? String(growth.tier) : 'none';
            if (container.classList) {
                ['sovereign-corruption-stage-1', 'sovereign-corruption-stage-2', 'sovereign-corruption-stage-3'].forEach(c => container.classList.remove(c));
                if (growth.isSovereign && growth.tier >= 1) {
                    container.classList.add(`sovereign-corruption-stage-${Math.min(3, growth.tier)}`);
                }
            }
        }
        const setDisp = (id, show, mode = 'inline-block') => { const el = document.getElementById(id); if (el) el.style.display = show ? mode : 'none'; };
        const runEnded = Boolean(s.victory || s.collapsed);
        if (runEnded && this.isRunCommitted) {
            this.isRunCommitted = false;
        }
        const showPreRunNav = !this.isRunCommitted;
        setDisp('btn-nav-page1-gate', showPreRunNav);
        setDisp('btn-nav-page2-roster', showPreRunNav);
        setDisp('btn-top-role-roster', showPreRunNav);
        setDisp('btn-nav-role-scroll', showPreRunNav);
        setDisp('btn-commit-hub-run', showPreRunNav, 'flex');
        setDisp('nav-tab-page4', growth.tier >= 1);
        setDisp('nav-tab-page5', growth.tier >= 1);
        setDisp('btn-nav-explore-forest', true); // Dedicated Explore Forest button is ALWAYS visible from Day 1!
        setDisp('btn-dream-ward', growth.tier >= 1);
        setDisp('btn-chrono-skip', growth.tier >= 1);
        setDisp('module-wrap-expeditions', true, 'block');
        setDisp('module-wrap-necrology', true, 'block');

        const expForestBtn = document.getElementById('btn-dedicated-explore-forest');
        const navForestBtn = document.getElementById('btn-nav-explore-forest');
        const exploreUnlocked = growth.isSovereign || Boolean(fe?.facilities?.exploration_observatory?.unlocked || fe?.facilities?.training_grounds?.unlocked);
        [expForestBtn, navForestBtn].forEach(b => {
            if (!b) return;
            if (growth.isSovereign) {
                b.innerHTML = '🐺🌲 EXPLORE FOREST: HUNT, STALK, ATTACK &amp; FEED (POP-UP)';
                b.style.background = 'linear-gradient(180deg,#7f1d1d,#450a0a)';
                b.style.borderColor = '#f87171';
                b.style.color = '#fecaca';
            } else if (exploreUnlocked) {
                b.innerHTML = '🌲🧭 EXPLORE FOREST: OPEN OVERWORLD POP-UP MAP';
                b.style.background = 'linear-gradient(180deg,#14532d,#052e16)';
                b.style.borderColor = '#4ade80';
                b.style.color = '#dcfce7';
            } else {
                b.innerHTML = '🔒 BUILD RECON FACILITY (UNLOCK EXPLORE FOREST)';
                b.style.background = 'linear-gradient(180deg,#334155,#0f172a)';
                b.style.borderColor = '#94a3b8';
                b.style.color = '#cbd5e1';
            }
        });

        const sectionSelectEl = document.getElementById('archive-section-dropdown');
        if (sectionSelectEl && document.activeElement !== sectionSelectEl) {
            sectionSelectEl.value = this.activeBookTab || 'COMMAND';
        }

        // Book-Page Tab Visibility, Live Telemetry Count Badges & Active Tab Highlight
        const curTab = this.activeBookTab || 'COMMAND';
        setDisp('book-page-command', curTab === 'COMMAND', 'grid');
        setDisp('book-page-garrison', curTab === 'GARRISON', 'block');
        setDisp('book-page-field', curTab === 'FIELD', 'grid');
        const subDeckEl = document.getElementById('brutalist-subpage-deck');
        if (subDeckEl) {
            subDeckEl.style.display = (curTab === 'TRUTH' || curTab === 'WARBOARD') ? 'block' : 'none';
        }

        const hasActiveCrisis = Boolean(CommanderEngine.CrisisEngine?.activeCrisis);
        const hasActiveEmissary = Boolean(CommanderEngine.RealityEditorVault?.activeEmissaryPetition);
        const cmdAlertBadge = hasActiveCrisis ? ' [🚨 CRISIS!]' : (hasActiveEmissary ? ' [📯 EMISSARY!]' : '');
        const livingUnitsCount = Array.from(CommanderEngine.AgentRosterManager?.agents?.values?.() || []).filter(a => a.alive).length;
        const armoryCount = CommanderEngine.AgentRosterManager?.squadArmoryStock?.length || 0;
        const activeExpCount = CommanderEngine.ExpeditionEngine?.activeExpeditions?.length || 0;
        const factDossierCount = CommanderEngine.RealityEditorVault?.facts?.length || 0;
        const hostileHouseCount = (CommanderEngine.CampaignManager?.getWarBoard?.() || []).filter(w => w.status === 'WAR_PREP' || w.status === 'SKIRMISH').length;

        const tabLabels = {
            'book-tab-command': `📖 TAB I: COMMAND & TRIAGE${cmdAlertBadge}`,
            'book-tab-garrison': `🛡️🪡 TAB II: GARRISON, RUNIC CARVING & MARKET (${livingUnitsCount} Units | ${armoryCount} Gear)`,
            'book-tab-field': `🧭 TAB III: EXPEDITIONS & COMBAT LOGS (${activeExpCount} Active)`,
            'nav-tab-page4': `📜 TAB IV: TRUTH & RELIC VAULT (${factDossierCount} Dossiers)`,
            'nav-tab-page5': growth.isSovereign
                ? `🐺🌲 TAB V: EXPLORE FOREST (PREDATOR HUNT, STALK & FEED MAP)`
                : `🌲🗺️ TAB V: EXPLORE FOREST & OVERWORLD MAP (${hostileHouseCount} Hostile)`
        };

        [
            ['book-tab-command', 'COMMAND'],
            ['book-tab-garrison', 'GARRISON'],
            ['book-tab-field', 'FIELD'],
            ['nav-tab-page4', 'TRUTH'],
            ['nav-tab-page5', 'WARBOARD']
        ].forEach(([btnId, tabKey]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (tabLabels[btnId]) btn.innerText = tabLabels[btnId];
                btn.style.borderColor = curTab === tabKey ? '#d9822b' : (btnId === 'book-tab-command' && (hasActiveCrisis || hasActiveEmissary) ? '#ef4444' : '');
                btn.style.color = curTab === tabKey ? '#fde68a' : '';
            }
        });

        // Tutorial Advisor Popup Overlay
        const advModal = document.getElementById('tutorial-advisor-modal');
        if (advModal) {
            const activeTip = CommanderEngine.TutorialAdvisor?.activeTip;
            if (activeTip) {
                advModal.style.display = 'block';
                advModal.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #38bdf8; padding-bottom:4px; margin-bottom:6px;">
                        <b style="color:#38bdf8; font-family:'Cinzel',serif; font-size:12px;">🎓 ROYAL ARCHIVE ADVISOR // ${activeTip.title}</b>
                        <button class="cmd-btn" style="background:#0284c7; border-color:#7dd3fc; color:#fff; padding:2px 8px; font-size:9.5px;" onclick="window.dismissTutorialTip()">✖ Got It (Dismiss Advisor)</button>
                    </div>
                    <div style="font-size:10.5px; line-height:1.4; color:#e0f2fe; white-space:pre-line;">${activeTip.body}</div>
                `;
            } else {
                advModal.style.display = 'none';
            }
        }

        const dirBar = document.getElementById('role-directives-bar');
        if (dirBar && CommanderEngine.CrisisEngine) {
            const roleDirs = CommanderEngine.CrisisEngine.getDirectivesForRole(roleLabel);
            const baseGroup = [];
            const fieldGroup = [];
            const politicsGroup = [];

            roleDirs.forEach(([fn, label]) => {
                const isExploreBtn = fn.includes('openExploreForest');
                const btnStyle = isExploreBtn
                    ? (growth.isSovereign
                        ? 'background:linear-gradient(180deg,#7f1d1d,#450a0a); border-color:#f87171; color:#fecaca; font-weight:900;'
                        : 'background:linear-gradient(180deg,#14532d,#052e16); border-color:#4ade80; color:#dcfce7; font-weight:900;')
                    : '';
                const btnHtml = `<button class="cmd-btn" style="${btnStyle}" onclick="${fn}">${label}</button>`;
                if (growth.isSovereign) {
                    if (isExploreBtn || fn.includes('HIBERNATE') || fn.includes('SUMMON_HUNTSMAN') || fn.includes('viewFacilities')) baseGroup.push(btnHtml);
                    else if (fn.includes('MACABRE_COMMUNION') || fn.includes('viewTruthVault')) fieldGroup.push(btnHtml);
                    else politicsGroup.push(btnHtml);
                } else if (isExploreBtn || fn.includes('viewFacilities') || fn.includes('UNGUARDED_CARAVAN') || fn.includes('SMUGGLE_RESIN') || fn.includes('viewTruthVault') || fn.includes('viewTelemetry') || (growth.tier >= 1 && (fn.includes('viewShadowLedger') || fn.includes('interrogateSuspect')))) {
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
                if (activePetition.isFirstEmissary && CommanderEngine.TutorialAdvisor && !CommanderEngine.TutorialAdvisor.seenTopics.has('EMISSARY_FIRST_ARRIVAL')) {
                    CommanderEngine.TutorialAdvisor.checkAndTrigger('EMISSARY_FIRST_ARRIVAL');
                }
                crisisPanel.style.display = 'block';
                crisisPanel.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                        <span style="color:#1a130c; font-family:'Cinzel',serif; font-weight:900; font-size:11.5px;">EMISSARY PETITION // ${activePetition.senderHouse.toUpperCase()}</span>
                        <button class="cmd-btn" style="padding:1px 6px; font-size:8.5px; background:#1e293b; border-color:#38bdf8; color:#e0f2fe;" onclick="window.showTutorialTip('EMISSARY_FIRST_ARRIVAL')">🎓 Advisor Analysis</button>
                    </div>
                    <div style="background:rgba(28,22,16,0.12); border:1px dashed #5c4934; padding:3px 6px; margin-bottom:5px; font-size:8.5px; color:#3b2410; font-weight:bold;">
                        📊 ${activePetition.powerContext || `Power: ${activePetition.senderPower || 66}/100 [Military, Fuel & Monopoly Leverage Index]`}
                    </div>
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
                const humanStory = latestCol.narrativeSummary ? `<div style="color:#fff7ed; font-weight:bold; margin-bottom:2px;">"${latestCol.narrativeSummary}"</div>` : '';
                colReadout.innerHTML = `${humanStory}<b>${latestCol.eventName}</b> (Day ${latestCol.day}): ${nm ? nm.proceduralDescription : `[${latestCol.anchor} + ${latestCol.catalyst} + ${latestCol.target}]`}<br><span style="color:#fde68a;">Rebound: +20% on ${latestCol.rebound?.pressureId} | ${wqSummary}</span>`;
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
            const marketFac = fe?.facilities?.armory_market;
            const trainingFac = fe?.facilities?.training_grounds;
            const exploreFac = fe?.facilities?.exploration_observatory;
            const barracksLv = fe?.facilities?.guard_barracks?.unlocked ? (fe.facilities.guard_barracks.level || 1) : 0;
            const trainingLv = trainingFac?.unlocked ? (trainingFac.level || 1) : 0;
            const isSov = growth.isSovereign;
            const unitCost = isSov ? '120W' : `${Math.max(4, 7 - barracksLv)}r`;
            const maxCap = isSov ? 8 : (6 + barracksLv * 3 + trainingLv * 2);
            const agents = Array.from(CommanderEngine.AgentRosterManager.agents.values()).filter(a => a.alive);

            const trainingGroundsSectionHtml = trainingFac?.unlocked
                ? `
                    <div style="background:rgba(20,83,45,0.22); border:1.5px solid #22c55e; padding:6px 8px; margin-bottom:6px; font-size:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
                            <b style="color:#15803d;">🏋️📋 SECTION: FORWARD RECON &amp; TACTICAL TRAINING GROUNDS (Lv.${trainingFac.level} — +${trainingFac.level * 35}% Drill Speed)</b>
                            <span style="font-size:8.5px; color:#166534; font-weight:bold;">Feeds Barracks Recruits ➔ Multi-Stat Queues ➔ Overworld Squads</span>
                        </div>
                        <div style="font-size:9px; color:#1f160e; margin-bottom:4px;">Assign a 3-Stage Forward Recon Training Queue to any created troop below, or click individual attribute buttons to drill specific stats:</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                            ${agents.map(a => `
                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#14532d; border-color:#4ade80; color:#dcfce7;" onclick="window.queueAgentTrainingPreset('${a.id}','RECON')">🏹 Queue Recon (${a.name.split(' ')[0]}: STL➔SRV➔DDG)</button>
                                <button class="cmd-btn" style="padding:2px 6px; font-size:8.5px; background:#1e3a8a; border-color:#60a5fa; color:#dbeafe;" onclick="window.queueAgentTrainingPreset('${a.id}','VANGUARD')">🛡️ Queue Vanguard (${a.name.split(' ')[0]}: ATT➔TGH➔DEF)</button>
                            `).join('')}
                        </div>
                    </div>
                `
                : `
                    <div style="background:rgba(42,31,20,0.1); border:1px dashed #15803d; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#574532; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🔒 <b>Forward Recon &amp; Tactical Training Grounds (12r):</b> Build to unlock multi-stat Training Queues (+35% drill speed &amp; +2 Roster Cap) that feed Barracks troops into Overworld Recon Squads.</span>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9px; border-color:#22c55e;" onclick="window.unlockFacility('training_grounds')">🔨 Build Training Grounds (12r)</button>
                    </div>
                `;

            const reconOutpostBannerHtml = exploreFac?.unlocked || isSov
                ? `
                    <div style="background:rgba(12,74,110,0.2); border:1.5px solid #38bdf8; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#0c4a6e; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span><b>🌲🧭 SECTION: FORWARD RECON OUTPOST &amp; OVERWORLD TOWER ACTIVE:</b> Trained squads ready for Mount &amp; Blade Overworld deployment!</span>
                        <button class="cmd-btn" style="padding:2px 8px; font-size:9px; background:#14532d; border-color:#4ade80; color:#dcfce7; font-weight:bold;" onclick="window.openExploreForest()">🌲🧭 Launch Explore Forest Overworld Map</button>
                    </div>
                `
                : `
                    <div style="background:rgba(42,31,20,0.1); border:1px dashed #0284c7; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#574532; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🔒 <b>Forward Recon Outpost &amp; Overworld Map Tower (14r):</b> Build to deploy your trained Barracks &amp; Training Grounds troops onto the Mount &amp; Blade Forest Overworld Map!</span>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9px; border-color:#38bdf8;" onclick="window.unlockFacility('exploration_observatory')">🔨 Build Forward Recon Outpost (14r)</button>
                    </div>
                `;

            const recruitHtml = `
                <div style="background:rgba(20,51,42,0.18); border:1px solid #0e7490; padding:6px; margin-bottom:6px; font-size:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:4px;">
                        <b style="color:#0e7490;">➕ FACTION UNIT GENERATION &amp; MUSTER (${agents.length}/${maxCap} Active Units)</b>
                        <span style="font-size:9px; color:#463523;">Barracks Lv.${barracksLv} | Cost: ${unitCost}</span>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${isSov
                            ? `<button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.recruitFactionUnit('PREDATOR')">🐺 Awaken Frost-Thrall (${unitCost})</button>`
                            : `
                                <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.recruitFactionUnit('WARDEN')">🛡️ Recruit Warden (${unitCost})</button>
                                <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.recruitFactionUnit('SCOUT')">🏹 Recruit Mist-Scout (${unitCost})</button>
                                <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px;" onclick="window.recruitFactionUnit('SCRIBE')">📜 Recruit Archive Scribe (${unitCost})</button>
                            `
                        }
                    </div>
                </div>
            `;

            const discount = marketFac?.unlocked ? Math.max(0, (marketFac.level || 1) - 1) : 0;
            const marketHtml = marketFac?.unlocked
                ? `
                    <div style="background:rgba(140,79,25,0.16); border:1px solid #d97706; padding:6px; margin-bottom:6px; font-size:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                            <b style="color:#b45309;">⚔️ ARMORY &amp; WEAPONRY EXCHANGE MARKET (Lv.${marketFac.level} —Res: ${fe.settlementResources}u)</b>
                            ${armoryStock.length > 0 ? `<button class="cmd-btn" style="padding:2px 6px; font-size:9px;" onclick="window.sellArmoryGear('${armoryStock[0]}')">💰 Sell [${catalog[armoryStock[0]]?.name || armoryStock[0]}]</button>` : ''}
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:3px;">
                            ${Object.values(catalog).map(item => {
                                const price = Math.max(4, (item.buyPrice || 10) - discount);
                                return `<button class="cmd-btn" style="padding:2px 5px; font-size:8.5px;" title="${item.desc}" onclick="window.buyArmoryGear('${item.id}')">🛒 Buy ${item.name.split(' ').slice(-2).join(' ')} (${price}r)</button>`;
                            }).join('')}
                        </div>
                    </div>
                `
                : `
                    <div style="background:rgba(42,31,20,0.1); border:1px dashed #787163; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#574532; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🔒 <b>Armory &amp; Weaponry Exchange Market:</b> Construct facility (10r) to unlock buying &amp; selling weapons/armor.</span>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9px;" onclick="window.unlockFacility('armory_market')">🔨 Unlock Armory Market (10r)</button>
                    </div>
                `;

            const armoryHtml = `
                <div style="background:rgba(42,31,20,0.14); border:1px solid #5c4934; padding:6px; margin-bottom:6px; font-size:10.5px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px; flex-wrap:wrap;">
                        <b style="color:#3b2410;">🎒 SQUAD ARMORY STOCK (${armoryStock.length} Items)</b>
                        <button class="cmd-btn" style="padding:3px 6px; font-size:9.5px;" onclick="window.giveGearToSquad()">⚙️ Auto-Sort Gear</button>
                    </div>
                    <div style="color:#463523; font-size:10px;">
                        ${armoryStock.map(id => `[${catalog[id]?.name || id}]`).join(' ') || 'All armory gear currently equipped on squad members.'}
                    </div>
                </div>
            `;

            const carvingFac = fe?.facilities?.runic_carving_facility;
            const carvingFacilityBanner = carvingFac?.unlocked
                ? `
                    <div style="background:rgba(88,28,135,0.16); border:1px solid #a855f7; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#3b0764;">
                        <b>🪡 RUNIC BODY-CARVING SCRIPTORIUM UNLOCKED (Lv.${carvingFac.level} — Addendum CA-13):</b> Tiers IV–VIII active! All 6 Body Sites (48 Runes) &amp; Longevity Ladder up to 4,936y available (Requires 💎 Chrono-Seals for Tiers 4–8).
                    </div>
                `
                : `
                    <div style="background:rgba(42,31,20,0.1); border:1px dashed #7e22ce; padding:5px 7px; margin-bottom:6px; font-size:9.5px; color:#574532; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🔒 <b>End-Game Runic Body-Carving Scriptorium (Tiers IV–VIII):</b> Tiers I–III available now. Build Scriptorium (28r) for Tiers IV–VIII (💎 Chrono-Seals).</span>
                        <button class="cmd-btn" style="padding:2px 6px; font-size:9px; border-color:#a855f7;" onclick="window.unlockFacility('runic_carving_facility')">🔨 Build Runic Scriptorium (28r)</button>
                    </div>
                `;

            const nextGearId = armoryStock[0] || 'ironwood_spear';
            const tierCatalog = CommanderEngine.AgentRosterManager.RUNIC_CARVING_TIERS || {};
            const agentsHtml = `
                <div style="background:rgba(46,16,101,0.12); border:1.5px solid #a855f7; padding:6px 8px; margin-bottom:8px;">
                    <div style="font-family:'Cinzel',serif; font-weight:900; font-size:10.5px; color:#581c87; border-bottom:1px solid #a855f7; padding-bottom:3px; margin-bottom:4px;">
                        🪡🛡️ ACTIVE GARRISON ROSTER — 8-TIER RUNIC BODY-CARVING (CA-13) &amp; 9-STAT DRILLS
                    </div>
                    ${agents.map(a => {
                        const eq = a.equipment || {};
                        const gearSummary = [eq.weapon?.name, eq.armor?.name, eq.trinket?.name].filter(Boolean).join(', ') || 'Standard Issue';
                        const cStage = a.cultivation?.stage || 0;
                        const nextTier = Math.min(8, cStage + 1);
                        const tCfg = tierCatalog[nextTier] || { fuelCost: 10, resCost: 12, sealCost: 0, tool: 'Bone Needles' };
                        const totalLife = (a.cultivation?.naturalLifespanYears || 311) + (a.cultivation?.bonusLifespanYears || 0);
                        const activeDrill = a.operatingStance?.mode === 'TRAIN' ? a.operatingStance.discipline : '';
                        const sealBadge = tCfg.sealCost > 0 ? `, ${tCfg.sealCost}💎` : '';
                        const carveBtnLabel = cStage >= 8
                            ? `🪡 Tier VIII/8 Max (48/48 Runes)`
                            : `🪡 Carve Tier ${nextTier}/8 (${nextTier * 6}/48 Runes | -${nextTier <= 3 ? 10 : tCfg.fuelCost}u, -${tCfg.resCost}r${sealBadge})`;

                        const trainStats = [
                            ['STRENGTH', 'STR', a.skills.strength],
                            ['TOUGHNESS', 'TGH', a.skills.toughness],
                            ['MELEE_ATT', 'ATT', a.skills.meleeAtt],
                            ['MELEE_DEF', 'DEF', a.skills.meleeDef],
                            ['ATHLETICS', 'ATH', a.skills.athletics],
                            ['DODGE', 'DDG', a.skills.dodge],
                            ['STEALTH', 'STL', a.skills.stealth],
                            ['LORE', 'LOR', a.skills.lore],
                            ['SURVIVAL', 'SRV', a.skills.survival]
                        ];
                        const shiftTrained = a.shiftTrainedCategories || {};
                        const trainBtnsHtml = trainStats.map(([key, short, val]) => {
                            const isDrilling = activeDrill === key || (activeDrill === 'MARTIAL' && key === 'MELEE_ATT') || (activeDrill === 'LOGISTICS' && key === 'LORE');
                            const isCappedThisShift = (shiftTrained[key] || 0) >= 1;
                            const hiStyle = isDrilling
                                ? 'background:#14532d; border-color:#22c55e; color:#dcfce7;'
                                : (isCappedThisShift ? 'background:#334155; border-color:#64748b; color:#94a3b8; opacity:0.75;' : '');
                            const capBadge = isCappedThisShift ? '✓' : '';
                            return `<button class="cmd-btn" style="padding:1px 4px; font-size:8.5px; ${hiStyle}" title="${isCappedThisShift ? 'Already gained +1 this Shift (Max 1/Category per Shift)' : 'Train +1 Stat Point (1 Day — Locks Unit in Training Grounds)'}" onclick="window.trainAgentStat('${a.id}','${key}')">🏋️ ${short}:${Number(val).toFixed(0)}${capBadge}</button>`;
                        }).join('');

                        const queueSummary = Array.isArray(a.trainingQueue) && a.trainingQueue.length > 0
                            ? ` | <b style="color:#0284c7;">[QUEUE: ${a.trainingQueue.join(' ➔ ')}]</b>`
                            : '';
                        const cancelFee = Math.max(2, Math.floor((a.trainingCostPaid || 4) / 2));
                        const cancelTrainingBtn = (a.trainingLocked || activeDrill)
                            ? `<button class="cmd-btn" style="padding:2px 6px; font-size:9px; background:#3f1212; border-color:#ef4444; color:#fecaca; font-weight:bold;" onclick="window.cancelAgentTraining('${a.id}')">🔓 Cancel Training (-${cancelFee}r / 50% Cost)</button>`
                            : '';

                        return `
                        <div style="padding: 6px 0; border-bottom: 1px dashed #7c664d;">
                            <b style="color:#5e110b;">${a.name}</b> <span style="font-size:10px; color:#0e7490; font-weight:bold;">${a.cultivation?.isCultivatedGuardian ? `★ TIER ${cStage} ASCENDANT` : `(Tier ${cStage}/8)`}</span>
                            <span style="color:#463523; font-weight:bold;">(${a.career?.rank || 'Novice'} ${a.career?.id})</span>
                            <div style="font-size:9.5px; color:#1f160e; font-family:'Share Tech Mono',monospace;">HP: ${a.vitals.hp}/${a.vitals.maxHp} | Poise: ${Math.round(a.vitals.poise)} | Runes: ${a.cultivation?.inscriptionsCount || 0}/48 | Purity: ${a.cultivation?.foundationPurity ?? 100}% | Potential: ${a.cultivation?.potentialRemaining ?? 100}% | Lifespan: ${totalLife}y</div>
                            <div style="font-size:9.5px; color:#3f2e1e;">🗡️ Gear: [${gearSummary}] | Birthright: [${a.birthright?.title || 'None'}] ${activeDrill ? `| <b style="color:#b91c1c;">[🔒 LOCKED IN TRAINING: ${activeDrill} (+1/Day)]</b>` : ''}${queueSummary}</div>
                            <div style="margin-top:3px; display:flex; flex-wrap:wrap; gap:2px;">${trainBtnsHtml}</div>
                            <div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:3px;">
                                ${cancelTrainingBtn}
                                <button class="cmd-btn" style="padding:2px 6px; font-size:9.5px; border-color:#a855f7; background:#2e1065; color:#f3e8ff; font-weight:bold;" onclick="window.carveAgentRunes('${a.id}')">${carveBtnLabel}</button>
                                <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.viewAgentStatSheet('${a.id}')">📋 Sheet</button>
                                <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.equipAgentGear('${a.id}','${nextGearId}')">🗡️ Equip</button>
                                <button class="cmd-btn" style="padding:2px 5px; font-size:9.5px;" onclick="window.interrogateSuspect('${a.id}')">⚖️ Inquest</button>
                            </div>
                        </div>
                        `;
                    }).join('') || '<div style="color:#991b1b;">All garrison agents deceased.</div>'}
                </div>
            `;
            rosterDiv.innerHTML = recruitHtml + trainingGroundsSectionHtml + reconOutpostBannerHtml + carvingFacilityBanner + agentsHtml + marketHtml + armoryHtml;
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

