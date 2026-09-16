// File: src_main.js
// 1. Core Data
import './src_core_state.js';
// 2. Systems (Must load before Engine boot)
import './src_systems_inventory.js';
import './src_systems_ui.js';
import './src_systems_input.js';
import './src_systems_audio.js';
import './src_systems_vfx.js';
import './src_systems_navigation.js';
import './src_systems_roads.js';
import './src_systems_villages.js';
import './src_systems_adventurers.js';
import './src_systems_ai.js';
import './src_systems_assets.js';
// 3. Mod Tools / Overlays
import './src_firebase.js';
import './src_systems_editor.js';
import './src_systems_dev_tools.js';
import './src_systems_health.js';

// 4. Main Loop & Boot
import './src_engine.js';

