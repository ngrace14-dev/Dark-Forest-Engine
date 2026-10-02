// File: src/character/CharacterVisual.js
import * as THREE from 'three';

const _v1 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();

/**
 * CharacterVisual
 * 
 * Handles the 3D rendering representation of a character.
 * It is completely unaware of physics or input; it merely follows the CoreCharacter
 * and smoothly interpolates its rotation to face the movement intent or velocity.
 */
export class CharacterVisual {
    constructor(character, scene) {
        this.character = character;
        this.scene = scene;
        
        // Configuration
        this.config = {
            turnSpeed: 10.0, // Speed of visual rotation interpolation
        };

        // Create a placeholder capsule mesh
        this.mesh = this._createPlaceholderMesh();
        if (this.scene) {
            this.scene.add(this.mesh);
        }
        
        // Track visual heading independently of physics
        this.targetRotation = new THREE.Quaternion();
    }

    _createPlaceholderMesh() {
        const group = new THREE.Group();
        
        // Capsule body
        const geo = new THREE.CapsuleGeometry(
            this.character.config.radius, 
            this.character.config.halfHeight * 2 - (this.character.config.radius * 2), 
            4, 8
        );
        const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });
        const body = new THREE.Mesh(geo, mat);
        
        // The KCC position represents the center of the capsule in Rapier by default
        body.position.y = 0; 
        
        // Add a "nose" so we can see which way it's facing
        const noseGeo = new THREE.BoxGeometry(0.2, 0.2, 0.4);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 0.4, 0.3); // High up and pointing forward (Z+)
        
        body.add(nose);
        
        body.castShadow = true;
        body.receiveShadow = true;
        
        group.add(body);
        return group;
    }

    update(delta) {
        if (!this.character || !this.mesh) return;

        // 1. Sync Position exactly with Physics (KCC translation is capsule center)
        this.character.getPosition(_v1);
        this.mesh.position.copy(_v1);

        // 2. Determine target rotation
        // If moving, face movement direction. If attacking/strafing, this would face look direction.
        if (this.character.intent.movement.lengthSq() > 0.01) {
            // Create a look-at matrix facing the intent vector
            _v1.copy(this.mesh.position).add(this.character.intent.movement);
            _m1.lookAt(this.mesh.position, _v1, this.mesh.up);
            
            // Extract target quaternion
            this.targetRotation.setFromRotationMatrix(_m1);
        }

        // 3. Slerp visual rotation
        this.mesh.quaternion.slerp(this.targetRotation, delta * this.config.turnSpeed);
    }
    
    dispose() {
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
        }
        // Dispose geometries/materials if necessary
    }
}
