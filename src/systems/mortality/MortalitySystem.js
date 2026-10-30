// File: src/systems/mortality/MortalitySystem.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * MortalitySystem
 * Handles death, permanent injuries, and social transitions (Custodian vs Dependent).
 */
export class MortalitySystem {
    constructor(settlement) {
        this.settlement = settlement;
    }

    resolveLethalTrauma(actor, severity) {
        const ageVuln = TraitSystem.calculateAgeVulnerability(actor.age);
        const medicIntervention = actor.currentMedicalCare || 0;
        
        const pFatal = severity * 
                      (1.0 - 0.6 * actor.traits.constitution) * 
                      (1.0 + 0.5 * ageVuln) * 
                      (1.0 - medicIntervention);

        if (Math.random() < pFatal) {
            this.executeDeath(actor, "Fatal Catastrophe");
        } else {
            this.resolveSurvival(actor);
        }
    }

    executeDeath(actor, reason) {
        console.error(`[Mortality] ${actor.id} has died. Reason: ${reason}`);
        actor.isDead = true;
        // Notify settlement, cleanup, etc.
    }

    resolveSurvival(actor) {
        console.log(`[Mortality] ${actor.id} survived a Stage 3 catastrophe.`);
        
        // Permanent Trait Modification
        TraitSystem.applyExperientialDrift(actor, {
            riskTolerance: -0.30,
            fear: 0.35
        });

        actor.tags = actor.tags || [];
        if (!actor.tags.includes('CatastropheSurvivor')) {
            actor.tags.push('CatastropheSurvivor');
        }

        this.evaluateSocialTransition(actor);
    }

    evaluateSocialTransition(actor) {
        if (!actor || !actor.traits) return;

        const w = {
            prestige: PersonhoodConstants.SOCIO_WEIGHT_PRESTIGE,
            consc: PersonhoodConstants.SOCIO_WEIGHT_CONSCIENTIOUSNESS,
            wealth: PersonhoodConstants.SOCIO_WEIGHT_WEALTH,
            cynicism: PersonhoodConstants.SOCIO_WEIGHT_CYNICISM
        };

        const prestige = actor.prestige || 0.5;
        const conscientiousness = actor.traits.conscientiousness || 0.5;
        const wealth = actor.wealth || 0.5;
        const villageCynicism = this.settlement ? this.settlement.getAverageTrait('cynicism') : 0.5;

        // SocioCapitalScore = (w1 * Prestige) + (w2 * Conscientiousness) + (w3 * SettlementWealth) - (w4 * VillageCynicism)
        const score = (w.prestige * prestige) + 
                      (w.consc * conscientiousness) + 
                      (w.wealth * wealth) - 
                      (w.cynicism * villageCynicism);

        console.log(`[Mortality] ${actor.id} SocioCapitalScore: ${score.toFixed(3)}`);

        if (score >= PersonhoodConstants.SOCIO_CAPITAL_REVERED_THRESHOLD) {
            this.transitionToCustodian(actor);
        } else {
            this.transitionToDependent(actor);
        }
    }

    transitionToCustodian(actor) {
        console.log(`[Mortality] ${actor.id} transitioned to REVERED CUSTODIAN`);
        actor.socialRole = 'ReveredCustodian';
        actor.isManualLaborer = false;
        // Logic for Site Inspector, Apprentice Mentor, etc. would be handled by the job system
    }

    transitionToDependent(actor) {
        console.log(`[Mortality] ${actor.id} transitioned to DESTITUTE DEPENDENT`);
        actor.socialRole = 'DestituteDependent';
        actor.status = 'Indigent';
        actor.income = 0;
        
        TraitSystem.applyExperientialDrift(actor, {
            cynicism: 0.30,
            loyalty: -0.40,
            fear: 0.25
        });
    }

    processDiseaseTick(actor, disease) {
        if (actor.isDead) return;

        const ageVuln = TraitSystem.calculateAgeVulnerability(actor.age);
        const malnutrition = actor.isMalnourished ? PersonhoodConstants.MALNUTRITION_PENALTY : 0;
        
        let multiplier = 1.0;
        if (actor.penalRecord?.currentSentence?.type === 'Pillory') {
            multiplier = PersonhoodConstants.PILLORY_DISEASE_VULN_MULT;
        }

        const pDeath = disease.baseVirulence * 
                       (ageVuln * multiplier) * 
                       (1.0 - actor.traits.constitution) * 
                       (1.0 + malnutrition);

        if (Math.random() < pDeath) {
            this.executeDeath(actor, `Disease: ${disease.name}`);
        }
    }
}
