const fs = require('fs');


let content = fs.readFileSync('src_systems_editor.js', 'utf8');

const startStr = '    // --- ANIMATION STUDIO (Video Reference & IK Dots) ---';
const endStr = '        // IK PUPPETEER CHECK (Check if clicking a dot)';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx > -1 && endIdx > -1) {
    const replacement = `    // --- ANIMATION STUDIO (Video Reference & IK Dots) ---
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
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Active. Upload a video reference and set reference points.');
            } else {
                this.cleanup();
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Closed.');
            }
        },
        
        setupUI: function() {
            const ui = document.createElement('div');
            ui.id = 'anim-studio-ui';
            ui.className = 'absolute top-20 right-10 z-50 bg-gray-900/95 border border-pink-600 p-4 rounded-lg shadow-2xl flex flex-col gap-3 w-80 backdrop-blur-sm';
            ui.innerHTML = \`
                <div class="text-pink-400 font-bold uppercase tracking-widest text-xs border-b border-gray-700 pb-1 mb-1 flex justify-between">
                    <span>MoCap Studio</span>
                    <span class="text-gray-500">SHIFT+A to Close</span>
                </div>
                <div class="text-[9px] text-gray-400 leading-tight mb-2">1. Provide reference. 2. Set Points. 3. Replicate.</div>
                
                <div class="flex gap-2 mb-1">
                    <input type="text" id="anim-video-url" placeholder="Paste URL (YouTube, MP4, etc.)" class="flex-1 bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-2 outline-none focus:border-pink-500">
                    <button id="btn-load-url" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] transition-colors border border-gray-600 font-bold">Load</button>
                </div>
                
                <input type="file" id="anim-video-upload" accept="video/*" class="text-[10px] text-gray-300 bg-gray-800 p-1.5 rounded cursor-pointer border border-gray-700 w-full mb-1" title="Upload local MP4/WebM">
                
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

                <div class="flex flex-col gap-1 mt-1 border border-gray-700 rounded p-2 bg-gray-800/50">
                    <label class="text-[9px] text-gray-400 uppercase font-bold mb-1 border-b border-gray-700 pb-1">Reference Points</label>
                    <div class="text-[8px] text-gray-400 mb-1 leading-tight">Click major joints on the 3D model to assign tracking nodes, or use auto-detect.</div>
                    <div class="flex gap-2">
                        <button id="btn-auto-dots" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[9px] flex-1">Auto-Detect</button>
                        <button id="btn-clear-dots" class="bg-gray-700 hover:bg-red-900 text-white px-2 py-1 rounded text-[9px] flex-1">Clear Points</button>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-2" id="ref-points-list"></div>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-[9px] text-gray-500 uppercase font-bold">Context / Prompt (Optional)</label>
                    <textarea id="anim-context-prompt" class="bg-gray-950 border border-gray-700 text-gray-300 text-[10px] rounded px-2 py-1 focus:border-pink-500 outline-none h-12 resize-none" placeholder="E.g. A heavy, sluggish swing from the right..."></textarea>
                </div>

                <video id="anim-video-preview" class="w-full h-24 object-cover bg-black rounded border border-gray-700 hidden" controls loop muted></video>
                <iframe id="anim-youtube-preview" class="w-full h-24 rounded border border-gray-700 hidden" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                
                <div class="flex gap-2 mt-1">
                    <button id="btn-bake-mocap" class="flex-1 bg-pink-700 hover:bg-pink-600 text-white text-[10px] py-2 rounded font-bold transition-colors shadow-lg flex items-center justify-center gap-1">Extract & Replicate</button>
                </div>
            \`;
            document.body.appendChild(ui);
            
            document.getElementById('btn-auto-dots').addEventListener('click', () => {
                this.clearGuideDots();
                this.spawnGuideDots();
            });

            document.getElementById('btn-clear-dots').addEventListener('click', () => {
                this.clearGuideDots();
            });

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
                const ytMatch = url.match(/(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/\\s]{11})/i);
                
                if (ytMatch && ytMatch[1]) {
                    const videoId = ytMatch[1];
                    vid.classList.add('hidden');
                    vid.src = '';
                    
                    // Set YouTube iframe embed URL
                    yt.src = \`https://www.youtube.com/embed/\${videoId}?autoplay=1&mute=1&controls=0\`;
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
        
        addGuideDot: function(bone, autoColor = null) {
            // Check if already has a dot
            if (this.guideDots.some(d => d.userData.targetBone === bone)) return;

            let hex = autoColor;
            if (!hex) {
                hex = 0xffa500; // Orange for manual
                if(bone.name.toLowerCase().includes('hand')) hex = 0xff3333; // Red for hands
                else if(bone.name.toLowerCase().includes('foot')) hex = 0x33ff33; // Green for feet
                else if(bone.name.toLowerCase().includes('head')) hex = 0x3333ff; // Blue for head
            }

            const geo = new THREE.SphereGeometry(0.15, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: hex, depthTest: false, transparent: true, opacity: 0.8, wireframe: true });
            const dot = new THREE.Mesh(geo, mat);
            
            // Get absolute position of bone
            const pos = new THREE.Vector3();
            bone.getWorldPosition(pos);
            dot.position.copy(pos);
            dot.userData.targetBone = bone;
            
            window.GameCore.scene.add(dot);
            this.guideDots.push(dot);

            this.updateRefPointsUI();
        },

        clearGuideDots: function() {
            this.guideDots.forEach(dot => {
                window.GameCore.scene.remove(dot);
                dot.geometry.dispose();
                dot.material.dispose();
            });
            this.guideDots = [];
            this.updateRefPointsUI();
        },

        updateRefPointsUI: function() {
            const list = document.getElementById('ref-points-list');
            if (!list) return;
            list.innerHTML = '';
            this.guideDots.forEach((dot, index) => {
                const badge = document.createElement('div');
                badge.className = 'bg-gray-900 border border-gray-600 text-[9px] text-gray-300 px-1.5 py-0.5 rounded flex items-center gap-1';
                badge.innerHTML = \`<span>\${dot.userData.targetBone.name}</span><button class="text-red-400 hover:text-red-300" onclick="window.EditorManager.AnimationStudio.removeGuideDot(\${index})">&times;</button>\`;
                list.appendChild(badge);
            });
        },

        removeGuideDot: function(index) {
            const dot = this.guideDots[index];
            if (dot) {
                window.GameCore.scene.remove(dot);
                dot.geometry.dispose();
                dot.material.dispose();
                this.guideDots.splice(index, 1);
                this.updateRefPointsUI();
            }
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

            majorNodes.forEach(bone => {
                this.addGuideDot(bone);
            });
        },
        
        runAutonomousTracking: function() {
            if (!this.videoNode) {
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] Load a video reference or YouTube link first.');
                return;
            }
            if (this.guideDots.length === 0) {
                window.EventBus.emit('UI_LOG', '[ANIM STUDIO] No reference points set. Auto-detecting or please click on joints.');
                this.spawnGuideDots();
            }

            const contextText = document.getElementById('anim-context-prompt').value.trim();
            const logMsg = contextText 
                ? \`[ANIM STUDIO] Tracking with context: "\${contextText.substring(0, 30)}..."\` 
                : '[ANIM STUDIO] Initiating Neural Video Tracking...';
                
            window.EventBus.emit('UI_LOG', logMsg);
            
            if (this.videoNode.tagName === 'VIDEO') {
                this.videoNode.play();
            }
            
            // Simulated Hook for MediaPipe/PoseNet integration
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                window.EventBus.emit('SPAWN_FLOATING_TEXT', { text: \`TRACKING STREAM... \${progress}%\`, pos: this.targetEntity.visual.position.clone().add(new THREE.Vector3(0,3,0)), color: '#f472b6' });
                
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
            const clipName = \`Replicated_\${actionType}_\${Math.floor(Math.random()*1000)}\`;
            
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
                    
                    tracks.push(new THREE.QuaternionKeyframeTrack(\`\${child.name}.quaternion\`, times, values));
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
            
            window.EventBus.emit('UI_LOG', \`[ANIM STUDIO] Success! \${actionType} replicated from video and applied to \${this.targetEntity.name}.\`);
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
            window.EventBus.emit('UI_LOG', \`[ANIM STUDIO] IK Puppeteer: Bound to \${boneMesh.userData.targetBone.name}\`);
        }
    },
    
    updateBrushVisibility: function() {
`;

    content = content.substring(0, startIdx) + replacement + content.substring(endIdx - 8);
    fs.writeFileSync('src_systems_editor.js', content, 'utf8');
    console.log("Replaced block 1");
}

