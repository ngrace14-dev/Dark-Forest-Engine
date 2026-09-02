document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); 
    if (window.Input.keys.hasOwnProperty(k)) window.Input.keys[k] = true;
    if (k === 'c') { const p = document.getElementById('stats-panel'); if(p) p.classList.toggle('hidden'); }
    if (k === 'i') { const p = document.getElementById('inventory-panel'); if(p) { p.classList.toggle('hidden'); if(!p.classList.contains('hidden')) window.EventBus.emit('RENDER_INVENTORY'); } }
    if (k === 'u') window.EventBus.emit('DEV_TOOLS_TOGGLE_ASSETS');
    if (k === 'f5') { e.preventDefault(); window.EventBus.emit('GAME_SAVE'); }
    if (k === 'f9') { e.preventDefault(); window.EventBus.emit('GAME_LOAD'); }
});
document.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (window.Input.keys.hasOwnProperty(k)) window.Input.keys[k] = false; });
document.addEventListener('mousedown', e => {
    if (e.button === 2) { window.Input.isDraggingCam = true; window.Input.lastMouseX = e.clientX; window.Input.lastMouseY = e.clientY; }
    if (e.button === 0 && window.GameCore.engineState === 'running') window.EventBus.emit('PRIMARY_CLICK_DOWN', { clientX: e.clientX, clientY: e.clientY });
});
document.addEventListener('mouseup', e => { if (e.button === 2) window.Input.isDraggingCam = false; });
document.addEventListener('mousemove', e => {
    if (window.Input.isDraggingCam) { 
        window.Input.camAngle -= (e.clientX - window.Input.lastMouseX) * 0.01; 
        window.Input.camPitch += (e.clientY - window.Input.lastMouseY) * 0.01;
        
        // Clamp pitch between ground-level (0.1) and top-down (almost PI/2) to prevent flipping
        window.Input.camPitch = Math.max(0.1, Math.min(Math.PI / 2.1, window.Input.camPitch));
        
        window.Input.lastMouseX = e.clientX; 
        window.Input.lastMouseY = e.clientY;
    }
    window.EventBus.emit('MOUSE_MOVED', { clientX: e.clientX, clientY: e.clientY });
});
document.addEventListener('wheel', e => { window.Input.camDistance = Math.max(5, Math.min(30, window.Input.camDistance + e.deltaY * 0.01)); });
document.addEventListener('contextmenu', e => e.preventDefault());
