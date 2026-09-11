---
name: iterate-implementation
description: Apply bug reports or review feedback to work already under way. Compares required behaviour to the code, fixes what is reported, and runs the checks. Routes untouched phases back to the normal implementation flow.
argument-hint: [TICKET-ID] [what is wrong]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash, Read, Grep, Glob, Edit, Write, Task, AskUserQuestion
---

# Fix work in progress

Arguments: `$ARGUMENTS`

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the authoritative artifact it reports, plus the outline for phase state.

## 2. Understand what is actually wrong

If the user did not say, ask.

Compare **required behaviour** (from the authoritative artifact) against **actual behaviour** (from
the code and from running it). Name the gap before you touch anything.

**If you cannot reproduce the problem, say so and ask.** Do not fix what you cannot see failing:
you will change something unrelated and the real bug will survive with the evidence now muddied.

**If the right fix is unclear, ask.** A bug report often has more than one valid resolution and the
choice is usually the user's.

## 3. Route it correctly

- **A phase that was never started** is not iteration. Send it to `/rpi:implement-outline` or
  `/rpi:implement-plan`, which is where branch handling, checks and per-phase commits live.
- **Behaviour that is wrong because the design was wrong** is a design change. Say so and route to
  `/rpi:iterate-design-discussion` or `/rpi:iterate-tdd`. Fixing it here leaves the artifacts
  describing something the code no longer does, and every later phase reads those artifacts.
- **Code that does not match an approved design** is exactly this command's job. Fix it.

## 4. Fix and verify

Make the smallest change that fixes the reported problem.

Run the checks for every phase you touched, not just the failing one. Then say what you ran and what
it printed.

Add a regression test where the project has somewhere for one to live.

## 5. Commit

```
<ticket-id>: fix <short description>
```

Keep it separate from phase commits so the history still shows which phase did what.

## 6. Stop

Report the gap you found, the fix, the check output, and anything still outstanding. Then **stop**.
