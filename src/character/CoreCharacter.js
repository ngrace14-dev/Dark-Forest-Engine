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
            sprintSpeed: config.sprintSpeed || 7.0,
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
            wantsToSprint: false
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

    setMovementIntent(x, z, wantsToJump, wantsToSprint) {
        this.intent.movement.set(x, 0, z);
        if (this.intent.movement.lengthSq() > 1.0) {
            this.intent.movement.normalize();
        }
        this.intent.wantsToJump = wantsToJump;
        this.intent.wantsToSprint = wantsToSprint;
    }

    prePhysicsUpdate(delta) {
        if (!this.body || !this.characterController) return;

        // Determine target speed
        let currentSpeed = 0;
        if (this.intent.movement.lengthSq() > 0.01) {
            currentSpeed = this.intent.wantsToSprint ? this.config.sprintSpeed : this.config.runSpeed;
        }

        // Horizontal Velocity (Instant acceleration for potato responsiveness)
        this.velocity.x = this.intent.movement.x * currentSpeed;
        this.velocity.z = this.intent.movement.z * currentSpeed;

        // Vertical Velocity (Gravity and Jumping)
        if (this.isGrounded) {
            if (this.intent.wantsToJump) {
                this.velocity.y = this.config.jumpVelocity;
                this.isGrounded = false;
                this.intent.wantsToJump = false; // Consume jump
            } else {
                // Keep a small downward force to snap to ground slopes
                this.velocity.y = -1.0; 
            }
        } else {
            // Apply gravity
            this.velocity.y += this.config.gravity * delta;
            // Terminal velocity
            if (this.velocity.y < -30.0) this.velocity.y = -30.0;
        }

        // Prepare movement vector for KCC
        _v1.copy(this.velocity).multiplyScalar(delta);

        // Compute KCC movement
        this.characterController.computeColliderMovement(
            this.collider,
            _v1 // The desired displacement
        );

        // Get corrected movement and apply
        const correctedMovement = this.characterController.computedMovement();
        
        // Read position
        const currentTranslation = this.body.translation();
        
        // Set new position
        this.body.setNextKinematicTranslation({
            x: currentTranslation.x + correctedMovement.x,
            y: currentTranslation.y + correctedMovement.y,
            z: currentTranslation.z + correctedMovement.z
        });

        // Update grounded state from KCC
        this.isGrounded = this.characterController.computedGrounded();

        // If we hit our head or landed, cancel vertical velocity
        if (this.isGrounded && this.velocity.y < 0) {
            this.velocity.y = -1.0; // Reset to snap velocity
        } else if (this.velocity.y > 0 && Math.abs(correctedMovement.y) < 0.001) {
            // Hit ceiling
            this.velocity.y = 0;
        }

        this.updateState();
    }

    updateState() {
        const horizSpeedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
        
        if (!this.isGrounded) {
            if (this.velocity.y > 0) this.state = 'jump';
            else this.state = 'fall';
        } else if (horizSpeedSq > 0.1) {
            if (horizSpeedSq > (this.config.runSpeed + 0.5) ** 2) this.state = 'sprint';
            else if (horizSpeedSq > (this.config.walkSpeed + 0.5) ** 2) this.state = 'run';
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
