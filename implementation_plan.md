# Implementation Plan: Closing the Final 3 Mobile Gameplay Loop Micro-Gaps

## 1. Objective & Scope
Complete the integration of the emergent systems into the live daily mobile gameplay loop across `src/core/commander_engine.js`, `src/systems/commander_ui.js`, and their `ledger-mobile/` mirrors:
1. **Automatic Daily Procedural Collision Hook:** Wire `ProceduralCollisionEngine.evaluateSector()` into `CampaignManager.processDailyLogistics()` (respecting the 40-day / 30-minute Crisis Grace Period) so 3-way tag collisions fire organically during live gameplay when 3 pressures boil over $\ge 0.85$.
2. **Progressive Facility Upgrade Cost Scaling:** Scale `upgradeCost` by level (`Math.max(6, (f.cost || 6) * (f.level + 1))`) in `FacilityEngine.unlockFacility()` so upgrading `scriptorium` (or higher-tier facilities) consumes scaling `settlementResources`.
3. **Active Feral Wendigo Perimeter Pressure & `HUNT_FERAL_WENDIGO` Directive:**
   - Risen Feral Wendigos in `AgentRosterManager.spawnedFeralWendigos` actively add `+4` route hazard per Wendigo to `computeExpeditionCombatProfile` and `+3%/day` volatility in `processDailyLogistics()`.
   - Add `HUNT_FERAL_WENDIGO` directive in `CampaignManager.dispatchAction()` and a contextual `🩸 Hunt Risen Feral Wendigo` button in `CommanderUI` whenever `spawnedFeralWendigos.length > 0`, pitting squad martial power against the Wendigo's `threatPower` and awarding Significance, Armory Gear, and Crown Favor/Resources on kill.

## 2. Affected Files
- `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
- `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
- `tools/test_commander_logic.mjs`
- `memory-bank/activeContext.md` & `memory-bank/progress.md`

