// File: src/systems/underground/SubversiveReactionPipeline.js
import { PersonhoodConstants } from '../../constants/PersonhoodConstants.js';
import { TraitSystem } from '../personhood/TraitSystem.js';

/**
 * SubversiveReactionPipeline
 * Routes impoverished/indigent actors into Crime, Cults, or Exile.
 */
export class SubversiveReactionPipeline {
    constructor(settlement) {
        this.settlement = settlement;
        this.apathyThreshold = 0.40;
    }

    /**
     * Process a tick for an indigent actor to determine their subversive affinity.
     */
    processIndigentTick(actor) {
        if (!actor || actor.status !== 'Indigent' || actor.isDead) return;

        const scores = this.calculateAffinities(actor);
        const dominant = this.getDominantPath(scores);

        if (dominant.score < (PersonhoodConstants.SUBVERSIVE_APATHY_THRESHOLD || this.apathyThreshold)) {
            this.handleApathy(actor);
            return;
        }

        switch (dominant.path) {
            case 'Crime':
                this.handlePathCrime(actor);
                break;
            case 'Cult':
                this.handlePathCult(actor);
                break;
            case 'Exile':
                this.handlePathExile(actor);
                break;
        }
    }

    calculateAffinities(actor) {
        const t = actor.traits;
        const isTouched = (actor.tags && actor.tags.includes('TouchedByTheShade')) ? 1.0 : 0.0;

        // Formula Implementation
        const sCrime = (0.4 * (t.aggression || 0.5)) + 
                       (0.3 * (t.riskTolerance || 0.5)) + 
                       (0.3 * (t.cynicism || 0.5)) - 
                       (0.2 * (t.fear || 0.5));

        const sCult = (0.4 * (t.cynicism || 0.5)) + 
                      (0.3 * (t.superstition || 0.5)) + 
                      (0.3 * (t.charisma || 0.5)) + 
                      (0.3 * isTouched);

        const sExile = (0.4 * (t.fear || 0.5)) + 
                       (0.3 * (1.0 - (t.loyalty || 0.5))) - 
                       (0.3 * (t.riskTolerance || 0.5));

        return { Crime: sCrime, Cult: sCult, Exile: sExile };
    }

    getDominantPath(scores) {
        let maxScore = -Infinity;
        let maxPath = 'Apathy';

        for (const [path, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                maxPath = path;
            }
        }

        return { path: maxPath, score: maxScore };
    }

    handleApathy(actor) {
        actor.subversiveRole = 'PassiveBeggar';
        // Passive beggars subsist on baseline charity
    }

    handlePathCrime(actor) {
        actor.subversiveRole = 'ShadowEconomy';
        console.log(`[Underground] ${actor.id} joined the Shadow Economy.`);
        
        // Granary Siphoning
        if (this.settlement && this.settlement.foodSupply > 0) {
            const stolen = 5; 
            this.settlement.foodSupply -= stolen;
            actor.personalFoodReserve = (actor.personalFoodReserve || 0) + stolen;
        }

        // Logic for Black Market, Sabotage, etc.
    }

    handlePathCult(actor) {
        actor.subversiveRole = 'HereticalFanatic';
        console.log(`[Underground] ${actor.id} joined a Heretical Cult.`);
        
        // Subversive Proselytizing: Cultural drift
        const neighbors = this.settlement.getNearbyActors(actor, 3.0);
        for (const neighbor of neighbors) {
            if (neighbor.age < 65) { // Adolescents and young adults
                TraitSystem.applyExperientialDrift(neighbor, {
                    loyalty: -0.05,
                    cynicism: 0.05,
                    superstition: 0.1
                });
            }
        }
    }

    handlePathExile(actor) {
        actor.subversiveRole = 'VagrantDiaspora';
        console.log(`[Underground] ${actor.id} is planning an Exile.`);
        
        // Track potential exodus
        this.settlement.exilePool = this.settlement.exilePool || [];
        if (!this.settlement.exilePool.includes(actor)) {
            this.settlement.exilePool.push(actor);
        }

        if (this.settlement.exilePool.length >= 5) {
            this.triggerMassExodus();
        }
    }

    triggerMassExodus() {
        console.warn(`[Underground] MASS EXODUS TRIGGERED!`);
        const group = this.settlement.exilePool.splice(0, 5);
        for (const actor of group) {
            actor.status = 'Exiled';
            actor.location = 'Wilderness';
            console.log(`[Underground] ${actor.id} has left the settlement.`);
        }
        // Logic for founding Squatter Outposts
    }
}
