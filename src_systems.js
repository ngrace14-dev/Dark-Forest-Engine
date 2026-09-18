// Core Setup
import './src_core_state.js';
import './src_multiplayer.js';

// Game Systems
import './src_systems_inventory.js';
import './src_systems_ui.js';
import './src_systems_input.js';
import './src_systems_audio.js';
import './src_systems_ai.js';
import './src_systems_dev_tools.js';
import './src_systems_vfx.js';
import './src_systems_world.js';
import './src_systems_assets.js';
import './src_systems_vat.js';
import './src_systems_health.js';
import './src_systems_encounters.js';

export { ForestSystem } from './src_systems_forest.js';
export { ForestRenderer } from './src_systems_forest_renderer.js';
export { BillboardSystem } from './src_systems_forest_billboards.js';

window.ForestManager = new ForestSystem();
window.ForestRenderer = new ForestRenderer();
window.BillboardManager = new BillboardSystem();

// Engine Boot and Render Loop (Runs Last)
import './src_engine.js';

