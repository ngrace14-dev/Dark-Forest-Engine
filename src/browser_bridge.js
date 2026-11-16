/**
 * File: src/browser_bridge.js
 * Browser GUI bridge for the Standalone Commander & Chronicle dashboard.
 */

window.setCampaign = function(m) {
    window.CampaignManager?.selectCampaign(m);
    window.refreshUI();
};

window.advanceDays = function(n) {
    for (let i = 0; i < n; i++) {
        window.EngineParams.worldDay = (window.EngineParams.worldDay || 0) + 1;
        window.EventBus?.emit('DAY_TICK', { day: window.EngineParams.worldDay });
        window.BarrierPipeline?.tickDailyProduction?.();
        window.DuneDriftSystem?.tickDailyDrift?.();
        window.ShiftDirector?.checkCycle?.();
        window.CampaignManager?.processDailyLogistics?.();
    }
    window.refreshUI();
};

window.dispatchCmd = function(a, arg = null) {
    const res = window.CampaignManager?.dispatchAction(a, arg);
    alert(res?.message || 'Directive executed.');
    window.refreshUI();
};

window.viewTelemetry = function() {
    const list = window.CampaignManager?.getBedrockTelemetry() || [];
    let text = "================================================================================\n";
    text += "🏛️ THE 20 BEDROCK CHAINED SETTLEMENTS (FOREST & MOUNTAIN RING)\n";
    text += "================================================================================\n\n";
    list.forEach((v, i) => {
        text += `${String(i + 1).padStart(2, ' ')}. ${v.name.padEnd(18, ' ')} | House: ${v.house.padEnd(16, ' ')} | Fuel: ${v.barrierFuel}u | Chains: ${v.chainsIntegrity}%\n`;
    });
    text += "\n(Note: The 20 Dune Flotillas remain forgotten/lost beneath the sand horizon.)\n";
    const b = document.getElementById('story-reader');
    if (b) {
        b.style.display = 'block';
        b.innerText = text;
    }
};

window.viewWarBoard = function() {
    const board = window.CampaignManager?.getWarBoard() || [];
    let text = "================================================================================\n";
    text += "🏰 THE 19 NOBLE HOUSES & FEUDAL WAR BOARD\n";
    text += "================================================================================\n\n";
    text += "👑 THE 9 BLESSED HOUSES (MAJOR MONOPOLIES):\n";
    board.filter(h => h.blessed).forEach((h, i) => {
        text += `  ${i + 1}. ${h.name.padEnd(16, ' ')} | Monopoly: ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | Power: ${h.power}\n`;
    });
    text += "\n⚔️ THE 10 CHALLENGER HOUSES:\n";
    board.filter(h => !h.blessed).forEach((h, i) => {
        text += `  ${i + 10}. ${h.name.padEnd(16, ' ')} | Output: ${h.monopoly.padEnd(28, ' ')} | [${h.status}] | Power: ${h.power}\n`;
    });
    const b = document.getElementById('story-reader');
    if (b) {
        b.style.display = 'block';
        b.innerText = text;
    }
};

window.interrogateSuspect = function(targetId = 'agt_2') {
    const inq = window.InterrogationDesk?.interrogate(targetId);
    const b = document.getElementById('story-reader');
    if (b) {
        b.style.display = 'block';
        b.innerText = inq?.text || "No active inquest.";
    }
};

window.renderVerdict = function(targetId, vType) {
    const res = window.InterrogationDesk?.renderVerdict(targetId, vType);
    alert(res?.message || 'Verdict rendered.');
    window.refreshUI();
};

window.viewStory = function(id) {
    const d = window.CrucibleNarrativeEngine?.formatDossier(id);
    const p = window.CrucibleNarrativeEngine?.expandStory(id);
    const b = document.getElementById('story-reader');
    if (b) {
        b.style.display = 'block';
        b.innerText = `${d}\n\n${p}`;
    }
};

window.sampleDeath = function() {
    window.CrucibleNarrativeEngine?.processActorDeath({
        id: 'vet_cornelius',
        name: 'Master Cornelius Vane',
        cause: 'White Void exposure during 14-day Shift'
    });
    window.refreshUI();
    window.viewStory('vet_cornelius');
};

