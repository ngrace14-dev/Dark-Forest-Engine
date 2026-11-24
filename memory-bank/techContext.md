# Dark Forest Engine — Technical Context

## 1. Tech Stack & Runtime Environment
- **Language:** Modern ES Modules JavaScript (`.js`, `.mjs`).
- **3D Desktop Runtime:** Three.js (WebGL), Rapier3D (Physics), Web Workers (`src/workers/`).
- **Mobile Runtime (`ledger-mobile/`):** Pure HTML5/CSS3 ("Royal General Ledger" parchment/slate theme) + Vanilla ES6 Modules (`commander_engine.js`, `commander_ui.js`). Zero external heavy dependencies.
- **Headless Verification & CLI:** Node.js (v18+) running `.mjs` verification suites in `tools/` and `tools/audit/`.
- **OS / Shell Environment:** Windows (`win32`) with PowerShell.

## 2. Key File Map
- `system_specs.md` (`c:\Users\NicholasGrace\OneDrive - RRELLC\Documents\GitHub\Dark-Forest-Engine\system_specs.md`): Root System Behavior Specification (Hard Logic & `[COUPLING / DO NOT FLATTEN]` Causal Invariants).
- `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`: Unified headless simulation engine for the 6-role mobile/commander loop.
- `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`: DOM View Controller for the General Ledger UI.
- `src/core/system_definitions.js` & `src/core/civilization.js`: Macro-civilization scalar definitions and 70/30 vector flux math.
- `src/systems/forces.js`: Fundamental Forces ecology, Huntsman cultivation, and Pale Sovereign autonomous hunting cycle.
- `src/systems/ai.js` & `src/systems/personhood.js`: 3D entity AI, starvation/cold death hooks, and Wendigo rebirth candidate queues.
- `tools/test_commander_logic.mjs`: Primary headless verification test suite for Phase 1 & Phase 2 General Ledger, 6-Role State Machine, Expeditions, Crises, Feral Wendigo collisions, and Epitaph Relativity.

## 3. Hard Guardrails & Constraints
- **Never touch `archive/` or `src_systems_editor_backup.js`.**
- **Player-Facing 3D Systems Frozen until July Push:** Do not modify `PlayerController.js`, 3D camera rigs, or 3D player HUD stacks.
- **Mobile Parity:** Every change to `src/core/commander_engine.js` or `src/systems/commander_ui.js` must be mirrored to `ledger-mobile/` and verified headlessly with `node tools/test_commander_logic.mjs`.
