



















// File: src_main.js

// 0. Core Event Bus (MUST BE FIRST)
import './src_core_event_bus.js';

// --- DIAGNOSTIC VOICE WRAPPER ---
import './src_systems_diagnostic_wrapper.js';


// 0. Core Registry & State

import './src_systems_profiler.js';
import './src_core_registry.js';
import './src_core_civilization.js';
import './src_core_system_definitions.js';
import './src_consequence_epistemic_filter.js';
import './src_consequence_interceptor.js';
import './src_consequence_chronicle_engine.js';
import './src_systems_civilization_profiler.js';
import './src_core_state.js';
import './src_core_config.js';
import './src_core_worker_pool.js';
import './src_core_heartbeat.js';
import './src_core_asset_budget.js';

// 1. Core Systems & World Managers
import './src_epoch_manager.js';
import './src_systems_civilizational_vitality_bureau.js';
import './src_systems_institutional_continuity.js';
import './src_systems_civilization_learning.js';
import './src_systems_adversarial_learning.js';
import './src_systems_divergence_observatory.js';
import './src_systems_community_memory.js';
import './src_systems_significance_economy.js';
import './src_systems_resource_thermodynamics.js';
import './src_systems_political_observatory.js';
import './src_systems_fuel_observatory.js';
import './src_systems_dunes_analytics.js';
import './src_systems_anomaly_bureau.js';
import './src_systems_historical_compression.js';
import './src_systems_epistemic_integrity.js';
import './src_systems_intel.js';
import './src_systems_intel_tracker.js';
import './src_systems_investigation.js';
import './src_systems_reputation.js';
import './src_systems_dreams.js';
import './src_systems_folklore.js';
import './src_systems_history_office.js';
import './src_systems_dynasty.js';
import './src_systems_dynastic_continuity.js';
import './src_systems_political_pressure.js';
import './src_systems_harvest.js';
import './src_systems_instability.js';
import './src_systems_events.js';
import './src_systems_shift.js';
import './src_systems_archives.js';
import './src_systems_dune_investigation.js';
import './src_systems_playback.js';
import './src_systems_meaning.js';
import './src_systems_knowledge.js';
import './src_systems_trait_evolution.js';
import './src_systems_shackle_walker.js';
import './src_systems_legacy.js';
import './src_systems_conviction.js';

// --- CONSEQUENCE ENGINE (Phase 3 Integration) ---
import './src_consequence_epistemology.js';
import './src_consequence_core.js';
// ------------------------------------------------

import './src_systems_origin.js';

import './src_systems_runes.js';
import './src_systems_narrative_driver.js';
import './src_systems_world.js';

import './src_systems_inventory.js';
import { initializeUIEngine } from './src/ui/init.js';
import './src_systems_ui.js';
import './src_systems_render_optimizer.js'; 
import './src_systems_graphics.js';          // Dedicated AAA Graphics Pipeline & Post-Processing
import './src_systems_volumetric_fog.js';    // Atmospheric Height-Fog Shader
import './src_systems_terrain_worker_pool.js'; // Background Web Worker Pool
import './src_systems_block_terrain.js';      // Procedural Block Terrain & Shader System
import './src_systems_grass.js';
import './src_systems_ruins.js';             // Procedural Stone Ruins & Cobblestones
import './src_generators_redwood.js';        // <-- ADDED: Redwood Generator & Web Worker Orchestrator
import './src_systems_procedural_trees.js';   // High-Quality Procedural Trees
import { ImpostorBaker } from './src_systems_impostor_baker.js'; // Single Authority Baker
import './src_systems_forest_impostors.js';   // 3km Distant Canopy Impostor System
import WetlandsSystem from './src_systems_wetlands.js';
import MountainSystem from './src_systems_mountains.js';
import DunesSystem from './src_systems_dunes.js';
import TidewaterSystem from './src_systems_tidewater.js';

