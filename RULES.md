PROJECT RULES AND HARDENING ADDENDUM
(The Engineering Constitution)

HARDENING MODE ADDENDUM

When modifying, debugging, extending, or correcting systems:

The objective is not only to make code work.
The objective is to make code remain stable under future expansion.

=================================================================
SECTION 1: THE 5 PILLARS OF DARK FOREST
=================================================================

PILLAR 1: WORLD STATE INTEGRITY & SIMULATION FIRST

Rendering exists to visualize simulation.

Rendering must never be the source of simulation truth.

The world state must survive and progress independently of:

- Chunk unloading
- Renderer destruction
- Player absence
- Camera absence
- UI absence

Example:

Villages must update, trees must grow, and AI must simulate even when not rendered.

-----------------------------------------------------------------

PILLAR 2: DETERMINISTIC SIMULATION

Never use uncontrolled randomness (e.g. Math.random()) for:

- Procedural generation
- AI decisions
- Simulation logic

Every simulation bug should be reproducible via:

- Seed
- World Day
- Chunk Coordinate
- Entity ID

-----------------------------------------------------------------

PILLAR 3: LONG-TERM SAVE SAFETY

Any new system should assume:

Worlds may survive for hundreds of in-game days.

When modifying save structures:

- Preserve compatibility
- Provide versioning
- Provide migration paths
- Provide fallback values

Older saves must degrade gracefully and never crash.

-----------------------------------------------------------------

PILLAR 4: OBSERVABILITY RULE

Every critical system must expose sufficient debug information to verify runtime behavior.

Mandatory telemetry for major systems:

- Loaded Count
- Active Count
- Memory Usage
- Queue Depth
- Last Tick

Examples:

- Terrain Chunks
- Villages
- Roads
- Trees
- Workers
- Caravans

-----------------------------------------------------------------

PILLAR 5: SINGLE AUTHORITY & OWNERSHIP

Every domain has exactly one owner.

Shared mutable ownership is forbidden.

Examples:

Terrain -> BlockTerrainSystem

Villages -> VillageManager

Roads -> RoadManager

Narrator -> NarratorSystem

Always identify:

- Who creates it
- Who updates it
- Who consumes it
- Who destroys it

=================================================================
SECTION 2: AI ASSISTANCE & SCOPE CONTROL
=================================================================

NO "WHILE I'M HERE" FIXES

Never accept unsolicited refactoring of adjacent code.

Unapproved scope creep introduces untested variables and breaks stable architecture.

One approved objective per commit.

-----------------------------------------------------------------

CONTEXT LIMIT DISCIPLINE

Keep context narrow and targeted.

Do not dump:

- Massive files
- Entire subsystems
- Broad architectural requests

into a single AI prompt.

-----------------------------------------------------------------

THE "JUST MAKE IT COMPILE" WARNING

Do not accept code that merely removes compiler errors.

Examples:

- Empty interfaces
- Fake implementations
- Type-cast abuse
- Placeholder logic

If the solution is fighting the architecture:

Stop.
Re-evaluate.
Rethink.

-----------------------------------------------------------------

EVIDENCE RULE

Claims about existing code must be supported by source evidence.

Examples:

- API contracts
- Ownership
- Dependencies
- Method signatures
- Callers
- Data flow

Every confirmed claim should include:

- File name
- Location reference

Architecture claims without evidence should be treated as assumptions.

-----------------------------------------------------------------

ASSUMPTION LABELING RULE

All conclusions must be labeled as either:

CONFIRMED

or

ASSUMPTION

CONFIRMED:
Directly supported by source code.

ASSUMPTION:
Not yet verified by source evidence.

Assumptions must never be presented as verified facts.

=================================================================
SECTION 3: RUNTIME VERIFICATION & API CONTRACTS
=================================================================

RUNTIME VERIFICATION RULE

A fix is not complete because it compiles.

A fix is complete when verified running.

Every change must define:

- Expected Runtime Result
- Verification Steps
- Failure Symptoms

Visual changes should include screenshot verification whenever practical.

-----------------------------------------------------------------

PUBLIC API CONTRACT RULE

Public methods used by other systems are contracts.

Examples:

- requestChunkData()
- spawnVillage()
- generateChunk()

Before modifying, renaming, or removing:

- Verify all callers
- Update all callers
- Verify runtime behavior

Breaking a contract requires updating all dependent systems.

-----------------------------------------------------------------

TICK INDEPENDENCE & TIME SCALING RULE

Simulation logic must never depend on render framerate.

All simulation math must:

- Use Delta Time
OR
- Use Fixed Simulation Ticks

Simulation must produce identical outcomes at:

- 1x speed
- Fast forward
- Background simulation

Rendering speed must never affect simulation correctness.

=================================================================
SECTION 4: MEMORY, PERFORMANCE, & SAFETY
=================================================================

THREAD SAFETY & CONCURRENCY RULE

Worker threads must NEVER access:

- Renderers
- Shaders
- Materials
- Physics
- UI
- Main-thread-only objects

Background threads compute data.

Main thread consumes data.

All shared state should be assumed unsafe until validated.

-----------------------------------------------------------------

ASSET DISPOSAL RULE (NO VRAM LEAKS)

Destroying an object does not destroy generated assets.

Procedural assets must be explicitly disposed:

- Meshes
- Materials
- Textures
- Render targets

to prevent VRAM leaks.

-----------------------------------------------------------------

EVENT SUBSCRIPTION LIFECYCLE

Every AddListener requires a matching RemoveListener.

Systems must unsubscribe when:

- Disabled
- Destroyed
- Unloaded

-----------------------------------------------------------------

FAIL SAFE & NULL SAFETY

Before accessing:

- Objects
- Entities
- Villages
- Roads
- Chunks
- Event payloads

Verify existence.

Unexpected situations should:

- Log
- Fallback
- Continue safely

Never silently crash.

=================================================================
HARDENING CHECKLIST (REQUIRED BEFORE PR/MERGE)
=================================================================

[ ] Targeted Fix (One approved objective per commit)

[ ] Runtime Verified (Tested in-engine)

[ ] API Contracts Verified (All callers updated)

[ ] Evidence Provided (Claims backed by source locations)

[ ] Assumptions Labeled (CONFIRMED vs ASSUMPTION)

[ ] Seeded RNG (Deterministic)

[ ] Tick Independent (Delta Time / Fixed Tick safe)

[ ] Thread Safe

[ ] Save Safe

[ ] VRAM Safe

[ ] Null Safe

[ ] No Silent Failure

[ ] Ownership Defined

[ ] Observability Available

[ ] Technical Debt Documented

=================================================================
DARK FOREST ENGINE HARDENING PRINCIPLE
=================================================================

Build systems as if:

- More careers will be added
- More villages will be added
- More factions will be added
- More businesses will be added
- More AI will be added

Every system should be designed as though the world will eventually become:

Larger.
Older.
Busier.
More simulated.
More dynamic.

Optimize for future expansion without introducing unnecessary complexity.