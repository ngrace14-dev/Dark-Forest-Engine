# Implementation Plan: Tag-Based Procedural Collision Engine ("Grammar of Chaos")

## 1. Objective & Scope
Replace static crisis and event outcome templates with a **Tag-Based Procedural Collision Engine** (`ProceduralCollisionEngine`) across both the Desktop core (`src/core/commander_engine.js`) and the Mobile General Ledger (`ledger-mobile/src/core/commander_engine.js`).

Every pressure in the 130-Pressure Matrix becomes a structured data object carrying:
- `id`: Canonical Pressure Identifier
- `tier`: `1` (Metaphysical Anchor), `2` (Environmental/Situational Catalyst), `3` (Civilization/Political Target), or `4` (Squad/Tactical Target)
- `prefixDescriptor` / `nounDescriptor` / `failureNoun`: Procedural grammar tokens for dynamic narrative and ledger title generation
- `payload_tags`: Array of mechanical instruction tags executed automatically when pressures collide above threshold ($\ge 0.85$)

## 2. Step-by-Step Technical Requirements

### Step 1: 130-Pressure Tag Registry (`PRESSURE_TAG_REGISTRY`)
- Define the structured tag registry inside `src/core/commander_engine.js` (and export on `CommanderEngine` & `rootScope`).
- Ensure Tier 1 (Metaphysical Forces), Tier 2 (Regional & Situational Catalysts), and Tier 3/4 (Civilization & Squad Targets) carry deterministic `payload_tags` such as:
  - Tier 1: `APPLY_MUTATION_FERAL`, `LOCK_VITAL_HP`, `SPAWN_PREDATOR_CLASS`, `INFLATE_STORY_DENSITY`, `DRAIN_SANITY_POISE`, `ENFORCE_CROWN_AUDIT`
  - Tier 2: `TARGET_ALL_FERROUS`, `DEGRADE_TIER_MAX`, `INFECT_WOUNDS`, `SCATTER_COORDINATES`, `FREEZE_TETHER_LINKS`, `OBSCURE_LOS_MIST`
  - Tier 3/4: `BREAK_COHESION`, `TRIGGER_ROUT`, `DROP_CARGO`, `SEIZE_BARRIER_FUEL`, `FRACTURE_ANCHOR_CHAINS`, `SPIKE_BLIND_SPOT_ENTROPY`

### Step 2: `ProceduralCollisionEngine` Class / Singleton
- Implement `evaluateSector(sectorState)` to inspect live simulation scalars and return all pressures currently boiling over threshold ($\ge 0.85$).
- Implement `generateEmergentCrisis(sectorState, activePressures)`:
  1. Select `anchor` (Tier 1), `catalyst` (Tier 2), and `target` (Tier 3/4).
  2. Synthesize combined `payload_tags = [...anchor.payload_tags, ...catalyst.payload_tags, ...target.payload_tags]`.
  3. Execute mechanical payload tags via `applyPayload(sectorState, payload_tags)` (e.g., degrading equipped ferrous gear, spawning a Feral Wendigo threat, forcing an expedition rout/cargo drop, or draining fuel/chains).
  4. Assemble procedural event title & narrative (`${anchor.prefixDescriptor} ${catalyst.nounDescriptor} of ${target.failureNoun}`) and log to `LogDispatchManager` / `CrucibleNarrativeEngine`.
  5. Execute **Pressure Rebound** (`increaseRandomLocalPressure(0.20)`) so every collision feeds forward into the next Shift cycle.

### Step 3: Wire into `CrisisEngine` & `ExpeditionEngine` + Mobile Sync
- Connect `ProceduralCollisionEngine` into `CrisisEngine.synthesizeEmergentCrisis` and `ExpeditionEngine.tickExpeditionHours`.
- Mirror changes to `ledger-mobile/src/core/commander_engine.js`.
- Add headless verification assertions in `tools/test_commander_logic.mjs`.

## 3. Affected Files
- `src/core/commander_engine.js`
- `ledger-mobile/src/core/commander_engine.js`
- `tools/test_commander_logic.mjs`
- `memory-bank/activeContext.md` & `memory-bank/progress.md`

## 4. Edge Cases & Invariants
- **Backward Compatibility:** Canonical test hooks (`House Wraith` oil fire, `emergent_ward_starvation_`, `Dream Intervention` mitigation, and `Will-to-Live` tactical retreats) must remain 100% functional.
- **Deterministic Bounds:** All resource, HP, Poise, and Power mutations must be clamped (`[0, max]`) and null-safe for 1,000+ year headless runs.
