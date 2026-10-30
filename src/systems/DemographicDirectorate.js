// File: src/systems/DemographicDirectorate.js
import { PersonhoodConstants } from '../constants/PersonhoodConstants.js';

/**
 * DemographicDirectorate (The New Orchestrator)
 * Transforms the engine from a "Closed System" to an "Open System".
 * Responsible for overseeing global population health, reproduction triggers, and immigration.
 */
export class DemographicDirectorate {
    constructor(registry) {
        this.registry = registry;
        this.worldVitality = 1.0; // Global "Will to Live" scalar
        
        window.EventBus.on('HEARTBEAT_T30D', () => this.processMonthlyPulse());
        window.EventBus.emit('UI_LOG', '[Demographics] Directorate Established');
    }

    processMonthlyPulse() {
        this.updateWorldVitality();
        this.processVillageCapacities();
        this.triggerProcreationPulse();
        this.processImmigration();
        this.processMaturation();
    }

    /**
     * Phase 4: Education & Maturation
     * Aging is biological, but "Maturation" into a productive worker can be sped up.
     */
    processMaturation() {
        const profiles = window.PersonhoodManager?.profiles;
        if (!profiles) return;

        profiles.forEach(profile => {
            if (profile.role === 'INFANT') {
                // Natural maturation (takes ~18 years without help)
                // In this engine, 18 years = 18 * 14 = 252 days.
                // We'll use a progress scalar.
                profile.maturationProgress = (profile.maturationProgress || 0) + (1 / 252);
                
                // Maturation Career (Scholar) bonus
                const village = window.VillageManager?.villages.find(v => v.id === profile.property?.homeVillageId);
                if (village) {
                    const scholars = village.residents.filter(r => {
                        const p = window.PersonhoodManager.profiles.get(r.id);
                        return p && p.role === 'SCHOLAR';
                    }).length;
                    
                    if (scholars > 0) {
                        const educationBonus = scholars * 0.05; // 5% boost per scholar
                        profile.maturationProgress += (1 / 252) * educationBonus;
                    }
                }

                if (profile.maturationProgress >= 1.0) {
                    profile.role = 'COMMONER';
                    profile.lifeStage = 'ADOLESCENT';
                    delete profile.maturationProgress;
                    window.EventBus.emit('UI_LOG', `🎓 [EDUCATION] ${profile.id} has matured into a productive adult.`);
                }
            }
        });
    }

    processImmigration() {
        if (!window.VillageManager) return;

        window.VillageManager.villages.forEach(village => {
            // High Prestige and Runic Barrier Strength, but low Population
            const prestige = village.stats.prosperity; // Proxy for prestige for now
            const barrier = village.barrierIntegrity;
            const popRatio = village.population.current / village.population.capacity;

            if (prestige > 70 && barrier > 80 && popRatio < 0.6) {
                if (Math.random() < 0.15 * this.worldVitality) {
                    this.spawnDrifter(village.id);
                }
            }
        });
    }

