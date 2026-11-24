# Implementation Plan: The Broken Reality (Hydrology, Tectonics, The Geometer & Void-Touched Fractal Decay)

## 1. Objective & Design Mandate
Upgrade the world-generation and systemic simulation engines to treat geological laws as an **"Ideal Blueprint"** and reality as an **"Entropy-Degrading System."** Integrate **The Geometer** as a hidden (`HOST_ONLY`) systemic entity and the **Void-Touched** system as a high-stakes, fractal decay mechanic for operatives.

## 2. Strict Topic Isolation & Sequential Execution Plan

### Phase 1: Orphic Hydrology & Tectonic Invariants (The Blueprint)
- **Files Affected:**
  - `src/epoch_manager.js`
  - `src/systems/dune_drift.js`
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `tools/audit/verify_hydrology_laws.mjs` (New Audit Script)
- **Technical Specification:**
  1. **Ideal Geological Blueprint (`IdealBlueprint`):** Codify the Mountain Ring ($100\text{–}280\text{km}$) as the primary **Orphic Watershed** and the **Great Lake** (250-mile diameter inner basin sink) as the **Primary Sink**.
  2. **Tectonic Lineaments:** Replace purely random mountain placement with directional chains based on deterministic **Tectonic Plate Vectors** (`TECTONIC_PLATE_VECTORS`).
  3. **Dune Siphon-Flow ("Infinity Feed"):** Implement extra-dimensional anomaly siphon sources (`INFINITY_FEED_ANOMALIES`) for Dune river systems, allowing them to flow inward without traditional mountain watersheds.
  4. **Hydrology Auditor (`tools/audit/verify_hydrology_laws.mjs`):** Verify that every inner river maps from a Mountain Ring source to the Great Lake sink, and every Dune river maps from an Infinity Feed siphon anomaly to the Event Horizon Silt-Lock.


### Phase 2: The Geometer (The Systemic Actor)
- **Files Affected:**
  - `src/core/civilization.js`
  - `src/systems/forces.js`
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
  - `tools/audit/verify_geometer_system.mjs` (New Audit Script)
- **Technical Specification:**
  1. **The Geometer Registry:** Add `THE_GEOMETER` to `ForceCatalog` in `src/core/civilization.js` and `ForceManager` in `src/systems/forces.js`.
  2. **`HOST_ONLY` Visibility Controller:** Implement `HOST_ONLY` visibility filtering in `CommanderEngine` so clients (`isHost === false`) never see the Geometer's dialogue, position, or Void-Touched UI flickering.
  3. **Procedural Collision Integration:** Link the Geometer to `ProceduralCollisionEngine` (*Grammar of Chaos*); he manifests when `GeologicalDissonance` reaches a critical threshold ($\ge 0.65$).
  4. **Narrative Decay & Entropy Acceleration:** Evolve the Geometer's dialogue across 4 dissolution stages as he merges with the landscape. Killing the Geometer triggers an immediate `10x EntropyMultiplier` and wipes `IdealBlueprint`.

### Phase 3: Stochastic Material Permutation (The Corruption)
- **Files Affected:**
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `tools/audit/verify_material_permutation.mjs` (New Audit Script)
- **Technical Specification:**
  1. **Material Registry:** Refactor static material data (Ironbark Wood, Basalt Stone, etc.) into a dynamic registry supporting property permutation.
  2. **Reality Fracture Event:** Implement a `1 in 100,000` (`1e-5`) collision chance that permutes two random material properties (e.g., Tree density vs. Stone hardness).
  3. **Persistence:** Persist corrupted objects and material states in `persistentSectorMapData`.

### Phase 4: Phase-Shift Breaches (Quantum Tunnelling)
- **Files Affected:**
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `tools/audit/verify_phase_shift_breaches.mjs` (New Audit Script)
- **Technical Specification:**
  1. **Breach Hazard:** Implement a `10^-7` per-tick `Phase-Shift Breach` turning breached objects non-solid (`isSolid: false`).
  2. **Reality Eviction Protocol:** Overlapping a breached `isSolid: false` object triggers a random Overworld teleport.
  3. **Corruption Burst:** Teleportation triggers a `5x5` tile `CORRUPTION_ZONE` that permutes local terrain.

### Phase 5: Void-Touched Agents (Fractal Bloom & Decay)
- **Files Affected:**
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
  - `tools/audit/verify_void_touched_agents.mjs` (New Audit Script)
- **Technical Specification:**
  1. **`VoidTaint` Registry:** Track `VoidTaint` ($0.0\text{–}1.0$) on all operatives.
  2. **Fractal Bloom:** Implement a `Weibull` stat-roller granting massive, unstable power-spikes to `VoidTouched` agents.
  3. **Fractal Decay UI:** Progressive ASCII/data corruption and name fracturing at high Taint (filtered via `isHost`).
  4. **Shatter Event:** At `1.0 Taint`, remove the agent, spawn a `VOID_FRACTURE` anomaly, and log a high-significance narrative entry.
