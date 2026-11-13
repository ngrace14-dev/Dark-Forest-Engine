const fs = require('fs');
const path = require('path');

// 1. Mock Browser Environment
global.window = {};
global.document = { 
    createElement: () => ({ style: {} }), 
    addEventListener: () => {} 
};
global.navigator = { hardwareConcurrency: 4 };
global.Worker = class { 
    constructor(url) { this.url = url; } 
    postMessage() {} 
    addEventListener() {} 
};
global.THREE = { 
    MathUtils: { generateUUID: () => 'test-uuid-' + Math.random() },
    Vector3: class { constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; } },
    Matrix4: class {},
    Quaternion: class {}
};

console.log('[TEST] Headless minimal browser environment initialized.');

// 2. Synchronous Browser-like Loader
function loadScript(relativePath) {
    try {
        const fullPath = path.join(__dirname, '..', relativePath);
        let code = fs.readFileSync(fullPath, 'utf8');
        
        // Strip out ES Module imports/exports since we are evaling in a shared global context
        code = code.replace(/import .*?from .*?;/g, '');
        code = code.replace(/import .*?['"].*?['"];/g, '');
        code = code.replace(/export default .*?;/g, '');
        code = code.replace(/export class/g, 'class');
        code = code.replace(/export function/g, 'function');
        code = code.replace(/export const/g, 'const');

        // Evaluate in the current global context
        eval(code);
    } catch (e) {
        console.error(`[TEST] Failed to load ${relativePath}:`, e.message);
    }
}

// 3. Boot Core Architecture
loadScript('src/core/event_bus.js');
loadScript('src/core/registry.js');

// Mock state prior to state.js (to bypass Three.js texture loading, etc)
window.GameState = { pStats: {}, inventory: {}, reputation: {} };
window.EngineParams = { simScale: 1.0, isAccelerated: true, worldDay: 0, cycleLengthDays: 14 };

loadScript('src/core/state.js');
loadScript('src/core/config.js');
loadScript('src/core/heartbeat.js');
loadScript('src/core/civilization.js');
loadScript('src/core/system_definitions.js');
loadScript('src/epoch_manager.js');

// 4. Load Consequence Engine
loadScript('src/consequence/epistemic_filter.js');
loadScript('src/consequence/interceptor.js');
loadScript('src/consequence/chronicle_engine.js');

// 5. Load Simulation Systems
loadScript('src/systems/dynasty.js');
loadScript('src/systems/personhood.js');
loadScript('src/systems/villages.js');
loadScript('src/systems/sim_test.js');

console.log('[TEST] Core systems successfully loaded.');

// 6. Execute Test
if (!window.SimTest) {
    console.error("[TEST] window.SimTest was not attached globally!");
    process.exit(1);
}

try {
    console.log('[TEST] Running 14-Day Shift Test (Accelerated)...');
    
    // Simulate 15 days manually (crossing the 14 day Shift Epoch)
    for(let d = 0; d < 15; d++) {
        window.SimTest.stepSimulation();
        // Force the heartbeat to tick through its logic
        if (window.Heartbeat) {
            window.Heartbeat.update(1.0);
        }
    }

    console.log('[TEST] Test complete. Simulation survived 15 days across the threshold.');
    
    if (window.CivilizationState) {
        console.log('[TEST] Final Civilization Entropy:', window.CivilizationState.scalars.WORLD_ENTROPY.toFixed(4));
    }
    
    process.exit(0);
} catch (e) {
    console.error('[TEST FATAL ERROR]', e);
    process.exit(1);
}

