// File: src/systems/underground/JurisprudenceSystem.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * JurisprudenceSystem
 * Handles capture, trial, and sentencing of subversive actors.
 */
export class JurisprudenceSystem {
    constructor(settlement) {
        this.settlement = settlement;
    }

    /**
     * Entry point: Try an apprehended actor.
     */
    tryActor(actor) {
        console.log(`[Justice] Trial started for ${actor.id}. Current Subversive Role: ${actor.subversiveRole}`);
        
        const scores = this.calculateSentencingVector(actor);
        const doctrine = this.selectPunishmentDoctrine(scores);

        this.applySentence(actor, doctrine);
    }

    calculateSentencingVector(actor) {
        const m = {
            aggression: this.settlement.getAverageTrait('aggression'),
            fear: this.settlement.getAverageTrait('fear'),
            cynicism: this.settlement.getAverageTrait('cynicism'),
            ambition: this.settlement.getAverageTrait('ambition'),
            altruism: this.settlement.getAverageTrait('altruism'),
            sociability: this.settlement.getAverageTrait('sociability'),
            consc: this.settlement.getAverageTrait('conscientiousness')
        };

        const actorPrestige = actor.prestige || 0.5;

        const sExecution = (0.4 * m.aggression) + (0.3 * m.fear) + (0.3 * m.cynicism) - (0.3 * actorPrestige);
        const sPenalLabor = (0.5 * m.ambition) + (0.3 * m.cynicism) - (0.2 * m.altruism);
        const sPillory = (0.4 * m.sociability) + (0.3 * m.consc) - (0.2 * m.aggression);
        const sRehab = (0.5 * m.altruism) + (0.3 * m.consc) - (0.4 * m.cynicism);

        return {
            Execution: sExecution,
            PenalLabor: sPenalLabor,
            Pillory: sPillory,
            Rehabilitation: sRehab
        };
    }

    selectPunishmentDoctrine(scores) {
        let maxScore = -Infinity;
        let maxDoctrine = 'Banishment'; // Fallback

        for (const [doctrine, score] of Object.entries(scores)) {
            if (score > maxScore && score > PersonhoodConstants.JUDICIAL_THRESHOLD) {
                maxScore = score;
                maxDoctrine = doctrine;
            }
        }

        return maxDoctrine;
    }

    applySentence(actor, doctrine) {
        console.warn(`[Justice] ${actor.id} sentenced to ${doctrine.toUpperCase()}`);
        
        actor.penalRecord = actor.penalRecord || { priorOffenses: 0, statusFlags: {} };
        actor.penalRecord.priorOffenses++;
        actor.penalRecord.currentSentence = {
            type: doctrine,
            cyclesRemaining: this.getSentenceDuration(doctrine)
        };

        switch (doctrine) {
            case 'Execution':
                this.executePublicSentence(actor);
                break;
            case 'PenalLabor':
                this.assignPenalLabor(actor);
                break;
            case 'Pillory':
                this.assignPillory(actor);
                break;
            case 'Rehabilitation':
                this.assignRehabilitation(actor);
                break;
            case 'Banishment':
                this.assignBanishment(actor);
                break;
        }
    }

    getSentenceDuration(doctrine) {
        switch(doctrine) {
            case 'Pillory': return 6; // 6 months
            case 'PenalLabor': return 18;
            case 'Rehabilitation': return 12;
            default: return 0;
        }
    }

    // --- Penal Doctrines ---

    executePublicSentence(actor) {
        // Psychological Impact on witnesses
        const witnesses = this.settlement.getActors();
        for (const witness of witnesses) {
            if (witness === actor || witness.isDead) continue;
            TraitSystem.applyExperientialDrift(witness, {
                fear: 0.15,
                loyalty: 0.05
            });
        }

        // Diversity Penalty
        if (this.settlement.justiceSystem) {
            this.settlement.justiceSystem.diversityPurgeTracker += PersonhoodConstants.SENTENCE_DIVERSITY_PENALTY;
        }
        
        // Martyr Trigger
        if (actor.tags && actor.tags.includes('TouchedByTheShade')) {
            console.error(`[Justice] MARTYRDOM TRIGGERED for ${actor.id}`);
            const indigent = witnesses.filter(a => a.status === 'Indigent' && !a.isDead && a !== actor);
            for (const person of indigent) {
                TraitSystem.applyExperientialDrift(person, {
                    cynicism: 0.35,
                    aggression: 0.25
                });
            }
        }

        this.settlement.mortalitySystem.executeDeath(actor, "Public Execution");
    }

    assignPenalLabor(actor) {
        actor.socialRole = 'PenalLaborer';
        // Fatigue floor and accident multipliers are handled in HazardCascade
    }

    assignPillory(actor) {
        actor.prestige = 0;
        actor.tags = actor.tags || [];
        if (!actor.tags.includes('ScarredByTheStocks')) {
            actor.tags.push('ScarredByTheStocks');
        }
        // Disease vulnerability handled in MortalitySystem
    }

    assignRehabilitation(actor) {
        actor.socialRole = 'ConvictRehab';
        // Trait scrubbing handled in tick loop
    }

    assignBanishment(actor) {
        actor.penalRecord.statusFlags.isBrandedOutlaw = true;
        this.settlement.underground.handlePathExile(actor);
    }

    /**
     * To be called from the main tick loop.
     */
    processSentenceTick(actor) {
        const sentence = actor.penalRecord?.currentSentence;
        if (!sentence || sentence.cyclesRemaining <= 0) return;

        sentence.cyclesRemaining--;

        if (sentence.type === 'Rehabilitation') {
            this.processRehabTick(actor);
        }

        if (sentence.cyclesRemaining <= 0) {
            this.releaseActor(actor);
        }
    }

    processRehabTick(actor) {
        const traits = ['aggression', 'cynicism', 'loyalty', 'riskTolerance', 'superstition'];
        const changes = {};
        
        for (const traitName of traits) {
            const mu = this.settlement.getAverageTrait(traitName);
            const current = (actor.traits && actor.traits[traitName] !== undefined) ? actor.traits[traitName] : 0.5;
            
            // Ensure both mu and current are numbers
            if (typeof mu === 'number' && typeof current === 'number') {
                const delta = PersonhoodConstants.REHAB_COMPRESSION_STRENGTH * (mu - current);
                changes[traitName] = delta;
            }
        }

        TraitSystem.applyExperientialDrift(actor, changes);
    }

    releaseActor(actor) {
        console.log(`[Justice] ${actor.id} has completed their sentence: ${actor.penalRecord.currentSentence.type}`);
        actor.penalRecord.currentSentence = null;
        
        if (actor.socialRole === 'ConvictRehab' || actor.socialRole === 'PenalLaborer') {
            actor.socialRole = 'Citizen'; // Or return to prior role
        }
    }
}
