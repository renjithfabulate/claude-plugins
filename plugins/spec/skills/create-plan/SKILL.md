---
name: create-plan
description: Expand each outline phase into exact code-level changes and checks. Optional detailed-plan path, for work where the outline alone leaves too much open. Most tasks go straight from outline to implementation.
argument-hint: [TASK-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task
---

# Detailed plan

Ticket: `$ARGUMENTS`

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

## When to use this

Most tasks do not need it. `/spec:implement-outline` works straight from the outline, and an extra
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

## 4. Sync the artifact list to Linear

Generate the comment body, do not compose it yourself:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs <TICKET-ID>
```

Then post it as **one comment, kept current**:

1. `list_comments` on the issue and find the comment whose body contains `<!-- spec:artifacts -->`.
2. If it exists, call `save_comment` with that comment's `id` to replace its body.
3. If not, call `save_comment` with `issueId` to create it.

Never add a new comment per phase. A ticket that accumulates one comment per phase becomes
unreadable, which is the opposite of the point: anyone opening the issue should see the current
artifacts at a glance, not a changelog.

If the comment cannot be posted, say so and carry on. A failed sync must never lose the artifact
you just wrote or block the handoff.

## 5. Hand off

Set the Linear issue to `plan-in-review`. Print the path and:

```
/spec:implement-plan <TICKET-ID>
```

Then **stop**.
