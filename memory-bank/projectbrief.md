# Dark Forest Engine — Project Brief

## 1. Fundamental "Why" & Core Vision
The **Dark Forest Engine** is a simulation-first, systemic reality engine where **Truth is a resource, Information travels farther than people, and the Simulation is the primary storyteller.**
Rather than scripting linear RPG quests or static event outcomes, the engine simulates an 18,000-year objective (12,000-year perceived) post-fracture civilization governed by metaphysical Fundamental Forces, physical/regional spatial pressures, feudal Noble House monopolies, and autonomous NPC/Squad agency.

## 2. Core Requirements & Architectural Pillars
1. **Dual-Runtime Execution (3D Sandbox & Mobile General Ledger Lite):**
   - **Desktop 3D Engine (`src/`):** Full Three.js + Rapier3D + WebWorker spatial simulation paired with the Foldable Commander Terminal & ASCII Crow's Eye Strategic Layer.
   - **Mobile General Ledger (`ledger-mobile/`):** Zero-DOM/Zero-WebGL headless-capable simulation core (`commander_engine.js`) powering a 6-Role Squad Management, Resource Management, and Base Upgrade mobile experience that acts as a direct "Lite Mirror" of the full simulation.
2. **Cosmological & World Invariants:**
   - **The Great Attractor ($r = 0$):** The Dark Forest, subject to the 14-day Shift and 7-day White Void spatial reconfiguration.
   - **The Event Horizon ($r \approx 100\text{–}280\text{km}$):** The Mountain Ring (100-mile optical mirage, 7-day perception skip creating the 6,000-year blind spot), guarded by House Terminus & the 300 Guardians, and concealing Settlement #7 (*Epitaph*).
   - **The Laniakea Web ($r > 280\text{km}$):** The Endless Dunes, holding the 20 Hidden Flotilla Settlements drifting inward along dendritic subterranean river streamlines.
3. **100% Systemic Emergence (Zero Hardcoded Outcomes):**
   - Every crisis, expedition encounter, War Board posture shift, and mutation (such as the Dual Starvation + Freezing $\rightarrow$ Next-Shift Feral Wendigo rebirth) must emerge from the collision of 130+ systemic pressures and mechanical payload tags rather than static scripts.
4. **Simulation-First & Headless Verification:**
   - All simulation logic must run deterministically and headlessly in pure Node.js (`tools/test_commander_logic.mjs` and `tools/audit/*.mjs`) across multi-century runs without memory leaks or DOM dependencies.
