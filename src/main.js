



















// File: src_main.js

// 0. Core Event Bus (MUST BE FIRST)
import './core/event_bus.js';

// --- DIAGNOSTIC VOICE WRAPPER ---
import './systems/diagnostic_wrapper.js';


// 0. Core Registry & State

import './systems/profiler.js';
import './core/registry.js';
import './core/civilization.js';
import './core/system_definitions.js';
import './consequence/epistemic_filter.js';
import './consequence/interceptor.js';
import './consequence/chronicle_engine.js';
import './systems/civilization_profiler.js';
import './core/state.js';
import './core/config.js';
import './core/worker_pool.js';
import './core/heartbeat.js';
import './core/asset_budget.js';

// 1. Core Systems & World Managers
import './epoch_manager.js';
import './systems/civilizational_vitality_bureau.js';
import './systems/institutional_continuity.js';
import './systems/civilization_learning.js';
import './systems/adversarial_learning.js';
import './systems/divergence_observatory.js';
import './systems/community_memory.js';
import './systems/significance_economy.js';
import './systems/resource_thermodynamics.js';
import './systems/political_observatory.js';
import './systems/fuel_observatory.js';
import './systems/dunes_analytics.js';
import './systems/anomaly_bureau.js';
import './systems/historical_compression.js';
import './systems/epistemic_integrity.js';
import './systems/intel.js';
import './systems/intel_tracker.js';
import './systems/investigation.js';
import './systems/reputation.js';
import './systems/dreams.js';
import './systems/folklore.js';
import './systems/history_office.js';
import './systems/dynasty.js';
import './systems/dynastic_continuity.js';
import './systems/political_pressure.js';
import './systems/harvest.js';
import './systems/instability.js';
import './systems/events.js';
import './systems/shift.js';
import './systems/archives.js';
import './systems/dune_investigation.js';
import './systems/playback.js';
import './systems/meaning.js';
import './systems/knowledge.js';
import './systems/trait_evolution.js';
import './systems/shackle_walker.js';
import './systems/legacy.js';
import './systems/conviction.js';

// --- CONSEQUENCE ENGINE (Phase 3 Integration) ---
import './consequence/epistemology.js';
import './consequence/core.js';
// ------------------------------------------------

import './systems/origin.js';

import './systems/runes.js';
import './systems/narrative_driver.js';
import './systems/world.js';

import './systems/inventory.js';
import { initializeUIEngine } from './src/ui/init.js';
import './systems/ui.js';
import './systems/render_optimizer.js'; 
import './systems/graphics.js';          // Dedicated AAA Graphics Pipeline & Post-Processing
import './systems/volumetric_fog.js';    // Atmospheric Height-Fog Shader
import './systems/terrain_worker_pool.js'; // Background Web Worker Pool
import './systems/block_terrain.js';      // Procedural Block Terrain & Shader System
import './systems/grass.js';
import './systems/ruins.js';             // Procedural Stone Ruins & Cobblestones
import './src_generators_redwood.js';        // <-- ADDED: Redwood Generator & Web Worker Orchestrator
import './systems/procedural_trees.js';   // High-Quality Procedural Trees
import { ImpostorBaker } from './src_systems_impostor_baker.js'; // Single Authority Baker
import './systems/forest_impostors.js';   // 3km Distant Canopy Impostor System
import WetlandsSystem from './src_systems_wetlands.js';
import MountainSystem from './src_systems_mountains.js';
import DunesSystem from './src_systems_dunes.js';
import TidewaterSystem from './src_systems_tidewater.js';

import './systems/input.js';
import './systems/audio.js';
import './systems/vfx.js';
import './systems/navigation_v2.js';
import './systems/roads.js';
import './systems/road_renderer.js';     // Procedural Road Decor & Lanterns
import './systems/villages.js';
import './systems/village_demographics.js';
import './systems/village_economy.js';
import './systems/village_institutions.js';
import './systems/adventurers.js';
import './systems/ai.js';
import './systems/assets.js';
import './systems/careers.js';
import './systems/establishment.js';
import './systems/barrier_pipeline.js';
import './systems/markets.js';
import './systems/agriculture.js';
import './systems/guilds.js';
import './systems/security.js';
import './systems/social_structure.js';
import './systems/urban_planning.js';
import './systems/ecology.js';

import './systems/total_war.js';
import './systems/innovation.js';
import './systems/meta_history.js';
import './systems/social_capital.js';

import './systems/civilization_trauma_office.js';
import './systems/cognition.js';
import './systems/nociception.js';
import './systems/perception.js';
import './systems/household.js';
import './systems/relationships.js';
import './systems/feuds.js';
import './systems/prestige.js';
import './systems/kinship.js';
import './systems/social_signaling.js';
import './systems/group_dynamics.js';
import './systems/gossip.js';

import './systems/warden.js';

import './systems/demographic_directorate.js';
import './systems/historical_capture_bureau.js';
import './systems/observatory.js';
import './systems/rogue_civilization_bureau.js';
import './systems/truth_recovery_observatory.js';
import './systems/physical_realism_audit_office.js';
import './systems/information_velocity_observatory.js';





import './systems/chronicle.js';
import './systems/historical_divergence.js';
import './systems/misinfo_consequence.js';
import './systems/forces.js';
import './systems/calibration.js';
import './systems/navigation_careers.js';



// 1.5 Integration Testing: Character Stack
import './src/character/init.js';

// 2. Mod Tools, Overlays & Dev Systems
import './src/animation_tools/MixamoRetargeting.js';
import './firebase.js';
import './multiplayer.js';
import './systems/editor.js';
import './systems/attractor.js';
import './systems/crows_eye.js';
import './src/systems/integrity.js';

import './systems/dev_tools.js';
import './systems/health.js';

// 3. Gameplay Expansion Systems
import './systems/companions.js';
import './systems/war.js';
import './systems/loot.js';
import './systems/blacksmith.js';

// 4. Forest Generation, Instancing & VAT
import './systems/forest.js';
import './systems/forest_renderer.js';
import './systems/forest_billboards.js';
import './systems/vat.js';

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
import './engine.js';

