/**
 * File: src/systems/crucible_narrative.js
 * Actor Biography & Defining Crucible Moment Expander
 * Records lifelong failures, triumphs, survivorship, and world impact.
 */

window.CrucibleNarrativeEngine = {
    crucibles: new Map(),   // Map<actorId, Array<Crucible>>
    biographies: new Map(), // Map<actorId, Dossier>
    livingDossiers: new Map(), // Map<actorId, LivingRecord>

    init: function() {
        if (typeof window !== 'undefined' && window.EventBus) {
            window.EventBus.on('ENTITY_DIED', (data) => this.processActorDeath(data));
            window.EventBus.on('ENTITY_DEATH', (data) => this.processActorDeath(data));
            window.EventBus.on('CRUCIBLE_TRIGGERED', (data) => this.recordCrucible(data.actorId, data));
        }
    },

    registerLivingActor: function(id, name, role = 'Warden', house = 'House Terminus', settlement = "World's End Gate") {
        const day = window.EngineParams?.worldDay || 1;
        const living = {
            id,
            name,
            birthDay: Math.max(1, day - Math.floor(20 + Math.random() * 30) * 365),
            role,
            house,
            settlement,
            rank: 'Journeyman',
            contractsFulfilled: Math.floor(Math.random() * 8) + 1,
            truthsVerified: 0,
            scars: [],
            lineage: {
                spouse: null,
                children: [],
                apprentices: [],
                mentor: 'Master Cornelius'
            }
        };
        this.livingDossiers.set(id, living);
        return living;
    },

    recordCrucible: function(actorId, data) {
        if (!this.crucibles.has(actorId)) this.crucibles.set(actorId, []);
        const entry = {
            id: `crucible_${actorId}_${Date.now()}`,
            day: data.day || window.EngineParams?.worldDay || 0,
            type: data.type || 'CATASTROPHIC_FAILURE',
            title: data.title || 'The Snapped Ash-Bow of the Silt-Veil',
            intensity: data.intensity || 85,
            location: data.location || "World's End Gate Perimeter",
            catalyst: data.catalyst || 'Bowstring snapped in the freezing fog; hesitated for three heartbeats.',
            fallout: data.fallout || 'Supply cart was lost to the mist; apprentice was dragged beneath the crust.',
            scar: data.scar || 'Refused to carry hemp cord for the rest of their natural life.',
            cast: data.cast || { witnesses: ['Bailiff Mallow'], casualties: ['Apprentice Jon'] }
        };
        this.crucibles.get(actorId).push(entry);
        return entry;
    },

    processActorDeath: function(deathData) {
        const id = deathData?.id || deathData?.victim?.id || 'actor_unknown';
        const name = deathData?.victim?.name || deathData?.name || id;
        const cause = deathData?.cause || 'natural causes during the 14-day Shift';
        const day = window.EngineParams?.worldDay || 0;

        let survivors = [];
        let successor = null;

        if (window.PersonhoodManager) {
            const profile = window.PersonhoodManager.getProfile?.(id);
            if (profile) {
                successor = window.PersonhoodManager.findSuccessor?.(profile);
                if (profile.apprentices?.length > 0) survivors.push(`Apprentice ${profile.apprentices[0]}`);
                if (profile.ancestry?.children?.length > 0) survivors.push(`${profile.ancestry.children.length} surviving kin`);
            }
        }
        if (survivors.length === 0) survivors.push("No recorded kin; survived only by settlement creditors");

        let actorCrucibles = this.crucibles.get(id) || [];
        if (actorCrucibles.length === 0) {
            actorCrucibles.push(this.recordCrucible(id, {
                type: 'SOLITARY_END',
                title: 'The Cold Midnight on the Boundary Ditches',
                intensity: 60,
                catalyst: 'Breathed the white frost when the barrier flickered below safety margin.',
                fallout: 'Found leaning against a boundary stone with frozen fingers.',
                scar: 'The ditch now bears a carved notch in their remembrance.'
            }));
        }

        const definingMoment = actorCrucibles.sort((a, b) => b.intensity - a.intensity)[0];
        const livingRec = this.livingDossiers.get(id);
        const agentRec = window.AgentRosterManager?.agents?.get(id);

        const birthDay = agentRec?.birthDay || livingRec?.birthDay || Math.max(1, day - Math.floor(40 * 365));
        const ageYears = Math.max(16, Math.floor((day - birthDay) / 365));
        const firstShift = agentRec?.firstShiftSurvivedDay || Math.ceil(birthDay / 14) * 14;
        const shiftsSurvived = agentRec?.shiftsSurvived || Math.floor(ageYears * 26);
        const birthright = agentRec?.birthright?.title || 'Storm-Born';
        const conditions = (agentRec?.statusEffects || []).map(s => s.name);
        if (conditions.length === 0) conditions.push('Shift Vigor');

        const bio = {
            id,
            name,
            birthDay,
            firstShiftSurvivedDay: firstShift,
            shiftsSurvived,
            birthright,
            conditions,
            deathDay: day,
            ageYears,
            cause,
            settlement: livingRec?.settlement || "World's End Gate",
            house: livingRec?.house || "House Terminus",
            role: livingRec?.role || agentRec?.career?.rank || "Warden-Scout",
            contractsFulfilled: livingRec ? livingRec.contractsFulfilled : Math.floor(Math.random() * 6) + 1,
            survivors,
            successor: successor || "None (knowledge uninherited)",
            definingMoment,
            allCrucibles: actorCrucibles,
            epitaph: this._generateGothicEpitaph(name, definingMoment)
        };

        this.biographies.set(id, bio);
        return bio;
    },

    _generateGothicEpitaph: function(name, crucible) {
        const lines = [
            `"He counted the paces the cold forgot; the Gate stands heavier for his silence."`,
            `"They left their iron in the ditch and their name to the winter wind."`,
            `"No bell was rung when the chain went slack, but the mist remembers where they stood."`,
            `"A life weighed in pine-resin and measured by the shifting stones."`
        ];
        return lines[Math.floor(Math.random() * lines.length)];
    },

    getBiography: function(query) {
        if (!query) return null;
        const q = query.toLowerCase().trim();
        if (this.biographies.has(query)) return this.biographies.get(query);
        for (const [id, b] of this.biographies.entries()) {
            if (id.toLowerCase() === q || b.name.toLowerCase().includes(q)) return b;
        }
        return null;
    },

    getAllBiographies: function() {
        return Array.from(this.biographies.values());
    },

    formatDossier: function(query) {
        const bio = this.getBiography(query);
        if (!bio) return `\n[ARCHIVE ERROR] No post-mortem dossier found for query: "${query}".`;

        const cru = bio.definingMoment;
        return `
================================================================================
📜 POST-MORTEM CASE FILE: ${bio.name.toUpperCase()} (${bio.id})
================================================================================
Affiliation:     ${bio.house} | Seat: ${bio.settlement}
Career Title:    ${bio.role}
Circumstance:    Birthright: [${bio.birthright}]
Shift Birthday:  Day ${bio.firstShiftSurvivedDay} AF (${bio.shiftsSurvived} Fortnightly Shifts Survived)
Lifespan:        Born Day ${bio.birthDay} AF → Perished Day ${bio.deathDay} AF (Age ${bio.ageYears})
Cause of Death:  ${bio.cause}
Active Traits:   ${bio.conditions.join(', ')}

─── 🌳 LINEAGE & SURVIVORSHIP ──────────────────────────────────────────────────
Survived By:
${bio.survivors.map(s => `  • ${s}`).join('\n')}
Designated Heir: ${bio.successor}

─── ⚔️ WORLD IMPACT FOOTPRINT ──────────────────────────────────────────────────
  • Contracts Executed: ${bio.contractsFulfilled} boundary sorties completed.
  • Fortnightly Shifts Endured: ${bio.shiftsSurvived} cycles.
  • Settlement Stability Contribution: +8.4 Index points.

─── 📖 DEFINING CRUCIBLE MOMENT ────────────────────────────────────────────────
  "${cru ? cru.title : 'None Recorded'}"
  Location: ${cru ? cru.location : 'Unknown'} (Day ${cru ? cru.day : 'N/A'})
  Catalyst: ${cru ? cru.catalyst : 'N/A'}
  Lifelong Scar: ${cru ? cru.scar : 'None'}

─── 🪦 FOLK EPITAPH ────────────────────────────────────────────────────────────
  ${bio.epitaph}
================================================================================
(Type 'expand ${bio.id}' to read the full prose account of their defining moment.)
`;
    },

    expandStory: function(query) {
        const bio = this.getBiography(query);
        const cru = bio?.definingMoment || (query ? this.crucibles.get(query)?.[0] : null);
        const actorName = bio?.name || query || 'The Traveler';

        if (!cru) return `\nNo recorded crucibles found for query: "${query}".`;

        return `
================================================================================
📜 THE DEFINING CRUCIBLE OF ${actorName.toUpperCase()}
   Incident: ${cru.title} (Recorded Day ${cru.day} AF)
================================================================================

[ACT I: THE STAKES]
The boundary woods did not move like mortal trees; they ground against the 
bedrock like millstones. ${actorName} stood at ${cru.location}, tasked with 
holding the perimeter before the 14-day Shift took the sun. The air was that 
heavy, copper purple that precedes coordinate rot.

[ACT II: THE CRISIS & FAILURE]
${cru.catalyst} In the freezing mist, there was no sound of a battle—only the 
dull thud of iron sinking into damp peat. For three heartbeats, no order was given. 
Those three heartbeats were all the forest required.

[ACT III: THE SCAR & AFTERMATH]
${cru.fallout} ${actorName} walked back through the gate alone, hands stained with 
pine resin and ash. Though they lived for seasons afterward, ${cru.scar}
================================================================================
`;
    }
};

window.CrucibleNarrativeEngine.init();