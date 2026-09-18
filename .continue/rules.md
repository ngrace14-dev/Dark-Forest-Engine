536
No implementation begins until approval is granted.
537
 
538
---
539
 
540
# Stability & Recovery Policy
541
 
542
Protecting a working build takes priority over completing a refactor.
543
 
544
## Before Medium or High Risk Work
545
 
546
The AI must:
547
 
548
1. Identify the last known working state.
549
2. Identify rollback options.
550
3. Explain recovery strategy.
551
4. Verify startup functionality.
552
5. Identify failure scenarios.
553
 
554
## Known Working State
555
 
556
- Never intentionally overwrite a known working implementation without a recovery path.
557
- Preserve recoverable versions whenever practical.
558
- Establish a rollback strategy before major changes.
559
- Prefer multiple small successful commits over one large risky change.
560
 
561
## Error Recovery
562
 
563
If changes introduce:
564
 
565
- Build failures
566
- Startup failures
567
- Save corruption
568
- Runtime exceptions
569
- Initialization failures
570
- Multiplayer synchronization failures
571
 
572
The AI must prioritize:
573
 
574
Restoring Stability
575
 
576
before continuing feature work.
577
 
578
## Refactor Safety Rules
579
 
580
For architectural refactors:
581
 
582
1. Establish a stable baseline.
583
2. Make the smallest viable change.
584
3. Validate startup.
585
4. Validate affected systems.
586
5. Validate save compatibility.
587
6. Continue incrementally.
588
 
589
Avoid large chained refactors.
590
 
591
---
592
 
593
# Operational Rule
594
 
595
A known-working engine is more valuable than a partially completed refactor.
596
 
597
When unsure:
598
 
599
Protect Stability First.
---

# Execution Protocols (Flash & High-Speed Models)

To ensure senior-level reliability, the AI must strictly adhere to process-driven execution to prevent assumptions, hallucinations, and error loops.

## 1. Execution Planning (Chain of Thought)

Before executing code changes, writing scripts, or beginning a refactor, the AI MUST explicitly output a plan:

1. Restate the exact objective.
2. List the specific files that must be read or modified.
3. Outline the step-by-step logical changes required.
4. Identify potential side effects.

Do not write any implementation code until this planning phase is output.

## 2. Zero-Assumption File Verification

- NEVER assume the contents, structure, or current state of a file based on memory or filenames.
- You MUST read the exact, up-to-date contents of a file immediately before proposing or using tools to make edits.
- If an edit fails, do not guess the fix. Re-read the file to verify its current state before trying again.

## 3. Anti-Looping (The 2-Strike Rule)

If a compilation error, test failure, or bug persists after the second attempt to fix it:

1. STOP making automated changes.
2. Revert to the last known working state (as defined in Stability & Recovery).
3. Output a detailed analysis of why the previous attempts failed.
4. Await user input or approval before attempting a completely new approach.

Do not brute-force solutions.

## 4. Scope Containment & Sequential Pacing

- Execute complex tasks strictly sequentially. Complete and verify ONE file or logical component at a time before moving to the next.
- Modify ONLY the code strictly necessary to achieve the current objective.
- Do NOT reformat unrelated code, update unrelated dependencies, or change unrelated function signatures.
- Ignore unrelated messy code, formatting quirks, or typos unless they directly block the current task.

---

# Non-Negotiable Code Quality & Mandatory Self-Review

Speed must NEVER come at the expense of code quality. To prevent regressions and debugging black-holes, all models MUST perform mandatory self-review and apply defensive programming standards.

## 1. Mandatory Self-Review ("Measure Twice, Cut Once")
Before submitting any code implementation as "complete," you MUST output a <self_review> block where you critique your own work.
- Check explicitly for: Off-by-one errors, null pointer exceptions, unhandled edge cases, asynchronous race conditions, and memory leaks.
- If your self-review uncovers a potential flaw, you must iterate and fix it immediately before asking for user approval.
- It is expected that you might rewrite your own code 2-3 times internally before presenting the final version.

## 2. Strict Defensive Programming
- NEVER assume inputs are perfectly formatted, state is always valid, or API calls will succeed.
- Validate parameters, guard against null/undefined, and handle missing data gracefully.
- Use early returns (guard clauses) to reduce nesting and cognitive load.
- Add descriptive error logging (with context) for any failure state. Do not swallow errors silently.

## 3. Implementation Standard Checklist
For every function or class modified or created, you must ensure:
- [ ] Logic is explicitly clear and easy to follow.
- [ ] Variables are named explicitly and descriptively (no 	emp, data, x, obj).
- [ ] Potential side-effects on other systems have been identified and mitigated.
- [ ] The change strictly respects the existing architecture and patterns.
- [ ] There is proper error catching/bubbling to the caller.

## 4. The "Worst-Case Scenario" Check
For any logic involving core engine systems (State, Multiplayer, Saves, Initialization):
- Ask yourself: "How could this fail? What happens if the network drops? What if the entity is destroyed mid-frame? What if the save data is from an older version?"
- Implement explicit safeguards against your own worst-case answers before finalizing the code.
