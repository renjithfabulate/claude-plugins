---
name: implement-plan
description: Implement a detailed plan one phase at a time, or implement a Oneshot task straight from ticket.md when no plan exists. Runs checks and commits per phase, pausing for review.
argument-hint: [TASK-ID] [phase number]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash, Read, Grep, Glob, Edit, Write, Task, AskUserQuestion
---

# Implement from the plan

Arguments: `$ARGUMENTS`

If no task identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another task's
directory and moving the wrong Linear issue, which is worse than failing outright.

The identifier is one of two things:

- a **Linear ticket**, an uppercase key then a hyphen then digits (`ENG-123`)
- a **local task slug** for work with no ticket at all (`fix-login-redirect`)

`task-ctx.mjs` reports which as **task type**. When it says *local task*, **skip every Linear step
in this command**: no status transitions, no comment sync, no `save_issue`. Everything else, the
artifacts, the checkpoints and the handoffs, is identical. A missing ticket is a normal way to work,
not an error.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Set the Linear issue to `in-dev`.

**If a `plan` artifact exists**, work from it, with its `structure-outline` for phase results.

**If no plan exists**, this is a Oneshot task. Work directly from `ticket.md`. Before writing
anything, state your understanding of the change in two or three lines and the files you expect to
touch, and let the user correct you. Oneshot skips every design checkpoint, so this is the only
chance to catch a misreading before the diff exists.

If the task turns out to be bigger than Oneshot suits, stop and say so. Suggest `/spec:start-task`
with a fuller workflow. Grinding a large change through Oneshot is how the review bottleneck comes
back.

## 2. Pick the phase

First phase not yet done, unless the user named one. For Oneshot, the whole ticket is the phase.

## 3. Before you start

Confirm you are on a working branch, not base. Create `<ticket-id>-<slug>` if needed.

Report the phase's **Manual steps** before starting, and wait if they block.

## 4. Implement exactly this phase

Follow the plan's steps for this phase. The plan names files, functions and signatures: follow them.

If a step cannot be followed because the code has moved since the plan was written, **stop**. Do not
improvise a substitute. Report the drift and suggest `/spec:iterate-plan`. A plan silently departed
from stops being a plan.

## 5. Run the checks

Exactly as written. Fix and re-run on failure. Stop and explain on an unanticipated failure.

## 6. Commit

```
<ticket-id>: phase <n>, <phase name>
```

Tick the phase in the outline's Overview if one exists, and commit that too.

## 7. Stop

Report what changed, check results verbatim, outstanding manual steps, and the next phase.

Then **stop and wait for review**, unless the user asked for several phases at once.
