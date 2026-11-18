# Implementation Plan: Genre-Leading Text-Game Loop Upgrades (Manifesto §3 Editor of Reality, Emissary Petitions & Grouped Mobile Directives)

## 1. Objective & Scope
Elevate the mobile General Ledger gameplay loop (`src/core/commander_engine.js`, `src/systems/commander_ui.js`, and `ledger-mobile/` mirrors) to match and exceed top text-based management benchmarks (*Fallen London*, *King of Dragon Pass*, *A Dark Room*, *Fallout Shelter*):

1. **Upgrade 1 — Manifesto §2 & §3 "Editor of Reality" Fact & Relic Vault (`RealityEditorVault`):**
   - Every fact/relic discovered via Field Expeditions, Inquest `turn_agent` verdicts, or Anomaly Audits generates a structured **5-Property Fact Dossier** (`source`, `owner`, `value`, `cost`, `risk`, `credibility`, `title`).
   - Players can inspect the Vault in the Ledger Reader and execute the **6 Canonical Editor Verbs** (`resolveFact(factId, verb)`):
     - `PUBLISH`: Broadcast to the world (+12% Blind-Spot Entropy, -10% Crown Favor, +18 Candidate Significance, triggers War Board schism).
     - `LEAK`: Leak to a rival House (-10 Target House War Board Power, forces `SKIRMISH` posture, +1 Blackmail Dossier).
     - `SELL`: Trade knowledge for monopoly fuel/gold (+14 Barrier Fuel / Contraband Resin, +18 Settlement Resources).
     - `ARCHIVE`: Seal privately in Scriptorium (+0.5 Squad Lore, +6 Settlement Prosperity, -4% Volatility).
     - `SUPPRESS`: Bury truth to protect Crown/Patron (+12% Crown Favor, -8% Crown Scrutiny, -5% Blind-Spot Entropy).
     - `DESTROY`: Erase evidence completely (-10% Blind-Spot Entropy, -10% Volatility, removes threat).

2. **Upgrade 2 — Interactive Rival House Emissary Petitions (`EmissaryDilemmaEngine`):**
   - Driven by the live 19-House War Board, rival Houses periodically dispatch an interactive 2-choice **Emissary Petition** (e.g., Monopoly Pact, Border Embargo, or Bailiff Strike Settlement) that can be resolved directly from the UI banner (`ACCEPT` or `REJECT`) for bite-sized tactical decisions between Shifts.

3. **Upgrade 3 — Progressive Mobile UI Grouping & Cost Badges (`CommanderUI`):**
   - Organize `ROLE DIRECTIVES` into clean visual categories (`[FIELD & EXPEDITIONS]`, `[BASE & ARCHIVES]`, `[POLITICS & WAR BOARD]`) with explicit resource/fuel badges and a live **`📜 Truth & Relic Vault (N)`** button.

## 2. Affected Files
- `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
- `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
- `tools/test_commander_logic.mjs`
- `memory-bank/activeContext.md` & `memory-bank/progress.md`


