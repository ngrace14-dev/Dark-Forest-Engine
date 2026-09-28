# DARK FOREST ENGINE CONSTITUTION v3
## Engineering, Runtime, Visual, and Hardening Rules

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

Rendering is never the source of simulation truth.

---

# SECTION 0: ACTIVE RUNTIME PATH RULE

Before investigating visuals:

Verify the intended system is actually rendering.

Never investigate:

- Fog
- Materials
- Lighting
- Atmosphere
- Optimization
- Shader behavior

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

GOOD

Trees look wrong
↓
Identify geometry source
↓
Identify renderer path
↓
Identify fallback path
↓
Then investigate visuals

---

# SECTION 1: THE 5 PILLARS OF DARK FOREST

## PILLAR 1: WORLD STATE INTEGRITY & SIMULATION FIRST

Rendering exists to visualize simulation.

Rendering must never be the source of simulation truth.

The world state must survive and progress independently of:

- Chunk unloading
- Renderer destruction
- Player absence
- Camera absence
- UI absence

Examples:

- Villages update while not rendered
- Roads age while not rendered
- Trees grow while not rendered
- AI simulates while not rendered

---

## PILLAR 2: DETERMINISTIC SIMULATION

Never use uncontrolled randomness for:

- Procedural generation
- AI decisions
- Economy logic
- Simulation

Forbidden:

- Math.random()

Required:

- Seed
- Entity ID
- Chunk Coordinate
- World Day

Every bug should be reproducible.

---

## PILLAR 3: LONG-TERM SAVE SAFETY

Assume worlds survive hundreds of in-game days.

When modifying save data:

- Preserve compatibility
- Implement versioning
- Provide migration paths
- Add fallback values

Older saves must never crash.

---

## PILLAR 4: OBSERVABILITY RULE

Critical systems must expose debug information.

Required telemetry:

- Loaded Count
- Active Count
- Memory Usage
- Queue Depth
- Last Tick

Examples:

- Trees
- Chunks
- Roads
- Villages
- Workers
- AI
- Caravans

---

## PILLAR 5: SINGLE AUTHORITY & OWNERSHIP

Every domain has exactly one owner.

Required:

- Creator
- Updater
- Consumer
- Destroyer

Examples:

Terrain -> TerrainSystem

Villages -> VillageManager

Roads -> RoadManager

Forests -> ForestManager

Narrator -> NarratorSystem

Shared mutable ownership is forbidden.

---

# SECTION 2: AI ASSISTANCE & SCOPE CONTROL

## NO "WHILE I'M HERE" FIXES

One approved objective per commit.

No adjacent refactors.

No unsolicited architecture changes.

No scope creep.

---

## CONTEXT LIMIT DISCIPLINE

Keep prompts focused.

Do not dump:

- Massive files
- Entire repositories
- Multiple systems

into a single request.

---

## JUST MAKE IT COMPILE RULE

Compiling is not success.

Forbidden:

- Empty methods
- Fake implementations
- Temporary stubs
- Type abuse

If architecture fights the fix:

Stop.

Reassess.

---

## INVESTIGATION BEFORE IMPLEMENTATION

Before modifying architecture:

1. Identify ownership
2. Identify authority
3. Identify callers
4. Identify dependencies
5. Gather evidence

Root cause first.

Implementation second.

---

## LOCALHOST RULE

Never use localhost as evidence.

Do not start:

- npm run dev
- live-server
- python -m http.server
- http-server

unless explicitly requested.

Runtime evidence comes from:

- Logs
- Screenshots
- Console output
- User validation

---

## EVIDENCE RULE

Claims require source evidence.

Every confirmed claim should include:

- File
- Function
- Source reference

Architecture assertions without evidence are assumptions.

---

## ASSUMPTION LABELING RULE

Every conclusion must be labeled:

CONFIRMED

or

ASSUMPTION

CONFIRMED

Supported by source evidence.

ASSUMPTION

Not yet verified.

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

Visual changes require screenshots whenever practical.

---

## RUNTIME STATE CLAIM RULE

Forbidden status:

- Fixed
- Working
- Resolved
- Successful
- Verified

without runtime evidence.

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
- Materials
- Roots
- Atmosphere

### NPCs

- Models
- Silhouettes
- Equipment
- LODs

### Player

- Character
- Equipment
- Visuals

Required:

VISUAL VALIDATION REQUIRED

Provide screenshots.

---

## PUBLIC API CONTRACT RULE

Public APIs are contracts.

Examples:

- requestChunkData()
- spawnVillage()
- generateChunk()

Before changing:

- Verify callers
- Update callers
- Validate runtime behavior

Breaking contracts requires updating all dependencies.

---

## TICK INDEPENDENCE RULE

Simulation may not depend on framerate.

Required:

- Delta Time
OR
- Fixed Tick

Simulation outcomes must remain identical regardless of FPS.

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

Main thread consumes.

---

## VRAM SAFETY RULE

Destroying objects does not destroy assets.

Always dispose:

- Geometry
- Materials
- Textures
- Render Targets

No VRAM leaks.

---

## EVENT LIFECYCLE RULE

Every AddListener requires RemoveListener.

Systems must unsubscribe when:

- Disabled
- Destroyed
- Unloaded

---

## FAIL SAFE RULE

Always verify existence before access.

Examples:

- Villages
- Roads
- Entities
- Chunks
- Events

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

- Root Flare
- Tapered Trunk
- Layered Frustum Canopies
- Flat Shading
- Strong Silhouettes

Forbidden:

- Leaf Cards
- Needle Cards
- Alpha Foliage
- Transparent Canopies
- Cross Planes

---

## Tree FailSafe Rule

Forbidden fallback:

CylinderGeometry(0.5, 2.5, 40, 12)

Required fallback:

Ancient Redwood Primitive

Consisting of:

- Root Flare
- Tapered Trunk
- 3 Frustum Canopy Shelves

Even failures must follow the visual constitution.

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
- Silhouette Readability

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
- Tiny Accessories

---

# SECTION 8: EQUIPMENT RULES

Built from:

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
- Grounded Foundations
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

Required:

Power Stone

- Octahedron

Street Light

- Lantern Primitive

Merchant Chest

- Heavy Box

Bench

- Box + Wedge Supports

Fire Pit

- Frustum Brazier

Props must follow:

Box Rule
Frustum Rule
Grounding Rule

---

# SECTION 11: INVESTIGATION BUDGET RULE

Each cycle must be:

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
20 Investigations
↓
No Validation

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

Design for expansion without unnecessary complexity.
