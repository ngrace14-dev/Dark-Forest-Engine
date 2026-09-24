PROJECT RULES AND HARDENING ADDENDUM (The Engineering Constitution)
HARDENING MODE ADDENDUM
When modifying, debugging, extending, or correcting systems:
The objective is not only to make code work.
The objective is to make code remain stable under future expansion.

=================================================================
SECTION 1: THE 5 PILLARS OF DARK FOREST
PILLAR 1: WORLD STATE INTEGRITY & SIMULATION FIRST
Rendering exists to visualize simulation. Rendering must never be the source of simulation truth.
The world state must survive and progress independently of:

Chunk unloading

Renderer destruction

Player/Camera absence

UI absence
Example: Villages must update, trees must grow, and AI must simulate even if they are outside the loaded visual frustum.

PILLAR 2: DETERMINISTIC SIMULATION
Never use uncontrolled randomness (e.g., standard Math.random()) for procedural generation, AI decisions, or simulation logic.
Every bug should be reproducible via:

Seed

World Day

Chunk Coordinate

Entity ID

PILLAR 3: LONG-TERM SAVE SAFETY
Any new system should assume: Worlds may survive for hundreds of in-game days.
When modifying saved data structures, do not break existing saves. Provide versioning, migration paths, and fallback/default values. Older saves must degrade gracefully, not crash on load.

PILLAR 4: OBSERVABILITY RULE
Every critical system must expose debug information sufficient to verify runtime behavior.
Mandatory telemetry for major systems includes:

Loaded Count / Active Count

Memory Use

Queue Depth

Last Tick
Examples: Terrain Chunks, Villages, Road Nodes, Trees, Workers, Caravans.

PILLAR 5: SINGLE AUTHORITY & OWNERSHIP
Every major domain has exactly one owner. Shared mutable ownership is forbidden.
Examples:

Terrain → BlockTerrainSystem

Villages → VillageManager

Roads → RoadManager

Narrator → NarratorSystem
Always identify: Who creates it? Who updates it? Who consumes it? Who destroys it?

=================================================================
SECTION 2: AI ASSISTANCE & SCOPE CONTROL
NO "WHILE I'M HERE" FIXES (STRICT SCOPE CONTROL)
Never accept unsolicited refactoring of adjacent code. Unapproved scope creep introduces untested variables and breaks stable architecture. One approved objective per commit.

CONTEXT LIMIT DISCIPLINE (AVOID AI HALLUCINATION)
Keep context narrow, specific, and hyper-targeted. Do not dump entire engine modules or broad architectural requests into a single AI prompt.

THE "JUST MAKE IT COMPILE" WARNING
Do not accept code that simply "makes the red lines go away" (e.g., empty interfaces, brute-force typecasts). If the solution is fighting the engine's architecture, step back and rethink the logic.

=================================================================
SECTION 3: RUNTIME VERIFICATION & API CONTRACTS
RUNTIME VERIFICATION RULE
A fix is not complete because it compiles. A fix is complete when it is verified running.
Every change should define the Expected Runtime Result, Verification Steps, and Failure Symptoms.

PUBLIC API CONTRACT RULE
Public methods used by other systems are contracts (e.g., requestChunkData(), spawnVillage()).
Before renaming, modifying, or removing core APIs, verify ALL callers. Breaking a public contract requires updating all call sites.

=================================================================
SECTION 4: MEMORY, PERFORMANCE, & SAFETY
THREAD SAFETY & CONCURRENCY RULE
Worker threads (e.g., TerrainWorkerPool) must NEVER access:

Visual APIs (Renderers, Shaders, Materials)

Physics engines

UI Elements
Background threads compute pure data. Main threads render pure data.

ASSET DISPOSAL RULE (NO VRAM LEAKS)
Destroying a game object does not automatically destroy its dynamically created assets.
If a system generates a procedural mesh, texture, or unique material, it MUST explicitly destroy that asset when the entity is pooled or destroyed.

EVENT SUBSCRIPTION LIFECYCLE (NO EVENT LEAKS)
If a system subscribes to an event, it MUST cleanly unsubscribe when destroyed or disabled. Every AddListener must have a corresponding RemoveListener.

FAIL SAFE & NULL SAFETY
Before accessing Objects, Entities, Villages, or Chunk references: Verify existence.
When unexpected conditions occur, prefer graceful degradation. Fall back, log a warning, and keep the system running.

=================================================================
HARDENING CHECKLIST (TO BE COMPLETED BEFORE PR/MERGE)
[ ] Targeted Fix (One approved objective per commit, no "while I'm here")

[ ] Runtime Verified (Tested in-engine, generation pipeline confirmed)

[ ] API Contracts Verified (All callers updated)

[ ] Seeded RNG (Fully deterministic, reproducible via Seed/Day/Coord/ID)

[ ] Tick Independent (Math respects Delta Time, decoupled from framerate)

[ ] Thread Safe (No main-thread APIs called from worker pools)

[ ] Save Safe (Backward compatible, built for 100+ in-game days)

[ ] VRAM Safe (Procedural meshes/materials explicitly destroyed)

[ ] Null Safe (References verified, events cleanly unsubscribed)

[ ] No Silent Failure (Graceful degradation, proper logging)

[ ] Ownership Defined (Single Authority rule respected)

[ ] Observability Available (Debug telemetry exposed)

[ ] Technical Debt Documented (If temporary, explicitly marked)

=================================================================
DARK FOREST ENGINE HARDENING PRINCIPLE
Every system should be designed as though the world will eventually become:
Larger. Older. Busier. More simulated. More dynamic.
Build systems as if more careers, villages, factions, businesses, and AI will be added.
Optimize for future expansion without introducing unnecessary complexity.