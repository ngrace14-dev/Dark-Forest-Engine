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
    constructor(character, scene, def) {
        this.character = character;
        this.scene = scene;
        this.def = def || (character.def);
        
        // Configuration
        this.config = {
            turnSpeed: 10.0, // Speed of visual rotation interpolation
        };

        this.mixer = null;
        this.actions = {};
        this.currentAction = null;

        // Initialize Mesh
        this.mesh = this._initMesh();
        if (this.scene) {
            this.scene.add(this.mesh);
        }
        
        // Track visual heading independently of physics
        this.targetRotation = new THREE.Quaternion();
    }

    _initMesh() {
        const modelName = this.def?.customModel;
        
        if (modelName && window.AssetManager?.models[modelName]) {
            const asset = window.AssetManager.models[modelName];
            // CRITICAL: Use SkeletonUtils for rigged models
            const clonedModel = window.SkeletonUtils.clone(asset);
            
            // Setup Animation
            const clips = window.AssetManager.animations[modelName] || [];
            if (clips.length > 0) {
                this.mixer = new THREE.AnimationMixer(clonedModel);
                clips.forEach(clip => {
                    this.actions[clip.name] = this.mixer.clipAction(clip);
                });
                
                // Play initial idle
                const idleClipName = this.def.animMap?.idle;
                if (idleClipName && this.actions[idleClipName]) {
                    this.playAnim('idle');
                }
            }
            
            clonedModel.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            return clonedModel;
        }

        return this._createPlaceholderMesh();
    }

    _createPlaceholderMesh() {
        const group = new THREE.Group();
        group.isPlaceholder = true;
        
        // Capsule body
        const geo = new THREE.CapsuleGeometry(
            this.character.config.radius, 
            this.character.config.halfHeight * 2 - (this.character.config.radius * 2), 
            4, 8
        );
        const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });
        const body = new THREE.Mesh(geo, mat);
        
        body.position.y = 0; 
        
        // Add a "nose" so we can see which way it's facing
        const noseGeo = new THREE.BoxGeometry(0.2, 0.2, 0.4);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 0.4, 0.3); 
        
        body.add(nose);
        
        body.castShadow = true;
        body.receiveShadow = true;
        
        group.add(body);
        return group;
    }

    playAnim(state, duration = 0.25) {
        const clipName = this.def?.animMap?.[state];
        if (!clipName || !this.actions[clipName]) return;

        const nextAction = this.actions[clipName];
        if (this.currentAction === nextAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(duration);
        }

        nextAction.reset().fadeIn(duration).play();
        this.currentAction = nextAction;
    }

    update(delta) {
        if (!this.character || !this.mesh) return;

        // Auto-swap placeholder if model becomes available
        if (this.mesh.isPlaceholder && this.def?.customModel && window.AssetManager?.models[this.def.customModel]) {
            this.scene.remove(this.mesh);
            this.mesh = this._initMesh();
            this.scene.add(this.mesh);
            this.character.visual = this.mesh; // Sync back
        }

        // 1. Sync Position
        this.character.getPosition(_v1);
        this.mesh.position.copy(_v1);

        // DIAGNOSTIC LOG (throttled to roughly once per second)
        if (!this.lastLog || performance.now() - this.lastLog > 1000) {
            this.lastLog = performance.now();
            let groundH = 0;
            if (window.WorldGenerator?.getTerrainHeight) {
                groundH = window.WorldGenerator.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
            }

        }

        // 2. Animation State Selection based on Character State
        if (this.mixer) {
            this.playAnim(this.character.state);
            this.mixer.update(delta);
        }

        // 3. Determine target rotation
        if (this.character.intent.movement.lengthSq() > 0.01) {
            // Note: intent.movement holds the real world direction we are pressing towards.
            // LookAt expects the point in world space we want to face.
            _v1.copy(this.mesh.position).add(this.character.intent.movement);
            _m1.lookAt(this.mesh.position, _v1, this.mesh.up);
            this.targetRotation.setFromRotationMatrix(_m1);
        }

        // 4. Slerp visual rotation
        this.mesh.quaternion.slerp(this.targetRotation, delta * this.config.turnSpeed);
    }
    
    dispose() {
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
        }
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
    }
}
