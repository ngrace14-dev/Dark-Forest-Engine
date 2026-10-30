// File: src/systems/SystemRegistry.js
import { HazardCascade } from './hazard/HazardCascade.js';
import { MortalitySystem } from './mortality/MortalitySystem.js';
import { EpidemicSystem } from './mortality/EpidemicSystem.js';
import { SocialDynamicsSystem } from './SocialDynamicsSystem.js';

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
        
        // Link settlement back to systems
        this.social.mortalitySystem = this.mortality;
        this.social.hazardCascade = this.hazards;
    }

    update(delta) {
        // Ticks for high-level simulation
        // In a real implementation, this might happen at a slower rate than physics
    }
}
