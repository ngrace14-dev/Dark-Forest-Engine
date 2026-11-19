# Dark Forest Engine — Active Context

## 1. Current Focus
- Completed full debug and headless validation audit across both the **Mobile General Ledger (`ledger-mobile/`)** and all **Desktop Headless Simulation Systems (`src/` & `tools/audit/`)**.
- Implemented and verified the **Tag-Based Procedural Collision Engine ("Grammar of Chaos")** (`ProceduralCollisionEngine` & `PRESSURE_TAG_REGISTRY`) inside `src/core/commander_engine.js` and `ledger-mobile/src/core/commander_engine.js`.

## 2. Recent Completed Changes
- **Option B (Dream Intervention Crisis Mitigation):** Added `dreamSiphon` resource (`30u` start, `+2u/day` regen), `triggerDreamIntervention()`, UI buttons (`🌙 DREAM WARD`), and `MITIGATED` outcome interception during active crises and unattended `chronoSkipDays`.
- **Phase 1 (6-Role Emergent State Machine & Living War Board):** Built `RoleStateMachine`, activated all 19 `HOUSE_MONOPOLY_MODIFIERS`, wired systemic squad/facility math into all 6 roles (including `GUILD` and `MERCHANT`), and made the 19-House War Board persistent and mutation-reactive with causal dispatches.
- **Phase 2 (Emergent Expeditions & Will-to-Live Retreat):** Built `computeExpeditionCombatProfile`, Manifesto §8 Will-to-Live Tactical Retreats (`status = 'RETREATED'`), and early recall (`recallExpedition` / `RECALL_CARAVAN`).
- **Phase 3 (State-Driven Crisis Synthesis & Logistical Entropy Tax):** Added `computeLogisticalEntropyTax`, scaling Crown Tithes, and `synthesizeEmergentCrisis`.
- **Situational Pressure Collision (Dual Starving + Freezing $\rightarrow$ Feral Wendigo Rebirth):** Implemented `applySituationalStatus`, `evaluateActorDeath`, `processShiftWendigoRebirths`, and the `HUNT_FERAL_WENDIGO` directive in `commander_engine.js` (and updated `defeatNpc` in `src/systems/ai.js`).
- **Genre-Leading Text-Game Loop Upgrades (Manifesto §3 Reality Editor, Emissary Petitions & Grouped Mobile Directives):** Implemented `RealityEditorVault` (`PUBLISH`, `LEAK`, `SELL`, `ARCHIVE`, `SUPPRESS`, `DESTROY` on 5-property Fact Dossiers), interactive Rival House Gatehouse Emissary Petitions (`ACCEPT` / `REJECT`), and categorized mobile directive rows (`[BASE & ARCHIVES]`, `[FIELD & LOGISTICS]`, `[POLITICS & TITHE]`) with live cost badges.
- **5-Page Brutalist Runic-Iron Concept Art Replication:** Replicated all 5 custom UI concept art screens across `ledger-mobile/theme.css`, `src/systems/candidate_onboarding.js`, `src/systems/commander_ui.js`, and their `ledger-mobile/` mirrors.
- **Playable Pale Sovereign Slow-Burn Escalation & Growth-Point UI Unfolding (*A Dark Room* Style):**
  - Made `PALE_SOVEREIGN` (`SOVEREIGN`) fully playable from the Layer 2 Civilizational Duty Roster with a 4-stage slow-burn Historical Weight escalation ladder (`Stage 0: Frost-Bound Dormancy` $\rightarrow$ `Stage I: The Macabre Communion` at $300+$ Weight $\rightarrow$ `Stage II: The Predator Tide` (`HERALD_PACK_RAID`) at $1,000+$ Weight & $\ge 2$ Heralds $\rightarrow$ `Stage III: Apocalyptic Void Emperor` (`APOCALYPTIC_HARVEST`) at $2,500+$ Weight, $5/5$ Heralds & $1,000$ Years).
  - Implemented `RoleStateMachine.getGrowthProgression()` so new Turn 1 campaigns start in a clean, minimalist `GROWTH TIER 0` view (hiding Page 4 Truth Vault, Page 5 War Board, Field Logistics, Politics/Tithes, Dream Wards, Chrono-Skip, and Necrology behind clear Growth Gates until facilities are constructed or Historical Weight is harvested).

## 3. Immediate Next Steps
1. Receive the user's **Project Brief / Consequence & Tag Specification** in Plan Mode.
2. Generate `implementation_plan.md` detailing the `ProceduralCollisionEngine` and 130-Pressure Tag Registry architecture for Desktop and Mobile parity.
3. Execute and verify headlessly once approved.
