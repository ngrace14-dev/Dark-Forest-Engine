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
            this.startWalking();
        }

        if (this.active) {
            this.processWalking();
        }
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
        if (!this.walkerEntity || !window.VillageManager) return;

        const villages = window.VillageManager.villages;
        const targetVillage = villages[this.currentVillageIndex];

        if (!targetVillage) {
            this.finishWalking();
            return;
        }

        const dx = targetVillage.x - this.walkerEntity.visual.position.x;
        const dz = targetVillage.z - this.walkerEntity.visual.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 5) {
            // Arrived at village
            this.triggerVillageMutation(targetVillage);
            this.applyCreepedOutDebuff(targetVillage);
            this.currentVillageIndex++;
            
            if (this.currentVillageIndex >= villages.length) {
                this.finishWalking();
            }
        } else {
            // Move toward next village on "Safe Paths" (Roads)
            this.shambleToward(targetVillage);
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

    triggerVillageMutation(village) {
        if (!window.PersonhoodManager) return;

        const profiles = Array.from(window.PersonhoodManager.profiles.values())
            .filter(p => p.property.homeVillageId === village.id);
        
        const mutationCount = Math.ceil(profiles.length * 0.025);
        let mutated = 0;

        for (let i = 0; i < mutationCount; i++) {
            const p = profiles[Math.floor(Math.random() * profiles.length)];
            if (p) {
                this.mutateTraits(p);
                mutated++;
            }
        }

        if (mutated > 0) {
            window.EventBus.emit('UI_LOG_DEBUG', `[THE SHACKLE] The Walker's presence mutated ${mutated} souls in ${village.name}.`);
            window.ChronicleManager?.recordEvent({
                actorId: 'THE_SHACKLE',
                type: 'SPONTANEOUS_MUTATION',
                detail: `The Bound Walker passed through ${village.name}, twisting the threads of destiny.`,
                significance: 30,
                historicalWeight: 15
            });
        }
    }

    mutateTraits(profile) {
        if (!profile || !profile.traits) return;
        const traits = Object.keys(profile.traits);
        const traitToMutate = traits[Math.floor(Math.random() * traits.length)];
        
        // Random shift (mutation)
        const shift = (Math.random() * 0.4) - 0.2; // +/- 20%
        profile.traits[traitToMutate] = Math.max(0, Math.min(1, (profile.traits[traitToMutate] || 0.5) + shift));
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
