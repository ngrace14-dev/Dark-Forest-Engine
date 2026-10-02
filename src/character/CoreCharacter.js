// File: src/character/CoreCharacter.js
import * as THREE from 'three';

// Module-scoped scratchpads to prevent GC allocation
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/**
 * CoreCharacter
 * 
 * Base character class responsible for:
 * - Physics representation (Kinematic Character Controller)
 * - Movement intent processing
 * - Ground detection
 * - State tracking (Idle, Walk, Fall, etc.)
 */
export class CoreCharacter {
    constructor(world, x, y, z, config = {}) {
        this.world = world;
        
        // Configuration
        this.config = {
            radius: config.radius || 0.4,
            halfHeight: config.halfHeight || 0.8, // Total height = 1.6
            walkSpeed: config.walkSpeed || 3.0,
            runSpeed: config.runSpeed || 5.0,
            sprintSpeed: config.sprintSpeed || 8.0,
            dashSpeed: config.dashSpeed || 15.0,
            jumpVelocity: config.jumpVelocity || 5.0,
            gravity: config.gravity || -20.0,
            stepOffset: config.stepOffset || 0.3,
            ...config
        };

        // State
        this.state = 'idle';
        this.isGrounded = false;
        this.velocity = new THREE.Vector3();
        this.intent = {
            movement: new THREE.Vector3(), // Normalized desired movement direction
            wantsToJump: false,
            wantsToSprint: false,
            wantsToDash: false
        };

        // Initialize Physics (Rapier Kinematic Character Controller)
        this.initPhysics(x, y, z);
    }

    initPhysics(x, y, z) {
        if (!this.world) {
            console.warn("CoreCharacter initialized without a Rapier world.");
            return;
        }
        
        const RAPIER = window.RAPIER; // Assumes RAPIER is loaded globally
        
        // Create Kinematic RigidBody
        let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
        this.body = this.world.createRigidBody(bodyDesc);
        
        // Create Capsule Collider
        let colliderDesc = RAPIER.ColliderDesc.capsule(this.config.halfHeight, this.config.radius);
        this.collider = this.world.createCollider(colliderDesc, this.body);
        
        // Create Character Controller
        this.characterController = this.world.createCharacterController(this.config.stepOffset);
        this.characterController.enableAutostep(this.config.stepOffset, this.config.stepOffset, true);
        this.characterController.enableSnapToGround(this.config.stepOffset);
        
        // Collision filtering (optional, default to all)
        // this.characterController.setFilterFlags(RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
    }

    setMovementIntent(x, z, wantsToJump, wantsToSprint, wantsToDash = false) {
        this.intent.movement.set(x, 0, z);
        if (this.intent.movement.lengthSq() > 1.0) {
            this.intent.movement.normalize();
        }
        this.intent.wantsToJump = wantsToJump;
        this.intent.wantsToSprint = wantsToSprint;
        this.intent.wantsToDash = wantsToDash;
    }

    prePhysicsUpdate(delta) {
        if (!this.body || !this.characterController) return;

        // Determine target speed
        let currentSpeed = 0;
        const movementLengthSq = this.intent.movement.lengthSq();
        if (movementLengthSq > 0.01) {
            if (this.intent.wantsToDash) {
                currentSpeed = this.config.dashSpeed;
            } else if (this.intent.wantsToSprint) {
                currentSpeed = this.config.sprintSpeed;
            } else {
                currentSpeed = this.config.runSpeed;
            }
        }

        // Apply movement
        this.velocity.x = this.intent.movement.x * currentSpeed;
        this.velocity.z = this.intent.movement.z * currentSpeed;

        // Vertical Velocity (Gravity and Jumping)
        if (this.isGrounded) {
            if (this.intent.wantsToJump) {
                this.velocity.y = this.config.jumpVelocity;
                this.isGrounded = false;
                this.intent.wantsToJump = false; 
            } else {
                this.velocity.y = -1.0; 
            }
        } else {
            this.velocity.y += this.config.gravity * delta;
            if (this.velocity.y < -30.0) this.velocity.y = -30.0;
        }

        _v1.copy(this.velocity).multiplyScalar(delta);

        this.characterController.computeColliderMovement(this.collider, _v1);

        const correctedMovement = this.characterController.computedMovement();
        const currentTranslation = this.body.translation();
        
        this.body.setNextKinematicTranslation({
            x: currentTranslation.x + correctedMovement.x,
            y: currentTranslation.y + correctedMovement.y,
            z: currentTranslation.z + correctedMovement.z
        });

        this.isGrounded = this.characterController.computedGrounded();

        if (this.isGrounded && this.velocity.y < 0) {
            this.velocity.y = -1.0; 
        } else if (this.velocity.y > 0 && Math.abs(correctedMovement.y) < 0.001) {
            this.velocity.y = 0;
        }

        this.updateState(movementLengthSq);
    }

    updateState(movementLengthSq) {
        if (!this.isGrounded) {
            if (this.velocity.y > 0) this.state = 'jump';
            else this.state = 'fall';
        } else if (movementLengthSq > 0.01) {
            if (this.intent.wantsToDash) this.state = 'dash';
            else if (this.intent.wantsToSprint) this.state = 'run'; // Usually run animation for sprint
            else this.state = 'walk';
        } else {
            this.state = 'idle';
        }
    }

    postPhysicsUpdate(delta) {
        // Visual interpolation goes here later
    }

    getPosition(targetVector) {
        if (!this.body) return targetVector.set(0,0,0);
        const t = this.body.translation();
        return targetVector.set(t.x, t.y, t.z);
    }
}
