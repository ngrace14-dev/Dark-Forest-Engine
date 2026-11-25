// Ensure Input defaults are securely initialized
window.Input = window.Input || {};
window.Input.keys = window.Input.keys || {};
window.Input.cameraMode = window.Input.cameraMode || 'CLASSIC_ISOMETRIC';
window.Input.isLockedPerspective = window.Input.isLockedPerspective ?? true;
window.Input.camAngle = window.Input.camAngle ?? (Math.PI / 4); // Classic Isometric NE diagonal orientation
window.Input.camPitch = window.Input.camPitch ?? (Math.PI / 4); // Classic Isometric 45-deg elevation
window.Input.camDistance = window.Input.camDistance || 42;      // Standoff distance for low-FOV isometric view
window.Input.isDraggingCam = false;
window.Input.lastMouseX = 0;
window.Input.lastMouseY = 0;
window.Input.camShake = window.Input.camShake || 0;

document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); 
    if (window.Input.keys.hasOwnProperty(k)) window.Input.keys[k] = true;
    if (k === 'c') { const p = document.getElementById('stats-panel'); if(p) p.classList.toggle('hidden'); }
    if (k === 'i') { const p = document.getElementById('inventory-panel'); if(p) { p.classList.toggle('hidden'); if(!p.classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); } }
    if (k === 'u') window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS');
    if (k === 'q' && window.GameCore.engineState === 'running') window.EventBus.emit('GUARDBREAKER');
    if (k === 'g' && window.GameCore.engineState === 'running') window.EventBus.emit('TOGGLE_SQUAD_MANAGER');
    if (k === 'm' && window.GameCore.engineState === 'running') window.EventBus.emit('TOGGLE_MAP');
    if (k === 'x' && window.GameCore.engineState === 'running') window.EventBus.emit('TOGGLE_STEALTH');

    if (k === 'r' && window.GameCore.engineState === 'running') window.EventBus.emit('EMERGENCY_RATION');
    if (k === 'f' && window.GameCore.engineState === 'running') window.EventBus.emit('VOID_RUNE_SHOT');
    if (k === 'g' && window.GameCore.engineState === 'running') window.EventBus.emit('FIRE_RUNE_SHOT');
    if (k === 'b' && window.GameCore.engineState === 'running') window.EventBus.emit('CLAIM_PLAYER_CAMP');
    
    if (k === '2') window.EventBus.emit('TOGGLE_EDITOR');
    if (k === 'p' && window.GameCore.engineState === 'running') window.NetworkSession?.togglePartyMode();
    if (k === 'e' && window.GameCore.engineState === 'running') window.EventBus.emit('INTERACT_NEARBY');
    if (window.GameCore.engineState === 'running' && ['1', '3', '4', '5'].includes(k)) window.EventBus.emit('PARTY_COMMAND', ({ '1': 'follow', '3': 'guard', '4': 'attack', '5': 'retreat' })[k]);
    if (k === 'f5') { e.preventDefault(); window.EventBus.emit('GAME_SAVE'); }
    if (k === 'f9') { e.preventDefault(); window.EventBus.emit('GAME_LOAD'); }
});

document.addEventListener('keyup', e => { 
    const k = e.key.toLowerCase(); 
    if (window.Input.keys.hasOwnProperty(k)) window.Input.keys[k] = false; 
});

document.addEventListener('mousedown', e => {
    if (window.EngineParams?.editMode) return;
    
    // Start tracking right-click camera drag
    if (e.button === 2) { 
        window.Input.isDraggingCam = true; 
        window.Input.lastMouseX = e.clientX; 
        window.Input.lastMouseY = e.clientY; 
    }

    if (e.button === 0 && window.GameCore.engineState === 'running') window.EventBus.emit('PRIMARY_CLICK_DOWN', { clientX: e.clientX, clientY: e.clientY });
    if (e.button === 1 && window.GameCore.engineState === 'running') window.EventBus.emit('SECONDARY_CLICK_DOWN', { clientX: e.clientX, clientY: e.clientY });
});

document.addEventListener('mouseup', e => { 
    if (e.button === 2) window.Input.isDraggingCam = false; 
});

