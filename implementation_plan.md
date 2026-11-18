# Implementation Plan: Replicating the 5 Brutalist Runic-Iron Concept Art Pages

## 1. Objective & Visual Specification
Replicate the 5 provided UI concept art screens across `ledger-mobile/theme.css`, `src/systems/candidate_onboarding.js`, `src/systems/commander_ui.js`, and their `ledger-mobile/` mirrors while preserving 100% compatibility with all headless tests in `tools/test_commander_logic.mjs`.

### Shared Frame Architecture (All 5 Pages)
- **Dark Engraved Runic Iron Bezel (`.brutalist-runic-frame`):**
  - Carved dark-iron border with vertical elder-futhark rune margins (`ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚ`), corner runic medallions (`ᚻ` / `ᛉ`), top gothic crest header with center bind-rune (`ᛝ`), dark scanline telemetry grid interior (`#0b0e0f`), and bottom riveted iron plate action bar (`.riveted-commit-plate`).

### Page-by-Page Replication
1. **Page 1 — The Candidate & Origin Gate (`candidate_onboarding.js`):**
   - **Top Crest:** `CANDIDATE: CORIN OF ASH-FORD` | `ᛝ` | `BIRTHRIGHT: ECHO OF THE SEAL`.
   - **Left Column (`FORENSIC PROVENANCE LOG`):** 5-Strand telemetry meters (`[MIND: 0.0%]`, `[VERSE: 18,000Y]`, `[INK: COPY]`, `[STONE: ANCHORED]`, `[STEEL: VERIFIED]`) plus interactive Name, Appearance, Birthright, Vocation, and Origin inputs across the 4 onboarding steps.
   - **Center Column (`BRUTALIST CALIBRATION`):** Sliders, toggle switch, rotary dial visuals, and Chronicle Voice selector.
   - **Right Column (`RUNIC BODY ARCHITECTURE`):** Glowing amber vitruvian human silhouette SVG with 18 constellation acupuncture nodes and `STORY HEAT +40%` badge.
   - **Bottom Riveted Plate:** `ᛝ | [SEAL FLESH RECORD & ENTER DARK FOREST]`.

2. **Page 2 — The Vantage Role Selection Scroll / Civilizational Duty Roster (`commander_ui.js` -> `renderRoleSelection`):**
   - **Top Crest:** `CIVILIZATIONAL DUTY ROSTER` | `ᛝ` | `// LAYER 2`.
   - **2x3 Systemic Burden Parchment Cards:**
     - Card 1 (`MERCHANT` / `THE CROWN & PATRON`): Semicircular SVG needle gauge (`[FUEL MONOPOLY]`), administrative telemetry, `[STATUS: ACTIVE]`.
     - Card 2 (`NOBLE_HOUSE`): Military/Administrative stats, semicircular SVG needle gauge (`BARRIER FUEL`), amber alert box.
     - Card 3 (`TERMINUS` / `HOUSE TERMINUS`): `ANOMALOUS CONTAINMENT`, 16-block segmented `STABILITY` bar, data telemetry matrix.
     - Card 4 (`GUILD` / `OBSIDIAN CITADEL`): Black-ink `CONFIDENTIAL` redaction bars, `CONTAINMENT` semicircular gauge & vertical equalizer bars.
     - Card 5 (`SYNDICATE` / `SCARCITY SYNDICATE`): `TOLL / RESIN` semicircular gauge, trade percentage breakdown, horizontal sliders.
     - Card 6 (`PALE_SOVEREIGN`): Crossed iron chains SVG overlay, etched runic cipher background, crimson `AWAITING 1,000-YEAR CYCLE` stamp.
   - **Bottom Riveted Plate:** `ᛝ | [CONFIRM ASSIGNMENT & COMMENCE DUTY]`.

3. **Page 3 — The General Ledger Hub (`commander_ui.js` -> `render`):**
   - **Top Crest:** `THE GENERAL LEDGER HUB` | `ᛝ` | `DAY 13 // SHIFT COUNTDOWN` + amber ECG waveform SVG + `VOLATILITY`.
   - **Top 5-Page Navigation Tabs:** Switch seamlessly between `PAGE 3: LEDGER HUB`, `PAGE 4: TRUTH & RELIC VAULT`, and `PAGE 5: WAR BOARD & TELEMETRY`.
   - **Left Stack:** 3 dark iron telemetry modules (`[BASE & ARCHIVES]`, `[FIELD & LOGISTICS]`, `[POLITICS & TITHE]`) with binary/hex data columns, amber supply bars, toggle switches, and the interactive directive buttons. Connected via copper circuit trace lines to the right Triage Slate.
   - **Right Panel (`TRIAGE SLATE`):** Aged parchment card displaying active `EMISSARY PETITION`, amber `⚡ PROCEDURAL COLLISION` box, and `CRISIS TRIAGE` directives.
   - **Bottom Riveted Plate:** `ᛝ | [CONFIRM HUB SELECTIONS & UPDATE LEDGER]`.

4. **Page 4 — The Truth & Relic Vault (`commander_ui.js` -> `renderTruthVaultReader`):**
   - **Top Crest:** `THE TRUTH & RELIC VAULT` | `ᛝ` | `// DEEP ARCHIVE REALITY EDITOR`.
   - **Left Column (`FACT DOSSIER LIST`):** Parchment card with heavy black-ink redaction bars and `CREDIBILITY: 94% CERTAINTY` badges for each discovered Fact/Relic.
   - **Center Column (`RELIC TELEMETRY`):** Wireframe grid with a cracked circular runic stone seal SVG and technical telemetry callouts.
   - **Right Column (`EXECUTION DIRECTIVES` & `CONSEQUENCE PREVIEW`):** 6 iron verb plates (`PUBLISH`, `LEAK`, `SELL`, `ARCHIVE`, `SUPPRESS`, `DESTROY`) + parchment `CONSEQUENCE PREVIEW` card (`+12% BLIND-SPOT ENTROPY`, `-10% CROWN FAVOR`).
   - **Bottom Riveted Plate:** `ᛝ | [EXECUTE DIRECTIVE & COMMIT TO HISTORY]`.

5. **Page 5 — The War Board & Telemetry Reader (`commander_ui.js` -> `renderWarBoardReader` & `renderTelemetryReader`):**
   - **Top Crest:** `THE WAR BOARD & TELEMETRY READER` | `ᛝ` | `// SPATIAL PROBABILITY`.
   - **Left Column (`[19-HOUSE TABLE]`):** Parchment rows showing House Name, rune icon, Power progress bar, and `[POSTURE: WAR_PREP / SKIRMISH / PEACE]`.
   - **Right Top (`TELEMETRY GRID // 20 CHAINED SETTLEMENTS`):** Orbital 4D Laniakea/Chain SVG diagram around the central `[ᛝ CAPITAL ANCHOR]` with color-coded settlement nodes (`PROSPEROUS`, `ALERT`, `NEAR COLLAPSE`, `NODE_07 // SKIPPED`).
   - **Right Bottom (`[CAUSAL AUDIT TRAIL]`):** Parchment inset listing recent War Board mutations (`PROXY RAID AMBUSH`, `FUEL CRATE DELAYED`, `TRADE EMBARGO REJECTED`).
   - **Bottom Riveted Plate:** `ᛝ | [CALCULATE PROBABILITY & COMMENCE COMMAND]`.



