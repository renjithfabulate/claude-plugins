---
name: implement-outline
description: Implement an RPI task straight from its structure outline, one phase at a time, running the phase checks and committing before moving on. Pauses for review after each phase.
argument-hint: [TICKET-ID] [phase number]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash, Read, Grep, Glob, Edit, Write, Task, AskUserQuestion
---

# Implement from the outline

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `structure-outline`. Work from it directly: **never** call `/rpi:create-plan` or
`/rpi:implement-plan` from here.

Set the Linear issue to `in-dev`.

## 2. Pick the phase

Take the first phase whose Overview checkbox is unticked, unless the user named one.

If every phase is done, say so and suggest `/rpi:describe-pr <TICKET-ID>`.

## 3. Before you start

Confirm you are on a working branch, not the base branch. If you are on base, create one
(`<ticket-id>-<slug>`, lowercased) and say so.

Report any **Manual steps** the phase lists **before** doing anything, and wait if they block the
work. Discovering a missing migration halfway through a phase wastes the phase.

## 4. Implement exactly this phase

- Touch the files this phase names. If you need a file it does not name, that is a signal the
  outline was wrong: say so, and either get agreement or stop.
- Do not start the next phase because it is small. Do not fix unrelated things you notice along the
  way: mention them, leave them.
- The outline is the authority for what to build. The live code is the authority for what exists.
  Where they disagree about the current state, believe the code and say so.

## 5. Run the checks

Run the phase's **Checks** exactly as written.

If they fail, fix and re-run. If they fail for a reason the outline did not anticipate, stop and
explain rather than reshaping the phase around the failure.

If a check turns out not to be runnable as written, say so plainly. A check quietly replaced with an
easier one is worse than no check, because the tick in the Overview then means nothing.

## 6. Commit and tick

Commit this phase on its own:

```
<ticket-id>: phase <n>, <phase name>
```

Tick the phase's box in the outline's Overview and commit that alongside. Progress lives in the
outline, which is why it is committed with the code.

## 7. Stop

Report: what changed, check results verbatim, anything manual still outstanding, and the next phase.

Then **stop and wait for review.**

Do not continue to the next phase unless the user explicitly asked for several phases in one go.
This pause is the point: it caps how much unreviewed code can pile up on an assumption nobody has
checked yet.
