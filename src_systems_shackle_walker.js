/**
 * GENESIS ENGINE - THE SHACKLED WALKER
 * Force: The Shackle
 * 
 * A dark shade that shambles endlessly on safe paths, crossing all villages once per shift.
 * Triggers spontaneous mutations and leaves a "Creeped Out" debuff.
 */

class ShackledWalkerSystem {
    constructor() {
        this.active = false;
        this.walkerEntity = null;
        this.currentVillageIndex = 0;
        this.isNight = false;
        this.hasCompletedShiftCycle = false;

        window.EventBus.on('ENGINE_READY', () => this.init());
        window.EventBus.on('HEARTBEAT_T1', () => this.update()); // 1Hz check
        window.EventBus.on('SHIFT_COMPLETE', () => this.resetCycle());
    }

    init() {
        window.EventBus.emit('UI_LOG', '⛓️ [The Shackle] The Bound Walker stirs in the white void...');
    }

    resetCycle() {
        this.currentVillageIndex = 0;
        this.hasCompletedShiftCycle = false;
        window.EventBus.emit('UI_LOG_DEBUG', '[The Shackle] Walker cycle reset for the new Epoch.');
    }

    update() {
        this.checkTimeOfDay();

        if (this.isNight && !this.hasCompletedShiftCycle && !this.active) {
            // SHADE TRIGGER HARDENING: Only spawn if ANY village is stagnant
            const stagnantVillage = window.VillageManager?.villages.find(v => this.evaluateVillageStagnation(v.id));
            
            if (stagnantVillage) {
                this.startWalking();
            }
        }

        if (this.active) {
            this.processWalking();
        }
    }

    /**
     * Lore-Grounded Triggering (Immune Response)
     * The Shade only spawns if the world's Trait Diversity is too low.
     */
    evaluateStagnationTrigger() {
        if (!window.TraitEvolution) return true; // Fallback to timer if observatory missing

        const diversity = window.TraitEvolution.stats.diversityIndex;
        // If diversity is below 0.15, the world is too homogenous, drawing the shadow.
        return diversity < 0.15;
    }

    checkTimeOfDay() {
        // Simple 12-hour game day simulation (t12h real = 1d game)
        // Night is the second half of the cycle
        if (!window.Heartbeat) return;
        const cycleProgress = (window.Heartbeat.accumulators.t12h || 0) / (window.Heartbeat.thresholds.t12h || 43200);
        this.isNight = cycleProgress > 0.5;
    }

    startWalking() {
        if (!window.VillageManager || window.VillageManager.villages.length === 0) return;
        
        this.active = true;
        this.currentVillageIndex = 0;
        this.spawnWalker();
        window.EventBus.emit('UI_LOG', '⛓️ [THE SHACKLE] A dark shadow shambles onto the Royal Road.');
    }

    spawnWalker() {
        if (!window.VillageManager || !window.GameCore) return;
        
        const startVillage = window.VillageManager.villages[0];
        // Prefab 'ShackleWalker' should be a dark shade with shackles
        this.walkerEntity = window.GameCore.instantiatePrefab('ShackleWalker', startVillage.x, 5, startVillage.z, 'persistent');
        
        if (this.walkerEntity) {
            this.walkerEntity.isShackleWalker = true;
            this.walkerEntity.name = 'The Shackled Walker';
            this.walkerEntity.noTalk = true;
            this.walkerEntity.noSleep = true;
            this.walkerEntity.isPhasing = true; // Logic to bypass collisions
            this.walkerEntity.moveSpeed = 10.0; // Shambling but steady
        }
    }

    processWalking() {
        if (!this.walkerEntity || !window.VillageManager || !window.RoadManager) return;

        const villages = window.VillageManager.villages;
        const targetVillage = villages[this.currentVillageIndex];

        if (!targetVillage) {
            this.finishWalking();
            return;
        }

        // --- HARDENING: STRICT ROAD NAVIGATION ---
        // Shackle must stay on the Road Geometry.
        const currentPos = this.walkerEntity.visual.position;
        const nextPathNode = window.RoadManager.getNextNodeToward(currentPos, targetVillage);
        
        if (!nextPathNode) {
            this.shambleToward(targetVillage); // Fallback
        } else {
            this.shambleToward(nextPathNode);
        }

        const distToVillage = Math.hypot(targetVillage.x - currentPos.x, targetVillage.z - currentPos.z);
        if (distToVillage < 5) {
            this.triggerVillageMutation(targetVillage);
            this.applyCreepedOutDebuff(targetVillage);
            this.currentVillageIndex++;
            if (this.currentVillageIndex >= villages.length) this.finishWalking();
        }
    }

    shambleToward(target) {
        if (!this.walkerEntity || !this.walkerEntity.visual) return;
        
        // Phase through objects and people
        const dx = target.x - this.walkerEntity.visual.position.x;
        const dz = target.z - this.walkerEntity.visual.position.z;
        const angle = Math.atan2(dx, dz);
        
        // Delta-time independent movement (approx 10m/s)
        const frameSpeed = this.walkerEntity.moveSpeed * 0.1;
        
        this.walkerEntity.visual.position.x += Math.sin(angle) * frameSpeed;
        this.walkerEntity.visual.position.z += Math.cos(angle) * frameSpeed;
        this.walkerEntity.visual.rotation.y = angle;
        
        // Ensure visual always has a valid Y (prevent sinking)
        this.walkerEntity.visual.position.y = 5;
    }