    spawnDrifter(villageId) {
        const village = window.VillageManager.villages.find(v => v.id === villageId);
        if (!village) return;

        const drifterId = `drifter_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const profile = window.PersonhoodManager.getProfile(drifterId);
        
        // Drifters are typically adults looking for work
        profile.age = 18 + Math.floor(Math.random() * 12);
        profile.lifeStage = 'ADOLESCENT';
        profile.property.homeVillageId = villageId;
        profile.statusTags = profile.statusTags || {};
        profile.statusTags.DRIFTER = true;

        // Career Integration: Assign based on village deficit
        if (window.CareerSystem) {
            window.CareerSystem.assignDeficitRole(drifterId, villageId);
        } else {
            // Manual fallback: if food low, become farmer
            if (village.stats.food < village.population.current * 10) {
                profile.role = 'FARMER';
                profile.skills.farming.level += 10;
            } else {
                profile.role = 'LABORER';
            }
        }

        village.population.current++;
        village.residents.push({ id: drifterId, prefab: 'Commoner', ox: 0, oz: 0 });

        window.EventBus.emit('UI_LOG', `🚶 [IMMIGRATION] A drifter has arrived at ${village.name} seeking a new life.`);
    }

    /**
     * World Vitality: A scalar derived from global prosperity and hazard levels.
     * Higher vitality increases fertility and immigration.
     */
    updateWorldVitality() {
        // Logic will be expanded as other systems integrate
        // For now, baseline is stable.
        this.worldVitality = 1.0; 
    }

    processVillageCapacities() {
        // Reserved for PHASE 3: Immigration logic
    }

    calculateFertility(profile) {
        if (!profile || profile.isDead) return 0;
        
        const age = profile.age;
        if (age < PersonhoodConstants.MIN_BIRTH_AGE || age > PersonhoodConstants.MAX_BIRTH_AGE) {
            return 0;
        }

        // 1. Peak Fertility Curve (Parabolic)
        // Peak at 20-30, drops off towards MIN/MAX_BIRTH_AGE
        // The dev plan specifies Peak at 20-30.
        const peakStart = 20;
        const peakEnd = 30;
        let ageFactor = 1.0;
        
        if (age < peakStart) {
            ageFactor = (age - PersonhoodConstants.MIN_BIRTH_AGE) / (peakStart - PersonhoodConstants.MIN_BIRTH_AGE);
        } else if (age > peakEnd) {
            ageFactor = 1.0 - (age - peakEnd) / (PersonhoodConstants.MAX_BIRTH_AGE - peakEnd);
        }
        ageFactor = Math.max(0, ageFactor);

        // 2. Health Factor (from MortalitySystem/Profile tags)
        let healthFactor = 1.0;
        if (profile.statusTags?.ILLNESS) healthFactor *= 0.5;
        if (profile.statusTags?.MALNUTRITION) healthFactor *= 0.3;
        if (profile.survival?.stress > 50) healthFactor *= 0.8;

        // 3. Vitality (World-level "Will to Live")
        const vitalityFactor = this.worldVitality;

        // Base fertility rate (monthly chance)
        const baseRate = 0.08; 

        return baseRate * ageFactor * healthFactor * vitalityFactor;
    }

    /**
     * The Biological Pulse: Triggered monthly.
     */
    triggerProcreationPulse() {
        const profiles = window.PersonhoodManager?.profiles;
        if (!profiles) return;

        profiles.forEach(profile => {
            if (profile.isDead || profile.age < PersonhoodConstants.MIN_BIRTH_AGE) return;
            
            // Check if NPC has a spouse (biological loop requirement)
            const relations = window.KinshipManager?.socialGraph.get(profile.id);
            if (!relations) return;

            const spouseId = Array.from(relations.entries()).find(([id, data]) => data.type === 'SPOUSE')?.[0];
            if (!spouseId) return;

            // Only one partner triggers the check to avoid double counting per couple
            if (profile.id < spouseId) {
                const fertilityChance = this.calculateFertility(profile);
                if (Math.random() < fertilityChance) {
                    this.executeConception(profile.id, spouseId);
                }
            }
        });
        
        // Debug telemetry
        window.EventBus.emit('UI_LOG_DEBUG', `[DEMOGRAPHICS] Procreation pulse completed. Vitality: ${this.worldVitality.toFixed(2)}`);
    }

    executeConception(parentA_Id, parentB_Id) {
        const parentA = window.PersonhoodManager.profiles.get(parentA_Id);
        const villageId = parentA.property?.homeVillageId;

        // Defensive Boundary: Malthusian Gate
        if (!this.canVillageSupportBirth(villageId)) {
            window.EventBus.emit('UI_LOG_DEBUG', `[DEMOGRAPHICS] Conception failed in Village ${villageId}: Malthusian Gate Active (Full Capacity).`);
            return;
        }

        window.EventBus.emit('NPC_BORN', {
            parentA: parentA_Id,
            parentB: parentB_Id,
            villageId: villageId,
            timestamp: Date.now()
        });
    }

    /**
     * Validate if a village can support more births (Malthusian Gate).
     */
    canVillageSupportBirth(villageId) {
        if (!window.VillageManager) return true; // Fail safe
        const village = window.VillageManager.villages.find(v => v.id === villageId);
        if (!village) return false;

        const population = village.population?.length || 0;
        const capacity = village.stats?.capacity || 50; // Default capacity

        return population < capacity;
    }
}