window.exportSave = function() {
    const legacy = window.CampaignManager?.exportLegacySave();
    if (!legacy) return;
    const blob = new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'world_seed_legacy.json';
    a.click();
    URL.revokeObjectURL(url);
    alert(`Legacy Save Exported!\nCandidate: ${legacy.candidate?.name || 'Wanderer'}\nAncestors: ${legacy.ancestors.length}\nReady for July 3D Main Game Import!`);
};

window.refreshUI = function() {
    if (!window.CampaignManager) return;
    const s = window.CampaignManager.getCampaignStatus();
    const d = s.day;
    const shiftDays = 14 - (d % 14);
    const st = s.state;
    let m = `Day: ${d} (Year ${Math.floor(d/365)+12000} AF) | Shift in: ${shiftDays}d | Mode: [${s.mode}]`;
    if (s.mode === 'HOUSE') m += ` | Fuel: ${st.barrierFuelUnits}u | Chains: ${st.chainsIntegrity}%`;
    if (s.mode === 'ORDER') m += ` | Anomalies: ${st.containedAnomalies} | Entropy: ${st.blindSpotEntropy}%`;
    if (s.mode === 'DUNE') m += ` | Water: ${st.cleanedWaterStock}u | Drift: ${st.driftDistanceKm?.toFixed(1)}km`;
    
    const sb = document.getElementById('status-bar');
    if (sb) sb.innerText = m;

    const dispDiv = document.getElementById('dispatches-list');
    if (dispDiv) {
        const disps = window.LogDispatchManager?.dispatches || [];
        dispDiv.innerHTML = disps.slice(0, 5).map(x => `
            <div class="dispatch">
                <b style="color:#fbbf24;">${x.type} — Day ${x.day} | ${x.sender}</b>
                <div style="color:#f59e0b;">${x.title}</div>
                <div style="color:#cbd5e1;">"${x.body}"</div>
            </div>
        `).join('') || '<div style="color:#78350f;">No dispatches yet.</div>';
    }

    const rosterDiv = document.getElementById('roster-list');
    if (rosterDiv) {
        const agents = Array.from(window.AgentRosterManager?.agents?.values() || []);
        rosterDiv.innerHTML = agents.map(a => `
            <div style="padding: 4px 0; border-bottom: 1px solid #1e293b;">
                <b style="color:#fbbf24;">${a.name}</b> <span style="font-size:10px; color:#f59e0b;">${a.cultivation?.isCultivatedGuardian ? '★ 300 GUARDIAN' : ''}</span>
                <span style="color:#78350f;">(${a.career?.rank || 'Novice'} ${a.career?.id})</span>
                <div style="font-size:10px; color:#94a3b8;">Birthright: [${a.birthright?.title || 'None'}] | Shift Birthday: Day ${a.firstShiftSurvivedDay} AF (${a.shiftsSurvived || 0} Shifts)</div>
                <div style="margin-top:2px;">
                    <button class="btn" style="padding:2px 5px; font-size:9px;" onclick="window.AgentRosterManager.setTraining('${a.id}','logistics'); window.refreshUI();">Train Logistics</button>
                    <button class="btn" style="padding:2px 5px; font-size:9px;" onclick="window.AgentRosterManager.setTraining('${a.id}','martial'); window.refreshUI();">Train Martial</button>
                    <button class="btn" style="padding:2px 5px; font-size:9px;" onclick="window.dispatchCmd('CULTIVATE_RUNIC','${a.id}')">Cultivate Runic</button>
                </div>
            </div>
        `).join('');
    }

    const necDiv = document.getElementById('story-archive');
    if (necDiv) {
        const bios = window.CrucibleNarrativeEngine?.getAllBiographies() || [];
        if (bios.length === 0) {
            necDiv.innerHTML = `<div style="color:#78350f;">No deaths recorded yet.</div><button class="btn" onclick="sampleDeath()">Create Sample Veteran Case File</button>`;
        } else {
            necDiv.innerHTML = bios.map(b => `
                <div style="padding: 3px 0;">
                    <b style="color:#fbbf24;">${b.name}</b> (Age ${b.ageYears}, Day ${b.deathDay} AF)
                    <button class="btn" onclick="viewStory('${b.id}')">View Story</button>
                </div>
            `).join('');
        }
    }
};

window.addEventListener('load', () => setTimeout(window.refreshUI, 600));