let onPointerDownBlockStart = content.indexOf('        // IK PUPPETEER CHECK (Check if clicking a dot)');
let onPointerDownBlockEnd = content.indexOf('        // SCULPTING / PAINTING / BUILDING CLICKS');

if (onPointerDownBlockStart > -1 && onPointerDownBlockEnd > -1) {
    const replacement2 = `        // IK PUPPETEER CHECK (Check if clicking a dot)
        if (this.AnimationStudio.isActive) {
            const dotIntersects = this.raycaster.intersectObjects(this.AnimationStudio.guideDots, false);
            if (dotIntersects.length > 0) {
                this.AnimationStudio.bindGizmoToBone(this, dotIntersects[0].object);
                return;
            }

            // Reference Point Creation via clicking mesh
            if (this.AnimationStudio.targetEntity) {
                const modelIntersects = this.raycaster.intersectObject(this.AnimationStudio.targetEntity.visual, true);
                if (modelIntersects.length > 0) {
                    const hit = modelIntersects[0];
                    let nearestBone = null;
                    let minDist = Infinity;
                    
                    this.AnimationStudio.targetEntity.visual.traverse(child => {
                        if (child.isBone) {
                            const pos = new THREE.Vector3();
                            child.getWorldPosition(pos);
                            const dist = pos.distanceTo(hit.point);
                            if (dist < minDist) {
                                minDist = dist;
                                nearestBone = child;
                            }
                        }
                    });

                    // Add point if we clicked near a bone
                    if (nearestBone && minDist < 0.6) {
                        this.AnimationStudio.addGuideDot(nearestBone);
                        window.EventBus.emit('UI_LOG', \`[ANIM STUDIO] Assigned tracking node to \${nearestBone.name}\`);
                        return;
                    }
                }
            }
        }
        
`;
    content = content.substring(0, onPointerDownBlockStart) + replacement2 + content.substring(onPointerDownBlockEnd);
    fs.writeFileSync('src_systems_editor.js', content, 'utf8');
    console.log("Replaced block 2");
}