import './src_systems_input.js';
import './src_systems_audio.js';
import './src_systems_vfx.js';
import './src_systems_navigation_v2.js';
import './src_systems_roads.js';
import './src_systems_road_renderer.js';     // Procedural Road Decor & Lanterns
import './src_systems_villages.js';
import './src_systems_village_demographics.js';
import './src_systems_village_economy.js';
import './src_systems_village_institutions.js';
import './src_systems_adventurers.js';
import './src_systems_ai.js';
import './src_systems_assets.js';
import './src_systems_careers.js';
import './src_systems_establishment.js';
import './src_systems_barrier_pipeline.js';
import './src_systems_markets.js';
import './src_systems_agriculture.js';
import './src_systems_guilds.js';
import './src_systems_security.js';
import './src_systems_social_structure.js';
import './src_systems_urban_planning.js';
import './src_systems_ecology.js';

import './src_systems_total_war.js';
import './src_systems_innovation.js';
import './src_systems_meta_history.js';
import './src_systems_social_capital.js';

import './src_systems_civilization_trauma_office.js';
import './src_systems_cognition.js';
import './src_systems_nociception.js';
import './src_systems_perception.js';
import './src_systems_household.js';
import './src_systems_relationships.js';
import './src_systems_feuds.js';
import './src_systems_prestige.js';
import './src_systems_kinship.js';
import './src_systems_social_signaling.js';
import './src_systems_group_dynamics.js';
import './src_systems_gossip.js';

import './src_systems_warden.js';

import './src_systems_demographic_directorate.js';
import './src_systems_historical_capture_bureau.js';
import './src_systems_observatory.js';
import './src_systems_rogue_civilization_bureau.js';
import './src_systems_truth_recovery_observatory.js';
import './src_systems_physical_realism_audit_office.js';
import './src_systems_information_velocity_observatory.js';





import './src_systems_chronicle.js';
import './src_systems_historical_divergence.js';
import './src_systems_misinfo_consequence.js';
import './src_systems_forces.js';
import './src_systems_calibration.js';
import './src_systems_navigation_careers.js';



// 1.5 Integration Testing: Character Stack
import './src/character/init.js';

// 2. Mod Tools, Overlays & Dev Systems
import './src/animation_tools/MixamoRetargeting.js';
import './src_firebase.js';
import './src_multiplayer.js';
import './src_systems_editor.js';
import './src_systems_attractor.js';
import './src_systems_crows_eye.js';
import './src/systems/integrity.js';

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

if (typeof window !== 'undefined' && !window.ImpostorBaker) {
    // Bind an uninitialized instance to window so the engine can invoke it during boot
    window.ImpostorBaker = new ImpostorBaker(null, 2048); 
}

window.EventBus.on('PLAYER_DEATH', (data) => {
    window.EventBus.emit('UI_LOG', `💀 [LEGACY] Your story as the Wanderer has ended at age ${data.age}.`);
    
    // Node 4 & 9: Player Succession Path
    // 1. Knowledge Retained: Handed to recruited companions or apprentices
    const party = window.GameState.party.members.filter(m => m.recruited);
    if (party.length > 0) {
        const primarySuccessor = party[0];
        window.EventBus.emit('UI_LOG', `[SUCCESSION] Your apprentice, ${primarySuccessor.name}, inherits your archives.`);
        
        const playerIntel = window.IntelManager.getIntelForNode('player_node');
        playerIntel.forEach(intel => {
            window.IntelManager.grantOwnership(intel.intel_id, primarySuccessor.id);
        });
    }

    // 2. Property Retained: Base structures are owned by the bloodline
    if (window.GameState.playerLegacy) {
        window.GameState.playerLegacy.generation += 1;
        window.EventBus.emit('UI_LOG', `[LINEAGE] Beginning Generation ${window.GameState.playerLegacy.generation}.`);
    }
});

// 6. Main Engine Entry Point
import './src_engine.js';

