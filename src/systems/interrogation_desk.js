/**
 * File: src/systems/interrogation_desk.js
 * Inquest & Truth Interrogation Engine
 * Summons suspects to the commander's desk to cross-examine testimony against
 * verified intel, detecting spies, embezzlers, and Wendigo taint.
 */

window.InterrogationDesk = {
    suspects: new Map(),

    init: function() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('SUSPICION_FLAGGED', (data) => this.flagSuspect(data));
        }
    },

    flagSuspect: function(data) {
        const id = data.id || 'agt_2';
        const name = data.name || id;
        const reasons = [
            'Found carrying unsealed export manifests near the eastern ditch.',
            'Discrepancy in recorded resin barrel counts following border patrol.',
            'Body temperature measured three degrees below normal; avoids braziers.',
            'Spotted speaking with an unbadged courier from House Cull.'
        ];
        const crimeTypes = ['RIVAL_SPY', 'EMBEZZLER', 'WENDIGO_TAINT'];
        const rolledCrime = data.crime || crimeTypes[Math.floor(Math.random() * crimeTypes.length)];

        const suspectCase = {
            id,
            name,
            dayFlagged: window.EngineParams?.worldDay || 1,
            crime: rolledCrime,
            suspicionReason: data.reason || reasons[Math.floor(Math.random() * reasons.length)],
            deceptionScore: Math.floor(40 + Math.random() * 50),
            interrogated: false,
            resolved: false,
            verdict: null
        };
        this.suspects.set(id, suspectCase);
        return suspectCase;
    },

    interrogate: function(targetId) {
        let suspect = this.suspects.get(targetId);
        if (!suspect) suspect = this.flagSuspect({ id: targetId, name: targetId });
        suspect.interrogated = true;

        let txt = `\n================================================================================\n`;
        txt += `⚖️ FORMAL INQUEST PROCEEDINGS: ${suspect.name.toUpperCase()} (${suspect.id})\n`;
        txt += `================================================================================\n`;
        txt += `Grounds for Suspicion: "${suspect.suspicionReason}"\n`;
        txt += `Observed Stress Index: ${suspect.deceptionScore}% | Classification: ${suspect.crime}\n\n`;

        if (suspect.crime === 'RIVAL_SPY') {
            txt += `[TRANSCRIPT] When asked why House Cull wax seals were found in his kit, the suspect\nhesitated for four heartbeats, claiming he found them in the bracken.\n`;
        } else if (suspect.crime === 'WENDIGO_TAINT') {
            txt += `[TRANSCRIPT] When ordered to hold his hands over the basalt brazier, the suspect\ndid not flinch. His breath smelled of damp cellar lichen; skin cold to the touch.\n`;
        } else {
            txt += `[TRANSCRIPT] When confronted with missing resin tallies, the suspect swore the\ncasks leaked. Two unmonitored salt-deniers were found sewn into his boots.\n`;
        }

        txt += `\nEXECUTIVE VERDICTS AVAILABLE:\n`;
        txt += `  • verdict ${suspect.id} exonerate   → Dismiss charges (Restores loyalty).\n`;
        txt += `  • verdict ${suspect.id} demote      → Strip rank to boundary ash-carter.\n`;
        txt += `  • verdict ${suspect.id} execute     → Public hanging on palisade.\n`;
        txt += `  • verdict ${suspect.id} turn_agent  → Coerce into double agent (+1 Blackmail Dossier).\n`;
        txt += `================================================================================\n`;

        return { success: true, text: txt, suspect };
    },

    renderVerdict: function(targetId, verdictType) {
        const suspect = this.suspects.get(targetId);
        if (!suspect) return { success: false, message: `No active inquest found for "${targetId}".` };

        const v = (verdictType || '').toLowerCase();
        suspect.resolved = true;
        suspect.verdict = v.toUpperCase();

        let msg = "";
        if (v === 'exonerate') {
            msg = `[INQUEST] ${suspect.name} exonerated of all suspicion. Returned to duty.`;
        } else if (v === 'demote') {
            msg = `[INQUEST] ${suspect.name} stripped of rank and reassigned to boundary ditch ash-carting.`;
            const agent = window.AgentRosterManager?.agents?.get(targetId);
            if (agent) agent.career.rank = 'Ash-Carter';
        } else if (v === 'execute') {
            msg = `[INQUEST] ${suspect.name} executed on northern palisade. Treason chilled across settlement.`;
            const agent = window.AgentRosterManager?.agents?.get(targetId);
            if (agent) {
                agent.alive = false;
                window.CrucibleNarrativeEngine?.processActorDeath?.({
                    id: agent.id,
                    name: agent.name,
                    cause: 'Executed for high treason following formal inquest'
                });
            }
        } else if (v === 'turn_agent') {
            msg = `[INQUEST] ${suspect.name} broken under leverage. Turned into double agent against rival Houses!`;
            if (window.CampaignManager?.state?.house) {
                window.CampaignManager.state.house.blackmailDossiers = (window.CampaignManager.state.house.blackmailDossiers || 0) + 1;
            }
        } else {
            return { success: false, message: `Unknown verdict: "${verdictType}". Valid: exonerate, demote, execute, turn_agent.` };
        }

        if (window.EventBus) window.EventBus.emit('INQUEST_VERDICT_RENDERED', { suspect, verdict: v });
        return { success: true, message: msg };
    }
};

window.InterrogationDesk.init();