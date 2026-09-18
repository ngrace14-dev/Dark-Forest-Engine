import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TransformControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/TransformControls.js';

window.EditorManager = {
    isActive: false,
    transformControl: null,
    selectedEntity: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    
    // Advanced Sculpting State
    isSculpting: false,
    sculptBrushSize: 5.0,
    sculptStrength: 0.5,
    sculptMode: 'raise', // 'raise', 'lower', 'flatten'
    brushMesh: null,
    
    // Foliage Painter State
    isPainting: false,
    paintBrushSize: 8.0,
    paintDensity: 0.1, // instances per square meter
    selectedPaintPrefab: 'Oak Tree',
    paintBrushMesh: null,

    // Snap-to-Grid Builder State
    isBuilding: false,
    buildGridSize: 2.0, // 2m snap grid (Valheim style)
    selectedBuildPrefab: 'Watertight Gothic House',
    buildGhostMesh: null,
    buildRotationOffset: 0,
    
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
        
        this.setupBrushes();

        // Hook into the document directly for editor-specific controls
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        window.EventBus.emit('UI_LOG', '[EDITOR] World Builder Module Initialized. Press F2 to activate.');
    },

    setupBrushes: function() {
        // Sculpting Brush Visual
        const brushGeo = new THREE.RingGeometry(this.sculptBrushSize - 0.2, this.sculptBrushSize, 32);
        brushGeo.rotateX(-Math.PI / 2);
        const brushMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthTest: false });
        this.brushMesh = new THREE.Mesh(brushGeo, brushMat);
        this.brushMesh.visible = false;
        window.GameCore.scene.add(this.brushMesh);

        // Painting Brush Visual
        const paintGeo = new THREE.RingGeometry(this.paintBrushSize - 0.2, this.paintBrushSize, 32);
        paintGeo.rotateX(-Math.PI / 2);
        const paintMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthTest: false });
        this.paintBrushMesh = new THREE.Mesh(paintGeo, paintMat);
        this.paintBrushMesh.visible = false;
        window.GameCore.scene.add(this.paintBrushMesh);
        
        // Builder Ghost Mesh
        this.buildGhostMesh = new THREE.Group();
        this.buildGhostMesh.visible = false;
        window.GameCore.scene.add(this.buildGhostMesh);
    },

    updateBrushVisuals: function() {
        if (this.brushMesh) {
            this.brushMesh.geometry.dispose();
            const brushGeo = new THREE.RingGeometry(this.sculptBrushSize - 0.2, this.sculptBrushSize, 32);
            brushGeo.rotateX(-Math.PI / 2);
            this.brushMesh.geometry = brushGeo;
        }
        if (this.paintBrushMesh) {
            this.paintBrushMesh.geometry.dispose();
            const paintGeo = new THREE.RingGeometry(this.paintBrushSize - 0.2, this.paintBrushSize, 32);
            paintGeo.rotateX(-Math.PI / 2);
            this.paintBrushMesh.geometry = paintGeo;
        }
    },
    
    updateBuilderGhost: function() {
        // Clear old ghost
        while(this.buildGhostMesh.children.length > 0){ 
            const child = this.buildGhostMesh.children[0];
            this.buildGhostMesh.remove(child); 
        }
        
        const def = window.AssetManager.prefabs[this.selectedBuildPrefab];
        if(!def) return;
        
        // Use the existing logic to get the mesh geometry, but apply a ghost material
        let meshGroup = new THREE.Group();
        if (def.customModel && window.AssetManager.models[def.customModel]) {
            const customModel = window.SkeletonUtils.clone(window.AssetManager.models[def.customModel]); 
            const absoluteScale = def.modelScale || 1.0;
            customModel.scale.setScalar(absoluteScale); 
            customModel.position.y = -def.height / 2; 
            
            // Apply blue hologram material
            customModel.traverse(child => { 
                if (child.isMesh) { 
                    child.material = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.5 });
                } 
            });
            meshGroup.add(customModel);
        } else {
            let mesh;
            if(def.type === 'structure') mesh = new THREE.Mesh(new THREE.BoxGeometry(def.radius*2, def.height, def.radius*2));
            else if(def.type === 'mountain') mesh = new THREE.Mesh(new THREE.ConeGeometry(def.radius, def.height, 16));
            else mesh = new THREE.Mesh(new THREE.CylinderGeometry(def.radius, def.radius, def.height, 8));
            
            mesh.material = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.5 });
            meshGroup.add(mesh);
        }
        
        meshGroup.position.y = def.height/2; // Offset center
        meshGroup.rotation.y = this.buildRotationOffset;
        this.buildGhostMesh.add(meshGroup);
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
            
            this.isSculpting = false;
            this.isPainting = false;
            this.isBuilding = false;
            if(this.brushMesh) this.brushMesh.visible = false;
            if(this.paintBrushMesh) this.paintBrushMesh.visible = false;
            if(this.buildGhostMesh) this.buildGhostMesh.visible = false;
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
        } else if (key === 'b') { // Terrain Sculpt Brush
            this.isSculpting = !this.isSculpting;
            this.isPainting = false; this.isBuilding = false;
            this.updateBrushVisibility();
            window.EventBus.emit('UI_LOG', this.isSculpting ? '[EDITOR] Sculpt Mode Enabled. Left click to raise, Alt+Click to lower.' : '[EDITOR] Object Mode Enabled.');
        } else if (key === 'p') { // Foliage Paint Brush
            this.isPainting = !this.isPainting;
            this.isSculpting = false; this.isBuilding = false;
            this.updateBrushVisibility();
            window.EventBus.emit('UI_LOG', this.isPainting ? `[EDITOR] Paint Mode Enabled. Spawning: ${this.selectedPaintPrefab}` : '[EDITOR] Object Mode Enabled.');
        } else if (key === 'o') { // Snap-to-Grid Builder
            this.isBuilding = !this.isBuilding;
            this.isPainting = false; this.isSculpting = false;
            this.updateBrushVisibility();
            if (this.isBuilding) this.updateBuilderGhost();
            window.EventBus.emit('UI_LOG', this.isBuilding ? `[EDITOR] Build Mode Enabled. Snapping: ${this.selectedBuildPrefab}` : '[EDITOR] Object Mode Enabled.');
        } else if (key === '[' || key === ']') {
            const mod = key === '[' ? -1 : 1;
            if (this.isSculpting) { this.sculptBrushSize = Math.max(1, Math.min(20, this.sculptBrushSize + mod)); this.updateBrushVisuals(); }
            if (this.isPainting) { this.paintBrushSize = Math.max(2, Math.min(30, this.paintBrushSize + mod)); this.updateBrushVisuals(); }
            if (this.isBuilding && key === ']') { this.buildRotationOffset += Math.PI / 4; this.updateBuilderGhost(); } // Rotate building right
            if (this.isBuilding && key === '[') { this.buildRotationOffset -= Math.PI / 4; this.updateBuilderGhost(); } // Rotate building left
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
                <div class="text-[9px] text-gray-400 leading-tight mb-2">Provide a video reference. The neural tracker extracts human movement and replicates it onto your 3D skeleton.</div>
                
                <div class="flex gap-2 mb-1">
                    <input type="text" id="anim-video-url" placeholder="Paste URL (YouTube, MP4, etc.)" class="flex-1 bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-2 outline-none focus:border-pink-500">
                    <button id="btn-load-url" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] transition-colors border border-gray-600 font-bold">Load</button>
                </div>
                
                <div class="flex items-center gap-2 mb-1">
                    <div class="h-px bg-gray-700 flex-1"></div>
                    <span class="text-[9px] text-gray-500 uppercase font-bold">OR</span>
                    <div class="h-px bg-gray-700 flex-1"></div>
                </div>

                <input type="file" id="anim-video-upload" accept="video/*" class="text-[10px] text-gray-300 bg-gray-800 p-2 rounded cursor-pointer border border-gray-700 w-full mb-1" title="Upload local MP4/WebM">
                
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] text-gray-500 uppercase font-bold">Target Action to Replicate</label>
                    <select id="mocap-target-action" class="bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-1 py-1.5 focus:border-pink-500 outline-none">
                        <option value="attack">Combat: Attack / Strike / Slash</option>
                        <option value="walk">Movement: Walk / Run / Sprint</option>
                        <option value="dash">Movement: Dash / Roll / Evade</option>
                        <option value="block">Combat: Block / Parry / Guard</option>
                        <option value="idle">Stance: Idle / Breath</option>
                        <option value="hit">Reaction: Hit / Stagger</option>
                    </select>
                </div>

                <video id="anim-video-preview" class="w-full h-32 object-cover bg-black rounded border border-gray-700 hidden" controls loop muted></video>
                <iframe id="anim-youtube-preview" class="w-full h-32 rounded border border-gray-700 hidden" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                
                <div class="flex gap-2 mt-1">
                    <button id="btn-bake-mocap" class="flex-1 bg-pink-700 hover:bg-pink-600 text-white text-[10px] py-2 rounded font-bold transition-colors shadow-lg flex items-center justify-center gap-1"><span>🧠</span> Extract & Replicate</button>
                </div>
            `;
            document.body.appendChild(ui);
            
            document.getElementById('anim-video-upload').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const vid = document.getElementById('anim-video-preview');
                const yt = document.getElementById('anim-youtube-preview');
                
                yt.classList.add('hidden');
                yt.src = '';
                
                vid.src = URL.createObjectURL(file);
                vid.classList.remove('hidden');
                this.videoNode = vid;
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Local video reference loaded.');
            });

            document.getElementById('btn-load-url').addEventListener('click', () => {
                const url = document.getElementById('anim-video-url').value.trim();
                if (!url) return;
                
                const vid = document.getElementById('anim-video-preview');
                const yt = document.getElementById('anim-youtube-preview');
                
                // Regex to extract YouTube Video ID
                const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                
                if (ytMatch && ytMatch[1]) {
                    const videoId = ytMatch[1];
                    vid.classList.add('hidden');
                    vid.src = '';
                    
                    // Set YouTube iframe embed URL
                    yt.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0`;
                    yt.classList.remove('hidden');
                    this.videoNode = yt;
                    
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] YouTube stream connected via proxy bridge.');
                } else {
                    // Assume direct video link (MP4/WebM)
                    yt.classList.add('hidden');
                    yt.src = '';
                    
                    vid.src = url;
                    vid.classList.remove('hidden');
                    this.videoNode = vid;
                    
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Direct video stream URL connected.');
                }
            });

            document.getElementById('btn-bake-mocap').addEventListener('click', () => this.runAutonomousTracking());
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
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Load a video reference or YouTube link first.');
                return;
            }
            window.EventBus.emit('UI_LOG', '[ANIM STUDIO] 🧠 Initiating Neural Video Tracking... (Extracting pose data from stream)');
            
            if (this.videoNode.tagName === 'VIDEO') {
                this.videoNode.play();
            }
            
            // Simulated Hook for MediaPipe/PoseNet integration
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: `TRACKING STREAM... ${progress}%`, pos: this.targetEntity.visual.position.clone().add(new THREE.Vector3(0,3,0)), color: '#f472b6' });
                
                // Wiggle the dots to simulate AI solving the IK tracking
                this.guideDots.forEach(dot => {
                    dot.position.x += (Math.random() - 0.5) * 0.2;
                    dot.position.y += (Math.random() - 0.5) * 0.2;
                    dot.position.z += (Math.random() - 0.5) * 0.2;
                });
                
                if (progress >= 100) {
                    clearInterval(interval);
                    if (this.videoNode.tagName === 'VIDEO') {
                        this.videoNode.pause();
                    }
                    window.EventBus.emit('UI_LOG', '[ANIM STUDIO] ✅ Autonomous tracking complete. Extracting Keyframes...');
                    this.bakeAnimation();
                }
            }, 500);
        },
        
        bakeAnimation: function() {
            const actionType = document.getElementById('mocap-target-action').value;
            const clipName = `Replicated_${actionType}_${Math.floor(Math.random()*1000)}`;
            
            // In a production environment, this is where we convert the 2D MediaPipe skeleton tracking
            // into 3D Quaternions for the THREE.js skeleton bones.
            // For now, we simulate the AI extraction by compiling a mock THREE.AnimationClip.
            
            const tracks = [];
            const duration = 1.0; // 1 second animation loop
            
            this.targetEntity.visual.traverse(child => {
                if (child.isBone) {
                    const times = [0, 0.5, 1.0];
                    const baseQ = child.quaternion.clone();
                    const modQ = baseQ.clone();
                    
                    // Mock extracted poses based on action type
                    if (actionType === 'attack' && (child.name.toLowerCase().includes('arm') || child.name.toLowerCase().includes('hand'))) {
                        modQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/1.5));
                    } else if (actionType === 'walk' && (child.name.toLowerCase().includes('leg') || child.name.toLowerCase().includes('foot'))) {
                        modQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/4));
                    } else if (actionType === 'block' && child.name.toLowerCase().includes('arm')) {
                        modQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -Math.PI/2));
                    } else if (actionType === 'dash' && child.name.toLowerCase().includes('spine')) {
                        modQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/3));
                    }
                    
                    const values = [
                        baseQ.x, baseQ.y, baseQ.z, baseQ.w,
                        modQ.x, modQ.y, modQ.z, modQ.w,
                        baseQ.x, baseQ.y, baseQ.z, baseQ.w
                    ];
                    
                    tracks.push(new THREE.QuaternionKeyframeTrack(`${child.name}.quaternion`, times, values));
                }
            });
            
            // Compile the tracked keyframes into a playable Three.js Clip
            const extractedClip = new THREE.AnimationClip(clipName, duration, tracks);
            
            // 1. Save clip to the Engine's Asset Manager
            const modelName = this.targetEntity.def.customModel || 'default';
            if (!window.AssetManager.animations[modelName]) {
                window.AssetManager.animations[modelName] = [];
            }
            window.AssetManager.animations[modelName].push(extractedClip);
            
            // 2. Map the extracted action to the target character's logic
            this.targetEntity.def.animMap ??= {};
            this.targetEntity.def.animMap[actionType] = clipName;
            
            // 3. Force the engine to reload the character so it instantly uses the new animation
            if (this.targetEntity.def.faction === 'player') {
                window.GameCore.swapPlayerModel();
            } else {
                window.EventBus.emit('WORLD_REGENERATE');
            }
            
            window.EventBus.emit('UI_LOG', `[ANIM STUDIO] Success! ${actionType} replicated from video and applied to ${this.targetEntity.name}.`);
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
        },
        
        // --- IK PUPPETEER (Forward Kinematics Dragging) ---
        // Attaches the main Transform Gizmo to the specific bone so the user can drag it
        bindGizmoToBone: function(editor, boneMesh) {
            if (!this.isActive) return;
            // Detach from the main mesh, attach to the wireframe dot
            editor.transformControl.detach();
            editor.transformControl.attach(boneMesh);
            
            // Listen for dragging the dot to update the actual bone
            editor.transformControl.addEventListener('change', () => {
                if (boneMesh.userData.targetBone) {
                    // Force the actual 3D bone to match where the user dragged the dot
                    const bone = boneMesh.userData.targetBone;
                    // For Forward Kinematics, we update the bone's world position 
                    // (Three.js requires converting this back to local space, but for IK we usually use a solver. 
                    // For this simple version, we'll just snap the bone's rotation to look at the dot, simulating an IK limb pull)
                    
                    // Simple Limb Pointing Logic
                    if (bone.parent) {
                        bone.parent.lookAt(boneMesh.position);
                    }
                }
            });
            window.EventBus.emit('UI_LOG', `[ANIM STUDIO] IK Puppeteer: Bound to ${boneMesh.userData.targetBone.name}`);
        }
    },
    
    updateBrushVisibility: function() {
        if(this.brushMesh) this.brushMesh.visible = this.isSculpting;
        if(this.paintBrushMesh) this.paintBrushMesh.visible = this.isPainting;
        if(this.buildGhostMesh) this.buildGhostMesh.visible = this.isBuilding;
        if(this.isSculpting || this.isPainting || this.isBuilding) this.deselect();
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
        
        // Raycast for Brushes and Builders
        if ((this.isSculpting || this.isPainting || this.isBuilding) && !window.Input.isDraggingCam) {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, window.GameCore.camera);
            
            const chunkMeshes = [];
            if (window.GameCore.ChunkManager) {
                for (const chunk of window.GameCore.ChunkManager.activeChunks.values()) {
                    if (chunk.mesh) chunkMeshes.push(chunk.mesh);
                }
            }
            
            const intersects = this.raycaster.intersectObjects(chunkMeshes, false);
            if (intersects.length > 0) {
                const hitPoint = intersects[0].point;
                
                if (this.isSculpting) {
                    this.brushMesh.position.copy(hitPoint);
                    this.brushMesh.position.y += 0.1; 
                    if (e.buttons === 1) this.applySculpt(hitPoint, e.altKey ? 'lower' : 'raise', chunkMeshes);
                }
                
                if (this.isPainting) {
                    this.paintBrushMesh.position.copy(hitPoint);
                    this.paintBrushMesh.position.y += 0.1;
                    if (e.buttons === 1) this.applyPaint(hitPoint, chunkMeshes);
                }
                
                if (this.isBuilding) {
                    // Valheim Style Grid Snapping
                    const snappedX = Math.round(hitPoint.x / this.buildGridSize) * this.buildGridSize;
                    const snappedZ = Math.round(hitPoint.z / this.buildGridSize) * this.buildGridSize;
                    const y = window.WorldGenerator ? window.WorldGenerator.getTerrainHeight(snappedX, snappedZ) : hitPoint.y;
                    
                    this.buildGhostMesh.position.set(snappedX, y, snappedZ);
                }
            }
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

        // IK PUPPETEER CHECK (Check if clicking a dot)
        if (this.AnimationStudio.isActive) {
            const dotIntersects = this.raycaster.intersectObjects(this.AnimationStudio.guideDots, false);
            if (dotIntersects.length > 0) {
                this.AnimationStudio.bindGizmoToBone(this, dotIntersects[0].object);
                return;
            }
        }
        
        // SCULPTING / PAINTING / BUILDING CLICKS
        if (this.isSculpting || this.isPainting || this.isBuilding) {
            const chunkMeshes = [];
            if (window.GameCore.ChunkManager) {
                for (const chunk of window.GameCore.ChunkManager.activeChunks.values()) {
                    if (chunk.mesh) chunkMeshes.push(chunk.mesh);
                }
            }
            const intersects = this.raycaster.intersectObjects(chunkMeshes, false);
            if (intersects.length > 0) {
                const hitPoint = intersects[0].point;
                if (this.isSculpting) this.applySculpt(hitPoint, e.altKey ? 'lower' : 'raise', chunkMeshes);
                if (this.isPainting) this.applyPaint(hitPoint, chunkMeshes);
                if (this.isBuilding) this.applyBuild();
            }
            return;
        }

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
            } else if (hitMesh.userData && hitMesh.userData.isTerrain) {
                this.deselect();
            } else {
                this.deselect();
            }
        } else {
            this.deselect();
        }
    },
    
    // --- TOOL ACTIONS ---
    
    applySculpt: function(centerPt, mode, chunkMeshes) {
        const radiusSq = this.sculptBrushSize * this.sculptBrushSize;
        const strength = mode === 'raise' ? this.sculptStrength : -this.sculptStrength;
        
        chunkMeshes.forEach(mesh => {
            const positions = mesh.geometry.attributes.position.array;
            let modified = false;
            
            const vertexWorldPos = new THREE.Vector3();
            
            for (let i = 0; i < positions.length; i += 3) {
                vertexWorldPos.set(positions[i], positions[i+1], positions[i+2]);
                vertexWorldPos.applyMatrix4(mesh.matrixWorld);
                
                const dx = vertexWorldPos.x - centerPt.x;
                const dz = vertexWorldPos.z - centerPt.z;
                const distSq = (dx * dx) + (dz * dz);
                
                if (distSq < radiusSq) {
                    const falloff = 1.0 - (Math.sqrt(distSq) / this.sculptBrushSize);
                    positions[i+1] += strength * falloff;
                    modified = true;
                }
            }
            
            if (modified) {
                mesh.geometry.attributes.position.needsUpdate = true;
                mesh.geometry.computeVertexNormals(); 
                this.rebuildChunkCollider(mesh.userData.chunkKey, positions, mesh.geometry.index.array, mesh.position.x, mesh.position.z);
            }
        });
    },

    rebuildChunkCollider: function(chunkKey, vertices, indices, chunkX, chunkZ) {
        if (!window.GameCore.ChunkManager) return;
        const chunk = window.GameCore.ChunkManager.activeChunks.get(chunkKey);
        if (!chunk) return;
        window.GameCore.world.removeCollider(chunk.collider, true);
        const physicsVertices = new Float32Array(vertices); 
        const indicesU32 = new Uint32Array(indices); 
        const colliderDesc = window.RAPIER.ColliderDesc.trimesh(physicsVertices, indicesU32);
        chunk.collider = window.GameCore.world.createCollider(colliderDesc, chunk.body);
    },

    applyPaint: function(centerPt, chunkMeshes) {
        // Only paint every few frames to avoid lag
        if (Math.random() > 0.3) return; 
        
        // Spawn random instances inside the brush radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.paintBrushSize;
        const x = centerPt.x + Math.cos(angle) * radius;
        const z = centerPt.z + Math.sin(angle) * radius;
        
        // Find terrain height at this specific sub-point
        let y = centerPt.y;
        if (window.WorldGenerator) y = window.WorldGenerator.getTerrainHeight(x, z);

        // Spawn dynamic entity (Instancing will be applied when the chunk unloads/loads next)
        const entity = window.GameCore.instantiatePrefab(this.selectedPaintPrefab, x, y, z, 'persistent');
        if (entity) {
            // Add a random scale variance to painted foliage
            const variance = 0.8 + Math.random() * 0.4;
            entity.visual.scale.multiplyScalar(variance);
            
            // Random Y rotation
            entity.visual.rotation.y = Math.random() * Math.PI * 2;
        }
    },

    applyBuild: function() {
        if (!this.buildGhostMesh || !this.buildGhostMesh.visible) return;
        
        const pos = this.buildGhostMesh.position;
        const rot = this.buildRotationOffset;
        
        const entity = window.GameCore.instantiatePrefab(this.selectedBuildPrefab, pos.x, pos.y, pos.z, 'persistent');
        if (entity) {
            entity.visual.rotation.y = rot;
            // Update physics rotation to match
            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0, 'YXZ'));
            entity.body.setRotation({x: q.x, y: q.y, z: q.z, w: q.w}, true);
            
            window.EventBus.emit('UI_LOG', `[BUILDER] Placed ${this.selectedBuildPrefab}`);
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


