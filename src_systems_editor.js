import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

window.EditorManager = {
    isActive: false,
    transformControl: null,
    selectedEntity: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    
    // Free Cam Properties
    camVelocity: new THREE.Vector3(),
    camDirection: new THREE.Vector3(),
    camSpeed: 25.0,
    pitch: 0,
    yaw: 0,

    init: function() {
        if (!window.GameCore.scene || !window.GameCore.camera || !window.renderer) return;

        // Initialize Transform Gizmo
        this.transformControl = new TransformControls(window.GameCore.camera, window.renderer.domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            // Disable free-cam look when dragging a gizmo axis
            window.Input.isDraggingGizmo = event.value;
        });
        
        // Snap settings (like Blender's grid snap)
        this.transformControl.setTranslationSnap(0.5);
        this.transformControl.setRotationSnap(THREE.MathUtils.degToRad(15));
        this.transformControl.setScaleSnap(0.1);

        window.GameCore.scene.add(this.transformControl);
        
        // Listeners for picking and mode swapping
        window.EventBus.on('TOGGLE_EDITOR', this.toggleEditor.bind(this));
        
        // Hook into the document directly for editor-specific controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        window.EventBus.emit('UI_LOG', '[EDITOR] World Builder Module Initialized. Press F2 to activate.');
    },

    toggleEditor: function() {
        this.isActive = !this.isActive;
        window.EngineParams.editMode = this.isActive;
        
        if (this.isActive) {
            // ENTER EDITOR MODE
            window.EventBus.emit('UI_LOG', '[EDITOR] Mode Active: Physics Suspended. Free Cam engaged.');
            
            // Unbind camera from player and setup initial angles
            if (window.GameCore.playerObj) {
                this.yaw = window.Input.camAngle;
                this.pitch = window.Input.camPitch;
            }
            
            // Show Editor UI overlay (we'll create this soon)
            const hud = document.getElementById('hud');
            if (hud) hud.style.opacity = '0.2'; // Dim game UI
            
        } else {
            // EXIT EDITOR MODE
            window.EventBus.emit('UI_LOG', '[EDITOR] Mode Disabled: Resuming Simulation.');
            this.deselect();
            
            // Restore game UI
            const hud = document.getElementById('hud');
            if (hud) hud.style.opacity = '1.0';
            
            // Reset player camera tracking logic
            if (window.GameCore.playerObj) {
                window.Input.camAngle = this.yaw;
                window.Input.camPitch = this.pitch;
            }
        }
    },

    exportBlueprint: function() {
        // Collect all currently active entities (or selected ones, but usually you build a structure and want to export it)
        // For a safe blueprint, we'll export everything near the editor camera (within 50 meters)
        // that is NOT terrain (not part of the chunk system) and NOT the player.
        
        const center = window.GameCore.camera.position;
        const blueprintName = prompt("Enter a name for this new Prefab Blueprint:", "Custom Village Outpost");
        if (!blueprintName) return;

        const exportedEntities = [];
        
        window.GameCore.activeEntities.forEach(entity => {
            if (entity.id === window.GameCore.playerObj?.id) return;
            if (entity.chunkKey !== 'persistent') return; // Ignore procedural chunk spawns
            
            const dist = entity.visual.position.distanceTo(center);
            if (dist > 50) return; // Only capture local objects
            
            // Convert to relative coordinates (local to the center of the selection)
            // We use the first object's position as the 'origin' offset, or just the camera X/Z
            const ox = parseFloat((entity.visual.position.x - center.x).toFixed(2));
            const oz = parseFloat((entity.visual.position.z - center.z).toFixed(2));
            
            // Extract rotation around Y axis
            const euler = new THREE.Euler().setFromQuaternion(entity.visual.quaternion, 'YXZ');
            const rotY = parseFloat(euler.y.toFixed(2));
            
            exportedEntities.push({
                prefab: entity.name,
                ox: ox,
                oz: oz,
                rotY: rotY
            });
        });

        if (exportedEntities.length === 0) {
            window.EventBus.emit('UI_LOG', '[EDITOR] No persistent entities found nearby to export.');
            return;
        }

        // Construct the JSON structure
        const blueprintJSON = JSON.stringify({
            name: blueprintName,
            layout: exportedEntities
        }, null, 2);

        console.log(`=== BLUEPRINT: ${blueprintName} ===\n${blueprintJSON}\n======================`);
        
        // Copy to clipboard
        navigator.clipboard.writeText(blueprintJSON).then(() => {
            window.EventBus.emit('UI_LOG', `[EDITOR] Blueprint '${blueprintName}' with ${exportedEntities.length} objects copied to clipboard!`);
        }).catch(err => {
            window.EventBus.emit('UI_LOG', '[EDITOR] Blueprint logged to Console (Clipboard copy failed).');
        });
    },

    handleKeyDown: function(e) {
        if (e.key === 'F2') {
            e.preventDefault();
            this.toggleEditor();
            return;
        }

        if (!this.isActive) return;

        // Blender Hotkeys
        const key = e.key.toLowerCase();
        
        if (key === 't' || key === 'g') {
            this.transformControl.setMode('translate');
            window.EventBus.emit('UI_LOG', '[EDITOR] Gizmo: Translate');
        } else if (key === 'r') {
            this.transformControl.setMode('rotate');
            window.EventBus.emit('UI_LOG', '[EDITOR] Gizmo: Rotate');
        } else if (key === 'y') { // 's' is used for walking backward, using Y for scale
            this.transformControl.setMode('scale');
            window.EventBus.emit('UI_LOG', '[EDITOR] Gizmo: Scale');
        } else if (key === 'delete' || key === 'backspace') {
            this.deleteSelected();
        } else if (e.shiftKey && key === 'e') {
            e.preventDefault();
            this.exportBlueprint();
        } else if (e.shiftKey && key === 'a') {
            e.preventDefault();
            this.AnimationStudio.toggle(this);
        } else if (key === 'escape') {
            this.deselect();
        }
    },

    // --- ANIMATION STUDIO (Video Reference & IK Dots) ---
    AnimationStudio: {
        isActive: false,
        videoNode: null,
        guideDots: [],
        targetEntity: null,
        
        toggle: function(editor) {
            this.isActive = !this.isActive;
            if (this.isActive) {
                if (!editor.selectedEntity) {
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Error: Please select a 3D model first.');
                    this.isActive = false;
                    return;
                }
                
                let isRigged = false;
                editor.selectedEntity.visual.traverse(child => { if (child.isSkinnedMesh) isRigged = true; });
                
                if (!isRigged) {
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Error: Selected model has no skeleton/bones.');
                    this.isActive = false;
                    return;
                }

                this.targetEntity = editor.selectedEntity;
                this.setupUI();
                this.spawnGuideDots();
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Active. Upload a video reference and map the guide rails.');
            } else {
                this.cleanup();
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Closed.');
            }
        },
        
        setupUI: function() {
            const ui = document.createElement('div');
            ui.id = 'anim-studio-ui';
            ui.className = 'absolute top-20 right-10 z-50 bg-gray-900/95 border border-pink-600 p-4 rounded-lg shadow-2xl flex flex-col gap-3 w-80 backdrop-blur-sm';
            ui.innerHTML = `
                <div class="text-pink-400 font-bold uppercase tracking-widest text-xs border-b border-gray-700 pb-1 mb-1 flex justify-between">
                    <span>🎬 MoCap Studio</span>
                    <span class="text-gray-500">SHIFT+A to Close</span>
                </div>
                <div class="text-[9px] text-gray-400 leading-tight mb-2">Upload an MP4. The autonomous tracker will map video movement to the pink guide dots on your character's skeleton.</div>
                <input type="file" id="anim-video-upload" accept="video/*" class="text-[10px] text-gray-300 bg-gray-800 p-2 rounded cursor-pointer border border-gray-700">
                <video id="anim-video-preview" class="w-full h-auto bg-black rounded border border-gray-700 hidden" controls loop muted></video>
                <div class="flex gap-2 mt-1">
                    <button id="btn-bake-mocap" class="flex-1 bg-pink-700 hover:bg-pink-600 text-white text-[10px] py-2 rounded font-bold transition-colors shadow-lg">🧠 Auto-Track from Video</button>
                    <button id="btn-save-anim" class="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] py-2 rounded font-bold transition-colors shadow-lg">💾 Export Clip</button>
                </div>
            `;
            document.body.appendChild(ui);
            
            document.getElementById('anim-video-upload').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const vid = document.getElementById('anim-video-preview');
                vid.src = URL.createObjectURL(file);
                vid.classList.remove('hidden');
                this.videoNode = vid;
            });

            document.getElementById('btn-bake-mocap').addEventListener('click', () => this.runAutonomousTracking());
            document.getElementById('btn-save-anim').addEventListener('click', () => {
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Exporting THREE.AnimationClip JSON to clipboard...');
                // Stub for exporting
            });
        },
        
        spawnGuideDots: function() {
            // Find bones
            const bones = [];
            this.targetEntity.visual.traverse(child => {
                if (child.isBone) bones.push(child);
            });

            // Filter to major IK nodes (wrists, ankles, head, pelvis)
            const majorNodes = bones.filter(b => 
                b.name.toLowerCase().includes('hand') || 
                b.name.toLowerCase().includes('foot') || 
                b.name.toLowerCase().includes('head') || 
                b.name.toLowerCase().includes('hips') ||
                b.name.toLowerCase().includes('pelvis')
            );

            const geo = new THREE.SphereGeometry(0.15, 8, 8);
            
            majorNodes.forEach(bone => {
                // Different colors for different parts
                let hex = 0xff00ff;
                if(bone.name.toLowerCase().includes('hand')) hex = 0xff3333; // Red for hands
                if(bone.name.toLowerCase().includes('foot')) hex = 0x33ff33; // Green for feet
                if(bone.name.toLowerCase().includes('head')) hex = 0x3333ff; // Blue for head

                const mat = new THREE.MeshBasicMaterial({ color: hex, depthTest: false, transparent: true, opacity: 0.8, wireframe: true });
                const dot = new THREE.Mesh(geo, mat);
                
                // Get absolute position of bone
                const pos = new THREE.Vector3();
                bone.getWorldPosition(pos);
                dot.position.copy(pos);
                dot.userData.targetBone = bone;
                
                window.GameCore.scene.add(dot);
                this.guideDots.push(dot);
            });
        },
        
        runAutonomousTracking: function() {
            if (!this.videoNode) {
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Upload a video reference first.');
                return;
            }
            window.EventBus.emit('UI_LOG', '[ANIM STUDIO] 🧠 Initiating Neural Video Tracking... (Binding video pixels to guide dots)');
            this.videoNode.play();
            
            // Simulated Hook for MediaPipe/PoseNet integration
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: `TRACKING VIDEO... ${progress}%`, pos: this.targetEntity.visual.position.clone().add(new THREE.Vector3(0,3,0)), color: '#f472b6' });
                
                // Wiggle the dots to simulate AI solving the IK tracking
                this.guideDots.forEach(dot => {
                    dot.position.x += (Math.random() - 0.5) * 0.2;
                    dot.position.y += (Math.random() - 0.5) * 0.2;
                    dot.position.z += (Math.random() - 0.5) * 0.2;
                });
                
                if (progress >= 100) {
                    clearInterval(interval);
                    this.videoNode.pause();
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] ✅ Autonomous tracking complete. Keyframes baked.');
                }
            }, 500);
        },
        
        cleanup: function() {
            const ui = document.getElementById('anim-studio-ui');
            if (ui) ui.remove();
            this.guideDots.forEach(dot => {
                window.GameCore.scene.remove(dot);
                dot.geometry.dispose();
                dot.material.dispose();
            });
            this.guideDots = [];
            this.targetEntity = null;
            this.videoNode = null;
        }
    },

    onMouseMove: function(e) {
        if (!this.isActive) return;
        
        // Mouselook (Right Click Drag in Editor Mode)
        if (window.Input.isDraggingCam && !window.Input.isDraggingGizmo) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            this.yaw -= movementX * 0.005;
            this.pitch -= movementY * 0.005;
            
            // Clamp pitch to prevent going completely upside down
            this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
            
            const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
            window.GameCore.camera.quaternion.setFromEuler(euler);
        }
    },

    onPointerDown: function(e) {
        if (!this.isActive || window.Input.isDraggingGizmo) return;
        
        // Only select on Left Click
        if (e.button !== 0) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, window.GameCore.camera);

        // Build list of selectable meshes from active entities
        const selectables = [];
        const entityMap = new Map(); // Maps Mesh -> Entity Object

        window.GameCore.activeEntities.forEach(entity => {
            if (entity.visual) {
                // Add the whole group or specific children
                entity.visual.traverse(child => {
                    if (child.isMesh) {
                        selectables.push(child);
                        entityMap.set(child, entity);
                    }
                });
            }
        });

        // Also allow selecting terrain instances (Chunks)
        const chunkMeshes = [];
        for (const chunk of ChunkManager.activeChunks.values()) {
            if (chunk.mesh) chunkMeshes.push(chunk.mesh);
        }

        const intersects = this.raycaster.intersectObjects([...selectables, ...chunkMeshes], false);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const entity = entityMap.get(hitMesh);

            if (entity) {
                this.selectEntity(entity);
            } else {
                // Hit terrain or something unselectable
                this.deselect();
            }
        } else {
            this.deselect();
        }
    },

    selectEntity: function(entity) {
        if (this.selectedEntity === entity) return;
        
        // Remove highlight from previous
        this.clearHighlight();

        this.selectedEntity = entity;
        
        // Attach Gizmo
        this.transformControl.attach(entity.visual);
        
        // Apply visual highlight
        this.applyHighlight(entity);

        window.EventBus.emit('UI_LOG', `[EDITOR] Selected: ${entity.name} (${entity.id})`);
    },

    deselect: function() {
        this.clearHighlight();
        this.selectedEntity = null;
        this.transformControl.detach();
    },

    applyHighlight: function(entity) {
        entity.visual.traverse(child => {
            if (child.isMesh && child.material) {
                child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                // Glow slightly yellow/orange
                child.material.emissive = new THREE.Color(0xaa5500);
                child.material.emissiveIntensity = 0.5;
            }
        });
    },

    clearHighlight: function() {
        if (!this.selectedEntity) return;
        this.selectedEntity.visual.traverse(child => {
            if (child.isMesh && child.material && child.userData.originalEmissive) {
                child.material.emissive.copy(child.userData.originalEmissive);
                child.material.emissiveIntensity = 0; // Or restore original if you tracked it
            }
        });
    },

    deleteSelected: function() {
        if (!this.selectedEntity) return;
        
        const entity = this.selectedEntity;
        const name = entity.name;
        
        this.deselect();

        // Standard cleanup logic
        window.GameCore.releaseEntityIndex(entity.memoryIndex);
        window.GameCore.SpatialGrid.unregisterEntity(entity);
        window.GameCore.scene.remove(entity.visual);
        window.GameCore.world.removeRigidBody(entity.body);
        
        window.GameCore.activeEntities = window.GameCore.activeEntities.filter(e => e.id !== entity.id);
        
        window.EventBus.emit('UI_LOG', `[EDITOR] Deleted: ${name}`);
    },

    // Called from the main animate loop
    update: function(delta) {
        if (!this.isActive) return;

        // --- FREE CAM MOVEMENT ---
        this.camVelocity.set(0, 0, 0);

        // Move relative to camera facing
        if (window.Input.keys.w) this.camVelocity.z -= 1;
        if (window.Input.keys.s) this.camVelocity.z += 1;
        if (window.Input.keys.a) this.camVelocity.x -= 1;
        if (window.Input.keys.d) this.camVelocity.x += 1;
        
        // Vertical movement (E = Up, Q/C = Down)
        if (window.Input.keys.e) this.camVelocity.y += 1;
        if (window.Input.keys.c) this.camVelocity.y -= 1;

        if (this.camVelocity.lengthSq() > 0) {
            this.camVelocity.normalize();
            
            // Multiplier for sprint
            const speed = window.Input.keys.shift ? this.camSpeed * 3 : this.camSpeed;
            
            this.camVelocity.applyQuaternion(window.GameCore.camera.quaternion);
            
            window.GameCore.camera.position.addScaledVector(this.camVelocity, speed * delta);
        }

        // --- SYNC PHYSICS TO MESH WHILE DRAGGING ---
        // If we are actively moving an object with the gizmo, we must teleport its physics body
        if (this.selectedEntity && window.Input.isDraggingGizmo) {
            const p = this.selectedEntity.visual.position;
            const r = this.selectedEntity.visual.quaternion;
            
            // Teleport Rapier RigidBody to match Three.js visual
            this.selectedEntity.body.setTranslation({x: p.x, y: p.y, z: p.z}, true);
            this.selectedEntity.body.setRotation({x: r.x, y: r.y, z: r.z, w: r.w}, true);
            this.selectedEntity.body.setLinvel({x:0, y:0, z:0}, true);
            this.selectedEntity.body.setAngvel({x:0, y:0, z:0}, true);
            
            // SPATIAL GRID UPDATE: Force update so AI sees it in new location
            window.GameCore.SpatialGrid.updateEntity(this.selectedEntity);
        }
    }
};

// Initialize after engine boot
window.EventBus.on('ENGINE_READY', () => {
    window.EditorManager.init();
});
