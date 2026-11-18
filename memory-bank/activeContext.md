# Dark Forest Engine — Active Context

## 1. Current Focus
- Completed full debug and headless validation audit across both the **Mobile General Ledger (`ledger-mobile/`)** and all **Desktop Headless Simulation Systems (`src/` & `tools/audit/`)**.
- Implemented and verified the **Tag-Based Procedural Collision Engine ("Grammar of Chaos")** (`ProceduralCollisionEngine` & `PRESSURE_TAG_REGISTRY`) inside `src/core/commander_engine.js` and `ledger-mobile/src/core/commander_engine.js`.

## 2. Recent Completed Changes
- **Option B (Dream Intervention Crisis Mitigation):** Added `dreamSiphon` resource (`30u` start, `+2u/day` regen), `triggerDreamIntervention()`, UI buttons (`🌙 DREAM WARD`), and `MITIGATED` outcome interception during active crises and unattended `chronoSkipDays`.
- **Phase 1 (6-Role Emergent State Machine & Living War Board):** Built `RoleStateMachine`, activated all 19 `HOUSE_MONOPOLY_MODIFIERS`, wired systemic squad/facility math into all 6 roles (including `GUILD` and `MERCHANT`), and made the 19-House War Board persistent and mutation-reactive with causal dispatches.
- **Phase 2 (Emergent Expeditions & Will-to-Live Retreat):** Built `computeExpeditionCombatProfile`, Manifesto §8 Will-to-Live Tactical Retreats (`status = 'RETREATED'`), and early recall (`recallExpedition` / `RECALL_CARAVAN`).
- **Phase 3 (State-Driven Crisis Synthesis & Logistical Entropy Tax):** Added `computeLogisticalEntropyTax`, scaling Crown Tithes, and `synthesizeEmergentCrisis`.
- **Situational Pressure Collision (Dual Starving + Freezing $\rightarrow$ Feral Wendigo Rebirth):** Implemented `applySituationalStatus`, `evaluateActorDeath`, and `processShiftWendigoRebirths` in `commander_engine.js` (and updated `defeatNpc` in `src/systems/ai.js`) so actors dying from Starvation or Freezing while both effects are active rise as Feral Wendigos on the next 14-day Shift.

## 3. Immediate Next Steps
1. Receive the user's **Project Brief / Consequence & Tag Specification** in Plan Mode.
2. Generate `implementation_plan.md` detailing the `ProceduralCollisionEngine` and 130-Pressure Tag Registry architecture for Desktop and Mobile parity.
3. Execute and verify headlessly once approved.