    /**
     * Determines whether a village's diversity is low enough to trigger the Walker.
     */
    evaluateVillageStagnation(villageId) {
        if (!window.TraitEvolution) return false;
        
        // Fetch regional diversity from Trait Evolution Bureau
        const regionalStats = window.TraitEvolution.stats.regionalDiversity?.get(villageId);
        if (!regionalStats) return window.TraitEvolution.stats.diversityIndex < 0.15;

        return regionalStats.diversityIndex < 0.15;
    }

    triggerVillageMutation(village) {
        if (!window.PersonhoodManager || !window.TraitEvolution) return;

        const profiles = Array.from(window.PersonhoodManager.profiles.values())
            .filter(p => p.property.homeVillageId === village.id);
        
        if (profiles.length === 0) return;

        // 1. TARGET SELECTION PIPELINE
        // Filter out Elders (age >= 250)
        const eligible = profiles.filter(p => p.age < 250);
        
        // Score Candidates: w1*(1-Social) + w2*IsUnbonded + w3*IsAdolescent
        eligible.forEach(p => {
            const isUnbonded = p.relationships.size === 0 ? 1 : 0;
            const isAdolescent = p.lifeStage === 'ADOLESCENT' ? 1 : 0;
            const socialStatus = (p.traits.credibility || 0.5);
            
            p._shacklePriority = (0.5 * (1.0 - socialStatus)) + (0.3 * isUnbonded) + (0.2 * isAdolescent);
        });

        eligible.sort((a, b) => b._shacklePriority - a._shacklePriority);

        // Select 5% to 8% of population
        const targetRate = 0.05 + (Math.random() * 0.03);
        const mutationCount = Math.ceil(eligible.length * targetRate);
        
        const villageMeans = window.TraitEvolution.getVillageMeans(village.id);
        let mutatedCount = 0;

        for (let i = 0; i < mutationCount; i++) {
            const target = eligible[i];
            if (target) {
                // --- HARDENING: MUTATION DROP TO 0.5% ---
                if (Math.random() < 0.005) {
                    this.executeHeresyInversion(target, villageMeans);
                    mutatedCount++;
                }
            }
        }

        if (mutatedCount > 0) {
            window.EventBus.emit('UI_LOG_DEBUG', `[THE SHACKLE] Executed Heresy Inversion on ${mutatedCount} souls in ${village.name}.`);
            window.ChronicleManager?.recordEvent({
                actorId: 'THE_SHACKLE',
                type: 'HERESY_INVERSION',
                detail: `The Bound Walker inverted the intent of the youth in ${village.name}.`,
                significance: 50,
                historicalWeight: 25
            });
        }
    }

    /**
     * Executes targeted polarity inversion.
     */
    executeHeresyInversion(profile, villageMeans) {
        if (!profile || !profile.traits) return;
        const traitKeys = Object.keys(profile.traits);
        
        traitKeys.forEach(k => {
            if (k === 'credibility') return;
            
            const mean = (villageMeans && villageMeans[k] !== undefined) ? villageMeans[k] : 0.5;
            // Trait_new = Clamp((1.0 - Mean) + N(0, 0.10))
            const noise = (window.PersonhoodManager && window.PersonhoodManager._gaussianRandom) ? 
                window.PersonhoodManager._gaussianRandom(0, 0.10) : 0;
            profile.traits[k] = Math.max(0, Math.min(1, (1.0 - mean) + noise));
        });

        // Apply State Tag: TouchedByTheShade
        if (!profile.statusTags) profile.statusTags = {};
        profile.statusTags.TouchedByTheShade = {
            cycleAcquired: window.EngineParams?.worldDay || 0,
            generationOrigin: profile.generation || 1,
            charismaModifierYouth: 0.35,
            unalteredTrustPenalty: -0.40
        };
        
        // Permanent Behavioral Flag
        profile.identity = 'SKEPTIC'; // Forced archetype shift
    }

    applyCreepedOutDebuff(village) {
        // Apply minor debuff to all nearby NPCs and Player
        if (!window.GameCore) return;

        const nearby = window.GameCore.SpatialGrid.getNearbyEntities(this.walkerEntity.visual.position.x, this.walkerEntity.visual.position.z, 20);
        
        nearby.forEach(en => {
            if (en.id === 'player' || en.def?.type === 'npc') {
                window.EventBus.emit('APPLY_DEBUFF', {
                    targetId: en.id,
                    type: 'CREEPED_OUT',
                    duration: 300, // 5 minutes
                    intensity: 0.05 // Minor stress/ap penalty
                });
            }
        });
    }

    finishWalking() {
        this.active = false;
        this.hasCompletedShiftCycle = true;
        
        if (this.walkerEntity && window.GameCore) {
            window.GameCore.scene.remove(this.walkerEntity.visual);
            if (this.walkerEntity.body) {
                window.PhysicsQueue.enqueue(() => window.GameCore.world.removeRigidBody(this.walkerEntity.body));
            }
            window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e !== this.walkerEntity);
        }
        
        window.EventBus.emit('UI_LOG', '⛓️ [THE SHACKLE] The Bound Walker has returned to the shadows.');
    }
}

window.ShackleWalker = new ShackledWalkerSystem();
export default window.ShackleWalker;
