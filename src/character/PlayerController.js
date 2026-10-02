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
    }

    update(delta) {
        if (!this.active || !this.character || !this.cameraRig) return;

        // 1. Read Raw Input
        let moveX = 0;
        let moveZ = 0;
        
        if (this.inputSource.keys?.w) moveZ -= 1; // W means go forward (-Z in local coords)
        if (this.inputSource.keys?.s) moveZ += 1;
        if (this.inputSource.keys?.a) moveX -= 1; // A means go left (-X)
        if (this.inputSource.keys?.d) moveX += 1; // D means go right (+X)

        const wantsToJump = this.inputSource.keys?.[' ']; // Spacebar
        const wantsToSprint = this.inputSource.keys?.shift;

        // 2. Transform input relative to camera
        if (moveX !== 0 || moveZ !== 0) {
            // Get camera forward/right flattened to XZ plane
            _v1.set(0, 0, -1).applyQuaternion(this.cameraRig.camera.quaternion);
            _v1.y = 0;
            _v1.normalize();
            
            const camForwardX = _v1.x;
            const camForwardZ = _v1.z;
            
            // Right vector is cross product with UP (0,1,0)
            // Forward is (x, 0, z)
            // Up is (0, 1, 0)
            // Cross product: Right = (-z, 0, x) -> this points right relative to camera forward
            const camRightX = -camForwardZ;
            const camRightZ = camForwardX;

            // Using standard W = -Z mapping: 
            // Forward input (moveZ = -1) needs to push along camForward (-Z in local is +Forward in global)
            // Note: Since 'w' subtracts 1 from moveZ, we multiply by (-moveZ) so pressing W results in 1 * camForward
            const finalDirX = moveX * camRightX + (-moveZ) * camForwardX;
            const finalDirZ = moveX * camRightZ + (-moveZ) * camForwardZ;

            this.character.setMovementIntent(finalDirX, finalDirZ, wantsToJump, wantsToSprint);
        } else {
            this.character.setMovementIntent(0, 0, wantsToJump, wantsToSprint);
        }
    }
}
