import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * File: src_systems_animation_v2.js
 * An high-performance, Blender-friendly animation system for the Dark Forest Engine.
 * Supports smooth state blending, automated mocap scaling, and technical parity with AAA titles.
 */

window.AnimationSystemV2 = {
    // Shared resources
    mixers: new Map(),
    actions: new Map(), // Key: entityId_state
    
    // Core state definitions for the camilion/blender pipeline
    states: {
        IDLE: 'idle',
        WALK: 'walk',
        RUN: 'run',
        ATTACK: 'attack',
        BLOCK: 'block',
        DASH: 'dash',
        HIT: 'hit',
        DIE: 'die',
        STEALTH: 'stealth'
    },

    /**
     * Initializes the animation system for a specific entity.
     * Maps Blender actions to engine states.
     */
    initEntity: function(entity, model, animClips) {
        if (!model || !animClips || animClips.length === 0) return;

        const mixer = new THREE.AnimationMixer(model);
        this.mixers.set(entity.id, mixer);
        
        const def = entity.def;
        const animMap = def.animMap || {};

        // Auto-bind clips based on the prefab's animMap
        Object.entries(this.states).forEach(([key, stateName]) => {
            const clipName = animMap[stateName];
            if (clipName && clipName !== 'None') {
                const clip = animClips.find(c => c.name === clipName);
                if (clip) {
                    const action = mixer.clipAction(clip);
                    
                    // Configure specific behaviors for one-shot actions
                    if (['attack', 'dash', 'hit', 'die'].includes(stateName)) {
                        action.setLoop(THREE.LoopOnce);
                        action.clampWhenFinished = true;
                    }
                    
                    this.actions.set(`${entity.id}_${stateName}`, action);
                }
            }
        });

        // Start in IDLE
        this.transitionTo(entity, this.states.IDLE, 0);
        
        // Link back to entity for engine access
        entity.animationController = {
            state: this.states.IDLE,
            mixer: mixer
        };
    },

    /**
     * Smoothly transitions an entity between two Blender actions.
     */
    transitionTo: function(entity, newState, duration = 0.3) {
        if (!entity.animationController) return;
        const oldState = entity.animationController.state;
        if (oldState === newState && newState !== this.states.ATTACK) return;

        const oldAction = this.actions.get(`${entity.id}_${oldState}`);
        const newAction = this.actions.get(`${entity.id}_${newState}`);

        if (!newAction) return;

        newAction.reset();
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(1);
        newAction.fadeIn(duration);
        newAction.play();

        if (oldAction && oldAction !== newAction) {
            oldAction.fadeOut(duration);
        }

        entity.animationController.state = newState;
        
        // Auto-return to idle/walk for transient states
        if (['attack', 'dash', 'hit'].includes(newState)) {
            const onFinished = (e) => {
                if (e.action === newAction) {
                    entity.animationController.mixer.removeEventListener('finished', onFinished);
                    // Determine if we should return to idle or walk based on movement
                    const nextState = (window.Input && window.Input.isMoving) ? this.states.WALK : this.states.IDLE;
                    this.transitionTo(entity, nextState, 0.4);
                }
            };
            entity.animationController.mixer.addEventListener('finished', onFinished);
        }
    },

    /**
     * Updates all active mixers. Called every frame by the engine loop.
     */
    update: function(delta) {
        // Handle hit-pause (Dragon's Dogma feel)
        if (window.Input && window.Input.hitPauseTimer > 0) return;

        for (const mixer of this.mixers.values()) {
            mixer.update(delta);
        }
    },

    /**
     * Cleans up memory when an entity is destroyed or chunk is unloaded.
     */
    disposeEntity: function(entityId) {
        this.mixers.delete(entityId);
        // Clean up actions map
        for (const key of this.actions.keys()) {
            if (key.startsWith(`${entityId}_`)) {
                this.actions.delete(key);
            }
        }
    }
};

// Hook into existing global namespace
window.GameCore.AnimationSystem = window.AnimationSystemV2;
