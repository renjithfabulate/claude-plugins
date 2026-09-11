---
name: create-plan
description: Expand each outline phase into exact code-level changes and checks. Optional detailed-plan path, for work where the outline alone leaves too much open. Most tasks go straight from outline to implementation.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task
---

# Detailed plan

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## When to use this

Most tasks do not need it. `/rpi:implement-outline` works straight from the outline, and an extra
document is extra surface to keep in step.

Reach for a detailed plan when the outline leaves real ambiguity: an unfamiliar subsystem, a risky
migration, or work being handed to someone who was not part of the design.

If the user invoked this out of habit, say so once and let them decide.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Set the Linear issue to `plan-in-progress`.

## 2. Read

The full task history **except** research-questions. The `structure-outline` and the source files it
cites take priority over everything else: the plan expands the outline, it does not re-derive it.

**Open every file the outline names** before planning changes to it. A plan written against
remembered code is a plan against code that does not exist.

## 3. Write the plan

Write `<task dir>/<NN>-plan-<slug>.md`, keeping the outline's phase numbering and names exactly, so
the two documents stay readable side by side.

```markdown
---
ticket: <TICKET-ID>
kind: plan
slug: <slug>
created: <DD/MM/YYYY>
expands: <NN>-structure-outline-<slug>.md
---

# Plan: <title>

## Phase 1: <name from the outline>
**Result:** <from the outline>

### `path/to/file.ts`
What changes, precisely. Name the functions, types and call sites. Show the signature of anything
new. Quote the surrounding code where the edit point is not obvious.

### `path/to/file.test.ts`
The cases to add, and what each asserts.

### Checks
The exact commands, in order.

### Manual steps
Anything a human must do. "None" if none.

## Phase 2: ...
```

Be specific enough that implementation makes no design decisions, and no more specific than that.
Writing out every line means maintaining a second copy of the codebase in Markdown, and it will
drift before it is read.

## 4. Hand off

Set the Linear issue to `plan-in-review`. Print the path and:

```
/rpi:implement-plan <TICKET-ID>
```

Then **stop**.
