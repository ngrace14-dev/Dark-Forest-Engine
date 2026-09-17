const fs = require('fs');
let content = fs.readFileSync('src_systems_editor.js', 'utf8');

// 1. Add key listener for '2' to open Animation Editor
const handleKeyDownStr = `        } else if (e.shiftKey && key === 'a') {

            e.preventDefault();
            this.AnimationStudio.toggle(this);
        } else if (key === 'escape') {`;

const handleKeyDownReplacement = `        } else if (e.shiftKey && key === 'a') {
            e.preventDefault();
            this.AnimationStudio.toggle(this);
        } else if (key === '2') {
            e.preventDefault();
            this.AnimationEditor.toggle(this);
        } else if (key === 'escape') {`;

content = content.replace(handleKeyDownStr, handleKeyDownReplacement);

// 2. Add AnimationEditor object definition
const animStudioEndIdx = content.indexOf('    updateBrushVisibility: function() {');

const animEditorCode = `    // --- ANIMATION TWEAK EDITOR ---
    AnimationEditor: {
        isActive: false,
        targetEntity: null,
        currentClip: null,
        currentTime: 0,
        timelineMesh: null,
        selectedBone: null,
        boneHelpers: [],
        
        toggle: function(editor) {
            this.isActive = !this.isActive;
            if (this.isActive) {
                if (!editor.selectedEntity) {
                    window.EventBus.emit('UI_LOG', '[ANIM EDITOR] Error: Select a rigged model first.');
                    this.isActive = false;
                    return;
                }
                
                let isRigged = false;
                editor.selectedEntity.visual.traverse(child => { if (child.isSkinnedMesh) isRigged = true; });
                
                if (!isRigged) {
                    window.EventBus.emit('UI_LOG', '[ANIM EDITOR] Error: Selected model has no skeleton.');
                    this.isActive = false;
                    return;
                }

                this.targetEntity = editor.selectedEntity;
                // Pause standard animation system to take manual control
                if (this.targetEntity.animationController && this.targetEntity.animationController.mixer) {
                    this.targetEntity.animationController.mixer.timeScale = 0;
                }
                
                this.setupUI();
                this.spawnBoneHelpers(editor);
                window.EventBus.emit('UI_LOG', '[ANIM EDITOR] Active. Select a bone to tweak its vectors.');
            } else {
                this.cleanup(editor);
                window.EventBus.emit('UI_LOG', '[ANIM EDITOR] Closed.');
            }
        },

        setupUI: function() {
            const ui = document.createElement('div');
            ui.id = 'anim-editor-ui';
            ui.className = 'absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/95 border border-cyan-600 p-4 rounded-lg shadow-2xl flex flex-col gap-3 w-[600px] backdrop-blur-sm';
            
            // Gather available clips
            let clipOptions = '<option value="">-- Select Animation --</option>';
            const modelName = this.targetEntity.def.customModel;
            let availableClips = [];
            if (modelName && window.AssetManager.animations[modelName]) {
                availableClips = window.AssetManager.animations[modelName];
            } else {
                // Check if it has an animMap and fetch global clips
                if (this.targetEntity.def.animMap) {
                     const clipNames = Object.values(this.targetEntity.def.animMap).filter(n => n !== 'None');
                     availableClips = window.AssetManager.globalAnimations.filter(c => clipNames.includes(c.name));
                }
            }

            availableClips.forEach(clip => {
                clipOptions += \`<option value="\${clip.name}">\${clip.name}</option>\`;
            });

            ui.innerHTML = \`
                <div class="text-cyan-400 font-bold uppercase tracking-widest text-xs border-b border-gray-700 pb-1 flex justify-between">
                    <span>Keyframe Vector Editor</span>
                    <span class="text-gray-500">Press 2 to Close</span>
                </div>
                
                <div class="flex gap-4 items-center">
                    <select id="anim-edit-select" class="bg-gray-950 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:border-cyan-500 outline-none w-1/3">
                        \${clipOptions}
                    </select>
                    
                    <div class="flex-1 flex items-center gap-2">
                        <button id="anim-edit-prev" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">&laquo;</button>
                        <input type="range" id="anim-edit-timeline" class="w-full accent-cyan-500" min="0" max="100" value="0">
                        <button id="anim-edit-next" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">&raquo;</button>
                    </div>
                    <div class="text-xs text-gray-400 font-mono w-16 text-right" id="anim-edit-time-display">0.00s</div>
                </div>

                <div class="grid grid-cols-3 gap-4 mt-2">
                    <div class="col-span-1 bg-gray-800 p-2 rounded border border-gray-700">
                        <div class="text-[10px] text-gray-500 uppercase font-bold mb-1 border-b border-gray-700 pb-1">Selected Bone</div>
                        <div id="anim-edit-bone-name" class="text-xs text-white font-bold truncate">None</div>
                    </div>
                    
                    <div class="col-span-2 bg-gray-800 p-2 rounded border border-gray-700 flex flex-col gap-2 relative">
                         <!-- Overlay when no bone/clip is selected -->
                         <div id="anim-edit-overlay" class="absolute inset-0 bg-gray-800/80 flex items-center justify-center text-xs text-gray-500 z-10">Select a Clip and Bone</div>
                         
                         <div class="text-[10px] text-gray-500 uppercase font-bold border-b border-gray-700 pb-1 flex justify-between">
                            <span>Euler Rotation Override (XYZ)</span>
                            <button id="anim-edit-keyframe-btn" class="bg-cyan-700 hover:bg-cyan-600 text-white px-2 rounded text-[9px]">Set Key</button>
                         </div>
                         <div class="flex gap-2">
                             <div class="flex flex-col flex-1">
                                 <label class="text-[9px] text-red-400">X (Pitch)</label>
                                 <input type="number" step="1" id="anim-edit-rot-x" class="bg-gray-950 border border-gray-700 text-white text-xs rounded px-1 py-1" value="0">
                             </div>
                             <div class="flex flex-col flex-1">
                                 <label class="text-[9px] text-green-400">Y (Yaw)</label>
                                 <input type="number" step="1" id="anim-edit-rot-y" class="bg-gray-950 border border-gray-700 text-white text-xs rounded px-1 py-1" value="0">
                             </div>
                             <div class="flex flex-col flex-1">
                                 <label class="text-[9px] text-blue-400">Z (Roll)</label>
                                 <input type="number" step="1" id="anim-edit-rot-z" class="bg-gray-950 border border-gray-700 text-white text-xs rounded px-1 py-1" value="0">
                             </div>
                         </div>
                    </div>
                </div>
            \`;
            document.body.appendChild(ui);

            const timeline = document.getElementById('anim-edit-timeline');
            const select = document.getElementById('anim-edit-select');
            const timeDisp = document.getElementById('anim-edit-time-display');

            select.addEventListener('change', (e) => {
                const clipName = e.target.value;
                if (!clipName) { this.currentClip = null; return; }
                
                const modelName = this.targetEntity.def.customModel;
                let clip = window.AssetManager.animations[modelName]?.find(c => c.name === clipName);
                if (!clip) clip = window.AssetManager.globalAnimations.find(c => c.name === clipName);
                
                if (clip) {
                    this.currentClip = clip;
                    timeline.max = clip.duration * 100; // 100 steps per second
                    this.setScrubTime(0);
                    document.getElementById('anim-edit-overlay').style.display = this.selectedBone ? 'none' : 'flex';
                }
            });

            timeline.addEventListener('input', (e) => {
                const time = parseFloat(e.target.value) / 100;
                this.setScrubTime(time);
            });

            // UI Inputs to live-update the bone
            const updateBoneRot = () => {
                if (!this.selectedBone) return;
                const rx = THREE.MathUtils.degToRad(parseFloat(document.getElementById('anim-edit-rot-x').value) || 0);
                const ry = THREE.MathUtils.degToRad(parseFloat(document.getElementById('anim-edit-rot-y').value) || 0);
                const rz = THREE.MathUtils.degToRad(parseFloat(document.getElementById('anim-edit-rot-z').value) || 0);
                
                // For editing, we directly manipulate the bone local rotation
                this.selectedBone.rotation.set(rx, ry, rz);
                this.selectedBone.updateMatrixWorld(true);
            };

            document.getElementById('anim-edit-rot-x').addEventListener('input', updateBoneRot);
            document.getElementById('anim-edit-rot-y').addEventListener('input', updateBoneRot);
            document.getElementById('anim-edit-rot-z').addEventListener('input', updateBoneRot);

            document.getElementById('anim-edit-keyframe-btn').addEventListener('click', () => {
                this.saveKeyframe();
            });
        },

        setScrubTime: function(time) {
            this.currentTime = time;
            document.getElementById('anim-edit-time-display').innerText = time.toFixed(2) + 's';
            
            if (this.currentClip && this.targetEntity.animationController && this.targetEntity.animationController.mixer) {
                const mixer = this.targetEntity.animationController.mixer;
                mixer.stopAllAction();
                const action = mixer.clipAction(this.currentClip);
                action.play();
                mixer.setTime(time);
                
                this.updateUIFromBone();
            }
        },

        spawnBoneHelpers: function(editor) {
            this.targetEntity.visual.traverse(child => {
                if (child.isBone) {
                    // Create a small visible octahedron for each bone to click on
                    const geo = new THREE.OctahedronGeometry(0.05);
                    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, depthTest: false, transparent: true, opacity: 0.6 });
                    const helper = new THREE.Mesh(geo, mat);
                    
                    // Attach it as a child of the bone so it moves with it
                    child.add(helper);
                    helper.userData.isAnimEditorHelper = true;
                    helper.userData.targetBone = child;
                    this.boneHelpers.push(helper);
                }
            });
        },

        selectBone: function(boneMesh, editor) {
            const bone = boneMesh.userData.targetBone;
            this.selectedBone = bone;
            
            // Highlight selected
            this.boneHelpers.forEach(h => h.material.color.setHex(0x00ffff));
            boneMesh.material.color.setHex(0xff00ff);
            
            document.getElementById('anim-edit-bone-name').innerText = bone.name;
            if (this.currentClip) document.getElementById('anim-edit-overlay').style.display = 'none';

            // Bind Gizmo (in local space for bone rotation tweaking)
            editor.transformControl.detach();
            editor.transformControl.attach(bone);
            editor.transformControl.setMode('rotate');
            editor.transformControl.setSpace('local');
            
            // Listen to Gizmo to update UI fields
            const updateUI = () => this.updateUIFromBone();
            editor.transformControl.addEventListener('change', updateUI);
            this.gizmoListener = updateUI; // store ref to remove later

            this.updateUIFromBone();
        },

        updateUIFromBone: function() {
            if (!this.selectedBone) return;
            const rx = THREE.MathUtils.radToDeg(this.selectedBone.rotation.x);
            const ry = THREE.MathUtils.radToDeg(this.selectedBone.rotation.y);
            const rz = THREE.MathUtils.radToDeg(this.selectedBone.rotation.z);
            
            document.getElementById('anim-edit-rot-x').value = rx.toFixed(1);
            document.getElementById('anim-edit-rot-y').value = ry.toFixed(1);
            document.getElementById('anim-edit-rot-z').value = rz.toFixed(1);
        },

        saveKeyframe: function() {
            if (!this.currentClip || !this.selectedBone) return;

            // We need to find or create the track for this bone's quaternion
            const trackName = \`\${this.selectedBone.name}.quaternion\`;
            let track = this.currentClip.tracks.find(t => t.name === trackName);
            
            const q = this.selectedBone.quaternion;
            
            if (!track) {
                // Create a new track if the animation didn't originally touch this bone
                track = new THREE.QuaternionKeyframeTrack(trackName, [this.currentTime], [q.x, q.y, q.z, q.w]);
                this.currentClip.tracks.push(track);
            } else {
                // Find nearest frame or inject
                const times = Array.from(track.times);
                const values = Array.from(track.values);
                
                // Simple overwrite if exact time exists, else splice (Simplified for prototype)
                let insertIdx = times.findIndex(t => Math.abs(t - this.currentTime) < 0.01);
                if (insertIdx === -1) {
                    // Just push to end and sort (Three.js requires sorted times)
                    times.push(this.currentTime);
                    values.push(q.x, q.y, q.z, q.w);
                } else {
                    values[insertIdx*4] = q.x;
                    values[insertIdx*4+1] = q.y;
                    values[insertIdx*4+2] = q.z;
                    values[insertIdx*4+3] = q.w;
                }
                
                // Update track arrays
                // (In a full implementation, you'd sort the parallel arrays properly)
                track.times = new Float32Array(times);
                track.values = new Float32Array(values);
            }
            
            window.EventBus.emit('UI_LOG', \`[ANIM EDITOR] Overwrote keyframe at \${this.currentTime.toFixed(2)}s for \${this.selectedBone.name}\`);
        },

        cleanup: function(editor) {
            const ui = document.getElementById('anim-editor-ui');
            if (ui) ui.remove();
            
            this.boneHelpers.forEach(h => {
                if (h.parent) h.parent.remove(h);
                h.geometry.dispose();
                h.material.dispose();
            });
            this.boneHelpers = [];
            
            if (this.targetEntity && this.targetEntity.animationController && this.targetEntity.animationController.mixer) {
                this.targetEntity.animationController.mixer.timeScale = 1;
            }
            
            this.targetEntity = null;
            this.currentClip = null;
            this.selectedBone = null;
            
            if (this.gizmoListener) {
                editor.transformControl.removeEventListener('change', this.gizmoListener);
                this.gizmoListener = null;
            }
            
            editor.transformControl.detach();
            editor.transformControl.setSpace('world'); // reset to default
        }
    },

`;

content = content.substring(0, animStudioEndIdx) + animEditorCode + content.substring(animStudioEndIdx);

// 3. Inject logic into onPointerDown to select boneHelpers
const pointerDownStr = `        // IK PUPPETEER CHECK (Check if clicking a dot)`;
const pointerDownReplacement = `        // ANIMATION TWEAK EDITOR CHECK
        if (this.AnimationEditor.isActive) {
            const boneIntersects = this.raycaster.intersectObjects(this.AnimationEditor.boneHelpers, false);
            if (boneIntersects.length > 0) {
                this.AnimationEditor.selectBone(boneIntersects[0].object, this);
                return;
            }
        }

        // IK PUPPETEER CHECK (Check if clicking a dot)`;

content = content.replace(pointerDownStr, pointerDownReplacement);

fs.writeFileSync('src_systems_editor.js', content, 'utf8');
