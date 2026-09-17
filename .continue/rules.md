# Dark Forest Engine Rules

## Project Overview

Dark Forest Engine is a survival horror RPG simulation.

Core systems:

- Combat
- AI
- Encounters
- Perception
- Status Effects
- Crafting
- Procedural Events
- World Simulation

## Development Standards

- **Preserve functionality:** Do not remove functionality without explicit approval.
- **Extend before replace:** Always extend existing systems before introducing new ones.
- **Maintain consistency:** Follow existing coding patterns (e.g., if a system uses a specific object-oriented approach, maintain it).
- **Avoid Duplication:** Do not introduce duplicate systems.
- **Document as you go:** All new functions must include JSDoc comments describing parameters and purpose. Update existing JSDoc if the logic changes.
- **Dependency Check:** Before modifying a function, grep the codebase for its usage to ensure compatibility across modules.

## System Interaction & Scope

- **Event Bus Usage:** Prefer `window.EventBus` for cross-system communication. Avoid direct function calls between decoupled systems (e.g., `src_systems_ai.js` should not call `src_systems_ui.js` directly; emit an event instead).
- **Global Namespace:** Be cautious when adding to the `window` object. If adding a new manager, attach it to an existing namespace if possible, or ensure it is documented in the architecture overview.
- **Data-Oriented Approach:** Favor data-oriented structures (like the current entity/component buffer logic) over deep object nesting to ensure scalability and performance in the update loop.

## AI Workflow

Before making changes:

1. Identify impacted systems.
2. **Dependency Check:** Search the codebase for usage of any affected functions to ensure compatibility across modules.
3. Explain implementation plan.
4. List expected file modifications.

After making changes:

1. List modified files.
2. Explain side effects.
3. Suggest testing steps, **prioritizing edge cases relevant to the specific module (e.g., combat behavior vs. exploration).**

## Architecture Rules

- Maintain compatibility with existing save data when possible.
- Maintain existing event systems.
- Preserve AI state machine behavior.
- Preserve perception and threat evaluation systems.

## Performance Rules

- **Minimal Allocations:** Minimize object creation/garbage collection in update loops (e.g., reuse vectors/matrices).
- **Spatial Optimization:** Always leverage `SpatialGrid` for proximity-based checks. Avoid `O(N^2)` loops.
- **Lazy Evaluation:** If a system check is expensive, use a timer or frequency limit (e.g., `if (worldTimer > 0.25)`).

## Refactoring Rules

- Refactor incrementally.
- Do not remove functionality without approval.
- Explain risks before architectural changes.

## Change Budget
- Modify the smallest number of files necessary.
- Prefer targeted fixes over broad rewrites.
- Do not rewrite entire systems unless explicitly requested.
- Preserve public APIs whenever possible.
- When a change affects more than 5 files, explain why each file must be modified.

## Risk Assessment
Before implementing any architectural change, classify risk:
- **LOW:** Single module, no save impact.
- **MEDIUM:** Multiple modules, event flow changes.
- **HIGH:** Save format changes, core AI changes, combat logic changes, world simulation changes.

For HIGH risk changes:
- Explain rollback strategy.
- Explain migration strategy.
- Wait for approval before implementation.
