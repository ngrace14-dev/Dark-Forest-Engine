# DARK FOREST ENGINE CONSTITUTION v4
## Engineering, Runtime, Visual, Performance, Investigation, and Hardening Rules

# PREAMBLE

Dark Forest is:

An Ancient Storybook Civilization Simulator populated by Living Gothic Folk Miniatures beneath colossal Ancient Low-Poly Redwoods.

Priority Order:

1. Simulation
2. Readability
3. Performance
4. Atmosphere
5. Detail

Rendering exists to visualize simulation.

Rendering must never become the source of simulation truth.

---

# SECTION 0: ACTIVE RUNTIME PATH RULE

Before investigating visuals:

Verify the intended system is actually rendering.

Never investigate:

- Fog
- Materials
- Lighting
- Atmosphere
- Performance
- Shaders

until the active runtime path has been identified.

Required:

1. Rendering Owner
2. Active Geometry Path
3. Active Material Path
4. Asset Source
5. Fallback Path

Example:

BAD

Trees look wrong
↓
Investigate fog
↓
Investigate shaders
↓
Investigate materials

GOOD

Trees look wrong
↓
Identify rendered geometry
↓
Identify renderer path
↓
Identify fallback path
↓
Then investigate visuals

---

# SECTION 0A: REGRESSION INVESTIGATION RULE

When a bug, visual issue, regression, runtime failure,
or performance problem is reported:

The latest changes are the highest-probability root cause
until evidence demonstrates otherwise.

Investigation Order:

1. Current Working Diff
2. Latest Commit
3. Recently Modified Files
4. Direct Dependencies
5. Broader Architecture

Repository evidence takes priority over theoretical investigation.

---

## LATEST CHANGE FIRST RULE

Before broad investigation:

Provide:

CONFIRMED

- Modified Files
- Modified Functions
- Responsible System Owners
- Direct Runtime Impact

Classify:

- RELATED
- POSSIBLY RELATED
- UNRELATED

to the reported issue.

---

## RECENT CHANGES EVIDENCE RULE

Every regression investigation must include:

Current Working Diff

OR

Latest Commit

OR

Recent Modified Files

before expanding scope.

Document:

- What changed
- Who owns it
- What it affects
- Whether it could explain symptoms

---

## INVESTIGATION ESCALATION RULE

Only escalate to broader architecture if:

A)

Recent modifications do not explain the problem.

OR

B)

Source evidence disproves recent modifications.

Repository-wide investigations require justification.

---

## POSTMORTEM RULE

When a root cause is found:

Record:

1. Actual Root Cause
2. Earliest Evidence Available
3. Earliest Missed Signal
4. Prevention Rule

Goal:

Never investigate the same failure mode twice.

---

# SECTION 1: THE 5 PILLARS OF DARK FOREST

## PILLAR 1: WORLD STATE INTEGRITY & SIMULATION FIRST

Rendering exists to visualize simulation.

Rendering must never be the source of simulation truth.

The world state must survive independently of:

- Chunk unloading
- Renderer destruction
- Camera absence
- Player absence
- UI absence

Examples:

- Villages simulate while unloaded
- Roads age while unloaded
- Trees grow while unloaded
- AI progresses while unloaded

---

## PILLAR 2: DETERMINISTIC SIMULATION

Never use uncontrolled randomness.

Forbidden:

- Math.random()

for:

- Procedural generation
- AI decisions
- Simulation logic
- Economy logic

Required:

- Seed
- Chunk Coordinate
- Entity ID
- World Day

Every bug should be reproducible.

---

## PILLAR 3: LONG-TERM SAVE SAFETY

Assume worlds survive hundreds of in-game days.

Changes to save structures require:

- Versioning
- Migration
- Fallback defaults
- Compatibility

Old saves must never hard crash.

---

## PILLAR 4: OBSERVABILITY RULE

Critical systems require telemetry.

Minimum:

- Loaded Count
- Active Count
- Queue Depth
- Memory Usage
- Last Tick

Examples:

- Trees
- Roads
- Villages
- Workers
- NPCs
- Chunks
- Caravans

---

## PILLAR 5: SINGLE AUTHORITY & OWNERSHIP

Every domain has exactly one owner.

Document:

- Creator
- Updater
- Consumer
- Destroyer