document.addEventListener('mousemove', e => {
    if (window.Input.isDraggingCam) { 
        if (window.EngineParams?.editMode) return; // Mouselook handled by EditorManager
        
        const deltaX = e.clientX - window.Input.lastMouseX;
        const deltaY = e.clientY - window.Input.lastMouseY;

        if (!window.Input.isLockedPerspective && window.Input.cameraMode !== 'CLASSIC_ISOMETRIC') {
            // Integration Test: Pipe to new camera rig if it exists
            if (window.GameCore?.cameraRig) {
                window.GameCore.cameraRig.addOrbit(deltaX, -deltaY);
            } else {
                // Adjust angle and pitch based on mouse movement (Legacy)
                window.Input.camAngle += deltaX * 0.01; 
                window.Input.camPitch += deltaY * 0.01;
                
                // Clamp pitch between ground-level (0.1) and top-down (almost PI/2) to prevent camera from flipping upside down
                window.Input.camPitch = Math.max(0.1, Math.min(Math.PI / 2.1, window.Input.camPitch));
            }
        }
        
        window.Input.lastMouseX = e.clientX; 
        window.Input.lastMouseY = e.clientY;
    }
    window.EventBus.emit('MOUSE_MOVED', { clientX: e.clientX, clientY: e.clientY });
});

document.addEventListener('wheel', e => { 
    // Scroll to zoom in and out
    const isIso = window.Input.isLockedPerspective || window.Input.cameraMode === 'CLASSIC_ISOMETRIC';
    const minDist = isIso ? 24 : 5;
    const maxDist = isIso ? 68 : 30;
    if (window.GameCore?.cameraRig && !isIso) {
        window.GameCore.cameraRig.addZoom(e.deltaY * 0.01);
    } else {
        window.Input.camDistance = Math.max(minDist, Math.min(maxDist, window.Input.camDistance + e.deltaY * 0.01)); 
    }
});

// Prevent browser context menu on right-click
document.addEventListener('contextmenu', e => e.preventDefault());


// ==========================================
// THE MISSING PIECE: CAMERA UPDATE LOOP
// ==========================================
function updateCamera() {
    requestAnimationFrame(updateCamera);
    
    if (!window.GameCore || !window.GameCore.camera || !window.GameCore.playerObj || !window.GameCore.playerObj.visual) return;
    
    // Process combat camera shake
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (window.Input.camShake > 0) {
        shakeX = (Math.random() - 0.5) * window.Input.camShake;
        shakeY = (Math.random() - 0.5) * window.Input.camShake;
        shakeZ = (Math.random() - 0.5) * window.Input.camShake;
        window.Input.camShake *= 0.9; // Decay the shake smoothly
        if (window.Input.camShake < 0.01) window.Input.camShake = 0;
    }

    const profile = window.getActiveCameraProfile ? window.getActiveCameraProfile() : null;
    const isIso = window.Input.isLockedPerspective || window.Input.cameraMode === 'CLASSIC_ISOMETRIC';

    const playerPos = window.GameCore.playerObj.visual.position;
    const dist = window.Input.camDistance;
    const pitch = isIso ? (profile?.pitch ?? (Math.PI / 4)) : window.Input.camPitch;
    const angle = isIso ? (profile?.angle ?? (Math.PI / 4)) : window.Input.camAngle;
    const targetOffsetY = isIso ? (profile?.targetHeightOffset ?? 1.0) : 1.5;

    if (profile && window.GameCore.camera.fov !== profile.fov && typeof window.GameCore.camera.updateProjectionMatrix === 'function') {
        window.GameCore.camera.fov = profile.fov;
        window.GameCore.camera.updateProjectionMatrix();
    }

    // Convert spherical coordinates to cartesian (X, Y, Z) to orbit around the player
    const camX = playerPos.x + dist * Math.sin(angle) * Math.cos(pitch) + shakeX;
    const camY = playerPos.y + targetOffsetY + dist * Math.sin(pitch) + shakeY;
    const camZ = playerPos.z + dist * Math.cos(angle) * Math.cos(pitch) + shakeZ;

    // Apply the position and lock the camera's focus onto the player
    window.GameCore.camera.position.set(camX, camY, camZ);
    window.GameCore.camera.lookAt(playerPos.x, playerPos.y + targetOffsetY, playerPos.z);
}

// Boot the camera loop independently
updateCamera();
