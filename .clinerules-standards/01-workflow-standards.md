# Workflow Standards (01-workflow-standards)

## Core Developer Constraints
- **Imperative Verification:** Never assume a command succeeded. Read outputs, check logs, and run tests.
- **Diff Editing:** Prefer targeted diff edits over full file rewrites.
- **No Silent Failures:** If a dependency is missing or a build fails, stop and address it. Do not attempt to bypass it silently.
- **Context Updates:** When you reach a milestone or pivot architecture, you MUST update the `memory-bank/` files to reflect the new reality.

## The Plan & Act Protocol
- **PLAN MODE:**
  - Do NOT execute code changes.
  - Perform pure investigation (`search_codebase`, `read_files`, clarifying questions).
  - Generate or update `implementation_plan.md` in the project root containing step-by-step technical requirements, affected files, and edge cases.
- **ACT MODE:**
  - Read `implementation_plan.md` and `memory-bank/` files.
  - Execute steps systematically using targeted diff edits.
  - Output a checklist to track progress on medium/large tasks.
  - Proactively verify via headless tests (`node tools/test_commander_logic.mjs`).