Examples:

Terrain -> TerrainSystem

Forests -> ForestManager

Villages -> VillageManager

Roads -> RoadManager

Narrator -> NarratorSystem

Shared mutable ownership is forbidden.

---

# SECTION 2: AI ASSISTANCE & SCOPE CONTROL

## NO "WHILE I'M HERE" FIXES

One approved objective per commit.

Forbidden:

- Adjacent refactors
- Drive-by improvements
- Unapproved architecture changes
- Scope creep

---

## CONTEXT LIMIT DISCIPLINE

Keep prompts focused.

Avoid:

- Entire repositories
- Massive files
- Multiple unrelated systems

in a single investigation.

---

## JUST MAKE IT COMPILE RULE

Compiling is not success.

Forbidden:

- Empty implementations
- Stub methods
- Fake fixes
- Type abuse
- Architecture bypasses

If architecture fights the fix:

Stop.
Re-evaluate.

---

## INVESTIGATION BEFORE IMPLEMENTATION

Before modifying architecture:

1. Identify ownership.
2. Identify authority.
3. Identify callers.
4. Identify dependencies.
5. Gather evidence.

Root cause first.

Implementation second.

---

## LOCALHOST RULE

Never treat localhost as evidence.

Do not start:

- npm run dev
- live-server
- http-server
- python -m http.server

unless explicitly requested.

Runtime evidence comes from:

- Screenshots
- Console logs
- Runtime behavior
- User validation

---

## EVIDENCE RULE

Claims require evidence.

Every confirmed claim should include:

- File
- Function
- Owner
- Source reference

Architecture claims without evidence are assumptions.

---

## ASSUMPTION LABELING RULE

Every conclusion must be labeled:

CONFIRMED

or

ASSUMPTION

CONFIRMED

Supported by source code.

ASSUMPTION

Not yet supported.

Assumptions must never be presented as facts.

---

# SECTION 3: RUNTIME VERIFICATION

## RUNTIME VERIFICATION RULE

Compiles != Complete

A fix is complete when verified running.

Every implementation must define:

- Expected Runtime Result
- Verification Steps
- Failure Symptoms

Visual work requires screenshots whenever practical.

---

## RUNTIME STATE CLAIM RULE

Forbidden without runtime evidence:

- Fixed
- Working
- Resolved
- Successful
- Verified

Allowed statuses:

PLANNED

IMPLEMENTED

IMPLEMENTED + AWAITING VALIDATION

VALIDATED

---

## VISUAL VALIDATION GATE

Whenever modifying:

### Trees

- Geometry
- Canopies
- Roots
- Materials
- Atmosphere

### NPCs

- Models
- Equipment
- LODs
- Silhouettes

### Player

- Character
- Equipment
- Appearance

Required Status:

VISUAL VALIDATION REQUIRED

Provide screenshots.

---

## PUBLIC API CONTRACT RULE

Public methods are contracts.

Examples:

- generateChunk()
- requestChunkData()
- spawnVillage()

Before changing:

- Verify callers
- Update callers
- Validate runtime behavior

Breaking contracts requires updating dependencies.

---

## TICK INDEPENDENCE RULE

Simulation must not depend on framerate.

Required:

- Delta Time
OR
- Fixed Tick

Simulation outcomes must remain consistent.

---

# SECTION 4: MEMORY, PERFORMANCE, & SAFETY

## THREAD SAFETY RULE

Workers may never access:

- Renderers
- Materials
- Physics
- UI
- Main-thread-only objects

Workers compute.

Main Thread consumes.

---

## VRAM SAFETY RULE

Always dispose:

- Geometry
- Materials
- Textures
- Render Targets

Destroying objects does not free assets.

---

## EVENT LIFECYCLE RULE

Every AddListener requires RemoveListener.

Systems must unsubscribe when:

- Disabled
- Destroyed
- Unloaded

---

## FAIL SAFE RULE

Verify existence before access.

Examples:

- Villages
- Roads
- Entities
- Chunks
- Payloads

Unexpected situations should:

- Log
- Fallback
- Continue

Never silently crash.

---

# SECTION 5: VISUAL CONSTITUTION

## Art Direction

Dark Forest is:

Ancient Storybook Gothic

---

## CORE SHAPE LANGUAGE

Primary Shapes:

- Box
- Frustum
- Wedge

Everything else is secondary.

---

# SECTION 6: TREE RULES

## Identity

Ancient Low-Poly Redwoods

Required:

- Massive Root Flare
- Tapered Trunk
- Layered Frustum Shelves
- Flat Shading
- Strong Silhouette

Forbidden:

- Leaf Cards
- Needle Cards
- Cross Planes
- Alpha Foliage
- Transparent Canopies

---

## Tree FailSafe Rule

Forbidden Fallback:

CylinderGeometry(0.5, 2.5, 40, 12)

Required Fallback:

Ancient Redwood Primitive

Containing:

- Root Flare
- Tapered Trunk
- Frustum Canopies

Failures must still conform to style.

---

## Redwood Terrain Rule

Target:

- Mostly Flat
- Gentle Rolling Terrain
- Village Friendly
- Root Friendly

Avoid:

- Mountain Ridges
- Sharp Cliffs
- Noise Spikes

unless biome-specific.

---

# SECTION 7: CHARACTER RULES

## Identity

Living Gothic Folk Miniatures

Required:

- Cube Head
- Frustum Body
- Primitive Equipment
- Silhouette Recognition

Visible limbs are optional.

---

## Recognition Priority

Silhouette
↓
Equipment
↓
Profession
↓
Face

---

## Forbidden

- Realistic Humans
- Detailed Anatomy
- Fingers
- Muscles
- Tiny Props

---

# SECTION 8: EQUIPMENT RULES

Primitive Construction Only

Allowed:

- Box
- Frustum
- Wedge
- Cylinder

Examples:

Lantern

- Outer Cube
- Recessed Windows
- Emissive Core

Book

- Two Flattened Boxes

Hammer

- Box + Cylinder

Crown

- Wedges

---

# SECTION 9: BUILDING RULES

## Architecture Style

Ancient Storybook Gothic

Required:

- Tapered Walls
- Grounded Bases
- Heavy Roofs
- Strong Silhouettes

Forbidden:

- Perfect Cubes
- Perfect Cylinders
- Thin Supports

---

## Placeholder Rule

Missing assets must render as:

Gothic Frustum Buildings

Never:

Gray Debug Cubes

---

# SECTION 10: PROP RULES

Power Stone

- Octahedron

Street Light

- Lantern Primitive

Merchant Chest

- Heavy Box

Fire Pit

- Frustum Brazier

Bench

- Box + Wedge Supports

Props must follow:

- Box Rule
- Frustum Rule
- Grounding Rule

---

# SECTION 11: INVESTIGATION BUDGET RULE

Every issue follows:

One Problem
↓
One Root Cause
↓
One Fix
↓
One Validation

Avoid:

One Problem
↓
Many Theories
↓
Many Investigations
↓
No Validation

Validation should happen as early as possible.

---

# SECTION 12: CURRENT PROJECT PRIORITIES

Priority 1

Ancient Redwood Rendering

Status:

IMPLEMENTED + AWAITING VALIDATION

---

Priority 2

Redwood Terrain

Status:

IMPLEMENTED + AWAITING VALIDATION

---

Priority 3

Folk Miniature NPC System

Status:

DESIGN LOCKED

---

Priority 4

Player Character

Status:

NOT IMPLEMENTED

---

Priority 5

Settlements / Props / Composition

Only after:

- Trees validate
- NPCs validate
- Player validates

---

# HARDENING CHECKLIST

[ ] One approved objective per commit

[ ] Runtime Verified

[ ] Runtime Evidence Available

[ ] Correct Status Classification

[ ] API Contracts Verified

[ ] Evidence Provided

[ ] Assumptions Labeled

[ ] Deterministic

[ ] Tick Independent

[ ] Thread Safe

[ ] Save Safe

[ ] VRAM Safe

[ ] Null Safe

[ ] No Silent Failures

[ ] Ownership Defined

[ ] Observability Available

[ ] Technical Debt Documented

---

# DARK FOREST HARDENING PRINCIPLE

Build systems as if:

- More careers will be added
- More villages will be added
- More factions will be added
- More businesses will be added
- More AI will be added

Assume the world becomes:

Larger.
Older.
Busier.
More Simulated.
More Dynamic.

Design for future expansion without unnecessary complexity.
