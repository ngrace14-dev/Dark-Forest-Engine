# Implementation Plan: Full Playtester Audit & 17-Point General Ledger Overhaul

## 1. Objective & Design Mandate
Address every playtester issue audited across the General Ledger UI (`src/systems/commander_ui.js`, `ledger-mobile/src/systems/commander_ui.js`, `ledger-mobile/index.html`, `ledger-mobile/theme.css`) and Headless Simulation Engine (`src/core/commander_engine.js`, `ledger-mobile/src/core/commander_engine.js`, `src/systems/candidate_onboarding.js`).

## 2. Phase-by-Phase Technical Specification

### Phase 1: Role Selector Redactions, Role Lockout & Stat Sheet Runic Cleanup
1. **Role Selector Title Card Redactions & Role Titles:**
   - **Under The Crown (`MERCHANT_PATRON`):** Role title clearly labeled **`THE CROWN (MERCHANT PATRON)`**.
   - **Under Noble House (`NOBLE_HOUSE`):** Role title clearly labeled **`NOBLE HOUSE`**.
   - **Obsidian Citadel (`GUILD_LEADER`) Card Redaction:** Black out the group name (`<span class="redaction-bar">████████████████</span>`), black out the Containment gauge (`#090705` blacked-out gauge), and display **`?%`** for the percentage.
2. **One-Way Role Selection Lockout:**
   - Once a role is selected (`selectRoleAndLaunch`), remove/hide all options to return to the Role Selector (`btn-nav-role-scroll` in `ledger-mobile/index.html`, `🚪 Role Roster`, `PAGE 1`, and `PAGE 2` buttons in `CommanderUI`).
3. **Stat Sheet Fluff Runic Lettering Removal:**
   - Remove decorative Futhark runic borders/lettering from character stat sheets and clean up any encoding artifacts in `formatAgentStatSheet`.
4. **Dynamic Procedural Courier Dispatches:**
   - Upgrade `LogDispatchManager.generateDailyDispatches()` with dynamic, state-reactive dispatches driven by active expeditions, agent drills, market trades, and war board shifts.

### Phase 2: Fallout Shelter–Style Patrol Recall, Dynamic Stress Index, Death Certificate Lineage & Verdicts
1. **Fallout Shelter–Style Expedition Return March:**
   - Refactor `ExpeditionEngine.recallExpedition(expId)` so recalling a squad after $N$ hours logs an immediate turnaround & waste-land encounter/salvage entry in `exp.logs` and transitions the squad to `status = 'RETURNING_EARLY'` with `returnHoursRemaining = Math.max(1, exp.hoursElapsed)` (marching back over the elapsed hours like Fallout Shelter, while crediting salvaged cargo and logging the full return trail).
2. **Dynamic Observed Stress Index:**
   - Dynamically compute `deceptionScore` in `InterrogationDesk.interrogate(targetId)` from live agent `shock`, `poise`, `hunger`, settlement `unrest`, `volatilityIndex`, and interrogation pressure increments.
3. **Elaborated Family Lineage & Connections on Death Certificate Dossier:**
   - Generate a rich, cohesive family tree & bloodline network (Parents of the same House/Parish, Spouse/Betrothed, Siblings, Children/Heirs, and Sworn Shield-Companion from the active Garrison roster) under `─── 🌳 FAMILY LINEAGE & BLOODLINE CONNECTIONS ───`.
4. **Inquest Verdicts (`Exonerate`, `Demote`, `Execute`, `Turn Double Agent`) & Mobile Exit Button:**
   - Fix `InterrogationDesk.renderVerdict(targetId, verdictType)` so all 4 verdicts reliably update agent state/loyalty/rank/death/double-agent status, display the signed verdict transcript in the reader, and add a dedicated **`[✖ EXIT DOSSIER / CLOSE READER]`** button (`window.closeStoryReader()`).

### Phase 3: Obsidian Citadel Tax Exemption, Triage Missive Consequences, Emissary Variety & Power Rating Context
1. **Obsidian Citadel (`GUILD_LEADER` / `ORDER`) Crown Tax Exemption:**
   - Set `crownDemand: 0`, `taxExempt: true` for Obsidian Citadel (`ORDER` / `GUILD`), ensuring zero Crown tax/tithe obligations.
2. **Triage Missives & Anti-Crown Consequence Parity:**
   - Ensure anti-Crown options in Triage Missives and directives declare and inflict explicit penalties (`-15% Crown Favor`, `+12% Crown Scrutiny`, `-5u Royal Assessor Supply Seizure`, and Inquisitorial Retaliation raids at high Scrutiny).
3. **Dynamic Daily Emissary Variety & Power Rating Context:**
   - Overhaul `RealityEditorVault.generateEmissaryPetition(day)` with 6+ distinct emissary archetypes rotating across all competing Houses, and add explicit **Power Rating Context** (`Power: 66/100 [Rank #8/19 — Military & Monopoly Leverage Index]`).

### Phase 4: Armory & Weapon Market Facility, Faction Unit Recruitment & Book-Page Tabbed UI Architecture
1. **Gear & Weapon Trading/Buying Market Facility (`armory_market`):**
   - Add upgradable `armory_market` (*⚔️ Armory & Weaponry Exchange Market*) to `FacilityEngine.facilities` unlocking `buyArmoryGear(itemId)` and `sellArmoryGear(itemId)`.
2. **Clear Faction Unit Generation & Recruitment System:**
   - Add `recruitFactionUnit(archetype)` to `AgentRosterManager` and a dedicated recruitment panel in the Garrison tab.
3. **Book-Page Tabbed Main Gameplay UI & Functional Truth / Relic Vault Buttons:**
   - Organize the main gameplay UI into a clean **5-Tab Royal Ledger Book** with book-page tabs (`📖 Page I: Command & Triage`, `🛡️ Page II: Garrison, Recruitment & Armory Market`, `🧭 Page III: Field Expeditions & Courier Dispatches`, `📜 Page IV: Truth & Relic Vault`, `🏰 Page V: 19-House War Board & Telemetry`).
   - Ensure Truth & Relic Vault buttons always open Page IV and display interactive Fact/Relic dossiers immediately.

### Phase 5: Time Clock & Dream World Skip Audit + First-Click Tutorial Advisor System
1. **Time Clock (`+1 DAY`) vs. Dream World (`🌙 DREAM WARD` / `+1D CHRONO-SKIP`) Audit:**
   - Clearly differentiate and label interactive `+1 DAY (END TURN)` vs. `🌙 DREAM WARD (-10u Siphon)` vs. `⏭️ +1D DREAM CHRONO-SKIP (Unattended Auto-Resolve)`.
2. **Interactive First-Click Tutorial Advisor (`TutorialAdvisor`):**
   - Pop up an on-screen **Royal Archive Advisor** on the first click of each interface button/tab explaining its systems, and automatically trigger an **Emissary Arrival Walkthrough** on the first emissary explaining pros, cons, and hidden cascading consequences.





