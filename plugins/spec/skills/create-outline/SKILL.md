---
name: create-outline
description: Split an approved design into ordered vertical phases, each independently testable. The structure phase. Produces a numbered structure-outline artifact that implementation works from directly.
argument-hint: [TASK-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task
---

# Structure outline

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

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Set the Linear issue to `structure-in-progress`.

## 2. Read

Every task artifact **except** research-questions, plus the source files those artifacts cite. Go
and open the cited files: the outline names real paths, and a phase pointing at a file that does not
exist wastes the implementation phase.

If the design still has decisions marked **Open**, stop and say so. Point the user at
`/spec:iterate-design-discussion`. An outline built on an unsettled design encodes a guess into the
plan of record.

Fill genuine gaps with `researcher` subagents.

## 3. Slice vertically

This is the whole job, so get it right.

A **vertical slice** connects only the parts needed for **one result a person can run, see or
query**. An early slice might serve fixed data from a new endpoint you can hit with `curl`. A later
slice wires that same path to real storage. Each one ends in something checkable.

A **horizontal plan** groups by layer: schema, then service, then API, then UI. Avoid it. Nothing is
verifiable until the last layer lands, which is precisely when correcting a bad assumption costs
the most.

Test each phase against: **what can a person run at the end of this to see it worked?** If the
answer is "nothing until a later phase", the slice is horizontal. Re-cut it.

Also:

- **Order by dependency, then by risk.** Pull the phase that could invalidate the design earliest.
- **Keep them small.** A phase touching fifteen files is two or three phases.
- **Name real files.** Paths from the codebase, not invented ones.
- **Every phase states its checks.** The command that proves it: a test, a build, a curl, a query.

## 4. Write the artifact

Write `<task dir>/<NN>-structure-outline-<slug>.md`:

```markdown
---
ticket: <TICKET-ID>
kind: structure-outline
slug: <slug>
created: <DD/MM/YYYY>
---

# Outline: <title>

## Overview
- [ ] Phase 1: <one-line result>
- [ ] Phase 2: <one-line result>

## Phase 1: <name>
**Result:** the one thing that is true and checkable when this phase is done.
**Files:** `path/one.ts`, `path/two.ts`
**Changes:** what happens in each, a few lines.
**Checks:** `npm test -- path/one.test.ts`, or the exact curl, or the query to run.
**Manual steps:** anything a human must do, such as a migration or an env var. "None" if none.

## Phase 2: ...
```

The Overview checklist is how implementation tracks progress, so keep it in step with the phases
below it.

## 5. Sync the artifact list to Linear

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

## 6. Hand off

Set the Linear issue to `structure-in-review`. Print the path, the phase count, and:

```
/spec:implement-outline <TICKET-ID>
```

Then **stop**. **Never start implementing.** Outline to implementation is a human decision, always,
even when the outline looks obviously right.
