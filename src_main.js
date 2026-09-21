// File: src_main.js

// 0. Core Registry & State
import './src_core_registry.js';
import './src_core_state.js';

// 1. Core Systems & World Managers
import './src_epoch_manager.js';
import './src_systems_intel.js';
import './src_systems_world.js';
import './src_systems_inventory.js';
import { initializeUIEngine } from './src/ui/init.js';
import './src_systems_ui.js';
import './src_systems_render_optimizer.js'; // Rendering & Shader LOD Optimizer
import './src_systems_graphics.js';         // <-- NEW: Dedicated AAA Graphics Pipeline
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
import './src_systems_establishment.js';
import './src_systems_relationships.js';
import './src_systems_warden.js';
import './src_systems_chronicle.js';
import './src_systems_navigation_careers.js';

// 2. Mod Tools, Overlays & Dev Systems
import './src/animation_tools/MixamoRetargeting.js';
import './src_firebase.js';
import './src_multiplayer.js';
import './src_systems_editor.js';
import './src_systems_dev_tools.js';
import './src_systems_health.js';

// 3. Gameplay Expansion Systems
import './src_systems_companions.js';
import './src_systems_war.js';
import './src_systems_loot.js';
import './src_systems_blacksmith.js';

// 4. Forest Generation, Instancing & VAT
import './src_systems_forest.js';
import './src_systems_forest_renderer.js';
import './src_systems_forest_billboards.js';
import './src_systems_vat.js';

// 5. Initialize UI Engine (Runs after systems are imported)
if (typeof initializeUIEngine === 'function') {
    initializeUIEngine(window.EventBus);
}

// 6. Main Engine Entry Point
import './src_engine.js';
