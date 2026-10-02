// File: src/character/PlayerController.js
import * as THREE from 'three';

const _v1 = new THREE.Vector3();

/**
 * PlayerController
 * 
 * Maps raw input to CoreCharacter intents.
 * Translates camera-relative directions into world-relative movement intents.
 */
export class PlayerController {
    constructor(character, cameraRig) {
        this.character = character;
        this.cameraRig = cameraRig;
        
        // Use the existing global Input system if available
        this.inputSource = window.Input || {
            keys: {},
            isSprinting: false,
            // Fallback mock input structure
        };
        
        this.active = true;

        // Custom state tracking for Dash/Sprint logic
        this.spaceHeldTime = 0;
        this.dashCooldown = 0;
        this.isSprinting = false;
        this.isDashing = false;
        this.wasSpaceHeld = false;
    }

    update(delta) {
        if (!this.active || !this.character || !this.cameraRig) return;

        // 1. Read Raw Input
        let moveX = 0;
        let moveZ = 0;
        
        if (this.inputSource.keys?.w) moveZ += 1; // W means go forward (positive intent)
        if (this.inputSource.keys?.s) moveZ -= 1; // S means go backward
        if (this.inputSource.keys?.a) moveX -= 1; // A means go left
        if (this.inputSource.keys?.d) moveX += 1; // D means go right

        const wantsToJump = false; // Disable space-to-jump, it's now dash/sprint
        const spacePressedThisFrame = this.inputSource.keys?.[' ']; // Spacebar
        
        // Dash / Sprint Logic State Machine
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

        if (spacePressedThisFrame) {
            this.spaceHeldTime += delta;
            
            // Just pressed Spacebar
            if (!this.wasSpaceHeld && this.dashCooldown <= 0) {
                this.isDashing = true;
                this.dashCooldown = 0.8; // Time before you can dash again
            } else if (this.spaceHeldTime > 0.25) {
                // Held space for > 0.25s -> transition to sprint
                this.isDashing = false;
                this.isSprinting = true;
            }
        } else {
            // Released space
            this.spaceHeldTime = 0;
            this.isSprinting = false;
            this.isDashing = false;
        }
        
        this.wasSpaceHeld = spacePressedThisFrame;
        
        const wantsToDash = this.isDashing;
        const wantsToSprint = this.isSprinting;

        // 2. Transform input relative to camera
        if (moveX !== 0 || moveZ !== 0) {
            // Get camera forward/right flattened to XZ plane
            // We want the vector pointing out from the camera, away from the player
            // Default ThreeJS camera looks down -Z. So pushing +1 on local Z gives us the vector looking INTO the scene
            _v1.set(0, 0, -1).applyQuaternion(this.cameraRig.camera.quaternion);
            _v1.y = 0;
            _v1.normalize();
            
            const camForwardX = _v1.x;
            const camForwardZ = _v1.z;
            
            // Right vector is cross product with UP (0,1,0)
            // Forward is (x, 0, z)
            // Up is (0, 1, 0)
            // Cross product: Right = (-z, 0, x) -> this points right relative to camera forward
            const camRightX = camForwardZ;
            const camRightZ = -camForwardX;

            // W maps to positive moveZ internally for math clarity
            // If W is pressed, moveZ = 1. We want to move ALONG camForward.
            // If D is pressed, moveX = 1. We want to move ALONG camRight.
            const finalDirX = moveX * camRightX + moveZ * camForwardX;
            const finalDirZ = moveX * camRightZ + moveZ * camForwardZ;

            this.character.setMovementIntent(finalDirX, finalDirZ, wantsToJump, wantsToSprint, wantsToDash);
        } else {
            this.character.setMovementIntent(0, 0, wantsToJump, wantsToSprint, wantsToDash);
        }
    }
}
