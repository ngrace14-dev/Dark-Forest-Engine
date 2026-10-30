// File: src/systems/SystemRegistry.js

import { DemographicDirectorate } from './DemographicDirectorate.js';
import { HazardCascade } from './hazard/HazardCascade.js';
import { MortalitySystem } from './mortality/MortalitySystem.js';
import { EpidemicSystem } from './mortality/EpidemicSystem.js';
import { SocialDynamicsSystem } from './SocialDynamicsSystem.js';

import { SubversiveReactionPipeline } from './underground/SubversiveReactionPipeline.js';

import { JurisprudenceSystem } from './underground/JurisprudenceSystem.js';
import { AdminBureau } from './administration/AdminBureau.js';

/**
 * SystemRegistry
 * Central hub for accessing core simulation systems.
 */
export class SystemRegistry {
    constructor() {
        this.social = new SocialDynamicsSystem();
        this.mortality = new MortalitySystem(this.social);
        this.hazards = new HazardCascade(this.mortality);
        this.epidemic = new EpidemicSystem(this.mortality);
        this.underground = new SubversiveReactionPipeline(this.social);
        this.jurisprudence = new JurisprudenceSystem(this.social);
        this.administration = new AdminBureau();
        this.demographics = new DemographicDirectorate(this);
        
        // Link settlement back to systems
        this.social.mortalitySystem = this.mortality;
        this.social.hazardCascade = this.hazards;
        this.social.underground = this.underground;
        this.social.jurisprudence = this.jurisprudence;
        this.social.administration = this.administration;
        
        this.administration.init();
    }

    update(delta) {
        // Ticks for high-level simulation
        // In a real implementation, this might happen at a slower rate than physics
    }
}
