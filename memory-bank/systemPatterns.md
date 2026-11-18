# Dark Forest Engine — System Patterns & Architecture

## 1. Core Architectural Laws
- **Engine Law #5:** Every systemic nudge applies **70% scalar-to-scalar flux** and **30% scalar-to-framework vector pressure**.
- **Headless Clean-Room Core:** `src/core/commander_engine.js` (mirrored to `ledger-mobile/src/core/commander_engine.js`) operates with zero DOM or Three.js dependencies, communicating via `rootScope.EventBus` and `rootScope.EngineParams`.
- **Additive Registry Pattern:** New mechanics attach via data registries (`ROLE_CATALOG`, `HOUSE_MONOPOLY_MODIFIERS`, `RoleStateMachine`, `PRESSURE_MATRIX`) rather than destructive rewrites.

## 2. The 6-Role State Machine (`RoleStateMachine`)
Governs the daily simulation cycle across four explicit phases:
`MORNING_BRIEFING` $\rightarrow$ `FIELD_OPERATIONS` $\rightarrow$ `CRISIS_TRIAGE` $\rightarrow$ `EVENING_RECONCILIATION`
- Dynamically computes **Squad Capability Metrics** (`avgMartial`, `avgStealth`, `avgLore`, `avgSurvival`, `avgPoise`, `totalPower`).
- Dynamically computes **Facility Multipliers** (`productionMult`, `tradeMult`, `covertMult`, `martialMult`) from unlocked base upgrades (`scriptorium`, `guard_barracks`, `inquest_chamber`, `alchemical_still`, `war_table`).
- Enforces **Logistical Entropy Tax** (`computeLogisticalEntropyTax`), scaling supply friction (5%–45%) and extra fuel burn with House Power and War Board hostility.

## 3. The 130-Pressure Matrix & Procedural Collision Pattern ("Grammar of Chaos")
The engine tracks 130+ pressures across 5 tiers:
1. **Tier 1 — Metaphysical / Fundamental Forces (11):** Forest (Possibility), Crow (Significance), Tree (Continuity), Crown (Order), Huntsman (Cultivation), Wendigo (Consumption), Truth (Accuracy), Orb (Witness), The Shackle (Path Entropy), Pale Sovereign (Harvest), Epitaph (Funnel Bias).
2. **Tier 2 — Situational & Compound Collision Pressures (9):** e.g., Concurrent `STARVING` + `FREEZING` where either kills the actor $\rightarrow$ queues corpse for **Next-Shift Feral Wendigo Rebirth**.
3. **Tier 3 — Regional & Environmental Pressures (30):** Shift proximity, White Void dampening, Mist density, Iron rust, Frost fracture, Silt Veil current, etc.
4. **Tier 4 — Civilization, Political & Economic Pressures (40):** Crown Scrutiny, Unrest, War Board postures (`PEACE`, `SKIRMISH`, `WAR_PREP`, `DEFENSIVE`, `ALLIED`), 19 House Monopoly Modifiers, Blind-Spot Entropy, etc.
5. **Tier 5 — Squad, Agent & Tactical Pressures (40):** Skills, Armory Gear tiers, Birthrights, Poise/HP retreat thresholds, Cargo integrity, Dream Siphon wards.

### Tag-Based Procedural Collision Formula
`[Tier 1 Metaphysical Anchor] + [Tier 2/3 Environmental Catalyst] + [Tier 4/5 Failing Tactical Target] = Synthesized Payload Tags + Pressure Rebound`
