// File: src_main.js
// 0. Core Registry (New)
import './src_core_registry.js';

// 1. Core Data
import './src_core_state.js';
// 2. Systems (Must load before Engine boot)
import './src_epoch_manager.js';
import './src_systems_world.js';
import './src_systems_inventory.js';
import './src_systems_ui.js';
import './src_systems_input.js';
import './src_systems_audio.js';
import './src_systems_vfx.js';
import './src_systems_navigation_v2.js';
import './src_systems_roads.js';
import './src_systems_villages.js';
import './src_systems_adventurers.js';
import './src_systems_ai.js';
import './src_systems_assets.js';
import './src_systems_careers.js';
// 3. Mod Tools / Overlays
import './src/animation_tools/MixamoRetargeting.js';
import './src_firebase.js';
import './src_multiplayer.js';
import './src_systems_editor.js';
import './src_systems_dev_tools.js';
import './src_systems_health.js';

// 11. Companions
import './src_systems_companions.js';

// 12. War & Massive Events
import './src_systems_war.js';

// 13. Loot & Link Runes
import './src_systems_loot.js';

// 14. Blacksmithing & Gear Reactivity
import './src_systems_blacksmith.js';

// 4. Main Loop & Boot


import './src_engine.js';



