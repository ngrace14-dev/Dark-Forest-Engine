// File: src/character/CameraRig.js
import * as THREE from 'three';

// Scratchpads
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();

/**
 * CameraRig
 * 
 * Handles 3rd person follow logic using spherical coordinates.
 * Features:
 * - Spring arm logic
 * - Single raycast collision avoidance
 * - Smooth dampening
 */
export class CameraRig {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world; // Rapier world for raycasting

        this.target = null; // Reference to the CoreCharacter or visual target
        
        // Rig Configuration
        this.config = {
            minDistance: 1.0,
            maxDistance: 10.0,
            defaultDistance: 5.0,
            targetOffset: new THREE.Vector3(0, 1.4, 0), // Look at head/shoulders
            collisionMargin: 0.2, // Keep camera slightly away from walls
            followSpeed: 10.0,
            orbitSpeed: 0.005,
            zoomSpeed: 0.5,
            minPitch: -Math.PI / 4, // Don't look from straight below
            maxPitch: Math.PI / 2.5 // Don't look straight down
        };

        // Current spherical state
        this.azimuth = Math.PI; // Look angle Y
        this.pitch = 0.2; // Look angle X
        this.targetDistance = this.config.defaultDistance;
        this.currentDistance = this.config.defaultDistance;

        // Current absolute positions
        this.lookAtPosition = new THREE.Vector3();
        this.currentCameraPosition = new THREE.Vector3();
    }

    setTarget(character) {
        this.target = character;
    }

    addOrbit(deltaX, deltaY) {
        this.azimuth -= deltaX * this.config.orbitSpeed;
        this.pitch -= deltaY * this.config.orbitSpeed;
        
        // Clamp pitch
        this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
    }

    addZoom(delta) {
        this.targetDistance += delta * this.config.zoomSpeed;
        this.targetDistance = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, this.targetDistance));
    }

    // Call this in the Late Update step
    update(delta) {
        if (!this.target || !this.camera) return;

        // 1. Determine base target look-at position
        this.target.getPosition(this.lookAtPosition);
        this.lookAtPosition.add(this.config.targetOffset);

        // 2. Calculate desired ideal camera position based on spherical coordinates
        const idealDist = this.targetDistance;
        
        const offsetX = idealDist * Math.cos(this.pitch) * Math.sin(this.azimuth);
        const offsetY = idealDist * Math.sin(this.pitch);
        const offsetZ = idealDist * Math.cos(this.pitch) * Math.cos(this.azimuth);

        _v1.set(
            this.lookAtPosition.x + offsetX,
            this.lookAtPosition.y + offsetY,
            this.lookAtPosition.z + offsetZ
        );

        // 3. Collision Avoidance (Single Raycast)
        let actualDist = idealDist;
        
        if (this.world) {
            const RAPIER = window.RAPIER;
            // Direction from target to ideal camera position
            _v2.subVectors(_v1, this.lookAtPosition);
            const distToIdeal = _v2.length();
            
            if (distToIdeal > 0.001) {
                _v2.normalize();
                
                // Raycast from target outward
                const ray = new RAPIER.Ray(this.lookAtPosition, _v2);
                
                // Exclude the player's collider itself. 
                // Using solid=true so we hit walls cleanly.
                // Depending on your setup, you might need a specific collision group for camera blocking.
                const hit = this.world.castRay(ray, distToIdeal, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);

                if (hit && hit.toi < distToIdeal) {
                    actualDist = Math.max(this.config.minDistance, hit.toi - this.config.collisionMargin);
                }
            }
        }

        // 4. Smooth damp distance
        this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, actualDist, delta * this.config.followSpeed);

        // 5. Calculate final position
        const finalOffsetX = this.currentDistance * Math.cos(this.pitch) * Math.sin(this.azimuth);
        const finalOffsetY = this.currentDistance * Math.sin(this.pitch);
        const finalOffsetZ = this.currentDistance * Math.cos(this.pitch) * Math.cos(this.azimuth);

        this.currentCameraPosition.set(
            this.lookAtPosition.x + finalOffsetX,
            this.lookAtPosition.y + finalOffsetY,
            this.lookAtPosition.z + finalOffsetZ
        );

        // 6. Apply to Three.js Camera
        this.camera.position.copy(this.currentCameraPosition);
        this.camera.lookAt(this.lookAtPosition);
    }
}
