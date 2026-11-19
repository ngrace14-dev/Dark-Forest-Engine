# Implementation Plan: Playable Slow-Burn Pale Sovereign & Progressive Growth-Point UI Unfolding

## 1. Objective & Design Mandate
1. **Playable Pale Sovereign Slow-Burn Escalation Loop (`SOVEREIGN` / `PALE_SOVEREIGN`):**
   - Make **The Pale Sovereign** immediately playable from the Layer 2 Civilizational Duty Roster (`CommanderUI.renderRoleSelection`).
   - Implement a **4-Stage Historical Weight / Significance Escalation Ladder** for the Pale Sovereign:
     - **Stage 0 — Frost-Bound Dormancy (`0–299` Historical Weight / Significance):** Korvan broods in deep bedrock. Only `[Brood in Frost (+25y / +80 Weight)]` and `[Dispatch Bound Huntsman (Stalk Lowlands)]` are available.
     - **Stage 1 — The Macabre Communion (`300–999` Weight):** Unlocks `[Macabre Communion (Mutate Herald Wendigo)]` to turn captured commanders into sentient Herald lieutenants (`heraldsMutated: 0 -> 5`) and unlocks the `[Field & Pack Logs]` panel.
     - **Stage 2 — The Predator Tide (`1,000–2,499` Weight & $\ge 2$ Heralds):** Unlocks `[Unleash Herald Pack Raid (Ravage Chained Settlement)]` and unlocks the `[19-House War Board]` & `[Politics & Devastation]` panel, allowing the Sovereign to shatter Noble House power by `-18` per raid.
     - **Stage 3 — The Void Emperor Apocalypse ($\ge 2,500$ Weight, $\ge 1,000$ Years Endured, & $5/5$ Heralds):** Unlocks `[Shatter Bedrock Chains (True Pale Sovereign Ascension)]` and `[Apocalyptic Harvest (Consume Chained Settlement)]`, violently collapsing settlement chains and harvesting massive historical mass.

2. **Progressive UI Unfolding Behind Growth Points (Facility Upgrades & Historical Weight):**
   - Stop dumping all 3 directive modules, all 5 top page tabs, and all lower panels onto a brand-new Turn 1 player.
   - Compute **`getGrowthTier()`** dynamically:
     - For **Civilization Roles (`NOBLE_HOUSE`, `TERMINUS`, `GUILD`, `MERCHANT`, `SYNDICATE`):** Growth Tier = Number of constructed/upgraded Facilities beyond Base Start (`Tier 0` at start $\rightarrow$ `Tier 1` with 1 facility unlocked $\rightarrow$ `Tier 2` with 2+ facilities $\rightarrow$ `Tier 3` with War Table / 3+ facilities).
     - For **The Pale Sovereign (`SOVEREIGN`):** Growth Tier = Historical Weight / Significance Stage (`Stage 0` at `<300` Weight $\rightarrow$ `Stage 1` at `300+` Weight $\rightarrow$ `Stage 2` at `1,000+` Weight $\rightarrow$ `Stage 3` at `2,500+` Weight).
   - **UI Gating by Growth Tier:**
     - **Tier 0 (Minimalist Start — *A Dark Room* Style):**
       - Shows ONLY the primary `[BASE & SURVIVAL]` module (or `[FROST-LAIR DORMANCY]` for Sovereign), the basic `CLOCK / +1 DAY` controls, and the `Garrison / Pack Roster`.
       - Hides `PAGE 4: TRUTH & RELIC VAULT`, `PAGE 5: WAR BOARD`, `[FIELD & LOGISTICS]`, `[POLITICS & TITHE]`, `DREAM WARD`, `+1D SKIP`, and `NECROLOGY ARCHIVE` behind a clean **`[🔒 GROWTH GATE: Construct 1 Base Facility (or Harvest 300 Historical Weight) to Unfold Field Operations & Truth Vault]`** indicator.
     - **Tier 1 (First Growth Point Reached):**
       - Unfolds `[FIELD & LOGISTICS]`, `PAGE 4: TRUTH & RELIC VAULT`, and `FIELD EXPEDITIONS & CARAVAN LOGS`.
     - **Tier 2+ (Mid/Late Game Escalation):**
       - Unfolds `[POLITICS & TITHE]`, `PAGE 5: WAR BOARD & TELEMETRY`, `🌙 DREAM WARD`, `+1D SKIP`, and full apocalyptic/feudal warfare controls.

## 2. Affected Files
- `src/core/commander_engine.js` & `ledger-mobile/src/core/commander_engine.js`
- `src/systems/commander_ui.js` & `ledger-mobile/src/systems/commander_ui.js`
- `tools/test_commander_logic.mjs`
- `memory-bank/activeContext.md` & `memory-bank/progress.md`




