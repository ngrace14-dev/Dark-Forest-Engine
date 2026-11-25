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


### Phase 6: The Chancery & Runic Tally Engine (Elder Futhark Orthography & Rúnakefli Split-Tallies)
- **Files Affected:**
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `src/systems/truth_recovery_observatory.js`
  - `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
  - `tools/audit/verify_runic_tally_system.mjs` (New Audit Script)
- **Technical Specification:**
  1. **Elder Futhark Phonetic Transliteration (`RunicTallySystem`):**
     - Implement the 24-Rune Elder Futhark alphabet across the 3 *ættir* (`ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ` | `ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ` | `ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ`).
     - Enforce core phonetic & orthographic laws:
       - **Phonetic Spelling & Silent Letter Elimination:** e.g. `knight` $\rightarrow$ `nait` (`ᚾᚨᛁᛏ`), `stone` $\rightarrow$ `ston` (`ᛊᛏᛟᚾ`).
       - **Single Runes for Digraphs:** `th` $\rightarrow$ `ᚦ` (Thurisaz), `ng` $\rightarrow$ `ᛜ` (Ingwaz).
       - **Missing Modern Letters:** `qu`/`q` $\rightarrow$ `ᚲᚹ`, `x` $\rightarrow$ `ᚲᛊ`, `v` $\rightarrow$ `ᚢ`, soft `c` $\rightarrow$ `ᛊ`, hard `c` $\rightarrow$ `ᚲ`, `y` (consonant) $\rightarrow$ `ᛃ`.
       - **Never Double Consonants (or identical consecutive runes):** `hammer` $\rightarrow$ `ᚺᚨᛗᛖᚱ`, `valley` $\rightarrow$ `ᚢᚨᛚᛖᛁ`.
       - **Optional Nasal Omission Before Stops (`archaicNasalOmission`):** `land` $\rightarrow$ `ᛚᚨᛞ`, `king` $\rightarrow$ `ᚲᛁᚷ`.
       - **Word Dividers (`᛬` or `᛫`) & Rigid Left-to-Right Framing:** `Black River` $\rightarrow$ `ᛒᛚᚨᚲ᛬ᚱᛁᚢᛖᚱ`.
  2. **Rúnakefli Wooden Tally Sticks & Edge-Notch Accounting:**
     - Translate resource manifests into standardized Chancery formulas (`[Owner] ᛬ [Verb] ᛬ [Commodity] ᛬ [Quantity]`) paired with carved edge-notches (`᛭` = 10, `×` = 5, `|` = 1) and `TallyNotchCount`.
     - Generate official **Bind-Rune Seals (Samstavsrunor)** for all 19 Noble Houses + The Crown.
  3. **Split-Tally Anti-Fraud Checksum (`verifySplitTally`):**
     - Split a carved `RunicTallyStick` lengthwise into `stockShard` (creditor/Chancery half) and `foilShard` (debtor/House half) sharing a deterministic wood-grain fracture vector and halved-rune checksum.
     - Wire `verifySplitTally(tallyA, tallyB)` into `RunicTallySystem` and `src/systems/truth_recovery_observatory.js` to detect forged or mismatched tallies.
  4. **UI Rendering (`RunicTallySlat`):**
     - Render interactive Chancery `RunicTallySlat` wooden tally cards with bind-rune seals and edge notches on Emissary Petitions and the 19-House War Board in `CommanderUI`.

### Phase 7: The Poem Trap Matrix, Hard Epistemic Ceiling Gates & 18,000-Year Semantic Decay Pipeline
- **Files Affected:**
  - `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
  - `src/systems/folklore.js`
  - `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
  - `tools/audit/verify_poem_trap_matrix.mjs` (New Audit Script)
- **Technical Specification:**
  1. **5 Epistemic Classes (`EPISTEMIC_CLASSES`):**
     - `OBSERVATIONAL_TRUTH` (Survival Cadence — zero proper nouns or cosmic cosmology).
     - `INSTITUTIONAL_REVISION` (Crown/House Propaganda — flatters authority, enforces 12,000-year timeline).
     - `THE_BAIT_LURE` (Epitaph & Noble Hubris — promises Significance/Glory while omitting Harvest Visibility & Foundation Decay).
     - `ORBS_HALF_TRUTH` (Contextually Incomplete Warning — true immediate mechanical fix hiding catastrophic second-order consequence).
     - `SUPPRESSED_ROOT` (Faded Champion / Terminus Echo — preserves $t=0$ fragments via kennings & relational pronouns).
  2. **Hard Bible Gates (Rule of Observational Horizon & Rule of Spatial/Illusion Fidelity):**
     - Enforce per-origin `ALLOWED_KNOWLEDGE_CEILING` and `FORBIDDEN_KNOWLEDGE_TERMS` across `SURFACE_VILLAGES`, `THE_CROWN`, `HOUSE_TERMINUS`, `EPITAPH_7`, and `THE_ORB_DUNE`, blocking any leak of `hiddenGapKeeper: true` (*Epitaph*) when `blindSpotEntropy < 85`.
  3. **Structural & Prosodic Constraints:**
     - 4-Beat Mnemonic Stanza (4-slot blueprint: `Line 1: Anchor`, `Line 2: Tension`, `Line 3: Pivot/Trap`, `Line 4: Hook/Consequence`).
     - Strip Latinate/clinical jargon unless origin is `OCP_LEAK`.
     - Midpoint Double-Dot Caesura (`᛬`) on every line + Elder Futhark zero-punctuation epigraphy.
     - Two-Key Interlocking Rule (`pairedCounterPoemId`) & all 4 Canonical Bible Addendum Poems (Addendum CA-13, Addendum BY Surface Terminus Rumor, Addendum BY Internal Epitaph Slate, Addendum BN Flesh Ledger).
  4. **18,000-Year Semantic Decay Mutation Pipeline & 19-House Tombstone Records:**
     - Apply `Rule 1: Pronoun Drift`, `Rule 2: Metric Fossilization`, and `Rule 3: Medium Corruption` (`IRON_CHANTRY_STONE`, `FLAYED_QUILL_BONE_TALLY`, `VILLAGE_NURSERY_RHYME`), and generate the 19-House Tombstone Records.

### Phase 8: Asymmetric 3D Isometric Village TD & Pale Sovereign Huntsman Cultivation Slice
- **Files Affected:**
  - `assets/tileset.json` & `src/core/tileset_bridge.js`
  - `src/core/camera_profiles.js`, `src/core/state.js`, `src/engine.js`, `src/systems/input.js`, `src/systems/forest_impostors.js`, `src/systems/volumetric_fog.js`
  - `src/systems/structure_manager.js` & `tools/audit/verify_structure_manager.mjs`
  - `src/systems/squad_cultivation_system.js` & `tools/audit/verify_squad_cultivation_system.mjs`
  - `src/systems/commander_ui.js`, `ledger-mobile/src/systems/commander_ui.js` & `tools/audit/verify_isometric_slice_bridge.mjs`
- **Technical Specification:**
  1. **Step 1 (Classic Isometric Projection):** Lock Three.js camera to `CLASSIC_ISOMETRIC` (`fov: 25°`, `pitch: Math.PI/4`, `angle: Math.PI/4`, quantized 4m shadow frustum snapping) and tune impostor/fog thresholds for crisp wall and woodland lane readability.
  2. **Step 2 & 2.5 (`assets/tileset.json` Source of Truth & `StructureManager`):** Derive all grid cells (`2.0m`), footprints, heights, `mountHeightOffset` (`3.8m` Watchtower, `1.6m` Palisade, `1.2m` OCP Post), material palettes, and `normalCycle` vs. `whiteVoidShift` lighting states directly from `assets/tileset.json`.
  3. **Step 3 (`SquadCultivationSystem`):** Implement Order fuel/relic expeditions (enforcing *Career Integrity* for wall-mounted `villager_militia` vs. woodland `adventurer_dispatch`) and Pale Sovereign probing packs + **The Huntsman & The Orb** cultivation loop (`target.stats > lastHarvestedStats` $\rightarrow$ `HUNTSMAN_MARK` $\rightarrow$ `5% HP` beatdown $\rightarrow$ `HUNTSMAN_SCORN_24H` $\rightarrow$ `MACABRE_HARVEST` Vampire evolution).
  4. **Step 4 (`CommanderUI` Dual-Loop Wrapper):** Connect `commander_ui.js` (`BRIEFING -> ACTIVE_SHIFT_COUNTDOWN -> WHITE_VOID_CLIMAX -> GENERAL_LEDGER_SUMMARY`) across both `src/` and `ledger-mobile/`.
